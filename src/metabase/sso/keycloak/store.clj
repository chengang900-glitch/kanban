(ns metabase.sso.keycloak.store
  "Explicit identity binding, one-use transactions and per-session OIDC revocation."
  (:require
   [java-time.api :as t]
   [metabase.auth-identity.core :as auth-identity]
   [metabase.sso.keycloak.protocol :as protocol]
   [metabase.sso.keycloak.settings :as settings]
   [metabase.sso.models.keycloak]
   [methodical.core :as methodical]
   [toucan2.core :as t2])
  (:import (java.sql SQLException)))

(set! *warn-on-reflection* true)

(derive :provider/oss-keycloak :metabase.auth-identity.provider/provider)

(methodical/defmethod auth-identity/validate :provider/oss-keycloak
  [_ {:keys [provider_id metadata]}]
  (when-not (and (settings/trusted-url? (:issuer metadata))
                 (protocol/identifier? (:subject metadata))
                 (= provider_id (protocol/digest [(:issuer metadata) (:subject metadata)])))
    (settings/fail! 400 "Invalid explicit Keycloak identity binding.")))

(defn- instant-at
  [seconds]
  (t/instant (java.time.Instant/ofEpochSecond seconds)))

(defn- prune!
  [model]
  (t2/delete! model :expires_at [:<= (t/instant)]))

(defn- duplicate-key?
  [e]
  (some (fn [cause]
          (and (instance? SQLException cause)
               (or (= "23505" (.getSQLState ^SQLException cause))
                   (= 1062 (.getErrorCode ^SQLException cause)))))
        (take-while some? (iterate ex-cause e))))

(defn remember-login!
  "Persist only the state hash and expiry; nonce and PKCE verifier stay in the encrypted cookie."
  [state expiry-seconds]
  (prune! :model/OssKeycloakLogin)
  (t2/insert! :model/OssKeycloakLogin :id (protocol/digest state) :expires_at (instant-at expiry-seconds)))

(defn consume-login!
  "Atomically consume a valid state once across requests, instances and restarts."
  [state]
  (= 1 (t2/delete! :model/OssKeycloakLogin :id (protocol/digest state) :expires_at [:> (t/instant)])))

(defn binding-id
  "Stable hashed identity for one exact issuer and subject."
  [issuer subject]
  (protocol/digest [issuer subject]))

(defn list-bindings
  "Return only identity/user association metadata for the administrator."
  []
  (mapv (fn [{:keys [id user_id metadata]}]
          {:id id :user_id user_id :issuer (:issuer metadata) :subject (:subject metadata)})
        (t2/select [:model/AuthIdentity :id :user_id :metadata] :provider "oss-keycloak")))

(defn bind-user!
  "Idempotently bind an existing active user; never merge by email or silently replace a binding."
  [user-id subject]
  (let [issuer (:issuer-uri (settings/configuration))
        id (binding-id issuer subject)]
    (when-not (and (pos-int? user-id) (protocol/identifier? subject))
      (settings/fail! 400 "A positive user ID and nonempty Keycloak subject are required."))
    (try
      (t2/with-transaction [_]
        (when-not (t2/exists? :model/User :id user-id :is_active true)
          (settings/fail! 404 "Active Metabase user does not exist."))
        (let [binding (t2/select-one :model/OssKeycloakBinding :id id)
              identity (t2/select-one :model/AuthIdentity :user_id user-id :provider "oss-keycloak")]
          (cond
            (and binding identity (= (:auth_identity_id binding) (:id identity)))
            {:id (:id identity) :user_id user-id :issuer issuer :subject subject}

            (or binding identity)
            (settings/fail! 409 "Identity or user is already bound. Explicitly unbind before rebinding.")

            :else
            (let [identity (t2/insert-returning-instance! :model/AuthIdentity
                                                          :user_id user-id :provider "oss-keycloak"
                                                          :provider_id id :metadata {:issuer issuer :subject subject})]
              (t2/insert! :model/OssKeycloakBinding :id id :auth_identity_id (:id identity))
              {:id (:id identity) :user_id user-id :issuer issuer :subject subject}))))
      (catch Exception e
        (if (duplicate-key? e)
          (settings/fail! 409 "Identity or user is already bound. Explicitly unbind before rebinding.")
          (throw e))))))

(defn unbind-user!
  "Delete only the specified Keycloak identity; FK cascades revoke its sessions and binding."
  [identity-id]
  (when-not (= 1 (t2/delete! :model/AuthIdentity :id identity-id :provider "oss-keycloak"))
    (settings/fail! 404 "Keycloak binding does not exist.")))

(defn bound-user
  "Resolve only the signed issuer/subject pair to an explicit active user; ignore email claims."
  [{:keys [iss sub]}]
  (when-let [binding (t2/select-one :model/OssKeycloakBinding :id (binding-id iss sub))]
    (when-let [identity (t2/select-one :model/AuthIdentity :id (:auth_identity_id binding)
                                       :provider "oss-keycloak")]
      (when (and (= [iss sub] [(:issuer (:metadata identity)) (:subject (:metadata identity))])
                 (= (:provider_id identity) (binding-id iss sub)))
        (t2/select-one :model/User :id (:user_id identity) :is_active true)))))

(defn associate-session!
  "Associate a newly-created normal Metabase session with the verified OIDC session."
  [session {:keys [iss sub sid exp]}]
  (t2/insert! :model/OssKeycloakSession
              :session_id (:id session) :binding_id (binding-id iss sub)
              :issuer_hash (protocol/digest iss) :sid sid :expires_at (instant-at exp)))

(defn revoke!
  "Revoke only this issuer/client's sessions matching all supplied sid/sub restrictions."
  [{:keys [iss sid sub]}]
  (let [sessions (t2/select :model/OssKeycloakSession
                            {:where (cond-> [:and [:= :issuer_hash (protocol/digest iss)]]
                                      sid (conj [:= :sid sid])
                                      sub (conj [:= :binding_id (binding-id iss sub)]))})
        ids (mapv :session_id sessions)]
    (when (seq ids)
      (t2/delete! :model/Session :id [:in ids]))
    (count ids)))

(defn remember-logout!
  "Persist a logout replay marker atomically; return false if it has already been accepted."
  [{:keys [iss jti]}]
  (prune! :model/OssKeycloakLogout)
  (let [id (protocol/digest [iss jti])]
    (if (t2/exists? :model/OssKeycloakLogout :id id)
      false
      (do
        (t2/insert! :model/OssKeycloakLogout :id id
                    :expires_at (instant-at (+ (protocol/now-seconds) 600)))
        true))))

(defn accept-logout!
  "Accept and revoke in one transaction; concurrent duplicates succeed without revoking twice."
  [claims]
  (try
    (t2/with-transaction [_]
      (when (remember-logout! claims)
        (revoke! claims)))
    (catch Exception e
      ;; Check after rollback: a competing transaction may have inserted the same marker.
      (when-not (and (duplicate-key? e)
                     (t2/exists? :model/OssKeycloakLogout :id (protocol/digest [(:iss claims) (:jti claims)])))
        (throw e)))))
