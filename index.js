require('dotenv').config();
const express = require('express');
const cors = require('cors');
const AnomalyDetectorService = require('./services/anomaly/detector.service');
const anomalyRoutes = require('./routes/anomaly.routes');
const settingRoutes = require('./routes/setting.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin:  '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

app.use(cors(corsOptions));  
app.use(express.json());
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/settings', settingRoutes);
app.use(errorMiddleware);

async function main() {
  const anomalyDetector = AnomalyDetectorService;

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
      console.log(`ANOMALY DETECTOR SERVICE IS RUNNING ON ${PORT}`);
    });
  } catch (error) {
    console.error('ANOMALY DETECTOR SERVICE FAILED TO START:', error);
    process.exit(1);
  }
}

main();