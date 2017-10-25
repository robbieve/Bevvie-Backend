module.exports = function(app){
    if (process.env.mode !== 'production') {
    app.use(require('./dev_logger'));
  }
  app.use(require('./client_error'));
  app.use(require('./front_error_handler'));
};
