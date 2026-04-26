/**
 * =====================================================
 * 类型定义模块 - 智能旅游助手数据类型接口
 * =====================================================
 * 
 * 本模块定义了项目中使用的所有 TypeScript 接口类型，包括：
 * - 用户相关：User, UserPreferences
 * - 产品相关：Product, ProductMetadata
 * - 行程相关：Itinerary, ItineraryDay, ItineraryActivity
 * - 订单相关：Order, OrderItem
 * - AI服务：AIConversation, Recommendation
 * - 目的地评论：DestinationComment
 * - 搜索过滤：SearchFilters
 */

/**
 * 用户基本信息接口
 * @description 存储用户账户信息、偏好设置和会员等级
 */
export interface User {
  id: string
  phone: string
  email: string
  nickname: string
  avatar_url?: string
  membership_level: number
  is_admin?: boolean
  preferences: UserPreferences
  created_at: string
  updated_at: string
}

/**
 * 用户偏好设置接口
 * @description 定义用户的旅行偏好，包括预算范围、旅行风格等
 */
export interface UserPreferences {
  destinations: string[]
  budget_range: {
    min: number
    max: number
  }
  travel_style: 'adventure' | 'relaxation' | 'cultural' | 'business'
  group_size: number
  interests: string[]
}

/**
 * 旅游产品接口
 * @description 表示机票、酒店、门票、体验等旅游产品
 * @example  { type: 'hotel', name: '北京饭店', price: 500, location: { city: '北京' } }
 */
export interface Product {
  id: string
  type: 'flight' | 'hotel' | 'ticket' | 'experience'
  name: string
  description: string
  price: number
  original_price?: number
  inventory: number
  tags: string[]
  metadata: ProductMetadata
  status: 'active' | 'inactive' | 'sold_out'
  images: string[]
  location: {
    city: string
    country: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  rating: number
  review_count: number
}

/**
 * 产品元数据接口
 * @description 根据产品类型包含不同的扩展信息（机票/酒店/门票/体验）
 */
export interface ProductMetadata {
  // Flight specific
  airline?: string
  flight_number?: string
  departure_airport?: string
  arrival_airport?: string
  departure_time?: string
  arrival_time?: string
  duration?: string

  // Hotel specific
  star_rating?: number
  amenities?: string[]
  room_type?: string
  check_in_time?: string
  check_out_time?: string

  // Ticket specific
  attraction_name?: string
  opening_hours?: string
  valid_days?: number
  time_slots?: string[]

  // Experience specific
  experience_duration?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  group_size_min?: number
  group_size_max?: number
  includes?: string[]
}

/**
 * 旅行行程接口
 * @description 表示用户规划的多日行程，包含每天的活动安排
 */
export interface Itinerary {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string
  days: ItineraryDay[]
  budget: number
  tags: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ItineraryDay {
  day: number
  date: string
  activities: ItineraryActivity[]
  meals: ItineraryMeal[]
  accommodation?: ItineraryAccommodation
  transportation?: Transportation[]
}

export interface ItineraryActivity {
  id: string
  name: string
  type: 'sightseeing' | 'dining' | 'shopping' | 'entertainment' | 'relaxation'
  location: string
  start_time: string
  end_time: string
  description: string
  cost: number
  rating?: number
  images?: string[]
}

export interface ItineraryMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  location: string
  cost: number
  cuisine: string
}

export interface ItineraryAccommodation {
  hotel_id: string
  name: string
  check_in: string
  check_out: string
  room_type: string
  cost_per_night: number
  total_cost: number
}

export interface Transportation {
  type: 'flight' | 'train' | 'bus' | 'car' | 'taxi'
  from: string
  to: string
  departure_time: string
  arrival_time: string
  cost: number
  provider?: string
  booking_reference?: string
}

/**
 * 订单接口
 * @description 表示用户的旅游产品订单，包含多个订单项
 */
export interface Order {
  id: string
  user_id: string
  order_no: string
  items: OrderItem[]
  total_amount: number
  status: 'pending' | 'paid' | 'cancelled' | 'completed' | 'refunded'
  payment_method: 'alipay' | 'wechat' | 'credit_card' | 'bank_transfer'
  payment_time?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_type: 'flight' | 'hotel' | 'ticket' | 'experience'
  quantity: number
  unit_price: number
  total_price: number
  booking_details: any
}

/**
 * AI对话记录接口
 * @description 存储用户与AI助手的对话历史
 */
export interface AIConversation {
  id: string
  user_id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  intent?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface Recommendation {
  id: string
  user_id: string
  type: 'product' | 'destination' | 'itinerary'
  target_id: string
  score: number
  reason: string
  created_at: string
  expires_at?: string
}

/**
 * 应用通知接口
 * @description 表示用户收到的系统通知
 */
export interface AppNotification {
  id: number
  user_id: number
  title: string
  content: string
  notification_type: string
  is_read: boolean
  created_at: string
  read_at?: string | null
}

export interface DestinationComment {
  id: string
  destination_id: number
  user_id: string
  content: string
  created_at: string
  updated_at?: string | null
  user?: {
    id: string
    nickname: string
    avatar_url?: string | null
  }
}

export interface SearchFilters {
  destination?: string
  start_date?: string
  end_date?: string
  budget_min?: number
  budget_max?: number
  travel_style?: string
  group_size?: number
  tags?: string[]
  rating_min?: number
}
