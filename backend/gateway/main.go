package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"  // 提供反向代理功能
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// ============== 数据结构定义 ==============

// Config 存储网关的配置信息
type Config struct {
	Port        int                // 网关监听的端口号
	ServiceURLs map[string]string // 微服务名称到URL的映射表
}

// Gateway 网关的核心结构体
type Gateway struct {
	config     *Config           // 网关配置
	logger     *logrus.Logger   // 日志器
	router     *gin.Engine      // Gin路由引擎
	httpServer *http.Server     // HTTP服务器实例
}

// ============== 构造函数 ==============

// NewGateway 创建新的网关实例
// 功能：初始化日志、创建路由引擎、配置中间件
// 参数：
//   - config: 网关配置（包含端口和各微服务的URL）
// 返回：
//   - 初始化完成的Gateway实例指针
func NewGateway(config *Config) *Gateway {
	// 创建新的logrus日志实例
	logger := logrus.New()
	// 设置日志格式为文本格式（带完整时间戳）
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,  // 显示完整时间戳
	})
	// 设置日志级别为Info（只记录Info及以上级别的日志）
	logger.SetLevel(logrus.InfoLevel)

	// 创建Gin路由引擎（使用New()而不是Default()，避免默认的日志和恢复中间件）
	router := gin.New()
	// 使用Gin的异常恢复中间件（捕获panic，防止程序崩溃）
	router.Use(gin.Recovery())
	// 使用自定义的CORS中间件（解决跨域问题）
	router.Use(corsMiddleware())
	// 使用自定义的日志中间件（记录每个HTTP请求的详细信息）
	router.Use(loggingMiddleware(logger))

	// 返回初始化完成的Gateway实例
	return &Gateway{
		config: config,
		logger: logger,
		router: router,
	}
}

// ============== 路由设置 ==============

// SetupRoutes 设置网关的所有路由
// 功能：配置API路由，将不同路径的请求代理到对应的微服务
func (g *Gateway) SetupRoutes() {
	// ========== 健康检查端点 ==========
	// 用于监控服务状态、负载均衡器健康检查
	g.router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",                          // 服务状态：正常
			"message": "Gateway is running",          // 状态消息
			"time":    time.Now().Format(time.RFC3339), // 当前时间（ISO 8601格式）
		})
	})

	// ========== API路由组 ==========
	// 所有API接口都以"/api"为前缀
	api := g.router.Group("/api")
	{
		// ========== 产品服务代理 ==========
		// 产品服务处理景点、酒店、机票等产品数据
		productGroup := api.Group("")
		// 代理到product-service的/destinations端点
		productGroup.Any("/destinations", g.proxyToService("product-service", ""))
		// 代理到product-service的/destinations/:id端点（景点详情）
		productGroup.Any("/destinations/:id", g.proxyToService("product-service", ""))
		// 代理到product-service的/products端点
		productGroup.Any("/products", g.proxyToService("product-service", ""))
		// 代理到product-service的/products/:id端点（产品详情）
		productGroup.Any("/products/:id", g.proxyToService("product-service", ""))

		// ========== 用户服务代理 ==========
		// 用户服务处理用户注册、登录、个人信息等
		// 注意：需要strip前缀"/api/users"，因为用户服务的路由已经包含了"/api/users"
		userGroup := api.Group("/users")
		// 将/api/users/*path的请求代理到user-service的/api/users/*path
		userGroup.Any("/*path", g.proxyToService("user-service", "/api/users"))

		// ========== 收藏服务代理 ==========
		// 收藏功能在用户服务中，但需要单独的路由
		api.Any("/favorites", g.proxyToService("user-service", "/api/favorites"))
		api.Any("/favorites/*path", g.proxyToService("user-service", "/api/favorites"))

		// ========== 订单服务代理 ==========
		// 订单服务处理订单创建、支付、取消、退款等
		orderGroup := api.Group("/orders")
		// 将/api/orders/*path的请求代理到order-service的/api/orders/*path
		orderGroup.Any("/*path", g.proxyToService("order-service", "/api/orders"))

		// ========== AI服务代理 ==========
		// AI服务处理对话、意图识别、行程规划等
		aiGroup := api.Group("/ai")
		{
			// 注意：具体路由必须先注册，通配符路由后注册
			// 这是因为Gin的路由匹配规则：先注册的路由优先匹配
			aiGroup.Any("/chat", g.proxyToService("ai-service", "/api/ai"))
			// 注意：这里应该使用通配符来匹配所有AI相关的请求
			// 但原代码中只注册了"/chat"端点，可能需要补充
		}

		// ========== 推荐服务代理 ==========
		// 推荐服务处理个性化推荐、热门推荐等
		recommendGroup := api.Group("/recommendations")
		// 将/api/recommendations/*path代理到recommend-service
		recommendGroup.Any("/*path", g.proxyToService("recommend-service", "/api/recommendations"))

		// ========== 通知服务代理 ==========
		// 通知服务处理消息推送、邮件发送等
		notificationGroup := api.Group("/notifications")
		// 将/api/notifications/*path代理到notification-service
		notificationGroup.Any("/*path", g.proxyToService("notification-service", "/api/notifications"))

		// ========== 统计端点（临时实现） ==========
		// 用于获取各类数据的统计信息（待实现真正的统计逻辑）
		api.GET("/stats", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"stats": gin.H{
					"destinations": 0,  // 景点数量（待实现）
					"users":        0,  // 用户数量（待实现）
					"trips":        0,  // 行程数量（待实现）
					"comments":     0,  // 评论数量（待实现）
					"orders":       0,  // 订单数量（待实现）
					"footprints":   0,  // 足迹数量（待实现）
					"pages":        0,  // 页面访问量（待实现）
					"notifications": 0,  // 通知数量（待实现）
				},
			})
		})
	}
}

// ============== 反向代理核心函数 ==============

// proxyToService 创建一个Gin中间件，用于将请求代理到指定的微服务
// 参数：
//   - serviceName: 微服务名称（如"user-service"）
//   - stripPrefix: 需要剥离的路径前缀（用于避免路径重复）
// 返回：
//   - Gin处理函数（中间件）
func (g *Gateway) proxyToService(serviceName string, stripPrefix string) gin.HandlerFunc {
	// 返回闭包函数（Gin的中间件签名）
	return func(c *gin.Context) {
		// 从配置中获取微服务的URL
		serviceURL, exists := g.config.ServiceURLs[serviceName]
		if !exists {
			// 如果配置中不存在该服务，返回404错误
			g.logger.Errorf("Service %s not found", serviceName)
			c.JSON(http.StatusNotFound, gin.H{
				"error": fmt.Sprintf("Service %s not found", serviceName),
			})
			return
		}

		// 解析微服务的URL
		target, err := url.Parse(serviceURL)
		if err != nil {
			// 如果URL格式错误，返回500错误
			g.logger.Errorf("Invalid service URL: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid service configuration",
			})
			return
		}

		// ========== 创建反向代理 ==========
		// httputil.NewSingleHostReverseProxy 创建一个反向代理，将请求转发到目标URL
		proxy := httputil.NewSingleHostReverseProxy(target)
		
		// 保存原始请求路径（用于日志记录）
		originalPath := c.Request.URL.Path
		
		// ========== 路径前缀处理 ==========
		// 如果指定了stripPrefix，则从请求路径中移除该前缀
		// 这用于避免路径重复（如网关的路径已经包含了"/api/users"，微服务也有"/api/users"）
		if stripPrefix != "" {
			// 使用strings.Replace将第一个匹配的前缀替换为空字符串
			c.Request.URL.Path = strings.Replace(c.Request.URL.Path, stripPrefix, "", 1)
		}
		
		// ========== 设置代理请求的参数 ==========
		// 设置请求的目标主机（如"localhost:8081"）
		c.Request.URL.Host = target.Host
		// 设置请求的协议（如"http"或"https"）
		c.Request.URL.Scheme = target.Scheme
		
		// ========== 记录代理日志 ==========
		// 记录请求被代理到哪里（用于调试和监控）
		g.logger.Infof("Proxying %s %s -> %s%s", 
			c.Request.Method,    // HTTP方法（GET/POST等）
			originalPath,       // 原始请求路径
			serviceURL,         // 目标服务URL
			c.Request.URL.Path, // 代理后的路径
		)

		// ========== 执行代理请求 ==========
		// 将请求转发到目标微服务，并将响应返回给客户端
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

// ============== 网关启停管理 ==============

// Start 启动网关服务器
// 返回：
//   - 错误信息（如果启动失败）
func (g *Gateway) Start() error {
	// 设置路由（如果尚未设置）
	g.SetupRoutes()

	// 构建监听地址（如":8080"）
	addr := fmt.Sprintf(":%d", g.config.Port)
	// 创建HTTP服务器实例
	g.httpServer = &http.Server{
		Addr:    addr,      // 监听地址
		Handler: g.router, // 使用Gin路由引擎作为请求处理器
	}

	// 记录启动日志
	g.logger.Infof("Starting gateway on port %d", g.config.Port)
	// 启动HTTP服务器（阻塞调用，直到服务器停止）
	return g.httpServer.ListenAndServe()
}

// Stop 优雅地停止网关服务器
// 功能：等待现有请求完成后再关闭服务器
// 返回：
//   - 错误信息（如果停止失败）
func (g *Gateway) Stop() error {
	// 创建带超时的上下文（10秒超时）
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()  // 确保上下文被释放

	// 优雅关闭HTTP服务器（等待现有请求完成）
	return g.httpServer.Shutdown(ctx)
}

// ============== 中间件定义 ==============

// corsMiddleware CORS（跨域资源共享）中间件
// 功能：允许前端应用从不同域名访问API
// 返回：
//   - Gin处理函数（中间件）
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 设置CORS响应头
		c.Header("Access-Control-Allow-Origin", "*")                       // 允许所有来源（生产环境应限制具体域名）
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS") // 允许的HTTP方法
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")      // 允许的请求头
		c.Header("Access-Control-Max-Age", "86400")                               // 预检请求缓存时间（24小时）

		// 处理预检请求（OPTIONS方法）
		if c.Request.Method == "OPTIONS" {
			// 返回204 No Content（无响应体）
			c.AbortWithStatus(204)
			return
		}

		// 继续处理下一个中间件或路由处理函数
		c.Next()
	}
}

// loggingMiddleware 请求日志中间件
// 功能：记录每个HTTP请求的详细信息（方法、路径、状态码、耗时等）
// 参数：
//   - logger: 日志器实例
// 返回：
//   - Gin处理函数（中间件）
func loggingMiddleware(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录请求开始时间
		start := time.Now()

		// 继续处理下一个中间件或路由处理函数
		c.Next()

		// 请求处理完成后，计算耗时
		duration := time.Since(start)
		// 获取HTTP响应状态码
		status := c.Writer.Status()

		// 使用logrus的WithFields记录结构化日志
		logger.WithFields(logrus.Fields{
			"method":     c.Request.Method,         // HTTP方法（GET/POST等）
			"path":       c.Request.URL.Path,       // 请求路径
			"status":     status,                   // HTTP状态码
			"duration":   duration,                // 请求耗时
			"ip":         c.ClientIP(),             // 客户端IP地址
			"user_agent": c.Request.UserAgent(),    // 用户代理（浏览器信息）
		}).Info("HTTP request")  // 日志消息
	}
}

// ============== 程序入口 ==============

// main 网关程序的入口函数
func main() {
	// ========== 配置初始化 ==========
	// 创建网关配置，指定端口和各微服务的URL
	config := &Config{
		Port: 8080,  // 网关监听端口
		ServiceURLs: map[string]string{
			"user-service":       "http://localhost:8081",  // 用户服务地址
			"product-service":    "http://localhost:8082",  // 产品服务地址
			"order-service":      "http://localhost:8083",  // 订单服务地址
			"ai-service":         "http://localhost:8084",  // AI服务地址
			"recommend-service":  "http://localhost:8085",  // 推荐服务地址
			"notification-service": "http://localhost:8086",  // 通知服务地址
		},
	}

	// ========== 创建并启动网关 ==========
	// 创建网关实例
	gateway := NewGateway(config)
	// 启动网关服务器（阻塞调用）
	if err := gateway.Start(); err != nil {
		// 如果启动失败，记录致命错误并退出程序
		logrus.Fatal(err)
	}
}
