(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/pvrdwb/jcu/scapejs/src/scape.js":[function(require,module,exports){
(function (global){

THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);

base  = require('./scape/baseobject');
stuff = require('./scape/stuff');
field = require('./scape/field');
scene = require('./scape/scene');
chunk = require('./scape/chunk');

Scape = {
    BaseObject: base,
    Stuff: stuff,
    Chunk: chunk,
    Field: field,
    Scene: scene
}

if (typeof module !== 'undefined') {
    module.exports = Scape;
} else {
    window.Scape = Scape;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./scape/baseobject":"/Users/pvrdwb/jcu/scapejs/src/scape/baseobject.js","./scape/chunk":"/Users/pvrdwb/jcu/scapejs/src/scape/chunk.js","./scape/field":"/Users/pvrdwb/jcu/scapejs/src/scape/field.js","./scape/scene":"/Users/pvrdwb/jcu/scapejs/src/scape/scene.js","./scape/stuff":"/Users/pvrdwb/jcu/scapejs/src/scape/stuff.js"}],"/Users/pvrdwb/jcu/scapejs/src/scape/baseobject.js":[function(require,module,exports){

//
// this "base" object has a few convenience functions for handling
// options and whatnot
//

function ScapeObject(options, defaults) {
    this._opts = Object.create(defaults);
    this.mergeOptions(options);
};
// -----------------------------------------------------------------
// merge new options into our options
ScapeObject.prototype.mergeOptions = function(extraOpts) {
    for (opt in extraOpts) {
        this._opts[opt] = extraOpts[opt];
    }
}

module.exports = ScapeObject;
},{}],"/Users/pvrdwb/jcu/scapejs/src/scape/chunk.js":[function(require,module,exports){
(function (global){

// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
ScapeObject = require('./baseobject');
// ------------------------------------------------------------------
/**
 * Represents a rectangular prism of scape material -- dirt or
 * whatever.
 * @class
 */
function ScapeChunk(scene, parentBlock, layerIndex, minZ, options) {

    var defaultOptions = {};
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    this._scene = scene;
    this._block = parentBlock;
    this._layer = parentBlock.g[layerIndex];
    this._minZ = minZ;
    this._mesh = this._createNewMesh();

    // TODO: finish him!!
};
// ------------------------------------------------------------------
// inheritance
ScapeChunk.prototype = Object.create(ScapeObject.prototype);
ScapeChunk.prototype.constructor = ScapeChunk;
// ------------------------------------------------------------------
ScapeChunk.prototype.rebuild = function() {
    console.log('update')
    this._updateMesh();
}
// ------------------------------------------------------------------
ScapeChunk.prototype._createNewMesh = function() {
    // the chunk will be as deep as the layer says
    var depth = this._layer.dz;
    if (depth == 0) {
        // ..unless that's 0, in which case go to the bottom
        depth = this._layer.z - this._minZ;
    }
    // make a geometry for the chunk
    var geom = new THREE.BoxGeometry(
        this._block.dx, this._block.dy, depth
    );
    var mesh = new THREE.Mesh(geom, this._layer.m);
    mesh.position.set(
        this._block.x + this._block.dx/2,
        this._block.y + this._block.dy/2,
        this._layer.z - depth/2
    );
    return mesh;
}
// ------------------------------------------------------------------
ScapeChunk.prototype._addMesh = function() {
    this._scene.add(this._mesh);
}
// ------------------------------------------------------------------
ScapeChunk.prototype._removeMesh = function() {
    this._scene.remove(this._mesh);
}
// ------------------------------------------------------------------
ScapeChunk.prototype._updateMesh = function() {
    this._removeMesh();
    this._mesh = this._createNewMesh();
    this._addMesh();
}
// ------------------------------------------------------------------
module.exports = ScapeChunk;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./baseobject":"/Users/pvrdwb/jcu/scapejs/src/scape/baseobject.js"}],"/Users/pvrdwb/jcu/scapejs/src/scape/field.js":[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
ScapeObject = require('./baseobject');
ScapeStuff = require('./stuff');
// ------------------------------------------------------------------
/**
 * Holds information about an area.
 * @class
 */
function ScapeField(options) {

    var defaultOptions = {
        minX: 0,        maxX: 100,          blocksX: 10,
        minY: 0,        maxY: 100,          blocksY: 10,
        minZ: 0,        maxZ: 40,           blocksZ: 80
    };

    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    // min and max values for x y and z
    this.minX = this._opts.minX;
    this.minY = this._opts.minY;
    this.minZ = this._opts.minZ;

    this.maxX = this._opts.maxX;
    this.maxY = this._opts.maxY;
    this.maxZ = this._opts.maxZ;

    // convenient "widths"
    this.wX = this.maxX - this.minX;
    this.wY = this.maxY - this.minY;
    this.wZ = this.maxZ - this.minZ;

    // how many blocks across x and y?
    this.blocksX = this._opts.blocksX;
    this.blocksY = this._opts.blocksY;
    this.blocksZ = this._opts.blocksZ;

    // how wide is each block
    this._bX = this.wX / this.blocksX;
    this._bY = this.wY / this.blocksY;
    this._bZ = this.wZ / this.blocksZ;

    // housekeeping
    this._groundStacks = [];
    this._groundHeights = [];
    this._calcCenter();
    this._makeGrid();

};
// ------------------------------------------------------------------
// inheritance
ScapeField.prototype = Object.create(ScapeObject.prototype);
ScapeField.prototype.constructor = ScapeField;
// ------------------------------------------------------------------
ScapeField.prototype.print = function() {
    console.log(
        '(' + this.minX + '-' + this.maxX +
        ', ' + this.minY + '-' + this.maxY +
        ', ' + this.minZ + '-' + this.maxZ +
        ')'
    );
}
// ------------------------------------------------------------------
ScapeField.prototype._makeGrid = function() {

    var stuffs = [
          ScapeStuff.dirt1
        , ScapeStuff.dirt5
        , ScapeStuff.dirt9
        , ScapeStuff.water
        , ScapeStuff.water
        , ScapeStuff.water
        , ScapeStuff.leaflitter
        , ScapeStuff.leaflitter
    ]

    this._g = [];
    for (var gx = 0; gx < this.blocksX; gx++) {
        var col = [];
        for (var gy = 0; gy < this.blocksY; gy++) {

            // TODO: just user generic material here.
            var material = stuffs[Math.floor(Math.random() * (stuffs.length))]

            var block = {
                x: this.minX + (this._bX * gx),
                dx: this._bX * 0.95,
                y: this.minY + (this._bY * gy),
                dy: this._bY * 0.95,
                g: [{
                    z: this.maxZ,
                    dz: 0, // 0 means "stretch to minZ"
                    m: material,
                    chunk: null
                }],
            }
            col.push(block);
        }
        this._g.push(col);
    }
}
// ------------------------------------------------------------------
/**
 * Add additional ground heights to the field's ground heights.
 * The heightList is an array of data objects.  Each object needs x,
 * y and z properties.
 * @param {boolean} replace if replace is truthy, discard existing
 *                          ground heights first.
 */
ScapeField.prototype.addGroundHeights = function(heightList, replace) {
    if (replace) {
        this._groundHeights = [];
    }
    // loop through the list adding each one.
    for (var s = 0; s < heightList.length; s++) {
        var pt = heightList[s];
        this.addGroundHeight(pt.x, pt.y, pt.z);
    }
    this.calcGroundHeights();
}
// ------------------------------------------------------------------
/**
 * Add a ground height of z at x,y.
 * If you call this, remember to calcGround() after.
 */
ScapeField.prototype.addGroundHeight = function(x, y, z) {
    this._groundHeights.push({ x: x, y: y, z: z });
}
// ------------------------------------------------------------------
/**
 * Add additional ground stacks to the field's ground stacks.
 * The groundList is an array of data objects.  Each object needs x,
 * y and z properties, and a 'stack' property, each matching the
 * corresponding arg to addGroundStack.
 * @param {boolean} replace if replace is truthy, discard existing
 *                          ground points first.
 */
ScapeField.prototype.addGroundStacks = function(groundList, replace) {
    if (replace) {
        this._groundStacks = [];
    }
    // loop through the list adding each one.
    for (var s = 0; s < groundList.length; s++) {
        var pt = groundList[s];
        this.addGroundStack(pt.x, pt.y, pt.stack);
    }
    this.calcGroundStacks();
}
// ------------------------------------------------------------------
/**
 * Add a ground stack at x,y, starting at height z.
 * The stack is an array of two-element arrays with a Material
 * and a depth number, like this:
 * [
 *     [Material.leafLitter, 0.3],
 *     [Material.dirt, 3.5],
 *     [Material.stone, 4]
 * ]
 * That puts a leaflitter layer 0.3 units deep on a 3.5-unit
 * deep dirt layer, which is on a stone layer.  If the final
 * layer's depth is zero, that layer is assumed to go all the
 * way to minZ.
 * If you call this, remember to calcGround() after.
 */
ScapeField.prototype.addGroundStack = function(x, y, stack) {
    // TODO: check for validity
    this._groundStacks.push({
        x: x,
        y: y,
        stack: stack
    })
}
// ------------------------------------------------------------------
/**
 * (re)calculate the ground height.
 */
ScapeField.prototype.calcGroundHeights = function() {

    this.eachBlock( function(err, block) {
        // TODO: check err

        // find height for this ground block by allowing each
        // known ground height to "vote" using the inverse of
        // it's squared distance from the centre of the block.
        var h, dx, dy, dist, voteSize;
        var bZ = 0;
        var votes = 0;
        for (var gh=0; gh < this._groundHeights.length; gh++) {
            h = this._groundHeights[gh];
            dx = block.x + (0.5 * this._bX) - h.x;
            dy = block.y + (0.5 * this._bY) - h.y;
            dist = 1 + dx*dx + dy*dy;
            voteSize = 1 / dist;
            bZ += h.z * voteSize;
            votes += voteSize;
        }
        // now divide to find the average
        bZ = bZ / votes;

        // block-ish heights: round to the nearest _bZ
        var diffZ = bZ - this.minZ;
        bZ = this.minZ + Math.round(diffZ / this._bZ) * this._bZ;

        // okay now we know a height!  set it
        this.setBlockHeight(block, bZ);

    }, this);
}
// ------------------------------------------------------------------
ScapeField.prototype._calcCenter = function() {
    // calculate the centre of the field and record it as .center
    this.center = new THREE.Vector3(
        (this.minX + this.maxX) / 2,
        (this.minY + this.maxY) / 2,
        (this.minZ + this.maxZ) / 2
    );
}
// ------------------------------------------------------------------
ScapeField.prototype.setBlockHeight = function(block, z) {
    // to set the block ground height, we need to find the block's
    // current ground height (the z of the top layer), work out a
    // diff between that and the new height, and add that diff to
    // all the layers.
    var dZ = z - block.g[0].z;
    var depth;
    // do all the layers except the last one
    for (var l = 0; l < block.g.length; l++) {
        block.g[l].z += dZ;
        if (block.g[l].chunk) {
            block.g[l].chunk.rebuild();
        }
    }
}
// ------------------------------------------------------------------
ScapeField.prototype.getBlock = function(x, y) {
    // return the block that includes  x,y
    var gx = (x - this.minX) / this._bX;
    var gy = (y - this.minY) / this._bY;
    return (this._g[gx][gy]);
}
// ------------------------------------------------------------------
// invoke the callback each block in turn
// callback should look like: function(err, block) { ... }
// if err is null everything is fine. if err is not null, there
// was an error.
ScapeField.prototype.eachBlock = function(callback, thisArg, order) {
    if (order == undefined) {
        order = 'xup-yup';
    }
    if (thisArg == undefined) {
        thisArg = this;
    }
    if (order == 'xup-yup') {
        for (var gx = 0; gx < this._g.length; gx++) {
            for (var gy = 0; gy < this._g[0].length; gy++) {
                callback.call(thisArg, null, this._g[gx][gy]);
            }
        }
    }
}
// ------------------------------------------------------------------
// ------------------------------------------------------------------
module.exports = ScapeField;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./baseobject":"/Users/pvrdwb/jcu/scapejs/src/scape/baseobject.js","./stuff":"/Users/pvrdwb/jcu/scapejs/src/scape/stuff.js"}],"/Users/pvrdwb/jcu/scapejs/src/scape/scene.js":[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
ScapeObject = require('./baseobject');
ScapeChunk = require('./chunk');
// ------------------------------------------------------------------
/**
 * Represents a rendering of a landscape / moonscape / whatever
 * @param {ScapeField} field  the field being rendered
 * @param {string} dom        DOM element the scape should be rendered info.
 * @param {object} options    collection of options.
 * @class
 */
function ScapeScene(field, dom, options) {

    var defaultOptions = {
        lights: ['ambient', 'topleft']
    };

    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    // save the field
    this.f = field;

    // discover DOM container
    this.element = document.getElementById(dom);

    // create and save all the bits we need
    this.renderer = this._makeRenderer({ dom: this.element });
    this.scene = this._makeScene();
    this.camera = this._makeCamera();
    this.controls = this._makeControls();
    this.lights = this._makeLights(this._opts.lights);

    this.addBlocks();

    // add grids and helper cubes
    // this.addHelperGrid();
    // this.addHelperGrid('top');
    this.addHelperShapes();

    var lastLogAt = 0; // DEBUG
    render = (function unboundRender(ts) {

        // DEBUG
        if (lastLogAt + 2000 < ts) {
            console.log('rendering...');
            lastLogAt = ts;
        }

        requestAnimationFrame( render );
        this.renderer.render( this.scene, this.camera );
        this.controls.update();
    }).bind(this);

    render(0);

};
// ------------------------------------------------------------------
// inheritance
ScapeScene.prototype = Object.create(ScapeObject.prototype);
ScapeScene.prototype.constructor = ScapeScene;
// ------------------------------------------------------------------
ScapeScene.prototype.addBlocks = function() {
    var theScene = this.scene;
    var minZ = this.f.minZ;
    var depth, layer;
    this.f.eachBlock( function(err, b) {
        for (var layerIndex = 0; layerIndex < b.g.length; layerIndex++) {
            b.g[layerIndex].chunk = new ScapeChunk(
                theScene, b, layerIndex, minZ
            );
        }
    });
    this.f.calcGroundHeights();
}
// ------------------------------------------------------------------
ScapeScene.prototype.addHelperShapes = function() {

    var size = (this.f.wX + this.f.wY + this.f.wZ) / 50;

    // cubic geometry
    var cubeGeom = new THREE.BoxGeometry( size, size, size );

    var white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var red   = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    var green = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    var blue  = new THREE.MeshLambertMaterial({ color: 0x0000ff });
    // var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    // var material = new THREE.MeshPhongMaterial( { ambient: 0x030303, color: 0xdddddd, specular: 0x009900, shininess: 30, shading: THREE.FlatShading } )

    var cube000 = new THREE.Mesh(cubeGeom, white);
    var cubeX00 = new THREE.Mesh(cubeGeom, red);
    var cubex00 = new THREE.Mesh(cubeGeom, red);
    var cube0Y0 = new THREE.Mesh(cubeGeom, green);
    var cube00Z = new THREE.Mesh(cubeGeom, blue);
    var cubeXY0 = new THREE.Mesh(cubeGeom, white);

    cube000.position.copy(new THREE.Vector3(this.f.minX, this.f.minY, this.f.minZ));
    cubeX00.position.copy(new THREE.Vector3(this.f.maxX, this.f.minY, this.f.minZ));
    cubex00.position.copy(new THREE.Vector3((this.f.minX + this.f.maxX) / 2, this.f.minY, this.f.minZ));
    cube0Y0.position.copy(new THREE.Vector3(this.f.minX, this.f.maxY, this.f.minZ));
    cube00Z.position.copy(new THREE.Vector3(this.f.minX, this.f.minY, this.f.maxZ));
    cubeXY0.position.copy(new THREE.Vector3(this.f.maxX, this.f.maxY, this.f.minZ));

    this.scene.add(cube000);
    this.scene.add(cubeX00);
    this.scene.add(cubex00);
    this.scene.add(cube0Y0);
    this.scene.add(cube00Z);
    this.scene.add(cubeXY0);
}
// ------------------------------------------------------------------
ScapeScene.prototype.addHelperGrid = function(topOrBottom) {
    var gz = 0;
    var gc = 0x444444;
    if (topOrBottom == 'top') {
        gz = this.f.maxZ;
        gc = 0xccccff;
    } else {
        gz = this.f.minZ;
        gc = 0xccffcc;
    }

    var gridW = Math.max(this.f.maxX - this.f.minX, this.f.maxY - this.f.minY);

    // Grid "size" is the distance in each of the four directions,
    // the grid should span.  So for a grid W units across, specify
    // the size as W/2.
    var gridXY = new THREE.GridHelper(gridW/2, gridW/10);
    gridXY.setColors(gc, gc);
    gridXY.rotation.x = Math.PI/2;
    gridXY.position.set(this.f.minX + gridW/2, this.f.minY + gridW/2, gz);
    this.scene.add(gridXY);
}
// ------------------------------------------------------------------
/**
 * Create and return a THREE.Renderer.
 * @param {object} various options
 * @param {DOMElement|jQueryElem} options.dom a dom element
 * @param {integer} options.width renderer width (in pixels)
 * @param {integer} options.height renderer height (in pixels)
 */
ScapeScene.prototype._makeRenderer = function(options) {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor( 0x000000, 0);
    if (options && options.dom) {
        var $dom = $(options.dom);
        renderer.setSize($dom.width(), $dom.height());
        $dom.append(renderer.domElement);
    }
    if (options && options.width && options.height) {
        renderer.setSize(options.width, options.height);
    }
    return renderer;
}
// ------------------------------------------------------------------
ScapeScene.prototype._makeLights = function(lights) {

    var lightList = [];
    if (lights.indexOf('ambient') != -1) {
        // add an ambient list
        lightList.push(new THREE.AmbientLight(0x222233));
    }
    if (lights.indexOf('topleft') != -1) {
        var left = new THREE.PointLight(0xffffff, 1, 0);
        // TODO: supposed to be over the viewer's left shoulder
        // TODO: derive position from the camera's position
        left.position.set(-25, -100, 300);
        lightList.push(left);
    }
    if (lights.indexOf('sun') != -1) {
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        // TODO: this whole light doesn't work.
        var sun = new THREE.SpotLight(0xffffee);
        // TODO: fix sun position
        sun.position.set(-25, -100, 200);
        sun.castShadow = true;
        sun.shadowMapWidth = 1024;
        sun.shadowMapHeight = 1024;
        sun.shadowCameraNear = 500;
        sun.shadowCameraFar = 4000;
        sun.shadowCameraFov = 30;
        if (this.f) {
            sun.target = this.f.center;
        }
        // lightList.push(sun);
    }

    for (var i = 0; i < lightList.length; i++) {
        this.scene.add(lightList[i]);
    }

    return lightList;
}
// ------------------------------------------------------------------
/**
 * Create and return a THREE.Scene
 */
ScapeScene.prototype._makeScene = function() {
    var scene = new THREE.Scene();
    // add fog
    // scene.fog = new THREE.Fog('#f0f8ff', 100, 150);
    return scene;
}
// ------------------------------------------------------------------
/**
 * [viewAngle description]
 * @type {Number}
 */
ScapeScene.prototype._makeCamera = function(options) {

    // viewing angle
    // i think this is the vertical view angle.  horizontal angle is
    // derived from this and the aspect ratio.
    var viewAngle = 45;
    viewAngle = (options && options.viewAngle) || viewAngle;

    // aspect
    var viewAspect = 16/9;
    if (this.renderer && this.renderer.domElement) {
        var $elem = $(this.renderer.domElement);
        viewAspect = $elem.width() / $elem.height();
    }

    // near and far clipping
    var nearClip = 0.1;
    var farClip = 10000;
    if (this.f) {
        nearClip = Math.min(this.f.wX, this.f.wY, this.f.wZ) / 1000;
        farClip = Math.max(this.f.wX, this.f.wY, this.f.wZ) * 10;
    }

    // camera position and looking direction
    var lookHere = new THREE.Vector3(0, 0, 0);
    var camPos = new THREE.Vector3(0, -10, 5);
    if (this.f) {
        lookHere = this.f.center;
        camPos = lookHere.clone().add(new THREE.Vector3(0, -1.1 * this.f.wY, 3 * this.f.wZ));
    }

    // set up camera
    var camera = new THREE.PerspectiveCamera( viewAngle, viewAspect, nearClip, farClip);
    // "up" is positive Z
    camera.up.set(0,0,1);
    camera.position.copy(camPos);
    camera.lookAt(lookHere);

    // add the camera to the scene
    if (this.scene) {
        this.scene.add(camera);
    }

    return camera;
}
// ------------------------------------------------------------------
ScapeScene.prototype._makeControls = function() {

    var center = new THREE.Vector3(0,0,0);
    if (this.f && this.f.center) {
        center = this.f.center.clone();
    }
    if (this.camera && this.renderer && this.renderer.domElement) {
        var controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        controls.center = center;
        return controls;
    }
}
// ------------------------------------------------------------------
ScapeScene.prototype.print = function() {
    console.log(
        'scape!'
    );
}
// ------------------------------------------------------------------
module.exports = ScapeScene;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./baseobject":"/Users/pvrdwb/jcu/scapejs/src/scape/baseobject.js","./chunk":"/Users/pvrdwb/jcu/scapejs/src/scape/chunk.js"}],"/Users/pvrdwb/jcu/scapejs/src/scape/stuff.js":[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
// ------------------------------------------------------------------
/**
 * A bag of stuff that things can be made out of.
 */
var ScapeStuff = {};
var Lambert = THREE.MeshLambertMaterial;

// "generic" stuff for when nothing else is specified
ScapeStuff.generic = new Lambert({ color: 0x999999,
                     transparent: true, opacity: 0.50 });

// water is blue and a bit transparent
ScapeStuff.water = new Lambert({ color: 0x3399ff,
                     transparent: true, opacity: 0.75 });

// dirt for general use
ScapeStuff.dirt = new Lambert({ color: 0xa0522d });
// Nine dirt colours for varying moisture levels.  Start by defining
// the driest and wettest colours, and use .lerp() to get a linear
// interpolated colour for each of the in-between dirts.
var dry = new THREE.Color(0xbb8855); // dry
var wet = new THREE.Color(0x882200); // moist

ScapeStuff.dirt1 = new Lambert({ color: dry });
ScapeStuff.dirt2 = new Lambert({ color: dry.clone().lerp(wet, 1/8) });
ScapeStuff.dirt3 = new Lambert({ color: dry.clone().lerp(wet, 2/8) });
ScapeStuff.dirt4 = new Lambert({ color: dry.clone().lerp(wet, 3/8) });
ScapeStuff.dirt5 = new Lambert({ color: dry.clone().lerp(wet, 4/8) });
ScapeStuff.dirt6 = new Lambert({ color: dry.clone().lerp(wet, 5/8) });
ScapeStuff.dirt7 = new Lambert({ color: dry.clone().lerp(wet, 6/8) });
ScapeStuff.dirt8 = new Lambert({ color: dry.clone().lerp(wet, 7/8) });
ScapeStuff.dirt9 = new Lambert({ color: wet });

// leaf litter (in reality leaf litter is brown, but use a slightly
// greenish tone here so it doesn't just look like more dirt)
ScapeStuff.leaflitter = new Lambert({ color: 0x556b2f });

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},["/Users/pvrdwb/jcu/scapejs/src/scape.js"]);
