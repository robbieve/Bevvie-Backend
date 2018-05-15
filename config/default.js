config = {
    'apiVersion': 1,
    'server': {
        'port': process.env.PM2_NODE_PORT ? process.env.PM2_NODE_PORT : 8000,
        'host': process.env.PM2_NODE_HOST ? process.env.PM2_NODE_HOST : "127.0.0.1",
    },
    'admin': {
        'admin': 'admin',
        'password': 'Develapps16',
    },
    'auth': {
        'baseToken': process.env.PM2_NODE_BASE_TOKEN,
        'bearer': true,
        'local': true,
        'third-party': false,
        'client_facebook': true, // enable this to use facebook passing in a facebookToken for authentication
        'facebookAuth' : {
            'clientID'      : process.env.PM2_FACEBOOK_APPID, // your App ID
            'clientSecret'  : process.env.PM2_FACEBOOK_SECRET, // your App Secret
        },
        'client_firebase': true, // enable this to use facebook passing in a facebookToken for authentication
        'firebaseAuth': {
            apiKey: process.env.PM2_FIREBASE_API_KEY,
            authDomain: process.env.PM2_FIREBASE_AUTH_DOMAIN,
            databaseURL: process.env.PM2_FIREBASE_DATABASE_URL,
            projectId: process.env.PM2_FIREBASE_PROJECT_ID,
            storageBucket: process.env.PM2_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.PM2_FIREBASE_MESSAGING_SENDER_ID
        },
    },
    'aws': {
        'accessKeyId': process.env.PM2_NODE_AWS_ACCESS_KEY,
        'secretAccessKey': process.env.PM2_NODE_AWS_SECRET_KEY,
        's3': {
            bucket: process.env.PM2_NODE_AWS_S3_BUCKET
        }
    },
    'db': {
        options: {
            useMongoClient: true,
            keepAlive: 30000,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 300000,
        },
        authdatabase: process.env.PM2_MONGODB_AUTHDATABASE ? process.env.PM2_MONGODB_AUTHDATABASE : process.env.PM2_MONGODB_DATABASE,
        debug: false
    },
    'cache': {
        expireTime: 60 * 60 * 24,
        enabled: false,
        save_statistics: true,
    },
    chatMaxTime: 0.1* 60 * 60 * 1000,
    'kue': {
        "cleanupMinutes": 60,
    },
    nodemailer: {
        user: process.env.PM2_NODEMAILER_USER,
        pass: process.env.PM2_NODEMAILER_PASS,
        port: process.env.PM2_NODEMAILER_PORT,
        secure: process.env.PM2_NODEMAILER_SECURE === "1",
        host: process.env.PM2_NODEMAILER_HOST ? process.env.PM2_NODEMAILER_HOST : "smtp.gmail.com",
        subject_prefix: process.env.PM2_NODEMAILER_PREFIX ? process.env.PM2_NODEMAILER_PREFIX : "[BEVVIE-PRUEBAS]",
        mailfrom: "BEVVIE <notifications@bevvie.com>",
        mailto: process.env.PM2_NODEMAILER_MAILTO,
    },
    log: {
        'type': 'console',
        'loglevel': 'info',
    },
    push:{
        /* // Enable for GCM
        gcm: {
            id: null // No notifications for GCM
        },
        */
        topic: 'com.bevvie.App', // Mandatory
        apn: { // See options at https://github.com/node-apn/node-apn/blob/master/doc/provider.markdown
            token: {
                 key: "-----BEGIN PRIVATE KEY-----\n" +
                 "MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgLNNZh6zucL/2xiRL\n" +
                 "2kixsgeu/V1vMSA7r7pUPLR7+YagCgYIKoZIzj0DAQehRANCAAR9FxXxQi1hmjM8\n" +
                 "35eVNYS8lVDb+cOtdMOfWq92qBj1wpS7NDKnPRUytWyVewWgTzFc6WKzq7Rt73o8\n" +
                 "i9GTX1+h\n" +
                 "-----END PRIVATE KEY-----",
                 keyId: process.env.PM2_PUSH_APN_KEY_ID,
                 teamId: 'YK8V5JJZ8V',
            },
            /*cert: 'cert.pem',
            key: 'key.pem',*/
            ca: null,
            pfx: null,
            passphrase: null,
            production: process.env.PM2_PUSH_ISPRODUCTION=== "1" || false,
            voip: false,
            address: null,
            port: 443,
            rejectUnauthorized: true,
            connectionRetryLimit: 10,
            cacheLength: 1000,
            connectionTimeout: 3600000,
            autoAdjustCache: true,
            maxConnections: 1,
            minConnections: 1,
            connectTimeout: 10000,
            buffersNotifications: true,
            fastMode: false,
            disableNagle: false,
            disableEPIPEFix: false
        }
    },
    stripe:{
        public: process.env.PM2_STRIPE_PUBLIC,
        secret: process.env.PM2_STRIPE_SECRET,
    },
    royalCanin: {
        url: process.env.PM2_ROYAL_URL,
        client_secret: process.env.PM2_ROYAL_CLIENT_SECRET,
        client_id: process.env.PM2_ROYAL_CLIENT_ID,
        app_id: process.env.PM2_ROYAL_APP_ID,

    },
    paginationSize: 10,
};
if (process.env.PM2_NODE_TEST) {
    config.node_test_ip = process.env.PM2_NODE_TEST
}
if (process.env.PM2_MONGODB_USER) {
    config.db.user = encodeURIComponent(process.env.PM2_MONGODB_USER);
    config.db.pass = encodeURIComponent(process.env.PM2_MONGODB_PASS);
    config.db.host = process.env.PM2_MONGODB_HOST;
    config.db.port = process.env.PM2_MONGODB_PORT ? process.env.PM2_MONGODB_PORT : 27017;
}
else {
    config.db.host = '127.0.0.1';
    config.db.port = 27017;
}
module.exports = config;
