



	"encoding/json" 


	"time"

	"github.com/gin-gonic/gin"





type Service struct {

	redis      *redis.Client





	ID        string    `json:"id"`



	Content   string    `json:"content"`
	Intent    string    `json:"intent"`


}


	Message   string `json:"message" binding:"required"`
	SessionID string `json:"session_id"`
}

type IntentResponse struct {
	Intent     string  `json:"intent"`
	Confidence float64 `json:"confidence"`
}

type ItineraryRequest struct {
	Destination string                 `json:"destination" binding:"required"`
	Days        int                    `json:"days" binding:"required"`
	Preferences map[string]interface{} `json:"preferences"`
}

type ItineraryResponse struct {
	ID          string             `json:"id"`
	Title       string             `json:"title"`
	Days        []ItineraryDay     `json:"days"`
	Budget      float64            `json:"budget"`
	Tags        []string           `json:"tags"`
	CreatedAt   time.Time          `json:"created_at"`
}

type ItineraryDay struct {
	Day       int              `json:"day"`
	Date      string           `json:"date"`
	Activities []Activity      `json:"activities"`
	Meals     []Meal           `json:"meals"`
}

type Activity struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Location    string  `json:"location"`
	StartTime   string  `json:"start_time"`
	EndTime     string  `json:"end_time"`
	Description string  `json:"description"`
	Cost        float64 `json:"cost"`
}

type Meal struct {
	Type     string  `json:"type"`
	Name     string  `json:"name"`
	Location string  `json:"location"`
	Cost     float64 `json:"cost"`
	Cuisine  string  `json:"cuisine"`
}

type RecommendationRequest struct {
	UserID   string                 `json:"user_id" binding:"required"`
	Context  map[string]interface{} `json:"context"`
}

type Recommendation struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"user_id"`
	Type      string                 `json:"type"`
	TargetID  string                 `json:"target_id"`
	Score     float64                `json:"score"`
	Reason    string                 `json:"reason"`
	CreatedAt time.Time              `json:"created_at"`
}

func NewService(logger *logrus.Logger, redis *redis.Client, pinecone *pinecone.Client, openaiAPI string) *Service {
	return &Service{
		logger:    logger,
		redis:     redis,
		pinecone:  pinecone,
		openaiAPI: openaiAPI,
	}
}

func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	ai := router.Group("/ai")
	{
		// Chat functionality
		ai.POST("/chat", s.SendMessage)
		ai.GET("/chat/:session_id/history", s.GetChatHistory)
		
		// Intent detection
		ai.POST("/intent", s.DetectIntent)
		
		// Itinerary generation
		ai.POST("/itinerary/generate", s.GenerateItinerary)
		
		// Recommendations
		ai.POST("/recommendations", s.GetRecommendations)
		
		// Knowledge base
		ai.POST("/knowledge/search", s.SearchKnowledge)
		ai.POST("/knowledge/update", s.UpdateKnowledge)
	}
}

func (s *Service) SendMessage(c *gin.Context) {
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate session ID if not provided
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = fmt.Sprintf("session_%d", time.Now().Unix())
	}

	// Detect intent
	intentResponse, err := s.DetectIntentInternal(req.Message)
	if err != nil {
		s.logger.WithError(err).Error("Failed to detect intent")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process message"})
		return
	}

	// Store user message
	userMessage := Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()),
		UserID:    c.GetString("user_id"),
		SessionID: sessionID,
		Role:      "user",
		Content:   req.Message,
		Intent:    intentResponse.Intent,
		CreatedAt: time.Now(),
	}

	if err := s.saveConversation(userMessage); err != nil {
		s.logger.WithError(err).Error("Failed to save user message")
	}

	// Generate AI response
	aiResponse, err := s.generateAIResponse(req.Message, intentResponse.Intent, sessionID)
	if err != nil {
		s.logger.WithError(err).Error("Failed to generate AI response")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate response"})
		return
	}

	// Store AI message
	aiMessage := Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()),
		UserID:    c.GetString("user_id"),
		SessionID: sessionID,
		Role:      "assistant",
		Content:   aiResponse,
		Intent:    intentResponse.Intent,
		CreatedAt: time.Now(),
	}

	if err := s.saveConversation(aiMessage); err != nil {
		s.logger.WithError(err).Error("Failed to save AI message")
	}

	s.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"intent":     intentResponse.Intent,
	}).Info("Message processed successfully")

	c.JSON(http.StatusOK, gin.H{
		"message":    aiResponse,
		"session_id": sessionID,
		"intent":     intentResponse.Intent,
	})
}

func (s *Service) GetChatHistory(c *gin.Context) {
	sessionID := c.Param("session_id")
	
	messages, err := s.getConversationHistory(sessionID)
	if err != nil {
		s.logger.WithError(err).Error("Failed to get chat history")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id": sessionID,
		"messages":   messages,
	})
}

func (s *Service) DetectIntent(c *gin.Context) {
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	intent, err := s.DetectIntentInternal(req.Message)
	if err != nil {
		s.logger.WithError(err).Error("Failed to detect intent")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to detect intent"})
		return
	}

	c.JSON(http.StatusOK, intent)
}

func (s *Service) DetectIntentInternal(message string) (*IntentResponse, error) {
	// TODO: Implement actual intent detection using OpenAI or similar
	// For now, return a simple response
	
	intent := "general"
	confidence := 0.85

	// Simple keyword-based intent detection (for demo purposes)
	lowerMessage := strings.ToLower(message)
	
	if strings.Contains(lowerMessage, "行程") || strings.Contains(lowerMessage, "规划") {
		intent = "itinerary_planning"
		confidence = 0.9
	} else if strings.Contains(lowerMessage, "推荐") || strings.Contains(lowerMessage, "建议") {
		intent = "recommendation"
		confidence = 0.88
	} else if strings.Contains(lowerMessage, "价格") || strings.Contains(lowerMessage, "费用") {
		intent = "pricing"
		confidence = 0.92
	} else if strings.Contains(lowerMessage, "预订") || strings.Contains(lowerMessage, "订票") {
		intent = "booking"
		confidence = 0.95
	} else if strings.Contains(lowerMessage, "帮助") || strings.Contains(lowerMessage, "客服") {
		intent = "support"
		confidence = 0.9
	}

	return &IntentResponse{
		Intent:     intent,
		Confidence: confidence,
	}, nil
}

func (s *Service) GenerateItinerary(c *gin.Context) {
	var req ItineraryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate AI-powered itinerary
	itinerary, err := s.generateItineraryInternal(req)
	if err != nil {
		s.logger.WithError(err).Error("Failed to generate itinerary")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate itinerary"})
		return
	}

	// Store itinerary in database
	itineraryID := fmt.Sprintf("itinerary_%d", time.Now().Unix())
	itinerary.ID = itineraryID

	// TODO: Save to database
	s.logger.WithField("itinerary_id", itineraryID).Info("Itinerary generated successfully")

	c.JSON(http.StatusOK, gin.H{
		"message":   "Itinerary generated successfully",
		"itinerary": itinerary,
	})
}

func (s *Service) generateItineraryInternal(req ItineraryRequest) (*ItineraryResponse, error) {
	// TODO: Implement actual itinerary generation using OpenAI and knowledge base
	// For now, return a mock itinerary
	
	title := fmt.Sprintf("%s %d日游", req.Destination, req.Days)
	
	days := make([]ItineraryDay, req.Days)
	for i := 0; i < req.Days; i++ {
		date := time.Now().AddDate(0, 0, i).Format("2006-01-02")
		
		activities := []Activity{
			{
				ID:          fmt.Sprintf("act_%d_%d", i, 1),
				Name:        fmt.Sprintf("%s景点游览", req.Destination),
				Type:        "sightseeing",
				Location:    req.Destination,
				StartTime:   "09:00",
				EndTime:     "12:00",
				Description: fmt.Sprintf("探索%s的著名景点", req.Destination),
				Cost:        100,
			},
			{
				ID:          fmt.Sprintf("act_%d_%d", i, 2),
				Name:        "当地美食体验",
				Type:        "dining",
				Location:    req.Destination,
				StartTime:   "12:00",
				EndTime:     "14:00",
				Description: "品尝当地特色美食",
				Cost:        80,
			},
		}
		
		meals := []Meal{
			{
				Type:     "breakfast",
				Name:     "酒店早餐",
				Location: "酒店",
				Cost:     50,
				Cuisine:  "国际",
			},
			{
				Type:     "lunch",
				Name:     "当地特色餐厅",
				Location: req.Destination,
				Cost:     80,
				Cuisine:  "当地",
			},
			{
				Type:     "dinner",
				Name:     "海鲜大餐",
				Location: req.Destination,
				Cost:     150,
				Cuisine:  "海鲜",
			},
		}
		
		days[i] = ItineraryDay{
			Day:       i + 1,
			Date:      date,
			Activities: activities,
			Meals:     meals,
		}
	}

	budget := 0.0
	for _, day := range days {
		for _, activity := range day.Activities {
			budget += activity.Cost
		}
		for _, meal := range day.Meals {
			budget += meal.Cost
		}
	}

	return &ItineraryResponse{
		ID:        "",
		Title:     title,
		Days:      days,
		Budget:    budget,
		Tags:      []string{req.Destination, fmt.Sprintf("%d日游", req.Days)},
		CreatedAt: time.Now(),
	}, nil
}

func (s *Service) GetRecommendations(c *gin.Context) {
	var req RecommendationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement actual recommendation algorithm
	// For now, return mock recommendations
	recommendations := []Recommendation{
		{
			ID:        fmt.Sprintf("rec_%d", time.Now().Unix()),
			UserID:    req.UserID,
			Type:      "product",
			TargetID:  "product_1",
			Score:     0.95,
			Reason:    "基于您的浏览历史和偏好推荐",
			CreatedAt: time.Now(),
		},
		{
			ID:        fmt.Sprintf("rec_%d", time.Now().Unix()+1),
			UserID:    req.UserID,
			Type:      "destination",
			TargetID:  "destination_2",
			Score:     0.88,
			Reason:    "根据您的旅行风格推荐",
			CreatedAt: time.Now(),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"user_id":         req.UserID,
	})
}

func (s *Service) SearchKnowledge(c *gin.Context) {
	var req struct {
		Query string `json:"query" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement knowledge base search using vector database
	// For now, return mock results
	results := []map[string]interface{}{
		{
			"id":      "kb_1",
			"title":   "三亚旅游攻略",
			"content": "三亚是海南省著名的旅游城市，以其美丽的海滩和热带气候而闻名...",
			"score":   0.95,
		},
		{
			"id":      "kb_2",
			"title":   "最佳旅行时间",
			"content": "三亚的最佳旅行时间是每年的10月至次年4月...",
			"score":   0.88,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"query":   req.Query,
	})
}

func (s *Service) UpdateKnowledge(c *gin.Context) {
	var req struct {
		Title   string                 `json:"title" binding:"required"`
		Content string                 `json:"content" binding:"required"`
		Meta    map[string]interface{} `json:"meta"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement knowledge base update
	// For now, return success
	c.JSON(http.StatusOK, gin.H{
		"message": "Knowledge updated successfully",
		"title":   req.Title,
	})
}

func (s *Service) saveConversation(conv Conversation) error {
	// Store in Redis for quick access
	key := fmt.Sprintf("chat:%s", conv.SessionID)
	data, err := json.Marshal(conv)
	if err != nil {
		return err
	}

	return s.redis.RPush(context.Background(), key, data).Err()
}

func (s *Service) getConversationHistory(sessionID string) ([]Conversation, error) {
	key := fmt.Sprintf("chat:%s", sessionID)
	
	results, err := s.redis.LRange(context.Background(), key, 0, -1).Result()
	if err != nil {
		return nil, err
	}

	var messages []Conversation
	for _, result := range results {
		var conv Conversation
		if err := json.Unmarshal([]byte(result), &conv); err != nil {
			continue
		}
		messages = append(messages, conv)
	}

	return messages, nil
}

func (s *Service) generateAIResponse(message, intent, sessionID string) (string, error) {
	// TODO: Implement actual AI response generation using OpenAI API
	// For now, return a simple response based on intent
	
	switch intent {
	case "itinerary_planning":
		return "我很乐意帮您规划行程！请告诉我您想去哪里旅行，以及您计划停留几天，我会为您制定详细的行程安排。", nil
	case "recommendation":
		return "根据您的需求，我为您推荐了一些热门的旅游目的地和产品。您有什么特别偏好吗？", nil
	case "pricing":
		return "关于价格问题，我们的产品价格根据季节和预订时间有所不同。您想了解哪个具体产品的价格信息？", nil
	case "booking":
		return "我可以帮您预订！请告诉我您想预订什么产品，我会为您提供预订指引。", nil
	case "support":
		return "我是您的AI旅游助手，随时为您提供帮助。您有什么问题都可以问我！", nil
	default:
		return "感谢您的咨询！我是您的AI旅游助手，很高兴为您服务。请问有什么可以帮助您的吗？", nil
	}
}