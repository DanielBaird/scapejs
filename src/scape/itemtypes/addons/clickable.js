
var THREE = require('three');

// ------------------------------------------------------------------
/**
 * Returns a Clickable object.
 * @param {Object} options used to specify properties of the tree.
 * @param {number} options.diameter=1 Diameter of trunk (a.k.a. DBH)
 * @param {number} options.height=10 Height of tree
 * @param {THREE.Material} options.trunkMaterial=ScapeStuff.wood What to make the trunk out of
 * @param {THREE.Material} options.leafMaterial=ScapeStuff.foliage What to make the foliage out of
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeClickable(clickData, x, y, z) {
	var clicker = new THREE.Object3D();

	var translate = new THREE.Matrix4().makeTranslation(x, y, z);

	// var hoverMaterial = new THREE.Material();
	// hoverMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, transparent: true, opacity: 0.33 })
	hoverMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 })
	var hoverGeom = new THREE.SphereGeometry(10);
	hoverGeom.applyMatrix(translate);
	var hoverBubble = new THREE.Mesh(hoverGeom, hoverMaterial);
	// hoverBubble.visible = false;
	clicker.add(hoverBubble);

	var clickMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
	clickMaterial.depthTest = false;
	var clickGeom = new THREE.SphereGeometry(2);
	clickGeom.applyMatrix(translate);
	var clickBubble = new THREE.Mesh(clickGeom, clickMaterial);
	clickBubble.userData.clickData = clickData;
	clicker.add(clickBubble);

	clicker.visible = false;

	return clicker;
}

module.exports = ScapeClickable;