// ----------------------------------------------------
// Controls Controller
//  ...this controller controls the controls on my controller :)
// ----------------------------------------------------

// Controls Controller
angular.module('myApp').controller('ControlsController', ['$scope', '$window', '$http', 'socket', 'appVars', 'AssetLibrary', function ($scope, $window, $http, socket, appVars, AssetLibrary) {
  "use strict";

  var faderSpeedArray = [1.0001, 0.5, 0.25, 0.125, 0.0625, 0.0312, 0.0156];
  var faderStylePresets = [
    [0.0001, 0.0001, 1.0001, 1.0001, 0.0001, 0.0001, 1.0001, 1.0001, 0.0001],
    [0.0001, 0.2, 0.4, 0.7, 1.0001, 0.7, 0.4, 0.2, 0.0001],
    [0.0001, 0.25, 0.0001, 0.25, 0.75, 1.0001, 0.75, 1.0001, 0.0001],
    [0.5, 0.5, 1.0001, 0.5, 0.5, 0.5, 0.0001, 0.5, 0.5],
    [0.0001, 0.0001, 0.0001, 0.0001, 1.0001, 0.0001, 1.0001, 0.0001, 0.0001],
    [1.0001, 0.0001, 1.0001, 0.0001, 1.0001, 0.0001, 1.0001, 0.0001, 1.0001],
    [1.0001, 0.0001, 0.2, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 1.0001],
    [0.0001, 0.5, 0.8, 0.2, 1.0001, 0.3, 0.85, 0.3, 0.0001]
  ];

  var numSteps = faderStylePresets[0].length; // number of IR_OSC steps + 1

  // the onloaded flag for NexusUI is globally set in the index.html file
  var NexusUITimeout = setTimeout(waitNexusUILoaded, 40);

  function waitNexusUILoaded() {
    if(isNexusUILoaded === true) {
      initControls();
      clearTimeout(NexusUITimeout);
    }
  }

  function initControls () {
    console.log('init controls');

    // set colors
    var firstColorLight = "#ba6fe8";
    var firstColorMedium = "#7D3CA3";
    var firstColorDark = "#3F1756";
    var secondColorLight = "#FC6ACD";
    var secondColorMedium = "#B03889";
    var secondColorDark = "#63164A";
    var thirdColorLight = "#766AFC";
    var thirdColorMedium = "#4238B0";
    var thirdColorDark = "#1C1663";
    var firstColorLightComp = "#9de86f";
    var firstColorMediumComp = "#62a33c";
    var firstColorDarkComp = "#2e4e1c";

    $window.nx.colorize(firstColorLight);
    $window.nx.colorize("border", "#efefef");
    $window.nx.colorize("fill", firstColorDark);
    $window.nx.colorize("black", "#ffffff");

    // on/off toggle button
    $window.nx.add("toggle", {parent:"controlOnOff1"});
    $window.nx.widgets.toggle1.colors = {accent: firstColorLightComp, fill: firstColorDarkComp};
    $window.nx.widgets.toggle1.init();

    $window.nx.widgets.toggle1.on('*', function(data) {
      var msgOSC_dir = '/composition/video/effect1/param1/direction';
      var msgOSC_faderpos = '/composition/cross/values';
      var msgOSC_bypass = '/composition/video/effect1/bypassed';
      var msgOSC_runpos = '/composition/video/effect1/param1/values';

      if(data.value===1) {
        // turn on fader automation
        socket.emit('messageOSC', msgOSC_bypass, 0);
        socket.emit('messageOSC', msgOSC_dir, 1);
      } else {
        // turn off fader automation
        socket.emit('messageOSC', msgOSC_dir, 2);
        socket.emit('messageOSC', msgOSC_bypass, 1);
        socket.emit('messageOSC', msgOSC_faderpos, -1.00001);
        socket.emit('messageOSC', msgOSC_runpos, 0.00001);
      }
    });

    // beat style preset buttons
    $window.nx.add("tabs", {parent:"controlTabs1"});
    $window.nx.widgets.tabs1.options = ["1", "2", "3", "4", "5", "6", "7", "8"];
    $window.nx.widgets.tabs1.init();
    $window.nx.widgets.tabs1.on('*', function(data) {
      for(var i=0; i<numSteps; i++) {
        var msgOSC = '/composition/video/effect1/param' + (i+3) + '/values';
        var val = faderStylePresets[data.index][i];
        socket.emit('messageOSC', msgOSC, val);
        $window.nx.widgets.multislider1.setSliderValue(i, val);
        console.log(msgOSC);
      }
    });

    // style modification sliders
    $window.nx.add("multislider", {parent:"controlsLine2"});
    $window.nx.widgets.multislider1.sliders = numSteps;
    $window.nx.widgets.multislider1.init();
    $window.nx.widgets.multislider1.on('*', function(data) {
      var index = parseInt(Object.keys(data)[0]);
      if(index >= 0 && index < numSteps) {
        var val = data[index];
        var msgOSC = '/composition/video/effect1/param' + (index+3) + '/values';
        socket.emit('messageOSC', msgOSC, val);
        console.log(index, val);
      }
    });

    // tempo buttons
    $window.nx.add("tabs", {parent:"controlTabs2"});
    $window.nx.widgets.tabs2.options = ["1", "2", "4", "8", "16", "32", "64"];
    $window.nx.widgets.tabs2.init();
    $window.nx.widgets.tabs2.on('*', function(data) {
      var msgOSC = '/composition/video/effect1/param1/speed';
      var val = faderSpeedArray[data.index]/10*4;
      socket.emit('messageOSC', msgOSC, val);
      console.log(msgOSC);
    });

    // basic fader
    $window.nx.add("slider", {parent:"controlsLine2"});
    $window.nx.widgets.slider1.on('*', function(data) {
      var msgOSC = '/composition/cross/values';
      var val = data.value;
      socket.emit('messageOSC', msgOSC, val);
      console.log(data);
    });

  }

  // listen for global messages (an example code stub for global messeging)
  $scope.$on('newSelectedColour', function (event, newColour) {


/*
    $window.nx.add("multislider", {parent:"mainDiv"});
    $window.nx.add("metroball", {parent:"mainDiv"});
    $window.nx.add("slider", {parent:"mainDiv"});
    $window.nx.add("slider", {parent:"mainDiv"});
    $window.nx.add("multitouch", {parent:"mainDiv"});
    $window.nx.add("colors", {parent:"mainDiv"});
    $window.nx.add("crossfade", {parent:"mainDiv"});
    $window.nx.add("dial", {parent:"mainDiv"});
    $window.nx.add("joints", {parent:"mainDiv"});
    $window.nx.add("mouse", {parent:"mainDiv"});
    $window.nx.add("number", {parent:"mainDiv"});
    $window.nx.add("position", {parent:"mainDiv"});
    $window.nx.add("number", {parent:"mainDiv"});
    $window.nx.add("range", {parent:"mainDiv"});
    $window.nx.add("select", {parent:"mainDiv"});
    $window.nx.add("tabs", {parent:"mainDiv"});
    $window.nx.add("toggle", {parent:"mainDiv"});

*/
  });

  // remove socket listeners when leaving page (called automatically)
  $scope.$on('$destroy', function (event) {
    socket.removeAllListeners();
  });

  // ---------------------------------------------------
  // listen for OSC socket messages from server
  socket.on('connect', function () {
  });

  socket.on("messageOSC", function (message) {
    console.log('OSC message received by client: ' + message);
  });


  // ---------------------------------------------------
  // listen for messages from view

  $scope.changeBrushType = function () {
    // sample
  };

}]);
