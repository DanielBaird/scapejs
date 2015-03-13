
var THREE = require('three');
var ScapeStuff = require('../stuff');

var ScapeTreeFactory = require('./tree.js');
// ------------------------------------------------------------------
/**
 * Returns a tree mesh of the specified size and color, with added
 * sensors attached.
 * @param {Object} options used to specify properties of the tree.
 * @param {number} options.diameter=1 Diameter of trunk (a.k.a. DBH)
 * @param {number} options.height=10 Height of tree
 * @param {THREE.Material} options.trunkMaterial=ScapeStuff.wood What to make the trunk out of
 * @param {THREE.Material} options.leafMaterial=ScapeStuff.foliage What to make the foliage out of
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeSensorTreeFactory(options) {

	// start with standard tree meshes
	var treeParts = ScapeTreeFactory(options);

	// extract some tree info
	var diam = options.diameter || 1;

	// now add the extra sensors

	////////// dendro
	if (options.dendrometer) {
		var bandWidth = options.dendrometer.width || 1;
		var bandStuff = options.dendrometer.band || ScapeStuff.metal;
		var mountStuff = options.dendrometer.mount || ScapeStuff.black;
		var meterStuff = options.dendrometer.meter || ScapeStuff.plastic;

		var bandGeom = new THREE.CylinderGeometry(diam/2, ringR, ringH, 12, 1, true);
		ringGeom.applyMatrix(new M4().makeTranslation(0, 0, towerHeight - ringH/2).multiply(cylinderRotate));
		ringStuff.side = THREE.DoubleSide;
		craneParts.push(new THREE.Mesh(ringGeom, ringStuff));

	}

	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeSensorTreeFactory;
