
var THREE = require('three');
var ScapeStuff = require('../stuff');

var M4 = THREE.Matrix4;

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
function ScapeSensorTreeFactory(options, internals) {

	// start with standard tree meshes
	var i = internals || {};
	var treeParts = ScapeTreeFactory(options, i);

	i.diam = i.diam || 1;

	// transforms we might need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// now add the extra sensors

	////////// dendro
	if (typeof options.dendrometer !== 'undefined') {
		var d = {};
		d.bandWidth = options.dendrometer.width || 0.5;
		d.bandRadius = i.trunkRadius + 0.2 * d.bandWidth;
		d.bandHeight = Math.min(options.dendrometer.height || 1.5, i.trunkHeight - d.bandWidth/2);

		d.meterRadius = d.bandWidth;
		d.meterHeight = d.bandWidth * 3;

		d.mountRadius = d.meterRadius * 1.1;
		d.mountWidth = d.meterHeight / 4;

		d.bandStuff = options.dendrometer.band || ScapeStuff.metal;
		d.mountStuff = options.dendrometer.mount || ScapeStuff.black;
		d.meterStuff = options.dendrometer.meter || ScapeStuff.metal;

		// the steel band
		var bandGeom = new THREE.CylinderGeometry(d.bandRadius, d.bandRadius, d.bandWidth, 12, 1);
		bandGeom.applyMatrix(new M4().makeTranslation(0, 0, d.bandHeight).multiply(rotate));
		var band = new THREE.Mesh(bandGeom, d.bandStuff);
		i.meshNames.push('dendrometerBand');
		treeParts.meshes.push(band);

		// the meter itself
		var meterBottomGeom = new THREE.CylinderGeometry(d.meterRadius, d.meterRadius, 0.67 * d.meterHeight, 7, 1);
		meterBottomGeom.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/6).multiply(rotate));
		var meterBottom = new THREE.Mesh(meterBottomGeom, d.meterStuff);
		i.meshNames.push('dendrometerBottom');
		treeParts.meshes.push(meterBottom);

		var meterTopGeom = new THREE.CylinderGeometry(d.meterRadius/5, d.meterRadius, 0.33 * d.meterHeight, 7, 1);
		meterTopGeom.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/2 + d.meterHeight/6).multiply(rotate));
		var meterTop = new THREE.Mesh(meterTopGeom, d.meterStuff);
		i.meshNames.push('dendrometerTop');
		treeParts.meshes.push(meterTop);

		// the mount
		var mountBandGeom = new THREE.CylinderGeometry(d.mountRadius, d.mountRadius, d.mountWidth, 7, 1);
		mountBandGeom.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.bandWidth/2 + d.mountWidth/2).multiply(rotate));
		var mountBand = new THREE.Mesh(mountBandGeom, d.mountStuff);
		i.meshNames.push('dendrometerMountBand');
		treeParts.meshes.push(mountBand);

		var mountGeom = new THREE.BoxGeometry(d.mountRadius, d.mountRadius/2, d.mountWidth);
		mountGeom.applyMatrix(new M4().makeTranslation(d.bandRadius, 0, d.bandHeight + d.bandWidth/2 + d.mountWidth/2));
		var mount = new THREE.Mesh(mountGeom, d.mountStuff);
		i.meshNames.push('dendrometerMount');
		treeParts.meshes.push(mount);

		// the dendro should be clickable
		var dendroClick = new THREE.Object3D();
		dendroClick.visible = false;
		dendroClick.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/6));
		treeParts.clickPoints.push(dendroClick);

		i.dendrometer = d;
	}
	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeSensorTreeFactory;
