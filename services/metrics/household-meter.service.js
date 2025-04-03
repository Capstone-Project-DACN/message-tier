const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class HouseholdMeterService {
  constructor(areaId) {
    this.areaId = areaId;
    this.subject = new Subject();
    this.readings = {};
    this.householdWindowSum = 0;
    this.windowSize = config.window.windowTime;
    this.previousLastValues = {}; // Store the last value from each device
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
            acc.meterReadings[reading.device_id] = { 
              readings: [], 
              count: 0, 
              firstValue: this.previousLastValues[reading.device_id] || 0,
              lastValue: 0 
            };
          }
          
          acc.meterReadings[reading.device_id].lastValue = reading.data.electricity_usage_kwh;
          acc.meterReadings[reading.device_id].readings.push(reading);
          acc.meterReadings[reading.device_id].count++;
          
          return acc;
        }, { meterReadings: {}, timestamp: Date.now() })
      )),
      filter(result => Object.keys(result.meterReadings).length > 0)
    ).subscribe(householdWindow => {
      const householdWindowSum = Object.entries(householdWindow.meterReadings).reduce((acc, [deviceId, reading]) => {
        this.previousLastValues[deviceId] = reading.lastValue;
        console.log(`Device ${deviceId} window: ${reading.firstValue} -> ${reading.lastValue}, diff: ${reading.lastValue - reading.firstValue}`);
        return acc + (reading.lastValue - reading.firstValue);
      }, 0);
      
      this.householdWindowSum = householdWindowSum;
      onWindowComplete(householdWindow);
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