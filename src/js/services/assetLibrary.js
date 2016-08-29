// AssetLibrary loads and contains all external assets (images, etc.)
angular.module('myApp').factory('assetLibrary', function () {
  "use strict";

  var dataManifest = "data/loadManifest.json";
  var loadCompleteCallback = null;
  var bIsLoaded = false;

  // Create a LoadQueue instance
  var loadQueue = new createjs.LoadQueue(false);

  // Listener to the Complete event (when all files are loaded)
  loadQueue.addEventListener("complete", function() {
    // send completion message after all assets have been loaded
    bIsLoaded = true;
    loadCompleteCallback();
  });

  loadQueue.addEventListener("error", function() {
    console.warn('error loading files');
    return false;
  });

  return {
    loadAllAssets: function (callback) {
      loadCompleteCallback = callback;
      if(!bIsLoaded) {
        // start loading assets
        loadQueue.loadManifest({src: dataManifest, type: "manifest"});
      } else {
        // assets already loaded so return
        loadCompleteCallback();
      }
    },
    checkAssetsLoaded: function() {
      return bIsLoaded;
    },
    getMatrixData: function () {
      return loadQueue.getResult("matrixInit");
    }
  };

});
