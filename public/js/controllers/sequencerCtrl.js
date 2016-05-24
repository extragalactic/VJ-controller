// ----------------------------------------------------
// Clip Sequencer Controller
// ----------------------------------------------------
angular.module('myApp').controller('SequencerController', ['$scope', '$window', '$http', 'socket', 'appVars', 'ColorLibrary', 'AssetLibrary', function ($scope, $window, $http, socket, appVars, ColorLibrary, AssetLibrary) {
  "use strict";

  var matrixData = [];

  AssetLibrary.loadAllAssets(function() {
    // start the page after all assets have been loaded
    matrixData = AssetLibrary.getMatrixData().matrixData;
    initControls();
  });


  function initControls () {
    console.log('init sequencer');
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

    $window.nx.colorize(ColorLibrary.getColor('first','light'));
    $window.nx.colorize("border", ColorLibrary.getColor('grey','medium'));
    $window.nx.colorize("fill", ColorLibrary.getColor('first','dark'));
    $window.nx.colorize("black", "#ffffff");

    var widget; // resuable widget var
    var bSequencerActive = false;
    var matrixActiveToggles = [true, true, true];
    var sequencerBPM = 180;
    var clipBankNum = [0,0,0]; // values: 0-2
    var tempoMultiplier = 1; // 1, 2, 4 etc.

    var numSequencerBanks = 5;
    var selectedSequencerBank = 0;

    // set order of matrix colors
    var interfaceColors = {
      matrixLayer: [
        {accent: ColorLibrary.getColor('third','light'), fill: ColorLibrary.getColor('third','dark')},
        {accent: ColorLibrary.getColor('first','light'), fill: ColorLibrary.getColor('first','dark')},
        {accent: ColorLibrary.getColor('second','light'), fill: ColorLibrary.getColor('second','dark')}
      ]
    };

    // ------------------------------------------------------------------
    // sequencer on/off toggle button
    function createOnOffToggle() {
      $window.nx.add("toggle", {name: "sequencerToggle", parent:"rightControls"});
      widget = $window.nx.widgets.sequencerToggle;
      widget.colors = {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('offState','medium')};
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
    }

    // BPM control widget
    function createBPMControl() {
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
    }

    // BPM multiplier tabs
    function createBPMMultiplierTabs() {
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
    }

    // re-sync sequencer button
    function createResyncButton() {
      $window.nx.add("multitouch", {name: "resyncButton", parent:"rightControls"});
      widget = $window.nx.widgets.resyncButton;
      widget.colors = {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('firstComp','dark')};
      widget.init();
      widget.on('*', function(data) {
        $window.nx.widgets.matrixLayer1.jumpToCol(0);
        $window.nx.widgets.matrixLayer2.jumpToCol(0);
        $window.nx.widgets.matrixLayer3.jumpToCol(0);
      });
    }

    // toggle each individual matrix (for FX, Layer1 & Layer2)
    function createMatrixToggle(n) {
      // matrix on/off toggle button
      var buttonName = "matrixToggle" + n;
      $window.nx.add("toggle", {name: buttonName, parent:"matrixToggleControls"});
      widget = $window.nx.widgets[buttonName];
      widget.colors = {accent: interfaceColors.matrixLayer[n-1].accent, fill: ColorLibrary.getColor('offState','medium'), border: ColorLibrary.getColor('grey','medium'), black: ColorLibrary.getColor('grey','medium'), white: ColorLibrary.getColor('grey','medium')};
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
    function createBankSelectorTabs() {
      $window.nx.add("tabs", {name: "bankSelectorTabs", parent:"bottomControls"});
      widget = $window.nx.widgets.bankSelectorTabs;
      widget.options = ["1", "2", "3", "4", "5"];
      widget.init();
      widget.on('*', function(data) {
        selectedSequencerBank = data.index;
        refreshMatrixView();
      });
    }

    // create a 16x4 clip sequencer matrix
    function createStepMatrix (sequencerNum, colors) {
      var matrixName = "matrixLayer" + sequencerNum;
      $window.nx.add("matrix", {name: matrixName, parent:"stepMatrix"});
      var widget = $window.nx.widgets[matrixName];
      widget.col = 16;
      widget.row = 4;
      widget.colors = {accent: colors.accent, fill: colors.fill, border: ColorLibrary.getColor('firstComp','light')};
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
      widget.colors = {accent: colors.accent, fill: colors.fill, border: ColorLibrary.getColor('firstComp','light')};
      widget.init();
      widget.on('*', function(data) {
        if(data.level===1) {
          // add radio button behavior
          for(var j=0; j<3; j++) {
            if(data.row !== j) widget.setCell(data.col, j, 0);
          }
          clipBankNum[3-sequencerNum] = data.row;
        } else {
          /*
          var isEmpty=true;
          console.log(JSON.stringify(widget.matrix));
          for(var i=0; i < widget.matrix[0].length; i++) {
            if(widget.matrix[0][i] == 1) {
              isEmpty = false;
            //  break;
            }
            if(isEmpty===true) {
              console.log('reset cell');
              widget.matrix[0][data.row] = 1;
            }
          }
          */
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

    /*
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
    }
    */
    // ------------------------------------------------------------------

    createOptionMatrix (3, {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('second','medium')});
    createOptionMatrix (2, {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('first','medium')});
    createOptionMatrix (1, {accent: ColorLibrary.getColor('firstComp','light'), fill: ColorLibrary.getColor('third','medium')});

    createStepMatrix (3, {accent: ColorLibrary.getColor('second','light'), fill: ColorLibrary.getColor('second','dark')});
    createStepMatrix (2, {accent: ColorLibrary.getColor('first','light'), fill: ColorLibrary.getColor('first','dark')});
    createStepMatrix (1, {accent: ColorLibrary.getColor('third','light'), fill: ColorLibrary.getColor('third','dark')});

    createMatrixToggle(3);
    createMatrixToggle(2);
    createMatrixToggle(1);

    createOnOffToggle();
    createBPMControl();
    createBPMMultiplierTabs();
    createResyncButton();
    createBankSelectorTabs();

    refreshMatrixView();

  }

  // remove socket listeners when leaving page (called automatically)
  $scope.$on('$destroy', function (event) {
    socket.removeAllListeners();
  });

/*
ToDo:

GENERAL:
 - fix the broken page switching
 - research the best practices for Angular variable naming, and fix up the project

FADER:
 - disable the manual fader when the automater is running
 - add in Invert and Reverse buttons, place them where the fader currently is, then move the fader to the bottom horizontally

SEQUENCER:
 - add a clip transition-velocity slider

*/

}]);
