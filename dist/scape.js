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

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/scene":9,"./scape/stuff":10}],2:[function(require,module,exports){

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
ScapeItem = require('./item');
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
                i: []
            }
            col.push(block);
        }
        this._g.push(col);
    }
}
// ------------------------------------------------------------------
/**
 * builds block meshes for display in the provided scene.  This is
 * generally called by the ScapeScene object when you give it a
 * ScapeField, so you won't need to call it yourself.
 * @param {ScapeScene} scene the ScapeScene that will be displaying
 * this ScapeField.
 */
ScapeField.prototype.buildBlocks = function(scene) {
    var minZ = this.minZ;
    this.eachBlock( function(err, b) {
        for (var layerIndex = 0; layerIndex < b.g.length; layerIndex++) {
            b.g[layerIndex].chunk = new ScapeChunk(
                scene, b, layerIndex, minZ
            );
        }
    });
    // do this to adjust all the chunk heights
    this.calcGroundHeights();
}
// ------------------------------------------------------------------
/**
 * builds item meshes for display in the provided scene.  This is
 * generally called by the ScapeScene object when you give it a
 * ScapeField, so you won't need to call it yourself.
 * @param {ScapeScene} scene the ScapeScene that will be displaying
 * this ScapeField.
 */
ScapeField.prototype.buildItems = function(scene) {
    var minZ = this.minZ;
    this.eachBlock( function(err, b) {
        for (var itemIndex = 0; itemIndex < b.i.length; itemIndex++) {
            b.i[itemIndex].addToScene(scene);
        }
    });
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
        this.addItem(theItem.type, theItem.x, theItem.y, theItem);
    }
}
// ------------------------------------------------------------------
ScapeField.prototype.addItem = function(itemType, x, y, options) {

    // make the item
    var item = new ScapeItem(itemType, x, y, options);

    // add to the parent block
    var parentBlock = this.getBlock(x, y);
    parentBlock.i.push(item);

    // set item height to the parent block's ground height
    item.setHeight(parentBlock.g[0].z);
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
    var gx = Math.floor( (x - this.minX) / this._bX );
    var gy = Math.floor( (y - this.minY) / this._bY );
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

},{"./baseobject":2,"./item":5,"./stuff":10}],5:[function(require,module,exports){
(function (global){

// ------------------------------------------------------------------
var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeObject = require('./baseobject');
// ------------------------------------------------------------------
/**
 * Represents an item that might appear in a Scape.
 *
 * This will create (and internally cache) a mesh based on the linked
 * item information to make rendering in WebGL faster.
 *
 * @param {ScapeScene} scene The ScapeScene the item will be added into
 * @param {Object} parentBlock The block that owns this item
 * @param {ScapeItemType} itemType Type of this item
 * @param {Object} options Various options, not currently used
 *
 * @class
 */
function ScapeItem(itemType, x, y, options) {

    var defaultOptions = {};
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    this._type = itemType;
    this._scene = null;
    this.x = x;
    this.y = y;
    this._pos = new THREE.Vector3(x, y, 0);

    // TODO: maybe have a set of meshes for each scene, so an item
    // can be in multiple scenes?
    this._createNewMeshes();

};
// ------------------------------------------------------------------
// inheritance
ScapeItem.prototype = Object.create(ScapeObject.prototype);
ScapeItem.prototype.constructor = ScapeItem;
// ------------------------------------------------------------------
ScapeItem.prototype._createNewMeshes = function() {
    this._meshes = this._type(this._opts);
    this.eachMesh(function(m) {
        m.position.copy(this._pos);
    });
}
// ------------------------------------------------------------------
ScapeItem.prototype.setHeight = function(z) {
    this._pos.setZ(z);
    this.eachMesh(function(m) {
        m.position.copy(this._pos);
    });
}
// ------------------------------------------------------------------
ScapeItem.prototype.addToScene = function(scene) {
    this.eachMesh(function(m) {
        scene.add(m);
    });
    this._scene = scene;
}
// ------------------------------------------------------------------
ScapeItem.prototype.removeFromScene = function() {
    this.eachMesh(function(m) {
        this._scene.remove(m);
    });
    this._scene = null;
}
// ------------------------------------------------------------------
ScapeItem.prototype._updateMeshes = function() {
    if (this._scene) { this.removeFromScene(this._scene); }
    this._meshes = this._createNewMeshes();
    if (this._scene) { this.addToScene(this._scene); }
}
// ------------------------------------------------------------------
// do something to each mesh
ScapeItem.prototype.eachMesh = function(callback, thisArg) {
    thisArg = thisArg || this;
    for (var m = 0; m < this._meshes.length; m++) {
        callback.call(thisArg, this._meshes[m]);
    }
}
// ------------------------------------------------------------------
module.exports = ScapeItem;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./baseobject":2}],6:[function(require,module,exports){

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

},{"./itemtypes/cube":7,"./itemtypes/tree":8}],7:[function(require,module,exports){
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

},{"../stuff":10}],8:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');
// ------------------------------------------------------------------
/**
 * Returns a tree mesh of the specified size and color.
 * @param {Object} options used to specify properties of the tree.
 * @param {number} options.diameter=1 Diameter of trunk (a.k.a. DBH)
 * @param {number} options.height=10 Height of tree
 * @param {THREE.Material} options.trunkMaterial=ScapeStuff.wood What to make the trunk out of
 * @param {THREE.Material} options.leafMaterial=ScapeStuff.foliage What to make the foliage out of
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeCubeFactory(options) {

	var diam = options.diameter || 1;
	var height = options.height || 10;
	var trunkStuff = options.trunk || ScapeStuff.wood;
	var canopyStuff = options.canopy || ScapeStuff.foliage;

	var treeHeight = height * 0.99;
	var treeRadius = diam / 2;
	var canopyHeight = height / 4;
	var canopyRadius = treeRadius * 6;

	var trunkGeom = new THREE.CylinderGeometry(treeRadius/2, treeRadius, treeHeight, 12);
	var canopyGeom = new THREE.CylinderGeometry(canopyRadius, canopyRadius, canopyHeight, 12);

	// transforms we need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var trunkPosition = new THREE.Matrix4().makeTranslation(0, 0, height/2);

	// center on x = 0, y = 0, but have the canopy at the top
	var canopyPosition = new THREE.Matrix4().makeTranslation(0, 0, canopyHeight/2 + height - canopyHeight);

	trunkGeom.applyMatrix(trunkPosition.multiply(rotate));
	canopyGeom.applyMatrix(canopyPosition.multiply(rotate));

	var trunk = new THREE.Mesh(trunkGeom, trunkStuff);
	var canopy = new THREE.Mesh(canopyGeom, canopyStuff);
	return [trunk, canopy];
};
// ------------------------------------------------------------------
module.exports = ScapeCubeFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":10}],9:[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
ScapeObject = require('./baseobject');
ScapeChunk = require('./chunk');


// DEBUG
ScapeStuff = require('./stuff');
ScapeItems = require('./itemtypes');
ScapeItem = require('./item');

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

    this.connectField();

    // add grids and helper cubes
    // this.addHelperGrid();
    // this.addHelperGrid('top');
    // this.addHelperShapes();

    var lastLogAt = 0; // DEBUG
    var render = (function unboundRender(ts) {

        // DEBUG
        if (lastLogAt + 2000 < ts) {
            // console.log('rendering...');
            lastLogAt = ts;
        }

        // DEBUG disabled time updates..
        this._updateTime();

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
 * add a mesh to the THREE.Scene (a passthrough for THREE.Scene.add)
 */
ScapeScene.prototype.add = function(thing) {
    this.scene.add(thing);
}
// ------------------------------------------------------------------
/**
 * remove a mesh to the THREE.Scene (a passthrough for THREE.Scene.remove)
 */
ScapeScene.prototype.remove = function(thing) {
    this.scene.remove(thing);
}
// ------------------------------------------------------------------
/**
 * add blocks from the attached ScapeField into the scene.
 *
 * You will probably only need to call this once.
 */
ScapeScene.prototype.connectField = function() {
    this.f.buildBlocks(this);
    this.f.buildItems(this);
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
    var f = this.f;

    this.addHelperCube(f.minX, f.minY, f.minZ, white);
    this.addHelperCube(f.maxX, f.minY, f.minZ, red);
    this.addHelperCube((f.minX + f.maxX) / 2, f.minY, f.minZ, red);
    this.addHelperCube(f.minX, f.maxY, f.minZ, green);
    this.addHelperCube(f.minX, f.minY, f.maxZ, blue);
    this.addHelperCube(f.maxX, f.maxY, f.minZ, white);

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

},{"./baseobject":2,"./chunk":3,"./item":5,"./itemtypes":6,"./stuff":10}],10:[function(require,module,exports){
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
  * @name dirt[0-9]
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
ScapeStuff.leaflitter = new Lambert({ color: 0x666b2f });

/** generic brown wood
  * @memberof ScapeStuff */
ScapeStuff.wood = new Lambert({ color: 0x774422 });

/** a generic greenish leaf material
  * @memberof ScapeStuff */
ScapeStuff.foliage = new Lambert({ color: 0x558833 });

/** light wood for gumtrees etc, bit too light.  Complain to Marianne if it's wrong
  * @memberof ScapeStuff */
ScapeStuff.lightwood = new Lambert({ color: 0xffeecc });

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3ViZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvdHJlZS5qcyIsInNyYy9zY2FwZS9zY2VuZS5qcyIsInNyYy9zY2FwZS9zdHVmZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLy8gVEhSRUUgPSByZXF1aXJlKCd0aHJlZScpO1xuXG4vLyBnZXQgdGhlIHZhcmlvdXMgYml0c1xuYmFzZSAgPSByZXF1aXJlKCcuL3NjYXBlL2Jhc2VvYmplY3QnKTtcbnN0dWZmID0gcmVxdWlyZSgnLi9zY2FwZS9zdHVmZicpO1xuZmllbGQgPSByZXF1aXJlKCcuL3NjYXBlL2ZpZWxkJyk7XG5zY2VuZSA9IHJlcXVpcmUoJy4vc2NhcGUvc2NlbmUnKTtcbmNodW5rID0gcmVxdWlyZSgnLi9zY2FwZS9jaHVuaycpO1xuXG4vLyBtYWtlIGFuIG9iamVjdCBvdXQgb2YgdGhlIHZhcmlvdXMgYml0c1xuU2NhcGUgPSB7XG4gICAgQmFzZU9iamVjdDogYmFzZSxcbiAgICBTdHVmZjogc3R1ZmYsXG4gICAgQ2h1bms6IGNodW5rLFxuICAgIEZpZWxkOiBmaWVsZCxcbiAgICBTY2VuZTogc2NlbmVcbn1cblxuLy8gcmV0dXJuIHRoZSBvYmplY3QgaWYgd2UncmUgYmVpbmcgYnJvd3NlcmlmaWVkOyBvdGhlcndpc2UgYXR0YWNoXG4vLyBpdCB0byB0aGUgZ2xvYmFsIHdpbmRvdyBvYmplY3QuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNjYXBlO1xufSBlbHNlIHtcbiAgICB3aW5kb3cuU2NhcGUgPSBTY2FwZTtcbn1cbiIsIlxuLy9cbi8vIHRoaXMgXCJiYXNlXCIgb2JqZWN0IGhhcyBhIGZldyBjb252ZW5pZW5jZSBmdW5jdGlvbnMgZm9yIGhhbmRsaW5nXG4vLyBvcHRpb25zIGFuZCB3aGF0bm90XG4vL1xuXG5mdW5jdGlvbiBTY2FwZU9iamVjdChvcHRpb25zLCBkZWZhdWx0cykge1xuICAgIHRoaXMuX29wdHMgPSBPYmplY3QuY3JlYXRlKGRlZmF1bHRzKTtcbiAgICB0aGlzLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbWVyZ2UgbmV3IG9wdGlvbnMgaW50byBvdXIgb3B0aW9uc1xuU2NhcGVPYmplY3QucHJvdG90eXBlLm1lcmdlT3B0aW9ucyA9IGZ1bmN0aW9uKGV4dHJhT3B0cykge1xuICAgIGZvciAob3B0IGluIGV4dHJhT3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzW29wdF0gPSBleHRyYU9wdHNbb3B0XTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVPYmplY3Q7IiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWN0YW5ndWxhciBwcmlzbSBvZiBtYXRlcmlhbCB0aGF0IHRoZSBzb2xpZCBcImdyb3VuZFwiXG4gKiBwb3J0aW9uIG9mIGEgJ3NjYXBlIGlzIG1ha2UgdXAgb2YsIGUuZy4gZGlydCwgbGVhZiBsaXR0ZXIsIHdhdGVyLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIG1lc2ggYmFzZWQgb24gdGhlIGxpbmtlZFxuICogY2h1bmsgaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGNodW5rIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayAodmVydGljYWwgY29sdW1uIHdpdGhpbiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2FwZSkgdGhhdCBvd25zIHRoaXMgY2h1bmtcbiAqIEBwYXJhbSB7SW50ZWdlcn0gbGF5ZXJJbmRleCBJbmRleCBpbnRvIHBhcmVudEJsb2NrLmcgdGhpcyBjaHVuayBpcyBhdFxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblogbG93ZXN0IFogdmFsdWUgYW55IGNodW5rIHNob3VsZCBoYXZlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUNodW5rKHNjZW5lLCBwYXJlbnRCbG9jaywgbGF5ZXJJbmRleCwgbWluWiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9ibG9jayA9IHBhcmVudEJsb2NrO1xuICAgIHRoaXMuX2lzU3VyZmFjZSA9IChsYXllckluZGV4ID09IDApO1xuICAgIHRoaXMuX2xheWVyID0gcGFyZW50QmxvY2suZ1tsYXllckluZGV4XTtcbiAgICB0aGlzLl9taW5aID0gbWluWjtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuXG4gICAgLy8gVE9ETzogZmluaXNoIGhpbSEhXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVDaHVuay5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUNodW5rLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlQ2h1bms7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogSW52b2tlIGEgcmVidWlsZCBvZiB0aGlzIGNodW5rLlxuICpcbiAqIERpc2NhcmRzIGV4aXN0aW5nIGNhY2hlZCBtZXNoIGFuZCBidWlsZHMgYSBuZXcgbWVzaCBiYXNlZCBvbiB0aGVcbiAqIGN1cnJlbnRseSBsaW5rZWQgY2h1bmsgaW5mb3JtYXRpb24uXG4gKlxuICogQHJldHVybiBub25lXG4gKi9cblNjYXBlQ2h1bmsucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91cGRhdGVNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhlIGNodW5rIHdpbGwgYmUgYXMgZGVlcCBhcyB0aGUgbGF5ZXIgc2F5c1xuICAgIHZhciBkZXB0aCA9IHRoaXMuX2xheWVyLmR6O1xuICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgIC8vIC4udW5sZXNzIHRoYXQncyAwLCBpbiB3aGljaCBjYXNlIGdvIHRvIHRoZSBib3R0b21cbiAgICAgICAgZGVwdGggPSB0aGlzLl9sYXllci56IC0gdGhpcy5fbWluWjtcbiAgICB9XG4gICAgLy8gbWFrZSBhIGdlb21ldHJ5IGZvciB0aGUgY2h1bmtcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcbiAgICAgICAgdGhpcy5fYmxvY2suZHgsIHRoaXMuX2Jsb2NrLmR5LCBkZXB0aFxuICAgICk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCB0aGlzLl9sYXllci5tKTtcbiAgICBtZXNoLnBvc2l0aW9uLnNldChcbiAgICAgICAgdGhpcy5fYmxvY2sueCArIHRoaXMuX2Jsb2NrLmR4LzIsXG4gICAgICAgIHRoaXMuX2Jsb2NrLnkgKyB0aGlzLl9ibG9jay5keS8yLFxuICAgICAgICB0aGlzLl9sYXllci56IC0gZGVwdGgvMlxuICAgICk7XG4gICAgbWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAvLyBvbmx5IHRoZSBzdXJmYWNlIGNodW5rcyByZWNlaXZlIHNoYWRvd1xuICAgIGlmICh0aGlzLl9pc1N1cmZhY2UpIHtcbiAgICAgICAgbWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9hZGRNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUuYWRkKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fcmVtb3ZlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLnJlbW92ZSh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3VwZGF0ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVNZXNoKCk7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcbiAgICB0aGlzLl9hZGRNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDaHVuazsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbSA9IHJlcXVpcmUoJy4vaXRlbScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFRoZSBjb250YWluZXIgZm9yIGFsbCBpbmZvcm1hdGlvbiBhYm91dCBhbiBhcmVhLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucyBmb3IgdGhlIFNjYXBlRmllbGQgYmVpbmcgY3JlYXRlZC5cbiAqXG4gKiBvcHRpb24gfCBkZWZhdWx0IHZhbHVlIHwgZGVzY3JpcHRpb25cbiAqIC0tLS0tLS18LS0tLS0tLS0tLS0tLS06fC0tLS0tLS0tLS0tLVxuICogYG1pblhgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WGAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1hgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWCBheGlzIGludG9cbiAqIGBtaW5ZYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFlgICAgICB8ICAxMDAgfCBsYXJnZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NZYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFkgYXhpcyBpbnRvXG4gKiBgbWluWmAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFogKHZlcnRpY2FsIGRpbWVuc2lvbikgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhaYCAgICAgfCAgIDQwIHwgbGFyZ2VzdCBaIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWmAgIHwgICA4MCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBaIGF4aXMgaW50b1xuICogYGJsb2NrR2FwYCB8IDAuMDQgfCBnYXAgdG8gbGVhdmUgYmV0d2VlbiBibG9ja3MgYWxvbmcgdGhlIFggYW5kIFkgYXhlc1xuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUZpZWxkKG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgbWluWDogMCwgICAgICAgIG1heFg6IDEwMCwgICAgICAgICAgYmxvY2tzWDogMTAsXG4gICAgICAgIG1pblk6IDAsICAgICAgICBtYXhZOiAxMDAsICAgICAgICAgIGJsb2Nrc1k6IDEwLFxuICAgICAgICBtaW5aOiAwLCAgICAgICAgbWF4WjogNDAsICAgICAgICAgICBibG9ja3NaOiA4MCxcbiAgICAgICAgYmxvY2tHYXA6IDAuMDRcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gbWluIGFuZCBtYXggdmFsdWVzIGZvciB4IHkgYW5kIHpcbiAgICB0aGlzLm1pblggPSB0aGlzLl9vcHRzLm1pblg7XG4gICAgdGhpcy5taW5ZID0gdGhpcy5fb3B0cy5taW5ZO1xuICAgIHRoaXMubWluWiA9IHRoaXMuX29wdHMubWluWjtcblxuICAgIHRoaXMubWF4WCA9IHRoaXMuX29wdHMubWF4WDtcbiAgICB0aGlzLm1heFkgPSB0aGlzLl9vcHRzLm1heFk7XG4gICAgdGhpcy5tYXhaID0gdGhpcy5fb3B0cy5tYXhaO1xuXG4gICAgLy8gY29udmVuaWVudCBcIndpZHRoc1wiXG4gICAgdGhpcy53WCA9IHRoaXMubWF4WCAtIHRoaXMubWluWDtcbiAgICB0aGlzLndZID0gdGhpcy5tYXhZIC0gdGhpcy5taW5ZO1xuICAgIHRoaXMud1ogPSB0aGlzLm1heFogLSB0aGlzLm1pblo7XG5cbiAgICAvLyBob3cgbWFueSBibG9ja3MgYWNyb3NzIHggYW5kIHk/XG4gICAgdGhpcy5ibG9ja3NYID0gdGhpcy5fb3B0cy5ibG9ja3NYO1xuICAgIHRoaXMuYmxvY2tzWSA9IHRoaXMuX29wdHMuYmxvY2tzWTtcbiAgICB0aGlzLmJsb2Nrc1ogPSB0aGlzLl9vcHRzLmJsb2Nrc1o7XG5cbiAgICAvLyBob3cgd2lkZSBpcyBlYWNoIGJsb2NrXG4gICAgdGhpcy5fYlggPSB0aGlzLndYIC8gdGhpcy5ibG9ja3NYO1xuICAgIHRoaXMuX2JZID0gdGhpcy53WSAvIHRoaXMuYmxvY2tzWTtcbiAgICB0aGlzLl9iWiA9IHRoaXMud1ogLyB0aGlzLmJsb2Nrc1o7XG5cbiAgICAvLyBob3VzZWtlZXBpbmdcbiAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgdGhpcy5fY2FsY0NlbnRlcigpO1xuICAgIHRoaXMuX21ha2VHcmlkKCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUZpZWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlRmllbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVGaWVsZDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJygnICsgdGhpcy5taW5YICsgJy0nICsgdGhpcy5tYXhYICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWSArICctJyArIHRoaXMubWF4WSArXG4gICAgICAgICcsICcgKyB0aGlzLm1pblogKyAnLScgKyB0aGlzLm1heFogK1xuICAgICAgICAnKSdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlRmllbGQucHJvdG90eXBlLl9tYWtlR3JpZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2cgPSBbXTtcbiAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5ibG9ja3NYOyBneCsrKSB7XG4gICAgICAgIHZhciBjb2wgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuYmxvY2tzWTsgZ3krKykge1xuICAgICAgICAgICAgdmFyIHhHYXAgPSB0aGlzLl9iWCAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIHlHYXAgPSB0aGlzLl9iWSAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIGJsb2NrID0ge1xuICAgICAgICAgICAgICAgIHg6IHRoaXMubWluWCArICh0aGlzLl9iWCAqIGd4KSArIHhHYXAsXG4gICAgICAgICAgICAgICAgZHg6IHRoaXMuX2JYIC0geEdhcCAtIHhHYXAsXG4gICAgICAgICAgICAgICAgeTogdGhpcy5taW5ZICsgKHRoaXMuX2JZICogZ3kpICsgeUdhcCxcbiAgICAgICAgICAgICAgICBkeTogdGhpcy5fYlkgLSB5R2FwIC0geUdhcCxcbiAgICAgICAgICAgICAgICBnOiBbe1xuICAgICAgICAgICAgICAgICAgICB6OiB0aGlzLm1heFosXG4gICAgICAgICAgICAgICAgICAgIGR6OiAwLCAvLyAwIG1lYW5zIFwic3RyZXRjaCB0byBtaW5aXCJcbiAgICAgICAgICAgICAgICAgICAgbTogU2NhcGVTdHVmZi5nZW5lcmljLFxuICAgICAgICAgICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgIGk6IFtdXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb2wucHVzaChibG9jayk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZy5wdXNoKGNvbCk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGJ1aWxkcyBibG9jayBtZXNoZXMgZm9yIGRpc3BsYXkgaW4gdGhlIHByb3ZpZGVkIHNjZW5lLiAgVGhpcyBpc1xuICogZ2VuZXJhbGx5IGNhbGxlZCBieSB0aGUgU2NhcGVTY2VuZSBvYmplY3Qgd2hlbiB5b3UgZ2l2ZSBpdCBhXG4gKiBTY2FwZUZpZWxkLCBzbyB5b3Ugd29uJ3QgbmVlZCB0byBjYWxsIGl0IHlvdXJzZWxmLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSB0aGUgU2NhcGVTY2VuZSB0aGF0IHdpbGwgYmUgZGlzcGxheWluZ1xuICogdGhpcyBTY2FwZUZpZWxkLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5idWlsZEJsb2NrcyA9IGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdmFyIG1pblogPSB0aGlzLm1pblo7XG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYikge1xuICAgICAgICBmb3IgKHZhciBsYXllckluZGV4ID0gMDsgbGF5ZXJJbmRleCA8IGIuZy5sZW5ndGg7IGxheWVySW5kZXgrKykge1xuICAgICAgICAgICAgYi5nW2xheWVySW5kZXhdLmNodW5rID0gbmV3IFNjYXBlQ2h1bmsoXG4gICAgICAgICAgICAgICAgc2NlbmUsIGIsIGxheWVySW5kZXgsIG1pblpcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBkbyB0aGlzIHRvIGFkanVzdCBhbGwgdGhlIGNodW5rIGhlaWdodHNcbiAgICB0aGlzLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYnVpbGRzIGl0ZW0gbWVzaGVzIGZvciBkaXNwbGF5IGluIHRoZSBwcm92aWRlZCBzY2VuZS4gIFRoaXMgaXNcbiAqIGdlbmVyYWxseSBjYWxsZWQgYnkgdGhlIFNjYXBlU2NlbmUgb2JqZWN0IHdoZW4geW91IGdpdmUgaXQgYVxuICogU2NhcGVGaWVsZCwgc28geW91IHdvbid0IG5lZWQgdG8gY2FsbCBpdCB5b3Vyc2VsZi5cbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgdGhlIFNjYXBlU2NlbmUgdGhhdCB3aWxsIGJlIGRpc3BsYXlpbmdcbiAqIHRoaXMgU2NhcGVGaWVsZC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYnVpbGRJdGVtcyA9IGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdmFyIG1pblogPSB0aGlzLm1pblo7XG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYikge1xuICAgICAgICBmb3IgKHZhciBpdGVtSW5kZXggPSAwOyBpdGVtSW5kZXggPCBiLmkubGVuZ3RoOyBpdGVtSW5kZXgrKykge1xuICAgICAgICAgICAgYi5pW2l0ZW1JbmRleF0uYWRkVG9TY2VuZShzY2VuZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqIFVubGlrZSB7QGxpbmsgU2NhcGVGaWVsZCNhZGRJdGVtIGFkZEl0ZW19LCB0aGlzIG1ldGhvZCB3aWxsXG4gKiByZS1wb3NpdGlvbiBpdGVtcyBhY3Jvc3MgdGhlIEZpZWxkIChzbyB5b3UgZG9uJ3QgbmVlZCB0byBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjSXRlbXMgY2FsY0l0ZW1zfSB5b3Vyc2VsZikuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaXRlbUxpc3QgQSBsaXN0IG9mIGl0ZW1zLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgaXRlbWAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtcyA9IGZ1bmN0aW9uKGl0ZW1MaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5faXRlbXMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGl0ZW1MaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciB0aGVJdGVtID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbSh0aGVJdGVtLnR5cGUsIHRoZUl0ZW0ueCwgdGhlSXRlbS55LCB0aGVJdGVtKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW0gPSBmdW5jdGlvbihpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucykge1xuXG4gICAgLy8gbWFrZSB0aGUgaXRlbVxuICAgIHZhciBpdGVtID0gbmV3IFNjYXBlSXRlbShpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucyk7XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudCBibG9ja1xuICAgIHZhciBwYXJlbnRCbG9jayA9IHRoaXMuZ2V0QmxvY2soeCwgeSk7XG4gICAgcGFyZW50QmxvY2suaS5wdXNoKGl0ZW0pO1xuXG4gICAgLy8gc2V0IGl0ZW0gaGVpZ2h0IHRvIHRoZSBwYXJlbnQgYmxvY2sncyBncm91bmQgaGVpZ2h0XG4gICAgaXRlbS5zZXRIZWlnaHQocGFyZW50QmxvY2suZ1swXS56KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGNsYWltcyBvZiB0aGUgZ3JvdW5kIGhlaWdodCBhdCB2YXJpb3VzIHBvaW50cy5cbiAqIFVubGlrZSB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRIZWlnaHQgYWRkR3JvdW5kSGVpZ2h0fSwgdGhpc1xuICogbWV0aG9kIHdpbGwgcmUtZXh0cmFwb2xhdGUgZ3JvdW5kIGhlaWdodHMgYWNyb3NzIHRoZSBGaWVsZCAoc29cbiAqIHlvdSBkb24ndCBuZWVkIHRvIGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNHcm91bmRIZWlnaHRzIGNhbGNHcm91bmRIZWlnaHRzfSB5b3Vyc2VsZikuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaGVpZ2h0TGlzdCBBIGxpc3Qgb2Ygb2JqZWN0cy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYHpgIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKGhlaWdodExpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBoZWlnaHRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGhlaWdodExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kSGVpZ2h0KHB0LngsIHB0LnksIHB0LnopO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgY2xhaW0gdGhhdCB0aGUgZ3JvdW5kIGhlaWdodCBpcyBgemAgYXQgcG9pbnQgYHhgLGB5YC5cbiAqIElmIHlvdSBjYWxsIHRoaXMsIHJlbWVtYmVyIHRvIGV2ZW50dWFsbHkgY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IGFmdGVyIHNvXG4gKiBncm91bmQgaGVpZ2h0cyBnZXQgZXh0cmFwb2xhdGVkIGFjcm9zcyB0aGUgZW50aXJlIEZpZWxkLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFggY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geSBZIGNvb3JkaW5hdGUgb2YgdGhpcyBncm91bmQgaGVpZ2h0IHJlY29yZFxuICogQHBhcmFtIHtOdW1iZXJ9IHogdGhlIGhlaWdodCBvZiB0aGUgZ3JvdW5kIGF0IHBvc2l0aW9uIGB4YCxgeWBcbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMucHVzaCh7IHg6IHgsIHk6IHksIHo6IHogfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGFkZGl0aW9uYWwgZ3JvdW5kIHN0YWNrcyB0byB0aGUgZmllbGQncyBncm91bmQgc3RhY2tzLlxuICogVGhlIGdyb3VuZExpc3QgaXMgYW4gYXJyYXkgb2YgZGF0YSBvYmplY3RzLiAgRWFjaCBvYmplY3QgbmVlZHMgeCxcbiAqIHkgYW5kIHogcHJvcGVydGllcywgYW5kIGEgJ3N0YWNrJyBwcm9wZXJ0eSwgZWFjaCBtYXRjaGluZyB0aGVcbiAqIGNvcnJlc3BvbmRpbmcgYXJnIHRvIGFkZEdyb3VuZFN0YWNrLlxuICogQHBhcmFtIHtib29sZWFufSByZXBsYWNlIGlmIHJlcGxhY2UgaXMgdHJ1dGh5LCBkaXNjYXJkIGV4aXN0aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdW5kIHBvaW50cyBmaXJzdC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oZ3JvdW5kTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgZ3JvdW5kTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgcHQgPSBncm91bmRMaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEdyb3VuZFN0YWNrKHB0LngsIHB0LnksIHB0LnN0YWNrKTtcbiAgICB9XG4gICAgdGhpcy5jYWxjR3JvdW5kU3RhY2tzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgZ3JvdW5kIHN0YWNrIGF0IHgseSwgc3RhcnRpbmcgYXQgaGVpZ2h0IHouXG4gKiBUaGUgc3RhY2sgaXMgYW4gYXJyYXkgb2YgdHdvLWVsZW1lbnQgYXJyYXlzIHdpdGggYSBNYXRlcmlhbFxuICogYW5kIGEgZGVwdGggbnVtYmVyLCBsaWtlIHRoaXM6XG4gKiBbXG4gKiAgICAgW01hdGVyaWFsLmxlYWZMaXR0ZXIsIDAuM10sXG4gKiAgICAgW01hdGVyaWFsLmRpcnQsIDMuNV0sXG4gKiAgICAgW01hdGVyaWFsLnN0b25lLCA0XVxuICogXVxuICogVGhhdCBwdXRzIGEgbGVhZmxpdHRlciBsYXllciAwLjMgdW5pdHMgZGVlcCBvbiBhIDMuNS11bml0XG4gKiBkZWVwIGRpcnQgbGF5ZXIsIHdoaWNoIGlzIG9uIGEgc3RvbmUgbGF5ZXIuICBJZiB0aGUgZmluYWxcbiAqIGxheWVyJ3MgZGVwdGggaXMgemVybywgdGhhdCBsYXllciBpcyBhc3N1bWVkIHRvIGdvIGFsbCB0aGVcbiAqIHdheSB0byBtaW5aLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gY2FsY0dyb3VuZCgpIGFmdGVyLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKHgsIHksIHN0YWNrKSB7XG4gICAgLy8gVE9ETzogY2hlY2sgZm9yIHZhbGlkaXR5XG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzLnB1c2goeyB4OiB4LCAgeTogeSwgIHN0YWNrOiBzdGFjayB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiAocmUpY2FsY3VsYXRlIHRoZSBncm91bmQgaGVpZ2h0LiAgWW91IG5lZWQgdG8gY2FsbCB0aGlzIGlmIHlvdVxuICogYWRkIGdyb3VuZCBoZWlnaHQgY2xhaW1zIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gZmluZCBoZWlnaHQgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGFsbG93aW5nIGVhY2hcbiAgICAgICAgLy8ga25vd24gZ3JvdW5kIGhlaWdodCB0byBcInZvdGVcIiB1c2luZyB0aGUgaW52ZXJzZSBvZlxuICAgICAgICAvLyBpdCdzIHNxdWFyZWQgZGlzdGFuY2UgZnJvbSB0aGUgY2VudHJlIG9mIHRoZSBibG9jay5cbiAgICAgICAgdmFyIGgsIGR4LCBkeSwgZGlzdCwgdm90ZVNpemU7XG4gICAgICAgIHZhciBiWiA9IDA7XG4gICAgICAgIHZhciB2b3RlcyA9IDA7XG4gICAgICAgIGZvciAodmFyIGdoPTA7IGdoIDwgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5sZW5ndGg7IGdoKyspIHtcbiAgICAgICAgICAgIGggPSB0aGlzLl9ncm91bmRIZWlnaHRzW2doXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBoLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gaC55O1xuICAgICAgICAgICAgZGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgdm90ZVNpemUgPSAxIC8gZGlzdDtcbiAgICAgICAgICAgIGJaICs9IGgueiAqIHZvdGVTaXplO1xuICAgICAgICAgICAgdm90ZXMgKz0gdm90ZVNpemU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGRpdmlkZSB0byBmaW5kIHRoZSBhdmVyYWdlXG4gICAgICAgIGJaID0gYlogLyB2b3RlcztcblxuICAgICAgICAvLyBibG9jay1pc2ggaGVpZ2h0czogcm91bmQgdG8gdGhlIG5lYXJlc3QgX2JaXG4gICAgICAgIHZhciBkaWZmWiA9IGJaIC0gdGhpcy5taW5aO1xuICAgICAgICBiWiA9IHRoaXMubWluWiArIE1hdGgucm91bmQoZGlmZlogLyB0aGlzLl9iWikgKiB0aGlzLl9iWjtcblxuICAgICAgICAvLyBva2F5IG5vdyB3ZSBrbm93IGEgaGVpZ2h0ISAgc2V0IGl0XG4gICAgICAgIHRoaXMuc2V0QmxvY2tIZWlnaHQoYmxvY2ssIGJaKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBzdGFja3MuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIHN0YWNrcyBvbmUgYXQgYSB0aW1lIHVzaW5nXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRTdGFjayBhZGRHcm91bmRTdGFja30uXG4gKlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBtYWtlIHRoZSBzdGFjayBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgY29weWluZyB0aGVcbiAgICAgICAgLy8gbmVhcmVzdCBkZWZpbmVkIHN0YWNrLlxuICAgICAgICB2YXIgcywgZHgsIGR5LCB0aGlzRGlzdCwgYmVzdFN0YWNrO1xuICAgICAgICB2YXIgYmVzdERpc3QgPSB0aGlzLndYICsgdGhpcy53WSArIHRoaXMud1o7XG4gICAgICAgIGJlc3REaXN0ID0gYmVzdERpc3QgKiBiZXN0RGlzdDtcbiAgICAgICAgZm9yICh2YXIgZ3M9MDsgZ3MgPCB0aGlzLl9ncm91bmRTdGFja3MubGVuZ3RoOyBncysrKSB7XG4gICAgICAgICAgICBzID0gdGhpcy5fZ3JvdW5kU3RhY2tzW2dzXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBzLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gcy55O1xuICAgICAgICAgICAgdGhpc0Rpc3QgPSAxICsgZHgqZHggKyBkeSpkeTtcbiAgICAgICAgICAgIGlmICh0aGlzRGlzdCA8IGJlc3REaXN0KSB7XG4gICAgICAgICAgICAgICAgYmVzdFN0YWNrID0gcztcbiAgICAgICAgICAgICAgICBiZXN0RGlzdCA9IHRoaXNEaXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb2theSB3ZSBnb3QgYSBzdGFjay5cbiAgICAgICAgdGhpcy5zZXRHcm91bmRTdGFjayhibG9jaywgYmVzdFN0YWNrLnN0YWNrKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fY2FsY0NlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY2VudHJlIG9mIHRoZSBmaWVsZCBhbmQgcmVjb3JkIGl0IGFzIC5jZW50ZXJcbiAgICB0aGlzLmNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAodGhpcy5taW5YICsgdGhpcy5tYXhYKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblkgKyB0aGlzLm1heFkpIC8gMixcbiAgICAgICAgKHRoaXMubWluWiArIHRoaXMubWF4WikgLyAyXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0R3JvdW5kU3RhY2sgPSBmdW5jdGlvbihibG9jaywgc3RhY2spIHtcbiAgICB2YXIgbGF5ZXJMZXZlbCA9IGJsb2NrLmdbMF0uejtcbiAgICBmb3IgKHZhciBsYXllciA9IDA7IGxheWVyIDwgc3RhY2subGVuZ3RoOyBsYXllcisrKSB7XG4gICAgICAgIGJsb2NrLmdbbGF5ZXJdID0ge1xuICAgICAgICAgICAgejogbGF5ZXJMZXZlbCxcbiAgICAgICAgICAgIGR6OiBzdGFja1tsYXllcl1bMV0sXG4gICAgICAgICAgICBtOiBzdGFja1tsYXllcl1bMF0sXG4gICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBsYXllckxldmVsIC09IHN0YWNrW2xheWVyXVsxXTtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVidWlsZENodW5rcyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGlmIChibG9jay5nW2xdLmNodW5rKSB7XG4gICAgICAgICAgICBibG9jay5nW2xdLmNodW5rLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0QmxvY2tIZWlnaHQgPSBmdW5jdGlvbihibG9jaywgeikge1xuICAgIC8vIHRvIHNldCB0aGUgYmxvY2sgZ3JvdW5kIGhlaWdodCwgd2UgbmVlZCB0byBmaW5kIHRoZSBibG9jaydzXG4gICAgLy8gY3VycmVudCBncm91bmQgaGVpZ2h0ICh0aGUgeiBvZiB0aGUgdG9wIGxheWVyKSwgd29yayBvdXQgYVxuICAgIC8vIGRpZmYgYmV0d2VlbiB0aGF0IGFuZCB0aGUgbmV3IGhlaWdodCwgYW5kIGFkZCB0aGF0IGRpZmYgdG9cbiAgICAvLyBhbGwgdGhlIGxheWVycy5cbiAgICB2YXIgZFogPSB6IC0gYmxvY2suZ1swXS56O1xuICAgIHZhciBkZXB0aDtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgYmxvY2suZ1tsXS56ICs9IGRaO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5nZXRCbG9jayA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAvLyByZXR1cm4gdGhlIGJsb2NrIHRoYXQgaW5jbHVkZXMgIHgseVxuICAgIHZhciBneCA9IE1hdGguZmxvb3IoICh4IC0gdGhpcy5taW5YKSAvIHRoaXMuX2JYICk7XG4gICAgdmFyIGd5ID0gTWF0aC5mbG9vciggKHkgLSB0aGlzLm1pblkpIC8gdGhpcy5fYlkgKTtcbiAgICByZXR1cm4gKHRoaXMuX2dbZ3hdW2d5XSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGludm9rZSB0aGUgY2FsbGJhY2sgZWFjaCBibG9jayBpbiB0dXJuXG4vLyBjYWxsYmFjayBzaG91bGQgbG9vayBsaWtlOiBmdW5jdGlvbihlcnIsIGJsb2NrKSB7IC4uLiB9XG4vLyBpZiBlcnIgaXMgbnVsbCBldmVyeXRoaW5nIGlzIGZpbmUuIGlmIGVyciBpcyBub3QgbnVsbCwgdGhlcmVcbi8vIHdhcyBhbiBlcnJvci5cblNjYXBlRmllbGQucHJvdG90eXBlLmVhY2hCbG9jayA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnLCBvcmRlcikge1xuICAgIGlmIChvcmRlciA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3JkZXIgPSAneHVwLXl1cCc7XG4gICAgfVxuICAgIGlmICh0aGlzQXJnID09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzQXJnID0gdGhpcztcbiAgICB9XG4gICAgaWYgKG9yZGVyID09ICd4dXAteXVwJykge1xuICAgICAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5fZy5sZW5ndGg7IGd4KyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGd5ID0gMDsgZ3kgPCB0aGlzLl9nWzBdLmxlbmd0aDsgZ3krKykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgbnVsbCwgdGhpcy5fZ1tneF1bZ3ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlRmllbGQ7XG5cblxuXG5cbiIsIlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gaXRlbSB0aGF0IG1pZ2h0IGFwcGVhciBpbiBhIFNjYXBlLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIG1lc2ggYmFzZWQgb24gdGhlIGxpbmtlZFxuICogaXRlbSBpbmZvcm1hdGlvbiB0byBtYWtlIHJlbmRlcmluZyBpbiBXZWJHTCBmYXN0ZXIuXG4gKlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSBUaGUgU2NhcGVTY2VuZSB0aGUgaXRlbSB3aWxsIGJlIGFkZGVkIGludG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRCbG9jayBUaGUgYmxvY2sgdGhhdCBvd25zIHRoaXMgaXRlbVxuICogQHBhcmFtIHtTY2FwZUl0ZW1UeXBlfSBpdGVtVHlwZSBUeXBlIG9mIHRoaXMgaXRlbVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zLCBub3QgY3VycmVudGx5IHVzZWRcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVJdGVtKGl0ZW1UeXBlLCB4LCB5LCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICB0aGlzLl90eXBlID0gaXRlbVR5cGU7XG4gICAgdGhpcy5fc2NlbmUgPSBudWxsO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLl9wb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCAwKTtcblxuICAgIC8vIFRPRE86IG1heWJlIGhhdmUgYSBzZXQgb2YgbWVzaGVzIGZvciBlYWNoIHNjZW5lLCBzbyBhbiBpdGVtXG4gICAgLy8gY2FuIGJlIGluIG11bHRpcGxlIHNjZW5lcz9cbiAgICB0aGlzLl9jcmVhdGVOZXdNZXNoZXMoKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlSXRlbS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUl0ZW0ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVJdGVtO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoZXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9tZXNoZXMgPSB0aGlzLl90eXBlKHRoaXMuX29wdHMpO1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBtLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbih6KSB7XG4gICAgdGhpcy5fcG9zLnNldFooeik7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmFkZFRvU2NlbmUgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBzY2VuZS5hZGQobSk7XG4gICAgfSk7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5yZW1vdmVGcm9tU2NlbmUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgdGhpcy5fc2NlbmUucmVtb3ZlKG0pO1xuICAgIH0pO1xuICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fdXBkYXRlTWVzaGVzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3NjZW5lKSB7IHRoaXMucmVtb3ZlRnJvbVNjZW5lKHRoaXMuX3NjZW5lKTsgfVxuICAgIHRoaXMuX21lc2hlcyA9IHRoaXMuX2NyZWF0ZU5ld01lc2hlcygpO1xuICAgIGlmICh0aGlzLl9zY2VuZSkgeyB0aGlzLmFkZFRvU2NlbmUodGhpcy5fc2NlbmUpOyB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGRvIHNvbWV0aGluZyB0byBlYWNoIG1lc2hcblNjYXBlSXRlbS5wcm90b3R5cGUuZWFjaE1lc2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIHRoaXNBcmcgPSB0aGlzQXJnIHx8IHRoaXM7XG4gICAgZm9yICh2YXIgbSA9IDA7IG0gPCB0aGlzLl9tZXNoZXMubGVuZ3RoOyBtKyspIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLl9tZXNoZXNbbV0pO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW07XG4iLCJcbi8qKlxuICogQSBiYWcgb2YgaXRlbSB0eXBlcyAtLSBpLmUuIFRIUkVFLkdlb21ldHJ5cyAtLSB0aGF0IHNjYXBlcyBjYW4gaGF2ZSBpbiB0aGVtLlxuICpcbiAqIEBuYW1lc3BhY2VcbiAqL1xudmFyIFNjYXBlSXRlbXMgPSB7XG4gICAgLy8gZG9jdW1lbnRhdGlvbiBmb3IgaXRlbXMgYXJlIGluIHRoZSAuL2l0ZW10eXBlcy8qIGZpbGVzXG4gICAgY3ViZTogcmVxdWlyZSgnLi9pdGVtdHlwZXMvY3ViZScpLFxuICAgIHRyZWU6IHJlcXVpcmUoJy4vaXRlbXR5cGVzL3RyZWUnKVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW1zO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgY3ViZSBtZXNoIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZSBhbmQgbWF0ZXJpYWwuXG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBUaGUgbGVuZ3RoIG9mIGEgc2lkZSBvZiB0aGUgY3ViZS4gIERlZmF1bHRzIHRvIDEuXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBtYXRlcmlhbCBXaGF0IHRoZSBtYWtlIHRoZSBjdWJlIG91dCBvZi4gIERlZmF1bHRzIHRvIGBTY2FwZS5TdHVmZi5nZW5lcmljYFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgTm90IHVzZWQuXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmN1YmVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDdWJlRmFjdG9yeShzaXplLCBtYXRlcmlhbCwgb3B0aW9ucykge1xuICAgIC8vIGNvbnN0cnVjdCBhIG1lc2ggXCJzaXR0aW5nIG9uXCIgdGhlIHBvaW50IDAsMCwwXG5cbiAgICBzaXplID0gc2l6ZSB8fCAxO1xuICAgIG1hdGVyaWFsID0gbWF0ZXJpYWwgfHwgU2NhcGVTdHVmZi5nZW5lcmljO1xuXG4gICAgLy8gbWFrZXMgYSBjdWJlIGNlbnRlcmVkIG9uIDAsMCwwXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoc2l6ZSwgc2l6ZSwgc2l6ZSk7XG5cbiAgICAvLyB0cmFuc2Zvcm0gaXQgdXAgYSBiaXQsIHNvIHdlJ3JlIGNlbnRlcmVkIG9uIHggPSAwIGFuZCB5ID0gMCwgYnV0IGhhdmUgdGhlIF9ib3R0b21fIGZhY2Ugc2l0dGluZyBvbiB6ID0gMC5cbiAgICBnZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBzaXplLzIpICk7XG5cbiAgICAvLyByZXR1cm4gYSB0aGluZyB3aXRoIHRoYXQgZ2VvbWV0cnksIG1hZGUgb2YgdGhlIG1hdGVyaWFsXG4gICAgcmV0dXJuIG5ldyBUSFJFRS5NZXNoKGdlb20sIG1hdGVyaWFsKTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDdWJlRmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIHRyZWUgbWVzaCBvZiB0aGUgc3BlY2lmaWVkIHNpemUgYW5kIGNvbG9yLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdXNlZCB0byBzcGVjaWZ5IHByb3BlcnRpZXMgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5kaWFtZXRlcj0xIERpYW1ldGVyIG9mIHRydW5rIChhLmsuYS4gREJIKVxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuaGVpZ2h0PTEwIEhlaWdodCBvZiB0cmVlXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnRydW5rTWF0ZXJpYWw9U2NhcGVTdHVmZi53b29kIFdoYXQgdG8gbWFrZSB0aGUgdHJ1bmsgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmxlYWZNYXRlcmlhbD1TY2FwZVN0dWZmLmZvbGlhZ2UgV2hhdCB0byBtYWtlIHRoZSBmb2xpYWdlIG91dCBvZlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy50cmVlXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3ViZUZhY3Rvcnkob3B0aW9ucykge1xuXG5cdHZhciBkaWFtID0gb3B0aW9ucy5kaWFtZXRlciB8fCAxO1xuXHR2YXIgaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMTA7XG5cdHZhciB0cnVua1N0dWZmID0gb3B0aW9ucy50cnVuayB8fCBTY2FwZVN0dWZmLndvb2Q7XG5cdHZhciBjYW5vcHlTdHVmZiA9IG9wdGlvbnMuY2Fub3B5IHx8IFNjYXBlU3R1ZmYuZm9saWFnZTtcblxuXHR2YXIgdHJlZUhlaWdodCA9IGhlaWdodCAqIDAuOTk7XG5cdHZhciB0cmVlUmFkaXVzID0gZGlhbSAvIDI7XG5cdHZhciBjYW5vcHlIZWlnaHQgPSBoZWlnaHQgLyA0O1xuXHR2YXIgY2Fub3B5UmFkaXVzID0gdHJlZVJhZGl1cyAqIDY7XG5cblx0dmFyIHRydW5rR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KHRyZWVSYWRpdXMvMiwgdHJlZVJhZGl1cywgdHJlZUhlaWdodCwgMTIpO1xuXHR2YXIgY2Fub3B5R2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGNhbm9weVJhZGl1cywgY2Fub3B5UmFkaXVzLCBjYW5vcHlIZWlnaHQsIDEyKTtcblxuXHQvLyB0cmFuc2Zvcm1zIHdlIG5lZWQ6XG5cdC8vIHJvdGF0ZSBzbyBpdCdzIGhlaWdodCBpcyBhbG9uZyB0aGUgWiBheGlzIChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8gY2VudGVyIG9uIHggPSAwIGFuZCB5ID0gMCwgYnV0IGhhdmUgdGhlIF9ib3R0b21fIGZhY2Ugc2l0dGluZyBvbiB6ID0gMFxuXHR2YXIgdHJ1bmtQb3NpdGlvbiA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGhlaWdodC8yKTtcblxuXHQvLyBjZW50ZXIgb24geCA9IDAsIHkgPSAwLCBidXQgaGF2ZSB0aGUgY2Fub3B5IGF0IHRoZSB0b3Bcblx0dmFyIGNhbm9weVBvc2l0aW9uID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgY2Fub3B5SGVpZ2h0LzIgKyBoZWlnaHQgLSBjYW5vcHlIZWlnaHQpO1xuXG5cdHRydW5rR2VvbS5hcHBseU1hdHJpeCh0cnVua1Bvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHRjYW5vcHlHZW9tLmFwcGx5TWF0cml4KGNhbm9weVBvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXG5cdHZhciB0cnVuayA9IG5ldyBUSFJFRS5NZXNoKHRydW5rR2VvbSwgdHJ1bmtTdHVmZik7XG5cdHZhciBjYW5vcHkgPSBuZXcgVEhSRUUuTWVzaChjYW5vcHlHZW9tLCBjYW5vcHlTdHVmZik7XG5cdHJldHVybiBbdHJ1bmssIGNhbm9weV07XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3ViZUZhY3Rvcnk7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVDaHVuayA9IHJlcXVpcmUoJy4vY2h1bmsnKTtcblxuXG4vLyBERUJVR1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAY2FsbGJhY2sgU2NhcGVTY2VuZX5kYXRlQ2hhbmdlXG4gKiBAcGFyYW0ge3N0cmluZ30gZXJyb3IgRGVzY3JpcHRpb24gb2YgZXJyb3IsIG90aGVyd2lzZSBudWxsXG4gKiBAcGFyYW0ge2RhdGV9IGRhdGUgRGF0ZSB0aGUgc2NhcGUgaXMgbm93IGRpc3BsYXlpbmdcbiAqL1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIG9mIGEgbGFuZHNjYXBlIC8gbW9vbnNjYXBlIC8gd2hhdGV2ZXJcbiAqIEBwYXJhbSB7U2NhcGVGaWVsZH0gZmllbGQgIHRoZSBmaWVsZCBiZWluZyByZW5kZXJlZFxuICogQHBhcmFtIHtzdHJpbmd9IGRvbSAgICAgICAgRE9NIGVsZW1lbnQgdGhlIHNjYXBlIHNob3VsZCBiZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWQgaW50by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICAgIGNvbGxlY3Rpb24gb2Ygb3B0aW9ucy4gIEFsbCBhcmUgb3B0aW9uYWwuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmxpZ2h0cz0nc3VuJywnc2t5JyAtIGFycmF5IG9mIHN0cmluZ3NcbiAqIG5hbWluZyBsaWdodHMgdG8gaW5jbHVkZSBpbiB0aGlzIHNjZW5lLiAgQ2hvb3NlIGZyb206XG4gKlxuICogc3RyaW5nICAgIHwgbGlnaHQgdHlwZVxuICogLS0tLS0tLS0tLXwtLS0tLS0tLS0tLVxuICogYHRvcGxlZnRgIHwgYSBsaWdodCBmcm9tIGFib3ZlIHRoZSBjYW1lcmEncyBsZWZ0IHNob3VsZGVyXG4gKiBgYW1iaWVudGAgfCBhIGRpbSBhbWJpZW50IGxpZ2h0XG4gKiBgc3VuYCAgICAgfCBhIGRpcmVjdGlvbmFsIGxpZ2h0IHRoYXQgb3JiaXRzIHRoZSBzY2VuZSBvbmNlIHBlciBkYXlcbiAqIGBza3lgICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBzaGluZXMgZnJvbSBhYm92ZSB0aGUgc2NlbmVcbiAqIEBwYXJhbSB7RGF0ZXxcIm5vd1wifSBvcHRpb25zLmN1cnJlbnREYXRlPSdub3cnIC0gVGhlIHRpbWUgYW5kIGRhdGVcbiAqIGluc2lkZSB0aGUgc2NhcGUuICBUaGUgc3RyaW5nIFwibm93XCIgbWVhbnMgc2V0IGN1cnJlbnREYXRlIHRvIHRoZVxuICogcHJlc2VudC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnRpbWVSYXRpbz0xIFRoZSByYXRlIHRpbWUgc2hvdWxkIHBhc3MgaW5cbiAqIHRoZSBzY2FwZSwgcmVsYXRpdmUgdG8gbm9ybWFsLiAgMC4xIG1lYW5zIHRlbiB0aW1lcyBzbG93ZXIuICA2MFxuICogbWVhbnMgb25lIG1pbnV0ZSByZWFsIHRpbWUgPSBvbmUgaG91ciBzY2FwZSB0aW1lLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfmRhdGVDaGFuZ2V9IG9wdGlvbnMuZGF0ZVVwZGF0ZSBjYWxsYmFjayBmb3JcbiAqIHdoZW4gdGhlIHNjZW5lIHRpbWUgY2hhbmdlcyAod2hpY2ggaXMgYSBsb3QpLlxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZVNjZW5lKGZpZWxkLCBkb20sIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgLy8gbGlnaHRzOiBbJ3RvcGxlZnQnLCAnYW1iaWVudCddLFxuICAgICAgICBsaWdodHM6IFsnc3VuJywgJ3NreSddLFxuICAgICAgICBjdXJyZW50RGF0ZTogJ25vdycsICAvLyBlaXRoZXIgc3RyaW5nICdub3cnIG9yIGEgRGF0ZSBvYmplY3RcbiAgICAgICAgdGltZVJhdGlvOiAxLFxuICAgICAgICBkYXRlVXBkYXRlOiBudWxsIC8vIGNhbGxiYWNrIHRvdXBkYXRlIHRoZSBkaXNwbGF5ZWQgZGF0ZS90aW1lXG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIHNhdmUgdGhlIGZpZWxkXG4gICAgdGhpcy5mID0gZmllbGQ7XG5cbiAgICAvLyBkaXNjb3ZlciBET00gY29udGFpbmVyXG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZG9tKTtcblxuICAgIHRoaXMuZGF0ZSA9IHRoaXMuX29wdHMuY3VycmVudERhdGU7XG4gICAgaWYgKHRoaXMuZGF0ZSA9PT0gJ25vdycpIHtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5zdGFydERhdGUgPSB0aGlzLmRhdGU7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgLy8gY3JlYXRlIGFuZCBzYXZlIGFsbCB0aGUgYml0cyB3ZSBuZWVkXG4gICAgdGhpcy5yZW5kZXJlciA9IHRoaXMuX21ha2VSZW5kZXJlcih7IGRvbTogdGhpcy5lbGVtZW50IH0pO1xuICAgIHRoaXMuc2NlbmUgPSB0aGlzLl9tYWtlU2NlbmUoKTtcbiAgICB0aGlzLmNhbWVyYSA9IHRoaXMuX21ha2VDYW1lcmEoKTtcbiAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy5fbWFrZUNvbnRyb2xzKCk7XG4gICAgdGhpcy5saWdodHMgPSB0aGlzLl9tYWtlTGlnaHRzKHRoaXMuX29wdHMubGlnaHRzKTtcblxuICAgIHRoaXMuY29ubmVjdEZpZWxkKCk7XG5cbiAgICAvLyBhZGQgZ3JpZHMgYW5kIGhlbHBlciBjdWJlc1xuICAgIC8vIHRoaXMuYWRkSGVscGVyR3JpZCgpO1xuICAgIC8vIHRoaXMuYWRkSGVscGVyR3JpZCgndG9wJyk7XG4gICAgLy8gdGhpcy5hZGRIZWxwZXJTaGFwZXMoKTtcblxuICAgIHZhciBsYXN0TG9nQXQgPSAwOyAvLyBERUJVR1xuICAgIHZhciByZW5kZXIgPSAoZnVuY3Rpb24gdW5ib3VuZFJlbmRlcih0cykge1xuXG4gICAgICAgIC8vIERFQlVHXG4gICAgICAgIGlmIChsYXN0TG9nQXQgKyAyMDAwIDwgdHMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcuLi4nKTtcbiAgICAgICAgICAgIGxhc3RMb2dBdCA9IHRzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gREVCVUcgZGlzYWJsZWQgdGltZSB1cGRhdGVzLi5cbiAgICAgICAgdGhpcy5fdXBkYXRlVGltZSgpO1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSggcmVuZGVyICk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKCB0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSApO1xuICAgICAgICB0aGlzLmNvbnRyb2xzLnVwZGF0ZSgpO1xuICAgIH0pLmJpbmQodGhpcyk7XG5cbiAgICByZW5kZXIoMCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZVNjZW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVTY2VuZTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUuYWRkKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUuYWRkKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiByZW1vdmUgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUucmVtb3ZlKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUucmVtb3ZlKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYmxvY2tzIGZyb20gdGhlIGF0dGFjaGVkIFNjYXBlRmllbGQgaW50byB0aGUgc2NlbmUuXG4gKlxuICogWW91IHdpbGwgcHJvYmFibHkgb25seSBuZWVkIHRvIGNhbGwgdGhpcyBvbmNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25uZWN0RmllbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmYuYnVpbGRCbG9ja3ModGhpcyk7XG4gICAgdGhpcy5mLmJ1aWxkSXRlbXModGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGhlbHBlciBjdWJlcyBhdCBzb21lIG9mIHRoZSBjb3JuZXJzIG9mIHlvdXIgc2NhcGUsIHNvIHlvdSBjYW5cbiAqIHNlZSB3aGVyZSB0aGV5IGFyZSBpbiBzcGFjZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG4gICAgdmFyIGYgPSB0aGlzLmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgoZi5taW5YICsgZi5tYXhYKSAvIDIsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWF4WSwgZi5taW5aLCBncmVlbik7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5taW5ZLCBmLm1heFosIGJsdWUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWF4WSwgZi5taW5aLCB3aGl0ZSk7XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBjdWJlIGF0IHBvc2l0aW9uIGB4YCwgYHlgLCBgemAgdG8gY29uZmlybSB3aGVyZSB0aGF0IGlzLFxuICogZXhhY3RseS4gIEdyZWF0IGZvciB0cnlpbmcgdG8gd29yayBvdXQgaWYgeW91ciBzY2FwZSBpcyBiZWluZ1xuICogcmVuZGVyZWQgd2hlcmUgeW91IHRoaW5rIGl0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqXG4gKiBAcGFyYW0geyhOdW1iZXJ8VmVjdG9yMyl9IHggWCBjb29yZGluYXRlLCBvciBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvVmVjdG9yMyBUSFJFRS5WZWN0b3IzfSBjb250YWluaW5nIHgsIHkgYW5kIHogY29vcmRzXG4gKiBAcGFyYW0ge051bWJlcn0gW3ldIFkgY29vcmRpbmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IFt6XSBaIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7Q29sb3J8U3RyaW5nfEludGVnZXJ9IGNvbG9yPScjY2NjY2NjJyBDb2xvciBvZiBjdWJlLlxuICogQ2FuIGJlIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9Db2xvciBUSFJFRS5Db2xvcn0sIGEgY29sb3ItcGFyc2VhYmxlIHN0cmluZyBsaWtlXG4gKiBgJyMzMzY2Y2MnYCwgb3IgYSBudW1iZXIgbGlrZSBgMHgzMzY2Y2NgLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJDdWJlID0gZnVuY3Rpb24oeCwgeSwgeiwgY29sb3IpIHtcbiAgICAvLyBmaXJzdCwgc2V0IHRoZSBjb2xvciB0byBzb21ldGhpbmdcbiAgICBpZiAodHlwZW9mIGNvbG9yID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgdG8gbGlnaHQgZ3JleS5cbiAgICAgICAgY29sb3IgPSBuZXcgVEhSRUUuQ29sb3IoMHhjY2NjY2MpO1xuICAgIH1cbiAgICB2YXIgcG9zOyAvLyB0aGUgcG9zaXRpb24gdG8gZHJhdyB0aGUgY3ViZVxuICAgIGlmICh0eXBlb2YgeC54ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIHRoZW4gaXQncyBhIHZlY3RvciwgYW5kIHkgbWlnaHQgYmUgdGhlIGNvbG9yXG4gICAgICAgIHBvcyA9IHg7XG4gICAgICAgIGlmICh0eXBlb2YgeSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29sb3IgPSB5O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8geCBpc24ndCBhIHZlY3Rvciwgc28gYXNzdW1lIHNlcGFyYXRlIHggeSBhbmQgelxuICAgICAgICBwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCB6KTtcbiAgICAgICAgLy8gd2UgY2F1Z2h0IGNvbG9yIGFscmVhZHkuXG4gICAgfVxuXG4gICAgLy8gYWJvdXQgYSBmaWZ0aWV0aCBvZiB0aGUgZmllbGQncyBzdW1tZWQgZGltZW5zaW9uc1xuICAgIHZhciBzaXplID0gKHRoaXMuZi53WCArIHRoaXMuZi53WSArIHRoaXMuZi53WikgLyA1MDtcbiAgICAvLyB1c2UgdGhlIGNvbG91ciB3ZSBkZWNpZGVkIGVhcmxpZXJcbiAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7IGNvbG9yOiBjb2xvciB9KTtcblxuICAgIC8vIG9rYXkuLiBtYWtlIGl0LCBwb3NpdGlvbiBpdCwgYW5kIHNob3cgaXRcbiAgICB2YXIgY3ViZSA9IFNjYXBlSXRlbXMuY3ViZShzaXplLCBtYXRlcmlhbCk7XG4gICAgY3ViZS5wb3NpdGlvbi5jb3B5KHBvcyk7XG4gICAgdGhpcy5zY2VuZS5hZGQoY3ViZSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckdyaWQgPSBmdW5jdGlvbih0b3BPckJvdHRvbSkge1xuICAgIHZhciBneiA9IDA7XG4gICAgdmFyIGdjID0gMHg0NDQ0NDQ7XG4gICAgaWYgKHRvcE9yQm90dG9tID09ICd0b3AnKSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1heFo7XG4gICAgICAgIGdjID0gMHhjY2NjZmY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWluWjtcbiAgICAgICAgZ2MgPSAweGNjZmZjYztcbiAgICB9XG5cbiAgICB2YXIgZ3JpZFcgPSBNYXRoLm1heCh0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLCB0aGlzLmYubWF4WSAtIHRoaXMuZi5taW5ZKTtcblxuICAgIC8vIEdyaWQgXCJzaXplXCIgaXMgdGhlIGRpc3RhbmNlIGluIGVhY2ggb2YgdGhlIGZvdXIgZGlyZWN0aW9ucyxcbiAgICAvLyB0aGUgZ3JpZCBzaG91bGQgc3Bhbi4gIFNvIGZvciBhIGdyaWQgVyB1bml0cyBhY3Jvc3MsIHNwZWNpZnlcbiAgICAvLyB0aGUgc2l6ZSBhcyBXLzIuXG4gICAgdmFyIGdyaWRYWSA9IG5ldyBUSFJFRS5HcmlkSGVscGVyKGdyaWRXLzIsIGdyaWRXLzEwKTtcbiAgICBncmlkWFkuc2V0Q29sb3JzKGdjLCBnYyk7XG4gICAgZ3JpZFhZLnJvdGF0aW9uLnggPSBNYXRoLlBJLzI7XG4gICAgZ3JpZFhZLnBvc2l0aW9uLnNldCh0aGlzLmYubWluWCArIGdyaWRXLzIsIHRoaXMuZi5taW5ZICsgZ3JpZFcvMiwgZ3opO1xuICAgIHRoaXMuc2NlbmUuYWRkKGdyaWRYWSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQ3JlYXRlIGFuZCByZXR1cm4gYSBUSFJFRS5SZW5kZXJlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdmFyaW91cyBvcHRpb25zXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR8alF1ZXJ5RWxlbX0gb3B0aW9ucy5kb20gYSBkb20gZWxlbWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLndpZHRoIHJlbmRlcmVyIHdpZHRoIChpbiBwaXhlbHMpXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuaGVpZ2h0IHJlbmRlcmVyIGhlaWdodCAoaW4gcGl4ZWxzKVxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlUmVuZGVyZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoeyBhbnRpYWxpYXM6IHRydWUsIGFscGhhOiB0cnVlIH0pO1xuICAgIHJlbmRlcmVyLnNldENsZWFyQ29sb3IoIDB4MDAwMDAwLCAwKTtcbiAgICByZW5kZXJlci5zaGFkb3dNYXBFbmFibGVkID0gdHJ1ZTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRvbSkge1xuICAgICAgICB2YXIgJGRvbSA9ICQob3B0aW9ucy5kb20pO1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKCRkb20ud2lkdGgoKSwgJGRvbS5oZWlnaHQoKSk7XG4gICAgICAgICRkb20uYXBwZW5kKHJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLndpZHRoICYmIG9wdGlvbnMuaGVpZ2h0KSB7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUob3B0aW9ucy53aWR0aCwgb3B0aW9ucy5oZWlnaHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVuZGVyZXI7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgc2NhcGUgdGltZSB0byBtYXRjaCB0aGUgY3VycmVudCB0aW1lICh0YWtpbmcgaW50b1xuICogYWNjb3VudCB0aGUgdGltZVJhdGlvIGV0YykuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX3VwZGF0ZVRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdy5nZXRUaW1lKCkgLSB0aGlzLmZpcnN0UmVuZGVyO1xuICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKHRoaXMuZmlyc3RSZW5kZXIgKyAoZWxhcHNlZCAqIHRoaXMuX29wdHMudGltZVJhdGlvKSk7XG4gICAgdmFyIGNhbGxiYWNrID0gdGhpcy5fb3B0cy5kYXRlVXBkYXRlO1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrRGF0ZSA9IG5ldyBEYXRlKHRoaXMuZGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGNhbGxiYWNrRGF0ZSk7XG4gICAgICAgIH0sIDApO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVTdW4oKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB1cGRhdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc3VuIHRvIHN1aXQgdGhlIHNjYXBlIGN1cnJlbnQgdGltZS5cbiAqIEBwYXJhbSAge1RIUkVFLkRpcmVjdGlvbmFsTGlnaHR9IFtzdW5dIHRoZSBzdW4gdG8gYWN0IG9uLiAgSWYgbm90XG4gKiBzdXBwbGllZCwgdGhpcyBtZXRob2Qgd2lsbCBhY3Qgb24gdGhlIGxpZ2h0IGluIHRoaXMgc2NlbmUncyBsaWdodFxuICogbGlzdCB0aGF0IGlzIGNhbGxlZCBcInN1blwiLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVTdW4gPSBmdW5jdGlvbihzdW4pIHtcblxuICAgIGlmICh0eXBlb2Ygc3VuID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGlmIHRoZXkgZGlkbid0IHByb3ZpZGUgYSBzdW4sIHVzZSBvdXIgb3duXG4gICAgICAgIHN1biA9IHRoaXMubGlnaHRzLnN1bjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47IC8vIGJhaWwgaWYgdGhlcmUncyBubyBzdW4gQVJSUkggV0hBVCBESUQgWU9VIERPXG4gICAgfVxuXG4gICAgdmFyIHN1bkFuZ2xlID0gKHRoaXMuZGF0ZS5nZXRIb3VycygpKjYwICsgdGhpcy5kYXRlLmdldE1pbnV0ZXMoKSkgLyAxNDQwICogMiAqIE1hdGguUEk7XG4gICAgdmFyIHN1blJvdGF0aW9uQXhpcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xuXG4gICAgc3VuLnBvc2l0aW9uXG4gICAgICAgIC5zZXQoMCwgLTMgKiB0aGlzLmYud1ksIC0yMCAqIHRoaXMuZi53WilcbiAgICAgICAgLmFwcGx5QXhpc0FuZ2xlKHN1blJvdGF0aW9uQXhpcywgc3VuQW5nbGUpXG4gICAgICAgIC5hZGQodGhpcy5mLmNlbnRlcik7XG5cbiAgICB2YXIgc3VuWiA9IHN1bi5wb3NpdGlvbi56O1xuXG4gICAgLy8gc3dpdGNoIHRoZSBzdW4gb2ZmIHdoZW4gaXQncyBuaWdodCB0aW1lXG4gICAgaWYgKHN1bi5vbmx5U2hhZG93ID09IGZhbHNlICYmIHN1blogPD0gdGhpcy5mLmNlbnRlci56KSB7XG4gICAgICAgIHN1bi5vbmx5U2hhZG93ID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHN1bi5vbmx5U2hhZG93ID09IHRydWUgJiYgc3VuWiA+IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGZhZGUgb3V0IHRoZSBzaGFkb3cgZGFya25lc3Mgd2hlbiB0aGUgc3VuIGlzIGxvd1xuICAgIGlmIChzdW5aID49IHRoaXMuZi5jZW50ZXIueiAmJiBzdW5aIDw9IHRoaXMuZi5tYXhaKSB7XG4gICAgICAgIHZhciB1cG5lc3MgPSBNYXRoLm1heCgwLCAoc3VuWiAtIHRoaXMuZi5jZW50ZXIueikgLyB0aGlzLmYud1ogKiAyKTtcbiAgICAgICAgc3VuLnNoYWRvd0RhcmtuZXNzID0gMC41ICogdXBuZXNzO1xuICAgICAgICBzdW4uaW50ZW5zaXR5ID0gdXBuZXNzO1xuICAgIH1cblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlTGlnaHRzID0gZnVuY3Rpb24obGlnaHRzVG9JbmNsdWRlKSB7XG5cbiAgICB2YXIgbGlnaHRzID0ge307XG4gICAgdmFyIGYgPSB0aGlzLmY7ICAvLyBjb252ZW5pZW50IHJlZmVyZW5jZSB0byB0aGUgZmllbGRcblxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignYW1iaWVudCcpICE9IC0xKSB7XG4gICAgICAgIC8vIGFkZCBhbiBhbWJpZW50IGxpc3RcbiAgICAgICAgbGlnaHRzLmFtYmllbnQgPSBuZXcgVEhSRUUuQW1iaWVudExpZ2h0KDB4MjIyMjMzKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCd0b3BsZWZ0JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLmxlZnQgPSBuZXcgVEhSRUUuUG9pbnRMaWdodCgweGZmZmZmZiwgMSwgMCk7XG4gICAgICAgIC8vIHBvc2l0aW9uIGxpZ2h0IG92ZXIgdGhlIHZpZXdlcidzIGxlZnQgc2hvdWxkZXIuLlxuICAgICAgICAvLyAtIExFRlQgb2YgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeCB3aWR0aFxuICAgICAgICAvLyAtIEJFSElORCB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB5IHdpZHRoXG4gICAgICAgIC8vIC0gQUJPVkUgdGhlIGNhbWVyYSBieSB0aGUgZmllbGQncyBoZWlnaHRcbiAgICAgICAgbGlnaHRzLmxlZnQucG9zaXRpb24uYWRkVmVjdG9ycyhcbiAgICAgICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLFxuICAgICAgICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoLTAuNSAqIGYud1gsIC0wLjUgKiBmLndZLCAxICogZi53WilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdzdW4nKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc3VuID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZWUpO1xuICAgICAgICBsaWdodHMuc3VuLmludGVuc2l0eSA9IDEuMDtcblxuICAgICAgICB0aGlzLl91cGRhdGVTdW4obGlnaHRzLnN1bik7XG5cbiAgICAgICAgLy8gbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFWaXNpYmxlID0gdHJ1ZTsgIC8vIERFQlVHXG5cbiAgICAgICAgLy8gZGlyZWN0aW9uIG9mIHN1bmxpZ2h0XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc3VuLnRhcmdldCA9IHRhcmdldDtcblxuICAgICAgICAvLyBzdW4gZGlzdGFuY2UsIGxvbFxuICAgICAgICB2YXIgc3VuRGlzdGFuY2UgPSBsaWdodHMuc3VuLnBvc2l0aW9uLmRpc3RhbmNlVG8obGlnaHRzLnN1bi50YXJnZXQucG9zaXRpb24pO1xuICAgICAgICAvLyBsb25nZXN0IGRpYWdvbmFsIGZyb20gZmllbGQtY2VudGVyXG4gICAgICAgIHZhciBtYXhGaWVsZERpYWdvbmFsID0gZi5jZW50ZXIuZGlzdGFuY2VUbyhuZXcgVEhSRUUuVmVjdG9yMyhmLm1pblgsIGYubWluWSwgZi5taW5aKSk7XG5cbiAgICAgICAgLy8gc2hhZG93IHNldHRpbmdzXG4gICAgICAgIGxpZ2h0cy5zdW4uY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93RGFya25lc3MgPSAwLjMzO1xuXG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTmVhciA9IHN1bkRpc3RhbmNlIC0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFGYXIgPSBzdW5EaXN0YW5jZSArIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVG9wID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFSaWdodCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhQm90dG9tID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUxlZnQgPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc2t5JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnNreSA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZWVlZWZmKTtcbiAgICAgICAgbGlnaHRzLnNreS5pbnRlbnNpdHkgPSAwLjg7XG5cbiAgICAgICAgLy8gc2t5IGlzIGRpcmVjdGx5IGFib3ZlXG4gICAgICAgIHZhciBza3lIZWlnaHQgPSA1ICogZi53WjtcbiAgICAgICAgbGlnaHRzLnNreS5wb3NpdGlvbi5jb3B5KHRoaXMuY2FtZXJhLnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbGlnaHRzLnNreS5wb3NpdGlvbi5zZXRaKGYubWF4WiArIHNreUhlaWdodCk7XG5cbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5za3kudGFyZ2V0ID0gdGFyZ2V0O1xuICAgIH1cblxuICAgIGZvciAodmFyIGxpZ2h0IGluIGxpZ2h0cykge1xuICAgICAgICBpZiAobGlnaHRzLmhhc093blByb3BlcnR5KGxpZ2h0KSkge1xuICAgICAgICAgICAgdGhpcy5zY2VuZS5hZGQobGlnaHRzW2xpZ2h0XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlnaHRzO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlU2NlbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcbiAgICAvLyBhZGQgZm9nXG4gICAgLy8gc2NlbmUuZm9nID0gbmV3IFRIUkVFLkZvZygnI2YwZjhmZicsIDEwMCwgMTUwKTtcbiAgICByZXR1cm4gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDYW1lcmEgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cbiAgICAvLyB2aWV3aW5nIGFuZ2xlXG4gICAgLy8gaSB0aGluayB0aGlzIGlzIHRoZSB2ZXJ0aWNhbCB2aWV3IGFuZ2xlLiAgaG9yaXpvbnRhbCBhbmdsZSBpc1xuICAgIC8vIGRlcml2ZWQgZnJvbSB0aGlzIGFuZCB0aGUgYXNwZWN0IHJhdGlvLlxuICAgIHZhciB2aWV3QW5nbGUgPSA0NTtcbiAgICB2aWV3QW5nbGUgPSAob3B0aW9ucyAmJiBvcHRpb25zLnZpZXdBbmdsZSkgfHwgdmlld0FuZ2xlO1xuXG4gICAgLy8gYXNwZWN0XG4gICAgdmFyIHZpZXdBc3BlY3QgPSAxNi85O1xuICAgIGlmICh0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIHZpZXdBc3BlY3QgPSAkZWxlbS53aWR0aCgpIC8gJGVsZW0uaGVpZ2h0KCk7XG4gICAgfVxuXG4gICAgLy8gbmVhciBhbmQgZmFyIGNsaXBwaW5nXG4gICAgdmFyIG5lYXJDbGlwID0gMC4xO1xuICAgIHZhciBmYXJDbGlwID0gMTAwMDA7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBuZWFyQ2xpcCA9IE1hdGgubWluKHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opIC8gMTAwMDtcbiAgICAgICAgZmFyQ2xpcCA9IE1hdGgubWF4KHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opICogMTA7XG4gICAgfVxuXG4gICAgLy8gY2FtZXJhIHBvc2l0aW9uIGFuZCBsb29raW5nIGRpcmVjdGlvblxuICAgIHZhciBsb29rSGVyZSA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xuICAgIHZhciBjYW1Qb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAtMTAsIDUpO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbG9va0hlcmUgPSB0aGlzLmYuY2VudGVyO1xuICAgICAgICBjYW1Qb3MgPSBsb29rSGVyZS5jbG9uZSgpLmFkZChuZXcgVEhSRUUuVmVjdG9yMygwLCAtMS4xICogdGhpcy5mLndZLCAzICogdGhpcy5mLndaKSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IHVwIGNhbWVyYVxuICAgIHZhciBjYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoIHZpZXdBbmdsZSwgdmlld0FzcGVjdCwgbmVhckNsaXAsIGZhckNsaXApO1xuICAgIC8vIFwidXBcIiBpcyBwb3NpdGl2ZSBaXG4gICAgY2FtZXJhLnVwLnNldCgwLDAsMSk7XG4gICAgY2FtZXJhLnBvc2l0aW9uLmNvcHkoY2FtUG9zKTtcbiAgICBjYW1lcmEubG9va0F0KGxvb2tIZXJlKTtcblxuICAgIC8vIGFkZCB0aGUgY2FtZXJhIHRvIHRoZSBzY2VuZVxuICAgIGlmICh0aGlzLnNjZW5lKSB7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGNhbWVyYSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbWVyYTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwwLDApO1xuICAgIGlmICh0aGlzLmYgJiYgdGhpcy5mLmNlbnRlcikge1xuICAgICAgICBjZW50ZXIgPSB0aGlzLmYuY2VudGVyLmNsb25lKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNhbWVyYSAmJiB0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgY29udHJvbHMgPSBuZXcgVEhSRUUuT3JiaXRDb250cm9scyh0aGlzLmNhbWVyYSwgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgY29udHJvbHMuY2VudGVyID0gY2VudGVyO1xuICAgICAgICByZXR1cm4gY29udHJvbHM7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnc2NhcGUhJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTY2VuZTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBTdHVmZiAodGhhdCBpcywgVEhSRUUuTWF0ZXJpYWwpIHRoYXQgdGhpbmdzIGluIHNjYXBlcyBjYW4gYmUgbWFkZSBvdXQgb2YuXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZVN0dWZmID0ge307XG52YXIgTGFtYmVydCA9IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWw7XG5cbi8qKiBnZW5lcmljIHN0dWZmLCBmb3IgaWYgbm90aGluZyBlbHNlIGlzIHNwZWNpZmllZFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdlbmVyaWMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSxcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjUwIH0pO1xuXG4vKiogd2F0ZXIgaXMgYmx1ZSBhbmQgYSBiaXQgdHJhbnNwYXJlbnRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53YXRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MzM5OWZmLFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNzUgfSk7XG5cbi8qKiBkaXJ0IGZvciBnZW5lcmFsIHVzZVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGEwNTIyZCB9KTtcblxuLy8gTmluZSBkaXJ0IGNvbG91cnMgZm9yIHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzLiAgU3RhcnQgYnkgZGVmaW5pbmdcbi8vIHRoZSBkcmllc3QgYW5kIHdldHRlc3QgY29sb3VycywgYW5kIHVzZSAubGVycCgpIHRvIGdldCBhIGxpbmVhclxuLy8gaW50ZXJwb2xhdGVkIGNvbG91ciBmb3IgZWFjaCBvZiB0aGUgaW4tYmV0d2VlbiBkaXJ0cy5cbnZhciBkcnkgPSBuZXcgVEhSRUUuQ29sb3IoMHhiYjg4NTUpOyAvLyBkcnlcbnZhciB3ZXQgPSBuZXcgVEhSRUUuQ29sb3IoMHg4ODIyMDApOyAvLyBtb2lzdFxuXG4vKiogZGlydCBhdCB2YXJ5aW5nIG1vaXN0dXJlIGxldmVsczogZGlydDAgaXMgZHJ5IGFuZCBsaWdodCBpblxuICAqIGNvbG91ciwgZGlydDkgaXMgbW9pc3QgYW5kIGRhcmsuXG4gICogQG5hbWUgZGlydFswLTldXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZGlydDAgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkgfSk7XG5TY2FwZVN0dWZmLmRpcnQxID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDEvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDIvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQzID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDMvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDQvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ1ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDUvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ2ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDYvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ3ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDcvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ4ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDgvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ5ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogd2V0IH0pO1xuXG4vKiogbGVhZiBsaXR0ZXIsIHdoaWNoIGluIHJlYWxpdHkgaXMgdXN1YWxseSBicm93bmlzaCwgYnV0IHRoaXMgaGFzXG4gICogYSBncmVlbmlzaCB0b25lIHRvIGRpc3Rpbmd1aXNoIGl0IGZyb20gcGxhaW4gZGlydC5cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5sZWFmbGl0dGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg2NjZiMmYgfSk7XG5cbi8qKiBnZW5lcmljIGJyb3duIHdvb2RcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg3NzQ0MjIgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDU1ODgzMyB9KTtcblxuLyoqIGxpZ2h0IHdvb2QgZm9yIGd1bXRyZWVzIGV0YywgYml0IHRvbyBsaWdodC4gIENvbXBsYWluIHRvIE1hcmlhbm5lIGlmIGl0J3Mgd3JvbmdcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5saWdodHdvb2QgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGZmZWVjYyB9KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU3R1ZmY7XG5cblxuXG5cbiJdfQ==
