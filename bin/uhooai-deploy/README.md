# UhooAI 定制版原地升级

这些脚本只适用于已核对的 UhooAI 主机 `uhooai / 192.168.60.30`，安装目录 `/home/uhoo/metabase`，应用库 `metabase`。保留 PostgreSQL 17.11 与原数据卷，不执行 `down -v`。固定 release 为 `uhooai-v64-a26b7ad-20261018`，不适合作为通用安装器或重复执行。

这些是本次操作的固定版本脚本，保留用于审计与恢复。已有状态下不得整套重跑。生产操作证据见 `docs/customization/UHOOAI_V64_DEPLOYMENT.md`。

正确的准备顺序：

1. 将已校验的 JAR、脚本传到 release 目录；`sudo python3 stage.py` 备份 Compose、数据库及数据库密码文件，恢复到专用验证数据库，构建使用现有官方 Java 25 基础镜像的定制镜像，启动仅 loopback 可访问的验证服务。副本关闭 scheduler。
2. 验证副本启动后运行 `sudo python3 configure.py`：保存原 `oss-metabase` 客户端配置，只补充其 backchannel logout URL，沿用原 secret；生成单独的应用加密密钥及 600 权限 env 文件，导入现有 Caddy root CA 到保留系统根证书的 Java truststore，准备完整 Compose。
3. 对已有明文应用库，首次设置 `MB_ENCRYPTION_SECRET_KEY` 前必须先在停止的副本执行原生 `enable-encryption`，随后以完整 SSO 环境启动副本确认可读取。正式库也必须在停写备份之后执行相同加密命令；不得直接只加环境变量重启。
4. `sudo python3 switch.py` 的前置检查已补充副本加密标记，避免在未完成该步骤时停止正式应用。仅更新 Metabase 服务；正式启动后另验外网、真实账号和原仪表板。

本次初次启动触发了原生加密保护，正式应用未通过初始化。当时已保存停写备份；`enable-existing-encryption.py` 用于这一特定恢复状态：副本显式加密并以完整配置成功启动后，才对停止的正式库加密并恢复应用。该脚本要求不存在已加密标记，防止用错误密钥重加密。它不是常规的后续升级步骤。

浏览器 callback 使用精确的 HTTPS `/metabase/auth/keycloak/callback`；backchannel 使用 Keycloak 容器已可访问的私网地址 `http://192.168.60.30:3000/auth/keycloak/backchannel-logout`。该接口严格验证签名、issuer、audience、时效及防重放；不新增监听端口、不关闭 TLS 验证、不改变其他客户端。门户固定回跳 `/portal/data`，仅允许同源 iframe。

数据库密码、SSO secret、应用加密密钥、数据库 dump 及原客户端表示只保存在服务器受限目录，禁止打印或提交。Java truststore 的 `changeit` 只是公共根证书库的完整性密码，不是服务凭据。加密密钥是长期数据恢复依赖，必须随受限备份保留。

## 回退

`stage.json` 记录本次备份目录。`rollback.py --restore-before-switch` 是明确的完整回退入口：先停止应用并另存回退前数据库，然后恢复本次切换前应用库、原 Compose 和原 Keycloak 客户端。**这会替换升级后的数据库写入**，仅在确定需要恢复快照时执行。它不删除 PostgreSQL 卷，也不影响其他应用数据库。

备份曾在隔离库实际恢复，迁移在副本执行；不代表已对正式服务执行回退演练。回退后必须另验健康、版本及外网业务界面。
