(ns metabase.server.routes.index-test
  (:require
   [clojure.test :refer :all]
   [metabase.server.routes.index :as index]
   [metabase.test :as mt]
   [metabase.util.i18n :as i18n]
   [metabase.util.json :as json]))

(deftest ^:parallel localization-json-file-name-test
  (is (= "frontend_client/app/locales/es.json"
         (#'index/localization-json-file-name "es")))
  (is (= "frontend_client/app/locales/es_MX.json"
         (#'index/localization-json-file-name "es-MX"))))

(deftest ^:parallel load-localization-test
  (testing "make sure `load-localization` is correctly loading i18n files (#9938)"
    (is (= {"charset"      "utf-8"
            "headers"      {"mime-version"              "1.0"
                            "content-type"              "text/plain; charset=UTF-8"
                            "content-transfer-encoding" "8bit"
                            "x-generator"               "POEditor.com"
                            "project-id-version"        "Metabase"
                            "language"                  "es"
                            "plural-forms"              "nplurals=2; plural=(n != 1);"}
            "translations" {"" {"Your database has been added!" {"msgstr" ["¡Tu base de datos ha sido añadida!"]}}}}
           (some->
            (binding [i18n/*user-locale* "es_for_test"]
              (#'index/load-localization nil))
            json/decode
            (update "translations" select-keys [""])
            (update-in ["translations" ""] select-keys ["Your database has been added!"]))))))

(deftest ^:parallel fallback-localization-test
  (testing "if locale does not exist it should log a message and return the 'fallback' localalization (english)"
    (is (= {"headers"      {"language" "xx", "plural-forms" "nplurals=2; plural=(n != 1);"}
            "translations" {"" {"Metabase" {"msgid" "Metabase", "msgstr" ["Dashboard"]}}}}
           (some->
            (binding [i18n/*user-locale* "xx"]
              (#'index/load-localization nil))
            json/decode)))))

(deftest ^:parallel english-test
  (testing "english should load the branded English catalog"
    (is (= {"charset"      "utf-8"
            "headers"      {"language" "en"}
            "translations" {"" {"Welcome to Metabase" {"msgstr" ["Welcome to Dashboard"]}
                                "Metabase is a Trademark of Metabase, Inc"
                                {"msgstr" ["Metabase is a Trademark of Metabase, Inc"]}}}}
           (some->
            (binding [i18n/*user-locale* "en"]
              (#'index/load-localization nil))
            json/decode
            (update "headers" select-keys ["language"])
            (update "translations" select-keys [""])
            (update-in ["translations" ""]
                       select-keys
                       ["Welcome to Metabase" "Metabase is a Trademark of Metabase, Inc"]))))))

(deftest ^:parallel override-localization-test
  (testing "a valid override is honored no matter what the user locale is"
    (is (= {"charset"      "utf-8"
            "headers"      {"mime-version"              "1.0"
                            "content-type"              "text/plain; charset=UTF-8"
                            "content-transfer-encoding" "8bit"
                            "x-generator"               "POEditor.com"
                            "project-id-version"        "Metabase"
                            "language"                  "es"
                            "plural-forms"              "nplurals=2; plural=(n != 1);"}
            "translations" {"" {"Your database has been added!" {"msgstr" ["¡Tu base de datos ha sido añadida!"]}}}}
           (some->
            (binding [i18n/*user-locale* "xx"]
              (#'index/load-localization "es_for_test"))
            json/decode
            (update "translations" select-keys [""])
            (update-in ["translations" ""] select-keys ["Your database has been added!"])))))
  (testing "an invalid override causes a fallback to English"
    (is (= {"headers"      {"language" "yy", "plural-forms" "nplurals=2; plural=(n != 1);"}
            "translations" {"" {"Metabase" {"msgid" "Metabase", "msgstr" ["Dashboard"]}}}}
           (some->
            (binding [i18n/*user-locale* "xx"]
              (#'index/load-localization "yy"))
            json/decode)))))

(deftest load-entrypoint-template-contains-user-locale
  (binding [i18n/*user-locale* "es"]
    (is (= "es" (:language (#'index/template-parameters false {})))))
  (binding [i18n/*user-locale* "en"]
    (is (= "en" (:language (#'index/template-parameters false {})))))
  (mt/with-temporary-setting-values [site-locale "es"]
    ;; site locale is used as the default
    (is (= "es" (:language (#'index/template-parameters false {}))))
    ;; but we can override with the user locale
    (binding [i18n/*user-locale* "fr"]
      (is (= "fr" (:language (#'index/template-parameters false {})))))))

(deftest login-bootstrap-includes-site-name-test
  (mt/with-temporary-setting-values [site-name "国能数据看板"]
    (is (= "国能数据看板"
           (get (json/decode (:bootstrapJSON (#'index/template-parameters false {})))
                "site-name")))))

(deftest display-application-name-test
  (mt/with-temporary-setting-values [application-name "Metabase"]
    (binding [i18n/*user-locale* "zh-CN"]
      (is (= "数据看板" (:applicationName (#'index/template-parameters false {})))))
    (binding [i18n/*user-locale* "en"]
      (is (= "Dashboard" (:applicationName (#'index/template-parameters false {}))))))
  (mt/with-temporary-setting-values [application-name "自定义名称"]
    (binding [i18n/*user-locale* "zh-CN"]
      ;; The OSS getter remains feature-gated and returns its default value.
      (is (= "数据看板" (:applicationName (#'index/template-parameters false {})))))))
