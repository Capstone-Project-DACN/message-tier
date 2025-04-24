module.exports = {
    kafka: {
        clientId: 'anomaly-detector',
        brokers: [`${process.env.BOOTSTRAP_SERVER}`],
        groupId: {
          main: process.env.KAFKA_GROUP_ID || 'anomaly-detector-group'
        }
    },
    topics: {
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
        HCMC_Q7: {
            area: 'area_HCMC_Q7',
            household: 'household_HCMC_Q7'
        },
        HCMC_Q8: {
            area: 'area_HCMC_Q8',
            household: 'household_HCMC_Q8'
        },
        HCMC_Q9: {
            area: 'area_HCMC_Q9',
            household: 'household_HCMC_Q9'
        },
        HCMC_Q10: {
            area: 'area_HCMC_Q10',
            household: 'household_HCMC_Q10'
        },
        HCMC_Q11: {
            area: 'area_HCMC_Q11',
            household: 'household_HCMC_Q11'
        },
        HCMC_Q12: {
            area: 'area_HCMC_Q12',
            household: 'household_HCMC_Q12'
        },
        HCMC_QBTHANH: {
            area: 'area_HCMC_QBTHANH',
            household: 'household_HCMC_QBTHANH'
        },
        HCMC_QTP: {
            area: 'area_HCMC_QTP',
            household: 'household_HCMC_QTP'
        },
        HCMC_QPN: {
            area: 'area_HCMC_QPN',
            household: 'household_HCMC_QPN'
        },
        TDUC_Q2: {
            area: 'area_TDUC_Q2',
            household: 'household_TDUC_Q2'
        },
        TDUC_Q9: {
            area: 'area_TDUC_Q9',
            household: 'household_TDUC_Q9'
        }
    }
};