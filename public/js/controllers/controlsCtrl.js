// ----------------------------------------------------
// Fader Controls Controller
//  ...this controller controls the controls on my controller :)
// ----------------------------------------------------

// Fader Controls Controller
angular.module('myApp').controller('ControlsController', ['$scope', '$window', '$http', 'socket', 'appVars', 'ColorLibrary', 'AssetLibrary', function ($scope, $window, $http, socket, appVars, ColorLibrary, AssetLibrary) {
  "use strict";

  var faderSpeedArray = [0.0001220, 0.0002441, 0.0007324, 0.001706, 0.003656, 0.0007556, 0.015356];

  var faderStylePresets = [
    [0.0001, 0.0001, 1.0001, 1.0001, 0.0001, 0.0001, 1.0001, 1.0001, 0.0001],
    [0.0001, 0.2, 0.4, 0.7, 1.0001, 0.7, 0.4, 0.2, 0.0001],
    [0.0001, 0.25, 0.0001, 0.25, 0.75, 1.0001, 0.75, 1.0001, 0.0001],
    [0.5, 0.5, 1.0001, 0.5, 0.5, 0.5, 0.0001, 0.5, 0.5],
    [0.0001, 0.0001, 0.0001, 0.0001, 1.0001, 0.0001, 1.0001, 0.0001, 0.0001],
    [1.0001, 0.0001, 1.0001, 0.0001, 1.0001, 0.0001, 1.0001, 0.0001, 1.0001],
    [1.0001, 0.0001, 0.4, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 1.0001],
    [0.0001, 0.5, 0.8, 0.2, 1.0001, 0.3, 0.85, 0.3, 0.0001],
    [0.0001, 0.0001, 1.0001, 1.0001, 0.0001, 0.0001, 1.0001, 1.0001, 0.0001]
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

  function microSliderClickHandler(data) {
    return function () {
      console.log(data);
    };
  }
  function microSliderClickHandler2() {
    //console.log(data);
  }

  function initControls () {
    console.log('init controls');

    $window.nx.colorize(ColorLibrary.getColor('first','light'));
    $window.nx.colorize("border", ColorLibrary.getColor('firstComp','medium'));
    $window.nx.colorize("fill", ColorLibrary.getColor('first','dark'));
    $window.nx.colorize("black", "#ffffff");

    var widget;
    var selectedStylePreset = 0;
    var sliderAnimationCount = 0; // need to monitor this to prevent the microsliders from also animating to a new position when selecting a new preset

    // on/off toggle button
    $window.nx.add("toggle", {name: "faderToggle", parent:"controlOnOff1"});
    widget = $window.nx.widgets.faderToggle;
    widget.colors = {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('offState','medium')};
    widget.init();

    // basic fader
    $window.nx.add("slider", {name: "faderSlider", parent:"controlOnOff1"});
    widget = $window.nx.widgets.faderSlider;
    //widget.sliders = 1;
    widget.on('*', function(data) {
      var msgOSC = '/composition/cross/values';
      //var val = data.value;
      socket.emit('messageOSC', msgOSC, val);
    });

    // layer opacity faders
    /*
    function createLayerOpacitySlider(n) {
        var widgetName = "layerSlider" + n;
        $window.nx.add("slider", {name: widgetName, parent:"controlOnOff1"});
        widget = $window.nx.widgets[widgetName];
        widget.on('*', function(data) {
          var msgOSC = '/layer' + n + '/video/opacity/values';
          //var val = data.value;
          //socket.emit('messageOSC', msgOSC, val);
        });
    }
    createLayerOpacitySlider(4);
    createLayerOpacitySlider(3);
    createLayerOpacitySlider(2);
    createLayerOpacitySlider(1);
    */

    widget.on('*', function(data) {
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

    // microslider array
    for(var i=0; i<faderStylePresets.length; i++) {
      var sliderName = "microslider"+(i+1);
      $window.nx.add("multislider", {name: sliderName, parent:"controlsLine0"});
      widget = $window.nx.widgets[sliderName];
      widget.sliders = faderStylePresets.length;
      widget.colors = {fill: ColorLibrary.getColor('third','dark'), accent: ColorLibrary.getColor('third','medium')};
      widget.init();
      for(var j=0; j<faderStylePresets[i].length; j++) {
        widget.setSliderValue(j, faderStylePresets[i][j]);
      }
      var id = $window.document.getElementById(sliderName);
      id.className = "microsliders";
      //widget.on('*', microSliderClickHandler(data));
      widget.click = microSliderClickHandler2();
    }

    // beat style preset buttons
    $window.nx.add("tabs", {name: "beatStyleTabs", parent:"controlTabs1"});
    widget = $window.nx.widgets.beatStyleTabs;
    widget.options = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    widget.init();
    widget.on('*', function(data) {
      onClickPresetTab(data);
    });

    function onClickPresetTab(data) {
      var oldSelectedStylePreset = selectedStylePreset;
      selectedStylePreset = data.index;
      for(var i=0; i<numSteps; i++) {
        var msgOSC = '/composition/video/effect1/param' + (i+3) + '/values';
        var newVal = faderStylePresets[data.index][i];
        socket.emit('messageOSC', msgOSC, newVal);

        // get current slider position and save in the animation object
        var oldPos = faderStylePresets[oldSelectedStylePreset][i];
        var newPos = faderStylePresets[selectedStylePreset][i];
        var movingSliderPos = {y: oldPos, i: i};
        sliderAnimationCount++;

        // create a tweening object to animate the slider position
        var tween = createjs.Tween
          .get(movingSliderPos, {override: true})
          .to({y: newPos}, 250, createjs.Ease.easeInCubic)
          .call(handleComplete)
          .addEventListener("change", handleChange);
      }

      function handleChange(event) {
        var yPos = event.target.target.y;
        var index = event.target.target.i;
        $window.nx.widgets.styleModSliders.setSliderValue(index, yPos);
      }
      function handleComplete() {
        sliderAnimationCount--;
      }
    }

    // style modification sliders
    $window.nx.add("multislider", {name: "styleModSliders", parent:"controlsLine2"});
    widget = $window.nx.widgets.styleModSliders;
    widget.sliders = numSteps;
    widget.init();
    widget.on('*', function(data) {
      var index = parseInt(Object.keys(data)[0]);
      if(index >= 0 && index < numSteps) {
        var val = data[index];
        if(sliderAnimationCount===0) {
          var microsliderName = "microslider"+(selectedStylePreset+1);
          $window.nx.widgets[microsliderName].setSliderValue(index, val);
        }
        faderStylePresets[selectedStylePreset][index] = val;
        var msgOSC = '/composition/video/effect1/param' + (index+3) + '/values';
        socket.emit('messageOSC', msgOSC, val);
      }
    });

    // pattern invert and reverse buttons
    $window.nx.add("toggle", {name: "invertToggle", parent:"controlsLine2"});
    widget = $window.nx.widgets.invertToggle;
    widget.colors = {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('offState','medium')};
    widget.init();
    widget.on('*', function(data) {
        // invert slider values
    });

    $window.nx.add("toggle", {name: "reverseToggle", parent:"controlsLine2"});
    widget = $window.nx.widgets.reverseToggle;
    widget.colors = {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('offState','medium')};
    widget.init();
    widget.on('*', function(data) {
        // reverse slider values
    });

    // tempo buttons
    $window.nx.add("tabs", {name: "tempoTabs", parent:"controlTabs2"});
    widget = $window.nx.widgets.tempoTabs;
    widget.options = ["x1", "x2", "x4", "x8", "x16", "x32", "x64"];
    widget.colors = {accent: ColorLibrary.getColor('second','medium'), fill: ColorLibrary.getColor('second','dark'), white: "#ffffff", black: "#ffffff"};
    //widget.set({index: 2});
    widget.init();
    widget.on('*', function(data) {
      onClickTempoTab(data);
    });

    function onClickTempoTab (data) {
      var msgOSC = '/composition/video/effect1/param1/linkmultiplier';
      var val = faderSpeedArray[data.index];
      socket.emit('messageOSC', msgOSC, val);
    }


    /*
    // other NexusUI widgets I haven't used yet

    $window.nx.add("metroball", {parent:"mainDiv"});
    $window.nx.add("multitouch", {parent:"mainDiv"});
    $window.nx.add("colors", {parent:"mainDiv"});
    $window.nx.add("crossfade", {parent:"mainDiv"});
    $window.nx.add("dial", {parent:"mainDiv"});
    $window.nx.add("joints", {parent:"mainDiv"});
    $window.nx.add("mouse", {parent:"mainDiv"});
    $window.nx.add("position", {parent:"mainDiv"});
    $window.nx.add("range", {parent:"mainDiv"});
    $window.nx.add("select", {parent:"mainDiv"});
    */

    // init the multislider with the first preset
    onClickPresetTab({index: 0});

    // init the tempo with the x4 tempo ... hmmm, not working
    //$window.nx.widgets.tempoTabs.set({index: 2});
    //onClickTempoTab({index: 2});
    //$window.nx.widgets.tempoTabs.init();

  }

  // remove socket listeners when leaving page (called automatically)
  $scope.$on('$destroy', function (event) {
    socket.removeAllListeners();
  });

  // ---------------------------------------------------
  // listen for OSC socket messages from server
  socket.on("messageOSC", function (message) {
    console.log('OSC message received by client: ' + message);
  });

  // listen for global messages (an example code stub for global messeging)
  $scope.$on('newSelectedColour', function (event, newColour) {
    // sample
  });

  // ---------------------------------------------------
  // listen for messages from view

  $scope.changeBrushType = function () {
    // sample
  };

}]);
