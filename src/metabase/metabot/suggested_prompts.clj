(ns metabase.metabot.suggested-prompts
  (:require
   [medley.core :as m]
   [metabase.lib-be.core :as lib-be]
   [metabase.metabot.example-question-generator :as native-generator]
   [metabase.metabot.tools.entity-details :as metabot.tools.entity-details]
   [metabase.metabot.tools.util :as metabot.tools.u]
   [metabase.metabot.usage :as metabot.usage]
   [metabase.util.log :as log]
   [toucan2.core :as t2]))

(set! *warn-on-reflection* true)

(defn- column-input
  [{:keys [base_type effective_type] :as answer-source-column}]
  (some-> answer-source-column
          (select-keys [:name :description :table-reference])
          (assoc :type (or effective_type base_type))))

(defn- metric-input
  [{:keys [queryable-dimensions default-time-dimension-field-id] :as answer-source-metric}]
  (let [default-time-dimension (when default-time-dimension-field-id
                                 (-> (m/find-first (comp #{default-time-dimension-field-id} :field-id)
                                                   queryable-dimensions)
                                     column-input))]
    (-> answer-source-metric
        (select-keys [:name :description])
        (assoc :queryable-dimensions (map column-input queryable-dimensions))
        (m/assoc-some :default-time-dimension default-time-dimension))))

(defn- model-input
  [answer-source-model]
  (-> answer-source-model
      (select-keys [:name :description :fields])
      (update :fields #(map column-input %))))

(def ^:private default-opts
  {:limit 20})

(defn- generate-questions-with-fallback
  "Generate example questions using the configured path."
  [payload]
  (let [result (native-generator/generate-example-questions payload)]
    (log/info "Native example question generation succeeded"
              {:table-results  (count (:table_questions result))
               :metric-results (count (:metric_questions result))})
    result))

(defn generate-sample-prompts
  "Generate suggested prompts for the Metabot with `metabot-id`. Returns one of:

     {:status :generated :prompt_count N}        ; happy path
     {:status :no-library-content}               ; metabot has no supported collection content
     {:status :ai-produced-no-prompts}           ; LLM returned 0 questions for the inputs

   Throws a 402 via [[metabot.usage/check-metabase-managed-free-limit!]] when the managed AI cap is hit.
   Best-effort callers (e.g. the suggested-prompts-refresh job) pre-guard with
   [[metabot.usage/managed-free-limit-reached?]] and catch the 402 to handle the rare TOCTOU race where
   the limit flips between the two checks."
  ;; TODO (Chris 2026-06-09) -- include warehouse tables (esp. library/published) in prompt inputs.
  ;; Needs a `table_id` column on metabot_prompt (+ serdes + API + FE rendering of table-backed prompts).
  ;; TODO (Chris 2026-06-09) -- @mentioned entities should seed prompts and bypass the curated filter
  ;; (the user picked them deliberately); wire once the agent's @mention context assembly is settled.
  [metabot-id & {:as opts}]
  (metabot.usage/check-metabase-managed-free-limit!)
  (let [opts (merge default-opts opts)]
    (lib-be/with-metadata-provider-cache
      (let [{metrics :metric models :model questions :question}
            (->> (metabot.tools.u/get-prompt-source-cards metabot-id opts)
                 (sort-by :view_count >)
                 (group-by :type))
            ;; Limit each supported source type so generation stays bounded.
            limited-cards (concat (take 5 metrics) (take 5 models) (take 5 questions))
            {metrics :metric, models :model, questions :question}
            (->> (for [[[card-type database-id] group-cards] (group-by (juxt :type :database_id) limited-cards)
                       detail (map (fn [detail card] (assoc detail ::origin card))
                                   (metabot.tools.entity-details/cards-details card-type database-id group-cards nil)
                                   group-cards)]
                   detail)
                 (group-by :type))
            metric-inputs (map metric-input metrics)
            table-sources (concat models questions)
            table-inputs  (map model-input table-sources)]
        (if (and (empty? metric-inputs) (empty? table-inputs))
          (do
            (log/info "Skipping suggested prompt generation: metabot has no supported collection content."
                      {:metabot-id metabot-id})
            {:status :no-library-content})
          (let [{:keys [table_questions metric_questions]}
                (generate-questions-with-fallback {:metrics metric-inputs, :tables table-inputs})
                ->prompt (fn [{:keys [questions]} {::keys [origin]}]
                           (let [base {:metabot_id metabot-id
                                       :model      (:type origin)
                                       :card_id    (:id origin)}]
                             (map #(assoc base :prompt %) questions)))
                ;; Realize into vectors so we don't redo `->prompt` work when counting and inserting.
                metric-prompts (vec (mapcat ->prompt metric_questions metrics))
                table-prompts  (vec (mapcat ->prompt table_questions table-sources))
                total          (+ (count metric-prompts) (count table-prompts))]
            (when (seq metric-prompts)
              (t2/insert! :model/MetabotPrompt metric-prompts))
            (when (seq table-prompts)
              (t2/insert! :model/MetabotPrompt table-prompts))
            (if (zero? total)
              {:status :ai-produced-no-prompts}
              {:status :generated :prompt_count total})))))))

(defn delete-all-metabot-prompts
  "Drop suggested prompts for instance of Metabot."
  [metabot-id]
  (t2/delete! :model/MetabotPrompt {:where [:= :metabot_id metabot-id]}))
