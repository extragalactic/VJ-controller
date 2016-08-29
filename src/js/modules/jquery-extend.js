// Adds an extra utility function for jQuery
global.jQuery = $ = require('jquery');

// this function swaps 2 divs on the page
jQuery.fn.swap = function(b){
  b = jQuery(b)[0];
  if(b===undefined) {
    console.warn('Div for jQuery.swap is not defined');
    return;
  }
  var a = this[0];
  var t = a.parentNode.insertBefore(document.createTextNode(''), a);
  b.parentNode.insertBefore(a, b);
  t.parentNode.insertBefore(b, t);
  t.parentNode.removeChild(t);
  return this;
};
