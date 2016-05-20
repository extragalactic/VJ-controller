// ----------------------------------------------------
// Clip Sequencer Controller
// ----------------------------------------------------

angular.module('myApp').controller('SequencerController', ['$scope', '$window', '$http', 'socket', 'appVars', 'AssetLibrary', function ($scope, $window, $http, socket, appVars, AssetLibrary) {
  "use strict";

  function initControls () {
    console.log('init sequencer');

    // set colors (.. migrate to a ColorPalette Service)
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

    // for greying out a disabled matrix...
    var colorDisabledDark = "#333333";

    $window.nx.colorize(firstColorLight);
    $window.nx.colorize("border", firstColorMediumComp);
    $window.nx.colorize("fill", firstColorDark);
    $window.nx.colorize("black", "#ffffff");

    var widget; // resuable widget var
    var bSequencerActive = false;
    var sequencerBPM = 180;
    var clipBankNum = [0,0,0]; // values: 0-2
    var tempoMultiplier = 1;

    /*
     The automation assumes the following Resolume layer structure:

     layer* - can add new layers here, above the rest
     layer4 - FX layer
     layer3 - content layer A
     layer2 - content layer B
     layer1 - background content layer (NOT automated)

     Having 2 automated clip layers + 1 automated FX layer + a background layer is exactly how many I require (any more becomes unweildly during performance).

     For the FX layer, the 4th clip in each set will always be an empty clip to allow disabling the effects while sequencing.
    */

    // create clip bank selection controls
    createOptionMatrix (3, {accent: firstColorLightComp, fill: secondColorMedium});
    createOptionMatrix (2, {accent: firstColorLightComp, fill: firstColorMedium});
    createOptionMatrix (1, {accent: firstColorLightComp, fill: thirdColorMedium});

    // create 3 step sequencer matrices (1 for FX, 2 for clips)
    createStepMatrix (3, {accent: secondColorLight, fill: secondColorDark});
    createStepMatrix (2, {accent: firstColorLight, fill: firstColorDark});
    createStepMatrix (1, {accent: thirdColorLight, fill: thirdColorDark});

    // sequencer on/off toggle button
    $window.nx.add("toggle", {name: "sequencerToggle", parent:"rightControls"});
    widget = $window.nx.widgets.sequencerToggle;
    widget.colors = {accent: firstColorLightComp, fill: "#440000"};
    widget.init();
    widget.on('*', function(data) {
      bSequencerActive = data.value ? true:false;
      if(!bSequencerActive) {
        // clear the FX layer when turning off
        var layerName = "layer4"; // this is the FX layer
        var msgOSC = '/' + layerName + '/clear';
        socket.emit('messageOSC', msgOSC, 1);
      }
    });
/*
    // BPM multiplier slider
    $window.nx.add("slider", {name: "tempoMultiplierSlider", parent:"rightControls"});
    widget = $window.nx.widgets.tempoMultiplierSlider;
    widget.val = 0;
    widget.init();
    widget.on('*', function(data) {
      var tempoMultiplier = 1 + (data.value * 3);
      $window.nx.widgets.matrixLayer1.sequence(sequencerBPM*tempoMultiplier);
      $window.nx.widgets.matrixLayer2.sequence(sequencerBPM*tempoMultiplier);
      $window.nx.widgets.matrixLayer3.sequence(sequencerBPM*tempoMultiplier);
    });
*/
    // BPM control widget
    $window.nx.add("number", {name: "sequencerBPM", parent:"rightControls"});
    widget = $window.nx.widgets.sequencerBPM;
    widget.min = 0;
    widget.max = 500;
    widget.set({ value: sequencerBPM });
    widget.init();
    widget.on('*', function(data) {
      sequencerBPM = data.value;
      $window.nx.widgets.matrixLayer1.sequence(sequencerBPM*tempoMultiplier);
      $window.nx.widgets.matrixLayer2.sequence(sequencerBPM*tempoMultiplier);
      $window.nx.widgets.matrixLayer3.sequence(sequencerBPM*tempoMultiplier);
    });

    // BPM multiplier tabs
    $window.nx.add("tabs", {name: "tempoMultiplierTabs", parent:"rightControls"});
    widget = $window.nx.widgets.tempoMultiplierTabs;
  //  widget.val = 0;
    widget.options = ["x1", "x2", "x4", "x8"];
    widget.init();
    widget.on('*', function(data) {
      console.log(data);
      var tempos = [1,2,4,8];
      tempoMultiplier = tempos[data.index];
      $window.nx.widgets.matrixLayer1.sequence(sequencerBPM*tempoMultiplier);
      $window.nx.widgets.matrixLayer2.sequence(sequencerBPM*tempoMultiplier);
      $window.nx.widgets.matrixLayer3.sequence(sequencerBPM*tempoMultiplier);
    });

    // re-sync sequencer button
    $window.nx.add("multitouch", {name: "resyncButton", parent:"rightControls"});
    widget = $window.nx.widgets.resyncButton;
    widget.colors = {accent: firstColorLightComp, fill: firstColorDarkComp};
    widget.init();
    widget.on('*', function(data) {
      $window.nx.widgets.matrixLayer1.jumpToCol(0);
      $window.nx.widgets.matrixLayer2.jumpToCol(0);
      $window.nx.widgets.matrixLayer3.jumpToCol(0);
    });

    // create bank selector tabs
    $window.nx.add("tabs", {name: "bankSelectorTabs", parent:"bottomControls"});
    widget = $window.nx.widgets.bankSelectorTabs;
    widget.options = ["1", "2", "3"];
    widget.init();
    widget.on('*', function(data) {
      console.log(data);
    });

    // create a 16x4 clip sequencer matrix
    function createStepMatrix (sequencerNum, colors) {
      var matrixName = "matrixLayer" + sequencerNum;
      $window.nx.add("matrix", {name: matrixName, parent:"stepMatrix"});
      var widget = $window.nx.widgets[matrixName];
      widget.col = 16;
      widget.row = 4;
      widget.colors = {accent: colors.accent, fill: colors.fill, border: firstColorLightComp};
      widget.sequence(sequencerBPM);
      widget.init();
      widget.on('*', function(data) {
        if(data.list !== undefined) {
          if(!bSequencerActive) return;
          var layerName = "layer" + (sequencerNum + 1);
          for(var i=0; i<data.list.length; i++){
              if(data.list[i]===1) {
                var clipNum = clipBankNum[3-sequencerNum]*4 + i + 1;
                var msgOSC = '/' + layerName + '/clip' + clipNum + '/connect';
                socket.emit('messageOSC', msgOSC, 1);
                break;
              }
          }
        } else {
          if(data.level===1) {
            // when a cell is turned on, turn off all other cells in the same vertical 4-cell group (behavior like a radio button)
            for(var j=0; j<4; j++) {
              if(data.row !== j) widget.setCell(data.col, j, 0);
            }
          }
        }
      });
    }

    // create a 1x3 clip bank matrix
    function createOptionMatrix (sequencerNum, colors) {
      var matrixName = "matrixOptions" + sequencerNum;
      $window.nx.add("matrix", {name: matrixName, parent:"optionMatrix"});
      var widget = $window.nx.widgets[matrixName];
      widget.col = 1;
      widget.row = 3;
      widget.matrix[0][0] = 1;
      widget.colors = {accent: colors.accent, fill: colors.fill, border: firstColorLightComp};
      widget.init();
      widget.on('*', function(data) {
        if(data.level===1) {
          // add radio button behavior
          for(var j=0; j<3; j++) {
            if(data.row !== j) widget.setCell(data.col, j, 0);
          }
          clipBankNum[3-sequencerNum] = data.row;
        }
      });
    }
  }

  // remove socket listeners when leaving page (called automatically)
  $scope.$on('$destroy', function (event) {
    socket.removeAllListeners();
  });

  initControls();

/*
ToDo:

GENERAL:
 - fix the broken page switching

FADER:
 - when the fader automater is running, it should also be animating the slider
 - the fader slider should be a horizontal slider, placed at the bottom beside the on/off button (then widen the multislider to fill the width)
 - need to initialize the multislider with start values
 - when selecting a new beat-style tab it should smoothly animate the sliders to their new positions (implement the Robert Penner easing equations)

SEQUENCER:
 - add enable/disable toggle buttons to turn on/off matrix layers
 - add a clip transition-velocity slider
 - make several matrix banks with pre-loaded automation patterns, and order the patterns left-to-right in order of ascending busy-ness (from chill to intense)


*/

}]);
