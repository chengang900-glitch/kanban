(ns metabase.notification.payload.impl.system-event
  (:require
   [clojure.string :as str]
   [metabase.auth-identity.core :as auth-identity]
   [metabase.channel.urls :as urls]
   [metabase.notification.payload.core :as notification.payload]
   [metabase.session.core :as session]
   [metabase.sso.core :as sso]
   [metabase.system.core :as system]
   [metabase.users.models.user :as user]
   [metabase.util.malli :as mu]
   [toucan2.core :as t2]))

(defn- join-url
  [user-id redirect]
  ;; TODO: the reset token should come from the event-info, not generated here!
  (let [reset-token               (auth-identity/create-password-reset! user-id)
        should-link-to-login-page (and (sso/sso-enabled?)
                                       (not (session/enable-password-login)))
        email (t2/select-one-fn :email [:model/User :email] user-id)]
    (if should-link-to-login-page
      (cond-> (str (system/site-url) "/auth/login")
        redirect (str "?redirect=" redirect))
      ;; NOTE: the new user join url is a password reset route with an indicator that this is a first time user.
      (str (user/form-password-reset-url reset-token)
           "?"
           (str/join "&" (remove nil? [(when redirect (str "redirect=" redirect))
                                       (when email (str "email=" email))]))
           "#new"))))

(defn- custom-payload
  "Returns a map of custom payload for a given topic and event-info.
  Custom are set of contexts that are specific to certain emails.
  Currently we need it to support usecases that our template engines doesn't support such as i18n,
  but ideally this should be part of the template."
  [topic event-info]
  (let [{user-id :id from-setup :is_from_setup invite-target :invite_target} (:object event-info)]
    (case topic
      :event/user-invited
      (let [dashboard? (= (:type invite-target) "dashboard")
            redirect   (or (when invite-target
                             (if dashboard?
                               (urls/dashboard-path (:id invite-target))
                               (urls/card-path (:id invite-target))))
                           (when from-setup "/admin/databases/create"))
            subject    (cond
                         (and invite-target dashboard?)
                         (format "邀请你查看看板“%s”" (:name invite-target))
                         invite-target
                         (format "邀请你查看问题“%s”" (:name invite-target))
                         :else
                         "邀请你加入数据看板")]
        (cond-> {:user_invited_email_subject subject
                 :user_invited_join_url      (join-url user-id redirect)}
          invite-target (assoc :invite_target_name         (:name invite-target)
                               :invite_target_is_dashboard dashboard?)))
      :event/security-advisory-match
      (let [{:keys [severity match_status]} (:object event-info)]
        {:severity_label     (case severity
                               :critical "严重"
                               :high     "高"
                               :medium   "中"
                               :low      "低")
         :severity_color     (case severity
                               :critical "#E65050"
                               :high     "#F0830E"
                               :medium   "#F0C431"
                               :low      "#509EE3")
         :status_label       (case match_status
                               :active "生效中"
                               :error  "错误")
         :security_center_url (urls/security-center-url)})
      {})))

(mu/defmethod notification.payload/payload :notification/system-event
  [notification-info :- ::notification.payload/Notification]
  (let [payload                          (:payload notification-info)
        {:keys [event_topic event_info]} payload]
    (assoc payload :custom (custom-payload event_topic event_info))))
