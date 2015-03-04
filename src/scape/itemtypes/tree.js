
var THREE = require('three');
// ------------------------------------------------------------------
/**
 * Returns a tree mesh of the specified size and color.
 * @param {number} trunkDiameter Diameter of trunk (a.k.a. DBH)
 * @param {number} height Height of tree
 * @param {THREE.Material} trunkMaterial What to make the trunk out of
 * @param {THREE.Material} leafMaterial What to make the foliage out of
 * @param {Object} options Not used.
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeCubeFactory(trunkDiameter, height, trunkMaterial, leafMaterial, options) {

	var geom = new THREE.CylinderGeometry(trunkDiameter/10, trunkDiameter/2, height);

	// transform it up a bit:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);
	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var translate = new THREE.Matrix4().makeTranslation(0,0,height/2);

	geom.applyMatrix(translate.multiply(rotate));

	return new THREE.Mesh(geom, trunkMaterial);
};
// ------------------------------------------------------------------
module.exports = ScapeCubeFactory;
