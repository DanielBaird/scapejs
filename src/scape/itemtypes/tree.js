
var THREE = require('three');
var ScapeStuff = require('../stuff');
// ------------------------------------------------------------------
/**
 * Returns a tree mesh of the specified size and color.
 * @param {Object} options used to specify properties of the tree.
 * @param {number} options.diameter=1 Diameter of trunk (a.k.a. DBH)
 * @param {number} options.height=10 Height of tree
 * @param {THREE.Material} options.trunkMaterial=ScapeStuff.wood What to make the trunk out of
 * @param {THREE.Material} options.leafMaterial=ScapeStuff.foliage What to make the foliage out of
 *
 * @param {Object} internals If supplied, this factory will save some
 *        interim calculated values into this object.  E.g.
 *        the height of the canopy, the Material the trunk is made out
 *        of, etc.  This can help another ScapeItemType factory use
 *        this as a starting point.
 * @param {Array} internals.meshNames An array of mesh names, in the
 *        same order as the mesh list returned by the function.  This
 *        allows downstream factory functions to identify meshes in
 *        order to alter them.
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeTreeFactory(options, internals) {

	var i = internals || {};

	i.diam = options.diameter || 1;
	i.height = options.height || 10;
	i.trunkStuff = options.trunk || ScapeStuff.wood;
	i.canopyStuff = options.canopy || ScapeStuff.foliage;

	i.canopyHeight = i.height / 4;
	i.trunkHeight = i.height - i.canopyHeight;
	i.trunkRadius = 2 * i.diam / 2;
	i.canopyRadius = i.trunkRadius * 6;

	i.trunkGeom = new THREE.CylinderGeometry(i.trunkRadius/2, i.trunkRadius, i.trunkHeight, 12);
	i.canopyGeom = new THREE.CylinderGeometry(i.canopyRadius, i.canopyRadius, i.canopyHeight, 12);

	// transforms we need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var trunkPosition = new THREE.Matrix4().makeTranslation(0, 0, i.trunkHeight/2);

	// center on x = 0, y = 0, but have the canopy at the top
	var canopyPosition = new THREE.Matrix4().makeTranslation(0, 0, i.canopyHeight/2 + i.height - i.canopyHeight);

	i.trunkGeom.applyMatrix(trunkPosition.multiply(rotate));
	i.canopyGeom.applyMatrix(canopyPosition.multiply(rotate));

	var trunk = new THREE.Mesh(i.trunkGeom, i.trunkStuff);
	var canopy = new THREE.Mesh(i.canopyGeom, i.canopyStuff);
	i.meshNames = ['trunk','canopy'];

	return { meshes: [trunk, canopy], clickPoints: [] };
};
// ------------------------------------------------------------------
module.exports = ScapeTreeFactory;
