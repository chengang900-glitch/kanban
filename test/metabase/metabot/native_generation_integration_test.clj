(ns metabase.metabot.native-generation-integration-test
  "Integration tests for native example question generation path."
  (:require
   [clojure.set :as set]
   [clojure.test :refer :all]
   [metabase.collections.models.collection :as collection]
   [metabase.lib.core :as lib]
   [metabase.lib.metadata :as lib.metadata]
   [metabase.metabot.example-question-generator :as native-generator]
   [metabase.test :as mt]
   [toucan2.core :as t2]))

(set! *warn-on-reflection* true)

(defn- make-native-prompt-generator
  "Create a mock that mimics the native generator's per-item output shape."
  [prompts-by-name]
  (fn [payload]
    {:table_questions  (mapv (fn [table]
                               {:questions (get prompts-by-name (:name table) [])})
                             (:tables payload))
     :metric_questions (mapv (fn [metric]
                               {:questions (get prompts-by-name (:name metric) [])})
                             (:metrics payload))}))

(deftest regenerate-endpoint-with-native-path-test
  (mt/dataset test-data
    (let [mp (mt/metadata-provider)
          model-source-query (lib/query mp (lib.metadata/table mp (mt/id :products)))
          metric-source-query (-> model-source-query
                                  (lib/aggregate (lib/avg (lib.metadata/field mp (mt/id :products :rating))))
                                  (lib/breakout (lib/with-temporal-bucket
                                                  (lib.metadata/field mp (mt/id :products :created_at)) :week)))
          metric-data {:description "Test metric"
                       :dataset_query (lib/->legacy-MBQL metric-source-query)
                       :type :metric}
          model-data  {:description "Test model"
                       :dataset_query (lib/->legacy-MBQL model-source-query)
                       :type :model}
          question-data {:description "Test question"
                         :dataset_query (lib/->legacy-MBQL model-source-query)
                         :type :question}]
      (mt/with-temp [:model/Collection {coll-id :id}   {}
                     :model/Collection {child-id :id}  {:location (collection/location-path coll-id)}
                     :model/Card _ (assoc model-data  :name "NativeModel1"  :collection_id coll-id)
                     :model/Card _ (assoc metric-data :name "NativeMetric1" :collection_id child-id)
                     :model/Card _ (assoc question-data :name "NativeQuestion1" :collection_id coll-id)
                     :model/Card {dashboard-card-id :id} (assoc question-data :name "DashboardQuestion"
                                                                :collection_id child-id)
                     :model/Dashboard {dashboard-id :id} {:name "NativeDashboard" :collection_id coll-id}
                     :model/DashboardCard _ {:dashboard_id dashboard-id :card_id dashboard-card-id}
                     :model/Metabot {metabot-id :id} {:name "native-test-bot" :collection_id coll-id}]
        (let [prompts-by-name {"NativeModel1"  ["native q1" "native q2" "native q3" "native q4" "native q5"]
                               "NativeMetric1" ["native m1" "native m2" "native m3" "native m4" "native m5"]
                               "NativeQuestion1" ["native direct question"]
                               "DashboardQuestion" ["native dashboard question"]}
              native-mock (make-native-prompt-generator prompts-by-name)]
          (testing "regenerate endpoint works with native path"
            (with-redefs [native-generator/generate-example-questions native-mock]
              (is (=? {:status "generated" :prompt_count 12}
                      (mt/user-http-request :crowberto :post 200
                                            (format "metabot/metabot/%d/prompt-suggestions/regenerate" metabot-id)))))
            (let [prompts (t2/select [:model/MetabotPrompt :prompt :model [:card.name :model_name]]
                                     :metabot_id metabot-id
                                     {:join     [[:report_card :card] [:= :card.id :card_id]]
                                      :order-by [:metabot_prompt.id]})]
              (is (= 12 (count prompts)))
              (is (= (set (mapcat val prompts-by-name))
                     (set (map :prompt prompts))))
              (is (= #{:model :metric :question}
                     (set (map :model prompts)))))
            (let [response (mt/user-http-request
                            :crowberto :get 200
                            (format "metabot/metabot/%d/prompt-suggestions" metabot-id))]
              (is (= 12 (:total response)))
              (is (= #{"metric" "model" "question"}
                     (set (map :model (:prompts response)))))))
          (testing "native path prompts are replaced on re-regenerate"
            (let [old-ids (t2/select-pks-set :model/MetabotPrompt :metabot_id metabot-id)]
              (with-redefs [native-generator/generate-example-questions native-mock]
                (is (=? {:status "generated" :prompt_count 12}
                        (mt/user-http-request :crowberto :post 200
                                              (format "metabot/metabot/%d/prompt-suggestions/regenerate" metabot-id)))))
              (let [new-ids (t2/select-pks-set :model/MetabotPrompt :metabot_id metabot-id)]
                (is (= 12 (count new-ids)))
                (is (empty? (set/intersection old-ids new-ids)))))))))))
