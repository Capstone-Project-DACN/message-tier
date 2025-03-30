const KafkaProducerService = require('../kafka/producer.service');

class AreaProducerService {
  constructor() {
    this.producer = new KafkaProducerService();
  }

  async init() {
    await this.producer.connect();
  }

  async sendHouseholdMessage(device_id, household_data) {
    try {
      await this.producer.send(
        'household_data',
        device_id,
        household_data
      );
    } catch (error) {
      console.error("Error sending sendHouseholdMessage:", error);
    }
  }

  async stop() {
    await this.producer.disconnect();
  }
}

module.exports = AreaProducerService;