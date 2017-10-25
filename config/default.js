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
        'third-party': false
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
        enabled: true,
        save_statistics: true,
    },
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
