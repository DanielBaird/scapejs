
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
function ScapeField(domElement, options) {
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    this._minX = this._opts.minX;
    this._minY = this._opts.minY;
    this._minZ = this._opts.minZ;

    this._maxX = this._opts.maxX;
    this._maxY = this._opts.maxY;
    this._maxZ = this._opts.maxZ;

    this._blocksX = this._opts.blocksX;
    this._blocksY = this._opts.blocksY;

    // DEBUG
    // this._blocksX = 1;
    // this._blocksY = 1;

    this._bX = (this._maxX - this._minX) / this._blocksX;
    this._bY = (this._maxY - this._minY) / this._blocksY;

    this._makeGrid();

};
// ------------------------------------------------------------------
// inheritance
ScapeField.prototype = Object.create(ScapeObject.prototype);
ScapeField.prototype.constructor = ScapeField;
// ------------------------------------------------------------------
ScapeField.prototype.print = function() {
    console.log(
        '(' + this._minX + '-' + this._maxX +
        ', ' + this._minY + '-' + this._maxY +
        ', ' + this._minZ + '-' + this._maxZ +
        ')'
    );
}
// ------------------------------------------------------------------
ScapeField.prototype._makeGrid = function() {
    this._g = [];
    for (var gx = 0; gx < this._blocksX; gx++) {
        var col = [];
        for (var gy = 0; gy < this._blocksY; gy++) {
            var square = {
                x: this._minX + (this._bX * gx),
                dx: this._bX,
                y: this._minY + (this._bY * gy),
                dy: this._bY,
                g: [{
                    z: this._maxZ,
                    dz: this._minZ,
                    material: new THREE.MeshLambertMaterial({ color: 0x999999, transparent: true, opacity: 0.2 })
                }]
            }
            col.push(square);
        }
        this._g.push(col);
    }
    // DEBUG
    console.log(this._g);
}
// ------------------------------------------------------------------
ScapeField.prototype._addGround = function(x, y, z, d) {
    // add a square of depth d, side length w.
    // the cuboid will go from x to x+w, y to y+w, and z to z-d.
}
// ------------------------------------------------------------------
ScapeField.prototype.getColumn = function(x, y) {
    // return the ground column that includes  x,y
    var gx = (x - this._minX) / this._bX;
    var gy = (y - this._minY) / this._bY;
    return (this._g[gx][gy]);
}
// ------------------------------------------------------------------
// invoke the callback each column in turn
// callback should look like: function(err, column)
// if err is null everything is fine. if err is not null, there
// was an error.
ScapeField.prototype.eachColumn = function(callback, thisArg, order) {

    if (order == undefined) {
        order = 'xup-yup';
    }
    if (thisArg == undefined) {
        thisArg = this;
    }
    if (order == 'xup-yup') {
        for (var gx = 0; gx < this._g.length; gx++) {
            for (var gy = 0; gy < this._g[0].length; gy++) {
                callback.call(thisArg, null, this._g[gx][gy]);
            }
        }
    }
}





