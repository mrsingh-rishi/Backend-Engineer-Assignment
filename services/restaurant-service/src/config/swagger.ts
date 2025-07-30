import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant Service API',
      version: '1.0.0',
      description: 'API documentation for the Restaurant Service of the Food Delivery Platform',
      contact: {
        name: 'API Support',
        email: 'support@fooddelivery.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'https://api.fooddelivery.com/restaurant/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Restaurant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Restaurant ID',
            },
            name: {
              type: 'string',
              description: 'Restaurant name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Restaurant email',
            },
            phone: {
              type: 'string',
              description: 'Restaurant phone number',
            },
            address: {
              type: 'string',
              description: 'Restaurant address',
            },
            cuisineType: {
              type: 'string',
              description: 'Type of cuisine',
            },
            isOnline: {
              type: 'boolean',
              description: 'Restaurant online status',
            },
            rating: {
              type: 'number',
              format: 'float',
              description: 'Average rating',
            },
            openingTime: {
              type: 'string',
              format: 'time',
              description: 'Opening time',
            },
            closingTime: {
              type: 'string',
              format: 'time',
              description: 'Closing time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        MenuItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Menu item ID',
            },
            restaurantId: {
              type: 'string',
              format: 'uuid',
              description: 'Restaurant ID',
            },
            name: {
              type: 'string',
              description: 'Item name',
            },
            description: {
              type: 'string',
              description: 'Item description',
            },
            price: {
              type: 'number',
              format: 'float',
              description: 'Item price',
            },
            category: {
              type: 'string',
              description: 'Item category',
            },
            isAvailable: {
              type: 'boolean',
              description: 'Item availability',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'Item image URL',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Order ID',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            restaurantId: {
              type: 'string',
              format: 'uuid',
              description: 'Restaurant ID',
            },
            deliveryAgentId: {
              type: 'string',
              format: 'uuid',
              description: 'Delivery agent ID',
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'],
              description: 'Order status',
            },
            totalAmount: {
              type: 'number',
              format: 'float',
              description: 'Total order amount',
            },
            deliveryAddress: {
              type: 'string',
              description: 'Delivery address',
            },
            specialInstructions: {
              type: 'string',
              description: 'Special instructions',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  menuItemId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  quantity: {
                    type: 'integer',
                  },
                  price: {
                    type: 'number',
                    format: 'float',
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Error details',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Success message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
