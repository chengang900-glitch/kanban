(ns metabase.sso.api.keycloak
  "Independent OSS Keycloak endpoints; separate from all Enterprise SSO routes."
  (:require
   [metabase.api.macros :as api.macros]
   [metabase.sso.keycloak.integration :as integration]
   [metabase.util.malli.schema :as ms]))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :get "/login"
  "Start top-level OSS Keycloak login."
  [_route _query _body request]
  (integration/login request))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :get "/callback"
  "Complete an OSS Keycloak login transaction."
  [_route _query _body request]
  (integration/callback request))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/logout"
  "Clear the Metabase browser session before portal/Keycloak logout."
  [_route _query _body request]
  (integration/logout request))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/backchannel-logout"
  "Receive signed OIDC back-channel logout messages from Keycloak."
  [_route _query _body request]
  (integration/backchannel-logout request))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :get "/bindings"
  "List explicit bindings (administrator only)."
  [_route _query _body request]
  (integration/bindings request))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/bindings"
  "Bind a Keycloak subject to an existing Metabase user (administrator only)."
  [_route _query _body request]
  (integration/bindings request))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :delete "/bindings/:id"
  "Remove a Keycloak binding and its sessions (administrator only)."
  [{:keys [id]} :- [:map [:id ms/PositiveInt]] _query _body request]
  (integration/unbind request id))

(api.macros/defendpoint :get "/status"
  :- [:map [:issuer :string] [:subject :string] [:user_id ms/PositiveInt]]
  "Return this browser's current OSS Keycloak identity for the same-origin portal."
  [_route _query _body request]
  (integration/status request))

(def ^{:arglists '([request respond raise])} routes
  "`/auth/keycloak` handler."
  (api.macros/ns-handler *ns*))
