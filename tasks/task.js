var fs = require('fs'),
    grunt = require('grunt'),
    Builder = require('./lib/gaia-builder.js');

grunt.registerTask('gaiabuilder', function() {

  var opts = this.options({
    'depends': [],
    'essentialPath': '/tmp/test-build',
    'profilePath': '/tmp/test-profile'
  });
  var done = this.async();

  if (! fs.existsSync(DEMO_PROFILE))
    fs.mkdirSync(DEMO_PROFILE);

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
  .fn(function(){
    done();
  })
  .done();
});

