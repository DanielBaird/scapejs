
var THREE = require('three');
var ScapeStuff = require('../../stuff');

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

	var hoverRadius = 12;
	var clickRadius = 2;
	var lineLength = 8;

	var translate = new THREE.Matrix4().makeTranslation(x, y, z);

	// var hoverMaterial = new THREE.Material();
	// hoverMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, transparent: true, opacity: 0.33 })
	hoverMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 })
	var hoverGeom = new THREE.SphereGeometry(hoverRadius, 32, 24);
	hoverGeom.applyMatrix(translate);
	var hoverBubble = new THREE.Mesh(hoverGeom, hoverMaterial);
	hoverBubble.visible = false;
	clicker.add(hoverBubble);

	var clickMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
	clickMaterial.depthTest = false;
	var clickGeom = new THREE.SphereGeometry(clickRadius, 32, 24);
	clickGeom.applyMatrix(translate);
	var clickBubble = new THREE.Mesh(clickGeom, clickMaterial);
	clickBubble.userData.clickData = clickData;
	clicker.add(clickBubble);

	////////// identifier flag
	var ident = new THREE.Object3D();

	// name text
	var nameGeom = new THREE.TextGeometry('clicktest', {
		font: 'helvetiker',
		size: clickRadius,
		height: 0.1
	});
	nameGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(-1 * clickRadius/2, 0, lineLength + clickRadius/2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);
	var name = new THREE.Mesh(nameGeom, ScapeStuff.uiWhite);
	ident.add(name);


	// pointer
	var lineGeom = new THREE.CylinderGeometry(0.1, 0.1, lineLength);
	lineGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, lineLength / 2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);

	var line = new THREE.Mesh(lineGeom, ScapeStuff.uiWhite);
	ident.add(line);

	ident.visible = false;
	clicker.add(ident);

	clicker.visible = false;
	return clicker;
}

module.exports = ScapeClickable;