const axios = require("axios");
const cron = require("node-cron");

const getRandomBatchSize = () => Math.floor(Math.random() * 101);

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

  console.log(`🚀 Bắt đầu chạy cronjob cho ${district}`);

  await callApi(`${baseUrl}/area`, {
    batch_size: 100,
    city_id: "HCMC",
    district_id: district,
    display_data: true,
  });

  
  for (let i = 0; i < 2; i++) {
    await callApi(`${baseUrl}/household`, {
      batch_size: 100,
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
  }

//   if (district === "Q1") {
//     await callApi(`${baseUrl}/anomaly`, {
//       batch_size: getRandomBatchSize(),
//       city_id: "HCMC",
//       district_id: district,
//       display_data: true,
//       id: 50,
//     });
//   }

  console.log(`✅ Hoàn thành chuỗi API cho ${district}`);
};

// Hàm khởi chạy cronjob
const startCronJob = () => {
  console.log("🚀 Cronjob đã khởi động...");
  cron.schedule("*/5 * * * * *", async () => {
    console.log("⏳ Đang chạy cronjob...");
    await runApiSequence("Q1");
    await runApiSequence("Q3");
    // await runApiSequence("Q4");
    console.log("✅ Hoàn thành tất cả cronjobs.");
  });
};

// Xuất module để sử dụng trong nơi khác
module.exports = { startCronJob };
