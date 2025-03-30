const axios = require("axios");
const cron = require("node-cron");

const getRandomBatchSize = () => Math.floor(Math.random() * 31);

const callApi = async (url, params = {}) => {
  try {
    const response = await axios.get(url, { params });
    // console.log(`✅ API gọi thành công: ${url}`, response.data);
  } catch (error) {
    console.error(`❌ Lỗi khi gọi API: ${url}`, error.message);
  }
};

const runApiSequence = async (district) => {
  const baseUrl = "http://localhost:3000/data";

  await callApi(`${baseUrl}/area`, {
    batch_size: 1,
    city_id: "HCMC",
    district_id: district,
    display_data: true,
  });
  
  await callApi(`${baseUrl}/household`, {
    batch_size: getRandomBatchSize(),
    city_id: "HCMC",
    district_id: district,
    display_data: true,
  });

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
  cron.schedule("*/1 * * * * *", async () => {
    console.log("⏳ Đang chạy cronjob...");
    // await runApiSequence("Q5");
    await runApiSequence("Q3");
    await runApiSequence("Q4");
    console.log("✅ Hoàn thành tất cả cronjobs.");
  });
};

// Xuất module để sử dụng trong nơi khác
module.exports = { startCronJob };
