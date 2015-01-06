
// ------------------------------------------------------------------
// ------------------------------------------------------------------
function ScapeField(options) {

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

    this.wX = this.maxX - this.minX;
    this.wY = this.maxY - this.minY;
    this.wZ = this.maxZ - this.minZ;

    // DEBUG
    // this.blocksX = 1;
    // this.blocksY = 1;

    this._bX = this.wX / this.blocksX;
    this._bY = this.wY / this.blocksY;

    this._calcCenter();
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
                dx: this._bX * 0.95,
                y: this.minY + (this._bY * gy),
                dy: this._bY * 0.95,
                g: [{
                    z: this.maxZ,
                    dz: this.wZ,
                    m: material
                }],
                object: null
            }
            col.push(square);
        }
        this._g.push(col);
    }
}
// ------------------------------------------------------------------
/**
 * Add a ground stack at x,y, starting at height z.
 * The stack is an array of two-element arrays, like this:
 * [
 *     ['leaflitter', 0.3],
 *     ['dirt', 3.5],
 *     ['stone', 4]
 * ]
 * which puts a leaflitter layer 0.3 units deep on a 3.5-unit
 * deep dirt layer, which is on a stone layer.  If the final
 * layer's depth is zero, that layer is assumed to go all the
 * way to minZ.
 */
ScapeField.prototype.addGround = function(x, y, z, stack) {

}
// ------------------------------------------------------------------
ScapeField.prototype._calcGround = function() {
}
// ------------------------------------------------------------------
ScapeField.prototype._calcCenter = function() {
    // calculate the centre of the field and record it as .center
    this.center = new THREE.Vector3(
        (this.minX + this.maxX) / 2,
        (this.minY + this.maxY) / 2,
        (this.minZ + this.maxZ) / 2
    );
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
// callback should look like: function(err, column) { ... }
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





