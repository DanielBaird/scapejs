
var THREE = require('three');

function ScapeCube(size, options) {
    // construct a mesh "sitting on" the point 0,0,0
    size = size || 1;

    // makes a cube centered on 0,0,0
    var geom = new THREE.BoxGeometry(size, size, size);

    // transform it up a bit, so we're centered on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0.
    geom.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, size/2) );

    return geom;
};
// ------------------------------------------------------------------
makeGeometry = function(size) {
};


module.exports = ScapeCube;
