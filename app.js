var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',function(req,res){
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/log/fef', function(req, res){

  var logFn = console.log;

  var i, item, logItems = req.body.items;
  for (i = 0; i < logItems.length; i++) {
    item = logItems[i];
    if (item.level == "page") {
      console.log(item.root + " " + item.url);
    } else {
      switch (item.level) {
        case "error":
          logFn = console.error;
          break;
        case "warn":
          logFn = console.warn;
          break;
        default :
          logFn = console.log;
      }

      var level = (item.level + "  ").toUpperCase().substring(0, 5);
      var a = [item.timestamp, level, '[' + item.name + ']'];
      var b = a.concat(item.messages);
      logFn.apply(console, [b.join(' ')] );
    }
  }

  res.statusCode = 202;
  res.send();
});

// test with
// curl -H "Content-Type: application/json" -X POST -d '{"x":4,"operation":"sqrt"}' http://localhost:3000/api/math/unary

app.post('/api/math/unary', function(req, res) {
  var result;

  switch (req.body.operation) {
//		case 'abs':
//			result =  Math.abs(req.body.x);
//			break;
    case 'sqrt':
      result =  Math.sqrt(req.body.x);
      break;
    default:
      res.statusCode = 400;
  }

  res.send({result:result});
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
