module.exports = function(app){
  // Static
  let express = require('express');
  app.use(express.static('public'));
  app.get('/',function(request,response){
    response.redirect(301,'/doc')
  })

};
