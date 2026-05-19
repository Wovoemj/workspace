package order

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"  // 用于密码哈希（虽然此文件中未使用，但可能是预留）
	"gorm.io/gorm"
)

// ============== 服务结构体定义 ==============

// Service 订单服务的核心结构体
type Service struct {
	db     *gorm.DB      // 数据库连接（使用GORM）
	logger *logrus.Logger // 日志器
}

// ============== 数据模型定义 ==============

// Order 订单主表模型
type Order struct {
	ID           uint      `json:"id" gorm:"primaryKey"`  // 订单ID（主键）
	UserID       uint      `json:"user_id" gorm:"not null"` // 用户ID（外键）
	OrderNo      string    `json:"order_no" gorm:"unique;not null"` // 订单号（唯一）
	TotalAmount  float64   `json:"total_amount" gorm:"not null"` // 订单总金额
	Status       string    `json:"status" gorm:"not null"` // 订单状态（pending待支付/paid已支付/cancelled已取消/refunded已退款）
	PaymentMethod string   `json:"payment_method"` // 支付方式（如"alipay"、"wechat"）
	PaymentTime  *time.Time `json:"payment_time"` // 支付时间（指针类型，允许为nil）
	CancelledReason *string `json:"cancelled_reason"` // 取消原因
	RefundAmount *float64  `json:"refund_amount"` // 退款金额
	RefundTime   *time.Time `json:"refund_time"` // 退款时间
	RefundReason *string   `json:"refund_reason"` // 退款原因
	CreatedAt    time.Time `json:"created_at"` // 创建时间
	UpdatedAt    time.Time `json:"updated_at"` // 更新时间
	
	// ========== 关联模型 ==========
	// User 关联的用户信息（GORM会基于UserID自动关联）
	User         User       `json:"user" gorm:"foreignKey:UserID"`
	// Items 关联的订单项列表（一个订单可以有多个订单项）
	Items        []OrderItem `json:"items" gorm:"foreignKey:OrderID"`
}

// User 用户模型（简化版，仅用于订单服务中的关联查询）
type User struct {
	gorm.Model              // 嵌入GORM的基础模型（包含ID、CreatedAt、UpdatedAt、DeletedAt）
	Phone         string `json:"phone" gorm:"unique;not null"` // 手机号（唯一）
	Email         string `json:"email"`                         // 邮箱
	Nickname      string `json:"nickname"`                     // 昵称
	AvatarURL     string `json:"avatar_url"`                   // 头像URL
	MembershipLevel int  `json:"membership_level"`             // 会员等级
}

// OrderItem 订单项模型（一个订单包含多个订单项）
type OrderItem struct {
	ID           uint    `json:"id" gorm:"primaryKey"` // 订单项ID
	OrderID      uint    `json:"order_id" gorm:"not null"` // 关联的订单ID
	ProductID    uint    `json:"product_id" gorm:"not null"` // 产品ID
	ProductName  string  `json:"product_name"`                 // 产品名称（冗余存储，避免频繁关联查询）
	ProductType  string  `json:"product_type"`                 // 产品类型（如"hotel"、"flight"、"ticket"）
	Quantity     int     `json:"quantity"`                     // 数量
	UnitPrice    float64 `json:"unit_price"`                   // 单价
	TotalPrice   float64 `json:"total_price"`                  // 总价（Quantity * UnitPrice）
	BookingDetails json.RawMessage `json:"booking_details" gorm:"type:json"` // 预订详情（JSON格式，存储特定产品的预订信息）
	Status       string  `json:"status"`                       // 订单项状态（pending/confirmed/cancelled）
	CreatedAt    time.Time `json:"created_at"`                // 创建时间
	UpdatedAt    time.Time `json:"updated_at"`                // 更新时间
}

// ============== 请求结构体定义 ==============

// CreateOrderRequest 创建订单的请求体
type CreateOrderRequest struct {
	UserID       uint                 `json:"user_id" binding:"required"` // 用户ID（必填）
	Items        []CreateOrderItem    `json:"items" binding:"required,min=1"` // 订单项列表（必填，至少1项）
	PaymentMethod string              `json:"payment_method"` // 支付方式（可选）
}

// CreateOrderItem 创建订单项的结构体
type CreateOrderItem struct {
	ProductID    uint                 `json:"product_id" binding:"required"` // 产品ID（必填）
	Quantity     int                  `json:"quantity" binding:"required,min=1"` // 数量（必填，至少1）
	BookingDetails json.RawMessage     `json:"booking_details"` // 预订详情（如酒店入住日期、航班日期等）
}

// PaymentRequest 支付订单的请求体
type PaymentRequest struct {
	OrderID      uint    `json:"order_id" binding:"required"` // 订单ID（必填）
	PaymentMethod string `json:"payment_method" binding:"required"` // 支付方式（必填）
}

// CancelRequest 取消订单的请求体
type CancelRequest struct {
	OrderID        uint   `json:"order_id" binding:"required"` // 订单ID（必填）
	CancelledReason string `json:"cancelled_reason" binding:"required"` // 取消原因（必填）
}

// RefundRequest 退款的请求体
type RefundRequest struct {
	OrderID        uint    `json:"order_id" binding:"required"` // 订单ID（必填）
	RefundAmount   float64 `json:"refund_amount"`                // 退款金额（可选，默认退全部）
	RefundReason   string  `json:"refund_reason" binding:"required"` // 退款原因（必填）
}

// ============== 构造函数 ==============

// NewService 创建新的订单服务实例
// 参数：
//   - db: GORM数据库连接实例
//   - logger: 日志器实例
// 返回：
//   - 初始化完成的Service实例指针
func NewService(db *gorm.DB, logger *logrus.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
	}
}

// ============== 路由设置 ==============

// SetupRoutes 设置订单服务的所有API路由
// 参数：
//   - router: Gin路由组实例
func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	// 创建订单路由组，路径前缀为"/orders"
	orders := router.Group("/orders")
	{
		// 创建订单（POST /orders）
		orders.POST("", s.CreateOrder)
		// 获取指定用户的订单列表（GET /orders/user/:user_id）
		orders.GET("/user/:user_id", s.GetUserOrders)
		// 获取订单详情（GET /orders/:id）
		orders.GET("/:id", s.GetOrder)
		// 支付订单（PUT /orders/:id/pay）
		orders.PUT("/:id/pay", s.PayOrder)
		// 取消订单（PUT /orders/:id/cancel）
		orders.PUT("/:id/cancel", s.CancelOrder)
		// 退款（PUT /orders/:id/refund）
		orders.PUT("/:id/refund", s.RefundOrder)
		// 获取订单状态（GET /orders/:id/status）
		orders.GET("/:id/status", s.GetOrderStatus)
	}
}

// ============== 订单创建功能 ==============

// CreateOrder 创建新订单
// 功能：接收订单信息，创建订单主记录和订单项，扣减库存，使用事务保证数据一致性
func (s *Service) CreateOrder(c *gin.Context) {
	// 解析请求体中的JSON数据到CreateOrderRequest结构体
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果请求格式错误，返回400错误
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ========== 生成订单号 ==========
	// 订单号格式：TR + 日期（YYYYMMDD）+ 纳秒时间戳的后4位
	// 例如：TR202305171234
	orderNo := fmt.Sprintf("TR%s%d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)

	// ========== 计算订单总金额 ==========
	var totalAmount float64
	// 创建订单项数组（长度等于请求中的订单项数量）
	orderItems := make([]OrderItem, len(req.Items))
	
	// ========== 遍历订单项，计算金额并检查库存 ==========
	for i, item := range req.Items {
		// 定义临时结构体，用于接收产品查询结果
		var product struct {
			ID       uint
			Name     string
			Type     string
			Price    float64
			Inventory int
		}
		
		// 从数据库查询产品信息
		if err := s.db.First(&product, item.ProductID).Error; err != nil {
			// 如果产品不存在，返回404错误
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Product %d not found", item.ProductID)})
			return
		}

		// ========== 检查库存是否充足 ==========
		if product.Inventory < item.Quantity {
			// 如果库存不足，返回400错误
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Product %d inventory not enough", item.ProductID)})
			return
		}

		// ========== 计算订单项总价 ==========
		totalPrice := float64(item.Quantity) * product.Price
		// 构建订单项结构体
		orderItems[i] = OrderItem{
			ProductID:    item.ProductID,    // 产品ID
			ProductName:  product.Name,      // 产品名称（从数据库查询得到）
			ProductType:  product.Type,      // 产品类型
			Quantity:     item.Quantity,     // 数量
			UnitPrice:    product.Price,     // 单价
			TotalPrice:   totalPrice,        // 总价
			BookingDetails: item.BookingDetails, // 预订详情（如酒店日期、航班信息等）
			Status:       "pending",         // 初始状态：待确认
		}
		
		// 累加到订单总金额
		totalAmount += totalPrice
	}

	// ========== 构建订单主记录 ==========
	order := Order{
		UserID:       req.UserID,    // 用户ID
		OrderNo:      orderNo,        // 订单号
		TotalAmount:  totalAmount,    // 总金额
		Status:       "pending",      // 初始状态：待支付
		PaymentMethod: req.PaymentMethod, // 支付方式
		CreatedAt:    time.Now(),    // 创建时间
		UpdatedAt:    time.Now(),    // 更新时间
	}

	// ========== 使用事务保证数据一致性 ==============
	// 事务：要么全部成功，要么全部回滚
	tx := s.db.Begin()
	
	// ========== 创建订单主记录 ==========
	if err := tx.Create(&order).Error; err != nil {
		// 如果创建失败，回滚事务
		tx.Rollback()
		s.logger.WithError(err).Error("Failed to create order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// ========== 创建订单项 ==========
	// 将订单项的OrderID设置为刚刚创建的订单的ID
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
	}
	
	// 批量插入订单项
	if err := tx.Create(&orderItems).Error; err != nil {
		tx.Rollback()
		s.logger.WithError(err).Error("Failed to create order items")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order items"})
		return
	}

	// ========== 扣减库存 ==========
	for _, item := range orderItems {
		// 使用GORM的Expr来构建SQL表达式：inventory = inventory - quantity
		if err := tx.Model(&struct{}{}).Table("products").Where("id = ?", item.ProductID).Update("inventory", gorm.Expr("inventory - ?", item.Quantity)).Error; err != nil {
			tx.Rollback()
			s.logger.WithError(err).Error("Failed to update inventory")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update inventory"})
			return
		}
	}

	// ========== 提交事务 ==========
	if err := tx.Commit().Error; err != nil {
		s.logger.WithError(err).Error("Failed to commit transaction")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// ========== 记录日志 ==========
	s.logger.WithFields(logrus.Fields{
		"order_id":   order.ID,      // 订单ID
		"order_no":   orderNo,       // 订单号
		"total_amount": totalAmount,  // 总金额
	}).Info("Order created successfully")

	// ========== 返回响应 ==========
	c.JSON(http.StatusCreated, gin.H{
		"message": "Order created successfully",
		"order":   order,
	})
}

// ============== 订单查询功能 ==============

// GetUserOrders 获取指定用户的所有订单
func (s *Service) GetUserOrders(c *gin.Context) {
	// 从URL路径参数中获取用户ID
	userID := c.Param("user_id")
	
	// 定义订单列表变量
	var orders []Order
	// 从数据库查询该用户的所有订单，预加载订单项，按创建时间降序排序
	if err := s.db.Where("user_id = ?", userID).Preload("Items").Order("created_at DESC").Find(&orders).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get user orders")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user orders"})
		return
	}

	// 返回订单列表
	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"total":  len(orders),  // 订单总数
	})
}

// GetOrder 获取订单详情
func (s *Service) GetOrder(c *gin.Context) {
	// 从URL路径参数中获取订单ID
	id := c.Param("id")
	
	// 定义订单变量
	var order Order
	// 从数据库查询订单信息，预加载订单项
	if err := s.db.Preload("Items").First(&order, id).Error; err != nil {
		// 如果订单不存在，返回404错误
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 返回订单详情
	c.JSON(http.StatusOK, order)
}

// ============== 订单支付功能 ==============

// PayOrder 支付订单
// 功能：将订单状态从"pending"更新为"paid"，并记录支付信息
func (s *Service) PayOrder(c *gin.Context) {
	// 解析请求体
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从数据库查询订单
	var order Order
	if err := s.db.First(&order, req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// ========== 检查订单状态 ==========
	if order.Status != "pending" {
		// 只有状态为"pending"的订单才能支付
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order is not in pending status"})
		return
	}

	// ========== 更新订单状态 ==========
	now := time.Now()          // 当前时间
	order.Status = "paid"     // 更新状态为"已支付"
	order.PaymentMethod = req.PaymentMethod  // 记录支付方式
	order.PaymentTime = &now   // 记录支付时间
	order.UpdatedAt = time.Now() // 更新时间戳

	// 保存到数据库
	if err := s.db.Save(&order).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	// ========== 更新订单项状态 ==========
	// 将订单项状态从"pending"更新为"confirmed"（已确认）
	if err := s.db.Model(&OrderItem{}).Where("order_id = ?", req.OrderID).Update("status", "confirmed").Error; err != nil {
		// 记录错误日志，但不中断流程（订单已支付，只是订单项状态更新失败）
		s.logger.WithError(err).Error("Failed to update order items")
	}

	// ========== 记录日志 ==========
	s.logger.WithFields(logrus.Fields{
		"order_id": req.OrderID,
		"status":   "paid",
	}).Info("Order paid successfully")

	// ========== 返回响应 ==========
	c.JSON(http.StatusOK, gin.H{
		"message": "Order paid successfully",
		"order":   order,
	})
}

// ============== 订单取消功能 ==============

// CancelOrder 取消订单
// 功能：将订单状态更新为"cancelled"，如果已支付则处理退款并恢复库存
func (s *Service) CancelOrder(c *gin.Context) {
	// 解析请求体
	var req CancelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查询订单
	var order Order
	if err := s.db.First(&order, req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// ========== 检查订单状态 ==========
	// 只有"pending"（待支付）或"paid"（已支付）的订单才能取消
	if order.Status != "pending" && order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order cannot be cancelled"})
		return
	}

	// ========== 更新订单状态 ==========
	order.Status = "cancelled"          // 更新状态为"已取消"
	order.CancelledReason = &req.CancelledReason  // 记录取消原因
	order.UpdatedAt = time.Now()        // 更新时间戳

	// ========== 如果订单已支付，处理退款逻辑 ==========
	if order.Status == "paid" {
		// 退款金额默认为订单总金额
		order.RefundAmount = &order.TotalAmount
		// 记录退款时间
		order.RefundTime = &time.Now()
		// 退款原因与取消原因相同
		order.RefundReason = &req.CancelledReason
		
		// ========== 恢复库存 ==========
		var items []OrderItem
		// 查询该订单的所有订单项
		if err := s.db.Where("order_id = ?", req.OrderID).Find(&items).Error; err == nil {
			// 遍历订单项，恢复每个产品的库存
			for _, item := range items {
				// 使用GORM的Expr构建SQL：inventory = inventory + quantity
				s.db.Model(&struct{}{}).Table("products").Where("id = ?", item.ProductID).Update("inventory", gorm.Expr("inventory + ?", item.Quantity))
			}
		}
	}

	// 保存订单更新
	if err := s.db.Save(&order).Error; err != nil {
		s.logger.WithError(err).Error("Failed to cancel order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
		return
	}

	// ========== 记录日志 ==========
	s.logger.WithFields(logrus.Fields{
		"order_id": req.OrderID,
		"status":   "cancelled",
	}).Info("Order cancelled successfully")

	// ========== 返回响应 ==========
	c.JSON(http.StatusOK, gin.H{
		"message": "Order cancelled successfully",
		"order":   order,
	})
}

// ============== 订单退款功能 ==============

// RefundOrder 退款
// 功能：将订单状态更新为"refunded"，恢复库存
func (s *Service) RefundOrder(c *gin.Context) {
	// 解析请求体
	var req RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查询订单
	var order Order
	if err := s.db.First(&order, req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// ========== 检查订单状态 ==========
	// 只有已支付的订单才能退款
	if order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order is not in paid status"})
		return
	}

	// ========== 更新订单状态 ==========
	order.Status = "refunded"           // 更新状态为"已退款"
	order.RefundAmount = &req.RefundAmount  // 记录退款金额
	order.RefundReason = &req.RefundReason  // 记录退款原因
	order.RefundTime = &time.Now()         // 记录退款时间
	order.UpdatedAt = time.Now()           // 更新时间戳

	// 保存订单更新
	if err := s.db.Save(&order).Error; err != nil {
		s.logger.WithError(err).Error("Failed to refund order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refund order"})
		return
	}

	// ========== 恢复库存 ==========
	var items []OrderItem
	// 查询该订单的所有订单项
	if err := s.db.Where("order_id = ?", req.OrderID).Find(&items).Error; err == nil {
		// 遍历订单项，恢复每个产品的库存
		for _, item := range items {
			s.db.Model(&struct{}{}).Table("products").Where("id = ?", item.ProductID).Update("inventory", gorm.Expr("inventory + ?", item.Quantity))
		}
	}

	// ========== 记录日志 ==========
	s.logger.WithFields(logrus.Fields{
		"order_id": req.OrderID,
		"status":   "refunded",
	}).Info("Order refunded successfully")

	// ========== 返回响应 ==========
	c.JSON(http.StatusOK, gin.H{
		"message": "Order refunded successfully",
		"order":   order,
	})
}

// ============== 订单状态查询功能 ==============

// GetOrderStatus 获取订单状态
// 功能：只返回订单ID、状态和更新时间（轻量级接口，用于快速查询）
func (s *Service) GetOrderStatus(c *gin.Context) {
	// 从URL路径参数中获取订单ID
	id := c.Param("id")
	
	// 定义临时结构体，只接收需要的字段（减少数据传输量）
	var order struct {
		ID     string    `json:"id"`
		Status string    `json:"status"`
		UpdatedAt time.Time `json:"updated_at"`
	}
	
	// 使用Select指定只查询特定字段
	if err := s.db.Model(&Order{}).Select("id, status, updated_at").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 返回订单状态信息
	c.JSON(http.StatusOK, order)
}
