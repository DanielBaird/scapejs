
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
function ScapeField(options) {
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    this.minX = this._opts.minX;
    this.minY = this._opts.minY;
    this.minZ = this._opts.minZ;

    this.maxX = this._opts.maxX;
    this.maxY = this._opts.maxY;
    this.maxZ = this._opts.maxZ;

    this.blocksX = this._opts.blocksX;
    this.blocksY = this._opts.blocksY;

    // DEBUG
    // this.blocksX = 1;
    // this.blocksY = 1;

    this._bX = (this.maxX - this.minX) / this.blocksX;
    this._bY = (this.maxY - this.minY) / this.blocksY;

    this._makeGrid();

};
// ------------------------------------------------------------------
// inheritance
ScapeField.prototype = Object.create(ScapeObject.prototype);
ScapeField.prototype.constructor = ScapeField;
// ------------------------------------------------------------------
ScapeField.prototype.print = function() {
    console.log(
        '(' + this.minX + '-' + this.maxX +
        ', ' + this.minY + '-' + this.maxY +
        ', ' + this.minZ + '-' + this.maxZ +
        ')'
    );
}
// ------------------------------------------------------------------
ScapeField.prototype._makeGrid = function() {
    this._g = [];
    for (var gx = 0; gx < this.blocksX; gx++) {
        var col = [];
        for (var gy = 0; gy < this.blocksY; gy++) {
            var material = new THREE.MeshLambertMaterial({
                color: 0x999999,
                transparent: true,
                opacity: 0.2
            });

            var square = {
                x: this.minX + (this._bX * gx),
                dx: this._bX * 0.9,
                y: this.minY + (this._bY * gy),
                dy: this._bY * 0.9,
                g: [{
                    z: this.maxZ,
                    dz: this.minZ,
                    m: material
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
    var gx = (x - this.minX) / this._bX;
    var gy = (y - this.minY) / this._bY;
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





