// ----------------------------------------------------
// Clip Sequencer Controller
// ----------------------------------------------------

// Note: This code needs to be seriously refactored and cleaned up...

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
    var colorGreyDark = "#111111";
    var colorGreyMedium = "#222222";
    var colorOffState = "#440000";

    $window.nx.colorize(firstColorLight);
    $window.nx.colorize("border", colorGreyMedium);
    $window.nx.colorize("accentborder", firstColorDarkComp);
    $window.nx.colorize("fill", firstColorDark);
    $window.nx.colorize("black", "#ffffff");

    var widget; // resuable widget var
    var bSequencerActive = false;
    var matrixActiveToggles = [true, true, true];
    var sequencerBPM = 180;
    var clipBankNum = [0,0,0]; // values: 0-2
    var tempoMultiplier = 1; // 1, 2, 4 etc.

    // initialize the step sequencer data storage
    var numSequencerBanks = 5;
    var selectedSequencerBank = 0;
    var matrixData;

    initMatrixData();

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
    var interfaceColors = {
      matrixLayer: [
        {accent: thirdColorLight, fill: thirdColorDark},
        {accent: firstColorLight, fill: firstColorDark},
        {accent: secondColorLight, fill: secondColorDark}
      ]
    };
    createStepMatrix (3, {accent: secondColorLight, fill: secondColorDark});
    createStepMatrix (2, {accent: firstColorLight, fill: firstColorDark});
    createStepMatrix (1, {accent: thirdColorLight, fill: thirdColorDark});

    createMatrixToggle(3);
    createMatrixToggle(2);
    createMatrixToggle(1);

    // sequencer on/off toggle button
    $window.nx.add("toggle", {name: "sequencerToggle", parent:"rightControls"});
    widget = $window.nx.widgets.sequencerToggle;
    widget.colors = {accent: firstColorLightComp, fill: colorOffState};
    widget.init();
    widget.on('*', function(data) {
      bSequencerActive = data.value ? true:false;
      if(!bSequencerActive) {
        // clear the FX layer when turning off
        var layerName = "layer4"; // this is the FX layer in Resolume
        var msgOSC = '/' + layerName + '/clear';
        socket.emit('messageOSC', msgOSC, 1);
      }
    });

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
    widget.options = ["x1", "x2", "x4", "x8"];
    widget.init();
    widget.on('*', function(data) {
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

    // toggle each individual matrix (for FX, Layer1 & Layer2)
    function createMatrixToggle(n) {
      // matrix on/off toggle button
      var buttonName = "matrixToggle" + n;
      $window.nx.add("toggle", {name: buttonName, parent:"matrixToggleControls"});
      widget = $window.nx.widgets[buttonName];
      widget.colors = {accent: interfaceColors.matrixLayer[n-1].accent, fill: colorOffState, border: colorGreyMedium, black: colorGreyMedium, white: colorGreyMedium};
      widget.set({value:1});
      widget.init();
      widget.on('*', function(data) {
        var bActive = data.value ? true:false;
        matrixActiveToggles[n-1] = bActive;
        /*
        var matrixName = "matrixLayer" + n;
        widget = $window.nx.widgets[matrixName];
        if(bActive) {
          widget.colors = {
            accent: interfaceColors.matrixLayer[n-1].accent,
            fill: interfaceColors.matrixLayer[n-1].fill
          };
        } else {
          widget.colors = {
            accent: firstColorLightComp,
            fill: colorGreyMedium
          };
        }
        widget.init();
        */
      });
    }


    // create bank selector tabs
    $window.nx.add("tabs", {name: "bankSelectorTabs", parent:"bottomControls"});
    widget = $window.nx.widgets.bankSelectorTabs;
    widget.options = ["1", "2", "3", "4", "5"];
    widget.init();
    widget.on('*', function(data) {
      selectedSequencerBank = data.index;
      refreshMatrixView();
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
        if(data.list !== undefined && matrixActiveToggles[sequencerNum-1]===true) {
          // handle the advance of the sequencer bar
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
          // handle a click on a cell
          if(data.level===1) {
            // when a cell is turned on, turn off all other cells in the same vertical 4-cell group (behavior like a radio button)
            matrixData[selectedSequencerBank][3-sequencerNum][data.col][data.row] = 1;
            for(var j=0; j<4; j++) {
              if(data.row !== j)  {
                widget.setCell(data.col, j, 0);
                matrixData[selectedSequencerBank][3-sequencerNum][data.col][j] = 0;
              }
            }
          } else if (data.level===0) {
            matrixData[selectedSequencerBank][3-sequencerNum][data.col][data.row] = 0;        }
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

    // redraw the cells on the matrices based on the selected data bank
    // (...this is what Angular normally does)
    function refreshMatrixView() {
      $window.nx.widgets.matrixLayer3.matrix = matrixData[selectedSequencerBank][0];
      $window.nx.widgets.matrixLayer3.init();
      $window.nx.widgets.matrixLayer2.matrix = matrixData[selectedSequencerBank][1];
      $window.nx.widgets.matrixLayer2.init();
      $window.nx.widgets.matrixLayer1.matrix = matrixData[selectedSequencerBank][2];
      $window.nx.widgets.matrixLayer1.init();

      console.log(JSON.stringify(matrixData[selectedSequencerBank]));
    }

    function initMatrixData() {
      matrixData = new Array(numSequencerBanks);
      for(var x=0; x < numSequencerBanks; x++) {
        matrixData[x] = new Array(3); // create a 3x16x4 matrix container
        for(var y=0; y<3; y++) {
          matrixData[x][y] = new Array(16); // create array of 16 cols
          for(var i=0; i<16; i++) {
            matrixData[x][y][i] = new Array(4); // create a single 4-cell col
            for(var j=0; j<4; j++) {
              matrixData[x][y][i][j] = 0;
            }
          }
        }
      }
      matrixData[0] = [[[0,0,0,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[1,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[0,0,0,0],[0,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,0,0,0],[0,0,0,0]]];

      matrixData[1] = [[[0,0,0,1],[0,0,0,0],[1,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,0,0,1],[0,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[1,0,0,0],[0,0,0,1],[0,0,0,0]],[[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,1,0],[0,1,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,1],[0,0,0,0],[0,0,1,0],[0,0,0,0],[1,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,0,1]],[[0,0,1,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,1,0,0],[0,0,0,0]]];

      matrixData[2] =
      [[[0,0,1,0],[0,0,0,0],[0,0,0,1],[0,0,0,0],[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,1,0],[1,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,0]],[[0,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,1,0],[1,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[0,0,0,0],[0,0,1,0],[0,0,0,0],[1,0,0,0],[0,1,0,0],[1,0,0,0],[0,0,0,0],[0,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1],[0,0,0,0],[0,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,0,0]]];

      matrixData[3] =
      [[[0,0,0,1],[0,1,0,0],[1,0,0,0],[0,0,0,0],[0,0,0,1],[0,0,0,0],[1,0,0,0],[0,0,1,0],[0,0,0,0],[0,1,0,0],[0,0,0,0],[1,0,0,0],[0,0,0,1],[0,0,0,0],[0,0,0,0],[1,0,0,0]],[[0,0,0,0],[0,0,1,0],[1,0,0,0],[0,0,0,0],[0,0,0,1],[0,0,1,0],[0,1,0,0],[0,0,0,0],[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1],[0,1,0,0],[0,0,1,0],[1,0,0,0],[0,0,1,0]],[[1,0,0,0],[0,0,0,0],[0,1,0,0],[1,0,0,0],[0,0,1,0],[0,0,0,0],[0,1,0,0],[1,0,0,0],[0,0,0,1],[0,0,0,0],[0,0,1,0],[0,1,0,0],[0,0,0,1],[0,1,0,0],[0,0,1,0],[0,0,0,0]]];

      matrixData[4] = [[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]];

    }

    refreshMatrixView();

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
 - research the best practices for Angular variable naming, and fix up the project

FADER:
 - disable the manual fader when the automater is running
 - add in Invert and Reverse buttons, place them where the fader currently is, then move the fader to the bottom horizontally
 - When the fader automater is running, it should also be animating the slider (Note: requires bi-directional OSC from Resolume... which is a separate issue)

SEQUENCER:
 - add a clip transition-velocity slider
 - improve layout of matrix layer enable/disable toggle buttons

*/

}]);
