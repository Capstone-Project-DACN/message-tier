// src/services/metrics/sub-meter.service.js
const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class HouseholdMeterService {
  constructor(areaId) {
    this.areaId = areaId;
    this.subject = new Subject();
    this.readings = {};
    this.householdWindowSum = 0;
    this.currentWindow = null;
    this.windowSize = config.window.windowTime;
  }

  addReading(reading) {
    if (!this.readings[reading.device_id]) {
      this.readings[reading.device_id] = [];
    }

    this.readings[reading.device_id].push(reading);
    this.subject.next(reading);
    this.pruneOldData(reading.device_id);
  }

  pruneOldData(device_id) {
    if (!this.readings[device_id]) return;
    
    const now = Date.now();
    const cutoff = now - this.windowSize;
    
    const indexToKeep = this.readings[device_id].findIndex(r => r.timestamp >= cutoff);
    if (indexToKeep > 0) {
      this.readings[device_id].splice(0, indexToKeep);
    }
  }

  setupWindowProcessing(onWindowComplete) {
    this.subject.pipe(
      windowTime(this.windowSize),
      mergeMap(window => window.pipe(
        reduce((acc, reading) => {
          if (!acc.meterReadings[reading.device_id]) {
            acc.meterReadings[reading.device_id] = { sum: 0, count: 0, readings: [] };
          }
          
          acc.meterReadings[reading.device_id].readings.push(reading);
          acc.meterReadings[reading.device_id].sum += reading.data.electricity_usage_kwh;
          acc.meterReadings[reading.device_id].count++;
          
          return acc;
        }, { meterReadings: {}, timestamp: Date.now() })
      )),
      filter(result => Object.keys(result.meterReadings).length > 0)
    ).subscribe(householdWindow => {
      const householdWindowSum = Object.values(householdWindow.meterReadings).reduce((acc, reading) => acc + reading.sum, 0);
      this.householdWindowSum = householdWindowSum;
      onWindowComplete(householdWindow);
    });
  }

  getSumWindow() {
    return this.sum;
  }

  stop() {
    this.subject.complete();
  }
}

module.exports = HouseholdMeterService;