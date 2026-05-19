package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

// main 是AI服务的入口函数
// 功能：初始化日志、Redis连接、AI配置，启动HTTP服务器
func main() {
	// ========== 日志配置部分 ==========
	
	// 创建新的logrus日志实例
	logger := logrus.New()
	// 设置日志格式为JSON格式（便于日志收集系统解析）
	logger.SetFormatter(&logrus.JSONFormatter{})
	// 设置日志输出到标准输出（控制台）
	logger.SetOutput(os.Stdout)

	// ========== Redis连接配置部分 ==========
	
	// 从环境变量获取Redis地址，如果不存在则使用默认值"localhost:6379"
	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	// 从环境变量获取Redis密码，如果不存在则使用空字符串
	redisPassword := getEnv("REDIS_PASSWORD", "")
	
	// 创建Redis客户端实例
	// Addr: Redis服务器地址
	// Password: Redis访问密码
	// DB: 使用的数据库编号（0表示默认数据库）
	client := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       0,
	})

	// 创建上下文对象，用于Redis操作
	ctx := context.Background()
	// 测试Redis连接是否正常
	// Ping()方法会向Redis发送PING命令，检查连接状态
	if _, err := client.Ping(ctx).Result(); err != nil {
		// 如果连接失败，记录警告日志，但不中断程序（将使用内存存储作为降级方案）
		logger.Warnf("Redis 连接失败: %v，将使用内存存储", err)
	}

	// ========== AI提供商配置部分 ==========
	
	// 从环境变量获取AI提供商类型，默认使用"mimo"（MiMo模型）
	aiProvider := getEnv("AI_PROVIDER", "mimo")
	// 从环境变量获取AI API密钥
	aiAPI := getEnv("AI_API_KEY", "")
	// 如果AI_API_KEY为空，尝试使用旧的MOONSHOT_API_KEY（向后兼容）
	if aiAPI == "" {
		// 兼容旧版本的环境变量名
		aiAPI = getEnv("MOONSHOT_API_KEY", "")
	}
	// 如果API密钥仍然为空，记录警告（对话功能将受限）
	if aiAPI == "" {
		logger.Warn("未设置 AI_API_KEY，对话功能将受限")
	}

	// ========== 模型名称覆盖配置 ==========
	
	// 允许通过环境变量覆盖默认模型名称
	if model := getEnv("AI_MODEL", ""); model != "" {
		// 如果设置了AI_MODEL环境变量，则覆盖全局变量AIModelOverride
		AIModelOverride = model
	}

	// ========== 创建AI服务实例 ==========
	
	// 创建Service结构体实例，传入日志器、Redis客户端、AI提供商和API密钥
	service := NewService(logger, client, aiProvider, aiAPI)

	// ========== Gin路由配置部分 ==========
	
	// 设置Gin框架为发布模式（减少调试输出，提高性能）
	gin.SetMode(gin.ReleaseMode)
	// 创建新的Gin路由引擎
	r := gin.New()
	// 使用Gin的异常恢复中间件（捕获panic，防止程序崩溃）
	r.Use(gin.Recovery())
	// 配置CORS（跨域资源共享）中间件，允许前端跨域访问
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},                                      // 允许所有来源（生产环境应限制具体域名）
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}, // 允许的HTTP方法
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"}, // 允许的请求头
		ExposeHeaders:    []string{"Content-Length"},                         // 暴露给客户端的响应头
		AllowCredentials: true,                                                // 允许携带凭证（如Cookies）
		MaxAge:           12 * time.Hour,                                      // 预检请求缓存时间
	}))

	// ========== 健康检查端点 ==========
	
	// 定义健康检查接口，用于监控服务运行状态
	r.GET("/health", func(c *gin.Context) {
		// 返回JSON格式的健康状态信息
		c.JSON(http.StatusOK, gin.H{
			"status":      "ok",                            // 服务状态：正常
			"timestamp":   time.Now().Unix(),               // 当前时间戳
			"service":     "ai-service",                    // 服务名称
			"ai_provider": aiProvider,                      // 当前使用的AI提供商
		})
	})

	// ========== API路由配置 ==========
	
	// 创建API路由组，所有接口都以/api开头
	api := r.Group("/api")
	// 设置AI服务的路由（对话、意图识别、行程规划等）
	service.SetupRoutes(api)

	// ========== 启动HTTP服务器 ==========
	
	// 从环境变量获取监听端口，默认8080
	port := getEnv("PORT", "8080")
	// 记录启动日志，显示使用的AI模型和下划线端口
	logger.Infof("AI 服务启动中，使用 %s 模型，监听端口: %s", aiProvider, port)
	// 启动HTTP服务器，监听指定端口
	// 如果启动失败（如端口被占用），记录致命错误并退出程序
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

// getEnv 辅助函数：获取环境变量值，如果不存在则返回默认值
// 参数：
//   - key: 环境变量名称
//   - defaultValue: 默认值（当环境变量不存在时使用）
// 返回：
//   - 环境变量的值或默认值
func getEnv(key, defaultValue string) string {
	// 尝试从环境变量中读取指定键的值
	if value := os.Getenv(key); value != "" {
		// 如果环境变量存在且不为空，返回其值
		return value
	}
	// 如果环境变量不存在或为空，返回默认值
	return defaultValue
}
