// Manages the Sequencer widgets
angular.module('myApp').factory('sequencerManager', ['$window', 'socket', 'appVars', 'colorLibrary', 'assetLibrary', function ($window, socket, appVars, colorLibrary, assetLibrary) {
  "use strict";

  var matrixData = [];
  var color = colorLibrary.getColor; // shortcut
  var widgetList = []; // keep a list of widgets

  $window.nx.colorize(color('first','light'));
  $window.nx.colorize("border", color('grey','medium'));
  $window.nx.colorize("fill", color('first','dark'));
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
      {accent: color('third','light'), fill: color('third','dark')},
      {accent: color('first','light'), fill: color('first','dark')},
      {accent: color('second','light'), fill: color('second','dark')}
    ]
  };

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

  // Private methods ------------------------------------------------------------

  // check if the widget exists
  function checkPersistent(name) {
    for(var i=0; i<widgetList.length; i++) {
      if(name===widgetList[i].name) {
        return true;
      }
    }
    return false;
  }

  // Public methods ------------------------------------------------------------

  return {

    initMatrixData: function () {
      matrixData = assetLibrary.getMatrixData().matrixData;
    },

    // redraw the cells on the matrices based on the selected data bank
    // (...this is what Angular normally does)
    refreshMatrixView: function () {
      $window.nx.widgets.matrixLayer3.matrix = matrixData[selectedSequencerBank][0];
      $window.nx.widgets.matrixLayer3.init();
      $window.nx.widgets.matrixLayer2.matrix = matrixData[selectedSequencerBank][1];
      $window.nx.widgets.matrixLayer2.init();
      $window.nx.widgets.matrixLayer1.matrix = matrixData[selectedSequencerBank][2];
      $window.nx.widgets.matrixLayer1.init();

      console.log(JSON.stringify(matrixData[selectedSequencerBank]));
    },

    // delete all NexusUI widgets, unless they have been flagged as persistent, in which case move/hide the widget off-canvas
    cleanUpWidgets: function() {

      console.log('num widgets: ' + widgetList.length);

      var deleteList = [];
      var persistList = [];
      for(var i=0; i<widgetList.length; i++) {
        if(widgetList[i].persist===true) {
          persistList.push(widgetList[i].name);
        } else {
          deleteList.push(widgetList[i].name);
        }
      }
      for(var j=0; j<widgetList.length; j++) {
        var obj = widgetList[j];
        if(deleteList.indexOf(obj.name) !== -1) {
          widgetList[j].widget.destroy();
          widgetList.splice(j,1);
          j--;
        } else if(persistList.indexOf(obj.name) !== -1) {
          // somehow hide or move off-screen
        }
      }
      console.log('num widgets: ' + widgetList.length);

    },

    // sequencer on/off toggle button
    createOnOffToggle: function () {
      var name = "sequencerToggle";
      $window.nx.add("toggle", {name: name, parent:"rightControls"});
      widget = $window.nx.widgets.sequencerToggle;
      widget.colors = {accent: color('firstComp','light'), fill: color('offState','medium')};
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
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // BPM control widget
    createBPMControl: function () {
      var name = "sequencerBPM";
      $window.nx.add("number", {name: name, parent:"rightControls"});
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
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // BPM multiplier tabs
    createBPMMultiplierTabs: function () {
      var name = "tempoMultiplierTabs";
      $window.nx.add("tabs", {name: name, parent:"rightControls"});
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
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // re-sync sequencer button
    createResyncButton: function () {
      var name = "resyncButton";
      $window.nx.add("multitouch", {name: name, parent:"rightControls"});
      widget = $window.nx.widgets.resyncButton;
      widget.colors = {accent: color('firstComp','light'), fill: color('firstComp','dark')};
      widget.init();
      widget.on('*', function(data) {
        $window.nx.widgets.matrixLayer1.jumpToCol(0);
        $window.nx.widgets.matrixLayer2.jumpToCol(0);
        $window.nx.widgets.matrixLayer3.jumpToCol(0);
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // toggle each individual matrix (for FX, Layer1 & Layer2)
    createMatrixToggle: function (n) {
      // matrix on/off toggle button
      var name = "matrixToggle" + n;
      $window.nx.add("toggle", {name: name, parent:"matrixToggleControls"});
      widget = $window.nx.widgets[name];
      widget.colors = {accent: interfaceColors.matrixLayer[n-1].accent, fill: color('offState','medium'), border: color('grey','medium'), black: color('grey','medium'), white: color('grey','medium')};
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
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // create bank selector tabs
    createBankSelectorTabs: function () {
      var name = "bankSelectorTabs";
      $window.nx.add("tabs", {name: name, parent:"bottomControls"});
      widget = $window.nx.widgets.bankSelectorTabs;
      widget.options = ["1", "2", "3", "4", "5"];
      widget.init();
      widget.on('*', function(data) {
        selectedSequencerBank = data.index;
        refreshMatrixView();
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // create a 16x4 clip sequencer matrix
    createStepMatrix: function (sequencerNum, colors) {
      var name = "matrixLayer" + sequencerNum;
      if(checkPersistent(name)) {
        // widget already exists, so don't create it, but instead reveal it
      } else {
        $window.nx.add("matrix", {name: name, parent:"stepMatrix"});
        var widget = $window.nx.widgets[name];
        widget.col = 16;
        widget.row = 4;
        widget.colors = {accent: colors.accent, fill: colors.fill, border: color('firstComp','light')};
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
        widgetList.push({widget: widget, name: name, persist: true});
      }
    },

    // create a 1x3 clip bank matrix
    createOptionMatrix: function (sequencerNum, colors) {
      var name = "matrixOptions" + sequencerNum;
      $window.nx.add("matrix", {name: name, parent:"optionMatrix"});
      var widget = $window.nx.widgets[name];
      widget.col = 1;
      widget.row = 3;
      widget.matrix[0][0] = 1;
      widget.colors = {accent: colors.accent, fill: colors.fill, border: color('firstComp','light')};
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
      widgetList.push({widget: widget, name: name, persist: false});
    }
  };

}]);

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
