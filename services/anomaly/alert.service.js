const KafkaProducerService = require('../kafka/producer.service');

class AlertService {
  constructor() {
    this.producer = new KafkaProducerService();
  }

  async init() {
    await this.producer.connect();
  }

  async sendAlert(areaId, anomalyData) {
    try {
      await this.producer.send(
        'anomaly-alerts',
        areaId,
        {
          areaId,
          severity: anomalyData?.percentageDifference > 5 ? "HIGH" : "MEDIUM",
          message: `Anomaly detected in area ${areaId}: ${anomalyData?.percentageDifference.toFixed(2)}% difference`,
          analysisType: "RxJS Window",
          ...anomalyData
        }
      );
      console.log(`Alert sent for area ${areaId}`);
    } catch (error) {
      console.error("Error sending alert:", error);
    }
  }

  async stop() {
    await this.producer.disconnect();
  }
}

module.exports = AlertService;