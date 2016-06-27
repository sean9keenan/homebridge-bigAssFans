Homekit
=======
A Homekit implementation for Big Ass Fans. Is heavily dependant on the [unofficial Big Ass Fans API](https://github.com/sean9keenan/BigAssFansAPI).

*_WARNING_* : This basically doesn't work at all right now.

Installing
----------
[First install homebridge - instructions here](https://github.com/nfarina/homebridge#installation)

An example config.json is as follows:
```
{
    "accessory": "BigAssFan",
    "name": "Sean's Big Ass Fan",
    "fan_name": "Sean's Room",
    "fan_id": "20:F8:5E:AA:7A:57"
}
```

Install this package with
```
npm install homebridge-bigAssFans
```

Important note
--------------
All of the smarts in your fan will continue to operate - eg. If you set homekit and your fan's local settings set to turn the light on when occupancy is sensed, and then decide to turn it off via homekit the local settings will _still_ turn the light on