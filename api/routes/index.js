let winston = require('lib/loggers/logger').winston;
let config = require('config');

module.exports = function (app) {
    // Routes in all subdirs
    const colors = require('chalk');
    let includes = {
        "controllers/users": ["login", "register","users","sendlink","rcVetCenters"],
        "controllers/blobs": ["images","files"],
        "controllers/pets": ["pets","breeds"],
        "controllers/plans": ["plans","treatments","regionPonderations"],
        "controllers/common": ["regions"],

    };
    Object.keys(includes).forEach(function (key) {
        includes[key].forEach(function (aRoute) {
            let route = '/api/v' + config.apiVersion + '/' + aRoute;
            winston.info('ROUTES: Adding ' + colors.green(route) + ' from group ' + colors.yellow(key));
            app.use(route, require("../"+key+"/"+ aRoute));
        });
    });
};
