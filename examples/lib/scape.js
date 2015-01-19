(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/scene":5,"./scape/stuff":6}],2:[function(require,module,exports){

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
},{}],3:[function(require,module,exports){
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
    this._isSurface = (layerIndex == 0);
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
    mesh.castShadow = true;
    // only the surface chunks receive shadow
    if (this._isSurface) {
        mesh.receiveShadow = true;
    }
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

},{"./baseobject":2}],4:[function(require,module,exports){
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
        minZ: 0,        maxZ: 40,           blocksZ: 80,
        stackGap: 0.04
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
    this._g = [];
    for (var gx = 0; gx < this.blocksX; gx++) {
        var col = [];
        for (var gy = 0; gy < this.blocksY; gy++) {
            var xGap = this._bX * this._opts.stackGap / 2;
            var yGap = this._bY * this._opts.stackGap / 2;
            var block = {
                x: this.minX + (this._bX * gx) + xGap,
                dx: this._bX - xGap - xGap,
                y: this.minY + (this._bY * gy) + yGap,
                dy: this._bY - yGap - yGap,
                g: [{
                    z: this.maxZ,
                    dz: 0, // 0 means "stretch to minZ"
                    m: ScapeStuff.generic,
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
 * @param {boolean} replace  if replace is truthy, discard existing
 *                           ground heights first.
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
    this._groundStacks.push({ x: x,  y: y,  stack: stack });
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
/**
 * (re)calculate the ground stacks.
 */
ScapeField.prototype.calcGroundStacks = function() {

    this.eachBlock( function(err, block) {
        // TODO: check err

        // make the stack for this ground block by copying the
        // nearest defined stack.
        var s, dx, dy, thisDist, bestStack;
        var bestDist = this.wX + this.wY + this.wZ;
        for (var gs=0; gs < this._groundStacks.length; gs++) {
            s = this._groundStacks[gs];
            dx = block.x + (0.5 * this._bX) - s.x;
            dy = block.y + (0.5 * this._bY) - s.y;
            thisDist = 1 + dx*dx + dy*dy;
            if (thisDist < bestDist) {
                bestStack = s;
                bestDist = thisDist;
            }
        }

        // okay we got a stack.
        this.setGroundStack(block, s.stack);

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
ScapeField.prototype.setGroundStack = function(block, stack) {
    var layerLevel = block.g[0].z;
    for (var layer = 0; layer < stack.length; layer++) {
        block.g[layer] = {
            z: layerLevel,
            dz: stack[layer][1],
            m: stack[layer][0],
            chunk: null
        };
        layerLevel -= stack[layer][1];
    }
    this.rebuildChunks(block);
}
// ------------------------------------------------------------------
ScapeField.prototype.rebuildChunks = function(block) {
    for (var l = 0; l < block.g.length; l++) {
        if (block.g[l].chunk) {
            block.g[l].chunk.rebuild();
        }
    }
}
// ------------------------------------------------------------------
ScapeField.prototype.setBlockHeight = function(block, z) {
    // to set the block ground height, we need to find the block's
    // current ground height (the z of the top layer), work out a
    // diff between that and the new height, and add that diff to
    // all the layers.
    var dZ = z - block.g[0].z;
    var depth;
    for (var l = 0; l < block.g.length; l++) {
        block.g[l].z += dZ;
    }
    this.rebuildChunks(block);
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

},{"./baseobject":2,"./stuff":6}],5:[function(require,module,exports){
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
        // lights: ['ambient', 'topleft']
        lights: ['ambient', 'sun', 'sky']
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

    // TODO: handle sun's movement better
    var sunRotationAxis = new THREE.Vector3(0, 1, 0);
    var day = true;
    var wasDay = false;

    var lastLogAt = 0; // DEBUG
    render = (function unboundRender(ts) {

        // DEBUG
        if (lastLogAt + 2000 < ts) {
            console.log('rendering...');
            lastLogAt = ts;
        }
        // TODO: handle sun's movement better
        this.lights.sun.position
            .sub(this.f.center)
            .applyAxisAngle(sunRotationAxis, 0.01)
            .add(this.f.center);

        day = (this.lights.sun.position.z > this.f.center.z);
        if (day && !wasDay) {
            this.lights.sun.shadowDarkness = 0.33;
        } else if (!day && wasDay) {
            this.lights.sun.shadowDarkness = 0;
        }
        wasDay = day;

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
/**
 * add position/axis helper cubes.
 */
ScapeScene.prototype.addHelperShapes = function() {
    var white = 0xffffff;
    var red   = 0xff0000;
    var green = 0x00ff00;
    var blue  = 0x0000ff;

    this.addHelperCube(this.f.minX, this.f.minY, this.f.minZ, white);
    this.addHelperCube(this.f.maxX, this.f.minY, this.f.minZ, red);
    this.addHelperCube((this.f.minX + this.f.maxX) / 2, this.f.minY, this.f.minZ, red);
    this.addHelperCube(this.f.minX, this.f.maxY, this.f.minZ, green);
    this.addHelperCube(this.f.minX, this.f.minY, this.f.maxZ, blue);
    this.addHelperCube(this.f.maxX, this.f.maxY, this.f.minZ, white);
}
// ------------------------------------------------------------------
/**
 * add a cube at x, y, z to confirm where that is, exactly.
 * Either supply three coordinates, or a THREE.Vector3.  Optionally
 * supply a color.
 */
ScapeScene.prototype.addHelperCube = function(x, y, z, color) {
    // first, set the color to something
    if (typeof color == 'undefined') {
        // default to light grey.
        color = new THREE.Color(0xcccccc);
    }
    var pos; // the position to draw the cube
    if (typeof x.x != 'undefined') {
        // then it's a vector, and y might be the color
        pos = x;
        if (typeof y != 'undefined') {
            color = y;
        }
    } else {
        // x isn't a vector, so assume separate x y and z
        pos = new THREE.Vector3(x, y, z);
        // we caught color already.
    }
    // about a fiftieth of the field's summed dimensions
    var size = (this.f.wX + this.f.wY + this.f.wZ) / 50;

    // okay.. ready to draw
    var geom = new THREE.BoxGeometry( size, size, size );
    var material = new THREE.MeshLambertMaterial({ color: color });
    var cube = new THREE.Mesh(geom, material);
    cube.position.copy(pos);
    this.scene.add(cube);
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
    renderer.shadowMapEnabled = true;
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
ScapeScene.prototype._makeLights = function(lightsToInclude) {

    var lights = {};
    var f = this.f;  // convenient reference to the field

    if (lightsToInclude.indexOf('ambient') != -1) {
        // add an ambient list
        lights.ambient = new THREE.AmbientLight(0x222233);
    }
    if (lightsToInclude.indexOf('topleft') != -1) {
        lights.left = new THREE.PointLight(0xffffff, 1, 0);
        // position light over the viewer's left shoulder..
        // - LEFT of the camera by 50% of the field's x width
        // - BEHIND the camera by 50% of the field's y width
        // - ABOVE the camera by the field's height
        lights.left.position.addVectors(
            this.camera.position,
            new THREE.Vector3(-0.5 * f.wX, -0.5 * f.wY, 1 * f.wZ)
        );
    }
    if (lightsToInclude.indexOf('sun') != -1) {
        lights.sun = new THREE.DirectionalLight(0xffffee);
        lights.sun.intensity = 1.0;

        // position of sun
        var sunHeight = 5 * f.wZ;
        lights.sun.position.set(f.minX - f.wX, f.minY - f.wY, f.maxZ + sunHeight);
        lights.sun.shadowCameraVisible = true;  // DEBUG

        // direction of sunlight
        var target = new THREE.Object3D();
        target.position.copy(f.center);
        this.scene.add(target);
        lights.sun.target = target;

        // sun distance, lol
        var sunDistance = lights.sun.position.distanceTo(lights.sun.target.position);
        // longest diagonal from field-center
        var maxFieldDiagonal = f.center.distanceTo(new THREE.Vector3(f.minX, f.minY, f.minZ));

        // shadow settings
        lights.sun.castShadow = true;
        lights.sun.shadowDarkness = 0.33;

        lights.sun.shadowCameraNear = sunDistance - maxFieldDiagonal;
        lights.sun.shadowCameraFar = sunDistance + maxFieldDiagonal;
        lights.sun.shadowCameraTop = maxFieldDiagonal;
        lights.sun.shadowCameraRight = maxFieldDiagonal;
        lights.sun.shadowCameraBottom = -1 * maxFieldDiagonal;
        lights.sun.shadowCameraLeft = -1 * maxFieldDiagonal;
    }
    if (lightsToInclude.indexOf('sky') != -1) {
        lights.sky = new THREE.DirectionalLight(0x666677);
        lights.sky.intensity = 1.0;

        // sky is directly above
        var skyHeight = 5 * f.wZ;
        lights.sky.position.copy(f.center);
        lights.sky.position.setZ(f.maxZ + skyHeight);
        lights.sky.shadowCameraVisible = true;  // DEBUG

        var target = new THREE.Object3D();
        target.position.copy(f.center);
        this.scene.add(target);
        lights.sky.target = target;
    }

    for (var light in lights) {
        if (lights.hasOwnProperty(light)) {
            this.scene.add(lights[light]);
        }
    }

    return lights;
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

},{"./baseobject":2,"./chunk":3}],6:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9zY2VuZS5qcyIsInNyYy9zY2FwZS9zdHVmZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNVZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblxuYmFzZSAgPSByZXF1aXJlKCcuL3NjYXBlL2Jhc2VvYmplY3QnKTtcbnN0dWZmID0gcmVxdWlyZSgnLi9zY2FwZS9zdHVmZicpO1xuZmllbGQgPSByZXF1aXJlKCcuL3NjYXBlL2ZpZWxkJyk7XG5zY2VuZSA9IHJlcXVpcmUoJy4vc2NhcGUvc2NlbmUnKTtcbmNodW5rID0gcmVxdWlyZSgnLi9zY2FwZS9jaHVuaycpO1xuXG5TY2FwZSA9IHtcbiAgICBCYXNlT2JqZWN0OiBiYXNlLFxuICAgIFN0dWZmOiBzdHVmZixcbiAgICBDaHVuazogY2h1bmssXG4gICAgRmllbGQ6IGZpZWxkLFxuICAgIFNjZW5lOiBzY2VuZVxufVxuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNjYXBlO1xufSBlbHNlIHtcbiAgICB3aW5kb3cuU2NhcGUgPSBTY2FwZTtcbn1cbiIsIlxuLy9cbi8vIHRoaXMgXCJiYXNlXCIgb2JqZWN0IGhhcyBhIGZldyBjb252ZW5pZW5jZSBmdW5jdGlvbnMgZm9yIGhhbmRsaW5nXG4vLyBvcHRpb25zIGFuZCB3aGF0bm90XG4vL1xuXG5mdW5jdGlvbiBTY2FwZU9iamVjdChvcHRpb25zLCBkZWZhdWx0cykge1xuICAgIHRoaXMuX29wdHMgPSBPYmplY3QuY3JlYXRlKGRlZmF1bHRzKTtcbiAgICB0aGlzLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbWVyZ2UgbmV3IG9wdGlvbnMgaW50byBvdXIgb3B0aW9uc1xuU2NhcGVPYmplY3QucHJvdG90eXBlLm1lcmdlT3B0aW9ucyA9IGZ1bmN0aW9uKGV4dHJhT3B0cykge1xuICAgIGZvciAob3B0IGluIGV4dHJhT3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzW29wdF0gPSBleHRyYU9wdHNbb3B0XTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVPYmplY3Q7IiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWN0YW5ndWxhciBwcmlzbSBvZiBzY2FwZSBtYXRlcmlhbCAtLSBkaXJ0IG9yXG4gKiB3aGF0ZXZlci5cbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUNodW5rKHNjZW5lLCBwYXJlbnRCbG9jaywgbGF5ZXJJbmRleCwgbWluWiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9ibG9jayA9IHBhcmVudEJsb2NrO1xuICAgIHRoaXMuX2lzU3VyZmFjZSA9IChsYXllckluZGV4ID09IDApO1xuICAgIHRoaXMuX2xheWVyID0gcGFyZW50QmxvY2suZ1tsYXllckluZGV4XTtcbiAgICB0aGlzLl9taW5aID0gbWluWjtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuXG4gICAgLy8gVE9ETzogZmluaXNoIGhpbSEhXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVDaHVuay5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUNodW5rLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlQ2h1bms7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygndXBkYXRlJylcbiAgICB0aGlzLl91cGRhdGVNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhlIGNodW5rIHdpbGwgYmUgYXMgZGVlcCBhcyB0aGUgbGF5ZXIgc2F5c1xuICAgIHZhciBkZXB0aCA9IHRoaXMuX2xheWVyLmR6O1xuICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgIC8vIC4udW5sZXNzIHRoYXQncyAwLCBpbiB3aGljaCBjYXNlIGdvIHRvIHRoZSBib3R0b21cbiAgICAgICAgZGVwdGggPSB0aGlzLl9sYXllci56IC0gdGhpcy5fbWluWjtcbiAgICB9XG4gICAgLy8gbWFrZSBhIGdlb21ldHJ5IGZvciB0aGUgY2h1bmtcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcbiAgICAgICAgdGhpcy5fYmxvY2suZHgsIHRoaXMuX2Jsb2NrLmR5LCBkZXB0aFxuICAgICk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCB0aGlzLl9sYXllci5tKTtcbiAgICBtZXNoLnBvc2l0aW9uLnNldChcbiAgICAgICAgdGhpcy5fYmxvY2sueCArIHRoaXMuX2Jsb2NrLmR4LzIsXG4gICAgICAgIHRoaXMuX2Jsb2NrLnkgKyB0aGlzLl9ibG9jay5keS8yLFxuICAgICAgICB0aGlzLl9sYXllci56IC0gZGVwdGgvMlxuICAgICk7XG4gICAgbWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAvLyBvbmx5IHRoZSBzdXJmYWNlIGNodW5rcyByZWNlaXZlIHNoYWRvd1xuICAgIGlmICh0aGlzLl9pc1N1cmZhY2UpIHtcbiAgICAgICAgbWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9hZGRNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUuYWRkKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fcmVtb3ZlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLnJlbW92ZSh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3VwZGF0ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVNZXNoKCk7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcbiAgICB0aGlzLl9hZGRNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDaHVuazsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCBhbiBhcmVhLlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlRmllbGQob3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICBtaW5YOiAwLCAgICAgICAgbWF4WDogMTAwLCAgICAgICAgICBibG9ja3NYOiAxMCxcbiAgICAgICAgbWluWTogMCwgICAgICAgIG1heFk6IDEwMCwgICAgICAgICAgYmxvY2tzWTogMTAsXG4gICAgICAgIG1pblo6IDAsICAgICAgICBtYXhaOiA0MCwgICAgICAgICAgIGJsb2Nrc1o6IDgwLFxuICAgICAgICBzdGFja0dhcDogMC4wNFxuICAgIH07XG5cbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICAvLyBtaW4gYW5kIG1heCB2YWx1ZXMgZm9yIHggeSBhbmQgelxuICAgIHRoaXMubWluWCA9IHRoaXMuX29wdHMubWluWDtcbiAgICB0aGlzLm1pblkgPSB0aGlzLl9vcHRzLm1pblk7XG4gICAgdGhpcy5taW5aID0gdGhpcy5fb3B0cy5taW5aO1xuXG4gICAgdGhpcy5tYXhYID0gdGhpcy5fb3B0cy5tYXhYO1xuICAgIHRoaXMubWF4WSA9IHRoaXMuX29wdHMubWF4WTtcbiAgICB0aGlzLm1heFogPSB0aGlzLl9vcHRzLm1heFo7XG5cbiAgICAvLyBjb252ZW5pZW50IFwid2lkdGhzXCJcbiAgICB0aGlzLndYID0gdGhpcy5tYXhYIC0gdGhpcy5taW5YO1xuICAgIHRoaXMud1kgPSB0aGlzLm1heFkgLSB0aGlzLm1pblk7XG4gICAgdGhpcy53WiA9IHRoaXMubWF4WiAtIHRoaXMubWluWjtcblxuICAgIC8vIGhvdyBtYW55IGJsb2NrcyBhY3Jvc3MgeCBhbmQgeT9cbiAgICB0aGlzLmJsb2Nrc1ggPSB0aGlzLl9vcHRzLmJsb2Nrc1g7XG4gICAgdGhpcy5ibG9ja3NZID0gdGhpcy5fb3B0cy5ibG9ja3NZO1xuICAgIHRoaXMuYmxvY2tzWiA9IHRoaXMuX29wdHMuYmxvY2tzWjtcblxuICAgIC8vIGhvdyB3aWRlIGlzIGVhY2ggYmxvY2tcbiAgICB0aGlzLl9iWCA9IHRoaXMud1ggLyB0aGlzLmJsb2Nrc1g7XG4gICAgdGhpcy5fYlkgPSB0aGlzLndZIC8gdGhpcy5ibG9ja3NZO1xuICAgIHRoaXMuX2JaID0gdGhpcy53WiAvIHRoaXMuYmxvY2tzWjtcblxuICAgIC8vIGhvdXNla2VlcGluZ1xuICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB0aGlzLl9jYWxjQ2VudGVyKCk7XG4gICAgdGhpcy5fbWFrZUdyaWQoKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUZpZWxkO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnKCcgKyB0aGlzLm1pblggKyAnLScgKyB0aGlzLm1heFggK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5ZICsgJy0nICsgdGhpcy5tYXhZICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWiArICctJyArIHRoaXMubWF4WiArXG4gICAgICAgICcpJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLl9tYWtlR3JpZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2cgPSBbXTtcbiAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5ibG9ja3NYOyBneCsrKSB7XG4gICAgICAgIHZhciBjb2wgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuYmxvY2tzWTsgZ3krKykge1xuICAgICAgICAgICAgdmFyIHhHYXAgPSB0aGlzLl9iWCAqIHRoaXMuX29wdHMuc3RhY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIHlHYXAgPSB0aGlzLl9iWSAqIHRoaXMuX29wdHMuc3RhY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIGJsb2NrID0ge1xuICAgICAgICAgICAgICAgIHg6IHRoaXMubWluWCArICh0aGlzLl9iWCAqIGd4KSArIHhHYXAsXG4gICAgICAgICAgICAgICAgZHg6IHRoaXMuX2JYIC0geEdhcCAtIHhHYXAsXG4gICAgICAgICAgICAgICAgeTogdGhpcy5taW5ZICsgKHRoaXMuX2JZICogZ3kpICsgeUdhcCxcbiAgICAgICAgICAgICAgICBkeTogdGhpcy5fYlkgLSB5R2FwIC0geUdhcCxcbiAgICAgICAgICAgICAgICBnOiBbe1xuICAgICAgICAgICAgICAgICAgICB6OiB0aGlzLm1heFosXG4gICAgICAgICAgICAgICAgICAgIGR6OiAwLCAvLyAwIG1lYW5zIFwic3RyZXRjaCB0byBtaW5aXCJcbiAgICAgICAgICAgICAgICAgICAgbTogU2NhcGVTdHVmZi5nZW5lcmljLFxuICAgICAgICAgICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29sLnB1c2goYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2cucHVzaChjb2wpO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYWRkaXRpb25hbCBncm91bmQgaGVpZ2h0cyB0byB0aGUgZmllbGQncyBncm91bmQgaGVpZ2h0cy5cbiAqIFRoZSBoZWlnaHRMaXN0IGlzIGFuIGFycmF5IG9mIGRhdGEgb2JqZWN0cy4gIEVhY2ggb2JqZWN0IG5lZWRzIHgsXG4gKiB5IGFuZCB6IHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHJlcGxhY2UgIGlmIHJlcGxhY2UgaXMgdHJ1dGh5LCBkaXNjYXJkIGV4aXN0aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VuZCBoZWlnaHRzIGZpcnN0LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oaGVpZ2h0TGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGhlaWdodExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gaGVpZ2h0TGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRIZWlnaHQocHQueCwgcHQueSwgcHQueik7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBncm91bmQgaGVpZ2h0IG9mIHogYXQgeCx5LlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gY2FsY0dyb3VuZCgpIGFmdGVyLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5wdXNoKHsgeDogeCwgeTogeSwgejogeiB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYWRkaXRpb25hbCBncm91bmQgc3RhY2tzIHRvIHRoZSBmaWVsZCdzIGdyb3VuZCBzdGFja3MuXG4gKiBUaGUgZ3JvdW5kTGlzdCBpcyBhbiBhcnJheSBvZiBkYXRhIG9iamVjdHMuICBFYWNoIG9iamVjdCBuZWVkcyB4LFxuICogeSBhbmQgeiBwcm9wZXJ0aWVzLCBhbmQgYSAnc3RhY2snIHByb3BlcnR5LCBlYWNoIG1hdGNoaW5nIHRoZVxuICogY29ycmVzcG9uZGluZyBhcmcgdG8gYWRkR3JvdW5kU3RhY2suXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHJlcGxhY2UgaWYgcmVwbGFjZSBpcyB0cnV0aHksIGRpc2NhcmQgZXhpc3RpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBncm91bmQgcG9pbnRzIGZpcnN0LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFja3MgPSBmdW5jdGlvbihncm91bmRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBncm91bmRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGdyb3VuZExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kU3RhY2socHQueCwgcHQueSwgcHQuc3RhY2spO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRTdGFja3MoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBncm91bmQgc3RhY2sgYXQgeCx5LCBzdGFydGluZyBhdCBoZWlnaHQgei5cbiAqIFRoZSBzdGFjayBpcyBhbiBhcnJheSBvZiB0d28tZWxlbWVudCBhcnJheXMgd2l0aCBhIE1hdGVyaWFsXG4gKiBhbmQgYSBkZXB0aCBudW1iZXIsIGxpa2UgdGhpczpcbiAqIFtcbiAqICAgICBbTWF0ZXJpYWwubGVhZkxpdHRlciwgMC4zXSxcbiAqICAgICBbTWF0ZXJpYWwuZGlydCwgMy41XSxcbiAqICAgICBbTWF0ZXJpYWwuc3RvbmUsIDRdXG4gKiBdXG4gKiBUaGF0IHB1dHMgYSBsZWFmbGl0dGVyIGxheWVyIDAuMyB1bml0cyBkZWVwIG9uIGEgMy41LXVuaXRcbiAqIGRlZXAgZGlydCBsYXllciwgd2hpY2ggaXMgb24gYSBzdG9uZSBsYXllci4gIElmIHRoZSBmaW5hbFxuICogbGF5ZXIncyBkZXB0aCBpcyB6ZXJvLCB0aGF0IGxheWVyIGlzIGFzc3VtZWQgdG8gZ28gYWxsIHRoZVxuICogd2F5IHRvIG1pblouXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBjYWxjR3JvdW5kKCkgYWZ0ZXIuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oeCwgeSwgc3RhY2spIHtcbiAgICAvLyBUT0RPOiBjaGVjayBmb3IgdmFsaWRpdHlcbiAgICB0aGlzLl9ncm91bmRTdGFja3MucHVzaCh7IHg6IHgsICB5OiB5LCAgc3RhY2s6IHN0YWNrIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBoZWlnaHQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBmaW5kIGhlaWdodCBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgYWxsb3dpbmcgZWFjaFxuICAgICAgICAvLyBrbm93biBncm91bmQgaGVpZ2h0IHRvIFwidm90ZVwiIHVzaW5nIHRoZSBpbnZlcnNlIG9mXG4gICAgICAgIC8vIGl0J3Mgc3F1YXJlZCBkaXN0YW5jZSBmcm9tIHRoZSBjZW50cmUgb2YgdGhlIGJsb2NrLlxuICAgICAgICB2YXIgaCwgZHgsIGR5LCBkaXN0LCB2b3RlU2l6ZTtcbiAgICAgICAgdmFyIGJaID0gMDtcbiAgICAgICAgdmFyIHZvdGVzID0gMDtcbiAgICAgICAgZm9yICh2YXIgZ2g9MDsgZ2ggPCB0aGlzLl9ncm91bmRIZWlnaHRzLmxlbmd0aDsgZ2grKykge1xuICAgICAgICAgICAgaCA9IHRoaXMuX2dyb3VuZEhlaWdodHNbZ2hdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIGgueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBoLnk7XG4gICAgICAgICAgICBkaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICB2b3RlU2l6ZSA9IDEgLyBkaXN0O1xuICAgICAgICAgICAgYlogKz0gaC56ICogdm90ZVNpemU7XG4gICAgICAgICAgICB2b3RlcyArPSB2b3RlU2l6ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgZGl2aWRlIHRvIGZpbmQgdGhlIGF2ZXJhZ2VcbiAgICAgICAgYlogPSBiWiAvIHZvdGVzO1xuXG4gICAgICAgIC8vIGJsb2NrLWlzaCBoZWlnaHRzOiByb3VuZCB0byB0aGUgbmVhcmVzdCBfYlpcbiAgICAgICAgdmFyIGRpZmZaID0gYlogLSB0aGlzLm1pblo7XG4gICAgICAgIGJaID0gdGhpcy5taW5aICsgTWF0aC5yb3VuZChkaWZmWiAvIHRoaXMuX2JaKSAqIHRoaXMuX2JaO1xuXG4gICAgICAgIC8vIG9rYXkgbm93IHdlIGtub3cgYSBoZWlnaHQhICBzZXQgaXRcbiAgICAgICAgdGhpcy5zZXRCbG9ja0hlaWdodChibG9jaywgYlopO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIHN0YWNrcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY2FsY0dyb3VuZFN0YWNrcyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gbWFrZSB0aGUgc3RhY2sgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGNvcHlpbmcgdGhlXG4gICAgICAgIC8vIG5lYXJlc3QgZGVmaW5lZCBzdGFjay5cbiAgICAgICAgdmFyIHMsIGR4LCBkeSwgdGhpc0Rpc3QsIGJlc3RTdGFjaztcbiAgICAgICAgdmFyIGJlc3REaXN0ID0gdGhpcy53WCArIHRoaXMud1kgKyB0aGlzLndaO1xuICAgICAgICBmb3IgKHZhciBncz0wOyBncyA8IHRoaXMuX2dyb3VuZFN0YWNrcy5sZW5ndGg7IGdzKyspIHtcbiAgICAgICAgICAgIHMgPSB0aGlzLl9ncm91bmRTdGFja3NbZ3NdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIHMueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBzLnk7XG4gICAgICAgICAgICB0aGlzRGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgaWYgKHRoaXNEaXN0IDwgYmVzdERpc3QpIHtcbiAgICAgICAgICAgICAgICBiZXN0U3RhY2sgPSBzO1xuICAgICAgICAgICAgICAgIGJlc3REaXN0ID0gdGhpc0Rpc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBva2F5IHdlIGdvdCBhIHN0YWNrLlxuICAgICAgICB0aGlzLnNldEdyb3VuZFN0YWNrKGJsb2NrLCBzLnN0YWNrKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fY2FsY0NlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY2VudHJlIG9mIHRoZSBmaWVsZCBhbmQgcmVjb3JkIGl0IGFzIC5jZW50ZXJcbiAgICB0aGlzLmNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAodGhpcy5taW5YICsgdGhpcy5tYXhYKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblkgKyB0aGlzLm1heFkpIC8gMixcbiAgICAgICAgKHRoaXMubWluWiArIHRoaXMubWF4WikgLyAyXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0R3JvdW5kU3RhY2sgPSBmdW5jdGlvbihibG9jaywgc3RhY2spIHtcbiAgICB2YXIgbGF5ZXJMZXZlbCA9IGJsb2NrLmdbMF0uejtcbiAgICBmb3IgKHZhciBsYXllciA9IDA7IGxheWVyIDwgc3RhY2subGVuZ3RoOyBsYXllcisrKSB7XG4gICAgICAgIGJsb2NrLmdbbGF5ZXJdID0ge1xuICAgICAgICAgICAgejogbGF5ZXJMZXZlbCxcbiAgICAgICAgICAgIGR6OiBzdGFja1tsYXllcl1bMV0sXG4gICAgICAgICAgICBtOiBzdGFja1tsYXllcl1bMF0sXG4gICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBsYXllckxldmVsIC09IHN0YWNrW2xheWVyXVsxXTtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVidWlsZENodW5rcyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGlmIChibG9jay5nW2xdLmNodW5rKSB7XG4gICAgICAgICAgICBibG9jay5nW2xdLmNodW5rLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0QmxvY2tIZWlnaHQgPSBmdW5jdGlvbihibG9jaywgeikge1xuICAgIC8vIHRvIHNldCB0aGUgYmxvY2sgZ3JvdW5kIGhlaWdodCwgd2UgbmVlZCB0byBmaW5kIHRoZSBibG9jaydzXG4gICAgLy8gY3VycmVudCBncm91bmQgaGVpZ2h0ICh0aGUgeiBvZiB0aGUgdG9wIGxheWVyKSwgd29yayBvdXQgYVxuICAgIC8vIGRpZmYgYmV0d2VlbiB0aGF0IGFuZCB0aGUgbmV3IGhlaWdodCwgYW5kIGFkZCB0aGF0IGRpZmYgdG9cbiAgICAvLyBhbGwgdGhlIGxheWVycy5cbiAgICB2YXIgZFogPSB6IC0gYmxvY2suZ1swXS56O1xuICAgIHZhciBkZXB0aDtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgYmxvY2suZ1tsXS56ICs9IGRaO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5nZXRCbG9jayA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAvLyByZXR1cm4gdGhlIGJsb2NrIHRoYXQgaW5jbHVkZXMgIHgseVxuICAgIHZhciBneCA9ICh4IC0gdGhpcy5taW5YKSAvIHRoaXMuX2JYO1xuICAgIHZhciBneSA9ICh5IC0gdGhpcy5taW5ZKSAvIHRoaXMuX2JZO1xuICAgIHJldHVybiAodGhpcy5fZ1tneF1bZ3ldKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW52b2tlIHRoZSBjYWxsYmFjayBlYWNoIGJsb2NrIGluIHR1cm5cbi8vIGNhbGxiYWNrIHNob3VsZCBsb29rIGxpa2U6IGZ1bmN0aW9uKGVyciwgYmxvY2spIHsgLi4uIH1cbi8vIGlmIGVyciBpcyBudWxsIGV2ZXJ5dGhpbmcgaXMgZmluZS4gaWYgZXJyIGlzIG5vdCBudWxsLCB0aGVyZVxuLy8gd2FzIGFuIGVycm9yLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZWFjaEJsb2NrID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcsIG9yZGVyKSB7XG4gICAgaWYgKG9yZGVyID09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcmRlciA9ICd4dXAteXVwJztcbiAgICB9XG4gICAgaWYgKHRoaXNBcmcgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAob3JkZXIgPT0gJ3h1cC15dXAnKSB7XG4gICAgICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLl9nLmxlbmd0aDsgZ3grKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuX2dbMF0ubGVuZ3RoOyBneSsrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBudWxsLCB0aGlzLl9nW2d4XVtneV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVGaWVsZDtcblxuXG5cblxuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblNjYXBlQ2h1bmsgPSByZXF1aXJlKCcuL2NodW5rJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmVwcmVzZW50cyBhIHJlbmRlcmluZyBvZiBhIGxhbmRzY2FwZSAvIG1vb25zY2FwZSAvIHdoYXRldmVyXG4gKiBAcGFyYW0ge1NjYXBlRmllbGR9IGZpZWxkICB0aGUgZmllbGQgYmVpbmcgcmVuZGVyZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBkb20gICAgICAgIERPTSBlbGVtZW50IHRoZSBzY2FwZSBzaG91bGQgYmUgcmVuZGVyZWQgaW5mby5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICAgIGNvbGxlY3Rpb24gb2Ygb3B0aW9ucy5cbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZVNjZW5lKGZpZWxkLCBkb20sIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgLy8gbGlnaHRzOiBbJ2FtYmllbnQnLCAndG9wbGVmdCddXG4gICAgICAgIGxpZ2h0czogWydhbWJpZW50JywgJ3N1bicsICdza3knXVxuICAgIH07XG5cbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICAvLyBzYXZlIHRoZSBmaWVsZFxuICAgIHRoaXMuZiA9IGZpZWxkO1xuXG4gICAgLy8gZGlzY292ZXIgRE9NIGNvbnRhaW5lclxuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGRvbSk7XG5cbiAgICAvLyBjcmVhdGUgYW5kIHNhdmUgYWxsIHRoZSBiaXRzIHdlIG5lZWRcbiAgICB0aGlzLnJlbmRlcmVyID0gdGhpcy5fbWFrZVJlbmRlcmVyKHsgZG9tOiB0aGlzLmVsZW1lbnQgfSk7XG4gICAgdGhpcy5zY2VuZSA9IHRoaXMuX21ha2VTY2VuZSgpO1xuICAgIHRoaXMuY2FtZXJhID0gdGhpcy5fbWFrZUNhbWVyYSgpO1xuICAgIHRoaXMuY29udHJvbHMgPSB0aGlzLl9tYWtlQ29udHJvbHMoKTtcbiAgICB0aGlzLmxpZ2h0cyA9IHRoaXMuX21ha2VMaWdodHModGhpcy5fb3B0cy5saWdodHMpO1xuXG4gICAgdGhpcy5hZGRCbG9ja3MoKTtcblxuICAgIC8vIGFkZCBncmlkcyBhbmQgaGVscGVyIGN1YmVzXG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCk7XG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCd0b3AnKTtcbiAgICB0aGlzLmFkZEhlbHBlclNoYXBlcygpO1xuXG4gICAgLy8gVE9ETzogaGFuZGxlIHN1bidzIG1vdmVtZW50IGJldHRlclxuICAgIHZhciBzdW5Sb3RhdGlvbkF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcbiAgICB2YXIgZGF5ID0gdHJ1ZTtcbiAgICB2YXIgd2FzRGF5ID0gZmFsc2U7XG5cbiAgICB2YXIgbGFzdExvZ0F0ID0gMDsgLy8gREVCVUdcbiAgICByZW5kZXIgPSAoZnVuY3Rpb24gdW5ib3VuZFJlbmRlcih0cykge1xuXG4gICAgICAgIC8vIERFQlVHXG4gICAgICAgIGlmIChsYXN0TG9nQXQgKyAyMDAwIDwgdHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcuLi4nKTtcbiAgICAgICAgICAgIGxhc3RMb2dBdCA9IHRzO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IGhhbmRsZSBzdW4ncyBtb3ZlbWVudCBiZXR0ZXJcbiAgICAgICAgdGhpcy5saWdodHMuc3VuLnBvc2l0aW9uXG4gICAgICAgICAgICAuc3ViKHRoaXMuZi5jZW50ZXIpXG4gICAgICAgICAgICAuYXBwbHlBeGlzQW5nbGUoc3VuUm90YXRpb25BeGlzLCAwLjAxKVxuICAgICAgICAgICAgLmFkZCh0aGlzLmYuY2VudGVyKTtcblxuICAgICAgICBkYXkgPSAodGhpcy5saWdodHMuc3VuLnBvc2l0aW9uLnogPiB0aGlzLmYuY2VudGVyLnopO1xuICAgICAgICBpZiAoZGF5ICYmICF3YXNEYXkpIHtcbiAgICAgICAgICAgIHRoaXMubGlnaHRzLnN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuMzM7XG4gICAgICAgIH0gZWxzZSBpZiAoIWRheSAmJiB3YXNEYXkpIHtcbiAgICAgICAgICAgIHRoaXMubGlnaHRzLnN1bi5zaGFkb3dEYXJrbmVzcyA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgd2FzRGF5ID0gZGF5O1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSggcmVuZGVyICk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKCB0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSApO1xuICAgICAgICB0aGlzLmNvbnRyb2xzLnVwZGF0ZSgpO1xuICAgIH0pLmJpbmQodGhpcyk7XG5cbiAgICByZW5kZXIoMCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZVNjZW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVTY2VuZTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkQmxvY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoZVNjZW5lID0gdGhpcy5zY2VuZTtcbiAgICB2YXIgbWluWiA9IHRoaXMuZi5taW5aO1xuICAgIHZhciBkZXB0aCwgbGF5ZXI7XG4gICAgdGhpcy5mLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGxheWVySW5kZXggPSAwOyBsYXllckluZGV4IDwgYi5nLmxlbmd0aDsgbGF5ZXJJbmRleCsrKSB7XG4gICAgICAgICAgICBiLmdbbGF5ZXJJbmRleF0uY2h1bmsgPSBuZXcgU2NhcGVDaHVuayhcbiAgICAgICAgICAgICAgICB0aGVTY2VuZSwgYiwgbGF5ZXJJbmRleCwgbWluWlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZi5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBwb3NpdGlvbi9heGlzIGhlbHBlciBjdWJlcy5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUodGhpcy5mLm1pblgsIHRoaXMuZi5taW5ZLCB0aGlzLmYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSh0aGlzLmYubWF4WCwgdGhpcy5mLm1pblksIHRoaXMuZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgodGhpcy5mLm1pblggKyB0aGlzLmYubWF4WCkgLyAyLCB0aGlzLmYubWluWSwgdGhpcy5mLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKHRoaXMuZi5taW5YLCB0aGlzLmYubWF4WSwgdGhpcy5mLm1pblosIGdyZWVuKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUodGhpcy5mLm1pblgsIHRoaXMuZi5taW5ZLCB0aGlzLmYubWF4WiwgYmx1ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKHRoaXMuZi5tYXhYLCB0aGlzLmYubWF4WSwgdGhpcy5mLm1pblosIHdoaXRlKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBjdWJlIGF0IHgsIHksIHogdG8gY29uZmlybSB3aGVyZSB0aGF0IGlzLCBleGFjdGx5LlxuICogRWl0aGVyIHN1cHBseSB0aHJlZSBjb29yZGluYXRlcywgb3IgYSBUSFJFRS5WZWN0b3IzLiAgT3B0aW9uYWxseVxuICogc3VwcGx5IGEgY29sb3IuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckN1YmUgPSBmdW5jdGlvbih4LCB5LCB6LCBjb2xvcikge1xuICAgIC8vIGZpcnN0LCBzZXQgdGhlIGNvbG9yIHRvIHNvbWV0aGluZ1xuICAgIGlmICh0eXBlb2YgY29sb3IgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gZGVmYXVsdCB0byBsaWdodCBncmV5LlxuICAgICAgICBjb2xvciA9IG5ldyBUSFJFRS5Db2xvcigweGNjY2NjYyk7XG4gICAgfVxuICAgIHZhciBwb3M7IC8vIHRoZSBwb3NpdGlvbiB0byBkcmF3IHRoZSBjdWJlXG4gICAgaWYgKHR5cGVvZiB4LnggIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gdGhlbiBpdCdzIGEgdmVjdG9yLCBhbmQgeSBtaWdodCBiZSB0aGUgY29sb3JcbiAgICAgICAgcG9zID0geDtcbiAgICAgICAgaWYgKHR5cGVvZiB5ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb2xvciA9IHk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB4IGlzbid0IGEgdmVjdG9yLCBzbyBhc3N1bWUgc2VwYXJhdGUgeCB5IGFuZCB6XG4gICAgICAgIHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIHopO1xuICAgICAgICAvLyB3ZSBjYXVnaHQgY29sb3IgYWxyZWFkeS5cbiAgICB9XG4gICAgLy8gYWJvdXQgYSBmaWZ0aWV0aCBvZiB0aGUgZmllbGQncyBzdW1tZWQgZGltZW5zaW9uc1xuICAgIHZhciBzaXplID0gKHRoaXMuZi53WCArIHRoaXMuZi53WSArIHRoaXMuZi53WikgLyA1MDtcblxuICAgIC8vIG9rYXkuLiByZWFkeSB0byBkcmF3XG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoIHNpemUsIHNpemUsIHNpemUgKTtcbiAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7IGNvbG9yOiBjb2xvciB9KTtcbiAgICB2YXIgY3ViZSA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdGVyaWFsKTtcbiAgICBjdWJlLnBvc2l0aW9uLmNvcHkocG9zKTtcbiAgICB0aGlzLnNjZW5lLmFkZChjdWJlKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyR3JpZCA9IGZ1bmN0aW9uKHRvcE9yQm90dG9tKSB7XG4gICAgdmFyIGd6ID0gMDtcbiAgICB2YXIgZ2MgPSAweDQ0NDQ0NDtcbiAgICBpZiAodG9wT3JCb3R0b20gPT0gJ3RvcCcpIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWF4WjtcbiAgICAgICAgZ2MgPSAweGNjY2NmZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBneiA9IHRoaXMuZi5taW5aO1xuICAgICAgICBnYyA9IDB4Y2NmZmNjO1xuICAgIH1cblxuICAgIHZhciBncmlkVyA9IE1hdGgubWF4KHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsIHRoaXMuZi5tYXhZIC0gdGhpcy5mLm1pblkpO1xuXG4gICAgLy8gR3JpZCBcInNpemVcIiBpcyB0aGUgZGlzdGFuY2UgaW4gZWFjaCBvZiB0aGUgZm91ciBkaXJlY3Rpb25zLFxuICAgIC8vIHRoZSBncmlkIHNob3VsZCBzcGFuLiAgU28gZm9yIGEgZ3JpZCBXIHVuaXRzIGFjcm9zcywgc3BlY2lmeVxuICAgIC8vIHRoZSBzaXplIGFzIFcvMi5cbiAgICB2YXIgZ3JpZFhZID0gbmV3IFRIUkVFLkdyaWRIZWxwZXIoZ3JpZFcvMiwgZ3JpZFcvMTApO1xuICAgIGdyaWRYWS5zZXRDb2xvcnMoZ2MsIGdjKTtcbiAgICBncmlkWFkucm90YXRpb24ueCA9IE1hdGguUEkvMjtcbiAgICBncmlkWFkucG9zaXRpb24uc2V0KHRoaXMuZi5taW5YICsgZ3JpZFcvMiwgdGhpcy5mLm1pblkgKyBncmlkVy8yLCBneik7XG4gICAgdGhpcy5zY2VuZS5hZGQoZ3JpZFhZKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBDcmVhdGUgYW5kIHJldHVybiBhIFRIUkVFLlJlbmRlcmVyLlxuICogQHBhcmFtIHtvYmplY3R9IHZhcmlvdXMgb3B0aW9uc1xuICogQHBhcmFtIHtET01FbGVtZW50fGpRdWVyeUVsZW19IG9wdGlvbnMuZG9tIGEgZG9tIGVsZW1lbnRcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy53aWR0aCByZW5kZXJlciB3aWR0aCAoaW4gcGl4ZWxzKVxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmhlaWdodCByZW5kZXJlciBoZWlnaHQgKGluIHBpeGVscylcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VSZW5kZXJlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGFudGlhbGlhczogdHJ1ZSwgYWxwaGE6IHRydWUgfSk7XG4gICAgcmVuZGVyZXIuc2V0Q2xlYXJDb2xvciggMHgwMDAwMDAsIDApO1xuICAgIHJlbmRlcmVyLnNoYWRvd01hcEVuYWJsZWQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZG9tKSB7XG4gICAgICAgIHZhciAkZG9tID0gJChvcHRpb25zLmRvbSk7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUoJGRvbS53aWR0aCgpLCAkZG9tLmhlaWdodCgpKTtcbiAgICAgICAgJGRvbS5hcHBlbmQocmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMud2lkdGggJiYgb3B0aW9ucy5oZWlnaHQpIHtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZShvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCk7XG4gICAgfVxuICAgIHJldHVybiByZW5kZXJlcjtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VMaWdodHMgPSBmdW5jdGlvbihsaWdodHNUb0luY2x1ZGUpIHtcblxuICAgIHZhciBsaWdodHMgPSB7fTtcbiAgICB2YXIgZiA9IHRoaXMuZjsgIC8vIGNvbnZlbmllbnQgcmVmZXJlbmNlIHRvIHRoZSBmaWVsZFxuXG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdhbWJpZW50JykgIT0gLTEpIHtcbiAgICAgICAgLy8gYWRkIGFuIGFtYmllbnQgbGlzdFxuICAgICAgICBsaWdodHMuYW1iaWVudCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgyMjIyMzMpO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3RvcGxlZnQnKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMubGVmdCA9IG5ldyBUSFJFRS5Qb2ludExpZ2h0KDB4ZmZmZmZmLCAxLCAwKTtcbiAgICAgICAgLy8gcG9zaXRpb24gbGlnaHQgb3ZlciB0aGUgdmlld2VyJ3MgbGVmdCBzaG91bGRlci4uXG4gICAgICAgIC8vIC0gTEVGVCBvZiB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB4IHdpZHRoXG4gICAgICAgIC8vIC0gQkVISU5EIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHkgd2lkdGhcbiAgICAgICAgLy8gLSBBQk9WRSB0aGUgY2FtZXJhIGJ5IHRoZSBmaWVsZCdzIGhlaWdodFxuICAgICAgICBsaWdodHMubGVmdC5wb3NpdGlvbi5hZGRWZWN0b3JzKFxuICAgICAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24sXG4gICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMygtMC41ICogZi53WCwgLTAuNSAqIGYud1ksIDEgKiBmLndaKVxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3N1bicpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5zdW4gPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZlZSk7XG4gICAgICAgIGxpZ2h0cy5zdW4uaW50ZW5zaXR5ID0gMS4wO1xuXG4gICAgICAgIC8vIHBvc2l0aW9uIG9mIHN1blxuICAgICAgICB2YXIgc3VuSGVpZ2h0ID0gNSAqIGYud1o7XG4gICAgICAgIGxpZ2h0cy5zdW4ucG9zaXRpb24uc2V0KGYubWluWCAtIGYud1gsIGYubWluWSAtIGYud1ksIGYubWF4WiArIHN1bkhlaWdodCk7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7ICAvLyBERUJVR1xuXG4gICAgICAgIC8vIGRpcmVjdGlvbiBvZiBzdW5saWdodFxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnN1bi50YXJnZXQgPSB0YXJnZXQ7XG5cbiAgICAgICAgLy8gc3VuIGRpc3RhbmNlLCBsb2xcbiAgICAgICAgdmFyIHN1bkRpc3RhbmNlID0gbGlnaHRzLnN1bi5wb3NpdGlvbi5kaXN0YW5jZVRvKGxpZ2h0cy5zdW4udGFyZ2V0LnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbG9uZ2VzdCBkaWFnb25hbCBmcm9tIGZpZWxkLWNlbnRlclxuICAgICAgICB2YXIgbWF4RmllbGREaWFnb25hbCA9IGYuY2VudGVyLmRpc3RhbmNlVG8obmV3IFRIUkVFLlZlY3RvcjMoZi5taW5YLCBmLm1pblksIGYubWluWikpO1xuXG4gICAgICAgIC8vIHNoYWRvdyBzZXR0aW5nc1xuICAgICAgICBsaWdodHMuc3VuLmNhc3RTaGFkb3cgPSB0cnVlO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0RhcmtuZXNzID0gMC4zMztcblxuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYU5lYXIgPSBzdW5EaXN0YW5jZSAtIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhRmFyID0gc3VuRGlzdGFuY2UgKyBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVRvcCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhUmlnaHQgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUJvdHRvbSA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFMZWZ0ID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3NreScpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5za3kgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweDY2NjY3Nyk7XG4gICAgICAgIGxpZ2h0cy5za3kuaW50ZW5zaXR5ID0gMS4wO1xuXG4gICAgICAgIC8vIHNreSBpcyBkaXJlY3RseSBhYm92ZVxuICAgICAgICB2YXIgc2t5SGVpZ2h0ID0gNSAqIGYud1o7XG4gICAgICAgIGxpZ2h0cy5za3kucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIGxpZ2h0cy5za3kucG9zaXRpb24uc2V0WihmLm1heFogKyBza3lIZWlnaHQpO1xuICAgICAgICBsaWdodHMuc2t5LnNoYWRvd0NhbWVyYVZpc2libGUgPSB0cnVlOyAgLy8gREVCVUdcblxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnNreS50YXJnZXQgPSB0YXJnZXQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgbGlnaHQgaW4gbGlnaHRzKSB7XG4gICAgICAgIGlmIChsaWdodHMuaGFzT3duUHJvcGVydHkobGlnaHQpKSB7XG4gICAgICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodHNbbGlnaHRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaWdodHM7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQ3JlYXRlIGFuZCByZXR1cm4gYSBUSFJFRS5TY2VuZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG4gICAgLy8gYWRkIGZvZ1xuICAgIC8vIHNjZW5lLmZvZyA9IG5ldyBUSFJFRS5Gb2coJyNmMGY4ZmYnLCAxMDAsIDE1MCk7XG4gICAgcmV0dXJuIHNjZW5lO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFt2aWV3QW5nbGUgZGVzY3JpcHRpb25dXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNhbWVyYSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgIC8vIHZpZXdpbmcgYW5nbGVcbiAgICAvLyBpIHRoaW5rIHRoaXMgaXMgdGhlIHZlcnRpY2FsIHZpZXcgYW5nbGUuICBob3Jpem9udGFsIGFuZ2xlIGlzXG4gICAgLy8gZGVyaXZlZCBmcm9tIHRoaXMgYW5kIHRoZSBhc3BlY3QgcmF0aW8uXG4gICAgdmFyIHZpZXdBbmdsZSA9IDQ1O1xuICAgIHZpZXdBbmdsZSA9IChvcHRpb25zICYmIG9wdGlvbnMudmlld0FuZ2xlKSB8fCB2aWV3QW5nbGU7XG5cbiAgICAvLyBhc3BlY3RcbiAgICB2YXIgdmlld0FzcGVjdCA9IDE2Lzk7XG4gICAgaWYgKHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgdmlld0FzcGVjdCA9ICRlbGVtLndpZHRoKCkgLyAkZWxlbS5oZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvLyBuZWFyIGFuZCBmYXIgY2xpcHBpbmdcbiAgICB2YXIgbmVhckNsaXAgPSAwLjE7XG4gICAgdmFyIGZhckNsaXAgPSAxMDAwMDtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIG5lYXJDbGlwID0gTWF0aC5taW4odGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgLyAxMDAwO1xuICAgICAgICBmYXJDbGlwID0gTWF0aC5tYXgodGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgKiAxMDtcbiAgICB9XG5cbiAgICAvLyBjYW1lcmEgcG9zaXRpb24gYW5kIGxvb2tpbmcgZGlyZWN0aW9uXG4gICAgdmFyIGxvb2tIZXJlID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XG4gICAgdmFyIGNhbVBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xMCwgNSk7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBsb29rSGVyZSA9IHRoaXMuZi5jZW50ZXI7XG4gICAgICAgIGNhbVBvcyA9IGxvb2tIZXJlLmNsb25lKCkuYWRkKG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xLjEgKiB0aGlzLmYud1ksIDMgKiB0aGlzLmYud1opKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgdXAgY2FtZXJhXG4gICAgdmFyIGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSggdmlld0FuZ2xlLCB2aWV3QXNwZWN0LCBuZWFyQ2xpcCwgZmFyQ2xpcCk7XG4gICAgLy8gXCJ1cFwiIGlzIHBvc2l0aXZlIFpcbiAgICBjYW1lcmEudXAuc2V0KDAsMCwxKTtcbiAgICBjYW1lcmEucG9zaXRpb24uY29weShjYW1Qb3MpO1xuICAgIGNhbWVyYS5sb29rQXQobG9va0hlcmUpO1xuXG4gICAgLy8gYWRkIHRoZSBjYW1lcmEgdG8gdGhlIHNjZW5lXG4gICAgaWYgKHRoaXMuc2NlbmUpIHtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoY2FtZXJhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FtZXJhO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwwLDApO1xuICAgIGlmICh0aGlzLmYgJiYgdGhpcy5mLmNlbnRlcikge1xuICAgICAgICBjZW50ZXIgPSB0aGlzLmYuY2VudGVyLmNsb25lKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNhbWVyYSAmJiB0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgY29udHJvbHMgPSBuZXcgVEhSRUUuT3JiaXRDb250cm9scyh0aGlzLmNhbWVyYSwgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgY29udHJvbHMuY2VudGVyID0gY2VudGVyO1xuICAgICAgICByZXR1cm4gY29udHJvbHM7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnc2NhcGUhJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTY2VuZTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBIGJhZyBvZiBzdHVmZiB0aGF0IHRoaW5ncyBjYW4gYmUgbWFkZSBvdXQgb2YuXG4gKi9cbnZhciBTY2FwZVN0dWZmID0ge307XG52YXIgTGFtYmVydCA9IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWw7XG5cbi8vIFwiZ2VuZXJpY1wiIHN0dWZmIGZvciB3aGVuIG5vdGhpbmcgZWxzZSBpcyBzcGVjaWZpZWRcblNjYXBlU3R1ZmYuZ2VuZXJpYyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4OTk5OTk5LFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNTAgfSk7XG5cbi8vIHdhdGVyIGlzIGJsdWUgYW5kIGEgYml0IHRyYW5zcGFyZW50XG5TY2FwZVN0dWZmLndhdGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgzMzk5ZmYsXG4gICAgICAgICAgICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC43NSB9KTtcblxuLy8gZGlydCBmb3IgZ2VuZXJhbCB1c2VcblNjYXBlU3R1ZmYuZGlydCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4YTA1MjJkIH0pO1xuLy8gTmluZSBkaXJ0IGNvbG91cnMgZm9yIHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzLiAgU3RhcnQgYnkgZGVmaW5pbmdcbi8vIHRoZSBkcmllc3QgYW5kIHdldHRlc3QgY29sb3VycywgYW5kIHVzZSAubGVycCgpIHRvIGdldCBhIGxpbmVhclxuLy8gaW50ZXJwb2xhdGVkIGNvbG91ciBmb3IgZWFjaCBvZiB0aGUgaW4tYmV0d2VlbiBkaXJ0cy5cbnZhciBkcnkgPSBuZXcgVEhSRUUuQ29sb3IoMHhiYjg4NTUpOyAvLyBkcnlcbnZhciB3ZXQgPSBuZXcgVEhSRUUuQ29sb3IoMHg4ODIyMDApOyAvLyBtb2lzdFxuXG5TY2FwZVN0dWZmLmRpcnQxID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5IH0pO1xuU2NhcGVTdHVmZi5kaXJ0MiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAxLzgpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAyLzgpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAzLzgpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA0LzgpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA1LzgpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA2LzgpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA3LzgpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IHdldCB9KTtcblxuLy8gbGVhZiBsaXR0ZXIgKGluIHJlYWxpdHkgbGVhZiBsaXR0ZXIgaXMgYnJvd24sIGJ1dCB1c2UgYSBzbGlnaHRseVxuLy8gZ3JlZW5pc2ggdG9uZSBoZXJlIHNvIGl0IGRvZXNuJ3QganVzdCBsb29rIGxpa2UgbW9yZSBkaXJ0KVxuU2NhcGVTdHVmZi5sZWFmbGl0dGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg1NTZiMmYgfSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVN0dWZmO1xuXG5cblxuXG4iXX0=
