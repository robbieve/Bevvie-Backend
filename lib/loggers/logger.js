let config = require('config');
let logConfig = config.log;
let winston = require('winston');
winston.emitErrs = true;
let fs = require('fs');

let logger = {};
if (logConfig.type === 'console'){
    logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                level: logConfig.loglevel,
                handleExceptions: true,
                json: false,
                prettyPrint: true,
                colorize: true
            })
        ],
        exitOnError: false
    });
}
else {
    let dir = 'logs';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    if (process.env.pm_id === undefined) {
        logger = new winston.Logger({
            transports: [
                new winston.transports.File({
                    level: logConfig.loglevel,
                    filename: logConfig.filename + ".log",
                    handleExceptions: true,
                    humanReadableUnhandledException: true,
                    json: false,
                    maxsize: 8000000, //8MB
                    maxFiles: 8,
                    prettyPrint: true,
                    zippedArchive: true,
                    colorize: true,
                    timestamp: true,
                    exitOnError: false,
                }),
            ],
            exitOnError: false
        });
    }
    else{
        logger = new winston.Logger({
            transports: [
                new winston.transports.File({
                    name: "default",
                    level: logConfig.loglevel,
                    filename: logConfig.filename + ".log",
                    handleExceptions: true,
                    humanReadableUnhandledException: true,
                    json: false,
                    maxsize: 8000000, //8MB
                    maxFiles: 8,
                    prettyPrint: true,
                    zippedArchive: true,
                    colorize: true,
                    timestamp: true,
                    exitOnError: false,
                }),
                new winston.transports.File({
                    name: "error",
                    level: "error",
                    filename: logConfig.filename + "-error.log",
                    handleExceptions: true,
                    humanReadableUnhandledException: true,
                    json: false,
                    maxsize: 8000000, //8MB
                    maxFiles: 8,
                    prettyPrint: true,
                    zippedArchive: true,
                    colorize: true,
                    timestamp: true,
                    exitOnError: false,
                }),
                new winston.transports.File({
                    name: "instance",
                    level: logConfig.loglevel,
                    filename: logConfig.filename+"-instance-"+process.env.pm_id+".log",
                    handleExceptions: true,
                    humanReadableUnhandledException: true,
                    json: false,
                    maxsize: 8000000, //8MB
                    maxFiles: 8,
                    prettyPrint: true,
                    zippedArchive: true,
                    colorize: true,
                    timestamp: true,
                    exitOnError: false,
                }),
            ],
            exitOnError: false
        });
    }
}
logger.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};


// PREPARE LOGGER FOR API
let morgan = require('morgan');
let parseUrlencoded = require('../parsers/bodyparser');
let uploads = require('../blobs/blob_upload_inmemory');

// Defining some custom logging
morgan.token('input_params', function getInputParams(req) {
    return JSON.stringify(req.params)
});
morgan.token('input_body', function getInputBody(req) {
    return JSON.stringify(req.body)
});

morgan.token('input_file', function getInputFile(req) {
    let aFile = [];
    if (req.file) {
        delete req.file["buffer"];
        aFile = [req.file]
    }
    else if (req.files) {
        aFile = req.files.map(function (x) {
            delete x["buffer"];
            return x
        })
    }
    let file = req.files ? req.files : req.file;
    return JSON.stringify(aFile)
});


let theLogger = morgan(':remote-addr - :remote-user [:date[clf]] :method :url :referrer :user-agent - REQUEST :input_params :input_body :input_file - RESPONSE :status :res[content-length] :response-time ms',
    {
        "stream": logger.stream
    });

module.exports = theLogger;
module.exports.winston = logger;
