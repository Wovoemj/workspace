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
