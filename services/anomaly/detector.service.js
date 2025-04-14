const AreaMeterService = require('../metrics/area-meter.service');
const HouseholdMeterService = require('../metrics/household-meter.service');
const KafkaConsumerService = require('../kafka/consumer.service');
const AlertService = require('./alert.service');
const config = require('../../configs');
const { startCronJob } = require('../../utils/cronJob');
const AreaProducerService = require('./area-producer.service');

class AnomalyDetectorService {
  constructor() {
    this.areas = {};
    this.alertService = new AlertService();
    this.areaProducer = new AreaProducerService();
    this.anomalyThreshold = 5; 
  }

  async start() {
    console.log("Anomaly Detector Service started", process.env.BOOTSTRAP_SERVER, process.env.DATASOURCE_SERVER);

    await this.alertService.init();
    await this.areaProducer.init();

    await Promise.all(config.topics.map(async (topicConfig) => {
      const areaId = `${topicConfig.area.replace('area-', '')}`;
      await this.initializeArea(areaId, topicConfig);
    }));


    // startCronJob();
  }

  async initializeArea(areaId, topicConfig) {
    this.areas[areaId] = {
      areaMeter: new AreaMeterService(areaId),
      householdMeter: new HouseholdMeterService(areaId),
      consumer: new KafkaConsumerService(
        `${config.kafka.groupId.main}-${areaId}`,
        [topicConfig.area, topicConfig.household]
      ),
      anomalies: []
    };

    this.setupAnomalyDetection(areaId);

    const consumer = this.areas[areaId].consumer;
    await consumer.connect();
    await consumer.subscribe();

    await consumer.consume(async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        const isAreaMeter = topic === topicConfig.area;

        const reading = {
          timestamp: data.timestamp || Date.now(),
          data: data,
          device_id: data.device_id
        };

        if (isAreaMeter) {
          this.areas[areaId].areaMeter.addReading(reading);
          this.areaProducer.sendAreaMessage(reading.device_id, data);
        } else {
          this.areas[areaId].householdMeter.addReading(reading);
          this.areaProducer.sendHouseholdMessage(reading.device_id, data);
        }
      } catch (error) {
        console.error(`Error processing message in area ${areaId}:`, error);
      }
    });
  }

  setupAnomalyDetection(areaId) {
    const area = this.areas[areaId];

    area.householdMeter.setupWindowProcessing(() => {
    }); 
    area.areaMeter.setupWindowProcessing((areaWindow) => {
      this.detectAnomalies(areaId, areaWindow);
    });
  }

  detectAnomalies(areaId, areaWindow) {
    const area = this.areas[areaId];
    const areaMeterWindowSum = area.areaMeter.getSumWindow();
    const householdWindowSum = area.householdMeter.getSumWindow();

    if (areaMeterWindowSum === 0 && householdWindowSum === 0) {
      console.log(`No data in window for area ${areaId}`);
      return;
    }

    const difference = Math.abs(areaMeterWindowSum - householdWindowSum);
    const percentageDifference = areaMeterWindowSum !== 0
      ? (difference / Math.abs(areaMeterWindowSum)) * 100
      : 0;

    console.log(
      `WINDOW ANALYSIS - Area ${areaId}`,
      `AREA Total: ${areaMeterWindowSum.toFixed(2)} kWh`,
      `HOUSEHOLD Total: ${householdWindowSum.toFixed(2)} kWh`,
      `Difference: ${difference.toFixed(2)} kWh`,
      `Percentage Difference: ${percentageDifference.toFixed(2)}%`
    );

    if (percentageDifference > this.anomalyThreshold) {
      console.warn(`⚠️ ANOMALY DETECTED in area ${areaId}: ${percentageDifference.toFixed(2)}% difference`);
      const anomaly = {
        timestamp: Date.now(),
        areaMeterTotal: areaMeterWindowSum,
        householdMeterTotal: householdWindowSum,
        difference,
        percentageDifference,
        windowSize: config.window.windowTime
      };
      area.anomalies.push(anomaly);
      this.alertService.sendAlert(areaId, anomaly);
    }

    console.log("Start new window");
  }

  async stop() {
    for (const areaId in this.areas) {
      const area = this.areas[areaId];
      area.areaMeter.stop();
      area.householdMeter.stop();
      await area.consumer.disconnect();
    }
    await this.alertService.stop();
    console.log('Anomaly Detector Service stopped');
  }
}

module.exports = AnomalyDetectorService;