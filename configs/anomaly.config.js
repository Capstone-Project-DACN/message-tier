module.exports = {
    anomaly: {
        device_threshold: process.env.DEVICE_ANOMALY_THRESHOLD || 50,
        area_threshold: process.env.DEVICE_ANOMALY_THRESHOLD || 50,
        window_time: process.env.WINDOW_TIME || 300000,
        min_delta_consumption: process.env.MINIMUM_DELTA_CONSUMPTION || 100,
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        anomaly_settings_key: 'anomaly:settings' 
    }
};