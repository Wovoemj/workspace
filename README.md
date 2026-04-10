# Travel Assistant（本地开发）

当前仓库 **可运行** 的部分为：

| 组件 | 路径 | 说明 |
|------|------|------|
| 后端 API | `app.py` | Flask + SQLite（`travel.db`） |
| 用户前端 | `frontend/user-web` | Next.js 14，通过 `rewrites` 代理到后端 `/api/*` |
| 景点图片 | 本地目录 | 由 `GET /api/media?path=scenic_images/...` 提供 |

默认端口：**后端 `5001`**（避免 Windows 上 `5000` 异常占用），**前端 `3000`**（被占用时 Next 会自动换端口）。

- 后端根路径 `http://127.0.0.1:5001/` **默认 302** 到用户前端（`FRONTEND_URL`）；聚合入口页固定为 **`/portal`**。用户前端首页也提供同一组快捷按钮。
- 需要根路径仍显示聚合页时，在后端环境设置 `DISABLE_INDEX_REDIRECT=1`。

---

## 一键启动（Windows）

在项目根目录双击或执行：

```bat
start-dev.bat
```

等价于依次：**安装 Python 依赖 → 导入 `destinations.json` → 新窗口启动后端 → 新窗口启动前端**。

PowerShell：

```powershell
.\start-dev.ps1
```

兼容旧入口：`start.bat` 会转调 `start-dev.bat`。

关闭标题为 `Travel-Assistant-Backend` / `Travel-Assistant-Frontend` 的窗口即可分别停止服务。

---

## 环境变量（换机器必改）

### 1）项目根目录 `.env`

首次运行脚本若不存在 `.env`，会从 **`.env.example`** 复制一份。请至少确认：

| 变量 | 含义 |
|------|------|
| `PORT` | 后端端口，默认 `5001` |
| `SCENIC_IMAGES_ROOT` | 景点图片**磁盘根路径**（内含 `scenic_images/景点名/...`） |
| `DESTINATIONS_JSON_PATH` | `destinations.json` 的绝对路径，供导入脚本使用 |
| `OPENAI_*` | 大模型（`/api/chat`），按需填写 |

`python-dotenv` 会在启动 `app.py` 时加载根目录 `.env`。

### 2）前端 `frontend/user-web/.env.local`

首次运行若不存在，会从 **`frontend/user-web/.env.local.example`** 生成。请保证：

- `NEXT_PUBLIC_API_URL` 与后端 **`http://127.0.0.1:<PORT>`** 一致（默认 `5001`）。

Next 在开发时读取 `.env.local`，与 `next.config.js` 中的 `rewrites` 一起决定 `/api/*` 转发目标。

---

## 手动启动（与脚本等价）

```bat
pip install -r requirements.txt
python scripts\import_destinations_from_json.py
python app.py
```

另开终端：

```bat
cd frontend\user-web
npm install
npm run dev
```

---

## 常用地址

- 健康检查：`http://127.0.0.1:5001/api/health`（端口以 `.env` 中 `PORT` 为准）
- 用户前端：`http://localhost:3000`（以终端输出为准）
- 传统单页管理台（`templates/admin.html`，Ant Design CDN）：`http://127.0.0.1:5001/admin-legacy`（需联网加载 esm.sh）
- 目的地列表：`/destinations`

## API 摘要

- `GET /api/destinations`：`per_page` 最大 `100`
- `GET /api/destinations/<id>`
- `GET /api/media?path=scenic_images/...`
- `POST /api/chat`：OpenAI 兼容协议

---

## 其它说明

历史文档中的微服务、Docker 大规模编排等描述与 **当前本仓库最小可运行栈** 不一致时，以本文与 `app.py`、`frontend/user-web` 为准。