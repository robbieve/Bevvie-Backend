logfile = path.join(__dirname, '../logs/api');

config = {
    'db': {
        database: process.env.PM2_MONGODB_DATABASE ? process.env.PM2_MONGODB_DATABASE : 'bevvie_dev',
        debug: true

    },
    log: {
        type: 'file',
        filename: logfile,
        'loglevel': 'debug',
    }
};
module.exports = config;
