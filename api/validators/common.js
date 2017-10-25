module.exports.validate=function _validate(request,response,next) {
    request.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            return response.status(400).json(result.array()[0]);

        }
        else {
            next();
        }
    }).catch(function (err) {
        return response.status(500).json({
            localizedError: 'There was an error at the validation system',
            rawError: 'error: ' + err
        });
    });
};