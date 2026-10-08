# API 参考

Hosted API 默认基址为当前 Link Console 域名。除登录、注册、会话查询、登出和受保护链接解锁外，接口需要 HttpOnly 会话 Cookie，或使用当前用户创建的 `Authorization: Bearer <token>`。请求体使用 JSON；错误统一为 `{ "error": { "code": string, "message": string, "details"?: unknown } }`。

## 认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/hosted/auth/register` | 注册并创建工作区，或使用 `inviteCode` 加入工作区。字段：`name`、`email`、`password`（至少 8 位）、可选 `workspaceName`/`inviteCode`。 |
| `POST` | `/api/hosted/auth/login` | 字段 `email`、`password`；成功后设置会话 Cookie。 |
| `GET` | `/api/hosted/auth/session` | 返回 `{ enabled, session }`。 |
| `POST` | `/api/hosted/auth/logout` | 删除当前会话。 |
| `POST` | `/api/hosted/auth/password` | 修改密码：`currentPassword`、`newPassword`（至少 8 位）。 |
| `GET` | `/api/hosted/auth/tokens` | 列出当前用户的 Token 元数据，不返回 Token 明文。 |
| `POST` | `/api/hosted/auth/tokens` | 创建 Token。body：`name`，可选未来时间 `expiresAt`（ISO 8601），以及可选的调用限制 `serverIds`、`allowedOrigins`、`allowedIps`、`allowedCountries`（见「调用限制」）。明文仅在创建响应中返回一次。 |
| `DELETE` | `/api/hosted/auth/tokens/<tokenId>` | 撤销当前用户自己的 Token。 |

## 服务器

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/hosted/servers?workspaceId=<id>` | 列出工作区服务器；省略 workspaceId 时使用会话中的第一个工作区。 |
| `POST` | `/api/hosted/servers` | 创建服务器：`workspaceId`、`name`、`baseUrl`、`apiKey`。仅 owner/admin。 |
| `PATCH` | `/api/hosted/servers/<serverId>` | 更新 `name`、`baseUrl` 或 `apiKey`。 |
| `DELETE` | `/api/hosted/servers/<serverId>` | 删除服务器。 |
| `POST` | `/api/hosted/servers/test` | 测试未保存服务器（`baseUrl`+`apiKey`）或已保存服务器（`serverId`）。 |

## 邀请与成员

- `GET/POST /api/hosted/invites?workspaceId=<id>`：列出或创建邀请码。创建字段为 `workspaceId`、`role`（`admin|member|viewer`）、可选 `maxUses`、`expiresAt`。完整 code 只在创建响应显示一次。
- `DELETE /api/hosted/invites/<inviteId>`：停用邀请码。
- `GET /api/hosted/members?workspaceId=<id>`：列出成员（owner/admin）。
- `PATCH /api/hosted/members/<memberId>`：修改角色，body `{ "role": "admin|member|viewer" }`。
- `DELETE /api/hosted/members/<memberId>`：移除成员，不能移除自己或最后一个 owner。
- `PATCH /api/hosted/members/<memberId>/password`：管理员重置成员密码，body `{ "password": "..." }`。

## Shlink 代理

`/api/<path...>` 是调用入口，支持 `GET`、`POST`、`PATCH`、`DELETE`，将请求转发到 `/rest/v3/<path>`，并由服务端注入 `X-Api-Key`。**地址里不需要写 serverId** —— 后端由 Token 的绑定决定，取该 Token 绑定的第一个可访问后端；未绑定时取账号下第一个可访问的后端。

```
/api/short-urls              使用 Token 绑定的后端
/api/srv_xxx/short-urls      显式指定某个后端
```

`/api` 是根级捕获路由，但 Next.js 的静态路由优先级更高，`/api/hosted/**` 仍由各自的处理器处理，不经过 Shlink 代理。

常用路径包括 `health`、`short-urls`、`short-urls/<code>`、`short-urls/<code>/visits`、`visits/non-orphan`、`tags` 和 `tags/<tag>/visits`。普通成员只能访问自己可见的短链和统计，workspace admin 可访问全局资源。

### 调用限制

创建 Token 时可以附带下列限制。留空（空数组或省略）表示不限制；所有限制都在服务端校验，不满足返回 `403`。

| 字段 | 说明 |
| --- | --- |
| `serverIds` | 允许访问的后端，支持多选。 |
| `allowedOrigins` | 允许的调用来源。可写完整来源 `https://sub.31n.cc`、主机名 `sub.31n.cc`（含子域），或通配 `*.31n.cc`（仅子域）。 |
| `allowedIps` | 允许的客户端 IP。支持精确匹配与 CIDR，IPv4 与 IPv6 均可，例如 `10.0.0.0/8`、`2001:470::/32`。 |
| `allowedCountries` | 允许的地区，两位国家码，取自 Cloudflare 的 `CF-IPCountry`。 |

客户端来源按 `CF-Connecting-IP` → `X-Real-IP` → `X-Forwarded-For` 的顺序识别。因此该接口应部署在 Cloudflare 或等价的可信反向代理之后，并在 nginx 启用 real_ip 模块，否则 IP 与地区限制会拿不到真实值而一律拒绝。

### Bearer Token 调用

创建 Token 后，第三方程序在请求头中使用：

```http
Authorization: Bearer <token>
```

Token 与浏览器会话使用同一套用户和工作区权限。服务端只保存 Token 哈希；创建响应中的 `token` 只显示一次，丢失后必须重新创建。Token 过期或撤销后返回 `401`。

```bash
curl -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://example.com","domain":"u.31n.cc"}' \
  https://link.31n.cc/api/short-urls
```

创建受保护短链时，在普通 Shlink JSON 外附加：

```json
{
  "longUrl": "https://example.com/target",
  "linkConsole": { "protection": { "password": "at-least-4-chars" } }
}
```

代理会把 Shlink 的 `longUrl` 替换为解锁页地址，并仅在服务端保存加密后的真实目标。

## 受保护链接解锁

`POST /api/hosted/protected-links/unlock` 无需登录，body 为 `{ "token": "...", "password": "..." }`。成功返回 `{ "targetUrl": "https://..." }`；token 不存在返回 404，密码错误返回 401。生产部署应设置 `LINK_CONSOLE_PUBLIC_URL` 以生成正确的公开解锁地址。

## 示例

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"correct horse battery staple"}' \
  https://link.example.com/api/hosted/auth/login

curl -b cookies.txt "https://link.example.com/api/hosted/servers?workspaceId=ws_xxx"
```
