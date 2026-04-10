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
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)
type Service struct {
	db     *gorm.DB
	logger *logrus.Logger
}
type Order struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null"`
	OrderNo      string    `json:"order_no" gorm:"unique;not null"`
	TotalAmount  float64   `json:"total_amount" gorm:"not null"`
	Status       string    `json:"status" gorm:"not null"`
	PaymentMethod string   `json:"payment_method"`
	PaymentTime  *time.Time `json:"payment_time"`
	CancelledReason *string `json:"cancelled_reason"`
	RefundAmount *float64  `json:"refund_amount"`
	RefundTime   *time.Time `json:"refund_time"`
	RefundReason *string   `json:"refund_reason"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	
	// 关联
	User         User       `json:"user" gorm:"foreignKey:UserID"`
	Items        []OrderItem `json:"items" gorm:"foreignKey:OrderID"`
}

type User struct {
	gorm.Model
	Phone         string `json:"phone" gorm:"unique;not null"`
	Email         string `json:"email"`
	Nickname      string `json:"nickname"`
	AvatarURL     string `json:"avatar_url"`
	MembershipLevel int  `json:"membership_level"`
}

type OrderItem struct {
	ID           uint    `json:"id" gorm:"primaryKey"`
	OrderID      uint    `json:"order_id" gorm:"not null"`
	ProductID    uint    `json:"product_id" gorm:"not null"`
	ProductName  string  `json:"product_name"`
	ProductType  string  `json:"product_type"`
	Quantity     int     `json:"quantity"`
	UnitPrice    float64 `json:"unit_price"`
	TotalPrice   float64 `json:"total_price"`
	BookingDetails json.RawMessage `json:"booking_details" gorm:"type:json"`
	Status       string  `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CreateOrderRequest struct {
	UserID       uint                 `json:"user_id" binding:"required"`
	Items        []CreateOrderItem    `json:"items" binding:"required,min=1"`
	PaymentMethod string              `json:"payment_method"`
}

type CreateOrderItem struct {
	ProductID    uint                 `json:"product_id" binding:"required"`
	Quantity     int                  `json:"quantity" binding:"required,min=1"`
	BookingDetails json.RawMessage     `json:"booking_details"`
}

type PaymentRequest struct {
	OrderID      uint    `json:"order_id" binding:"required"`
	PaymentMethod string `json:"payment_method" binding:"required"`
}

type CancelRequest struct {
	OrderID        uint   `json:"order_id" binding:"required"`
	CancelledReason string `json:"cancelled_reason" binding:"required"`
}

type RefundRequest struct {
	OrderID        uint    `json:"order_id" binding:"required"`
	RefundAmount   float64 `json:"refund_amount"`
	RefundReason   string  `json:"refund_reason" binding:"required"`
}

func NewService(db *gorm.DB, logger *logrus.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
	}
}

func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	orders := router.Group("/orders")
	{
		orders.POST("", s.CreateOrder)
		orders.GET("/user/:user_id", s.GetUserOrders)
		orders.GET("/:id", s.GetOrder)
		orders.PUT("/:id/pay", s.PayOrder)
		orders.PUT("/:id/cancel", s.CancelOrder)
		orders.PUT("/:id/refund", s.RefundOrder)
		orders.GET("/:id/status", s.GetOrderStatus)
	}
}

func (s *Service) CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 生成订单号
	orderNo := fmt.Sprintf("TR%s%d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)

	// 计算总金额
	var totalAmount float64
	orderItems := make([]OrderItem, len(req.Items))
	
	for i, item := range req.Items {
		// 获取产品信息
		var product struct {
			ID       uint
			Name     string
			Type     string
			Price    float64
			Inventory int
		}
		
		if err := s.db.First(&product, item.ProductID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Product %d not found", item.ProductID)})
			return
		}

		// 检查库存
		if product.Inventory < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Product %d inventory not enough", item.ProductID)})
			return
		}

		// 创建订单项
		totalPrice := float64(item.Quantity) * product.Price
		orderItems[i] = OrderItem{
			ProductID:    item.ProductID,
			ProductName:  product.Name,
			ProductType:  product.Type,
			Quantity:     item.Quantity,
			UnitPrice:    product.Price,
			TotalPrice:   totalPrice,
			BookingDetails: item.BookingDetails,
			Status:       "pending",
		}
		
		totalAmount += totalPrice
	}

	// 创建订单
	order := Order{
		UserID:       req.UserID,
		OrderNo:      orderNo,
		TotalAmount:  totalAmount,
		Status:       "pending",
		PaymentMethod: req.PaymentMethod,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// 开始事务
	tx := s.db.Begin()
	
	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		s.logger.WithError(err).Error("Failed to create order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// 创建订单项
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
	}
	
	if err := tx.Create(&orderItems).Error; err != nil {
		tx.Rollback()
		s.logger.WithError(err).Error("Failed to create order items")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order items"})
		return
	}

	// 减少库存
	for _, item := range orderItems {
		var product struct {
			Inventory int
		}
		if err := tx.Model(&struct{}{}).Table("products").Where("id = ?", item.ProductID).Update("inventory", gorm.Expr("inventory - ?", item.Quantity)).Error; err != nil {
			tx.Rollback()
			s.logger.WithError(err).Error("Failed to update inventory")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update inventory"})
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		s.logger.WithError(err).Error("Failed to commit transaction")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	s.logger.WithFields(logrus.Fields{
		"order_id":   order.ID,
		"order_no":   orderNo,
		"total_amount": totalAmount,
	}).Info("Order created successfully")

	c.JSON(http.StatusCreated, gin.H{
		"message": "Order created successfully",
		"order":   order,
	})
}

func (s *Service) GetUserOrders(c *gin.Context) {
	userID := c.Param("user_id")
	
	var orders []Order
	if err := s.db.Where("user_id = ?", userID).Preload("Items").Order("created_at DESC").Find(&orders).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get user orders")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"total":  len(orders),
	})
}

func (s *Service) GetOrder(c *gin.Context) {
	id := c.Param("id")
	
	var order Order
	if err := s.db.Preload("Items").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, order)
}

func (s *Service) PayOrder(c *gin.Context) {
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查找订单
	var order Order
	if err := s.db.First(&order, req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 检查订单状态
	if order.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order is not in pending status"})
		return
	}

	// 更新订单状态
	now := time.Now()
	order.Status = "paid"
	order.PaymentMethod = req.PaymentMethod
	order.PaymentTime = &now
	order.UpdatedAt = time.Now()

	if err := s.db.Save(&order).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	// 更新订单项状态
	if err := s.db.Model(&OrderItem{}).Where("order_id = ?", req.OrderID).Update("status", "confirmed").Error; err != nil {
		s.logger.WithError(err).Error("Failed to update order items")
	}

	s.logger.WithFields(logrus.Fields{
		"order_id": req.OrderID,
		"status":   "paid",
	}).Info("Order paid successfully")

	c.JSON(http.StatusOK, gin.H{
		"message": "Order paid successfully",
		"order":   order,
	})
}

func (s *Service) CancelOrder(c *gin.Context) {
	var req CancelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查找订单
	var order Order
	if err := s.db.First(&order, req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 检查订单状态
	if order.Status != "pending" && order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order cannot be cancelled"})
		return
	}

	// 更新订单状态
	order.Status = "cancelled"
	order.CancelledReason = &req.CancelledReason
	order.UpdatedAt = time.Now()

	// 如果已支付，处理退款逻辑
	if order.Status == "paid" {
		order.RefundAmount = &order.TotalAmount
		order.RefundTime = &time.Now()
		order.RefundReason = &req.CancelledReason
		
		// 恢复库存
		var items []OrderItem
		if err := s.db.Where("order_id = ?", req.OrderID).Find(&items).Error; err == nil {
			for _, item := range items {
				s.db.Model(&struct{}{}).Table("products").Where("id = ?", item.ProductID).Update("inventory", gorm.Expr("inventory + ?", item.Quantity))
			}
		}
	}

	if err := s.db.Save(&order).Error; err != nil {
		s.logger.WithError(err).Error("Failed to cancel order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
		return
	}

	s.logger.WithFields(logrus.Fields{
		"order_id": req.OrderID,
		"status":   "cancelled",
	}).Info("Order cancelled successfully")

	c.JSON(http.StatusOK, gin.H{
		"message": "Order cancelled successfully",
		"order":   order,
	})
}

func (s *Service) RefundOrder(c *gin.Context) {
	var req RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查找订单
	var order Order
	if err := s.db.First(&order, req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 检查订单状态
	if order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order is not in paid status"})
		return
	}

	// 更新订单状态
	order.Status = "refunded"
	order.RefundAmount = &req.RefundAmount
	order.RefundReason = &req.RefundReason
	order.RefundTime = &time.Now()
	order.UpdatedAt = time.Now()

	if err := s.db.Save(&order).Error; err != nil {
		s.logger.WithError(err).Error("Failed to refund order")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refund order"})
		return
	}

	// 恢复库存
	var items []OrderItem
	if err := s.db.Where("order_id = ?", req.OrderID).Find(&items).Error; err == nil {
		for _, item := range items {
			s.db.Model(&struct{}{}).Table("products").Where("id = ?", item.ProductID).Update("inventory", gorm.Expr("inventory + ?", item.Quantity))
		}
	}

	s.logger.WithFields(logrus.Fields{
		"order_id": req.OrderID,
		"status":   "refunded",
	}).Info("Order refunded successfully")

	c.JSON(http.StatusOK, gin.H{
		"message": "Order refunded successfully",
		"order":   order,
	})
}

func (s *Service) GetOrderStatus(c *gin.Context) {
	id := c.Param("id")
	
	var order struct {
		ID     string    `json:"id"`
		Status string    `json:"status"`
		UpdatedAt time.Time `json:"updated_at"`
	}
	
	if err := s.db.Model(&Order{}).Select("id, status, updated_at").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, order)
}