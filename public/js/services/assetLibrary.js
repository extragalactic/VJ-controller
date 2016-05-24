// AssetLibrary loads and contains all external assets (images, etc.)
angular.module('myApp').factory('AssetLibrary', function () {
  "use strict";

  var loadCompleteCallback = null;
  var dataManifest = "data/loadManifest.json";
  console.debug('init asset library');

  // Create a LoadQueue instance
  var loadQueue = new createjs.LoadQueue(false);

  // Listener to the Complete event (when all files are loaded)
  loadQueue.addEventListener("complete", function() {
    // send completion message after all assets have been loaded
    loadCompleteCallback();
  });

  loadQueue.addEventListener("error", function() {
    console.warn('error loading files');
    return false;
  });

  return {
    loadAllAssets: function (callback) {
      loadCompleteCallback = callback;
      if(true) {
        // start loading assets
        loadQueue.loadManifest({src: dataManifest, type: "manifest"});
      } else {
        // assets already loaded so return
        loadCompleteCallback();
      }
    },
    getMatrixData: function () {
      return loadQueue.getResult("matrixInit");
    }
  };

});
