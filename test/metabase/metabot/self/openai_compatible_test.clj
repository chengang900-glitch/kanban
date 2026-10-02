(ns metabase.metabot.self.openai-compatible-test
  (:require
   [clj-http.client :as http]
   [clojure.test :refer :all]
   [metabase.llm.settings :as llm.settings]
   [metabase.metabot.self.chat-completions :as chat-completions]
   [metabase.metabot.self.core :as self.core]
   [metabase.metabot.self.debug :as debug]
   [metabase.metabot.self.openai-compatible :as openai-compatible]
   [metabase.test :as mt]
   [metabase.util.json :as json])
  (:import
   (java.io ByteArrayInputStream)))

(set! *warn-on-reflection* true)

(defn- input-stream
  [s]
  (ByteArrayInputStream. (.getBytes ^String s "UTF-8")))

(deftest chat-completions-reasoning-content-test
  (testing "reasoning_content is streamed as reasoning before the final answer"
    (is (= [:start
            :reasoning-start
            :reasoning-delta
            :reasoning-delta
            :reasoning-end
            :text-start
            :text-delta
            :text-end]
           (mapv :type
                 (into []
                       (chat-completions/->aisdk-chunks-xf)
                       [{:id "chat-1"
                         :model "qwen"
                         :choices [{:delta {:reasoning_content "Checking "}}]}
                        {:choices [{:delta {:reasoning_content "the data"}}]}
                        {:choices [{:delta {:content "The answer is 42."}}]}
                        {:choices [{:delta {} :finish_reason "stop"}]}])))))
  (testing "reasoning is not replayed into the next provider request"
    (is (= [{:role "user" :content "question"}
            {:role "assistant" :content "answer"}]
           (chat-completions/parts->messages
            [{:role :user :content "question"}
             {:type :reasoning :text "private reasoning"}
             {:type :text :text "answer"}])))))

(deftest list-models-uses-configured-base-url-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [captured-request (atom nil)]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [request]
                        (reset! captured-request request)
                        {:body {:data [{:id "model-a"}]}})]
        (is (= {:models [{:id "model-a" :display_name "model-a"}]}
               (openai-compatible/list-models)))
        (is (=? {:method  :get
                 :url     "https://api.example/v1/models"
                 :headers {"Authorization" "Bearer provider-key"
                           "Content-Type"  "application/json"}}
                @captured-request))))))

(deftest openai-compatible-raw-uses-chat-completions-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [captured-request (atom nil)]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [request]
                        (reset! captured-request request)
                        {:body request})
         self.core/sse-reducible identity
         debug/capture-stream (fn [response _capture] response)]
        (openai-compatible/openai-compatible-raw
         {:model "model-a" :input [{:role :user :content "hello"}]})
        (is (=? {:method  :post
                 :url     "https://api.example/v1/chat/completions"
                 :headers {"Authorization" "Bearer provider-key"
                           "Content-Type"  "application/json"}}
                @captured-request))
        (is (= {:model          "model-a"
                :stream         true
                :stream_options {:include_usage true}
                :messages       [{:role "user" :content "hello"}]}
               (json/decode+kw (:body @captured-request))))))))

(deftest openai-compatible-raw-uses-responses-api-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"
     llm.settings/llm-openai-compatible-api-protocol "responses"]
    (let [captured-request (atom nil)]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [request]
                        (reset! captured-request request)
                        {:body request})
         self.core/sse-reducible identity
         debug/capture-stream (fn [response _capture] response)]
        (openai-compatible/openai-compatible-raw
         {:model "model-a" :input [{:role :user :content "hello"}]})
        (is (=? {:method  :post
                 :url     "https://api.example/v1/responses"
                 :headers {"Authorization" "Bearer provider-key"
                           "Content-Type"  "application/json"}}
                @captured-request))
        (is (=? {:model  "model-a"
                 :stream true
                 :store  false
                 :input  [{:role "user" :content "hello"}]}
                (json/decode+kw (:body @captured-request))))))))

(deftest openai-compatible-responses-stream-uses-openai-transformer-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"
     llm.settings/llm-openai-compatible-api-protocol "responses"]
    (mt/with-dynamic-fn-redefs
      [http/request (fn [_request]
                      {:body [{:type "response.created"
                               :response {:id "resp_1" :model "model-a"}}
                              {:type "response.output_item.added"
                               :item {:type "message" :id "item_1"}
                               :id "item_1"}
                              {:type "response.output_text.delta"
                               :delta "pong"
                               :id "item_1"}
                              {:type "response.output_item.done"
                               :item {:type "message" :id "item_1"}
                               :id "item_1"}
                              {:type "response.output_item.added"
                               :item {:type "function_call"
                                      :call_id "call_1"
                                      :name "lookup"}}
                              {:type "response.function_call_arguments.delta"
                               :delta "{\"id\":1}"}
                              {:type "response.output_item.done"
                               :item {:type "function_call"
                                      :call_id "call_1"
                                      :name "lookup"}}
                              {:type "response.completed"
                               :response {:id "resp_1"
                                          :usage {:input_tokens 3
                                                  :output_tokens 1}}}]})
       self.core/sse-reducible identity
       debug/capture-stream (fn [response _capture] response)]
      (is (= [:start
              :text-start
              :text-delta
              :text-end
              :tool-input-start
              :tool-input-delta
              :tool-input-available
              :usage]
             (mapv :type
                   (into []
                         (openai-compatible/openai-compatible
                          {:model "model-a"
                           :input [{:role :user :content "ping"}]}))))))))

(deftest openai-compatible-responses-stream-surfaces-terminal-error-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"
     llm.settings/llm-openai-compatible-api-protocol "responses"]
    (mt/with-dynamic-fn-redefs
      [http/request (fn [_request]
                      {:body [{:type "response.created"
                               :response {:id "resp_1" :model "model-a"}}
                              {:type "response.failed"
                               :response {:id "resp_1"
                                          :error {:message "provider failure"}}}]})
       self.core/sse-reducible identity
       debug/capture-stream (fn [response _capture] response)]
      (is (= [{:type :start :messageId "resp_1"}
              {:type :error :errorText "provider failure"}]
             (into []
                   (openai-compatible/openai-compatible
                    {:model "model-a"
                     :input [{:role :user :content "ping"}]})))))))

(deftest deepseek-streamed-thinking-tool-choice-error-retries-with-auto-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.deepseek.com"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [requests (atom [])]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [request]
                        (swap! requests conj request)
                        (if (= 1 (count @requests))
                          (throw (ex-info "Bad request"
                                          {:status 400
                                           :body   (input-stream
                                                    "{\"error\":{\"message\":\"Thinking mode does not support this tool_choice\"}}\n")}))
                          {:body request}))
         self.core/sse-reducible identity
         debug/capture-stream (fn [response _capture] response)]
        (openai-compatible/openai-compatible-raw
         {:model       "deepseek-v4-pro"
          :input       [{:role :user :content "Call connection_check."}]
          :tools       [{:tool-name "connection_check"
                         :doc       "Confirm tool calling support."
                         :schema    [:=> [:cat [:map {:closed true}]] :any]
                         :fn        (constantly {:ok true})}]
          :tool_choice "required"})
        (is (= 2 (count @requests)))
        (is (=? {:tool_choice "required"}
                (json/decode+kw (:body (first @requests)))))
        (is (=? {:tool_choice "auto"}
                (json/decode+kw (:body (second @requests)))))
        (is (not (contains? (json/decode+kw (:body (second @requests))) :thinking)))
        (is (not (contains? (json/decode+kw (:body (second @requests))) :enable_thinking)))))))

(deftest sensenova-streamed-thinking-tool-choice-error-retries-with-auto-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://token.sensenova.cn/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [requests (atom [])]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [request]
                        (swap! requests conj request)
                        (if (= 1 (count @requests))
                          (throw (ex-info "Bad request"
                                          {:status 400
                                           :body   (input-stream
                                                    "<400> InternalError.Algo.InvalidParameter: The tool_choice parameter does not support being set to required or object in thinking mode")}))
                          {:body request}))
         self.core/sse-reducible identity
         debug/capture-stream (fn [response _capture] response)]
        (openai-compatible/openai-compatible-raw
         {:model       "deepseek-v4-flash"
          :input       [{:role :user :content "Call connection_check."}]
          :tools       [{:tool-name "connection_check"
                         :doc       "Confirm tool calling support."
                         :schema    [:=> [:cat [:map {:closed true}]] :any]
                         :fn        (constantly {:ok true})}]
          :tool_choice "required"})
        (is (= 2 (count @requests)))
        (is (=? {:tool_choice "auto"}
                (json/decode+kw (:body (second @requests)))))
        (is (not (contains? (json/decode+kw (:body (second @requests))) :thinking)))
        (is (not (contains? (json/decode+kw (:body (second @requests))) :enable_thinking)))))))

(deftest unrelated-tool-choice-error-is-not-retried-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [request-count (atom 0)]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [_request]
                        (swap! request-count inc)
                        (throw (ex-info "Bad request"
                                        {:status 400
                                         :body   "{\"error\":{\"message\":\"Invalid request\"}}"})))]
        (is (thrown-with-msg?
             clojure.lang.ExceptionInfo
             #"OpenAI-compatible provider rejected the request"
             (openai-compatible/openai-compatible-raw
              {:model       "model-a"
               :input       [{:role :user :content "Call connection_check."}]
               :tools       [{:tool-name "connection_check"
                              :doc       "Confirm tool calling support."
                              :schema    [:=> [:cat [:map {:closed true}]] :any]
                              :fn        (constantly {:ok true})}]
               :tool_choice "required"})))
        (is (= 1 @request-count))))))

(deftest deepseek-error-without-tool-choice-is-not-retried-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.deepseek.com"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [request-count (atom 0)]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [_request]
                        (swap! request-count inc)
                        (throw (ex-info "Bad request"
                                        {:status 400
                                         :body   "{\"error\":{\"message\":\"Invalid request\"}}"})))]
        (is (thrown-with-msg?
             clojure.lang.ExceptionInfo
             #"OpenAI-compatible provider rejected the request"
             (openai-compatible/openai-compatible-raw
              {:model "deepseek-v4-pro"
               :input [{:role :user :content "hello"}]})))
        (is (= 1 @request-count))))))

(deftest thinking-error-without-tool-choice-marker-is-not-retried-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [request-count (atom 0)]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [_request]
                        (swap! request-count inc)
                        (throw (ex-info "Thinking mode is unsupported" {:status 400})))]
        (is (thrown? clojure.lang.ExceptionInfo
                     (openai-compatible/openai-compatible-raw
                      {:model       "model-a"
                       :input       [{:role :user :content "hello"}]
                       :tool_choice "required"})))
        (is (= 1 @request-count))))))

(deftest matching-thinking-tool-choice-error-with-non-400-status-is-not-retried-test
  (mt/with-temporary-setting-values
    [llm.settings/llm-openai-compatible-api-base-url "https://api.example/v1"
     llm.settings/llm-openai-compatible-api-key "provider-key"]
    (let [request-count (atom 0)]
      (mt/with-dynamic-fn-redefs
        [http/request (fn [_request]
                        (swap! request-count inc)
                        (throw (ex-info "tool_choice is unsupported in thinking mode" {:status 500})))]
        (is (thrown? clojure.lang.ExceptionInfo
                     (openai-compatible/openai-compatible-raw
                      {:model       "model-a"
                       :input       [{:role :user :content "hello"}]
                       :tool_choice "required"})))
        (is (= 1 @request-count))))))
