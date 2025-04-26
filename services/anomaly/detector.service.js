const config = require('../../configs');
const AreaMeterService = require('../metrics/area-meter.service');
const HouseholdMeterService = require('../metrics/household-meter.service');
const KafkaConsumerService = require('../kafka/consumer.service');
const AlertService = require('./alert.service');
const MinioService = require('../../services/minio/minio.service');
const ProducerService = require('../kafka/producer.service');
const redisClient = require('../redis/redis.service');

class AnomalyDetectorService {
  constructor() {
    this.areas = {};
    this.settings = {} 
    this.producer = new ProducerService();
    this.alertService = new AlertService();
    this.minioService = new MinioService();
  }

  async start() {
    this.settings = await redisClient.getAnomalySettings();
    console.log("[INFOMATION][SETTING]: ", this.settings);

    await this.producer.init();
    await this.alertService.init();
    await this.minioService.init();
    
    await Promise.all(config.topics.map(async (topicConfig) => {
      const areaId = `${topicConfig.area.replace('area-', '')}`;
      await this.initializeArea(areaId, topicConfig);
    }));
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
          this.producer.sendAreaMessage(reading.device_id, data);
        } else {
          this.areas[areaId].householdMeter.addReading(reading, (anomaly) => {
            this.handleDeviceAnomaly(areaId, anomaly);
          });
          this.producer.sendHouseholdMessage(reading.device_id, data);
        }
      } catch (error) {
        console.error(`[ERROR][ANOMALY][AREA] Error processing message in area ${areaId}:`, error);
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
      console.log(`[INFORMATION][WINDOW] NOTHING TO ANALYZE ${areaId}`);
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

    if (percentageDifference > this.settings.area_threshold) {
      const anomaly = {
        timestamp: Date.now(),
        areaMeterTotal: areaMeterWindowSum,
        householdMeterTotal: householdWindowSum,
        difference,
        percentageDifference,
        windowSize: config.anomaly.window_time,
      };
      this.alertService.sendAlert(areaId, anomaly);
      this.minioService.storeAreaAnomaly(areaId, anomaly);
    }
  }

  handleDeviceAnomaly(areaId, anomaly) {
    this.alertService.sendAlert(areaId, anomaly);
    this.minioService.storeDeviceAnomaly(anomaly.deviceId, areaId, anomaly);
  }

  async stop() {
    for (const areaId in this.areas) {
      const area = this.areas[areaId];
      area.areaMeter.stop();
      area.householdMeter.stop();
      await area.consumer.disconnect();
    }
    await this.alertService.stop();
  }
}

module.exports = AnomalyDetectorService;