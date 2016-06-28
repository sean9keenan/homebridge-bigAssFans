Homekit
=======
A Homekit implementation for Big Ass Fans. Is heavily dependant on the [unofficial Big Ass Fans API](https://github.com/sean9keenan/BigAssFansAPI).

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

In order to get the fan_id, run the example program [getFanInfo.js from theBigAssFansAPI](https://github.com/sean9keenan/BigAssFansAPI/blob/master/Examples/getFanInfo.js).

You must also set the fan_name to the name returned here.

Install this package with
```
npm install -g homebridge-bigAssFans
```

### About the config
|        Field       |   Required?  |                Description               |
|--------------------|--------------|------------------------------------------|
| name               |   Optional   | Overall Name to use for this accessory   |
| fan_name           | _*Required*_ | Must get this from `getFanInfo.js`       |
| fan_id             | _*Required*_ | Must get this from `getFanInfo.js`       |
| fan_ip_address     |   Optional   | IP address of fan, defaults to broadcast |
| light_on           |   Optional   | What "On" means - default Max            |
| fan_on             |   Optional   | What "On" means - default 3/7            |
| homekit_fan_name   |   Optional   | Name to call the Fan in Homekit          |
| homekit_light_name |   Optional   | Name to call the Light in Homekit        |

Important note
--------------
All of the smarts in your fan will continue to operate - eg. If you set homekit and your fan's local settings set to turn the light on when occupancy is sensed, and then decide to turn it off via homekit the local settings will _still_ turn the light on

Future features
---------------
 - Not having to specify fan_name and fan_id.
 - Getting motion sensors to work
