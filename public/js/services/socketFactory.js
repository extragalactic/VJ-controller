var socketio = require('socket.io-client');

angular.module('myApp').factory('socket', function ($rootScope) {
   var socketPath = "http://" + VJ_SERVER_IP + ":" + VJ_SERVER_PORT;
   console.log('creating socket connection: ' + socketPath);
   var socket = socketio.connect(socketPath);

   return {
     on: function (eventName, callback) {
         socket.on(eventName, function () {
             var args = arguments;
             $rootScope.$apply(function () {
                 callback.apply(socket, args);
             });
         });
     },
     emit: function (eventName, data1, data2) {
       // currently this wrapper supports either 1 or 2 args
       if(data2===undefined) {
         socket.emit(eventName, data1);
       } else {
         socket.emit(eventName, data1, data2);
       }
     },
     removeAllListeners: function () {
       socket.removeAllListeners();
     },
     id: socket.id
  };
});
