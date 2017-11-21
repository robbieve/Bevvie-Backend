// Globals
let express = require('express');
let router = express.Router();
let fs = require("fs"); // https://stackoverflow.com/questions/11225001/reading-a-file-in-real-time-using-node-js
router.route('/:filename')
    .get(function (req, res, next) {
        let spawn = require('child_process').spawn;
        let tail = spawn('tail', ['-f', req.params.filename]);

        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked'
        });

        tail.stdout.on('data', function (data) {
            res.write('' + data);
        });

    });
module.exports = router;

/*
*
* var http = require("http");
var filename = process.argv[2];


if (!filename)
    return console.log("Usage: node tailServer filename");

var spawn = require('child_process').spawn;
var tail = spawn('tail', ['-f', filename]);

http.createServer(function (request, response) {
    console.log('request starting...');

    response.writeHead(200, {'Content-Type': 'text/plain' });

    tail.stdout.on('data', function (data) {
      response.write('' + data);
    });
}).listen(8088);

console.log('Server running at http://127.0.0.1:8088/');*/