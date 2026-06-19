# Link Console

Link Console 是一个现代化、中文优先、可开源部署的第三方 Shlink 管理面板。它不修改 Shlink 后端，不硬编码任何 Shlink 服务地址，也不硬编码 API Key。

预发布面板域名：<https://link.31n.cc>

注意：`link.31n.cc` 是管理面板自己的域名，不是默认 Shlink API 地址。用户需要自行添加自己的 Shlink 服务，例如 `https://u.31n.cc`、`https://go.example.com`、`https://s.example.org`。

## 项目定位

- 第三方 Shlink Web Client，不替代 Shlink 后端。
- 支持 Static Mode：纯前端静态部署，浏览器直接请求用户配置的 Shlink API。
- 支持 Hosted Mode：注册、登录、工作区、服务端加密保存 Shlink 凭证、后端代理请求。
- 中文优先，同时保留英文界面和 i18n 扩展点。
- 面向开源自部署，不绑定某个固定短链服务。

## 功能

- 多 Shlink 服务器配置与切换。
- 概览仪表盘：服务器状态、短链总数、总访问、今日访问、访问趋势、Top 短链。
- 短链接管理：搜索、分页、标签筛选、创建、编辑、删除、复制、打开、二维码查看与下载。
- 访问统计：单个短链趋势、来源、浏览器、操作系统、国家/地区、小时分布。
- 标签统计：标签下短链数量对比、标签访问量对比、筛选跳转、重命名和删除。
- 设置：主题、语言、数据导入导出、Static / Hosted Mode 说明。
- Recharts 数据可视化，包含加载、空数据、错误状态和明暗主题适配。

## Static Mode

Static Mode 是默认模式，适合个人自用、可信设备和可信网络环境。

- 纯前端，可部署到 Nginx、Vercel、Cloudflare Pages 或任意静态托管。
- 用户首次进入后手动添加服务器名称、Shlink API 地址和 API Key。
- 支持添加多个 Shlink 服务器，并在顶部栏切换当前服务器。
- 配置保存在浏览器本地 `localStorage`。
- 请求直接从浏览器发起到用户配置的 Shlink 服务，并添加 `X-Api-Key` 请求头。
- API Key 只保存在当前浏览器，不上传到 Link Console 或任何后端。
- 导出配置文件会包含 API Key，请像保管密码一样保管它。

## Hosted Mode

Hosted Mode 是可运行的首版后端模式，适合需要账号登录、集中保存凭证、避免浏览器直接接触 Shlink API Key 的自托管场景。

当前已实现：

- 用户注册、登录、退出。
- HttpOnly 会话 Cookie。
- 工作区与成员角色数据结构。
- 多服务器配置。
- 服务端 AES-256-GCM 加密保存 Shlink API Key。
- API Key 只在添加或更新服务器时提交给后端，不会返回给浏览器。
- 后端代理 `/api/hosted/shlink/:serverId/*`，由服务端解密凭证并请求 Shlink。
- 文件存储数据层，默认写入 `.link-console/hosted-store.json`。

当前 Hosted Mode 的数据层适合首版自部署和小团队试用。生产团队环境建议后续迁移到 PostgreSQL、Prisma、Auth.js 和 Redis；相关扩展点已经保留在 `src/lib/hosted`、`src/features/auth` 和 `src/lib/storage`。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Recharts
- lucide-react
- next-themes
- i18next

## 本地开发

```bash
npm install
npm run dev
```

默认访问：<http://localhost:3000>

常用检查：

```bash
npm run typecheck
npm run build
npm run build:hosted
```

## 运行时配置

静态运行时配置位于 `public/config.json`。它用于界面和部署信息，不是 Shlink 服务配置。

```json
{
  "appName": "Link Console",
  "defaultLocale": "zh-CN",
  "allowStaticMode": true,
  "allowHostedMode": false,
  "demoServer": null,
  "officialSite": "https://link.31n.cc"
}
```

字段说明：

- `appName`：应用名称。
- `defaultLocale`：默认语言。
- `allowStaticMode`：是否允许 Static Mode 说明与入口。
- `allowHostedMode`：是否允许展示 Hosted Mode 相关说明。
- `demoServer`：演示服务器占位，默认 `null`。不要放生产 API Key。
- `officialSite`：项目或预发布站点地址。

## 环境变量

Static Mode 默认不需要服务端环境变量：

```env
NEXT_PUBLIC_APP_MODE=static
```

Hosted Mode 示例：

```env
NEXT_PUBLIC_APP_MODE=hosted
AUTH_SECRET=replace-with-a-long-random-value
SHLINK_CREDENTIAL_ENCRYPTION_KEY=replace-with-another-long-random-value
LINK_CONSOLE_DATA_PATH=hosted-store.json
```

可以用下面的命令生成密钥：

```bash
openssl rand -base64 32
```

`AUTH_SECRET` 用于会话 token 哈希，`SHLINK_CREDENTIAL_ENCRYPTION_KEY` 用于 Shlink API Key 加密。生产环境请使用稳定且独立的强随机值；更换加密密钥会导致旧凭证无法解密。

## Static Mode 部署

构建：

```bash
npm install
npm run build
```

静态产物输出到 `out/`。

### Vercel

- Build Command：`npm run build`
- Output Directory：`out`
- Environment Variables：`NEXT_PUBLIC_APP_MODE=static`

### Cloudflare Pages

- Build Command：`npm run build`
- Output Directory：`out`
- Node.js：建议 `20.11+`
- Environment Variables：`NEXT_PUBLIC_APP_MODE=static`

### Nginx

将 `out/` 上传到服务器，例如 `/var/www/link-console`。

```nginx
server {
  listen 80;
  server_name link.example.com;
  root /var/www/link-console;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Hosted Mode 部署

Hosted Mode 需要 Node.js 运行 Next.js 服务端：

```bash
npm install
NEXT_PUBLIC_APP_MODE=hosted npm run build:hosted
NEXT_PUBLIC_APP_MODE=hosted npm run start
```

Windows PowerShell：

```powershell
$env:NEXT_PUBLIC_APP_MODE="hosted"
npm run build:hosted
npm run start
```

默认监听 `3000`，可通过反向代理暴露到正式域名。

### Nginx 反向代理

```nginx
server {
  listen 80;
  server_name link.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Hosted 数据备份

默认文件存储路径是 `.link-console/hosted-store.json`。如果设置了相对路径 `LINK_CONSOLE_DATA_PATH=hosted-store.json`，文件会写在项目工作目录下的 `.link-console/` 内；也可以设置绝对路径。

请备份这个文件和你的加密密钥。文件丢失会丢失账号、工作区和服务器配置；加密密钥丢失会导致已保存的 Shlink API Key 无法解密。

## Shlink API 封装

所有 Shlink 请求都经过统一封装：

- `src/lib/shlink/client.ts`
- `src/lib/shlink/types.ts`
- `src/lib/shlink/errors.ts`

组件中不要直接写 Shlink `fetch`。Static Mode 下 client 使用用户配置的 `server.baseUrl` 和 `server.apiKey`。Hosted Mode 下 client 请求本部署的 `/api/hosted/shlink/:serverId/*`，由后端代理到对应 Shlink 实例。

当前默认使用 Shlink REST API `/rest/v3`。对于 Shlink 版本差异或不确定字段，类型中保留 TODO，不把未知字段写死成业务假设。

## 安全边界

- 不硬编码 Shlink 服务地址。
- 不硬编码 API Key。
- 不在 console 打印 API Key。
- 不把 API Key 放进 URL。
- 不在错误信息里展示 API Key。
- Static Mode 下 API Key 保存在浏览器本地。
- Static Mode 导出配置会包含敏感信息。
- Hosted Mode 下浏览器不会收到已保存的完整 API Key。
- Hosted Mode 下 Shlink 请求由服务端代理并注入 `X-Api-Key`。
- Hosted Mode 生产部署必须妥善保存 `AUTH_SECRET`、`SHLINK_CREDENTIAL_ENCRYPTION_KEY` 和数据文件。

## 贡献

见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

见 [LICENSE](./LICENSE)。
