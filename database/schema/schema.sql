-- 智能旅游助手数据库架构设计
-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    nickname VARCHAR(50),
    avatar_url VARCHAR(500),
    password_hash VARCHAR(255) NOT NULL,
    membership_level TINYINT DEFAULT 1 COMMENT '会员等级：1-普通，2-银卡，3-金卡，4-钻石',
    preferences JSON COMMENT '用户偏好设置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_membership_level (membership_level),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 产品表（多态设计）
CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('flight', 'hotel', 'ticket', 'experience') NOT NULL COMMENT '产品类型',
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL COMMENT '现价',
    original_price DECIMAL(10,2) COMMENT '原价',
    inventory INT DEFAULT 0 COMMENT '库存数量',
    tags JSON COMMENT '标签数组',
    metadata JSON COMMENT '类型特定字段',
    status ENUM('active', 'inactive', 'sold_out', 'deleted') DEFAULT 'active',
    images JSON COMMENT '图片URL数组',
    location JSON COMMENT '位置信息',
    rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '评分',
    review_count INT DEFAULT 0 COMMENT '评论数量',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    sales_count INT DEFAULT 0 COMMENT '销售数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_price (price),
    INDEX idx_rating (rating),
    INDEX idx_review_count (review_count),
    INDEX idx_location_city ((location->>'city')),
    INDEX idx_created_at (created_at),
    INDEX idx_tags ((tags))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 行程表
CREATE TABLE itineraries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days JSON NOT NULL COMMENT '每日行程安排',
    budget DECIMAL(12,2) COMMENT '预算',
    tags JSON COMMENT '标签数组',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
    is_template BOOLEAN DEFAULT FALSE COMMENT '是否为模板',
    template_category VARCHAR(50) COMMENT '模板分类',
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_is_public (is_public),
    INDEX idx_is_template (is_template),
    INDEX idx_created_at (created_at),
    INDEX idx_tags ((tags))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 订单表
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    order_no VARCHAR(32) UNIQUE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled', 'completed', 'refunded') DEFAULT 'pending',
    payment_method ENUM('alipay', 'wechat', 'credit_card', 'bank_transfer') COMMENT '支付方式',
    payment_time TIMESTAMP NULL COMMENT '支付时间',
    payment_no VARCHAR(100) COMMENT '支付流水号',
    cancelled_reason TEXT COMMENT '取消原因',
    refund_amount DECIMAL(12,2) COMMENT '退款金额',
    refund_time TIMESTAMP NULL COMMENT '退款时间',
    refund_reason TEXT COMMENT '退款原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_order_no (order_no),
    INDEX idx_status (status),
    INDEX idx_payment_time (payment_time),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 订单项表
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_type ENUM('flight', 'hotel', 'ticket', 'experience') NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    booking_details JSON COMMENT '预订详情',
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- AI对话历史表
CREATE TABLE ai_conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(50) COMMENT '意图识别结果',
    metadata JSON COMMENT '额外元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at),
    INDEX idx_intent (intent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 用户收藏表
CREATE TABLE user_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 用户足迹表
CREATE TABLE user_footprints (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    view_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    view_duration INT DEFAULT 0 COMMENT '浏览时长（秒）',
    action_type ENUM('view', 'click', 'search', 'book') DEFAULT 'view',
    metadata JSON COMMENT '额外信息',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_action_type (action_type),
    INDEX idx_view_time (view_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 产品评价表
CREATE TABLE product_reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    rating TINYINT NOT NULL COMMENT '评分1-5',
    content TEXT COMMENT '评价内容',
    images JSON COMMENT '图片URL数组',
    is_verified BOOLEAN DEFAULT FALSE COMMENT '是否已验证',
    is_anonymous BOOLEAN DEFAULT FALSE COMMENT '是否匿名',
    helpful_count INT DEFAULT 0 COMMENT '有用数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at),
    INDEX idx_is_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 推荐记录表
CREATE TABLE recommendations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type ENUM('product', 'destination', 'itinerary') NOT NULL,
    target_id BIGINT NOT NULL,
    score DECIMAL(5,4) NOT NULL COMMENT '推荐分数',
    reason VARCHAR(500) COMMENT '推荐原因',
    is_clicked BOOLEAN DEFAULT FALSE COMMENT '是否被点击',
    is_booked BOOLEAN DEFAULT FALSE COMMENT '是否被预订',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_target_id (target_id),
    INDEX idx_score (score),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 搜索日志表
CREATE TABLE search_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    keywords VARCHAR(500) NOT NULL,
    filters JSON COMMENT '搜索条件',
    result_count INT DEFAULT 0,
    execution_time INT COMMENT '执行时间（毫秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_keywords (keywords),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 系统配置表
CREATE TABLE system_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 知识库表
CREATE TABLE knowledge_base (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tags JSON,
    source VARCHAR(100) COMMENT '来源',
    author VARCHAR(100) COMMENT '作者',
    view_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at),
    INDEX idx_tags ((tags))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 通知记录表
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type ENUM('system', 'booking', 'payment', 'promotion', 'service') NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    channel ENUM('app', 'sms', 'email', 'wechat') DEFAULT 'app',
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    send_time TIMESTAMP NULL COMMENT '发送时间',
    read_time TIMESTAMP NULL COMMENT '阅读时间',
    metadata JSON COMMENT '额外信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 支付记录表
CREATE TABLE payment_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    payment_method ENUM('alipay', 'wechat', 'credit_card', 'bank_transfer') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100) COMMENT '交易流水号',
    callback_data JSON COMMENT '回调数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 创建一些索引优化查询性能
CREATE INDEX idx_products_search ON products(
    type,
    status,
    (location->>'city'),
    price,
    rating,
    review_count
);
CREATE INDEX idx_orders_user_status ON orders(
    user_id,
    status,
    created_at
);
CREATE INDEX idx_itineraries_user_dates ON itineraries(
    user_id,
    start_date,
    end_date
);
-- 创建全文搜索索引（如果使用MySQL 5.7+）
-- ALTER TABLE products ADD FULLTEXT INDEX ft_search(name, description, tags);
-- 创建向量搜索表（如果使用Milvus等向量数据库）
/*
CREATE TABLE vector_embeddings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    entity_type ENUM('product', 'knowledge', 'user') NOT NULL,
    entity_id BIGINT NOT NULL,
    vector_data JSON NOT NULL COMMENT '向量数据',
    metadata JSON COMMENT '元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/