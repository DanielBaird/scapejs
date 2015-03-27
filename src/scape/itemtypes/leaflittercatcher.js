
var THREE = require('three');
var ScapeStuff = require('../stuff');
var ScapeClickable = require('./addons/clickable');

// ------------------------------------------------------------------
/**
 * @function
 * @name ScapeItems.leafLitterCatcher
 */
function ScapeLeafLitterCatcherFactory(options, internals) {

	var catcher = { meshes: [], clickPoints: [] };

	var i = internals || {};
	i.meshNames = i.meshNames || [];

	i.name = options.name || 'leaf litter trap';

	i.height = options.height || 2;
	i.width = options.width || 0.8 * i.height;
	i.ringW = i.height / 6;
	i.poleR = i.width / 20;
	i.poleH = i.height - i.ringW/2;
	i.netR = i.width/2 - i.poleR;
	i.netL = 0.7 * i.height;

	i.poleStuff = options.poles || ScapeStuff.metal;
	i.ringStuff = options.ring || i.poleStuff;
	i.netStuff = options.net || ScapeStuff.shadecloth;

	// cylinder-upright rotation
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// net
	i.netG = new THREE.CylinderGeometry(i.netR, i.netR/20, i.netL, 13, 1, true); // true = open ended
	i.netG.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, i.height - i.netL/2)
		.multiply(rotate)
	);
	i.meshNames.push('net');
	i.netStuff.side = THREE.DoubleSide;
	catcher.meshes.push(new THREE.Mesh(i.netG, i.netStuff));

	// net above ring
	i.netRingG = new THREE.CylinderGeometry(i.netR * 1.01, i.netR * 1.01, i.ringW/2, 13, 1, true); // true = open ended
	i.netRingG.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, i.height - i.ringW/4)
		.multiply(rotate)
	);
	i.meshNames.push('netring');
	catcher.meshes.push(new THREE.Mesh(i.netRingG, i.netStuff));

	// ring
	i.ringG = new THREE.CylinderGeometry(i.netR, i.netR, i.ringW, 13, 1, true); // true = open ended
	i.ringG.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, i.height - i.ringW/2)
		.multiply(rotate)
	);
	i.meshNames.push('ring');
	catcher.meshes.push(new THREE.Mesh(i.ringG, i.ringStuff));

	// left pole
	i.leftPoleG = new THREE.CylinderGeometry(i.poleR, i.poleR, i.poleH, 5);
	i.leftPoleG.applyMatrix( new THREE.Matrix4()
		.makeTranslation(i.width/-2, 0, i.poleH/2)
		.multiply(rotate)
	);
	i.meshNames.push('leftPole');
	catcher.meshes.push(new THREE.Mesh(i.leftPoleG, i.poleStuff));

	// right pole
	i.rightPoleG = new THREE.CylinderGeometry(i.poleR, i.poleR, i.poleH, 5);
	i.rightPoleG.applyMatrix( new THREE.Matrix4()
		.makeTranslation(i.width/2, 0, i.poleH/2)
		.multiply(rotate)
	);
	i.meshNames.push('rightPole');
	catcher.meshes.push(new THREE.Mesh(i.rightPoleG, i.poleStuff));

	// make the catcher clickable
	if (options.clickData) {
		var click = ScapeClickable(i.name, options.clickData, 0, 0, i.poleH);
		catcher.clickPoints.push(click);
	}

	return catcher;
};
// ------------------------------------------------------------------
module.exports = ScapeLeafLitterCatcherFactory;
