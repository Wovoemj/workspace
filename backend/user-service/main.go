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
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)
type Service struct {
	db     *gorm.DB
	logger *logrus.Logger
}
type User struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	Phone         string    `json:"phone" gorm:"unique;not null"`
	Email         string    `json:"email"`
	Nickname      string    `json:"nickname"`
	AvatarURL     string    `json:"avatar_url"`
	MembershipLevel int      `json:"membership_level"`
	Preferences   UserPreferences `json:"preferences" gorm:"type:jsonb"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type UserPreferences struct {
	Destinations []string `json:"destinations"`
	BudgetRange  BudgetRange `json:"budget_range"`
	TravelStyle  string   `json:"travel_style"`
	GroupSize    int      `json:"group_size"`
	Interests    []string `json:"interests"`
}

type BudgetRange struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type RegisterRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
	Nickname string `json:"nickname"`
}

type LoginRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileRequest struct {
	Nickname  string  `json:"nickname"`
	AvatarURL string  `json:"avatar_url"`
	Level     *int    `json:"membership_level"`
}

type UpdatePreferencesRequest struct {
	Destinations []string      `json:"destinations"`
	BudgetRange  *BudgetRange `json:"budget_range"`
	TravelStyle  *string      `json:"travel_style"`
	GroupSize    *int         `json:"group_size"`
	Interests    []string     `json:"interests"`
}

type Favorite struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	UserID         uint      `json:"user_id" gorm:"not null;index"`
	DestinationID  uint      `json:"destination_id" gorm:"not null"`
	DestinationName string   `json:"destination_name"`
	City           string    `json:"city"`
	Province       string    `json:"province"`
	CoverImage     string    `json:"cover_image"`
	CreatedAt      time.Time `json:"created_at"`
}

type AddFavoriteRequest struct {
	DestinationID uint   `json:"destination_id" binding:"required"`
	Name          string `json:"name"`
	City          string `json:"city"`
	Province      string `json:"province"`
	CoverImage    string `json:"cover_image"`
}

func NewService(db *gorm.DB, logger *logrus.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
	}
}

func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	users := router.Group("/users")
	{
		users.POST("/register", s.Register)
		users.POST("/login", s.Login)
		users.GET("/profile", s.GetProfile)
		users.PUT("/profile", s.UpdateProfile)
		users.GET("/preferences", s.GetPreferences)
		users.PUT("/preferences", s.UpdatePreferences)
		users.GET("/:id", s.GetUserByID)
	}

	// Favorites routes
	favorites := router.Group("/favorites")
	{
		favorites.GET("", s.GetFavorites)
		favorites.POST("", s.AddFavorite)
		favorites.DELETE("/:id", s.RemoveFavorite)
	}
}

func (s *Service) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser User
	if err := s.db.Where("phone = ?", req.Phone).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Phone already registered"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		s.logger.WithError(err).Error("Failed to hash password")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	// Create user
	user := User{
		Phone:         req.Phone,
		Password:      string(hashedPassword),
		Nickname:      req.Nickname,
		MembershipLevel: 1, // Default membership level
		Preferences: UserPreferences{
			TravelStyle: "relaxation",
			GroupSize:   2,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.db.Create(&user).Error; err != nil {
		s.logger.WithError(err).Error("Failed to create user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	s.logger.WithField("user_id", user.ID).Info("User registered successfully")
	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    user,
	})
}

func (s *Service) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user User
	if err := s.db.Where("phone = ?", req.Phone).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate token (simplified - in production use JWT)
	token := fmt.Sprintf("token_%d_%d", user.ID, time.Now().Unix())
	
	s.logger.WithField("user_id", user.ID).Info("User logged in successfully")
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user":    user,
	})
}

func (s *Service) GetProfile(c *gin.Context) {
	// Get user ID from token (simplified)
	userID := c.GetUint("user_id")
	
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (s *Service) UpdateProfile(c *gin.Context) {
	userID := c.GetUint("user_id")
	
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update fields
	if req.Nickname != "" {
		user.Nickname = req.Nickname
	}
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	if req.Level != nil {
		user.MembershipLevel = *req.Level
	}

	user.UpdatedAt = time.Now()

	if err := s.db.Save(&user).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update user profile")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	s.logger.WithField("user_id", user.ID).Info("User profile updated")
	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

func (s *Service) GetPreferences(c *gin.Context) {
	userID := c.GetUint("user_id")
	
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user.Preferences)
}

func (s *Service) UpdatePreferences(c *gin.Context) {
	userID := c.GetUint("user_id")
	
	var req UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update preferences
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

	user.UpdatedAt = time.Now()

	if err := s.db.Save(&user).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update user preferences")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	s.logger.WithField("user_id", user.ID).Info("User preferences updated")
	c.JSON(http.StatusOK, gin.H{
		"message": "Preferences updated successfully",
		"preferences": user.Preferences,
	})
}

func (s *Service) GetUserByID(c *gin.Context) {
	id := c.Param("id")

	var user User
	if err := s.db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (s *Service) GetFavorites(c *gin.Context) {
	userID := c.GetUint("user_id")

	var favorites []Favorite
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&favorites).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get favorites")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get favorites"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"destinations": favorites,
	})
}

func (s *Service) AddFavorite(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req AddFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if already favorited
	var existing Favorite
	if err := s.db.Where("user_id = ? AND destination_id = ?", userID, req.DestinationID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Already favorited"})
		return
	}

	favorite := Favorite{
		UserID:          userID,
		DestinationID:   req.DestinationID,
		DestinationName: req.Name,
		City:            req.City,
		Province:        req.Province,
		CoverImage:      req.CoverImage,
	}

	if err := s.db.Create(&favorite).Error; err != nil {
		s.logger.WithError(err).Error("Failed to add favorite")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add favorite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Added to favorites",
	})
}

func (s *Service) RemoveFavorite(c *gin.Context) {
	userID := c.GetUint("user_id")
	favoriteID := c.Param("id")

	var favorite Favorite
	if err := s.db.Where("id = ? AND user_id = ?", favoriteID, userID).First(&favorite).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Favorite not found"})
		return
	}

	if err := s.db.Delete(&favorite).Error; err != nil {
		s.logger.WithError(err).Error("Failed to remove favorite")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove favorite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Removed from favorites",
	})
}