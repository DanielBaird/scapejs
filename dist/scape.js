(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// THREE = require('three');

// get the various bits
base  = require('./scape/baseobject');
stuff = require('./scape/stuff');
field = require('./scape/field');
scene = require('./scape/scene');
chunk = require('./scape/chunk');

// make an object out of the various bits
Scape = {
    BaseObject: base,
    Stuff: stuff,
    Chunk: chunk,
    Field: field,
    Scene: scene
}

// return the object if we're being browserified; otherwise attach
// it to the global window object.
if (typeof module !== 'undefined') {
    module.exports = Scape;
} else {
    window.Scape = Scape;
}

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/scene":8,"./scape/stuff":9}],2:[function(require,module,exports){

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
 * Represents a rectangular prism of material that the solid "ground"
 * portion of a 'scape is make up of, e.g. dirt, leaf litter, water.
 *
 * This will create (and internally cache) a mesh based on the linked
 * chunk information to make rendering in WebGL faster.
 *
 * @param {ScapeScene} scene The ScapeScene the chunk will be added into
 * @param {Object} parentBlock The block (vertical column within the
 *                             scape) that owns this chunk
 * @param {Integer} layerIndex Index into parentBlock.g this chunk is at
 * @param {Number} minZ lowest Z value any chunk should have
 * @param {Object} options Various options, not currently used
 *
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
/**
 * Invoke a rebuild of this chunk.
 *
 * Discards existing cached mesh and builds a new mesh based on the
 * currently linked chunk information.
 *
 * @return none
 */
ScapeChunk.prototype.rebuild = function() {
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
 * The container for all information about an area.
 *
 * @param {object} options Various options for the ScapeField being created.
 *
 * option | default value | description
 * -------|--------------:|------------
 * `minX`     |    0 | smallest X for this field
 * `maxX`     |  100 | largest X for this field
 * `blocksX`  |   10 | number of blocks to divide the X axis into
 * `minY`     |    0 | smallest Y for this field
 * `maxY`     |  100 | largest Y for this field
 * `blocksY`  |   10 | number of blocks to divide the Y axis into
 * `minZ`     |    0 | smallest Z (vertical dimension) for this field
 * `maxZ`     |   40 | largest Z for this field
 * `blocksZ`  |   80 | number of blocks to divide the Z axis into
 * `blockGap` | 0.04 | gap to leave between blocks along the X and Y axes
 *
 * @class
 */
function ScapeField(options) {

    var defaultOptions = {
        minX: 0,        maxX: 100,          blocksX: 10,
        minY: 0,        maxY: 100,          blocksY: 10,
        minZ: 0,        maxZ: 40,           blocksZ: 80,
        blockGap: 0.04
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

    this._items = [];

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
/** @private */
ScapeField.prototype._makeGrid = function() {
    this._g = [];
    for (var gx = 0; gx < this.blocksX; gx++) {
        var col = [];
        for (var gy = 0; gy < this.blocksY; gy++) {
            var xGap = this._bX * this._opts.blockGap / 2;
            var yGap = this._bY * this._opts.blockGap / 2;
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
 * Add a list of items to the scape at various points.
 * Unlike {@link ScapeField#addItem addItem}, this method will
 * re-position items across the Field (so you don't need to call
 * {@link ScapeField#calcItems calcItems} yourself).
 *
 * @param {Array} itemList A list of items.  Each element must
 * have `x`, `y`, and `item` properties.
 * @param {Boolean} replace If a truthy value is supplied, this
 * method will discard existing height claims before adding these
 * ones.  If false or unsupplied, these new claims will be added to
 * the existing ones.
 */
ScapeField.prototype.addItems = function(itemList, replace) {
    if (replace) {
        this._items = [];
    }
    // loop through the list adding each one.
    for (var s = 0; s < itemList.length; s++) {
        var theItem = itemList[s];
        this.addItem(theItem.x, theItem.y, theItem.item);
    }
    this.calcItems();
}
// ------------------------------------------------------------------
/**
 * Add a list of claims of the ground height at various points.
 * Unlike {@link ScapeField#addGroundHeight addGroundHeight}, this
 * method will re-extrapolate ground heights across the Field (so
 * you don't need to call
 * {@link ScapeField#calcGroundHeights calcGroundHeights} yourself).
 *
 * @param {Array} heightList A list of objects.  Each element must
 * have `x`, `y`, and `z` properties.
 * @param {Boolean} replace If a truthy value is supplied, this
 * method will discard existing height claims before adding these
 * ones.  If false or unsupplied, these new claims will be added to
 * the existing ones.
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
 * Add a claim that the ground height is `z` at point `x`,`y`.
 * If you call this, remember to eventually call
 * {@link ScapeField#calcGroundHeights calcGroundHeights} after so
 * ground heights get extrapolated across the entire Field.
 *
 * @param {Number} x X coordinate of this ground height record
 * @param {Number} y Y coordinate of this ground height record
 * @param {Number} z the height of the ground at position `x`,`y`
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
 * (re)calculate the ground height.  You need to call this if you
 * add ground height claims one at a time using
 * {@link ScapeField#addGroundHeight addGroundHeight}.
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
 * (re)calculate the ground stacks.  You need to call this if you
 * add ground stacks one at a time using
 * {@link ScapeField#addGroundStack addGroundStack}.
 *
 */
ScapeField.prototype.calcGroundStacks = function() {

    this.eachBlock( function(err, block) {
        // TODO: check err

        // make the stack for this ground block by copying the
        // nearest defined stack.
        var s, dx, dy, thisDist, bestStack;
        var bestDist = this.wX + this.wY + this.wZ;
        bestDist = bestDist * bestDist;
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
        this.setGroundStack(block, bestStack.stack);

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

},{"./baseobject":2,"./stuff":9}],5:[function(require,module,exports){

/**
 * A bag of item types -- i.e. THREE.Geometrys -- that scapes can have in them.
 *
 * @namespace
 */
var ScapeItems = {
    // documentation for items are in the ./itemtypes/* files
    cube: require('./itemtypes/cube'),
    tree: require('./itemtypes/tree')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/cube":6,"./itemtypes/tree":7}],6:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');
// ------------------------------------------------------------------
/**
 * Returns a cube mesh of the specified size and material.
 * @param {number} size The length of a side of the cube.  Defaults to 1.
 * @param {THREE.Material} material What the make the cube out of.  Defaults to `Scape.Stuff.generic`
 * @param {Object} options Not used.
 *
 * @function
 * @name ScapeItems.cube
 */
function ScapeCubeFactory(size, material, options) {
    // construct a mesh "sitting on" the point 0,0,0

    size = size || 1;
    material = material || ScapeStuff.generic;

    // makes a cube centered on 0,0,0
    var geom = new THREE.BoxGeometry(size, size, size);

    // transform it up a bit, so we're centered on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0.
    geom.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, size/2) );

    // return a thing with that geometry, made of the material
    return new THREE.Mesh(geom, material);
};
// ------------------------------------------------------------------
module.exports = ScapeCubeFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":9}],7:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
// ------------------------------------------------------------------
/**
 * Returns a tree mesh of the specified size and color.
 * @param {number} trunkDiameter Diameter of trunk (a.k.a. DBH)
 * @param {number} height Height of tree
 * @param {THREE.Material} trunkMaterial What to make the trunk out of
 * @param {THREE.Material} leafMaterial What to make the foliage out of
 * @param {Object} options Not used.
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeCubeFactory(trunkDiameter, height, trunkMaterial, leafMaterial, options) {

	var geom = new THREE.CylinderGeometry(trunkDiameter/10, trunkDiameter/2, height);

	// transform it up a bit:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);
	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var translate = new THREE.Matrix4().makeTranslation(0,0,height/2);

	geom.applyMatrix(translate.multiply(rotate));

	return new THREE.Mesh(geom, trunkMaterial);
};
// ------------------------------------------------------------------
module.exports = ScapeCubeFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
ScapeObject = require('./baseobject');
ScapeChunk = require('./chunk');


// DEBUG
ScapeStuff = require('./stuff');
ScapeItems = require('./itemtypes');

// ------------------------------------------------------------------
/**
 * @callback ScapeScene~dateChange
 * @param {string} error Description of error, otherwise null
 * @param {date} date Date the scape is now displaying
 */
/**
 * Represents a rendering of a landscape / moonscape / whatever
 * @param {ScapeField} field  the field being rendered
 * @param {string} dom        DOM element the scape should be
 *                            rendered into.
 * @param {object} options    collection of options.  All are optional.
 * @param {String[]} options.lights='sun','sky' - array of strings
 * naming lights to include in this scene.  Choose from:
 *
 * string    | light type
 * ----------|-----------
 * `topleft` | a light from above the camera's left shoulder
 * `ambient` | a dim ambient light
 * `sun`     | a directional light that orbits the scene once per day
 * `sky`     | a directional light that shines from above the scene
 * @param {Date|"now"} options.currentDate='now' - The time and date
 * inside the scape.  The string "now" means set currentDate to the
 * present.
 * @param {number} options.timeRatio=1 The rate time should pass in
 * the scape, relative to normal.  0.1 means ten times slower.  60
 * means one minute real time = one hour scape time.
 * @param {ScapeScene~dateChange} options.dateUpdate callback for
 * when the scene time changes (which is a lot).
 *
 * @class
 */
function ScapeScene(field, dom, options) {

    var defaultOptions = {
        // lights: ['topleft', 'ambient'],
        lights: ['sun', 'sky'],
        currentDate: 'now',  // either string 'now' or a Date object
        timeRatio: 1,
        dateUpdate: null // callback toupdate the displayed date/time
    };

    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    // save the field
    this.f = field;

    // discover DOM container
    this.element = document.getElementById(dom);

    this.date = this._opts.currentDate;
    if (this.date === 'now') {
        this.date = new Date();
    }
    this.startDate = this.date;
    this.firstRender = new Date().getTime();

    // create and save all the bits we need
    this.renderer = this._makeRenderer({ dom: this.element });
    this.scene = this._makeScene();
    this.camera = this._makeCamera();
    this.controls = this._makeControls();
    this.lights = this._makeLights(this._opts.lights);

    this.addBlocks();

    // add grids and helper cubes
    // this.addHelperGrid();
    this.addHelperGrid('top');
    this.addHelperShapes();

    var lastLogAt = 0; // DEBUG
    var render = (function unboundRender(ts) {

        // DEBUG
        if (lastLogAt + 2000 < ts) {
            // console.log('rendering...');
            lastLogAt = ts;
        }

        // DEBUG disabled time updates..
        // this._updateTime();
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
/**
 * add blocks from the attached ScapeField into the scene.
 *
 * You will probably only need to call this once.
 */
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
 * add helper cubes at some of the corners of your scape, so you can
 * see where they are in space.
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

    var wood = ScapeStuff.leaflitter;
    var tree = ScapeItems.tree(1,30,wood);
    tree.position.copy(new THREE.Vector3(this.f.minX, this.f.minY, this.f.minZ));
    this.scene.add(tree);

}
// ------------------------------------------------------------------
/**
 * add a cube at position `x`, `y`, `z` to confirm where that is,
 * exactly.  Great for trying to work out if your scape is being
 * rendered where you think it should be rendered.
 *
 * @param {(Number|Vector3)} x X coordinate, or a {@link http://threejs.org/docs/#Reference/Math/Vector3 THREE.Vector3} containing x, y and z coords
 * @param {Number} [y] Y coordinate
 * @param {Number} [z] Z coordinate
 * @param {Color|String|Integer} color='#cccccc' Color of cube.
 * Can be a {@link http://threejs.org/docs/#Reference/Math/Color THREE.Color}, a color-parseable string like
 * `'#3366cc'`, or a number like `0x3366cc`.
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
    // use the colour we decided earlier
    var material = new THREE.MeshLambertMaterial({ color: color });

    // okay.. make it, position it, and show it
    var cube = ScapeItems.cube(size, material);
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
 *
 * @param {object} various options
 * @param {DOMElement|jQueryElem} options.dom a dom element
 * @param {integer} options.width renderer width (in pixels)
 * @param {integer} options.height renderer height (in pixels)
 *
 * @private
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
/**
 * updates the scape time to match the current time (taking into
 * account the timeRatio etc).
 *
 * @private
 */
ScapeScene.prototype._updateTime = function() {
    var now = new Date();
    var elapsed = now.getTime() - this.firstRender;
    this.date = new Date(this.firstRender + (elapsed * this._opts.timeRatio));
    var callback = this._opts.dateUpdate;
    if (typeof callback === 'function') {
        var callbackDate = new Date(this.date);
        setTimeout(function() {
            callback.call(null, callbackDate);
        }, 0);
    }
    this._updateSun();
}
// ------------------------------------------------------------------
/**
 * updates the position of the sun to suit the scape current time.
 * @param  {THREE.DirectionalLight} [sun] the sun to act on.  If not
 * supplied, this method will act on the light in this scene's light
 * list that is called "sun".
 *
 * @private
 */
ScapeScene.prototype._updateSun = function(sun) {

    if (typeof sun == 'undefined') {
        // if they didn't provide a sun, use our own
        sun = this.lights.sun;
    }

    if (typeof sun == 'undefined') {
        return; // bail if there's no sun ARRRH WHAT DID YOU DO
    }

    var sunAngle = (this.date.getHours()*60 + this.date.getMinutes()) / 1440 * 2 * Math.PI;
    var sunRotationAxis = new THREE.Vector3(0, 1, 0);

    sun.position
        .set(0, -3 * this.f.wY, -20 * this.f.wZ)
        .applyAxisAngle(sunRotationAxis, sunAngle)
        .add(this.f.center);

    var sunZ = sun.position.z;

    // switch the sun off when it's night time
    if (sun.onlyShadow == false && sunZ <= this.f.center.z) {
        sun.onlyShadow = true;
    } else if (sun.onlyShadow == true && sunZ > this.f.center.z) {
        sun.onlyShadow = false;
    }

    // fade out the shadow darkness when the sun is low
    if (sunZ >= this.f.center.z && sunZ <= this.f.maxZ) {
        var upness = Math.max(0, (sunZ - this.f.center.z) / this.f.wZ * 2);
        sun.shadowDarkness = 0.5 * upness;
        sun.intensity = upness;
    }

}
// ------------------------------------------------------------------
/** @private */
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

        this._updateSun(lights.sun);

        // lights.sun.shadowCameraVisible = true;  // DEBUG

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
        lights.sky = new THREE.DirectionalLight(0xeeeeff);
        lights.sky.intensity = 0.8;

        // sky is directly above
        var skyHeight = 5 * f.wZ;
        lights.sky.position.copy(this.camera.position);
        // lights.sky.position.setZ(f.maxZ + skyHeight);

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
/** @private */
ScapeScene.prototype._makeScene = function() {
    var scene = new THREE.Scene();
    // add fog
    // scene.fog = new THREE.Fog('#f0f8ff', 100, 150);
    return scene;
}
// ------------------------------------------------------------------
/** @private */
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
/** @private */
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

},{"./baseobject":2,"./chunk":3,"./itemtypes":5,"./stuff":9}],9:[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
// ------------------------------------------------------------------
/**
 * Stuff (that is, THREE.Material) that things in scapes can be made out of.
 * @namespace
 */
var ScapeStuff = {};
var Lambert = THREE.MeshLambertMaterial;

/** generic stuff, for if nothing else is specified
  * @memberof ScapeStuff */
ScapeStuff.generic = new Lambert({ color: 0x999999,
                     transparent: true, opacity: 0.50 });

/** water is blue and a bit transparent
  * @memberof ScapeStuff */
ScapeStuff.water = new Lambert({ color: 0x3399ff,
                     transparent: true, opacity: 0.75 });

/** dirt for general use
  * @memberof ScapeStuff */
ScapeStuff.dirt = new Lambert({ color: 0xa0522d });

// Nine dirt colours for varying moisture levels.  Start by defining
// the driest and wettest colours, and use .lerp() to get a linear
// interpolated colour for each of the in-between dirts.
var dry = new THREE.Color(0xbb8855); // dry
var wet = new THREE.Color(0x882200); // moist

/** dirt at varying moisture levels: dirt0 is dry and light in
  * colour, dirt9 is moist and dark.
  * @name "dirt0 to dirt9"
  * @memberof ScapeStuff */
ScapeStuff.dirt0 = new Lambert({ color: dry });
ScapeStuff.dirt1 = new Lambert({ color: dry.clone().lerp(wet, 1/9) });
ScapeStuff.dirt2 = new Lambert({ color: dry.clone().lerp(wet, 2/9) });
ScapeStuff.dirt3 = new Lambert({ color: dry.clone().lerp(wet, 3/9) });
ScapeStuff.dirt4 = new Lambert({ color: dry.clone().lerp(wet, 4/9) });
ScapeStuff.dirt5 = new Lambert({ color: dry.clone().lerp(wet, 5/9) });
ScapeStuff.dirt6 = new Lambert({ color: dry.clone().lerp(wet, 6/9) });
ScapeStuff.dirt7 = new Lambert({ color: dry.clone().lerp(wet, 7/9) });
ScapeStuff.dirt8 = new Lambert({ color: dry.clone().lerp(wet, 8/9) });
ScapeStuff.dirt9 = new Lambert({ color: wet });

/** leaf litter, which in reality is usually brownish, but this has
  * a greenish tone to distinguish it from plain dirt.
  * @memberof ScapeStuff */
ScapeStuff.leaflitter = new Lambert({ color: 0x556b2f });

ScapeStuff.wood = new Lambert({ color: 0x995533 });

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2N1YmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL3RyZWUuanMiLCJzcmMvc2NhcGUvc2NlbmUuanMiLCJzcmMvc2NhcGUvc3R1ZmYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vIFRIUkVFID0gcmVxdWlyZSgndGhyZWUnKTtcblxuLy8gZ2V0IHRoZSB2YXJpb3VzIGJpdHNcbmJhc2UgID0gcmVxdWlyZSgnLi9zY2FwZS9iYXNlb2JqZWN0Jyk7XG5zdHVmZiA9IHJlcXVpcmUoJy4vc2NhcGUvc3R1ZmYnKTtcbmZpZWxkID0gcmVxdWlyZSgnLi9zY2FwZS9maWVsZCcpO1xuc2NlbmUgPSByZXF1aXJlKCcuL3NjYXBlL3NjZW5lJyk7XG5jaHVuayA9IHJlcXVpcmUoJy4vc2NhcGUvY2h1bmsnKTtcblxuLy8gbWFrZSBhbiBvYmplY3Qgb3V0IG9mIHRoZSB2YXJpb3VzIGJpdHNcblNjYXBlID0ge1xuICAgIEJhc2VPYmplY3Q6IGJhc2UsXG4gICAgU3R1ZmY6IHN0dWZmLFxuICAgIENodW5rOiBjaHVuayxcbiAgICBGaWVsZDogZmllbGQsXG4gICAgU2NlbmU6IHNjZW5lXG59XG5cbi8vIHJldHVybiB0aGUgb2JqZWN0IGlmIHdlJ3JlIGJlaW5nIGJyb3dzZXJpZmllZDsgb3RoZXJ3aXNlIGF0dGFjaFxuLy8gaXQgdG8gdGhlIGdsb2JhbCB3aW5kb3cgb2JqZWN0LlxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTY2FwZTtcbn0gZWxzZSB7XG4gICAgd2luZG93LlNjYXBlID0gU2NhcGU7XG59XG4iLCJcbi8vXG4vLyB0aGlzIFwiYmFzZVwiIG9iamVjdCBoYXMgYSBmZXcgY29udmVuaWVuY2UgZnVuY3Rpb25zIGZvciBoYW5kbGluZ1xuLy8gb3B0aW9ucyBhbmQgd2hhdG5vdFxuLy9cblxuZnVuY3Rpb24gU2NhcGVPYmplY3Qob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgICB0aGlzLl9vcHRzID0gT2JqZWN0LmNyZWF0ZShkZWZhdWx0cyk7XG4gICAgdGhpcy5tZXJnZU9wdGlvbnMob3B0aW9ucyk7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lcmdlIG5ldyBvcHRpb25zIGludG8gb3VyIG9wdGlvbnNcblNjYXBlT2JqZWN0LnByb3RvdHlwZS5tZXJnZU9wdGlvbnMgPSBmdW5jdGlvbihleHRyYU9wdHMpIHtcbiAgICBmb3IgKG9wdCBpbiBleHRyYU9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0c1tvcHRdID0gZXh0cmFPcHRzW29wdF07XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlT2JqZWN0OyIsIlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVjdGFuZ3VsYXIgcHJpc20gb2YgbWF0ZXJpYWwgdGhhdCB0aGUgc29saWQgXCJncm91bmRcIlxuICogcG9ydGlvbiBvZiBhICdzY2FwZSBpcyBtYWtlIHVwIG9mLCBlLmcuIGRpcnQsIGxlYWYgbGl0dGVyLCB3YXRlci5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBtZXNoIGJhc2VkIG9uIHRoZSBsaW5rZWRcbiAqIGNodW5rIGluZm9ybWF0aW9uIHRvIG1ha2UgcmVuZGVyaW5nIGluIFdlYkdMIGZhc3Rlci5cbiAqXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIFRoZSBTY2FwZVNjZW5lIHRoZSBjaHVuayB3aWxsIGJlIGFkZGVkIGludG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRCbG9jayBUaGUgYmxvY2sgKHZlcnRpY2FsIGNvbHVtbiB3aXRoaW4gdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NhcGUpIHRoYXQgb3ducyB0aGlzIGNodW5rXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGxheWVySW5kZXggSW5kZXggaW50byBwYXJlbnRCbG9jay5nIHRoaXMgY2h1bmsgaXMgYXRcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaW5aIGxvd2VzdCBaIHZhbHVlIGFueSBjaHVuayBzaG91bGQgaGF2ZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zLCBub3QgY3VycmVudGx5IHVzZWRcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVDaHVuayhzY2VuZSwgcGFyZW50QmxvY2ssIGxheWVySW5kZXgsIG1pblosIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgdGhpcy5fYmxvY2sgPSBwYXJlbnRCbG9jaztcbiAgICB0aGlzLl9pc1N1cmZhY2UgPSAobGF5ZXJJbmRleCA9PSAwKTtcbiAgICB0aGlzLl9sYXllciA9IHBhcmVudEJsb2NrLmdbbGF5ZXJJbmRleF07XG4gICAgdGhpcy5fbWluWiA9IG1pblo7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcblxuICAgIC8vIFRPRE86IGZpbmlzaCBoaW0hIVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlQ2h1bmsucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVDaHVuay5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUNodW5rO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEludm9rZSBhIHJlYnVpbGQgb2YgdGhpcyBjaHVuay5cbiAqXG4gKiBEaXNjYXJkcyBleGlzdGluZyBjYWNoZWQgbWVzaCBhbmQgYnVpbGRzIGEgbmV3IG1lc2ggYmFzZWQgb24gdGhlXG4gKiBjdXJyZW50bHkgbGlua2VkIGNodW5rIGluZm9ybWF0aW9uLlxuICpcbiAqIEByZXR1cm4gbm9uZVxuICovXG5TY2FwZUNodW5rLnByb3RvdHlwZS5yZWJ1aWxkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fY3JlYXRlTmV3TWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHRoZSBjaHVuayB3aWxsIGJlIGFzIGRlZXAgYXMgdGhlIGxheWVyIHNheXNcbiAgICB2YXIgZGVwdGggPSB0aGlzLl9sYXllci5kejtcbiAgICBpZiAoZGVwdGggPT0gMCkge1xuICAgICAgICAvLyAuLnVubGVzcyB0aGF0J3MgMCwgaW4gd2hpY2ggY2FzZSBnbyB0byB0aGUgYm90dG9tXG4gICAgICAgIGRlcHRoID0gdGhpcy5fbGF5ZXIueiAtIHRoaXMuX21pblo7XG4gICAgfVxuICAgIC8vIG1ha2UgYSBnZW9tZXRyeSBmb3IgdGhlIGNodW5rXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoXG4gICAgICAgIHRoaXMuX2Jsb2NrLmR4LCB0aGlzLl9ibG9jay5keSwgZGVwdGhcbiAgICApO1xuICAgIHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgdGhpcy5fbGF5ZXIubSk7XG4gICAgbWVzaC5wb3NpdGlvbi5zZXQoXG4gICAgICAgIHRoaXMuX2Jsb2NrLnggKyB0aGlzLl9ibG9jay5keC8yLFxuICAgICAgICB0aGlzLl9ibG9jay55ICsgdGhpcy5fYmxvY2suZHkvMixcbiAgICAgICAgdGhpcy5fbGF5ZXIueiAtIGRlcHRoLzJcbiAgICApO1xuICAgIG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgLy8gb25seSB0aGUgc3VyZmFjZSBjaHVua3MgcmVjZWl2ZSBzaGFkb3dcbiAgICBpZiAodGhpcy5faXNTdXJmYWNlKSB7XG4gICAgICAgIG1lc2gucmVjZWl2ZVNoYWRvdyA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBtZXNoO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fYWRkTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLmFkZCh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3JlbW92ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zY2VuZS5yZW1vdmUodGhpcy5fbWVzaCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl91cGRhdGVNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVtb3ZlTWVzaCgpO1xuICAgIHRoaXMuX21lc2ggPSB0aGlzLl9jcmVhdGVOZXdNZXNoKCk7XG4gICAgdGhpcy5fYWRkTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ2h1bms7IiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuL3N0dWZmJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogVGhlIGNvbnRhaW5lciBmb3IgYWxsIGluZm9ybWF0aW9uIGFib3V0IGFuIGFyZWEuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zIGZvciB0aGUgU2NhcGVGaWVsZCBiZWluZyBjcmVhdGVkLlxuICpcbiAqIG9wdGlvbiB8IGRlZmF1bHQgdmFsdWUgfCBkZXNjcmlwdGlvblxuICogLS0tLS0tLXwtLS0tLS0tLS0tLS0tLTp8LS0tLS0tLS0tLS0tXG4gKiBgbWluWGAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFggZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhYYCAgICAgfCAgMTAwIHwgbGFyZ2VzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWGAgIHwgICAxMCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBYIGF4aXMgaW50b1xuICogYG1pbllgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBZIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WWAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1lgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWSBheGlzIGludG9cbiAqIGBtaW5aYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWiAodmVydGljYWwgZGltZW5zaW9uKSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFpgICAgICB8ICAgNDAgfCBsYXJnZXN0IFogZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NaYCAgfCAgIDgwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFogYXhpcyBpbnRvXG4gKiBgYmxvY2tHYXBgIHwgMC4wNCB8IGdhcCB0byBsZWF2ZSBiZXR3ZWVuIGJsb2NrcyBhbG9uZyB0aGUgWCBhbmQgWSBheGVzXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlRmllbGQob3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICBtaW5YOiAwLCAgICAgICAgbWF4WDogMTAwLCAgICAgICAgICBibG9ja3NYOiAxMCxcbiAgICAgICAgbWluWTogMCwgICAgICAgIG1heFk6IDEwMCwgICAgICAgICAgYmxvY2tzWTogMTAsXG4gICAgICAgIG1pblo6IDAsICAgICAgICBtYXhaOiA0MCwgICAgICAgICAgIGJsb2Nrc1o6IDgwLFxuICAgICAgICBibG9ja0dhcDogMC4wNFxuICAgIH07XG5cbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICAvLyBtaW4gYW5kIG1heCB2YWx1ZXMgZm9yIHggeSBhbmQgelxuICAgIHRoaXMubWluWCA9IHRoaXMuX29wdHMubWluWDtcbiAgICB0aGlzLm1pblkgPSB0aGlzLl9vcHRzLm1pblk7XG4gICAgdGhpcy5taW5aID0gdGhpcy5fb3B0cy5taW5aO1xuXG4gICAgdGhpcy5tYXhYID0gdGhpcy5fb3B0cy5tYXhYO1xuICAgIHRoaXMubWF4WSA9IHRoaXMuX29wdHMubWF4WTtcbiAgICB0aGlzLm1heFogPSB0aGlzLl9vcHRzLm1heFo7XG5cbiAgICAvLyBjb252ZW5pZW50IFwid2lkdGhzXCJcbiAgICB0aGlzLndYID0gdGhpcy5tYXhYIC0gdGhpcy5taW5YO1xuICAgIHRoaXMud1kgPSB0aGlzLm1heFkgLSB0aGlzLm1pblk7XG4gICAgdGhpcy53WiA9IHRoaXMubWF4WiAtIHRoaXMubWluWjtcblxuICAgIC8vIGhvdyBtYW55IGJsb2NrcyBhY3Jvc3MgeCBhbmQgeT9cbiAgICB0aGlzLmJsb2Nrc1ggPSB0aGlzLl9vcHRzLmJsb2Nrc1g7XG4gICAgdGhpcy5ibG9ja3NZID0gdGhpcy5fb3B0cy5ibG9ja3NZO1xuICAgIHRoaXMuYmxvY2tzWiA9IHRoaXMuX29wdHMuYmxvY2tzWjtcblxuICAgIC8vIGhvdyB3aWRlIGlzIGVhY2ggYmxvY2tcbiAgICB0aGlzLl9iWCA9IHRoaXMud1ggLyB0aGlzLmJsb2Nrc1g7XG4gICAgdGhpcy5fYlkgPSB0aGlzLndZIC8gdGhpcy5ibG9ja3NZO1xuICAgIHRoaXMuX2JaID0gdGhpcy53WiAvIHRoaXMuYmxvY2tzWjtcblxuICAgIC8vIGhvdXNla2VlcGluZ1xuICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB0aGlzLl9jYWxjQ2VudGVyKCk7XG4gICAgdGhpcy5fbWFrZUdyaWQoKTtcblxuICAgIHRoaXMuX2l0ZW1zID0gW107XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUZpZWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlRmllbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVGaWVsZDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJygnICsgdGhpcy5taW5YICsgJy0nICsgdGhpcy5tYXhYICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWSArICctJyArIHRoaXMubWF4WSArXG4gICAgICAgICcsICcgKyB0aGlzLm1pblogKyAnLScgKyB0aGlzLm1heFogK1xuICAgICAgICAnKSdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlRmllbGQucHJvdG90eXBlLl9tYWtlR3JpZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2cgPSBbXTtcbiAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5ibG9ja3NYOyBneCsrKSB7XG4gICAgICAgIHZhciBjb2wgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuYmxvY2tzWTsgZ3krKykge1xuICAgICAgICAgICAgdmFyIHhHYXAgPSB0aGlzLl9iWCAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIHlHYXAgPSB0aGlzLl9iWSAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIGJsb2NrID0ge1xuICAgICAgICAgICAgICAgIHg6IHRoaXMubWluWCArICh0aGlzLl9iWCAqIGd4KSArIHhHYXAsXG4gICAgICAgICAgICAgICAgZHg6IHRoaXMuX2JYIC0geEdhcCAtIHhHYXAsXG4gICAgICAgICAgICAgICAgeTogdGhpcy5taW5ZICsgKHRoaXMuX2JZICogZ3kpICsgeUdhcCxcbiAgICAgICAgICAgICAgICBkeTogdGhpcy5fYlkgLSB5R2FwIC0geUdhcCxcbiAgICAgICAgICAgICAgICBnOiBbe1xuICAgICAgICAgICAgICAgICAgICB6OiB0aGlzLm1heFosXG4gICAgICAgICAgICAgICAgICAgIGR6OiAwLCAvLyAwIG1lYW5zIFwic3RyZXRjaCB0byBtaW5aXCJcbiAgICAgICAgICAgICAgICAgICAgbTogU2NhcGVTdHVmZi5nZW5lcmljLFxuICAgICAgICAgICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29sLnB1c2goYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2cucHVzaChjb2wpO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqIFVubGlrZSB7QGxpbmsgU2NhcGVGaWVsZCNhZGRJdGVtIGFkZEl0ZW19LCB0aGlzIG1ldGhvZCB3aWxsXG4gKiByZS1wb3NpdGlvbiBpdGVtcyBhY3Jvc3MgdGhlIEZpZWxkIChzbyB5b3UgZG9uJ3QgbmVlZCB0byBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjSXRlbXMgY2FsY0l0ZW1zfSB5b3Vyc2VsZikuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaXRlbUxpc3QgQSBsaXN0IG9mIGl0ZW1zLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgaXRlbWAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtcyA9IGZ1bmN0aW9uKGl0ZW1MaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5faXRlbXMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGl0ZW1MaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciB0aGVJdGVtID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbSh0aGVJdGVtLngsIHRoZUl0ZW0ueSwgdGhlSXRlbS5pdGVtKTtcbiAgICB9XG4gICAgdGhpcy5jYWxjSXRlbXMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGNsYWltcyBvZiB0aGUgZ3JvdW5kIGhlaWdodCBhdCB2YXJpb3VzIHBvaW50cy5cbiAqIFVubGlrZSB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRIZWlnaHQgYWRkR3JvdW5kSGVpZ2h0fSwgdGhpc1xuICogbWV0aG9kIHdpbGwgcmUtZXh0cmFwb2xhdGUgZ3JvdW5kIGhlaWdodHMgYWNyb3NzIHRoZSBGaWVsZCAoc29cbiAqIHlvdSBkb24ndCBuZWVkIHRvIGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNHcm91bmRIZWlnaHRzIGNhbGNHcm91bmRIZWlnaHRzfSB5b3Vyc2VsZikuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaGVpZ2h0TGlzdCBBIGxpc3Qgb2Ygb2JqZWN0cy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYHpgIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKGhlaWdodExpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBoZWlnaHRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGhlaWdodExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kSGVpZ2h0KHB0LngsIHB0LnksIHB0LnopO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgY2xhaW0gdGhhdCB0aGUgZ3JvdW5kIGhlaWdodCBpcyBgemAgYXQgcG9pbnQgYHhgLGB5YC5cbiAqIElmIHlvdSBjYWxsIHRoaXMsIHJlbWVtYmVyIHRvIGV2ZW50dWFsbHkgY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IGFmdGVyIHNvXG4gKiBncm91bmQgaGVpZ2h0cyBnZXQgZXh0cmFwb2xhdGVkIGFjcm9zcyB0aGUgZW50aXJlIEZpZWxkLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFggY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geSBZIGNvb3JkaW5hdGUgb2YgdGhpcyBncm91bmQgaGVpZ2h0IHJlY29yZFxuICogQHBhcmFtIHtOdW1iZXJ9IHogdGhlIGhlaWdodCBvZiB0aGUgZ3JvdW5kIGF0IHBvc2l0aW9uIGB4YCxgeWBcbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMucHVzaCh7IHg6IHgsIHk6IHksIHo6IHogfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGFkZGl0aW9uYWwgZ3JvdW5kIHN0YWNrcyB0byB0aGUgZmllbGQncyBncm91bmQgc3RhY2tzLlxuICogVGhlIGdyb3VuZExpc3QgaXMgYW4gYXJyYXkgb2YgZGF0YSBvYmplY3RzLiAgRWFjaCBvYmplY3QgbmVlZHMgeCxcbiAqIHkgYW5kIHogcHJvcGVydGllcywgYW5kIGEgJ3N0YWNrJyBwcm9wZXJ0eSwgZWFjaCBtYXRjaGluZyB0aGVcbiAqIGNvcnJlc3BvbmRpbmcgYXJnIHRvIGFkZEdyb3VuZFN0YWNrLlxuICogQHBhcmFtIHtib29sZWFufSByZXBsYWNlIGlmIHJlcGxhY2UgaXMgdHJ1dGh5LCBkaXNjYXJkIGV4aXN0aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdW5kIHBvaW50cyBmaXJzdC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oZ3JvdW5kTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgZ3JvdW5kTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgcHQgPSBncm91bmRMaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEdyb3VuZFN0YWNrKHB0LngsIHB0LnksIHB0LnN0YWNrKTtcbiAgICB9XG4gICAgdGhpcy5jYWxjR3JvdW5kU3RhY2tzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgZ3JvdW5kIHN0YWNrIGF0IHgseSwgc3RhcnRpbmcgYXQgaGVpZ2h0IHouXG4gKiBUaGUgc3RhY2sgaXMgYW4gYXJyYXkgb2YgdHdvLWVsZW1lbnQgYXJyYXlzIHdpdGggYSBNYXRlcmlhbFxuICogYW5kIGEgZGVwdGggbnVtYmVyLCBsaWtlIHRoaXM6XG4gKiBbXG4gKiAgICAgW01hdGVyaWFsLmxlYWZMaXR0ZXIsIDAuM10sXG4gKiAgICAgW01hdGVyaWFsLmRpcnQsIDMuNV0sXG4gKiAgICAgW01hdGVyaWFsLnN0b25lLCA0XVxuICogXVxuICogVGhhdCBwdXRzIGEgbGVhZmxpdHRlciBsYXllciAwLjMgdW5pdHMgZGVlcCBvbiBhIDMuNS11bml0XG4gKiBkZWVwIGRpcnQgbGF5ZXIsIHdoaWNoIGlzIG9uIGEgc3RvbmUgbGF5ZXIuICBJZiB0aGUgZmluYWxcbiAqIGxheWVyJ3MgZGVwdGggaXMgemVybywgdGhhdCBsYXllciBpcyBhc3N1bWVkIHRvIGdvIGFsbCB0aGVcbiAqIHdheSB0byBtaW5aLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gY2FsY0dyb3VuZCgpIGFmdGVyLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKHgsIHksIHN0YWNrKSB7XG4gICAgLy8gVE9ETzogY2hlY2sgZm9yIHZhbGlkaXR5XG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzLnB1c2goeyB4OiB4LCAgeTogeSwgIHN0YWNrOiBzdGFjayB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiAocmUpY2FsY3VsYXRlIHRoZSBncm91bmQgaGVpZ2h0LiAgWW91IG5lZWQgdG8gY2FsbCB0aGlzIGlmIHlvdVxuICogYWRkIGdyb3VuZCBoZWlnaHQgY2xhaW1zIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gZmluZCBoZWlnaHQgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGFsbG93aW5nIGVhY2hcbiAgICAgICAgLy8ga25vd24gZ3JvdW5kIGhlaWdodCB0byBcInZvdGVcIiB1c2luZyB0aGUgaW52ZXJzZSBvZlxuICAgICAgICAvLyBpdCdzIHNxdWFyZWQgZGlzdGFuY2UgZnJvbSB0aGUgY2VudHJlIG9mIHRoZSBibG9jay5cbiAgICAgICAgdmFyIGgsIGR4LCBkeSwgZGlzdCwgdm90ZVNpemU7XG4gICAgICAgIHZhciBiWiA9IDA7XG4gICAgICAgIHZhciB2b3RlcyA9IDA7XG4gICAgICAgIGZvciAodmFyIGdoPTA7IGdoIDwgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5sZW5ndGg7IGdoKyspIHtcbiAgICAgICAgICAgIGggPSB0aGlzLl9ncm91bmRIZWlnaHRzW2doXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBoLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gaC55O1xuICAgICAgICAgICAgZGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgdm90ZVNpemUgPSAxIC8gZGlzdDtcbiAgICAgICAgICAgIGJaICs9IGgueiAqIHZvdGVTaXplO1xuICAgICAgICAgICAgdm90ZXMgKz0gdm90ZVNpemU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGRpdmlkZSB0byBmaW5kIHRoZSBhdmVyYWdlXG4gICAgICAgIGJaID0gYlogLyB2b3RlcztcblxuICAgICAgICAvLyBibG9jay1pc2ggaGVpZ2h0czogcm91bmQgdG8gdGhlIG5lYXJlc3QgX2JaXG4gICAgICAgIHZhciBkaWZmWiA9IGJaIC0gdGhpcy5taW5aO1xuICAgICAgICBiWiA9IHRoaXMubWluWiArIE1hdGgucm91bmQoZGlmZlogLyB0aGlzLl9iWikgKiB0aGlzLl9iWjtcblxuICAgICAgICAvLyBva2F5IG5vdyB3ZSBrbm93IGEgaGVpZ2h0ISAgc2V0IGl0XG4gICAgICAgIHRoaXMuc2V0QmxvY2tIZWlnaHQoYmxvY2ssIGJaKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBzdGFja3MuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIHN0YWNrcyBvbmUgYXQgYSB0aW1lIHVzaW5nXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRTdGFjayBhZGRHcm91bmRTdGFja30uXG4gKlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBtYWtlIHRoZSBzdGFjayBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgY29weWluZyB0aGVcbiAgICAgICAgLy8gbmVhcmVzdCBkZWZpbmVkIHN0YWNrLlxuICAgICAgICB2YXIgcywgZHgsIGR5LCB0aGlzRGlzdCwgYmVzdFN0YWNrO1xuICAgICAgICB2YXIgYmVzdERpc3QgPSB0aGlzLndYICsgdGhpcy53WSArIHRoaXMud1o7XG4gICAgICAgIGJlc3REaXN0ID0gYmVzdERpc3QgKiBiZXN0RGlzdDtcbiAgICAgICAgZm9yICh2YXIgZ3M9MDsgZ3MgPCB0aGlzLl9ncm91bmRTdGFja3MubGVuZ3RoOyBncysrKSB7XG4gICAgICAgICAgICBzID0gdGhpcy5fZ3JvdW5kU3RhY2tzW2dzXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBzLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gcy55O1xuICAgICAgICAgICAgdGhpc0Rpc3QgPSAxICsgZHgqZHggKyBkeSpkeTtcbiAgICAgICAgICAgIGlmICh0aGlzRGlzdCA8IGJlc3REaXN0KSB7XG4gICAgICAgICAgICAgICAgYmVzdFN0YWNrID0gcztcbiAgICAgICAgICAgICAgICBiZXN0RGlzdCA9IHRoaXNEaXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb2theSB3ZSBnb3QgYSBzdGFjay5cbiAgICAgICAgdGhpcy5zZXRHcm91bmRTdGFjayhibG9jaywgYmVzdFN0YWNrLnN0YWNrKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fY2FsY0NlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY2VudHJlIG9mIHRoZSBmaWVsZCBhbmQgcmVjb3JkIGl0IGFzIC5jZW50ZXJcbiAgICB0aGlzLmNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAodGhpcy5taW5YICsgdGhpcy5tYXhYKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblkgKyB0aGlzLm1heFkpIC8gMixcbiAgICAgICAgKHRoaXMubWluWiArIHRoaXMubWF4WikgLyAyXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0R3JvdW5kU3RhY2sgPSBmdW5jdGlvbihibG9jaywgc3RhY2spIHtcbiAgICB2YXIgbGF5ZXJMZXZlbCA9IGJsb2NrLmdbMF0uejtcbiAgICBmb3IgKHZhciBsYXllciA9IDA7IGxheWVyIDwgc3RhY2subGVuZ3RoOyBsYXllcisrKSB7XG4gICAgICAgIGJsb2NrLmdbbGF5ZXJdID0ge1xuICAgICAgICAgICAgejogbGF5ZXJMZXZlbCxcbiAgICAgICAgICAgIGR6OiBzdGFja1tsYXllcl1bMV0sXG4gICAgICAgICAgICBtOiBzdGFja1tsYXllcl1bMF0sXG4gICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBsYXllckxldmVsIC09IHN0YWNrW2xheWVyXVsxXTtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVidWlsZENodW5rcyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGlmIChibG9jay5nW2xdLmNodW5rKSB7XG4gICAgICAgICAgICBibG9jay5nW2xdLmNodW5rLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0QmxvY2tIZWlnaHQgPSBmdW5jdGlvbihibG9jaywgeikge1xuICAgIC8vIHRvIHNldCB0aGUgYmxvY2sgZ3JvdW5kIGhlaWdodCwgd2UgbmVlZCB0byBmaW5kIHRoZSBibG9jaydzXG4gICAgLy8gY3VycmVudCBncm91bmQgaGVpZ2h0ICh0aGUgeiBvZiB0aGUgdG9wIGxheWVyKSwgd29yayBvdXQgYVxuICAgIC8vIGRpZmYgYmV0d2VlbiB0aGF0IGFuZCB0aGUgbmV3IGhlaWdodCwgYW5kIGFkZCB0aGF0IGRpZmYgdG9cbiAgICAvLyBhbGwgdGhlIGxheWVycy5cbiAgICB2YXIgZFogPSB6IC0gYmxvY2suZ1swXS56O1xuICAgIHZhciBkZXB0aDtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgYmxvY2suZ1tsXS56ICs9IGRaO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5nZXRCbG9jayA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAvLyByZXR1cm4gdGhlIGJsb2NrIHRoYXQgaW5jbHVkZXMgIHgseVxuICAgIHZhciBneCA9ICh4IC0gdGhpcy5taW5YKSAvIHRoaXMuX2JYO1xuICAgIHZhciBneSA9ICh5IC0gdGhpcy5taW5ZKSAvIHRoaXMuX2JZO1xuICAgIHJldHVybiAodGhpcy5fZ1tneF1bZ3ldKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW52b2tlIHRoZSBjYWxsYmFjayBlYWNoIGJsb2NrIGluIHR1cm5cbi8vIGNhbGxiYWNrIHNob3VsZCBsb29rIGxpa2U6IGZ1bmN0aW9uKGVyciwgYmxvY2spIHsgLi4uIH1cbi8vIGlmIGVyciBpcyBudWxsIGV2ZXJ5dGhpbmcgaXMgZmluZS4gaWYgZXJyIGlzIG5vdCBudWxsLCB0aGVyZVxuLy8gd2FzIGFuIGVycm9yLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZWFjaEJsb2NrID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcsIG9yZGVyKSB7XG4gICAgaWYgKG9yZGVyID09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcmRlciA9ICd4dXAteXVwJztcbiAgICB9XG4gICAgaWYgKHRoaXNBcmcgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAob3JkZXIgPT0gJ3h1cC15dXAnKSB7XG4gICAgICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLl9nLmxlbmd0aDsgZ3grKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuX2dbMF0ubGVuZ3RoOyBneSsrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBudWxsLCB0aGlzLl9nW2d4XVtneV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVGaWVsZDtcblxuXG5cblxuIiwiXG4vKipcbiAqIEEgYmFnIG9mIGl0ZW0gdHlwZXMgLS0gaS5lLiBUSFJFRS5HZW9tZXRyeXMgLS0gdGhhdCBzY2FwZXMgY2FuIGhhdmUgaW4gdGhlbS5cbiAqXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZUl0ZW1zID0ge1xuICAgIC8vIGRvY3VtZW50YXRpb24gZm9yIGl0ZW1zIGFyZSBpbiB0aGUgLi9pdGVtdHlwZXMvKiBmaWxlc1xuICAgIGN1YmU6IHJlcXVpcmUoJy4vaXRlbXR5cGVzL2N1YmUnKSxcbiAgICB0cmVlOiByZXF1aXJlKCcuL2l0ZW10eXBlcy90cmVlJylcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVJdGVtcztcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIGN1YmUgbWVzaCBvZiB0aGUgc3BlY2lmaWVkIHNpemUgYW5kIG1hdGVyaWFsLlxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgVGhlIGxlbmd0aCBvZiBhIHNpZGUgb2YgdGhlIGN1YmUuICBEZWZhdWx0cyB0byAxLlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gbWF0ZXJpYWwgV2hhdCB0aGUgbWFrZSB0aGUgY3ViZSBvdXQgb2YuICBEZWZhdWx0cyB0byBgU2NhcGUuU3R1ZmYuZ2VuZXJpY2BcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE5vdCB1c2VkLlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5jdWJlXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3ViZUZhY3Rvcnkoc2l6ZSwgbWF0ZXJpYWwsIG9wdGlvbnMpIHtcbiAgICAvLyBjb25zdHJ1Y3QgYSBtZXNoIFwic2l0dGluZyBvblwiIHRoZSBwb2ludCAwLDAsMFxuXG4gICAgc2l6ZSA9IHNpemUgfHwgMTtcbiAgICBtYXRlcmlhbCA9IG1hdGVyaWFsIHx8IFNjYXBlU3R1ZmYuZ2VuZXJpYztcblxuICAgIC8vIG1ha2VzIGEgY3ViZSBjZW50ZXJlZCBvbiAwLDAsMFxuICAgIHZhciBnZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHNpemUsIHNpemUsIHNpemUpO1xuXG4gICAgLy8gdHJhbnNmb3JtIGl0IHVwIGEgYml0LCBzbyB3ZSdyZSBjZW50ZXJlZCBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDAuXG4gICAgZ2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgc2l6ZS8yKSApO1xuXG4gICAgLy8gcmV0dXJuIGEgdGhpbmcgd2l0aCB0aGF0IGdlb21ldHJ5LCBtYWRlIG9mIHRoZSBtYXRlcmlhbFxuICAgIHJldHVybiBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXRlcmlhbCk7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3ViZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSB0cmVlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBjb2xvci5cbiAqIEBwYXJhbSB7bnVtYmVyfSB0cnVua0RpYW1ldGVyIERpYW1ldGVyIG9mIHRydW5rIChhLmsuYS4gREJIKVxuICogQHBhcmFtIHtudW1iZXJ9IGhlaWdodCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gdHJ1bmtNYXRlcmlhbCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gbGVhZk1hdGVyaWFsIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE5vdCB1c2VkLlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy50cmVlXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3ViZUZhY3RvcnkodHJ1bmtEaWFtZXRlciwgaGVpZ2h0LCB0cnVua01hdGVyaWFsLCBsZWFmTWF0ZXJpYWwsIG9wdGlvbnMpIHtcblxuXHR2YXIgZ2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KHRydW5rRGlhbWV0ZXIvMTAsIHRydW5rRGlhbWV0ZXIvMiwgaGVpZ2h0KTtcblxuXHQvLyB0cmFuc2Zvcm0gaXQgdXAgYSBiaXQ6XG5cdC8vIHJvdGF0ZSBzbyBpdCdzIGhlaWdodCBpcyBhbG9uZyB0aGUgWiBheGlzIChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cdC8vIGNlbnRlciBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDBcblx0dmFyIHRyYW5zbGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsMCxoZWlnaHQvMik7XG5cblx0Z2VvbS5hcHBseU1hdHJpeCh0cmFuc2xhdGUubXVsdGlwbHkocm90YXRlKSk7XG5cblx0cmV0dXJuIG5ldyBUSFJFRS5NZXNoKGdlb20sIHRydW5rTWF0ZXJpYWwpO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUN1YmVGYWN0b3J5O1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblNjYXBlQ2h1bmsgPSByZXF1aXJlKCcuL2NodW5rJyk7XG5cblxuLy8gREVCVUdcblNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuL3N0dWZmJyk7XG5TY2FwZUl0ZW1zID0gcmVxdWlyZSgnLi9pdGVtdHlwZXMnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBjYWxsYmFjayBTY2FwZVNjZW5lfmRhdGVDaGFuZ2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBlcnJvciBEZXNjcmlwdGlvbiBvZiBlcnJvciwgb3RoZXJ3aXNlIG51bGxcbiAqIEBwYXJhbSB7ZGF0ZX0gZGF0ZSBEYXRlIHRoZSBzY2FwZSBpcyBub3cgZGlzcGxheWluZ1xuICovXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgb2YgYSBsYW5kc2NhcGUgLyBtb29uc2NhcGUgLyB3aGF0ZXZlclxuICogQHBhcmFtIHtTY2FwZUZpZWxkfSBmaWVsZCAgdGhlIGZpZWxkIGJlaW5nIHJlbmRlcmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gZG9tICAgICAgICBET00gZWxlbWVudCB0aGUgc2NhcGUgc2hvdWxkIGJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlZCBpbnRvLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgICAgY29sbGVjdGlvbiBvZiBvcHRpb25zLiAgQWxsIGFyZSBvcHRpb25hbC5cbiAqIEBwYXJhbSB7U3RyaW5nW119IG9wdGlvbnMubGlnaHRzPSdzdW4nLCdza3knIC0gYXJyYXkgb2Ygc3RyaW5nc1xuICogbmFtaW5nIGxpZ2h0cyB0byBpbmNsdWRlIGluIHRoaXMgc2NlbmUuICBDaG9vc2UgZnJvbTpcbiAqXG4gKiBzdHJpbmcgICAgfCBsaWdodCB0eXBlXG4gKiAtLS0tLS0tLS0tfC0tLS0tLS0tLS0tXG4gKiBgdG9wbGVmdGAgfCBhIGxpZ2h0IGZyb20gYWJvdmUgdGhlIGNhbWVyYSdzIGxlZnQgc2hvdWxkZXJcbiAqIGBhbWJpZW50YCB8IGEgZGltIGFtYmllbnQgbGlnaHRcbiAqIGBzdW5gICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBvcmJpdHMgdGhlIHNjZW5lIG9uY2UgcGVyIGRheVxuICogYHNreWAgICAgIHwgYSBkaXJlY3Rpb25hbCBsaWdodCB0aGF0IHNoaW5lcyBmcm9tIGFib3ZlIHRoZSBzY2VuZVxuICogQHBhcmFtIHtEYXRlfFwibm93XCJ9IG9wdGlvbnMuY3VycmVudERhdGU9J25vdycgLSBUaGUgdGltZSBhbmQgZGF0ZVxuICogaW5zaWRlIHRoZSBzY2FwZS4gIFRoZSBzdHJpbmcgXCJub3dcIiBtZWFucyBzZXQgY3VycmVudERhdGUgdG8gdGhlXG4gKiBwcmVzZW50LlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMudGltZVJhdGlvPTEgVGhlIHJhdGUgdGltZSBzaG91bGQgcGFzcyBpblxuICogdGhlIHNjYXBlLCByZWxhdGl2ZSB0byBub3JtYWwuICAwLjEgbWVhbnMgdGVuIHRpbWVzIHNsb3dlci4gIDYwXG4gKiBtZWFucyBvbmUgbWludXRlIHJlYWwgdGltZSA9IG9uZSBob3VyIHNjYXBlIHRpbWUuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV+ZGF0ZUNoYW5nZX0gb3B0aW9ucy5kYXRlVXBkYXRlIGNhbGxiYWNrIGZvclxuICogd2hlbiB0aGUgc2NlbmUgdGltZSBjaGFuZ2VzICh3aGljaCBpcyBhIGxvdCkuXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlU2NlbmUoZmllbGQsIGRvbSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICAvLyBsaWdodHM6IFsndG9wbGVmdCcsICdhbWJpZW50J10sXG4gICAgICAgIGxpZ2h0czogWydzdW4nLCAnc2t5J10sXG4gICAgICAgIGN1cnJlbnREYXRlOiAnbm93JywgIC8vIGVpdGhlciBzdHJpbmcgJ25vdycgb3IgYSBEYXRlIG9iamVjdFxuICAgICAgICB0aW1lUmF0aW86IDEsXG4gICAgICAgIGRhdGVVcGRhdGU6IG51bGwgLy8gY2FsbGJhY2sgdG91cGRhdGUgdGhlIGRpc3BsYXllZCBkYXRlL3RpbWVcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gc2F2ZSB0aGUgZmllbGRcbiAgICB0aGlzLmYgPSBmaWVsZDtcblxuICAgIC8vIGRpc2NvdmVyIERPTSBjb250YWluZXJcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkb20pO1xuXG4gICAgdGhpcy5kYXRlID0gdGhpcy5fb3B0cy5jdXJyZW50RGF0ZTtcbiAgICBpZiAodGhpcy5kYXRlID09PSAnbm93Jykge1xuICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLnN0YXJ0RGF0ZSA9IHRoaXMuZGF0ZTtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAvLyBjcmVhdGUgYW5kIHNhdmUgYWxsIHRoZSBiaXRzIHdlIG5lZWRcbiAgICB0aGlzLnJlbmRlcmVyID0gdGhpcy5fbWFrZVJlbmRlcmVyKHsgZG9tOiB0aGlzLmVsZW1lbnQgfSk7XG4gICAgdGhpcy5zY2VuZSA9IHRoaXMuX21ha2VTY2VuZSgpO1xuICAgIHRoaXMuY2FtZXJhID0gdGhpcy5fbWFrZUNhbWVyYSgpO1xuICAgIHRoaXMuY29udHJvbHMgPSB0aGlzLl9tYWtlQ29udHJvbHMoKTtcbiAgICB0aGlzLmxpZ2h0cyA9IHRoaXMuX21ha2VMaWdodHModGhpcy5fb3B0cy5saWdodHMpO1xuXG4gICAgdGhpcy5hZGRCbG9ja3MoKTtcblxuICAgIC8vIGFkZCBncmlkcyBhbmQgaGVscGVyIGN1YmVzXG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCk7XG4gICAgdGhpcy5hZGRIZWxwZXJHcmlkKCd0b3AnKTtcbiAgICB0aGlzLmFkZEhlbHBlclNoYXBlcygpO1xuXG4gICAgdmFyIGxhc3RMb2dBdCA9IDA7IC8vIERFQlVHXG4gICAgdmFyIHJlbmRlciA9IChmdW5jdGlvbiB1bmJvdW5kUmVuZGVyKHRzKSB7XG5cbiAgICAgICAgLy8gREVCVUdcbiAgICAgICAgaWYgKGxhc3RMb2dBdCArIDIwMDAgPCB0cykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3JlbmRlcmluZy4uLicpO1xuICAgICAgICAgICAgbGFzdExvZ0F0ID0gdHM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBERUJVRyBkaXNhYmxlZCB0aW1lIHVwZGF0ZXMuLlxuICAgICAgICAvLyB0aGlzLl91cGRhdGVUaW1lKCk7XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSggcmVuZGVyICk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKCB0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSApO1xuICAgICAgICB0aGlzLmNvbnRyb2xzLnVwZGF0ZSgpO1xuICAgIH0pLmJpbmQodGhpcyk7XG5cbiAgICByZW5kZXIoMCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZVNjZW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVTY2VuZTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYmxvY2tzIGZyb20gdGhlIGF0dGFjaGVkIFNjYXBlRmllbGQgaW50byB0aGUgc2NlbmUuXG4gKlxuICogWW91IHdpbGwgcHJvYmFibHkgb25seSBuZWVkIHRvIGNhbGwgdGhpcyBvbmNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRCbG9ja3MgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhlU2NlbmUgPSB0aGlzLnNjZW5lO1xuICAgIHZhciBtaW5aID0gdGhpcy5mLm1pblo7XG4gICAgdmFyIGRlcHRoLCBsYXllcjtcbiAgICB0aGlzLmYuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgbGF5ZXJJbmRleCA9IDA7IGxheWVySW5kZXggPCBiLmcubGVuZ3RoOyBsYXllckluZGV4KyspIHtcbiAgICAgICAgICAgIGIuZ1tsYXllckluZGV4XS5jaHVuayA9IG5ldyBTY2FwZUNodW5rKFxuICAgICAgICAgICAgICAgIHRoZVNjZW5lLCBiLCBsYXllckluZGV4LCBtaW5aXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5mLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGhlbHBlciBjdWJlcyBhdCBzb21lIG9mIHRoZSBjb3JuZXJzIG9mIHlvdXIgc2NhcGUsIHNvIHlvdSBjYW5cbiAqIHNlZSB3aGVyZSB0aGV5IGFyZSBpbiBzcGFjZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUodGhpcy5mLm1pblgsIHRoaXMuZi5taW5ZLCB0aGlzLmYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSh0aGlzLmYubWF4WCwgdGhpcy5mLm1pblksIHRoaXMuZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgodGhpcy5mLm1pblggKyB0aGlzLmYubWF4WCkgLyAyLCB0aGlzLmYubWluWSwgdGhpcy5mLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKHRoaXMuZi5taW5YLCB0aGlzLmYubWF4WSwgdGhpcy5mLm1pblosIGdyZWVuKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUodGhpcy5mLm1pblgsIHRoaXMuZi5taW5ZLCB0aGlzLmYubWF4WiwgYmx1ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKHRoaXMuZi5tYXhYLCB0aGlzLmYubWF4WSwgdGhpcy5mLm1pblosIHdoaXRlKTtcblxuICAgIHZhciB3b29kID0gU2NhcGVTdHVmZi5sZWFmbGl0dGVyO1xuICAgIHZhciB0cmVlID0gU2NhcGVJdGVtcy50cmVlKDEsMzAsd29vZCk7XG4gICAgdHJlZS5wb3NpdGlvbi5jb3B5KG5ldyBUSFJFRS5WZWN0b3IzKHRoaXMuZi5taW5YLCB0aGlzLmYubWluWSwgdGhpcy5mLm1pblopKTtcbiAgICB0aGlzLnNjZW5lLmFkZCh0cmVlKTtcblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBhIGN1YmUgYXQgcG9zaXRpb24gYHhgLCBgeWAsIGB6YCB0byBjb25maXJtIHdoZXJlIHRoYXQgaXMsXG4gKiBleGFjdGx5LiAgR3JlYXQgZm9yIHRyeWluZyB0byB3b3JrIG91dCBpZiB5b3VyIHNjYXBlIGlzIGJlaW5nXG4gKiByZW5kZXJlZCB3aGVyZSB5b3UgdGhpbmsgaXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICpcbiAqIEBwYXJhbSB7KE51bWJlcnxWZWN0b3IzKX0geCBYIGNvb3JkaW5hdGUsIG9yIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9WZWN0b3IzIFRIUkVFLlZlY3RvcjN9IGNvbnRhaW5pbmcgeCwgeSBhbmQgeiBjb29yZHNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbeV0gWSBjb29yZGluYXRlXG4gKiBAcGFyYW0ge051bWJlcn0gW3pdIFogY29vcmRpbmF0ZVxuICogQHBhcmFtIHtDb2xvcnxTdHJpbmd8SW50ZWdlcn0gY29sb3I9JyNjY2NjY2MnIENvbG9yIG9mIGN1YmUuXG4gKiBDYW4gYmUgYSB7QGxpbmsgaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9NYXRoL0NvbG9yIFRIUkVFLkNvbG9yfSwgYSBjb2xvci1wYXJzZWFibGUgc3RyaW5nIGxpa2VcbiAqIGAnIzMzNjZjYydgLCBvciBhIG51bWJlciBsaWtlIGAweDMzNjZjY2AuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckN1YmUgPSBmdW5jdGlvbih4LCB5LCB6LCBjb2xvcikge1xuICAgIC8vIGZpcnN0LCBzZXQgdGhlIGNvbG9yIHRvIHNvbWV0aGluZ1xuICAgIGlmICh0eXBlb2YgY29sb3IgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gZGVmYXVsdCB0byBsaWdodCBncmV5LlxuICAgICAgICBjb2xvciA9IG5ldyBUSFJFRS5Db2xvcigweGNjY2NjYyk7XG4gICAgfVxuICAgIHZhciBwb3M7IC8vIHRoZSBwb3NpdGlvbiB0byBkcmF3IHRoZSBjdWJlXG4gICAgaWYgKHR5cGVvZiB4LnggIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gdGhlbiBpdCdzIGEgdmVjdG9yLCBhbmQgeSBtaWdodCBiZSB0aGUgY29sb3JcbiAgICAgICAgcG9zID0geDtcbiAgICAgICAgaWYgKHR5cGVvZiB5ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb2xvciA9IHk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB4IGlzbid0IGEgdmVjdG9yLCBzbyBhc3N1bWUgc2VwYXJhdGUgeCB5IGFuZCB6XG4gICAgICAgIHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIHopO1xuICAgICAgICAvLyB3ZSBjYXVnaHQgY29sb3IgYWxyZWFkeS5cbiAgICB9XG5cbiAgICAvLyBhYm91dCBhIGZpZnRpZXRoIG9mIHRoZSBmaWVsZCdzIHN1bW1lZCBkaW1lbnNpb25zXG4gICAgdmFyIHNpemUgPSAodGhpcy5mLndYICsgdGhpcy5mLndZICsgdGhpcy5mLndaKSAvIDUwO1xuICAgIC8vIHVzZSB0aGUgY29sb3VyIHdlIGRlY2lkZWQgZWFybGllclxuICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHsgY29sb3I6IGNvbG9yIH0pO1xuXG4gICAgLy8gb2theS4uIG1ha2UgaXQsIHBvc2l0aW9uIGl0LCBhbmQgc2hvdyBpdFxuICAgIHZhciBjdWJlID0gU2NhcGVJdGVtcy5jdWJlKHNpemUsIG1hdGVyaWFsKTtcbiAgICBjdWJlLnBvc2l0aW9uLmNvcHkocG9zKTtcbiAgICB0aGlzLnNjZW5lLmFkZChjdWJlKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyR3JpZCA9IGZ1bmN0aW9uKHRvcE9yQm90dG9tKSB7XG4gICAgdmFyIGd6ID0gMDtcbiAgICB2YXIgZ2MgPSAweDQ0NDQ0NDtcbiAgICBpZiAodG9wT3JCb3R0b20gPT0gJ3RvcCcpIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWF4WjtcbiAgICAgICAgZ2MgPSAweGNjY2NmZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBneiA9IHRoaXMuZi5taW5aO1xuICAgICAgICBnYyA9IDB4Y2NmZmNjO1xuICAgIH1cblxuICAgIHZhciBncmlkVyA9IE1hdGgubWF4KHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsIHRoaXMuZi5tYXhZIC0gdGhpcy5mLm1pblkpO1xuXG4gICAgLy8gR3JpZCBcInNpemVcIiBpcyB0aGUgZGlzdGFuY2UgaW4gZWFjaCBvZiB0aGUgZm91ciBkaXJlY3Rpb25zLFxuICAgIC8vIHRoZSBncmlkIHNob3VsZCBzcGFuLiAgU28gZm9yIGEgZ3JpZCBXIHVuaXRzIGFjcm9zcywgc3BlY2lmeVxuICAgIC8vIHRoZSBzaXplIGFzIFcvMi5cbiAgICB2YXIgZ3JpZFhZID0gbmV3IFRIUkVFLkdyaWRIZWxwZXIoZ3JpZFcvMiwgZ3JpZFcvMTApO1xuICAgIGdyaWRYWS5zZXRDb2xvcnMoZ2MsIGdjKTtcbiAgICBncmlkWFkucm90YXRpb24ueCA9IE1hdGguUEkvMjtcbiAgICBncmlkWFkucG9zaXRpb24uc2V0KHRoaXMuZi5taW5YICsgZ3JpZFcvMiwgdGhpcy5mLm1pblkgKyBncmlkVy8yLCBneik7XG4gICAgdGhpcy5zY2VuZS5hZGQoZ3JpZFhZKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBDcmVhdGUgYW5kIHJldHVybiBhIFRIUkVFLlJlbmRlcmVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB2YXJpb3VzIG9wdGlvbnNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudHxqUXVlcnlFbGVtfSBvcHRpb25zLmRvbSBhIGRvbSBlbGVtZW50XG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMud2lkdGggcmVuZGVyZXIgd2lkdGggKGluIHBpeGVscylcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5oZWlnaHQgcmVuZGVyZXIgaGVpZ2h0IChpbiBwaXhlbHMpXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VSZW5kZXJlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGFudGlhbGlhczogdHJ1ZSwgYWxwaGE6IHRydWUgfSk7XG4gICAgcmVuZGVyZXIuc2V0Q2xlYXJDb2xvciggMHgwMDAwMDAsIDApO1xuICAgIHJlbmRlcmVyLnNoYWRvd01hcEVuYWJsZWQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZG9tKSB7XG4gICAgICAgIHZhciAkZG9tID0gJChvcHRpb25zLmRvbSk7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUoJGRvbS53aWR0aCgpLCAkZG9tLmhlaWdodCgpKTtcbiAgICAgICAgJGRvbS5hcHBlbmQocmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMud2lkdGggJiYgb3B0aW9ucy5oZWlnaHQpIHtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZShvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCk7XG4gICAgfVxuICAgIHJldHVybiByZW5kZXJlcjtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB1cGRhdGVzIHRoZSBzY2FwZSB0aW1lIHRvIG1hdGNoIHRoZSBjdXJyZW50IHRpbWUgKHRha2luZyBpbnRvXG4gKiBhY2NvdW50IHRoZSB0aW1lUmF0aW8gZXRjKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlVGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIHZhciBlbGFwc2VkID0gbm93LmdldFRpbWUoKSAtIHRoaXMuZmlyc3RSZW5kZXI7XG4gICAgdGhpcy5kYXRlID0gbmV3IERhdGUodGhpcy5maXJzdFJlbmRlciArIChlbGFwc2VkICogdGhpcy5fb3B0cy50aW1lUmF0aW8pKTtcbiAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9vcHRzLmRhdGVVcGRhdGU7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgY2FsbGJhY2tEYXRlID0gbmV3IERhdGUodGhpcy5kYXRlKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgY2FsbGJhY2tEYXRlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVN1bigpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzdW4gdG8gc3VpdCB0aGUgc2NhcGUgY3VycmVudCB0aW1lLlxuICogQHBhcmFtICB7VEhSRUUuRGlyZWN0aW9uYWxMaWdodH0gW3N1bl0gdGhlIHN1biB0byBhY3Qgb24uICBJZiBub3RcbiAqIHN1cHBsaWVkLCB0aGlzIG1ldGhvZCB3aWxsIGFjdCBvbiB0aGUgbGlnaHQgaW4gdGhpcyBzY2VuZSdzIGxpZ2h0XG4gKiBsaXN0IHRoYXQgaXMgY2FsbGVkIFwic3VuXCIuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX3VwZGF0ZVN1biA9IGZ1bmN0aW9uKHN1bikge1xuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gaWYgdGhleSBkaWRuJ3QgcHJvdmlkZSBhIHN1biwgdXNlIG91ciBvd25cbiAgICAgICAgc3VuID0gdGhpcy5saWdodHMuc3VuO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc3VuID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjsgLy8gYmFpbCBpZiB0aGVyZSdzIG5vIHN1biBBUlJSSCBXSEFUIERJRCBZT1UgRE9cbiAgICB9XG5cbiAgICB2YXIgc3VuQW5nbGUgPSAodGhpcy5kYXRlLmdldEhvdXJzKCkqNjAgKyB0aGlzLmRhdGUuZ2V0TWludXRlcygpKSAvIDE0NDAgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgc3VuUm90YXRpb25BeGlzID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XG5cbiAgICBzdW4ucG9zaXRpb25cbiAgICAgICAgLnNldCgwLCAtMyAqIHRoaXMuZi53WSwgLTIwICogdGhpcy5mLndaKVxuICAgICAgICAuYXBwbHlBeGlzQW5nbGUoc3VuUm90YXRpb25BeGlzLCBzdW5BbmdsZSlcbiAgICAgICAgLmFkZCh0aGlzLmYuY2VudGVyKTtcblxuICAgIHZhciBzdW5aID0gc3VuLnBvc2l0aW9uLno7XG5cbiAgICAvLyBzd2l0Y2ggdGhlIHN1biBvZmYgd2hlbiBpdCdzIG5pZ2h0IHRpbWVcbiAgICBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gZmFsc2UgJiYgc3VuWiA8PSB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gdHJ1ZSAmJiBzdW5aID4gdGhpcy5mLmNlbnRlci56KSB7XG4gICAgICAgIHN1bi5vbmx5U2hhZG93ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gZmFkZSBvdXQgdGhlIHNoYWRvdyBkYXJrbmVzcyB3aGVuIHRoZSBzdW4gaXMgbG93XG4gICAgaWYgKHN1blogPj0gdGhpcy5mLmNlbnRlci56ICYmIHN1blogPD0gdGhpcy5mLm1heFopIHtcbiAgICAgICAgdmFyIHVwbmVzcyA9IE1hdGgubWF4KDAsIChzdW5aIC0gdGhpcy5mLmNlbnRlci56KSAvIHRoaXMuZi53WiAqIDIpO1xuICAgICAgICBzdW4uc2hhZG93RGFya25lc3MgPSAwLjUgKiB1cG5lc3M7XG4gICAgICAgIHN1bi5pbnRlbnNpdHkgPSB1cG5lc3M7XG4gICAgfVxuXG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VMaWdodHMgPSBmdW5jdGlvbihsaWdodHNUb0luY2x1ZGUpIHtcblxuICAgIHZhciBsaWdodHMgPSB7fTtcbiAgICB2YXIgZiA9IHRoaXMuZjsgIC8vIGNvbnZlbmllbnQgcmVmZXJlbmNlIHRvIHRoZSBmaWVsZFxuXG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdhbWJpZW50JykgIT0gLTEpIHtcbiAgICAgICAgLy8gYWRkIGFuIGFtYmllbnQgbGlzdFxuICAgICAgICBsaWdodHMuYW1iaWVudCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgyMjIyMzMpO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3RvcGxlZnQnKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMubGVmdCA9IG5ldyBUSFJFRS5Qb2ludExpZ2h0KDB4ZmZmZmZmLCAxLCAwKTtcbiAgICAgICAgLy8gcG9zaXRpb24gbGlnaHQgb3ZlciB0aGUgdmlld2VyJ3MgbGVmdCBzaG91bGRlci4uXG4gICAgICAgIC8vIC0gTEVGVCBvZiB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB4IHdpZHRoXG4gICAgICAgIC8vIC0gQkVISU5EIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHkgd2lkdGhcbiAgICAgICAgLy8gLSBBQk9WRSB0aGUgY2FtZXJhIGJ5IHRoZSBmaWVsZCdzIGhlaWdodFxuICAgICAgICBsaWdodHMubGVmdC5wb3NpdGlvbi5hZGRWZWN0b3JzKFxuICAgICAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24sXG4gICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMygtMC41ICogZi53WCwgLTAuNSAqIGYud1ksIDEgKiBmLndaKVxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3N1bicpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5zdW4gPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZlZSk7XG4gICAgICAgIGxpZ2h0cy5zdW4uaW50ZW5zaXR5ID0gMS4wO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZVN1bihsaWdodHMuc3VuKTtcblxuICAgICAgICAvLyBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVZpc2libGUgPSB0cnVlOyAgLy8gREVCVUdcblxuICAgICAgICAvLyBkaXJlY3Rpb24gb2Ygc3VubGlnaHRcbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5zdW4udGFyZ2V0ID0gdGFyZ2V0O1xuXG4gICAgICAgIC8vIHN1biBkaXN0YW5jZSwgbG9sXG4gICAgICAgIHZhciBzdW5EaXN0YW5jZSA9IGxpZ2h0cy5zdW4ucG9zaXRpb24uZGlzdGFuY2VUbyhsaWdodHMuc3VuLnRhcmdldC5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxvbmdlc3QgZGlhZ29uYWwgZnJvbSBmaWVsZC1jZW50ZXJcbiAgICAgICAgdmFyIG1heEZpZWxkRGlhZ29uYWwgPSBmLmNlbnRlci5kaXN0YW5jZVRvKG5ldyBUSFJFRS5WZWN0b3IzKGYubWluWCwgZi5taW5ZLCBmLm1pblopKTtcblxuICAgICAgICAvLyBzaGFkb3cgc2V0dGluZ3NcbiAgICAgICAgbGlnaHRzLnN1bi5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuMzM7XG5cbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFOZWFyID0gc3VuRGlzdGFuY2UgLSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUZhciA9IHN1bkRpc3RhbmNlICsgbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFUb3AgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVJpZ2h0ID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFCb3R0b20gPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTGVmdCA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdza3knKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc2t5ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhlZWVlZmYpO1xuICAgICAgICBsaWdodHMuc2t5LmludGVuc2l0eSA9IDAuODtcblxuICAgICAgICAvLyBza3kgaXMgZGlyZWN0bHkgYWJvdmVcbiAgICAgICAgdmFyIHNreUhlaWdodCA9IDUgKiBmLndaO1xuICAgICAgICBsaWdodHMuc2t5LnBvc2l0aW9uLmNvcHkodGhpcy5jYW1lcmEucG9zaXRpb24pO1xuICAgICAgICAvLyBsaWdodHMuc2t5LnBvc2l0aW9uLnNldFooZi5tYXhaICsgc2t5SGVpZ2h0KTtcblxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnNreS50YXJnZXQgPSB0YXJnZXQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgbGlnaHQgaW4gbGlnaHRzKSB7XG4gICAgICAgIGlmIChsaWdodHMuaGFzT3duUHJvcGVydHkobGlnaHQpKSB7XG4gICAgICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodHNbbGlnaHRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaWdodHM7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VTY2VuZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICAgIC8vIGFkZCBmb2dcbiAgICAvLyBzY2VuZS5mb2cgPSBuZXcgVEhSRUUuRm9nKCcjZjBmOGZmJywgMTAwLCAxNTApO1xuICAgIHJldHVybiBzY2VuZTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNhbWVyYSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgIC8vIHZpZXdpbmcgYW5nbGVcbiAgICAvLyBpIHRoaW5rIHRoaXMgaXMgdGhlIHZlcnRpY2FsIHZpZXcgYW5nbGUuICBob3Jpem9udGFsIGFuZ2xlIGlzXG4gICAgLy8gZGVyaXZlZCBmcm9tIHRoaXMgYW5kIHRoZSBhc3BlY3QgcmF0aW8uXG4gICAgdmFyIHZpZXdBbmdsZSA9IDQ1O1xuICAgIHZpZXdBbmdsZSA9IChvcHRpb25zICYmIG9wdGlvbnMudmlld0FuZ2xlKSB8fCB2aWV3QW5nbGU7XG5cbiAgICAvLyBhc3BlY3RcbiAgICB2YXIgdmlld0FzcGVjdCA9IDE2Lzk7XG4gICAgaWYgKHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgdmlld0FzcGVjdCA9ICRlbGVtLndpZHRoKCkgLyAkZWxlbS5oZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvLyBuZWFyIGFuZCBmYXIgY2xpcHBpbmdcbiAgICB2YXIgbmVhckNsaXAgPSAwLjE7XG4gICAgdmFyIGZhckNsaXAgPSAxMDAwMDtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIG5lYXJDbGlwID0gTWF0aC5taW4odGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgLyAxMDAwO1xuICAgICAgICBmYXJDbGlwID0gTWF0aC5tYXgodGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgKiAxMDtcbiAgICB9XG5cbiAgICAvLyBjYW1lcmEgcG9zaXRpb24gYW5kIGxvb2tpbmcgZGlyZWN0aW9uXG4gICAgdmFyIGxvb2tIZXJlID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XG4gICAgdmFyIGNhbVBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xMCwgNSk7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBsb29rSGVyZSA9IHRoaXMuZi5jZW50ZXI7XG4gICAgICAgIGNhbVBvcyA9IGxvb2tIZXJlLmNsb25lKCkuYWRkKG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xLjEgKiB0aGlzLmYud1ksIDMgKiB0aGlzLmYud1opKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgdXAgY2FtZXJhXG4gICAgdmFyIGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSggdmlld0FuZ2xlLCB2aWV3QXNwZWN0LCBuZWFyQ2xpcCwgZmFyQ2xpcCk7XG4gICAgLy8gXCJ1cFwiIGlzIHBvc2l0aXZlIFpcbiAgICBjYW1lcmEudXAuc2V0KDAsMCwxKTtcbiAgICBjYW1lcmEucG9zaXRpb24uY29weShjYW1Qb3MpO1xuICAgIGNhbWVyYS5sb29rQXQobG9va0hlcmUpO1xuXG4gICAgLy8gYWRkIHRoZSBjYW1lcmEgdG8gdGhlIHNjZW5lXG4gICAgaWYgKHRoaXMuc2NlbmUpIHtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoY2FtZXJhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FtZXJhO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ29udHJvbHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBjZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCk7XG4gICAgaWYgKHRoaXMuZiAmJiB0aGlzLmYuY2VudGVyKSB7XG4gICAgICAgIGNlbnRlciA9IHRoaXMuZi5jZW50ZXIuY2xvbmUoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2FtZXJhICYmIHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciBjb250cm9scyA9IG5ldyBUSFJFRS5PcmJpdENvbnRyb2xzKHRoaXMuY2FtZXJhLCB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICBjb250cm9scy5jZW50ZXIgPSBjZW50ZXI7XG4gICAgICAgIHJldHVybiBjb250cm9scztcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAgICdzY2FwZSEnXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVNjZW5lO1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFN0dWZmICh0aGF0IGlzLCBUSFJFRS5NYXRlcmlhbCkgdGhhdCB0aGluZ3MgaW4gc2NhcGVzIGNhbiBiZSBtYWRlIG91dCBvZi5cbiAqIEBuYW1lc3BhY2VcbiAqL1xudmFyIFNjYXBlU3R1ZmYgPSB7fTtcbnZhciBMYW1iZXJ0ID0gVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbDtcblxuLyoqIGdlbmVyaWMgc3R1ZmYsIGZvciBpZiBub3RoaW5nIGVsc2UgaXMgc3BlY2lmaWVkXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2VuZXJpYyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4OTk5OTk5LFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNTAgfSk7XG5cbi8qKiB3YXRlciBpcyBibHVlIGFuZCBhIGJpdCB0cmFuc3BhcmVudFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLndhdGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgzMzk5ZmYsXG4gICAgICAgICAgICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC43NSB9KTtcblxuLyoqIGRpcnQgZm9yIGdlbmVyYWwgdXNlXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZGlydCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4YTA1MjJkIH0pO1xuXG4vLyBOaW5lIGRpcnQgY29sb3VycyBmb3IgdmFyeWluZyBtb2lzdHVyZSBsZXZlbHMuICBTdGFydCBieSBkZWZpbmluZ1xuLy8gdGhlIGRyaWVzdCBhbmQgd2V0dGVzdCBjb2xvdXJzLCBhbmQgdXNlIC5sZXJwKCkgdG8gZ2V0IGEgbGluZWFyXG4vLyBpbnRlcnBvbGF0ZWQgY29sb3VyIGZvciBlYWNoIG9mIHRoZSBpbi1iZXR3ZWVuIGRpcnRzLlxudmFyIGRyeSA9IG5ldyBUSFJFRS5Db2xvcigweGJiODg1NSk7IC8vIGRyeVxudmFyIHdldCA9IG5ldyBUSFJFRS5Db2xvcigweDg4MjIwMCk7IC8vIG1vaXN0XG5cbi8qKiBkaXJ0IGF0IHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzOiBkaXJ0MCBpcyBkcnkgYW5kIGxpZ2h0IGluXG4gICogY29sb3VyLCBkaXJ0OSBpcyBtb2lzdCBhbmQgZGFyay5cbiAgKiBAbmFtZSBcImRpcnQwIHRvIGRpcnQ5XCJcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5kaXJ0MCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeSB9KTtcblNjYXBlU3R1ZmYuZGlydDEgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDYgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDcgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDggPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgOC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDkgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiB3ZXQgfSk7XG5cbi8qKiBsZWFmIGxpdHRlciwgd2hpY2ggaW4gcmVhbGl0eSBpcyB1c3VhbGx5IGJyb3duaXNoLCBidXQgdGhpcyBoYXNcbiAgKiBhIGdyZWVuaXNoIHRvbmUgdG8gZGlzdGluZ3Vpc2ggaXQgZnJvbSBwbGFpbiBkaXJ0LlxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmxlYWZsaXR0ZXIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDU1NmIyZiB9KTtcblxuU2NhcGVTdHVmZi53b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg5OTU1MzMgfSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVN0dWZmO1xuXG5cblxuXG4iXX0=
