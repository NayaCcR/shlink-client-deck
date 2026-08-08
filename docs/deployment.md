# 部署指南

## Static Mode

构建静态产物：

```bash
npm install
$env:NEXT_PUBLIC_APP_MODE = "static" # PowerShell
npm run build
```

将 `out/` 发布到 Nginx、Vercel、Cloudflare Pages 或其他静态托管。SPA 回退到 `index.html`。Static 与 Hosted 必须是两个部署；`public/config.json` 的 `hostedModeUrl` 只负责跳转。仓库默认配置关闭 Hosted 跳转，部署者应在发布前按自己的域名修改该文件。

`public/config.json` 是浏览器可读取的公开运行时配置，提交到仓库是正常的；不要在其中放 API Key、数据库连接串、密码或任何密钥。每个部署可以直接编辑这个文件后再执行 `npm run build`：

```json
{
  "appName": "Link Console",
  "defaultLocale": "zh-CN",
  "allowStaticMode": true,
  "allowHostedMode": true,
  "hostedModeUrl": "https://your-hosted.example.com",
  "demoServer": null,
  "officialSite": "https://your-site.example.com"
}
```

如果没有单独的 Hosted 部署，请保持 `allowHostedMode: false`、`hostedModeUrl: null`。Static 构建不会读取 Hosted 的服务端密钥；Hosted 的密钥应放在服务器环境变量或未提交的 `link-console.config.json` 中。

## Hosted Mode

```bash
npm install
Copy-Item link-console.config.example.json link-console.config.json
npm run build:hosted
npm run start:hosted
```

宝塔 Node 项目通常会直接读取 `package.json` 的 `start` 脚本。本项目的 `start` 已配置为 Hosted 启动器，因此宝塔可以直接使用：

```bash
npm start
```

它会自动读取项目根目录的 `link-console.config.json`。`scripts/start-hosted.mjs` 默认监听 `31008`；如果宝塔设置了 `PORT` 环境变量，则使用该值覆盖默认端口。`npm run start:hosted` 是同一个启动器的显式别名。

### 配置应用端口

端口不属于 `link-console.config.json` 的 `app.publicUrl`。本项目的 Hosted 启动脚本默认监听 `31008`，因此宝塔无需额外传递端口即可使用：

```bash
npm start
```

Windows PowerShell：

```powershell
$env:PORT = "31008"
npm run start:hosted
```

也可以直接把参数传给 Next.js：

```bash
npm run start:hosted -- -p 31008
```

宝塔中启动命令保持 `npm start`；Nginx 反向代理目标填写 `http://127.0.0.1:31008`。如果需要换端口，再设置 `PORT` 环境变量，例如 `PORT=32000`，并同步修改 Nginx 的 `proxy_pass`。

此时 Nginx 应代理到 `http://127.0.0.1:31008`，而配置文件仍填写用户访问的公网 URL，例如 `"publicUrl": "https://link.31n.cc"`。`publicUrl` 和监听端口互不替代。

生产环境至少设置：

```env
NEXT_PUBLIC_APP_MODE=hosted
AUTH_SECRET=<随机字符串>
SHLINK_CREDENTIAL_ENCRYPTION_KEY=<另一个随机字符串>
LINK_CONSOLE_PUBLIC_URL=https://link.example.com
```

可用 `openssl rand -base64 24` 生成密钥。密钥必须稳定保存；更换加密密钥会导致已保存 API Key 和受保护短链目标无法解密。

## Hosted 完整配置参考

Hosted 启动脚本默认读取项目根目录的 `link-console.config.json`。该文件可以从 `link-console.config.example.json` 复制；示例文件允许使用 `//` 注释（启动脚本会先去除注释）。也可以通过 `LINK_CONSOLE_CONFIG` 或 `--config /绝对路径/config.json` 指定文件。

下面是每个配置字段的完整说明：

```jsonc
{
  "app": {
    "mode": "hosted",
    "publicUrl": "https://link.example.com"
  },
  "security": {
    "authSecret": "使用 openssl rand -base64 24 生成",
    "credentialEncryptionKey": "生成另一个不同的随机值"
  },
  "storage": {
    "driver": "sqlite",
    "storeKey": "default",
    "table": "link_console_store",
    "sqlite": { "path": "hosted-store.sqlite" },
    "databaseUrl": "",
    "redis": {
      "url": "",
      "key": "link-console:hosted-store"
    },
    "legacyJson": {
      "path": "hosted-store.json",
      "importPath": "hosted-store.json"
    }
  },
  "mail": {
    "enabled": false,
    "from": "Link Console <no-reply@example.com>",
    "smtp": {
      "host": "",
      "port": 587,
      "secure": false,
      "user": "",
      "password": ""
    }
  }
}
```

字段行为：

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `app.mode` | 是 | Hosted 应填写 `hosted`。`start:hosted` 会强制使用 Hosted。 |
| `app.publicUrl` | 强烈建议 | Link Console 公网地址，不是 Shlink 地址；用于生成受保护短链解锁 URL。 |
| `security.authSecret` | 生产必需 | 会话 token 哈希密钥。缺省值仅适合开发。 |
| `security.credentialEncryptionKey` | 生产必需 | 加密 Shlink API Key 和受保护短链目标。必须与历史数据保持一致。 |
| `storage.driver` | 否 | `sqlite`、`postgres`/`pgsql`、`mysql`、`redis`、`json`；默认 `sqlite`。 |
| `storage.storeKey` | 否 | 同一数据库中区分不同部署/实例的逻辑键；默认 `default`。多套实例共用表时必须不同。 |
| `storage.table` | 否 | SQLite/PostgreSQL/MySQL 的表名；默认 `link_console_store`，只能使用字母、数字、下划线且不能数字开头。 |
| `storage.sqlite.path` | SQLite 时可选 | 相对路径位于 `.link-console/`，绝对路径按原值使用。 |
| `storage.databaseUrl` | PostgreSQL/MySQL 必需 | 数据库连接串；也可用 `LINK_CONSOLE_DATABASE_URL` 或 `DATABASE_URL`。 |
| `storage.redis.url` | Redis 必需 | Redis URL；也可用 `LINK_CONSOLE_REDIS_URL` 或 `REDIS_URL`。 |
| `storage.redis.key` | Redis 时可选 | 保存整份 Hosted document 的 Redis key，默认 `link-console:hosted-store`。 |
| `storage.legacyJson.path` | `json` 驱动时可选 | JSON 驱动读写路径；默认 `.link-console/hosted-store.json`。 |
| `storage.legacyJson.importPath` | 迁移时可选 | 非 JSON 驱动发现为空时导入一次的旧 JSON 路径；设为空字符串可禁用。 |
| `mail.*` | 否 | 当前版本仅预留，尚无实际发信业务入口；填写不会自动发送邮件。 |

配置文件中的非空值会在启动时映射为环境变量。若直接使用环境变量部署，可省略配置文件；对应变量名称见下表。启动参数 `--config` 只改变配置文件位置，不会改变数据目录。

| 配置字段 | 环境变量 |
| --- | --- |
| `app.publicUrl` | `LINK_CONSOLE_PUBLIC_URL` |
| `security.authSecret` | `AUTH_SECRET` |
| `security.credentialEncryptionKey` | `SHLINK_CREDENTIAL_ENCRYPTION_KEY` |
| `storage.driver` / `storeKey` / `table` | `LINK_CONSOLE_STORE_DRIVER` / `LINK_CONSOLE_STORE_KEY` / `LINK_CONSOLE_STORE_TABLE` |
| `storage.sqlite.path` | `LINK_CONSOLE_SQLITE_PATH` |
| `storage.databaseUrl` | `LINK_CONSOLE_DATABASE_URL` 或 `DATABASE_URL` |
| `storage.redis.url` / `key` | `LINK_CONSOLE_REDIS_URL` / `LINK_CONSOLE_REDIS_KEY` |
| `storage.legacyJson.path` / `importPath` | `LINK_CONSOLE_DATA_PATH` / `LINK_CONSOLE_LEGACY_JSON_IMPORT_PATH` |
| `mail.*` | `LINK_CONSOLE_MAIL_*`（SMTP 字段也支持通用 `SMTP_*`） |

## `link.31n.cc` 面板 + `u.31n.cc` 短链

这两个域名承担不同职责，不要在 `app.publicUrl` 中填写短链域名：

```text
Link Console 面板       https://link.31n.cc
Shlink API/短链服务      https://u.31n.cc
```

Hosted 配置：

```jsonc
{
  "app": {
    "mode": "hosted",
    "publicUrl": "https://link.31n.cc"
  },
  "storage": {
    "driver": "postgres",
    "databaseUrl": "postgresql://shlink:PASSWD@127.0.0.1:5432/shlink"
  }
}
```

启动后登录面板，在“服务器”中新增：

```text
名称：生产 Shlink
API 地址：https://u.31n.cc
API Key：Shlink 生成的密钥
```

如果 Shlink API 实际部署在其他地址（例如 `https://shlink-api.example.com`），这里应填写 API 的实际根地址；短链域名仍在 Shlink 的域名配置中设置为 `u.31n.cc`。DNS、TLS 证书和反向代理也必须同时为两个域名配置。`LINK_CONSOLE_PUBLIC_URL=https://link.31n.cc` 仅影响受保护短链解锁页，不会改变 Shlink 生成的短链域名。

### Nginx upstream 与 `publicUrl`

如果 Nginx 监听 `link.31n.cc`，再把请求转发到本机 `127.0.0.1:31008`，配置文件中的 `publicUrl` 仍然填写公网地址：

```json
{
  "app": {
    "mode": "hosted",
    "publicUrl": "https://link.31n.cc"
  }
}
```

`127.0.0.1:31008` 只应出现在 Nginx 的 `proxy_pass` 中：

```nginx
server {
  listen 443 ssl;
  server_name link.31n.cc;

  location / {
    proxy_pass http://127.0.0.1:31008;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

也可以不在配置文件中写 `app.publicUrl`，改用服务端环境变量 `LINK_CONSOLE_PUBLIC_URL=https://link.31n.cc`。不要将内网地址写入 `publicUrl`，除非该地址确实就是用户访问面板的地址。

## PostgreSQL 示例配置

`driver` 填 `postgres` 或 `pgsql`，`databaseUrl` 填 PostgreSQL 连接串；`table` 和 `storeKey` 可保持默认：

```jsonc
{
  "storage": {
    "driver": "postgres",
    "storeKey": "default",
    "table": "link_console_store",
    "databaseUrl": "postgresql://shlink:PASSWD@127.0.0.1:5432/shlink",
    "legacyJson": {
      "importPath": "hosted-store.json"
    }
  }
}
```

连接串格式是 `postgresql://用户名:密码@主机:端口/数据库名`；`postgres://` 也可用。密码含 `@`、`:`、`/`、`#` 等字符时必须进行 URL 编码。对应环境变量写法：

```env
LINK_CONSOLE_STORE_DRIVER=postgres
LINK_CONSOLE_DATABASE_URL=postgresql://shlink:PASSWD@127.0.0.1:5432/shlink
LINK_CONSOLE_STORE_KEY=default
LINK_CONSOLE_STORE_TABLE=link_console_store
```

部署前安装可选驱动：`npm install pg`。数据库和用户需要提前创建并授予目标数据库的建表/读写权限；应用首次启动会自动创建 `link_console_store` 表及唯一 `store_key` 行，不需要手动建表。若新表为空，应用会从 `storage.legacyJson.importPath`（或 `LINK_CONSOLE_LEGACY_JSON_IMPORT_PATH`）导入旧 JSON 一次。

## 其他存储驱动

- SQLite（默认）：`driver: "sqlite"`，相对 `sqlite.path` 位于 `.link-console/`；无需额外 npm 包。
- MySQL：`driver: "mysql"`、`databaseUrl: "mysql://user:pass@host:3306/link_console"`，安装 `npm install mysql2`。
- Redis：`driver: "redis"`，设置 `redis.url` 和 `redis.key`，安装 `npm install redis`。Redis 保存整份 document，需持久化和高可用策略。
- JSON：`driver: "json"`，适合开发和迁移调试，不建议生产多实例部署。

## Nginx 反向代理

```nginx
server {
  listen 443 ssl;
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

## 备份与排错

备份数据库/Redis、配置文件和两个密钥。启动时报 `requires installing the optional 'pg' package` 时执行 `npm install pg`；时报连接串缺失时检查 `LINK_CONSOLE_DATABASE_URL` 或 `DATABASE_URL`。出现 `Stored Shlink credentials cannot be decrypted` 时优先核对加密密钥是否与写入数据时一致。
