// ColourLibrary contains all the website's colours
angular.module('myApp').factory('ColorLibrary', function () {
  "use strict";

  // set colors
  var colorBank = {
    first: {light: "#ba6fe8", medium: "#7D3CA3", dark: "#3F1756"},
    second: {light: "#FC6ACD", medium: "#B03889", dark: "#63164A"},
    third: {light: "#766AFC", medium: "#4238B0", dark: "#1C1663"},
    firstComp: {light: "#9de86f", medium: "#62a33c", dark: "#2e4e1c"},
    grey: {light: "#333333", medium: "#222222", dark: "#111111"},
    offState: {light: "#550000", medium: "#440000", dark: "#330000"}
  };

  return {
    getColor: function (color, shade) {
      if(colorBank[color] !== undefined && colorBank[color][shade] !== undefined) {
        return colorBank[color][shade];
      } else {
        console.warn('warning: requested color not found');
        return colorBank.first.medium;
      }
    }
  };

});
