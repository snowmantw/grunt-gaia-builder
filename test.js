var Builder = require('./tasks/gaia-builder.js');

Builder({ 'depends': ['gaia-calendar']
        , 'essentialPath': '/tmp/essential-build'
        , 'profilePath': '/tmp/profile'})
.cloneEssential()
.trace('cloneEssential')
.makeDeps()
.trace('makeDeps')
.cloneDeps()
.trace('cloneDeps')
.buildDeps()
.trace('buildDeps')
.done()
