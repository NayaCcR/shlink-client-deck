# Link Console 文档

Link Console 是 Shlink 的第三方管理面板。它不提供 Shlink 服务本身，所有 Shlink 地址和 API Key 都由部署者或用户配置。

## 文档导航

- [使用指南](./usage.md)：登录、添加 Shlink、短链、统计、权限和数据导入导出。
- [开发指南](./development.md)：本地环境、目录结构、脚本、代码约定和扩展方式。
- [部署指南](./deployment.md)：Static/Hosted 构建、反向代理、环境变量、备份和故障排查。
- [API 参考](./api.md)：Hosted API、认证方式、请求体、响应和 Shlink 代理规则。

## 快速选择

| 场景 | 模式 | 入口 |
| --- | --- | --- |
| 个人浏览器使用、无需账号 | Static Mode | `npm run dev` / `npm run build` |
| 团队账号、权限、服务端保存凭证 | Hosted Mode | `npm run dev:hosted` / `npm run build:hosted` |

## 版本和兼容性

- Node.js `>=20.11`；默认 SQLite 使用 `node:sqlite`，生产建议 Node.js 24+。
- Shlink REST API 默认使用 `/rest/v3`。
- PostgreSQL、MySQL、Redis 是可选驱动，需要在部署环境额外安装对应 npm 包。
