// src/services/metrics/main-meter.service.js
const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class AreaMeterService {
  constructor(areaId) {
    this.areaId = areaId;
    this.subject = new Subject();
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
          acc.readings.push(reading);
          acc.sum += reading.value;
          acc.count++;
          return acc;
        }, { readings: [], sum: 0, count: 0 })
      )),
      filter(result => result.count > 0)
    ).subscribe(mainWindow => {
      onWindowComplete(mainWindow);
    });
  }

  stop() {
    this.subject.complete();
  }
}

module.exports = AreaMeterService;  