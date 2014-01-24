module.exports = function authentication(loginUrl, expiryUnit, expiryNum) {

    var tokens = require('./tokens')('X-Auth-Token', expiryUnit, expiryNum);

    function authenticator(req, res, next) {
        if (tokens.approved(req)) {
            return next()
        }
        tokens.add(res);
        res.redirect(401, loginUrl)
    }

    function login(req, res) {
        if (!tokens.has(req)) {
            res.json(400, {"error": "no token"})
        } else if (!tokens.valid(req)) {
            res.json(401, {"error": "invalid/expired token"})
        } else if (req.body.password == 'supersecret') {
            tokens.approve(req);
            res.json(200, {"result": "valid for "+expiryNum+" "+expiryUnit})
        } else {
            res.json(401, {"error": "bad password"})
        }
    }

    return {
        protect: authenticator,
        login: login
    };
}
