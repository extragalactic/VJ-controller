// Manages the Fader Automation widgets
angular.module('myApp').factory('faderManager', ['$window', 'socket', 'appVars', 'colorLibrary', function ($window, socket, appVars, colorLibrary) {
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

  var color = colorLibrary.getColor; // shortcut

  $window.nx.colorize(color('first','light'));
  $window.nx.colorize("border", color('grey','medium'));
  $window.nx.colorize("fill", color('first','dark'));
  $window.nx.colorize("black", "#ffffff");
  /*
  $window.nx.colorize(color('first','light'));
  $window.nx.colorize("border", color('firstComp','medium'));
  $window.nx.colorize("fill", color('first','dark'));
  $window.nx.colorize("black", "#ffffff");
*/
  var widget;
  var widgetList = []; // keep a list of widgets
  var selectedStylePreset = 0;
  var sliderAnimationCount = 0;  // need to monitor this to prevent the microsliders from also animating to a new position when selecting a new preset


  // Private methods -----------------------------------------------------------

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
        // question: do i need to manually remove these listeners?
    }

    function handleChange(event) {
      var yPos = event.target.target.y;
      var index = event.target.target.i;
      var name = 'nexStyleModSliders';
      $window.nx.widgets[name].setSliderValue(index, yPos);
    }
    function handleComplete() {
      sliderAnimationCount--;
    }
  }

  function onClickTempoTab (data) {
    var msgOSC = '/composition/video/effect1/param1/linkmultiplier';
    var val = faderSpeedArray[data.index];
    socket.emit('messageOSC', msgOSC, val);
  }

  // Public methods ------------------------------------------------------------

  return {

    // remove all widgets on page (currently no persistent widgets on the fader page)
    cleanUpWidgets: function() {
      //console.log('num fader widgets: ' + widgetList.length);
      for(var i=0; i<widgetList.length; i++) {
          widgetList[i].widget.destroy();
      }
      widgetList.length=0;
    },

    // on/off toggle button
    createOnOffToggle: function () {
      var name = "nexFaderToggle";
      $window.nx.add("toggle", {name: name, parent:"baseFaderControls"});
      widget = $window.nx.widgets[name];
      widget.colors = {accent: color('firstComp','light'), fill: color('offState','medium')};
      widget.init();

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
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // basic fader
    createMasterFader: function () {
      var name = "nexFaderSlider";
      $window.nx.add("slider", {name: name, parent:"baseFaderControls"});
      widget = $window.nx.widgets[name];
      //widget.sliders = 1;
      widget.on('*', function(data) {
        var msgOSC = '/composition/cross/values';
        var val = data.value;
        socket.emit('messageOSC', msgOSC, val);
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // layer opacity faders
    createLayerOpacitySlider: function (n) {
        var name = "nexLayerSlider" + n;
        $window.nx.add("slider", {name: name, parent:"baseFaderControls"});
        widget = $window.nx.widgets[name];
        widget.on('*', function(data) {
          var msgOSC = '/layer' + n + '/video/opacity/values';
          //var val = data.value;
          //socket.emit('messageOSC', msgOSC, val);
        });
        widgetList.push({widget: widget, name: name, persist: false});
    },

    // microslider array
    createMicroSliders: function () {
      for(var i=0; i<faderStylePresets.length; i++) {
        var name = "nexMicroslider"+(i+1);
        $window.nx.add("multislider", {name: name, parent:"presetMicrosliders"});
        widget = $window.nx.widgets[name];
        widget.sliders = faderStylePresets.length;
        widget.colors = {fill: color('third','dark'), accent: color('third','medium')};
        widget.init();
        for(var j=0; j<faderStylePresets[i].length; j++) {
          widget.setSliderValue(j, faderStylePresets[i][j]);
        }
        var id = $window.document.getElementById(name);
        id.className = "microsliders";
        //widget.on('*', microSliderClickHandler(data));
        //widget.click = microSliderClickHandler2();
        widgetList.push({widget: widget, name: name, persist: false});
      }
    },

    // beat style preset buttons
    createStylePresets: function () {
      var name = "nexBeatStyleTabs";
      $window.nx.add("tabs", {name: name, parent:"presetTabs"});
      widget = $window.nx.widgets[name];
      widget.options = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
      widget.init();
      widget.on('*', function(data) {
        onClickPresetTab(data);
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    //
    initSliderPresetSelection: function (presetNum) {
      onClickPresetTab({index: presetNum});
    },

    // style modification sliders
    createStyleModSliders: function () {
      var name = "nexStyleModSliders";
      $window.nx.add("multislider", {name: name, parent:"middleFaderControls"});
      widget = $window.nx.widgets[name];
      widget.sliders = numSteps;
      widget.init();
      widget.on('*', function(data) {
        var index = parseInt(Object.keys(data)[0]);
        if(index >= 0 && index < numSteps) {
          var val = data[index];
          if(sliderAnimationCount===0) {
            var microsliderName = "nexMicroslider"+(selectedStylePreset+1);
            $window.nx.widgets[microsliderName].setSliderValue(index, val);
          }
          faderStylePresets[selectedStylePreset][index] = val;
          var msgOSC = '/composition/video/effect1/param' + (index+3) + '/values';
          socket.emit('messageOSC', msgOSC, val);
        }
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // pattern invert and reverse buttons
    createInvertReverseButtons: function () {
      var name = "nexInvertToggle";
      $window.nx.add("toggle", {name: name, parent:"middleFaderControls"});
      widget = $window.nx.widgets[name];
      widget.colors = {accent: color('firstComp','light'), fill: color('offState','medium')};
      widget.init();
      widget.on('*', function(data) {
          // invert slider values
      });
      widgetList.push({widget: widget, name: name, persist: false});

      name = "nexReverseToggle";
      $window.nx.add("toggle", {name: name, parent:"middleFaderControls"});
      widget = $window.nx.widgets[name];
      widget.colors = {accent: color('firstComp','light'), fill: color('offState','medium')};
      widget.init();
      widget.on('*', function(data) {
          // reverse slider values
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // tempo buttons
    createTempoButtons: function () {
      var name = "nexTempoTabs";
      $window.nx.add("tabs", {name: name, parent:"tempoTabs"});
      widget = $window.nx.widgets[name];
      widget.options = ["x1", "x2", "x4", "x8", "x16", "x32", "x64"];
      widget.colors = {accent: color('second','medium'), fill: color('second','dark'), white: "#ffffff", black: "#ffffff"};
      //widget.set({index: 2});
      widget.init();
      widget.on('*', function(data) {
        onClickTempoTab(data);
      });
      widgetList.push({widget: widget, name: name, persist: false});
    }

  };

}]);


//});

/*
function microSliderClickHandler(data) {
  return function () {
    console.log(data);
  };
}
function microSliderClickHandler2() {
  //console.log(data);
}
*/

/*
// other NexusUI widgets I haven't tried yet

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

// init the tempo with the x4 tempo ... hmmm, not working
//$window.nx.widgets.tempoTabs.set({index: 2});
//onClickTempoTab({index: 2});
//$window.nx.widgets.tempoTabs.init();
