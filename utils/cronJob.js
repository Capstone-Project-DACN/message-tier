const axios = require("axios");
const cron = require("node-cron");

const getRandomId = () => Math.floor(Math.random() * 10);

const callApi = async (url, params = {}) => {
  try {
    await axios.get(url, { params });
  } catch (error) {
    console.error(`❌ Lỗi khi gọi API: ${url}`, error.message);
  }
};

const runApiSequence = async (district) => {
  const baseUrl = process.env.DATASOURCE_SERVER;  

  for(let i = 1; i <= 10; i++) {
    await callApi(`${baseUrl}/household`, {
      batch_size: 1,
      city_id: "HCMC",
      district_id: district,
      display_data: true,
      id: i
    });
  }

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
    await runApiSequence("Q3");
    // await runApiSequence("Q3");
    // await runApiSequence("Q4");
    // await runApiSequence("Q5");
    // await runApiSequence("Q6");
  });
};

// Xuất module để sử dụng trong nơi khác
module.exports = { startCronJob };
