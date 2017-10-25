var sql = require("mssql");
var dbConfig = require('../../config/db');

// connect to your database
sql.connect(dbConfig.mssqlConnection, function (err) {

  if (err) console.log(err);

});
module.exports = sql;

/*
// example call
var sql = require('mssql');
// create Request object
var request = new sql.Request();
// query to the database and get the records
request.query('SELECT * FROM INFORMATION_SCHEMA.TABLES', function (err, recordset) {

  if (err) console.log(err)

  // send records as a response
  console.log(recordset);

});
*/
