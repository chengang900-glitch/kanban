(ns metabase.sso.keycloak.session
  "Lightweight request-time OIDC session validation; no authentication orchestration dependency."
  (:require
   [java-time.api :as t]
   [metabase.sso.keycloak.protocol :as protocol]
   [metabase.sso.keycloak.settings :as settings]
   [toucan2.core :as t2]))

(defn session-active?
  "Deny stale OIDC sessions even if the ordinary Metabase cookie still exists."
  [session-key-hash]
  (boolean
   (and (settings/oss-keycloak-enabled)
        (t2/query-one {:select [[:oidc.session_id :id]]
                       :from [[:oss_keycloak_session :oidc]]
                       :join [[:core_session :session] [:= :session.id :oidc.session_id]]
                       :where [:and [:= :session.key_hashed session-key-hash]
                               [:= :oidc.issuer_hash (protocol/digest (settings/oss-keycloak-issuer))]
                               [:> :oidc.expires_at (t/instant)]]}))))
