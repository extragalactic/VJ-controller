
var VJ_SERVER_IP = "192.168.1.65";
var VJ_SERVER_PORT = 3300;

(function() {

   var settings = {VJ_SERVER_IP : VJ_SERVER_IP, VJ_SERVER_PORT : VJ_SERVER_PORT}

   if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
      module.exports = settings;
   else {
      window.sigmaSketcherSettings = settings;
   }
})();
