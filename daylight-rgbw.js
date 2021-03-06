/*

Daylight RGBW Color control Node for Node-RED
-------------------------------------------------------------------------------------------------------------------

Copyright (c) 2018 Raimond Brookman

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

module.exports = function(RED) {
    "use strict";
  
    var ct = require('color-temperature');
    var SunCalc = require('suncalc');
    
    function ScaleRGBLevelToPercent(rgbLevel) {
        return rgbLevel * 100.0 / 255.0;
    }
    
// ------------------------------------------------------------------------------------------
    function DaylightRGBWNode(n) {
    //
    // DaylightRGBW Input Node
    //
        
        // Create a RED node
        RED.nodes.createNode(this,n);
        
        this.topic = n.topic;
        this.command = n.command;
        this.minTemp = Number(n.minColorTemp);
        this.maxTemp = Number(n.maxColorTemp);
        this.whiteLevel = Number(n.whiteLevel);
        this.latitude = Number(n.latitude)||0.0;
        this.longitude = Number(n.longitude)||0.0;

        this.itemState = this.context().get("itemState") || "OFF";
        this.colorTemp = this.minTemp;

        var node = this;
  
        // This will be executed on every input message
        this.on('input', function (msg) {
        
            this.log("Received Topic:" + msg.topic);

            if(msg.topic == "date-time")
            {
                this.dateTime = msg.payload;
                this.log("Received dt:" + this.dateTime);
                

                var positionResult = SunCalc.getPosition(this.dateTime, this.latitude, this.longitude);
                this.log("Sun position:" + positionResult.altitude);

                var fraction = positionResult.altitude * 2.0 / Math.PI;
                this.log("Sun position fraction:" + fraction);

                this.colorTemp = (this.minTemp * 1.0) + (Math.max(fraction,0) * (this.maxTemp-this.minTemp));
            } else if(msg.topic == "color-temp")
            {
                this.colorTemp = Number(msg.payload) * 1.0;
            }
            else if(msg.topic == "item-switch" || msg.event == "StateEvent" )
            {
                this.itemState = msg.payload;
                this.context().set("itemSate", this.itemState);
            }
            else if(msg.topic == "white-level")
            {
                var currentWhiteLevel = this.whiteLevel;
                var newWhiteLevel = Number(msg.payload) * 1.0;

                if(newWhiteLevel >= 0 || newWhiteLevel <= 100)
                {
                    this.whiteLevel = newWhiteLevel;
                }
            }
            else
            {
                this.status({fill:"red",shape:"dot",text:"unknown topic:" + msg.topic});
                return;
            }

            this.log("Color-temp:" + this.colorTemp);

            this.status({fill:"yellow",shape:"ring",text:"calculating for:" + this.colorTemp.toFixed(1)});

            if(this.itemState == "ON")
            {

                var rgb = ct.colorTemperature2rgb(this.colorTemp);
        
                // Convert values to percentage
                var red = ScaleRGBLevelToPercent(rgb.red);
                var green = ScaleRGBLevelToPercent(rgb.green);
                var blue = ScaleRGBLevelToPercent(rgb.blue);
                var white = Number(this.whiteLevel) * 1.0;

                var msgRed = { topic: this.topic, payload: red};
                var msgGreen = { topic: this.topic, payload: green};
                var msgBlue = { topic: this.topic, payload: blue};
                var msgWhite = { topic: this.topic, payload: white};
  
                this.send([msgRed, msgGreen, msgBlue, msgWhite]);
                
                this.status({fill:"green",shape:"ring",text:"R:" + red.toFixed(1) + 
                ",G:" + green.toFixed(1) + ",B:" + blue.toFixed(1) +
                ",W:" + white.toFixed(1)});
            }
            else
            {
                this.status({fill:"red",shape:"ring",text:"OFF, colortemp:" + this.colorTemp.toFixed(1)});
            }
                        
        });

        this.on("close", function() {
        });
    }
    RED.nodes.registerType("daylight-rgbw",DaylightRGBWNode);
}
