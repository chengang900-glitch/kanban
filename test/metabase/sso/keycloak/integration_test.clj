(ns ^:synchronous metabase.sso.keycloak.integration-test
  (:require
   [clojure.string :as str]
   [clojure.test :refer :all]
   [java-time.api :as t]
   [metabase.app-db.encryption-test-util :as encryption-tu]
   [metabase.collections.models.collection :as collection]
   [metabase.initialization-status.core :as init-status]
   [metabase.request.core :as request]
   [metabase.server.middleware.security :as security]
   [metabase.server.middleware.session :as mw.session]
   [metabase.sso.core :as sso]
   [metabase.sso.keycloak.integration :as integration]
   [metabase.sso.keycloak.protocol :as protocol]
   [metabase.sso.keycloak.protocol-test :as fixture]
   [metabase.sso.keycloak.settings :as settings]
   [metabase.sso.keycloak.store :as store]
   [metabase.sso.keycloak.store-test :as store-test]
   [metabase.sso.oidc.http :as http]
   [metabase.sso.oidc.state :as state]
   [metabase.test :as mt]
   [metabase.test.fixtures :as fixtures]
   [metabase.test.http-client :as client]
   [metabase.util.encryption :as encryption]
   [ring.util.codec :as codec]
   [toucan2.core :as t2]))

(def config (assoc fixture/config :client-secret "isolated-fixture-only"
                   :redirect-uri "https://portal.example/metabase/auth/keycloak/callback"
                   :portal-path "/portal/data"))
(def discovery {:issuer (:issuer-uri config) :authorization_endpoint "https://identity.example/auth"
                :token_endpoint "https://identity.example/token" :jwks_uri (:jwks-uri config)
                :end_session_endpoint "https://identity.example/logout"})
(def browser-request {:headers {"user-agent" "Isolated browser" "sec-fetch-dest" "document"}
                      :browser-id "test-browser" :remote-addr "127.0.0.1" :scheme :https})

(use-fixtures :once (fixtures/initialize :db :test-users)
  (encryption-tu/with-encrypted-app-db-fixture (encryption/secret-key->hash "keycloak-integration-fixture-only")))

(defn configured! [thunk]
  (binding [client/*url-prefix* ""]
    (mt/with-dynamic-fn-redefs [settings/configuration (constantly config)
                                settings/site-base (constantly "https://portal.example/metabase")
                                settings/oss-keycloak-enabled (constantly true)
                                settings/oss-keycloak-issuer (constantly (:issuer-uri config))
                                protocol/fetch-document (fn [url] (if (= url (:jwks-uri config)) (fixture/jwks) discovery))]
      (init-status/set-complete!)
      (thunk))))
(use-fixtures :each configured!)

(defn transaction-request!
  "Create a real encrypted cookie and one-use database login transaction."
  [extra]
  (let [value (str (random-uuid))
        cookie (state/encrypt-state (assoc (state/create-oidc-state
                                            {:state value :nonce "test-nonce" :provider :oss-keycloak :redirect "/portal/data"})
                                           :verifier "valid-verifier"))]
    (store/remember-login! value (+ (protocol/now-seconds) 600))
    (merge browser-request {:cookies {integration/state-cookie-name {:value cookie}}
                            :params {:state value :code "isolated-code"}} extra)))

(defn exchange! [payload thunk]
  (mt/with-dynamic-fn-redefs [http/oidc-post (fn [_ opts]
                                               (is (= :none (:redirect-strategy opts)))
                                               (is (= "valid-verifier" (get-in opts [:form-params :code_verifier])))
                                               {:status 200 :body {:id_token (fixture/sign payload)}})]
    (thunk)))

(deftest login-prefix-and-top-level-test
  (encryption-tu/with-encrypted-app-db
    (let [result (integration/login (assoc browser-request :params {:redirect "https://evil.example"}))
          url (get-in result [:headers "Location"])
          params (codec/form-decode (second (str/split url #"\?")))]
      (is (= 302 (:status result)))
      (is (= "S256" (get params "code_challenge_method")))
      (is (= (:redirect-uri config) (get params "redirect_uri")))
      (is (= "/metabase/auth/keycloak/" (get-in result [:cookies integration/state-cookie-name :path])))
      (is (true? (get-in result [:cookies integration/state-cookie-name :http-only])))
      (is (not (str/includes? url "evil.example")))))
  (is (thrown? clojure.lang.ExceptionInfo
               (integration/login (assoc-in browser-request [:headers "sec-fetch-dest"] "iframe")))))

(deftest browser-protocol-controls-cookie-security-test
  (encryption-tu/with-encrypted-app-db
    (mt/with-temp [:model/User user {}]
      (store/bind-user! (:id user) "subject-a")
      (doseq [scheme [:http :https]]
        (let [origin (str (name scheme) "://portal.example")
              base (str origin "/metabase")]
          (mt/with-dynamic-fn-redefs [settings/site-base (constantly base)
                                      settings/configuration (constantly (assoc config :redirect-uri (str base "/auth/keycloak/callback")))]
            (let [login (integration/login (assoc browser-request :scheme scheme))]
              (is (= (= scheme :https) (boolean (get-in login [:cookies integration/state-cookie-name :secure])))))
            (exchange! (fixture/claims)
                       (fn []
                         (let [result (integration/callback (transaction-request! {:scheme scheme}))
                               cookie (get-in result [:cookies request/metabase-session-cookie])]
                           (is (= 302 (:status result)))
                           (is (= (str origin "/portal/data") (get-in result [:headers "Location"])))
                           (is (= (= scheme :https) (boolean (:secure cookie))))
                           (is (true? (:http-only cookie))))))))))))

(deftest callback-state-identity-and-replay-test
  (encryption-tu/with-encrypted-app-db
    (mt/with-temp [:model/User user {}]
      (store/bind-user! (:id user) "subject-a")
      (let [req (transaction-request! {})]
        (exchange! (fixture/claims)
                   (fn []
                     (let [result (integration/callback req)
                           key (get-in result [:cookies request/metabase-session-cookie :value])]
                       (is (= 302 (:status result)))
                       (is (= "https://portal.example/portal/data" (get-in result [:headers "Location"])))
                       (is (string? key))
                       (is (= (:id user) (:metabase-user-id (#'mw.session/current-user-info-for-session key nil))))
                       (is (= 401 (:status (integration/callback req))))
                       (is (= 0 (get-in result [:cookies integration/state-cookie-name :max-age]))))))))
    (mt/with-temp [:model/User user {}]
      (exchange! (assoc (fixture/claims) :sub "unbound-subject" :email (:email user))
                 (fn [] (is (= 403 (:status (integration/callback (transaction-request! {}))))))))
    (is (= 401 (:status (integration/callback (transaction-request! {:params {:state "wrong" :code "code"}})))))))

(deftest callback-replaces-browser-session-test
  (encryption-tu/with-encrypted-app-db
    (mt/with-temp [:model/User previous {} :model/User next-user {}]
      (store/bind-user! (:id previous) "subject-a")
      (store/bind-user! (:id next-user) "subject-b")
      (let [old (store-test/tracked-session! previous "subject-a" "sid-a")
            req (transaction-request! {:metabase-session-key (:key old)})]
        (exchange! (assoc (fixture/claims) :sub "subject-b" :sid "sid-b")
                   (fn []
                     (let [result (integration/callback req)
                           key (get-in result [:cookies request/metabase-session-cookie :value])]
                       (is (= 302 (:status result)))
                       (is (= (:id next-user) (:metabase-user-id (#'mw.session/current-user-info-for-session key nil))))
                       (is (nil? (#'mw.session/current-user-info-for-session (:key old) nil))))))))))

(deftest protected-api-permissions-expiry-and-logout-test
  (mt/with-temp [:model/User a {} :model/User b {}]
    (store/bind-user! (:id a) "subject-a")
    (store/bind-user! (:id b) "subject-b")
    (let [personal (collection/user->personal-collection a)
          a1 (store-test/tracked-session! a "subject-a" "sid-a")
          b1 (store-test/tracked-session! b "subject-b" "sid-b")
          opts (fn [s] {:request-options {:headers {"x-metabase-session" (:key s)}}})]
      (is (= (:id a) (:id (mt/client :get 200 "/api/user/current" (opts a1)))))
      (is (= (:id b) (:id (mt/client :get 200 "/api/user/current" (opts b1)))))
      (is (= "subject-a" (:subject (mt/client :get 200 "/auth/keycloak/status" (opts a1)))))
      (mt/client :get 200 (str "/api/collection/" (:id personal)) (opts a1))
      (mt/client :get 403 (str "/api/collection/" (:id personal)) (opts b1))
      (t2/update! :model/OssKeycloakSession (:id a1) {:expires_at (t/instant "1970-01-01T00:00:00Z")})
      (mt/client :get 401 "/api/user/current" (opts a1))
      (is (thrown? clojure.lang.ExceptionInfo
                   (integration/logout {:metabase-session-key (:key b1) :headers {"origin" "https://evil.example"}})))
      (is (t2/exists? :model/Session :id (:id b1)))
      (let [signed (fixture/sign (-> (fixture/claims) (dissoc :nonce)
                                     (assoc :sub "subject-b" :sid "sid-b" :jti (str (random-uuid))
                                            :events {"http://schemas.openid.net/event/backchannel-logout" {}})))]
        (is (= 200 (:status (integration/backchannel-logout {:params {:logout_token signed}}))))
        (mt/client :get 401 "/api/user/current" (opts b1))
        (is (= 200 (:status (integration/backchannel-logout {:params {:logout_token signed}}))))))))

(deftest logout-clears-session-even-when-provider-unavailable-test
  (mt/with-temp [:model/User user {}]
    (store/bind-user! (:id user) "subject-a")
    (let [s (store-test/tracked-session! user "subject-a" "sid-a")]
      (mt/with-dynamic-fn-redefs [protocol/discovery-config (fn [_] (settings/fail! 503 "unavailable"))]
        (let [result (integration/logout {:metabase-session-key (:key s) :headers {"origin" "https://portal.example"}})]
          (is (= 503 (:status result)))
          (is (not (t2/exists? :model/Session :id (:id s))))
          (is (= "Thu, 1 Jan 1970 00:00:00 GMT" (get-in result [:cookies request/metabase-session-cookie :expires]))))))))

(deftest embedding-opt-in-preserves-default-test
  (doseq [[enabled frame csp] [[false "DENY" "frame-ancestors 'none'"] [true "SAMEORIGIN" "frame-ancestors 'self'"]]]
    (mt/with-dynamic-fn-redefs [sso/oss-workspace-embedding-enabled (constantly enabled)]
      (let [headers (security/security-headers)]
        (is (= frame (get headers "X-Frame-Options")))
        (is (str/includes? (get headers "Content-Security-Policy") csp))))))
