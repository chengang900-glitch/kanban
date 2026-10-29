# Setup, Help Links and Chart Terminology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> 当前用户已给出明确实施要求，直接在当前会话执行，不再请求方案批准；不派发子代理。未安装的子技能以现有 Git、测试和构建工具替代。

**Goal:** 在本地 v0.65.2 定制版落实九项 setup、帮助链接和图表对象中文术语定制，交付新 OSS JAR。

**Architecture:** 使用现有 setup 组件与状态管理固定选择和关闭状态；后台初始化关闭匿名采集。通过公共 ExternalLink 隐藏“了解更多”类链接并清理其他链接实现；权限帮助、地图说明保留其余内容。只修改简体中文中作为已保存 chart/card 对象的 question 译文，不做“问题”全局字符串替换。

**Tech Stack:** React、TypeScript、ttag/PO、Clojure、OSS JAR、独立 H2 测试实例。

## Global Constraints

- 起点产品 e134ef6e；旧发布包与分支保留。仅本地工作，不部署服务器、不推送。
- 保持 Keycloak、原生 AI、图表样式、权限/许可、数据库与此前定制。
- setup 姓字段在名前、焦点移至姓；用途固定 self-service-analytics，所有单选项不可改。
- setup 匿名采集说明删除，开关关闭且禁用；客户端状态/提交不能改为开启，后台初始化与新安装默认值为 false。此项锁定覆盖 setup，不改已有实例的管理员设置权限。
- 完成页版本邮件开关关闭且禁用，页面不发订阅请求。
- setup 页脚入门指南隐藏；嵌入管理 Useful links 整段隐藏。
- 隐藏所有“了解更多 / Learn more”类链接，保留必要说明和功能；地图和权限帮助重点验收。
- Question 指已保存图表对象时译为“图表”；提问、故障、疑问、问题反馈等语义保留。
- 测试使用全新独立合成库及无外部订阅/模型调用环境；不继承真实 MB_*。

### Task 1: 位置与术语审查

- [x] 对照三张附件和当前代码定位 setup、权限帮助、地图和嵌入管理。
- [x] 输出所有 Learn more 链接和简体中文 question 词条清单，按对象/普通问句分类。

### Task 2: setup 与链接定制

**Files:** `setup/components/{SetupHelp,UserForm,UsageQuestionStep,DataUsageStep,CompletedStep}/`、`setup/{actions,reducers}.ts`、`src/metabase/setup_rest/api.clj`、`src/metabase/analytics/settings.clj`、公共 ExternalLink、非公共链接位置、EmbeddingHubGetStartedPage。

- [x] 实施固定选择与关闭开关，并更新对应 UI/状态/初始化测试。
- [x] 公共链接按文本/可访问名称隐藏“了解更多”，不隐藏普通导航、法律说明和其他功能链接；单独处理未使用公共组件的位置。
- [x] 隐藏 Useful links 及其两张卡，更新相关测试。

### Task 3: 简体中文对象术语

**Files:** `locales/zh-CN.po`、翻译构建单测及定向中文词条断言。

- [x] 审查 question 词条，修改对象含义的“问题”为“图表”，包括复数、操作提示、权限及嵌入说明；保留占位符、上下文和故障含义。
- [x] 对常用导航/新建/保存/权限、普通问句与错误消息作正反检查。

### Task 4: 构建与验收

- [x] 定向 setup、ExternalLink、地图、权限、嵌入及相关测试；TypeScript、Oxlint、格式和 backend setup/settings/i18n 检查通过。
- [x] 提交产品源码，执行 `./bin/build.sh '{:edition :oss :version "v0.65.2" :steps [:version :translations :frontend :uberjar]}'`；保留原许可证与 Python 构建资源。
- [x] 校验 ZIP、版本/hash、SHA256，保存独立发布包。
- [x] 全新实例浏览器走完 setup，验证姓在前、用途固定、采集/邮件关闭锁定、无入门页脚及提交值；复核地图/权限/嵌入链接和图表术语。
- [x] 停止测试监听、保存截图与交付记录、提交文档、确认 Git 工作区干净。
