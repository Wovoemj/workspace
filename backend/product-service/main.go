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
type Service struct {
	db     *gorm.DB
	logger *logrus.Logger
}
type Product struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Type         string    `json:"type" gorm:"not null"`
	Name         string    `json:"name" gorm:"not null"`
	Description  string    `json:"description"`
	Price        float64   `json:"price" gorm:"not null"`
	OriginalPrice *float64  `json:"original_price"`
	Inventory    int       `json:"inventory" gorm:"not null"`
	Tags         []string  `json:"tags" gorm:"type:jsonb"`
	Metadata     ProductMetadata `json:"metadata" gorm:"type:jsonb"`
	Status       string    `json:"status" gorm:"not null"`
	Images       []string  `json:"images" gorm:"type:jsonb"`
	Location     Location  `json:"location" gorm:"type:jsonb"`
	Rating       float64   `json:"rating"`
	ReviewCount  int       `json:"review_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Location struct {
	City       string  `json:"city"`
	Country    string  `json:"country"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
}

type ProductMetadata struct {
	// Flight specific
	Airline         string  `json:"airline"`
	FlightNumber    string  `json:"flight_number"`
	DepartureAirport string `json:"departure_airport"`
	ArrivalAirport   string `json:"arrival_airport"`
	DepartureTime   string `json:"departure_time"`
	ArrivalTime     string `json:"arrival_time"`
	Duration        string `json:"duration"`
	
	// Hotel specific
	StarRating      int      `json:"star_rating"`
	Amenities       []string `json:"amenities"`
	RoomType        string   `json:"room_type"`
	CheckInTime     string   `json:"check_in_time"`
	CheckOutTime    string   `json:"check_out_time"`
	
	// Ticket specific
	AttractionName  string `json:"attraction_name"`
	OpeningHours   string `json:"opening_hours"`
	ValidDays       int    `json:"valid_days"`
	
	// Experience specific
	Duration        string `json:"duration"`
	Difficulty      string `json:"difficulty"`
	GroupSizeMin    int    `json:"group_size_min"`
	GroupSizeMax    int    `json:"group_size_max"`
	Includes        []string `json:"includes"`
}

type SearchFilters struct {
	Destination    *string  `json:"destination"`
	StartDate      *string  `json:"start_date"`
	EndDate        *string  `json:"end_date"`
	BudgetMin      *float64 `json:"budget_min"`
	BudgetMax      *float64 `json:"budget_max"`
	TravelStyle    *string  `json:"travel_style"`
	GroupSize      *int     `json:"group_size"`
	Tags           []string `json:"tags"`
	RatingMin      *float64 `json:"rating_min"`
	Type           *string  `json:"type"`
	Limit          int      `json:"limit"`
	Offset         int      `json:"offset"`
}

type CreateProductRequest struct {
	Type         string             `json:"type" binding:"required"`
	Name         string             `json:"name" binding:"required"`
	Description  string             `json:"description"`
	Price        float64            `json:"price" binding:"required"`
	OriginalPrice *float64           `json:"original_price"`
	Inventory    int                `json:"inventory" binding:"required"`
	Tags         []string           `json:"tags"`
	Metadata     ProductMetadata    `json:"metadata"`
	Status       string             `json:"status"`
	Images       []string           `json:"images"`
	Location     Location           `json:"location"`
}

type UpdateProductRequest struct {
	Type         *string            `json:"type"`
	Name         *string            `json:"name"`
	Description  *string            `json:"description"`
	Price        *float64           `json:"price"`
	OriginalPrice *float64           `json:"original_price"`
	Inventory    *int               `json:"inventory"`
	Tags         []string           `json:"tags"`
	Metadata     *ProductMetadata   `json:"metadata"`
	Status       *string            `json:"status"`
	Images       []string           `json:"images"`
	Location     *Location         `json:"location"`
}

func NewService(db *gorm.DB, logger *logrus.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
	}
}

func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	products := router.Group("/products")
	{
		// Search products
		products.GET("/search", s.SearchProducts)
		
		// CRUD operations
		products.POST("", s.CreateProduct)
		products.GET("", s.ListProducts)
		products.GET("/:id", s.GetProduct)
		products.PUT("/:id", s.UpdateProduct)
		products.DELETE("/:id", s.DeleteProduct)
		
		// Specific endpoints
		products.GET("/popular", s.GetPopularProducts)
		products.GET("/recommendations/:user_id", s.GetRecommendations)
		products.POST("/:id/increment-views", s.IncrementViews)
	}
}

func (s *Service) SearchProducts(c *gin.Context) {
	var filters SearchFilters
	
	// Parse query parameters
	if destination := c.Query("destination"); destination != "" {
		filters.Destination = &destination
	}
	if startDate := c.Query("start_date"); startDate != "" {
		filters.StartDate = &startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters.EndDate = &endDate
	}
	if budgetMin := c.Query("budget_min"); budgetMin != "" {
		if min, err := fmt.Sscanf(budgetMin, "%f", &filters.BudgetMin); err == nil && min == 1 {
			// BudgetMin is set
		}
	}
	if budgetMax := c.Query("budget_max"); budgetMax != "" {
		if max, err := fmt.Sscanf(budgetMax, "%f", &filters.BudgetMax); err == nil && max == 1 {
			// BudgetMax is set
		}
	}
	if travelStyle := c.Query("travel_style"); travelStyle != "" {
		filters.TravelStyle = &travelStyle
	}
	if groupSize := c.Query("group_size"); groupSize != "" {
		if size, err := fmt.Sscanf(groupSize, "%d", &filters.GroupSize); err == nil && size == 1 {
			// GroupSize is set
		}
	}
	if ratingMin := c.Query("rating_min"); ratingMin != "" {
		if rating, err := fmt.Sscanf(ratingMin, "%f", &filters.RatingMin); err == nil && rating == 1 {
			// RatingMin is set
		}
	}
	if productType := c.Query("type"); productType != "" {
		filters.Type = &productType
	}
	if limit := c.DefaultQuery("limit", "20"); limit != "" {
		if l, err := fmt.Sscanf(limit, "%d", &filters.Limit); err == nil && l == 1 {
			// Limit is set
		} else {
			filters.Limit = 20
		}
	}
	if offset := c.DefaultQuery("offset", "0"); offset != "" {
		if o, err := fmt.Sscanf(offset, "%d", &filters.Offset); err == nil && o == 1 {
			// Offset is set
		} else {
			filters.Offset = 0
		}
	}

	var products []Product
	query := s.db.Model(&Product{})

	// Apply filters
	if filters.Destination != nil {
		query = query.Where("location->>'city' = ?", *filters.Destination)
	}
	if filters.Type != nil {
		query = query.Where("type = ?", *filters.Type)
	}
	if filters.BudgetMin != nil {
		query = query.Where("price >= ?", *filters.BudgetMin)
	}
	if filters.BudgetMax != nil {
		query = query.Where("price <= ?", *filters.BudgetMax)
	}
	if filters.RatingMin != nil {
		query = query.Where("rating >= ?", *filters.RatingMin)
	}
	if len(filters.Tags) > 0 {
		// This is a simplified tag search - in production you'd want more complex logic
		query = query.Where("tags @> ?", fmt.Sprintf("[%s]", strings.Join(filters.Tags, ",")))
	}
	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	} else {
		query = query.Where("status = ?", "active")
	}

	// Apply pagination
	query = query.Offset(filters.Offset).Limit(filters.Limit)

	// Order by rating and review count
	query = query.Order("rating DESC, review_count DESC")

	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to search products")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    len(products),
		"filters": filters,
	})
}

func (s *Service) CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

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
		Rating:       0,
		ReviewCount:  0,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.db.Create(&product).Error; err != nil {
		s.logger.WithError(err).Error("Failed to create product")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	s.logger.WithField("product_id", product.ID).Info("Product created successfully")
	c.JSON(http.StatusCreated, gin.H{
		"message": "Product created successfully",
		"product": product,
	})
}

func (s *Service) ListProducts(c *gin.Context) {
	var products []Product
	query := s.db.Model(&Product{}).Where("status = ?", "active")
	
	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to list products")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    len(products),
	})
}

func (s *Service) GetProduct(c *gin.Context) {
	id := c.Param("id")
	
	var product Product
	if err := s.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}

func (s *Service) UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	
	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var product Product
	if err := s.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Update fields
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

	product.UpdatedAt = time.Now()

	if err := s.db.Save(&product).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update product")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	s.logger.WithField("product_id", product.ID).Info("Product updated successfully")
	c.JSON(http.StatusOK, gin.H{
		"message": "Product updated successfully",
		"product": product,
	})
}

func (s *Service) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	
	var product Product
	if err := s.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Soft delete by setting status to inactive
	product.Status = "inactive"
	product.UpdatedAt = time.Now()

	if err := s.db.Save(&product).Error; err != nil {
		s.logger.WithError(err).Error("Failed to delete product")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	s.logger.WithField("product_id", product.ID).Info("Product deleted successfully")
	c.JSON(http.StatusOK, gin.H{
		"message": "Product deleted successfully",
	})
}

func (s *Service) GetPopularProducts(c *gin.Context) {
	var products []Product
	limit := 20
	
	if l := c.DefaultQuery("limit", "20"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}

	query := s.db.Model(&Product{}).
		Where("status = ?", "active").
		Order("rating DESC, review_count DESC").
		Limit(limit)

	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get popular products")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get popular products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    len(products),
	})
}

func (s *Service) GetRecommendations(c *gin.Context) {
	userID := c.Param("user_id")
	
	// TODO: Implement recommendation logic based on user preferences and behavior
	// For now, return popular products
	var products []Product
	
	query := s.db.Model(&Product{}).
		Where("status = ?", "active").
		Order("rating DESC, review_count DESC").
		Limit(10)

	if err := query.Find(&products).Error; err != nil {
		s.logger.WithError(err).Error("Failed to get recommendations")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recommendations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"user_id":   userID,
	})
}

func (s *Service) IncrementViews(c *gin.Context) {
	id := c.Param("id")
	
	// TODO: Implement view counting logic
	// For now, just return success
	c.JSON(http.StatusOK, gin.H{
		"message": "Views incremented successfully",
		"product_id": id,
	})
}