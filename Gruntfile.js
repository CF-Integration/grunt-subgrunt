'use strict';

module.exports = function (grunt) {

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js'
      ],
      options: {
        jshintrc: '.jshintrc',
      }
    },

    watch: {
      jsValidate: {
        files: [
          'Gruntfile.js',
          'tasks/*.js'
        ],
        tasks: ['jshint']
      }
    }
  });
  // Load the plugins
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.registerTask('default', ['watch']);


};

