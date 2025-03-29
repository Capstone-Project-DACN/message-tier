// src/services/anomaly/detector.service.js
const AreaMeterService = require('../metrics/area-meter.service');
const HouseholdMeterService = require('../metrics/household-meter.service');
const KafkaConsumerService = require('../kafka/consumer.service');
const AlertService = require('./alert.service');
const config = require('../../configs');

class AnomalyDetectorService {
  constructor() {
    this.areas = {};
    this.alertService = new AlertService();
    
    // Anomaly threshold in percentage
    this.anomalyThreshold = 2;
  }

  async start() {
        console.log("Starting District-Based Anomaly Detector Service with RxJS...");
    
    await this.alertService.init();

    // Initialize each area
    await Promise.all(config.topics.map(async (topicConfig, index) => {
      const areaId = `d${index + 1}`;
      await this.initializeArea(areaId, topicConfig);
    }));

    console.log("All area services are now running");
  }

  async initializeArea(areaId, topicConfig) {
    console.log(`Initializing area ${areaId}...`);
    
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
          value: data.value,
          meterId: data.meterId
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
    
    console.log(`Area ${areaId} services are now running`);
  }

  setupAnomalyDetection(areaId) {
    const area = this.areas[areaId];
    
    // Setup main meter window processing
    area.areaMeter.setupWindowProcessing((mainWindow) => {
      this.detectAnomalies(areaId, mainWindow);
    });
    
    // Setup sub meter window processing
    area.householdMeter.setupWindowProcessing(() => {
      // Just update the current window - we'll check for anomalies
      // when the main window completes
    });
  }

  detectAnomalies(areaId, mainWindow) {
    const area = this.areas[areaId];
    const householdWindow = area.householdMeter.getCurrentWindow();
    
    if (!householdWindow) {
      console.log(`No sub meter data for area ${areaId} in current window`);
      return;
    }
    
    // Calculate total from sub meters
    let totalSubMeterValue = 0;
    let householdMeterCount = 0;
    let meterAverages = {};

    // Calculate average for each sub meter
    for (const meterId in householdWindow.meterReadings) {
      const meterData = householdWindow.meterReadings[meterId];
      if (meterData.count === 0) continue;
      
      const average = meterData.sum / meterData.count;
      meterAverages[meterId] = average;
      householdMeterCount++;
      totalSubMeterValue += meterData.sum;
    }
    
    // Skip if no sub meter data
    if (householdMeterCount === 0) {
      console.log(`No sub meter data for area ${areaId} in current window`);
      return;
    }

    // Calculate difference
    const percentageDifferenceAmount = ((totalSubMeterValue - mainWindow.sum) / mainWindow.sum) * 100;
    
    console.log(
        `District ${areaId} - WINDOW ANALYSIS - Main total: ${mainWindow.sum}, Sub Total: ${totalSubMeterValue}, Diff: ${percentageDifferenceAmount.toFixed(2)}%`,
        {areaMeter: mainWindow.sum, totalSubMeterValue, percentageDifferenceAmount}
    );

    // Check for anomaly
    if (percentageDifferenceAmount > this.anomalyThreshold) {
      console.log(`⚠️ ANOMALY DETECTED in area ${areaId}: ${percentageDifferenceAmount.toFixed(2)}% difference`);
      console.log(` ===================== *** =====================`);
      
      // Store anomaly
      area.anomalies.push({
        timestamp: Date.now(),
        areaMeterTotal: mainWindow.sum,
        householdMeterTotal: totalSubMeterValue,
        difference: Math.abs(mainWindow.sum - totalSubMeterValue),
        percentageDifference: percentageDifferenceAmount,
        meterAverages,
        windowSize: config.window.windowTime
      });
      
      // Send alert
      this.alertService.sendAlert(areaId, {
        percentageDifference: percentageDifferenceAmount,
        areaMeterValue: mainWindow.sum,
        householdMeterTotal: totalSubMeterValue,
        meterAverages,
        windowSize: config.window.windowTime
      });
    }
  }

  async stop() {
    console.log("Stopping Anomaly Detector Service...");
    
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