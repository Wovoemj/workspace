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

func main() {
	// 日志配置
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetOutput(os.Stdout)

	// Redis 连接
	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	redisPassword := getEnv("REDIS_PASSWORD", "")
	
	client := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       0,
	})

	ctx := context.Background()
	if _, err := client.Ping(ctx).Result(); err != nil {
		logger.Warnf("Redis 连接失败: %v，将使用内存存储", err)
	}

	// AI 提供商配置（默认 MiMo）
	aiProvider := getEnv("AI_PROVIDER", "mimo")
	aiAPI := getEnv("AI_API_KEY", "")
	if aiAPI == "" {
		// 兼容旧的 MOONSHOT_API_KEY
		aiAPI = getEnv("MOONSHOT_API_KEY", "")
	}
	if aiAPI == "" {
		logger.Warn("未设置 AI_API_KEY，对话功能将受限")
	}

	// 环境变量覆盖模型名
	if model := getEnv("AI_MODEL", ""); model != "" {
		AIModelOverride = model
	}

	// 创建服务
	service := NewService(logger, client, aiProvider, aiAPI)

	// Gin 路由
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":       "ok",
			"timestamp":    time.Now().Unix(),
			"service":      "ai-service",
			"ai_provider":  aiProvider,
		})
	})

	// API 路由
	api := r.Group("/api")
	service.SetupRoutes(api)

	// 启动服务
	port := getEnv("PORT", "8080")
	logger.Infof("AI 服务启动中，使用 %s 模型，监听端口: %s", aiProvider, port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
