# UhooAI Metabase v0.64.3 升级记录

验收时间：2026-10-24（北京时间）。目标服务器：uhooai，公网 SSH `122.224.218.82:9622`，内网 `192.168.60.30`。

## 版本与定制

- 按用户指定升级至 [官方 v0.64.3](https://github.com/metabase/metabase/releases/tag/v0.64.3)，官方提交 `dc449ac0214ca332a24a605335405db0352d6b5f`。
- 定制合并提交：`0b8b05e7161d09596f655d20e08ccc9d21aa2712`；运行版本 `v0.64.3 / 0b8b05e`。
- 本地分支 `customization/uhooai-v0.64.3`，仓库目录仍为 `metabase-v0.64.2.5`。本次未推送远程 Git。
- 保留中文默认语言、AI 问数导航、Logo/站点品牌、收费引导隐藏、趋势图和进度条样式、OSS Keycloak 单点登录。
- AI 沿用新版原生实现；`src/metabase/metabot` 和 `src/metabase/llm` 与官方 v0.64.3 无差异；未添加 Qwen 适配或旧会话历史补丁。
- 合并冲突仅涉及 SmartScalar 导入，保留定制颜色类型并移除上游已弃用的 `rem` 导入。

## 构建和检查

- 完整 OSS 构建成功：version、translations、frontend、licenses、python、uberjar。
- 前端针对性检查：3 个测试套件、121 个测试通过。
- Keycloak 后端：18 个测试、134 个断言通过，无失败或错误。
- TypeScript 全量检查、`git diff --check`、部署脚本 Python 编译检查通过。
- JAR：`target/uberjar/metabase.jar`，715461370 字节，ZIP 全部 306952 个条目校验通过。
- SHA256：`debe105f0b88f7fed16a0f6722ed03b6a505c45173574afd7beb2ffea24b9104`。
- 本地构建日志及制品元数据在忽略目录 `target/upgrade-v643/`。首次构建因本机磁盘压力与重启中断，清理可重建中间文件后重新构建成功；未部署中断制品。

## 部署与数据保护

- 当前入口：[http://122.224.218.82:9443/metabase/](http://122.224.218.82:9443/metabase/)。HTTP 为升级前实际配置，本次保持。
- 应用目录 `/home/uhoo/metabase`；仅修改现有完整 `compose.yaml` 的应用镜像行。
- 新镜像 `uhooai/metabase:v0.64.3-0b8b05e7`。
- 镜像 ID `sha256:7df04d2d8a8182d26bed7a59b1a367ee8e85c0c76c6c5b919d252481e1ca4fa2`。
- 发布目录 `/home/uhoo/metabase/releases/uhooai-v643-0b8b05e7`。
- 备份目录 `/home/uhoo/metabase/backups/v643-20261023-163658`（目录名按服务器 UTC，权限 700，数据库备份权限 600）。
- 应用于北京时间 2026-10-24 00:41:23 就绪。PostgreSQL 17.11、原数据卷、加密密钥、端口、挂载、JVM 配置及 Keycloak 配置保持原值；未重启其他业务应用。
- 升级前先恢复备份至隔离库并运行新版迁移；正式切换前停止应用写入，另存 `before-switch.dump`。
- 升级前后用户 2、问题 39、仪表板 1；问题定义摘要一致：`07a432e11f74a0c5bc043911f402fc23`。

## 实际验收与边界

- 应用和 PostgreSQL 均 healthy，重启次数均为 0；外部版本接口确认 v0.64.3、0b8b05e、中文默认及 SSO 启用。
- 浏览器版本页显示 0.64.3；原示例仪表板图表加载完成，趋势图和进度条保留定制样式，未见页面错误提示。
- 记录到升级后 10 次未命中缓存的成功查询，共返回 108 行。
- 真实 Keycloak 登录完成，管理员 1 的 SSO 会话记录时间为 2026-10-24 00:43:30 +08。
- 匿名 SSO 状态检查、无效注销令牌均返回 401。
- 最终验收备份 `accepted.dump` 已保存。精确使用 `before-switch.dump` 恢复隔离库，再由旧定制镜像和原密钥启动成功；未对正式库执行回退。
- 临时验证容器、数据库及临时环境文件均已清理，临时数据库数量为 0。
- 浏览器截图在本地忽略目录 `output/playwright/v643-version.png`、`v643-dashboard.png`。
- **既有门户 iframe 空白问题仍存在**：SSO 已建立，但 `/portal/data` 内嵌页面停留空白；本次未修改门户。不能将本次验收视为门户完整验收。
- 未执行跨账号、统一注销全链路或真实模型 AI 问数验收；版本页仍有上游原生版本说明文字。

## 回退方法

旧镜像 `uhooai/metabase:v0.64.2.5-a26b7ad` 和升级前完整配置已保留。必须同时恢复升级前数据库及 Compose，不能仅切换旧镜像。

确需回退时，在服务器以管理员权限执行：

```sh
python3 /home/uhoo/metabase/releases/uhooai-v643-0b8b05e7/upgrade.py rollback --restore-before-switch
```

此操作会先保存 `before-rollback.dump`，再将正式应用库替换为升级前快照，**升级后的新增写入不会保留在回退库中**。执行后仍须复查版本、登录、仪表板及外部入口。本记录仅确认隔离库恢复和旧镜像启动演练通过。
