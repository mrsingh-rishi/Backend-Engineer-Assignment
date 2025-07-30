export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryAgent {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isAvailable: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable: boolean;
  imageUrl?: string;
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
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  createdAt: Date;
  menuItem?: MenuItem;
}

export interface Rating {
  id: string;
  userId: string;
  orderId: string;
  restaurantId?: string;
  deliveryAgentId?: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'user' | 'restaurant' | 'delivery_agent';
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Event interfaces for Kafka
export interface OrderPlacedEvent {
  orderId: string;
  userId: string;
  restaurantId: string;
  totalAmount: number;
  items: {
    menuItemId: string;
    quantity: number;
    price: number;
  }[];
  deliveryAddress: string;
  timestamp: Date;
}

export interface OrderAcceptedEvent {
  orderId: string;
  restaurantId: string;
  timestamp: Date;
}

export interface OrderRejectedEvent {
  orderId: string;
  restaurantId: string;
  reason?: string;
  timestamp: Date;
}

export interface DeliveryAssignedEvent {
  orderId: string;
  deliveryAgentId: string;
  timestamp: Date;
}

export interface DeliveryStatusUpdatedEvent {
  orderId: string;
  deliveryAgentId: string;
  status: OrderStatus;
  timestamp: Date;
}

export interface RatingSubmittedEvent {
  ratingId: string;
  userId: string;
  orderId: string;
  restaurantId?: string;
  deliveryAgentId?: string;
  rating: number;
  timestamp: Date;
}
