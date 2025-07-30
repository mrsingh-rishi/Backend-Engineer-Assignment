import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Restaurant schemas
export const getRestaurantsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
    cuisine: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const getRestaurantSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid restaurant ID format'),
  }),
});

// Order schemas
export const createOrderSchema = z.object({
  body: z.object({
    restaurantId: z.string().uuid('Invalid restaurant ID format'),
    items: z.array(
      z.object({
        menuItemId: z.string().uuid('Invalid menu item ID format'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
      })
    ).min(1, 'At least one item is required'),
    deliveryAddress: z.string().min(10, 'Delivery address must be at least 10 characters'),
    specialInstructions: z.string().optional(),
  }),
});

export const getOrdersSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
    status: z.enum(['pending', 'accepted', 'rejected', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled']).optional(),
  }),
});

export const getOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID format'),
  }),
});

export const cancelOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID format'),
  }),
});

// Rating schemas
export const createRatingSchema = z.object({
  body: z.object({
    orderId: z.string().uuid('Invalid order ID format'),
    restaurantRating: z.number().int().min(1).max(5).optional(),
    restaurantComment: z.string().optional(),
    deliveryAgentRating: z.number().int().min(1).max(5).optional(),
    deliveryAgentComment: z.string().optional(),
  }).refine(
    (data) => data.restaurantRating || data.deliveryAgentRating,
    {
      message: 'At least one rating (restaurant or delivery agent) is required',
    }
  ),
});

export const getRatingsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
  }),
});

// Profile schemas
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GetRestaurantsInput = z.infer<typeof getRestaurantsSchema>;
export type GetRestaurantInput = z.infer<typeof getRestaurantSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type GetOrdersInput = z.infer<typeof getOrdersSchema>;
export type GetOrderInput = z.infer<typeof getOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type GetRatingsInput = z.infer<typeof getRatingsSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
