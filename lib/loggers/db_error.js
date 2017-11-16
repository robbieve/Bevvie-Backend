let mongoose = require('mongoose');
let winston = require('lib/loggers/logger').winston;
module.exports = function (err, req, res, next) {
    if (req.accepts(['json', 'text'])) {
        if (err.name === "ValidationError") { // ValidationError
            let errorList = [];
            for (let errName in  err.errors) {
                switch (err.errors[errName].name) {
                    case 'required':
                        errorList.push({
                            localizedError: 'Field ' + err.errors[errName].path + ' is required',
                            'rawError': err.errors[errName]
                        });
                        break;
                    case 'notvalid':
                        errorList.push({
                            localizedError: 'Field ' + err.errors[errName].path + ' value ' + err.errors[errName].value + ' is not valid',
                            'rawError': err.errors[errName]
                        });
                        break;
                    case 'CastError':
                        errorList.push({
                            localizedError: 'Field ' + err.errors[errName].path + ' value ' + err.errors[errName].value + ' is not valid type',
                            'rawError': err.errors[errName]
                        });
                        break;
                    default:
                        errorList.push({
                            localizedError: 'Field ' + err.errors[errName].path + ' value ' + err.errors[errName].value + ' is not valid',
                            'rawError': err.errors[errName]
                        });
                        break
                }
            }
            winston.error("DB: Error: 400 ",JSON.stringify(errorList[0],0,2));
            res.status(400).json(errorList[0]);
        }
        else if (err.name == "CastError") {
            let errorList = [];
            for (let errName in  err.errors) {
                errorList.push({
                    localizedError: 'Field ' + err.errors[errName].path + ' type is not valid',
                    'rawError': err
                });
            }
            winston.error("DB: Error: 400 ",JSON.stringify(errorList[0],0,2));
            res.status(400).json(errorList[0]);
        }
        else if (err.code == 11000) { // Duplicate key
            let jsonError = err;
            let errorList = [];
            errorList.push({
                localizedError: 'Duplicated object',
                'rawError': jsonError
            });
            winston.error("DB: Error: 409 ",JSON.stringify(errorList[0],0,2));
            res.status(409).json(errorList[0]);
        }
        else {
            winston.error("DB: Error: 500 "+JSON.stringify(err,0,2)+":"+err.toString());
            res.status(500).json({localizedError: 'A database error ocurred', 'rawError': err , "message":err.toString()});
        }
    } else {
        next(err, req, res)
    }

};
