// DB
let Plan = require('api/models/plans/plan');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {

    /*
    *      * @apiParam {Number} [limit] number of slices to get
     * @apiParam {Number} [offset] start of slices to get
     * @apiParam {String} [text] text to match on plan name or any other text field
     * @apiParam {String} [pet] pet to match
     * @apiParam {Boolean} [isSimulation=false] match simulation only plans
     * @apiParam {String} [vetCenter] vetCenter to match
     * @apiParam {String} [originUser] originUser to match
     * @apiParam {String} [statuses] statuses to match

    * */

    request.checkQuery('pet', 'No valid pet of plan provided').optional().isObjectId();
    request.checkQuery('vetCenter', 'No valid vetCenter of plan provided').optional().isObjectId();
    request.checkQuery('owner', 'No valid owner of plan provided').optional().isObjectId();
    request.checkQuery('originUser', 'No valid originUser of plan provided').optional().isObjectId();
    request.checkQuery('isSimulation', 'No valid isSimulation of plan provided').optional().isBoolean();
    request.checkQuery('statuses', 'No valid statuses of plan provided').optional().isArrayAndIsIn(constants.planStatuses);
    request.checkQuery('text', 'No valid name of plan provided').optional().isAlpha();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('pet', 'No valid pet of plan provided').optional().isObjectId();
    request.checkBody('vetCenter', 'No valid vetCenter of plan provided').optional().isObjectId();
    request.checkBody('origin.user', 'No valid origin.user of plan provided').optional().isObjectId();
    request.checkBody('isSimulation', 'No valid isSimulation of plan provided').optional().isBoolean();
    request.checkBody('statuses.status', 'No valid statuses.status of plan provided').optional().isIn(constants.planStatuses);
    request.checkBody('cancellationReason', 'No valid cancelationReason of plan provided').optional().isIn(constants.planCancellations);
    request.checkBody('telemarketingProcedings', 'No valid telemarketingProcedings of plan provided').optional().isFloat();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkBody('pet', 'No valid pet of plan provided').optional().isObjectId();
    request.checkBody('vetCenter', 'No valid vetCenter of plan provided').optional().isObjectId();
    request.checkBody('origin.user', 'No valid origin.user of plan provided').optional().isObjectId();
    request.checkBody('isSimulation', 'No valid isSimulation of plan provided').optional().isBoolean();
    request.checkBody('statuses.status', 'No valid statuses.status of plan provided').optional().isIn(constants.planStatuses);
    request.checkBody('cancellationReason', 'No valid cancelationReason of plan provided').optional().isIn(constants.planCancellations);
    request.checkBody('telemarketingProcedings', 'No valid telemarketingProcedings of plan provided').optional().isFloat();
    commonFunctions.validate(request,response,next);
};

module.exports.postDeactivationValidator = function (request, response, next) {
    request.checkBody('cancellationReason', 'No valid cancellationReason provided').isIn(constants.planCancellations);
    commonFunctions.validate(request,response,next);
};