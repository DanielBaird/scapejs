
var THREE = require('three');
var ScapeStuff = require('../../stuff');

var M4 = THREE.Matrix4;

var ScapeClickable = require('./clickable');
// ------------------------------------------------------------------
/** TODO: work out how to doc these addons
  * @param {object} treeParts the mesh and clickPoint collection that is a tree
  * @param {object} options the tree options
  * @param {object} internals internal calculations make by the tree-maker
  */
function ScapeSapFlowMeterAddon(treeParts, options, internals) {

	// start with standard tree meshes
	var i = internals || { meshNames: [] };

	i.diam = i.diam || 1;

	// special convenience: if options.sapflowmeter is a string,
	// use that string as the clickData and use defaults for
	// everything else.
	if (typeof options.sapflowmeter === 'string') {
		options.sapflowmeter = { clickData: options.sapflowmeter };
	}

	var s = {};

	s.name = options.sapflowmeter.name || 'sap flow meter';

	s.baseW = options.sapflowmeter.size || 1;
	s.capW = s.baseW * 1.2;
	s.baseThick = s.baseW / 2;
	s.capThick = s.baseThick * 1.1;
	s.length = s.baseW * 2;
	s.baseL = s.length * 0.6;
	s.capL = (s.length - s.baseL) / 2;
	s.height = Math.min(options.sapflowmeter.height || 3, i.trunkHeight - s.length);

	s.baseStuff = options.sapflowmeter.base || ScapeStuff.metal;
	s.capStuff = options.sapflowmeter.cap || ScapeStuff.black;

	s.clickData = options.sapflowmeter.clickData || null;

	var baseGeom = new THREE.BoxGeometry(s.baseW, s.baseThick, s.baseL);
	baseGeom.applyMatrix(new M4()
		.makeTranslation(0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.baseL/2)
	);
	var base = new THREE.Mesh(baseGeom, s.baseStuff);
	i.meshNames.push('sapflowmeterbase');
	treeParts.meshes.push(base);

	var topCapGeom = new THREE.BoxGeometry(s.capW, s.capThick, s.capL);
	topCapGeom.applyMatrix(new M4()
		.makeTranslation(0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.baseL + s.capL/2)
	);
	var topCap = new THREE.Mesh(topCapGeom, s.capStuff);
	i.meshNames.push('sapflowmetertopcap');
	treeParts.meshes.push(topCap);

	var bottomCapGeom = new THREE.BoxGeometry(s.capW, s.capThick, s.capL);
	bottomCapGeom.applyMatrix(new M4()
		.makeTranslation(0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.capL/2)
	);
	var bottomCap = new THREE.Mesh(bottomCapGeom, s.capStuff);
	i.meshNames.push('sapflowmeterbottomcap');
	treeParts.meshes.push(bottomCap);

	// clickable
	if (s.clickData) {
		var click = ScapeClickable(s.name, s.clickData, 0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.baseL/2);
		treeParts.clickPoints.push(click);
	}

	i.sapflowmeter = s;

	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeSapFlowMeterAddon;
