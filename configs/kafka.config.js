const KAFKA_CONFIG = {
    clientId: 'anomaly-detector',
    brokers: [`localhost:9092`],
    groupId: {
      main: 'anomaly-detector-group'
    }
  };
  
const HOUSEHOLD_TOPICS = {
    HCMC_Q5: {
        area: 'area_HCMC_Q5',
        household: 'household_HCMC_Q5'
    },
    HCMC_Q3: {
        area: 'area_HCMC_Q3',
        household: 'household_HCMC_Q3'
    },
    HCMC_Q4: {
        area: 'area_HCMC_Q4',
        household: 'household_HCMC_Q4'
    }
};
  
module.exports = {
    KAFKA_CONFIG,
    HOUSEHOLD_TOPICS
};