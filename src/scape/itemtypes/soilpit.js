
var THREE = require('three');
var ScapeStuff = require('../stuff');

// ------------------------------------------------------------------
/**
 * @function
 * @name ScapeItems.soilPit
 */
function ScapeSoilPitFactory(options, internals) {

	console.log('making a soil pit with ', options)

	var pit = { meshes: [], clickPoints: [] };

	var i = internals || {};
	i.meshNames = i.meshNames || [];

	i.boxS = options.size || 2;
	i.boxD = i.boxS/2;
	i.boxH = 1.5 * i.boxS; // height off ground

	i.pipeR = i.boxD/3;
	i.pipD = options.depth || 2; // pipe depth into ground
	i.pipeL = i.pipeD + i.boxH;

	i.boxStuff = options.box || ScapeStuff.plastic;
	i.pipeStuff = options.pipe || ScapeStuff.plastic;

console.log(i)

	// cylinder-upright rotation
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// the box
	i.boxG = new THREE.BoxGeometry(i.boxS, i.boxD, i.boxS);
	i.boxG.applyMatrix( new THREE.Matrix4()
		.makeTranslation(i.boxS/3, 0, i.boxH + i.boxS/2)
	);
	i.meshNames.push('box');
	pit.meshes.push(new THREE.Mesh(i.boxG, i.boxStuff));

	// the pipe
	i.pipeG = new THREE.CylinderGeometry(i.pipeR, i.pipeR, i.pipeL);
	i.pipeG.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, (i.boxH - i.pipeD)/2)
	);
	i.meshNames.push('pipe');
	pit.meshes.push(new THREE.Mesh(i.pipeG, i.pipeStuff));

	return pit;
};
// ------------------------------------------------------------------
module.exports = ScapeSoilPitFactory;
