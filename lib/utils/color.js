
var utils = {};
utils.isHexColor =  function isHexColor(s) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(s)
};
utils.isHexColorAndAlpha =  function isHexColorAndAlpha(s) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(s)
};
module.exports = utils;
