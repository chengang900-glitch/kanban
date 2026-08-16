(ns i18n.create-artifacts.frontend
  (:require
   ^{:clj-kondo/ignore [:discouraged-namespace]}
   [cheshire.core :as json]
   [clojure.java.io :as io]
   [clojure.string :as str]
   [i18n.common :as i18n]
   [metabuild-common.core :as u])
  (:import
   (java.io FileOutputStream OutputStreamWriter)
   (java.nio.charset StandardCharsets)))

(set! *warn-on-reflection* true)

(defn- frontend-message?
  "Whether this i18n `message` comes from a frontend source file."
  [{:keys [source-references]}]
  (some #(re-find #"frontend|cljs|cljc" %) source-references))

(defn- ->ttag-reference
  "Replace an xgettext `{0}` style reference with a ttag `${ 0 }` style reference."
  [message-id]
  (str/replace message-id #"\{\s*(\d+)\s*\}" "\\${ $1 }"))

(def ^:private chinese-locales #{"zh-CN" "zh-HK" "zh-TW"})

(def ^:private product-name-exclusions
  #{"Metabase is a Trademark of Metabase, Inc"})

(defn- replace-product-name [locale message-id translated-string]
  (if (or (not (str/includes? message-id "Metabase"))
          (contains? product-name-exclusions message-id))
    translated-string
    (let [product-name (if (contains? chinese-locales locale)
                         "数据看板"
                         "Dashboard")]
      (cond-> (str/replace translated-string #"Metabase\p{Ll}*" product-name)
        (= locale "zh-CN") (str/replace "系统" product-name)))))

(defn- brand-message [locale {:keys [id] :as message}]
  (cond-> message
    (:str message)
    (update :str #(replace-product-name locale id %))

    (:str-plural message)
    (update :str-plural
            (fn [translations]
              (map #(replace-product-name locale id %) translations)))))

(defn- ->translations-map [locale messages drop-msgids]
  {"" (into {}
            (comp
             ;; filter out i18n messages that aren't used on the FE client
             (filter frontend-message?)
             (remove (fn [{:keys [id]}] (contains? drop-msgids id)))
             (map #(brand-message locale %))
             i18n/print-message-count-xform
             (map (fn [message]
                    [(->ttag-reference (:id message))
                     (if (:plural? message)
                       {:msgid_plural (:id-plural message)
                        :msgstr       (map ->ttag-reference (:str-plural message))}
                       {:msgstr [(->ttag-reference (:str message))]})])))
            messages)})

(defn- ->i18n-map
  "Convert the contents of a `.po` file to map format used in the frontend client."
  [locale po-contents drop-msgids]
  {:charset      "utf-8"
   :headers      (into {} (for [[k v] (:headers po-contents)]
                            [(str/lower-case k) v]))
   :translations (->translations-map locale (:messages po-contents) drop-msgids)})

(def target-directory
  "Target directory for frontend i18n resources."
  (u/filename u/project-root-directory "resources" "frontend_client" "app" "locales"))

(defn- target-filename [locale]
  (u/filename target-directory (format "%s.json" (str/replace locale #"-" "_"))))

(defn create-artifact-for-locale!
  "Create an artifact with translated strings for `locale` for frontend (JS) usage.

  `drop-msgids` is a set of English source strings to exclude from the output (typically those
  whose translations had fatal validation errors).

  `po-contents` is the parsed + autofixed `.po` content from
  `(i18n.autofix/autofix-po-contents (i18n.common/po-contents locale))`. Passed by the caller
  rather than re-parsed here so scanner and writer stay in sync."
  [locale drop-msgids po-contents]
  (let [target-file (target-filename locale)]
    (u/step (format "Create frontend artifact %s from %s" target-file (i18n/locale-source-po-filename locale))
      (u/create-directory-unless-exists! target-directory)
      (u/delete-file-if-exists! target-file)
      (u/step "Write JSON"
        (with-open [os (FileOutputStream. (io/file target-file))
                    w  (OutputStreamWriter. os StandardCharsets/UTF_8)]
          (json/generate-stream (->i18n-map locale po-contents drop-msgids) w)))
      (u/assert-file-exists target-file))))

(defn create-english-artifact!
  "Create the English frontend catalog so product-name branding is also applied to source strings."
  []
  (let [po-contents (-> (i18n/po-contents "metabase")
                        (assoc-in [:headers "Language"] "en")
                        (update :messages
                                (fn [messages]
                                  (map (fn [{:keys [id id-plural] :as message}]
                                         (assoc message
                                                :str id
                                                :str-plural (when id-plural [id id-plural])))
                                       messages))))]
    (create-artifact-for-locale! "en" #{} po-contents)))
