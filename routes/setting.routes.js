// services/anomaly/settings_routes.js
const express = require('express');
const router = express.Router();
const redisClient = require('../services/redis/redis.service'); 

function validateSettingsInput(body) {
    const errors = [];
    const settings = {};

    if ('window_time' in body) {
        if (typeof body.window_time !== 'number' || body.window_time <= 0) {
            errors.push('window_time must be a positive number');
        } else {
            settings.window_time = body.window_time;
        }
    }

    if ('device_threshold' in body) {
        if (typeof body.device_threshold !== 'number' || body.device_threshold <= 0) {
            errors.push('device_threshold must be a positive number');
        } else {
            settings.device_threshold = body.device_threshold;
        }
    }

    if ('area_threshold' in body) {
        if (typeof body.area_threshold !== 'number' || body.area_threshold < 0) {
            errors.push('area_threshold must be a non-negative number');
        } else {
            settings.area_threshold = body.area_threshold;
        }
    }

    if ('min_delta_consumption' in body) {
        if (typeof body.min_delta_consumption !== 'number' || body.min_delta_consumption < 0) {
            errors.push('min_delta_consumption must be a non-negative number');
        } else {
            settings.min_delta_consumption = body.min_delta_consumption;
        }
    }

    return { errors, settings };
}


router.get('/', async (req, res) => {
    try {
        const settings = await redisClient.getAnomalySettings();
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

router.put('/update', async (req, res) => {
    try {
        const { errors, settings } = validateSettingsInput(req.body);

        if (errors.length) {
            return res.status(400).json({ error: errors.join(', ') });
        }

        const updatedSettings = await redisClient.updateAnomalySettings(settings);
        res.json({ success: true, message: 'Settings updated successfully', settings: updatedSettings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;