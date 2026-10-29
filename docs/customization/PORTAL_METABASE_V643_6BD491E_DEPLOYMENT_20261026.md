# 企业 AI 门户服务器 Metabase v0.64.3 升级记录

## 目标与制品

- 本次目标：`cntracer@122.224.218.82:5922`，主机 `cntracer-pc`，企业 AI 门户 demo 环境。不是 SSH 9622 的 UhooAI 服务器。
- 入口：[http://demo.uhoo.cn:9433/metabase/](http://demo.uhoo.cn:9433/metabase/)。
- 原版本：v0.63.19，镜像 `enterprise-ai/metabase-linux:v0.63.19-keycloak-autobind-50c4b7e4`；其 version.properties 的旧 hash 为 `?`，原镜像 ID 已单独保留。
- 当前版本：**v0.64.3 / 6bd491e**，源码提交 `6bd491ebd0d0a6fe2bf3a1014872173abece0804`。沿用上一任务验证过的同一 JAR，本次没有重编译或额外修改产品源码。
- 制品：715278804 字节；SHA256 `b2605d1d8c04b90c334c0c249d186d22ef6fcb56737be58185b9c9c115ffae61`。本地与服务器均通过 ZIP/版本校验，运行容器内 `/app/metabase.jar` 摘要一致。
- 新镜像 `enterprise-ai/metabase-linux:v0.64.3-6bd491e`；镜像 ID `sha256:bebd1378a1f4ab5bd0b54f8b9529f45eb9a03bcfdb54e5999971f3feab29f965`。基于目标服务器自己的原镜像替换 JAR，保留 Java 25、运行用户和启动命令。
- 切换完成时间：**2026-10-26 00:05:58（北京时间）**。JAR 构建日期仍为 2026-10-25。

## 部署边界与数据保护

- 部署目录 `/home/cntracer/metabase-linux`；完整 Compose 为 `docker-compose.yml`，服务名 `app`、容器名 `metabase-linux`。
- 发布目录 `/home/cntracer/metabase-linux/releases/v0.64.3-6bd491e-20261025`（任务开始时创建，目录日期不代表正式切换日期）。
- 应用库 `metabase_linux`，角色 `metabase_linux`，使用既有共享 PostgreSQL **17.6** 容器 `enterprise-ai-platform-postgres-1`；未升级或重建 PostgreSQL。
- 原 HTTP 地址、Keycloak issuer/client/门户回跳、原加密密钥、环境配置、运行用户/命令、端口、网络、挂载及资源/安全限制保持。
- 完整运行配置摘要 `7a9b5d10a7ef33898bc7598775566eec791317ecdd29abd3f449488847f71917` 在切换前后相同；没有迁入 UhooAI 服务器的环境配置或数据。
- 只替换完整 Compose 的 Metabase 镜像行，以 `--no-deps --no-build --pull never` 重建该服务；**44 个其他容器 ID 保持一致**。
- 原 Dockerfile 从部署根目录 `metabase.jar` 构建，已在备份后原子同步该持久化 JAR 至相同 SHA256，防止以后重新构建时回到旧版。Dockerfile 本身未改动。

## 备份和迁移验证

备份目录：`/home/cntracer/metabase-linux/backups/v643-6bd491e-20261025-160410`，权限 700，敏感运行配置仅留在服务器受保护目录，未写入本地 Git。

保留的材料包括：原 `docker-compose.yml`、`.env`、受保护的原运行配置、原 JAR、原 Dockerfile，以及 `before.dump` 和正式停写后的 `before-switch.dump`。旧镜像 ID `sha256:2f281192a22be2e3ae0e84b7b9766476011331ff1d730675c7b1b95ef0e5a4c3` 保留。

先恢复 `before.dump` 至独立数据库 `metabase_verify_6bd491e`，用原密钥运行新版迁移并验证，成功后才切换正式服务。隔离容器只监听 loopback 3311，关闭调度与更新/匿名跟踪，限制 4 GiB 内存；正式服务的资源配置不变。

迁移副本和正式升级前后均为：

| 对象 | 数量/摘要 |
| --- | --- |
| 用户 | 4 |
| 问题 | 116 |
| 仪表板 | 3 |
| 数据源 | 3（PostgreSQL、SQL Server、SQLite 各 1） |
| SSO 绑定 | 3 |
| 问题定义摘要 | `d6ddb61a90c3fae6199b14d0e3bece00` |
| 仪表板参数摘要 | `86baaf065d50bcac3b9ee4e529f919b7` |
| 站点关键设置摘要 | `0f4acc5897c51ae4d1d7017e90983945` |

正式升级完成后，精确使用最终 `before-switch.dump` 再次恢复隔离库，原 v0.63.19 镜像使用原密钥成功启动，数据摘要一致。此后删除了本次临时容器、隔离数据库和候选环境文件。未回退、恢复或删除正式应用库，也未操作其他应用数据库。

## 实际验收

- 服务 running，重启次数 0；新启动日志包含 `Metabase Initialization COMPLETE`，无初始化失败记录。原部署没有 Docker healthcheck，本次保持；应用内网及外网 `/api/health` 为 ok。
- 外网属性接口确认 v0.64.3、6bd491e、中文 `zh_CN` 和 SSO 启用。
- 浏览器原管理员会话保持有效；原“指标数据看板”的销售数量页 **10 张卡片全部加载完成**，无卡片错误提示，今天 18 万、本年 4433.44 万等关键显示与升级前一致。
- 服务端记录升级后 **18 次成功且未命中缓存的查询**，共返回 767 行（本次验证时快照）。
- 浏览器实际走 `/auth/keycloak/login`，完成 Keycloak 回跳；新管理员 1 的受跟踪 SSO 会话建立于 **2026-10-26 00:07:00 +08**。
- 匿名 `/auth/keycloak/status` 和无效 backchannel logout token 均返回 401。
- 管理员常规页两处中文文案正确；更新、自定义可视化菜单隐藏；帮助页显示新 hash，获取帮助和报告问题卡片移除。其他定制沿用经过上一任务验证的同一制品。
- 本地证据在忽略目录 `target/demo-v643-6bd491e/` 和 `output/playwright/demo-v643-6bd491e/`。部署脚本 `bin/portal-deploy/upgrade-v643-6bd491e.py` 通过 Python 编译检查。

## 既有门户异常与验收边界

**`http://demo.uhoo.cn:9433/portal/data` 在正式升级前已经白屏。** 升级前后浏览器均记录 LibreChat 前端错误 `TypeError: t.replace is not a function`，来源相同的 `/assets/index.HjhgQ-bO.js`。已分别保留 `portal-before.png` 和 `portal-after.png`。

该异常独立于本次 Metabase 切换，LibreChat 容器 ID 和部署均未改变。本次确认 Metabase 独立访问、业务查询和真实 SSO 新会话成功，**不能据此称门户内嵌流程已完整验收**。本次未修复 LibreChat，也未执行跨账号/统一退出或真实模型 AI 问数验收。

## 回退要求

v0.63.19 → v0.64.3 已执行数据库迁移，**不能只切回旧镜像**。如需回退，应先停止 Metabase 写入并另存升级后的库，再协调恢复本次 `before-switch.dump` 到且仅到 `metabase_linux`，恢复原 Compose/环境/密钥与构建 JAR、Dockerfile，使用原镜像启动，然后复查版本、登录和业务看板。

恢复旧快照会替换升级后的新增写入，实际回退需单独确认。上述恢复和旧镜像启动演练仅在本次隔离库完成；正式库目前保持 v0.64.3 运行。
