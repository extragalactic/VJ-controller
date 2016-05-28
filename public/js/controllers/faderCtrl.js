// ----------------------------------------------------
// Fader Controller
// ----------------------------------------------------

// Fader Controller
angular.module('myApp').controller('FaderController', ['$scope', '$window', '$http', 'socket', 'appVars', 'faderManager', 'colorLibrary', function ($scope, $window, $http, socket, appVars, faderManager, colorLibrary) {
  "use strict";

  // the onloaded flag for NexusUI is globally set in the index.html file
  var NexusUITimeout = setTimeout(waitNexusUILoaded, 40);

  function waitNexusUILoaded() {
    if(isNexusUILoaded === true) {
      initControls();
      clearTimeout(NexusUITimeout);
    }
  }

  function initControls () {
    console.log('init fader widgets');

    faderManager.createOnOffToggle();
    faderManager.createMasterFader();
    faderManager.createMicroSliders();
    faderManager.createStylePresets();
    faderManager.createStyleModSliders();
    faderManager.createInvertReverseButtons();
    faderManager.createTempoButtons();
    faderManager.createLayerOpacitySlider(4);
    faderManager.createLayerOpacitySlider(3);
    faderManager.createLayerOpacitySlider(2);
    faderManager.createLayerOpacitySlider(1);

    // init the multislider with the first preset
    faderManager.initSliderPresetSelection(0);

  }

  // remove socket listeners when leaving page (called automatically)
  $scope.$on('$destroy', function (event) {
    faderManager.cleanUpWidgets();
    socket.removeAllListeners();
  });


  // listen for global messages
  $scope.$on('newSelectedColour', function (event, newColour) {
    // an example of how to listen for global messages for communication between controllers
  });

  // ---------------------------------------------------
  // listen for messages from view
  $scope.changeBrushType = function () {
    // example of listening to an Angular message broadcast from the UI
  };

}]);
