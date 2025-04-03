const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class AreaMeterService {
  constructor(areaId) {
    this.areaId = areaId;
    this.subject = new Subject();
    this.lastValue = 0;
    this.firstValue = 0;
    this.readings = [];
    this.windowSize = config.window.windowTime;
  }

  addReading(reading) {
    this.readings.push(reading);
    this.subject.next(reading);
    this.pruneOldData();
  }

  pruneOldData() {
    const now = Date.now();
    const cutoff = now - this.windowSize;
    
    const indexToKeep = this.readings.findIndex(r => r.timestamp >= cutoff);
    if (indexToKeep > 0) {
      this.readings.splice(0, indexToKeep);
    }
  }

  setupWindowProcessing(onWindowComplete) {
    this.subject.pipe(  
      windowTime(this.windowSize),
      mergeMap(window => window.pipe(
        reduce((acc, reading) => {
          if (acc.count === 0) acc.firstValue = reading.data.total_electricity_usage_kwh;
          acc.lastValue = reading.data.total_electricity_usage_kwh;
          acc.readings.push(reading);
          acc.count++;
          return acc;
        }, { readings: [], lastValue: 0, firstValue: 0, count: 0 })
      )),
      filter(result => result.count > 0)
    ).subscribe(areaWindow => {
      this.lastValue = areaWindow.lastValue;
      this.firstValue = areaWindow.firstValue;
      this.readings = areaWindow.readings;   
      this.count = areaWindow.count;   
      onWindowComplete(areaWindow);
    });
  }

  stop() {
    this.subject.complete();
  }
}

module.exports = AreaMeterService;  