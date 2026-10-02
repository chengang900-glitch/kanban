(ns ^:synchronous metabase.sso.keycloak.store-test
  (:require
   [clojure.test :refer :all]
   [java-time.api :as t]
   [metabase.auth-identity.core :as auth-identity]
   [metabase.session.core :as session]
   [metabase.sso.keycloak.protocol :as protocol]
   [metabase.sso.keycloak.protocol-test :as fixture]
   [metabase.sso.keycloak.session :as oidc-session]
   [metabase.sso.keycloak.settings :as settings]
   [metabase.sso.keycloak.store :as store]
   [metabase.test :as mt]
   [metabase.test.fixtures :as fixtures]
   [toucan2.core :as t2]))

(use-fixtures :once (fixtures/initialize :db :test-users))

(defn configured! [thunk]
  (mt/with-dynamic-fn-redefs [settings/configuration (constantly fixture/config)
                              settings/oss-keycloak-enabled (constantly true)
                              settings/oss-keycloak-issuer (constantly (:issuer-uri fixture/config))]
    (thunk)))

(use-fixtures :each configured!)

(defn tracked-session!
  "Create a real ordinary session with the Keycloak association."
  [user subject sid]
  (let [s (auth-identity/create-session-with-auth-tracking! user nil :provider/oss-keycloak)]
    (store/associate-session! s (assoc (fixture/claims) :sub subject :sid sid))
    s))

(deftest explicit-binding-test
  (mt/with-temp [:model/User a {} :model/User b {}]
    (let [binding (store/bind-user! (:id a) "subject-a")]
      (is (= binding (store/bind-user! (:id a) "subject-a")))
      (is (= (:id a) (:id (store/bound-user {:iss (:issuer-uri fixture/config) :sub "subject-a"}))))
      (is (nil? (store/bound-user {:iss (:issuer-uri fixture/config) :sub "unbound" :email (:email a)})))
      (is (nil? (store/bound-user {:iss "https://other.example" :sub "subject-a"})))
      (is (thrown? clojure.lang.ExceptionInfo (store/bind-user! (:id b) "subject-a")))
      (is (thrown? clojure.lang.ExceptionInfo (store/bind-user! (:id a) "subject-b")))
      (t2/update! :model/User (:id a) {:is_active false})
      (is (nil? (store/bound-user {:iss (:issuer-uri fixture/config) :sub "subject-a"})))
      (is (thrown? clojure.lang.ExceptionInfo (store/bind-user! (:id a) "subject-a"))))))

(deftest one-use-login-state-test
  (let [state (str (random-uuid)) expired (str (random-uuid)) concurrent (str (random-uuid))]
    (store/remember-login! state (+ (protocol/now-seconds) 600))
    (is (true? (store/consume-login! state)))
    (is (false? (store/consume-login! state)))
    (store/remember-login! expired (dec (protocol/now-seconds)))
    (is (false? (store/consume-login! expired)))
    (is (false? (store/consume-login! "unknown")))
    (store/remember-login! concurrent (+ (protocol/now-seconds) 600))
    (is (= {true 1 false 7}
           (frequencies (doall (pmap store/consume-login! (repeat 8 concurrent))))))))

(deftest session-expiry-disable-and-unbind-test
  (mt/with-temp [:model/User user {}]
    (let [binding (store/bind-user! (:id user) "subject-a")
          s (tracked-session! user "subject-a" "sid-a")
          hashed (session/hash-session-key (:key s))]
      (is (oidc-session/session-active? hashed))
      (mt/with-dynamic-fn-redefs [settings/oss-keycloak-enabled (constantly false)]
        (is (false? (oidc-session/session-active? hashed))))
      (t2/update! :model/OssKeycloakSession (:id s) {:expires_at (t/instant "1970-01-01T00:00:00Z")})
      (is (false? (oidc-session/session-active? hashed)))
      (store/unbind-user! (:id binding))
      (is (not (t2/exists? :model/Session :id (:id s))))
      (is (not (t2/exists? :model/OssKeycloakSession :session_id (:id s)))))))

(deftest logout-is-scoped-and-replay-safe-test
  (mt/with-temp [:model/User a {} :model/User b {}]
    (store/bind-user! (:id a) "subject-a")
    (store/bind-user! (:id b) "subject-b")
    (let [a1 (tracked-session! a "subject-a" "sid-a")
          b1 (tracked-session! b "subject-b" "sid-b")
          logout {:iss (:issuer-uri fixture/config) :sid "sid-a" :sub "subject-a" :jti (str (random-uuid))}]
      (store/accept-logout! (assoc logout :iss "https://other.example"))
      (is (t2/exists? :model/Session :id (:id a1)))
      (store/accept-logout! logout)
      (is (not (t2/exists? :model/Session :id (:id a1))))
      (is (t2/exists? :model/Session :id (:id b1)))
      (let [a2 (tracked-session! a "subject-a" "sid-a")]
        (store/accept-logout! logout)
        (is (t2/exists? :model/Session :id (:id a2)))))))
