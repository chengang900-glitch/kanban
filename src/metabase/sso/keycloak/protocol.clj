(ns metabase.sso.keycloak.protocol
  "Strict Keycloak OIDC checks using the OSS network-policy-aware HTTP client."
  (:require
   [buddy.core.codecs :as codecs]
   [buddy.core.hash :as buddy-hash]
   [buddy.core.keys :as keys]
   [buddy.sign.jwt :as jwt]
   [clojure.string :as str]
   [metabase.sso.keycloak.settings :as settings]
   [metabase.sso.oidc.http :as http]
   [metabase.util.json :as json])
  (:import
   (java.time Instant)
   (java.util Base64)))

(set! *warn-on-reflection* true)

(defn now-seconds
  "Current UTC epoch seconds."
  [] (.getEpochSecond (Instant/now)))

(defn digest
  "SHA256 hex digest for persisted identifiers; vector encoding avoids separator ambiguity."
  [value]
  (codecs/bytes->hex (buddy-hash/sha256 (json/encode value))))

(defn pkce-challenge
  "RFC 7636 S256 challenge for a cryptographically random verifier."
  [verifier]
  (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) (buddy-hash/sha256 verifier)))

(defn fetch-document
  "Fetch fresh discovery or keys without following redirects or sharing the generic provider cache."
  [url]
  (let [result (http/oidc-get url {:accept :json :redirect-strategy :none})]
    (when-not (and (= 200 (:status result)) (map? (:body result)))
      (settings/fail! 503 "Keycloak discovery or signing keys are unavailable."))
    (:body result)))

(defn discovery-config
  "Fetch trusted discovery; endpoint origins and issuer must match fixed configuration."
  [{:keys [issuer-uri] :as config}]
  (let [doc (fetch-document (str issuer-uri "/.well-known/openid-configuration"))
        endpoint-keys [:authorization_endpoint :token_endpoint :jwks_uri :end_session_endpoint]]
    (when-not (and (= issuer-uri (:issuer doc))
                   (every? (fn [key]
                             (let [endpoint (get doc key)]
                               (and (settings/trusted-url? endpoint)
                                    (= (settings/origin issuer-uri) (settings/origin endpoint)))))
                           endpoint-keys))
      (settings/fail! 503 "Keycloak discovery issuer or endpoint origin is invalid."))
    (assoc config :discovery-document doc :jwks-uri (:jwks_uri doc))))

(defn- signature-claims
  [token jwks-uri]
  (when (and (string? token) (<= (count token) 16384))
    (try
      (let [{:keys [alg kid]} (jwt/decode-header token)]
        (when (and (= :rs256 alg) (string? kid) (not (str/blank? kid)))
          (letfn [(verify []
                    (when-let [key-data (some #(when (and (= kid (:kid %)) (= "RSA" (:kty %))
                                                          (or (nil? (:use %)) (= "sig" (:use %)))
                                                          (or (nil? (:alg %)) (= "RS256" (:alg %)))) %)
                                              (:keys (fetch-document jwks-uri)))]
                      (try
                        (jwt/unsign token (keys/jwk->public-key key-data) {:alg :rs256})
                        (catch Exception _ nil))))]
            (verify))))
      (catch Exception _ nil))))

(defn- audience-valid?
  [claims client-id]
  (let [aud (:aud claims)]
    (and (or (= client-id aud) (and (sequential? aud) (some #{client-id} aud)))
         (or (nil? (:azp claims)) (= client-id (:azp claims)))
         (or (not (sequential? aud)) (<= (count aud) 1) (= client-id (:azp claims))))))

(defn- common-valid?
  [claims {:keys [issuer-uri client-id]}]
  (let [now (now-seconds)]
    (and (= issuer-uri (:iss claims)) (audience-valid? claims client-id)
         (integer? (:iat claims)) (<= (:iat claims) (+ now 30))
         (or (nil? (:nbf claims)) (and (integer? (:nbf claims)) (<= (:nbf claims) (+ now 30)))))))

(defn identifier?
  "Nonempty bounded OIDC identifier."
  [value]
  (and (string? value) (<= 1 (count value) 255) (not (str/blank? value))))

(defn validate-id-token
  "Return verified login claims or a sanitized authentication failure."
  [token config nonce]
  (let [claims (signature-claims token (:jwks-uri config))]
    (when-not (and (common-valid? claims config)
                   (integer? (:exp claims)) (> (:exp claims) (now-seconds))
                   (< (:iat claims) (:exp claims))
                   (identifier? nonce) (= nonce (:nonce claims))
                   (identifier? (:sub claims)) (identifier? (:sid claims)))
      (settings/fail! 401 "Keycloak ID token validation failed."))
    claims))

(defn validate-logout-token
  "Return verified back-channel logout claims; ID/access tokens cannot serve as logout tokens."
  [token config]
  (let [claims (signature-claims token (:jwks-uri config))
        event (get (:events claims) (keyword "http://schemas.openid.net/event/backchannel-logout"))]
    (when-not (and (common-valid? claims config)
                   (>= (:iat claims) (- (now-seconds) 300))
                   (or (nil? (:exp claims))
                       (and (integer? (:exp claims)) (> (:exp claims) (now-seconds))))
                   (identifier? (:jti claims))
                   (not (contains? claims :nonce))
                   (map? event) (empty? event)
                   (or (identifier? (:sid claims)) (identifier? (:sub claims)))
                   (or (nil? (:sid claims)) (identifier? (:sid claims)))
                   (or (nil? (:sub claims)) (identifier? (:sub claims))))
      (settings/fail! 401 "Keycloak logout token validation failed."))
    claims))
