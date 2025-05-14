const { Subject } = require('rxjs');
const { windowTime, mergeMap, reduce, filter } = require('rxjs/operators');
const config = require('../../configs');

class AreaMeterService {
  constructor(areaId, settings) {
    this.areaId = areaId; 
    this.subject = new Subject();
    this.readings = [];
    this.areaWindowSum = 0;
    this.lastValueOfPreviousWindow = 0;
    this.windowSize = settings.window_time;
    // this.windowSize = config.anomaly.window_time;
  }

  updateAreaSettings(settings) { 
    if (typeof settings.window_time === "number" && settings.window_time > 0) 
      this.windowSize = settings.window_time;

    console.log("[INFOMATION][SETTING][AREA]: ", this.areaId, this.windowSize);
  }

  addReading(reading) {
    if (typeof reading.data?.total_electricity_usage_kwh !== 'number') {
      console.error(`Invalid area reading for area ${this.areaId}:`, reading);
      return;
    }

    this.readings.push(reading);
    this.subject.next(reading);
    this.pruneOldData();
  }

  pruneOldData() {
    const now = Date.now();
    const cutoff = now - this.windowSize;
    this.readings = this.readings.filter(r => r.timestamp >= cutoff);
  }

  setupWindowProcessing(onWindowComplete) {
    this.subject.pipe(
      windowTime(this.windowSize),
      mergeMap(window => window.pipe(
        reduce((acc, reading) => {
          acc.push(reading);
          return acc;
        }, [])
      )),
      filter(readings => readings.length > 0)
    ).subscribe(readings => {
      // const logData = readings.map(item => item.data.total_electricity_usage_kwh);
      // console.log({areaId: this.areaId, lastValue: this.lastValueOfPreviousWindow, logData})

      const firstValue = this.lastValueOfPreviousWindow || readings[0].data.total_electricity_usage_kwh;
      const lastValue = readings[readings.length - 1].data.total_electricity_usage_kwh;
      this.lastValueOfPreviousWindow = readings[readings.length - 1].data.total_electricity_usage_kwh;
      this.areaWindowSum = (lastValue - firstValue) > 0 ? lastValue - firstValue : 0;

      onWindowComplete({
        timestamp: Date.now(),
        readings,
        total: this.areaWindowSum
      });
    });
  }

  getSumWindow() {
    return this.areaWindowSum;
  }

  stop() {
    this.subject.complete();
  }
}

module.exports = AreaMeterService;