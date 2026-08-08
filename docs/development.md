# 开发指南

## 环境

- Node.js `>=20.11`（默认 SQLite 推荐 24+）
- npm
- 一个可访问的 Shlink 实例和 API Key（联调时使用）

```bash
npm install
npm run dev
```

Hosted 联调：

```bash
cp link-console.config.example.json link-console.config.json
npm run dev:hosted
```

Windows PowerShell 使用 `Copy-Item link-console.config.example.json link-console.config.json`。

## 常用脚本

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | Static/默认 Next.js 开发服务器。 |
| `npm run dev:hosted` | 读取 Hosted 配置并启动开发服务器。 |
| `npm run typecheck` | TypeScript 类型检查。 |
| `npm run build` | 生成 `out/` 静态产物。 |
| `npm run build:hosted` | 构建 Hosted 服务端产物。 |
| `npm start` | 生产启动 Hosted 服务，默认监听 `31008`，适合宝塔等自动读取 `package.json` 启动脚本的面板。 |
| `npm run start:hosted` | 启动已构建的 Hosted 服务，默认监听 `31008`；可用 `PORT` 覆盖。 |

## 目录结构

- `src/app`：Next.js 页面、布局和 API Route Handler。
- `src/features`：按业务域组织的页面、hooks 和状态（短链接、服务器、标签、认证等）。
- `src/lib/shlink`：Shlink client、类型和错误映射。
- `src/lib/hosted`：认证、加密、权限、schema、document store 和持久化 adapter。
- `src/lib/storage`：浏览器端本地存储和加密存储工具。
- `scripts`：Static/Hosted 构建和启动入口。
- `public/config.json`：静态运行时 UI 配置，不存放生产 API Key。

## 扩展规则

组件通过 `src/lib/shlink/client.ts` 访问 Shlink，不要在组件中直接 `fetch`。新增 Hosted API 时复用 `requireHostedSession`、`readJson`、Zod schema 和统一错误响应。涉及权限的操作同时更新 `src/lib/hosted/permissions.ts` 和相应 route。

Hosted 存储是版本化 document store：adapter 只负责读写一份 JSON document，业务逻辑集中在 `store.ts`。新增驱动时实现 `StorePersistence` 的 `read/write`，校验 SQL 标识符，并保留空库从 legacy JSON 自动导入的行为。

## 提交前检查

```bash
npm run typecheck
npm run build
npm run build:hosted
```

修改 API 或权限时，至少手工验证未登录、不同角色、无效请求体、上游 Shlink 错误和空数据响应。
