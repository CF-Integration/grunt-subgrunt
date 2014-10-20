'use strict';

module.exports = function (grunt) {

  grunt.initConfig({

  });

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.registerTask('test', ['echo']);



  grunt.registerMultiTask(
    'echo',
    'Announce stuff.',
  function() {
      grunt.log.subhead('YEAH !');
  });


};
