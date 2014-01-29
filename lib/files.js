var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var _ = require('lodash');
var async = require('async');
var glob = require('glob');
var concat = require('concat-stream');

module.exports = function() {
    var files = glob.sync("../node_modules/**/*.js", { cwd: __dirname })
        .map(function(filename) {
            return path.join(__dirname, filename);
        });
    var hashes = {}

    function buildHash(id, callback) {
        callback = callback || function(){}

        if (id in hashes) {
            return process.nextTick(_.partial(callback, null, hashes[id]))
        }

        var md5 = crypto.createHash('md5', { encoding: 'hex' });
        stream(id).pipe(md5).pipe(concat(function(data) {
            hashes[id] = data;
            callback(null, data);
        }));
    }

    function stream(id) {
        return fs.createReadStream(files[id]);
    }

    return {
        sample: function(n) {
            var chosen = _.sample(_.range(files.length), n)
            chosen.map(function(id) { buildHash(id) });
            return chosen;
        },
        stream: stream,
        verify: function(fileHashes, callback) {
            var ids = _.keys(fileHashes)
            var inputHashes = _.values(fileHashes)
            async.map(ids, buildHash, function(err, realHashes) {
                if (err) return callback(err)

                var results = {}
                _.each(ids, function(id, i) {
                    results[id] = (inputHashes[i] == realHashes[i])
                })

                callback(null, results)
            })
        }
    }
}
