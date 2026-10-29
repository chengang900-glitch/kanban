# UhooAI v0.64.2.5 定制版服务器部署记录

2026-10-18（Asia/Shanghai）。用户授权升级现有 UhooAI Metabase；选择保留数据库、替换应用镜像，未卸载 PostgreSQL 或清空数据。

## 当前运行版本

| 项目 | 已核实结果 |
| --- | --- |
| 目标主机 | `uhooai`，Ubuntu 22.04.5 / amd64，内网 `192.168.60.30` |
| 外网入口 | `https://122.224.218.82:9443/metabase/`；SSH 外网端口 `9622` |
| 安装目录 | `/home/uhoo/metabase`，项目 `uhoo-metabase` |
| 应用镜像 | `uhooai/metabase:v0.64.2.5-a26b7ad` |
| 应用镜像 ID | `sha256:622a9ed8c91539ccacc08544807685d835aa211a50bc58678bcc53f69a83c211` |
| 应用版本 | 外网公共配置返回 `v0.64.2.5 / a26b7ad / 2026-10-18` |
| 制品源码 | `a26b7ad156eb54f951f84fc47624d2529453fd0e`，后续部署脚本与文档不改变该 JAR |
| JAR SHA-256 | `74aee7ca7423e602904da0e62468e3419f64fd890409ce976c32ed2e2f6d30e9` |
| 基础运行环境 | 复用原官方镜像的 Java 25.0.4.1；基础镜像 ID `sha256:2002bc09890b35958fb078421ba2d1195703209bc585bf70553b0f0c0573926b` |
| 数据库 | 保留原 PostgreSQL 17.11 及 `uhoo-metabase_postgres_data` 卷，未新增数据库宿主机端口 |
| 应用就绪时间 | `2026-10-18 02:14:27 +08:00` |
| 最终状态 | Metabase、PostgreSQL 均 healthy，当前容器重启计数均为 0 |

仅更新 Metabase 服务的镜像、SSO env 文件和 CA truststore 挂载。保留完整原 Compose、数据库口令文件、端口、时区、JVM 内存及健康检查。Caddy 路由、LibreChat、Keycloak 和其他平台服务未重启；未修改防火墙、NAT 或其他应用数据库。

## 迁移与数据保留

- 升级前保存 PostgreSQL custom-format dump，在同一 PostgreSQL 17.11 服务的独立验证库实际恢复。
- 副本完成独立 Keycloak changeset，新增 4 张扩展表，changeset 只执行一次；官方 migrations 保持原内容。
- 副本迁移后，39 张卡片的名称、查询、显示类型、可视化配置和归档状态校验与原库一致。
- 最终正式库仍有 2 条用户记录，其中仅 1 个活跃管理员；另一个原有用户处于停用状态。卡片 39 张、仪表板 1 个，没有新增或提升用户权限。
- 初次正式启动因既有明文库新增 `MB_ENCRYPTION_SECRET_KEY` 被原生加密保护拒绝。此前副本未携带完整 SSO 配置，未覆盖该检查；应用已停止后处理。
- 随后先对恢复副本运行原生 `enable-encryption`，用完整 SSO 配置成功启动，再对停写且已备份的正式库执行相同步骤并启动成功。未关闭加密校验或删除原数据。脚本已补充切换前的完整配置及加密标记检查。
- 正式恢复后，再将**切换前最终停写备份**实际恢复到验证库，核对原 schema 尚无 4 张扩展表，用户/卡片/仪表板数量一致。验证库及候选容器随后清理。

## 真实服务器与浏览器验证

| 检查 | 结果与范围 |
| --- | --- |
| 外网与证书 | 以现有 Caddy root CA 校验 HTTPS，外网 health 200 / ok；未使用跳过证书校验的部署设置 |
| 中文与品牌 | 公共配置为 `zh_CN`、站点名“数据看板”；真实浏览器标题和导航已显示定制名称 |
| Keycloak 登录 | 复用原 `oss-metabase` 客户端；真实浏览器访问登录入口后回到 `/portal/data`，既有管理员绑定到同一真实 issuer；数据库确认只绑定用户 1，并存在受跟踪的 SSO 会话 |
| 门户嵌入 | 曾实际显示完整定制工作区与 AI 问数导航；**后续刷新/新页复查出现空白 iframe，稳定性尚未验收**，见下节 |
| 趋势图 | 原 E-commerce Insights 仪表板显示定制强调色与卡片视觉；保留原指标和比较值 |
| 进度条 | 原卡片实测填充比约 `0.271436`，显示 27%，渐变从 `rgb(169,209,126)` 到 `rgb(95,138,50)`；与收入 67,863.4 / 目标 250,000 一致 |
| 实际查询 | 升级就绪后，在示例数据源记录到 10 次查询，10 次无错误、10 次未命中缓存，总返回 108 行；未连接或验收新的外部业务数据源 |
| 安全负向检查 | 无会话访问 Keycloak status 为 401；伪造 backchannel logout token 为 401；工作区响应 `X-Frame-Options: SAMEORIGIN` 和 `frame-ancestors 'self'` |
| AI | 原生 AI 与历史保留，AI 问数导航可见；未配置模型、未接入 Qwen、未执行实际模型问数 |

真实 IdP 的全门户统一退出、有效 backchannel 投递与跨账号切换尚未执行；没有可用的第二个活跃 Metabase 用户用于该项生产验收。原有示例仪表板的查询和显示通过；业务保存、导出及全部后台入口的生产回归未执行。

### 门户刷新空白的未决边界

首次浏览器截图确认门户内完整显示定制工作区。后续复查时，父页面仍渲染数据中心 iframe，src 为同源 `/metabase/?search=true&new_button=true&app_switcher=true`，但子文档停在空 `about:blank`；独立打开同一地址及仪表板仍正常。

浏览器还记录过门户 ServiceWorker 注册的 SSL 证书错误，但**没有证据证明它是 iframe 空白的原因**。本机浏览器同时有人工操作，后续诊断被浏览器控制状态变化打断。当前不把该现象归因为 Metabase、证书或门户代码，也没有据此修改其他应用、绕过浏览器安全提示或扩大 iframe 允许来源。该项需要在稳定可控的浏览器窗口继续复现定位。

## 备份与恢复

服务器受限目录：`/home/uhoo/metabase/backups/custom-20261017-180258`（目录 700）。

- `metabase.dump`：升级前在线一致性备份，已实际恢复验证。
- `metabase-before-switch.dump`：停止正式应用后的最终回退快照，已另行实际恢复并核对原 schema，文件权限 600。
- `metabase-custom-accepted.dump`：升级后的加密应用库备份；保留了对应密钥，但未另行执行该加密备份的完整恢复启动验收。
- 原 `compose.yaml`、原数据库密码文件、原 `oss-metabase` 客户端表示、`custom-sso.env`：仅保存在受限服务器备份中，不进入本地源码或聊天。

长期应用加密密钥保存在服务器 `secrets/custom-sso.env`（600）及上述受限备份中，恢复加密库必须使用同一密钥。不得只替换旧镜像而忽略数据库状态。`bin/uhooai-deploy/rollback.py --restore-before-switch` 可恢复本次切换前应用库、原 Compose 和原 Keycloak 客户端，并先另存回退前数据库；该操作会替换升级后的写入。**未对运行中的正式服务实际执行回退演练。**

## 配置与证据位置

- release：`/home/uhoo/metabase/releases/uhooai-v64-a26b7ad-20261018`，保留 JAR、Dockerfile、脚本、truststore 和无敏感值的 `stage.json`。
- SSO：精确 HTTPS callback `/metabase/auth/keycloak/callback`，现有客户端原 secret 未轮换；默认 PKCE S256，保留 issuer/sub 验证及现有账号权限。
- IdP 后台退出：使用已验证从 Keycloak 所在网络可访问的现有私网应用绑定 `http://192.168.60.30:3000/auth/keycloak/backchannel-logout`，仍严格验签与防重放；未新增外网端口。
- Java truststore：保留官方系统 CA，另导入当前 Caddy root；未关闭 HTTPS 校验。实际登录已验证 JVM 可访问真实 IdP。
- 本地浏览器证据（忽略、不入 Git）：`output/playwright/production-dashboard.png`、`production-portal-home.png`、`production-portal-refresh-blank.png`。
- 源码仓库保持本地管理，未推送远程 Git。旧 v0.63.19 参考仓库未改动。
