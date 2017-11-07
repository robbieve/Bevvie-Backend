const winston = require('lib/loggers/logger').winston;
const PushNotifications = require('node-pushnotifications');
const config = require("config").push;
const push = new PushNotifications(config);

winston.info("PUSH: Starting push notifications system...");
winston.debug("PUSH: Config...",JSON.stringify(config));

module.exports.push = push;

/*
    // Push

    let pushLib = require("lib/push/push");
    const data = {
        title: 'New push notification', // REQUIRED
        topic: config.push.topic,
        body: 'Powered by AppFeel', // REQUIRED
        custom: {
            sender: 'AppFeel',
        },
        priority: 'high', // gcm, apn. Supported values are 'high' or 'normal' (gcm). Will be translated to 10 and 5 for apn. Defaults to 'high'
        retries: 3, // gcm, apn
        badge: 2, // gcm for ios, apn
        expiry: Math.floor(Date.now() / 1000) + 28 * 86400, // seconds
    };
    pushLib.sendPush("aa8274e5adb21089c4cfbc04e69f869b8df74e6d5e3899d4955762439611c6e1",
        data,
        function (err,res) {
            console.log("err "+err+" res "+res);
        });
    */

module.exports.sendPush = function (token, pushMessage, callback) {
    push.send(token, pushMessage, (err, result) => {
        if (err) {
            winston.error("PUSH ERROR: Push failed for "+token+" message: "+JSON.stringify(pushMessage)+ " error "+JSON.stringify(err)+ " result "+JSON.stringify(result));
        } else {
            winston.info("PUSH SUCCESS: Push success for "+token);
            winston.debug("PUSH SUCCESS MESSAGE: "+JSON.stringify(pushMessage)+ " result "+JSON.stringify(result));
        }
        callback(err,result);
    });
}