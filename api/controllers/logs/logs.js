// Globals
let express = require('express');
let router = express.Router();
let fs = require("fs"); // https://stackoverflow.com/questions/11225001/reading-a-file-in-real-time-using-node-js
router.route('/:filename')
    .get(function (req, res, next) {
        let spawn = require('child_process').spawn;
        res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8' , "Transfer-Encoding": "chunked" });
        //res.header('Content-Type', 'text/html;charset=utf-8');
        console.log("reading " + req.params.filename);
        spawn('tail', ['-f', req.params.filename])
        tail = spawn('tail', ['-f', 'logs/' + req.params.filename + '.log']);
        tail.stdout.on('data', function (data) {
            res.write(data, 'utf-8');
        });
        tail.stderr.on('data', function (data) {
            res.write(data, 'utf-8');
        });
        tail.on('exit', function (code) {
            console.log('child process exited with code ' + code);
            res.end(200);
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