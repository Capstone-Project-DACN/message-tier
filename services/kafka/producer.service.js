const { Kafka } = require("kafkajs");
const config = require("../../configs");

class ProducerService {
  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });
    this.producer = this.kafka.producer({
      groupId: config.kafka.groupId.main,
    });
    this.isConnected = false;
  }

  async init() {
    try {
      if (this.isConnected) {
        console.log("[INFO][KAFKA_PRODUCER] Producer already initialized");
        return;
      }

      await this.producer.connect();

      this.isConnected = true;
      console.log("[SUCCESS][KAFKA_PRODUCER] Kafka Producer Service Initialized");
    } catch (error) {
      console.error("[ERROR][KAFKA_PRODUCER] Failed to initialize producer:", error);
      throw error;
    }
  }

  async sendMessage(topic, key, value) {
    if (!this.isConnected) {
      throw new Error("Producer is not connected. Call init() first.");
    }

    if (!topic || typeof topic !== "string") {
      throw new Error("Topic must be a non-empty string");
    }

    if (!key || typeof key !== "string") {
      throw new Error("Key must be a non-empty string");
    }

    if (!value) {
      throw new Error("Value must be provided");
    }

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
      console.log(`[SUCCESS][KAFKA_PRODUCER] Message sent to topic ${topic}`);
    } catch (error) {
      console.error(`[ERROR][KAFKA_PRODUCER] Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  async sendAreaMessage(device_id, area_data) {
    const topic = process.env.DISTRICT_TOPIC || "area_data";
    await this.sendMessage(topic, device_id, area_data);
  }

  async sendHouseholdMessage(device_id, household_data) {
    const topic = process.env.HOUSEHOLD_TOPIC || "household_data";
    await this.sendMessage(topic, device_id, household_data);
  }

  async stop() {
    try {
      if (!this.isConnected) {
        console.log("[INFO][KAFKA_PRODUCER] Producer already disconnected");
        return;
      }

      await this.producer.disconnect();
      this.isConnected = false;
      console.log("[SUCCESS][KAFKA_PRODUCER] Kafka Producer Service Stopped");
    } catch (error) {
      console.error("[ERROR][KAFKA_PRODUCER] Failed to stop producer:", error);
      throw error;
    }
  }

  async disconnect() {
    await this.producer.disconnect();
  }
}

module.exports = ProducerService;