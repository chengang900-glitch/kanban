(ns metabase.sso.models.keycloak
  "Private persistent records for the OSS Keycloak extension."
  (:require
   [methodical.core :as methodical]
   [toucan2.core :as t2]))

(doseq [model [:model/OssKeycloakBinding :model/OssKeycloakSession
               :model/OssKeycloakLogin :model/OssKeycloakLogout]]
  (derive model :metabase/model))

(methodical/defmethod t2/table-name :model/OssKeycloakBinding [_] :oss_keycloak_binding)
(methodical/defmethod t2/table-name :model/OssKeycloakSession [_] :oss_keycloak_session)
(methodical/defmethod t2/table-name :model/OssKeycloakLogin [_] :oss_keycloak_login)
(methodical/defmethod t2/table-name :model/OssKeycloakLogout [_] :oss_keycloak_logout)
(methodical/defmethod t2/primary-keys :model/OssKeycloakSession [_] [:session_id])
