# 旅行助手项目 (Travel Assistant)

## 项目简介
这是一个基于 Flask + Next.js 的旅行助手应用，提供智能行程规划、目的地推荐、天气查询等功能。

## 项目结构
- `app.py` - Flask 后端API
- `frontend/` - Next.js 前端应用
- `backend/` - Go语言网关服务
- `docs/` - 项目文档

## 技术栈
- 后端: Python Flask, SQLite
- 前端: Next.js, TypeScript, Tailwind CSS
- AI集成: 多模型AI支持（Moonshot AI、GLM-4、OpenAI等）
- 数据库: SQLite, Redis (缓存)
- 部署: Docker, Nginx

## 快速开始
1. 安装依赖: `pip install -r requirements.txt`
2. 初始化数据库: `python init_db.py`
3. 启动后端: `python app.py`
4. 启动前端: `npm run dev` (在frontend目录下)

## Git工作流
请参考 [docs/GIT_WORKFLOW_GUIDE.md](docs/GIT_WORKFLOW_GUIDE.md) 了解团队协作规范。