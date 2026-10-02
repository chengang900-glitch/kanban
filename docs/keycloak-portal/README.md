# OSS 个人工作区接入 LibreChat

本扩展独立提供 Keycloak OIDC 登录与同源 iframe，使用普通 Metabase SESSION 与原生 OSS 权限。没有自动开户、邮箱合并、组同步、管理员提升；商业行列安全、审计、SDK、交互嵌入许可不会因此获得。

## 当前环境与待决策项

2026-10-03 用户最后确认中台为 `http://demo.uhoo.cn:9433/`。此前核查的 `168.168.188.198` 是另一套环境，不能用于本次部署。公网 Keycloak discovery 的 issuer 为 `http://demo.uhoo.cn:9433/realms/enterprise-ai`。Metabase 为 `http://115.227.3.67:3000/`，只读核查已升级到 v0.63.19（hash 5e60b25）。这些都是原有实例；本分支尚未部署。

**本扩展同时支持 HTTP 和 HTTPS，由管理员配置 URL 选择，不增加 Metabase HTTP 开关，也不限制 HTTP 主机必须是本机。** 门户和 `/metabase/` 必须使用完全相同的协议、主机和端口；issuer 可以独立配置 HTTP 或 HTTPS，但必须与 Keycloak 发布的 issuer 及 LibreChat 保存的身份一致。Discovery 各端点仍须与 issuer 同源，不能在发现文档中切换协议或主机。

HTTP 不加密传输；HTTPS 需要正确证书。登录 Cookie 根据实际入口协议设置 Secure，代理须正确传递 `X-Forwarded-Proto`。切换已有部署的协议会改变 origin/issuer，需同步回调白名单和身份配置，并重新登录。

LibreChat 现有门户配置有 `PORTAL_ALLOW_HTTP`：选择 HTTP 时设为 `true`（仍允许 HTTPS），选择 HTTPS 时可保留原值。Keycloak Realm 自身的 SSL 策略也须允许所选入口；本扩展不自动修改这些远程设置。

## 最小配置步骤

1. 备份 Metabase 应用数据库、现有 JAR/服务环境配置；备份中台完整 Compose 覆盖链、Caddy、LibreChat 配置与 Keycloak client 配置。升级和回滚都先在复制数据库上验证，禁止原库降版本启动。
2. 确定一个完整的 HTTP 或 HTTPS issuer 和门户 origin。LibreChat 与 Metabase 必须使用同一 issuer 中的同一 subject；邮箱相同不能代替该条件。
3. 按 `keycloak-client.template.json` 创建独立 confidential client。使用 exact callback 和 logout URL、PKCE S256、RS256，启用 back-channel logout 并包含 sid。Secret 保存在服务器未跟踪配置中，不复制到会话、Git 或日志。
4. 按 `metabase.env.example` 配置 Metabase，保持原应用数据库配置。持久化独立的随机加密密钥，不在重启时重新生成。内部 IdP 网络允许列表必须限制到实际地址，不在生产使用 allow-all。
5. 在门户同一 HTTP 或 HTTPS origin 加入 `Caddyfile.example` 的代理段，保持已有路由。按所选协议设置 `PORTAL_DATA_CENTER_URL=http://门户地址/metabase/` 或 `https://门户地址/metabase/`，末尾斜线必需；HTTP 时设置 LibreChat 现有的 `PORTAL_ALLOW_HTTP=true`。Metabase `MB_SITE_URL` 包含 `/metabase` 前缀。Caddy 不移除 CSP/X-Frame-Options，也不改 Cookie。
6. 管理员以已有 Metabase 密码账号登录，显式绑定两个普通用户的 Keycloak subject。绑定 API 见下文。用户的数据库/集合权限仍由 Metabase 管理员按原有方式配置。
7. 将 `librechat.patch` 应用到已核对的 LibreChat rc4 基线；对变更工作区运行类型检查、定向测试和正式构建后，再准备替换镜像。当前补丁基线为本地 `19c2e462bfe69eed00f3876b69c32bdde0154463`，原源码未修改，已在独立副本验证。

## 接口与身份绑定

下列路径是外部带 `/metabase` 前缀的 URL；内部路由没有该前缀。

| 接口 | 作用 |
| --- | --- |
| GET `/metabase/auth/keycloak/login` | 顶层 Authorization Code + PKCE 登录；不接受外部 return URL |
| GET `/metabase/auth/keycloak/callback` | 校验 state/nonce/签名/issuer/audience/时间，再查显式绑定 |
| GET `/metabase/auth/keycloak/status` | 仅当前有效 Keycloak 会话可读取自己的 issuer/subject/user_id |
| GET/POST `/metabase/auth/keycloak/bindings` | 管理员列出绑定、创建绑定 |
| DELETE `/metabase/auth/keycloak/bindings/:id` | 管理员解除指定 AuthIdentity 绑定并撤销其会话 |
| POST `/metabase/auth/keycloak/logout` | 验证 Origin，清除浏览器本地会话，返回固定 IdP 退出 URL |
| POST `/metabase/auth/keycloak/backchannel-logout` | 无浏览器 Cookie，必须提交签名 logout_token |

管理员 POST 的 JSON 为 `{"user_id":已有Metabase用户ID,"subject":"Keycloak稳定sub"}`，并提供与实际入口一致的精确 `Origin: http://门户地址` 或 `Origin: https://门户地址` 与管理员 SESSION Cookie。用仅本地可读的 Cookie jar，不将管理员 SESSION 放进命令行参数或文档。身份有冲突返回 409；先显式解除再重新绑定。GET 返回的 id 为 AuthIdentity id，供 DELETE 使用。停止用户后，原生 API 拒绝其会话；Keycloak 停用需要同时撤销该用户 SSO sessions，单独 disabled 不能作为即时撤销证据。

## 门户行为和安全边界

LibreChat 的认证后 `/api/portal/data-identity` 只返回当前用户的 OpenID issuer/subject；不输出邮箱或 token。DataCenter 在 iframe 加载前核对它与 Metabase 的当前身份。身份不一致、缺失、请求失败或用户切换时，iframe 不加载。用户通过顶层链接重新认证；匹配且有效的现有个人会话可以继续使用。每 30 秒重查状态，后端每次 API 请求即时检查有效期和撤销状态；不依赖浏览器计时器授权。检查请求和旧账号异步响应会在切换时取消。

“退出门户”先卸载 iframe、POST 清除 Metabase，再调用 LibreChat 原生退出；原生 Keycloak 退出负责撤销 SSO，并向本客户端发 back-channel logout。门户其他原生退出入口仍依赖该签名事件撤销 Metabase 会话，所以必须真实验收 Keycloak 事件投递。Metabase 工作区内部退出只清除 Metabase，会重新出现认证入口，不冒充统一退出。

CSP 仅在显式开关打开后变为 `frame-ancestors 'self'`，X-Frame-Options 为 SAMEORIGIN。它许可整个 origin，不能仅许可 `/portal/data`；同源页面必须属于同一信任边界。所有数据、编辑、导出权限都由原生 OSS API 判定。无 refresh token/access token 落库；Metabase 会话至多持续到 ID token exp（建议 300 秒），到期重新顶层登录。

## 升级和回滚

新增四张 `oss_keycloak_*` 表及外键，保留原有迁移。绑定使用原有 AuthIdentity（provider `oss-keycloak`），本地密码身份保留。迁移回滚只删除本扩展表，生产回滚以完整应用数据库备份恢复为准，不能假设较旧 JAR 接受已经升级的数据库。

禁用 OIDC 开关后 Keycloak 会话即时拒绝访问，密码/API key/OAuth 的原有优先级不变。禁用 iframe 开关恢复 DENY/none。恢复之前先确认用户未保存的编辑，再执行退出/切换/回滚。完整证据和未完成验收见 `VALIDATION.md`。

Keycloak client 属性名按 [Keycloak 官方常量文档](https://www.keycloak.org/docs-api/26.7.3/javadocs/constant-values.html) 核对；模板仍须在实际部署版本导入并真实验收。
