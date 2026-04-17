export interface Profile {
  id: string
  role: 'chef' | 'customer'
  full_name: string | null
  avatar_url: string | null
  phone: string | null
}

export interface ChefProfile {
  id: string
  bio: string | null
  location: string | null
  cuisine_tags: string[] | null
  rating: number | null
  review_count: number | null
  is_available: boolean | null
  pickup_address_line1: string | null
  pickup_address_postcode: string | null
  profile?: Profile
}

export interface MenuItem {
  id: string
  menu_id: string
  name: string
  description: string | null
  price: number
  category: string | null
  dietary_tags: string[] | null
  image_url: string | null
  is_available: boolean | null
}

export interface Menu {
  id: string
  chef_id: string
  name: string
  description: string | null
  is_active: boolean | null
  menu_items: MenuItem[]
}

export interface Order {
  id: string
  customer_id: string
  chef_id: string
  status: string
  total: number
  notes: string | null
  delivery_address_text: string | null
  gophr_delivery_eta: string | null
  created_at: string
  chef?: { full_name: string | null }
  customer?: { full_name: string | null }
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  menu_item: { name: string } | null
}
