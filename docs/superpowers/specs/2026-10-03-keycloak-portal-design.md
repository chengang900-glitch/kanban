# OSS 个人身份登录与 LibreChat 工作区嵌入设计

用户于 2026-10-03 确认执行。源码基线：main / 0f3ecb18873c5d47b5b67eddcc33bd0cccec1d74；分支：customization/v0.63.19-keycloak-portal。

## 目标和边界

将现有 OSS 工作区放进 LibreChat，以每位用户自己的 Metabase 身份使用。复用 OSS 原生权限与会话、AGPL OIDC 基础组件；独立增加 Keycloak 路由。商业行列安全、审计、SDK、自动开户和权限组同步不在范围内。当前定制的品牌、语言、AI 问数和图表保持原有行为。不得接触生产数据库或部署生产。

## 身份和认证

单个固定 Keycloak issuer 和 confidential client。使用 authorization_code + PKCE S256，state/nonce 为安全随机数，事务有效期 10 分钟。加密 HttpOnly/Lax state cookie 保存 nonce 和 verifier；数据库记录 state 哈希并原子消费，跨重启/实例防重放。Discovery issuer 与配置严格一致，端点限制到同一可信 origin 和既有网络策略；禁用 HTTP 重定向跟随，每次校验从可信端点读取 Discovery/JWKS，不共享通用 OIDC 缓存。签名采用 RS256，校验 issuer、audience、azp、exp、iat、nonce、sub 和 sid，不使用邮箱解析用户。

管理员将 issuer + sub 显式绑定到已有活动用户；绑定用 AuthIdentity，provider 为 oss-keycloak、provider_id 为二元身份的 SHA256、metadata 保存 issuer/sub。同一用户只绑定一个身份；有冲突时返回 409，禁止隐式改绑。解除绑定撤销该身份会话。管理员账号仍保留密码认证，不自动修改用户组、is_superuser、邮箱或 sso_source。

## 会话和退出

复用 create-session-with-auth-tracking! 与正常 SESSION cookie，新增持久化 session_id ↔ issuer/sub/sid 关联。有效期上限取 ID token 到期时间；后端检查关联会话到期，登录后到期重新顶层认证，不持有 refresh token 或访问 token。浏览器 cookie 保持原生 Path=/ 和不同应用独立名称；只部署同一 origin 的一个 Metabase 实例。状态 cookie 使用应用路径作用域。

进入门户先比较认证后的 LibreChat issuer/sub 与 Metabase 当前 Keycloak 会话身份；仅两者完全匹配才加载工作区，否则提供顶层 OIDC 入口。成功回调事务内创建新会话并删除当前浏览器旧会话。工作区 API 对已撤销或到期的 OIDC 会话拒绝访问；本地停用走现有 is_active 检查。

退出分为本地退出和门户统一退出：本地工作区退出只删除 Metabase 会话；门户退出先请求 Metabase POST logout 清除本地会话，再执行 LibreChat 退出和 Keycloak RP-Initiated logout。Keycloak Back-channel logout POST 校验签名、issuer/audience、iat、events、jti、无 nonce，并按 sid 或 sub 撤销本客户端会话。保存 jti 哈希防重放。Keycloak 停用时须同时撤销其 SSO sessions；单独改 disabled 不能作为即时撤销验收。到期检查是漏送退出事件的有限时兜底，不宣称立即撤销。

## 页面和路径

门户 /portal/data，代理 /metabase/* 剥离前缀至内部 Metabase，MB_SITE_URL 必须为外部完整 /metabase URL。SSO callback 为 /metabase/auth/keycloak/callback，固定安全 return path 默认 /portal/data；callback 返回可信 site-url origin 加该路径的绝对 URL，避免代理改写成 /metabase/portal/data。框架只在开关启用后使用 frame-ancestors self 和 X-Frame-Options SAMEORIGIN，其余默认安全策略不变。CSP 控制的是整个 origin，无法只许可 /portal/data；同源门户脚本与工作区共享信任边界。默认不放开跨源 CORS，不启用商业 embedding 模式。

LibreChat 独立 DataCenter 页面使用既有导航 URL、useGetStartupConfig 和主题样式。认证未就绪或身份变更时 iframe 先卸载，页面显示重新认证入口；每 30 秒重新校验身份与会话；失效或身份不匹配时卸载工作区并提供用户触发的认证入口。后端每次请求即时检查会话，前端计时器不承担授权；不增加 postMessage 协议。工作区登录页提供顶层 Keycloak 登录按钮，密码恢复入口继续可用。

## 验收

1. 两个显式绑定的普通用户各自登录，权限由原生数据库/集合权限控制，直接 API 无法绕过。
2. 未绑定、同邮箱不同 subject、停用用户不能登录；所有身份和回调输入均负向测试。
3. 回调重放、签名伪造、错误 audience/issuer/nonce、任意回跳和发现文档端点外跳被拒绝。
4. 同源嵌入可用，外部 origin 被拒绝；资源、深链接刷新、查询、保存和导出分别验证。
5. callback/logout/expiry/account switch 不保留旧会话；后台退出事件跨重启可撤销。
6. Clojure 定向测试、lint/模块边界、前端定向回归、类型检查和 OSS 构建通过。真实 Keycloak/LibreChat 验收与本地模拟隔离记录分开。
