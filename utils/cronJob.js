const axios = require("axios");
const cron = require("node-cron");

const getRandomBatchSize = () => Math.floor(Math.random() * 31);

const callApi = async (url, params = {}) => {
  try {
    await axios.get(url, { params });
  } catch (error) {
    console.error(`❌ Lỗi khi gọi API: ${url}`, error.message);
  }
};

const runApiSequence = async (district) => {
  const baseUrl = process.env.DATASOURCE_SERVER;
  
  await callApi(`${baseUrl}/household`, {
    batch_size: getRandomBatchSize(),
    city_id: "HCMC",
    district_id: district,
    display_data: true,
  });

  await callApi(`${baseUrl}/area`, {
    batch_size: 1,
    city_id: "HCMC",
    district_id: district,
    display_data: true,
  });
};

// Hàm khởi chạy cronjob
const startCronJob = () => {
  cron.schedule(process.env.CRON_TIME, async () => {  
    // await runApiSequence("Q1");
    await runApiSequence("Q3");
    await runApiSequence("Q4");
    await runApiSequence("Q5");
    // await runApiSequence("Q6");
    console.log("✅ Produce new data to  Q3, Q4 and Q5 successfully.");
  });
};

// Xuất module để sử dụng trong nơi khác
module.exports = { startCronJob };
