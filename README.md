# Moments · Cloudflare 版

> 基于 **Cloudflare Workers + D1 + R2 + Pages** 的极简朋友圈 / 说说系统，前后端分离，可一键部署到 Cloudflare 免费额度内运行。

本项目是 [kingwrcy/moments](https://github.com/kingwrcy/moments) 的 Cloudflare 技术栈重构版本：后端用 Hono 运行在 Workers 上，数据存 D1，图片存 R2，前端是 Nuxt 3 静态站点托管在 Pages。

---

## ✨ 功能特性

- 📝 **发布动态**：文字、图片、标签、地理位置、外部链接
- 🔒 **可见性控制**：公开 / 私密，支持置顶
- ❤️ **互动**：点赞、评论（支持匿名评论与回复）
- 🛡️ **评论防刷**：可选 Cloudflare Turnstile 人机校验
- 📧 **邮件通知**：基于 [Resend](https://resend.com/) 的新评论通知
- 🏷️ **标签系统**：按标签筛选动态
- 🔗 **友情链接**：友链管理
- 🎬 **豆瓣抓取**：自动获取豆瓣影片 / 书籍信息
- 🎵 **多媒体**：网易云音乐解析、Bilibili 视频解析
- ✍️ **Markdown**：内容支持 Markdown，并用 Shiki 做代码高亮
- 📅 **日历视图**：按时间浏览动态
- 🌗 **深色模式**：跟随系统 / 手动切换
- ⚙️ **后台设置**：站点标题、图标、自定义 CSS/JS、注册开关、评论开关等
- 📱 **响应式设计**：移动端与桌面端自适应

---

## 🏗️ 架构概览

前端不直接通过域名访问后端，而是借助 **Cloudflare Pages Functions + Service Binding** 把请求转发给后端 Worker。浏览器始终请求同源路径，天然规避了跨域问题。

```
浏览器
  │   请求同源 /api/*、/r2/*
  ▼
Cloudflare Pages  (moments-cloudflare)
  │   Pages Functions 经 Service Binding「BACKEND」转发
  ▼
Cloudflare Worker (moments-backend)  ── Hono
  ├── D1  Database (moments-db)        结构化数据：用户 / 动态 / 评论 / 友链 / 配置
  └── R2  Storage  (moments-storage)   对象存储：图片与文件
```

- 代理函数：[`frontend/functions/api/[[path]].ts`](./frontend/functions/api/%5B%5Bpath%5D%5D.ts)、[`frontend/functions/r2/[[path]].ts`](./frontend/functions/r2/%5B%5Bpath%5D%5D.ts)
- Service Binding 声明：[`frontend/wrangler.toml`](./frontend/wrangler.toml)（绑定名 `BACKEND` → `moments-backend`）

---

## 🧰 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | Cloudflare Workers · [Hono](https://hono.dev/) 4 · D1 (SQLite) · R2 · TypeScript · bcryptjs · Resend |
| 前端 | [Nuxt 3](https://nuxt.com/)（SPA / 静态）· [Nuxt UI](https://ui.nuxt.com/) · markdown-it + Shiki · Fancyapps UI · v-calendar · APlayer/Meting · TypeScript |
| 托管 | Cloudflare Pages（前端）· Cloudflare Workers（后端） |

---

## 📁 项目结构

```
moments-cloudflare/
├── backend/                    # Cloudflare Workers 后端（API）
│   ├── src/
│   │   ├── handlers/           # 业务处理器：user/memo/comment/file/friend/tag/douban/sysConfig
│   │   ├── utils/              # 工具：jwt/bcrypt/db-wrapper/email/turnstile/response/sysConfig
│   │   ├── types.ts            # 类型定义
│   │   └── index.ts            # Hono 路由入口
│   ├── schema.sql              # D1 表结构 + 默认管理员
│   ├── wrangler.toml           # Worker 配置（D1 / R2 绑定）
│   └── package.json
├── frontend/                   # Nuxt 3 前端（部署到 Pages）
│   ├── pages/                  # 路由页面
│   ├── components/             # 组件
│   ├── composables/            # 组合式函数（useApi / useUserStore ...）
│   ├── functions/              # Pages Functions 代理
│   │   ├── api/[[path]].ts      #   /api/* → BACKEND Worker
│   │   └── r2/[[path]].ts       #   /r2/*  → BACKEND Worker
│   ├── nuxt.config.ts
│   ├── wrangler.toml           # Pages 配置 + BACKEND Service Binding
│   └── package.json
├── .github/workflows/          # GitHub Actions 自动部署
├── API.md                      # 完整 API 文档
└── README.md
```

---

## 🚀 部署指南

### 前置要求

1. [Node.js](https://nodejs.org/) v18+
2. [pnpm](https://pnpm.io/)：`npm install -g pnpm`
3. [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
4. Wrangler CLI：`npm install -g wrangler`，并执行 `wrangler login`

### 第一步：部署后端 Worker

```bash
cd backend
pnpm install
```

**1. 创建 D1 数据库**

```bash
wrangler d1 create moments-db
```

把输出的 `database_id` 填入 [`backend/wrangler.toml`](./backend/wrangler.toml)：

```toml
[[d1_databases]]
binding = "DB"
database_name = "moments-db"
database_id = "你的-database-id"   # 替换这里
```

**2. 初始化数据库表结构**

```bash
# 本地开发库
wrangler d1 execute moments-db --local --file=./schema.sql

# 生产库
wrangler d1 execute moments-db --remote --file=./schema.sql
```

**3. 创建 R2 存储桶**

```bash
wrangler r2 bucket create moments-storage
```

**4. 配置环境变量**

在 `backend/wrangler.toml` 中取消注释并修改 `[vars]`：

```toml
[vars]
JWT_SECRET = "请改成你自己的随机密钥"   # 用于签发登录 Token，务必修改
CORS_ORIGIN = "*"                       # 按需收紧到你的前端域名
```

如需开启评论的 Turnstile 校验，再配置 Worker Secret：

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

> 本地开发时也可写入 `backend/.dev.vars`：`TURNSTILE_SECRET_KEY=你的-secret`

**5. 部署**

```bash
pnpm run deploy
```

部署成功后会得到 Worker URL，例如 `https://moments-backend.<你的子域>.workers.dev`。

### 第二步：部署前端 Pages

前端通过 [`frontend/wrangler.toml`](./frontend/wrangler.toml) 中声明的 `BACKEND` Service Binding 调用后端，**无需填写后端域名**。

```bash
cd frontend
pnpm install
pnpm run build

# 在 frontend/ 目录内直接部署构建产物
wrangler pages deploy .output/public --project-name moments-cloudflare
```

> 也可以使用 **Git 集成**：在 Cloudflare Dashboard → **Pages** → **Create a project** 连接仓库后，设置
> - 构建命令：`cd frontend && pnpm install && pnpm run build`
> - 构建输出目录：`frontend/.output/public`

部署完成后，记得在 Pages 项目设置里确认 `BACKEND` Service Binding 指向 `moments-backend`（仓库内 `frontend/wrangler.toml` 已声明，使用 Wrangler 部署会自动带上）。

### 可选：GitHub Actions 自动部署

仓库内置两条工作流，推送到 `main` 时按改动目录自动触发，也支持手动 `workflow_dispatch`：

| 工作流 | 触发条件 | 执行内容 |
| --- | --- | --- |
| [deploy-backend.yml](./.github/workflows/deploy-backend.yml) | `backend/**` 变更 | 在 `backend/` 执行 `npm ci` → `tsc --noEmit` → `wrangler deploy` |
| [deploy-frontend.yml](./.github/workflows/deploy-frontend.yml) | `frontend/**` 变更 | 在 `frontend/` 执行 `npm ci` → `nuxi typecheck` → `build` → `wrangler pages deploy` |

在 **GitHub 仓库 → Settings → Secrets and variables → Actions** 中配置 Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

`CLOUDFLARE_API_TOKEN` 权限建议：

- **最省事**：用 Cloudflare 官方 `Edit Cloudflare Workers` 模板创建 Token，再手动追加 `Account → Cloudflare Pages → Edit`。
- **自定义 Token** 至少包含：
  - `Account → Account Settings → Read`
  - `Account → Workers Scripts → Write`
  - `Account → Workers R2 Storage → Write`
  - `Account → Cloudflare Pages → Edit`
  - `User → User Details → Read`
  - `User → Memberships → Read`
- 资源范围只授权当前项目所在的 Account，不要放开全部账号。

按需追加（当前内置工作流**不**需要）：

- `Account → D1 → Write`：仅当你打算在 CI 中执行 `wrangler d1 create` / `--remote` 迁移时。
- `Zone → Workers Routes → Write`：仅当 Worker 绑定到自定义域名 / Route 时。

> ⚠️ Worker 运行时 Secret（如 `TURNSTILE_SECRET_KEY`）需提前用 `wrangler secret put` 或 Dashboard 配置一次，GitHub Actions 不会自动同步。

参考文档：[Workers GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) · [API token 模板](https://developers.cloudflare.com/fundamentals/api/reference/template/) · [Pages 直传 CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/) · [API token 权限](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)

---

## 💻 本地开发

后端与前端需**同时启动**：前端开发服务器会把 `/api`、`/r2` 等请求代理到本地 Worker（`http://localhost:8787`，见 `nuxt.config.ts` 的 Vite proxy）。

```bash
# 终端 1：后端 Worker → http://localhost:8787
cd backend
pnpm install
pnpm run dev

# 终端 2：前端 Nuxt → http://localhost:3000
cd frontend
pnpm install
pnpm run dev
```

浏览器访问 `http://localhost:3000`。

---

## 📖 使用指南

### 默认管理员账号

| 用户名 | 密码 |
| --- | --- |
| `admin` | `admin123` |

> ⚠️ 首次登录后请立即在「用户设置」中修改密码。

### 发布动态

1. 登录后点击 **发布**
2. 输入内容（支持 Markdown）
3. 可选：上传图片、添加标签、地理位置、外部链接、豆瓣 / 音乐 / 视频
4. 选择可见性（公开 / 私密）
5. 点击 **发布**

### 后台系统设置（管理员）

进入「系统设置」可调整以下配置（持久化在 D1 的 `SysConfig` 表）：

| 配置项 | 说明 |
| --- | --- |
| `title` / `favicon` | 站点标题与图标 |
| `css` / `js` | 自定义 CSS / JS |
| `enableRegister` | 是否开放注册 |
| `enableComment` | 是否开启评论 |
| `enableAutoLoadNextPage` | 列表是否自动加载下一页 |
| `commentOrder` | 评论排序（`asc` / `desc`） |
| `maxCommentLength` | 评论最大字数 |
| `memoMaxHeight` | 动态最大高度（超出折叠，0 不限制） |
| `timeFormat` | 时间显示格式（如 `timeAgo`） |
| `enableTurnstile` / `turnstileSiteKey` | 评论 Turnstile 校验与 Site Key |
| `enableEmail` / `resendApiKey` / `emailFrom` | 新评论邮件通知（Resend） |

> **开启 Turnstile 评论校验**：在系统设置中打开开关并填入 Turnstile **Site Key**，同时确保后端已配置 `TURNSTILE_SECRET_KEY`。开启后匿名评论必须通过校验，已登录用户默认跳过。

---

## 🔌 API 概览

所有接口均为 `POST`（文件读取除外），统一返回 `{ code, message?, data? }`，认证通过请求头 `X-API-TOKEN`（登录返回的 JWT）携带。完整的请求 / 响应字段见 **[API.md](./API.md)**。

| 模块 | 接口 |
| --- | --- |
| **用户** | `/api/user/login` · `/api/user/reg` · `/api/user/profile` · `/api/user/profile/:username` · `/api/user/saveProfile` 🔒 |
| **动态** | `/api/memo/list` · `/api/memo/save` 🔒 · `/api/memo/get?id=` · `/api/memo/remove?id=` 🔒 · `/api/memo/like?id=` · `/api/memo/setPinned?id=` 🔑 · `/api/memo/removeImage` 🔒 · `/api/memo/getFaviconAndTitle` · `/api/memo/getDoubanBookInfo?id=` · `/api/memo/getDoubanMovieInfo?id=` |
| **评论** | `/api/comment/add` · `/api/comment/remove?id=` 🔑 |
| **文件** | `/api/file/upload` 🔒 · `GET /r2/{key}` |
| **友链** | `/api/friend/list` · `/api/friend/add` 🔒 · `/api/friend/delete?id=` 🔒 |
| **配置** | `/api/sysConfig/get` · `/api/sysConfig/getFull` 🔑 · `/api/sysConfig/save` 🔑 |
| **标签** | `/api/tag/list` |
| **健康检查** | `GET /` |

> 🔒 需登录　🔑 仅管理员（用户 `id = 1`）

---

## 🗄️ 数据库管理

```bash
cd backend

# 查询本地库
wrangler d1 execute moments-db --local --command="SELECT * FROM User"

# 查询生产库
wrangler d1 execute moments-db --remote --command="SELECT * FROM User"

# 导出备份
wrangler d1 export moments-db --remote --output=backup.sql
```

数据表：`User` · `Memo` · `Comment` · `Friend` · `SysConfig`（结构见 [`schema.sql`](./backend/schema.sql)）。

---

## 💰 成本估算

Cloudflare 免费额度对个人博客 / 小型社区通常**完全够用**：

| 服务 | 免费额度 |
| --- | --- |
| Workers | 100,000 次请求 / 天 |
| D1 | 5 GB 存储，500 万次读取 / 天 |
| R2 | 10 GB 存储，100 万次 A 类操作 / 月 |
| Pages | 无限请求与带宽 |

---

## 🛠️ 故障排查

| 现象 | 排查 |
| --- | --- |
| 后端无法访问数据库 | 检查 `backend/wrangler.toml` 中 `database_id` 是否正确，是否已对生产库执行 `schema.sql` |
| 图片无法上传 | 确认已创建 R2 桶 `moments-storage`，且 `backend/wrangler.toml` 的 R2 绑定正确 |
| 前端 API 请求失败 | 检查 Pages 的 `BACKEND` Service Binding（见 [`frontend/wrangler.toml`](./frontend/wrangler.toml)、[`functions/api/[[path]].ts`](./frontend/functions/api/%5B%5Bpath%5D%5D.ts)、[`functions/r2/[[path]].ts`](./frontend/functions/r2/%5B%5Bpath%5D%5D.ts)） |
| 开启 Turnstile 后评论失败 | ① 系统设置已开启并填对 Site Key；② 后端已设置 `TURNSTILE_SECRET_KEY`；③ Turnstile 域名白名单包含当前站点 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

## 🙏 致谢

本项目基于 [kingwrcy/moments](https://github.com/kingwrcy/moments) 原始项目，使用 Cloudflare 技术栈重新实现。
