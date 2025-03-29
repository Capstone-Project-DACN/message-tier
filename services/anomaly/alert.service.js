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
      const { 
        percentageDifference, 
        mainMeterValue, 
        subMeterTotal, 
        meterAverages, 
        windowSize 
      } = anomalyData;

      await this.producer.send(
        'anomaly-alerts',
        areaId,
        {
          areaId,
          timestamp: Date.now(),
          severity: percentageDifference > 5 ? "HIGH" : "MEDIUM",
          message: `Anomaly detected in area ${areaId}: ${percentageDifference.toFixed(2)}% difference`,
          mainMeterValue,
          subMeterTotal,
          difference: Math.abs(mainMeterValue - subMeterTotal),
          percentageDifference,
          meterDetails: meterAverages,
          windowSize,
          analysisType: "RxJS Window"
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