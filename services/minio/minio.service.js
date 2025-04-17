const Minio = require('minio');
const config = require('../../configs');

class MinioService {
  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'myminioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'myminioadmin'
    });
    if (!config?.minio?.minio?.bucket) {
      throw new Error('MinIO bucket configuration is missing in config file');
    }
    this.bucket = config.minio.minio.bucket;
  }

  async init(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const exists = await this.client.bucketExists(this.bucket);
        if (!exists) {
          await this.client.makeBucket(this.bucket, 'us-east-1');
          console.log(`Bucket ${this.bucket} created successfully`);
        }
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} - Error initializing MinIO:`, error);
        if (attempt === maxRetries) {
          throw new Error(`Failed to initialize MinIO after ${maxRetries} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async storeAreaAnomaly(areaId, anomaly, maxRetries = 3) {
    try {
      if (!anomaly?.timestamp || isNaN(new Date(anomaly.timestamp).getTime())) {
        throw new Error('Invalid timestamp in anomaly data');
      }
      const date = new Date(anomaly.timestamp).toISOString().split('T')[0];
      const objectName = `anomalies/${areaId}/district-level/${date}/anomaly_${anomaly.timestamp}.json`;
      const percentageDifference = typeof anomaly?.percentageDifference === 'number' 
        ? anomaly.percentageDifference 
        : 0;
      const anomalyData = {
        ...anomaly,
        areaId,
        severity: percentageDifference > 5 ? "HIGH" : "MEDIUM",
        analysisType: "RxJS Window",
        typeof: "AREA",
        message: `[DISTRICT][WARMING] - ${areaId}: ${percentageDifference.toFixed(2)}% difference`,
      };
      const data = JSON.stringify(anomalyData);

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await this.client.putObject(this.bucket, objectName, Buffer.from(data));
          console.log(`[DISTRICT][WARMING] stored in MinIO: ${objectName}`);
          return objectName;
        } catch (error) {
          if (attempt === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error(`Error storing anomaly for area ${areaId}:`, error);
      throw error;
    }
  }

  async storeDeviceAnomaly(deviceId, areaId, anomaly, maxRetries = 3) {
    try {
      if (!anomaly?.timestamp || isNaN(new Date(anomaly.timestamp).getTime())) {
        throw new Error('Invalid timestamp in anomaly data');
      }
      const date = new Date(anomaly.timestamp).toISOString().split('T')[0];
      const objectName = `anomalies/${areaId}/${deviceId}/${date}/anomaly_${anomaly.timestamp}.json`;
      const percentageDifference = typeof anomaly?.percentageDifference === 'number' 
        ? anomaly.percentageDifference 
        : 0;
      const anomalyData = {
        ...anomaly,
        areaId,
        severity: percentageDifference > 5 ? "HIGH" : "MEDIUM",
        analysisType: "RxJS Window",
        typeof: "DEVICE",
        message: `[DEVICE][WARMING] - ${deviceId}: ${percentageDifference.toFixed(2)}% difference`,
      };
      const data = JSON.stringify(anomalyData);

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await this.client.putObject(this.bucket, objectName, Buffer.from(data));
          console.log(`[DEVICE][WARMING] stored in MinIO: ${objectName}`);
          return objectName;
        } catch (error) {
          if (attempt === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error(`Error storing anomaly for area ${areaId}:`, error);
      throw error;
    }
  }

  async getAllAnomalies(limit = 100, startAfter = null) {
    try {
      const objects = [];
      const prefix = `anomalies/`;
      const streamOptions = { prefix, recursive: true, startAfter };
      const stream = this.client.listObjectsV2(this.bucket, prefix, true);

      for await (const obj of stream) {
        if (objects.length >= limit) break;
        const data = await this.client.getObject(this.bucket, obj.name);
        let anomalyData = '';
        for await (const chunk of data) {
          anomalyData += chunk;
        }
        const anomaly = JSON.parse(anomalyData);
        anomaly.fileName = obj.name;
        objects.push(anomaly);
      }
      return objects.reverse();
    } catch (error) {
      console.error('Error retrieving all anomalies:', error);
      throw error;
    }
  }

  async getAllDistrictAnomalies(limit = 100, startAfter = null) {
    try {
      const objects = [];
      const prefix = `anomalies/`;
      const streamOptions = { prefix, recursive: true, startAfter };
      const stream = this.client.listObjectsV2(this.bucket, prefix, true);

      for await (const obj of stream) {
        if (objects.length >= limit) break;
        if (obj.name.includes('/district-level/')) {
          const data = await this.client.getObject(this.bucket, obj.name);
          let anomalyData = '';
          for await (const chunk of data) {
            anomalyData += chunk;
          }
          const anomaly = JSON.parse(anomalyData);
          if (anomaly.typeof === 'AREA') {
            anomaly.fileName = obj.name;
            objects.push(anomaly);
          }
        }
      }
      return objects.reverse() || [];
    } catch (error) {
      console.error('Error retrieving district anomalies:', error);
      throw error;
    }
  }

  async getAllDeviceAnomalies(limit = 100, startAfter = null) {
    try {
      const objects = [];
      const prefix = `anomalies/`;
      const streamOptions = { prefix, recursive: true, startAfter };
      const stream = this.client.listObjectsV2(this.bucket, prefix, true);

      for await (const obj of stream) {
        if (objects.length >= limit) break;
        if (!obj.name.includes('/district-level/')) {
          const data = await this.client.getObject(this.bucket, obj.name);
          let anomalyData = '';
          for await (const chunk of data) {
            anomalyData += chunk;
          }
          const anomaly = JSON.parse(anomalyData);
          if (anomaly.typeof === 'DEVICE') {
            anomaly.fileName = obj.name;
            objects.push(anomaly);
          }
        }
      }
      return objects.reverse() || [];
    } catch (error) {
      console.error('Error retrieving device anomalies:', error);
      throw error;
    }
  }
}

module.exports = MinioService;