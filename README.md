# Moments - Cloudflare 版本

基于 Cloudflare Workers + D1 + R2 的极简朋友圈系统，前后端分离架构。

## 🎨 前端选项

 
## 技术栈

### 后端
- **Cloudflare Workers**: 无服务器计算平台
- **D1 Database**: Cloudflare 的 SQLite 数据库
- **R2 Storage**: 对象存储，用于图片和文件
- **Hono**: 轻量级 Web 框架
- **TypeScript**: 类型安全

### 前端
- **Nuxt 3**: Vue 3 框架
- **Nuxt UI**: UI 组件库
- **TypeScript**: 类型安全
- **Cloudflare Pages**: 静态站点托管

## 项目结构

```
moments-cf/
├── backend/          # Workers 后端
│   ├── src/
│   │   ├── handlers/ # API 处理器
│   │   ├── utils/    # 工具函数
│   │   ├── types.ts  # 类型定义
│   │   └── index.ts  # 入口文件
│   ├── schema.sql    # 数据库 schema
│   ├── wrangler.toml # Workers 配置
│   └── package.json
└── frontend/         # Nuxt 前端
    ├── pages/        # 页面
    ├── layouts/      # 布局
    ├── components/   # 组件
    ├── utils/        # 工具函数
    ├── types/        # 类型定义
    ├── nuxt.config.ts
    └── package.json
```

## 部署指南

### 前置要求

1. 安装 [Node.js](https://nodejs.org/) (v18+)
2. 安装 [pnpm](https://pnpm.io/): `npm install -g pnpm`
3. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
4. 安装 Wrangler CLI: `npm install -g wrangler`
5. 登录 Wrangler: `wrangler login`

### 后端部署

#### 1. 创建 D1 数据库

```bash
cd backend
wrangler d1 create moments-db
```

复制输出的 `database_id`，更新 `wrangler.toml` 中的配置：

```toml
[[d1_databases]]
binding = "DB"
database_name = "moments-db"
database_id = "你的-database-id"  # 替换这里
```

#### 2. 初始化数据库

```bash
# 本地测试环境
wrangler d1 execute moments-db --local --file=./schema.sql
```

```bash
# 生产环境
wrangler d1 execute moments-db --remote --file=./schema.sql
```

#### 3. 创建 R2 存储桶

```bash
wrangler r2 bucket create moments-storage
```

#### 4. 配置环境变量

修改 `wrangler.toml`：

```toml
[vars]
JWT_SECRET = "your-secret-key-change-this"  # 改成你的密钥
CORS_ORIGIN = "*" # 根据需要设置前端地址,也可保持通配符
```

如果要启用评论 Turnstile 校验，再配置 Worker Secret：

```bash
cd backend
wrangler secret put TURNSTILE_SECRET_KEY
```

本地开发可写入 `backend/.dev.vars`：

```bash
TURNSTILE_SECRET_KEY=你的-turnstile-secret-key
```

#### 5. 安装依赖并部署

```bash
pnpm install
pnpm run deploy
```

部署成功后，会得到一个 Workers URL，例如：`https://moments-backend.your-subdomain.workers.dev`

### 前端部署

#### 1. 配置 API 地址

创建 `.env` 文件：

```bash
cd frontend
echo "NUXT_PUBLIC_API_BASE=https://moments-backend.your-subdomain.workers.dev" > .env
```

#### 2. 安装依赖

```bash
pnpm install
```

#### 3. 配置评论 Turnstile

部署后台管理后，进入系统设置：

1. 打开“是否启用 Turnstile 评论验证”
2. 填入 Cloudflare Turnstile 的 Site Key
3. 确认后端已经配置 `TURNSTILE_SECRET_KEY`

#### 4. 本地开发测试

```bash
pnpm run dev
```

访问 `http://localhost:3000` 测试

#### 5. 部署到 Cloudflare Pages

**方式一：使用 Wrangler（推荐）**

```bash
pnpm run build
wrangler pages deploy .output/public --project-name=moments-frontend
```

**方式二：使用 Git 集成**

1. 将代码推送到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Pages** → **Create a project**
4. 连接 GitHub 仓库
5. 配置构建设置：
   - 构建命令: `cd frontend && pnpm install && pnpm run build`
   - 构建输出目录: `frontend/.output/public`
   - 环境变量: `NUXT_PUBLIC_API_BASE=你的后端地址`

## 使用指南

### 默认管理员账号

> **注意**: 默认用户名为 `admin`，密码为 `admin123`，请尽快修改密码。

### 发布动态

1. 登录后点击 **发布**
2. 输入内容
3. 可选：上传图片、添加标签
4. 选择可见性（公开/私密）
5. 点击 **发布**

### API 使用

所有 API 都在 `/api` 路径下：

#### 用户相关
- `POST /api/user/login` - 登录
- `POST /api/user/reg` - 注册
- `POST /api/user/profile` - 获取用户信息
- `POST /api/user/saveProfile` - 更新用户信息

#### 动态相关
- `POST /api/memo/list` - 获取动态列表
- `POST /api/memo/save` - 创建/更新动态
- `POST /api/memo/get?id=123` - 获取单个动态
- `POST /api/memo/remove?id=123` - 删除动态
- `POST /api/memo/like?id=123` - 点赞动态

#### 评论相关
- `POST /api/comment/add` - 添加评论
- `POST /api/comment/remove?id=123` - 删除评论

启用 Turnstile 后，匿名评论必须先通过验证；已登录用户默认跳过校验。

#### 文件相关
- `POST /api/file/upload` - 上传文件
- `GET /r2/{key}` - 获取文件

#### 友链相关
- `POST /api/friend/list` - 获取友链列表
- `POST /api/friend/add` - 添加友链
- `POST /api/friend/delete?id=123` - 删除友链

## 本地开发

### 后端开发

```bash
cd backend
pnpm install
pnpm run dev
```

访问 `http://localhost:8787`

### 前端开发

```bash
cd frontend
pnpm install
pnpm run dev
```

访问 `http://localhost:3000`

## 数据库管理

### 查看本地数据库

```bash
cd backend
wrangler d1 execute moments-db --local --command="SELECT * FROM User"
```

### 查看生产数据库

```bash
cd backend
wrangler d1 execute moments-db --remote --command="SELECT * FROM User"
```

### 备份数据库

```bash
# 导出为 SQL
wrangler d1 export moments-db --remote --output=backup.sql
```

## 成本估算

Cloudflare 提供慷慨的免费额度：

- **Workers**: 100,000 次请求/天（免费）
- **D1 Database**: 5GB 存储，每天 500 万次读取（免费）
- **R2 Storage**: 10GB 存储，每月 100 万次 A 类操作（免费）
- **Pages**: 无限请求和带宽（免费）

对于个人博客或小型社区，**完全免费**！

## 功能特性

### ✅ 已实现
- 用户注册/登录
- 发布动态（文字、图片）
- 点赞和评论
- 标签系统
- 公开/私密动态
- 图片上传到 R2
- 响应式设计
- 友链管理
- 豆瓣影片/书籍数据抓取
- 在线音乐解析
- 在线视频解析
- Markdown 支持
- 评论邮件通知
- 匿名评论 Turnstile 防刷

### 🚧 计划中

## 故障排查

### 后端无法访问数据库

检查 `wrangler.toml` 中的 `database_id` 是否正确。

### 图片无法上传

1. 确认 R2 bucket 已创建
2. 检查 `wrangler.toml` 中的 R2 绑定配置

### CORS 错误

在后端 `wrangler.toml` 中设置正确的 `CORS_ORIGIN`：

```toml
[vars]
CORS_ORIGIN = "https://your-frontend.pages.dev"
```

### 前端 API 请求失败

检查 `.env` 文件中的 `NUXT_PUBLIC_API_BASE` 是否指向正确的后端地址。

### 开启 Turnstile 后评论失败

1. 确认系统设置里已开启 Turnstile，并填写正确的 Site Key
2. 确认后端已设置 `TURNSTILE_SECRET_KEY`
3. 确认 Turnstile 域名白名单包含当前站点域名

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT License

## 致谢

本项目基于 [moments](https://github.com/kingwrcy/moments) 原始项目，使用 Cloudflare 技术栈重新实现。
