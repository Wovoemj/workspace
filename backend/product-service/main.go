package product

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// ============== 服务结构体定义 ==============

// Service 产品服务的核心结构体
type Service struct {
	db     *gorm.DB      // 数据库连接（使用GORM）
	logger *logrus.Logger // 日志器
}

// ============== 数据模型定义 ==============

// Product 产品主表模型（景点、酒店、机票、体验等）
type Product struct {
	ID           uint      `json:"id" gorm:"primaryKey"`          // 产品ID（主键）
	Type         string    `json:"type" gorm:"not null"`          // 产品类型（hotel酒店/flight机票/ticket门票/experience体验）
	Name         string    `json:"name" gorm:"not null"`          // 产品名称
	Description  string    `json:"description"`                    // 产品描述
	Price        float64   `json:"price" gorm:"not null"`        // 价格
	OriginalPrice *float64  `json:"original_price"`              // 原价（用于显示折扣）
	Inventory    int       `json:"inventory" gorm:"not null"`    // 库存数量
	Tags         []string  `json:"tags" gorm:"type:jsonb"`       // 标签数组（如["海滩","亲子"]）
	Metadata     ProductMetadata `json:"metadata" gorm:"type:jsonb"` // 产品元数据（不同产品类型有不同的字段）
	Status       string    `json:"status" gorm:"not null"`        // 状态（active上架/inactive下架）
	Images       []string  `json:"images" gorm:"type:jsonb"`     // 产品图片URL数组
	Location     Location  `json:"location" gorm:"type:jsonb"`   // 位置信息（城市、经纬度等）
	Rating       float64   `json:"rating"`                       // 评分（0-5）
	ReviewCount  int       `json:"review_count"`                  // 评论数量
	CreatedAt    time.Time `json:"created_at"`                   // 创建时间
	UpdatedAt    time.Time `json:"updated_at"`                   // 更新时间
	CoverImage   string    `json:"cover_image"`                  // 封面图片URL（兼容旧数据）
	Subtitle     string    `json:"subtitle"`                     // 副标题（兼容旧数据，存储城市信息）
	City         string    `json:"city" gorm:"column:subtitle"` // 城市（映射到subtitle列，用于兼容旧数据库结构）
}

// Location 位置信息结构体
type Location struct {
	City       string  `json:"city"`        // 城市名称
	Country    string  `json:"country"`     // 国家名称
	Latitude   float64 `json:"latitude"`    // 纬度
	Longitude  float64 `json:"longitude"`   // 经度
}

// ProductMetadata 产品元数据（不同产品类型有不同的字段）
type ProductMetadata struct {
	// ========== 机票特有字段 ==========
	Airline         string  `json:"airline"`          // 航空公司
	FlightNumber    string  `json:"flight_number"`    // 航班号
	DepartureAirport string `json:"departure_airport"` // 出发机场
	ArrivalAirport   string `json:"arrival_airport"`   // 到达机场
	DepartureTime   string  `json:"departure_time"`    // 出发时间
	ArrivalTime     string  `json:"arrival_time"`      // 到达时间
	Duration        string  `json:"duration"`          // 飞行时长

	// ========== 酒店特有字段 ==========
	StarRating      int      `json:"star_rating"`      // 星级
	Amenities       []string `json:"amenities"`       // 设施列表（如["wifi","pool"]）
	RoomType        string   `json:"room_type"`        // 房间类型
	CheckInTime     string   `json:"check_in_time"`    // 入住时间
	CheckOutTime    string   `json:"check_out_time"`   // 退房时间

	// ========== 门票特有字段 ==========
	AttractionName  string `json:"attraction_name"`   // 景点名称
	OpeningHours   string `json:"opening_hours"`     // 开放时间
	ValidDays       int    `json:"valid_days"`        // 有效天数

	// ========== 体验特有字段 ==========
	Duration        string   `json:"duration"`        // 体验时长
	Difficulty      string   `json:"difficulty"`      // 难度等级
	GroupSizeMin    int      `json:"group_size_min"`  // 最小成团人数
	GroupSizeMax    int      `json:"group_size_max"`  // 最大成团人数
	Includes        []string `json:"includes"`        // 包含项目列表
}

// SearchFilters 产品搜索过滤器
type SearchFilters struct {
	Destination    *string  `json:"destination"`    // 目的地（城市名）
	StartDate      *string  `json:"start_date"`      // 开始日期
	EndDate        *string  `json:"end_date"`        // 结束日期
	BudgetMin      *float64 `json:"budget_min"`      // 最小预算
	BudgetMax      *float64 `json:"budget_max"`      // 最大预算
	TravelStyle    *string  `json:"travel_style"`    // 旅行风格（如"relaxation"放松、"adventure"冒险）
	GroupSize      *int     `json:"group_size"`      // 团队人数
	Tags           []string `json:"tags"`           // 标签过滤
	RatingMin      *float64 `json:"rating_min"`      // 最低评分
	Type           *string  `json:"type"`           // 产品类型过滤
	Limit          int      `json:"limit"`          // 返回数量限制
	Offset         int      `json:"offset"`         // 分页偏移量
}

// CreateProductRequest 创建产品的请求体
type CreateProductRequest struct {
	Type         string             `json:"type" binding:"required"`         // 产品类型（必填）
	Name         string             `json:"name" binding:"required"`         // 产品名称（必填）
	Description  string             `json:"description"`                    // 产品描述
	Price        float64            `json:"price" binding:"required"`       // 价格（必填）
	OriginalPrice *float64           `json:"original_price"`               // 原价
	Inventory    int                `json:"inventory" binding:"required"`   // 库存（必填）
	Tags         []string           `json:"tags"`                         // 标签
	Metadata     ProductMetadata    `json:"metadata"`                      // 产品元数据
	Status       string             `json:"status"`                        // 状态（默认active）
	Images       []string           `json:"images"`                        // 图片URL数组
	Location     Location           `json:"location"`                       // 位置信息
}

// UpdateProductRequest 更新产品的请求体
// 注意：所有字段都是指针类型，用于区分"未传递"和"传递空值"
type UpdateProductRequest struct {
	Type         *string            `json:"type"`          // 产品类型
	Name         *string            `json:"name"`          // 产品名称
	Description  *string            `json:"description"`   // 产品描述
	Price        *float64           `json:"price"`         // 价格
	OriginalPrice *float64           `json:"original_price"` // 原价
	Inventory    *int               `json:"inventory"`     // 库存
	Tags         []string           `json:"tags"`          // 标签
	Metadata     *ProductMetadata   `json:"metadata"`      // 产品元数据
	Status       *string            `json:"status"`        // 状态
	Images       []string           `json:"images"`        // 图片URL数组
	Location     *Location         `json:"location"`       // 位置信息
}

// ============== 构造函数 ==============

// NewService 创建新的产品服务实例
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

// SetupRoutes 设置产品服务的所有API路由
// 参数：
//   - router: Gin路由组实例
func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	// 创建产品路由组，路径前缀为"/products"
	products := router.Group("/products")
	{
		// ========== 搜索产品（GET /products/search）==========
		// 注意：搜索接口必须在/:id之前注册，避免"search"被当作ID处理
		products.GET("/search", s.SearchProducts)
		
		// ========== CRUD操作 ==========
		products.POST("", s.CreateProduct)       // 创建产品
		products.GET("", s.ListProducts)         // 获取产品列表
		products.GET("/:id", s.GetProduct)      // 获取产品详情
		products.PUT("/:id", s.UpdateProduct)   // 更新产品
		products.DELETE("/:id", s.DeleteProduct) // 删除产品（软删除，更新状态为inactive）
		
		// ========== 特定端点 ==========
		products.GET("/popular", s.GetPopularProducts)                   // 获取热门产品
		products.GET("/recommendations/:user_id", s.GetRecommendations) // 获取推荐产品
		products.POST("/:id/increment-views", s.IncrementViews)       // 增加浏览量（待实现）
	}
}

// ============== 产品搜索功能 ==============

// SearchProducts 搜索产品
// 功能：根据多种条件过滤产品（目的地、价格范围、评分、标签等）
func (s *Service) SearchProducts(c *gin.Context) {
	// 定义过滤器结构体变量
	var filters SearchFilters
	
	// ========== 解析查询参数 ==========
	// 目的地过滤
	if destination := c.Query("destination"); destination != "" {
		filters.Destination = &destination
	}
	// 开始日期过滤
	if startDate := c.Query("start_date"); startDate != "" {
		filters.StartDate = &startDate
	}
	// 结束日期过滤
	if endDate := c.Query("end_date"); endDate != "" {
		filters.EndDate = &endDate
	}
	// 最小预算过滤
	if budgetMin := c.Query("budget_min"); budgetMin != "" {
		// 使用fmt.Sscanf解析浮点数
		if min, err := fmt.Sscanf(budgetMin, "%f", &filters.BudgetMin); err == nil && min == 1 {
			// 解析成功
		}
	}
	// 最大预算过滤
	if budgetMax := c.Query("budget_max"); budgetMax != "" {
		if max, err := fmt.Sscanf(budgetMax, "%f", &filters.BudgetMax); err == nil && max == 1 {
			// 解析成功
		}
	}
	// 旅行风格过滤
	if travelStyle := c.Query("travel_style"); travelStyle != "" {
		filters.TravelStyle = &travelStyle
	}
	// 团队人数过滤
	if groupSize := c.Query("group_size"); groupSize != "" {
		if size, err := fmt.Sscanf(groupSize, "%d", &filters.GroupSize); err == nil && size == 1 {
			// 解析成功
		}
	}
	// 最低评分过滤
	if ratingMin := c.Query("rating_min"); ratingMin != "" {
		if rating, err := fmt.Sscanf(ratingMin, "%f", &filters.RatingMin); err == nil && rating == 1 {
			// 解析成功
		}
	}
	// 产品类型过滤
	if productType := c.Query("type"); productType != "" {
		filters.Type = &productType
	}
	// 返回数量限制
	if limit := c.DefaultQuery("limit", "20"); limit != "" {
		if l, err := fmt.Sscanf(limit, "%d", &filters.Limit); err == nil && l == 1 {
			// 解析成功
		} else {
			filters.Limit = 20 // 默认值
		}
	}
	// 分页偏移量
	if offset := c.DefaultQuery("offset", "0"); offset != "" {
		if o, err := fmt.Sscanf(offset, "%d", &filters.Offset); err == nil && o == 1 {
			// 解析成功
		} else {
			filters.Offset = 0 // 默认值
		}
	}

	// ========== 构建数据库查询 ==========
	var products []Product
	query := s.db.Model(&Product{})

	// ========== 应用过滤条件 ==========
	// 目的地过滤（基于JSONB字段中的city）
	if filters.Destination != nil {
		// 使用PostgreSQL的JSONB操作符->>'field'来提取字段值
		query = query.Where("location->>'city' = ?", *filters.Destination)
	}
	// 产品类型过滤
	if filters.Type != nil {
		query = query.Where("type = ?", *filters.Type)
	}
	// 最小价格过滤
	if filters.BudgetMin != nil {
		query = query.Where("price >= ?", *filters.BudgetMin)
	}
	// 最大价格过滤
	if filters.BudgetMax != nil {
		query = query.Where("price <= ?", *filters.BudgetMax)
	}
	// 最低评分过滤
	if filters.RatingMin != nil {
		query = query.Where("rating >= ?", *filters.RatingMin)
	}
	// 标签过滤（简化版，生产环境需要更复杂的逻辑）
	if len(filters.Tags) > 0 {
		// 使用PostgreSQL的数组包含操作符@>
		// 注意：这个语法可能不适用于所有数据库，这里是一个简化示例
		query = query.Where("tags @> ?", fmt.Sprintf("[%s]", strings.Join(filters.Tags, ",")))
	}
	// 状态过滤
	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	} else {
		// 默认只显示上架的产品
		query = query.Where("status = ?", "active")
	}

	// ========== 分页和排序 ==========
	// 应用分页（偏移量和限制数量）
	query = query.Offset(filters.Offset).Limit(filters.Limit)
	// 按评分和评论数降序排序（评分高的、评论多的排前面）
	query = query.Order("rating DESC, review_count DESC")

	// ========== 执行查询 ==========
	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to search products")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search products"})
		return
	}

	// ========== 返回响应 ==========
	c.JSON(http.StatusOK, gin.H{
		"products": products,  // 产品列表
		"total":    len(products), // 返回的产品数量（注意：不是总数，因为用了分页）
		"filters":  filters,  // 回显使用的过滤器（便于前端构建分页）
	})
}

// ============== 产品创建功能 ==============

// CreateProduct 创建新产品
func (s *Service) CreateProduct(c *gin.Context) {
	// 解析请求体
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 构建产品结构体
	product := Product{
		Type:         req.Type,
		Name:         req.Name,
		Description:  req.Description,
		Price:        req.Price,
		OriginalPrice: req.OriginalPrice,
		Inventory:    req.Inventory,
		Tags:         req.Tags,
		Metadata:     req.Metadata,
		Status:       req.Status,
		Images:       req.Images,
		Location:     req.Location,
		Rating:       0,         // 新创建的产品评分为0
		ReviewCount:  0,         // 新创建的产品评论数为0
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// 保存到数据库
	if err := s.db.Create(&product).Error; err != nil {
		s.logger.WithError(err).Error("Failed to create product")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	// 记录日志
	s.logger.WithField("product_id", product.ID).Info("Product created successfully")
	// 返回成功响应
	c.JSON(http.StatusCreated, gin.H{
		"message": "Product created successfully",
		"product": product,
	})
}

// ============== 产品列表功能 ==============

// ListProducts 获取产品列表（简化版，不带过滤）
func (s *Service) ListProducts(c *gin.Context) {
	// 定义产品列表变量
	var products []Product
	// 查询所有上架的产品
	query := s.db.Model(&Product{}).Where("status = ?", "active")
	
	// 执行查询
	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to list products")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list products"})
		return
	}

	// ========== 兼容旧数据 ==========
	// 有些旧数据可能Images字段为空，但CoverImage有值
	// 有些旧数据可能Location字段为空，但Subtitle有值
	for i := range products {
		// 如果Images为空，用CoverImage填充
		if len(products[i].Images) == 0 && products[i].CoverImage != "" {
			products[i].Images = []string{products[i].CoverImage}
		}
		// 如果Location为空但有Subtitle，尝试提取城市名
		if products[i].Location.City == "" && products[i].Subtitle != "" {
			// 移除"推荐"后缀，提取城市名
			city := strings.TrimSuffix(products[i].Subtitle, "推荐")
			products[i].Location = Location{City: city}
		}
	}

	// 返回产品列表
	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    len(products),
	})
}

// ============== 产品详情功能 ==============

// GetProduct 获取产品详情
func (s *Service) GetProduct(c *gin.Context) {
	// 从URL路径参数中获取产品ID
	id := c.Param("id")
	
	// 定义产品变量
	var product Product
	// 从数据库查询产品信息
	if err := s.db.First(&product, id).Error; err != nil {
		// 如果产品不存在，返回404错误
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// ========== 兼容旧数据 ==========
	// 如果Images为空，用CoverImage填充
	if len(product.Images) == 0 && product.CoverImage != "" {
		product.Images = []string{product.CoverImage}
	}
	// 如果Location为空但有Subtitle，尝试提取城市名
	if product.Location.City == "" && product.Subtitle != "" {
		city := strings.TrimSuffix(product.Subtitle, "推荐")
		product.Location = Location{City: city}
	}

	// 返回产品详情
	c.JSON(http.StatusOK, product)
}

// ============== 产品更新功能 ==============

// UpdateProduct 更新产品信息
// 功能：根据请求体中的字段，有选择地更新产品信息
func (s *Service) UpdateProduct(c *gin.Context) {
	// 从URL路径参数中获取产品ID
	id := c.Param("id")
	
	// 解析请求体（使用UpdateProductRequest，所有字段都是指针类型）
	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从数据库查询产品
	var product Product
	if err := s.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// ========== 有选择地更新字段 ==========
	// 只有请求体中提供的字段才会被更新
	if req.Type != nil {
		product.Type = *req.Type
	}
	if req.Name != nil {
		product.Name = *req.Name
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Price != nil {
		product.Price = *req.Price
	}
	if req.OriginalPrice != nil {
		product.OriginalPrice = req.OriginalPrice
	}
	if req.Inventory != nil {
		product.Inventory = *req.Inventory
	}
	if len(req.Tags) > 0 {
		product.Tags = req.Tags
	}
	if req.Metadata != nil {
		product.Metadata = *req.Metadata
	}
	if req.Status != nil {
		product.Status = *req.Status
	}
	if len(req.Images) > 0 {
		product.Images = req.Images
	}
	if req.Location != nil {
		product.Location = *req.Location
	}

	// 更新时间戳
	product.UpdatedAt = time.Now()

	// 保存到数据库
	if err := s.db.Save(&product).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update product")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	// 记录日志
	s.logger.WithField("product_id", product.ID).Info("Product updated successfully")
	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"message": "Product updated successfully",
		"product": product,
	})
}

// ============== 产品删除功能 ==============

// DeleteProduct 删除产品（软删除）
// 功能：将产品状态更新为"inactive"，而不是真正从数据库中删除
func (s *Service) DeleteProduct(c *gin.Context) {
	// 从URL路径参数中获取产品ID
	id := c.Param("id")
	
	// 从数据库查询产品
	var product Product
	if err := s.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// ========== 软删除：更新状态为"inactive" ==========
	product.Status = "inactive"
	product.UpdatedAt = time.Now()

	// 保存到数据库
	if err := s.db.Save(&product).Error; err != nil {
		s.logger.WithError(err).Error("Failed to delete product")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	// 记录日志
	s.logger.WithField("product_id", product.ID).Info("Product deleted successfully")
	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"message": "Product deleted successfully",
	})
}

// ============== 热门产品功能 ==============

// GetPopularProducts 获取热门产品
// 功能：按评分和评论数降序排序，返回前N个产品
func (s *Service) GetPopularProducts(c *gin.Context) {
	// 定义产品列表变量
	var products []Product
	// 默认返回20个产品
	limit := 20
	
	// 解析limit查询参数
	if l := c.DefaultQuery("limit", "20"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}

	// 构建查询：只查询上架的产品，按评分和评论数降序排序，限制返回数量
	query := s.db.Model(&Product{}).
		Where("status = ?", "active").
		Order("rating DESC, review_count DESC").
		Limit(limit)

	// 执行查询
	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get popular products")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get popular products"})
		return
	}

	// 返回热门产品列表
	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    len(products),
	})
}

// ============== 推荐功能 ==============

// GetRecommendations 获取推荐产品
// 功能：根据用户ID，返回个性化推荐（待实现，当前返回热门产品）
func (s *Service) GetRecommendations(c *gin.Context) {
	// 从URL路径参数中获取用户ID
	userID := c.Param("user_id")
	
	// TODO: 实现基于用户偏好和行为的推荐算法
	// 当前临时方案：返回热门产品
	
	// 定义产品列表变量
	var products []Product
	
	// 构建查询：只查询上架的产品，按评分和评论数降序排序，限制返回10个
	query := s.db.Model(&Product{}).
		Where("status = ?", "active").
		Order("rating DESC, review_count DESC").
		Limit(10)

	// 执行查询
	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get recommendations")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recommendations"})
		return
	}

	// 返回推荐产品列表
	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"user_id":   userID,
	})
}

// ============== 浏览量统计功能 ==============

// IncrementViews 增加产品浏览量
// 功能：每次调用增加产品的浏览量（待实现）
func (s *Service) IncrementViews(c *gin.Context) {
	// 从URL路径参数中获取产品ID
	id := c.Param("id")
	
	// TODO: 实现浏览量计数逻辑
	// 当前临时方案：直接返回成功
	
	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"message": "Views incremented successfully",
		"product_id": id,
	})
}
