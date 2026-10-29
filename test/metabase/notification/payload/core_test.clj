(ns metabase.notification.payload.core-test
  (:require
   [clojure.test :refer :all]
   [clojure.walk :as walk]
   [metabase.appearance.core :as appearance]
   [metabase.channel.email.logo :as email.logo]
   [metabase.channel.email.messages :as email.messages]
   [metabase.notification.core :as notification]
   [metabase.notification.payload.core :as payload]
   [metabase.notification.test-util :as notification.tu]
   [metabase.test :as mt]))

(set! *warn-on-reflection* true)

(deftest lib-metadata-stripped-from-payload-test
  (testing "lib/metadata keys are stripped from the realized notification payload"
    (notification.tu/with-card-notification
      [notification {}]
      (let [payload (notification/notification-payload notification)]
        (walk/prewalk
         (fn [x]
           (when (map? x)
             (is (not (contains? x :lib/metadata))
                 "No :lib/metadata should survive in the notification payload"))
           x)
         payload)))))

(deftest application-branding-test
  (mt/with-temporary-setting-values [site-locale "en"]
    (with-redefs [appearance/application-name (constantly "Metabase")
                  appearance/site-name (constantly "UhooAI")
                  appearance/application-logo-url (constantly "app/assets/img/logo.svg")]
      (is (= "UhooAI" (email.messages/app-name-trs)))
      (is (= "UhooAI" (#'payload/display-application-name)))
      (is (nil? (#'payload/logo-url))))
    (with-redefs [appearance/application-name (constantly "Metabase")
                  appearance/site-name (constantly "Metabase")]
      (is (= "Dashboard" (email.messages/app-name-trs)))
      (is (= "Dashboard" (#'payload/display-application-name)))))
  (is (nil? (email.logo/logo-bundle "app/assets/img/logo.svg")))
  (is (= {:image-src "https://example.invalid/custom.svg" :attachment nil}
         (email.logo/logo-bundle "https://example.invalid/custom.svg"))))
