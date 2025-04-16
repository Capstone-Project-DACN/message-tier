const express = require('express');
const router = express.Router();
const MinioService = require('../services/minio/minio.service');

const minioService = new MinioService();

minioService.init().catch((error) => {
  console.error('Failed to initialize MinIO:', error);
  process.exit(1);  
});

router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const startAfter = req.query.startAfter || null;
    const anomalies = await minioService.getAllAnomalies(limit, startAfter);
    res.json({ success: true, count: anomalies.length, limit, startAfter, data: anomalies });
  } catch (error) {
    next(error);
  }
});

router.get('/districts', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const startAfter = req.query.startAfter || null;
    const districtAnomalies = await minioService.getAllDistrictAnomalies(limit, startAfter);
    res.json({ success: true, count: districtAnomalies.length, limit, startAfter, data: districtAnomalies });
  } catch (error) {
    next(error);
  }
});

router.get('/devices', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const startAfter = req.query.startAfter || null;
    const deviceAnomalies = await minioService.getAllDeviceAnomalies(limit, startAfter);
    res.json({ success: true, count: deviceAnomalies.length, limit, startAfter, data: deviceAnomalies });
  } catch (error) {
    next(error);
  }
});

module.exports = router;