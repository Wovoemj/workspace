# 旅行助手项目 (Travel Assistant)

## 项目简介

这是一个基于 Flask + Next.js 的旅行助手应用，提供智能行程规划、目的地推荐、天气查询等功能。集成了 Kimi-2.5 AI 大模型，支持智能对话和知识库问答。

## 项目结构

```
travel-assistant/
├── app.py                    # Flask 后端 API
├── start.py                  # 一键启动脚本（后端 + AI服务 + 前端）
├── init_db.py                # 数据库初始化
├── view_db.py                # 数据库查看/编辑工具
├── instance/
│   └── travel.db             # SQLite 数据库
├── frontend/                 # Next.js 前端应用
│   └── user-web/
├── backend/                  # Go 语言网关服务
│   └── ai-service/           # AI 服务（Kimi-2.5）
├── docs/                     # 项目文档
└── deployment/               # Docker 部署配置
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 后端 | Python Flask, Go |
| 前端 | Next.js, TypeScript, Tailwind CSS |
| AI | Kimi-2.5 (Moonshot AI) |
| 数据库 | SQLite, Redis |
| 部署 | Docker, Nginx |

## 快速开始

### 一键启动（推荐）

```bash
cd d:/travel-assistant
python start.py
```

启动内容：
- Redis 容器（端口 6379）
- AI 服务 - Kimi-2.5（端口 8084）
- 后端服务（端口 5001）
- 前端应用（端口 3000）

### 单独启动各服务

```bash
# 后端
python app.py

# AI 服务（需要设置环境变量）
cd backend/ai-service
set MOONSHOT_API_KEY=your_api_key
go run main.go moonshot_service.go

# 前端
cd frontend/user-web
npm run dev
```

### 手动初始化

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 初始化数据库
python init_db.py
```

## 数据库管理

### 查看数据库

```bash
# 列出所有表
python view_db.py

# 查看指定表（结构 + 数据）
python view_db.py destinations

# 只看表结构
python view_db.py -s destinations

# 查看所有数据
python view_db.py -a destinations

# 搜索数据
python view_db.py -f 故宫

# 导出为 SQL
python view_db.py -e
```

### 编辑数据库

```bash
# 删除记录（自动处理外键）
python view_db.py -d user 5
```

### VS Code 插件

推荐安装 **SQLite3 Editor** 插件，可直接在 VS Code 中编辑 SQLite 数据库：
1. 安装：`ext install yy0931.vscode-sqlite3-editor`
2. 打开 `instance/travel.db` 文件即可浏览和编辑

## AI 服务

### 配置 Kimi API

1. 获取 API Key：https://platform.moonshot.cn
2. 设置环境变量：
   ```bash
   set MOONSHOT_API_KEY=sk-xxxxxxxxxxxxx
   ```
3. 或创建 `backend/ai-service/.env` 文件：
   ```bash
   cp backend/ai-service/.env.example backend/ai-service/.env
   # 编辑 .env 填入 API Key
   ```

### 可用模型

| 模型 | ID | 说明 |
|------|-----|------|
| Kimi 2.5 | `kimi-k2.5` | 推荐，最新最强 |
| Kimi 2.6 | `kimi-k2.6` | 最新版 |
| Kimi 2 | `kimi-k2` | 基础版 |

### AI 功能

- 智能对话（支持流式响应）
- 行程规划建议
- 景点推荐
- 预算估算

## 服务地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:5001 |
| AI 服务 | http://localhost:8084 |
| Redis | localhost:6379 |

## 开发指南

请参考 [docs/GIT_WORKFLOW_GUIDE.md](docs/GIT_WORKFLOW_GUIDE.md) 了解团队协作规范。

## 许可证

MIT License
