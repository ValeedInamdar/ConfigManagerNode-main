var express = require('express');
var app = express();
var port = 3000;
var bodyParser = require('body-parser');
var authenticate = require("./src/routes/authentication")
var migration = require("./src/routes/migration")
var mail = require("./src/routes/mail")

// Configuring body parser middleware - for parsing the incoming request bodies in a middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//middleware headers
var corsMiddleware = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, PATCH, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization, Origin, X-Requested-With, Content-Type, Accept');
  next();
}
app.use(corsMiddleware);

//auth routes like login
app.use(`/auth`, authenticate);
app.use(`/migData`, migration);
app.use(`/mail`, mail);


var server = app.listen(port, function () {
  console.log('Express server listening on port ' + server.address().port);
});
