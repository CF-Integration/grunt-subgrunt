'use strict';

var
    async = require('async'),
    glob = require('glob'),
    _ = require('underscore'),
    q = require("kew")
;

module.exports = function (grunt) {


    var determineSuccess = function(command, args){
        var deferred = q.defer();
        return function(status){
            var _command = command + ' ' + args.join(' ');
            if (status.err || status.code > 0) {
                status.command = _command;
                // grunt.fail.warn('Failed running "' + _command + '" in "' + status.path + '".');
                deferred.reject(status);
            } else {
                // grunt.log.ok('Ran "' + _command + '" in "' + status.path + '".');
                deferred.resolve(command, args);
            }
            return deferred;
        };
    };

    var outputReport = function(type){
        switch(type){
            case 'fail':
            return function(datas){
                grunt.fail.warn('Failed running "' + datas.cmd + ' ' + datas.args.join(' ') + '" in "' + datas.path + '".');
            }
            break;
            case 'success':
            default:
            return function(datas){
                grunt.log.ok('Ran "' + datas.cmd + ' ' + datas.args.join(' ') + '" in "' + datas.path + '".');
            }
            break;
        }
    };

    var runNpmInstall = function (path, options) {
        var deferred = q.defer();
        grunt.util.spawn({
            cmd: options.npmPath,
            args: [ 'install' ],
            opts: { cwd: path, stdio: 'inherit' }
        }, function (err, result, code) {
            var _resolv = determineSuccess(options.npmPath, 'install')({
                'err' : err,
                'result' : result,
                'code' : code,
                'path' : path
            });
            var infos = {
                'cmd'       : options.command,
                'args'      : options.args,
                'err'       : err,
                'result'    : result,
                'code'      : code,
                'path'      : path
            };
            _resolv.then(function(status){ return deferred.resolve(infos); });
            _resolv.fail(function(status){ return deferred.reject(infos); });
            return _resolv;
        });

        return deferred;
    };

    var runNpmClean = function (path, options) {
        var deferred = q.defer();

        // Requires npm >= 1.3.10!

        grunt.util.spawn({
            cmd: options.npmPath,
            args: [ 'prune', '--production' ],
            opts: { cwd: path, stdio: 'inherit' }
        }, function (err, result, code) {
            var _resolv = determineSuccess(options.npmPath, 'prune --production')({
                'err' : err,
                'result' : result,
                'code' : code,
                'path' : path
            })
            var infos = {
                'cmd'       : options.command,
                'args'      : options.args,
                'err'       : err,
                'result'    : result,
                'code'      : code,
                'path'      : path
            };
            _resolv.then(function(status){ return deferred.resolve(infos); });
            _resolv.fail(function(status){ return deferred.reject(infos); });
            return _resolv;
        });

        return deferred;
    };

    var runCommand = function (path, options){
        var deferred = q.defer();

        options.path =  path;

        grunt.util.spawn({
            cmd: options.command,
            args: options.args,
            opts: { cwd: path, stdio: 'inherit' }
        }, function (err, result, code) {
            var _resolv = determineSuccess(options.command, options.args)({
                'err' : err,
                'result' : result,
                'code' : code,
                'path' : path
            });
            var infos = {
                'cmd'       : options.command,
                'args'      : options.args,
                'err'       : err,
                'result'    : result,
                'code'      : code,
                'path'      : path
            };
            _resolv.then(function(status){ return deferred.resolve(infos); });
            _resolv.fail(function(status){ return deferred.reject(infos); });
            return _resolv;
        });

        return deferred;
    };

    var runGruntTasks = function (path, options) {
        var deferred = q.defer();
        var args = options.passGruntFlags ? grunt.option.flags().concat(options.tasks) : options.tasks;
        grunt.util.spawn({
            grunt: true,
            args: args,
            opts: { cwd: path, stdio: 'inherit' }
        }, function (err, result, code) {
            return determineSuccess('grunt', args)({
                'err' : err,
                'result' : result,
                'code' : code,
                'path' : path
            })
            .then(function(){ return deferred.resolve(path, options); })
            .fail(function(status){ return deferred.reject(status); })
            ;
        });

        return deferred;
    };



    grunt.registerMultiTask('subgrunt', 'Run sub-projects\' grunt tasks.', function () {
        var cb = this.async();
        var options = this.options({
            npmInstall: false,
            npmClean: false,
            npmPath: 'npm',
            passGruntFlags: true,
            limit: Math.max(require('os').cpus().length, 2)
        });

        var projects = this.data.projects || this.data;

        if (projects instanceof Array) {
            var res = {};
            projects.forEach(function (el) {
                res[el] = 'default';
            });
            projects = res;
        }

        async.eachLimit(Object.keys(projects), options.limit, function (path, next) {
            var tasks = projects[path];
            if (!(tasks instanceof Array)) {
                tasks = [tasks];
            }

            glob('Gruntfile.{js,coffee}', {
                nocase: true,
                cwd: path
            }, function (err, files) {
                if (err || !files.length) {
                    grunt.fail.warn('The "' + path + '" directory is not valid, or does not contain a Gruntfile.');
                    return next();
                }

                options.tasks = tasks;

                if( _.size(options.preCommands) > 0 || _.size(options.postCommands) > 0 ) {

                    var _prepromises = [];
                    if( _.size(options.preCommands) > 0){
                        _(options.preCommands).each( function(args, command) {
                            if(_(args).isArray()){
                                _(args).each( function( subargs ) {
                                    var _prems = runCommand(path,{'command': command, 'args': [subargs]});
                                    _prems.done(outputReport('success'));
                                    _prems.fail(outputReport('fail'));
                                    _prepromises.push(_prems);
                                })
                            } else {
                                var _prems = runCommand(path,{'command': command, 'args': [args]});
                                _prems.done(outputReport('success'));
                                _prems.fail(outputReport('fail'));
                                _prepromises.push(_prems);
                            }
                        });
                    }else {
                        _prepromises.push(Q.resolve());
                    }
                    q.all(_prepromises)
                    .then(function(){
                        var gruntPromise = runGruntTasks(path, options);
                        if( _.size(options.postCommands) > 0){
                            gruntPromise.done(function(){
                                _(options.postCommands).each( function(args, command) {
                                    if(_(args).isArray()){
                                        _(args).each( function( subargs ) {
                                            var _prems = runCommand(path,{'command': command, 'args': [subargs]});
                                            _prems.done(outputReport('success'));
                                            _prems.fail(outputReport('fail'));
                                        })
                                    } else {
                                        var _prems = runCommand(path,{'command': command, 'args': [args]});
                                        _prems.done(outputReport('success'));
                                        _prems.fail(outputReport('fail'));
                                    }
                                });
                            });
                        }
                    });


                } else {
                    if (options.npmInstall) {
                        return runNpmInstall(path, options)
                        .then(function(path, options){
                            return runGruntTasks(path, options)
                            .then(function(path, options){
                                if(options.npmClean){
                                    return runNpmClean(path, options);
                                }
                                return null;
                            });
                        });
                    }
                    else {
                        return runGruntTasks(path, options);
                    }
                }
            });
        }, cb);
    });
};
