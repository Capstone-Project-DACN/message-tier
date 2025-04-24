// util/redisClient.js
const Redis = require('ioredis');
const config = require('../../configs');

class RedisClient {
    constructor() {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port
        });
    }

    async getAnomalySettings() {
        try {
            const settings = await this.client.get(config.redis.anomaly_settings_key);
            return settings ? JSON.parse(settings) : {
                window_time: parseInt(process.env.WINDOW_TIME) || 300000,
                device_threshold: parseFloat(process.env.DEVICE_ANOMALY_THRESHOLD) || 50,
                area_threshold: parseFloat(process.env.AREA_ANOMALY_THRESHOLD) || 5,
                min_delta_consumption: parseFloat(process.env.MINIMUM_DELTA_CONSUMPTION) || 100,
            };
        } catch (error) {
            console.error('[ERROR][SETTINGS] GET ANOMALY SETTINGS FROM REDIS FAILED:', error);
            return {
                window_time: parseInt(process.env.WINDOW_TIME) || 300000,
                device_threshold: parseFloat(process.env.DEVICE_ANOMALY_THRESHOLD) || 50,
                area_threshold: parseFloat(process.env.AREA_ANOMALY_THRESHOLD) || 5,
                min_delta_consumption: parseFloat(process.env.MINIMUM_DELTA_CONSUMPTION) || 100,
            };
        }
    }

    async updateAnomalySettings(settings) {
        try {
            const currentSettings = await this.getAnomalySettings();
            const newSettings = {
                ...currentSettings,
                ...settings
            };
            await this.client.set(config.redis.anomaly_settings_key, JSON.stringify(newSettings));
            return newSettings;
        } catch (error) {
            console.error('Error updating anomaly settings:', error);
            throw error;
        }
    }
}

module.exports = new RedisClient();