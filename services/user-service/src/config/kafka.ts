import { Kafka, Producer, Consumer } from 'kafkajs';
import { logger } from '../utils/logger';

let kafka: Kafka;
let producer: Producer;
let consumer: Consumer;

export const connectKafka = async (): Promise<void> => {
  try {
    kafka = new Kafka({
      clientId: 'user-service',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      retry: {
        retries: 3,
        initialRetryTime: 1000,
      },
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'user-service-group' });

    await producer.connect();
    await consumer.connect();

    // Subscribe to relevant topics
    await consumer.subscribe({
      topics: ['order-accepted', 'order-rejected', 'delivery-assigned', 'delivery-status-updated'],
      fromBeginning: false,
    });

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = message.value?.toString();
          if (value) {
            const data = JSON.parse(value);
            logger.info(`Received message from topic ${topic}:`, data);
            
            // Handle different message types
            switch (topic) {
              case 'order-accepted':
                await handleOrderAccepted(data);
                break;
              case 'order-rejected':
                await handleOrderRejected(data);
                break;
              case 'delivery-assigned':
                await handleDeliveryAssigned(data);
                break;
              case 'delivery-status-updated':
                await handleDeliveryStatusUpdated(data);
                break;
              default:
                logger.warn(`Unhandled topic: ${topic}`);
            }
          }
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      },
    });

    logger.info('Kafka connection established successfully');
  } catch (error) {
    logger.error('Kafka connection failed:', error);
    throw error;
  }
};

export const getKafkaProducer = (): Producer => {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call connectKafka() first.');
  }
  return producer;
};

export const publishMessage = async (topic: string, message: any): Promise<void> => {
  try {
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
    logger.info(`Message published to topic ${topic}:`, message);
  } catch (error) {
    logger.error('Error publishing message:', error);
    throw error;
  }
};

export const closeKafka = async (): Promise<void> => {
  try {
    if (consumer) {
      await consumer.disconnect();
    }
    if (producer) {
      await producer.disconnect();
    }
    logger.info('Kafka connections closed');
  } catch (error) {
    logger.error('Error closing Kafka connections:', error);
  }
};

// Message handlers
const handleOrderAccepted = async (data: any): Promise<void> => {
  logger.info('Order accepted:', data);
  // Update order status in cache if needed
  // Send notification to user
};

const handleOrderRejected = async (data: any): Promise<void> => {
  logger.info('Order rejected:', data);
  // Update order status in cache if needed
  // Send notification to user
};

const handleDeliveryAssigned = async (data: any): Promise<void> => {
  logger.info('Delivery assigned:', data);
  // Update order status in cache if needed
  // Send notification to user
};

const handleDeliveryStatusUpdated = async (data: any): Promise<void> => {
  logger.info('Delivery status updated:', data);
  // Update order status in cache if needed
  // Send notification to user
};
