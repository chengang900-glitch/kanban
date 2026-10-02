(ns metabase.sso.keycloak.integration
  "Browser and back-channel handlers for independent OSS Keycloak login."
  (:require
   [java-time.api :as t]
   [metabase.api.common :as api]
   [metabase.auth-identity.core :as auth-identity]
   [metabase.request.core :as request]
   [metabase.session.core :as session]
   [metabase.sso.keycloak.protocol :as protocol]
   [metabase.sso.keycloak.settings :as settings]
   [metabase.sso.keycloak.store :as store]
   [metabase.sso.oidc.common :as common]
   [metabase.sso.oidc.http :as http]
   [metabase.sso.oidc.state :as state]
   [ring.util.response :as response]
   [toucan2.core :as t2])
  (:import
   (java.net URI)
   (java.time Instant OffsetDateTime ZoneOffset)))

(set! *warn-on-reflection* true)

(def state-cookie-name
  "Separate encrypted transaction cookie, unrelated to generic/commercial OIDC routes."
  "metabase.KEYCLOAK_STATE")

(defn- cookie-path
  [] (.getPath (URI. ^String (settings/auth-url ""))))

(defn- clear-state-cookie
  [response]
  (response/set-cookie response state-cookie-name "" {:path (cookie-path) :max-age 0 :http-only true :same-site :lax}))

(defn check-origin!
  "Require a browser's exact same-origin header for cookie-authenticated mutations."
  [request]
  (let [expected (settings/origin (settings/site-base))]
    (when-not (and expected (= expected (get-in request [:headers "origin"])))
      (settings/fail! 403 "Same-origin Origin header is required."))))

(defn- top-level!
  [request]
  (when (#{"iframe" "frame"} (get-in request [:headers "sec-fetch-dest"]))
    (settings/fail! 400 "Open Keycloak login in the top-level browser window.")))

(defn login
  "Always perform top-level OIDC, even when an older Metabase cookie is present."
  [request]
  (top-level! request)
  (let [{:keys [client-id redirect-uri portal-path discovery-document]} (-> (settings/configuration)
                                                                            protocol/discovery-config)
        state-value (common/generate-state)
        nonce (common/generate-nonce)
        verifier (common/generate-state)
        state-data (assoc (state/create-oidc-state {:state state-value :nonce nonce
                                                    :redirect portal-path :provider :oss-keycloak})
                          :verifier verifier)
        encrypted (state/encrypt-state state-data)
        url (str (:authorization_endpoint discovery-document) "?"
                 (common/build-query-string {:response_type "code" :scope "openid"
                                             :client_id client-id :redirect_uri redirect-uri
                                             :state state-value :nonce nonce
                                             :code_challenge (protocol/pkce-challenge verifier)
                                             :code_challenge_method "S256"}))]
    (store/remember-login! state-value (+ (protocol/now-seconds) 600))
    (response/set-cookie (response/redirect url) state-cookie-name encrypted
                         {:path (cookie-path) :http-only true :same-site :lax :max-age 600
                          :secure (#{:https :unknown} (request/https-state request))})))

(defn- validated-state
  [request]
  (let [encrypted (get-in request [:cookies state-cookie-name :value])
        state-data (when (and (string? encrypted) (<= (count encrypted) 16384))
                     (state/decrypt-state encrypted))
        state-value (get-in request [:params :state])]
    (when-not (and (string? state-value) (= state-value (:state state-data))
                   (= "oss-keycloak" (:provider state-data))
                   (= (settings/portal-path) (:redirect state-data))
                   (protocol/identifier? (:verifier state-data))
                   (store/consume-login! state-value))
      (settings/fail! 401 "Keycloak login transaction is invalid, expired or already used."))
    state-data))

(defn- exchange-code
  [{:keys [client-id client-secret redirect-uri discovery-document]} code verifier]
  (try
    (let [result (http/oidc-post (:token_endpoint discovery-document)
                                 {:redirect-strategy :none
                                  :form-params {:grant_type "authorization_code" :code code
                                                :client_id client-id :client_secret client-secret
                                                :redirect_uri redirect-uri :code_verifier verifier}})]
      (if (and (= 200 (:status result)) (string? (get-in result [:body :id_token])))
        (get-in result [:body :id_token])
        (settings/fail! 401 "Keycloak authorization code exchange failed.")))
    (catch Exception _ (settings/fail! 401 "Keycloak authorization code exchange failed."))))

(defn- delete-browser-session!
  [{:keys [metabase-session-key]}]
  (when (string? metabase-session-key)
    (t2/delete! :model/Session :key_hashed (session/hash-session-key metabase-session-key))))

(defn- callback*
  [request]
  (top-level! request)
  (let [config (settings/configuration)
        {:keys [nonce verifier]} (validated-state request)
        code (get-in request [:params :code])]
    (when-not (and (not (get-in request [:params :error])) (string? code) (<= 1 (count code) 4096))
      (settings/fail! 401 "Keycloak login was cancelled or authorization code is missing."))
    (let [config (protocol/discovery-config config)
          claims (protocol/validate-id-token (exchange-code config code verifier) config nonce)
          ;; Callback is a top-level login. Caller headers cannot select the commercial embedded-session format.
          request (update request :headers dissoc "x-metabase-embedded")
          new-session (request/with-current-request request
                        (t2/with-transaction [_]
                          (let [user (store/bound-user claims)]
                            (when-not user
                              (settings/fail! 403 "This Keycloak identity is not bound to an active Metabase account."))
                            (let [new-session (auth-identity/create-session-with-auth-tracking!
                                               user (request/device-info request) :provider/oss-keycloak)]
                              (store/associate-session! new-session claims)
                              (delete-browser-session! request)
                              new-session))))
          expiry (OffsetDateTime/ofInstant (Instant/ofEpochSecond (:exp claims)) ZoneOffset/UTC)]
      (request/set-session-cookies request
                                   (response/redirect (str (settings/origin (settings/site-base)) (:portal-path config)))
                                   (assoc new-session :type :normal :expires_at expiry)
                                   (t/zoned-date-time (t/zone-id "GMT"))))))

(defn callback
  "Handle callback and clear the transaction cookie on either success or failure."
  [request]
  (clear-state-cookie
   (try (callback* request)
        (catch clojure.lang.ExceptionInfo e
          {:status (or (:status-code (ex-data e)) 500)
           :body (if (:status-code (ex-data e)) (ex-message e) "Keycloak login failed.")})
        (catch Exception _ {:status 500 :body "Keycloak login failed."}))))

(defn logout
  "Clear this browser's Metabase session and return a trusted RP-initiated logout URL."
  [request]
  (check-origin! request)
  (delete-browser-session! request)
  (request/clear-session-cookie
   (try
     (let [{:keys [client-id portal-path discovery-document]} (-> (settings/configuration) protocol/discovery-config)
           url (str (:end_session_endpoint discovery-document) "?"
                    (common/build-query-string {:client_id client-id
                                                :post_logout_redirect_uri (str (settings/origin (settings/site-base))
                                                                               portal-path)}))]
       {:status 200 :body {:logout_url url}})
     (catch Exception _ {:status 503 :body {:message "Metabase signed out; Keycloak logout is unavailable."}}))))

(defn backchannel-logout
  "Verify signed OIDC logout, persist its replay marker and revoke the matching sessions."
  [request]
  (let [config (-> (settings/configuration) protocol/discovery-config)
        claims (protocol/validate-logout-token (get-in request [:params :logout_token]) config)]
    (store/accept-logout! claims)
    {:status 200 :body ""}))

(defn bindings
  "List or add explicit bindings; admin mutations require same-origin CSRF protection."
  [request]
  (api/check-superuser)
  (settings/configuration)
  (case (:request-method request)
    :get (store/list-bindings)
    :post (do (check-origin! request)
              (store/bind-user! (get-in request [:body :user_id]) (get-in request [:body :subject])))))

(defn status
  "Return the current browser's verified identity for the trusted same-origin portal."
  [request]
  (settings/configuration)
  (when-not (and (:metabase-user-id request) (= "oss-keycloak" (:embedding/auth-method request)))
    (settings/fail! 401 "A current OSS Keycloak session is required."))
  (let [identity (t2/select-one :model/AuthIdentity :user_id (:metabase-user-id request) :provider "oss-keycloak")]
    {:issuer (get-in identity [:metadata :issuer]) :subject (get-in identity [:metadata :subject])
     :user_id (:metabase-user-id request)}))

(defn unbind
  "Remove a Keycloak binding and cascade-delete its sessions."
  [request identity-id]
  (api/check-superuser)
  (settings/configuration)
  (check-origin! request)
  (store/unbind-user! identity-id)
  api/generic-204-no-content)
