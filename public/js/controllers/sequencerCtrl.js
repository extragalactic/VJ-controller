// ----------------------------------------------------
// Clip Sequencer Controller
// ----------------------------------------------------
angular.module('myApp').controller('SequencerController', ['$scope', '$window', '$http', 'socket', 'appVars', 'sequencerManager', 'colorLibrary', 'assetLibrary', function ($scope, $window, $http, socket, appVars, sequencerManager, colorLibrary, assetLibrary) {
  "use strict";

  if(assetLibrary.checkAssetsLoaded()===false) {
    assetLibrary.loadAllAssets(function() {
      sequencerManager.initMatrixData(); // populate matrix once loaded
      initControls(); // build page
    });
  } else {
    initControls(); // build page
  }

  // ----------------------------------------------------
  function initControls () {

    var color = colorLibrary.getColor; // shortcut

    sequencerManager.createOptionMatrix (3, {accent: color('firstComp','light'), fill: color('second','medium')});
    sequencerManager.createOptionMatrix (2, {accent: color('firstComp','light'), fill: color('first','medium')});
    sequencerManager.createOptionMatrix (1, {accent: color('firstComp','light'), fill: color('third','medium')});

    sequencerManager.createStepMatrix (3, {accent: color('second','light'), fill: color('second','dark')});
    sequencerManager.createStepMatrix (2, {accent: color('first','light'), fill: color('first','dark')});
    sequencerManager.createStepMatrix (1, {accent: color('third','light'), fill: color('third','dark')});

    sequencerManager.createMatrixToggle(3);
    sequencerManager.createMatrixToggle(2);
    sequencerManager.createMatrixToggle(1);

    sequencerManager.createOnOffToggle();
    sequencerManager.createBPMControl();
    sequencerManager.createBPMMultiplierTabs();
    sequencerManager.createResyncButton();
    sequencerManager.createBankSelectorTabs();

    sequencerManager.refreshMatrixView();

    sequencerManager.refreshHiddenWidgets();
  }

  // remove socket listeners when leaving page (called automatically)
  $scope.$on('$destroy', function (event) {
    sequencerManager.cleanUpWidgets();
    socket.removeAllListeners();
  });

/*
ToDo:

GENERAL:
 - research the best practices for Angular variable naming, and fix up the project
 - the CSS is better but still needs some cleanup
 - must save/restore variable states when switching pages

FADER:
 - disable the manual fader when the automater is running
 - enable the Invert and Reverse buttons

SEQUENCER:
 - add a clip transition-velocity slider

*/

}]);
