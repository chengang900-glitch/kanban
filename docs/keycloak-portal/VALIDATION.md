# 2026-10-03 OSS Keycloak / LibreChat 验证记录

## 交付范围

源码基线 `0f3ecb18873c5d47b5b67eddcc33bd0cccec1d74`，分支 `customization/v0.63.19-keycloak-portal`。实现版本和最终产物校验值将在构建后记录于本文件。未推送 Git、未部署生产、未修改远程配置。没有复制会话中的真实凭据。

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

## 尚未验证和继续条件

- 当前真实中台和 issuer 为 `http://demo.uhoo.cn:9433/`、`http://demo.uhoo.cn:9433/realms/enterprise-ai`；本实现安全默认拒绝公网 HTTP。等待用户选择 HTTPS 入口，或另行授权增加默认关闭的临时 HTTP 联调开关。
- 真正 Keycloak 的 confidential client/PKCE、ID token sid、真实 issuer/sub 与 LibreChat 数据库字段、退出事件投递、停用用户撤销、多实例/重启后事件投递尚未联调。
- PostgreSQL/MySQL 应用数据库迁移/回滚、复制生产数据库的兼容检查尚未执行。H2 新库迁移已通过。
- 真实门户性能/Lighthouse、完整 LibreChat 后端与认证链验收未运行；当前副本仅构建前端并测试定向 API handler。
- 保存/导出验证使用本地样例库；不代表生产数据源、AI 模型调用或既有全部品牌定制均完成新一轮验收。

继续真实联调需固定 HTTPS origin/issuer（或确认临时 HTTP 方案）、受控服务器访问与未跟踪配置路径、两个普通账号权限矩阵。先备份并准备复制库/隔离实例，再按 README 联调；部署与推送仍需单独授权。
