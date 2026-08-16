(ns metabase.notification.payload.impl.system-event-test
  (:require
   [clojure.test :refer :all]
   [metabase.channel.urls :as urls]
   [metabase.events.core :as events]
   [metabase.notification.models :as models.notification]
   [metabase.notification.test-util :as notification.tu]
   [metabase.session.settings :as session.settings]
   [metabase.sso.settings :as sso.settings]
   [metabase.test :as mt]
   [metabase.test.fixtures :as fixtures]
   [metabase.users.models.user :as user]
   [toucan2.core :as t2]))

(use-fixtures
  :once
  (fixtures/initialize :test-users-personal-collections :web-server :plugins :notifications))

(defn- publish-user-invited-event!
  [user invitor from-setup?]
  (events/publish-event! :event/user-invited {:object  (assoc user
                                                              :is_from_setup from-setup?
                                                              :invite_method "email")
                                              :details {:invitor invitor}}))

(deftest system-event-e2e-test
  (testing "a system event that sends to an email channel with a custom template to an user recipient"
    (notification.tu/with-notification-testing-setup!
      (mt/with-temp [:model/ChannelTemplate tmpl {:channel_type :channel/email
                                                  :details      {:type    :email/handlebars-text
                                                                 :subject "Welcome {{payload.event_info.object.first_name}} to {{context.site_name}}"
                                                                 :body    "Hello {{payload.event_info.object.first_name}}! Welcome to {{context.site_name}}!"}}
                     :model/User             {user-id :id} {:email "ngoc@metabase.com"}
                     :model/PermissionsGroup {group-id :id} {:name "Avengers"}
                     :model/PermissionsGroupMembership _ {:group_id group-id
                                                          :user_id user-id}]
        (let [rasta (mt/fetch-user :rasta)]
          (models.notification/create-notification!
           {:payload_type :notification/system-event}
           [{:type       :notification-subscription/system-event
             :event_name :event/user-invited}]
           [{:channel_type :channel/email
             :template_id  (:id tmpl)
             :recipients   [{:type    :notification-recipient/user
                             :user_id (mt/user->id :crowberto)}
                            {:type                 :notification-recipient/group
                             :permissions_group_id group-id}
                            {:type    :notification-recipient/raw-value
                             :details {:value "hi@metabase.com"}}]}])
          (mt/with-temporary-setting-values
            [site-name "Metabase Test"]
            (mt/with-fake-inbox
              (publish-user-invited-event! rasta {:first_name "Ngoc" :email "ngoc@metabase.com"} false)
              (let [email {:from    "notifications@metabase.com",
                           :subject "Welcome Rasta to Metabase Test"
                           :body    [{:type    "text/html; charset=utf-8"
                                      :content "Hello Rasta! Welcome to Metabase Test!"}]}]
                (is (=? {"crowberto@metabase.com" [email]
                         "ngoc@metabase.com"      [email]
                         "hi@metabase.com"        [email]}
                        @mt/inbox))))))))))

(deftest system-event-resouce-template-test
  (testing "a system event that sends to an email channel with a custom template to an user recipient"
    (notification.tu/with-notification-testing-setup!
      (mt/with-temp [:model/ChannelTemplate tmpl {:channel_type :channel/email
                                                  :details      {:type    :email/handlebars-resource
                                                                 :subject "Welcome {{payload.event_info.object.first_name}} to {{context.site_name}}"
                                                                 :path    "hello_world"}}
                     :model/User             {user-id :id} {:email "ngoc@metabase.com"}
                     :model/PermissionsGroup {group-id :id} {:name "Avengers"}
                     :model/PermissionsGroupMembership _ {:group_id group-id
                                                          :user_id user-id}]
        (let [rasta (mt/fetch-user :rasta)]
          (models.notification/create-notification!
           {:payload_type :notification/system-event}
           [{:type       :notification-subscription/system-event
             :event_name :event/user-invited}]
           [{:channel_type :channel/email
             :template_id  (:id tmpl)
             :recipients   [{:type    :notification-recipient/user
                             :user_id (mt/user->id :crowberto)}
                            {:type                 :notification-recipient/group
                             :permissions_group_id group-id}
                            {:type    :notification-recipient/raw-value
                             :details {:value "hi@metabase.com"}}]}])
          (mt/with-temporary-setting-values
            [site-name "Metabase Test"]
            (mt/with-fake-inbox
              (publish-user-invited-event! rasta {:first_name "Ngoc" :email "ngoc@metabase.com"} false)
              (let [email {:from    "notifications@metabase.com",
                           :subject "Welcome Rasta to Metabase Test"
                           :body    [{:type    "text/html; charset=utf-8"
                                      :content "Hello Rasta! Welcome to Metabase Test!\n"}]}]
                (is (=? {"crowberto@metabase.com" [email]
                         "ngoc@metabase.com"      [email]
                         "hi@metabase.com"        [email]}
                        @mt/inbox))))))))))

(deftest user-invited-event-send-email-test
  (testing "publish an :user-invited event will send an email"
    (doseq [from-setup? [true false]]
      (testing (format "from %s page" (if from-setup? "setup" "invite"))
        (is (= {:channel/email 1}
               (update-vals (notification.tu/with-captured-channel-send!
                              (publish-user-invited-event! (t2/select-one :model/User)
                                                           {:first_name "Ngoc"
                                                            :email      "ngoc@metabase.com"}
                                                           from-setup?))
                            count)))))))

(deftest user-invited-email-content-test
  (let [check (fn [sent-from-setup? expected-subject regexes invitor-name]
                (let [email (mt/with-temporary-setting-values
                              [site-url  "https://metabase.com"
                               site-name "SuperStar"
                               application-logo-url "https://metabase.com/superstar.png"]
                              (-> (notification.tu/with-captured-channel-send!
                                    (publish-user-invited-event! (t2/select-one :model/User :email "crowberto@metabase.com")
                                                                 {:first_name invitor-name :email "ngoc@metabase.com"}
                                                                 sent-from-setup?))
                                  :channel/email first))]
                  (is (= {:recipients     #{"crowberto@metabase.com"}
                          :message-type   :attachments
                          :subject        expected-subject
                          :message        [(zipmap (map str regexes) (repeat true))]
                          :recipient-type :cc}
                         (apply mt/summarize-multipart-single-email email regexes)))))]
    (testing "sent from people page"
      (check false
             "邀请你加入数据看板"
             [#"Ngoc 邀请你加入数据看板"
              #"<a[^>]*href=\"https?://metabase\.com/auth/reset_password/.*#new\"[^>]*>立即进入数据看板</a>"]
             "Ngoc")
      (testing "with sso enabled"
        (mt/with-dynamic-fn-redefs [sso.settings/sso-enabled? (constantly true)
                                    session.settings/enable-password-login (constantly false)]
          (check false
                 "邀请你加入数据看板"
                 [#"<a[^>]*href=\"https?://metabase\.com/auth/login\"[^>]*>立即进入数据看板</a>"]
                 "Ngoc")))
      (testing "with invitor's first_name not defined"
        (check false
               "邀请你加入数据看板"
               [#"你受邀加入数据看板"
                #"<a[^>]*href=\"https?://metabase\.com/auth/reset_password/.*#new\"[^>]*>立即进入数据看板</a>"]
               nil)))
    (testing "subject remains Chinese regardless of locale"
      (mt/with-mock-i18n-bundles! {"es" {:messages {"You''re invited to join {0}''s {1}"
                                                    "Estás invitado a unirte al {0} de {1}"}}}
        (mt/with-temporary-setting-values [site-locale "es"]
          (check false "邀请你加入数据看板" [] "Ngoc"))))
    (testing "sent from setup page"
      (check true
             "邀请你加入数据看板"
             [#"Kratos 邀请你协助设置数据看板"
              #"数据看板已经可以运行，但 Kratos 需要你协助连接数据。请准备以下信息："
              #"<a[^>]*href=\"https?://metabase\.com/auth/reset_password/.*\?redirect(&#x3D;|=)/admin/databases/create.*#new\"[^>]*>"]
             "Kratos")
      (testing "with invitor's first_name not defined"
        (check true
               "邀请你加入数据看板"
               [#"你受邀协助设置数据看板"
                #"数据看板已经可以运行，需要你协助连接数据。请准备以下信息："
                #"<a[^>]*href=\"https?://metabase\.com/auth/reset_password/.*\?redirect(&#x3D;|=)/admin/databases/create.*#new\"[^>]*>"]
               nil)))
    (testing "custom application logo is not displayed"
      (mt/with-premium-features #{:whitelabel}
        (check false
               "邀请你加入数据看板"
               [#"Ngoc 邀请你加入数据看板"]
               "Ngoc")))
    (testing "data URI application logo is not displayed or attached"
      (mt/with-premium-features #{:whitelabel}
        (let [email (mt/with-temporary-setting-values
                      [site-url  "https://metabase.com"
                       site-name "SuperStar"
                       application-logo-url "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="]
                      (-> (notification.tu/with-captured-channel-send!
                            (publish-user-invited-event! (t2/select-one :model/User :email "crowberto@metabase.com")
                                                         {:first_name "Ngoc" :email "ngoc@metabase.com"}
                                                         false))
                          :channel/email first))]
          (is (not (re-find #"<img" (-> email :message first :content))))
          (is (= 1 (count (:message email)))))))))

(deftest create-and-invite-user-redirect-test
  (testing "create-and-invite-user! lands the invitee on the invite_target item after signup"
    (mt/with-model-cleanup [:model/User]
      (let [join-url-html (fn [invite-target]
                            (mt/with-temporary-setting-values [site-url "https://metabase.com"]
                              (-> (notification.tu/with-captured-channel-send!
                                    (user/create-and-invite-user! {:first_name "Newbie" :email (mt/random-email)}
                                                                  {:first_name "Admin" :email "admin@metabase.com"}
                                                                  false
                                                                  invite-target))
                                  :channel/email first :message first :content)))]
        (testing "dashboard"
          (is (re-find #"/auth/reset_password/.*redirect(&#x3D;|=)/dashboard/42.*#new"
                       (join-url-html {:type "dashboard" :id 42 :name "Q3 KPIs"}))))
        (testing "question"
          (is (re-find #"/auth/reset_password/.*redirect(&#x3D;|=)/question/7.*#new"
                       (join-url-html {:type "question" :id 7 :name "Signups"}))))))))

(deftest create-and-invite-user-sso-redirect-test
  (testing "with SSO enabled and password login disabled, the invite link points at /auth/login carrying the item redirect"
    (mt/with-model-cleanup [:model/User]
      (mt/with-dynamic-fn-redefs [sso.settings/sso-enabled?              (constantly true)
                                  session.settings/enable-password-login (constantly false)]
        (let [join-url-html (fn [invite-target]
                              (mt/with-temporary-setting-values [site-url "https://metabase.com"]
                                (-> (notification.tu/with-captured-channel-send!
                                      (user/create-and-invite-user! {:first_name "Newbie" :email (mt/random-email)}
                                                                    {:first_name "Admin" :email "admin@metabase.com"}
                                                                    false
                                                                    invite-target))
                                    :channel/email first :message first :content)))]
          (testing "dashboard"
            (is (re-find #"/auth/login\?redirect(&#x3D;|=)/dashboard/42"
                         (join-url-html {:type "dashboard" :id 42 :name "Q3 KPIs"}))))
          (testing "question"
            (is (re-find #"/auth/login\?redirect(&#x3D;|=)/question/7"
                         (join-url-html {:type "question" :id 7 :name "Signups"})))))))))

(deftest create-and-invite-user-email-content-test
  (testing "the invite email is scoped to the dashboard/question when an invite_target is present"
    (mt/with-model-cleanup [:model/User]
      (let [invite-email (fn [invite-target]
                           (mt/with-temporary-setting-values [site-url  "https://metabase.com"
                                                              site-name "SuperStar"]
                             (-> (notification.tu/with-captured-channel-send!
                                   (user/create-and-invite-user! {:first_name "Newbie" :email (mt/random-email)}
                                                                 {:first_name "Ngoc" :email "ngoc@metabase.com"}
                                                                 false
                                                                 invite-target))
                                 :channel/email first)))
            body         (fn [email] (-> email :message first :content))]
        (testing "dashboard"
          (let [email (invite-email {:type "dashboard" :id 42 :name "Q3 KPIs"})]
            (is (= "邀请你查看看板“Q3 KPIs”" (:subject email)))
            (is (re-find #"Ngoc 邀请你查看数据看板" (body email)))
            (is (re-find #"Q3 KPIs" (body email)))))
        (testing "question"
          (let [email (invite-email {:type "question" :id 7 :name "Signups"})]
            (is (= "邀请你查看问题“Signups”" (:subject email)))
            (is (re-find #"Ngoc 邀请你查看数据问题" (body email)))
            (is (re-find #"Signups" (body email)))))
        (testing "no invite_target falls back to the generic invite"
          (let [email (invite-email nil)]
            (is (= "邀请你加入数据看板" (:subject email)))
            (is (re-find #"Ngoc 邀请你加入数据看板" (body email)))))))))

(deftest notification-create-email-test
  (mt/with-temporary-setting-values [site-url "https://metabase.com"]
    (let [rasta (mt/fetch-user :rasta)
          check (fn [send-condition condition-regex]
                  (notification.tu/with-card-notification [notification {:card              {:name "A Card"}
                                                                         :notification-card {:send_condition send-condition}
                                                                         :notification      {:creator_id (:id rasta)}}]
                    (let [card    (-> notification :payload :card)
                          regexes [#"你已成功为"
                                   (re-pattern (format "<a href=\"%s\"*>%s</a>" (urls/card-url (:id card)) (:name card)))
                                   condition-regex]
                          email   (-> (notification.tu/with-captured-channel-send!
                                        (events/publish-event! :event/notification-create {:object notification
                                                                                           :user-id (:id rasta)}))
                                      :channel/email
                                      first)]
                      (is (= {:recipients     #{(:email rasta)}
                              :message-type   :attachments
                              :subject        "你已创建预警"
                              :message        [(zipmap (map str regexes) (repeat true))]
                              :recipient-type :cc}
                             (apply mt/summarize-multipart-single-email email regexes))))))]
      (doseq [[send-condition condition-regex]
              [[:has_result
                #"当\s*该问题有任何结果\s*时，系统将发送此预警"]
               [:goal_above
                #"当\s*该问题达到目标值\s*时，系统将发送此预警"]
               [:goal_below
                #"当\s*该问题低于目标值\s*时，系统将发送此预警"]]]
        (check send-condition condition-regex))))
  (notification.tu/with-notification-testing-setup!
    (notification.tu/with-card-notification
      [notification {:card              {:name "A Card"}
                     :notification      {:creator_id (mt/user->id :rasta)}}]
      (let [has-link? (fn [notification]
                        (->> (notification.tu/with-captured-channel-send!
                               (events/publish-event! :event/notification-create {:object notification
                                                                                  :user-id (:id (mt/user->id :rasta))}))
                             :channel/email first :message first :content
                             (re-find #"href=")
                             (= "href=")))]
        (testing "test that disable_links: false will keep links in the alert confirmation email"
          (is (true? (has-link? (assoc-in notification [:payload :disable_links] false)))))
        (testing "test that disable_links: nil will keep links in the alert confirmation email"
          (is (true? (has-link? (assoc-in notification [:payload :disable_links] nil)))))
        (testing "test that disable_links: true will disable all links in the alert confirmation email"
          (is (false? (has-link? (assoc-in notification [:payload :disable_links] true)))))))))

(deftest slack-error-token-email-test
  (let [check (fn [recipients regexes]
                (let [email (mt/with-temporary-setting-values
                              [site-url  "https://metabase.com"]
                              (-> (notification.tu/with-captured-channel-send!
                                    (events/publish-event! :event/slack-token-invalid {}))
                                  :channel/email
                                  first))]
                  (is (= {:recipients     recipients
                          :message-type   :attachments
                          :subject        "Slack 连接已失效"
                          :message        [(zipmap (map str regexes) (repeat true))]
                          :recipient-type :cc}
                         (apply mt/summarize-multipart-single-email email regexes)))))
        admin-emails (t2/select-fn-set :email :model/User :is_superuser true)]
    (testing "send to admins with a link to setting page"
      (check admin-emails [#"Slack 连接已失效"
                           #"<a[^>]*href=\"https?://metabase\.com/admin/settings/slack\"[^>]*>前往设置</a>"]))
    (mt/with-temporary-setting-values
      [admin-email "it@metabase.com"]
      (check (conj admin-emails "it@metabase.com") []))))
