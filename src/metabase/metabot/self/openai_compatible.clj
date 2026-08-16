(ns metabase.metabot.self.openai-compatible
  "Adapter for administrator-configured OpenAI-compatible endpoints."
  (:require
   [clojure.string :as str]
   [metabase.llm.settings :as llm]
   [metabase.metabot.self.chat-completions :as chat-completions]
   [metabase.metabot.self.core :as core]
   [metabase.metabot.self.debug :as debug]
   [metabase.metabot.self.openai :as openai]
   [metabase.util :as u]
   [metabase.util.i18n :refer [tru]]
   [metabase.util.json :as json]
   [metabase.util.malli :as mu]))

(set! *warn-on-reflection* true)

(defn- compatible-error-msg
  [response]
  (let [status (long (:status response 0))]
    (case status
      400 (tru "The OpenAI-compatible provider rejected the request")
      401 (tru "The OpenAI-compatible API key is invalid or expired")
      403 (tru "The OpenAI-compatible API key has insufficient permissions")
      404 (tru "The OpenAI-compatible endpoint or model was not found")
      429 (tru "The OpenAI-compatible provider rate limited the request")
      500 (tru "The OpenAI-compatible provider returned an internal error")
      502 (tru "The OpenAI-compatible provider returned an upstream error")
      503 (tru "The OpenAI-compatible provider is unavailable")
      (tru "OpenAI-compatible provider error (HTTP {0})" status))))

(defn- auth
  [credentials]
  (let [api-key  (or (not-empty (:api-key credentials))
                     (not-empty (llm/llm-openai-compatible-api-key)))
        base-url (or (not-empty (:base-url credentials))
                     (not-empty (llm/llm-openai-compatible-api-base-url)))]
    (when-not api-key
      (throw (core/missing-api-key-ex "OpenAI-compatible provider")))
    (when-not base-url
      (throw (ex-info (tru "No OpenAI-compatible API base URL is set")
                      {:api-error  true
                       :error-code :base-url-missing})))
    {:url     base-url
     :headers {"Authorization" (str "Bearer " api-key)}}))

(defn- protocol
  [credentials]
  (or (:protocol credentials)
      (llm/llm-openai-compatible-api-protocol)))

(defn list-models
  "List models exposed by the configured OpenAI-compatible endpoint."
  ([] (list-models {}))
  ([{:keys [credentials]}]
   (try
     (let [response (core/request (auth credentials)
                                  {:method  :get
                                   :url     "/models"
                                   :as      :json
                                   :headers {"Content-Type" "application/json"}})]
       {:models (mapv (fn [model]
                        {:id           (:id model)
                         :display_name (or (:name model) (:id model))})
                      (get-in response [:body :data]))})
     (catch Exception e
       (core/rethrow-api-error! "openai-compatible" compatible-error-msg e)))))

(defn- send-chat-completions-request
  [request-auth request-body model]
  (let [response (core/request request-auth
                               {:method  :post
                                :url     "/chat/completions"
                                :as      :stream
                                :headers {"Content-Type" "application/json"}
                                :body    (json/encode request-body)})]
    (-> (core/sse-reducible (:body response))
        (debug/capture-stream {:provider "openai-compatible"
                               :model    model
                               :url      "/chat/completions"
                               :request  request-body}))))

(defn- send-responses-request
  [request-auth request-body model]
  (let [response (core/request request-auth
                               {:method  :post
                                :url     "/responses"
                                :as      :stream
                                :headers {"Content-Type" "application/json"}
                                :body    (json/encode request-body)})]
    (-> (core/sse-reducible (:body response))
        (debug/capture-stream {:provider "openai-compatible"
                               :model    model
                               :url      "/responses"
                               :request  request-body}))))

(defn- translated-api-error
  [e]
  (try
    (core/rethrow-api-error! "openai-compatible" compatible-error-msg e)
    (catch Exception translated
      translated)))

(defn- retry-with-tool-choice-auto?
  [request-body e]
  (let [text (str/lower-case (or (ex-message e) ""))]
    (and (= 400 (:status (ex-data e)))
         (contains? request-body :tool_choice)
         (str/includes? text "tool_choice")
         (str/includes? text "thinking")
         (some #(str/includes? text %)
               ["not support" "unsupported" "invalidparameter"]))))

(defn- chat-completions-raw
  [opts credentials]
  (let [request-auth (auth credentials)
        request-body (chat-completions/request-body opts)]
    (try
      (send-chat-completions-request request-auth request-body (:model opts))
      (catch Exception e
        (let [translated (translated-api-error e)]
          (if (retry-with-tool-choice-auto? request-body translated)
            (try
              (send-chat-completions-request request-auth
                                             (assoc request-body :tool_choice "auto")
                                             (:model opts))
              (catch Exception retry-error
                (throw (translated-api-error retry-error))))
            (throw translated)))))))

(defn- responses-raw
  [opts credentials]
  (try
    (send-responses-request (auth credentials)
                            (openai/openai-request-body opts)
                            (:model opts))
    (catch Exception e
      (throw (translated-api-error e)))))

(defn- raw
  [opts credentials]
  (case (protocol credentials)
    "responses"        (responses-raw opts credentials)
    "chat-completions" (chat-completions-raw opts credentials)))

(mu/defn openai-compatible-raw
  "Perform a streaming request using the saved OpenAI-compatible credentials."
  [opts :- core/LLMRequestOpts]
  (raw opts nil))

(defn openai-compatible
  "Call the configured OpenAI-compatible endpoint and return an AISDK stream."
  [& args]
  (eduction (case (protocol nil)
              "responses"        (openai/openai->aisdk-chunks-xf)
              "chat-completions" (chat-completions/->aisdk-chunks-xf))
            (apply openai-compatible-raw args)))

(defn validate-model
  "Validate streaming tool-call compatibility for `model` using `credentials`."
  [{:keys [credentials model]}]
  (let [tool  {:tool-name "connection_check"
               :doc       "Confirm tool calling support."
               :schema    [:=> [:cat [:map {:closed true}]] :any]
               :fn        (constantly {:ok true})}
        parts (into []
                    (comp (case (protocol credentials)
                            "responses"        (openai/openai->aisdk-chunks-xf)
                            "chat-completions" (chat-completions/->aisdk-chunks-xf))
                          (core/aisdk-xf))
                    (raw {:model       model
                          :input       [{:role :user :content "Call the connection_check tool."}]
                          :tools       [tool]
                          :tool_choice "required"}
                         credentials))]
    (when-not (u/seek #(and (= :tool-input (:type %))
                            (= "connection_check" (:function %)))
                      parts)
      (throw (ex-info (tru "The configured model did not return a compatible streaming tool call.")
                      {:status-code 400
                       :api-error   true})))
    true))
