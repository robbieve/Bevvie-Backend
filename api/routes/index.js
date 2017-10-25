let winston = require('lib/loggers/logger').winston;
let config = require('config');

module.exports = function (app) {
    // Routes in all subdirs
    const colors = require('chalk');
    let includes = {
        "controllers/users": ["login", "register","users"],
        "controllers/blobs": ["images","files"],
        "controllers/pets": ["breeds"],
    };
    Object.keys(includes).forEach(function (key) {
        includes[key].forEach(function (aRoute) {
            let route = '/api/v' + config.apiVersion + '/' + aRoute;
            winston.info('ROUTES: Adding ' + colors.green(route) + ' from group ' + colors.yellow(key));
            app.use(route, require("../"+key+"/"+ aRoute));
        });
    });
};