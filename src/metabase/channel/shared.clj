(ns metabase.channel.shared
  "Shared functions for channel implementations."
  (:require
   [clojure.string :as str]
   [malli.error :as me]
   [medley.core :as m]
   [metabase.driver :as driver]
   [metabase.util.i18n :refer [tru]]
   [metabase.util.log :as log]
   [metabase.util.malli.registry :as mr])
  (:import
   (java.util Locale)
   (net.redhogs.cronparser CronExpressionDescriptor Options)))

(set! *warn-on-reflection* true)

(defn validate-channel-details
  "Validate a value against a schema and throw an exception if it's invalid.
  The :errors key are used on the UI to display field-specific error messages."
  [schema value]
  (when-let [errors (some-> (mr/explain schema value)
                            me/humanize)]
    (throw (ex-info (tru "Invalid channel details") {:errors errors}))))

(defn- maybe-deref
  [x]
  (if (instance? clojure.lang.IDeref x)
    @x
    x))

(defn maybe-realize-data-rows
  "Realize the data rows in a [[metabase.notification.payload.execute/Part]].

  If the rows are stored in a StreamingTempFileStorage and the file is too large
  (> 10MB)[[metabase.notification.settings/notification-temp-file-size-max-bytes]], returns the part with an :error
  field set so the render pipeline will display an appropriate error message."
  [part]
  (when part
    (try
      (m/update-existing-in part [:result :data :rows] maybe-deref)
      (catch clojure.lang.ExceptionInfo e
        (if (= :notification/file-too-large
               (:type (ex-data e)))
          (let [{:keys [file-size max-size-human-readable]} (ex-data e)
                file-size-mb (/ file-size 1024.0 1024.0)]
            (log/warnf "🚫 Result file too large (%.2f MB > %s max). Skipping load to protect memory."
                       file-size-mb max-size-human-readable)
            ;; Return part with error marker so render pipeline shows an error
            (update part :result merge {:error (tru "Results too large to display. The query returned too much data to show in this notification.")
                                        :render/too-large? true
                                        :max-size-human-readable max-size-human-readable}))
          ;; Re-throw other exceptions
          (throw e))))))

(defn- schedule-timezone
  []
  (or (driver/report-timezone) "UTC"))

(defn- format-time
  "Format hour and minute into a 24-hour time string."
  [hour minute]
  (format "%02d:%02d" hour minute))

(defn- cron-description
  [cron-string]
  (try
    (let [description (CronExpressionDescriptor/getDescription
                       ^String cron-string
                       (doto (Options/twentyFourHour)
                         (.setZeroBasedDayOfWeek false))
                       Locale/CHINESE)]
      (format "运行%s（%s）" description (schedule-timezone)))
    (catch Exception e
      (log/errorf "Failed to parse cron expression %s: %s" cron-string (ex-message e))
      nil)))

(defn friendly-cron-description
  "Convert a cron string to a human-readable description."
  [cron-string]
  (let [[seconds minutes hours day-of-month month day-of-week year] (str/split cron-string #"\s+")
        timezone (schedule-timezone)]
    (cond
      ;; Hourly pattern
      (and
       (= seconds "0")
       (= minutes "0")
       (= hours "*")
       (or (nil? year) (= year "*"))
       (not= day-of-month "?")
       (not= month "?"))
      (format "每小时运行一次（%s）" timezone)

      ;; Hourly pattern with specific minutes
      (and
       (= seconds "0")
       (re-matches #"\d+" minutes)
       (= hours "*")
       (or (nil? year) (= year "*"))
       (not= day-of-month "?")
       (not= month "?"))
      (format "每小时第 %d 分钟运行（%s）"
              (Integer/parseInt minutes)
              timezone)

      ;; Daily pattern
      (and
       (= seconds "0")
       (re-matches #"\d+" minutes)
       (re-matches #"\d+" hours)
       (or (nil? year) (= year "*"))
       (= day-of-month "*")
       (= month "*"))
      (format "每天 %s 运行（%s）"
              (format-time (Integer/parseInt hours) (Integer/parseInt minutes))
              timezone)

      ;; Weekly pattern
      (and
       (= seconds "0")
       (re-matches #"\d+" minutes)
       (re-matches #"\d+" hours)
       (or (nil? year) (= year "*"))
       (= day-of-month "?")
       (= month "*")
       (re-matches #"\d+" day-of-week))
      (let [day-name (["日" "一" "二" "三" "四" "五" "六"]
                      (dec (Integer/parseInt day-of-week)))]
        (format "每周%s %s 运行（%s）"
                day-name
                (format-time (Integer/parseInt hours) (Integer/parseInt minutes))
                timezone))

      ;; Default case
      :else
      (cron-description cron-string))))
