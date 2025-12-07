# API 文档

## 基础信息

- Base URL: `https://your-worker.workers.dev`
- Content-Type: `application/json`
- 认证方式: Header `X-API-TOKEN`

## 响应格式

所有 API 返回统一格式：

```json
{
  "code": 0,
  "message": "可选的错误消息",
  "data": {}
}
```

错误代码：
- `0`: 成功
- `1`: 失败
- `2`: 参数错误
- `3`: Token 无效
- `4`: Token 缺失

## 用户 API

### 登录

```
POST /api/user/login
```

请求体：
```json
{
  "username": "admin",
  "password": "password123"
}
```

响应：
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGci...",
    "username": "admin",
    "id": 1
  }
}
```

### 注册

```
POST /api/user/reg
```

请求体：
```json
{
  "username": "newuser",
  "password": "password123",
  "repeatPassword": "password123"
}
```

### 获取用户信息

```
POST /api/user/profile
Header: X-API-TOKEN (可选)
```

- 如果带 token，返回当前用户信息
- 如果不带 token，返回管理员（第一个用户）信息

响应：
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "管理员",
    "avatarUrl": "/avatar.webp",
    "slogan": "修道者，逆天而行，注定要一生孤独。",
    "coverUrl": "/cover.webp",
    "email": "admin@example.com"
  }
}
```

### 获取指定用户信息

```
POST /api/user/profile/:username
```

### 更新用户信息

```
POST /api/user/saveProfile
Header: X-API-TOKEN (必需)
```

请求体：
```json
{
  "nickname": "新昵称",
  "avatarUrl": "/avatar.webp",
  "slogan": "新的个性签名",
  "coverUrl": "/cover.webp",
  "email": "new@example.com",
  "password": "new_password"  // 可选，修改密码
}
```

## 动态 (Memo) API

### 获取动态列表

```
POST /api/memo/list
```

请求体：
```json
{
  "page": 1,
  "size": 10,
  "start": "2024-01-01",  // 可选
  "end": "2024-12-31",    // 可选
  "contentContains": "关键词",  // 可选
  "showType": 1,  // 可选，0=私密，1=公开
  "tag": "生活",  // 可选
  "username": "admin",  // 可选
  "userId": 1  // 可选
}
```

响应：
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "content": "今天天气不错",
        "imgs": "/r2/image1.jpg,/r2/image2.jpg",
        "favCount": 5,
        "commentCount": 3,
        "userId": 1,
        "createdAt": "2024-01-01T12:00:00Z",
        "pinned": false,
        "showType": 1,
        "tags": "生活,随笔,",
        "user": {
          "id": 1,
          "username": "admin",
          "nickname": "管理员",
          "avatarUrl": "/avatar.webp"
        },
        "comments": [...]
      }
    ],
    "total": 100,
    "hasNext": true
  }
}
```

### 创建/更新动态

```
POST /api/memo/save
Header: X-API-TOKEN (必需)
```

请求体：
```json
{
  "id": 1,  // 可选，提供则为更新
  "content": "动态内容",
  "imgs": ["/r2/image1.jpg", "/r2/image2.jpg"],
  "tags": ["生活", "随笔"],
  "location": "上海",  // 可选
  "externalUrl": "https://example.com",  // 可选
  "externalTitle": "外部链接标题",  // 可选
  "externalFavicon": "https://example.com/favicon.ico",  // 可选
  "pinned": false,  // 可选
  "showType": 1,  // 0=私密，1=公开
  "createdAt": "2024-01-01T12:00:00Z"  // 可选，自定义时间
}
```

### 获取单个动态

```
POST /api/memo/get?id=1
```

### 删除动态

```
POST /api/memo/remove?id=1
Header: X-API-TOKEN (必需)
```

只有作者本人或管理员可以删除。

### 点赞动态

```
POST /api/memo/like?id=1
```

无需认证，公开接口。

### 置顶动态

```
POST /api/memo/setPinned?id=1
Header: X-API-TOKEN (必需)
```

只有管理员可以操作，会自动取消其他动态的置顶。

## 评论 API

### 添加评论

```
POST /api/comment/add
```

请求体：
```json
{
  "memoId": 1,
  "content": "评论内容",
  "replyTo": "原评论者",  // 可选
  "username": "访客名",  // 可选
  "email": "email@example.com",  // 可选
  "website": "https://example.com"  // 可选
}
```

### 删除评论

```
POST /api/comment/remove?id=1
Header: X-API-TOKEN (必需)
```

只有管理员可以删除评论。

## 文件 API

### 上传文件

```
POST /api/file/upload
Header: X-API-TOKEN (必需)
Content-Type: multipart/form-data
```

表单字段：
- `file`: 文件

响应：
```json
{
  "code": 0,
  "data": {
    "url": "/r2/moments/2024-01-01/xxx.jpg"
  }
}
```

### 获取文件

```
GET /r2/{key}
```

直接返回文件内容，支持浏览器缓存。

## 友链 API

### 获取友链列表

```
POST /api/friend/list
```

响应：
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "朋友的博客",
      "icon": "https://example.com/avatar.jpg",
      "url": "https://example.com",
      "desc": "一个很棒的博客"
    }
  ]
}
```

### 添加友链

```
POST /api/friend/add
Header: X-API-TOKEN (必需)
```

请求体：
```json
{
  "name": "博客名称",
  "icon": "https://example.com/avatar.jpg",  // 可选
  "url": "https://example.com",  // 可选
  "desc": "描述"  // 可选
}
```

### 删除友链

```
POST /api/friend/delete?id=1
Header: X-API-TOKEN (必需)
```

## 前端集成示例

### JavaScript/TypeScript

```typescript
// 登录
const response = await fetch('https://your-worker.workers.dev/api/user/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123'
  })
});

const result = await response.json();
if (result.code === 0) {
  const token = result.data.token;
  localStorage.setItem('token', token);
}

// 带认证的请求
const response = await fetch('https://your-worker.workers.dev/api/memo/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-TOKEN': localStorage.getItem('token')
  },
  body: JSON.stringify({
    content: '这是一条新动态',
    imgs: [],
    showType: 1
  })
});
```

### cURL

```bash
# 登录
curl -X POST https://your-worker.workers.dev/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# 获取动态列表
curl -X POST https://your-worker.workers.dev/api/memo/list \
  -H "Content-Type: application/json" \
  -d '{"page":1,"size":10}'

# 创建动态（需要 token）
curl -X POST https://your-worker.workers.dev/api/memo/save \
  -H "Content-Type: application/json" \
  -H "X-API-TOKEN: your-token-here" \
  -d '{"content":"新动态","imgs":[],"showType":1}'
```

## 限流说明

Cloudflare Workers 免费版限制：
- 每天 100,000 次请求
- 每次请求最多 10ms CPU 时间
- 每次请求最多 128MB 内存

对于个人使用完全足够。如需更高限额，可升级到付费版。
