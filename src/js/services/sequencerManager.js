// ------------------------------------------------------------
// Manages the Sequencer widgets
angular.module('myApp').factory('sequencerManager', ['$window', 'socket', 'appVars', 'colorLibrary', 'assetLibrary', function ($window, socket, appVars, colorLibrary, assetLibrary) {
  "use strict";

  var matrixData = [];
  var color = colorLibrary.getColor; // shortcut variable to colors
  var widgetList = []; // keep a list of widgets
  var deleteList = []; // widgets that get deleted with switching pages
  var persistList = []; // widgets that are kept in a hidden DIV

  var widget; // resuable widget var
  var bSequencerActive = false;
  var matrixActiveToggles = [true, true, true];
  var sequencerBPM = 72; 
  var clipBankNum = [0,0,0]; // values: 0-2
  var tempoMultiplier = 1; // 1, 2, 4 etc.

  //var numSequencerBanks = 6;
  var selectedSequencerBank = 0;

  // set order of colors for the 3 matrices
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

  // check if a NexusUI widget exists
  function checkPersistent(name) {
    for(var i=0; i<widgetList.length; i++) {
      if(name===widgetList[i].name) {
        return true;
      }
    }
    return false;
  }

  // redraw the matrix with the array data
  function refreshMatrixView() {
    $window.nx.widgets.nexMatrixLayer3.matrix = matrixData[selectedSequencerBank][0];
    $window.nx.widgets.nexMatrixLayer3.init();
    $window.nx.widgets.nexMatrixLayer2.matrix = matrixData[selectedSequencerBank][1];
    $window.nx.widgets.nexMatrixLayer2.init();
    $window.nx.widgets.nexMatrixLayer1.matrix = matrixData[selectedSequencerBank][2];
    $window.nx.widgets.nexMatrixLayer1.init();

    console.log(JSON.stringify(matrixData[selectedSequencerBank]));
  }

  // Public methods ------------------------------------------------------------

  return {

    // load the step matrices with values loaded from the assetLibrary
    initMatrixData: function () {
      matrixData = assetLibrary.getMatrixData().matrixData;
    },

    // use jQuery to swap out the matrix div if there are hidden persistent widgets
    refreshHiddenWidgets: function() {
      console.log('num persistent seq widgets: ' + persistList.length);

      if(persistList.length>0) {
        // swap in the matrices in hidden storage, then change name back to stepMatrix
        $('#stepMatrix').swap('#stepMatrixHidden');
        $('#stepMatrix').attr('id', 'hiddenStorage');
        $('#stepMatrixHidden').attr('id', 'stepMatrix');
      }
    },

    // redraw the cells on the matrices based on the selected data bank
    // (...this is what Angular normally does)
    refreshMatrixView: function () {
      refreshMatrixView(); // call private function
    },

    // delete all NexusUI widgets, unless they have been flagged as persistent, in which case move the widget into the footer and make it invisible (so that it still runs)
    cleanUpWidgets: function() {
      console.log('num seq widgets pre-cleanup: ' + widgetList.length);
      var obj;
      for(var i=0; i<widgetList.length; i++) {
        obj = widgetList[i];
        if(obj.persist===true && persistList.indexOf(obj.name) === -1) {
          persistList.push(obj.name);
        } else if (obj.persist===false) {
          deleteList.push(obj.name);
        }
      }
      for(var j=0; j<widgetList.length; j++) {
        obj = widgetList[j];
        if(deleteList.indexOf(obj.name) !== -1) {
          obj.widget.destroy();
          widgetList.splice(j,1);
          j--;
        } else if(persistList.indexOf(obj.name) !== -1) {
          // hide widget and move into the footer for storage
          document.getElementById(obj.name).style.visibility = "hidden";
        }
      }
      console.log('num seq widgets post-cleanup: ' + widgetList.length);

      // swap out the matrices into hidden storage, then rename it
      $('#stepMatrix').swap('#hiddenStorage');
      $('#stepMatrix').attr('id', 'stepMatrixHidden');
    },

    // sequencer on/off toggle button
    createOnOffToggle: function () {
      var name = "nexSequencerToggle";
      $window.nx.add("toggle", {name: name, parent:"OnOffToggle-widget"});
      widget = $window.nx.widgets[name];
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
      var name = "nexSequencerBPM";
      $window.nx.add("number", {name: name, parent:"BPMControl-widget"});
      widget = $window.nx.widgets[name];
      widget.min = 0;
      widget.max = 500;
      widget.set({ value: sequencerBPM });
      widget.init();
      widget.on('*', function(data) {
        sequencerBPM = data.value;
        $window.nx.widgets.nexMatrixLayer1.sequence(sequencerBPM*tempoMultiplier);
        $window.nx.widgets.nexMatrixLayer2.sequence(sequencerBPM*tempoMultiplier);
        $window.nx.widgets.nexMatrixLayer3.sequence(sequencerBPM*tempoMultiplier);
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // BPM multiplier tabs
    createBPMMultiplierTabs: function () {
      var name ="nexTempoMultiplierTabs";
      $window.nx.add("tabs", {name: name, parent:"BPMMultiplierTabs-widget"});
      widget = $window.nx.widgets[name];
      widget.options = ["x1", "x2", "x4", "x8"];
      widget.init();
      widget.on('*', function(data) {
        var tempos = [1,2,4,8];
        tempoMultiplier = tempos[data.index];
        $window.nx.widgets.nexMatrixLayer1.sequence(sequencerBPM*tempoMultiplier);
        $window.nx.widgets.nexMatrixLayer2.sequence(sequencerBPM*tempoMultiplier);
        $window.nx.widgets.nexMatrixLayer3.sequence(sequencerBPM*tempoMultiplier);
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // re-sync sequencer button
    createResyncButton: function () {
      var name = "nexResyncButton";
      $window.nx.add("multitouch", {name: name, parent:"ResyncButton-widget"});
      widget = $window.nx.widgets[name];
      widget.colors = {accent: color('firstComp','light'), fill: color('firstComp','dark')};
      widget.init();
      widget.on('*', function(data) {
        $window.nx.widgets.nexMatrixLayer1.jumpToCol(0);
        $window.nx.widgets.nexMatrixLayer2.jumpToCol(0);
        $window.nx.widgets.nexMatrixLayer3.jumpToCol(0);
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // toggle each individual matrix (for FX, Layer1 & Layer2)
    createMatrixToggle: function (n) {
      // matrix on/off toggle button
      var name = "nexMatrixToggle" + n;
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
      var name = "nexBankSelectorTabs";
      $window.nx.add("tabs", {name: name, parent:"BankSelector-widget"});
      widget = $window.nx.widgets[name];
      widget.options = ["1", "2", "3", "4", "5", "6"];
      widget.init();
      widget.on('*', function(data) {
        selectedSequencerBank = data.index;
        refreshMatrixView();
      });
      widgetList.push({widget: widget, name: name, persist: false});
    },

    // create a 16x4 clip sequencer matrix
    createStepMatrix: function (sequencerNum, colors) {
      var name = "nexMatrixLayer" + sequencerNum;
      if(checkPersistent(name)) {
        // widget already exists, so don't create it, but instead reveal it
        document.getElementById(name).style.visibility = "visible";
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
      var name = "nexMatrixOptions" + sequencerNum;
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
// an example of interating over a multi-dimensional array

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
