(ns metabase.sso.keycloak.settings
  "Configuration for the independently maintained OSS Keycloak integration."
  (:require
   [clojure.string :as str]
   [metabase.settings.core :as setting :refer [defsetting]]
   [metabase.system.core :as system]
   [metabase.util :as u]
   [metabase.util.encryption :as encryption]
   [metabase.util.i18n :refer [deferred-tru]])
  (:import
   (java.net URI)))

(set! *warn-on-reflection* true)

(defsetting oss-keycloak-enabled
  (deferred-tru "Enable the independently developed OSS Keycloak login.")
  :type :boolean :default false :visibility :public :setter :none :export? false)

(defsetting oss-keycloak-issuer
  (deferred-tru "Exact issuer URL for the Keycloak realm.")
  :visibility :internal :setter :none :export? false :encryption :no)

(defsetting oss-keycloak-client-id
  (deferred-tru "Confidential client ID for OSS Keycloak login.")
  :visibility :internal :setter :none :export? false :encryption :no)

(defsetting oss-keycloak-client-secret
  (deferred-tru "Confidential client secret for OSS Keycloak login.")
  :visibility :internal :setter :none :export? false :audit :no-value
  :encryption :when-encryption-key-set
  :getter (fn [] (when (setting/get-value-of-type :string :oss-keycloak-client-secret) "********")))

(defsetting oss-keycloak-portal-path
  (deferred-tru "Fixed same-origin portal return path after OSS Keycloak login.")
  :default "/portal/data" :visibility :internal :setter :none :export? false :encryption :no)

(defsetting oss-workspace-embedding-enabled
  (deferred-tru "Allow the OSS workspace to be framed by the same origin.")
  :type :boolean :default false :visibility :internal :setter :none :export? false)

(defn fail!
  "Fail with a sanitized, status-coded message, without token or secret material."
  [status message]
  (throw (ex-info message {:status-code status})))

(defn origin
  "Canonical HTTP(S) origin, excluding userinfo, query, fragment and path."
  [url]
  (try
    (let [uri (URI. ^String url)
          scheme (.getScheme uri)
          host (.getHost uri)
          port (.getPort uri)]
      (when (and (#{"https" "http"} scheme) host (nil? (.getRawUserInfo uri)))
        (str scheme "://" (u/lower-case-en host)
             (when-not (or (= port -1) (= [scheme port] ["https" 443]) (= [scheme port] ["http" 80]))
               (str ":" port)))))
    (catch Exception _ nil)))

(defn trusted-url?
  "Accept an explicitly configured HTTP or HTTPS URL without credentials, query or fragment."
  [url]
  (try
    (let [uri (URI. ^String url)]
      (and (origin url) (nil? (.getRawQuery uri)) (nil? (.getRawFragment uri))))
    (catch Exception _ false)))

(defn portal-path
  "Return the fixed portal path; never accept a caller-supplied redirect."
  []
  (let [path (oss-keycloak-portal-path)]
    (when-not (and (string? path) (re-matches #"/[A-Za-z0-9/_-]+" path)
                   (not (str/starts-with? path "//")))
      (fail! 503 "OSS Keycloak portal path must be a plain absolute path."))
    path))

(defn site-base
  "External Metabase URL without a trailing slash, including the proxy prefix."
  []
  (str/replace (system/site-url) #"/+$" ""))

(defn auth-url
  "External OSS Keycloak auth URL under the configured application prefix."
  [suffix]
  (str (site-base) "/auth/keycloak/" suffix))

(defn configuration
  "Read validated server-only configuration; no request can override issuer or credentials."
  []
  (when-not (oss-keycloak-enabled)
    (fail! 404 "OSS Keycloak login is disabled."))
  (let [issuer (oss-keycloak-issuer)
        client-id (oss-keycloak-client-id)
        secret (setting/get-value-of-type :string :oss-keycloak-client-secret)]
    (when-not (and (trusted-url? issuer) (trusted-url? (site-base))
                   (not (str/blank? client-id)) (not (str/blank? secret))
                   (encryption/default-encryption-enabled?))
      (fail! 503 "OSS Keycloak requires a trusted issuer/site URL, client credentials and encryption key."))
    {:issuer-uri issuer :client-id client-id :client-secret secret
     :redirect-uri (auth-url "callback") :portal-path (portal-path)}))
