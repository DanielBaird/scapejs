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
function ScapeTreeFactory(options) {

	var diam = options.diameter || 1;
	var height = options.height || 10;
	var trunkStuff = options.trunk || ScapeStuff.wood;
	var canopyStuff = options.canopy || ScapeStuff.foliage;

	var canopyHeight = height / 4;
	var treeHeight = height - canopyHeight;
	var treeRadius = 2 * diam / 2;
	var canopyRadius = treeRadius * 6;

	var trunkGeom = new THREE.CylinderGeometry(treeRadius/2, treeRadius, treeHeight, 12);
	var canopyGeom = new THREE.CylinderGeometry(canopyRadius, canopyRadius, canopyHeight, 12);

	// transforms we need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var trunkPosition = new THREE.Matrix4().makeTranslation(0, 0, treeHeight/2);

	// center on x = 0, y = 0, but have the canopy at the top
	var canopyPosition = new THREE.Matrix4().makeTranslation(0, 0, canopyHeight/2 + height - canopyHeight);

	trunkGeom.applyMatrix(trunkPosition.multiply(rotate));
	canopyGeom.applyMatrix(canopyPosition.multiply(rotate));

	var trunk = new THREE.Mesh(trunkGeom, trunkStuff);
	// var canopy = new THREE.PointCloud(canopyGeom, canopyStuff);
	var canopy = new THREE.Mesh(canopyGeom, canopyStuff);
	return [trunk, canopy];
};
// ------------------------------------------------------------------
module.exports = ScapeTreeFactory;

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
    // scene.fog = new THREE.Fog(
    //     '#f0f8ff',
    //     this.f.maxX - this.f.minX,
    //     this.f.maxX - this.f.minX * 3
    // );
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

/** a generic greenish leaf material
  * @memberof ScapeStuff */
ScapeStuff.foliage = new Lambert({ color: 0x558833,
                      transparent: true, opacity: 0.75 });

/** a foliage material for use in point cloud objects
  * @memberof ScapeStuff */
ScapeStuff.pointFoliage = new THREE.PointCloudMaterial({ color: 0x558833, size: 0.5 });

/** light wood for gumtrees etc, bit too light.  Complain to Marianne if it's wrong
  * @memberof ScapeStuff */
ScapeStuff.lightwood = new Lambert({ color: 0xffeecc });

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3ViZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvdHJlZS5qcyIsInNyYy9zY2FwZS9zY2VuZS5qcyIsInNyYy9zY2FwZS9zdHVmZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOWNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vIFRIUkVFID0gcmVxdWlyZSgndGhyZWUnKTtcblxuLy8gZ2V0IHRoZSB2YXJpb3VzIGJpdHNcbmJhc2UgID0gcmVxdWlyZSgnLi9zY2FwZS9iYXNlb2JqZWN0Jyk7XG5zdHVmZiA9IHJlcXVpcmUoJy4vc2NhcGUvc3R1ZmYnKTtcbmZpZWxkID0gcmVxdWlyZSgnLi9zY2FwZS9maWVsZCcpO1xuc2NlbmUgPSByZXF1aXJlKCcuL3NjYXBlL3NjZW5lJyk7XG5jaHVuayA9IHJlcXVpcmUoJy4vc2NhcGUvY2h1bmsnKTtcblxuLy8gbWFrZSBhbiBvYmplY3Qgb3V0IG9mIHRoZSB2YXJpb3VzIGJpdHNcblNjYXBlID0ge1xuICAgIEJhc2VPYmplY3Q6IGJhc2UsXG4gICAgU3R1ZmY6IHN0dWZmLFxuICAgIENodW5rOiBjaHVuayxcbiAgICBGaWVsZDogZmllbGQsXG4gICAgU2NlbmU6IHNjZW5lXG59XG5cbi8vIHJldHVybiB0aGUgb2JqZWN0IGlmIHdlJ3JlIGJlaW5nIGJyb3dzZXJpZmllZDsgb3RoZXJ3aXNlIGF0dGFjaFxuLy8gaXQgdG8gdGhlIGdsb2JhbCB3aW5kb3cgb2JqZWN0LlxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTY2FwZTtcbn0gZWxzZSB7XG4gICAgd2luZG93LlNjYXBlID0gU2NhcGU7XG59XG4iLCJcbi8vXG4vLyB0aGlzIFwiYmFzZVwiIG9iamVjdCBoYXMgYSBmZXcgY29udmVuaWVuY2UgZnVuY3Rpb25zIGZvciBoYW5kbGluZ1xuLy8gb3B0aW9ucyBhbmQgd2hhdG5vdFxuLy9cblxuZnVuY3Rpb24gU2NhcGVPYmplY3Qob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgICB0aGlzLl9vcHRzID0gT2JqZWN0LmNyZWF0ZShkZWZhdWx0cyk7XG4gICAgdGhpcy5tZXJnZU9wdGlvbnMob3B0aW9ucyk7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lcmdlIG5ldyBvcHRpb25zIGludG8gb3VyIG9wdGlvbnNcblNjYXBlT2JqZWN0LnByb3RvdHlwZS5tZXJnZU9wdGlvbnMgPSBmdW5jdGlvbihleHRyYU9wdHMpIHtcbiAgICBmb3IgKG9wdCBpbiBleHRyYU9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0c1tvcHRdID0gZXh0cmFPcHRzW29wdF07XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlT2JqZWN0OyIsIlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVjdGFuZ3VsYXIgcHJpc20gb2YgbWF0ZXJpYWwgdGhhdCB0aGUgc29saWQgXCJncm91bmRcIlxuICogcG9ydGlvbiBvZiBhICdzY2FwZSBpcyBtYWtlIHVwIG9mLCBlLmcuIGRpcnQsIGxlYWYgbGl0dGVyLCB3YXRlci5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBtZXNoIGJhc2VkIG9uIHRoZSBsaW5rZWRcbiAqIGNodW5rIGluZm9ybWF0aW9uIHRvIG1ha2UgcmVuZGVyaW5nIGluIFdlYkdMIGZhc3Rlci5cbiAqXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIFRoZSBTY2FwZVNjZW5lIHRoZSBjaHVuayB3aWxsIGJlIGFkZGVkIGludG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRCbG9jayBUaGUgYmxvY2sgKHZlcnRpY2FsIGNvbHVtbiB3aXRoaW4gdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NhcGUpIHRoYXQgb3ducyB0aGlzIGNodW5rXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGxheWVySW5kZXggSW5kZXggaW50byBwYXJlbnRCbG9jay5nIHRoaXMgY2h1bmsgaXMgYXRcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaW5aIGxvd2VzdCBaIHZhbHVlIGFueSBjaHVuayBzaG91bGQgaGF2ZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zLCBub3QgY3VycmVudGx5IHVzZWRcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVDaHVuayhzY2VuZSwgcGFyZW50QmxvY2ssIGxheWVySW5kZXgsIG1pblosIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgdGhpcy5fYmxvY2sgPSBwYXJlbnRCbG9jaztcbiAgICB0aGlzLl9pc1N1cmZhY2UgPSAobGF5ZXJJbmRleCA9PSAwKTtcbiAgICB0aGlzLl9sYXllciA9IHBhcmVudEJsb2NrLmdbbGF5ZXJJbmRleF07XG4gICAgdGhpcy5fbWluWiA9IG1pblo7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcblxuICAgIC8vIFRPRE86IGZpbmlzaCBoaW0hIVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlQ2h1bmsucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVDaHVuay5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUNodW5rO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEludm9rZSBhIHJlYnVpbGQgb2YgdGhpcyBjaHVuay5cbiAqXG4gKiBEaXNjYXJkcyBleGlzdGluZyBjYWNoZWQgbWVzaCBhbmQgYnVpbGRzIGEgbmV3IG1lc2ggYmFzZWQgb24gdGhlXG4gKiBjdXJyZW50bHkgbGlua2VkIGNodW5rIGluZm9ybWF0aW9uLlxuICpcbiAqIEByZXR1cm4gbm9uZVxuICovXG5TY2FwZUNodW5rLnByb3RvdHlwZS5yZWJ1aWxkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fY3JlYXRlTmV3TWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHRoZSBjaHVuayB3aWxsIGJlIGFzIGRlZXAgYXMgdGhlIGxheWVyIHNheXNcbiAgICB2YXIgZGVwdGggPSB0aGlzLl9sYXllci5kejtcbiAgICBpZiAoZGVwdGggPT0gMCkge1xuICAgICAgICAvLyAuLnVubGVzcyB0aGF0J3MgMCwgaW4gd2hpY2ggY2FzZSBnbyB0byB0aGUgYm90dG9tXG4gICAgICAgIGRlcHRoID0gdGhpcy5fbGF5ZXIueiAtIHRoaXMuX21pblo7XG4gICAgfVxuICAgIC8vIG1ha2UgYSBnZW9tZXRyeSBmb3IgdGhlIGNodW5rXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoXG4gICAgICAgIHRoaXMuX2Jsb2NrLmR4LCB0aGlzLl9ibG9jay5keSwgZGVwdGhcbiAgICApO1xuICAgIHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgdGhpcy5fbGF5ZXIubSk7XG4gICAgbWVzaC5wb3NpdGlvbi5zZXQoXG4gICAgICAgIHRoaXMuX2Jsb2NrLnggKyB0aGlzLl9ibG9jay5keC8yLFxuICAgICAgICB0aGlzLl9ibG9jay55ICsgdGhpcy5fYmxvY2suZHkvMixcbiAgICAgICAgdGhpcy5fbGF5ZXIueiAtIGRlcHRoLzJcbiAgICApO1xuICAgIG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgLy8gb25seSB0aGUgc3VyZmFjZSBjaHVua3MgcmVjZWl2ZSBzaGFkb3dcbiAgICBpZiAodGhpcy5faXNTdXJmYWNlKSB7XG4gICAgICAgIG1lc2gucmVjZWl2ZVNoYWRvdyA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBtZXNoO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fYWRkTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLmFkZCh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3JlbW92ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zY2VuZS5yZW1vdmUodGhpcy5fbWVzaCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl91cGRhdGVNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVtb3ZlTWVzaCgpO1xuICAgIHRoaXMuX21lc2ggPSB0aGlzLl9jcmVhdGVOZXdNZXNoKCk7XG4gICAgdGhpcy5fYWRkTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ2h1bms7IiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuL3N0dWZmJyk7XG5TY2FwZUl0ZW0gPSByZXF1aXJlKCcuL2l0ZW0nKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBUaGUgY29udGFpbmVyIGZvciBhbGwgaW5mb3JtYXRpb24gYWJvdXQgYW4gYXJlYS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMgZm9yIHRoZSBTY2FwZUZpZWxkIGJlaW5nIGNyZWF0ZWQuXG4gKlxuICogb3B0aW9uIHwgZGVmYXVsdCB2YWx1ZSB8IGRlc2NyaXB0aW9uXG4gKiAtLS0tLS0tfC0tLS0tLS0tLS0tLS0tOnwtLS0tLS0tLS0tLS1cbiAqIGBtaW5YYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYG1heFhgICAgICB8ICAxMDAgfCBsYXJnZXN0IFggZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NYYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFggYXhpcyBpbnRvXG4gKiBgbWluWWAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhZYCAgICAgfCAgMTAwIHwgbGFyZ2VzdCBZIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWWAgIHwgICAxMCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBZIGF4aXMgaW50b1xuICogYG1pblpgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBaICh2ZXJ0aWNhbCBkaW1lbnNpb24pIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WmAgICAgIHwgICA0MCB8IGxhcmdlc3QgWiBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1pgICB8ICAgODAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWiBheGlzIGludG9cbiAqIGBibG9ja0dhcGAgfCAwLjA0IHwgZ2FwIHRvIGxlYXZlIGJldHdlZW4gYmxvY2tzIGFsb25nIHRoZSBYIGFuZCBZIGF4ZXNcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVGaWVsZChvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICAgIG1pblg6IDAsICAgICAgICBtYXhYOiAxMDAsICAgICAgICAgIGJsb2Nrc1g6IDEwLFxuICAgICAgICBtaW5ZOiAwLCAgICAgICAgbWF4WTogMTAwLCAgICAgICAgICBibG9ja3NZOiAxMCxcbiAgICAgICAgbWluWjogMCwgICAgICAgIG1heFo6IDQwLCAgICAgICAgICAgYmxvY2tzWjogODAsXG4gICAgICAgIGJsb2NrR2FwOiAwLjA0XG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIG1pbiBhbmQgbWF4IHZhbHVlcyBmb3IgeCB5IGFuZCB6XG4gICAgdGhpcy5taW5YID0gdGhpcy5fb3B0cy5taW5YO1xuICAgIHRoaXMubWluWSA9IHRoaXMuX29wdHMubWluWTtcbiAgICB0aGlzLm1pblogPSB0aGlzLl9vcHRzLm1pblo7XG5cbiAgICB0aGlzLm1heFggPSB0aGlzLl9vcHRzLm1heFg7XG4gICAgdGhpcy5tYXhZID0gdGhpcy5fb3B0cy5tYXhZO1xuICAgIHRoaXMubWF4WiA9IHRoaXMuX29wdHMubWF4WjtcblxuICAgIC8vIGNvbnZlbmllbnQgXCJ3aWR0aHNcIlxuICAgIHRoaXMud1ggPSB0aGlzLm1heFggLSB0aGlzLm1pblg7XG4gICAgdGhpcy53WSA9IHRoaXMubWF4WSAtIHRoaXMubWluWTtcbiAgICB0aGlzLndaID0gdGhpcy5tYXhaIC0gdGhpcy5taW5aO1xuXG4gICAgLy8gaG93IG1hbnkgYmxvY2tzIGFjcm9zcyB4IGFuZCB5P1xuICAgIHRoaXMuYmxvY2tzWCA9IHRoaXMuX29wdHMuYmxvY2tzWDtcbiAgICB0aGlzLmJsb2Nrc1kgPSB0aGlzLl9vcHRzLmJsb2Nrc1k7XG4gICAgdGhpcy5ibG9ja3NaID0gdGhpcy5fb3B0cy5ibG9ja3NaO1xuXG4gICAgLy8gaG93IHdpZGUgaXMgZWFjaCBibG9ja1xuICAgIHRoaXMuX2JYID0gdGhpcy53WCAvIHRoaXMuYmxvY2tzWDtcbiAgICB0aGlzLl9iWSA9IHRoaXMud1kgLyB0aGlzLmJsb2Nrc1k7XG4gICAgdGhpcy5fYlogPSB0aGlzLndaIC8gdGhpcy5ibG9ja3NaO1xuXG4gICAgLy8gaG91c2VrZWVwaW5nXG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cyA9IFtdO1xuICAgIHRoaXMuX2NhbGNDZW50ZXIoKTtcbiAgICB0aGlzLl9tYWtlR3JpZCgpO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVGaWVsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlRmllbGQ7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAgICcoJyArIHRoaXMubWluWCArICctJyArIHRoaXMubWF4WCArXG4gICAgICAgICcsICcgKyB0aGlzLm1pblkgKyAnLScgKyB0aGlzLm1heFkgK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5aICsgJy0nICsgdGhpcy5tYXhaICtcbiAgICAgICAgJyknXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fbWFrZUdyaWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9nID0gW107XG4gICAgZm9yICh2YXIgZ3ggPSAwOyBneCA8IHRoaXMuYmxvY2tzWDsgZ3grKykge1xuICAgICAgICB2YXIgY29sID0gW107XG4gICAgICAgIGZvciAodmFyIGd5ID0gMDsgZ3kgPCB0aGlzLmJsb2Nrc1k7IGd5KyspIHtcbiAgICAgICAgICAgIHZhciB4R2FwID0gdGhpcy5fYlggKiB0aGlzLl9vcHRzLmJsb2NrR2FwIC8gMjtcbiAgICAgICAgICAgIHZhciB5R2FwID0gdGhpcy5fYlkgKiB0aGlzLl9vcHRzLmJsb2NrR2FwIC8gMjtcbiAgICAgICAgICAgIHZhciBibG9jayA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aGlzLm1pblggKyAodGhpcy5fYlggKiBneCkgKyB4R2FwLFxuICAgICAgICAgICAgICAgIGR4OiB0aGlzLl9iWCAtIHhHYXAgLSB4R2FwLFxuICAgICAgICAgICAgICAgIHk6IHRoaXMubWluWSArICh0aGlzLl9iWSAqIGd5KSArIHlHYXAsXG4gICAgICAgICAgICAgICAgZHk6IHRoaXMuX2JZIC0geUdhcCAtIHlHYXAsXG4gICAgICAgICAgICAgICAgZzogW3tcbiAgICAgICAgICAgICAgICAgICAgejogdGhpcy5tYXhaLFxuICAgICAgICAgICAgICAgICAgICBkejogMCwgLy8gMCBtZWFucyBcInN0cmV0Y2ggdG8gbWluWlwiXG4gICAgICAgICAgICAgICAgICAgIG06IFNjYXBlU3R1ZmYuZ2VuZXJpYyxcbiAgICAgICAgICAgICAgICAgICAgY2h1bms6IG51bGxcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICBpOiBbXVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29sLnB1c2goYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2cucHVzaChjb2wpO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBidWlsZHMgYmxvY2sgbWVzaGVzIGZvciBkaXNwbGF5IGluIHRoZSBwcm92aWRlZCBzY2VuZS4gIFRoaXMgaXNcbiAqIGdlbmVyYWxseSBjYWxsZWQgYnkgdGhlIFNjYXBlU2NlbmUgb2JqZWN0IHdoZW4geW91IGdpdmUgaXQgYVxuICogU2NhcGVGaWVsZCwgc28geW91IHdvbid0IG5lZWQgdG8gY2FsbCBpdCB5b3Vyc2VsZi5cbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgdGhlIFNjYXBlU2NlbmUgdGhhdCB3aWxsIGJlIGRpc3BsYXlpbmdcbiAqIHRoaXMgU2NhcGVGaWVsZC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYnVpbGRCbG9ja3MgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgbGF5ZXJJbmRleCA9IDA7IGxheWVySW5kZXggPCBiLmcubGVuZ3RoOyBsYXllckluZGV4KyspIHtcbiAgICAgICAgICAgIGIuZ1tsYXllckluZGV4XS5jaHVuayA9IG5ldyBTY2FwZUNodW5rKFxuICAgICAgICAgICAgICAgIHNjZW5lLCBiLCBsYXllckluZGV4LCBtaW5aXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZG8gdGhpcyB0byBhZGp1c3QgYWxsIHRoZSBjaHVuayBoZWlnaHRzXG4gICAgdGhpcy5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGJ1aWxkcyBpdGVtIG1lc2hlcyBmb3IgZGlzcGxheSBpbiB0aGUgcHJvdmlkZWQgc2NlbmUuICBUaGlzIGlzXG4gKiBnZW5lcmFsbHkgY2FsbGVkIGJ5IHRoZSBTY2FwZVNjZW5lIG9iamVjdCB3aGVuIHlvdSBnaXZlIGl0IGFcbiAqIFNjYXBlRmllbGQsIHNvIHlvdSB3b24ndCBuZWVkIHRvIGNhbGwgaXQgeW91cnNlbGYuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIHRoZSBTY2FwZVNjZW5lIHRoYXQgd2lsbCBiZSBkaXNwbGF5aW5nXG4gKiB0aGlzIFNjYXBlRmllbGQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmJ1aWxkSXRlbXMgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaXRlbUluZGV4ID0gMDsgaXRlbUluZGV4IDwgYi5pLmxlbmd0aDsgaXRlbUluZGV4KyspIHtcbiAgICAgICAgICAgIGIuaVtpdGVtSW5kZXhdLmFkZFRvU2NlbmUoc2NlbmUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBpdGVtcyB0byB0aGUgc2NhcGUgYXQgdmFyaW91cyBwb2ludHMuXG4gKiBVbmxpa2Uge0BsaW5rIFNjYXBlRmllbGQjYWRkSXRlbSBhZGRJdGVtfSwgdGhpcyBtZXRob2Qgd2lsbFxuICogcmUtcG9zaXRpb24gaXRlbXMgYWNyb3NzIHRoZSBGaWVsZCAoc28geW91IGRvbid0IG5lZWQgdG8gY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0l0ZW1zIGNhbGNJdGVtc30geW91cnNlbGYpLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1MaXN0IEEgbGlzdCBvZiBpdGVtcy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYGl0ZW1gIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbXMgPSBmdW5jdGlvbihpdGVtTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2l0ZW1zID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBpdGVtTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgdGhlSXRlbSA9IGl0ZW1MaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEl0ZW0odGhlSXRlbS50eXBlLCB0aGVJdGVtLngsIHRoZUl0ZW0ueSwgdGhlSXRlbSk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtID0gZnVuY3Rpb24oaXRlbVR5cGUsIHgsIHksIG9wdGlvbnMpIHtcblxuICAgIC8vIG1ha2UgdGhlIGl0ZW1cbiAgICB2YXIgaXRlbSA9IG5ldyBTY2FwZUl0ZW0oaXRlbVR5cGUsIHgsIHksIG9wdGlvbnMpO1xuXG4gICAgLy8gYWRkIHRvIHRoZSBwYXJlbnQgYmxvY2tcbiAgICB2YXIgcGFyZW50QmxvY2sgPSB0aGlzLmdldEJsb2NrKHgsIHkpO1xuICAgIHBhcmVudEJsb2NrLmkucHVzaChpdGVtKTtcblxuICAgIC8vIHNldCBpdGVtIGhlaWdodCB0byB0aGUgcGFyZW50IGJsb2NrJ3MgZ3JvdW5kIGhlaWdodFxuICAgIGl0ZW0uc2V0SGVpZ2h0KHBhcmVudEJsb2NrLmdbMF0ueik7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBjbGFpbXMgb2YgdGhlIGdyb3VuZCBoZWlnaHQgYXQgdmFyaW91cyBwb2ludHMuXG4gKiBVbmxpa2Uge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0sIHRoaXNcbiAqIG1ldGhvZCB3aWxsIHJlLWV4dHJhcG9sYXRlIGdyb3VuZCBoZWlnaHRzIGFjcm9zcyB0aGUgRmllbGQgKHNvXG4gKiB5b3UgZG9uJ3QgbmVlZCB0byBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30geW91cnNlbGYpLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGhlaWdodExpc3QgQSBsaXN0IG9mIG9iamVjdHMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGB6YCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZEhlaWdodHMgPSBmdW5jdGlvbihoZWlnaHRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaGVpZ2h0TGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgcHQgPSBoZWlnaHRMaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEdyb3VuZEhlaWdodChwdC54LCBwdC55LCBwdC56KTtcbiAgICB9XG4gICAgdGhpcy5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGNsYWltIHRoYXQgdGhlIGdyb3VuZCBoZWlnaHQgaXMgYHpgIGF0IHBvaW50IGB4YCxgeWAuXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBldmVudHVhbGx5IGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNHcm91bmRIZWlnaHRzIGNhbGNHcm91bmRIZWlnaHRzfSBhZnRlciBzb1xuICogZ3JvdW5kIGhlaWdodHMgZ2V0IGV4dHJhcG9sYXRlZCBhY3Jvc3MgdGhlIGVudGlyZSBGaWVsZC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBYIGNvb3JkaW5hdGUgb2YgdGhpcyBncm91bmQgaGVpZ2h0IHJlY29yZFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHRoZSBoZWlnaHQgb2YgdGhlIGdyb3VuZCBhdCBwb3NpdGlvbiBgeGAsYHlgXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZEhlaWdodCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzLnB1c2goeyB4OiB4LCB5OiB5LCB6OiB6IH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhZGRpdGlvbmFsIGdyb3VuZCBzdGFja3MgdG8gdGhlIGZpZWxkJ3MgZ3JvdW5kIHN0YWNrcy5cbiAqIFRoZSBncm91bmRMaXN0IGlzIGFuIGFycmF5IG9mIGRhdGEgb2JqZWN0cy4gIEVhY2ggb2JqZWN0IG5lZWRzIHgsXG4gKiB5IGFuZCB6IHByb3BlcnRpZXMsIGFuZCBhICdzdGFjaycgcHJvcGVydHksIGVhY2ggbWF0Y2hpbmcgdGhlXG4gKiBjb3JyZXNwb25kaW5nIGFyZyB0byBhZGRHcm91bmRTdGFjay5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVwbGFjZSBpZiByZXBsYWNlIGlzIHRydXRoeSwgZGlzY2FyZCBleGlzdGluZ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VuZCBwb2ludHMgZmlyc3QuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrcyA9IGZ1bmN0aW9uKGdyb3VuZExpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGdyb3VuZExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gZ3JvdW5kTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRTdGFjayhwdC54LCBwdC55LCBwdC5zdGFjayk7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZFN0YWNrcygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGdyb3VuZCBzdGFjayBhdCB4LHksIHN0YXJ0aW5nIGF0IGhlaWdodCB6LlxuICogVGhlIHN0YWNrIGlzIGFuIGFycmF5IG9mIHR3by1lbGVtZW50IGFycmF5cyB3aXRoIGEgTWF0ZXJpYWxcbiAqIGFuZCBhIGRlcHRoIG51bWJlciwgbGlrZSB0aGlzOlxuICogW1xuICogICAgIFtNYXRlcmlhbC5sZWFmTGl0dGVyLCAwLjNdLFxuICogICAgIFtNYXRlcmlhbC5kaXJ0LCAzLjVdLFxuICogICAgIFtNYXRlcmlhbC5zdG9uZSwgNF1cbiAqIF1cbiAqIFRoYXQgcHV0cyBhIGxlYWZsaXR0ZXIgbGF5ZXIgMC4zIHVuaXRzIGRlZXAgb24gYSAzLjUtdW5pdFxuICogZGVlcCBkaXJ0IGxheWVyLCB3aGljaCBpcyBvbiBhIHN0b25lIGxheWVyLiAgSWYgdGhlIGZpbmFsXG4gKiBsYXllcidzIGRlcHRoIGlzIHplcm8sIHRoYXQgbGF5ZXIgaXMgYXNzdW1lZCB0byBnbyBhbGwgdGhlXG4gKiB3YXkgdG8gbWluWi5cbiAqIElmIHlvdSBjYWxsIHRoaXMsIHJlbWVtYmVyIHRvIGNhbGNHcm91bmQoKSBhZnRlci5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kU3RhY2sgPSBmdW5jdGlvbih4LCB5LCBzdGFjaykge1xuICAgIC8vIFRPRE86IGNoZWNrIGZvciB2YWxpZGl0eVxuICAgIHRoaXMuX2dyb3VuZFN0YWNrcy5wdXNoKHsgeDogeCwgIHk6IHksICBzdGFjazogc3RhY2sgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIGhlaWdodC4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgaGVpZ2h0IGNsYWltcyBvbmUgYXQgYSB0aW1lIHVzaW5nXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRIZWlnaHQgYWRkR3JvdW5kSGVpZ2h0fS5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY2FsY0dyb3VuZEhlaWdodHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIGZpbmQgaGVpZ2h0IGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBhbGxvd2luZyBlYWNoXG4gICAgICAgIC8vIGtub3duIGdyb3VuZCBoZWlnaHQgdG8gXCJ2b3RlXCIgdXNpbmcgdGhlIGludmVyc2Ugb2ZcbiAgICAgICAgLy8gaXQncyBzcXVhcmVkIGRpc3RhbmNlIGZyb20gdGhlIGNlbnRyZSBvZiB0aGUgYmxvY2suXG4gICAgICAgIHZhciBoLCBkeCwgZHksIGRpc3QsIHZvdGVTaXplO1xuICAgICAgICB2YXIgYlogPSAwO1xuICAgICAgICB2YXIgdm90ZXMgPSAwO1xuICAgICAgICBmb3IgKHZhciBnaD0wOyBnaCA8IHRoaXMuX2dyb3VuZEhlaWdodHMubGVuZ3RoOyBnaCsrKSB7XG4gICAgICAgICAgICBoID0gdGhpcy5fZ3JvdW5kSGVpZ2h0c1tnaF07XG4gICAgICAgICAgICBkeCA9IGJsb2NrLnggKyAoMC41ICogdGhpcy5fYlgpIC0gaC54O1xuICAgICAgICAgICAgZHkgPSBibG9jay55ICsgKDAuNSAqIHRoaXMuX2JZKSAtIGgueTtcbiAgICAgICAgICAgIGRpc3QgPSAxICsgZHgqZHggKyBkeSpkeTtcbiAgICAgICAgICAgIHZvdGVTaXplID0gMSAvIGRpc3Q7XG4gICAgICAgICAgICBiWiArPSBoLnogKiB2b3RlU2l6ZTtcbiAgICAgICAgICAgIHZvdGVzICs9IHZvdGVTaXplO1xuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBkaXZpZGUgdG8gZmluZCB0aGUgYXZlcmFnZVxuICAgICAgICBiWiA9IGJaIC8gdm90ZXM7XG5cbiAgICAgICAgLy8gYmxvY2staXNoIGhlaWdodHM6IHJvdW5kIHRvIHRoZSBuZWFyZXN0IF9iWlxuICAgICAgICB2YXIgZGlmZlogPSBiWiAtIHRoaXMubWluWjtcbiAgICAgICAgYlogPSB0aGlzLm1pblogKyBNYXRoLnJvdW5kKGRpZmZaIC8gdGhpcy5fYlopICogdGhpcy5fYlo7XG5cbiAgICAgICAgLy8gb2theSBub3cgd2Uga25vdyBhIGhlaWdodCEgIHNldCBpdFxuICAgICAgICB0aGlzLnNldEJsb2NrSGVpZ2h0KGJsb2NrLCBiWik7XG5cbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiAocmUpY2FsY3VsYXRlIHRoZSBncm91bmQgc3RhY2tzLiAgWW91IG5lZWQgdG8gY2FsbCB0aGlzIGlmIHlvdVxuICogYWRkIGdyb3VuZCBzdGFja3Mgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kU3RhY2sgYWRkR3JvdW5kU3RhY2t9LlxuICpcbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY2FsY0dyb3VuZFN0YWNrcyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gbWFrZSB0aGUgc3RhY2sgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGNvcHlpbmcgdGhlXG4gICAgICAgIC8vIG5lYXJlc3QgZGVmaW5lZCBzdGFjay5cbiAgICAgICAgdmFyIHMsIGR4LCBkeSwgdGhpc0Rpc3QsIGJlc3RTdGFjaztcbiAgICAgICAgdmFyIGJlc3REaXN0ID0gdGhpcy53WCArIHRoaXMud1kgKyB0aGlzLndaO1xuICAgICAgICBiZXN0RGlzdCA9IGJlc3REaXN0ICogYmVzdERpc3Q7XG4gICAgICAgIGZvciAodmFyIGdzPTA7IGdzIDwgdGhpcy5fZ3JvdW5kU3RhY2tzLmxlbmd0aDsgZ3MrKykge1xuICAgICAgICAgICAgcyA9IHRoaXMuX2dyb3VuZFN0YWNrc1tnc107XG4gICAgICAgICAgICBkeCA9IGJsb2NrLnggKyAoMC41ICogdGhpcy5fYlgpIC0gcy54O1xuICAgICAgICAgICAgZHkgPSBibG9jay55ICsgKDAuNSAqIHRoaXMuX2JZKSAtIHMueTtcbiAgICAgICAgICAgIHRoaXNEaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICBpZiAodGhpc0Rpc3QgPCBiZXN0RGlzdCkge1xuICAgICAgICAgICAgICAgIGJlc3RTdGFjayA9IHM7XG4gICAgICAgICAgICAgICAgYmVzdERpc3QgPSB0aGlzRGlzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG9rYXkgd2UgZ290IGEgc3RhY2suXG4gICAgICAgIHRoaXMuc2V0R3JvdW5kU3RhY2soYmxvY2ssIGJlc3RTdGFjay5zdGFjayk7XG5cbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuX2NhbGNDZW50ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBjYWxjdWxhdGUgdGhlIGNlbnRyZSBvZiB0aGUgZmllbGQgYW5kIHJlY29yZCBpdCBhcyAuY2VudGVyXG4gICAgdGhpcy5jZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgKHRoaXMubWluWCArIHRoaXMubWF4WCkgLyAyLFxuICAgICAgICAodGhpcy5taW5ZICsgdGhpcy5tYXhZKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblogKyB0aGlzLm1heFopIC8gMlxuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnNldEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oYmxvY2ssIHN0YWNrKSB7XG4gICAgdmFyIGxheWVyTGV2ZWwgPSBibG9jay5nWzBdLno7XG4gICAgZm9yICh2YXIgbGF5ZXIgPSAwOyBsYXllciA8IHN0YWNrLmxlbmd0aDsgbGF5ZXIrKykge1xuICAgICAgICBibG9jay5nW2xheWVyXSA9IHtcbiAgICAgICAgICAgIHo6IGxheWVyTGV2ZWwsXG4gICAgICAgICAgICBkejogc3RhY2tbbGF5ZXJdWzFdLFxuICAgICAgICAgICAgbTogc3RhY2tbbGF5ZXJdWzBdLFxuICAgICAgICAgICAgY2h1bms6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgbGF5ZXJMZXZlbCAtPSBzdGFja1tsYXllcl1bMV07XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnJlYnVpbGRDaHVua3MgPSBmdW5jdGlvbihibG9jaykge1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBpZiAoYmxvY2suZ1tsXS5jaHVuaykge1xuICAgICAgICAgICAgYmxvY2suZ1tsXS5jaHVuay5yZWJ1aWxkKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnNldEJsb2NrSGVpZ2h0ID0gZnVuY3Rpb24oYmxvY2ssIHopIHtcbiAgICAvLyB0byBzZXQgdGhlIGJsb2NrIGdyb3VuZCBoZWlnaHQsIHdlIG5lZWQgdG8gZmluZCB0aGUgYmxvY2snc1xuICAgIC8vIGN1cnJlbnQgZ3JvdW5kIGhlaWdodCAodGhlIHogb2YgdGhlIHRvcCBsYXllciksIHdvcmsgb3V0IGFcbiAgICAvLyBkaWZmIGJldHdlZW4gdGhhdCBhbmQgdGhlIG5ldyBoZWlnaHQsIGFuZCBhZGQgdGhhdCBkaWZmIHRvXG4gICAgLy8gYWxsIHRoZSBsYXllcnMuXG4gICAgdmFyIGRaID0geiAtIGJsb2NrLmdbMF0uejtcbiAgICB2YXIgZGVwdGg7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGJsb2NrLmdbbF0ueiArPSBkWjtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZ2V0QmxvY2sgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgLy8gcmV0dXJuIHRoZSBibG9jayB0aGF0IGluY2x1ZGVzICB4LHlcbiAgICB2YXIgZ3ggPSBNYXRoLmZsb29yKCAoeCAtIHRoaXMubWluWCkgLyB0aGlzLl9iWCApO1xuICAgIHZhciBneSA9IE1hdGguZmxvb3IoICh5IC0gdGhpcy5taW5ZKSAvIHRoaXMuX2JZICk7XG4gICAgcmV0dXJuICh0aGlzLl9nW2d4XVtneV0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbnZva2UgdGhlIGNhbGxiYWNrIGVhY2ggYmxvY2sgaW4gdHVyblxuLy8gY2FsbGJhY2sgc2hvdWxkIGxvb2sgbGlrZTogZnVuY3Rpb24oZXJyLCBibG9jaykgeyAuLi4gfVxuLy8gaWYgZXJyIGlzIG51bGwgZXZlcnl0aGluZyBpcyBmaW5lLiBpZiBlcnIgaXMgbm90IG51bGwsIHRoZXJlXG4vLyB3YXMgYW4gZXJyb3IuXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5lYWNoQmxvY2sgPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZywgb3JkZXIpIHtcbiAgICBpZiAob3JkZXIgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9yZGVyID0gJ3h1cC15dXAnO1xuICAgIH1cbiAgICBpZiAodGhpc0FyZyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpc0FyZyA9IHRoaXM7XG4gICAgfVxuICAgIGlmIChvcmRlciA9PSAneHVwLXl1cCcpIHtcbiAgICAgICAgZm9yICh2YXIgZ3ggPSAwOyBneCA8IHRoaXMuX2cubGVuZ3RoOyBneCsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5fZ1swXS5sZW5ndGg7IGd5KyspIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIG51bGwsIHRoaXMuX2dbZ3hdW2d5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUZpZWxkO1xuXG5cblxuXG4iLCJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGl0ZW0gdGhhdCBtaWdodCBhcHBlYXIgaW4gYSBTY2FwZS5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBtZXNoIGJhc2VkIG9uIHRoZSBsaW5rZWRcbiAqIGl0ZW0gaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGl0ZW0gd2lsbCBiZSBhZGRlZCBpbnRvXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyZW50QmxvY2sgVGhlIGJsb2NrIHRoYXQgb3ducyB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7U2NhcGVJdGVtVHlwZX0gaXRlbVR5cGUgVHlwZSBvZiB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucywgbm90IGN1cnJlbnRseSB1c2VkXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlSXRlbShpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fdHlwZSA9IGl0ZW1UeXBlO1xuICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5fcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgMCk7XG5cbiAgICAvLyBUT0RPOiBtYXliZSBoYXZlIGEgc2V0IG9mIG1lc2hlcyBmb3IgZWFjaCBzY2VuZSwgc28gYW4gaXRlbVxuICAgIC8vIGNhbiBiZSBpbiBtdWx0aXBsZSBzY2VuZXM/XG4gICAgdGhpcy5fY3JlYXRlTmV3TWVzaGVzKCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUl0ZW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVJdGVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlSXRlbTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fY3JlYXRlTmV3TWVzaGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbWVzaGVzID0gdGhpcy5fdHlwZSh0aGlzLl9vcHRzKTtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgbS5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24oeikge1xuICAgIHRoaXMuX3Bvcy5zZXRaKHopO1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBtLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5hZGRUb1NjZW5lID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgc2NlbmUuYWRkKG0pO1xuICAgIH0pO1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUucmVtb3ZlRnJvbVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIHRoaXMuX3NjZW5lLnJlbW92ZShtKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX3VwZGF0ZU1lc2hlcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zY2VuZSkgeyB0aGlzLnJlbW92ZUZyb21TY2VuZSh0aGlzLl9zY2VuZSk7IH1cbiAgICB0aGlzLl9tZXNoZXMgPSB0aGlzLl9jcmVhdGVOZXdNZXNoZXMoKTtcbiAgICBpZiAodGhpcy5fc2NlbmUpIHsgdGhpcy5hZGRUb1NjZW5lKHRoaXMuX3NjZW5lKTsgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBkbyBzb21ldGhpbmcgdG8gZWFjaCBtZXNoXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmVhY2hNZXNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICB0aGlzQXJnID0gdGhpc0FyZyB8fCB0aGlzO1xuICAgIGZvciAodmFyIG0gPSAwOyBtIDwgdGhpcy5fbWVzaGVzLmxlbmd0aDsgbSsrKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5fbWVzaGVzW21dKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVJdGVtO1xuIiwiXG4vKipcbiAqIEEgYmFnIG9mIGl0ZW0gdHlwZXMgLS0gaS5lLiBUSFJFRS5HZW9tZXRyeXMgLS0gdGhhdCBzY2FwZXMgY2FuIGhhdmUgaW4gdGhlbS5cbiAqXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZUl0ZW1zID0ge1xuICAgIC8vIGRvY3VtZW50YXRpb24gZm9yIGl0ZW1zIGFyZSBpbiB0aGUgLi9pdGVtdHlwZXMvKiBmaWxlc1xuICAgIGN1YmU6IHJlcXVpcmUoJy4vaXRlbXR5cGVzL2N1YmUnKSxcbiAgICB0cmVlOiByZXF1aXJlKCcuL2l0ZW10eXBlcy90cmVlJylcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVJdGVtcztcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIGN1YmUgbWVzaCBvZiB0aGUgc3BlY2lmaWVkIHNpemUgYW5kIG1hdGVyaWFsLlxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgVGhlIGxlbmd0aCBvZiBhIHNpZGUgb2YgdGhlIGN1YmUuICBEZWZhdWx0cyB0byAxLlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gbWF0ZXJpYWwgV2hhdCB0aGUgbWFrZSB0aGUgY3ViZSBvdXQgb2YuICBEZWZhdWx0cyB0byBgU2NhcGUuU3R1ZmYuZ2VuZXJpY2BcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE5vdCB1c2VkLlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5jdWJlXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3ViZUZhY3Rvcnkoc2l6ZSwgbWF0ZXJpYWwsIG9wdGlvbnMpIHtcbiAgICAvLyBjb25zdHJ1Y3QgYSBtZXNoIFwic2l0dGluZyBvblwiIHRoZSBwb2ludCAwLDAsMFxuXG4gICAgc2l6ZSA9IHNpemUgfHwgMTtcbiAgICBtYXRlcmlhbCA9IG1hdGVyaWFsIHx8IFNjYXBlU3R1ZmYuZ2VuZXJpYztcblxuICAgIC8vIG1ha2VzIGEgY3ViZSBjZW50ZXJlZCBvbiAwLDAsMFxuICAgIHZhciBnZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHNpemUsIHNpemUsIHNpemUpO1xuXG4gICAgLy8gdHJhbnNmb3JtIGl0IHVwIGEgYml0LCBzbyB3ZSdyZSBjZW50ZXJlZCBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDAuXG4gICAgZ2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgc2l6ZS8yKSApO1xuXG4gICAgLy8gcmV0dXJuIGEgdGhpbmcgd2l0aCB0aGF0IGdlb21ldHJ5LCBtYWRlIG9mIHRoZSBtYXRlcmlhbFxuICAgIHJldHVybiBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXRlcmlhbCk7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3ViZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSB0cmVlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBjb2xvci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuZGlhbWV0ZXI9MSBEaWFtZXRlciBvZiB0cnVuayAoYS5rLmEuIERCSClcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmhlaWdodD0xMCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy50cnVua01hdGVyaWFsPVNjYXBlU3R1ZmYud29vZCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5sZWFmTWF0ZXJpYWw9U2NhcGVTdHVmZi5mb2xpYWdlIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMudHJlZVxuICovXG5mdW5jdGlvbiBTY2FwZVRyZWVGYWN0b3J5KG9wdGlvbnMpIHtcblxuXHR2YXIgZGlhbSA9IG9wdGlvbnMuZGlhbWV0ZXIgfHwgMTtcblx0dmFyIGhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDEwO1xuXHR2YXIgdHJ1bmtTdHVmZiA9IG9wdGlvbnMudHJ1bmsgfHwgU2NhcGVTdHVmZi53b29kO1xuXHR2YXIgY2Fub3B5U3R1ZmYgPSBvcHRpb25zLmNhbm9weSB8fCBTY2FwZVN0dWZmLmZvbGlhZ2U7XG5cblx0dmFyIGNhbm9weUhlaWdodCA9IGhlaWdodCAvIDQ7XG5cdHZhciB0cmVlSGVpZ2h0ID0gaGVpZ2h0IC0gY2Fub3B5SGVpZ2h0O1xuXHR2YXIgdHJlZVJhZGl1cyA9IDIgKiBkaWFtIC8gMjtcblx0dmFyIGNhbm9weVJhZGl1cyA9IHRyZWVSYWRpdXMgKiA2O1xuXG5cdHZhciB0cnVua0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeSh0cmVlUmFkaXVzLzIsIHRyZWVSYWRpdXMsIHRyZWVIZWlnaHQsIDEyKTtcblx0dmFyIGNhbm9weUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShjYW5vcHlSYWRpdXMsIGNhbm9weVJhZGl1cywgY2Fub3B5SGVpZ2h0LCAxMik7XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIGNlbnRlciBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDBcblx0dmFyIHRydW5rUG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCB0cmVlSGVpZ2h0LzIpO1xuXG5cdC8vIGNlbnRlciBvbiB4ID0gMCwgeSA9IDAsIGJ1dCBoYXZlIHRoZSBjYW5vcHkgYXQgdGhlIHRvcFxuXHR2YXIgY2Fub3B5UG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBjYW5vcHlIZWlnaHQvMiArIGhlaWdodCAtIGNhbm9weUhlaWdodCk7XG5cblx0dHJ1bmtHZW9tLmFwcGx5TWF0cml4KHRydW5rUG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cdGNhbm9weUdlb20uYXBwbHlNYXRyaXgoY2Fub3B5UG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cblx0dmFyIHRydW5rID0gbmV3IFRIUkVFLk1lc2godHJ1bmtHZW9tLCB0cnVua1N0dWZmKTtcblx0Ly8gdmFyIGNhbm9weSA9IG5ldyBUSFJFRS5Qb2ludENsb3VkKGNhbm9weUdlb20sIGNhbm9weVN0dWZmKTtcblx0dmFyIGNhbm9weSA9IG5ldyBUSFJFRS5NZXNoKGNhbm9weUdlb20sIGNhbm9weVN0dWZmKTtcblx0cmV0dXJuIFt0cnVuaywgY2Fub3B5XTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVUcmVlRmFjdG9yeTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5TY2FwZUNodW5rID0gcmVxdWlyZSgnLi9jaHVuaycpO1xuXG5cbi8vIERFQlVHXG5TY2FwZVN0dWZmID0gcmVxdWlyZSgnLi9zdHVmZicpO1xuU2NhcGVJdGVtcyA9IHJlcXVpcmUoJy4vaXRlbXR5cGVzJyk7XG5TY2FwZUl0ZW0gPSByZXF1aXJlKCcuL2l0ZW0nKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBjYWxsYmFjayBTY2FwZVNjZW5lfmRhdGVDaGFuZ2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBlcnJvciBEZXNjcmlwdGlvbiBvZiBlcnJvciwgb3RoZXJ3aXNlIG51bGxcbiAqIEBwYXJhbSB7ZGF0ZX0gZGF0ZSBEYXRlIHRoZSBzY2FwZSBpcyBub3cgZGlzcGxheWluZ1xuICovXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgb2YgYSBsYW5kc2NhcGUgLyBtb29uc2NhcGUgLyB3aGF0ZXZlclxuICogQHBhcmFtIHtTY2FwZUZpZWxkfSBmaWVsZCAgdGhlIGZpZWxkIGJlaW5nIHJlbmRlcmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gZG9tICAgICAgICBET00gZWxlbWVudCB0aGUgc2NhcGUgc2hvdWxkIGJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlZCBpbnRvLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgICAgY29sbGVjdGlvbiBvZiBvcHRpb25zLiAgQWxsIGFyZSBvcHRpb25hbC5cbiAqIEBwYXJhbSB7U3RyaW5nW119IG9wdGlvbnMubGlnaHRzPSdzdW4nLCdza3knIC0gYXJyYXkgb2Ygc3RyaW5nc1xuICogbmFtaW5nIGxpZ2h0cyB0byBpbmNsdWRlIGluIHRoaXMgc2NlbmUuICBDaG9vc2UgZnJvbTpcbiAqXG4gKiBzdHJpbmcgICAgfCBsaWdodCB0eXBlXG4gKiAtLS0tLS0tLS0tfC0tLS0tLS0tLS0tXG4gKiBgdG9wbGVmdGAgfCBhIGxpZ2h0IGZyb20gYWJvdmUgdGhlIGNhbWVyYSdzIGxlZnQgc2hvdWxkZXJcbiAqIGBhbWJpZW50YCB8IGEgZGltIGFtYmllbnQgbGlnaHRcbiAqIGBzdW5gICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBvcmJpdHMgdGhlIHNjZW5lIG9uY2UgcGVyIGRheVxuICogYHNreWAgICAgIHwgYSBkaXJlY3Rpb25hbCBsaWdodCB0aGF0IHNoaW5lcyBmcm9tIGFib3ZlIHRoZSBzY2VuZVxuICogQHBhcmFtIHtEYXRlfFwibm93XCJ9IG9wdGlvbnMuY3VycmVudERhdGU9J25vdycgLSBUaGUgdGltZSBhbmQgZGF0ZVxuICogaW5zaWRlIHRoZSBzY2FwZS4gIFRoZSBzdHJpbmcgXCJub3dcIiBtZWFucyBzZXQgY3VycmVudERhdGUgdG8gdGhlXG4gKiBwcmVzZW50LlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMudGltZVJhdGlvPTEgVGhlIHJhdGUgdGltZSBzaG91bGQgcGFzcyBpblxuICogdGhlIHNjYXBlLCByZWxhdGl2ZSB0byBub3JtYWwuICAwLjEgbWVhbnMgdGVuIHRpbWVzIHNsb3dlci4gIDYwXG4gKiBtZWFucyBvbmUgbWludXRlIHJlYWwgdGltZSA9IG9uZSBob3VyIHNjYXBlIHRpbWUuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV+ZGF0ZUNoYW5nZX0gb3B0aW9ucy5kYXRlVXBkYXRlIGNhbGxiYWNrIGZvclxuICogd2hlbiB0aGUgc2NlbmUgdGltZSBjaGFuZ2VzICh3aGljaCBpcyBhIGxvdCkuXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlU2NlbmUoZmllbGQsIGRvbSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICAvLyBsaWdodHM6IFsndG9wbGVmdCcsICdhbWJpZW50J10sXG4gICAgICAgIGxpZ2h0czogWydzdW4nLCAnc2t5J10sXG4gICAgICAgIGN1cnJlbnREYXRlOiAnbm93JywgIC8vIGVpdGhlciBzdHJpbmcgJ25vdycgb3IgYSBEYXRlIG9iamVjdFxuICAgICAgICB0aW1lUmF0aW86IDEsXG4gICAgICAgIGRhdGVVcGRhdGU6IG51bGwgLy8gY2FsbGJhY2sgdG91cGRhdGUgdGhlIGRpc3BsYXllZCBkYXRlL3RpbWVcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gc2F2ZSB0aGUgZmllbGRcbiAgICB0aGlzLmYgPSBmaWVsZDtcblxuICAgIC8vIGRpc2NvdmVyIERPTSBjb250YWluZXJcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkb20pO1xuXG4gICAgdGhpcy5kYXRlID0gdGhpcy5fb3B0cy5jdXJyZW50RGF0ZTtcbiAgICBpZiAodGhpcy5kYXRlID09PSAnbm93Jykge1xuICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLnN0YXJ0RGF0ZSA9IHRoaXMuZGF0ZTtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAvLyBjcmVhdGUgYW5kIHNhdmUgYWxsIHRoZSBiaXRzIHdlIG5lZWRcbiAgICB0aGlzLnJlbmRlcmVyID0gdGhpcy5fbWFrZVJlbmRlcmVyKHsgZG9tOiB0aGlzLmVsZW1lbnQgfSk7XG4gICAgdGhpcy5zY2VuZSA9IHRoaXMuX21ha2VTY2VuZSgpO1xuICAgIHRoaXMuY2FtZXJhID0gdGhpcy5fbWFrZUNhbWVyYSgpO1xuICAgIHRoaXMuY29udHJvbHMgPSB0aGlzLl9tYWtlQ29udHJvbHMoKTtcbiAgICB0aGlzLmxpZ2h0cyA9IHRoaXMuX21ha2VMaWdodHModGhpcy5fb3B0cy5saWdodHMpO1xuXG4gICAgdGhpcy5jb25uZWN0RmllbGQoKTtcblxuICAgIC8vIGFkZCBncmlkcyBhbmQgaGVscGVyIGN1YmVzXG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCk7XG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCd0b3AnKTtcbiAgICAvLyB0aGlzLmFkZEhlbHBlclNoYXBlcygpO1xuXG4gICAgdmFyIGxhc3RMb2dBdCA9IDA7IC8vIERFQlVHXG4gICAgdmFyIHJlbmRlciA9IChmdW5jdGlvbiB1bmJvdW5kUmVuZGVyKHRzKSB7XG5cbiAgICAgICAgLy8gREVCVUdcbiAgICAgICAgaWYgKGxhc3RMb2dBdCArIDIwMDAgPCB0cykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3JlbmRlcmluZy4uLicpO1xuICAgICAgICAgICAgbGFzdExvZ0F0ID0gdHM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBERUJVRyBkaXNhYmxlZCB0aW1lIHVwZGF0ZXMuLlxuICAgICAgICB0aGlzLl91cGRhdGVUaW1lKCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCByZW5kZXIgKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIoIHRoaXMuc2NlbmUsIHRoaXMuY2FtZXJhICk7XG4gICAgICAgIHRoaXMuY29udHJvbHMudXBkYXRlKCk7XG4gICAgfSkuYmluZCh0aGlzKTtcblxuICAgIHJlbmRlcigwKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlU2NlbmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZVNjZW5lO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBhIG1lc2ggdG8gdGhlIFRIUkVFLlNjZW5lIChhIHBhc3N0aHJvdWdoIGZvciBUSFJFRS5TY2VuZS5hZGQpXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHRoaW5nKSB7XG4gICAgdGhpcy5zY2VuZS5hZGQodGhpbmcpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHJlbW92ZSBhIG1lc2ggdG8gdGhlIFRIUkVFLlNjZW5lIChhIHBhc3N0aHJvdWdoIGZvciBUSFJFRS5TY2VuZS5yZW1vdmUpXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHRoaW5nKSB7XG4gICAgdGhpcy5zY2VuZS5yZW1vdmUodGhpbmcpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBibG9ja3MgZnJvbSB0aGUgYXR0YWNoZWQgU2NhcGVGaWVsZCBpbnRvIHRoZSBzY2VuZS5cbiAqXG4gKiBZb3Ugd2lsbCBwcm9iYWJseSBvbmx5IG5lZWQgdG8gY2FsbCB0aGlzIG9uY2UuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbm5lY3RGaWVsZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZi5idWlsZEJsb2Nrcyh0aGlzKTtcbiAgICB0aGlzLmYuYnVpbGRJdGVtcyh0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgaGVscGVyIGN1YmVzIGF0IHNvbWUgb2YgdGhlIGNvcm5lcnMgb2YgeW91ciBzY2FwZSwgc28geW91IGNhblxuICogc2VlIHdoZXJlIHRoZXkgYXJlIGluIHNwYWNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJTaGFwZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgd2hpdGUgPSAweGZmZmZmZjtcbiAgICB2YXIgcmVkICAgPSAweGZmMDAwMDtcbiAgICB2YXIgZ3JlZW4gPSAweDAwZmYwMDtcbiAgICB2YXIgYmx1ZSAgPSAweDAwMDBmZjtcbiAgICB2YXIgZiA9IHRoaXMuZjtcblxuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWluWSwgZi5taW5aLCB3aGl0ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWF4WCwgZi5taW5ZLCBmLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKChmLm1pblggKyBmLm1heFgpIC8gMiwgZi5taW5ZLCBmLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5tYXhZLCBmLm1pblosIGdyZWVuKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWF4WiwgYmx1ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWF4WCwgZi5tYXhZLCBmLm1pblosIHdoaXRlKTtcblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBhIGN1YmUgYXQgcG9zaXRpb24gYHhgLCBgeWAsIGB6YCB0byBjb25maXJtIHdoZXJlIHRoYXQgaXMsXG4gKiBleGFjdGx5LiAgR3JlYXQgZm9yIHRyeWluZyB0byB3b3JrIG91dCBpZiB5b3VyIHNjYXBlIGlzIGJlaW5nXG4gKiByZW5kZXJlZCB3aGVyZSB5b3UgdGhpbmsgaXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICpcbiAqIEBwYXJhbSB7KE51bWJlcnxWZWN0b3IzKX0geCBYIGNvb3JkaW5hdGUsIG9yIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9WZWN0b3IzIFRIUkVFLlZlY3RvcjN9IGNvbnRhaW5pbmcgeCwgeSBhbmQgeiBjb29yZHNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbeV0gWSBjb29yZGluYXRlXG4gKiBAcGFyYW0ge051bWJlcn0gW3pdIFogY29vcmRpbmF0ZVxuICogQHBhcmFtIHtDb2xvcnxTdHJpbmd8SW50ZWdlcn0gY29sb3I9JyNjY2NjY2MnIENvbG9yIG9mIGN1YmUuXG4gKiBDYW4gYmUgYSB7QGxpbmsgaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9NYXRoL0NvbG9yIFRIUkVFLkNvbG9yfSwgYSBjb2xvci1wYXJzZWFibGUgc3RyaW5nIGxpa2VcbiAqIGAnIzMzNjZjYydgLCBvciBhIG51bWJlciBsaWtlIGAweDMzNjZjY2AuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckN1YmUgPSBmdW5jdGlvbih4LCB5LCB6LCBjb2xvcikge1xuICAgIC8vIGZpcnN0LCBzZXQgdGhlIGNvbG9yIHRvIHNvbWV0aGluZ1xuICAgIGlmICh0eXBlb2YgY29sb3IgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gZGVmYXVsdCB0byBsaWdodCBncmV5LlxuICAgICAgICBjb2xvciA9IG5ldyBUSFJFRS5Db2xvcigweGNjY2NjYyk7XG4gICAgfVxuICAgIHZhciBwb3M7IC8vIHRoZSBwb3NpdGlvbiB0byBkcmF3IHRoZSBjdWJlXG4gICAgaWYgKHR5cGVvZiB4LnggIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gdGhlbiBpdCdzIGEgdmVjdG9yLCBhbmQgeSBtaWdodCBiZSB0aGUgY29sb3JcbiAgICAgICAgcG9zID0geDtcbiAgICAgICAgaWYgKHR5cGVvZiB5ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb2xvciA9IHk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB4IGlzbid0IGEgdmVjdG9yLCBzbyBhc3N1bWUgc2VwYXJhdGUgeCB5IGFuZCB6XG4gICAgICAgIHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIHopO1xuICAgICAgICAvLyB3ZSBjYXVnaHQgY29sb3IgYWxyZWFkeS5cbiAgICB9XG5cbiAgICAvLyBhYm91dCBhIGZpZnRpZXRoIG9mIHRoZSBmaWVsZCdzIHN1bW1lZCBkaW1lbnNpb25zXG4gICAgdmFyIHNpemUgPSAodGhpcy5mLndYICsgdGhpcy5mLndZICsgdGhpcy5mLndaKSAvIDUwO1xuICAgIC8vIHVzZSB0aGUgY29sb3VyIHdlIGRlY2lkZWQgZWFybGllclxuICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHsgY29sb3I6IGNvbG9yIH0pO1xuXG4gICAgLy8gb2theS4uIG1ha2UgaXQsIHBvc2l0aW9uIGl0LCBhbmQgc2hvdyBpdFxuICAgIHZhciBjdWJlID0gU2NhcGVJdGVtcy5jdWJlKHNpemUsIG1hdGVyaWFsKTtcbiAgICBjdWJlLnBvc2l0aW9uLmNvcHkocG9zKTtcbiAgICB0aGlzLnNjZW5lLmFkZChjdWJlKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyR3JpZCA9IGZ1bmN0aW9uKHRvcE9yQm90dG9tKSB7XG4gICAgdmFyIGd6ID0gMDtcbiAgICB2YXIgZ2MgPSAweDQ0NDQ0NDtcbiAgICBpZiAodG9wT3JCb3R0b20gPT0gJ3RvcCcpIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWF4WjtcbiAgICAgICAgZ2MgPSAweGNjY2NmZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBneiA9IHRoaXMuZi5taW5aO1xuICAgICAgICBnYyA9IDB4Y2NmZmNjO1xuICAgIH1cblxuICAgIHZhciBncmlkVyA9IE1hdGgubWF4KHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsIHRoaXMuZi5tYXhZIC0gdGhpcy5mLm1pblkpO1xuXG4gICAgLy8gR3JpZCBcInNpemVcIiBpcyB0aGUgZGlzdGFuY2UgaW4gZWFjaCBvZiB0aGUgZm91ciBkaXJlY3Rpb25zLFxuICAgIC8vIHRoZSBncmlkIHNob3VsZCBzcGFuLiAgU28gZm9yIGEgZ3JpZCBXIHVuaXRzIGFjcm9zcywgc3BlY2lmeVxuICAgIC8vIHRoZSBzaXplIGFzIFcvMi5cbiAgICB2YXIgZ3JpZFhZID0gbmV3IFRIUkVFLkdyaWRIZWxwZXIoZ3JpZFcvMiwgZ3JpZFcvMTApO1xuICAgIGdyaWRYWS5zZXRDb2xvcnMoZ2MsIGdjKTtcbiAgICBncmlkWFkucm90YXRpb24ueCA9IE1hdGguUEkvMjtcbiAgICBncmlkWFkucG9zaXRpb24uc2V0KHRoaXMuZi5taW5YICsgZ3JpZFcvMiwgdGhpcy5mLm1pblkgKyBncmlkVy8yLCBneik7XG4gICAgdGhpcy5zY2VuZS5hZGQoZ3JpZFhZKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBDcmVhdGUgYW5kIHJldHVybiBhIFRIUkVFLlJlbmRlcmVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB2YXJpb3VzIG9wdGlvbnNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudHxqUXVlcnlFbGVtfSBvcHRpb25zLmRvbSBhIGRvbSBlbGVtZW50XG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMud2lkdGggcmVuZGVyZXIgd2lkdGggKGluIHBpeGVscylcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5oZWlnaHQgcmVuZGVyZXIgaGVpZ2h0IChpbiBwaXhlbHMpXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VSZW5kZXJlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGFudGlhbGlhczogdHJ1ZSwgYWxwaGE6IHRydWUgfSk7XG4gICAgcmVuZGVyZXIuc2V0Q2xlYXJDb2xvciggMHgwMDAwMDAsIDApO1xuICAgIHJlbmRlcmVyLnNoYWRvd01hcEVuYWJsZWQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZG9tKSB7XG4gICAgICAgIHZhciAkZG9tID0gJChvcHRpb25zLmRvbSk7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUoJGRvbS53aWR0aCgpLCAkZG9tLmhlaWdodCgpKTtcbiAgICAgICAgJGRvbS5hcHBlbmQocmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMud2lkdGggJiYgb3B0aW9ucy5oZWlnaHQpIHtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZShvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCk7XG4gICAgfVxuICAgIHJldHVybiByZW5kZXJlcjtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB1cGRhdGVzIHRoZSBzY2FwZSB0aW1lIHRvIG1hdGNoIHRoZSBjdXJyZW50IHRpbWUgKHRha2luZyBpbnRvXG4gKiBhY2NvdW50IHRoZSB0aW1lUmF0aW8gZXRjKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlVGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIHZhciBlbGFwc2VkID0gbm93LmdldFRpbWUoKSAtIHRoaXMuZmlyc3RSZW5kZXI7XG4gICAgdGhpcy5kYXRlID0gbmV3IERhdGUodGhpcy5maXJzdFJlbmRlciArIChlbGFwc2VkICogdGhpcy5fb3B0cy50aW1lUmF0aW8pKTtcbiAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9vcHRzLmRhdGVVcGRhdGU7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgY2FsbGJhY2tEYXRlID0gbmV3IERhdGUodGhpcy5kYXRlKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgY2FsbGJhY2tEYXRlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVN1bigpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzdW4gdG8gc3VpdCB0aGUgc2NhcGUgY3VycmVudCB0aW1lLlxuICogQHBhcmFtICB7VEhSRUUuRGlyZWN0aW9uYWxMaWdodH0gW3N1bl0gdGhlIHN1biB0byBhY3Qgb24uICBJZiBub3RcbiAqIHN1cHBsaWVkLCB0aGlzIG1ldGhvZCB3aWxsIGFjdCBvbiB0aGUgbGlnaHQgaW4gdGhpcyBzY2VuZSdzIGxpZ2h0XG4gKiBsaXN0IHRoYXQgaXMgY2FsbGVkIFwic3VuXCIuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX3VwZGF0ZVN1biA9IGZ1bmN0aW9uKHN1bikge1xuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gaWYgdGhleSBkaWRuJ3QgcHJvdmlkZSBhIHN1biwgdXNlIG91ciBvd25cbiAgICAgICAgc3VuID0gdGhpcy5saWdodHMuc3VuO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc3VuID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjsgLy8gYmFpbCBpZiB0aGVyZSdzIG5vIHN1biBBUlJSSCBXSEFUIERJRCBZT1UgRE9cbiAgICB9XG5cbiAgICB2YXIgc3VuQW5nbGUgPSAodGhpcy5kYXRlLmdldEhvdXJzKCkqNjAgKyB0aGlzLmRhdGUuZ2V0TWludXRlcygpKSAvIDE0NDAgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgc3VuUm90YXRpb25BeGlzID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XG5cbiAgICBzdW4ucG9zaXRpb25cbiAgICAgICAgLnNldCgwLCAtMyAqIHRoaXMuZi53WSwgLTIwICogdGhpcy5mLndaKVxuICAgICAgICAuYXBwbHlBeGlzQW5nbGUoc3VuUm90YXRpb25BeGlzLCBzdW5BbmdsZSlcbiAgICAgICAgLmFkZCh0aGlzLmYuY2VudGVyKTtcblxuICAgIHZhciBzdW5aID0gc3VuLnBvc2l0aW9uLno7XG5cbiAgICAvLyBzd2l0Y2ggdGhlIHN1biBvZmYgd2hlbiBpdCdzIG5pZ2h0IHRpbWVcbiAgICBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gZmFsc2UgJiYgc3VuWiA8PSB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gdHJ1ZSAmJiBzdW5aID4gdGhpcy5mLmNlbnRlci56KSB7XG4gICAgICAgIHN1bi5vbmx5U2hhZG93ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gZmFkZSBvdXQgdGhlIHNoYWRvdyBkYXJrbmVzcyB3aGVuIHRoZSBzdW4gaXMgbG93XG4gICAgaWYgKHN1blogPj0gdGhpcy5mLmNlbnRlci56ICYmIHN1blogPD0gdGhpcy5mLm1heFopIHtcbiAgICAgICAgdmFyIHVwbmVzcyA9IE1hdGgubWF4KDAsIChzdW5aIC0gdGhpcy5mLmNlbnRlci56KSAvIHRoaXMuZi53WiAqIDIpO1xuICAgICAgICBzdW4uc2hhZG93RGFya25lc3MgPSAwLjUgKiB1cG5lc3M7XG4gICAgICAgIHN1bi5pbnRlbnNpdHkgPSB1cG5lc3M7XG4gICAgfVxuXG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VMaWdodHMgPSBmdW5jdGlvbihsaWdodHNUb0luY2x1ZGUpIHtcblxuICAgIHZhciBsaWdodHMgPSB7fTtcbiAgICB2YXIgZiA9IHRoaXMuZjsgIC8vIGNvbnZlbmllbnQgcmVmZXJlbmNlIHRvIHRoZSBmaWVsZFxuXG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdhbWJpZW50JykgIT0gLTEpIHtcbiAgICAgICAgLy8gYWRkIGFuIGFtYmllbnQgbGlzdFxuICAgICAgICBsaWdodHMuYW1iaWVudCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgyMjIyMzMpO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3RvcGxlZnQnKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMubGVmdCA9IG5ldyBUSFJFRS5Qb2ludExpZ2h0KDB4ZmZmZmZmLCAxLCAwKTtcbiAgICAgICAgLy8gcG9zaXRpb24gbGlnaHQgb3ZlciB0aGUgdmlld2VyJ3MgbGVmdCBzaG91bGRlci4uXG4gICAgICAgIC8vIC0gTEVGVCBvZiB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB4IHdpZHRoXG4gICAgICAgIC8vIC0gQkVISU5EIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHkgd2lkdGhcbiAgICAgICAgLy8gLSBBQk9WRSB0aGUgY2FtZXJhIGJ5IHRoZSBmaWVsZCdzIGhlaWdodFxuICAgICAgICBsaWdodHMubGVmdC5wb3NpdGlvbi5hZGRWZWN0b3JzKFxuICAgICAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24sXG4gICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMygtMC41ICogZi53WCwgLTAuNSAqIGYud1ksIDEgKiBmLndaKVxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3N1bicpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5zdW4gPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZlZSk7XG4gICAgICAgIGxpZ2h0cy5zdW4uaW50ZW5zaXR5ID0gMS4wO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZVN1bihsaWdodHMuc3VuKTtcblxuICAgICAgICAvLyBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVZpc2libGUgPSB0cnVlOyAgLy8gREVCVUdcblxuICAgICAgICAvLyBkaXJlY3Rpb24gb2Ygc3VubGlnaHRcbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5zdW4udGFyZ2V0ID0gdGFyZ2V0O1xuXG4gICAgICAgIC8vIHN1biBkaXN0YW5jZSwgbG9sXG4gICAgICAgIHZhciBzdW5EaXN0YW5jZSA9IGxpZ2h0cy5zdW4ucG9zaXRpb24uZGlzdGFuY2VUbyhsaWdodHMuc3VuLnRhcmdldC5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxvbmdlc3QgZGlhZ29uYWwgZnJvbSBmaWVsZC1jZW50ZXJcbiAgICAgICAgdmFyIG1heEZpZWxkRGlhZ29uYWwgPSBmLmNlbnRlci5kaXN0YW5jZVRvKG5ldyBUSFJFRS5WZWN0b3IzKGYubWluWCwgZi5taW5ZLCBmLm1pblopKTtcblxuICAgICAgICAvLyBzaGFkb3cgc2V0dGluZ3NcbiAgICAgICAgbGlnaHRzLnN1bi5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuMzM7XG5cbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFOZWFyID0gc3VuRGlzdGFuY2UgLSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUZhciA9IHN1bkRpc3RhbmNlICsgbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFUb3AgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVJpZ2h0ID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFCb3R0b20gPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTGVmdCA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdza3knKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc2t5ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhlZWVlZmYpO1xuICAgICAgICBsaWdodHMuc2t5LmludGVuc2l0eSA9IDAuODtcblxuICAgICAgICAvLyBza3kgaXMgZGlyZWN0bHkgYWJvdmVcbiAgICAgICAgdmFyIHNreUhlaWdodCA9IDUgKiBmLndaO1xuICAgICAgICBsaWdodHMuc2t5LnBvc2l0aW9uLmNvcHkodGhpcy5jYW1lcmEucG9zaXRpb24pO1xuICAgICAgICAvLyBsaWdodHMuc2t5LnBvc2l0aW9uLnNldFooZi5tYXhaICsgc2t5SGVpZ2h0KTtcblxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnNreS50YXJnZXQgPSB0YXJnZXQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgbGlnaHQgaW4gbGlnaHRzKSB7XG4gICAgICAgIGlmIChsaWdodHMuaGFzT3duUHJvcGVydHkobGlnaHQpKSB7XG4gICAgICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodHNbbGlnaHRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaWdodHM7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VTY2VuZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICAgIC8vIGFkZCBmb2dcbiAgICAvLyBzY2VuZS5mb2cgPSBuZXcgVEhSRUUuRm9nKFxuICAgIC8vICAgICAnI2YwZjhmZicsXG4gICAgLy8gICAgIHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsXG4gICAgLy8gICAgIHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblggKiAzXG4gICAgLy8gKTtcbiAgICByZXR1cm4gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDYW1lcmEgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cbiAgICAvLyB2aWV3aW5nIGFuZ2xlXG4gICAgLy8gaSB0aGluayB0aGlzIGlzIHRoZSB2ZXJ0aWNhbCB2aWV3IGFuZ2xlLiAgaG9yaXpvbnRhbCBhbmdsZSBpc1xuICAgIC8vIGRlcml2ZWQgZnJvbSB0aGlzIGFuZCB0aGUgYXNwZWN0IHJhdGlvLlxuICAgIHZhciB2aWV3QW5nbGUgPSA0NTtcbiAgICB2aWV3QW5nbGUgPSAob3B0aW9ucyAmJiBvcHRpb25zLnZpZXdBbmdsZSkgfHwgdmlld0FuZ2xlO1xuXG4gICAgLy8gYXNwZWN0XG4gICAgdmFyIHZpZXdBc3BlY3QgPSAxNi85O1xuICAgIGlmICh0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIHZpZXdBc3BlY3QgPSAkZWxlbS53aWR0aCgpIC8gJGVsZW0uaGVpZ2h0KCk7XG4gICAgfVxuXG4gICAgLy8gbmVhciBhbmQgZmFyIGNsaXBwaW5nXG4gICAgdmFyIG5lYXJDbGlwID0gMC4xO1xuICAgIHZhciBmYXJDbGlwID0gMTAwMDA7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBuZWFyQ2xpcCA9IE1hdGgubWluKHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opIC8gMTAwMDtcbiAgICAgICAgZmFyQ2xpcCA9IE1hdGgubWF4KHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opICogMTA7XG4gICAgfVxuXG4gICAgLy8gY2FtZXJhIHBvc2l0aW9uIGFuZCBsb29raW5nIGRpcmVjdGlvblxuICAgIHZhciBsb29rSGVyZSA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xuICAgIHZhciBjYW1Qb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAtMTAsIDUpO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbG9va0hlcmUgPSB0aGlzLmYuY2VudGVyO1xuICAgICAgICBjYW1Qb3MgPSBsb29rSGVyZS5jbG9uZSgpLmFkZChuZXcgVEhSRUUuVmVjdG9yMygwLCAtMS4xICogdGhpcy5mLndZLCAzICogdGhpcy5mLndaKSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IHVwIGNhbWVyYVxuICAgIHZhciBjYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoIHZpZXdBbmdsZSwgdmlld0FzcGVjdCwgbmVhckNsaXAsIGZhckNsaXApO1xuICAgIC8vIFwidXBcIiBpcyBwb3NpdGl2ZSBaXG4gICAgY2FtZXJhLnVwLnNldCgwLDAsMSk7XG4gICAgY2FtZXJhLnBvc2l0aW9uLmNvcHkoY2FtUG9zKTtcbiAgICBjYW1lcmEubG9va0F0KGxvb2tIZXJlKTtcblxuICAgIC8vIGFkZCB0aGUgY2FtZXJhIHRvIHRoZSBzY2VuZVxuICAgIGlmICh0aGlzLnNjZW5lKSB7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGNhbWVyYSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbWVyYTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwwLDApO1xuICAgIGlmICh0aGlzLmYgJiYgdGhpcy5mLmNlbnRlcikge1xuICAgICAgICBjZW50ZXIgPSB0aGlzLmYuY2VudGVyLmNsb25lKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNhbWVyYSAmJiB0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgY29udHJvbHMgPSBuZXcgVEhSRUUuT3JiaXRDb250cm9scyh0aGlzLmNhbWVyYSwgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgY29udHJvbHMuY2VudGVyID0gY2VudGVyO1xuICAgICAgICByZXR1cm4gY29udHJvbHM7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnc2NhcGUhJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTY2VuZTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBTdHVmZiAodGhhdCBpcywgVEhSRUUuTWF0ZXJpYWwpIHRoYXQgdGhpbmdzIGluIHNjYXBlcyBjYW4gYmUgbWFkZSBvdXQgb2YuXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZVN0dWZmID0ge307XG52YXIgTGFtYmVydCA9IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWw7XG5cbi8qKiBnZW5lcmljIHN0dWZmLCBmb3IgaWYgbm90aGluZyBlbHNlIGlzIHNwZWNpZmllZFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdlbmVyaWMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSxcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjUwIH0pO1xuXG4vKiogd2F0ZXIgaXMgYmx1ZSBhbmQgYSBiaXQgdHJhbnNwYXJlbnRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53YXRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MzM5OWZmLFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNzUgfSk7XG5cbi8qKiBkaXJ0IGZvciBnZW5lcmFsIHVzZVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGEwNTIyZCB9KTtcblxuLy8gTmluZSBkaXJ0IGNvbG91cnMgZm9yIHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzLiAgU3RhcnQgYnkgZGVmaW5pbmdcbi8vIHRoZSBkcmllc3QgYW5kIHdldHRlc3QgY29sb3VycywgYW5kIHVzZSAubGVycCgpIHRvIGdldCBhIGxpbmVhclxuLy8gaW50ZXJwb2xhdGVkIGNvbG91ciBmb3IgZWFjaCBvZiB0aGUgaW4tYmV0d2VlbiBkaXJ0cy5cbnZhciBkcnkgPSBuZXcgVEhSRUUuQ29sb3IoMHhiYjg4NTUpOyAvLyBkcnlcbnZhciB3ZXQgPSBuZXcgVEhSRUUuQ29sb3IoMHg4ODIyMDApOyAvLyBtb2lzdFxuXG4vKiogZGlydCBhdCB2YXJ5aW5nIG1vaXN0dXJlIGxldmVsczogZGlydDAgaXMgZHJ5IGFuZCBsaWdodCBpblxuICAqIGNvbG91ciwgZGlydDkgaXMgbW9pc3QgYW5kIGRhcmsuXG4gICogQG5hbWUgZGlydFswLTldXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZGlydDAgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkgfSk7XG5TY2FwZVN0dWZmLmRpcnQxID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDEvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDIvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQzID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDMvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDQvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ1ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDUvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ2ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDYvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ3ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDcvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ4ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDgvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ5ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogd2V0IH0pO1xuXG4vKiogbGVhZiBsaXR0ZXIsIHdoaWNoIGluIHJlYWxpdHkgaXMgdXN1YWxseSBicm93bmlzaCwgYnV0IHRoaXMgaGFzXG4gICogYSBncmVlbmlzaCB0b25lIHRvIGRpc3Rpbmd1aXNoIGl0IGZyb20gcGxhaW4gZGlydC5cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5sZWFmbGl0dGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg2NjZiMmYgfSk7XG5cbi8qKiBnZW5lcmljIGJyb3duIHdvb2RcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg3NzQ0MjIgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDU1ODgzMyB9KTtcblxuLyoqIGEgZ2VuZXJpYyBncmVlbmlzaCBsZWFmIG1hdGVyaWFsXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZm9saWFnZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NTU4ODMzLFxuICAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjc1IH0pO1xuXG4vKiogYSBmb2xpYWdlIG1hdGVyaWFsIGZvciB1c2UgaW4gcG9pbnQgY2xvdWQgb2JqZWN0c1xuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnBvaW50Rm9saWFnZSA9IG5ldyBUSFJFRS5Qb2ludENsb3VkTWF0ZXJpYWwoeyBjb2xvcjogMHg1NTg4MzMsIHNpemU6IDAuNSB9KTtcblxuLyoqIGxpZ2h0IHdvb2QgZm9yIGd1bXRyZWVzIGV0YywgYml0IHRvbyBsaWdodC4gIENvbXBsYWluIHRvIE1hcmlhbm5lIGlmIGl0J3Mgd3JvbmdcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5saWdodHdvb2QgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGZmZWVjYyB9KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU3R1ZmY7XG5cblxuXG5cbiJdfQ==
