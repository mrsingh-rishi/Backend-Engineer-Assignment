export interface DeliveryAgent {
  id: string;
  userId: string;
  vehicleType: 'bicycle' | 'motorcycle' | 'car' | 'scooter';
  licenseNumber: string;
  isActive: boolean;
  isAvailable: boolean;
  isOnDelivery: boolean;
  currentLat?: number;
  currentLng?: number;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  joinedAt: Date;
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

export interface DeliveryOrder {
  id: string;
  userId: string;
  restaurantId: string;
  deliveryAgentId?: string;
  status: DeliveryOrderStatus;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: DeliveryAddress;
  restaurantAddress: DeliveryAddress;
  pickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  distance?: number;
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryOrderStatus = 
  | 'assigned'
  | 'accepted'
  | 'rejected'
  | 'en_route_to_restaurant'
  | 'arrived_at_restaurant'
  | 'picked_up'
  | 'en_route_to_customer'
  | 'arrived_at_customer'
  | 'delivered'
  | 'cancelled';

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  instructions?: string;
}

export interface LocationUpdate {
  deliveryAgentId: string;
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  bearing?: number;
}

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  deliveryAgentId: string;
  assignedAt: Date;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  rejectionReason?: string;
}

export interface EarningsRecord {
  id: string;
  deliveryAgentId: string;
  orderId: string;
  baseAmount: number;
  bonusAmount: number;
  totalAmount: number;
  currency: string;
  earnedAt: Date;
  payoutStatus: 'pending' | 'paid' | 'cancelled';
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
export interface DeliveryAgentLoginRequest {
  email: string;
  password: string;
}

export interface DeliveryAgentLoginResponse {
  token: string;
  refreshToken: string;
  agent: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    isAvailable: boolean;
  };
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
  speed?: number;
  bearing?: number;
}

export interface UpdateAvailabilityRequest {
  isAvailable: boolean;
}

export interface UpdateDeliveryStatusRequest {
  status: DeliveryOrderStatus;
  notes?: string;
  proofOfDelivery?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  vehicleType?: DeliveryAgent['vehicleType'];
  licenseNumber?: string;
}

export interface DeliveryFilters {
  status?: DeliveryOrderStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface EarningsFilters {
  startDate?: string;
  endDate?: string;
  payoutStatus?: 'pending' | 'paid' | 'cancelled';
  page?: number;
  limit?: number;
}

export interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  averageDeliveryTime: number;
  completionRate: number;
}
