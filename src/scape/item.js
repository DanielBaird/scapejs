
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
function ScapeItem(scene, parentBlock, itemType, options) {

    var defaultOptions = {};
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    this._scene = scene;
    this._block = parentBlock;
    this._type = itemType;
    this._minZ = minZ;

    // TODO
    // maybe we should track multiple meshes so an item can live in multiple scenes
    this._mesh = this._createNewMesh();

};
// ------------------------------------------------------------------
// inheritance
ScapeItem.prototype = Object.create(ScapeObject.prototype);
ScapeItem.prototype.constructor = ScapeItem;
// ------------------------------------------------------------------
/**
 * Invoke a rebuild of this item.
 *
 * Discards existing cached mesh and builds a new mesh based on the
 * item type information.
 *
 * @return none
 */
ScapeItem.prototype.rebuild = function() {
    this._updateMesh();
}
// ------------------------------------------------------------------
ScapeItem.prototype._createNewMesh = function() {

    // TODO: write more code here.  Like, maybe a LOT more.

}
// ------------------------------------------------------------------
ScapeItem.prototype._addMesh = function() {
    this._scene.add(this._mesh);
}
// ------------------------------------------------------------------
ScapeItem.prototype._removeMesh = function() {
    this._scene.remove(this._mesh);
}
// ------------------------------------------------------------------
ScapeItem.prototype._updateMesh = function() {
    this._removeMesh();
    this._mesh = this._createNewMesh();
    this._addMesh();
}
// ------------------------------------------------------------------
module.exports = ScapeItem;
