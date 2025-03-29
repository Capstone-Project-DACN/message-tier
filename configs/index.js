const { KAFKA_CONFIG, HOUSEHOLD_TOPICS } = require('./kafka.config');
const WINDOW_CONFIG = require('./window.config');

module.exports = {
  kafka: KAFKA_CONFIG,
  topics: Object.values(HOUSEHOLD_TOPICS),
  window: WINDOW_CONFIG
};