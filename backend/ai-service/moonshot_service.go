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

// ============== AI 模型配置部分 ==============

// 常量定义：默认的AI提供商类型
const (
	// DefaultAIProvider 默认使用MiMo模型（腾讯的AI模型）
	// 可选值："mimo" 或 "kimi"
	DefaultAIProvider = "mimo"
)

// AIProviders 存储不同AI提供商的配置信息
// key: 提供商名称（"mimo" 或 "kimi"）
// value: 包含BaseURL（API地址）和Model（模型名称）的结构体
var AIProviders = map[string]struct {
	BaseURL string // AI服务的API基础地址
	Model   string // 使用的模型名称
}{
	"mimo": {
		// MiMo模型的API地址
		BaseURL: "https://token-plan-cn.xiaomimimo.com/v1",
		// MiMo模型版本
		Model:   "MiMo-V2.5",
	},
	"kimi": {
		// Kimi（Moonshot）模型的API地址
		BaseURL: "https://api.moonshot.cn/v1",
		// Kimi模型版本
		Model:   "kimi-k2.5",
	},
}

// AIModelOverride 允许环境变量覆盖默认模型名
// 如果设置了此变量，则忽略AIProviders中的配置，使用此变量指定的模型
var AIModelOverride = ""

// ============== 请求和响应数据结构定义 ==============

// MoonshotMessage 定义AI对话中的单条消息结构
type MoonshotMessage struct {
	Role    string `json:"role"`    // 消息角色："system"（系统）、"user"（用户）、"assistant"（助手）
	Content string `json:"content"` // 消息内容
}

// MoonshotRequest 定义发送给AI模型的请求结构
type MoonshotRequest struct {
	Model       string            `json:"model"`        // 使用的AI模型名称
	Messages    []MoonshotMessage `json:"messages"`    // 对话历史消息列表
	Temperature float64           `json:"temperature"` // 温度参数（控制随机性，0-1之间，越大越随机）
	MaxTokens   int               `json:"max_tokens"`   // 最大生成的token数量（控制回复长度）
	Stream      bool              `json:"stream"`       // 是否使用流式响应
}

// MoonshotResponse 定义AI模型的响应结构
type MoonshotResponse struct {
	ID      string `json:"id"` // 响应ID
	Choices []struct {
		Message struct {
			Role    string `json:"role"`    // 回复角色（通常是"assistant"）
			Content string `json:"content"` // 回复内容
		} `json:"message"`
	} `json:"choices"` // AI可能返回多个候选回复，通常取第一个
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`      // 提示词消耗的token数量
		CompletionTokens int `json:"completion_tokens"`  // 生成的回复消耗的token数量
		TotalTokens      int `json:"total_tokens"`       // 总消耗的token数量
	} `json:"usage"` // 用于统计和计费
}

// ============== 服务结构定义 ==============

// Service AI服务的核心结构体，包含所有依赖
type Service struct {
	logger      *logrus.Logger // 日志器，用于记录日志
	redis       *redis.Client  // Redis客户端，用于缓存对话历史
	aiProvider  string        // AI提供商名称（"mimo" 或 "kimi"）
	aiAPI       string        // AI API密钥
}

// Conversation 定义对话记录的结构
type Conversation struct {
	ID        string    `json:"id"`         // 对话记录唯一ID
	UserID    string    `json:"user_id"`    // 用户ID
	SessionID string    `json:"session_id"` // 会话ID（用于区分不同对话线程）
	Role      string    `json:"role"`       // 消息角色（"user" 或 "assistant"）
	Content   string    `json:"content"`    // 消息内容
	Intent    string    `json:"intent"`     // 用户意图（如"itinerary_planning"行程规划）
	CreatedAt time.Time `json:"created_at"` // 创建时间
}

// MessageRequest 定义接收用户消息的请求结构
type MessageRequest struct {
	Message      string `json:"message" binding:"required"`       // 用户消息内容（必填）
	SessionID    string `json:"session_id"`                        // 会话ID（可选，用于保持对话上下文）
	SystemPrompt string `json:"system_prompt"`                     // 自定义系统提示词（可选，用于定制AI行为）
}

// IntentResponse 定义意图识别的响应结构
type IntentResponse struct {
	Intent     string  `json:"intent"`      // 识别出的用户意图
	Confidence float64 `json:"confidence"`  // 置信度（0-1之间，1表示完全确定）
}

// ItineraryRequest 定义生成行程规划的请求结构
type ItineraryRequest struct {
	Destination string                 `json:"destination" binding:"required"` // 目的地（必填）
	Days        int                    `json:"days" binding:"required"`        // 游玩天数（必填）
	Preferences map[string]interface{} `json:"preferences"`                    // 用户偏好（如预算、兴趣等）
}

// ItineraryResponse 定义行程规划的响应结构
type ItineraryResponse struct {
	ID        string         `json:"id"`         // 行程ID
	Title     string         `json:"title"`      // 行程标题
	Days      []ItineraryDay `json:"days"`       // 每天的行程安排
	Budget    float64        `json:"budget"`     // 预算估算
	Tags      []string       `json:"tags"`       // 标签（如"家庭游"、"蜜月"等）
	CreatedAt time.Time      `json:"created_at"` // 创建时间
}

// ItineraryDay 定义单日行程的结构
type ItineraryDay struct {
	Day        int        `json:"day"`         // 第几天
	Date       string     `json:"date"`        // 日期（YYYY-MM-DD格式）
	Activities []Activity `json:"activities"`  // 当天的活动列表
	Meals      []Meal     `json:"meals"`      // 当天的用餐安排
}

// Activity 定义单个活动的结构
type Activity struct {
	ID          string  `json:"id"`          // 活动ID
	Name        string  `json:"name"`        // 活动名称（如"参观故宫"）
	Type        string  `json:"type"`        // 活动类型（如"观光"、"购物"等）
	Location    string  `json:"location"`    // 活动地点
	StartTime   string  `json:"start_time"`  // 开始时间（HH:MM格式）
	EndTime     string  `json:"end_time"`    // 结束时间（HH:MM格式）
	Description string  `json:"description"` // 活动描述
	Cost        float64 `json:"cost"`        // 活动费用
}

// Meal 定义用餐安排的结构
type Meal struct {
	Type     string  `json:"type"`     // 餐型（"breakfast"早餐、"lunch"午餐、"dinner"晚餐）
	Name     string  `json:"name"`     // 餐厅名称
	Location string  `json:"location"` // 餐厅位置
	Cost     float64 `json:"cost"`     // 餐费
	Cuisine  string  `json:"cuisine"`  // 菜系（如"川菜"、"粤菜"）
}

// RecommendationRequest 定义获取推荐内容的请求结构
type RecommendationRequest struct {
	UserID  string                 `json:"user_id" binding:"required"` // 用户ID（必填）
	Context map[string]interface{} `json:"context"`                    // 上下文信息（如当前浏览的页面、时间等）
}

// Recommendation 定义推荐内容的结构
type Recommendation struct {
	ID        string                 `json:"id"`        // 推荐项ID
	UserID    string                 `json:"user_id"`   // 用户ID
	Type      string                 `json:"type"`      // 推荐类型（如"destination"目的地、"product"产品）
	TargetID  string                 `json:"target_id"` // 推荐目标的ID
	Score     float64                `json:"score"`     // 推荐分数（越高表示越匹配）
	Reason    string                 `json:"reason"`    // 推荐理由
	CreatedAt time.Time              `json:"created_at"` // 创建时间
}

// ============== 构造函数 ==============

// NewService 创建新的AI服务实例
// 参数：
//   - logger: 日志器实例
//   - redis: Redis客户端实例
//   - aiProvider: AI提供商名称
//   - aiAPI: AI API密钥
// 返回：
//   - 初始化完成的Service实例指针
func NewService(logger *logrus.Logger, redis *redis.Client, aiProvider, aiAPI string) *Service {
	// 检查指定的AI提供商是否在支持列表中
	if _, ok := AIProviders[aiProvider]; !ok {
		// 如果不支持，使用默认的AI提供商
		aiProvider = DefaultAIProvider
	}
	// 返回初始化后的Service实例
	return &Service{
		logger:     logger,
		redis:      redis,
		aiProvider: aiProvider,
		aiAPI:      aiAPI,
	}
}

// GetModelName 获取当前使用的AI模型名称
// 返回：
//   - 模型名称（如果设置了AIModelOverride则使用它，否则使用配置文件中的模型）
func (s *Service) GetModelName() string {
	// 如果设置了环境变量覆盖，则使用覆盖的模型名
	if AIModelOverride != "" {
		return AIModelOverride
	}
	// 否则使用配置文件中指定的模型
	return AIProviders[s.aiProvider].Model
}

// GetBaseURL 获取当前AI提供商的API基础地址
// 返回：
//   - API基础URL
func (s *Service) GetBaseURL() string {
	return AIProviders[s.aiProvider].BaseURL
}

// ============== 路由设置 ==============

// SetupRoutes 设置AI服务的所有API路由
// 参数：
//   - router: Gin路由组实例
func (s *Service) SetupRoutes(router *gin.RouterGroup) {
	// 创建AI相关的路由组，路径前缀为"/ai"
	ai := router.Group("/ai")
	{
		// 普通对话接口（非流式）
		ai.POST("/chat", s.SendMessage)
		// 获取指定会话的对话历史
		ai.GET("/chat/:session_id/history", s.GetChatHistory)
		// 意图识别接口（分析用户消息的意图）
		ai.POST("/intent", s.DetectIntent)
		// 生成行程规划
		ai.POST("/itinerary/generate", s.GenerateItinerary)
		// 获取个性化推荐
		ai.POST("/recommendations", s.GetRecommendations)
		// 搜索知识库（RAG功能）
		ai.POST("/knowledge/search", s.SearchKnowledge)
		// 更新知识库
		ai.POST("/knowledge/update", s.UpdateKnowledge)
		
		// 流式对话端点（用于实现类似ChatGPT的逐字输出效果）
		ai.POST("/chat/stream", s.SendMessageStream)
	}
}

// ============== 核心对话功能 ==============

// SendMessage 处理用户发送的消息（非流式）
// 功能：接收用户消息，调用AI模型生成回复，保存对话历史，返回回复
func (s *Service) SendMessage(c *gin.Context) {
	// 解析请求体中的JSON数据到MessageRequest结构体
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果请求格式错误，返回400错误
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取或生成会话ID
	sessionID := req.SessionID
	if sessionID == "" {
		// 如果请求中没有提供session_id，自动生成一个（基于当前时间戳）
		sessionID = fmt.Sprintf("session_%d", time.Now().Unix())
	}

	// 从Redis中获取该会话的历史对话记录
	history, _ := s.getConversationHistory(sessionID)
	
	// 构建发送给AI模型的消息列表（包含系统提示、历史对话、当前消息）
	messages := s.buildMessages(req.Message, req.SystemPrompt, history)

	// 调用AI模型（Mooshot或MiMo）获取回复
	response, err := s.callMoonshot(messages)
	if err != nil {
		// 如果AI调用失败，记录错误日志并返回500错误
		s.logger.WithError(err).Error("Moonshot API 调用失败")
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI服务调用失败: %v", err)})
		return
	}

	// 保存用户消息到Redis（用于对话历史）
	s.saveConversation(Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()),    // 生成唯一的消息ID
		SessionID: sessionID,                                   // 关联的会话ID
		Role:      "user",                                      // 消息角色：用户
		Content:   req.Message,                                  // 消息内容
		CreatedAt: time.Now(),                                   // 创建时间
	})
	// 保存AI助手的回复到Redis
	s.saveConversation(Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()+1), // 消息ID（加1避免与用户消息ID冲突）
		SessionID: sessionID,                                   // 关联的会话ID
		Role:      "assistant",                                  // 消息角色：助手
		Content:   response,                                    // 回复内容
		CreatedAt: time.Now(),                                   // 创建时间
	})

	// 返回AI的回复给前端
	c.JSON(http.StatusOK, gin.H{
		"message":    response,   // AI的回复内容
		"session_id": sessionID,  // 会话ID（前端用于后续对话）
	})
}

// SendMessageStream 处理流式对话请求（逐字输出效果）
// 功能：与SendMessage类似，但使用Server-Sent Events (SSE)实现流式响应
func (s *Service) SendMessageStream(c *gin.Context) {
	// 解析请求体
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取或生成会话ID
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = fmt.Sprintf("session_%d", time.Now().Unix())
	}

	// 获取对话历史并构建消息列表
	history, _ := s.getConversationHistory(sessionID)
	messages := s.buildMessages(req.Message, req.SystemPrompt, history)

	// 设置SSE（Server-Sent Events）响应头
	// SSE用于实现服务器向客户端推送数据的单向通道
	c.Header("Content-Type", "text/event-stream")    // 声明内容为事件流
	c.Header("Cache-Control", "no-cache")             // 禁止缓存
	c.Header("Connection", "keep-alive")              // 保持连接
	c.Header("Transfer-Encoding", "chunked")          // 分块传输编码

	// 调用流式AI接口
	err := s.callMoonshotStream(c, messages, sessionID)
	if err != nil {
		// 记录错误日志
		s.logger.WithError(err).Error("流式调用失败")
	}
}

// ============== AI模型调用相关函数 ==============

// buildMessages 构建发送给AI模型的消息列表
// 参数：
//   - userMessage: 当前用户的消息
//   - systemPrompt: 自定义系统提示词（可选）
//   - history: 历史对话记录
// 返回：
//   - 构建完成的消息列表
func (s *Service) buildMessages(userMessage, systemPrompt string, history []Conversation) []MoonshotMessage {
	var messages []MoonshotMessage

	// ========== 添加系统提示词 ==========
	// 系统提示词用于定义AI的角色、能力和回答风格
	systemContent := systemPrompt
	if systemContent == "" {
		// 如果用户没有自定义系统提示词，使用默认提示词
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

	// 将系统提示词添加到消息列表的第一个位置
	messages = append(messages, MoonshotMessage{
		Role:    "system",      // 角色：系统
		Content: systemContent, // 系统提示词内容
	})

	// ========== 添加历史对话记录 ==========
	// 将历史对话添加到消息列表中，让AI能够理解上下文
	startIdx := 0
	// 只保留最近20条消息（避免超出token限制）
	if len(history) > 20 {
		startIdx = len(history) - 20
	}
	// 遍历历史记录，将其转换为MoonshotMessage格式
	for _, h := range history[startIdx:] {
		messages = append(messages, MoonshotMessage{
			Role:    h.Role,    // 消息角色（"user"或"assistant"）
			Content: h.Content, // 消息内容
		})
	}

	// ========== 添加当前用户消息 ==========
	// 将用户的最新消息添加到消息列表末尾
	messages = append(messages, MoonshotMessage{
		Role:    "user",         // 角色：用户
		Content: userMessage,   // 用户消息内容
	})

	return messages
}

// callMoonshot 调用AI模型获取回复（非流式）
// 参数：
//   - messages: 构建好的消息列表
// 返回：
//   - AI的回复内容
//   - 错误信息
func (s *Service) callMoonshot(messages []MoonshotMessage) (string, error) {
	// 构建请求体
	reqBody := MoonshotRequest{
		Model:       s.GetModelName(), // 使用的模型名称
		Messages:    messages,         // 消息列表
		Temperature: 0.7,             // 温度参数：0.7表示适度创意（不会太死板也不会太胡编）
		MaxTokens:   2000,             // 最大生成2000个token（约1500个汉字）
		Stream:      false,            // 不使用流式响应
	}

	// 将请求体序列化为JSON格式
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// 创建HTTP POST请求，发送到AI模型的API地址
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/chat/completions", s.GetBaseURL()), bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")                       // 声明请求体为JSON格式
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.aiAPI))      // 设置API密钥（Bearer认证）

	// 创建HTTP客户端，设置超时时间为60秒
	client := &http.Client{Timeout: 60 * time.Second}
	// 发送HTTP请求
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	// 确保响应体在函数结束时关闭（防止内存泄漏）
	defer resp.Body.Close()

	// 检查HTTP响应状态码
	if resp.StatusCode != http.StatusOK {
		// 如果状态码不是200，读取错误响应体
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API返回错误: %s", string(body))
	}

	// 解析AI模型的JSON响应
	var moonshotResp MoonshotResponse
	if err := json.NewDecoder(resp.Body).Decode(&moonshotResp); err != nil {
		return "", err
	}

	// 检查是否有回复内容
	if len(moonshotResp.Choices) == 0 {
		return "", fmt.Errorf("API返回空响应")
	}

	// 返回AI的第一个候选回复内容
	return moonshotResp.Choices[0].Message.Content, nil
}

// callMoonshotStream 调用AI模型获取回复（流式）
// 功能：实现流式响应，让前端能够逐字显示AI的回复
// 参数：
//   - c: Gin上下文（用于SSE推送）
//   - messages: 构建好的消息列表
//   - sessionID: 会话ID
// 返回：
//   - 错误信息
func (s *Service) callMoonshotStream(c *gin.Context, messages []MoonshotMessage, sessionID string) error {
	// 构建请求体（与callMoonshot类似，但Stream设为true）
	reqBody := MoonshotRequest{
		Model:       s.GetModelName(),
		Messages:    messages,
		Temperature: 0.7,
		MaxTokens:   2000,
		Stream:      true, // 启用流式响应
	}

	// 序列化为JSON
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	// 创建HTTP POST请求
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/chat/completions", s.GetBaseURL()), bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.aiAPI))

	// 创建HTTP客户端（流式响应需要更长的超时时间）
	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API返回错误: %d", resp.StatusCode)
	}

	// ========== 处理流式响应 ==========
	// 用于保存完整的AI回复（以便后续保存到Redis）
	fullContent := ""
	
	// 类型断言：将Gin的ResponseWriter转换为支持Flush的接口
	// Flush用于将缓冲区的数据立即推送到客户端
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		// 如果不支持Flush，返回错误
		return fmt.Errorf("不支持流式响应")
	}

	// 读取响应体的数据流
	reader := resp.Body
	buffer := make([]byte, 1024) // 创建1KB的缓冲区
	
	// 循环读取流式数据
	for {
		// 从响应体中读取数据块
		n, err := reader.Read(buffer)
		if n > 0 {
			// 如果有数据，将其转换为字符串
			chunk := string(buffer[:n])
			
			// 以SSE格式推送数据到前端
			// SSE格式：data: <内容>\n\n
			fmt.Fprintf(c.Writer, "data: %s\n\n", chunk)
			// 立即刷新缓冲区，将数据推送到客户端
			flusher.Flush()
			
			// 拼接完整内容
			fullContent += chunk
		}
		// 如果读取到文件末尾或发生错误，退出循环
		if err != nil {
			break
		}
	}

	// ========== 保存对话记录到Redis ==========
	s.saveConversation(Conversation{
		ID:        fmt.Sprintf("msg_%d", time.Now().Unix()),    // 消息ID
		SessionID: sessionID,                                   // 会话ID
		Role:      "user",                                      // 角色：用户
		Content:   messages[len(messages)-1].Content,           // 用户的最新消息
		CreatedAt: time.Now(),                                   // 创建时间
	})

	// 注意：流式响应中，AI的回复是逐块返回的，这里只保存了用户消息
	// 完整的AI回复需要在前端拼接，或者通过其他方式保存
	
	return nil
}

// ============== 其他API接口实现 ==============

// GetChatHistory 获取指定会话的对话历史
func (s *Service) GetChatHistory(c *gin.Context) {
	// 从URL路径参数中获取session_id
	sessionID := c.Param("session_id")
	// 从Redis中读取该会话的所有历史消息
	messages, err := s.getConversationHistory(sessionID)
	if err != nil {
		// 如果读取失败，返回500错误
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取历史记录失败"})
		return
	}
	// 返回会话ID和历史消息列表
	c.JSON(http.StatusOK, gin.H{"session_id": sessionID, "messages": messages})
}

// DetectIntent 识别用户消息的意图
func (s *Service) DetectIntent(c *gin.Context) {
	// 解析请求体
	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// 调用内部意图识别函数
	intent, _ := s.DetectIntentInternal(req.Message)
	// 返回识别出的意图和置信度
	c.JSON(http.StatusOK, intent)
}

// DetectIntentInternal 意图识别的内部实现
// 功能：根据用户消息内容，判断用户的意图（行程规划、推荐、价格查询、预订等）
// 参数：
//   - message: 用户消息
// 返回：
//   - 意图识别结果（包含意图类型和置信度）
func (s *Service) DetectIntentInternal(message string) (*IntentResponse, error) {
	// 默认意图为"general"（通用对话）
	intent := "general"
	// 默认置信度0.85
	confidence := 0.85
	
	// 将消息转换为小写，便于匹配（不区分大小写）
	lowerMessage := strings.ToLower(message)

	// ========== 意图识别逻辑 ==========
	// 通过关键词匹配来判断用户意图
	
	// 如果消息包含"行程"、"规划"、"几天"等关键词，判断为行程规划意图
	if strings.Contains(lowerMessage, "行程") || strings.Contains(lowerMessage, "规划") || strings.Contains(lowerMessage, "几天") {
		intent = "itinerary_planning" // 行程规划
		confidence = 0.9              // 置信度0.9（较高）
	} else if strings.Contains(lowerMessage, "推荐") || strings.Contains(lowerMessage, "建议") || strings.Contains(lowerMessage, "好玩") {
		// 如果包含"推荐"、"建议"、"好玩"，判断为推荐意图
		intent = "recommendation" // 推荐
		confidence = 0.88
	} else if strings.Contains(lowerMessage, "价格") || strings.Contains(lowerMessage, "费用") || strings.Contains(lowerMessage, "多少钱") {
		// 如果包含"价格"、"费用"、"多少钱"，判断为价格查询意图
		intent = "pricing" // 价格查询
		confidence = 0.92  // 置信度最高（关键词明确）
	} else if strings.Contains(lowerMessage, "预订") || strings.Contains(lowerMessage, "订票") || strings.Contains(lowerMessage, "买票") {
		// 如果包含"预订"、"订票"、"买票"，判断为预订意图
		intent = "booking" // 预订
		confidence = 0.95  // 置信度最高
	}

	// 返回意图识别结果
	return &IntentResponse{Intent: intent, Confidence: confidence}, nil
}

// GenerateItinerary 生成行程规划
func (s *Service) GenerateItinerary(c *gin.Context) {
	// 解析请求体
	var req ItineraryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// 调用内部生成行程的函数
	itinerary, _ := s.generateItineraryInternal(req)
	// 返回生成结果
	c.JSON(http.StatusOK, gin.H{"message": "生成成功", "itinerary": itinerary})
}

// generateItineraryInternal 生成行程规划的内部实现
// 功能：根据用户提供的目的地和天数，生成初步的行程框架
// 参数：
//   - req: 行程规划请求（包含目的地、天数、偏好等）
// 返回：
//   - 生成的行程规划
//   - 错误信息
func (s *Service) generateItineraryInternal(req ItineraryRequest) (*ItineraryResponse, error) {
	// 生成行程标题（如"北京 3日游"）
	title := fmt.Sprintf("%s %d日游", req.Destination, req.Days)
	// 创建指定天数的行程数组
	days := make([]ItineraryDay, req.Days)
	
	// 为每一天创建空的行程框架
	for i := 0; i < req.Days; i++ {
		days[i] = ItineraryDay{
			Day:        i + 1,                                                       // 第几天（从1开始）
			Date:       time.Now().AddDate(0, 0, i).Format("2006-01-02"),           // 日期（从今天开始往后推）
			Activities: []Activity{},                                                 // 活动列表（暂时为空，等待AI填充）
			Meals:      []Meal{},                                                     // 用餐列表（暂时为空）
		}
	}

	// 返回生成的行程规划
	// 注意：这是一个简化版的行程生成，实际应用中应该调用AI模型来生成详细的活动安排
	return &ItineraryResponse{
		ID:        fmt.Sprintf("itinerary_%d", time.Now().Unix()), // 生成唯一的行程ID
		Title:     title,                                         // 行程标题
		Days:      days,                                          // 每天的行程
		Budget:    float64(req.Days * 500),                      // 粗略预算估算（每天500元）
		Tags:      []string{req.Destination},                     // 标签（目的地）
		CreatedAt: time.Now(),                                    // 创建时间
	}, nil
}

// GetRecommendations 获取个性化推荐
func (s *Service) GetRecommendations(c *gin.Context) {
	// 解析请求体
	var req RecommendationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// 返回空推荐列表（待实现）
	// TODO: 根据实际业务逻辑，调用推荐算法生成个性化推荐
	c.JSON(http.StatusOK, gin.H{"recommendations": []Recommendation{}, "user_id": req.UserID})
}

// SearchKnowledge 搜索知识库（RAG功能）
// 功能：根据用户查询，从知识库中检索相关文档（待实现）
func (s *Service) SearchKnowledge(c *gin.Context) {
	// 返回空结果（待实现）
	// TODO: 实现基于向量相似度的知识库搜索
	c.JSON(http.StatusOK, gin.H{"results": []map[string]interface{}{}, "query": ""})
}

// UpdateKnowledge 更新知识库
// 功能：将新文档添加到知识库中（待实现）
func (s *Service) UpdateKnowledge(c *gin.Context) {
	// 返回成功消息（待实现）
	// TODO: 实现文档向量化并存储到向量数据库
	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

// ============== Redis存储相关函数 ==============

// saveConversation 保存对话记录到Redis
// 功能：将单条对话记录序列化为JSON并存储到Redis列表中
// 参数：
//   - conv: 对话记录结构体
// 返回：
//   - 错误信息
func (s *Service) saveConversation(conv Conversation) error {
	// 构建Redis键名（格式：chat:<session_id>）
	key := fmt.Sprintf("chat:%s", conv.SessionID)
	// 将对话记录序列化为JSON格式
	data, _ := json.Marshal(conv)
	// 使用RPush命令将对话记录添加到Redis列表的末尾
	// Redis列表按插入顺序存储，可以方便地获取历史记录
	return s.redis.RPush(context.Background(), key, data).Err()
}

// getConversationHistory 从Redis中获取对话历史
// 功能：根据session_id从Redis中读取所有历史对话记录
// 参数：
//   - sessionID: 会话ID
// 返回：
//   - 对话记录列表
//   - 错误信息
func (s *Service) getConversationHistory(sessionID string) ([]Conversation, error) {
	// 构建Redis键名
	key := fmt.Sprintf("chat:%s", sessionID)
	// 使用LRange命令获取列表中的所有元素（0表示第一个元素，-1表示最后一个元素）
	results, err := s.redis.LRange(context.Background(), key, 0, -1).Result()
	if err != nil {
		return nil, err
	}
	
	// 遍历Redis返回的数据，反序列化为Conversation结构体
	var messages []Conversation
	for _, result := range results {
		var conv Conversation
		// 将JSON字符串反序列化为Conversation结构体
		if err := json.Unmarshal([]byte(result), &conv); err == nil {
			messages = append(messages, conv)
		}
	}
	return messages, nil
}
