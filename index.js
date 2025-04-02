// src/index.js
require('dotenv').config()
const AnomalyDetectorService = require('./services/anomaly/detector.service');

async function main() {
  const anomalyDetector = new AnomalyDetectorService();
  
  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Shutting down...');
    await anomalyDetector.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Shutting down...');
    await anomalyDetector.stop();
    process.exit(0);
  });
  
  try {
    await anomalyDetector.start();
    console.log('Anomaly detector system is running.');
  } catch (error) {
    console.error('Failed to start anomaly detector:', error);
    process.exit(1);
  }
}

main();