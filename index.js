var bigAssApi = require("BigAssFansAPI");
bigAssApi.logging = true;

var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  
  homebridge.registerAccessory("homebridge-bigAssFan", "BigAssFan", BigAssFanAccessory);
}

function BigAssFanAccessory(log, config) {
  this.log              = log;
  this.name             = config["name"];
  this.fanName          = config["fan_name"]; // TODO: Allow this to be null
  this.fanID            = config["fan_id"];
  this.fanIPAddress     = config["fan_ip_address"]; // Can be null - resorts to broadcasting
  this.lightOn          = config["light_on"]; // Can be null - default is below
  this.fanOn            = config["fan_on"]; // Can be null - default is below
  this.homekitFanName   = config["homekit_fan_name"]
  this.homekitLightName = config["homekit_light_name"]

  // Set defaults
  var setDefault = function(property, value) {
    if (!this[property]) {this[property] = value}
  }.bind(this);

  setDefault("fanIPAddress", "255.255.255.255");
  setDefault("lightOn", 16);
  setDefault("fanOn", 3);

  setDefault("name", this.fanName);
  setDefault("homekitFanName", this.name);
  setDefault("homekitLightName", this.name);

  // Don't scan for any fans since we know the exact address of the fan (faster!)
  // TODO: Make fan_id optional and do the scan for the user
  this.fanMaster = new bigAssApi.FanMaster(0); 

  // Put in exact information for the fan you're trying to reach
  this.myBigAss = new bigAssApi.BigAssFan(this.fanName, this.fanID, this.fanIPAddress, this.fanMaster);

  // this.myBigAss.updateAll();

  var setCharacteristicOnService = function(service, 
                                            characteristic, 
                                            propertyToWrap, 
                                            subProperty, 
                                            getOutputMapping, 
                                            setOutputMapping) {

    var thisChar = service.getCharacteristic(characteristic)

    if (getOutputMapping) {
      thisChar.on('get', this.getStateFactory(propertyToWrap, 
                                              subProperty, 
                                              getOutputMapping).bind(this));

      // Register for updates outside of the homekit system
      this.myBigAss[propertyToWrap].registerUpdateCallback(subProperty, function(newValue) {
        if (thisChar.emit) {
          // Emit this change to the homekit system
          // oldValue : Grabs the old cached value for this characterisitic
          // newValue : The value we just recieved
          // context  : Gives context so that whoever requested the update doesn't recieve it.
          //            In this case we need everyone to get the update
          thisChar.emit('change', { 
              oldValue:thisChar.value, 
              newValue:getOutputMapping(newValue), 
              context:null });
        }
      });
    }

    if (setOutputMapping) {
      thisChar.on('set', this.setStateFactory(propertyToWrap, 
                                              subProperty, 
                                              setOutputMapping).bind(this));
    }

  }.bind(this);


  /********************************************
   * Wrappers for various get and set functions
   ********************************************/

  var passThroughWrapper = function(value) {
    return value;
  }

  var setScalingWrapper = function(maxValue) {
    return function(value) {
      var retVal = Math.round(value * maxValue / 100);
      console.log("Value in: "+value + "value out: " + retVal);
      return retVal
    }
  }

  var getScalingWrapper = function(maxValue) {
    return function(value) {
      return Math.round(value * 100 / maxValue);
    }
  }

  var boolGetWrapper = function(value) {
    return value > 0;
  }

  var lightSetWrapper = function(value) {
    // We define that returning null will ignore the command
    // For some reason homekit likes to send extraneous "On" commands
    if (value && this.myBigAss.light.brightness > 0) {
      return null;
    }
    return (value ? this.lightOn : 0);
  }.bind(this)

  var fanSetWrapper = function(value) {
    // We define that returning null will ignore the command
    // For some reason homekit likes to send extraneous "On" commands
    if (value && this.myBigAss.fan.speed > 0) {
      return null;
    }
    return (value ? this.fanOn : 0);
  }.bind(this)

  var fanRotationSetWrapper = function(value) {
    return value == Characteristic.RotationDirection.COUNTER_CLOCKWISE;
  }

  var fanRotationGetWrapper = function(value) {
    return (value ? Characteristic.RotationDirection.COUNTER_CLOCKWISE : Characteristic.RotationDirection.CLOCKWISE);
  }

  var occupancyGetWrapper = function(value) {
    return (value ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
  }

  var lightMaxBrightness = this.myBigAss.light.max ? this.myBigAss.light.max : 16;
  var fanMaxSpeed        = this.myBigAss.fan.max ? this.myBigAss.fan.max : 7;

  this.lightService = new Service.Lightbulb(this.homekitLightName);

  setCharacteristicOnService(this.lightService, Characteristic.On,
                             "light", "brightness",
                             boolGetWrapper, lightSetWrapper)
  
  setCharacteristicOnService(this.lightService, Characteristic.Brightness,
                             "light", "brightness",
                             getScalingWrapper(lightMaxBrightness), setScalingWrapper(lightMaxBrightness))

  this.fanService = new Service.Fan(this.homekitFanName);
  
  setCharacteristicOnService(this.fanService, Characteristic.On,
                             "fan", "speed",
                             boolGetWrapper, fanSetWrapper)
  
  setCharacteristicOnService(this.fanService, Characteristic.RotationDirection,
                             "fan", "isSpinningForwards",
                             fanRotationGetWrapper, fanRotationSetWrapper)

  setCharacteristicOnService(this.fanService, Characteristic.RotationSpeed,
                             "fan", "speed",
                             getScalingWrapper(fanMaxSpeed), setScalingWrapper(fanMaxSpeed))

  // this.occupancyService = new Service.OccupancySensor(this.name);
  
  // setCharacteristicOnService(this.occupancyService, Characteristic.OccupancyDetected,
  //                            "room", "isOccupied",
  //                            occupancyGetWrapper, null)

  this.getServices = function() {
    return [this.lightService, this.fanService];//, this.occupancyService];
  }
}

BigAssFanAccessory.prototype.getStateFactory = function(propertyToWrap, subProperty, outputMapping) {
  return function(callback) {
    this.myBigAss[propertyToWrap].update(subProperty, function(err, value) {
      var returnVal = outputMapping(value);
      callback(err, returnVal);
    });
  }
}

BigAssFanAccessory.prototype.setStateFactory = function(propertyToWrap, subProperty, outputMapping) {
  return function(state, callback) {
    var valToSet = outputMapping(state)
    if (valToSet != null) {
      this.myBigAss[propertyToWrap].setProperty(subProperty, valToSet, function(err) {
        callback(err);
      });
    } else {
      // If null is returned, ignore the command
      callback(null);
    }
  }
}

