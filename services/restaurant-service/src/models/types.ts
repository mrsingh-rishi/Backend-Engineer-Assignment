export interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  cuisineType?: string;
  isOnline: boolean;
  rating: number;
  openingTime?: string;
  closingTime?: string;
  imageUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  isAvailable: boolean;
  imageUrl?: string;
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  deliveryAgentId?: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  specialInstructions?: string;
  items: OrderItem[];
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  menuItem?: MenuItem;
}

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface DeliveryAgent {
  id: string;
  userId: string;
  vehicleType: string;
  licenseNumber: string;
  isActive: boolean;
  isAvailable: boolean;
  currentLat?: number;
  currentLng?: number;
  rating: number;
  totalDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'user',
  RESTAURANT = 'restaurant',
  DELIVERY_AGENT = 'delivery_agent',
  ADMIN = 'admin',
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request/Response DTOs
export interface RestaurantLoginRequest {
  email: string;
  password: string;
}

export interface RestaurantLoginResponse {
  token: string;
  refreshToken: string;
  restaurant: {
    id: string;
    name: string;
    email: string;
    isOnline: boolean;
  };
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  category: string;
  isAvailable?: boolean;
  imageUrl?: string;
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  isAvailable?: boolean;
  imageUrl?: string;
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface UpdateRestaurantProfileRequest {
  name?: string;
  phone?: string;
  address?: string;
  cuisineType?: string;
  openingTime?: string;
  closingTime?: string;
  imageUrl?: string;
  description?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  estimatedDeliveryTime?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
