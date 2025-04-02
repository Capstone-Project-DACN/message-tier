const KAFKA_CONFIG = {
    clientId: 'anomaly-detector',
    brokers: [`localhost:9092`],
    groupId: {
      main: 'anomaly-detector-group'
    }
  };
  
const HOUSEHOLD_TOPICS = {
    HCMC_Q1: {
        area: 'area_HCMC_Q1',
        household: 'household_HCMC_Q1'
    },
    HCMC_Q3: {
        area: 'area_HCMC_Q3',
        household: 'household_HCMC_Q3'
    },
    HCMC_Q4: {
        area: 'area_HCMC_Q4',
        household: 'household_HCMC_Q4'
    },
    HCMC_Q5: {
        area: 'area_HCMC_Q5',
        household: 'household_HCMC_Q5'
    },
    HCMC_Q6: {
        area: 'area_HCMC_Q6',
        household: 'household_HCMC_Q6'
    },
};
  
module.exports = {
    KAFKA_CONFIG,
    HOUSEHOLD_TOPICS
};