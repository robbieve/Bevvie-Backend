// parseUrlencoded will give us new objects parsed
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: true });
module.exports = parseUrlencoded;
