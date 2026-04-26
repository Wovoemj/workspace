# 网站项目所有功能实现流程

**文档版本**: v1.0  
**最后更新**: 2026年4月23日  
**适用**: 论文答辩、项目讲解

---

## 一、项目总体架构

### 1.1 系统分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户端（Browser）                          │
│   Next.js 14 + React 18 + TypeScript + Zustand + Tailwind CSS  │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API网关层（Flask）                           │
│   app.py: 5000+行代码, 70+个API接口, JWT认证, Redis缓存, 限流   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   数据存储层     │ │   缓存服务层     │ │   外部服务层     │
│ SQLite/MySQL    │ │    Redis        │ │ AI/天气/地图API  │
│ 15张数据表      │ │ 会话/缓存/限流   │ │ Kimi/智谱/心知   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 1.2 核心技术亮点

| 亮点 | 说明 | 代码位置 |
|------|------|---------|
| **流式AI响应** | SSE实现打字机效果 | `app.py:3807` |
| **多AI降级** | Kimi→智谱→OpenAI自动切换 | `app.py:4007` |
| **Redis缓存** | 热点数据5分钟缓存 | `app.py:221` |
| **API限流** | 滑动窗口算法防刷 | `app.py:176` |
| **JWT认证** | 无状态Token认证 | `app.py:389` |
| **分页查询** | 最大100条/页防全表扫描 | `app.py:1050` |

---

## 二、20个核心功能实现流程

### 功能1：用户注册登录

**流程图**：
```
用户输入信息 → 前端验证 → POST请求 → 后端验证 → 密码加密 → 创建用户 → 返回Token
```

**核心代码**：

```python
# 后端注册 (app.py:851)
@app.route('/api/users/register', methods=['POST'])
def api_user_register():
    data = request.get_json()
    
    # 1. 参数验证
    if not data.get('password'):
        return jsonify({'success': False, 'error': '密码不能为空'}), 400
    
    # 2. 检查用户名是否已存在
    existing = User.query.filter(
        (User.username == data['username']) |
        (User.email == data.get('email')) |
        (User.phone == data.get('phone'))
    ).first()
    if existing:
        return jsonify({'success': False, 'error': '用户已存在'}), 409
    
    # 3. 密码加密存储 (PBKDF2+SHA256)
    password_hash = generate_password_hash(data['password'], method='pbkdf2:sha256')
    
    # 4. 创建用户
    user = User(
        username=data['username'],
        email=data.get('email'),
        phone=data.get('phone'),
        password_hash=password_hash,
        invite_code=generate_invite_code()
    )
    db.session.add(user)
    db.session.commit()
    
    # 5. 生成JWT Token
    token = _issue_jwt(user.id)
    
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })

# 后端登录 (app.py:492)
@app.route('/api/users/login', methods=['POST'])
def api_user_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # 1. 查询用户
    user = User.query.filter(
        (User.username == username) |
        (User.email == username) |
        (User.phone == username)
    ).first()
    
    # 2. 验证密码
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'success': False, 'error': '用户名或密码错误'}), 401
    
    # 3. 更新登录时间
    user.last_login = datetime.now()
    db.session.commit()
    
    # 4. 生成Token
    token = _issue_jwt(user.id)
    
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })
```

```typescript
// 前端调用 (frontend/user-web/src/lib/api.ts)
export const userApi = {
  register: (body: { username: string; password: string; email?: string }) =>
    api.post('/api/users/register', body),
  login: (body: { username: string; password: string }) =>
    api.post('/api/users/login', body),
}

// 登录组件使用
const handleLogin = async () => {
  try {
    const res = await userApi.login({
      username: 'test@example.com',
      password: '123456'
    })
    // 保存Token到本地
    localStorage.setItem('auth_token', res.token)
    // 保存用户信息
    setUser(res.user)
  } catch (error) {
    alert('登录失败')
  }
}
```

---

### 功能2：景点列表查询（带缓存）

**流程图**：
```
请求 → 检查Redis缓存 → 有缓存直接返回 → 无缓存查询数据库 → 分页处理 → 写入缓存 → 返回结果
```

**核心代码**：

```python
# 后端 (app.py:1015)
@app.route('/api/destinations', methods=['GET'])
@rate_limit('destinations', limit=100)  # 限流：每分钟100次
@cache_response(timeout=300, key_prefix='destinations')  # 缓存5分钟
def get_destinations():
    start_time = time.time()
    
    # 1. 获取分页参数
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 12, type=int), 100)
    
    # 2. 构建查询
    query = Destination.query
    
    # 3. 城市筛选
    if city := request.args.get('city'):
        query = query.filter(Destination.city == city)
    
    # 4. 省份筛选
    if province := request.args.get('province'):
        query = query.filter(Destination.province == province)
    
    # 5. 最低评分筛选
    if min_rating := request.args.get('min_rating', type=float):
        query = query.filter(Destination.rating >= min_rating)
    
    # 6. 价格范围筛选
    if max_price := request.args.get('max_price', type=float):
        query = query.filter(Destination.ticket_price <= max_price)
    
    # 7. 排序
    sort = request.args.get('sort', '-rating')
    if sort == 'rating':
        query = query.order_by(Destination.rating.desc())
    elif sort == 'price_asc':
        query = query.order_by(Destination.ticket_price.asc())
    elif sort == 'price_desc':
        query = query.order_by(Destination.ticket_price.desc())
    elif sort == 'newest':
        query = query.order_by(Destination.created_at.desc())
    
    # 8. 分页查询
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    logger.info(f"景点列表查询耗时: {time.time() - start_time:.3f}s")
    
    return jsonify({
        'success': True,
        'destinations': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    })
```

```typescript
// 前端 (frontend/user-web/src/lib/api.ts)
export const destinationApi = {
  list: (params?: {
    page?: number
    per_page?: number
    city?: string
    province?: string
    min_rating?: number
    max_price?: number
    sort?: string
  }) => api.get('/api/destinations', { params }),
}

// 景点列表组件
const DestinationsPage = () => {
  const [destinations, setDestinations] = useState([])
  const [pagination, setPagination] = useState({})
  
  useEffect(() => {
    const fetchDestinations = async () => {
      const res = await destinationApi.list({
        page: 1,
        city: '北京',
        min_rating: 4.0,
        sort: 'rating'
      })
      setDestinations(res.destinations)
      setPagination({
        total: res.total,
        pages: res.pages,
        current_page: res.current_page
      })
    }
    fetchDestinations()
  }, [])
  
  return (
    <div>
      {destinations.map(dest => (
        <DestinationCard key={dest.id} data={dest} />
      ))}
      <Pagination {...pagination} />
    </div>
  )
}
```

---

### 功能3：景点详情与评论

**流程图**：
```
GET /api/destinations/:id
    ↓
检查缓存 → 命中返回
    ↓
查询景点详情 + 评论列表
    ↓
记录用户足迹
    ↓
返回数据
```

**核心代码**：

```python
# 景点详情 (app.py:1362)
@app.route('/api/destinations/<int:id>', methods=['GET'])
@rate_limit('destinations_detail', limit=200)
@cache_response(timeout=600, key_prefix='destination_detail')
def get_destination(id: int):
    start_time = time.time()
    
    # 1. 查询景点
    destination = Destination.query.get_or_404(id)
    
    # 2. 获取用户足迹（需要登录）
    user_id = None
    try:
        user_id = get_current_user_id()
    except:
        pass
    
    if user_id:
        # 记录足迹
        footprint = UserFootprint(
            user_id=user_id,
            destination_id=id
        )
        db.session.add(footprint)
        db.session.commit()
    
    logger.info(f"景点详情查询耗时: {time.time() - start_time:.3f}s")
    
    return jsonify({
        'success': True,
        'destination': destination.to_dict()
    })

# 评论列表 (app.py:1412)
@app.route('/api/destinations/<int:destination_id>/comments', methods=['GET'])
def get_destination_comments(destination_id: int):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # 查询评论
    pagination = DestinationComment.query.filter_by(
        destination_id=destination_id
    ).order_by(
        DestinationComment.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'success': True,
        'comments': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages
    })

# 发布评论 (app.py:1449)
@app.route('/api/destinations/<int:destination_id>/comments', methods=['POST'])
def create_destination_comment(destination_id: int):
    user_id = get_current_user_id()
    data = request.get_json()
    
    # 创建评论
    comment = DestinationComment(
        destination_id=destination_id,
        user_id=user_id,
        content=data.get('content')
    )
    db.session.add(comment)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'comment': comment.to_dict()
    })
```

---

### 功能4：AI智能对话（流式响应）

**这是项目最亮眼的功能**，采用Server-Sent Events (SSE)实现打字机效果。

**流程图**：
```
用户发送消息 → 前端POST → 后端限流检查 → 调用AI服务(Kimi) → 流式返回 → 前端逐字显示
                                                        ↓
                                              若Kimi失败，自动切换智谱
                                                        ↓
                                              若智谱失败，自动切换OpenAI
```

**核心代码**：

```python
# AI对话接口 (app.py:3807)
@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    data = request.get_json()
    messages = data.get('messages', [])
    
    # 创建流式响应
    response = make_response()
    response.headers['Content-Type'] = 'text/event-stream; charset=utf-8'
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    
    def generate():
        try:
            # 依次尝试各AI服务（自动降级）
            for config in AI_CONFIGS:
                try:
                    # 构建请求
                    api_url = f"{config['base_url']}/chat/completions"
                    headers = {
                        'Authorization': f"Bearer {config['api_key']}",
                        'Content-Type': 'application/json'
                    }
                    payload = {
                        'model': config['model'],
                        'messages': messages,
                        'stream': True
                    }
                    
                    # 调用AI服务
                    resp = requests.post(
                        api_url,
                        headers=headers,
                        json=payload,
                        timeout=120,
                        stream=True
                    )
                    
                    # 流式读取响应
                    for line in resp.iter_lines():
                        if line:
                            text = line.decode('utf-8')
                            if text.startswith('data: '):
                                if text == 'data: [DONE]':
                                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                                else:
                                    chunk = json.loads(text[6:])
                                    content = chunk['choices'][0]['delta'].get('content', '')
                                    if content:
                                        yield f"data: {json.dumps({'type': 'content', 'data': content})}\n\n"
                    
                    return
                    
                except requests.exceptions.Timeout:
                    logger.warning(f"[{config['name']}] 超时，尝试下一个")
                    continue
                except Exception as e:
                    logger.error(f"[{config['name']}] 失败: {e}")
                    continue
            
            # 所有服务都失败
            yield f"data: {json.dumps({'type': 'error', 'error': 'AI服务暂时不可用'})}\n\n"
            
        except GeneratorExit:
            pass
    
    return response(generate())
```

```typescript
// 前端流式接收 (frontend/user-web/src/hooks/useChat.ts)
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const sendMessage = async (content: string) => {
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content }])
    setIsLoading(true)
    setStreamingText('')
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content }]
        })
      })
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = decoder.decode(value)
        const lines = text.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'content') {
              // 逐字追加（打字机效果）
              fullText += data.data
              setStreamingText(fullText)
            } else if (data.type === 'done') {
              // 完成
              setMessages(prev => [...prev, { role: 'assistant', content: fullText }])
              setStreamingText('')
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return { messages, streamingText, isLoading, sendMessage }
}

// AI助手组件
const ChatAssistant = () => {
  const { messages, streamingText, isLoading, sendMessage } = useChat()
  const [input, setInput] = useState('')
  
  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input)
      setInput('')
    }
  }
  
  return (
    <div className="chat-container">
      {/* 消息列表 */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
        {/* 流式显示 */}
        {streamingText && (
          <div className="assistant streaming">{streamingText}</div>
        )}
      </div>
      
      {/* 输入框 */}
      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading}>
          {isLoading ? '思考中...' : '发送'}
        </button>
      </div>
    </div>
  )
}
```

---

### 功能5：AI自动生成行程规划

**流程图**：
```
用户输入目的地+天数 → POST /api/itinerary/generate
    ↓
AI搜索目的地景点信息
    ↓
调用AI服务生成行程
    ↓
解析景点，保存行程到数据库
    ↓
返回行程详情（可编辑）
```

**核心代码**：

```python
# 行程生成 (app.py:4091)
@app.route('/api/itinerary/generate', methods=['POST'])
def generate_itinerary():
    data = request.get_json()
    destination = data.get('destination')
    days = data.get('days', 3)
    user_id = get_current_user_id()
    
    # 1. 搜索目的地景点
    dests = Destination.query.filter(
        (Destination.name.like(f'%{destination}%')) |
        (Destination.city.like(f'%{destination}%')) |
        (Destination.province.like(f'%{destination}%'))
    ).limit(15).all()
    
    if not dests:
        return jsonify({'success': False, 'error': '未找到相关景点'}), 404
    
    # 2. 调用AI生成行程
    spots_info = '\n'.join([
        f"- {d.name}（{d.city}，评分{d.rating}，门票约{d.ticket_price}元）"
        for d in dests
    ])
    
    prompt = f"""请为{destination}生成{days}日游行程规划。
    
可用景点：
{spots_info}

请按以下格式返回：
# {destination}{days}日游行程

## 第1天
- 上午：景点名称
- 下午：景点名称
- 晚上：美食推荐

[以此类推...]
"""
    
    # 调用AI
    ai_response = call_ai_service([
        {'role': 'system', 'content': '你是一个专业的旅行规划师'},
        {'role': 'user', 'content': prompt}
    ])
    
    # 3. 创建行程记录
    trip = Trip(
        user_id=user_id,
        title=f"{destination}{days}日游",
        start_date=datetime.now().date(),
        status='planning'
    )
    db.session.add(trip)
    db.session.flush()
    
    # 4. 创建行程项目（根据景点）
    for day in range(1, min(days, 3) + 1):
        for i, dest in enumerate(dests[:day*2]):
            item = TripItem(
                trip_id=trip.id,
                destination_id=dest.id,
                day_number=day,
                title=dest.name,
                location=dest.city,
                sort_order=i
            )
            db.session.add(item)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'trip': trip.to_dict(),
        'items': [item.to_dict() for item in TripItem.query.filter_by(trip_id=trip.id).all()],
        'ai_plan': ai_response
    })
```

---

### 功能6：用户收藏景点

**核心代码**：

```python
# 获取收藏列表 (app.py:1642)
@app.route('/api/favorites', methods=['GET'])
@rate_limit('favorites', limit=50)
def get_favorites():
    user_id = get_current_user_id()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = Favorite.query.filter_by(user_id=user_id)\
        .order_by(Favorite.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    # 联表查询景点详情
    favorites = []
    for fav in pagination.items:
        dest = Destination.query.get(fav.destination_id)
        if dest:
            favorites.append({
                **fav.to_dict(),
                'destination': dest.to_dict()
            })
    
    return jsonify({
        'success': True,
        'favorites': favorites,
        'total': pagination.total
    })

# 添加收藏 (app.py:1680)
@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    user_id = get_current_user_id()
    data = request.get_json()
    destination_id = data.get('destination_id')
    
    # 检查是否已收藏
    existing = Favorite.query.filter_by(
        user_id=user_id,
        destination_id=destination_id
    ).first()
    
    if existing:
        return jsonify({'success': False, 'error': '已经收藏过了'}), 400
    
    # 创建收藏
    favorite = Favorite(
        user_id=user_id,
        destination_id=destination_id
    )
    db.session.add(favorite)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'favorite_id': favorite.id
    })

# 取消收藏 (app.py:1709)
@app.route('/api/favorites/<int:favorite_id>', methods=['DELETE'])
def remove_favorite(favorite_id):
    user_id = get_current_user_id()
    
    favorite = Favorite.query.get_or_404(favorite_id)
    if favorite.user_id != user_id:
        return jsonify({'success': False, 'error': '无权限'}), 403
    
    db.session.delete(favorite)
    db.session.commit()
    
    return jsonify({'success': True})
```

---

### 功能7：旅行游记系统

**核心代码**：

```python
# 获取游记列表 (app.py:1733)
@app.route('/api/travel-notes', methods=['GET'])
@rate_limit('travel_notes', limit=50)
@cache_response(timeout=120, key_prefix='travel_notes')
def get_travel_notes():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # 查询游记（按点赞数排序）
    pagination = db.session.query(TravelNote)\
        .order_by(TravelNote.likes_count.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'success': True,
        'notes': [n.to_dict() for n in pagination.items],
        'total': pagination.total
    })

# 发布游记 (app.py:1770)
@app.route('/api/travel-notes', methods=['POST'])
def create_travel_note():
    user_id = get_current_user_id()
    data = request.get_json()
    
    note = TravelNote(
        user_id=user_id,
        title=data.get('title'),
        content=data.get('content'),
        cover_image=data.get('cover_image'),
        destination_id=data.get('destination_id')
    )
    db.session.add(note)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'note': note.to_dict()
    })

# 点赞游记 (app.py:1885)
@app.route('/api/travel-notes/<int:note_id>/like', methods=['POST'])
def like_travel_note(note_id):
    user_id = get_current_user_id()
    
    # 防止重复点赞
    existing = UserLike.query.filter_by(
        user_id=user_id,
        destination_id=note_id
    ).first()
    
    if not existing:
        like = UserLike(user_id=user_id, destination_id=note_id)
        db.session.add(like)
        
        # 更新点赞数
        note = TravelNote.query.get_or_404(note_id)
        note.likes_count = (note.likes_count or 0) + 1
        db.session.commit()
    
    return jsonify({'success': True})
```

---

### 功能8：优惠券系统

**核心代码**：

```python
# 获取可领取优惠券 (app.py:1938)
@app.route('/api/coupons/available', methods=['GET'])
@cache_response(timeout=60, key_prefix='available_coupons')
def get_available_coupons():
    coupons = Coupon.query.filter(
        Coupon.status == 'active',
        Coupon.valid_from <= datetime.now(),
        Coupon.valid_until >= datetime.now()
    ).all()
    
    return jsonify({
        'success': True,
        'coupons': [c.to_dict() for c in coupons]
    })

# 领取优惠券 (app.py:1959)
@app.route('/api/coupons/claim', methods=['POST'])
def claim_coupon():
    user_id = get_current_user_id()
    data = request.get_json()
    coupon_id = data.get('coupon_id')
    code = data.get('code')
    
    # 根据ID或券码查找优惠券
    if coupon_id:
        coupon = Coupon.query.get(coupon_id)
    elif code:
        coupon = Coupon.query.filter_by(code=code).first()
    else:
        return jsonify({'success': False, 'error': '参数错误'}), 400
    
    # 检查是否已领取
    existing = UserCoupon.query.filter_by(
        user_id=user_id,
        coupon_id=coupon.id
    ).first()
    
    if existing:
        return jsonify({'success': False, 'error': '已领取过此券'}), 400
    
    # 创建用户优惠券
    user_coupon = UserCoupon(
        user_id=user_id,
        coupon_id=coupon.id
    )
    db.session.add(user_coupon)
    db.session.commit()
    
    return jsonify({'success': True})

# 使用优惠券验证 (app.py:2039)
@app.route('/api/coupons/apply', methods=['POST'])
def apply_coupon():
    user_id = get_current_user_id()
    data = request.get_json()
    coupon_id = data.get('coupon_id')
    order_amount = data.get('order_amount', 0)
    
    user_coupon = UserCoupon.query.filter_by(
        user_id=user_id,
        coupon_id=coupon_id
    ).first()
    
    if not user_coupon or user_coupon.status != 'unused':
        return jsonify({'success': False, 'error': '优惠券无效'}), 400
    
    coupon = Coupon.query.get(coupon_id)
    
    # 检查最低消费
    if order_amount < coupon.min_order_amount:
        return jsonify({
            'success': False,
            'error': f'订单金额需满{coupon.min_order_amount}元'
        }), 400
    
    # 计算折扣
    discount = min(coupon.discount_amount, order_amount)
    
    return jsonify({
        'success': True,
        'original_amount': order_amount,
        'discount': discount,
        'final_amount': order_amount - discount
    })
```

---

### 功能9：天气查询

**核心代码**：

```python
# 天气查询 (app.py:2611)
@app.route('/api/weather', methods=['GET'])
@rate_limit('weather', limit=60)
@cache_response(timeout=1800, key_prefix='weather')  # 缓存30分钟
def get_weather():
    city = request.args.get('city', '')
    if not city:
        return jsonify({'success': False, 'error': '缺少city参数'}), 400
    
    api_key = os.getenv('SENIVERSE_API_KEY', '')
    
    try:
        import requests
        
        # 1. 获取实时天气
        now_resp = requests.get(
            'https://api.seniverse.com/v3/weather/now.json',
            params={
                'key': api_key,
                'location': city,
                'language': 'zh-Hans',
                'unit': 'c'
            },
            timeout=10
        )
        
        if now_resp.status_code != 200:
            return jsonify({'success': False, 'error': '天气服务不可用'}), 500
        
        now_data = now_resp.json()['results'][0]
        
        # 2. 获取天气预报
        forecast_resp = requests.get(
            'https://api.seniverse.com/v3/weather/daily.json',
            params={
                'key': api_key,
                'location': city,
                'language': 'zh-Hans',
                'unit': 'c',
                'start': 0,
                'days': 3
            },
            timeout=10
        )
        
        forecast_data = forecast_resp.json()['results'][0]['daily']
        
        return jsonify({
            'success': True,
            'now': {
                'temperature': now_data['now']['temperature'],
                'weather': now_data['now']['text'],
                'wind': now_data['now']['wind_direction'],
                'humidity': now_data['now']['humidity']
            },
            'forecast': [{
                'date': d['date'],
                'text_day': d['text_day'],
                'text_night': d['text_night'],
                'high': d['high'],
                'low': d['low'],
                'rainfall': d['rainfall']
            } for d in forecast_data]
        })
        
    except Exception as e:
        logger.error(f"天气查询失败: {e}")
        return jsonify({'success': False, 'error': '天气服务暂时不可用'}), 500
```

---

### 功能10：客服工单系统

**核心代码**：

```python
# 提交工单 (app.py:2773)
@app.route('/api/support/tickets', methods=['POST'])
def create_support_ticket():
    user_id = get_current_user_id()
    data = request.get_json()
    
    ticket = SupportTicket(
        user_id=user_id,
        subject=data.get('subject'),
        description=data.get('description'),
        priority=data.get('priority', 'normal'),
        status='open'
    )
    db.session.add(ticket)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'ticket': ticket.to_dict()
    })

# 回复工单 (app.py:2839)
@app.route('/api/support/tickets/<int:ticket_id>/reply', methods=['POST'])
def reply_to_ticket(ticket_id):
    user_id = get_current_user_id()
    data = request.get_json()
    
    ticket = SupportTicket.query.get_or_404(ticket_id)
    if ticket.user_id != user_id:
        return jsonify({'success': False, 'error': '无权限'}), 403
    
    # 创建回复
    reply = TicketReply(
        ticket_id=ticket_id,
        user_id=user_id,
        content=data.get('content'),
        is_admin=False
    )
    db.session.add(reply)
    
    # 更新工单状态
    ticket.status = 'processing'
    db.session.commit()
    
    return jsonify({'success': True})
```

---

### 功能11-20：其他功能概览

| 功能 | 说明 | 实现方式 |
|------|------|---------|
| 11 | 用户足迹 | 访问景点时自动记录到 `user_footprint` 表 |
| 12 | 积分系统 | 用户操作增加积分，`points_history` 记录流水 |
| 13 | 邀请码 | 注册时生成唯一邀请码，支持邀请奖励 |
| 14 | 机票搜索 | 外部API代理，限流30次/分钟 |
| 15 | 酒店搜索 | 外部API代理，支持日期/人数筛选 |
| 16 | 订单管理 | `order` + `order_item` 分离，支持多种支付状态 |
| 17 | 消息通知 | `notification` 表，支持系统/订单/活动多种类型 |
| 18 | 个性化推荐 | 基于用户足迹和收藏的协同过滤 |
| 19 | 媒体服务 | `send_file()` 提供图片/文件下载 |
| 20 | 管理后台 | 管理员专属接口，支持CRUD所有数据 |

---

## 三、关键实现技术详解

### 3.1 Redis缓存装饰器

```python
# app.py:221
def cache_response(timeout=300, key_prefix='default'):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            redis_client = get_redis()
            
            # 生成缓存键
            cache_key = f"cache:{key_prefix}:{hashlib.md5(request.url.encode()).hexdigest()}"
            
            # 尝试获取缓存
            if redis_client:
                cached = redis_client.get(cache_key)
                if cached:
                    response = make_response(cached)
                    response.headers['X-Cache'] = 'HIT'
                    return response
            
            # 执行原函数
            result = f(*args, **kwargs)
            
            # 写入缓存
            if redis_client and isinstance(result, tuple):
                data, status = result
                if status == 200:
                    redis_client.setex(cache_key, timeout, data.get_data())
                return result
            
            return result
        return decorated_function
    return decorator
```

### 3.2 API限流装饰器（滑动窗口）

```python
# app.py:176
def rate_limit(limit_key='default', limit=100):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            redis_client = get_redis()
            if redis_client is None:
                return f(*args, **kwargs)
            
            # 滑动窗口限流
            key = f"ratelimit:{limit_key}:{request.remote_addr}"
            now = time.time()
            window = 60  # 1分钟窗口
            
            # 移除过期记录
            redis_client.zremrangebyscore(key, 0, now - window)
            
            # 检查是否超限
            count = redis_client.zcard(key)
            if count >= limit:
                return jsonify({
                    'error': '请求过于频繁，请稍后再试'
                }), 429
            
            # 添加新请求
            redis_client.zadd(key, {f"{now}:{random.random()}": now})
            redis_client.expire(key, window)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

### 3.3 JWT认证工具

```python
# app.py:389
def _issue_jwt(user_id: int) -> str:
    """生成JWT Token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),  # 7天有效期
        'iat': datetime.utcnow()  # 签发时间
    }
    return jwt.encode(payload, get_secret_key(), algorithm='HS256')

def _current_user_or_401():
    """获取当前用户，未登录返回401"""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        abort(401, description='请先登录')
    
    token = auth[7:]
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
        user = User.query.get(payload['user_id'])
        if not user:
            abort(401, description='用户不存在')
        return user
    except jwt.ExpiredSignatureError:
        abort(401, description='登录已过期，请重新登录')
    except jwt.InvalidTokenError:
        abort(401, description='无效的登录凭证')

def get_current_user_id():
    """获取当前用户ID"""
    return _current_user_or_401().id
```

### 3.4 全局安全头

```python
# app.py:279
@app.after_request
def add_security_headers(response):
    """为所有响应添加安全头"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

---

## 四、答辩话术模板

### 4.1 项目概述

> 我的项目是一个**AI驱动的智能旅游助手**，采用前后端分离架构。后端使用Flask框架，实现了70多个RESTful API接口，包括用户管理、景点浏览、AI智能对话、行程规划等功能。前端使用Next.js框架，为用户提供流畅的交互体验。

### 4.2 技术亮点

> 1. **AI对话系统**：采用Server-Sent Events实现流式响应，用户体验如同打字机效果。支持Kimi、智谱、OpenAI三个AI服务商，自动降级保证稳定性。
> 
> 2. **性能优化**：使用Redis实现多级缓存，热点数据缓存5分钟。API限流采用滑动窗口算法，防止恶意刷接口。
> 
> 3. **安全机制**：采用JWT实现无状态认证，密码使用PBKDF2+SHA256加密存储，全局响应添加安全头防止XSS攻击。

### 4.3 数据库设计

> 我设计了15张数据表，包括用户表、景点表、行程表、收藏表、游记表等。关键表之间通过外键关联，重要查询字段都添加了索引，如城市、评分、价格等，保证查询效率。

---

**文档结束**

本文档详细说明了项目中所有20个功能的实现流程，核心代码可直接用于论文或答辩展示。
