
var VJ_SERVER_IP = "52.10.148.188";
var VJ_SERVER_PORT = 3400;

(function() {

   var settings = {VJ_SERVER_IP : VJ_SERVER_IP, VJ_SERVER_PORT : VJ_SERVER_PORT}

   if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
      module.exports = settings;
   else {
      window.VJControllerSettings = settings;
   }
})();
