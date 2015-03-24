
var THREE = require('three');
var ScapeStuff = require('../stuff');

// ------------------------------------------------------------------
/**
 * @function
 * @name ScapeItems.label
 */
function ScapeLabelFactory(options, internals) {

	var label = { meshes: [], clickPoints: [] };

	var i = internals || {};
	i.meshNames = i.meshNames || [];

	i.x = options.x || 0;
	i.y = options.y || 0;
	i.z = options.z || 0;
	i.offset = options.offset || new THREE.Matrix4();

	i.labelText = options.text;
	i.textSize = options.size || 2;
	i.textWidth = i.textSize / 10;

	i.lineRadius = i.textWidth / 2;
	i.lineLength = options.height || Math.max(8, i.textSize);

	i.textStuff = options.letters || ScapeStuff.uiWhite;
	i.lineStuff = options.pointer || i.textStuff;

	var translate = new THREE.Matrix4().makeTranslation(i.x, i.y, i.z).multiply(i.offset);

	// text for the label
	var nameGeom = new THREE.TextGeometry(i.labelText, {
		font: 'helvetiker',
		size: i.textSize,
		height: 0.1
	});
	nameGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(-1 * i.textSize/3, 0, i.lineLength + i.textSize/2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);
	i.meshNames.push('labeltext');
	label.meshes.push(new THREE.Mesh(nameGeom, i.textStuff));

	// pointer
	var lineGeom = new THREE.CylinderGeometry(i.lineRadius, i.lineRadius, i.lineLength);
	lineGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, i.lineLength / 2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);
	i.meshNames.push('labelpointer');
	label.meshes.push(new THREE.Mesh(lineGeom, i.lineStuff));

	return label;
};
// ------------------------------------------------------------------
module.exports = ScapeLabelFactory;
