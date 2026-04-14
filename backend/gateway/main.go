package main

import (
    "context"
    "fmt"
    "net/http"
    "net/http/httputil"
    "net/url"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/sirupsen/logrus"
)

type Config struct {
    Port        int
    ServiceURLs map[string]string
}

type Gateway struct {
    config     *Config
    logger     *logrus.Logger
    router     *gin.Engine
    httpServer *http.Server
}

func NewGateway(config *Config) *Gateway {
    logger := logrus.New()
    logger.SetFormatter(&logrus.TextFormatter{
        FullTimestamp: true,
    })
    logger.SetLevel(logrus.InfoLevel)

    router := gin.New()
    router.Use(gin.Recovery())
    router.Use(corsMiddleware())
    router.Use(loggingMiddleware(logger))

    return &Gateway{
        config: config,
        logger: logger,
        router: router,
    }
}

func (g *Gateway) SetupRoutes() {
    // Health check
    g.router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":  "ok",
            "message": "Gateway is running",
            "time":    time.Now().Format(time.RFC3339),
        })
    })

    // API routes proxy
    api := g.router.Group("/api")
    {
        // Product service proxy (景点数据)
        productGroup := api.Group("")
        productGroup.Any("/destinations", g.proxyToService("product-service"))
        productGroup.Any("/destinations/:id", g.proxyToService("product-service"))
        productGroup.Any("/products", g.proxyToService("product-service"))
        productGroup.Any("/products/:id", g.proxyToService("product-service"))

        // User service proxy
        userGroup := api.Group("/users")
        userGroup.Any("/*path", g.proxyToService("user-service"))

        // Favorites proxy
        api.Any("/favorites", g.proxyToService("user-service"))
        api.Any("/favorites/*path", g.proxyToService("user-service"))

        // Order service proxy
        orderGroup := api.Group("/orders")
        orderGroup.Any("/*path", g.proxyToService("order-service"))

		// AI service proxy
		aiGroup := api.Group("/ai")
		{
			// 具体路由必须先注册，通配符路由后注册
			aiGroup.Any("/chat", g.proxyToService("ai-service"))

		}

        // Recommendation service proxy
        recommendGroup := api.Group("/recommendations")
        recommendGroup.Any("/*path", g.proxyToService("recommend-service"))

        // Notification service proxy
        notificationGroup := api.Group("/notifications")
        notificationGroup.Any("/*path", g.proxyToService("notification-service"))
    }
}

func (g *Gateway) proxyToService(serviceName string) gin.HandlerFunc {
    return func(c *gin.Context) {
        serviceURL, exists := g.config.ServiceURLs[serviceName]
        if !exists {
            g.logger.Errorf("Service %s not found", serviceName)
            c.JSON(http.StatusNotFound, gin.H{
                "error": fmt.Sprintf("Service %s not found", serviceName),
            })
            return
        }

        target, err := url.Parse(serviceURL)
        if err != nil {
            g.logger.Errorf("Invalid service URL: %v", err)
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": "Invalid service configuration",
            })
            return
        }

        // 创建反向代理
        proxy := httputil.NewSingleHostReverseProxy(target)
        
        // 修改请求路径
        originalPath := c.Request.URL.Path
        c.Request.URL.Host = target.Host
        c.Request.URL.Scheme = target.Scheme
        
        g.logger.Infof("Proxying %s %s -> %s%s", 
            c.Request.Method, originalPath, serviceURL, c.Request.URL.Path)

        // 代理请求
        proxy.ServeHTTP(c.Writer, c.Request)
    }
}

func (g *Gateway) Start() error {
    g.SetupRoutes()

    addr := fmt.Sprintf(":%d", g.config.Port)
    g.httpServer = &http.Server{
        Addr:    addr,
        Handler: g.router,
    }

    g.logger.Infof("Starting gateway on port %d", g.config.Port)
    return g.httpServer.ListenAndServe()
}

func (g *Gateway) Stop() error {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    return g.httpServer.Shutdown(ctx)
}

func corsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        c.Header("Access-Control-Max-Age", "86400")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}

func loggingMiddleware(logger *logrus.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()

        c.Next()

        duration := time.Since(start)
        status := c.Writer.Status()

        logger.WithFields(logrus.Fields{
            "method":     c.Request.Method,
            "path":       c.Request.URL.Path,
            "status":     status,
            "duration":   duration,
            "ip":         c.ClientIP(),
            "user_agent": c.Request.UserAgent(),
        }).Info("HTTP request")
    }
}

func main() {
    config := &Config{
        Port: 8080,
        ServiceURLs: map[string]string{
            "user-service":        "http://localhost:8081",
            "product-service":     "http://localhost:8082",
            "order-service":       "http://localhost:8083",
            "ai-service":          "http://localhost:8084",
            "recommend-service":   "http://localhost:8085",
            "notification-service": "http://localhost:8086",
        },
    }

    gateway := NewGateway(config)
    if err := gateway.Start(); err != nil {
        logrus.Fatal(err)
    }
}