
// ------------------------------------------------------------------
var THREE = require('three');
var ScapeObject = require('./baseobject');
// ------------------------------------------------------------------
/**
 * Represents an item that might appear in a Scape.
 *
 * This will create (and internally cache) a mesh based on the linked
 * item information to make rendering in WebGL faster.
 *
 * @param {ScapeScene} scene The ScapeScene the item will be added into
 * @param {Object} parentBlock The block that owns this item
 * @param {ScapeItemType} itemType Type of this item
 * @param {Object} options Various options, not currently used
 *
 * @class
 */
function ScapeItem(itemType, x, y, options) {

    var defaultOptions = {};
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    this._type = itemType;
    this._scene = null;
    this.x = x;
    this.y = y;
    this._pos = new THREE.Vector3(x, y, 0);

    // TODO: maybe have a set of meshes for each scene, so an item
    // can be in multiple scenes?
    this._createNewMeshes();

};
// ------------------------------------------------------------------
// inheritance
ScapeItem.prototype = Object.create(ScapeObject.prototype);
ScapeItem.prototype.constructor = ScapeItem;
// ------------------------------------------------------------------
ScapeItem.prototype._createNewMeshes = function() {
    this._meshes = this._type(this._opts);
    this.eachMesh(function(m) {
        m.position.copy(this._pos);
    });
}
// ------------------------------------------------------------------
ScapeItem.prototype.setHeight = function(z) {
    this._pos.setZ(z);
    this.eachMesh(function(m) {
        m.position.copy(this._pos);
    });
}
// ------------------------------------------------------------------
ScapeItem.prototype.addToScene = function(scene) {
    this.eachMesh(function(m) {
        scene.add(m);
    });
    this._scene = scene;
}
// ------------------------------------------------------------------
ScapeItem.prototype.removeFromScene = function() {
    this.eachMesh(function(m) {
        this._scene.remove(m);
    });
    this._scene = null;
}
// ------------------------------------------------------------------
ScapeItem.prototype._updateMeshes = function() {
    if (this._scene) { this.removeFromScene(this._scene); }
    this._meshes = this._createNewMeshes();
    if (this._scene) { this.addToScene(this._scene); }
}
// ------------------------------------------------------------------
// do something to each mesh
ScapeItem.prototype.eachMesh = function(callback, thisArg) {
    thisArg = thisArg || this;
    for (var m = 0; m < this._meshes.length; m++) {
        callback.call(thisArg, this._meshes[m]);
    }
}
// ------------------------------------------------------------------
module.exports = ScapeItem;
