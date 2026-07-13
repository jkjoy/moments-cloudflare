# Moments Cloudflare

一个部署在 Cloudflare Workers 上的轻量动态社区。Nuxt 页面、Hono API、D1 数据库和 R2 文件访问由同一个 Worker 提供，不再拆分 Pages 前端与独立后端。

## 架构

```text
浏览器
  |
  +-- 页面与静态资源 ---- Cloudflare Workers Assets (.output/public)
  +-- /api/* ---------- Hono (worker/index.ts) -- D1 / KV
  +-- /r2/* ----------- Hono (worker/index.ts) -- R2
```

所有浏览器请求同源，不需要 API 域名、CORS 代理或 Service Binding。SPA 路由未命中静态文件时回退到 `index.html`。

## 目录

```text
.
├── assets/ components/ composables/ pages/  # Nuxt 应用
├── public/                                  # 静态资源
├── worker/
│   ├── index.ts                             # Worker 与 API 路由入口
│   ├── handlers/                            # 业务处理器
│   ├── utils/                               # 鉴权、缓存等工具
│   └── types.ts                             # Worker 环境类型
├── schema.sql                               # D1 表结构
├── nuxt.config.ts                           # 页面构建配置
├── wrangler.toml                            # Worker、Assets、D1、R2、KV 配置
└── package.json                             # 唯一依赖与命令入口
```

## 本地开发

要求 Node.js 22+。

```bash
npm install
npm run dev
```

`npm run dev` 会初始化本地 D1、生成 Nuxt 静态产物，再由 Wrangler 在 `http://localhost:8787` 同时提供页面和 API。初始化脚本可重复执行，不会覆盖已有数据。页面代码变更后需要重新运行该命令。

本地登录需要 `JWT_SECRET`。复制 `.dev.vars.example` 为 `.dev.vars` 并设置一个随机值；该文件已被 Git 忽略。生产环境仍使用 `npx wrangler secret put JWT_SECRET`，不要复用本地值。

常用命令：

```bash
npm run typecheck       # 检查 Nuxt 与 Worker 类型
npm run build           # 生成 .output/public
npm run deploy          # 构建并部署整个应用
npm run db:init:remote  # 初始化远程 D1
```

## Cloudflare 资源

首次部署前创建资源，并将返回的 ID 或名称填入 `wrangler.toml`：

```bash
npx wrangler login
npm run db:create
npx wrangler r2 bucket create moments-storage
npx wrangler kv namespace create CACHE
```

初始化数据库：

```bash
npm run db:init:remote
```

在 `wrangler.toml` 的 `[vars]` 中设置 `R2_DOMAIN`。留空时文件通过同源 `/r2/*` 由 Worker 代理；填写 `cdn.example.com` 等裸域名时默认使用 HTTPS，`/r2/*` 会重定向到该公开域名。已有文件链接无需迁移。

生产 Secret 通过 Wrangler 或 Cloudflare Dashboard 设置，不要写入仓库：

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
```

可选环境变量包括 `TURNSTILE_SITE_KEY`、`RESEND_FROM_EMAIL`、`CORS_ORIGIN`。实际字段以 [`worker/types.ts`](./worker/types.ts) 为准。

## 部署

本地部署：

```bash
npm run deploy
```

GitHub Actions 使用 [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)，一次完成安装、前后端类型检查、Nuxt 构建和 Worker 部署。仓库需要配置：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

API Token 至少需要 Workers Scripts、D1、R2、KV 的读取及部署所需权限。

## API

接口继续使用同源 `/api/*`，文件读取使用 `/r2/*`，健康检查为：

```http
GET /api/health
```

完整接口说明见 [`API.md`](./API.md)。

## 数据维护

```bash
npx wrangler d1 execute moments-db --local --command="SELECT * FROM User"
npx wrangler d1 execute moments-db --remote --command="SELECT * FROM User"
npx wrangler d1 export moments-db --remote --output=backup.sql
```
