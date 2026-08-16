# Metabase 升级后定制重施 Checklist

> 当前配套版本：`v0.63.2`。详细背景、状态、边界和计划链接见根目录 `METABASE_CUSTOMIZATION_PLAN.md`。
> 2026-08-03 最终界面规则见 `docs/superpowers/plans/2026-08-03-v0.63.2-final-ui-branding-cleanup.md`；与较早计划冲突时，以最后确认的根目录文档和该文件为准。

## 1. v0.63.2 当前迁移快照

以下勾选项表示已经迁移到当前 v0.63.2 工作区；自动化、构建和本机 Docker 部署证据见总控计划的验证记录。

- [x] BRAND-01 登录页、AppBar、管理员导航使用 `site-name`
- [x] BRAND-02 管理员导航显示白色站点名和“管理中心”
- [x] BRAND-03 删除登录页背景图片
- [x] NAV-01 左侧导航增加“AI问数”
- [x] NAV-02 隐藏新手引导入口
- [x] NAV-04 移除管理员导航中的升级/商店入口
- [x] CLEAN-01 清理确认范围内的后台外部文档链接
- [x] CLEAN-02 清理权限页面外部文档链接
- [x] CLEAN-03 清理数据库帮助、权限试用卡和模型帮助入口
- [x] CLEAN-04 清理升级、试用和 Powered by Metabase 提示
- [x] CLEAN-05 隐藏匿名统计说明但保留开关
- [x] CLEAN-06 删除模型创建页“什么是模型？”入口
- [x] CLEAN-07 商业卡片、钻石图标、试用/升级/套餐推广统一隐藏
- [x] CLEAN-08 下载格式说明不显示“就像在产品中一样”的对比短语
- [x] AI-01 增加 OpenAI Compatible provider
- [x] AI-02 限制新连接时可见的 provider
- [x] AI-03 增加 thinking/tool_choice 一次性有限重试
- [x] AI-04 保留 v0.63.2 上游结构化流式错误
- [x] AI-08 增加 Chat Completions / Responses API 明确选择
- [x] AI-09 重新生成的 Metabot 建议提示词使用简体中文
- [x] BRAND-04 中文产品名为“数据看板”，其他语言为“Dashboard”
- [x] BRAND-04 setup 初始化全流程中文显示“数据看板”，其他语言显示“Dashboard”
- [x] NAV-03 帮助菜单只保留“键盘快捷键”
- [x] NAV-05 隐藏受限、商业、Cloud、许可证和软件版本更新菜单及直达页面
- [x] PROFILE-01 默认 `Chinese (China)`、隐藏社区翻译提示、姓在名前
- [x] AI-05 Metabot 会话身份使用站点名称
- [x] AI-06 中文免责声明
- [x] AI-07 AI助手和AI问数历史会话列表与可续聊恢复
- [x] UI-01 至 UI-06 仪表板和图表视觉迁移（UI-06 最终为配置色浅色到深色渐变）
- [x] UI-08 隐藏仪表板“洞察”，Share 中文统一为“分享”
- [x] UI-09 Treemap 中文名称为“矩形树图”
- [x] OPS-01 至 OPS-03 完整构建、产物和本机 Docker 部署验证
- [ ] OPS-04 至 OPS-05 Windows/PostgreSQL 目标环境验证

## 2. 下一次升级前冻结

- [ ] 记录当前官方版本、定制分支和 commit SHA
- [ ] 确保当前所有定制已经提交，工作区无未记录改动
- [ ] 记录 JAR 文件名、大小、SHA-256 和部署日期
- [ ] 备份 Metabase application database，并验证备份可恢复
- [ ] 备份源码、JAR、Docker、BAT、systemd 或其他服务配置
- [ ] 导出非敏感环境变量名称和值来源
- [ ] 确认数据库密码和 AI API Key 不进入 Git、文档或日志
- [ ] 保存根目录两份总控文件和 `docs/superpowers/plans/`

## 3. 建立新版本基线

- [ ] 从官方 `https://github.com/metabase/metabase.git` 获取目标稳定 tag
- [ ] 建立带 `.git` 的干净 checkout 或 worktree
- [ ] 记录目标 tag 和完整 commit SHA
- [ ] 确认项目要求的 JDK、Node/Bun、Clojure 和构建工具版本
- [ ] 把根目录两份总控文件复制到新版本项目，并把 V 项重置为待研判
- [ ] 不复制旧版编译产物、依赖缓存或 `dist` 作为源码基线

## 4. 新版差异研判

- [ ] 检查新版是否原生支持通用 OpenAI Compatible provider
- [ ] 检查新版是否原生支持 Responses API 和协议选择
- [ ] 检查新版是否原生解决 thinking/tool_choice 兼容问题
- [ ] 检查新版 AI SDK 流式错误格式是否变化
- [ ] 检查新版是否原生支持历史会话列表与恢复
- [ ] 检查新版 conversation/message 是否仍保存 `profile_id`，并可按 `internal`、`nlq` 隔离历史
- [ ] 检查登录、AppBar、AdminNavbar、MainNavbar 组件结构
- [ ] 检查 onboarding、帮助菜单、管理员/数据工作室导航和 provider 选择入口结构
- [ ] 检查后台文档链接、商业提示和 Embedding badge 是否变化
- [ ] 检查 DashCard、SmartScalar、Scalar、Progress DOM/CSS 结构
- [ ] 对每个任务标记“原生替代、需要迁移、待核实、不再适用”

## 5. 品牌、Logo 与导航

- [ ] BRAND-01 登录页显示站点名称
- [ ] BRAND-01 主应用 AppBar 显示站点名称
- [ ] BRAND-01 管理员导航显示站点名称
- [ ] 登录页长站点名可换行
- [ ] 导航长站点名单行截断并有完整 `title`
- [ ] BRAND-02 管理员站点名白色显示
- [ ] BRAND-02 大屏显示“管理中心”
- [ ] BRAND-03 登录页不加载背景图片
- [ ] BRAND-04 中文用户界面产品名统一为“数据看板”
- [ ] BRAND-04 其他语言用户界面产品名统一为“Dashboard”
- [ ] BRAND-04 setup 初始化全流程中文显示“数据看板”，其他语言显示“Dashboard”
- [ ] 登录页标题为“登录”，不显示“登录 Metabase/Dashboard”
- [ ] 前端语言包、后端提示和浏览器标题使用同一品牌规则
- [ ] 技术名词、代码变量、API、数据库字段、文件名、版权、许可证、商标和开发文档未被误替换
- [ ] BRAND-05 不机械替换静态 Logo 文件
- [ ] NAV-01 有 NLQ 和数据权限的用户显示“AI问数”
- [ ] NAV-01 无权限用户不显示“AI问数”
- [ ] “AI问数”路由、选中态、会话重置和导航展开正确
- [ ] NAV-02 不显示 Getting Started、How to use Metabase、Add your data
- [ ] NAV-03 帮助菜单只显示“键盘快捷键”
- [ ] NAV-03 不显示获取帮助、下载诊断信息、关于产品和外部支持入口
- [ ] NAV-05 管理员设置不显示远程同步、软件更新、自定义可视化、外观、许可证、Cloud 和 Google 身份验证
- [ ] NAV-05 更新、Cloud、许可证直达页面不可访问
- [ ] NAV-05 数据工作室不显示内容库、Schema viewer、依赖关系图、依赖项诊断和设置远程同步
- [ ] 管理员导航不显示 Store/Upgrade 入口
- [ ] NAV-04 作为独立任务记录，不再并入其他编号后遗漏

## 6. 帮助链接与商业提示

- [ ] 扫描实际渲染源码中的 Learn more、Learn More、了解更多和 Metabase docs URL
- [ ] CLEAN-01 后台 AI、性能、数据库、设置页面无确认移除的外部文档链接
- [ ] CLEAN-02 权限帮助、迁移说明和旧权限弹窗无确认移除的外部链接
- [ ] 内置说明、警告、安全、法律和操作信息仍保留
- [ ] CLEAN-03 数据库页和数据库表单无帮助推广区域
- [ ] CLEAN-03 权限页无高级权限试用卡
- [ ] CLEAN-04 不显示 Upgrade/Try Metabase Pro 提示
- [ ] CLEAN-04 不显示 Powered by Metabase badge
- [ ] CLEAN-04 不显示钻石图标、免费试用、升级专业版、Metabase Pro/Cloud、购买/查看套餐和专家支持
- [ ] CLEAN-04 不显示软件版本更新菜单、更新通知或推广卡
- [ ] Transform/Python、AI managed provider、缓存、上传、邮箱、身份验证、常规设置和 Embedding 无商业推广
- [ ] Embedding footer 和 SDK 页面无空白占位或高度异常
- [ ] CLEAN-05 匿名统计说明隐藏，标题和开关仍可用
- [ ] CLEAN-06 模型创建页不显示“什么是模型？”
- [ ] CLEAN-07 商业卡片标题、说明、按钮和次要外链全部不渲染
- [ ] CLEAN-08 下载格式说明只保留日期和金额示例
- [ ] 隐藏商业界面时未删除底层功能实现，且页面无空白占位
- [ ] PROFILE-01 默认语言为 `Chinese (China)`，首次登录的新用户同样生效
- [ ] PROFILE-01 所有社区翻译提示均隐藏
- [ ] PROFILE-01 个人资料中“姓”在“名”上方，保存字段映射未交换
- [ ] 源码修改后重新构建前端，不继续使用旧 bundle

## 7. AI 提供商与协议

- [ ] AI-01 OpenAI Compatible 支持 Base URL 和 API Key
- [ ] 支持模型发现和手工模型名
- [ ] 连接验证不提前保存设置
- [ ] 修改模型时保留未修改的凭据
- [ ] 断开时清理数据库设置，环境变量控制的设置不被静默覆盖
- [ ] API Key 不回显、不写入调试日志和文档
- [ ] AI-02 设置页和配置弹窗使用相同 provider 可见策略
- [ ] AI-02 管理员和前台配置页只显示 `OpenAI Compatible`
- [ ] Anthropic、Azure、Bedrock、OpenAI、OpenRouter、Metabase managed provider 均不显示
- [ ] 隐藏 provider 的底层实现没有被误删
- [ ] AI-03 只在 HTTP 400 且错误特征完整匹配时重试
- [ ] AI-03 最多重试一次，并改用 `tool_choice: auto`
- [ ] `invalid tool_call_id`、429 和 5xx 正常透传
- [ ] AI-04 流式错误仍以客户端可识别格式输出
- [ ] AI-08 默认协议为 Chat Completions
- [ ] AI-08 可明确选择 Responses API
- [ ] 不进行协议自动探测或跨协议回退
- [ ] Responses 文本流、工具调用、usage 和终止错误测试通过
- [ ] DeepSeek 或其他目标 provider 的 Responses API 真实调用通过
- [ ] DeepSeek/SenseNova 至少完成一个多轮工具调用场景
- [ ] AI-09 模型和数据模型建议提示词模板均明确要求输出简体中文
- [ ] AI-09 点击重新生成后，建议提示词列表不再生成英文问题

## 8. Metabot 文案与历史会话

- [x] AI-05 提示词中的会话身份使用 `site-name`
- [x] 技术性 Metabase 名称、SQL、API 和链接不受影响
- [x] AI-06 中文免责声明为“内容由AI生成，请复核结果。”
- [x] AI-07 后端 conversation/message 持久化行为确认
- [x] AI-07 会话列表和详情 API 接入
- [x] AI-07 历史会话列表 UI
- [x] AI问数页面显示历史对话入口，支持查看、新建和恢复
- [x] AI助手历史仅查询 `profile-id=internal`
- [x] AI问数历史仅查询 `profile-id=nlq`
- [x] 会话列表和详情接口均执行 `profile-id` 隔离校验
- [x] 选择历史会话后恢复原 conversation ID、messages、history 和 state
- [x] 新建会话生成新 ID
- [ ] 刷新、跨窗口、退出再登录后恢复正确
- [x] 不同用户不能读取彼此会话
- [ ] retention 到期、删除、无权限和恢复失败处理正确

## 9. 仪表板与图表视觉

- [x] UI-01 主应用卡片外壳样式和主应用作用域通过自动化验证
- [x] UI-02 浏览态 Question 卡片透明边框，编辑和拖拽反馈正常
- [x] UI-03 SmartScalar 视觉样式迁移
- [x] UI-04 SmartScalar 使用 `error > success > brand` 语义色
- [x] UI-05 Scalar 数字卡视觉样式迁移
- [ ] Scalar 数值、格式、条件着色、点击和标签未变化
- [x] UI-06 Progress 已完成进度段使用图表配置色派生的浅色到深色渐变胶囊
- [x] UI-06 渐变方向为从左向右 `90deg`，不插入固定蓝色或中间主色节点
- [x] UI-06 未新增固定色值，继续使用 `--progress-chart-light-color` 和 `--progress-chart-dark-color`
- [x] Progress 普通、完成、超额完成和隐藏背景模式正确
- [ ] Progress 计算、目标和交互未变化
- [ ] 使用多个图表配置色人工确认渐变中不再出现固定蓝色
- [x] UI-07 保持回滚状态，不自动恢复 `#F1F0F5`
- [x] UI-08 仪表板信息侧栏不显示“洞察”
- [x] UI-08 中文 Share/份额统一显示为“分享”
- [x] UI-09 中文图表选择器显示“矩形树图”，英文仍为 `Treemap`
- [x] 公开嵌入、静态嵌入和 SDK 嵌入作用域保持原样

## 10. 自动化测试

- [ ] Login、AppBar、AdminNavbar 测试通过
- [ ] MainNavbar 和权限可见性测试通过
- [ ] AnonymousTrackingInput 测试通过
- [ ] 数据库帮助、权限帮助和商业提示测试通过
- [ ] NewModelOptions OSS、Enterprise、Premium 测试通过
- [ ] AIProviderSettingsSection 测试通过
- [ ] OpenAI Compatible 设置、API、adapter 和 provider 路由测试通过
- [ ] Chat Completions 工具调用和有限重试测试通过
- [ ] Responses API 文本、工具、usage、错误测试通过
- [x] AI 会话 API、Redux 和 UI 恢复测试通过
- [x] AI问数历史前端测试通过（2 个测试套件、6 个测试）
- [x] `profile-id` 列表和详情隔离后端定向测试通过（2 个测试、7 个断言）
- [x] Metabot 历史接口完整后端测试通过（14 个测试、42 个断言）
- [x] 仪表板、SmartScalar、Scalar、Progress 测试通过
- [x] UI-06 渐变补充修正的 Progress 定向测试通过（1 个测试套件、2 个测试）
- [x] TypeScript、ESLint、前端格式和 Clojure 格式通过
- [x] `git diff --check` 无错误

## 11. 构建与产物

- [x] 使用当前 Dockerfile 要求的 JDK 25
- [x] 构建前确认磁盘和临时目录空间充足
- [x] 完整前端生产构建成功
- [x] Uberjar 构建成功退出
- [x] 构建镜像中生成并提取 `metabase.jar`
- [x] `unzip -tq metabase.jar` 返回 0
- [x] 2026-08-03 最新 JAR 大小 `662313999` 字节，SHA-256 `ee892f80afcad58cac7134561770f92c3a05b8602c1012146098514ac41f30cf`
- [x] 最新 JAR 内部版本为 `v0.63.2`（commit `9a6cadd`），`unzip -tq` 返回 0
- [x] 不使用因 `Deflater has been closed` 留下的不完整 JAR

## 12. 真实环境回归

- [ ] PostgreSQL application database 配置完整且备份已验证
- [x] 按确认范围删除旧 H2 数据卷，替换版本后进入全新 `/setup` 初始化流程
- [ ] 原用户、数据源、问题、模型和仪表板仍存在
- [ ] 登录页、导航和管理员品牌显示正确
- [ ] 管理后台无计划移除的帮助、升级和品牌提示
- [ ] AI 设置可保存、验证并加载模型
- [ ] Chat Completions 真实问数成功
- [ ] Responses API 真实问数成功
- [ ] AI 工具调用和多轮历史正确
- [ ] AI 历史会话刷新后仍可恢复
- [ ] AI助手历史中不出现AI问数记录，AI问数历史中不出现AI助手记录
- [ ] 浅色、深色、编辑态和嵌入态人工验收
- [x] Docker 启动、`/api/health` 和版本接口验证通过
- [ ] Windows 或其他目标服务管理方式启动验证通过

## 13. 升级收尾

- [ ] 每个主题使用独立 Git commit 或 patch
- [ ] 记录未迁移、原生替代、暂缓和废弃任务的原因
- [x] 更新 `METABASE_CUSTOMIZATION_PLAN.md` 中的状态和新文件路径
- [x] 更新本 Checklist 的当前版本快照
- [x] 保存测试结果、构建日志摘要和 JAR 校验信息
- [x] 写入目标版本、commit SHA 和部署日期
- [ ] 确认工作区无未记录改动

## 14. 外部辅助资产

- [ ] TOOL-01 仅按独立工具资产核对，不纳入 Metabase 产品编译
- [ ] TOOL-02 仅按独立工具资产核对，不纳入 Metabase 产品编译
- [ ] 不以 JAR 或前端 bundle 是否包含 TOOL 项作为迁移完成标准
