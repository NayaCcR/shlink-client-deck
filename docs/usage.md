# 使用指南

两种模式的操作方式一致，区别只在数据放在哪一侧：

- **Hosted Mode（推荐）**：需要服务端运行。账号、工作区、加密后的 Shlink API Key，以及短链的归属与访问记录都保存在服务端，浏览器不会接触到 API Key。
- **Static Mode**：不需要任何服务端。配置与 API Key 只存在访问者自己的 `localStorage` 里，适合个人自用和可信环境。

## Static Mode

Static Mode 是纯前端模式。首次打开后，在服务器设置中填写名称、Shlink API 地址（例如 `https://go.example.com`）和 API Key，点击测试连接并保存。配置保存在当前浏览器 `localStorage`，可添加多个服务器并在顶部切换。

API Key 不会上传到 Link Console 后端，但导出配置文件会包含 API Key，导出文件应按密码保管。清除浏览器站点数据会删除本地配置。Static Mode 不提供受保护短链，因为浏览器端无法可信地保存真实目标和校验密码。

## 面板域名与短链域名分离

如果希望用户访问面板 `https://link.31n.cc`，而生成的短链接使用 `https://u.31n.cc`，需要分别配置：

1. DNS 将 `link.31n.cc` 指向 Link Console，`u.31n.cc` 指向 Shlink 服务（可以是同一台服务器，但需要由反向代理区分域名）。
2. 在 Shlink 中把 `u.31n.cc` 配置为默认短链域名，并确保该域名的 Web/API 路由可用。
3. 在 Link Console 的“服务器”设置中填写 Shlink API 根地址 `https://u.31n.cc`（不要填写 `/rest/v3`），再填写 Shlink API Key。
4. 创建短链时将“域名”留空使用 Shlink 默认域名；也可以填写 `u.31n.cc` 显式指定。最终 URL 应由 Shlink 返回为 `https://u.31n.cc/<短码>`。

Hosted Mode 的配置文件仍然使用面板地址：

```jsonc
{
  "app": {
    "mode": "hosted",
    "publicUrl": "https://link.31n.cc"
  }
}
```

`publicUrl` 不是 `u.31n.cc`，它只用于 Link Console 自身页面以及受保护短链的解锁地址。

## Hosted Mode

Hosted Mode 需要服务端运行。注册时可以创建工作区，也可以使用 owner/admin 生成的邀请码加入已有工作区。登录后：

1. 在服务器页面添加 Shlink 地址和 API Key。服务端只返回脱敏预览，完整 API Key 以 AES-256-GCM 加密保存。
2. 在短链接页面创建、编辑、删除、复制和查看二维码。Hosted API 会代理请求，不把 API Key 发回浏览器。
3. 创建短链时可填写保护密码。访问者会先打开 `/r?token=...` 解锁页，验证成功后跳转到真实目标。
4. 在设置中管理邀请码、成员角色和当前账号密码。

## 角色

| 角色 | 能力 |
| --- | --- |
| `owner` | 管理服务器、邀请、成员和管理员；查看工作区全部短链及统计。 |
| `admin` | 管理服务器、邀请 member/viewer 和成员；查看工作区全部短链及统计。 |
| `member` | 创建短链；只能查看和管理自己拥有的记录。 |
| `viewer` | 只读预留角色，不能创建或管理短链。 |

通过 CLI 或其他客户端创建的历史短链没有 Link Console 归属记录，普通成员默认不可见，管理员仍可查看。

## 数据导入导出

Static Mode 的设置页可以导出/导入 JSON。导出内容包含 API Key，仅在可信设备之间传输。Hosted Mode 的账号、工作区、服务器元数据和受保护短链记录由服务端存储；迁移前同时备份数据库（或 JSON/Redis 内容）以及 `AUTH_SECRET`、`SHLINK_CREDENTIAL_ENCRYPTION_KEY`。

## 常见问题

### Shlink 地址怎么填？

填写 Shlink 实例的根地址，不要附加 `/rest/v3`，例如 `https://go.example.com`。面板会自动请求 `/rest/v3/...`。

### 受保护短链打开后跳到 localhost？

在反向代理后的 Hosted 服务设置 `LINK_CONSOLE_PUBLIC_URL=https://link.example.com`。否则服务端可能根据请求头推断出内网地址。
