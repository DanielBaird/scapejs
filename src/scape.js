
// ------------------------------------------------------------------
var defaultOptions = {
    minX: 0,
    minY: 0,
    minZ: 0,

    maxX: 100,
    maxY: 100,
    maxZ: 20,

    blocksX: 10,
    blocksY: 10
};
// ------------------------------------------------------------------
// ------------------------------------------------------------------
function Scape(domId, field, options) {
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    // DOM element
    this.e = document.getElementById(domId);

    // DEBUG
    var $container = $(this.e);
    var containerWidth = $container.width();
    var containerHeight = $container.height();
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(containerWidth, containerHeight);
    $container.append(renderer.domElement);

};
// ------------------------------------------------------------------
// inheritance
Scape.prototype = Object.create(ScapeObject.prototype);
Scape.prototype.constructor = Scape;
// ------------------------------------------------------------------
Scape.prototype.print = function() {
    console.log(
        'scape!'
    );
}
// ------------------------------------------------------------------
