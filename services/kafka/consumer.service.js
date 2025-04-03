const { Kafka } = require('kafkajs');
const config = require('../../configs');

class KafkaConsumerService {
  constructor(groupId, topics) {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });
    this.consumer = this.kafka.consumer({
      groupId,
    });
    this.topics = topics;
  }

  async connect() {
    await this.consumer.connect();
    console.log(`Kafka consumer connected: ${this.topics.join(', ')}`);
  }

  async subscribe() {
    await Promise.all(
      this.topics.map(topic =>
        this.consumer.subscribe({
          topic,
          fromBeginning: false,
          allowAutoTopicCreation: true,
        })
      )
    );
    console.log(`Subscribed to topics: ${this.topics.join(', ')}`);
  }

  async consume(messageHandler) {
    await this.consumer.run({
      eachMessage: messageHandler
    });
    console.log('Consumer started');
  }

  async disconnect() {
    await this.consumer.disconnect();
    console.log('Kafka consumer disconnected');
  }
}

module.exports = KafkaConsumerService;