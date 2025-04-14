require('dotenv').config();
const express = require('express');
const AnomalyDetectorService = require('./services/anomaly/detector.service');

const app = express();
const PORT = process.env.PORT || 4000;

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
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start anomaly detector:', error);
    process.exit(1);
  }
}

main();
