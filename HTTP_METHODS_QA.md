# 完整 HTTP 知识手册（项目全景解析）

> **特别说明**：HTTP 方法（GET/POST/PUT/DELETE）只是 HTTP 协议中最基本的部分。本项目还涉及大量其他 HTTP 知识，远不止"4 个功能"。以下按功能模块逐一讲解，全部基于项目真实代码。

---

## 一、项目完整功能总览

| 序号 | 功能模块 | 说明 | 代码行数 |
|------|---------|------|----------|
| 1 | HTTP 方法 | GET/POST/PUT/DELETE/OPTIONS | ~52个接口 |
| 2 | 数据库事务 | commit/rollback/flush | 100+ 处 |
| 3 | 流式响应 SSE | Server-Sent Events 实时对话 | AI对话接口 |
| 4 | 静态文件服务 | send_file 图片/媒体文件 | `/api/media` |
| 5 | 请求生命周期钩子 | before_request/after_request | `@app.after_request` |
| 6 | 统一错误处理 | abort() + 状态码 | 50+ 处 |
| 7 | make_response | 自定义响应对象 | 多处 |
| 8 | Content-Type | 多种数据格式 | JSON/SSE/Octet-stream |
| 9 | 请求属性 | args/headers/remote_addr | 多处 |
| 10 | 日志系统 | RotatingFileHandler | 100+ 处 |
| 11 | 原生 SQL | db.session.execute(text()) | 管理后台 |
| 12 | ORM 聚合函数 | count/avg/sum/round | 统计接口 |
| 13 | 请求超时 | timeout 参数 | AI/天气API |
| 14 | 缓存机制 | Redis + Cache-Control + ETag | 多处 |
| 15 | 重试降级 | AI多模型自动切换 | AI服务 |
| 16 | 密码加密 | generate_password_hash | 注册接口 |
| 17 | 请求拦截 | before_request 钩子 | 安全验证 |
| 18 | CORS 预检 | OPTIONS + Access-Control | AI接口 |

---

## 二、HTTP 方法（完整 5 种）

### 2.1 五种方法一览

| 方法 | 数量 | Python 类比 | 项目中实际用途 |
|------|------|------------|--------------|
| **GET** | 27个 | `dict.get()` | 获取景点/订单/用户信息 |
| **POST** | 19个 | `list.append()` | 登录/注册/创建评论/AI对话 |
| **PUT** | 3个 | `dict.update()` | 更新用户信息/更新游记 |
| **DELETE** | 3个 | `del dict[key]` | 删除收藏/删除游记 |
| **OPTIONS** | 2个 | 预检请求 | CORS 跨域预检 |

### 2.2 OPTIONS 方法（CORS 预检请求）

```python
# app.py 第 3807-3817 行
3807:@app.route('/api/chat', methods=['POST', 'OPTIONS'])  # 声明支持 OPTIONS
3808:@rate_limit('chat', limit=20)
3809:def chat():
3810:    if request.method == 'OPTIONS':  # 判断请求方法
3812:        response = make_response()  # 创建空响应
3813:        response.headers.add('Access-Control-Allow-Origin', '*')
3814:        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
3815:        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
3817:        return response
```

### 2.3 动态路由参数

```python
1412:@app.route('/api/destinations/<int:destination_id>/comments', methods=['GET'])
2679:@app.route('/api/flights/<flight_id>', methods=['GET'])
1709:@app.route('/api/favorites/<int:favorite_id>', methods=['DELETE'])
```

---

## 三、数据库事务（项目中 100+ 处）

### 3.1 什么是事务？

**事务** 保证一组数据库操作要么全部成功，要么全部失败回滚，防止数据不一致。

```python
db.session.add(obj)      # 开启事务
db.session.commit()       # 提交（成功）
db.session.rollback()      # 回滚（失败）
db.session.flush()        # 刷新获取自增 ID
```

### 3.2 项目中的事务示例

**创建景点（成功提交）**：
```python
# app.py 第 2127-2129 行
2127:destination = Destination(...)
2129:db.session.add(destination)
2129:db.session.commit()  # 提交事务，创建成功
```

**创建游记（失败回滚）**：
```python
# app.py 第 1801-1806 行
1801:note = TravelNote(...)
1802:db.session.add(note)
1803:db.session.commit()
1806:    db.session.rollback()  # 出错时回滚，数据库不会有残留数据
```

**flush 获取自增 ID**：
```python
# app.py 第 4234-4254 行
4234:trip = Trip(...)
4235:db.session.add(trip)
4235:db.session.flush()  # 立即刷新，trip.id 已生成
4251:db.session.add(trip_item)  # trip_item 需要引用 trip.id
4254:db.session.commit()
```

---

## 四、流式响应 SSE（Server-Sent Events）

### 4.1 什么是流式响应？

**SSE** 让服务器可以"推送"数据给浏览器，实时显示 AI 回复（一个字一个字跳出来），无需前端不断轮询。

### 4.2 项目中的流式响应实现

**生成器函数（yield）**：
```python
# app.py 第 3895-3944 行
3895:def generate_agent_stream(ai_service, messages):
3898:    yield f"data: {json.dumps({'type': 'thinking', ...})}\n\n"  # 思考中提示
3908:        for event in ai_service.chat_stream_with_tools(...):
3911:            yield f"data: {json.dumps({'type': 'thinking', ...})}\n\n"
3918:            yield f"data: {json.dumps({'type': 'content', 'data': chunk}, ...)}\n\n"  # 逐段返回内容
3933:        for token in ai_service.chat_stream(messages):
3934:            yield f"data: {json.dumps({'type': 'content', 'data': token}, ...)}\n\n"  # 逐 token 返回
3940:        yield f"data: {json.dumps({'type': 'done'}, ...)}\n\n"  # 结束标记
3944:        yield f"data: {json.dumps({'type': 'error', ...})}\n\n"
```

**返回流式响应**：
```python
# app.py 第 4064-4065 行
4064:response = make_response(generate_agent_stream(ai_service, messages), 200)
4065:response.headers['Content-Type'] = 'text/event-stream; charset=utf-8'  # 关键！声明为 SSE
```

**AI 内部的流式调用**：
```python
# app.py 第 3577-3615 行
3577:def chat_stream(self, messages):
3578:    """真实 SSE 流式调用，收到 token 立即 yield，优化延迟"""
3581:        resp = requests.post(
3593:            "stream": True,  # 启用流式
3597:            timeout=30
3598:        )
3600:        for line in resp.iter_lines():  # 逐行读取响应
3602:            if line:
3604:                if chunk:
3615:                    yield content  # 立即 yield 给调用方
```

---

## 五、静态文件服务（send_file）

### 5.1 什么是静态文件服务？

后端不仅返回 JSON 数据，还可以返回**文件**（图片、视频、PDF 等）。

```python
# app.py 第 2572-2604 行
2572:@app.route('/api/media', methods=['GET'])
2575:    path = request.args.get('path', '')  # 从 URL 参数获取文件路径
2579:    ext = os.path.splitext(file_path)[1].lower()  # 提取文件扩展名
2590:    mime_types = {
2591:        '.jpg': 'image/jpeg',
2592:        '.png': 'image/png',
2593:        '.gif': 'image/gif',
2594:        '.webp': 'image/webp',
2595:        '.svg': 'image/svg+xml',
2596:    }
2598:    content_type = mime_types.get(ext, 'application/octet-stream')  # 默认二进制
2601:    response = make_response(send_file(file_path, mimetype=content_type))  # 返回文件
2602:    response.headers['Cache-Control'] = 'public, max-age=86400'  # 缓存 24 小时
2603:    response.headers['Access-Control-Allow-Origin'] = '*'
2604:    return response
```

---

## 六、请求生命周期钩子

### 6.1 after_request（安全响应头）

```python
# app.py 第 278-294 行
278:@app.after_request
279:def add_security_headers(response: Any) -> Any:
280:    """添加安全相关和性能优化相关的 HTTP 响应头"""
281:    response.headers['X-Content-Type-Options'] = 'nosniff'  # 防止 MIME 类型 sniffing
282:    response.headers['X-XSS-Protection'] = '1; mode=block'  # 启用 XSS 过滤
288:    response.headers['Access-Control-Allow-Origin'] = '*'
289:    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
290:    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
291:    return response
```

**作用**：所有 API 响应都会自动带上这些安全头，无需在每个接口里单独设置。

---

## 七、统一错误处理（abort）

### 7.1 abort() 详解

**abort()** 立即终止请求，返回错误响应。

```python
# app.py 第 406-433 行
406:if not auth.startswith('Bearer '):
407:    abort(401, description="Missing or invalid Authorization header")
419:    abort(401, description="Invalid token payload")
425:    abort(401, description="User not found")
430:    abort(401, description="Token expired")
433:    abort(401, description="Invalid token")
```

### 7.2 get_or_404() 自动 404

```python
978:destination = Destination.query.get_or_404(id)   # 找不到自动返回 404
3302:product = Product.query.get_or_404(id)
3357:notification = Notification.query.get_or_404(id)
```

### 7.3 try-except 统一模式

```python
try:
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict()})
except Exception as e:
    db.session.rollback()  # 回滚保持数据一致
    logger.error(f"操作失败: {str(e)}")  # 记录错误
    return jsonify({'success': False, 'error': '服务器内部错误'}), 500
```

---

## 八、make_response（自定义响应对象）

### 8.1 make_response 用法

```python
# 用法一：从缓存数据创建响应
236:response = make_response(jsonify(json.loads(cached_response)))

# 用法二：创建 CORS 预检空响应
3813:response = make_response()

# 用法三：创建流式响应（SSE）
4064:response = make_response(generate_agent_stream(ai_service, messages), 200)
4065:response.headers['Content-Type'] = 'text/event-stream; charset=utf-8'

# 用法四：创建静态文件响应
2601:response = make_response(send_file(file_path, mimetype=content_type))
```

---

## 九、Content-Type（多种数据格式）

| Content-Type | 用途 | 项目中的使用 |
|-------------|------|-------------|
| `application/json` | JSON 数据 | 所有 REST API 接口 |
| `text/event-stream` | SSE 流式响应 | AI 对话接口 `/api/agent/chat` |
| `image/jpeg` | JPEG 图片 | `/api/media` |
| `image/png` | PNG 图片 | `/api/media` |
| `image/webp` | WebP 图片 | `/api/media` |
| `application/octet-stream` | 未知类型二进制 | `/api/media`（默认兜底） |

---

## 十、请求属性详解

### 10.1 request.args（URL 查询参数）

```python
# app.py 第 1024-1042 行
1024:page = request.args.get('page', 1, type=int)        # ?page=2
1026:per_page = request.args.get('per_page', 20, type=int)  # ?per_page=10
1028:keyword = request.args.get('keyword', '').strip()   # ?keyword=故宫
1030:city = request.args.get('city', '').strip()         # ?city=北京
1034:min_rating = request.args.get('min_rating', type=float)  # ?min_rating=4.5
1038:sort_by = request.args.get('sort_by', 'created_at')     # ?sort_by=rating
1040:order = request.args.get('order', 'desc')               # ?order=asc
```

### 10.2 request.get_json()（请求体 JSON）

```python
496:data = request.get_json(silent=True) or {}  # 从请求体解析 JSON
497:email = data.get("email")
498:password = data.get("password")
```

### 10.3 request.headers（请求头）

```python
404:auth = request.headers.get('Authorization', '')
183:user_id = request.headers.get('X-User-ID', request.remote_addr)
```

### 10.4 request.method（当前请求方法）

```python
# app.py 第 4416-4535 行（同一个函数处理多种方法）
4416:if request.method == 'GET' and plan_id:     # 处理 GET 单个
4432:elif request.method == 'GET':               # 处理 GET 列表
4454:elif request.method == 'POST':              # 处理 POST 创建
4499:elif request.method == 'PUT' and plan_id:  # 处理 PUT 更新
4531:elif request.method == 'DELETE' and plan_id:  # 处理 DELETE
```

---

## 十一、日志系统（100+ 处）

### 11.1 日志配置（RotatingFileHandler）

```python
# app.py 第 34-65 行
34:import logging
36:from logging.handlers import RotatingFileHandler
47:if not os.path.exists('logs'):
49:    os.makedirs('logs')
53:log_file = 'logs/travel_assistant.log'
55:handler = RotatingFileHandler(
56:    log_file,
57:    maxBytes=10000000,    # 单个日志文件最大 10MB
58:    backupCount=5          # 最多保留 5 个备份文件
59:)
60:handler.setFormatter(logging.Formatter(
61:    '%(asctime)s %(levelname)s in %(module)s: %(message)s'
62:))
63:logger = logging.getLogger(__name__)
65:logger.addHandler(handler)
```

**RotatingFileHandler**：当日志文件超过 10MB 时，自动创建新文件，保留最多 5 个旧文件。避免日志文件无限膨胀。

### 11.2 日志级别与使用

| 级别 | 用途 | 项目示例 |
|------|------|---------|
| `logger.info()` | 正常操作记录 | `景点查询耗时: 0.023s, 页码: 1` |
| `logger.error()` | 错误记录 | `获取用户信息失败: {str(e)}` |
| `logger.warning()` | 警告记录 | `Redis 不可用，限流已禁用` |

```python
1113:logger.info(f"景点查询耗时: {query_time:.3f}s, 页码: {page}, 每页: {per_page}")
591:logger.error(f"获取用户信息失败: {str(e)}")
94:logger.warning(f"Redis 不可用，缓存和限流功能已禁用: {e}")
2388:logger.info(f"管理员创建用户成功: {username} (ID: {user.id})")
```

---

## 十二、原生 SQL 查询

### 12.1 什么时候用原生 SQL？

ORM 解决不了的复杂查询，需要用原生 SQL。

### 12.2 项目中的原生 SQL

```python
# app.py 第 5255-5265 行（管理后台：查询表结构）
5255:result = db.session.execute(text(f"SELECT name FROM sqlite_master WHERE type='table'"))

# app.py 第 5263 行（查询表字段信息）
5263:columns_result = db.session.execute(text(f"PRAGMA table_info({table_name})"))

# app.py 第 5276 行（查询记录总数）
5276:count_result = db.session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))

# app.py 第 5310 行（查询表数据）
5310:data_result = db.session.execute(text(f"SELECT * FROM {table_name} LIMIT {limit} OFFSET {offset}"))

# app.py 第 2530 行（数据库健康检查）
2530:db.session.execute(text('SELECT 1'))
```

**text() 的作用**：将 SQL 字符串转换为 SQLAlchemy 可执行的语句对象，防 SQL 注入。

---

## 十三、ORM 聚合函数

### 13.1 db.func 聚合函数

| 函数 | 作用 | 项目示例 |
|------|------|---------|
| `db.func.count()` | 统计数量 | 景点总数、用户总数 |
| `db.func.avg()` | 平均值 | 平均评分 |
| `db.func.sum()` | 求和 | 总收入 |
| `db.func.round()` | 四舍五入 | 评分保留 1 位小数 |
| `db.func.max()` | 最大值 | 最新对话时间 |
| `db.func.coalesce()` | 空值替换 | NULL 替换为 0 |

### 13.2 项目中的聚合查询

```python
# 统计景点数量（app.py 第 1139 行）
1139:db.func.count(Destination.id).label('count')

# 平均评分（app.py 第 2214 行）
2214:'avg_rating': round(Destination.query.with_entities(db.func.avg(Destination.rating)).scalar() or 0, 2)

# 总收入（app.py 第 2216 行）
2216:'total_revenue': round(Destination.query.with_entities(db.func.sum(Destination.ticket_price)).scalar() or 0, 2)

# 分组统计（app.py 第 1137-1143 行）
1137:city_stats = db.session.query(
1138:    Destination.city,
1139:    db.func.count(Destination.id).label('count')
1140:).filter(...).group_by(Destination.city).all()

# 空值替换（app.py 第 2257 行）
2257:db.func.coalesce(db.func.sum(Order.total_amount), 0).label('amount')
```

---

## 十四、请求超时配置

| 场景 | 超时时间 | 说明 |
|------|---------|------|
| Redis 连接 | 0.5s 连接 / 1s 命令 | 快速失败，不阻塞 |
| 外部 API（天气） | 10s | 心知天气 API |
| AI 对话（非流式） | 30s | 普通 AI 回复 |
| AI 对话（流式） | 120s | 流式 AI 回复 |
| AI 行程生成 | 120s | 最复杂，耗时最长 |

```python
# Redis 超时（app.py 第 87-88 行）
87:socket_connect_timeout=0.5,  # 连接超时 0.5s
88:socket_timeout=1             # 命令超时 1s

# 天气 API 超时（app.py 第 2632 行）
2632:resp = requests.get(url, params=params, timeout=10)

# AI API 超时（app.py 第 3542、4153 行）
3542:resp = self._call_api(config, messages, timeout=30)  # 普通调用 30s
4153:ai_service.chat([{"role": "user", ...}], timeout=120)  # 行程生成 120s
```

---

## 十五、缓存机制（完整版）

### 15.1 缓存的三层架构

```
浏览器缓存（Cache-Control）
    ↓ 未命中
Redis 缓存（应用层缓存）
    ↓ 未命中
数据库查询（最终数据源）
```

### 15.2 Cache-Control 缓存头

```python
# 缓存命中
238:response.headers['Cache-Control'] = f'public, max-age={timeout}'
239:response.headers['X-Cache'] = 'HIT'  # 告诉浏览器这是缓存

# 缓存未命中
250:response.headers['Cache-Control'] = f'public, max-age={timeout}'
251:response.headers['X-Cache'] = 'MISS'

# 静态文件缓存 24 小时
2602:response.headers['Cache-Control'] = 'public, max-age=86400'
```

### 15.3 ETag（缓存验证）

```python
# app.py 第 269-271 行
269:def generate_etag(data: Any) -> str:
271:    return hashlib.md5(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()
```

**ETag 原理**：浏览器缓存数据时同时缓存 ETag。下次请求带 `If-None-Match: <etag>`，服务端对比 ETag，如果没变返回 304 Not Modified，浏览器直接用缓存。

### 15.4 缓存失效策略

```python
# app.py 第 990-992 行（更新景点时清除缓存）
990:redis_cache_delete_pattern(f'destinations:*')   # 清除列表缓存
991:redis_cache_delete_pattern(f'destination:{id}')  # 清除详情缓存
```

---

## 十六、请求重试与降级机制

### 16.1 AI 服务多模型降级

项目支持多个 AI 模型，当一个不可用时自动切换。

```python
# app.py 第 3459-3479 行（AI 配置）
3459:class AIService:
3460:    def __init__(self):
3461:        self.providers = [
3462:            {  # 月之暗面 Kimi（优先）
3463:                'name': 'moonshot',
3464:                'model': 'moonshot-v1-8k',
3465:                'base_url': os.getenv('MOONSHOT_BASE_URL', '...'),
3466:                'api_key': os.getenv('MOONSHOT_API_KEY', ''),
3467:            },
3468:            {  # 智谱 GLM-4（备选）
3469:                'name': 'zhipu',
3470:                'model': 'glm-4-flash',
3471:                'base_url': os.getenv('ZHIPU_BASE_URL', '...'),
3472:                'api_key': os.getenv('ZHIPU_API_KEY', ''),
3473:            },
3474:            {  # OpenAI（保底）
3475:                'name': 'openai',
3476:                'model': 'gpt-3.5-turbo',
3477:                'base_url': os.getenv('OPENAI_BASE_URL', '...'),
3478:                'api_key': os.getenv('OPENAI_API_KEY', ''),
3479:            },
3480:        ]
```

### 16.2 异常处理与降级

```python
# app.py 第 3558-3575 行
3558:try:
3559:    resp = self._call_api(config, messages, timeout)
3560:    resp.raise_for_status()  # HTTP >= 400 时抛出异常
3561:    data = resp.json()
3562:    return data['choices'][0]['message']['content']
3563:except Exception as e:
3564:    last_error = str(e)
3566:    logger.error(f"Kimi API 调用失败: {last_error}")
3575:raise Exception(last_error or "所有AI服务均不可用")
```

---

## 十七、密码加密（generate_password_hash）

### 17.1 为什么需要加密？

用户密码不能明文存储，必须加密。即使数据库被拖库，攻击者也拿不到密码。

### 17.2 项目中的密码加密

```python
# app.py 第 30 行
30:from werkzeug.security import generate_password_hash, check_password_hash

# 注册时加密（app.py 第 903 行）
903:password_hash=generate_password_hash(password),  # 加密后存入数据库

# 登录时验证（app.py 第 522 行）
522:if check_password_hash(user.password_hash, password):  # 验证密码是否匹配
```

**原理**：Werkzeug 使用 PBKDF2 + SHA256 算法，加盐（salt）哈希。相同密码每次加密结果不同，防止彩虹表攻击。

---

## 十八、CORS 跨域配置（完整版）

```python
# app.py 第 9 行
9:from flask_cors import CORS

# app.py 第 342-367 行
342:_cors_origins = [
343:    "http://localhost:3000",     # 本地开发前端
344:    "http://127.0.0.1:3000",
345:    "http://localhost:3001",
346:    "http://127.0.0.1:3001",
347:]
355:_cors_env = os.getenv('CORS_ORIGINS', '').strip()
356:if _cors_env:
357:    _cors_origins = [url.strip() for url in _cors_env.split(',') if url.strip()]

360:CORS(app, resources={
361:    r"/api/*": {
362:        "origins": _cors_origins,
363:        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
364:        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
365:        "expose_headers": ["Content-Length", "X-Request-ID"],
366:        "supports_credentials": True
367:    }
368:})
```

---

## 十九、完整 HTTP 请求处理流程图

```
用户操作（浏览器/前端）
    ↓
DNS 解析 → TCP 连接 → TLS 握手（HTTPS）
    ↓
HTTP 请求到达 Flask 后端
    ↓
@app.after_request（添加安全响应头）
    ↓
@app.route() 路由匹配
    ↓
@rate_limit() 限流检查（Redis 计数）
    ↓
@cache_response() 缓存检查（Redis 命中？）
    ↓
视图函数执行
    ├─ 验证 Authorization（JWT decode）
    ├─ 解析请求参数（request.args / request.get_json）
    ├─ 数据库操作（db.session.add/commit/rollback）
    │   ├─ ORM 查询（query.get / filter_by / paginate）
    │   ├─ 原生 SQL（db.session.execute(text())）
    │   └─ 聚合统计（count/avg/sum）
    ├─ 业务逻辑（日志记录、错误处理）
    └─ 返回响应（jsonify / make_response / send_file）
    ↓
@app.after_request（添加缓存/CORS 头）
    ↓
HTTP 响应返回前端
    ↓
前端处理（axios 拦截器）
    ├─ 请求拦截器：自动添加 Authorization
    ├─ 响应拦截器：401 → 跳转登录页
    └─ SSE 接收：ReadableStream 逐块读取
```

---

## 二十、完整功能统计表

| 分类 | 功能点 | 数量 | 代码位置 |
|------|--------|------|----------|
| **HTTP 方法** | GET | 27个 | app.py 各处 |
| | POST | 19个 | app.py 各处 |
| | PUT | 3个 | app.py 各处 |
| | DELETE | 3个 | app.py 各处 |
| | OPTIONS | 2个 | AI 对话接口 |
| **数据库操作** | db.session.commit | 60+ 处 | 所有写接口 |
| | db.session.rollback | 40+ 处 | 所有异常处理 |
| | db.session.flush | 2 处 | 行程/会话创建 |
| | db.session.execute(text) | 10+ 处 | 管理后台 |
| **ORM 查询** | .query.get | 20+ 处 | 各接口 |
| | .query.filter_by | 50+ 处 | 各接口 |
| | .query.paginate | 9 处 | 列表接口 |
| | .query.order_by | 10+ 处 | 排序接口 |
| | db.func.count/avg/sum | 20+ 处 | 统计接口 |
| **响应类型** | jsonify | 200+ 处 | 所有接口 |
| | make_response | 6 处 | SSE/文件/缓存 |
| | send_file | 1 处 | 媒体文件 |
| **缓存** | Redis 缓存 | 12 处 | 热点接口 |
| | Cache-Control | 12 处 | 响应头 |
| | ETag | 1 处 | 缓存验证 |
| **限流** | rate_limit 装饰器 | 50+ 处 | 所有接口 |
| **日志** | logger.info | 50+ 处 | 各接口 |
| | logger.error | 50+ 处 | 异常处理 |
| | RotatingFileHandler | 1 处 | 日志配置 |
| **安全** | generate_password_hash | 2 处 | 注册/管理员创建 |
| | check_password_hash | 1 处 | 登录验证 |
| | abort(401) | 5 处 | 认证失败 |
| | get_or_404 | 8 处 | 资源不存在 |
| **请求获取** | request.args.get | 80+ 处 | URL 参数 |
| | request.get_json | 30+ 处 | 请求体 |
| | request.headers.get | 20+ 处 | 认证/CORS |
| **AI 服务** | 多模型降级 | 3 层 | Kimi→智谱→OpenAI |
| | 流式 SSE | 2 处 | /api/chat, /api/agent/chat |
| | 普通对话 | 1 处 | /api/chat |
| **文件服务** | send_file | 1 处 | /api/media |
| | MIME 类型映射 | 6 种 | 图片格式 |
| **错误处理** | try-except | 50+ 处 | 所有接口 |
| | 状态码 400/401/403/404/409/429/500 | 各多处 | 统一返回格式 |

---

## 二十一、答辩话术

### Q1：你的项目用了哪些 HTTP 相关技术？

> **答**：我的项目虽然接口是 RESTful 的（GET/POST/PUT/DELETE），但背后涉及的技术远不止这 4 个方法。具体包括：
> 1. **数据库事务**：100+ 处使用 db.session.commit/rollback，保证数据一致性
> 2. **流式响应（SSE）**：AI 对话接口实现了 Server-Sent Events，AI 回复逐字显示
> 3. **静态文件服务**：用 send_file 返回图片，支持多种 MIME 类型
> 4. **请求生命周期钩子**：用 @app.after_request 统一添加安全响应头
> 5. **统一错误处理**：abort() + get_or_404() 处理各种异常情况
> 6. **make_response**：创建自定义响应（JSON、SSE、文件）
> 7. **日志系统**：RotatingFileHandler + 分级日志（INFO/ERROR/WARNING）
> 8. **原生 SQL**：管理后台用 db.session.execute(text()) 执行复杂查询
> 9. **聚合函数**：count/avg/sum/round 用于统计功能
> 10. **请求超时**：Redis 0.5s、AI 120s、天气 10s，防止请求无限等待
> 11. **缓存机制**：Redis + Cache-Control + ETag 多层缓存
> 12. **多模型降级**：AI 服务支持 Kimi→智谱→OpenAI 自动切换
> 13. **密码加密**：Werkzeug PBKDF2 SHA256 防彩虹表攻击
> 14. **CORS 配置**：Flask-CORS + OPTIONS 预检请求

---

### Q2：流式响应（SSE）和普通接口有什么区别？

> **答**：普通接口等 AI 生成完整回复后一次性返回，响应时间 = 生成时间（可能 30 秒）。SSE 让服务器边生成边推送，浏览器实时显示，响应时间 = 第一个字出现的时间（< 1 秒）。我用 yield 生成器实现，每收到一个 token 就推送给前端，配合 Content-Type: text/event-stream 声明为流式响应。

---

### Q3：为什么 AI 服务需要多模型降级？

> **答**：AI API 有时会不稳定或达到调用上限。如果只用单一模型，接口就直接失败了。我配置了 Kimi → 智谱 GLM → OpenAI 三级降级，任何一个失败就自动切换下一个，保证服务可用性。前端显示降级提示，用户感知不到切换过程。

---

### Q4：数据库事务在项目中怎么用的？

> **答**：所有涉及写操作的接口都用事务。比如创建景点：先 add() 到会话，commit() 提交到数据库。如果 commit() 之前出错，rollback() 回滚，不会留下半条记录。项目中 100+ 处都遵循这个模式，保证数据不会因为异常而出现不一致。

---

### Q5：限流和缓存有什么区别？

> **答**：限流是"谁在请求"，缓存是"请求了什么"。限流防止恶意刷接口（保护服务器），缓存减少重复计算（提升性能）。限流用 Redis ZSET 记录每分钟请求次数，缓存用 Redis 存储响应结果。两者的键设计也不同：限流键是 `rate_limit:接口名:用户ID`，缓存键是 `缓存前缀:请求路径:参数哈希`。

---

### Q6：什么是 ETag？它和 Cache-Control 有什么区别？

> **答**：Cache-Control 告诉浏览器"缓存多久"，ETag 告诉浏览器"怎么判断缓存是否过期"。Cache-Control 是时间策略，ETag 是内容策略。浏览器同时缓存 ETag，下一次请求时带 If-None-Match 头，服务端对比 ETag，如果没变返回 304 Not Modified（不用传数据），如果变了返回新数据和新的 ETag。比单纯依赖 Cache-Control 更精确，节省带宽。

---

### Q7：你的项目日志系统是怎么设计的？

> **答**：我用 Python 标准库的 RotatingFileHandler，配置单文件最大 10MB，最多保留 5 个备份。日志格式是 `时间 + 级别 + 模块名 + 消息`。日志分级：logger.info 记录正常操作（如查询耗时），logger.error 记录所有异常，logger.warning 记录可恢复的异常（如 Redis 不可用）。这样既能排查问题，又不会日志爆炸。

---

**文档说明**：以上 21 个章节完整覆盖了项目中所有 HTTP 相关知识点，不仅包含 GET/POST/PUT/DELETE，还包括数据库事务、流式响应、文件服务、错误处理、日志系统、原生 SQL、聚合函数、请求超时、多模型降级、密码加密等实际用到的全部功能。
