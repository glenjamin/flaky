var _ = require('lodash');

var express = require('express');
var app = express();

app.enable('trust proxy');

app.set('port', process.env.PORT || 3000);

function shouldFail() {
    return (Math.random() * 20 < 1);
}

app.use(function sometimesFail(req, res, next) {
    if (shouldFail()) {
        console.log("Breaking connection");
        req.socket.destroy();
        res.socket.destroy();
    } else {
        next();
    }

})
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.errorHandler());

var realsend = app.response.send;
app.response.send = function(body) {
    if (arguments.length == 2) {
        this.statusCode = body;
        body = arguments[1];
    }
    var type = this.get('Content-Type') || "";
    if (~type.indexOf('application/json') && shouldFail()) {
        console.log("Breaking json");
        body = 'This is not json. sux 2 be u ' + body;
    }

    return realsend.call(this, body);
}

function jsonOnly(req, res, next) {
    if (!req.body || _.isEmpty(req.body)) {
        res.json(415, {"error": "No json, did you set Content-Type?"})
    } else {
        next();
    }

}

app.get("/", function(req, res) {
    res.sendfile('./index.txt')
})

var auth = require('./lib/authentication')('/login', 'minutes', 30);
app.post("/login", jsonOnly, auth.login);

var files = require('./lib/files')();
app.get("/list", auth.protect, function(req, res) {
    res.json(files.sample(5).map(function(id) {
        return "/files/" + id;
    }))
})
app.get("/files/:id", auth.protect, function(req, res) {
    files.stream(req.params.id).pipe(res);
})
app.post("/verify", auth.protect, jsonOnly, function(req, res, next) {
    files.verify(req.body, function(err, results) {
        if (err) return next(err);

        res.json(_.all(results) ? 200 : 400, results);
    })
})

require('http').createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
