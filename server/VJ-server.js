// ==========================================================
// VJ Controller Node.js server
// ==========================================================

(function() {
"use strict";

// define external modules
var express = require("express");
var http = require("http");
var app = express();
var settings = require("./../public/serverIP");
var server = http.createServer(app).listen(settings.VJ_SERVER_PORT);
var io = require("socket.io")(server);
var fs = require("fs");
var osc = require('node-osc');

// init application vars
var userList = [];
var drawHistory = [];
var oscServer, oscClient;

// set root folder for Express web server
app.use(express.static("./../public"));

// define handlers for all incoming messages
io.on("connection", function(socket) {

   // ----------------------------------------------------

    if(oscServer===undefined || oscClient===undefined) {
      initOSC();
    }

    // ----------------------------------------------------
    socket.on("messageOSC", function(message, val) {
        console.log('sending OSC message: ' + message + ' value: ' + val);
        oscClient.send(message, val);
    });

    // ----------------------------------------------------

    socket.on("login", function() {
      var userData = {};
      userData.socketID = socket.id;
      userList.push(userData);

      console.log('User Login, # users: ' + userList.length);
    });

    // ----------------------------------------------------
    socket.on("getUserList", function() {
      console.log('# users: ' + userList.length);
      //socket.emit('userlist', userList) ;
    });

    // ----------------------------------------------------
    socket.on("disconnect", function() {
      // remove user from userList array
      for(var i=0, len = userList.length; i<len; ++i ) {
        var user = userList[i];

        if(user.socketID === socket.id){
          //io.emit('message', user.name + ' has logged out');
          userList.splice(i,1);
          console.log('user logged out...');
          console.log('# users: ' + userList.length);
          break;
        }
      }
      //io.emit("userlist", userList);
    });

    // initialization code for server
    socket.emit("message", "[connected to server]");

});

function initOSC() {
   var obj = {
      server: {
        port: 7001,
        host: settings.VJ_SERVER_IP
      },
      client: {
        port: 7000,
        host: settings.VJ_SERVER_IP
      }
   };
   console.log('configure OSC socket');
   oscServer = new osc.Server(obj.server.port, obj.server.host);
   oscClient = new osc.Client(obj.client.host, obj.client.port);

   oscServer.on('message', function(msg, rinfo) {
     //var OSCmsg = msg[2][0]; // trim the data out of the message
     console.log('OSC server received message: ' + msg);
     //io.emit("messageOSC", OSCmsg);
   });

}

// --------- start server here ----------
console.log("Starting VJ Controller on " + settings.VJ_SERVER_IP + ":" + settings.VJ_SERVER_PORT);

exports.mainApp = app;

}());
