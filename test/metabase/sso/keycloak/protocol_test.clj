(ns metabase.sso.keycloak.protocol-test
  (:require
   [buddy.core.keys :as keys]
   [buddy.sign.jwt :as jwt]
   [clojure.test :refer :all]
   [metabase.sso.keycloak.protocol :as protocol]
   [metabase.sso.keycloak.settings :as settings]
   [metabase.sso.oidc.http :as http]
   [metabase.test :as mt])
  (:import (java.security KeyPair KeyPairGenerator)))

(set! *warn-on-reflection* true)

(def keypair
  "Ephemeral, test-only RSA key; no real provider key is present in the repository."
  (delay (.generateKeyPair (doto (KeyPairGenerator/getInstance "RSA") (.initialize 2048)))))

(def config {:issuer-uri "https://identity.example/realms/test" :client-id "metabase-test"
             :jwks-uri "https://identity.example/realms/test/certs"})

(defn claims
  "A valid short-lived test ID token's claims."
  []
  {:iss (:issuer-uri config) :aud (:client-id config) :sub "subject-a" :sid "session-a"
   :iat (protocol/now-seconds) :exp (+ (protocol/now-seconds) 300) :nonce "test-nonce"})

(defn sign
  "Sign claims using the ephemeral fixture private key."
  [payload]
  (jwt/sign payload (.getPrivate ^KeyPair @keypair) {:alg :rs256 :header {:kid "test-rsa"}}))

(defn jwks
  "Public key set for the ephemeral fixture key."
  []
  {:keys [(merge (keys/public-key->jwk (.getPublic ^KeyPair @keypair)) {:kid "test-rsa" :use "sig" :alg "RS256"})]})

(deftest pkce-and-identity-digest-test
  (is (= "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
         (protocol/pkce-challenge "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")))
  (is (not= (protocol/digest ["a:b" "c"]) (protocol/digest ["a" "b:c"]))))

(deftest signed-login-token-test
  (mt/with-dynamic-fn-redefs [protocol/fetch-document (constantly (jwks))]
    (is (= (claims) (protocol/validate-id-token (sign (claims)) config "test-nonce")))
    (doseq [[description transform]
            [["issuer" #(assoc % :iss "https://evil.example")]
             ["audience" #(assoc % :aud "other-client")]
             ["authorized party" #(assoc % :azp "other-client")]
             ["multiple audiences need azp" #(assoc % :aud ["metabase-test" "other"])]
             ["expiry" #(assoc % :exp (dec (protocol/now-seconds)))]
             ["future issuance" #(assoc % :iat (+ (protocol/now-seconds) 60))]
             ["future not-before" #(assoc % :nbf (+ (protocol/now-seconds) 60))]
             ["nonce" #(assoc % :nonce "other-nonce")]
             ["subject" #(dissoc % :sub)]
             ["session" #(dissoc % :sid)]]]
      (testing description
        (is (thrown-with-msg? clojure.lang.ExceptionInfo #"validation failed"
                              (protocol/validate-id-token (sign (transform (claims))) config "test-nonce")))))
    (testing "a forged HMAC token must never validate against public RSA key material"
      (is (thrown? clojure.lang.ExceptionInfo
                   (protocol/validate-id-token
                    (jwt/sign (claims) "test-only-hmac-secret" {:alg :hs256 :header {:kid "test-rsa"}})
                    config "test-nonce"))))))

(deftest logout-token-is-not-a-login-token-test
  (mt/with-dynamic-fn-redefs [protocol/fetch-document (constantly (jwks))]
    (let [logout (-> (claims) (dissoc :nonce)
                     (assoc :jti "logout-1" :events {"http://schemas.openid.net/event/backchannel-logout" {}}))]
      (is (= "subject-a" (:sub (protocol/validate-logout-token (sign logout) config))))
      (doseq [invalid [(claims) (assoc logout :nonce "nonce") (dissoc logout :jti)
                       (dissoc logout :sid :sub) (assoc logout :events {})
                       (assoc logout :iat (- (protocol/now-seconds) 400))]]
        (is (thrown? clojure.lang.ExceptionInfo (protocol/validate-logout-token (sign invalid) config)))))))

(deftest trusted-discovery-test
  (doseq [scheme ["http" "https"]]
    (let [origin (str scheme "://identity.example")
          issuer (str origin "/realms/test")
          config (assoc config :issuer-uri issuer)
          doc {:issuer issuer :authorization_endpoint (str origin "/auth")
               :token_endpoint (str origin "/token") :jwks_uri (str origin "/certs")
               :end_session_endpoint (str origin "/logout")}]
      (mt/with-dynamic-fn-redefs [protocol/fetch-document (constantly doc)]
        (is (= doc (:discovery-document (protocol/discovery-config config)))))
      (doseq [invalid [(assoc doc :issuer "https://evil.example")
                       (assoc doc :token_endpoint "https://evil.example/token")
                       (assoc doc :jwks_uri (str (if (= scheme "http") "https" "http") "://identity.example/certs"))]]
        (mt/with-dynamic-fn-redefs [protocol/fetch-document (constantly invalid)]
          (is (thrown? clojure.lang.ExceptionInfo (protocol/discovery-config config))))))))

(deftest trusted-url-test
  (doseq [url ["https://portal.example/metabase" "http://portal.example/metabase"
               "http://115.227.3.67:3000" "http://demo.uhoo.cn:9433/realms/enterprise-ai"
               "http://127.0.0.1:33419/metabase"]]
    (is (settings/trusted-url? url)))
  (doseq [url ["ftp://portal.example" "javascript:alert(1)" "https://user:pass@portal.example"
               "http://user:pass@portal.example" "//portal.example"
               "https://portal.example/?redirect=evil" "https://portal.example/#fragment" nil]]
    (is (not (settings/trusted-url? url)))))

(deftest transport-does-not-follow-redirects-test
  (let [opts (atom nil)]
    (mt/with-dynamic-fn-redefs [http/oidc-get (fn [_ options] (reset! opts options) {:status 302 :body {}})]
      (is (thrown? clojure.lang.ExceptionInfo (protocol/fetch-document "https://identity.example/certs")))
      (is (= :none (:redirect-strategy @opts))))))
