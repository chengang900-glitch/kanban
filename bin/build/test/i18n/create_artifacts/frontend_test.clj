(ns i18n.create-artifacts.frontend-test
  (:require
   [clojure.test :refer :all]
   [i18n.common :as i18n]
   [i18n.create-artifacts.frontend :as frontend]
   [i18n.create-artifacts.test-common :as test-common]))

(deftest ->ttag-reference-test
  (is (= "${ 0 } schemas"
         (#'frontend/->ttag-reference "{0} schemas"))))

(deftest ->i18n-map-test
  (is (= {:charset      "utf-8"
          :headers      {"mime-version"              "1.0"
                         "content-type"              "text/plain; charset=UTF-8"
                         "content-transfer-encoding" "8bit"
                         "x-generator"               "POEditor.com"
                         "project-id-version"        "Metabase"
                         "language"                  "es"
                         "plural-forms"              "nplurals=2; plural=(n != 1);"}
          :translations {""
                         {"No table description yet"
                          {:msgstr ["No hay una descripción de la tabla"]}

                          "Count of ${ 0 }"
                          {:msgstr ["Número de ${ 0 }"]}

                          "${ 0 } Queryable Table"
                          {:msgid_plural "{0} Queryable Tables"
                           :msgstr       ["${ 0 } Tabla Consultable" "${ 0 } Tablas consultables"]}

                          "${ 0 } metric"
                          {:msgid_plural "{0} metrics"
                           :msgstr       ["${ 0 } metrik" ""]}

                          "Average of ${ 0 }"
                          {:msgstr ["Average of ${ 0 }"]}

                          "Median of ${ 0 }"
                          {:msgstr ["Median of ${ 0 }"]}

                          "Year"
                          {:msgid_plural "Years"
                           :msgstr       ["Año" "Años"]}}

                         "Date granularity option, distinct from the pluralized unit"
                         {"Year"
                          {:msgstr ["Año"]}}}}
         (#'frontend/->i18n-map "es" test-common/po-contents #{})))
  (testing "a msgid that exists under several contexts keeps one entry per context, so neither
  translation (nor a plural form) is lost"
    (let [{translations :translations} (#'frontend/->i18n-map "es" test-common/po-contents #{})]
      (is (= {:msgid_plural "Years", :msgstr ["Año" "Años"]}
             (get-in translations ["" "Year"])))
      (is (= {:msgstr ["Año"]}
             (get-in translations ["Date granularity option, distinct from the pluralized unit"
                                   "Year"]))))))

(deftest brand-message-test
  (is (= "数据看板 {0}"
         (:str (#'frontend/brand-message "zh-CN" {:id "Metabase {0}" :str "Metabase {0}"}))))
  (is (= "Metabase AI service"
         (:str (#'frontend/brand-message "en" {:id "Metabase AI service" :str "Metabase AI service"}))))
  (is (= "Metabase is a Trademark of Metabase, Inc"
         (:str (#'frontend/brand-message "en" {:id "Metabase is a Trademark of Metabase, Inc"
                                               :str "Metabase is a Trademark of Metabase, Inc"})))))

(deftest customized-chinese-chart-terminology-test
  (let [translations (:translations (#'frontend/->i18n-map "zh-CN" (i18n/po-contents "zh-CN") #{}))
        translation #(get-in translations ["" % :msgstr 0])]
    (testing "saved Question objects use chart terminology, without changing error semantics"
      (is (= "图表" (translation "Question")))
      (is (= "新建图表" (translation "Ask a question")))
      (is (= "替换还是另存为新图表？" (translation "Replace or save as new?")))
      (is (= "你的图表出现问题" (translation "There was a problem with your question"))))
    (testing "ordinary AI questions retain their meanings"
      (is (= "向 AI 提问..." (translation "Ask AI a question...")))
      (is (= "向 AI 提问。" (translation "Ask questions to AI."))))))
