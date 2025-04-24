const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class HouseholdMeterService {
  constructor(areaId) {
    this.areaId = areaId;
    this.subject = new Subject();
    this.readings = {}; // { device_id: [reading] }
    this.lastCumulativeValue = {}; // { device_id: last_cumulative_value }
    this.consumptionHistory = {}; // { device_id: [consumption_delta] }
    this.lastValueOfPreviousWindow = {}; // { device_id: value }
    this.householdWindowSum = 0;
    this.windowSize = config.anomaly.window_time;
    this.anomalyThreshold = config.anomaly.device_threshold; // Ngưỡng anomaly cho device (%)
    this.mininumDeltaConsumption = config.anomaly.min_delta_consumption;
    this.maxHistorySize = 100; // Giới hạn số lượng giá trị tiêu thụ trong lịch sử
  }

  addReading(reading, onDeviceAnomaly = () => {}) {
    if (!reading.device_id || typeof reading.data?.electricity_usage_kwh !== 'number') {
      console.error(`Invalid reading for area ${this.areaId}:`, reading);
      return;
    }

    const deviceId = reading.device_id;
    const currentValue = reading.data.electricity_usage_kwh;

    if (!this.readings[deviceId]) {
      this.readings[deviceId] = [];
      this.consumptionHistory[deviceId] = [];
    }

    // Tính giá trị tiêu thụ thực tế (delta)
    let consumptionDelta = null;
    if (this.lastCumulativeValue[deviceId] !== undefined) {
      if (currentValue >= this.lastCumulativeValue[deviceId]) {
        consumptionDelta = currentValue - this.lastCumulativeValue[deviceId];
      } else {
        // Giá trị tích lũy giảm (có thể do reset đồng hồ), coi như giá trị tiêu thụ là chính giá trị hiện tại
        console.warn(`Cumulative value reset detected for device ${deviceId}. Treating current value as consumption.`);
        consumptionDelta = currentValue;
      }
    }
    this.lastCumulativeValue[deviceId] = currentValue;

    // Lưu reading
    this.readings[deviceId].push(reading);
    this.pruneOldData(deviceId);

    // Phát hiện anomaly nếu có giá trị tiêu thụ
    if (consumptionDelta !== null) {
      // Lưu giá trị tiêu thụ vào lịch sử
      this.consumptionHistory[deviceId].push(consumptionDelta);
      if (this.consumptionHistory[deviceId].length > this.maxHistorySize) {
        this.consumptionHistory[deviceId].shift(); // Giữ lịch sử không quá lớn
      }

      // Phát hiện anomaly
      this.detectDeviceAnomaly(deviceId, consumptionDelta, onDeviceAnomaly);
    }

    this.subject.next(reading);
  }

  pruneOldData(deviceId) {
    if (!this.readings[deviceId]) return;

    const now = Date.now();
    const cutoff = now - this.windowSize;
    this.readings[deviceId] = this.readings[deviceId].filter(r => r.timestamp >= cutoff);
  }

  // Phát hiện anomaly cho device dựa trên giá trị tiêu thụ thực tế
  detectDeviceAnomaly(deviceId, consumptionDelta, onDeviceAnomaly) {
    const deviceConsumptionHistory = this.consumptionHistory[deviceId] || [];

    // Cần ít nhất 1 giá trị trong lịch sử để so sánh (không tính giá trị hiện tại)
    if (deviceConsumptionHistory.length < 2) return;

    // Tính trung bình của các giá trị tiêu thụ trước đó (trừ giá trị hiện tại)
    const previousConsumptionValues = deviceConsumptionHistory.slice(0, -1);
    const averageConsumption = previousConsumptionValues.reduce((sum, val) => sum + val, 0) / previousConsumptionValues.length;

    // Tính phần trăm chênh lệch
    const difference = Math.abs(consumptionDelta - averageConsumption);
    const percentageDifference = averageConsumption !== 0 ? (difference / averageConsumption) * 100 : 0;

    console.log(
      `Device ${deviceId} - Current Consumption: ${consumptionDelta.toFixed(2)} kWh, ` +
      `Average Consumption: ${averageConsumption.toFixed(2)} kWh, ` +
      `Percentage Difference: ${percentageDifference.toFixed(2)}%`
    );

    if (percentageDifference > this.anomalyThreshold && consumptionDelta > this.mininumDeltaConsumption) {
      console.warn(`⚠️ DEVICE ANOMALY DETECTED for device ${deviceId}: ${percentageDifference.toFixed(2)}% difference`);
      const anomaly = {
        deviceId,
        timestamp: Date.now(),
        currentConsumption: consumptionDelta,
        averageConsumption,
        difference,
        percentageDifference,
        windowSize: this.windowSize
      };
      onDeviceAnomaly(anomaly);
    }
  }

  setupWindowProcessing(onWindowComplete) {
    this.subject.pipe(
      windowTime(this.windowSize),
      mergeMap(window => window.pipe(
        reduce((acc, reading) => {
          if (!acc[reading.device_id]) {
            acc[reading.device_id] = [];
          }
          acc[reading.device_id].push(reading);
          return acc;
        }, {}),
      )),
      filter(devices => Object.keys(devices).length > 0)
    ).subscribe(deviceReadings => {
      const householdWindowSum = Object.entries(deviceReadings).reduce((sum, [deviceId, readings]) => {
        if (readings.length === 0) return sum;

        const firstValue = this.lastValueOfPreviousWindow[deviceId] || readings[0].data.electricity_usage_kwh;
        const lastValue = readings[readings.length - 1].data.electricity_usage_kwh;
        this.lastValueOfPreviousWindow[deviceId] = readings[readings.length - 1].data.electricity_usage_kwh;
        if (lastValue - firstValue <= 0) return sum;
        return sum + (lastValue - firstValue);
      }, 0);

      this.householdWindowSum = householdWindowSum;
      onWindowComplete({
        timestamp: Date.now(),
        readings: deviceReadings,
        total: householdWindowSum
      });
    });
  }

  getSumWindow() {
    return this.householdWindowSum;
  }

  stop() {
    this.subject.complete();
  }
}

module.exports = HouseholdMeterService;