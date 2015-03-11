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

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/scene":10,"./scape/stuff":11}],2:[function(require,module,exports){

//
// this "base" object has a few convenience functions for handling
// options and whatnot
//

// -----------------------------------------------------------------
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
// -----------------------------------------------------------------

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
        this.addItem(theItem);
    }
}
// ------------------------------------------------------------------
ScapeField.prototype.addItem = function(item) {

    // add to the parent block
    var parentBlock = this.getBlock(item.x, item.y);
    parentBlock.i.push(item);

    // set item height to the parent block's ground height
    item.setHeight(parentBlock.g[0].z);
}
// ------------------------------------------------------------------
/**
 * Add a list of items to the scape at various points.
 *
 * @param {Array} itemList A list of items.  Each element must
 * have `x`, `y`, and `item` properties.
 * @param {Boolean} replace If a truthy value is supplied, this
 * method will discard existing height claims before adding these
 * ones.  If false or unsupplied, these new claims will be added to
 * the existing ones.
 */
ScapeField.prototype.addItemsOfType = function(itemList, replace) {
    if (replace) {
        this._items = [];
    }
    // loop through the list adding each one.
    for (var s = 0; s < itemList.length; s++) {
        var theItem = itemList[s];
        this.addItemOfType(theItem.type, theItem.x, theItem.y, theItem);
    }
}
// ------------------------------------------------------------------
ScapeField.prototype.addItemOfType = function(itemType, x, y, options) {

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

},{"./baseobject":2,"./item":5,"./stuff":11}],5:[function(require,module,exports){
(function (global){

// ------------------------------------------------------------------
var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeObject = require('./baseobject');


// DEBUG
var ScapeItems = require('./itemtypes');
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
    }, this);
}
// ------------------------------------------------------------------
ScapeItem.prototype.update = function(updatedOptions) {
    this.mergeOptions(updatedOptions);
    this._updateMeshes();
}
// ------------------------------------------------------------------
ScapeItem.prototype.setHeight = function(z) {
    this._pos.setZ(z);
    this.eachMesh(function(m) {
        m.position.copy(this._pos);
    }, this);
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
    if (this._scene) {
        this.eachMesh(function(m) {
            this._scene.remove(m);
        }, this);
        this._scene = null;
    }
}
// ------------------------------------------------------------------
ScapeItem.prototype._updateMeshes = function() {
    var scene = this._scene; // remember this because removeFromScene
                             // will delete this._scene
    if (this._scene) { this.removeFromScene(this._scene); }
    this._createNewMeshes();
    if (scene) { this.addToScene(scene); }
}
// ------------------------------------------------------------------
// do something to each mesh
ScapeItem.prototype.eachMesh = function(callback, thisArg) {
    if (this._meshes) {
        for (var m = 0; m < this._meshes.length; m++) {
            callback.call(thisArg, this._meshes[m]);
        }
    }
}
// ------------------------------------------------------------------
module.exports = ScapeItem;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./baseobject":2,"./itemtypes":6}],6:[function(require,module,exports){

/**
 * A bag of item types -- i.e. THREE.Geometrys -- that scapes can have in them.
 *
 * @namespace
 */
var ScapeItems = {
    // documentation for items are in the ./itemtypes/* files
    cube:  require('./itemtypes/cube'),
    tree:  require('./itemtypes/tree'),
    crane: require('./itemtypes/crane')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/crane":7,"./itemtypes/cube":8,"./itemtypes/tree":9}],7:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');

var M4 = THREE.Matrix4;
// ------------------------------------------------------------------
/**
 * Returns a mesh array for a tower crane.
 * @param {Object} options used to specify properties of the crane.

 * @param {width} options.width=2 Width of crane tower
 * @param {height} options.height=50 Height of crane tower
 * @param {length} options.length=40 Length of crane boom, from the
 *        crane's centre axis to the tip
 * @param {rotation} options.rotation=0 Degrees of boom rotation,
 *        counted clockwise from the +ve Y direction (away from
 *        the camera)
 * @param {counterweightLength} options.counterweightLength=length/4
 *        Length of the counterweight boom, from the crane's centre
 *        axis to the end of the counterweight
 * @param {THREE.Material} options.struts=ScapeStuff.glossBlack
 *        What to make the struts in the tower and boom out of
  * @param {THREE.Material} options.base=ScapeStuff.concrete
 *        What to make the base out of
 * @param {THREE.Material} options.ring=ScapeStuff.plastic
 *        What to make the ring at the top of the tower out of
 * @param {THREE.Material} options.cabin=ScapeStuff.plastic
 *        What to make the cabin out of
 * @param {THREE.Material} options.window=ScapeStuff.glass
 *        What to make the cabin window out of
 * @param {THREE.Material} options.counterweight=ScapeStuff.concrete
 *        What to make the counterweight out of
 *
 * @function
 * @name ScapeItems.crane
 */
function ScapeCraneFactory(options) {

	var craneParts = [];

	var towerWidth = options.width || 2;
	var height = options.height || 50;
	var length = options.length || 40;
	var counterweightLength = options.counterweightLength || (length / 4);
	var strutStuff = options.struts || ScapeStuff.glossBlack;
	var baseStuff = options.base || ScapeStuff.concrete;
	var ringStuff = options.ring || ScapeStuff.plastic;
	var cabinStuff = options.cabin || ScapeStuff.plastic;
	var windowStuff = options.window || ScapeStuff.glass;
	var counterweightStuff = options.counterweight || ScapeStuff.concrete;
	var rotation = -1 * (options.rotation || 0) * Math.PI / 180;

	var towerHeight = height;
	var baseW = towerWidth * 3;
	var baseH = towerWidth * 2; // half of the height will be "underground"

	var poleR = towerWidth / 10;

	var ringR = ((towerWidth / 2) * Math.SQRT2) + 1.3 * poleR;
	var ringH = towerWidth / 5;

	var boomL = length; // length of crane boom
	var cwbL = counterweightLength; // length of counterweight boom
	var rodL = boomL + cwbL;
	var cwW = towerWidth - 3*poleR;
	var cwH = towerWidth * 1.5;
	var cwL = towerWidth * 1.5;

	var cabinW = towerWidth;
	var cabinH = towerWidth * 1.25;
	var cabinL = cabinH;

	// this is for rotating the crane boom
	var rotate = new M4().makeRotationZ(rotation);

	// this is for making cylinders go upright (CylinderGeometry starts lying along the Y axis)
	var cylinderRotate = new M4().makeRotationX(Math.PI/2);

	////////// the base
	var baseGeom = new THREE.BoxGeometry(baseW, baseW, baseH);
	var base = new THREE.Mesh(baseGeom, baseStuff);
	craneParts.push(base);

	////////// the vertical mast
	// make one pole to start with
	var poleGeom = new THREE.CylinderGeometry(poleR, poleR, towerHeight);
	poleGeom.applyMatrix(new M4().makeTranslation(towerWidth/2, towerWidth/2, towerHeight/2).multiply(cylinderRotate));

	// Make three more poles by copying the first pole and rotating another 90degs around the centre
	var pole;
	var rotateAroundZ = new M4().makeRotationZ(Math.PI/2);
	for (var p = 0; p < 4; p++) {
		pole = new THREE.Mesh(poleGeom, strutStuff);
		craneParts.push(pole);
		poleGeom = poleGeom.clone();
		poleGeom.applyMatrix(rotateAroundZ);
	}


	////////// the ring at the top of the tower
	var ringGeom = new THREE.CylinderGeometry(ringR, ringR, ringH, 12, 1, true);
	ringGeom.applyMatrix(new M4().makeTranslation(0, 0, towerHeight - ringH/2).multiply(cylinderRotate));
	ringStuff.side = THREE.DoubleSide;
	craneParts.push(new THREE.Mesh(ringGeom, ringStuff));


	////////// the horizontal boom
	// make one rod to start with
	var topRodGeom = new THREE.CylinderGeometry(poleR, poleR, rodL);

	// top rod
	topRodGeom.applyMatrix(new M4().makeTranslation(0, (rodL/2) - cwbL, towerHeight + poleR + 0.5 * towerWidth));
	leftRodGeom = topRodGeom.clone();
	rightRodGeom = topRodGeom.clone();

	topRodGeom.applyMatrix(rotate);
	craneParts.push(new THREE.Mesh(topRodGeom, strutStuff));

	// bottom left rod
	leftRodGeom.applyMatrix(new M4().makeTranslation(-0.5 * towerWidth + poleR, 0, -0.5 * towerWidth));
	leftRodGeom.applyMatrix(rotate);
	craneParts.push(new THREE.Mesh(leftRodGeom, strutStuff));

	// bottom right rod
	rightRodGeom.applyMatrix(new M4().makeTranslation(0.5 * towerWidth - poleR, 0, -0.5 * towerWidth));
	rightRodGeom.applyMatrix(rotate);
	craneParts.push(new THREE.Mesh(rightRodGeom, strutStuff));

	// end of the boom
	var endGeom = new THREE.BoxGeometry(towerWidth, poleR, 0.5 * towerWidth + poleR + poleR);
	endGeom.applyMatrix(new M4().makeTranslation(0, boomL, towerHeight + 0.25 * towerWidth + poleR));
	endGeom.applyMatrix(rotate);
	craneParts.push(new THREE.Mesh(endGeom, strutStuff));


	////////// counterweight
	var cwGeom = new THREE.BoxGeometry(cwW, cwL, cwH);
	cwGeom.applyMatrix(new M4().makeTranslation(0, 1.001 * (cwL/2 - cwbL), towerHeight));
	cwGeom.applyMatrix(rotate);
	craneParts.push(new THREE.Mesh(cwGeom, counterweightStuff));


	////////// cabin
	var cabinGeom = new THREE.BoxGeometry(cabinW, cabinL, cabinH);
	var windowGeom = new THREE.BoxGeometry(cabinW * 1.1, cabinL * 0.6, cabinH * 0.6);
	cabinGeom.applyMatrix(new M4().makeTranslation(cabinW/2 + poleR, 0, cabinH/2 + towerHeight + poleR + poleR));
	windowGeom.applyMatrix(new M4().makeTranslation(cabinW/2 + poleR, cabinL * 0.25, cabinH * 0.6 + towerHeight + poleR + poleR));
	cabinGeom.applyMatrix(rotate);
	windowGeom.applyMatrix(rotate);
	craneParts.push(new THREE.Mesh(cabinGeom, cabinStuff));
	craneParts.push(new THREE.Mesh(windowGeom, windowStuff));

	// return all the crane bits.
	return craneParts;
};
// ------------------------------------------------------------------
module.exports = ScapeCraneFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":11}],8:[function(require,module,exports){
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

},{"../stuff":11}],9:[function(require,module,exports){
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

},{"../stuff":11}],10:[function(require,module,exports){
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
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: "highp" });
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

},{"./baseobject":2,"./chunk":3,"./item":5,"./itemtypes":6,"./stuff":11}],11:[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);

var Lambert = THREE.MeshLambertMaterial;
var Phong = THREE.MeshPhongMaterial;
// ------------------------------------------------------------------
/**
 * Stuff (that is, THREE.Material) that things in scapes can be made out of.
 * @namespace
 */
var ScapeStuff = {};

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
ScapeStuff.foliage = new Lambert(
  { color: 0x558833, transparent: true, opacity: 0.75 }
);

/** a foliage material for use in point cloud objects
  * @memberof ScapeStuff */
ScapeStuff.pointFoliage = new THREE.PointCloudMaterial({ color: 0x558833, size: 0.5 });

/** light wood for gumtrees etc.  Maybe it's a bit too light?
  * @memberof ScapeStuff */
ScapeStuff.lightwood = new Lambert({ color: 0xffeecc });

/** silvery metal
  * @memberOf ScapeStuff */
ScapeStuff.metal = new Phong({ color: 0x8899aa, specular: 0xffffff, shininess: 100, reflectivity: 0.8 });

/** gloss black, for shiny black painted surfaces
  * @memberOf ScapeStuff */
ScapeStuff.glossBlack = new Phong({ color: 0x000000, specular: 0x666666 });

/** concrete in a sort of mid-grey
  * @memberOf ScapeStuff */
ScapeStuff.concrete = new Lambert({ color: 0x999999 });

/** plastic, a generic whitish plastic with a bit of shininess
  * @memberOf ScapeStuff */
ScapeStuff.plastic = new Phong({ color: 0x999999, emissive: 0x999999, specular: 0xcccccc });

/** glass is shiny, fairly transparent, and a little bluish
  * @memberof ScapeStuff */
ScapeStuff.glass = new Phong(
  { color: 0x66aaff, specular: 0xffffff, transparent: true, opacity: 0.5 }
);

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3JhbmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2N1YmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL3RyZWUuanMiLCJzcmMvc2NhcGUvc2NlbmUuanMiLCJzcmMvc2NhcGUvc3R1ZmYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzljQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vIFRIUkVFID0gcmVxdWlyZSgndGhyZWUnKTtcblxuLy8gZ2V0IHRoZSB2YXJpb3VzIGJpdHNcbmJhc2UgID0gcmVxdWlyZSgnLi9zY2FwZS9iYXNlb2JqZWN0Jyk7XG5zdHVmZiA9IHJlcXVpcmUoJy4vc2NhcGUvc3R1ZmYnKTtcbmZpZWxkID0gcmVxdWlyZSgnLi9zY2FwZS9maWVsZCcpO1xuc2NlbmUgPSByZXF1aXJlKCcuL3NjYXBlL3NjZW5lJyk7XG5jaHVuayA9IHJlcXVpcmUoJy4vc2NhcGUvY2h1bmsnKTtcblxuLy8gbWFrZSBhbiBvYmplY3Qgb3V0IG9mIHRoZSB2YXJpb3VzIGJpdHNcblNjYXBlID0ge1xuICAgIEJhc2VPYmplY3Q6IGJhc2UsXG4gICAgU3R1ZmY6IHN0dWZmLFxuICAgIENodW5rOiBjaHVuayxcbiAgICBGaWVsZDogZmllbGQsXG4gICAgU2NlbmU6IHNjZW5lXG59XG5cbi8vIHJldHVybiB0aGUgb2JqZWN0IGlmIHdlJ3JlIGJlaW5nIGJyb3dzZXJpZmllZDsgb3RoZXJ3aXNlIGF0dGFjaFxuLy8gaXQgdG8gdGhlIGdsb2JhbCB3aW5kb3cgb2JqZWN0LlxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTY2FwZTtcbn0gZWxzZSB7XG4gICAgd2luZG93LlNjYXBlID0gU2NhcGU7XG59XG4iLCJcbi8vXG4vLyB0aGlzIFwiYmFzZVwiIG9iamVjdCBoYXMgYSBmZXcgY29udmVuaWVuY2UgZnVuY3Rpb25zIGZvciBoYW5kbGluZ1xuLy8gb3B0aW9ucyBhbmQgd2hhdG5vdFxuLy9cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIFNjYXBlT2JqZWN0KG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gICAgdGhpcy5fb3B0cyA9IE9iamVjdC5jcmVhdGUoZGVmYXVsdHMpO1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZXJnZSBuZXcgb3B0aW9ucyBpbnRvIG91ciBvcHRpb25zXG5TY2FwZU9iamVjdC5wcm90b3R5cGUubWVyZ2VPcHRpb25zID0gZnVuY3Rpb24oZXh0cmFPcHRzKSB7XG4gICAgZm9yIChvcHQgaW4gZXh0cmFPcHRzKSB7XG4gICAgICAgIHRoaXMuX29wdHNbb3B0XSA9IGV4dHJhT3B0c1tvcHRdO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVPYmplY3Q7IiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWN0YW5ndWxhciBwcmlzbSBvZiBtYXRlcmlhbCB0aGF0IHRoZSBzb2xpZCBcImdyb3VuZFwiXG4gKiBwb3J0aW9uIG9mIGEgJ3NjYXBlIGlzIG1ha2UgdXAgb2YsIGUuZy4gZGlydCwgbGVhZiBsaXR0ZXIsIHdhdGVyLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIG1lc2ggYmFzZWQgb24gdGhlIGxpbmtlZFxuICogY2h1bmsgaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGNodW5rIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayAodmVydGljYWwgY29sdW1uIHdpdGhpbiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2FwZSkgdGhhdCBvd25zIHRoaXMgY2h1bmtcbiAqIEBwYXJhbSB7SW50ZWdlcn0gbGF5ZXJJbmRleCBJbmRleCBpbnRvIHBhcmVudEJsb2NrLmcgdGhpcyBjaHVuayBpcyBhdFxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblogbG93ZXN0IFogdmFsdWUgYW55IGNodW5rIHNob3VsZCBoYXZlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUNodW5rKHNjZW5lLCBwYXJlbnRCbG9jaywgbGF5ZXJJbmRleCwgbWluWiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9ibG9jayA9IHBhcmVudEJsb2NrO1xuICAgIHRoaXMuX2lzU3VyZmFjZSA9IChsYXllckluZGV4ID09IDApO1xuICAgIHRoaXMuX2xheWVyID0gcGFyZW50QmxvY2suZ1tsYXllckluZGV4XTtcbiAgICB0aGlzLl9taW5aID0gbWluWjtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuXG4gICAgLy8gVE9ETzogZmluaXNoIGhpbSEhXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVDaHVuay5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUNodW5rLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlQ2h1bms7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogSW52b2tlIGEgcmVidWlsZCBvZiB0aGlzIGNodW5rLlxuICpcbiAqIERpc2NhcmRzIGV4aXN0aW5nIGNhY2hlZCBtZXNoIGFuZCBidWlsZHMgYSBuZXcgbWVzaCBiYXNlZCBvbiB0aGVcbiAqIGN1cnJlbnRseSBsaW5rZWQgY2h1bmsgaW5mb3JtYXRpb24uXG4gKlxuICogQHJldHVybiBub25lXG4gKi9cblNjYXBlQ2h1bmsucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91cGRhdGVNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhlIGNodW5rIHdpbGwgYmUgYXMgZGVlcCBhcyB0aGUgbGF5ZXIgc2F5c1xuICAgIHZhciBkZXB0aCA9IHRoaXMuX2xheWVyLmR6O1xuICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgIC8vIC4udW5sZXNzIHRoYXQncyAwLCBpbiB3aGljaCBjYXNlIGdvIHRvIHRoZSBib3R0b21cbiAgICAgICAgZGVwdGggPSB0aGlzLl9sYXllci56IC0gdGhpcy5fbWluWjtcbiAgICB9XG4gICAgLy8gbWFrZSBhIGdlb21ldHJ5IGZvciB0aGUgY2h1bmtcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcbiAgICAgICAgdGhpcy5fYmxvY2suZHgsIHRoaXMuX2Jsb2NrLmR5LCBkZXB0aFxuICAgICk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCB0aGlzLl9sYXllci5tKTtcbiAgICBtZXNoLnBvc2l0aW9uLnNldChcbiAgICAgICAgdGhpcy5fYmxvY2sueCArIHRoaXMuX2Jsb2NrLmR4LzIsXG4gICAgICAgIHRoaXMuX2Jsb2NrLnkgKyB0aGlzLl9ibG9jay5keS8yLFxuICAgICAgICB0aGlzLl9sYXllci56IC0gZGVwdGgvMlxuICAgICk7XG4gICAgbWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAvLyBvbmx5IHRoZSBzdXJmYWNlIGNodW5rcyByZWNlaXZlIHNoYWRvd1xuICAgIGlmICh0aGlzLl9pc1N1cmZhY2UpIHtcbiAgICAgICAgbWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9hZGRNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUuYWRkKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fcmVtb3ZlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLnJlbW92ZSh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3VwZGF0ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVNZXNoKCk7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcbiAgICB0aGlzLl9hZGRNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDaHVuazsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbSA9IHJlcXVpcmUoJy4vaXRlbScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFRoZSBjb250YWluZXIgZm9yIGFsbCBpbmZvcm1hdGlvbiBhYm91dCBhbiBhcmVhLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucyBmb3IgdGhlIFNjYXBlRmllbGQgYmVpbmcgY3JlYXRlZC5cbiAqXG4gKiBvcHRpb24gfCBkZWZhdWx0IHZhbHVlIHwgZGVzY3JpcHRpb25cbiAqIC0tLS0tLS18LS0tLS0tLS0tLS0tLS06fC0tLS0tLS0tLS0tLVxuICogYG1pblhgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WGAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1hgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWCBheGlzIGludG9cbiAqIGBtaW5ZYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFlgICAgICB8ICAxMDAgfCBsYXJnZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NZYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFkgYXhpcyBpbnRvXG4gKiBgbWluWmAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFogKHZlcnRpY2FsIGRpbWVuc2lvbikgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhaYCAgICAgfCAgIDQwIHwgbGFyZ2VzdCBaIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWmAgIHwgICA4MCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBaIGF4aXMgaW50b1xuICogYGJsb2NrR2FwYCB8IDAuMDQgfCBnYXAgdG8gbGVhdmUgYmV0d2VlbiBibG9ja3MgYWxvbmcgdGhlIFggYW5kIFkgYXhlc1xuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUZpZWxkKG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgbWluWDogMCwgICAgICAgIG1heFg6IDEwMCwgICAgICAgICAgYmxvY2tzWDogMTAsXG4gICAgICAgIG1pblk6IDAsICAgICAgICBtYXhZOiAxMDAsICAgICAgICAgIGJsb2Nrc1k6IDEwLFxuICAgICAgICBtaW5aOiAwLCAgICAgICAgbWF4WjogNDAsICAgICAgICAgICBibG9ja3NaOiA4MCxcbiAgICAgICAgYmxvY2tHYXA6IDAuMDRcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gbWluIGFuZCBtYXggdmFsdWVzIGZvciB4IHkgYW5kIHpcbiAgICB0aGlzLm1pblggPSB0aGlzLl9vcHRzLm1pblg7XG4gICAgdGhpcy5taW5ZID0gdGhpcy5fb3B0cy5taW5ZO1xuICAgIHRoaXMubWluWiA9IHRoaXMuX29wdHMubWluWjtcblxuICAgIHRoaXMubWF4WCA9IHRoaXMuX29wdHMubWF4WDtcbiAgICB0aGlzLm1heFkgPSB0aGlzLl9vcHRzLm1heFk7XG4gICAgdGhpcy5tYXhaID0gdGhpcy5fb3B0cy5tYXhaO1xuXG4gICAgLy8gY29udmVuaWVudCBcIndpZHRoc1wiXG4gICAgdGhpcy53WCA9IHRoaXMubWF4WCAtIHRoaXMubWluWDtcbiAgICB0aGlzLndZID0gdGhpcy5tYXhZIC0gdGhpcy5taW5ZO1xuICAgIHRoaXMud1ogPSB0aGlzLm1heFogLSB0aGlzLm1pblo7XG5cbiAgICAvLyBob3cgbWFueSBibG9ja3MgYWNyb3NzIHggYW5kIHk/XG4gICAgdGhpcy5ibG9ja3NYID0gdGhpcy5fb3B0cy5ibG9ja3NYO1xuICAgIHRoaXMuYmxvY2tzWSA9IHRoaXMuX29wdHMuYmxvY2tzWTtcbiAgICB0aGlzLmJsb2Nrc1ogPSB0aGlzLl9vcHRzLmJsb2Nrc1o7XG5cbiAgICAvLyBob3cgd2lkZSBpcyBlYWNoIGJsb2NrXG4gICAgdGhpcy5fYlggPSB0aGlzLndYIC8gdGhpcy5ibG9ja3NYO1xuICAgIHRoaXMuX2JZID0gdGhpcy53WSAvIHRoaXMuYmxvY2tzWTtcbiAgICB0aGlzLl9iWiA9IHRoaXMud1ogLyB0aGlzLmJsb2Nrc1o7XG5cbiAgICAvLyBob3VzZWtlZXBpbmdcbiAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgdGhpcy5fY2FsY0NlbnRlcigpO1xuICAgIHRoaXMuX21ha2VHcmlkKCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUZpZWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlRmllbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVGaWVsZDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJygnICsgdGhpcy5taW5YICsgJy0nICsgdGhpcy5tYXhYICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWSArICctJyArIHRoaXMubWF4WSArXG4gICAgICAgICcsICcgKyB0aGlzLm1pblogKyAnLScgKyB0aGlzLm1heFogK1xuICAgICAgICAnKSdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlRmllbGQucHJvdG90eXBlLl9tYWtlR3JpZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2cgPSBbXTtcbiAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5ibG9ja3NYOyBneCsrKSB7XG4gICAgICAgIHZhciBjb2wgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuYmxvY2tzWTsgZ3krKykge1xuICAgICAgICAgICAgdmFyIHhHYXAgPSB0aGlzLl9iWCAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIHlHYXAgPSB0aGlzLl9iWSAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIGJsb2NrID0ge1xuICAgICAgICAgICAgICAgIHg6IHRoaXMubWluWCArICh0aGlzLl9iWCAqIGd4KSArIHhHYXAsXG4gICAgICAgICAgICAgICAgZHg6IHRoaXMuX2JYIC0geEdhcCAtIHhHYXAsXG4gICAgICAgICAgICAgICAgeTogdGhpcy5taW5ZICsgKHRoaXMuX2JZICogZ3kpICsgeUdhcCxcbiAgICAgICAgICAgICAgICBkeTogdGhpcy5fYlkgLSB5R2FwIC0geUdhcCxcbiAgICAgICAgICAgICAgICBnOiBbe1xuICAgICAgICAgICAgICAgICAgICB6OiB0aGlzLm1heFosXG4gICAgICAgICAgICAgICAgICAgIGR6OiAwLCAvLyAwIG1lYW5zIFwic3RyZXRjaCB0byBtaW5aXCJcbiAgICAgICAgICAgICAgICAgICAgbTogU2NhcGVTdHVmZi5nZW5lcmljLFxuICAgICAgICAgICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgIGk6IFtdXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb2wucHVzaChibG9jayk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZy5wdXNoKGNvbCk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGJ1aWxkcyBibG9jayBtZXNoZXMgZm9yIGRpc3BsYXkgaW4gdGhlIHByb3ZpZGVkIHNjZW5lLiAgVGhpcyBpc1xuICogZ2VuZXJhbGx5IGNhbGxlZCBieSB0aGUgU2NhcGVTY2VuZSBvYmplY3Qgd2hlbiB5b3UgZ2l2ZSBpdCBhXG4gKiBTY2FwZUZpZWxkLCBzbyB5b3Ugd29uJ3QgbmVlZCB0byBjYWxsIGl0IHlvdXJzZWxmLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSB0aGUgU2NhcGVTY2VuZSB0aGF0IHdpbGwgYmUgZGlzcGxheWluZ1xuICogdGhpcyBTY2FwZUZpZWxkLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5idWlsZEJsb2NrcyA9IGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdmFyIG1pblogPSB0aGlzLm1pblo7XG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYikge1xuICAgICAgICBmb3IgKHZhciBsYXllckluZGV4ID0gMDsgbGF5ZXJJbmRleCA8IGIuZy5sZW5ndGg7IGxheWVySW5kZXgrKykge1xuICAgICAgICAgICAgYi5nW2xheWVySW5kZXhdLmNodW5rID0gbmV3IFNjYXBlQ2h1bmsoXG4gICAgICAgICAgICAgICAgc2NlbmUsIGIsIGxheWVySW5kZXgsIG1pblpcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBkbyB0aGlzIHRvIGFkanVzdCBhbGwgdGhlIGNodW5rIGhlaWdodHNcbiAgICB0aGlzLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYnVpbGRzIGl0ZW0gbWVzaGVzIGZvciBkaXNwbGF5IGluIHRoZSBwcm92aWRlZCBzY2VuZS4gIFRoaXMgaXNcbiAqIGdlbmVyYWxseSBjYWxsZWQgYnkgdGhlIFNjYXBlU2NlbmUgb2JqZWN0IHdoZW4geW91IGdpdmUgaXQgYVxuICogU2NhcGVGaWVsZCwgc28geW91IHdvbid0IG5lZWQgdG8gY2FsbCBpdCB5b3Vyc2VsZi5cbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgdGhlIFNjYXBlU2NlbmUgdGhhdCB3aWxsIGJlIGRpc3BsYXlpbmdcbiAqIHRoaXMgU2NhcGVGaWVsZC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYnVpbGRJdGVtcyA9IGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdmFyIG1pblogPSB0aGlzLm1pblo7XG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYikge1xuICAgICAgICBmb3IgKHZhciBpdGVtSW5kZXggPSAwOyBpdGVtSW5kZXggPCBiLmkubGVuZ3RoOyBpdGVtSW5kZXgrKykge1xuICAgICAgICAgICAgYi5pW2l0ZW1JbmRleF0uYWRkVG9TY2VuZShzY2VuZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9pdGVtcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaXRlbUxpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHRoZUl0ZW0gPSBpdGVtTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRJdGVtKHRoZUl0ZW0pO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbSA9IGZ1bmN0aW9uKGl0ZW0pIHtcblxuICAgIC8vIGFkZCB0byB0aGUgcGFyZW50IGJsb2NrXG4gICAgdmFyIHBhcmVudEJsb2NrID0gdGhpcy5nZXRCbG9jayhpdGVtLngsIGl0ZW0ueSk7XG4gICAgcGFyZW50QmxvY2suaS5wdXNoKGl0ZW0pO1xuXG4gICAgLy8gc2V0IGl0ZW0gaGVpZ2h0IHRvIHRoZSBwYXJlbnQgYmxvY2sncyBncm91bmQgaGVpZ2h0XG4gICAgaXRlbS5zZXRIZWlnaHQocGFyZW50QmxvY2suZ1swXS56KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zT2ZUeXBlID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9pdGVtcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaXRlbUxpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHRoZUl0ZW0gPSBpdGVtTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRJdGVtT2ZUeXBlKHRoZUl0ZW0udHlwZSwgdGhlSXRlbS54LCB0aGVJdGVtLnksIHRoZUl0ZW0pO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbU9mVHlwZSA9IGZ1bmN0aW9uKGl0ZW1UeXBlLCB4LCB5LCBvcHRpb25zKSB7XG5cbiAgICAvLyBtYWtlIHRoZSBpdGVtXG4gICAgdmFyIGl0ZW0gPSBuZXcgU2NhcGVJdGVtKGl0ZW1UeXBlLCB4LCB5LCBvcHRpb25zKTtcblxuICAgIC8vIGFkZCB0byB0aGUgcGFyZW50IGJsb2NrXG4gICAgdmFyIHBhcmVudEJsb2NrID0gdGhpcy5nZXRCbG9jayh4LCB5KTtcbiAgICBwYXJlbnRCbG9jay5pLnB1c2goaXRlbSk7XG5cbiAgICAvLyBzZXQgaXRlbSBoZWlnaHQgdG8gdGhlIHBhcmVudCBibG9jaydzIGdyb3VuZCBoZWlnaHRcbiAgICBpdGVtLnNldEhlaWdodChwYXJlbnRCbG9jay5nWzBdLnopO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgY2xhaW1zIG9mIHRoZSBncm91bmQgaGVpZ2h0IGF0IHZhcmlvdXMgcG9pbnRzLlxuICogVW5saWtlIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LCB0aGlzXG4gKiBtZXRob2Qgd2lsbCByZS1leHRyYXBvbGF0ZSBncm91bmQgaGVpZ2h0cyBhY3Jvc3MgdGhlIEZpZWxkIChzb1xuICogeW91IGRvbid0IG5lZWQgdG8gY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IHlvdXJzZWxmKS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBoZWlnaHRMaXN0IEEgbGlzdCBvZiBvYmplY3RzLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgemAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oaGVpZ2h0TGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGhlaWdodExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gaGVpZ2h0TGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRIZWlnaHQocHQueCwgcHQueSwgcHQueik7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBjbGFpbSB0aGF0IHRoZSBncm91bmQgaGVpZ2h0IGlzIGB6YCBhdCBwb2ludCBgeGAsYHlgLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gZXZlbnR1YWxseSBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30gYWZ0ZXIgc29cbiAqIGdyb3VuZCBoZWlnaHRzIGdldCBleHRyYXBvbGF0ZWQgYWNyb3NzIHRoZSBlbnRpcmUgRmllbGQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFkgY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgaGVpZ2h0IG9mIHRoZSBncm91bmQgYXQgcG9zaXRpb24gYHhgLGB5YFxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5wdXNoKHsgeDogeCwgeTogeSwgejogeiB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYWRkaXRpb25hbCBncm91bmQgc3RhY2tzIHRvIHRoZSBmaWVsZCdzIGdyb3VuZCBzdGFja3MuXG4gKiBUaGUgZ3JvdW5kTGlzdCBpcyBhbiBhcnJheSBvZiBkYXRhIG9iamVjdHMuICBFYWNoIG9iamVjdCBuZWVkcyB4LFxuICogeSBhbmQgeiBwcm9wZXJ0aWVzLCBhbmQgYSAnc3RhY2snIHByb3BlcnR5LCBlYWNoIG1hdGNoaW5nIHRoZVxuICogY29ycmVzcG9uZGluZyBhcmcgdG8gYWRkR3JvdW5kU3RhY2suXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHJlcGxhY2UgaWYgcmVwbGFjZSBpcyB0cnV0aHksIGRpc2NhcmQgZXhpc3RpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBncm91bmQgcG9pbnRzIGZpcnN0LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFja3MgPSBmdW5jdGlvbihncm91bmRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBncm91bmRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGdyb3VuZExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kU3RhY2socHQueCwgcHQueSwgcHQuc3RhY2spO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRTdGFja3MoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBncm91bmQgc3RhY2sgYXQgeCx5LCBzdGFydGluZyBhdCBoZWlnaHQgei5cbiAqIFRoZSBzdGFjayBpcyBhbiBhcnJheSBvZiB0d28tZWxlbWVudCBhcnJheXMgd2l0aCBhIE1hdGVyaWFsXG4gKiBhbmQgYSBkZXB0aCBudW1iZXIsIGxpa2UgdGhpczpcbiAqIFtcbiAqICAgICBbTWF0ZXJpYWwubGVhZkxpdHRlciwgMC4zXSxcbiAqICAgICBbTWF0ZXJpYWwuZGlydCwgMy41XSxcbiAqICAgICBbTWF0ZXJpYWwuc3RvbmUsIDRdXG4gKiBdXG4gKiBUaGF0IHB1dHMgYSBsZWFmbGl0dGVyIGxheWVyIDAuMyB1bml0cyBkZWVwIG9uIGEgMy41LXVuaXRcbiAqIGRlZXAgZGlydCBsYXllciwgd2hpY2ggaXMgb24gYSBzdG9uZSBsYXllci4gIElmIHRoZSBmaW5hbFxuICogbGF5ZXIncyBkZXB0aCBpcyB6ZXJvLCB0aGF0IGxheWVyIGlzIGFzc3VtZWQgdG8gZ28gYWxsIHRoZVxuICogd2F5IHRvIG1pblouXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBjYWxjR3JvdW5kKCkgYWZ0ZXIuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oeCwgeSwgc3RhY2spIHtcbiAgICAvLyBUT0RPOiBjaGVjayBmb3IgdmFsaWRpdHlcbiAgICB0aGlzLl9ncm91bmRTdGFja3MucHVzaCh7IHg6IHgsICB5OiB5LCAgc3RhY2s6IHN0YWNrIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBoZWlnaHQuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIGhlaWdodCBjbGFpbXMgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0uXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBmaW5kIGhlaWdodCBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgYWxsb3dpbmcgZWFjaFxuICAgICAgICAvLyBrbm93biBncm91bmQgaGVpZ2h0IHRvIFwidm90ZVwiIHVzaW5nIHRoZSBpbnZlcnNlIG9mXG4gICAgICAgIC8vIGl0J3Mgc3F1YXJlZCBkaXN0YW5jZSBmcm9tIHRoZSBjZW50cmUgb2YgdGhlIGJsb2NrLlxuICAgICAgICB2YXIgaCwgZHgsIGR5LCBkaXN0LCB2b3RlU2l6ZTtcbiAgICAgICAgdmFyIGJaID0gMDtcbiAgICAgICAgdmFyIHZvdGVzID0gMDtcbiAgICAgICAgZm9yICh2YXIgZ2g9MDsgZ2ggPCB0aGlzLl9ncm91bmRIZWlnaHRzLmxlbmd0aDsgZ2grKykge1xuICAgICAgICAgICAgaCA9IHRoaXMuX2dyb3VuZEhlaWdodHNbZ2hdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIGgueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBoLnk7XG4gICAgICAgICAgICBkaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICB2b3RlU2l6ZSA9IDEgLyBkaXN0O1xuICAgICAgICAgICAgYlogKz0gaC56ICogdm90ZVNpemU7XG4gICAgICAgICAgICB2b3RlcyArPSB2b3RlU2l6ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgZGl2aWRlIHRvIGZpbmQgdGhlIGF2ZXJhZ2VcbiAgICAgICAgYlogPSBiWiAvIHZvdGVzO1xuXG4gICAgICAgIC8vIGJsb2NrLWlzaCBoZWlnaHRzOiByb3VuZCB0byB0aGUgbmVhcmVzdCBfYlpcbiAgICAgICAgdmFyIGRpZmZaID0gYlogLSB0aGlzLm1pblo7XG4gICAgICAgIGJaID0gdGhpcy5taW5aICsgTWF0aC5yb3VuZChkaWZmWiAvIHRoaXMuX2JaKSAqIHRoaXMuX2JaO1xuXG4gICAgICAgIC8vIG9rYXkgbm93IHdlIGtub3cgYSBoZWlnaHQhICBzZXQgaXRcbiAgICAgICAgdGhpcy5zZXRCbG9ja0hlaWdodChibG9jaywgYlopO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIHN0YWNrcy4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgc3RhY2tzIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZFN0YWNrIGFkZEdyb3VuZFN0YWNrfS5cbiAqXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRTdGFja3MgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIG1ha2UgdGhlIHN0YWNrIGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBjb3B5aW5nIHRoZVxuICAgICAgICAvLyBuZWFyZXN0IGRlZmluZWQgc3RhY2suXG4gICAgICAgIHZhciBzLCBkeCwgZHksIHRoaXNEaXN0LCBiZXN0U3RhY2s7XG4gICAgICAgIHZhciBiZXN0RGlzdCA9IHRoaXMud1ggKyB0aGlzLndZICsgdGhpcy53WjtcbiAgICAgICAgYmVzdERpc3QgPSBiZXN0RGlzdCAqIGJlc3REaXN0O1xuICAgICAgICBmb3IgKHZhciBncz0wOyBncyA8IHRoaXMuX2dyb3VuZFN0YWNrcy5sZW5ndGg7IGdzKyspIHtcbiAgICAgICAgICAgIHMgPSB0aGlzLl9ncm91bmRTdGFja3NbZ3NdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIHMueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBzLnk7XG4gICAgICAgICAgICB0aGlzRGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgaWYgKHRoaXNEaXN0IDwgYmVzdERpc3QpIHtcbiAgICAgICAgICAgICAgICBiZXN0U3RhY2sgPSBzO1xuICAgICAgICAgICAgICAgIGJlc3REaXN0ID0gdGhpc0Rpc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBva2F5IHdlIGdvdCBhIHN0YWNrLlxuICAgICAgICB0aGlzLnNldEdyb3VuZFN0YWNrKGJsb2NrLCBiZXN0U3RhY2suc3RhY2spO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLl9jYWxjQ2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY2FsY3VsYXRlIHRoZSBjZW50cmUgb2YgdGhlIGZpZWxkIGFuZCByZWNvcmQgaXQgYXMgLmNlbnRlclxuICAgIHRoaXMuY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICh0aGlzLm1pblggKyB0aGlzLm1heFgpIC8gMixcbiAgICAgICAgKHRoaXMubWluWSArIHRoaXMubWF4WSkgLyAyLFxuICAgICAgICAodGhpcy5taW5aICsgdGhpcy5tYXhaKSAvIDJcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKGJsb2NrLCBzdGFjaykge1xuICAgIHZhciBsYXllckxldmVsID0gYmxvY2suZ1swXS56O1xuICAgIGZvciAodmFyIGxheWVyID0gMDsgbGF5ZXIgPCBzdGFjay5sZW5ndGg7IGxheWVyKyspIHtcbiAgICAgICAgYmxvY2suZ1tsYXllcl0gPSB7XG4gICAgICAgICAgICB6OiBsYXllckxldmVsLFxuICAgICAgICAgICAgZHo6IHN0YWNrW2xheWVyXVsxXSxcbiAgICAgICAgICAgIG06IHN0YWNrW2xheWVyXVswXSxcbiAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIGxheWVyTGV2ZWwgLT0gc3RhY2tbbGF5ZXJdWzFdO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5yZWJ1aWxkQ2h1bmtzID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgaWYgKGJsb2NrLmdbbF0uY2h1bmspIHtcbiAgICAgICAgICAgIGJsb2NrLmdbbF0uY2h1bmsucmVidWlsZCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRCbG9ja0hlaWdodCA9IGZ1bmN0aW9uKGJsb2NrLCB6KSB7XG4gICAgLy8gdG8gc2V0IHRoZSBibG9jayBncm91bmQgaGVpZ2h0LCB3ZSBuZWVkIHRvIGZpbmQgdGhlIGJsb2NrJ3NcbiAgICAvLyBjdXJyZW50IGdyb3VuZCBoZWlnaHQgKHRoZSB6IG9mIHRoZSB0b3AgbGF5ZXIpLCB3b3JrIG91dCBhXG4gICAgLy8gZGlmZiBiZXR3ZWVuIHRoYXQgYW5kIHRoZSBuZXcgaGVpZ2h0LCBhbmQgYWRkIHRoYXQgZGlmZiB0b1xuICAgIC8vIGFsbCB0aGUgbGF5ZXJzLlxuICAgIHZhciBkWiA9IHogLSBibG9jay5nWzBdLno7XG4gICAgdmFyIGRlcHRoO1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBibG9jay5nW2xdLnogKz0gZFo7XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmdldEJsb2NrID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIC8vIHJldHVybiB0aGUgYmxvY2sgdGhhdCBpbmNsdWRlcyAgeCx5XG4gICAgdmFyIGd4ID0gTWF0aC5mbG9vciggKHggLSB0aGlzLm1pblgpIC8gdGhpcy5fYlggKTtcbiAgICB2YXIgZ3kgPSBNYXRoLmZsb29yKCAoeSAtIHRoaXMubWluWSkgLyB0aGlzLl9iWSApO1xuICAgIHJldHVybiAodGhpcy5fZ1tneF1bZ3ldKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW52b2tlIHRoZSBjYWxsYmFjayBlYWNoIGJsb2NrIGluIHR1cm5cbi8vIGNhbGxiYWNrIHNob3VsZCBsb29rIGxpa2U6IGZ1bmN0aW9uKGVyciwgYmxvY2spIHsgLi4uIH1cbi8vIGlmIGVyciBpcyBudWxsIGV2ZXJ5dGhpbmcgaXMgZmluZS4gaWYgZXJyIGlzIG5vdCBudWxsLCB0aGVyZVxuLy8gd2FzIGFuIGVycm9yLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZWFjaEJsb2NrID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcsIG9yZGVyKSB7XG4gICAgaWYgKG9yZGVyID09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcmRlciA9ICd4dXAteXVwJztcbiAgICB9XG4gICAgaWYgKHRoaXNBcmcgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAob3JkZXIgPT0gJ3h1cC15dXAnKSB7XG4gICAgICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLl9nLmxlbmd0aDsgZ3grKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuX2dbMF0ubGVuZ3RoOyBneSsrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBudWxsLCB0aGlzLl9nW2d4XVtneV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVGaWVsZDtcblxuXG5cblxuIiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5cblxuLy8gREVCVUdcbnZhciBTY2FwZUl0ZW1zID0gcmVxdWlyZSgnLi9pdGVtdHlwZXMnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGl0ZW0gdGhhdCBtaWdodCBhcHBlYXIgaW4gYSBTY2FwZS5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBtZXNoIGJhc2VkIG9uIHRoZSBsaW5rZWRcbiAqIGl0ZW0gaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGl0ZW0gd2lsbCBiZSBhZGRlZCBpbnRvXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyZW50QmxvY2sgVGhlIGJsb2NrIHRoYXQgb3ducyB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7U2NhcGVJdGVtVHlwZX0gaXRlbVR5cGUgVHlwZSBvZiB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucywgbm90IGN1cnJlbnRseSB1c2VkXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlSXRlbShpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fdHlwZSA9IGl0ZW1UeXBlO1xuICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5fcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgMCk7XG5cbiAgICAvLyBUT0RPOiBtYXliZSBoYXZlIGEgc2V0IG9mIG1lc2hlcyBmb3IgZWFjaCBzY2VuZSwgc28gYW4gaXRlbVxuICAgIC8vIGNhbiBiZSBpbiBtdWx0aXBsZSBzY2VuZXM/XG4gICAgdGhpcy5fY3JlYXRlTmV3TWVzaGVzKCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUl0ZW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVJdGVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlSXRlbTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fY3JlYXRlTmV3TWVzaGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbWVzaGVzID0gdGhpcy5fdHlwZSh0aGlzLl9vcHRzKTtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgbS5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24odXBkYXRlZE9wdGlvbnMpIHtcbiAgICB0aGlzLm1lcmdlT3B0aW9ucyh1cGRhdGVkT3B0aW9ucyk7XG4gICAgdGhpcy5fdXBkYXRlTWVzaGVzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24oeikge1xuICAgIHRoaXMuX3Bvcy5zZXRaKHopO1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBtLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5hZGRUb1NjZW5lID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgc2NlbmUuYWRkKG0pO1xuICAgIH0pO1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUucmVtb3ZlRnJvbVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3NjZW5lKSB7XG4gICAgICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICAgICAgdGhpcy5fc2NlbmUucmVtb3ZlKG0pO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgdGhpcy5fc2NlbmUgPSBudWxsO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fdXBkYXRlTWVzaGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjZW5lID0gdGhpcy5fc2NlbmU7IC8vIHJlbWVtYmVyIHRoaXMgYmVjYXVzZSByZW1vdmVGcm9tU2NlbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2lsbCBkZWxldGUgdGhpcy5fc2NlbmVcbiAgICBpZiAodGhpcy5fc2NlbmUpIHsgdGhpcy5yZW1vdmVGcm9tU2NlbmUodGhpcy5fc2NlbmUpOyB9XG4gICAgdGhpcy5fY3JlYXRlTmV3TWVzaGVzKCk7XG4gICAgaWYgKHNjZW5lKSB7IHRoaXMuYWRkVG9TY2VuZShzY2VuZSk7IH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZG8gc29tZXRoaW5nIHRvIGVhY2ggbWVzaFxuU2NhcGVJdGVtLnByb3RvdHlwZS5lYWNoTWVzaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcykge1xuICAgICAgICBmb3IgKHZhciBtID0gMDsgbSA8IHRoaXMuX21lc2hlcy5sZW5ndGg7IG0rKykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLl9tZXNoZXNbbV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlSXRlbTtcbiIsIlxuLyoqXG4gKiBBIGJhZyBvZiBpdGVtIHR5cGVzIC0tIGkuZS4gVEhSRUUuR2VvbWV0cnlzIC0tIHRoYXQgc2NhcGVzIGNhbiBoYXZlIGluIHRoZW0uXG4gKlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgU2NhcGVJdGVtcyA9IHtcbiAgICAvLyBkb2N1bWVudGF0aW9uIGZvciBpdGVtcyBhcmUgaW4gdGhlIC4vaXRlbXR5cGVzLyogZmlsZXNcbiAgICBjdWJlOiAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvY3ViZScpLFxuICAgIHRyZWU6ICByZXF1aXJlKCcuL2l0ZW10eXBlcy90cmVlJyksXG4gICAgY3JhbmU6IHJlcXVpcmUoJy4vaXRlbXR5cGVzL2NyYW5lJylcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVJdGVtcztcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbnZhciBNNCA9IFRIUkVFLk1hdHJpeDQ7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIG1lc2ggYXJyYXkgZm9yIGEgdG93ZXIgY3JhbmUuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB1c2VkIHRvIHNwZWNpZnkgcHJvcGVydGllcyBvZiB0aGUgY3JhbmUuXG5cbiAqIEBwYXJhbSB7d2lkdGh9IG9wdGlvbnMud2lkdGg9MiBXaWR0aCBvZiBjcmFuZSB0b3dlclxuICogQHBhcmFtIHtoZWlnaHR9IG9wdGlvbnMuaGVpZ2h0PTUwIEhlaWdodCBvZiBjcmFuZSB0b3dlclxuICogQHBhcmFtIHtsZW5ndGh9IG9wdGlvbnMubGVuZ3RoPTQwIExlbmd0aCBvZiBjcmFuZSBib29tLCBmcm9tIHRoZVxuICogICAgICAgIGNyYW5lJ3MgY2VudHJlIGF4aXMgdG8gdGhlIHRpcFxuICogQHBhcmFtIHtyb3RhdGlvbn0gb3B0aW9ucy5yb3RhdGlvbj0wIERlZ3JlZXMgb2YgYm9vbSByb3RhdGlvbixcbiAqICAgICAgICBjb3VudGVkIGNsb2Nrd2lzZSBmcm9tIHRoZSArdmUgWSBkaXJlY3Rpb24gKGF3YXkgZnJvbVxuICogICAgICAgIHRoZSBjYW1lcmEpXG4gKiBAcGFyYW0ge2NvdW50ZXJ3ZWlnaHRMZW5ndGh9IG9wdGlvbnMuY291bnRlcndlaWdodExlbmd0aD1sZW5ndGgvNFxuICogICAgICAgIExlbmd0aCBvZiB0aGUgY291bnRlcndlaWdodCBib29tLCBmcm9tIHRoZSBjcmFuZSdzIGNlbnRyZVxuICogICAgICAgIGF4aXMgdG8gdGhlIGVuZCBvZiB0aGUgY291bnRlcndlaWdodFxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5zdHJ1dHM9U2NhcGVTdHVmZi5nbG9zc0JsYWNrXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSBzdHJ1dHMgaW4gdGhlIHRvd2VyIGFuZCBib29tIG91dCBvZlxuICAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMuYmFzZT1TY2FwZVN0dWZmLmNvbmNyZXRlXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSBiYXNlIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5yaW5nPVNjYXBlU3R1ZmYucGxhc3RpY1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgcmluZyBhdCB0aGUgdG9wIG9mIHRoZSB0b3dlciBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMuY2FiaW49U2NhcGVTdHVmZi5wbGFzdGljXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSBjYWJpbiBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMud2luZG93PVNjYXBlU3R1ZmYuZ2xhc3NcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNhYmluIHdpbmRvdyBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMuY291bnRlcndlaWdodD1TY2FwZVN0dWZmLmNvbmNyZXRlXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSBjb3VudGVyd2VpZ2h0IG91dCBvZlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5jcmFuZVxuICovXG5mdW5jdGlvbiBTY2FwZUNyYW5lRmFjdG9yeShvcHRpb25zKSB7XG5cblx0dmFyIGNyYW5lUGFydHMgPSBbXTtcblxuXHR2YXIgdG93ZXJXaWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMjtcblx0dmFyIGhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDUwO1xuXHR2YXIgbGVuZ3RoID0gb3B0aW9ucy5sZW5ndGggfHwgNDA7XG5cdHZhciBjb3VudGVyd2VpZ2h0TGVuZ3RoID0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0TGVuZ3RoIHx8IChsZW5ndGggLyA0KTtcblx0dmFyIHN0cnV0U3R1ZmYgPSBvcHRpb25zLnN0cnV0cyB8fCBTY2FwZVN0dWZmLmdsb3NzQmxhY2s7XG5cdHZhciBiYXNlU3R1ZmYgPSBvcHRpb25zLmJhc2UgfHwgU2NhcGVTdHVmZi5jb25jcmV0ZTtcblx0dmFyIHJpbmdTdHVmZiA9IG9wdGlvbnMucmluZyB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cdHZhciBjYWJpblN0dWZmID0gb3B0aW9ucy5jYWJpbiB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cdHZhciB3aW5kb3dTdHVmZiA9IG9wdGlvbnMud2luZG93IHx8IFNjYXBlU3R1ZmYuZ2xhc3M7XG5cdHZhciBjb3VudGVyd2VpZ2h0U3R1ZmYgPSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHQgfHwgU2NhcGVTdHVmZi5jb25jcmV0ZTtcblx0dmFyIHJvdGF0aW9uID0gLTEgKiAob3B0aW9ucy5yb3RhdGlvbiB8fCAwKSAqIE1hdGguUEkgLyAxODA7XG5cblx0dmFyIHRvd2VySGVpZ2h0ID0gaGVpZ2h0O1xuXHR2YXIgYmFzZVcgPSB0b3dlcldpZHRoICogMztcblx0dmFyIGJhc2VIID0gdG93ZXJXaWR0aCAqIDI7IC8vIGhhbGYgb2YgdGhlIGhlaWdodCB3aWxsIGJlIFwidW5kZXJncm91bmRcIlxuXG5cdHZhciBwb2xlUiA9IHRvd2VyV2lkdGggLyAxMDtcblxuXHR2YXIgcmluZ1IgPSAoKHRvd2VyV2lkdGggLyAyKSAqIE1hdGguU1FSVDIpICsgMS4zICogcG9sZVI7XG5cdHZhciByaW5nSCA9IHRvd2VyV2lkdGggLyA1O1xuXG5cdHZhciBib29tTCA9IGxlbmd0aDsgLy8gbGVuZ3RoIG9mIGNyYW5lIGJvb21cblx0dmFyIGN3YkwgPSBjb3VudGVyd2VpZ2h0TGVuZ3RoOyAvLyBsZW5ndGggb2YgY291bnRlcndlaWdodCBib29tXG5cdHZhciByb2RMID0gYm9vbUwgKyBjd2JMO1xuXHR2YXIgY3dXID0gdG93ZXJXaWR0aCAtIDMqcG9sZVI7XG5cdHZhciBjd0ggPSB0b3dlcldpZHRoICogMS41O1xuXHR2YXIgY3dMID0gdG93ZXJXaWR0aCAqIDEuNTtcblxuXHR2YXIgY2FiaW5XID0gdG93ZXJXaWR0aDtcblx0dmFyIGNhYmluSCA9IHRvd2VyV2lkdGggKiAxLjI1O1xuXHR2YXIgY2FiaW5MID0gY2FiaW5IO1xuXG5cdC8vIHRoaXMgaXMgZm9yIHJvdGF0aW5nIHRoZSBjcmFuZSBib29tXG5cdHZhciByb3RhdGUgPSBuZXcgTTQoKS5tYWtlUm90YXRpb25aKHJvdGF0aW9uKTtcblxuXHQvLyB0aGlzIGlzIGZvciBtYWtpbmcgY3lsaW5kZXJzIGdvIHVwcmlnaHQgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciBjeWxpbmRlclJvdGF0ZSA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLy8vLy8vLy8vIHRoZSBiYXNlXG5cdHZhciBiYXNlR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShiYXNlVywgYmFzZVcsIGJhc2VIKTtcblx0dmFyIGJhc2UgPSBuZXcgVEhSRUUuTWVzaChiYXNlR2VvbSwgYmFzZVN0dWZmKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKGJhc2UpO1xuXG5cdC8vLy8vLy8vLy8gdGhlIHZlcnRpY2FsIG1hc3Rcblx0Ly8gbWFrZSBvbmUgcG9sZSB0byBzdGFydCB3aXRoXG5cdHZhciBwb2xlR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KHBvbGVSLCBwb2xlUiwgdG93ZXJIZWlnaHQpO1xuXHRwb2xlR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24odG93ZXJXaWR0aC8yLCB0b3dlcldpZHRoLzIsIHRvd2VySGVpZ2h0LzIpLm11bHRpcGx5KGN5bGluZGVyUm90YXRlKSk7XG5cblx0Ly8gTWFrZSB0aHJlZSBtb3JlIHBvbGVzIGJ5IGNvcHlpbmcgdGhlIGZpcnN0IHBvbGUgYW5kIHJvdGF0aW5nIGFub3RoZXIgOTBkZWdzIGFyb3VuZCB0aGUgY2VudHJlXG5cdHZhciBwb2xlO1xuXHR2YXIgcm90YXRlQXJvdW5kWiA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblooTWF0aC5QSS8yKTtcblx0Zm9yICh2YXIgcCA9IDA7IHAgPCA0OyBwKyspIHtcblx0XHRwb2xlID0gbmV3IFRIUkVFLk1lc2gocG9sZUdlb20sIHN0cnV0U3R1ZmYpO1xuXHRcdGNyYW5lUGFydHMucHVzaChwb2xlKTtcblx0XHRwb2xlR2VvbSA9IHBvbGVHZW9tLmNsb25lKCk7XG5cdFx0cG9sZUdlb20uYXBwbHlNYXRyaXgocm90YXRlQXJvdW5kWik7XG5cdH1cblxuXG5cdC8vLy8vLy8vLy8gdGhlIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgdG93ZXJcblx0dmFyIHJpbmdHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkocmluZ1IsIHJpbmdSLCByaW5nSCwgMTIsIDEsIHRydWUpO1xuXHRyaW5nR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgdG93ZXJIZWlnaHQgLSByaW5nSC8yKS5tdWx0aXBseShjeWxpbmRlclJvdGF0ZSkpO1xuXHRyaW5nU3R1ZmYuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaChyaW5nR2VvbSwgcmluZ1N0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIHRoZSBob3Jpem9udGFsIGJvb21cblx0Ly8gbWFrZSBvbmUgcm9kIHRvIHN0YXJ0IHdpdGhcblx0dmFyIHRvcFJvZEdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShwb2xlUiwgcG9sZVIsIHJvZEwpO1xuXG5cdC8vIHRvcCByb2Rcblx0dG9wUm9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgKHJvZEwvMikgLSBjd2JMLCB0b3dlckhlaWdodCArIHBvbGVSICsgMC41ICogdG93ZXJXaWR0aCkpO1xuXHRsZWZ0Um9kR2VvbSA9IHRvcFJvZEdlb20uY2xvbmUoKTtcblx0cmlnaHRSb2RHZW9tID0gdG9wUm9kR2VvbS5jbG9uZSgpO1xuXG5cdHRvcFJvZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKHRvcFJvZEdlb20sIHN0cnV0U3R1ZmYpKTtcblxuXHQvLyBib3R0b20gbGVmdCByb2Rcblx0bGVmdFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKC0wLjUgKiB0b3dlcldpZHRoICsgcG9sZVIsIDAsIC0wLjUgKiB0b3dlcldpZHRoKSk7XG5cdGxlZnRSb2RHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaChsZWZ0Um9kR2VvbSwgc3RydXRTdHVmZikpO1xuXG5cdC8vIGJvdHRvbSByaWdodCByb2Rcblx0cmlnaHRSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLjUgKiB0b3dlcldpZHRoIC0gcG9sZVIsIDAsIC0wLjUgKiB0b3dlcldpZHRoKSk7XG5cdHJpZ2h0Um9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2gocmlnaHRSb2RHZW9tLCBzdHJ1dFN0dWZmKSk7XG5cblx0Ly8gZW5kIG9mIHRoZSBib29tXG5cdHZhciBlbmRHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHRvd2VyV2lkdGgsIHBvbGVSLCAwLjUgKiB0b3dlcldpZHRoICsgcG9sZVIgKyBwb2xlUik7XG5cdGVuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIGJvb21MLCB0b3dlckhlaWdodCArIDAuMjUgKiB0b3dlcldpZHRoICsgcG9sZVIpKTtcblx0ZW5kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2goZW5kR2VvbSwgc3RydXRTdHVmZikpO1xuXG5cblx0Ly8vLy8vLy8vLyBjb3VudGVyd2VpZ2h0XG5cdHZhciBjd0dlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoY3dXLCBjd0wsIGN3SCk7XG5cdGN3R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMS4wMDEgKiAoY3dMLzIgLSBjd2JMKSwgdG93ZXJIZWlnaHQpKTtcblx0Y3dHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaChjd0dlb20sIGNvdW50ZXJ3ZWlnaHRTdHVmZikpO1xuXG5cblx0Ly8vLy8vLy8vLyBjYWJpblxuXHR2YXIgY2FiaW5HZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGNhYmluVywgY2FiaW5MLCBjYWJpbkgpO1xuXHR2YXIgd2luZG93R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShjYWJpblcgKiAxLjEsIGNhYmluTCAqIDAuNiwgY2FiaW5IICogMC42KTtcblx0Y2FiaW5HZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihjYWJpblcvMiArIHBvbGVSLCAwLCBjYWJpbkgvMiArIHRvd2VySGVpZ2h0ICsgcG9sZVIgKyBwb2xlUikpO1xuXHR3aW5kb3dHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihjYWJpblcvMiArIHBvbGVSLCBjYWJpbkwgKiAwLjI1LCBjYWJpbkggKiAwLjYgKyB0b3dlckhlaWdodCArIHBvbGVSICsgcG9sZVIpKTtcblx0Y2FiaW5HZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdHdpbmRvd0dlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKGNhYmluR2VvbSwgY2FiaW5TdHVmZikpO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2god2luZG93R2VvbSwgd2luZG93U3R1ZmYpKTtcblxuXHQvLyByZXR1cm4gYWxsIHRoZSBjcmFuZSBiaXRzLlxuXHRyZXR1cm4gY3JhbmVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDcmFuZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBjdWJlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBtYXRlcmlhbC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFRoZSBsZW5ndGggb2YgYSBzaWRlIG9mIHRoZSBjdWJlLiAgRGVmYXVsdHMgdG8gMS5cbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG1hdGVyaWFsIFdoYXQgdGhlIG1ha2UgdGhlIGN1YmUgb3V0IG9mLiAgRGVmYXVsdHMgdG8gYFNjYXBlLlN0dWZmLmdlbmVyaWNgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBOb3QgdXNlZC5cbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY3ViZVxuICovXG5mdW5jdGlvbiBTY2FwZUN1YmVGYWN0b3J5KHNpemUsIG1hdGVyaWFsLCBvcHRpb25zKSB7XG4gICAgLy8gY29uc3RydWN0IGEgbWVzaCBcInNpdHRpbmcgb25cIiB0aGUgcG9pbnQgMCwwLDBcblxuICAgIHNpemUgPSBzaXplIHx8IDE7XG4gICAgbWF0ZXJpYWwgPSBtYXRlcmlhbCB8fCBTY2FwZVN0dWZmLmdlbmVyaWM7XG5cbiAgICAvLyBtYWtlcyBhIGN1YmUgY2VudGVyZWQgb24gMCwwLDBcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzaXplLCBzaXplLCBzaXplKTtcblxuICAgIC8vIHRyYW5zZm9ybSBpdCB1cCBhIGJpdCwgc28gd2UncmUgY2VudGVyZWQgb24geCA9IDAgYW5kIHkgPSAwLCBidXQgaGF2ZSB0aGUgX2JvdHRvbV8gZmFjZSBzaXR0aW5nIG9uIHogPSAwLlxuICAgIGdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIHNpemUvMikgKTtcblxuICAgIC8vIHJldHVybiBhIHRoaW5nIHdpdGggdGhhdCBnZW9tZXRyeSwgbWFkZSBvZiB0aGUgbWF0ZXJpYWxcbiAgICByZXR1cm4gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0ZXJpYWwpO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUN1YmVGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgdHJlZSBtZXNoIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZSBhbmQgY29sb3IuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB1c2VkIHRvIHNwZWNpZnkgcHJvcGVydGllcyBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmRpYW1ldGVyPTEgRGlhbWV0ZXIgb2YgdHJ1bmsgKGEuay5hLiBEQkgpXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5oZWlnaHQ9MTAgSGVpZ2h0IG9mIHRyZWVcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMudHJ1bmtNYXRlcmlhbD1TY2FwZVN0dWZmLndvb2QgV2hhdCB0byBtYWtlIHRoZSB0cnVuayBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMubGVhZk1hdGVyaWFsPVNjYXBlU3R1ZmYuZm9saWFnZSBXaGF0IHRvIG1ha2UgdGhlIGZvbGlhZ2Ugb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnRyZWVcbiAqL1xuZnVuY3Rpb24gU2NhcGVUcmVlRmFjdG9yeShvcHRpb25zKSB7XG5cblx0dmFyIGRpYW0gPSBvcHRpb25zLmRpYW1ldGVyIHx8IDE7XG5cdHZhciBoZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAxMDtcblx0dmFyIHRydW5rU3R1ZmYgPSBvcHRpb25zLnRydW5rIHx8IFNjYXBlU3R1ZmYud29vZDtcblx0dmFyIGNhbm9weVN0dWZmID0gb3B0aW9ucy5jYW5vcHkgfHwgU2NhcGVTdHVmZi5mb2xpYWdlO1xuXG5cdHZhciBjYW5vcHlIZWlnaHQgPSBoZWlnaHQgLyA0O1xuXHR2YXIgdHJlZUhlaWdodCA9IGhlaWdodCAtIGNhbm9weUhlaWdodDtcblx0dmFyIHRyZWVSYWRpdXMgPSAyICogZGlhbSAvIDI7XG5cdHZhciBjYW5vcHlSYWRpdXMgPSB0cmVlUmFkaXVzICogNjtcblxuXHR2YXIgdHJ1bmtHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkodHJlZVJhZGl1cy8yLCB0cmVlUmFkaXVzLCB0cmVlSGVpZ2h0LCAxMik7XG5cdHZhciBjYW5vcHlHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoY2Fub3B5UmFkaXVzLCBjYW5vcHlSYWRpdXMsIGNhbm9weUhlaWdodCwgMTIpO1xuXG5cdC8vIHRyYW5zZm9ybXMgd2UgbmVlZDpcblx0Ly8gcm90YXRlIHNvIGl0J3MgaGVpZ2h0IGlzIGFsb25nIHRoZSBaIGF4aXMgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLyBjZW50ZXIgb24geCA9IDAgYW5kIHkgPSAwLCBidXQgaGF2ZSB0aGUgX2JvdHRvbV8gZmFjZSBzaXR0aW5nIG9uIHogPSAwXG5cdHZhciB0cnVua1Bvc2l0aW9uID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgdHJlZUhlaWdodC8yKTtcblxuXHQvLyBjZW50ZXIgb24geCA9IDAsIHkgPSAwLCBidXQgaGF2ZSB0aGUgY2Fub3B5IGF0IHRoZSB0b3Bcblx0dmFyIGNhbm9weVBvc2l0aW9uID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgY2Fub3B5SGVpZ2h0LzIgKyBoZWlnaHQgLSBjYW5vcHlIZWlnaHQpO1xuXG5cdHRydW5rR2VvbS5hcHBseU1hdHJpeCh0cnVua1Bvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHRjYW5vcHlHZW9tLmFwcGx5TWF0cml4KGNhbm9weVBvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXG5cdHZhciB0cnVuayA9IG5ldyBUSFJFRS5NZXNoKHRydW5rR2VvbSwgdHJ1bmtTdHVmZik7XG5cdC8vIHZhciBjYW5vcHkgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZChjYW5vcHlHZW9tLCBjYW5vcHlTdHVmZik7XG5cdHZhciBjYW5vcHkgPSBuZXcgVEhSRUUuTWVzaChjYW5vcHlHZW9tLCBjYW5vcHlTdHVmZik7XG5cdHJldHVybiBbdHJ1bmssIGNhbm9weV07XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlVHJlZUZhY3Rvcnk7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVDaHVuayA9IHJlcXVpcmUoJy4vY2h1bmsnKTtcblxuXG4vLyBERUJVR1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAY2FsbGJhY2sgU2NhcGVTY2VuZX5kYXRlQ2hhbmdlXG4gKiBAcGFyYW0ge3N0cmluZ30gZXJyb3IgRGVzY3JpcHRpb24gb2YgZXJyb3IsIG90aGVyd2lzZSBudWxsXG4gKiBAcGFyYW0ge2RhdGV9IGRhdGUgRGF0ZSB0aGUgc2NhcGUgaXMgbm93IGRpc3BsYXlpbmdcbiAqL1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIG9mIGEgbGFuZHNjYXBlIC8gbW9vbnNjYXBlIC8gd2hhdGV2ZXJcbiAqIEBwYXJhbSB7U2NhcGVGaWVsZH0gZmllbGQgIHRoZSBmaWVsZCBiZWluZyByZW5kZXJlZFxuICogQHBhcmFtIHtzdHJpbmd9IGRvbSAgICAgICAgRE9NIGVsZW1lbnQgdGhlIHNjYXBlIHNob3VsZCBiZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWQgaW50by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICAgIGNvbGxlY3Rpb24gb2Ygb3B0aW9ucy4gIEFsbCBhcmUgb3B0aW9uYWwuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmxpZ2h0cz0nc3VuJywnc2t5JyAtIGFycmF5IG9mIHN0cmluZ3NcbiAqIG5hbWluZyBsaWdodHMgdG8gaW5jbHVkZSBpbiB0aGlzIHNjZW5lLiAgQ2hvb3NlIGZyb206XG4gKlxuICogc3RyaW5nICAgIHwgbGlnaHQgdHlwZVxuICogLS0tLS0tLS0tLXwtLS0tLS0tLS0tLVxuICogYHRvcGxlZnRgIHwgYSBsaWdodCBmcm9tIGFib3ZlIHRoZSBjYW1lcmEncyBsZWZ0IHNob3VsZGVyXG4gKiBgYW1iaWVudGAgfCBhIGRpbSBhbWJpZW50IGxpZ2h0XG4gKiBgc3VuYCAgICAgfCBhIGRpcmVjdGlvbmFsIGxpZ2h0IHRoYXQgb3JiaXRzIHRoZSBzY2VuZSBvbmNlIHBlciBkYXlcbiAqIGBza3lgICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBzaGluZXMgZnJvbSBhYm92ZSB0aGUgc2NlbmVcbiAqIEBwYXJhbSB7RGF0ZXxcIm5vd1wifSBvcHRpb25zLmN1cnJlbnREYXRlPSdub3cnIC0gVGhlIHRpbWUgYW5kIGRhdGVcbiAqIGluc2lkZSB0aGUgc2NhcGUuICBUaGUgc3RyaW5nIFwibm93XCIgbWVhbnMgc2V0IGN1cnJlbnREYXRlIHRvIHRoZVxuICogcHJlc2VudC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnRpbWVSYXRpbz0xIFRoZSByYXRlIHRpbWUgc2hvdWxkIHBhc3MgaW5cbiAqIHRoZSBzY2FwZSwgcmVsYXRpdmUgdG8gbm9ybWFsLiAgMC4xIG1lYW5zIHRlbiB0aW1lcyBzbG93ZXIuICA2MFxuICogbWVhbnMgb25lIG1pbnV0ZSByZWFsIHRpbWUgPSBvbmUgaG91ciBzY2FwZSB0aW1lLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfmRhdGVDaGFuZ2V9IG9wdGlvbnMuZGF0ZVVwZGF0ZSBjYWxsYmFjayBmb3JcbiAqIHdoZW4gdGhlIHNjZW5lIHRpbWUgY2hhbmdlcyAod2hpY2ggaXMgYSBsb3QpLlxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZVNjZW5lKGZpZWxkLCBkb20sIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgLy8gbGlnaHRzOiBbJ3RvcGxlZnQnLCAnYW1iaWVudCddLFxuICAgICAgICBsaWdodHM6IFsnc3VuJywgJ3NreSddLFxuICAgICAgICBjdXJyZW50RGF0ZTogJ25vdycsICAvLyBlaXRoZXIgc3RyaW5nICdub3cnIG9yIGEgRGF0ZSBvYmplY3RcbiAgICAgICAgdGltZVJhdGlvOiAxLFxuICAgICAgICBkYXRlVXBkYXRlOiBudWxsIC8vIGNhbGxiYWNrIHRvdXBkYXRlIHRoZSBkaXNwbGF5ZWQgZGF0ZS90aW1lXG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIHNhdmUgdGhlIGZpZWxkXG4gICAgdGhpcy5mID0gZmllbGQ7XG5cbiAgICAvLyBkaXNjb3ZlciBET00gY29udGFpbmVyXG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZG9tKTtcblxuICAgIHRoaXMuZGF0ZSA9IHRoaXMuX29wdHMuY3VycmVudERhdGU7XG4gICAgaWYgKHRoaXMuZGF0ZSA9PT0gJ25vdycpIHtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5zdGFydERhdGUgPSB0aGlzLmRhdGU7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgLy8gY3JlYXRlIGFuZCBzYXZlIGFsbCB0aGUgYml0cyB3ZSBuZWVkXG4gICAgdGhpcy5yZW5kZXJlciA9IHRoaXMuX21ha2VSZW5kZXJlcih7IGRvbTogdGhpcy5lbGVtZW50IH0pO1xuICAgIHRoaXMuc2NlbmUgPSB0aGlzLl9tYWtlU2NlbmUoKTtcbiAgICB0aGlzLmNhbWVyYSA9IHRoaXMuX21ha2VDYW1lcmEoKTtcbiAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy5fbWFrZUNvbnRyb2xzKCk7XG4gICAgdGhpcy5saWdodHMgPSB0aGlzLl9tYWtlTGlnaHRzKHRoaXMuX29wdHMubGlnaHRzKTtcblxuICAgIHRoaXMuY29ubmVjdEZpZWxkKCk7XG5cbiAgICAvLyBhZGQgZ3JpZHMgYW5kIGhlbHBlciBjdWJlc1xuICAgIC8vIHRoaXMuYWRkSGVscGVyR3JpZCgpO1xuICAgIHRoaXMuYWRkSGVscGVyR3JpZCgndG9wJyk7XG4gICAgdGhpcy5hZGRIZWxwZXJTaGFwZXMoKTtcblxuICAgIHZhciBsYXN0TG9nQXQgPSAwOyAvLyBERUJVR1xuICAgIHZhciByZW5kZXIgPSAoZnVuY3Rpb24gdW5ib3VuZFJlbmRlcih0cykge1xuXG4gICAgICAgIC8vIERFQlVHXG4gICAgICAgIGlmIChsYXN0TG9nQXQgKyAyMDAwIDwgdHMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcuLi4nKTtcbiAgICAgICAgICAgIGxhc3RMb2dBdCA9IHRzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gREVCVUcgZGlzYWJsZWQgdGltZSB1cGRhdGVzLi5cbiAgICAgICAgdGhpcy5fdXBkYXRlVGltZSgpO1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSggcmVuZGVyICk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKCB0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSApO1xuICAgICAgICB0aGlzLmNvbnRyb2xzLnVwZGF0ZSgpO1xuICAgIH0pLmJpbmQodGhpcyk7XG5cbiAgICByZW5kZXIoMCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZVNjZW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVTY2VuZTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUuYWRkKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUuYWRkKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiByZW1vdmUgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUucmVtb3ZlKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUucmVtb3ZlKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYmxvY2tzIGZyb20gdGhlIGF0dGFjaGVkIFNjYXBlRmllbGQgaW50byB0aGUgc2NlbmUuXG4gKlxuICogWW91IHdpbGwgcHJvYmFibHkgb25seSBuZWVkIHRvIGNhbGwgdGhpcyBvbmNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25uZWN0RmllbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmYuYnVpbGRCbG9ja3ModGhpcyk7XG4gICAgdGhpcy5mLmJ1aWxkSXRlbXModGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGhlbHBlciBjdWJlcyBhdCBzb21lIG9mIHRoZSBjb3JuZXJzIG9mIHlvdXIgc2NhcGUsIHNvIHlvdSBjYW5cbiAqIHNlZSB3aGVyZSB0aGV5IGFyZSBpbiBzcGFjZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG4gICAgdmFyIGYgPSB0aGlzLmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgoZi5taW5YICsgZi5tYXhYKSAvIDIsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWF4WSwgZi5taW5aLCBncmVlbik7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5taW5ZLCBmLm1heFosIGJsdWUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWF4WSwgZi5taW5aLCB3aGl0ZSk7XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBjdWJlIGF0IHBvc2l0aW9uIGB4YCwgYHlgLCBgemAgdG8gY29uZmlybSB3aGVyZSB0aGF0IGlzLFxuICogZXhhY3RseS4gIEdyZWF0IGZvciB0cnlpbmcgdG8gd29yayBvdXQgaWYgeW91ciBzY2FwZSBpcyBiZWluZ1xuICogcmVuZGVyZWQgd2hlcmUgeW91IHRoaW5rIGl0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqXG4gKiBAcGFyYW0geyhOdW1iZXJ8VmVjdG9yMyl9IHggWCBjb29yZGluYXRlLCBvciBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvVmVjdG9yMyBUSFJFRS5WZWN0b3IzfSBjb250YWluaW5nIHgsIHkgYW5kIHogY29vcmRzXG4gKiBAcGFyYW0ge051bWJlcn0gW3ldIFkgY29vcmRpbmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IFt6XSBaIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7Q29sb3J8U3RyaW5nfEludGVnZXJ9IGNvbG9yPScjY2NjY2NjJyBDb2xvciBvZiBjdWJlLlxuICogQ2FuIGJlIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9Db2xvciBUSFJFRS5Db2xvcn0sIGEgY29sb3ItcGFyc2VhYmxlIHN0cmluZyBsaWtlXG4gKiBgJyMzMzY2Y2MnYCwgb3IgYSBudW1iZXIgbGlrZSBgMHgzMzY2Y2NgLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJDdWJlID0gZnVuY3Rpb24oeCwgeSwgeiwgY29sb3IpIHtcbiAgICAvLyBmaXJzdCwgc2V0IHRoZSBjb2xvciB0byBzb21ldGhpbmdcbiAgICBpZiAodHlwZW9mIGNvbG9yID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgdG8gbGlnaHQgZ3JleS5cbiAgICAgICAgY29sb3IgPSBuZXcgVEhSRUUuQ29sb3IoMHhjY2NjY2MpO1xuICAgIH1cbiAgICB2YXIgcG9zOyAvLyB0aGUgcG9zaXRpb24gdG8gZHJhdyB0aGUgY3ViZVxuICAgIGlmICh0eXBlb2YgeC54ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIHRoZW4gaXQncyBhIHZlY3RvciwgYW5kIHkgbWlnaHQgYmUgdGhlIGNvbG9yXG4gICAgICAgIHBvcyA9IHg7XG4gICAgICAgIGlmICh0eXBlb2YgeSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29sb3IgPSB5O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8geCBpc24ndCBhIHZlY3Rvciwgc28gYXNzdW1lIHNlcGFyYXRlIHggeSBhbmQgelxuICAgICAgICBwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCB6KTtcbiAgICAgICAgLy8gd2UgY2F1Z2h0IGNvbG9yIGFscmVhZHkuXG4gICAgfVxuXG4gICAgLy8gYWJvdXQgYSBmaWZ0aWV0aCBvZiB0aGUgZmllbGQncyBzdW1tZWQgZGltZW5zaW9uc1xuICAgIHZhciBzaXplID0gKHRoaXMuZi53WCArIHRoaXMuZi53WSArIHRoaXMuZi53WikgLyA1MDtcbiAgICAvLyB1c2UgdGhlIGNvbG91ciB3ZSBkZWNpZGVkIGVhcmxpZXJcbiAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7IGNvbG9yOiBjb2xvciB9KTtcblxuICAgIC8vIG9rYXkuLiBtYWtlIGl0LCBwb3NpdGlvbiBpdCwgYW5kIHNob3cgaXRcbiAgICB2YXIgY3ViZSA9IFNjYXBlSXRlbXMuY3ViZShzaXplLCBtYXRlcmlhbCk7XG4gICAgY3ViZS5wb3NpdGlvbi5jb3B5KHBvcyk7XG4gICAgdGhpcy5zY2VuZS5hZGQoY3ViZSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckdyaWQgPSBmdW5jdGlvbih0b3BPckJvdHRvbSkge1xuICAgIHZhciBneiA9IDA7XG4gICAgdmFyIGdjID0gMHg0NDQ0NDQ7XG4gICAgaWYgKHRvcE9yQm90dG9tID09ICd0b3AnKSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1heFo7XG4gICAgICAgIGdjID0gMHhjY2NjZmY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWluWjtcbiAgICAgICAgZ2MgPSAweGNjZmZjYztcbiAgICB9XG5cbiAgICB2YXIgZ3JpZFcgPSBNYXRoLm1heCh0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLCB0aGlzLmYubWF4WSAtIHRoaXMuZi5taW5ZKTtcblxuICAgIC8vIEdyaWQgXCJzaXplXCIgaXMgdGhlIGRpc3RhbmNlIGluIGVhY2ggb2YgdGhlIGZvdXIgZGlyZWN0aW9ucyxcbiAgICAvLyB0aGUgZ3JpZCBzaG91bGQgc3Bhbi4gIFNvIGZvciBhIGdyaWQgVyB1bml0cyBhY3Jvc3MsIHNwZWNpZnlcbiAgICAvLyB0aGUgc2l6ZSBhcyBXLzIuXG4gICAgdmFyIGdyaWRYWSA9IG5ldyBUSFJFRS5HcmlkSGVscGVyKGdyaWRXLzIsIGdyaWRXLzEwKTtcbiAgICBncmlkWFkuc2V0Q29sb3JzKGdjLCBnYyk7XG4gICAgZ3JpZFhZLnJvdGF0aW9uLnggPSBNYXRoLlBJLzI7XG4gICAgZ3JpZFhZLnBvc2l0aW9uLnNldCh0aGlzLmYubWluWCArIGdyaWRXLzIsIHRoaXMuZi5taW5ZICsgZ3JpZFcvMiwgZ3opO1xuICAgIHRoaXMuc2NlbmUuYWRkKGdyaWRYWSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQ3JlYXRlIGFuZCByZXR1cm4gYSBUSFJFRS5SZW5kZXJlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdmFyaW91cyBvcHRpb25zXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR8alF1ZXJ5RWxlbX0gb3B0aW9ucy5kb20gYSBkb20gZWxlbWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLndpZHRoIHJlbmRlcmVyIHdpZHRoIChpbiBwaXhlbHMpXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuaGVpZ2h0IHJlbmRlcmVyIGhlaWdodCAoaW4gcGl4ZWxzKVxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlUmVuZGVyZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoeyBhbnRpYWxpYXM6IHRydWUsIGFscGhhOiB0cnVlLCBwcmVjaXNpb246IFwiaGlnaHBcIiB9KTtcbiAgICByZW5kZXJlci5zZXRDbGVhckNvbG9yKCAweDAwMDAwMCwgMCk7XG4gICAgcmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kb20pIHtcbiAgICAgICAgdmFyICRkb20gPSAkKG9wdGlvbnMuZG9tKTtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZSgkZG9tLndpZHRoKCksICRkb20uaGVpZ2h0KCkpO1xuICAgICAgICAkZG9tLmFwcGVuZChyZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy53aWR0aCAmJiBvcHRpb25zLmhlaWdodCkge1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKG9wdGlvbnMud2lkdGgsIG9wdGlvbnMuaGVpZ2h0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlbmRlcmVyO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHNjYXBlIHRpbWUgdG8gbWF0Y2ggdGhlIGN1cnJlbnQgdGltZSAodGFraW5nIGludG9cbiAqIGFjY291bnQgdGhlIHRpbWVSYXRpbyBldGMpLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVUaW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cuZ2V0VGltZSgpIC0gdGhpcy5maXJzdFJlbmRlcjtcbiAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSh0aGlzLmZpcnN0UmVuZGVyICsgKGVsYXBzZWQgKiB0aGlzLl9vcHRzLnRpbWVSYXRpbykpO1xuICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX29wdHMuZGF0ZVVwZGF0ZTtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBjYWxsYmFja0RhdGUgPSBuZXcgRGF0ZSh0aGlzLmRhdGUpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBjYWxsYmFja0RhdGUpO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlU3VuKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIHN1biB0byBzdWl0IHRoZSBzY2FwZSBjdXJyZW50IHRpbWUuXG4gKiBAcGFyYW0gIHtUSFJFRS5EaXJlY3Rpb25hbExpZ2h0fSBbc3VuXSB0aGUgc3VuIHRvIGFjdCBvbi4gIElmIG5vdFxuICogc3VwcGxpZWQsIHRoaXMgbWV0aG9kIHdpbGwgYWN0IG9uIHRoZSBsaWdodCBpbiB0aGlzIHNjZW5lJ3MgbGlnaHRcbiAqIGxpc3QgdGhhdCBpcyBjYWxsZWQgXCJzdW5cIi5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlU3VuID0gZnVuY3Rpb24oc3VuKSB7XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBpZiB0aGV5IGRpZG4ndCBwcm92aWRlIGEgc3VuLCB1c2Ugb3VyIG93blxuICAgICAgICBzdW4gPSB0aGlzLmxpZ2h0cy5zdW47XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBiYWlsIGlmIHRoZXJlJ3Mgbm8gc3VuIEFSUlJIIFdIQVQgRElEIFlPVSBET1xuICAgIH1cblxuICAgIHZhciBzdW5BbmdsZSA9ICh0aGlzLmRhdGUuZ2V0SG91cnMoKSo2MCArIHRoaXMuZGF0ZS5nZXRNaW51dGVzKCkpIC8gMTQ0MCAqIDIgKiBNYXRoLlBJO1xuICAgIHZhciBzdW5Sb3RhdGlvbkF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcblxuICAgIHN1bi5wb3NpdGlvblxuICAgICAgICAuc2V0KDAsIC0zICogdGhpcy5mLndZLCAtMjAgKiB0aGlzLmYud1opXG4gICAgICAgIC5hcHBseUF4aXNBbmdsZShzdW5Sb3RhdGlvbkF4aXMsIHN1bkFuZ2xlKVxuICAgICAgICAuYWRkKHRoaXMuZi5jZW50ZXIpO1xuXG4gICAgdmFyIHN1blogPSBzdW4ucG9zaXRpb24uejtcblxuICAgIC8vIHN3aXRjaCB0aGUgc3VuIG9mZiB3aGVuIGl0J3MgbmlnaHQgdGltZVxuICAgIGlmIChzdW4ub25seVNoYWRvdyA9PSBmYWxzZSAmJiBzdW5aIDw9IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChzdW4ub25seVNoYWRvdyA9PSB0cnVlICYmIHN1blogPiB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBmYWRlIG91dCB0aGUgc2hhZG93IGRhcmtuZXNzIHdoZW4gdGhlIHN1biBpcyBsb3dcbiAgICBpZiAoc3VuWiA+PSB0aGlzLmYuY2VudGVyLnogJiYgc3VuWiA8PSB0aGlzLmYubWF4Wikge1xuICAgICAgICB2YXIgdXBuZXNzID0gTWF0aC5tYXgoMCwgKHN1blogLSB0aGlzLmYuY2VudGVyLnopIC8gdGhpcy5mLndaICogMik7XG4gICAgICAgIHN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuNSAqIHVwbmVzcztcbiAgICAgICAgc3VuLmludGVuc2l0eSA9IHVwbmVzcztcbiAgICB9XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUxpZ2h0cyA9IGZ1bmN0aW9uKGxpZ2h0c1RvSW5jbHVkZSkge1xuXG4gICAgdmFyIGxpZ2h0cyA9IHt9O1xuICAgIHZhciBmID0gdGhpcy5mOyAgLy8gY29udmVuaWVudCByZWZlcmVuY2UgdG8gdGhlIGZpZWxkXG5cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ2FtYmllbnQnKSAhPSAtMSkge1xuICAgICAgICAvLyBhZGQgYW4gYW1iaWVudCBsaXN0XG4gICAgICAgIGxpZ2h0cy5hbWJpZW50ID0gbmV3IFRIUkVFLkFtYmllbnRMaWdodCgweDIyMjIzMyk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZigndG9wbGVmdCcpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5sZWZ0ID0gbmV3IFRIUkVFLlBvaW50TGlnaHQoMHhmZmZmZmYsIDEsIDApO1xuICAgICAgICAvLyBwb3NpdGlvbiBsaWdodCBvdmVyIHRoZSB2aWV3ZXIncyBsZWZ0IHNob3VsZGVyLi5cbiAgICAgICAgLy8gLSBMRUZUIG9mIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHggd2lkdGhcbiAgICAgICAgLy8gLSBCRUhJTkQgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeSB3aWR0aFxuICAgICAgICAvLyAtIEFCT1ZFIHRoZSBjYW1lcmEgYnkgdGhlIGZpZWxkJ3MgaGVpZ2h0XG4gICAgICAgIGxpZ2h0cy5sZWZ0LnBvc2l0aW9uLmFkZFZlY3RvcnMoXG4gICAgICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbixcbiAgICAgICAgICAgIG5ldyBUSFJFRS5WZWN0b3IzKC0wLjUgKiBmLndYLCAtMC41ICogZi53WSwgMSAqIGYud1opXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc3VuJykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnN1biA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmVlKTtcbiAgICAgICAgbGlnaHRzLnN1bi5pbnRlbnNpdHkgPSAxLjA7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlU3VuKGxpZ2h0cy5zdW4pO1xuXG4gICAgICAgIC8vIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7ICAvLyBERUJVR1xuXG4gICAgICAgIC8vIGRpcmVjdGlvbiBvZiBzdW5saWdodFxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnN1bi50YXJnZXQgPSB0YXJnZXQ7XG5cbiAgICAgICAgLy8gc3VuIGRpc3RhbmNlLCBsb2xcbiAgICAgICAgdmFyIHN1bkRpc3RhbmNlID0gbGlnaHRzLnN1bi5wb3NpdGlvbi5kaXN0YW5jZVRvKGxpZ2h0cy5zdW4udGFyZ2V0LnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbG9uZ2VzdCBkaWFnb25hbCBmcm9tIGZpZWxkLWNlbnRlclxuICAgICAgICB2YXIgbWF4RmllbGREaWFnb25hbCA9IGYuY2VudGVyLmRpc3RhbmNlVG8obmV3IFRIUkVFLlZlY3RvcjMoZi5taW5YLCBmLm1pblksIGYubWluWikpO1xuXG4gICAgICAgIC8vIHNoYWRvdyBzZXR0aW5nc1xuICAgICAgICBsaWdodHMuc3VuLmNhc3RTaGFkb3cgPSB0cnVlO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0RhcmtuZXNzID0gMC4zMztcblxuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYU5lYXIgPSBzdW5EaXN0YW5jZSAtIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhRmFyID0gc3VuRGlzdGFuY2UgKyBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVRvcCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhUmlnaHQgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUJvdHRvbSA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFMZWZ0ID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3NreScpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5za3kgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGVlZWVmZik7XG4gICAgICAgIGxpZ2h0cy5za3kuaW50ZW5zaXR5ID0gMC44O1xuXG4gICAgICAgIC8vIHNreSBpcyBkaXJlY3RseSBhYm92ZVxuICAgICAgICB2YXIgc2t5SGVpZ2h0ID0gNSAqIGYud1o7XG4gICAgICAgIGxpZ2h0cy5za3kucG9zaXRpb24uY29weSh0aGlzLmNhbWVyYS5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxpZ2h0cy5za3kucG9zaXRpb24uc2V0WihmLm1heFogKyBza3lIZWlnaHQpO1xuXG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc2t5LnRhcmdldCA9IHRhcmdldDtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBsaWdodCBpbiBsaWdodHMpIHtcbiAgICAgICAgaWYgKGxpZ2h0cy5oYXNPd25Qcm9wZXJ0eShsaWdodCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2NlbmUuYWRkKGxpZ2h0c1tsaWdodF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpZ2h0cztcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG4gICAgLy8gYWRkIGZvZ1xuICAgIC8vIHNjZW5lLmZvZyA9IG5ldyBUSFJFRS5Gb2coXG4gICAgLy8gICAgICcjZjBmOGZmJyxcbiAgICAvLyAgICAgdGhpcy5mLm1heFggLSB0aGlzLmYubWluWCxcbiAgICAvLyAgICAgdGhpcy5mLm1heFggLSB0aGlzLmYubWluWCAqIDNcbiAgICAvLyApO1xuICAgIHJldHVybiBzY2VuZTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNhbWVyYSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgIC8vIHZpZXdpbmcgYW5nbGVcbiAgICAvLyBpIHRoaW5rIHRoaXMgaXMgdGhlIHZlcnRpY2FsIHZpZXcgYW5nbGUuICBob3Jpem9udGFsIGFuZ2xlIGlzXG4gICAgLy8gZGVyaXZlZCBmcm9tIHRoaXMgYW5kIHRoZSBhc3BlY3QgcmF0aW8uXG4gICAgdmFyIHZpZXdBbmdsZSA9IDQ1O1xuICAgIHZpZXdBbmdsZSA9IChvcHRpb25zICYmIG9wdGlvbnMudmlld0FuZ2xlKSB8fCB2aWV3QW5nbGU7XG5cbiAgICAvLyBhc3BlY3RcbiAgICB2YXIgdmlld0FzcGVjdCA9IDE2Lzk7XG4gICAgaWYgKHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgdmlld0FzcGVjdCA9ICRlbGVtLndpZHRoKCkgLyAkZWxlbS5oZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvLyBuZWFyIGFuZCBmYXIgY2xpcHBpbmdcbiAgICB2YXIgbmVhckNsaXAgPSAwLjE7XG4gICAgdmFyIGZhckNsaXAgPSAxMDAwMDtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIG5lYXJDbGlwID0gTWF0aC5taW4odGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgLyAxMDAwO1xuICAgICAgICBmYXJDbGlwID0gTWF0aC5tYXgodGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgKiAxMDtcbiAgICB9XG5cbiAgICAvLyBjYW1lcmEgcG9zaXRpb24gYW5kIGxvb2tpbmcgZGlyZWN0aW9uXG4gICAgdmFyIGxvb2tIZXJlID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XG4gICAgdmFyIGNhbVBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xMCwgNSk7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBsb29rSGVyZSA9IHRoaXMuZi5jZW50ZXI7XG4gICAgICAgIGNhbVBvcyA9IGxvb2tIZXJlLmNsb25lKCkuYWRkKG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xLjEgKiB0aGlzLmYud1ksIDMgKiB0aGlzLmYud1opKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgdXAgY2FtZXJhXG4gICAgdmFyIGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSggdmlld0FuZ2xlLCB2aWV3QXNwZWN0LCBuZWFyQ2xpcCwgZmFyQ2xpcCk7XG4gICAgLy8gXCJ1cFwiIGlzIHBvc2l0aXZlIFpcbiAgICBjYW1lcmEudXAuc2V0KDAsMCwxKTtcbiAgICBjYW1lcmEucG9zaXRpb24uY29weShjYW1Qb3MpO1xuICAgIGNhbWVyYS5sb29rQXQobG9va0hlcmUpO1xuXG4gICAgLy8gYWRkIHRoZSBjYW1lcmEgdG8gdGhlIHNjZW5lXG4gICAgaWYgKHRoaXMuc2NlbmUpIHtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoY2FtZXJhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FtZXJhO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ29udHJvbHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBjZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCk7XG4gICAgaWYgKHRoaXMuZiAmJiB0aGlzLmYuY2VudGVyKSB7XG4gICAgICAgIGNlbnRlciA9IHRoaXMuZi5jZW50ZXIuY2xvbmUoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2FtZXJhICYmIHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciBjb250cm9scyA9IG5ldyBUSFJFRS5PcmJpdENvbnRyb2xzKHRoaXMuY2FtZXJhLCB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICBjb250cm9scy5jZW50ZXIgPSBjZW50ZXI7XG4gICAgICAgIHJldHVybiBjb250cm9scztcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAgICdzY2FwZSEnXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVNjZW5lO1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblxudmFyIExhbWJlcnQgPSBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsO1xudmFyIFBob25nID0gVEhSRUUuTWVzaFBob25nTWF0ZXJpYWw7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogU3R1ZmYgKHRoYXQgaXMsIFRIUkVFLk1hdGVyaWFsKSB0aGF0IHRoaW5ncyBpbiBzY2FwZXMgY2FuIGJlIG1hZGUgb3V0IG9mLlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgU2NhcGVTdHVmZiA9IHt9O1xuXG4vKiogZ2VuZXJpYyBzdHVmZiwgZm9yIGlmIG5vdGhpbmcgZWxzZSBpcyBzcGVjaWZpZWRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nZW5lcmljID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg5OTk5OTksXG4gICAgICAgICAgICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC41MCB9KTtcblxuLyoqIHdhdGVyIGlzIGJsdWUgYW5kIGEgYml0IHRyYW5zcGFyZW50XG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud2F0ZXIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDMzOTlmZixcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjc1IH0pO1xuXG4vKiogZGlydCBmb3IgZ2VuZXJhbCB1c2VcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5kaXJ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhhMDUyMmQgfSk7XG5cbi8vIE5pbmUgZGlydCBjb2xvdXJzIGZvciB2YXJ5aW5nIG1vaXN0dXJlIGxldmVscy4gIFN0YXJ0IGJ5IGRlZmluaW5nXG4vLyB0aGUgZHJpZXN0IGFuZCB3ZXR0ZXN0IGNvbG91cnMsIGFuZCB1c2UgLmxlcnAoKSB0byBnZXQgYSBsaW5lYXJcbi8vIGludGVycG9sYXRlZCBjb2xvdXIgZm9yIGVhY2ggb2YgdGhlIGluLWJldHdlZW4gZGlydHMuXG52YXIgZHJ5ID0gbmV3IFRIUkVFLkNvbG9yKDB4YmI4ODU1KTsgLy8gZHJ5XG52YXIgd2V0ID0gbmV3IFRIUkVFLkNvbG9yKDB4ODgyMjAwKTsgLy8gbW9pc3RcblxuLyoqIGRpcnQgYXQgdmFyeWluZyBtb2lzdHVyZSBsZXZlbHM6IGRpcnQwIGlzIGRyeSBhbmQgbGlnaHQgaW5cbiAgKiBjb2xvdXIsIGRpcnQ5IGlzIG1vaXN0IGFuZCBkYXJrLlxuICAqIEBuYW1lIGRpcnRbMC05XVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQwID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5IH0pO1xuU2NhcGVTdHVmZi5kaXJ0MSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAxLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAyLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAzLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA0LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA1LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA2LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA3LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA4LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IHdldCB9KTtcblxuLyoqIGxlYWYgbGl0dGVyLCB3aGljaCBpbiByZWFsaXR5IGlzIHVzdWFsbHkgYnJvd25pc2gsIGJ1dCB0aGlzIGhhc1xuICAqIGEgZ3JlZW5pc2ggdG9uZSB0byBkaXN0aW5ndWlzaCBpdCBmcm9tIHBsYWluIGRpcnQuXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGVhZmxpdHRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NjY2YjJmIH0pO1xuXG4vKiogZ2VuZXJpYyBicm93biB3b29kXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud29vZCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4Nzc0NDIyIH0pO1xuXG4vKiogYSBnZW5lcmljIGdyZWVuaXNoIGxlYWYgbWF0ZXJpYWxcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5mb2xpYWdlID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg1NTg4MzMgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydChcbiAgeyBjb2xvcjogMHg1NTg4MzMsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjc1IH1cbik7XG5cbi8qKiBhIGZvbGlhZ2UgbWF0ZXJpYWwgZm9yIHVzZSBpbiBwb2ludCBjbG91ZCBvYmplY3RzXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYucG9pbnRGb2xpYWdlID0gbmV3IFRIUkVFLlBvaW50Q2xvdWRNYXRlcmlhbCh7IGNvbG9yOiAweDU1ODgzMywgc2l6ZTogMC41IH0pO1xuXG4vKiogbGlnaHQgd29vZCBmb3IgZ3VtdHJlZXMgZXRjLiAgTWF5YmUgaXQncyBhIGJpdCB0b28gbGlnaHQ/XG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGlnaHR3b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhmZmVlY2MgfSk7XG5cbi8qKiBzaWx2ZXJ5IG1ldGFsXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubWV0YWwgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHg4ODk5YWEsIHNwZWN1bGFyOiAweGZmZmZmZiwgc2hpbmluZXNzOiAxMDAsIHJlZmxlY3Rpdml0eTogMC44IH0pO1xuXG4vKiogZ2xvc3MgYmxhY2ssIGZvciBzaGlueSBibGFjayBwYWludGVkIHN1cmZhY2VzXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2xvc3NCbGFjayA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweDAwMDAwMCwgc3BlY3VsYXI6IDB4NjY2NjY2IH0pO1xuXG4vKiogY29uY3JldGUgaW4gYSBzb3J0IG9mIG1pZC1ncmV5XG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuY29uY3JldGUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSB9KTtcblxuLyoqIHBsYXN0aWMsIGEgZ2VuZXJpYyB3aGl0aXNoIHBsYXN0aWMgd2l0aCBhIGJpdCBvZiBzaGluaW5lc3NcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5wbGFzdGljID0gbmV3IFBob25nKHsgY29sb3I6IDB4OTk5OTk5LCBlbWlzc2l2ZTogMHg5OTk5OTksIHNwZWN1bGFyOiAweGNjY2NjYyB9KTtcblxuLyoqIGdsYXNzIGlzIHNoaW55LCBmYWlybHkgdHJhbnNwYXJlbnQsIGFuZCBhIGxpdHRsZSBibHVpc2hcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nbGFzcyA9IG5ldyBQaG9uZyhcbiAgeyBjb2xvcjogMHg2NmFhZmYsIHNwZWN1bGFyOiAweGZmZmZmZiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNSB9XG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTdHVmZjtcblxuXG5cblxuIl19
