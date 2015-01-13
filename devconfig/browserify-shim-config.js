// config for browserify-shim which lets use use three.js inside
// browserify modules.
module.exports = {
    'three': { exports: 'global:THREE' }
}