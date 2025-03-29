const { Kafka } = require('kafkajs');
const config = require('../../configs');

class KafkaProducerService {
  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });
    this.producer = this.kafka.producer();
  }

  async connect() {
    await this.producer.connect();
    console.log('Kafka producer connected');
  }

  async send(topic, key, value) {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(value),
          },
        ],
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.producer.disconnect();
    console.log('Kafka producer disconnected');
  }
}

module.exports = KafkaProducerService;