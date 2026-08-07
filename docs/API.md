# API 文档

FlexiKit RESTful API 文档，所有接口前缀为 `/api`。

## 通用说明

### 基础 URL
- 开发环境：`http://localhost:3000`
- 生产环境：`https://yourdomain.com/api`

### 认证方式
除了特别说明的公开接口，其他接口需要在 Header 中携带 JWT Token：
```
Authorization: Bearer <your_access_token>
```

### 响应格式
```json
{
  "items": [...],
  "total": 100
}
```

### 错误响应
```json
{
  "statusCode": 400,
  "message": "错误信息",
  "error": "Bad Request"
}
```

### 通用状态码
- `200 OK`：请求成功
- `201 Created`：创建成功
- `400 Bad Request`：请求参数错误
- `401 Unauthorized`：未认证或Token过期
- `403 Forbidden`：无权限
- `404 Not Found`：资源不存在
- `500 Internal Server Error`：服务器错误

---

## 认证接口

### POST /auth/register
用户注册

**请求体**：
```json
{
  "username": "string (3-20位字母数字下划线)",
  "email": "string (邮箱格式)",
  "password": "string (6-32位)",
  "displayName": "string (可选，显示名称)"
}
```

**响应**：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /auth/login
用户登录

**请求体**：
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 用户接口

### GET /users/profile
获取当前用户信息（需要认证）

**响应**：
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "displayName": "测试用户",
  "avatar": "😀",
  "avatarType": "emoji",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

### PATCH /users/profile
更新用户资料（需要认证）

**请求体**：
```json
{
  "displayName": "新名称",
  "avatar": "data:image/png;base64,...",
  "avatarType": "upload"
}
```

---

## 工具接口

### GET /tools
获取工具列表（可选认证）

**查询参数**：
- `category`: 分类名称
- `search`: 搜索关键词
- `favorite`: 是否只看收藏（true/false，需要认证）
- `limit`: 每页数量，默认50
- `offset`: 偏移量，默认0

**响应**：
```json
{
  "items": [
    {
      "id": 1,
      "name": "工具名称",
      "url": "https://example.com",
      "description": "工具描述",
      "category": "效率工具",
      "tags": ["标签1", "标签2"],
      "icon": "https://...",
      "is_custom": false,
      "local_path": null,
      "view_count": 100,
      "click_count": 50,
      "favorite_count": 10,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 100
}
```

### POST /tools
创建自定义工具（需要认证）

**请求体**：
```json
{
  "name": "我的工具",
  "url": "https://example.com",
  "description": "工具描述",
  "category": "效率工具",
  "tags": ["标签"],
  "icon": "https://...",
  "local_path": "C:\\path\\to\\exe"
}
```

### GET /tools/:id
获取单个工具详情

### PATCH /tools/:id
更新工具（需要认证，只能更新自己的工具）

### DELETE /tools/:id
删除工具（需要认证，只能删除自己的工具）

### POST /tools/:id/open
打开工具（需要认证）
- 本地工具会在服务器上打开（仅桌面部署使用）
- 网页工具返回URL

### GET /tools/favicon
获取网站favicon（公开接口）

**查询参数**：
- `url`: 网站URL

**响应**：图片二进制流

### GET /tools/local-icon
获取本地文件图标（需要认证）

**查询参数**：
- `path`: 本地文件路径

**响应**：
```json
{
  "icon": "data:image/png;base64,..."
}
```

### GET /tools/recommend-tags
智能推荐标签（公开接口）

**查询参数**：
- `name`: 工具名称
- `url`: 工具URL
- `description`: 工具描述

**响应**：
```json
{
  "tags": ["效率", "开发", "工具"]
}
```

### GET /tools/rankings
获取工具排行榜

**查询参数**：
- `period`: today/week/month/all
- `limit`: 返回数量，默认10

---

## 分类接口

### GET /categories
获取所有分类（公开接口）

**响应**：
```json
[
  { "id": 1, "name": "效率工具", "count": 20 },
  { "id": 2, "name": "开发工具", "count": 30 }
]
```

---

## 收藏接口

### GET /favorites
获取收藏列表（需要认证）

**响应**：
```json
[1, 2, 3] // 收藏的工具ID数组
```

### POST /favorites/:toolId
添加收藏（需要认证）

### DELETE /favorites/:toolId
取消收藏（需要认证）

---

## 发现接口

### GET /discovery
获取发现页工具列表（公开接口）

**查询参数**：
- `source`: 来源平台（v2ex/appinn/producthunt等）
- `category`: 分类
- `search`: 搜索关键词
- `sort`: hot/new/upvotes，默认hot
- `limit`: 每页数量，默认20
- `offset`: 偏移量

### GET /discovery/recommendations
获取推荐工具（公开接口）

**查询参数**：
- `limit`: 返回数量，默认6
- `source`: 来源平台

### GET /discovery/rankings
获取发现排行榜（公开接口）

**查询参数**：
- `period`: today/week/month/all
- `limit`: 返回数量，默认10
- `source`: 来源平台

### GET /discovery/latest
获取最新发现（公开接口）

### GET /discovery/sources
获取所有来源平台及数量（公开接口）

**响应**：
```json
[
  { "source": "v2ex", "count": 50 },
  { "source": "appinn", "count": 80 }
]
```

---

## 爬虫接口（管理员）

### POST /crawler/run/:source
手动触发指定爬虫

**source可选值**：
- `v2ex`
- `appinn`
- `iplaysoft`
- `producthunt`
- `juejin`
- `sspai`
- `apprcn`
- `ifanr`
- `36kr`
- `oschina`
- `all`（运行所有爬虫）

**响应**：
```json
{
  "success": true,
  "count": 10
}
```

---

## 统计接口

### GET /stats/overview
获取概览统计（需要认证）

**响应**：
```json
{
  "totalTools": 100,
  "customTools": 20,
  "favorites": 15,
  "categories": 10
}
```
