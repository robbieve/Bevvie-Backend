// https://testid.royalcanin.es/developers/user.cfm

let config = require("config");
let http = require("https");
let crypto = require("crypto");
let querystring = require('querystring');
let winston = require('lib/loggers/logger').winston;
let moment = require('moment');
let xmlParser = require('xml2js').parseString;

let sharedSecret = config.royalCanin.client_secret;
let url = config.royalCanin.url;

let endpoints = {
    login: "/ws/v1/user/login",
    user: "/ws/v1/user",
    clinics: "/ws/v1/prescribers",
};


// Authentication
function _createAuthHeader(clientSecret = sharedSecret) {
    let Access_token_proof = crypto.createHmac("sha256", clientSecret).update(module.exports.accessToken).digest("hex");
    return module.exports.accessToken + ":" + Access_token_proof;
}

function _createAuthHeaderWithoutToken(signature, unixtime, clientSecret = sharedSecret) {
    let newSignature = signature + "" + unixtime;
    let header = crypto.createHmac("sha256", clientSecret).update(newSignature).digest("hex");
    winston.debug('ROYAL: AuthHeader: Signature' + JSON.stringify(signature) + ' unixtime: ' + unixtime + ' header: ' + header);
    return header;
}

function _addAuthToHeaders(options, signature, unixtime) {
    if (options.headers === undefined) {
        options.headers = {}
    }
    if (signature === undefined || signature === null) {
        Object.assign(options.headers, {"Authorization": _createAuthHeader()});
    }
    else {
        Object.assign(options.headers, {"Authorization": _createAuthHeaderWithoutToken(signature, unixtime)});
    }

    return options
}

module.exports.auth = {};
module.exports.auth.authHeader = _createAuthHeader;
module.exports.auth.authHeaderWithoutToken = _createAuthHeaderWithoutToken;

// Helper methods

function _GETRequest(options, query, signature, callback) {
    let unixtime = Math.floor(moment().utc() / 1000);
    if (query) {
        if (query.unixTime) {
            unixtime = query.unixTime
        }
        let getdata = querystring.stringify(query);
        options.path = options.path + "?" + getdata;

    }
    options = _addAuthToHeaders(options, signature, unixtime);
    winston.debug('ROYAL: Performing GET request with parameters ' + JSON.stringify(options) + ' query ' + options.path);
    let req = http.get(options, (res) => {
        // Continuously update stream with data
        let body = '';
        res.on('data', function (d) {
            body += d;
        });
        res.on('end', function () {
            // Data reception is done, do whatever with it!
            if (res.headers["content-type"].indexOf("application/xml")!== -1){
                xmlParser(body,{explicitArray: false},function (err,result) {
                    res.body = result;
                    winston.debug('ROYAL: GET request succeed ' + JSON.stringify(result));
                    callback(err, res);
                });
            }
            else {
                body = JSON.parse(body);
                res.body = body;
                winston.debug('ROYAL: GET request succeed ' + JSON.stringify(body));
                callback(null, res);
            }
        });
    });
    req.on('error', (err) => {
        winston.error('ROYAL: ERROR request failed ' + JSON.stringify(err));
        callback(err, null)
    });
};

// https://nodejs.org/api/http.html#http_http_get_options_callback

function _POSTQueryRequest(options, dataToPost, signature, callback) {
    let postdata = querystring.stringify(dataToPost);
    let unixtime = Math.floor(moment().utc() / 1000);
    if (dataToPost.unixTime) {
        unixtime = dataToPost.unixTime
    }
    options = _addAuthToHeaders(options, signature, unixtime);
    let body = "";
    winston.debug('ROYAL: Performing POST request with parameters ' + JSON.stringify(options) + ' data ' + postdata);
    const req = http.request(options, (res) => {
        winston.debug(`ROYAL: RESPONSE status: ${res.statusCode} headers: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            body = body + chunk;
            winston.debug(`ROYAL: body: ${chunk}`);
        });
        res.on('end', () => {
            if (res.statusCode >= 400) {
                res.body = body;
                winston.error('ROYAL: ERROR request failed ' + JSON.stringify(body));
                body = JSON.parse(body);
                res.body = body;
                callback(body, res)
            }
            else {
                if (body.length===0) { body = "{}"};
                body = JSON.parse(body);
                res.body = body;
                winston.debug('ROYAL: POST request succeed ' + JSON.stringify(body));
                callback(null, res);
            }

        });
    });
    req.on('error', (err) => {
        winston.error('ROYAL: ERROR request failed ' + JSON.stringify(err));
        callback(err, null)
    });

// write data to request body
    req.write(postdata);
    req.end();
};

// Public
/*
*
* email	string	User's email
password	string	User's password
appid	string	Indicates the application that is making the request
clientid	string	Indicates the client that is making the request
unixtime	numeric	See chapter: Appendix 2: API Request - without token
languageCode	string	Language of the user. Possible values: ES: Spanish; PT: Portuguese
name	string	User's name
lastName	string	User's last name
companyId	numeric	1:Spain; 2:Portugal.
mobilePhone	string	User's mobile phone, without the country prefix.
phoneCountryCode	string	ISO 3166-1 alpha-2 code of user's mobile phone. For example, in Spain: ES; in Portugal :PT.
postalCode	string	User's postal code
countryCode	string	User's country code (ISO 3166-1 alpha-2). Possible values: AD: Andorra, AE: United Arab Emirates; AF: Afghanistan; etc.
pets	json array	Array with User's pets
* */

module.exports.register = function (user, callback) {
    // Not well parsed strings
    user.pets = JSON.stringify(user.pets);
    let options = {
        headers: {
            "accept": "application/JSON",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        host: url,
        path: endpoints.user,
        port: 443,
        method: "POST",
    };
    _POSTQueryRequest(options, user, user.email + "" + user.password, callback);
};

module.exports.login = function (userData, callback) {
    let options = {
        headers: {
            "accept": "application/JSON",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        host: url,
        path: endpoints.login,
        port: 443,
        method: "POST",
    };

    // email=mochoa%40genetsis.com&appId=MkZFRTUzQkItQUI5Ri00MkUzLUI4Q0ItOTAyNkQ1QjZDNDE5&clientId=Nzk2MzgxMDk1NTkx&userPassword=12345678&unixTime=1432636276


    _POSTQueryRequest(options, userData, userData.email + "" + userData.userPassword, function (err, res) {
        if (res && res.body.accessToken) {
            module.exports.accessToken = res.accessToken;
        }
        callback(err, res);
    });
};

module.exports.userData = function (userId, withPets = false, callback) {
    let options = {
        headers: {
            "accept": "application/JSON",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        host: url,
        path: endpoints.user + "/" + userId,
        port: 443,
        method: "GET",
    };

    // email=mochoa%40genetsis.com&appId=MkZFRTUzQkItQUI5Ri00MkUzLUI4Q0ItOTAyNkQ1QjZDNDE5&clientId=Nzk2MzgxMDk1NTkx&userPassword=12345678&unixTime=1432636276


    _GETRequest(options, {withPets: withPets}, null, callback);
};


/*
password	string	User's password
name	string	User's name
lastName	string	User's last name
mobilePhone	string	User's mobile phone, without the country prefix.
phoneCountryCode	string	ISO 3166-1 alpha-2 code of user's mobile phone. For example, in Spain: ES; in Portugal :PT.
postalCode	string	User's postal code
countryCode	string	User's country code (ISO 3166-1 alpha-2). Possible values: AD: Andorra, AE: United Arab Emirates; AF: Afghanistan; etc.
pets	json array	Array with User's pets.

 */
module.exports.updateUserData = function (user, userid, callback) {
    // Not well parsed strings
    user.pets = JSON.stringify(user.pets);
    let options = {
        headers: {
            "accept": "application/JSON",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        host: url,
        path: endpoints.user+"/"+userid,
        port: 443,
        method: "POST",
    };
    _POSTQueryRequest(options, user, null, callback);
};

module.exports.changePassword = function (userid, oldPassword, newPassword, callback) {
    let options = {
        headers: {
            "accept": "application/JSON",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        host: url,
        path: endpoints.user+"/"+userid+"/updatePassword",
        port: 443,
        method: "POST",
    };
    let data = {oldPassword: oldPassword, newPassword: newPassword};
    _POSTQueryRequest(options, data, null, callback);
};

module.exports.resetPassword = function (params, callback) {
    let options = {
        headers: {
            "accept": "application/JSON",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        host: url,
        path: endpoints.user+"/rememberPassword",
        port: 443,
        method: "POST",
    };
    _POSTQueryRequest(options, params, params.email, callback);
};

module.exports.clinicsData = function (postalCode, callback) {
    let options = {
        headers: {
            "accept": "application/xml",
        },
        host: url,
        path: endpoints.clinics,
        port: 443,
        method: "GET",
    };


    //?postalCode=28002&prescriberType=0&appId=MUQ2NDU0RUUtQTJCRi00MkU3LTk0NzktQ0RGNTM5Nzk4ODYz&clientId=OTk3NDEyNTc5MTQ1&unixtime=1487272280

    let query = {
        appid: config.royalCanin.app_id,
        clientid: config.royalCanin.client_id,
        postalCode: postalCode,
        prescriberType: 1, // Just clinics.
        unixTime: Math.floor(moment().utc() / 1000)

}

    _GETRequest(options, query, query.clientid, callback);
};