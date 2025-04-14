const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class HouseholdMeterService {
  constructor(areaId) {
    this.areaId = areaId;
    this.subject = new Subject();
    this.readings = {}; // { device_id: [reading] }
    this.lastValueOfPreviousWindow = {}; // { device_id: value }
    this.householdWindowSum = 0;
    this.windowSize = config.window.windowTime;
  }

  addReading(reading) {
    if (!reading.device_id || typeof reading.data?.electricity_usage_kwh !== 'number') {
      console.error(`Invalid reading for area ${this.areaId}:`, reading);
      return;
    }

    if (!this.readings[reading.device_id]) {
      this.readings[reading.device_id] = [];
    }

    this.readings[reading.device_id].push(reading);
    this.subject.next(reading);
    this.pruneOldData(reading.device_id);
  }

  pruneOldData(deviceId) {
    if (!this.readings[deviceId]) return;

    const now = Date.now();
    const cutoff = now - this.windowSize;
    this.readings[deviceId] = this.readings[deviceId].filter(r => r.timestamp >= cutoff);
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
      // Tính tổng tiêu thụ trong window cho tất cả devices
      const householdWindowSum = Object.entries(deviceReadings).reduce((sum, [deviceId, readings]) => {
        if (readings.length === 0) return sum;

        // const logData = readings.map(item => item.data.electricity_usage_kwh);
        // console.log({areaId: this.areaId, deviceId, lastValue: this.lastValueOfPreviousWindow, logData})

        const firstValue = this.lastValueOfPreviousWindow[deviceId] || readings[0].data.electricity_usage_kwh;
        const lastValue = readings[readings.length - 1].data.electricity_usage_kwh;
        this.lastValueOfPreviousWindow[deviceId] = readings[readings.length - 1].data.electricity_usage_kwh;
        if(lastValue - firstValue <= 0) return sum;
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