# 2026-10-03 OSS Keycloak / LibreChat 验证记录

以下为首次实现 `09006e09` 的记录；本次 HTTP/HTTPS 修订见文末，当前交付以文末产物为准。

## 交付范围

源码基线 `0f3ecb18873c5d47b5b67eddcc33bd0cccec1d74`，分支 `customization/v0.63.19-keycloak-portal`。源码提交 `09006e09f92892322f50c22f012543157464b1b7`；后续收口提交仅更新交付文档和补丁空白行。未推送 Git、未部署生产、未修改远程配置。没有复制会话中的真实凭据。

LibreChat 补丁基线 `19c2e462bfe69eed00f3876b69c32bdde0154463`，在 `/private/tmp/librechat-metabase-isolated` 独立副本修改与测试；原项目源码保持原状。共享的 node_modules 仅用于读取依赖，Vite 使用 `--configLoader runner` 避免向共享目录写临时配置。

## 已通过的检查

| 项目 | 结果 |
| --- | --- |
| Keycloak 协议/存储/集成测试 | 16 tests / 102 assertions，0 failures / 0 errors（含并发 state 单次消费） |
| 原生 session/security + module 回归 | 74 tests / 4402 assertions，0 failures / 0 errors |
| Metabase 登录组件 | 8 tests，包括 `/metabase` 前缀、顶层导航、禁用入口和密码保留 |
| LibreChat DataCenter | 10 tests，身份匹配、错误身份、账号切换、旧异步响应、退出与 URL 合约 |
| LibreChat identity API | 4 tests，拒绝非 OpenID 或不完整身份，不暴露 token |
| TypeScript | Metabase、LibreChat client、LibreChat api 均退出 0 |
| Lint | 本次 Clojure 文件 0 errors / 0 warnings；两端本次前端文件 ESLint 退出 0 |
| LibreChat production frontend | `npm run build --workspace=@librechat/frontend -- --configLoader runner` 退出 0 |
| 补丁 | `git apply --check docs/keycloak-portal/librechat.patch` 对基线退出 0 |
| OSS JAR | 完整 OSS 前端/uberjar 构建退出 0；最终文件版本、ZIP 与 SHA-256 见下方 |

前一轮合并检查曾因模块配置中误增两个无关 session 依赖及 nonce 测试未启动服务器失败。已删除无关依赖、在加载目标命名空间后预启动隔离测试服务器；复跑 74 项全通过。此处记录最终结果，不把失败当成通过。

构建过程存在原有 CLJS 宏与过期 Browserslist 提示；不作为本扩展的验收结果。未升级依赖。生产中数据库迁移仍需复制数据库演练。

## 实际 JAR 的隔离浏览器验收

Java 25、独立 H2 文件库、随机测试加密密钥/RSA 密钥，三个服务均只监听 127.0.0.1。Chrome 使用新的临时上下文，不使用个人浏览器会话。页面运行实际打包 JAR 和补丁中的 DataCenter；OIDC provider 与 LibreChat auth/config hooks 是明确标识的模拟实现，**不等同于真实 Keycloak/LibreChat SSO 验收**。

已验证：

1. 认证前不加载 iframe；顶层 Code + PKCE 回调返回 `/portal/data`，正确加载 `/metabase/` 原生导航与资源。
2. 普通用户 A 查询样例库、保存到自己的个人集合、导出 CSV；浏览器中的问题深链接刷新后仍可读取。
3. 门户切换到 B 时，A 的旧 Metabase 身份不能加载 iframe；显式登录 B 后，A 的旧浏览器会话返回 401。
4. B 直接读取或导出 A 的个人问题均返回 403，B 仍保留自己的原生工作区权限。
5. 签名 back-channel logout 撤销后直接 API 返回 401；重新检查身份时 iframe 卸载。
6. 门户退出先清除 Metabase，再调用模拟原生退出；之后直接 API 为 401。
7. 未绑定 OIDC subject 回调 403，无自动创建/邮箱合并。
8. 不同端口 origin 的 iframe 导航进入 Chrome 拒绝页面；实际响应为 `frame-ancestors 'self'` / SAMEORIGIN。
9. 页面运行时错误为 0。

证据：`target/keycloak-portal-local/browser/smoke.json` 和同目录 `01-before-login.png`、`02-user-a-workspace.png`、`03-saved-question-refresh.png`、`04-account-mismatch.png`、`05-user-b-workspace.png`。这些是忽略的本地产物，不包含真实账号或 token。

## 可复跑命令

先在独立 LibreChat 副本应用补丁、安装既有依赖。以下命令从 Metabase 目录执行，并使用 Java 25、Clojure、Node 22、Bun 的正确 PATH：

```sh
bin/keycloak-portal/test-local.sh
node node_modules/jest/bin/jest.js --runInBand frontend/src/metabase/auth/components/Login/tests/common.unit.spec.tsx
./bin/build.sh '{:edition :oss :version "v0.63.19"}'
LIBRECHAT_FIXTURE_ROOT=/path/to/isolated-LibreChat node bin/keycloak-portal/build-portal-fixture.mjs
FIXTURE_PORTAL_DIST="$PWD/target/keycloak-portal-local/portal-dist" node bin/keycloak-portal/isolated-server.mjs
# 在另一个终端，等待 /metabase/api/health 就绪：
node bin/keycloak-portal/seed-local.mjs
LIBRECHAT_FIXTURE_ROOT=/path/to/isolated-LibreChat node bin/keycloak-portal/browser-local.mjs
```

`seed-local.mjs` 仅对新建 loopback 数据库执行。每次启动使用新的 H2 目录；脚本不支持远程 URL。测试密钥只存在内存/子进程环境，不写进源码或证据。停止 fixture 后移除自己的 target 测试目录即可；不得将模拟服务器部署到公网。

原生回归须先加载测试再预启动 web-server：

```sh
# 清除外部 MB_DB_* 连接变量，仅使用内存 H2
MB_DB_TYPE=h2 MB_DB_IN_MEMORY=true clojure -M:dev:test -e "(require 'metabase.test-runner) (def options {:only '[metabase.server.middleware.session-test metabase.server.middleware.security-test metabase.core.modules-test] :multithread? false}) (metabase.test-runner/find-tests options) (metabase.test.initialize/initialize-if-needed! :web-server) (metabase.test-runner/find-and-run-tests-cli options)"
```

## 首次登录自动绑定验证

本次变更在 Keycloak 回调中增加了受限的首次登录自动绑定：仅接受当前配置 issuer、`email_verified=true`、有效 `sub` 和有效邮箱；Metabase 中必须恰好存在一个启用账号，且该账号不能已有其他 `oss-keycloak` 身份。成功时只创建 `AuthIdentity` 与 `oss_keycloak_binding`，不创建 Metabase 用户、不改变权限或密码；后续请求仍按 `issuer + sub` 查找绑定。

本地 H2 定向测试结果：Keycloak store 5 tests / 25 assertions、callback integration + protocol 13 tests / 107 assertions，均为 0 failures / 0 errors。真实中台部署后使用新建的 `test@uhoo.cn`（Keycloak 用户名 `test`，Metabase 同邮箱账号）执行一次首次登录，检查回调成功进入数据中心，并确认数据库只新增该 subject 的绑定记录；随后退出并重新登录，确认走已有绑定路径。若邮箱未验证、Metabase 账号不存在/被停用或身份已绑定其他账号，应继续返回受控错误，不自动创建或覆盖账号。

2026-10-06 已完成真实中台首登验收：`test@uhoo.cn` 在 Keycloak 标记邮箱已验证后，从门户登录并正常进入 Metabase；数据库核对显示该用户新增一条 `oss-keycloak` AuthIdentity/绑定记录，服务重建后仍保留。最终 JAR SHA-256 为 `50c4b7e4b3a52a21ded9752ddc7ee848e1ef826dad6626c93f511ed44c585d02`，公网 `/metabase/api/health` 返回 200。当前验证覆盖一个新账号的自动绑定和重启持久化；其它账号仍需满足同样的已验证邮箱、唯一启用 Metabase 账号和无身份冲突条件，首次登录时自动完成绑定。

## 尚未验证和继续条件

- 当前真实中台和 issuer 为 `http://demo.uhoo.cn:9433/`、`http://demo.uhoo.cn:9433/realms/enterprise-ai`；用户后续确认程序同时支持 HTTP/HTTPS；协议选择已不再阻塞本地交付，真实部署仍需配置核查和验收。
- 真正 Keycloak 的 confidential client/PKCE、ID token sid、真实 issuer/sub 与 LibreChat 数据库字段、退出事件投递、停用用户撤销、多实例/重启后事件投递尚未联调。
- PostgreSQL/MySQL 应用数据库迁移/回滚、复制生产数据库的兼容检查尚未执行。H2 新库迁移已通过。
- 真实门户性能/Lighthouse、完整 LibreChat 后端与认证链验收未运行；当前副本仅构建前端并测试定向 API handler。
- 保存/导出验证使用本地样例库；不代表生产数据源、AI 模型调用或既有全部品牌定制均完成新一轮验收。

继续真实联调需按部署者选择固定 HTTP 或 HTTPS origin/issuer、受控服务器访问与未跟踪配置路径、两个普通账号权限矩阵。先备份并准备复制库/隔离实例，再按 README 联调；部署与推送仍需单独授权。

## 最终产物

- 文件：`target/uberjar/metabase-v0.63.19-keycloak-09006e09.jar`（通用副本为 `target/uberjar/metabase.jar`）
- 版本：`v0.63.19`，hash `09006e0`，日期 `2026-10-03`
- 源码：`09006e09f92892322f50c22f012543157464b1b7`
- 大小：`663098827` 字节
- SHA-256：`58e00d0a3d04d0fdaea72ce83aa1d26dce7561de6c6c0387d37279c72bd1c29b`
- ZIP 全部 CRC 校验通过，Main-Class 为 `metabase.core.bootstrap`，JDK 25
- 已包含新增迁移和 91 个 Keycloak AOT class；Enterprise 命名空间条目 0
- 具名交付 JAR 在新建 H2 数据库上重新启动，完整复验以上 9 项浏览器检查，退出 0、页面运行时错误 0
- 完整 OSS 构建后，以 `{:edition :oss :version "v0.63.19" :steps [:version :uberjar]}` 重建，更新提交标识并重新编译后端；退出 0

不将产物目录提交 Git；最终源码与 JAR 的版本标识一致。新增配置资料不包含 client secret 或加密密钥。

## HTTP / HTTPS 均支持：用户后续确认的修订

用户要求由部署者选择协议，程序同时支持 HTTP 与 HTTPS。本次移除 Metabase URL 和 LibreChat DataCenter 对公网 HTTP 的硬限制，没有新增 Metabase HTTP 开关。固定 issuer、Discovery 同源、门户与工作区同源、显式身份绑定、签名/state/nonce 校验保持有效。HTTP Cookie 不设置 Secure，HTTPS Cookie 设置 Secure。

复现：旧代码在公网 HTTP URL 测试中失败（3 failures / 1 error），LibreChat 的 HTTP 域名组件检查 7 项失败。修改后：

- OSS 后端 17 tests / 125 assertions，0 failures / 0 errors，含 HTTP/HTTPS Discovery、回调和两类 Cookie 的 Secure 属性。
- DataCenter 同一套测试分别以 `http://portal.example:3080`、`https://portal.example:3080` 运行；每种入口 14 tests 通过，包括跨协议、跨主机、非 HTTP(S)、userinfo、query、fragment 拒绝。
- LibreChat 既有 URL/启动配置 13 tests 通过。HTTP 入口继续使用其已有 `PORTAL_ALLOW_HTTP=true` 配置，详见 README。
- LibreChat client TypeScript、修改文件 ESLint、生产前端构建通过；Clojure lint 为 0 errors / 0 warnings。
- 补丁对原有 `19c2e462` 基线 `git apply --check` 通过。

以上协议单元/集成测试不代替部署端的 TLS 证书及 Keycloak Realm SSL 策略验收；本次没有改动远程部署或推送 Git。

## 最终双协议构建验收

按源码提交 `7c01f933d306176628c7effcf3e137341448982b` 构建的 OSS JAR 已完成归档校验和隔离浏览器复验。此节覆盖前面的首次实现产物记录，交付文件为：

- 文件：`target/uberjar/metabase-v0.63.19-keycloak-7c01f933.jar`
- 版本：`v0.63.19`，hash `7c01f93`，日期 `2026-10-03`；JDK 25，Main-Class `metabase.core.bootstrap`
- 大小：`663098792` 字节；SHA-256：`1133b9c353d252b35bc9474e855777a3b5ebdb01d5734844be71113cb81bcc9f`
- ZIP 全部 CRC 校验通过，包含 `migrations/063/20261003_oss_keycloak.yaml` 和 128 个 Keycloak 类；Enterprise 命名空间条目 0
- 最终 JAR 在新 H2 库上启动成功，`/metabase/api/health` 返回 200。隔离 Chrome 对以上 9 项个人登录、同源 iframe、用户隔离、退出/撤销及跨源策略检查全部通过，页面运行时错误 0；OIDC 与 LibreChat hook 为模拟实现，不代表真实 SSO 联调
- 产物元数据：`target/keycloak-portal-local/artifact-dual-protocol.json`；浏览器结果：`target/keycloak-portal-local/browser/smoke.json`

HTTP 和 HTTPS 均可由部署者配置。门户与 Metabase 工作区必须选用完全相同的 scheme、host 和 port；HTTP 部署沿用 LibreChat 已有的 `PORTAL_ALLOW_HTTP=true` 设置。HTTPS Cookie 带 `Secure`，HTTP Cookie 不带 `Secure`。未部署生产、未更改远程配置、未推送 Git，也未在源码或验证证据中保存真实凭据。
