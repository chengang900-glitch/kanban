(ns metabase.channel.shared-test
  (:require
   [clojure.string :as str]
   [clojure.test :refer :all]
   [metabase.channel.shared :as channel.shared]
   [metabase.test :as mt]))

(deftest cron-to-friendly-description-test
  (mt/with-dynamic-fn-redefs [channel.shared/schedule-timezone (constantly "UTC")]
    (testing "converts cron expressions to human-readable descriptions"
      (are [cron expected] (= expected (channel.shared/friendly-cron-description cron))
        ;; Hourly patterns
        "0 0 * * * ?"    "每小时运行一次（UTC）"
        "0 0 * * * ? *"  "每小时运行一次（UTC）"
        "0 30 * * * ?"   "每小时第 30 分钟运行（UTC）"

        ;; Daily patterns
        "0 0 12 * * ?"   "每天 12:00 运行（UTC）"
        "0 0 12 * * ? *" "每天 12:00 运行（UTC）"
        "0 30 9 * * ?"   "每天 09:30 运行（UTC）"
        "0 15 17 * * ?"  "每天 17:15 运行（UTC）"
        "0 0 0 * * ?"    "每天 00:00 运行（UTC）"

        ;; Weekly patterns
        "0 0 9 ? * 2"    "每周一 09:00 运行（UTC）"
        "0 0 9 ? * 2 *"  "每周一 09:00 运行（UTC）"
        "0 30 17 ? * 6"  "每周五 17:30 运行（UTC）"
        "0 0 0 ? * 1"    "每周日 00:00 运行（UTC）"
        "0 45 14 ? * 4"  "每周三 14:45 运行（UTC）"))
    (testing "falls back to cron->description for complex patterns"
      (doseq [cron ["0 0 12 1-15 * ?"
                    "0 0/15 * * * ?"
                    "0 0 12 ? * 2,4,6"
                    "0 0 12 L * ?"
                    "0 0 12 ? * 2#1"]]
        (let [description (channel.shared/friendly-cron-description cron)]
          (is (str/starts-with? description "运行"))
          (is (str/ends-with? description "（UTC）"))
          (is (not (str/includes? description "Run")))))))
  (mt/with-dynamic-fn-redefs [channel.shared/schedule-timezone (constantly "Asia/Ho_Chi_Minh")]
    (testing "with timezone Asia/Ho_Chi_Minh"
      (is (= "每小时运行一次（Asia/Ho_Chi_Minh）" (channel.shared/friendly-cron-description "0 0 * * * ?"))))))
