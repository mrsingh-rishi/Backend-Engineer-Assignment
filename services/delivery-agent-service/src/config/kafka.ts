import { Kafka, Consumer, Producer } from 'kafkajs';
import { config } from './config';
import { logger } from '../utils/logger';

let kafka: Kafka;
let producer: Producer;
let consumer: Consumer;

export async function initializeKafka(): Promise<void> {
  try {
    kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: config.kafka.groupId });

    await producer.connect();
    await consumer.connect();

    // Subscribe to relevant topics
    await consumer.subscribe({ topics: ['order-placed', 'delivery-status-updated'] });

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value?.toString();
          if (messageValue) {
            const parsedMessage = JSON.parse(messageValue);
            await handleKafkaMessage(topic, parsedMessage);
          }
        } catch (error) {
          logger.error(`Error processing Kafka message from topic ${topic}:`, error);
        }
      },
    });

    logger.info('Kafka initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Kafka:', error);
    throw error;
  }
}

export function getKafkaProducer(): Producer {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call initializeKafka first.');
  }
  return producer;
}

export function getKafkaConsumer(): Consumer {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized. Call initializeKafka first.');
  }
  return consumer;
}

export async function publishEvent(topic: string, message: any): Promise<void> {
  try {
    const producer = getKafkaProducer();
    await producer.send({
      topic,
      messages: [
        {
          key: message.id || Date.now().toString(),
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
    logger.info(`Published event to topic ${topic}:`, message);
  } catch (error) {
    logger.error(`Error publishing event to topic ${topic}:`, error);
    throw error;
  }
}

// Handle incoming Kafka messages
async function handleKafkaMessage(topic: string, message: any): Promise<void> {
  logger.info(`Received message from topic ${topic}:`, message);
  
  try {
    switch (topic) {
      case 'order-placed':
        // Handle new order notification
        await handleOrderPlaced(message);
        break;
      case 'delivery-status-updated':
        // Handle delivery status updates
        await handleDeliveryStatusUpdated(message);
        break;
      default:
        logger.warn(`Unknown topic: ${topic}`);
    }
  } catch (error) {
    logger.error(`Error handling message from topic ${topic}:`, error);
  }
}

// Event handlers
async function handleOrderPlaced(orderData: any): Promise<void> {
  logger.info('Processing new order placement:', orderData);
  // Implementation will be added when we create the order service
}

async function handleDeliveryStatusUpdated(deliveryData: any): Promise<void> {
  logger.info('Processing delivery status update:', deliveryData);
  // Implementation will be added when we create the order service
}

export async function disconnectKafka(): Promise<void> {
  try {
    if (producer) {
      await producer.disconnect();
    }
    if (consumer) {
      await consumer.disconnect();
    }
    logger.info('Kafka connections closed');
  } catch (error) {
    logger.error('Error disconnecting Kafka:', error);
  }
}
