# 贡献指南

感谢你考虑参与 Link Console。

## 开发原则

- 不硬编码任何 Shlink 服务地址或 API Key。
- 组件不要直接调用 `fetch`，Shlink 请求统一经过 `src/lib/shlink/client.ts`。
- 不在日志、错误信息、URL 或 UI 中泄露完整 API Key。
- Static Mode 优先保持纯前端可静态部署。
- Hosted Mode 相关改动应保持清晰边界，不影响 Static Mode。
- UI 保持中文优先、安静专业、移动端可用。
- 图表必须来自真实数据；没有数据时展示空状态。

## 提交流程

1. Fork 或创建分支。
2. 安装依赖：`npm install`
3. 启动开发：`npm run dev`
4. 提交前运行：

```bash
npm run typecheck
npm run build
```

## 代码结构

```txt
src/
  app/
  components/
  features/
    auth/
    servers/
    short-urls/
    visits/
    tags/
    settings/
  lib/
    shlink/
    storage/
    config/
    analytics/
  hooks/
  i18n/
  styles/
```

## Shlink API 类型

优先参考 Shlink 官方 API 字段。对版本差异或不确定字段，使用 TODO 说明，不要在业务中做未经验证的假设。
