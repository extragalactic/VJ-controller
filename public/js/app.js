// ----------------------------------------------------
//  Main application script for VJ Controller
// ----------------------------------------------------

global.jQuery = $ = require('jquery');
require("angular-ui-bootstrap");

// create main Angular module
var myApp = angular.module('myApp', [
  'ngRoute',
  'ui.bootstrap',
  'ngAnimate',
  'ngColorPicker'
])
// run initialization procedures
.run(['socket', function(socket) {
  socket.emit('login');
}])
// set application 'globals'
.value('appVars', {
  config: {
    test: 'sample'
  }
})
.config(['$routeProvider', function ($routeProvider) {
  // ---- init Angular route provider ----
  $routeProvider.
  when('/fader', {
    templateUrl: 'partials/fader.html',
    controller: 'FaderController'
  }).
  when('/sequencer', {
    templateUrl: 'partials/sequencer.html',
    controller: 'SequencerController'
  }).
  otherwise({
    redirectTo: '/fader'
  });
}]);

/*

*/

// Note: it appears that the ui-angular scripts are not fully working.
// I must manually add behavior to the buttons.

// initialize navbar button behavior
$(document).on('click', '.navbar-nav li', function (e) {
  $(this).addClass('active').siblings().removeClass('active');
});
$(document).on('click', '.navbar-brand', function (e) {
  $(this).addClass('active');
  $('.navbar-nav li:first').addClass('active').siblings().removeClass('active');
});

// init hamburger button
$(document).on('click', '#menuCollapseButton', function (e) {
  if ($('#navigationBar').hasClass('collapse')) {
    $('#navigationBar').removeClass('collapse');
  } else {
    $('#navigationBar').addClass('collapse');
  }
});
