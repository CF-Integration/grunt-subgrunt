'use strict';

module.exports = function (grunt) {
  require('./tasks/subgrunt.js')(grunt);

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        'tests/*.js'
      ],
      options: {
        jshintrc: '.jshintrc',
      }
    },

    watch: {
      jsValidate: {
        files: [
          'Gruntfile.js',
          'tasks/*.js',
          'tests/*.js'
        ],
        tasks: ['jshint', 'test']
      }
    },

    subgrunt: {
      test: {
        // The npm devDependencies will be cleaned out after running the grunt tasks.
        options: {
          commands: {
            // 'svn': 'up',
            // 'npm': 'up'
          }
        },
        projects: {
          './tests': ['test']
        }
      },
    }
  });
  // Load the plugins
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('test', ['subgrunt:test']);


};

