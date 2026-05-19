package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"  // 用于密码哈希和验证
	"gorm.io/gorm"
)

// ============== 服务结构体定义 ==============

// Service 用户服务的核心结构体
type Service struct {
	db     *gorm.DB      // 数据库连接（使用GORM）
	logger *logrus.Logger // 日志器
}

// ============== 数据模型定义 ==============

// User 用户主表模型
type User struct {
	ID            uint      `json:"id" gorm:"primaryKey"`       // 用户ID（主键）
	Username      string    `json:"username" gorm:"unique"`      // 用户名（唯一）
	Phone         string    `json:"phone" gorm:"unique"`        // 手机号（唯一）
	Email         string    `json:"email"`                         // 邮箱
	Nickname      string    `json:"nickname"`                     // 昵称
	Password      string    `json:"-"`                            // 密码哈希值（JSON中隐藏，不返回给前端）
	AvatarURL     string    `json:"avatar_url"`                   // 头像URL
	MembershipLevel int      `json:"membership_level"`             // 会员等级（1-普通会员，2-VIP会员等）
	IsAdmin       bool      `json:"is_admin" gorm:"column:is_admin"` // 是否管理员（映射到is_admin列）
	Preferences   UserPreferences `json:"preferences" gorm:"type:jsonb"` // 用户偏好设置（JSONB格式）
	CreatedAt     time.Time `json:"created_at"`                   // 创建时间
	UpdatedAt     time.Time `json:"updated_at"`                   // 更新时间
}

// UserPreferences 用户偏好设置结构体
type UserPreferences struct {
	Destinations []string `json:"destinations"` // 想去的目的地列表
	BudgetRange  BudgetRange `json:"budget_range"`  // 预算范围
	TravelStyle  string   `json:"travel_style"`  // 旅行风格（如"relaxation"放松、"adventure"冒险）
	GroupSize    int      `json:"group_size"`    // 常结伴人数
	Interests    []string `json:"interests"`    // 兴趣标签（如"海滩"、"历史"、"美食"）
}

// BudgetRange 预算范围结构体
type BudgetRange struct {
	Min float64 `json:"min"`  // 最小预算（元）
	Max float64 `json:"max"`  // 最大预算（元）
}

// ============== 请求结构体定义 ==============

// RegisterRequest 用户注册请求体
type RegisterRequest struct {
	Phone    string `json:"phone" binding:"required"`    // 手机号（必填）
	Password string `json:"password" binding:"required"` // 密码（必填）
	Nickname string `json:"nickname"`                    // 昵称（可选）
}

// LoginRequest 用户登录请求体
type LoginRequest struct {
	Phone    string `json:"phone"`      // 手机号（与用户名二选一）
	Username string `json:"username"`    // 用户名（与手机号二选一）
	Password string `json:"password" binding:"required"` // 密码（必填）
}

// UpdateProfileRequest 更新用户资料请求体
type UpdateProfileRequest struct {
	Nickname  string  `json:"nickname"`   // 昵称
	AvatarURL string  `json:"avatar_url"` // 头像URL
	Level     *int    `json:"membership_level"` // 会员等级（指针类型，允许为0）
}

// UpdatePreferencesRequest 更新用户偏好请求体
type UpdatePreferencesRequest struct {
	Destinations []string      `json:"destinations"` // 目的地列表
	BudgetRange  *BudgetRange `json:"budget_range"`  // 预算范围
	TravelStyle  *string      `json:"travel_style"`  // 旅行风格
	GroupSize    *int         `json:"group_size"`    // 常结伴人数
	Interests    []string     `json:"interests"`    // 兴趣标签
}

// ============== 收藏相关模型 ==============

// Favorite 收藏表模型
type Favorite struct {
	ID             uint      `json:"id" gorm:"primaryKey"`       // 收藏ID（主键）
	UserID         uint      `json:"user_id" gorm:"not null;index"` // 用户ID（建立索引，加速查询）
	DestinationID  uint      `json:"destination_id" gorm:"not null"` // 目的地ID
	DestinationName string   `json:"destination_name"`                // 目的地名称（冗余存储，避免频繁关联查询）
	City           string    `json:"city"`                           // 城市名称
	Province       string    `json:"province"`                       // 省份名称
	CoverImage     string    `json:"cover_image"`                    // 封面图片URL
	CreatedAt      time.Time `json:"created_at"`                    // 收藏时间
}

// AddFavoriteRequest 添加收藏请求体
type AddFavoriteRequest struct {
	DestinationID uint   `json:"destination_id" binding:"required"` // 目的地ID（必填）
	Name          string `json:"name"`                              // 目的地名称
	City          string `json:"city"`                              // 城市名称
	Province      string `json:"province"`                          // 省份名称
	CoverImage    string `json:"cover_image"`                      // 封面图片URL
}

// ============== 构造函数 ==============

// NewService 创建新的用户服务实例
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

// SetupRoutes 设置用户服务的所有API路由
// 参数：
//   - router: Gin路由组实例
func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	// ========== 用户相关路由 ==========
	// 创建用户路由组，路径前缀为"/users"
	users := router.Group("/users")
	{
		// 用户注册（POST /users/register）
		users.POST("/register", s.Register)
		// 用户登录（POST /users/login）
		users.POST("/login", s.Login)
		// 获取当前登录用户的资料（GET /users/profile）
		users.GET("/profile", s.GetProfile)
		// 更新当前登录用户的资料（PUT /users/profile）
		users.PUT("/profile", s.UpdateProfile)
		// 获取当前登录用户的偏好设置（GET /users/preferences）
		users.GET("/preferences", s.GetPreferences)
		// 更新当前登录用户的偏好设置（PUT /users/preferences）
		users.PUT("/preferences", s.UpdatePreferences)
		// 根据ID获取用户资料（GET /users/:id）
		users.GET("/:id", s.GetUserByID)
	}

	// ========== 收藏相关路由 ==========
	// 创建收藏路由组，路径前缀为"/favorites"
	favorites := router.Group("/favorites")
	{
		// 获取当前登录用户的收藏列表（GET /favorites）
		favorites.GET("", s.GetFavorites)
		// 添加收藏（POST /favorites）
		favorites.POST("", s.AddFavorite)
		// 移除收藏（DELETE /favorites/:id）
		favorites.DELETE("/:id", s.RemoveFavorite)
	}
}

// ============== 用户注册功能 ==============

// Register 用户注册
// 功能：接收手机号、密码、昵称，创建新用户，密码使用bcrypt哈希存储
func (s *Service) Register(c *gin.Context) {
	// 解析请求体中的JSON数据到RegisterRequest结构体
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果请求格式错误，返回400错误
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ========== 检查用户是否已存在 ==========
	var existingUser User
	// 根据手机号查询用户
	if err := s.db.Where("phone = ?", req.Phone).First(&existingUser).Error; err == nil {
		// 如果查询成功（err==nil），说明用户已存在
		c.JSON(http.StatusConflict, gin.H{"error": "Phone already registered"})
		return
	}

	// ========== 密码哈希 ==========
	// 使用bcrypt算法哈希密码（自带salt，防止彩虹表攻击）
	// bcrypt.DefaultCost = 10（迭代次数，数值越大越安全但越慢）
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		s.logger.WithError(err).Error("Failed to hash password")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	// ========== 创建新用户 ==========
	user := User{
		Phone:         req.Phone,                         // 手机号
		Password:      string(hashedPassword),             // 哈希后的密码（不是明文）
		Nickname:      req.Nickname,                     // 昵称
		MembershipLevel: 1,                               // 默认会员等级：1（普通会员）
		Preferences: UserPreferences{
			TravelStyle: "relaxation",                  // 默认旅行风格：放松
			GroupSize:   2,                              // 默认结伴人数：2人
		},
		CreatedAt: time.Now(),                         // 创建时间
		UpdatedAt: time.Now(),                         // 更新时间
	}

	// 保存到数据库
	if err := s.db.Create(&user).Error; err != nil {
		s.logger.WithError(err).Error("Failed to create user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	// ========== 记录日志 ==========
	s.logger.WithField("user_id", user.ID).Info("User registered successfully")
	// ========== 返回响应 ==========
	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    user,  // 返回用户信息（不包含密码，因为Password字段有json:"-"标签）
	})
}

// ============== 用户登录功能 ==============

// Login 用户登录
// 功能：接收手机号/用户名和密码，验证成功后返回token（简化版，生产环境应使用JWT）
func (s *Service) Login(c *gin.Context) {
	// 解析请求体
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ========== 构建查询条件 ==========
	// 根据手机号或用户名查询用户
	var user User
	query := s.db.Where("1=1")  // 恒真条件，便于后续拼接WHERE子句
	if req.Phone != "" {
		query = query.Where("phone = ?", req.Phone)
	} else if req.Username != "" {
		query = query.Where("username = ?", req.Username)
	} else {
		// 手机号和用户名都没提供，返回400错误
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone or username is required"})
		return
	}
	
	// 执行查询
	if err := query.First(&user).Error; err != nil {
		// 用户不存在，返回401错误
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// ========== 验证密码 ==========
	// 使用bcrypt比较输入的密码和数据库中存储的哈希值
	// bcrypt.CompareHashAndPassword 会自动处理salt，无需单独存储salt
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		// 密码不匹配，返回401错误
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	// ========== 生成token（简化版）==========
	// 注意：这是简化实现，生产环境应使用JWT（JSON Web Token）
	// JWT包含用户信息、过期时间，并且可以验证签名防止篡改
	token := fmt.Sprintf("token_%d_%d", user.ID, time.Now().Unix())
	
	// ========== 记录日志 ==========
	s.logger.WithField("user_id", user.ID).Info("User logged in successfully")
	// ========== 返回响应 ==========
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"token":   token,  // 返回token（前端后续请求需要在Header中携带此token）
		"user":    user,   // 返回用户信息
	})
}

// ============== 用户资料功能 ==============

// GetProfile 获取当前登录用户的资料
// 功能：从token中解析用户ID，返回用户资料
func (s *Service) GetProfile(c *gin.Context) {
	// 从Gin上下文中获取用户ID（由认证中间件设置）
	// 注意：实际应用中，应该使用JWT中间件来解析token并设置user_id
	userID := c.GetUint("user_id")
	
	// 从数据库查询用户信息
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 返回用户资料（Password字段会被json:"-"标签排除）
	c.JSON(http.StatusOK, user)
}

// UpdateProfile 更新当前登录用户的资料
func (s *Service) UpdateProfile(c *gin.Context) {
	// 从Gin上下文中获取用户ID
	userID := c.GetUint("user_id")
	
	// 解析请求体
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从数据库查询用户信息
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// ========== 有选择地更新字段 ==========
	// 只有请求体中提供的字段才会被更新
	if req.Nickname != "" {
		user.Nickname = req.Nickname
	}
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	if req.Level != nil {
		user.MembershipLevel = *req.Level
	}

	// 更新时间戳
	user.UpdatedAt = time.Now()

	// 保存到数据库
	if err := s.db.Save(&user).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update user profile")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// ========== 记录日志 ==========
	s.logger.WithField("user_id", user.ID).Info("User profile updated")
	// ========== 返回响应 ==========
	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

// ============== 用户偏好功能 ==============

// GetPreferences 获取当前登录用户的偏好设置
func (s *Service) GetPreferences(c *gin.Context) {
	// 从Gin上下文中获取用户ID
	userID := c.GetUint("user_id")
	
	// 从数据库查询用户信息
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 返回用户偏好设置（JSON格式）
	c.JSON(http.StatusOK, user.Preferences)
}

// UpdatePreferences 更新当前登录用户的偏好设置
func (s *Service) UpdatePreferences(c *gin.Context) {
	// 从Gin上下文中获取用户ID
	userID := c.GetUint("user_id")
	
	// 解析请求体
	var req UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从数据库查询用户信息
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// ========== 有选择地更新偏好设置 ==========
	if req.Destinations != nil {
		user.Preferences.Destinations = req.Destinations
	}
	if req.BudgetRange != nil {
		user.Preferences.BudgetRange = *req.BudgetRange
	}
	if req.TravelStyle != nil {
		user.Preferences.TravelStyle = *req.TravelStyle
	}
	if req.GroupSize != nil {
		user.Preferences.GroupSize = *req.GroupSize
	}
	if req.Interests != nil {
		user.Preferences.Interests = req.Interests
	}

	// 更新时间戳
	user.UpdatedAt = time.Now()

	// 保存到数据库
	if err := s.db.Save(&user).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update user preferences")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	// ========== 记录日志 ==========
	s.logger.WithField("user_id", user.ID).Info("User preferences updated")
	// ========== 返回响应 ==========
	c.JSON(http.StatusOK, gin.H{
		"message":      "Preferences updated successfully",
		"preferences":  user.Preferences,
	})
}

// ============== 用户查询功能 ==============

// GetUserByID 根据ID获取用户资料
func (s *Service) GetUserByID(c *gin.Context) {
	// 从URL路径参数中获取用户ID
	id := c.Param("id")

	// 从数据库查询用户信息
	var user User
	if err := s.db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 返回用户资料
	c.JSON(http.StatusOK, user)
}

// ============== 收藏功能 ==============

// GetFavorites 获取当前登录用户的收藏列表
func (s *Service) GetFavorites(c *gin.Context) {
	// 从Gin上下文中获取用户ID
	userID := c.GetUint("user_id")

	// 定义收藏列表变量
	var favorites []Favorite
	// 从数据库查询该用户的所有收藏，按收藏时间降序排序
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&favorites).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get favorites")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get favorites"})
		return
	}

	// 返回收藏列表
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"destinations": favorites,  // 收藏的目的地列表
	})
}

// AddFavorite 添加收藏
func (s *Service) AddFavorite(c *gin.Context) {
	// 从Gin上下文中获取用户ID
	userID := c.GetUint("user_id")

	// 解析请求体
	var req AddFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ========== 检查是否已经收藏 ==========
	var existing Favorite
	// 根据user_id和destination_id查询是否已收藏
	if err := s.db.Where("user_id = ? AND destination_id = ?", userID, req.DestinationID).First(&existing).Error; err == nil {
		// 如果查询成功，说明已经收藏过
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Already favorited"})
		return
	}

	// ========== 创建收藏记录 ==========
	favorite := Favorite{
		UserID:          userID,           // 用户ID
		DestinationID:   req.DestinationID,   // 目的地ID
		DestinationName: req.Name,             // 目的地名称
		City:            req.City,             // 城市名称
		Province:        req.Province,         // 省份名称
		CoverImage:      req.CoverImage,       // 封面图片URL
	}

	// 保存到数据库
	if err := s.db.Create(&favorite).Error; err != nil {
		s.logger.WithError(err).Error("Failed to add favorite")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add favorite"})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Added to favorites",
	})
}

// RemoveFavorite 移除收藏
func (s *Service) RemoveFavorite(c *gin.Context) {
	// 从Gin上下文中获取用户ID
	userID := c.GetUint("user_id")
	// 从URL路径参数中获取收藏记录ID
	favoriteID := c.Param("id")

	// 从数据库查询收藏记录
	var favorite Favorite
	// 确保只能删除自己的收藏（user_id匹配）
	if err := s.db.Where("id = ? AND user_id = ?", favoriteID, userID).First(&favorite).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Favorite not found"})
		return
	}

	// 从数据库中删除收藏记录（硬删除）
	if err := s.db.Delete(&favorite).Error; err != nil {
		s.logger.WithError(err).Error("Failed to remove favorite")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove favorite"})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Removed from favorites",
	})
}
