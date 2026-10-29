# UhooAI v0.64.2.5 定制交付与验收

2026-10-18。本文记录独立本地仓库、定制源码、OSS JAR 和隔离浏览器验收阶段；该阶段未修改生产服务。随后用户授权的服务器部署与真实验收另见 [生产部署记录](UHOOAI_V64_DEPLOYMENT.md)。未推送远程 Git。

## 源码与制品

- 本地仓库：`/Users/chengang/Documents/UhooAI服务器/metabase-v0.64.2.5`。
- 分支：`customization/uhooai-v0.64.2.5`。
- 官方基线：`43a24f64f0e522aaeb6f3b2cf39001c6e451bc56`。
- 安装包对应源码：`a26b7ad156eb54f951f84fc47624d2529453fd0e`。其后的提交仅整理验收文档，不改变已打包程序。
- JAR：`target/uberjar/metabase.jar`，715,143,865 字节，约 682 MiB。
- 包内版本：`v0.64.2.5 / a26b7ad / 2026-10-18`。
- SHA-256：`74aee7ca7423e602904da0e62468e3419f64fd890409ce976c32ed2e2f6d30e9`。
- ZIP 所有条目校验通过；含独立 Keycloak migration、94 个扩展类、原生 sqlglot 和 Linux native 资源；无 Enterprise 后端条目。

原生 AI、Metabot、提示词/工具、原生历史相关五个目录与官方基线的 Git tree 完全一致。仅新增导航调用原生 API；Qwen 暂不接入。官方 migrations 内容未修改，仅增加独立扩展 changeset。旧版参考目录保持干净。

## 自动检查

| 项目 | 结果 |
| --- | --- |
| 前端 | 17 个套件 218 项，加 DashCard 套件 39 项，共 257 项通过 |
| 后端组合回归 | 186 项、8,782 条断言，0 失败、0 错误；包含认证、会话、安全、模块边界、i18n、设置、邮件品牌和 Keycloak |
| 翻译构建单测 | 5 项、27 条断言通过；保留新版多上下文和参数验证 |
| TypeScript | 全量 type-check-pure 通过 |
| ESLint/格式 | 改动文件的定向 lint、格式化和 diff --check 通过 |
| 仓库 | Git 连通性检查通过；仅官方 upstream，无私有远程推送 |
| 构建 | 正式前端、静态可视化、许可证、Python 依赖及 OSS uberjar 成功；最终修正后重新构建前端和 JAR |

构建仍有上游包体积提示及第三方反射/Unsafe 提示。翻译校验报告含 195 条问题，按新版规则处理，未关闭检查或覆盖原始词库。完整机器可读结果见 `verification.json`。

## 实际浏览器验收

全部使用该 JAR、独立 H2、原生示例数据和临时 RSA 签名的回环 OIDC 服务。**这不是生产 Keycloak 或真实 LibreChat 门户联调。**

| 场景 | 可观察结果 |
| --- | --- |
| 新安装默认语言 | 未配置实例的欢迎页为简体中文 |
| 站点名称 | 公共配置刷新后，登录页、普通用户导航和后台保留“UhooAI 数据分析中心” |
| 语言覆盖 | 管理员改为英文后，Google auth / LDAP 等原生入口正常；随后恢复中文 |
| 权限 | 普通账号访问管理设置和写入站点名均为 403；公共读取名称没有放宽写权限 |
| SSO 账号切换 | A 对应用户 2，B 对应用户 3；切换后 A 旧 Cookie 请求为 401 |
| SSO 退出 | 签名 backchannel 退出和本地退出后，旧 Cookie 均返回 401 |
| 趋势图 | 同一真实样例查询的常规/反向指标分别应用 error / success 强调色；保留新版日期和比较显示 |
| 进度条 | 0、1、65、100、125、NULL 状态可显示；65% 实测比例约 0.64999，1% 约 0.00999，配置色生成浅到深渐变 |
| NULL 语义 | 仍按新版原生逻辑显示 0，未改计算规则 |
| 隐藏背景 | 取消卡片背景时，渐变和百分比徽标隐藏，原生指针恢复 |
| 浅色/深色/移动端 | 原生系统主题切换有效，430px 视口无横向溢出；截图已检查 |
| 管理入口 | Google auth / LDAP 保留，商业导航隐藏，Monitor 默认进入 `/monitor/tasks/list` 而非空白付费介绍页 |
| 公开分享 | 7 个进度卡均无主应用定制 class、渐变或可见百分比徽标；原生分享布局保留 |

AI问数导航的 NLQ/数据权限与原生 startNewConversation 调用由定向前端测试覆盖；当前未配置实际模型，所以未把模型问数或历史业务流程记为已验收。静态嵌入范围有单测，未执行完整 SDK 运行验收。拖拽、钻取、导出等完整业务回归也不在本次浏览器证据中。

截图及原始结果位于本地 `output/playwright/`，不入源码 Git：

- `login-final.png`：中文登录与站点名称。
- `admin-authentication-final.png`：英文用户覆盖与认证配置。
- `charts-light-final.png`、`charts-dark-final.png`、`charts-mobile-final.png`：图表与隐藏背景。
- `public-native-final.png`：公开分享的原生样式。
- `final-browser-evidence.txt`：最终浏览器断言结果。

本地测试监听和浏览器在交付前关闭，合成数据留在忽略的 target 目录内，便于排查；没有真实服务凭据进入源码。

## 本地验收完成时的生产待办

以下是本地验收阶段列出的待办；后续状态以生产部署记录为准。

1. PostgreSQL 17.11 应用库备份的隔离恢复及迁移，包括实际账号、报表和设置的保留检查。
2. 真实 Keycloak 客户端、Issuer、ID token claims、时钟、回调和 backchannel 配置，以及真实门户的统一退出和跨账号隔离。
3. 真实业务查询、保存和导出，以及实际模型的 AI 问数。
4. 服务器安装包切换、生产浏览器验收与回退演练。

生产接入配置、备份和回退边界见 `UHOOAI_V64_MIGRATION.md`。不得以本地模拟、构建成功或健康接口替代上述验收。
