# UhooAI Metabase v0.64.2.5 定制迁移记录

## 版本和工作边界

- 官方基线：`v0.64.2.5` / `43a24f64f0e522aaeb6f3b2cf39001c6e451bc56`。
- 旧定制参考：v0.63.19 / `7521b2d0649fe54c94674d424de15a2c5359460f`，只读参考，未改动。
- 本地仓库：`/Users/chengang/Documents/UhooAI服务器/metabase-v0.64.2.5`。
- 分支：`customization/uhooai-v0.64.2.5`。仅配置官方 upstream；未建立私有远程、未推送。
- 首次交付阶段完成源码、安装包和本地隔离验收；其后授权的生产切换另见 [生产部署记录](UHOOAI_V64_DEPLOYMENT.md)。

## 已实施的行为

| 需求 | v64 实现与边界 |
| --- | --- |
| AI 与历史 | 原生 AI/provider/工具/协议/提示词/会话目录保持官方内容；不迁移 Qwen 与自制历史补丁。新增导航只调用原生 startNewConversation。 |
| 中文默认 | 站点和初始化默认为 zh_CN；用户显式选择英文等语言仍有效。翻译构建保留新版上下文与校验。 |
| 品牌 | 登录、主导航、后台显示配置的站点名称；默认中文“数据看板”、其他语言“Dashboard”；沿用旧登录背景和 favicon。长名称由布局裁切，原始值完整保留。site-name 纳入公共读取，写入仍受管理员/设置管理员权限控制。 |
| 品牌文案 | 只处理翻译模板中独立产品名，不改用户数据、插值参数、网址和技术标识；版权及真实 AI 服务商身份保留。英文也生成哈希化语言包。 |
| 邮件 | 默认图标省略，配置图标保留；站点名称回退；移除 Made with 推广，保留正文、链接、版权。 |
| 商业引导 | 共享推广和独立入口隐藏；许可、EE 能力和权限检查不变。只读、开发、安全与实际许可故障告警保留。监控中心默认进入可用页面。 |
| AI问数 | 受新版 NLQ 和数据权限控制；进入原生 /question/ask，不重写原生历史。 |
| 趋势图 | 基于新版 ScalarCardShell，主应用卡片加入 error > success > brand 强调色和旧版视觉；保留原生计算、布局与钻取。 |
| 进度条 | 主应用卡片内使用配置色渐变和胶囊百分比；小进度不撑大；隐藏背景及嵌入保持原生边界。 |
| Keycloak | 独立 OSS 路由及四张扩展表；严格 PKCE/state/nonce/签名/issuer/sub，个人会话、到期、解绑与 backchannel 撤销；同源嵌入显式开关。 |

新增 changeset 复用旧定制的同一 ID，以避免已应用库重复执行；实际旧库兼容性仍需副本恢复和迁移确认。官方 changeset 内容未改。首次邮箱绑定要求签名 ID token 中 email_verified=true，且只匹配唯一活跃现有账号；不自动创建用户或赋予权限。没有满足条件时，管理员可通过受同源保护的 bindings API 显式绑定。

## 构建与测试方法

要求 Java 25、Node 22、Bun 1.3.14、Clojure CLI、Babashka 和 uv。依赖按原始 bun.lock/deps.edn，不覆盖旧项目 node_modules。

```sh
bun install --frozen-lockfile
bun run build-pure:cljs
GOMEMLIMIT=2GiB GOGC=50 bun run type-check-pure
bin/keycloak-portal/test-local.sh
./bin/build.sh '{:edition :oss :version "v0.64.2.5" :steps [:version :translations :frontend :licenses :python :uberjar]}'
```

内存受限时分开执行构建步骤；翻译、前端和 uberjar 使用同一份已提交源码。测试只使用本地 H2 与合成身份。`bin/keycloak-portal/isolated-server.mjs` 只监听 loopback，清除继承的 MB_* 配置，生成临时测试密钥；不代表真实 Keycloak/LibreChat 门户验收。测试数据、安装包、依赖和浏览器证据均不入源码库。

本地 UI 复现：先启动 `node bin/keycloak-portal/isolated-server.mjs`，就绪后依次执行 `node bin/keycloak-portal/seed-local.mjs`、`node bin/keycloak-portal/seed-visuals.mjs`。合成管理员和普通账号仅用于该回环测试实例。

## 生产接入准备

已有明文应用库首次加入 `MB_ENCRYPTION_SECRET_KEY` 时，v0.64.2.5 要求在应用停止后显式运行原生 `enable-encryption`；仅添加环境变量会被启动保护拒绝。必须先对恢复副本执行并使用完整配置验证，再在停写备份后处理正式库。后续启动、备份恢复和密钥轮换都必须保留正确的长期加密密钥。

启用 SSO 需由部署配置提供 MB_OSS_KEYCLOAK_ENABLED、MB_OSS_KEYCLOAK_ISSUER、MB_OSS_KEYCLOAK_CLIENT_ID、MB_OSS_KEYCLOAK_CLIENT_SECRET、MB_ENCRYPTION_SECRET_KEY；固定门户回跳由 MB_OSS_KEYCLOAK_PORTAL_PATH 指定。默认关闭 SSO 和同源工作区嵌入。内部 IdP 地址如受新版 OIDC 网络策略限制，按具体 IdP 配置允许网络，避免使用测试环境的 allow-all。

Keycloak 客户端需配置精确 /metabase/auth/keycloak/callback 回调、所需 ID token claims，以及 /metabase/auth/keycloak/backchannel-logout；门户调用 POST /auth/keycloak/logout 清除个人会话并完成 IdP 退出。现有门户能否满足这些接口仍需真实联调，浏览器“登录成功”不能替代统一退出和跨账号隔离验收。

生产切换前需保存完整 Compose overlays、当前镜像/JAR、环境配置和 PostgreSQL 17.11 应用库备份，并在隔离 PostgreSQL 副本实际恢复后运行迁移。回退必须协调恢复旧制品与对应应用库，不能假设新增/升级迁移可通过仅换 JAR 回退。保留现有业务库、账号与报表；不执行 down -v。

## 验证证据

最终结果与制品校验记录在本目录 acceptance 文档中。未执行的生产副本迁移、真实 Keycloak/门户和实际 AI 模型问数必须明确列为待验收。
