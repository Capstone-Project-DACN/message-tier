// src/services/anomaly/detector.service.js
const AreaMeterService = require('../metrics/area-meter.service');
const HouseholdMeterService = require('../metrics/household-meter.service');
const KafkaConsumerService = require('../kafka/consumer.service');
const AlertService = require('./alert.service');
const config = require('../../configs');
const { startCronJob } = require("../../utils/cronJob");

class AnomalyDetectorService {
  constructor() {
    this.areas = {};
    this.alertService = new AlertService();
    
    // Anomaly threshold in percentage
    this.anomalyThreshold = 5;
  }

  async start() {
    await this.alertService.init();

    // Initialize each area
    await Promise.all(config.topics.map(async (topicConfig, index) => {
      const areaId = `d${index + 1}`;
      await this.initializeArea(areaId, topicConfig);
    }));

    startCronJob();
  }

  async initializeArea(areaId, topicConfig) {
    // Create services for this area
    this.areas[areaId] = {
      areaMeter: new AreaMeterService(areaId),
      householdMeter: new HouseholdMeterService(areaId),
      consumer: new KafkaConsumerService(
        `${config.kafka.groupId.main}-${areaId}`,
        [topicConfig.area, topicConfig.household]
      ),
      anomalies: []
    };

    // Set up RxJS processing
    this.setupAnomalyDetection(areaId);

    // Connect and subscribe
    const consumer = this.areas[areaId].consumer;
    await consumer.connect();
    await consumer.subscribe();
    
    // Start consuming messages
    await consumer.consume(async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        
        // Determine if this is from main meter or sub meter based on the topic
        const isAreaMeter = topic === topicConfig.area;
        
        const reading = {
          timestamp: data.timestamp || Date.now(),
          data: data,
          device_id: data.device_id
        };

        if (isAreaMeter) {
          // Process main meter reading
          this.areas[areaId].areaMeter.addReading(reading);
        } else {
          // Process sub meter reading
          this.areas[areaId].householdMeter.addReading(reading);
        }
      } catch (error) {
        console.error(`Error processing message in area ${areaId}:`, error);
      }
    });
    
    // console.log(`Area ${areaId} services are now running`);
  }

  setupAnomalyDetection(areaId) {
    const area = this.areas[areaId];

    area.householdMeter.setupWindowProcessing(() => {
    });
    
    area.areaMeter.setupWindowProcessing((mainWindow) => {
      this.detectAnomalies(areaId, mainWindow);
    });
  }

  detectAnomalies(areaId) {
    const area = this.areas[areaId];
    const areaMeterWindowSum = this.areas[areaId].areaMeter.lastValue - this.areas[areaId].areaMeter.firstValue;
    const householdWindowSum = this.areas[areaId].householdMeter.householdWindowSum;
    const percentageDifference = ((areaMeterWindowSum - householdWindowSum) / areaMeterWindowSum) * 100;

    console.log(
      `WINDOW ANALYSIS - Area ${areaId}`,
      `AREA Total Consumption: ${areaMeterWindowSum}`,
      `HOUSEHOLD Total Consumption: ${householdWindowSum}`,
      `Difference: ${percentageDifference.toFixed(2)}%`
    );

    // Cảnh báo nếu chênh lệch quá lớn
    if (Math.abs(percentageDifference) > this.anomalyThreshold) {
        console.warn(`⚠️ Possible anomaly detected in area ${areaId}!`);
    }

    // Check for anomaly
    if (percentageDifference > this.anomalyThreshold) {
      console.log(`⚠️ ANOMALY DETECTED in area ${areaId}: ${percentageDifference.toFixed(2)}% difference`);
      console.log(` ===================== *** =====================`);
      
      // Store anomaly
      area.anomalies.push({
        timestamp: Date.now(),
        areaMeterTotal: areaMeterWindowSum,
        householdMeterTotal: householdWindowSum,
        difference: Math.abs(areaMeterWindowSum - householdWindowSum),
        percentageDifference: percentageDifference,
        windowSize: config.window.windowTime
      });
      
      // Send alert
      this.alertService.sendAlert(
        areaId,
        {
          percentageDifference: percentageDifference,
          areaMeterValue: areaMeterWindowSum,
          householdMeterTotal: householdWindowSum,
          meterAverages: Math.abs(percentageDifference)  * areaMeterWindowSum,
          windowSize: config.window.windowTime
        }
      );
    }
  }

  async stop() {
    // Stop all services
    for (const areaId in this.areas) {
      const area = this.areas[areaId];
      area.areaMeter.stop();
      area.householdMeter.stop();
      await area.consumer.disconnect();
    }
    
    // Stop alert service
    await this.alertService.stop();
    
    console.log("Anomaly Detector Service stopped");
  }
}

module.exports = AnomalyDetectorService;