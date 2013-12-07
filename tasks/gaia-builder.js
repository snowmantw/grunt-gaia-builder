// For demo.
const REPO_URL = 'https://github.com/snowmantw';
const ESSENTIAL_URL = REPO_URL + '/gaia-essential.git';

var git = require('nodegit'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    profileBuilder = require('gaia-profile');

var Builder = function(opts) {
  return new Builder.o(opts);
};

Builder.o = function(opts) {
  this.__process = [];
  this.__prevResult = null;

  this.depends = opts.depends;
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
    git.Repo.clone(ESSENTIAL_URL, this.essentialPath, null,
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

      git.Repo.clone(appURL, appPath, null,
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
  if (this.depends.length == this.states['cloned-apps'])
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
          grnt = spawn('grunt', ['merge', '--verbose'], {cwd: appPath}),
          inst = spawn('npm', ['install', '--dev'], {cwd: appPath});

      grnt.stdout.on('data', function(data){
      });
      grnt.stderr.on('data', function(data){
        console.log('grnt', data.toString());
      });
      inst.stdout.on('data', function(data){
      });
      inst.stderr.on('data', function(data){
        console.log('npm ', data.toString());
      });

      var _next = this._buildDone.bind(this);

      inst.on('close', function(code) {
        grnt.on('close', function(codeG){
          _next();
        });
      });
    }).bind(this));
  });
  return this;
};

Builder.o.prototype._buildDone = function() {
  this.states['built-apps'] += 1;
  if (this.depends.length == this.states['built-apps'])
    this._next();
};

Builder.o.prototype.buildProfile = function() {
  this.__process.push(function _buildProfile() {
    var buildCommand = (function(module) {
      return ProfileBuilder.build(module)
        .xpcshell(this.essentialPath + '/xulrunner-sdk-26/xulrunner-sdk/bin/XUL.framework/Versions/Current/xpcshell')
        .runMozilla('xulrunner-sdk-26/xulrunner-sdk/bin/XUL.framework/Versions/Current/run-mozilla.sh')
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
     'webapp-optimize', 'webapp-zip'].forEach(function(module) {
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
        console.log('EEE: ', data);
      });
      make.on('close', function(code) {
        console.log('build done');
        _next();
      });
    });
  });
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
