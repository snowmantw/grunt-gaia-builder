var fs = require('fs'),
    grunt = require('grunt'),
    Builder = require('./lib/gaia-builder.js');

module.exports = function(grunt) {
  grunt.task.registerMultiTask('gaiabuilder', function() {

    var opts = this.options({
      'depends': [],
      'essentialPath': '/tmp/test-build',
      'profilePath': '/tmp/test-profile'
    });
    var done = this.async();

    if (! fs.existsSync(opts.profilePath))
      fs.mkdirSync(opts.profilePath);

    Builder(opts)
    .cloneEssential()
    .trace('cloneEssential')
    .makeDeps()
    .trace('makeDeps')
    .cloneDeps()
    .trace('cloneDeps')
    .buildDeps()
    .trace('buildDeps')
    .buildProfile()
    .trace('buildProfile')
    .extensions()
    .trace('extensions')
    .fn(function(){
      done();
    })
    .done();
  });
};
