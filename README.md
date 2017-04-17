Homekit
=======
A Homekit implementation for Big Ass Fans. Is heavily dependant on the [unofficial Big Ass Fans API](https://github.com/sean9keenan/BigAssFansAPI).

Installing
----------
[First install homebridge - instructions here](https://github.com/nfarina/homebridge#installation)

An example config.json is as follows:
```
    "platforms": [
        {
            "platform": "BigAssFans",
            "name": "Big Ass Fan",
            "fan_count": 1
        }
    ]
```

This config will automatically scan and add *all* fans that are on your local wifi network. However you should also always add the expected number of fans with the optional config parameter `fan_count` (by default this assumes 1). Otherwise homebridge will not always discover all the fans.

Install this package with
```
npm install -g homebridge-bigAssFans
```

Important note
--------------
All of the smarts in your fan will continue to operate - eg. If you set homekit and your fan's local settings set to turn the light on when occupancy is sensed, and then decide to turn it off via homekit the local settings will _still_ turn the light on

Legacy
------
Legacy mode allows you to specify a single fan to control - and also allows more fine grained control regarding the settings of the single fan.

Legacy mode can not run at the same time as the new Platform mode. In addition this mode does not support running multiple big ass fans.

```
{
    "accessory": "BigAssFan",
    "name": "Sean's Big Ass Fan",
    "fan_name": "Sean's Room",
    "fan_id": "20:F8:5E:AA:7A:57"
}
```

In order to get the fan_id, run the example program [getFanInfo.js from theBigAssFansAPI](https://github.com/sean9keenan/BigAssFansAPI/blob/master/Examples/getFanInfo.js).

You must also set the fan_name to the name returned here.


### About the legacy config
|        Field       |   Required?  |                Description               |
|--------------------|--------------|------------------------------------------|
| name               |   Optional   | Overall Name to use for this accessory   |
| fan_name           | _*Required*_ | Must get this from `getFanInfo.js`       |
| fan_id             | _*Required*_ | Must get this from `getFanInfo.js`       |
| fan_ip_address     |   Optional   | IP address of fan, defaults to broadcast |
| light_exists       |   Optional   | Has light? set to true - default false   |
| light_on           |   Optional   | What "On" means - default Max            |
| fan_on             |   Optional   | What "On" means - default 3/7            |
| homekit_fan_name   |   Optional   | Name to call the Fan in Homekit          |
| homekit_light_name |   Optional   | Name to call the Light in Homekit        |


Future features
---------------
 - Getting motion sensors to work
 - Allowing all Legacy settings in the Platform mode

Testing
-------
In order to test a local copy you can [read here](https://github.com/nfarina/homebridge#plugin-development), or as a brief tldr:
```
/usr/local/bin/homebridge -D -P ./homebridge-bigAssFans/
```
(Or if homebridge is somewhere else, run `which homebridge` to find it's location)

Other issues:
 - If you can't add the bridge device try changing the `"username"`` in the config file, sometimes this needs to be changed to fix a caching issue on iOS
