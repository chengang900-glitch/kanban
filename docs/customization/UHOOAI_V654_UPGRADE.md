# UhooAI 数据看板 v0.65.4 升级记录

本次升级以 Metabase OSS [v0.65.4](https://github.com/metabase/metabase/releases/tag/v0.65.4) 为基线。上游提交为 `b18ec8de2133c2aab68fa151a4858cbbcd396327`，定制构建提交为 `e0ecf2c6`。迁移来源为 UhooAI 生产定制版 `v0.65.3 / 42619e6` 及其本地定制分支。

## 定制迁移

- 保留数据看板品牌和登录页、简体中文、将产品对象 Question 译为「图表」、安装向导、管理员菜单和帮助入口定制。
- 保留趋势图配色、进度条、AI 问数入口与提示词界面中文。趋势图合入上游数值截断提示和宽度处理；AI 使用原生服务和会话历史。
- 保留 PostgreSQL、Keycloak 单点登录、身份绑定、用户权限和既有 MCP 配置。Keycloak 的数据库迁移文件与上一版完全一致。
- 全量定制差异、测例入口和维护原则见 [UhooAI 定制与升级说明](UHOOAI_CUSTOMIZATION_UPGRADE_GUIDE.md)。该指南中的 v0.65.3 运行记录对应上一版。

## 构建

用 Java 25、Clojure CLI、Bun 1.3.14 和 uv。发布前先确认 Git 工作区及定制提交，再下载锁定的依赖、进行前端检查，并构建 OSS JAR。

```sh
bun install --frozen-lockfile
bun run build-pure:cljs
bun run type-check-pure
CI=true ./bin/build.sh '{:edition :oss :version "v0.65.4" :steps [:version :translations :frontend :licenses :python :uberjar]}'
```

产物默认在 `target/uberjar/metabase.jar`，发布时另存为 `kanban.jar`，记录 SHA-256，校验 JAR 内部版本、中文资源、Keycloak 迁移与登录页资源。

## 生产切换和恢复

目标仅为 UhooAI 主机的 `/home/uhoo/metabase-linux`，使用原 Compose 的 app 服务、PostgreSQL 库和密钥。先将应用库备份恢复至两个隔离数据库，分别用新镜像演练迁移、用原镜像演练从备份恢复。比对关键对象与身份权限数据。演练通过后停止 app，取得停写快照，替换 app 镜像和部署目录中的 JAR，启动 app 并检查版本、数据库及运行配置。

如需恢复，先保存回退时的数据库状态，按实际写入情况评估回退影响。使用原 Compose、原镜像、原 JAR、原环境和停写快照配套恢复。避免将旧镜像直接指向已经迁移的库。暂存快照上的恢复演练不等同于对生产执行回退。

## 2026-11-18 生产验收

- 正式公网入口：[AI 数据看板](http://122.224.218.82:9443/metabase/)。服务启动完成，公网健康接口正常，运行版本 `v0.65.4 / e0ecf2c`，容器重启次数为 0。
- 15 个前端套件共 192 项通过，TypeScript 检查通过；82 项后端测试、357 条断言通过。上线包为 OSS，核对了包结构、版本、中文资源和 Keycloak 迁移文件。
- 两份隔离恢复均成功，比对了 20 类对象和权限数据。正式切换前后比对通过，保留 119 张图表、3 个仪表板、4 个用户及 3 条 Keycloak 绑定。应用库执行了上游三份迁移文件，共 10 个变更集。运行环境与其余 45 个运行中容器保持一致。
- 在浏览器通过现有 Keycloak 登录进入指标仪表板，数据库确认建立了一条新 Keycloak 会话。打开并刷新已保存图表 84，服务端记录 `v0.65.4` 两次未命中缓存的成功查询。未执行 AI 模型或门户数据分析师的 MCP 业务调用。
- 服务器恢复目录：`/home/uhoo/metabase-linux/backups/v654-20261118T092913Z`。其中保留原 JAR、Compose、运行配置、预演备份和 `before-switch.dump` 停写快照。演练容器、临时库和上传文件已清理。
- 本地发布包：`target/releases/v0.65.4-e0ecf2c6/kanban.jar`，717,017,291 字节。部署包 SHA-256：`f53794bda8e0d05ce97c4c9f04cbca91dd5d4cf9efa3a6f67e8a11d423049559`。离线验收摘要保存在同目录的 `verification.json`。
