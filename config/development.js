config = {
    'db': {
        database: process.env.PM2_MONGODB_DATABASE ? process.env.PM2_MONGODB_DATABASE : 'planvet_dev',
        debug: true

    },
    log: {
        type: 'console',
        'loglevel': 'debug',
    },
};
module.exports = config;
