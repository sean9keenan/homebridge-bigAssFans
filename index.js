var bigAssApi = require("BigAssFansAPI");
bigAssApi.logging = false;

var Service, Characteristic;

module.exports = function(homebridge) {
  // Platform Accessory must be created from PlatformAccessory Constructor
  PlatformAccessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-bigAssFans", "BigAssFans", BigAssFansPlatform, true);
  homebridge.registerAccessory("homebridge-bigAssFan", "BigAssFan", BigAssFanAccessory);
}

function BigAssFansPlatform(log, config, api) {
  // If config is not specified do not attempt to load platform
  // or else it will eat the port.
  if (!config) {
    return;
  }
  log("Big Ass Fans Platform Init");
  var platform = this;
  this.log = log;
  this.config = config;
  this.accessories = [];
  this.accessoriesHashed = {};
  this.numberOfFans = config ? (config.fan_count || 1) : 1;
  this.fanMaster = new bigAssApi.FanMaster(this.numberOfFans); 
  
  this.fanMaster.onFanFullyUpdated = function(myBigAss){
    platform.addAccessory(myBigAss);
  }

  if (api) {
      // Save the API object as plugin needs to register new accessory via this object.
      this.api = api;

      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories
      this.api.on('didFinishLaunching', function() {
        platform.log("DidFinishLaunching");
      }.bind(this));
  }
}

// Function invoked when homebridge tries to restore cached accessory
// Developer can configure accessory at here (like setup event handler)
// Update current value
BigAssFansPlatform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory", accessory.UUID);
  var platform = this;

  // set the accessory to reachable if plugin can currently process the accessory
  // otherwise set to false and update the reachability later by invoking 
  // accessory.updateReachability()
  accessory.reachable = false;

  this.accessoriesHashed[accessory.UUID] = accessory;
}

// Sample function to show how developer can add accessory dynamically from outside event
BigAssFansPlatform.prototype.addAccessory = function(theFan) {
  var platform = this;
  var newAccessory;
  var uuid;
  
  var doctoredConfig = {
    "name"               : theFan.name,
    "fan_name"           : theFan.name,
    "fan_id"             : theFan.id,
    "fan_ip_address"     : theFan.address,
    "light_exists"       : theFan.light.exists,
    "light_on"           : platform.config.light_on,
    "fan_on"             : platform.config.fan_on,
    "homekit_fan_name"   : platform.config.homekit_fan_name,
    "homekit_light_name" : platform.config.homekit_light_name,
    "fan_master"         : theFan.master,
  }

  //Check if we have a cached accessory and link it to runtime fan instance, or create new service
  uuid = UUIDGen.generate(theFan.name);
  
  if (platform.accessoriesHashed[uuid]) {
    newAccessory = platform.accessoriesHashed[uuid];
  } else {
    newAccessory = new PlatformAccessory(theFan.name, uuid);
  }
  
  var newInnerFanAccessory = new BigAssFanAccessory(platform.log, doctoredConfig, newAccessory);

  // Adds "identify" functionality
  newAccessory.on('identify', function(paired, callback) {
    platform.log(newAccessory.displayName, "Identified fan (homekit setup)");
    callback();
  });
  
  // Plugin can save context on accessory
  // To help restore accessory in configureAccessory()
  newAccessory.context.doctoredConfig = this.fan_ip_address;
  
  this.accessories.push(newAccessory);
  if (!platform.accessoriesHashed[uuid]) {
    this.api.registerPlatformAccessories("homebridge-bigAssFans", "BigAssFans", [newAccessory]);
  }
}

// Sample function to show how developer can remove accessory dynamically from outside event
BigAssFansPlatform.prototype.removeAccessory = function() {
  this.log("Remove Accessory");
  this.api.unregisterPlatformAccessories("homebridge-bigAssFans", "BigAssFans", this.accessories);

  this.accessories = [];
}



function BigAssFanAccessory(log, config, existingAccessory) {
  this.log              = log;
  this.name             = config["name"];
  this.fanName          = config["fan_name"];        // TODO: Allow this to be null
  this.fanID            = config["fan_id"];
  this.fanIPAddress     = config["fan_ip_address"];  // Can be null - resorts to broadcasting
  this.lightExists      = config["light_exists"]     // Can be null - default is below
  this.lightOn          = config["light_on"];        // Can be null - default is below
  this.fanOn            = config["fan_on"];          // Can be null - default is below
  this.homekitFanName   = config["homekit_fan_name"]
  this.homekitLightName = config["homekit_light_name"]
  this.fanMaster        = config["fan_master"]       // Can NOT be entered by user

  // Set defaults
  var setDefault = function(property, value) {
    if (!this[property]) {this[property] = value}
  }.bind(this);

  setDefault("fanIPAddress", "255.255.255.255");
  setDefault("lightOn", 16);
  setDefault("fanOn", 3);
  setDefault("lightExists", false);

  setDefault("name", this.fanName);
  setDefault("homekitFanName", this.name + " Fan");
  setDefault("homekitLightName", this.name + " Fan Light");
  setDefault("homekitOccupancyName", this.name + " Occupancy Sensor");
  // Don't scan for any fans since we know the exact address of the fan (faster!)
  // TODO: Make fan_id optional and do the scan for the user
  if (!this.fanMaster) {
    this.fanMaster = new bigAssApi.FanMaster(this.numberOfFans); 
  }

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
      return Math.round(value * maxValue / 100);
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
  
  if (this.lightExists) {
    this.log("Found a light for: " + this.homekitLightName);
  
    var existingLightBulbService;
    if (existingAccessory){
      existingLightBulbService = existingAccessory.getService(this.homekitLightName);
    }
    this.lightService = existingLightBulbService || new Service.Lightbulb(this.homekitLightName);
  
    setCharacteristicOnService(this.lightService, Characteristic.On,
                               "light", "brightness",
                               boolGetWrapper, lightSetWrapper)
  
    setCharacteristicOnService(this.lightService, Characteristic.Brightness,
                               "light", "brightness",
                               getScalingWrapper(lightMaxBrightness), setScalingWrapper(lightMaxBrightness))

    if (existingAccessory && !existingLightBulbService){
      existingAccessory.addService(this.lightService);
    }

  } else {
    this.log("No light exists for: " + this.homekitLightName);
  }
    
  var existingFanService;
  if (existingAccessory){
    existingFanService = existingAccessory.getService(this.homekitFanName);
  }
  this.fanService = existingFanService || new Service.Fan(this.homekitFanName);
  
  setCharacteristicOnService(this.fanService, Characteristic.On,
                             "fan", "speed",
                             boolGetWrapper, fanSetWrapper)
  
  setCharacteristicOnService(this.fanService, Characteristic.RotationDirection,
                             "fan", "isSpinningForwards",
                             fanRotationGetWrapper, fanRotationSetWrapper)

  setCharacteristicOnService(this.fanService, Characteristic.RotationSpeed,
                             "fan", "speed",
                             getScalingWrapper(fanMaxSpeed), setScalingWrapper(fanMaxSpeed))
  if (existingAccessory && !existingFanService){
    existingAccessory.addService(this.fanService);
  }

  var existingOccupancyService;
  if (existingAccessory){
    existingOccupancyService = existingAccessory.getService(this.homekitOccupancyName);
  }

  this.occupancyService = existingOccupancyService || new Service.OccupancySensor(this.homekitOccupancyName);
  
  setCharacteristicOnService(this.occupancyService, Characteristic.OccupancyDetected,
                              "sensor", "isOccupied",
                              occupancyGetWrapper, null)
    
  if (existingAccessory && !existingOccupancyService){
    existingAccessory.addService(this.occupancyService);
  }

  this.getServices = function() {
    return [this.lightService, this.fanService, this.occupancyService];
  }
  if (existingAccessory){
    existingAccessory.updateReachability(true);
  }
}

BigAssFanAccessory.prototype.getStateFactory = function(propertyToWrap, subProperty, outputMapping) {
  return function(callback) {
    // TODO: Determine why update can callback multiple times
    //       This temporarily prevents multiple calls to the callback
    var callbackCalled = false;
    this.myBigAss[propertyToWrap].update(subProperty, function(err, value) {
      var returnVal = outputMapping(value);
      if (!callbackCalled) { // TODO: remove after bug is found
        callbackCalled = true;
        callback(err, returnVal);
      }
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

