let winston = require('lib/loggers/logger').winston;
module.exports = function clientErrorHandler(err, req, res, next) {
    if (req.accepts(['json', 'text'])) {
        winston.error("ERROR 500 Unhandled: ", JSON.stringify(err.stack, 0, 2));
        res.status(500).json({localizedError: 'An API error ocurred', 'rawError': JSON.stringify(err)});
    } else {
        next(err, req, res)
    }
};
