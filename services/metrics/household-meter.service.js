// src/services/metrics/sub-meter.service.js
const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class HouseholdMeterService {
  constructor(areaId) {
    this.areaId = areaId;
    this.subject = new Subject();
    this.readings = {};
    this.currentWindow = null;
    this.windowSize = config.window.windowTime;
  }

  addReading(reading) {
    if (!this.readings[reading.meterId]) {
      this.readings[reading.meterId] = [];
    }

    this.readings[reading.meterId].push(reading);
    this.subject.next(reading);
    this.pruneOldData(reading.meterId);
  }

  pruneOldData(meterId) {
    if (!this.readings[meterId]) return;
    
    const now = Date.now();
    const cutoff = now - this.windowSize;
    
    const indexToKeep = this.readings[meterId].findIndex(r => r.timestamp >= cutoff);
    if (indexToKeep > 0) {
      this.readings[meterId].splice(0, indexToKeep);
    }
  }

  setupWindowProcessing(onWindowComplete) {
    this.subject.pipe(
      windowTime(this.windowSize),
      mergeMap(window => window.pipe(
        reduce((acc, reading) => {
          if (!acc.meterReadings[reading.meterId]) {
            acc.meterReadings[reading.meterId] = { sum: 0, count: 0, readings: [] };
          }
          
          acc.meterReadings[reading.meterId].readings.push(reading);
          acc.meterReadings[reading.meterId].sum += reading.value;
          acc.meterReadings[reading.meterId].count++;
          
          return acc;
        }, { meterReadings: {}, timestamp: Date.now() })
      )),
      filter(result => Object.keys(result.meterReadings).length > 0)
    ).subscribe(subWindow => {
      this.currentWindow = subWindow;
      onWindowComplete(subWindow);
    });
  }

  getCurrentWindow() {
    return this.currentWindow;
  }

  stop() {
    this.subject.complete();
  }
}

module.exports = HouseholdMeterService;