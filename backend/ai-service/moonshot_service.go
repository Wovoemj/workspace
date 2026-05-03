package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

// ============== AI 模型配置 ==============

const (
	// 默认使用 MiMo
	DefaultAIProvider = "mimo" // "mimo" 或 "kimi"
)

var AIProviders = map[string]struct {
	BaseURL string
	Model   string
}{
	"mimo": {
		BaseURL: "https://token-plan-cn.xiaomimimo.com/v1",
		Model:   "MiMo-V2.5",
	},
	"kimi": {
		BaseURL: "https://api.moonshot.cn/v1",
		Model:   "kimi-k2.5",
	},
}

// AIModelOverride 环境变量覆盖模型名
var AIModelOverride = ""

// Moonshot 请求结构
type MoonshotMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type MoonshotRequest struct {
	Model       string            `json:"model"`
	Messages    []MoonshotMessage `json:"messages"`
	Temperature float64           `json:"temperature"`
	MaxTokens   int               `json:"max_tokens"`
	Stream      bool              `json:"stream"`
}

type MoonshotResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// ============== 服务结构 ==============

type Service struct {
	logger      *logrus.Logger
	redis       *redis.Client
	aiProvider  string
	aiAPI       string
}

type Conversation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	SessionID string    `json:"session_id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Intent    string    `json:"intent"`
	CreatedAt time.Time `json:"created_at"`
}

type MessageRequest struct {
	Message   string `json:"message" binding:"required"`
	SessionID string `json:"session_id"`
	SystemPrompt string `json:"system_prompt"` // 自定义系统提示词
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
	ID        string         `json:"id"`
	Title     string         `json:"title"`
	Days      []ItineraryDay `json:"days"`
	Budget    float64        `json:"budget"`
	Tags      []string       `json:"tags"`
	CreatedAt time.Time      `json:"created_at"`
}

type ItineraryDay struct {
	Day        int        `json:"day"`
	Date       string     `json:"date"`
	Activities []Activity `json:"activities"`
	Meals      []Meal     `json:"meals"`
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
	UserID  string                 `json:"user_id" binding:"required"`
	Context map[string]interface{} `json:"context"`
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

// ============== 构造函数 ==============

func NewService(logger *logrus.Logger, redis *redis.Client, aiProvider, aiAPI string) *Service {
	if _, ok := AIProviders[aiProvider]; !ok {
		aiProvider = DefaultAIProvider
	}
	return &Service{
		logger:     logger,
		redis:      redis,
		aiProvider: aiProvider,
		aiAPI:      aiAPI,
	}
}

// GetModelName 获取当前模型名（支持环境变量覆盖）
func (s *Service) GetModelName() string {
	if AIModelOverride != "" {
		return AIModelOverride
	}
	return AIProviders[s.aiProvider].Model
}

// GetBaseURL 获取当前 BaseURL
func (s *Service) GetBaseURL() string {
	return AIProviders[s.aiProvider].BaseURL
}

// ============== 路由设置 ==============

func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	ai := router.Group("/ai")
	{
		ai.POST("/chat", s.SendMessage)
		ai.GET("/chat/:session_id/history", s.GetChatHistory)
		ai.POST("/intent", s.DetectIntent)
		ai.POST("/itinerary/generate", s.GenerateItinerary)
		ai.POST("/recommendations", s.GetRecommendations)
		ai.POST("/knowledge/search", s.SearchKnowledge)
		ai.POST("/knowledge/update", s.UpdateKnowledge)
		
		// 流式对话端点
		ai.POST("/chat/stream", s.SendMessageStream)
	}
}

// ============== 核心对话功能 ==============

func (s *Service) SendMessage(c *gin.Context) {
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = fmt.Sprintf("session_%d", time.Now().Unix())
	}

	// 获取对话历史
	history, _ := s.getConversationHistory(sessionID)
	
	// 构建消息列表
	messages := s.buildMessages(req.Message, req.SystemPrompt, history)

	// 调用 Moonshot AI
	response, err := s.callMoonshot(messages)
	if err != nil {
		s.logger.WithError(err).Error("Moonshot API 调用失败")
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI服务调用失败: %v", err)})
		return
	}

	// 保存对话
	s.saveConversation(Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()),
		SessionID: sessionID,
		Role:      "user",
		Content:   req.Message,
		CreatedAt: time.Now(),
	})
	s.saveConversation(Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()+1),
		SessionID: sessionID,
		Role:      "assistant",
		Content:   response,
		CreatedAt: time.Now(),
	})

	c.JSON(http.StatusOK, gin.H{
		"message":    response,
		"session_id": sessionID,
	})
}

// 流式对话
func (s *Service) SendMessageStream(c *gin.Context) {
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = fmt.Sprintf("session_%d", time.Now().Unix())
	}

	// 获取对话历史
	history, _ := s.getConversationHistory(sessionID)
	messages := s.buildMessages(req.Message, req.SystemPrompt, history)

	// 设置 SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	// 流式调用
	err := s.callMoonshotStream(c, messages, sessionID)
	if err != nil {
		s.logger.WithError(err).Error("流式调用失败")
	}
}

// ============== Moonshot AI 调用 ==============

func (s *Service) buildMessages(userMessage, systemPrompt string, history []Conversation) []MoonshotMessage {
	var messages []MoonshotMessage

	// 系统提示词 - 这是让AI变"聪明"的关键！
	systemContent := systemPrompt
	if systemContent == "" {
		systemContent = `你是「智旅助手」，一个专业、友好的旅行规划AI助手。

【核心能力】
1. 行程规划：根据用户偏好定制最佳路线
2. 景点推荐：结合季节、预算、人数给出最优建议
3. 预算估算：提供透明、合理的费用预估
4. 实时问答：解答各类旅行相关问题

【回答风格】
- 语言简洁有条理，善用emoji增加趣味
- 不确定时主动说明，不要瞎编
- 涉及价格/政策时提醒以官方为准
- 根据上下文保持对话连贯性

【知识库】
如果有相关文档参考，优先基于文档回答；文档未覆盖的再用通用知识。`
	}

	messages = append(messages, MoonshotMessage{
		Role:    "system",
		Content: systemContent,
	})

	// 添加历史对话（限制最近10条，避免超出token限制）
	startIdx := 0
	if len(history) > 20 {
		startIdx = len(history) - 20
	}
	for _, h := range history[startIdx:] {
		messages = append(messages, MoonshotMessage{
			Role:    h.Role,
			Content: h.Content,
		})
	}

	// 添加当前用户消息
	messages = append(messages, MoonshotMessage{
		Role:    "user",
		Content: userMessage,
	})

	return messages
}

func (s *Service) callMoonshot(messages []MoonshotMessage) (string, error) {
	reqBody := MoonshotRequest{
		Model:       s.GetModelName(),
		Messages:    messages,
		Temperature: 0.7, // 适度创意但不胡编
		MaxTokens:   2000,
		Stream:      false,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/chat/completions", s.GetBaseURL()), bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.aiAPI))

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API返回错误: %s", string(body))
	}

	var moonshotResp MoonshotResponse
	if err := json.NewDecoder(resp.Body).Decode(&moonshotResp); err != nil {
		return "", err
	}

	if len(moonshotResp.Choices) == 0 {
		return "", fmt.Errorf("API返回空响应")
	}

	return moonshotResp.Choices[0].Message.Content, nil
}

func (s *Service) callMoonshotStream(c *gin.Context, messages []MoonshotMessage, sessionID string) error {
	reqBody := MoonshotRequest{
		Model:       s.GetModelName(),
		Messages:    messages,
		Temperature: 0.7,
		MaxTokens:   2000,
		Stream:      true,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/chat/completions", s.GetBaseURL()), bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.aiAPI))

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API返回错误: %d", resp.StatusCode)
	}

	// 保存完整响应
	fullContent := ""
	
	// 设置flush
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		return fmt.Errorf("不支持流式响应")
	}

	reader := resp.Body
	buffer := make([]byte, 1024)
	
	for {
		n, err := reader.Read(buffer)
		if n > 0 {
			chunk := string(buffer[:n])
			
			// SSE格式
			fmt.Fprintf(c.Writer, "data: %s\n\n", chunk)
			flusher.Flush()
			
			fullContent += chunk
		}
		if err != nil {
			break
		}
	}

	// 保存对话
	s.saveConversation(Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()),
		SessionID: sessionID,
		Role:      "user",
		Content:   messages[len(messages)-1].Content,
		CreatedAt: time.Now(),
	})

	return nil
}

// ============== 其他功能（保留原有实现） ==============

func (s *Service) GetChatHistory(c *gin.Context) {
	sessionID := c.Param("session_id")
	messages, err := s.getConversationHistory(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取历史记录失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"session_id": sessionID, "messages": messages})
}

func (s *Service) DetectIntent(c *gin.Context) {
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	intent, _ := s.DetectIntentInternal(req.Message)
	c.JSON(http.StatusOK, intent)
}

func (s *Service) DetectIntentInternal(message string) (*IntentResponse, error) {
	intent := "general"
	confidence := 0.85
	lowerMessage := strings.ToLower(message)

	if strings.Contains(lowerMessage, "行程") || strings.Contains(lowerMessage, "规划") || strings.Contains(lowerMessage, "几天") {
		intent = "itinerary_planning"
		confidence = 0.9
	} else if strings.Contains(lowerMessage, "推荐") || strings.Contains(lowerMessage, "建议") || strings.Contains(lowerMessage, "好玩") {
		intent = "recommendation"
		confidence = 0.88
	} else if strings.Contains(lowerMessage, "价格") || strings.Contains(lowerMessage, "费用") || strings.Contains(lowerMessage, "多少钱") {
		intent = "pricing"
		confidence = 0.92
	} else if strings.Contains(lowerMessage, "预订") || strings.Contains(lowerMessage, "订票") || strings.Contains(lowerMessage, "买票") {
		intent = "booking"
		confidence = 0.95
	}

	return &IntentResponse{Intent: intent, Confidence: confidence}, nil
}

func (s *Service) GenerateItinerary(c *gin.Context) {
	var req ItineraryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	itinerary, _ := s.generateItineraryInternal(req)
	c.JSON(http.StatusOK, gin.H{"message": "生成成功", "itinerary": itinerary})
}

func (s *Service) generateItineraryInternal(req ItineraryRequest) (*ItineraryResponse, error) {
	title := fmt.Sprintf("%s %d日游", req.Destination, req.Days)
	days := make([]ItineraryDay, req.Days)
	
	for i := 0; i < req.Days; i++ {
		days[i] = ItineraryDay{
			Day:        i + 1,
			Date:       time.Now().AddDate(0, 0, i).Format("2006-01-02"),
			Activities: []Activity{},
			Meals:      []Meal{},
		}
	}

	return &ItineraryResponse{
		ID:        fmt.Sprintf("itinerary_%d", time.Now().Unix()),
		Title:     title,
		Days:      days,
		Budget:    float64(req.Days * 500),
		Tags:      []string{req.Destination},
		CreatedAt: time.Now(),
	}, nil
}

func (s *Service) GetRecommendations(c *gin.Context) {
	var req RecommendationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"recommendations": []Recommendation{}, "user_id": req.UserID})
}

func (s *Service) SearchKnowledge(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"results": []map[string]interface{}{}, "query": ""})
}

func (s *Service) UpdateKnowledge(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

func (s *Service) saveConversation(conv Conversation) error {
	key := fmt.Sprintf("chat:%s", conv.SessionID)
	data, _ := json.Marshal(conv)
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
		if err := json.Unmarshal([]byte(result), &conv); err == nil {
			messages = append(messages, conv)
		}
	}
	return messages, nil
}
