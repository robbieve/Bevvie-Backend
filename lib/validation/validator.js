// Validator
const ObjectId = require('mongoose').Types.ObjectId;
let expressValidator = require('express-validator');
let util = require('util');
let validatorInstance;
let options = {
    errorFormatter: function (param, msg, value) {
        let namespace = param.split('.')
            , root = namespace.shift()
            , formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            localizedError: msg,
            rawError:
                {
                    param: formParam,
                    msg: msg,
                    value: value
                }
        };
    },
    customValidators: {
        isObjectId: function (value) {
            return ObjectId.isValid(value)
        },
        isArrayAndIsIn: function (value,options) {
            if (!Array.isArray(value)) {
                return options.indexOf(value,options)!== -1;
            }
            else {
                return value.every(function (val) {
                    return options.indexOf(val.prop, options) !== -1
                });
            }
        },
        isArrayOfObjectId: function (value) {
            return value.every(function (val) {
                return ObjectId.isValid(val.prop);
            });
        }
    }
};
validatorInstance = expressValidator(options);
module.exports = validatorInstance;