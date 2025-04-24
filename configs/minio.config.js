module.exports = {
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'myminioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'myminioadmin',
    bucket: process.env.DISTRICT_ANOMALY_BUCKET || 'anomaly-data',
  },
};