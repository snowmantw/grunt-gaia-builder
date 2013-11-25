var git = require('nodegit'),
    fs = require('fs'),
    os = require('os'),
    path = require('path');

module.exports = function (grunt) {

  var repoURL = 'https://github.com/snowmantw/'
  grunt.registerTask('gaiabuilder', 'Build a customable and runnable Gaia environment.', function gb_runTask() {
    var done = this.async();
    var options = this.options({
      depends: [],
      targetDir: ''
    });

    var depends = options.depends;
    delete options.depends;

    var targetDir = options.targetDir;
    delete options.targetDir;

    if ('' === targetDir)
      targetDir = os.tmpdir();

    var targetDir = path.resolve(targetDir);
    var appsDir = targetDir + '/apps';

    // Waiting cloning to fill this.
    var appPaths = [];
    var depLength = depends.length;
    depends.forEach(function (name, i, a) {
      var url = repoURL + name + '.git';
      var targetPath = appsDir + '/' + name;
      appPaths.push(targetPath);
      fs.mkdir(targetDir, function afterCreateOrNot(){
        fs.exists(targetPath, function cloneOrNot(exists) {
          if (exists) {
            depLength -= 1;
            if (0 === depLength)
              cloneAllFinished(appPaths);
          } else {
            git.Repo.clone(url, targetPath, null, function cloneDone(error, repo) {
              grunt.verbose.writeflags(url, 'Clone Gaia app done');
              if (error)
                throw error;

              depLength -= 1;
              if (0 === depLength)
                cloneAllFinished(appPaths);
            });
          }
        });
      });
    })

    // Give directories to execute npm install,
    // which should trigger grunt, bower and other post-install things automatically.
    var cloneAllFinished = function _cloneAllFinished(paths) {
      var appLength = paths.length;
      paths.forEach(function doTask(appPath, i, a) {
        var spawn = require('child_process').spawn,
            inst = spawn('npm', ['install', '--save-dev'], {cwd: appPath});
        inst.stdout.on('data', function(data){
        });
        inst.stderr.on('data', function(data){
        });
        inst.on('close', function(code) {
          grunt.verbose.writeflags(appPath, 'Install app');
          appLength -= 1;
          if (0 === appLength)
            done();
        });
      });
    };
  });
};
