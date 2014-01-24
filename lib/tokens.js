var _ = require('lodash');
var moment = require('moment');
var randomstring = require("randomstring").generate;

module.exports = function(header, expiryUnit, expiryNum) {
    var tokens = {};
    var approvedTokens = {};

    function expunge() {
        var cutoff = moment().subtract(expiryUnit, expiryNum);
        _.each(tokens, function(expiry, token) {
            if (expiry.isBefore(cutoff)) {
                delete tokens[token];
                delete approvedTokens[token];
            }
        })
    }

    return {
        has: function has(req) {
            return !!req.get(header);
        },

        valid: function valid(req) {
            expunge();
            return (req.get(header) in tokens);
        },

        approved: function approved(req) {
            expunge();
            var token = req.get(header)
            return (token in tokens) && (token in approvedTokens);
        },

        add: function add(res) {
            var token = randomstring();
            tokens[token] = moment();
            res.set(header, token);
        },

        approve: function approve(req) {
            token = req.get(header);
            tokens[token] = moment();
            approvedTokens[token] = true;
        }
    }
}
