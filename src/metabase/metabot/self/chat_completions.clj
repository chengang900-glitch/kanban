(ns metabase.metabot.self.chat-completions
  "Protocol conversion shared by OpenAI-compatible Chat Completions providers."
  (:require
   [clojure.string :as str]
   [malli.json-schema :as mjs]
   [metabase.metabot.self.core :as core]
   [metabase.metabot.self.schema :as schema]
   [metabase.util :as u]
   [metabase.util.json :as json]))

(set! *warn-on-reflection* true)

(defn- merge-consecutive-assistant-messages
  [messages]
  (into [] (comp (partition-by :role)
                 (mapcat (fn [group]
                           (if (and (< 1 (count group))
                                    (= "assistant" (:role (first group))))
                             (let [text       (->> group (keep :content) (str/join ""))
                                   tool-calls (into [] (mapcat :tool_calls) group)]
                               [(cond-> {:role "assistant" :content text}
                                  (seq tool-calls) (assoc :tool_calls tool-calls))])
                             group))))
        messages))

(defn parts->messages
  "Convert AISDK parts and user messages into Chat Completions messages."
  [parts]
  (->> parts
       (keep (fn [part]
              (case (:type part)
                :text        {:role "assistant" :content (:text part)}
                ;; Reasoning is UI-only. Replaying it as a user/assistant message on the
                ;; next tool round confuses OpenAI-compatible providers and duplicates
                ;; hidden chain-of-thought in the conversation context.
                :reasoning   nil
                :tool-input  {:role       "assistant"
                              :content    nil
                              :tool_calls [{:id       (:id part)
                                            :type     "function"
                                            :function {:name      (:function part)
                                                       :arguments (let [args (:arguments part)]
                                                                    (if (string? args)
                                                                      args
                                                                      (json/encode (or args {}))))}}]}
                :tool-output {:role         "tool"
                              :tool_call_id (:id part)
                              :content      (or (get-in part [:result :output])
                                                (when-let [err (:error part)]
                                                  (str "Error: " (:message err)))
                                                (pr-str (:result part)))}
                {:role    (name (or (:role part) "user"))
                 :content (or (:content part) "")})))
       merge-consecutive-assistant-messages))

(defn tool->definition
  "Convert a Metabot tool entry into a Chat Completions function definition."
  [{:keys [tool-name doc schema]}]
  (let [[_:=> [_:cat params] _out] schema
        params                     (schema/filter-schema-by-features params)
        doc                        (if (str/starts-with? (or doc "") "Inputs: ")
                                     (second (str/split doc #"\n\n  " 2))
                                     doc)]
    {:type     "function"
     :function {:name        tool-name
                :description doc
                :parameters  (mjs/transform params {:additionalProperties false})}}))

(defn request-body
  "Build a streaming Chat Completions request body from Metabot LLM options."
  [{:keys [model system input tools temperature max-tokens tool_choice schema]}]
  (let [messages  (cond-> (parts->messages input)
                    system (as-> messages (into [{:role "system" :content system}] messages)))
        all-tools (or (when schema
                        [{:type     "function"
                          :function {:name        "structured_output"
                                     :description "Output structured data"
                                     :parameters  schema}}])
                      (seq (mapv tool->definition tools)))]
    (cond-> {:model          model
             :stream         true
             :stream_options {:include_usage true}
             :messages       messages}
      all-tools   (assoc :tools       (vec all-tools)
                         :tool_choice (cond
                                        schema      "required"
                                        tool_choice tool_choice
                                        :else       "auto"))
      temperature (assoc :temperature temperature)
      max-tokens  (assoc :max_tokens max-tokens))))

(defn ->aisdk-chunks-xf
  "Translate Chat Completions streaming chunks into AI SDK protocol chunks."
  []
  (fn [rf]
    (let [current-type (volatile! nil)
          current-id   (volatile! nil)
          message-id   (volatile! nil)
          model-name   (volatile! nil)
          payload      (volatile! {})
          close!       (fn [result]
                         (u/prog1 (rf result (merge {:type (case @current-type
                                                             :text          :text-end
                                                             :reasoning     :reasoning-end
                                                             :function_call :tool-input-available)}
                                                    @payload))
                           (vreset! current-type nil)
                           (vreset! current-id nil)
                           (vreset! payload {})))]
      (fn
        ([result]
         (cond-> result
           @current-type (close!)
           true          (rf)))
        ([result {:keys [id model choices usage]}]
         (let [choice        (first choices)
               delta         (:delta choice)
               finish-reason (:finish_reason choice)
               tool-call     (first (:tool_calls delta))
               chunk-type    (cond
                               (not-empty (:reasoning_content delta)) :reasoning
                               (not-empty (:content delta)) :text
                               (some? tool-call)            :function_call
                               :else                        nil)
               chunk-id      (or (:id tool-call) @current-id (core/mkid))]
           (cond-> result
             (and id (not @message-id)) (-> (rf {:type :start :messageId id})
                                            (u/prog1
                                              (vreset! message-id id)
                                              (vreset! model-name model)))
             (and @current-type
                  (or (and chunk-type
                           (not= chunk-type @current-type))
                      (and (= chunk-type :function_call)
                           (not= chunk-id @current-id)))) (close!)
             (and (= chunk-type :text)
                  (not= @current-type :text)) (-> (u/prog1
                                                    (let [text-id (core/mkid)]
                                                      (vreset! current-type :text)
                                                      (vreset! current-id text-id)
                                                      (vreset! payload {:id text-id})))
                                                  (rf (merge {:type :text-start} @payload)))
             (and (= chunk-type :text)
                  (some? (:content delta))) (rf {:type  :text-delta
                                                 :id    @current-id
                                                 :delta (:content delta)})
             (and (= chunk-type :reasoning)
                  (not= @current-type :reasoning)) (-> (u/prog1
                                                         (let [reasoning-id (core/mkid)]
                                                           (vreset! current-type :reasoning)
                                                           (vreset! current-id reasoning-id)
                                                           (vreset! payload {:id reasoning-id})))
                                                       (rf (merge {:type :reasoning-start} @payload)))
             (and (= chunk-type :reasoning)
                  (some? (:reasoning_content delta))) (rf {:type  :reasoning-delta
                                                           :id    @current-id
                                                           :delta (:reasoning_content delta)})
             (and (= chunk-type :function_call)
                  (:id tool-call)
                  (:name (:function tool-call))) (-> (u/prog1
                                                       (vreset! current-type :function_call)
                                                       (vreset! current-id (:id tool-call))
                                                       (vreset! payload {:toolCallId (:id tool-call)
                                                                         :toolName   (:name (:function tool-call))}))
                                                     (rf (merge {:type :tool-input-start} @payload))
                                                     (cond-> (not (str/blank? (:arguments (:function tool-call))))
                                                       (rf {:type           :tool-input-delta
                                                            :toolCallId     (:id tool-call)
                                                            :inputTextDelta (:arguments (:function tool-call))})))
             (and (= chunk-type :function_call)
                  (not (:id tool-call))
                  (some? (:arguments (:function tool-call)))) (rf {:type           :tool-input-delta
                                                                   :toolCallId     (:toolCallId @payload)
                                                                   :inputTextDelta (:arguments (:function tool-call))})
             (some? finish-reason) (cond->
                                    @current-type (close!))
             (some? usage) (rf {:type  :usage
                                :usage {:promptTokens     (:prompt_tokens usage 0)
                                        :completionTokens (:completion_tokens usage 0)}
                                :id    @message-id
                                :model @model-name}))))))))
