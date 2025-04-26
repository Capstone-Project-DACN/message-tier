const KafkaProducerService = require('../kafka/producer.service');

class AlertService {
  constructor() {
    this.producer = new KafkaProducerService();
  }

  async init() {
    await this.producer.init();
    console.log("[SUCCESS][ALERT] ALERT SERVICE INITIALIZED");
  }

  async sendAlert(areaId, anomalyData) {
    try {
      await this.producer.sendMessage(
        (process.env.ALERT_TOPIC || "anomaly_alerts"),
        areaId,
        {
          areaId,
          severity: anomalyData?.percentageDifference > 5 ? "HIGH" : "MEDIUM",
          message: `Anomaly detected in area ${areaId}: ${anomalyData?.percentageDifference.toFixed(2)}% difference`,
          analysisType: "RxJS Window",
          ...anomalyData
        }
      );
      console.log(`[SUCCESS][ALERT] Alert sent for area ${areaId}`);
    } catch (error) {
      console.error("[ERROR][ALERT] Error sending alert:", error);
    }
  }

  async stop() {
    await this.producer.disconnect();
  }
}

module.exports = AlertService;