# UhooAI 管理员页面定制记录

日期：2026-10-25（北京时间）。基于已部署的 v0.64.3 定制版，源码提交 `6bd491ebd0d0a6fe2bf3a1014872173abece0804`。

## 修改范围

| 用户项目 | 实现 |
| --- | --- |
| 1. 设置 → 常规 | 站点名称说明改为“此实例使用的名称。”；更友好的表名和字段名说明将“Metabase”改为“系统”，保留其余说明。 |
| 2. 设置 → 域名 | 移除“了解更多”链接，保留域名、CSP 说明和保存行为。 |
| 3. 设置 → 更新 | 隐藏左侧菜单入口。 |
| 4. 设置 → 本地化 | 去除社区翻译提示整段及 Crowdin 链接，保留语言、时区和格式设置。 |
| 5. 设置 → 自定义可视化 | 隐藏左侧菜单入口及其开发子菜单。 |
| 6. 数据库 | 移除新增连接页“连接需要帮助？”和“需要帮忙吗？帮助在这里”；共享表单仅在 admin/full-page 位置隐藏连接帮助。 |
| 7. 嵌入 | 安全页去除指定 SameSite 说明的“了解更多”；隐藏“主题”菜单。 |
| 8. AI → MCP → 设置 | 去除 MCP 服务器与 Agent API 两个“了解更多”；开关、客户端、来源、URL 和原有功能保持。 |
| 9. 帮助 | 去除“获取帮助”和“报告问题”卡片；保留诊断信息、复制、连接池详情下载。 |

菜单隐藏仅改变导航显示，未删除对应路由或改变权限。后端源码和迁移文件相较原运行提交 `0b8b05e7` 没有修改；现有 AI、Keycloak、品牌和图表定制保留。

## 本地验证

- 8 个管理员相关测试套件通过，共 56 项测试。
- 3 个共享数据库表单套件通过，共 20 项测试，覆盖表单、数据库类型切换及同步配置。
- TypeScript 全量检查、修改文件 ESLint/格式检查、Git 提交钩子和 `git diff --check` 通过。
- 生成后的中文语言包包含本次全部 9 条新增文案。首次构建中发现缺少 PO 源文件引用，已补齐后重新构建；首次制品未部署。
- OSS 构建步骤 version、translations、frontend、uberjar 成功。依赖许可证和 Python 资源沿用上次完整构建结果。
- 制品 `target/uberjar/metabase.jar`：715278804 字节；306895 个 ZIP 条目校验通过。
- SHA256：`b2605d1d8c04b90c334c0c249d186d22ef6fcb56737be58185b9c9c115ffae61`。
- `version.properties`：`v0.64.3 / 6bd491e / 2026-10-25`。
- 本地构建、测试及检查日志保存在忽略目录 `target/admin-ui-20261025/`。

部署脚本：`bin/uhooai-deploy/admin-ui-20261025.py`。脚本限定目标主机与原镜像，校验 JAR、备份完整配置和数据库，仅替换 Compose 镜像行；验证环境配置摘要、挂载、端口、网络、数据对象和迁移摘要一致，以及 PostgreSQL 容器未重建。


## 线上结果

- 服务器 `uhooai`（Ubuntu 22.04.5 / x86_64）；入口 [http://122.224.218.82:9443/metabase/](http://122.224.218.82:9443/metabase/)。协议和地址沿用现有配置。
- 北京时间 **2026-10-25 23:41:20** 完成切换；运行版本 `v0.64.3 / 6bd491e`。
- 新镜像 `uhooai/metabase:v0.64.3-admin-6bd491eb`；镜像 ID `sha256:d8659030d4a394c73bd340fb0bf30f5e91bf47f2a70a76097dfbe225007a7e9e`。
- 发布目录 `/home/uhoo/metabase/releases/admin-ui-20261025`。
- 备份目录 `/home/uhoo/metabase/backups/admin-ui-20261025-153835`，包括原完整 Compose、受保护密钥配置及停止应用写入后生成的 `before-switch.dump`。
- 前后均为 2 个用户、39 个问题、1 个仪表板；问题定义摘要 `07a432e11f74a0c5bc043911f402fc23` 一致。
- 迁移记录摘要 `cfd4e31bdc477248a82dfc114654939e` 一致；未发生数据库 schema 升级。
- 环境配置、挂载、端口和网络的摘要 `c78b0c8180ac4fb92a4a1183b6439d4162a46a243bc687777f4e0c6effb20e1d` 一致；原加密密钥和 SSO 环境保留；PostgreSQL 容器 ID 一致，未被重建。
- Metabase 和 PostgreSQL 均 healthy，重启次数均为 0；新启动日志包含 `Metabase Initialization COMPLETE`，无初始化失败记录。
- 外网 `/api/health` 为 ok；公开属性接口确认新 hash、`zh_CN` 和 Keycloak SSO 启用。

## 浏览器验收

使用已有管理员会话，实际访问并核验 7 个页面，覆盖用户全部 9 项需求。结果保存在 `output/playwright/admin-ui-20261025/checks.json`，所有预期通过：

- 常规：两处中文文案正确；更新、自定义可视化菜单入口数量均为 0。
- 域名：“了解更多”链接数量 0，保存按钮仍在；未修改任何域名或 CSP 值。
- 本地化：社区翻译提示和 Crowdin 链接数量 0，语言设置仍在。
- 数据库新增页：连接帮助和帮助侧栏按钮数量 0，PostgreSQL 表单和保存按钮仍在；未保存测试数据库。
- 嵌入安全：指定文档链接和主题菜单数量 0，SameSite 描述和原选项保留。
- MCP：两个“了解更多”均移除，MCP 仍启用，Agent API 开关及其中文说明保留；未修改开关或来源。
- 帮助：获取帮助、报告问题卡片数量 0，诊断信息和连接池详情均保留；诊断信息显示新 hash。
- 原示例仪表板加载完成，页面标题恢复为 `E-commerce Insights · Dashboard · 数据看板`；趋势 `+19.72% QoQ` 和进度条 27% 正常，无卡片错误提示。

页面截图均保存在同一忽略目录：`general.png`、`domains.png`、`localization.png`、`database.png`、`embedding-security.png`、`mcp.png`、`help.png`、`dashboard.png`。

本次验证现有管理员会话保持有效及 SSO 启用状态，未重做跨账号/统一注销/真实模型调用验收；既有门户 iframe 问题不在本次修改范围。

## 回退

本次前后均为 v0.64.3，后端和迁移摘要不变。若需要撤销此次界面定制，可在服务器以管理员权限恢复本次备份中的完整 Compose 并仅重建应用服务：

```sh
cp -p /home/uhoo/metabase/backups/admin-ui-20261025-153835/compose.yaml /home/uhoo/metabase/compose.yaml
docker compose --ansi never --progress plain -f /home/uhoo/metabase/compose.yaml up -d --no-deps --pull never metabase
```

恢复后应检查 `v0.64.3 / 0b8b05e`、登录和仪表板。本次未实际回退正式服务，也未恢复或删除正式数据库；数据库备份仅供必要时单独恢复使用。
