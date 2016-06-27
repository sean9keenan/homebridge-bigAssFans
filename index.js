var bigAssApi = require("BigAssFansAPI");

var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  
  homebridge.registerAccessory("homebridge-bigAssFan", "BigAssFan", BigAssFanAccessory);
}

function BigAssFanAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.fanID = config["fan_id"];
  this.fanIPAddress = config["fan_ip_address"]; // Can be null - resorts to broadcasting
  this.lightOn = config["light_on"]; // Can be null - default is belo
  this.fanOn = config["fan_on"]; // Can be null - default is below

  // Set defaults
  this.fanIPAddress = this.fanIPAddress ? this.fanIPAddress : "255.255.255.255";
  this.lightOn = this.lightOn ? this.lightOn : 16;
  this.fanOn = this.fanOn ? this.fanOn : 3;

  // Don't scan for any fans since we know the exact address of the fan (faster!)
  this.fanMaster = new bigAssApi.FanMaster(0); 

  // Put in exact information for the fan you're trying to reach
  this.myBigAss = new bigAssApi.BigAssFan(this.name, this.fanID, this.fanIPAddress, this.fanMaster);

  this.myBigAss.updateAll();

  this.lightService = new Service.Lightbulb(this.name);

  setCharacteristicOnService(this.lightService, Characteristic.On,
                             "light", "brightness",
                             boolGetWrapper, lightSetWrapper)
  
  setCharacteristicOnService(this.lightService, Characteristic.Brightness,
                             "light", "brightness",
                             passThroughWrapper, passThroughWrapper)

  this.fanService = new Service.Fan(this.name);
  
  setCharacteristicOnService(this.fanService, Characteristic.On,
                             "fan", "speed",
                             boolGetWrapper, fanSetWrapper)
  
  setCharacteristicOnService(this.fanService, Characteristic.RotationDirection,
                             "fan", "isSpinningForwards",
                             fanRotationGetWrapper, fanRotationSetWrapper)

  setCharacteristicOnService(this.fanService, Characteristic.RotationSpeed,
                             "fan", "speed",
                             passThroughWrapper, passThroughWrapper)

  this.occupancyService = new Service.OccupancySensor(this.name);
  
  setCharacteristicOnService(this.occupancyService, Characteristic.OccupancyDetected,
                             "light", "isOccupied",
                             occupancyGetWrapper, null)

  var setCharacteristicOnService = function(service, 
                                            characteristic, 
                                            propertyToWrap, 
                                            subProperty, 
                                            getOutputMapping, 
                                            setOutputMapping) {

    var serviceWithCharacteristic = service.getCharacteristic(characteristic)

    if (getOutputMapping) {
      serviceWithCharacteristic.on('get', this.getStateFactory(propertyToWrap, subProperty, getOutputMapping).bind(this));

      this.myBigAss[propertyToWrap].registerUpdateCallback(subProperty, function(newValue) {
        service.setCharacteristic(characteristic, getOutputMapping(newValue));
      });
    }

    if (setOutputMapping) {
      serviceWithCharacteristic.on('set', this.setStateFactory(propertyToWrap, subProperty, setOutputMapping).bind(this));
    }

  }.bind(this);

  this.getServices = function() {
    return [this.lightService, this.fanService, this.occupancyService];
  }
}

BigAssFanAccessory.prototype.getStateFactory = function(propertyToWrap, subProperty, outputMapping) {
  if (!outputMapping) {
    outputMapping = function (value) { return value; }
  }
  return function(callback) {
    this.myBigAss[propertyToWrap].update(subProperty, function(err, value) {
      callback(err, outputMapping(value).bind(this));
    });
  }
}

BigAssFanAccessory.prototype.setStateFactory = function(propertyToWrap, subProperty, outputMapping) {
  if (!outputMapping) {
    outputMapping = function (value) { return value; }
  }
  return function(state, callback) {
    this.myBigAss[propertyToWrap].setProperty(subProperty, outputMapping(state).bind(this), function(err) {
      callback(err);
    });
  }
}

/********************************************
 * Wrappers for various get and set functions
 ********************************************/

var passThroughWrapper = function(value) {
  return value;
}

var boolGetWrapper = function(value) {
  return value > 0;
}

var lightSetWrapper = function(value) {
  return (value ? this.lightOn : 0);
}

var fanSetWrapper = function(value) {
  return (value ? this.fanOn : 0);
}

var fanRotationSetWrapper = function(value) {
  return (value == Characteristic.RotationDirection.CLOCKWISE ? true : false);
}

var fanRotationGetWrapper = function(value) {
  return (value ? Characteristic.RotationDirection.CLOCKWISE : Characteristic.RotationDirection.COUNTER_CLOCKWISE);
}

var occupancyGetWrapper = function(value) {
  return (value ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
}
