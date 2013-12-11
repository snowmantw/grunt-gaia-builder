// For demo.
const REPO_URL = 'https://github.com/snowmantw';
const ESSENTIAL_URL = REPO_URL + '/gaia-essential.git';

var git = require('gift'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    ProfileBuilder = require('gaia-profile');

var Builder = function(opts) {
  return new Builder.o(opts);
};

Builder.o = function(opts) {
  this.__process = [];
  this.__prevResult = null;

  this.depends = opts.depends;
  if (-1 === this.depends.indexOf('system'))
    this.depends.push('system');
  this.essentialPath = opts.essentialPath;
  this.appsPath = opts.essentialPath + '/apps';
  this.profilePath = opts.profilePath;
  this.appPaths =
    this.depends.map((function(name) {
      return this.appsPath + '/' + name;
    }).bind(this));
  this.states = {
    'cloned-apps': 0,
    'built-apps': 0
  };
};

// Invoke the next step and run it with arguments.
Builder.o.prototype._next = function() {
  var step = this.__process.shift();
  step.apply(this, arguments);
};

// Clone the gaia-essential first.
Builder.o.prototype.cloneEssential = function() {
  this.__process.push(function _cloneEssential() {
    git.clone(ESSENTIAL_URL, this.essentialPath,
      (function _cloneEssentialDone(err, repo) {
        if (err)
          throw err;
        this._next(repo);
      }).bind(this));
  });
  return this;
};

Builder.o.prototype.makeDeps = function() {
  this.__process.push(function _cloneDeps() {
    this.depends.forEach((function(name, i, a) {
      // Skip this one, which would be in the gaia-essential.
      if ('system' === name)
        return;
      var appPath = this.appsPath + '/' + name;

      // Create the app path and clone it.
      fs.mkdirSync(appPath);
    }).bind(this));
    this._next();
  });
  return this;
};

Builder.o.prototype.cloneDeps = function() {
  this.__process.push(function _cloneDeps() {
    this.depends.forEach((function(name, i, a) {
      // Skip this one, which would be in the gaia-essential.
      if ('system' === name)
        return;
      var appPath = this.appsPath + '/' + name;
      var appURL = REPO_URL + '/' + name + '.git';

      git.clone(appURL, appPath,
        this._cloneRepoDone.bind(this));
    }).bind(this));
  });
  return this;
};

// One repo clone done.
Builder.o.prototype._cloneRepoDone = function(err) {
  if (err)
    throw err;
  this.states['cloned-apps'] += 1;
  var numRepos = -1 === this.depends.indexOf('system')
               ? this.depends.length 
               : this.depends.length - 1;
  if (numRepos == this.states['cloned-apps'])
    this._next();
};

// After all clone done, build them.
Builder.o.prototype.buildDeps = function() {
  this.__process.push(function _buildDeps() {
    this.depends.forEach((function(name, i, a) {
      // Skip this one, which would be in the gaia-essential.
      if ('system' === name)
        return;
      var appPath = this.appsPath + '/' + name;
      var spawn = require('child_process').spawn,
          inst = spawn('npm', ['install'], {cwd: appPath});

      inst.stdout.on('data', function(data){
      });
      inst.stderr.on('data', function(data){
      });

      var _next = this._buildDone.bind(this);

      inst.on('close', function(code) {

        var grnt = spawn('grunt', ['merge'], {cwd: appPath});
        grnt.stdout.on('data', function(data){
        });
        grnt.stderr.on('data', function(data){
          console.log(data);
        });
        grnt.on('close', function(codeG){
          _next();
        });

        grnt.on('exit', function(codeG){
        });
      });

      inst.on('exit', function() {
      });
    }).bind(this));
  });
  return this;
};

Builder.o.prototype._buildDone = function() {
  this.states['built-apps'] += 1;
  var numRepos = -1 === this.depends.indexOf('system')
               ? this.depends.length 
               : this.depends.length - 1;
  if (numRepos == this.states['built-apps'])
    this._next();
};

Builder.o.prototype.buildProfile = function() {
  this.__process.push(function _buildProfile() {
    var buildCommand = (function(module) {
      return ProfileBuilder.build(module)
        .xpcshell(this.essentialPath + '/xulrunner-sdk-26/xulrunner-sdk/bin/XUL.framework/Versions/Current/xpcshell')
        .runMozilla(this.essentialPath + '/xulrunner-sdk-26/xulrunner-sdk/bin/XUL.framework/Versions/Current/run-mozilla.sh')
        .buildModulePath(this.essentialPath + '/build')
        .xpcshellCommonjs(this.essentialPath + '/build/xpcshell-commonjs.js')
        .done()
      .config()
        .path()
          .gaia(this.essentialPath)
          .profile(this.profilePath)
          .distribution(this.essentialPath + '/distribution')
          .apps(this.appPaths)
          .locales('locales')
          .localesFile('shared/resources/languages.json')
        .done()
      .get()
      .run();
    }).bind(this);

    var finalCommand = "#!/bin/bash\n";

    // Need these to make the profile.
    ['preferences', 'settings', 'webapp-manifests',
     'webapp-optimize', 'webapp-zip', 'additional-extensions'].forEach(function(module) {
      finalCommand = finalCommand + '\n' + buildCommand(module);
     });

    var _next = this._next.bind(this);

    // Write a executable file.
    fs.writeFile('./make-xpcshell.sh', finalCommand, {'mode': 511}, function (err) {
     if (err) throw err;
      var spawn = require('child_process').spawn,
          make = spawn('./make-xpcshell.sh', []);

      make.stdout.on('data', function(data){
      });
      make.stderr.on('data', function(data){
      });
      make.on('close', function(code) {
        _next();
      });
    });
  });
  return this;
};

Builder.o.prototype.fn = function(fn) {
  this.__process.push(fn);
  return this;
};

Builder.o.prototype.done = function() {
  this.__process.push(function(){
    // Finailize.
  });
  this._next();
};

Builder.o.prototype.trace = function(msg) {
  this.__process.push(function() {
    console.log(msg);
    this._next();
  });
  return this;
};

module.exports = Builder;
