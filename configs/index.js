const KAFKA_CONFIG = require('./kafka.config');
const MINIO_CONFIG = require('./minio.config');
const ANOMALY_CONFIG = require('./anomaly.config');

module.exports = {
  kafka: KAFKA_CONFIG.kafka,
  minio: MINIO_CONFIG.minio,
  redis: ANOMALY_CONFIG.redis,
  topics: Object.values(KAFKA_CONFIG.topics),
  anomaly: ANOMALY_CONFIG.anomaly,
};