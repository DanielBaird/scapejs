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
 * This will create (and internally cache) a set of meshes using
 * the linked item type, and position them according to the specified
 * x,y location.
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
    if (this._meshes && this._meshes.length > 0) {
        this._disposeOfMeshes();
    }
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
ScapeItem.prototype._disposeOfMeshes = function() {
    this.eachMesh(function(m) {
        if (m.geometry) m.geometry.dispose();
        m.dispatchEvent({type: 'dispose'});
    });
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
    if (this._scene) { this.removeFromScene(); }
    this._disposeOfMeshes();
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
 * A bag of item types that scapes can have in them.  An item type
 * is a function that takes options describing the item, and returns
 * an array of meshes that are the item (at 0,0,0).
 *
 * When a ScapeItem is instantiated it invokes the appropriate item
 * type to get meshes, then re-positions the meshes at the
 * appropriate x,y,z location.
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
        return; // bail if there's no sun WHAT DID YOU DO YOU MONSTER
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


/////////////////////////////////////////////////////////////////////
// stone, dirt, and ground materials
/////////////////////////////////////////////////////////////////////

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

/////////////////////////////////////////////////////////////////////
// flora - wood, leaves, etc
/////////////////////////////////////////////////////////////////////

/** generic brown wood
  * @memberof ScapeStuff */
ScapeStuff.wood = new Lambert({ color: 0x774422 });

/** light wood for gumtrees etc.  Maybe it's a bit too light?
  * @memberof ScapeStuff */
ScapeStuff.lightwood = new Lambert({ color: 0xffeecc });

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

/////////////////////////////////////////////////////////////////////
// built materials
/////////////////////////////////////////////////////////////////////

/** silvery metal
  * @memberOf ScapeStuff */
ScapeStuff.metal = new Phong({ color: 0x8899aa, specular: 0xffffff, shininess: 100, reflectivity: 0.8 });

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

/////////////////////////////////////////////////////////////////////
// general colours
/////////////////////////////////////////////////////////////////////

/** matt black, for black surfaces (actually it's #111111)
  * @memberOf ScapeStuff */
ScapeStuff.black = new Lambert({ color: 0x111111 });

/** gloss black, for shiny black painted surfaces
  * @memberOf ScapeStuff */
ScapeStuff.glossBlack = new Phong({ color: 0x000000, specular: 0x666666 });

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3JhbmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2N1YmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL3RyZWUuanMiLCJzcmMvc2NhcGUvc2NlbmUuanMiLCJzcmMvc2NhcGUvc3R1ZmYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4vLyBUSFJFRSA9IHJlcXVpcmUoJ3RocmVlJyk7XG5cbi8vIGdldCB0aGUgdmFyaW91cyBiaXRzXG5iYXNlICA9IHJlcXVpcmUoJy4vc2NhcGUvYmFzZW9iamVjdCcpO1xuc3R1ZmYgPSByZXF1aXJlKCcuL3NjYXBlL3N0dWZmJyk7XG5maWVsZCA9IHJlcXVpcmUoJy4vc2NhcGUvZmllbGQnKTtcbnNjZW5lID0gcmVxdWlyZSgnLi9zY2FwZS9zY2VuZScpO1xuY2h1bmsgPSByZXF1aXJlKCcuL3NjYXBlL2NodW5rJyk7XG5cbi8vIG1ha2UgYW4gb2JqZWN0IG91dCBvZiB0aGUgdmFyaW91cyBiaXRzXG5TY2FwZSA9IHtcbiAgICBCYXNlT2JqZWN0OiBiYXNlLFxuICAgIFN0dWZmOiBzdHVmZixcbiAgICBDaHVuazogY2h1bmssXG4gICAgRmllbGQ6IGZpZWxkLFxuICAgIFNjZW5lOiBzY2VuZVxufVxuXG4vLyByZXR1cm4gdGhlIG9iamVjdCBpZiB3ZSdyZSBiZWluZyBicm93c2VyaWZpZWQ7IG90aGVyd2lzZSBhdHRhY2hcbi8vIGl0IHRvIHRoZSBnbG9iYWwgd2luZG93IG9iamVjdC5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU2NhcGU7XG59IGVsc2Uge1xuICAgIHdpbmRvdy5TY2FwZSA9IFNjYXBlO1xufVxuIiwiXG4vL1xuLy8gdGhpcyBcImJhc2VcIiBvYmplY3QgaGFzIGEgZmV3IGNvbnZlbmllbmNlIGZ1bmN0aW9ucyBmb3IgaGFuZGxpbmdcbi8vIG9wdGlvbnMgYW5kIHdoYXRub3Rcbi8vXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBTY2FwZU9iamVjdChvcHRpb25zLCBkZWZhdWx0cykge1xuICAgIHRoaXMuX29wdHMgPSBPYmplY3QuY3JlYXRlKGRlZmF1bHRzKTtcbiAgICB0aGlzLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbWVyZ2UgbmV3IG9wdGlvbnMgaW50byBvdXIgb3B0aW9uc1xuU2NhcGVPYmplY3QucHJvdG90eXBlLm1lcmdlT3B0aW9ucyA9IGZ1bmN0aW9uKGV4dHJhT3B0cykge1xuICAgIGZvciAob3B0IGluIGV4dHJhT3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzW29wdF0gPSBleHRyYU9wdHNbb3B0XTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlT2JqZWN0OyIsIlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVjdGFuZ3VsYXIgcHJpc20gb2YgbWF0ZXJpYWwgdGhhdCB0aGUgc29saWQgXCJncm91bmRcIlxuICogcG9ydGlvbiBvZiBhICdzY2FwZSBpcyBtYWtlIHVwIG9mLCBlLmcuIGRpcnQsIGxlYWYgbGl0dGVyLCB3YXRlci5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBtZXNoIGJhc2VkIG9uIHRoZSBsaW5rZWRcbiAqIGNodW5rIGluZm9ybWF0aW9uIHRvIG1ha2UgcmVuZGVyaW5nIGluIFdlYkdMIGZhc3Rlci5cbiAqXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIFRoZSBTY2FwZVNjZW5lIHRoZSBjaHVuayB3aWxsIGJlIGFkZGVkIGludG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRCbG9jayBUaGUgYmxvY2sgKHZlcnRpY2FsIGNvbHVtbiB3aXRoaW4gdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NhcGUpIHRoYXQgb3ducyB0aGlzIGNodW5rXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGxheWVySW5kZXggSW5kZXggaW50byBwYXJlbnRCbG9jay5nIHRoaXMgY2h1bmsgaXMgYXRcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaW5aIGxvd2VzdCBaIHZhbHVlIGFueSBjaHVuayBzaG91bGQgaGF2ZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zLCBub3QgY3VycmVudGx5IHVzZWRcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVDaHVuayhzY2VuZSwgcGFyZW50QmxvY2ssIGxheWVySW5kZXgsIG1pblosIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgdGhpcy5fYmxvY2sgPSBwYXJlbnRCbG9jaztcbiAgICB0aGlzLl9pc1N1cmZhY2UgPSAobGF5ZXJJbmRleCA9PSAwKTtcbiAgICB0aGlzLl9sYXllciA9IHBhcmVudEJsb2NrLmdbbGF5ZXJJbmRleF07XG4gICAgdGhpcy5fbWluWiA9IG1pblo7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcblxuICAgIC8vIFRPRE86IGZpbmlzaCBoaW0hIVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlQ2h1bmsucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVDaHVuay5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUNodW5rO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEludm9rZSBhIHJlYnVpbGQgb2YgdGhpcyBjaHVuay5cbiAqXG4gKiBEaXNjYXJkcyBleGlzdGluZyBjYWNoZWQgbWVzaCBhbmQgYnVpbGRzIGEgbmV3IG1lc2ggYmFzZWQgb24gdGhlXG4gKiBjdXJyZW50bHkgbGlua2VkIGNodW5rIGluZm9ybWF0aW9uLlxuICpcbiAqIEByZXR1cm4gbm9uZVxuICovXG5TY2FwZUNodW5rLnByb3RvdHlwZS5yZWJ1aWxkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fY3JlYXRlTmV3TWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHRoZSBjaHVuayB3aWxsIGJlIGFzIGRlZXAgYXMgdGhlIGxheWVyIHNheXNcbiAgICB2YXIgZGVwdGggPSB0aGlzLl9sYXllci5kejtcbiAgICBpZiAoZGVwdGggPT0gMCkge1xuICAgICAgICAvLyAuLnVubGVzcyB0aGF0J3MgMCwgaW4gd2hpY2ggY2FzZSBnbyB0byB0aGUgYm90dG9tXG4gICAgICAgIGRlcHRoID0gdGhpcy5fbGF5ZXIueiAtIHRoaXMuX21pblo7XG4gICAgfVxuICAgIC8vIG1ha2UgYSBnZW9tZXRyeSBmb3IgdGhlIGNodW5rXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoXG4gICAgICAgIHRoaXMuX2Jsb2NrLmR4LCB0aGlzLl9ibG9jay5keSwgZGVwdGhcbiAgICApO1xuICAgIHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgdGhpcy5fbGF5ZXIubSk7XG4gICAgbWVzaC5wb3NpdGlvbi5zZXQoXG4gICAgICAgIHRoaXMuX2Jsb2NrLnggKyB0aGlzLl9ibG9jay5keC8yLFxuICAgICAgICB0aGlzLl9ibG9jay55ICsgdGhpcy5fYmxvY2suZHkvMixcbiAgICAgICAgdGhpcy5fbGF5ZXIueiAtIGRlcHRoLzJcbiAgICApO1xuICAgIG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgLy8gb25seSB0aGUgc3VyZmFjZSBjaHVua3MgcmVjZWl2ZSBzaGFkb3dcbiAgICBpZiAodGhpcy5faXNTdXJmYWNlKSB7XG4gICAgICAgIG1lc2gucmVjZWl2ZVNoYWRvdyA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBtZXNoO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fYWRkTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLmFkZCh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3JlbW92ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zY2VuZS5yZW1vdmUodGhpcy5fbWVzaCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl91cGRhdGVNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVtb3ZlTWVzaCgpO1xuICAgIHRoaXMuX21lc2ggPSB0aGlzLl9jcmVhdGVOZXdNZXNoKCk7XG4gICAgdGhpcy5fYWRkTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ2h1bms7IiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuL3N0dWZmJyk7XG5TY2FwZUl0ZW0gPSByZXF1aXJlKCcuL2l0ZW0nKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBUaGUgY29udGFpbmVyIGZvciBhbGwgaW5mb3JtYXRpb24gYWJvdXQgYW4gYXJlYS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMgZm9yIHRoZSBTY2FwZUZpZWxkIGJlaW5nIGNyZWF0ZWQuXG4gKlxuICogb3B0aW9uIHwgZGVmYXVsdCB2YWx1ZSB8IGRlc2NyaXB0aW9uXG4gKiAtLS0tLS0tfC0tLS0tLS0tLS0tLS0tOnwtLS0tLS0tLS0tLS1cbiAqIGBtaW5YYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYG1heFhgICAgICB8ICAxMDAgfCBsYXJnZXN0IFggZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NYYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFggYXhpcyBpbnRvXG4gKiBgbWluWWAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhZYCAgICAgfCAgMTAwIHwgbGFyZ2VzdCBZIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWWAgIHwgICAxMCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBZIGF4aXMgaW50b1xuICogYG1pblpgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBaICh2ZXJ0aWNhbCBkaW1lbnNpb24pIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WmAgICAgIHwgICA0MCB8IGxhcmdlc3QgWiBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1pgICB8ICAgODAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWiBheGlzIGludG9cbiAqIGBibG9ja0dhcGAgfCAwLjA0IHwgZ2FwIHRvIGxlYXZlIGJldHdlZW4gYmxvY2tzIGFsb25nIHRoZSBYIGFuZCBZIGF4ZXNcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVGaWVsZChvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICAgIG1pblg6IDAsICAgICAgICBtYXhYOiAxMDAsICAgICAgICAgIGJsb2Nrc1g6IDEwLFxuICAgICAgICBtaW5ZOiAwLCAgICAgICAgbWF4WTogMTAwLCAgICAgICAgICBibG9ja3NZOiAxMCxcbiAgICAgICAgbWluWjogMCwgICAgICAgIG1heFo6IDQwLCAgICAgICAgICAgYmxvY2tzWjogODAsXG4gICAgICAgIGJsb2NrR2FwOiAwLjA0XG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIG1pbiBhbmQgbWF4IHZhbHVlcyBmb3IgeCB5IGFuZCB6XG4gICAgdGhpcy5taW5YID0gdGhpcy5fb3B0cy5taW5YO1xuICAgIHRoaXMubWluWSA9IHRoaXMuX29wdHMubWluWTtcbiAgICB0aGlzLm1pblogPSB0aGlzLl9vcHRzLm1pblo7XG5cbiAgICB0aGlzLm1heFggPSB0aGlzLl9vcHRzLm1heFg7XG4gICAgdGhpcy5tYXhZID0gdGhpcy5fb3B0cy5tYXhZO1xuICAgIHRoaXMubWF4WiA9IHRoaXMuX29wdHMubWF4WjtcblxuICAgIC8vIGNvbnZlbmllbnQgXCJ3aWR0aHNcIlxuICAgIHRoaXMud1ggPSB0aGlzLm1heFggLSB0aGlzLm1pblg7XG4gICAgdGhpcy53WSA9IHRoaXMubWF4WSAtIHRoaXMubWluWTtcbiAgICB0aGlzLndaID0gdGhpcy5tYXhaIC0gdGhpcy5taW5aO1xuXG4gICAgLy8gaG93IG1hbnkgYmxvY2tzIGFjcm9zcyB4IGFuZCB5P1xuICAgIHRoaXMuYmxvY2tzWCA9IHRoaXMuX29wdHMuYmxvY2tzWDtcbiAgICB0aGlzLmJsb2Nrc1kgPSB0aGlzLl9vcHRzLmJsb2Nrc1k7XG4gICAgdGhpcy5ibG9ja3NaID0gdGhpcy5fb3B0cy5ibG9ja3NaO1xuXG4gICAgLy8gaG93IHdpZGUgaXMgZWFjaCBibG9ja1xuICAgIHRoaXMuX2JYID0gdGhpcy53WCAvIHRoaXMuYmxvY2tzWDtcbiAgICB0aGlzLl9iWSA9IHRoaXMud1kgLyB0aGlzLmJsb2Nrc1k7XG4gICAgdGhpcy5fYlogPSB0aGlzLndaIC8gdGhpcy5ibG9ja3NaO1xuXG4gICAgLy8gaG91c2VrZWVwaW5nXG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cyA9IFtdO1xuICAgIHRoaXMuX2NhbGNDZW50ZXIoKTtcbiAgICB0aGlzLl9tYWtlR3JpZCgpO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVGaWVsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlRmllbGQ7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAgICcoJyArIHRoaXMubWluWCArICctJyArIHRoaXMubWF4WCArXG4gICAgICAgICcsICcgKyB0aGlzLm1pblkgKyAnLScgKyB0aGlzLm1heFkgK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5aICsgJy0nICsgdGhpcy5tYXhaICtcbiAgICAgICAgJyknXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fbWFrZUdyaWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9nID0gW107XG4gICAgZm9yICh2YXIgZ3ggPSAwOyBneCA8IHRoaXMuYmxvY2tzWDsgZ3grKykge1xuICAgICAgICB2YXIgY29sID0gW107XG4gICAgICAgIGZvciAodmFyIGd5ID0gMDsgZ3kgPCB0aGlzLmJsb2Nrc1k7IGd5KyspIHtcbiAgICAgICAgICAgIHZhciB4R2FwID0gdGhpcy5fYlggKiB0aGlzLl9vcHRzLmJsb2NrR2FwIC8gMjtcbiAgICAgICAgICAgIHZhciB5R2FwID0gdGhpcy5fYlkgKiB0aGlzLl9vcHRzLmJsb2NrR2FwIC8gMjtcbiAgICAgICAgICAgIHZhciBibG9jayA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aGlzLm1pblggKyAodGhpcy5fYlggKiBneCkgKyB4R2FwLFxuICAgICAgICAgICAgICAgIGR4OiB0aGlzLl9iWCAtIHhHYXAgLSB4R2FwLFxuICAgICAgICAgICAgICAgIHk6IHRoaXMubWluWSArICh0aGlzLl9iWSAqIGd5KSArIHlHYXAsXG4gICAgICAgICAgICAgICAgZHk6IHRoaXMuX2JZIC0geUdhcCAtIHlHYXAsXG4gICAgICAgICAgICAgICAgZzogW3tcbiAgICAgICAgICAgICAgICAgICAgejogdGhpcy5tYXhaLFxuICAgICAgICAgICAgICAgICAgICBkejogMCwgLy8gMCBtZWFucyBcInN0cmV0Y2ggdG8gbWluWlwiXG4gICAgICAgICAgICAgICAgICAgIG06IFNjYXBlU3R1ZmYuZ2VuZXJpYyxcbiAgICAgICAgICAgICAgICAgICAgY2h1bms6IG51bGxcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICBpOiBbXVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29sLnB1c2goYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2cucHVzaChjb2wpO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBidWlsZHMgYmxvY2sgbWVzaGVzIGZvciBkaXNwbGF5IGluIHRoZSBwcm92aWRlZCBzY2VuZS4gIFRoaXMgaXNcbiAqIGdlbmVyYWxseSBjYWxsZWQgYnkgdGhlIFNjYXBlU2NlbmUgb2JqZWN0IHdoZW4geW91IGdpdmUgaXQgYVxuICogU2NhcGVGaWVsZCwgc28geW91IHdvbid0IG5lZWQgdG8gY2FsbCBpdCB5b3Vyc2VsZi5cbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgdGhlIFNjYXBlU2NlbmUgdGhhdCB3aWxsIGJlIGRpc3BsYXlpbmdcbiAqIHRoaXMgU2NhcGVGaWVsZC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYnVpbGRCbG9ja3MgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgbGF5ZXJJbmRleCA9IDA7IGxheWVySW5kZXggPCBiLmcubGVuZ3RoOyBsYXllckluZGV4KyspIHtcbiAgICAgICAgICAgIGIuZ1tsYXllckluZGV4XS5jaHVuayA9IG5ldyBTY2FwZUNodW5rKFxuICAgICAgICAgICAgICAgIHNjZW5lLCBiLCBsYXllckluZGV4LCBtaW5aXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZG8gdGhpcyB0byBhZGp1c3QgYWxsIHRoZSBjaHVuayBoZWlnaHRzXG4gICAgdGhpcy5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGJ1aWxkcyBpdGVtIG1lc2hlcyBmb3IgZGlzcGxheSBpbiB0aGUgcHJvdmlkZWQgc2NlbmUuICBUaGlzIGlzXG4gKiBnZW5lcmFsbHkgY2FsbGVkIGJ5IHRoZSBTY2FwZVNjZW5lIG9iamVjdCB3aGVuIHlvdSBnaXZlIGl0IGFcbiAqIFNjYXBlRmllbGQsIHNvIHlvdSB3b24ndCBuZWVkIHRvIGNhbGwgaXQgeW91cnNlbGYuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIHRoZSBTY2FwZVNjZW5lIHRoYXQgd2lsbCBiZSBkaXNwbGF5aW5nXG4gKiB0aGlzIFNjYXBlRmllbGQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmJ1aWxkSXRlbXMgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaXRlbUluZGV4ID0gMDsgaXRlbUluZGV4IDwgYi5pLmxlbmd0aDsgaXRlbUluZGV4KyspIHtcbiAgICAgICAgICAgIGIuaVtpdGVtSW5kZXhdLmFkZFRvU2NlbmUoc2NlbmUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBpdGVtcyB0byB0aGUgc2NhcGUgYXQgdmFyaW91cyBwb2ludHMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaXRlbUxpc3QgQSBsaXN0IG9mIGl0ZW1zLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgaXRlbWAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtcyA9IGZ1bmN0aW9uKGl0ZW1MaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5faXRlbXMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGl0ZW1MaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciB0aGVJdGVtID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbSh0aGVJdGVtKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW0gPSBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudCBibG9ja1xuICAgIHZhciBwYXJlbnRCbG9jayA9IHRoaXMuZ2V0QmxvY2soaXRlbS54LCBpdGVtLnkpO1xuICAgIHBhcmVudEJsb2NrLmkucHVzaChpdGVtKTtcblxuICAgIC8vIHNldCBpdGVtIGhlaWdodCB0byB0aGUgcGFyZW50IGJsb2NrJ3MgZ3JvdW5kIGhlaWdodFxuICAgIGl0ZW0uc2V0SGVpZ2h0KHBhcmVudEJsb2NrLmdbMF0ueik7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBpdGVtcyB0byB0aGUgc2NhcGUgYXQgdmFyaW91cyBwb2ludHMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaXRlbUxpc3QgQSBsaXN0IG9mIGl0ZW1zLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgaXRlbWAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtc09mVHlwZSA9IGZ1bmN0aW9uKGl0ZW1MaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5faXRlbXMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGl0ZW1MaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciB0aGVJdGVtID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbU9mVHlwZSh0aGVJdGVtLnR5cGUsIHRoZUl0ZW0ueCwgdGhlSXRlbS55LCB0aGVJdGVtKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1PZlR5cGUgPSBmdW5jdGlvbihpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucykge1xuXG4gICAgLy8gbWFrZSB0aGUgaXRlbVxuICAgIHZhciBpdGVtID0gbmV3IFNjYXBlSXRlbShpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucyk7XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudCBibG9ja1xuICAgIHZhciBwYXJlbnRCbG9jayA9IHRoaXMuZ2V0QmxvY2soeCwgeSk7XG4gICAgcGFyZW50QmxvY2suaS5wdXNoKGl0ZW0pO1xuXG4gICAgLy8gc2V0IGl0ZW0gaGVpZ2h0IHRvIHRoZSBwYXJlbnQgYmxvY2sncyBncm91bmQgaGVpZ2h0XG4gICAgaXRlbS5zZXRIZWlnaHQocGFyZW50QmxvY2suZ1swXS56KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGNsYWltcyBvZiB0aGUgZ3JvdW5kIGhlaWdodCBhdCB2YXJpb3VzIHBvaW50cy5cbiAqIFVubGlrZSB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRIZWlnaHQgYWRkR3JvdW5kSGVpZ2h0fSwgdGhpc1xuICogbWV0aG9kIHdpbGwgcmUtZXh0cmFwb2xhdGUgZ3JvdW5kIGhlaWdodHMgYWNyb3NzIHRoZSBGaWVsZCAoc29cbiAqIHlvdSBkb24ndCBuZWVkIHRvIGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNHcm91bmRIZWlnaHRzIGNhbGNHcm91bmRIZWlnaHRzfSB5b3Vyc2VsZikuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaGVpZ2h0TGlzdCBBIGxpc3Qgb2Ygb2JqZWN0cy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYHpgIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKGhlaWdodExpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBoZWlnaHRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGhlaWdodExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kSGVpZ2h0KHB0LngsIHB0LnksIHB0LnopO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgY2xhaW0gdGhhdCB0aGUgZ3JvdW5kIGhlaWdodCBpcyBgemAgYXQgcG9pbnQgYHhgLGB5YC5cbiAqIElmIHlvdSBjYWxsIHRoaXMsIHJlbWVtYmVyIHRvIGV2ZW50dWFsbHkgY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IGFmdGVyIHNvXG4gKiBncm91bmQgaGVpZ2h0cyBnZXQgZXh0cmFwb2xhdGVkIGFjcm9zcyB0aGUgZW50aXJlIEZpZWxkLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFggY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geSBZIGNvb3JkaW5hdGUgb2YgdGhpcyBncm91bmQgaGVpZ2h0IHJlY29yZFxuICogQHBhcmFtIHtOdW1iZXJ9IHogdGhlIGhlaWdodCBvZiB0aGUgZ3JvdW5kIGF0IHBvc2l0aW9uIGB4YCxgeWBcbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMucHVzaCh7IHg6IHgsIHk6IHksIHo6IHogfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGFkZGl0aW9uYWwgZ3JvdW5kIHN0YWNrcyB0byB0aGUgZmllbGQncyBncm91bmQgc3RhY2tzLlxuICogVGhlIGdyb3VuZExpc3QgaXMgYW4gYXJyYXkgb2YgZGF0YSBvYmplY3RzLiAgRWFjaCBvYmplY3QgbmVlZHMgeCxcbiAqIHkgYW5kIHogcHJvcGVydGllcywgYW5kIGEgJ3N0YWNrJyBwcm9wZXJ0eSwgZWFjaCBtYXRjaGluZyB0aGVcbiAqIGNvcnJlc3BvbmRpbmcgYXJnIHRvIGFkZEdyb3VuZFN0YWNrLlxuICogQHBhcmFtIHtib29sZWFufSByZXBsYWNlIGlmIHJlcGxhY2UgaXMgdHJ1dGh5LCBkaXNjYXJkIGV4aXN0aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdW5kIHBvaW50cyBmaXJzdC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oZ3JvdW5kTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgZ3JvdW5kTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgcHQgPSBncm91bmRMaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEdyb3VuZFN0YWNrKHB0LngsIHB0LnksIHB0LnN0YWNrKTtcbiAgICB9XG4gICAgdGhpcy5jYWxjR3JvdW5kU3RhY2tzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgZ3JvdW5kIHN0YWNrIGF0IHgseSwgc3RhcnRpbmcgYXQgaGVpZ2h0IHouXG4gKiBUaGUgc3RhY2sgaXMgYW4gYXJyYXkgb2YgdHdvLWVsZW1lbnQgYXJyYXlzIHdpdGggYSBNYXRlcmlhbFxuICogYW5kIGEgZGVwdGggbnVtYmVyLCBsaWtlIHRoaXM6XG4gKiBbXG4gKiAgICAgW01hdGVyaWFsLmxlYWZMaXR0ZXIsIDAuM10sXG4gKiAgICAgW01hdGVyaWFsLmRpcnQsIDMuNV0sXG4gKiAgICAgW01hdGVyaWFsLnN0b25lLCA0XVxuICogXVxuICogVGhhdCBwdXRzIGEgbGVhZmxpdHRlciBsYXllciAwLjMgdW5pdHMgZGVlcCBvbiBhIDMuNS11bml0XG4gKiBkZWVwIGRpcnQgbGF5ZXIsIHdoaWNoIGlzIG9uIGEgc3RvbmUgbGF5ZXIuICBJZiB0aGUgZmluYWxcbiAqIGxheWVyJ3MgZGVwdGggaXMgemVybywgdGhhdCBsYXllciBpcyBhc3N1bWVkIHRvIGdvIGFsbCB0aGVcbiAqIHdheSB0byBtaW5aLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gY2FsY0dyb3VuZCgpIGFmdGVyLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKHgsIHksIHN0YWNrKSB7XG4gICAgLy8gVE9ETzogY2hlY2sgZm9yIHZhbGlkaXR5XG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzLnB1c2goeyB4OiB4LCAgeTogeSwgIHN0YWNrOiBzdGFjayB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiAocmUpY2FsY3VsYXRlIHRoZSBncm91bmQgaGVpZ2h0LiAgWW91IG5lZWQgdG8gY2FsbCB0aGlzIGlmIHlvdVxuICogYWRkIGdyb3VuZCBoZWlnaHQgY2xhaW1zIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gZmluZCBoZWlnaHQgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGFsbG93aW5nIGVhY2hcbiAgICAgICAgLy8ga25vd24gZ3JvdW5kIGhlaWdodCB0byBcInZvdGVcIiB1c2luZyB0aGUgaW52ZXJzZSBvZlxuICAgICAgICAvLyBpdCdzIHNxdWFyZWQgZGlzdGFuY2UgZnJvbSB0aGUgY2VudHJlIG9mIHRoZSBibG9jay5cbiAgICAgICAgdmFyIGgsIGR4LCBkeSwgZGlzdCwgdm90ZVNpemU7XG4gICAgICAgIHZhciBiWiA9IDA7XG4gICAgICAgIHZhciB2b3RlcyA9IDA7XG4gICAgICAgIGZvciAodmFyIGdoPTA7IGdoIDwgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5sZW5ndGg7IGdoKyspIHtcbiAgICAgICAgICAgIGggPSB0aGlzLl9ncm91bmRIZWlnaHRzW2doXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBoLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gaC55O1xuICAgICAgICAgICAgZGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgdm90ZVNpemUgPSAxIC8gZGlzdDtcbiAgICAgICAgICAgIGJaICs9IGgueiAqIHZvdGVTaXplO1xuICAgICAgICAgICAgdm90ZXMgKz0gdm90ZVNpemU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGRpdmlkZSB0byBmaW5kIHRoZSBhdmVyYWdlXG4gICAgICAgIGJaID0gYlogLyB2b3RlcztcblxuICAgICAgICAvLyBibG9jay1pc2ggaGVpZ2h0czogcm91bmQgdG8gdGhlIG5lYXJlc3QgX2JaXG4gICAgICAgIHZhciBkaWZmWiA9IGJaIC0gdGhpcy5taW5aO1xuICAgICAgICBiWiA9IHRoaXMubWluWiArIE1hdGgucm91bmQoZGlmZlogLyB0aGlzLl9iWikgKiB0aGlzLl9iWjtcblxuICAgICAgICAvLyBva2F5IG5vdyB3ZSBrbm93IGEgaGVpZ2h0ISAgc2V0IGl0XG4gICAgICAgIHRoaXMuc2V0QmxvY2tIZWlnaHQoYmxvY2ssIGJaKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBzdGFja3MuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIHN0YWNrcyBvbmUgYXQgYSB0aW1lIHVzaW5nXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRTdGFjayBhZGRHcm91bmRTdGFja30uXG4gKlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBtYWtlIHRoZSBzdGFjayBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgY29weWluZyB0aGVcbiAgICAgICAgLy8gbmVhcmVzdCBkZWZpbmVkIHN0YWNrLlxuICAgICAgICB2YXIgcywgZHgsIGR5LCB0aGlzRGlzdCwgYmVzdFN0YWNrO1xuICAgICAgICB2YXIgYmVzdERpc3QgPSB0aGlzLndYICsgdGhpcy53WSArIHRoaXMud1o7XG4gICAgICAgIGJlc3REaXN0ID0gYmVzdERpc3QgKiBiZXN0RGlzdDtcbiAgICAgICAgZm9yICh2YXIgZ3M9MDsgZ3MgPCB0aGlzLl9ncm91bmRTdGFja3MubGVuZ3RoOyBncysrKSB7XG4gICAgICAgICAgICBzID0gdGhpcy5fZ3JvdW5kU3RhY2tzW2dzXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBzLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gcy55O1xuICAgICAgICAgICAgdGhpc0Rpc3QgPSAxICsgZHgqZHggKyBkeSpkeTtcbiAgICAgICAgICAgIGlmICh0aGlzRGlzdCA8IGJlc3REaXN0KSB7XG4gICAgICAgICAgICAgICAgYmVzdFN0YWNrID0gcztcbiAgICAgICAgICAgICAgICBiZXN0RGlzdCA9IHRoaXNEaXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb2theSB3ZSBnb3QgYSBzdGFjay5cbiAgICAgICAgdGhpcy5zZXRHcm91bmRTdGFjayhibG9jaywgYmVzdFN0YWNrLnN0YWNrKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fY2FsY0NlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY2VudHJlIG9mIHRoZSBmaWVsZCBhbmQgcmVjb3JkIGl0IGFzIC5jZW50ZXJcbiAgICB0aGlzLmNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAodGhpcy5taW5YICsgdGhpcy5tYXhYKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblkgKyB0aGlzLm1heFkpIC8gMixcbiAgICAgICAgKHRoaXMubWluWiArIHRoaXMubWF4WikgLyAyXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0R3JvdW5kU3RhY2sgPSBmdW5jdGlvbihibG9jaywgc3RhY2spIHtcbiAgICB2YXIgbGF5ZXJMZXZlbCA9IGJsb2NrLmdbMF0uejtcbiAgICBmb3IgKHZhciBsYXllciA9IDA7IGxheWVyIDwgc3RhY2subGVuZ3RoOyBsYXllcisrKSB7XG4gICAgICAgIGJsb2NrLmdbbGF5ZXJdID0ge1xuICAgICAgICAgICAgejogbGF5ZXJMZXZlbCxcbiAgICAgICAgICAgIGR6OiBzdGFja1tsYXllcl1bMV0sXG4gICAgICAgICAgICBtOiBzdGFja1tsYXllcl1bMF0sXG4gICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBsYXllckxldmVsIC09IHN0YWNrW2xheWVyXVsxXTtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVidWlsZENodW5rcyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGlmIChibG9jay5nW2xdLmNodW5rKSB7XG4gICAgICAgICAgICBibG9jay5nW2xdLmNodW5rLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0QmxvY2tIZWlnaHQgPSBmdW5jdGlvbihibG9jaywgeikge1xuICAgIC8vIHRvIHNldCB0aGUgYmxvY2sgZ3JvdW5kIGhlaWdodCwgd2UgbmVlZCB0byBmaW5kIHRoZSBibG9jaydzXG4gICAgLy8gY3VycmVudCBncm91bmQgaGVpZ2h0ICh0aGUgeiBvZiB0aGUgdG9wIGxheWVyKSwgd29yayBvdXQgYVxuICAgIC8vIGRpZmYgYmV0d2VlbiB0aGF0IGFuZCB0aGUgbmV3IGhlaWdodCwgYW5kIGFkZCB0aGF0IGRpZmYgdG9cbiAgICAvLyBhbGwgdGhlIGxheWVycy5cbiAgICB2YXIgZFogPSB6IC0gYmxvY2suZ1swXS56O1xuICAgIHZhciBkZXB0aDtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgYmxvY2suZ1tsXS56ICs9IGRaO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5nZXRCbG9jayA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAvLyByZXR1cm4gdGhlIGJsb2NrIHRoYXQgaW5jbHVkZXMgIHgseVxuICAgIHZhciBneCA9IE1hdGguZmxvb3IoICh4IC0gdGhpcy5taW5YKSAvIHRoaXMuX2JYICk7XG4gICAgdmFyIGd5ID0gTWF0aC5mbG9vciggKHkgLSB0aGlzLm1pblkpIC8gdGhpcy5fYlkgKTtcbiAgICByZXR1cm4gKHRoaXMuX2dbZ3hdW2d5XSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGludm9rZSB0aGUgY2FsbGJhY2sgZWFjaCBibG9jayBpbiB0dXJuXG4vLyBjYWxsYmFjayBzaG91bGQgbG9vayBsaWtlOiBmdW5jdGlvbihlcnIsIGJsb2NrKSB7IC4uLiB9XG4vLyBpZiBlcnIgaXMgbnVsbCBldmVyeXRoaW5nIGlzIGZpbmUuIGlmIGVyciBpcyBub3QgbnVsbCwgdGhlcmVcbi8vIHdhcyBhbiBlcnJvci5cblNjYXBlRmllbGQucHJvdG90eXBlLmVhY2hCbG9jayA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnLCBvcmRlcikge1xuICAgIGlmIChvcmRlciA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3JkZXIgPSAneHVwLXl1cCc7XG4gICAgfVxuICAgIGlmICh0aGlzQXJnID09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzQXJnID0gdGhpcztcbiAgICB9XG4gICAgaWYgKG9yZGVyID09ICd4dXAteXVwJykge1xuICAgICAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5fZy5sZW5ndGg7IGd4KyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGd5ID0gMDsgZ3kgPCB0aGlzLl9nWzBdLmxlbmd0aDsgZ3krKykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgbnVsbCwgdGhpcy5fZ1tneF1bZ3ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlRmllbGQ7XG5cblxuXG5cbiIsIlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuXG5cbi8vIERFQlVHXG52YXIgU2NhcGVJdGVtcyA9IHJlcXVpcmUoJy4vaXRlbXR5cGVzJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmVwcmVzZW50cyBhbiBpdGVtIHRoYXQgbWlnaHQgYXBwZWFyIGluIGEgU2NhcGUuXG4gKlxuICogVGhpcyB3aWxsIGNyZWF0ZSAoYW5kIGludGVybmFsbHkgY2FjaGUpIGEgc2V0IG9mIG1lc2hlcyB1c2luZ1xuICogdGhlIGxpbmtlZCBpdGVtIHR5cGUsIGFuZCBwb3NpdGlvbiB0aGVtIGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkXG4gKiB4LHkgbG9jYXRpb24uXG4gKlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSBUaGUgU2NhcGVTY2VuZSB0aGUgaXRlbSB3aWxsIGJlIGFkZGVkIGludG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRCbG9jayBUaGUgYmxvY2sgdGhhdCBvd25zIHRoaXMgaXRlbVxuICogQHBhcmFtIHtTY2FwZUl0ZW1UeXBlfSBpdGVtVHlwZSBUeXBlIG9mIHRoaXMgaXRlbVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zLCBub3QgY3VycmVudGx5IHVzZWRcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVJdGVtKGl0ZW1UeXBlLCB4LCB5LCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICB0aGlzLl90eXBlID0gaXRlbVR5cGU7XG4gICAgdGhpcy5fc2NlbmUgPSBudWxsO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLl9wb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCAwKTtcblxuICAgIC8vIFRPRE86IG1heWJlIGhhdmUgYSBzZXQgb2YgbWVzaGVzIGZvciBlYWNoIHNjZW5lLCBzbyBhbiBpdGVtXG4gICAgLy8gY2FuIGJlIGluIG11bHRpcGxlIHNjZW5lcz9cbiAgICB0aGlzLl9jcmVhdGVOZXdNZXNoZXMoKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlSXRlbS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUl0ZW0ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVJdGVtO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoZXMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fbWVzaGVzICYmIHRoaXMuX21lc2hlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuX2Rpc3Bvc2VPZk1lc2hlcygpO1xuICAgIH1cbiAgICB0aGlzLl9tZXNoZXMgPSB0aGlzLl90eXBlKHRoaXMuX29wdHMpO1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBtLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVkT3B0aW9ucykge1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKHVwZGF0ZWRPcHRpb25zKTtcbiAgICB0aGlzLl91cGRhdGVNZXNoZXMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbih6KSB7XG4gICAgdGhpcy5fcG9zLnNldFooeik7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmFkZFRvU2NlbmUgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBzY2VuZS5hZGQobSk7XG4gICAgfSk7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fZGlzcG9zZU9mTWVzaGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIGlmIChtLmdlb21ldHJ5KSBtLmdlb21ldHJ5LmRpc3Bvc2UoKTtcbiAgICAgICAgbS5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnZGlzcG9zZSd9KTtcbiAgICB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5yZW1vdmVGcm9tU2NlbmUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fc2NlbmUpIHtcbiAgICAgICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgICAgICB0aGlzLl9zY2VuZS5yZW1vdmUobSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl91cGRhdGVNZXNoZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSB0aGlzLl9zY2VuZTsgLy8gcmVtZW1iZXIgdGhpcyBiZWNhdXNlIHJlbW92ZUZyb21TY2VuZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aWxsIGRlbGV0ZSB0aGlzLl9zY2VuZVxuICAgIGlmICh0aGlzLl9zY2VuZSkgeyB0aGlzLnJlbW92ZUZyb21TY2VuZSgpOyB9XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fY3JlYXRlTmV3TWVzaGVzKCk7XG4gICAgaWYgKHNjZW5lKSB7IHRoaXMuYWRkVG9TY2VuZShzY2VuZSk7IH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZG8gc29tZXRoaW5nIHRvIGVhY2ggbWVzaFxuU2NhcGVJdGVtLnByb3RvdHlwZS5lYWNoTWVzaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcykge1xuICAgICAgICBmb3IgKHZhciBtID0gMDsgbSA8IHRoaXMuX21lc2hlcy5sZW5ndGg7IG0rKykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLl9tZXNoZXNbbV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlSXRlbTtcbiIsIlxuLyoqXG4gKiBBIGJhZyBvZiBpdGVtIHR5cGVzIHRoYXQgc2NhcGVzIGNhbiBoYXZlIGluIHRoZW0uICBBbiBpdGVtIHR5cGVcbiAqIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBvcHRpb25zIGRlc2NyaWJpbmcgdGhlIGl0ZW0sIGFuZCByZXR1cm5zXG4gKiBhbiBhcnJheSBvZiBtZXNoZXMgdGhhdCBhcmUgdGhlIGl0ZW0gKGF0IDAsMCwwKS5cbiAqXG4gKiBXaGVuIGEgU2NhcGVJdGVtIGlzIGluc3RhbnRpYXRlZCBpdCBpbnZva2VzIHRoZSBhcHByb3ByaWF0ZSBpdGVtXG4gKiB0eXBlIHRvIGdldCBtZXNoZXMsIHRoZW4gcmUtcG9zaXRpb25zIHRoZSBtZXNoZXMgYXQgdGhlXG4gKiBhcHByb3ByaWF0ZSB4LHkseiBsb2NhdGlvbi5cbiAqXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZUl0ZW1zID0ge1xuICAgIC8vIGRvY3VtZW50YXRpb24gZm9yIGl0ZW1zIGFyZSBpbiB0aGUgLi9pdGVtdHlwZXMvKiBmaWxlc1xuICAgIGN1YmU6ICByZXF1aXJlKCcuL2l0ZW10eXBlcy9jdWJlJyksXG4gICAgdHJlZTogIHJlcXVpcmUoJy4vaXRlbXR5cGVzL3RyZWUnKSxcbiAgICBjcmFuZTogcmVxdWlyZSgnLi9pdGVtdHlwZXMvY3JhbmUnKVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW1zO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgbWVzaCBhcnJheSBmb3IgYSB0b3dlciBjcmFuZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSBjcmFuZS5cblxuICogQHBhcmFtIHt3aWR0aH0gb3B0aW9ucy53aWR0aD0yIFdpZHRoIG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2hlaWdodH0gb3B0aW9ucy5oZWlnaHQ9NTAgSGVpZ2h0IG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2xlbmd0aH0gb3B0aW9ucy5sZW5ndGg9NDAgTGVuZ3RoIG9mIGNyYW5lIGJvb20sIGZyb20gdGhlXG4gKiAgICAgICAgY3JhbmUncyBjZW50cmUgYXhpcyB0byB0aGUgdGlwXG4gKiBAcGFyYW0ge3JvdGF0aW9ufSBvcHRpb25zLnJvdGF0aW9uPTAgRGVncmVlcyBvZiBib29tIHJvdGF0aW9uLFxuICogICAgICAgIGNvdW50ZWQgY2xvY2t3aXNlIGZyb20gdGhlICt2ZSBZIGRpcmVjdGlvbiAoYXdheSBmcm9tXG4gKiAgICAgICAgdGhlIGNhbWVyYSlcbiAqIEBwYXJhbSB7Y291bnRlcndlaWdodExlbmd0aH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0TGVuZ3RoPWxlbmd0aC80XG4gKiAgICAgICAgTGVuZ3RoIG9mIHRoZSBjb3VudGVyd2VpZ2h0IGJvb20sIGZyb20gdGhlIGNyYW5lJ3MgY2VudHJlXG4gKiAgICAgICAgYXhpcyB0byB0aGUgZW5kIG9mIHRoZSBjb3VudGVyd2VpZ2h0XG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnN0cnV0cz1TY2FwZVN0dWZmLmdsb3NzQmxhY2tcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIHN0cnV0cyBpbiB0aGUgdG93ZXIgYW5kIGJvb20gb3V0IG9mXG4gICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5iYXNlPVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGJhc2Ugb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnJpbmc9U2NhcGVTdHVmZi5wbGFzdGljXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jYWJpbj1TY2FwZVN0dWZmLnBsYXN0aWNcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNhYmluIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy53aW5kb3c9U2NhcGVTdHVmZi5nbGFzc1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY2FiaW4gd2luZG93IG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0PVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNvdW50ZXJ3ZWlnaHQgb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmNyYW5lXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3JhbmVGYWN0b3J5KG9wdGlvbnMpIHtcblxuXHR2YXIgY3JhbmVQYXJ0cyA9IFtdO1xuXG5cdHZhciB0b3dlcldpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAyO1xuXHR2YXIgaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNTA7XG5cdHZhciBsZW5ndGggPSBvcHRpb25zLmxlbmd0aCB8fCA0MDtcblx0dmFyIGNvdW50ZXJ3ZWlnaHRMZW5ndGggPSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHRMZW5ndGggfHwgKGxlbmd0aCAvIDQpO1xuXHR2YXIgc3RydXRTdHVmZiA9IG9wdGlvbnMuc3RydXRzIHx8IFNjYXBlU3R1ZmYuZ2xvc3NCbGFjaztcblx0dmFyIGJhc2VTdHVmZiA9IG9wdGlvbnMuYmFzZSB8fCBTY2FwZVN0dWZmLmNvbmNyZXRlO1xuXHR2YXIgcmluZ1N0dWZmID0gb3B0aW9ucy5yaW5nIHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblx0dmFyIGNhYmluU3R1ZmYgPSBvcHRpb25zLmNhYmluIHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblx0dmFyIHdpbmRvd1N0dWZmID0gb3B0aW9ucy53aW5kb3cgfHwgU2NhcGVTdHVmZi5nbGFzcztcblx0dmFyIGNvdW50ZXJ3ZWlnaHRTdHVmZiA9IG9wdGlvbnMuY291bnRlcndlaWdodCB8fCBTY2FwZVN0dWZmLmNvbmNyZXRlO1xuXHR2YXIgcm90YXRpb24gPSAtMSAqIChvcHRpb25zLnJvdGF0aW9uIHx8IDApICogTWF0aC5QSSAvIDE4MDtcblxuXHR2YXIgdG93ZXJIZWlnaHQgPSBoZWlnaHQ7XG5cdHZhciBiYXNlVyA9IHRvd2VyV2lkdGggKiAzO1xuXHR2YXIgYmFzZUggPSB0b3dlcldpZHRoICogMjsgLy8gaGFsZiBvZiB0aGUgaGVpZ2h0IHdpbGwgYmUgXCJ1bmRlcmdyb3VuZFwiXG5cblx0dmFyIHBvbGVSID0gdG93ZXJXaWR0aCAvIDEwO1xuXG5cdHZhciByaW5nUiA9ICgodG93ZXJXaWR0aCAvIDIpICogTWF0aC5TUVJUMikgKyAxLjMgKiBwb2xlUjtcblx0dmFyIHJpbmdIID0gdG93ZXJXaWR0aCAvIDU7XG5cblx0dmFyIGJvb21MID0gbGVuZ3RoOyAvLyBsZW5ndGggb2YgY3JhbmUgYm9vbVxuXHR2YXIgY3diTCA9IGNvdW50ZXJ3ZWlnaHRMZW5ndGg7IC8vIGxlbmd0aCBvZiBjb3VudGVyd2VpZ2h0IGJvb21cblx0dmFyIHJvZEwgPSBib29tTCArIGN3Ykw7XG5cdHZhciBjd1cgPSB0b3dlcldpZHRoIC0gMypwb2xlUjtcblx0dmFyIGN3SCA9IHRvd2VyV2lkdGggKiAxLjU7XG5cdHZhciBjd0wgPSB0b3dlcldpZHRoICogMS41O1xuXG5cdHZhciBjYWJpblcgPSB0b3dlcldpZHRoO1xuXHR2YXIgY2FiaW5IID0gdG93ZXJXaWR0aCAqIDEuMjU7XG5cdHZhciBjYWJpbkwgPSBjYWJpbkg7XG5cblx0Ly8gdGhpcyBpcyBmb3Igcm90YXRpbmcgdGhlIGNyYW5lIGJvb21cblx0dmFyIHJvdGF0ZSA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvbloocm90YXRpb24pO1xuXG5cdC8vIHRoaXMgaXMgZm9yIG1ha2luZyBjeWxpbmRlcnMgZ28gdXByaWdodCAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIGN5bGluZGVyUm90YXRlID0gbmV3IE00KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vLy8vLy8vLy8gdGhlIGJhc2Vcblx0dmFyIGJhc2VHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGJhc2VXLCBiYXNlVywgYmFzZUgpO1xuXHR2YXIgYmFzZSA9IG5ldyBUSFJFRS5NZXNoKGJhc2VHZW9tLCBiYXNlU3R1ZmYpO1xuXHRjcmFuZVBhcnRzLnB1c2goYmFzZSk7XG5cblx0Ly8vLy8vLy8vLyB0aGUgdmVydGljYWwgbWFzdFxuXHQvLyBtYWtlIG9uZSBwb2xlIHRvIHN0YXJ0IHdpdGhcblx0dmFyIHBvbGVHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkocG9sZVIsIHBvbGVSLCB0b3dlckhlaWdodCk7XG5cdHBvbGVHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbih0b3dlcldpZHRoLzIsIHRvd2VyV2lkdGgvMiwgdG93ZXJIZWlnaHQvMikubXVsdGlwbHkoY3lsaW5kZXJSb3RhdGUpKTtcblxuXHQvLyBNYWtlIHRocmVlIG1vcmUgcG9sZXMgYnkgY29weWluZyB0aGUgZmlyc3QgcG9sZSBhbmQgcm90YXRpbmcgYW5vdGhlciA5MGRlZ3MgYXJvdW5kIHRoZSBjZW50cmVcblx0dmFyIHBvbGU7XG5cdHZhciByb3RhdGVBcm91bmRaID0gbmV3IE00KCkubWFrZVJvdGF0aW9uWihNYXRoLlBJLzIpO1xuXHRmb3IgKHZhciBwID0gMDsgcCA8IDQ7IHArKykge1xuXHRcdHBvbGUgPSBuZXcgVEhSRUUuTWVzaChwb2xlR2VvbSwgc3RydXRTdHVmZik7XG5cdFx0Y3JhbmVQYXJ0cy5wdXNoKHBvbGUpO1xuXHRcdHBvbGVHZW9tID0gcG9sZUdlb20uY2xvbmUoKTtcblx0XHRwb2xlR2VvbS5hcHBseU1hdHJpeChyb3RhdGVBcm91bmRaKTtcblx0fVxuXG5cblx0Ly8vLy8vLy8vLyB0aGUgcmluZyBhdCB0aGUgdG9wIG9mIHRoZSB0b3dlclxuXHR2YXIgcmluZ0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShyaW5nUiwgcmluZ1IsIHJpbmdILCAxMiwgMSwgdHJ1ZSk7XG5cdHJpbmdHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCB0b3dlckhlaWdodCAtIHJpbmdILzIpLm11bHRpcGx5KGN5bGluZGVyUm90YXRlKSk7XG5cdHJpbmdTdHVmZi5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKHJpbmdHZW9tLCByaW5nU3R1ZmYpKTtcblxuXG5cdC8vLy8vLy8vLy8gdGhlIGhvcml6b250YWwgYm9vbVxuXHQvLyBtYWtlIG9uZSByb2QgdG8gc3RhcnQgd2l0aFxuXHR2YXIgdG9wUm9kR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KHBvbGVSLCBwb2xlUiwgcm9kTCk7XG5cblx0Ly8gdG9wIHJvZFxuXHR0b3BSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAocm9kTC8yKSAtIGN3YkwsIHRvd2VySGVpZ2h0ICsgcG9sZVIgKyAwLjUgKiB0b3dlcldpZHRoKSk7XG5cdGxlZnRSb2RHZW9tID0gdG9wUm9kR2VvbS5jbG9uZSgpO1xuXHRyaWdodFJvZEdlb20gPSB0b3BSb2RHZW9tLmNsb25lKCk7XG5cblx0dG9wUm9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2godG9wUm9kR2VvbSwgc3RydXRTdHVmZikpO1xuXG5cdC8vIGJvdHRvbSBsZWZ0IHJvZFxuXHRsZWZ0Um9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oLTAuNSAqIHRvd2VyV2lkdGggKyBwb2xlUiwgMCwgLTAuNSAqIHRvd2VyV2lkdGgpKTtcblx0bGVmdFJvZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKGxlZnRSb2RHZW9tLCBzdHJ1dFN0dWZmKSk7XG5cblx0Ly8gYm90dG9tIHJpZ2h0IHJvZFxuXHRyaWdodFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAuNSAqIHRvd2VyV2lkdGggLSBwb2xlUiwgMCwgLTAuNSAqIHRvd2VyV2lkdGgpKTtcblx0cmlnaHRSb2RHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaChyaWdodFJvZEdlb20sIHN0cnV0U3R1ZmYpKTtcblxuXHQvLyBlbmQgb2YgdGhlIGJvb21cblx0dmFyIGVuZEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkodG93ZXJXaWR0aCwgcG9sZVIsIDAuNSAqIHRvd2VyV2lkdGggKyBwb2xlUiArIHBvbGVSKTtcblx0ZW5kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgYm9vbUwsIHRvd2VySGVpZ2h0ICsgMC4yNSAqIHRvd2VyV2lkdGggKyBwb2xlUikpO1xuXHRlbmRHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaChlbmRHZW9tLCBzdHJ1dFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNvdW50ZXJ3ZWlnaHRcblx0dmFyIGN3R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShjd1csIGN3TCwgY3dIKTtcblx0Y3dHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAxLjAwMSAqIChjd0wvMiAtIGN3YkwpLCB0b3dlckhlaWdodCkpO1xuXHRjd0dlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKGN3R2VvbSwgY291bnRlcndlaWdodFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNhYmluXG5cdHZhciBjYWJpbkdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoY2FiaW5XLCBjYWJpbkwsIGNhYmluSCk7XG5cdHZhciB3aW5kb3dHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGNhYmluVyAqIDEuMSwgY2FiaW5MICogMC42LCBjYWJpbkggKiAwLjYpO1xuXHRjYWJpbkdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGNhYmluVy8yICsgcG9sZVIsIDAsIGNhYmluSC8yICsgdG93ZXJIZWlnaHQgKyBwb2xlUiArIHBvbGVSKSk7XG5cdHdpbmRvd0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGNhYmluVy8yICsgcG9sZVIsIGNhYmluTCAqIDAuMjUsIGNhYmluSCAqIDAuNiArIHRvd2VySGVpZ2h0ICsgcG9sZVIgKyBwb2xlUikpO1xuXHRjYWJpbkdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0d2luZG93R2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2goY2FiaW5HZW9tLCBjYWJpblN0dWZmKSk7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaCh3aW5kb3dHZW9tLCB3aW5kb3dTdHVmZikpO1xuXG5cdC8vIHJldHVybiBhbGwgdGhlIGNyYW5lIGJpdHMuXG5cdHJldHVybiBjcmFuZVBhcnRzO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUNyYW5lRmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIGN1YmUgbWVzaCBvZiB0aGUgc3BlY2lmaWVkIHNpemUgYW5kIG1hdGVyaWFsLlxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgVGhlIGxlbmd0aCBvZiBhIHNpZGUgb2YgdGhlIGN1YmUuICBEZWZhdWx0cyB0byAxLlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gbWF0ZXJpYWwgV2hhdCB0aGUgbWFrZSB0aGUgY3ViZSBvdXQgb2YuICBEZWZhdWx0cyB0byBgU2NhcGUuU3R1ZmYuZ2VuZXJpY2BcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE5vdCB1c2VkLlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5jdWJlXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3ViZUZhY3Rvcnkoc2l6ZSwgbWF0ZXJpYWwsIG9wdGlvbnMpIHtcbiAgICAvLyBjb25zdHJ1Y3QgYSBtZXNoIFwic2l0dGluZyBvblwiIHRoZSBwb2ludCAwLDAsMFxuXG4gICAgc2l6ZSA9IHNpemUgfHwgMTtcbiAgICBtYXRlcmlhbCA9IG1hdGVyaWFsIHx8IFNjYXBlU3R1ZmYuZ2VuZXJpYztcblxuICAgIC8vIG1ha2VzIGEgY3ViZSBjZW50ZXJlZCBvbiAwLDAsMFxuICAgIHZhciBnZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHNpemUsIHNpemUsIHNpemUpO1xuXG4gICAgLy8gdHJhbnNmb3JtIGl0IHVwIGEgYml0LCBzbyB3ZSdyZSBjZW50ZXJlZCBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDAuXG4gICAgZ2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgc2l6ZS8yKSApO1xuXG4gICAgLy8gcmV0dXJuIGEgdGhpbmcgd2l0aCB0aGF0IGdlb21ldHJ5LCBtYWRlIG9mIHRoZSBtYXRlcmlhbFxuICAgIHJldHVybiBuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXRlcmlhbCk7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3ViZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSB0cmVlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBjb2xvci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuZGlhbWV0ZXI9MSBEaWFtZXRlciBvZiB0cnVuayAoYS5rLmEuIERCSClcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmhlaWdodD0xMCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy50cnVua01hdGVyaWFsPVNjYXBlU3R1ZmYud29vZCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5sZWFmTWF0ZXJpYWw9U2NhcGVTdHVmZi5mb2xpYWdlIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMudHJlZVxuICovXG5mdW5jdGlvbiBTY2FwZVRyZWVGYWN0b3J5KG9wdGlvbnMpIHtcblxuXHR2YXIgZGlhbSA9IG9wdGlvbnMuZGlhbWV0ZXIgfHwgMTtcblx0dmFyIGhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDEwO1xuXHR2YXIgdHJ1bmtTdHVmZiA9IG9wdGlvbnMudHJ1bmsgfHwgU2NhcGVTdHVmZi53b29kO1xuXHR2YXIgY2Fub3B5U3R1ZmYgPSBvcHRpb25zLmNhbm9weSB8fCBTY2FwZVN0dWZmLmZvbGlhZ2U7XG5cblx0dmFyIGNhbm9weUhlaWdodCA9IGhlaWdodCAvIDQ7XG5cdHZhciB0cmVlSGVpZ2h0ID0gaGVpZ2h0IC0gY2Fub3B5SGVpZ2h0O1xuXHR2YXIgdHJlZVJhZGl1cyA9IDIgKiBkaWFtIC8gMjtcblx0dmFyIGNhbm9weVJhZGl1cyA9IHRyZWVSYWRpdXMgKiA2O1xuXG5cdHZhciB0cnVua0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeSh0cmVlUmFkaXVzLzIsIHRyZWVSYWRpdXMsIHRyZWVIZWlnaHQsIDEyKTtcblx0dmFyIGNhbm9weUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShjYW5vcHlSYWRpdXMsIGNhbm9weVJhZGl1cywgY2Fub3B5SGVpZ2h0LCAxMik7XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIGNlbnRlciBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDBcblx0dmFyIHRydW5rUG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCB0cmVlSGVpZ2h0LzIpO1xuXG5cdC8vIGNlbnRlciBvbiB4ID0gMCwgeSA9IDAsIGJ1dCBoYXZlIHRoZSBjYW5vcHkgYXQgdGhlIHRvcFxuXHR2YXIgY2Fub3B5UG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBjYW5vcHlIZWlnaHQvMiArIGhlaWdodCAtIGNhbm9weUhlaWdodCk7XG5cblx0dHJ1bmtHZW9tLmFwcGx5TWF0cml4KHRydW5rUG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cdGNhbm9weUdlb20uYXBwbHlNYXRyaXgoY2Fub3B5UG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cblx0dmFyIHRydW5rID0gbmV3IFRIUkVFLk1lc2godHJ1bmtHZW9tLCB0cnVua1N0dWZmKTtcblx0Ly8gdmFyIGNhbm9weSA9IG5ldyBUSFJFRS5Qb2ludENsb3VkKGNhbm9weUdlb20sIGNhbm9weVN0dWZmKTtcblx0dmFyIGNhbm9weSA9IG5ldyBUSFJFRS5NZXNoKGNhbm9weUdlb20sIGNhbm9weVN0dWZmKTtcblx0cmV0dXJuIFt0cnVuaywgY2Fub3B5XTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVUcmVlRmFjdG9yeTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5TY2FwZUNodW5rID0gcmVxdWlyZSgnLi9jaHVuaycpO1xuXG5cbi8vIERFQlVHXG5TY2FwZVN0dWZmID0gcmVxdWlyZSgnLi9zdHVmZicpO1xuU2NhcGVJdGVtcyA9IHJlcXVpcmUoJy4vaXRlbXR5cGVzJyk7XG5TY2FwZUl0ZW0gPSByZXF1aXJlKCcuL2l0ZW0nKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBjYWxsYmFjayBTY2FwZVNjZW5lfmRhdGVDaGFuZ2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBlcnJvciBEZXNjcmlwdGlvbiBvZiBlcnJvciwgb3RoZXJ3aXNlIG51bGxcbiAqIEBwYXJhbSB7ZGF0ZX0gZGF0ZSBEYXRlIHRoZSBzY2FwZSBpcyBub3cgZGlzcGxheWluZ1xuICovXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgb2YgYSBsYW5kc2NhcGUgLyBtb29uc2NhcGUgLyB3aGF0ZXZlclxuICogQHBhcmFtIHtTY2FwZUZpZWxkfSBmaWVsZCAgdGhlIGZpZWxkIGJlaW5nIHJlbmRlcmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gZG9tICAgICAgICBET00gZWxlbWVudCB0aGUgc2NhcGUgc2hvdWxkIGJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlZCBpbnRvLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgICAgY29sbGVjdGlvbiBvZiBvcHRpb25zLiAgQWxsIGFyZSBvcHRpb25hbC5cbiAqIEBwYXJhbSB7U3RyaW5nW119IG9wdGlvbnMubGlnaHRzPSdzdW4nLCdza3knIC0gYXJyYXkgb2Ygc3RyaW5nc1xuICogbmFtaW5nIGxpZ2h0cyB0byBpbmNsdWRlIGluIHRoaXMgc2NlbmUuICBDaG9vc2UgZnJvbTpcbiAqXG4gKiBzdHJpbmcgICAgfCBsaWdodCB0eXBlXG4gKiAtLS0tLS0tLS0tfC0tLS0tLS0tLS0tXG4gKiBgdG9wbGVmdGAgfCBhIGxpZ2h0IGZyb20gYWJvdmUgdGhlIGNhbWVyYSdzIGxlZnQgc2hvdWxkZXJcbiAqIGBhbWJpZW50YCB8IGEgZGltIGFtYmllbnQgbGlnaHRcbiAqIGBzdW5gICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBvcmJpdHMgdGhlIHNjZW5lIG9uY2UgcGVyIGRheVxuICogYHNreWAgICAgIHwgYSBkaXJlY3Rpb25hbCBsaWdodCB0aGF0IHNoaW5lcyBmcm9tIGFib3ZlIHRoZSBzY2VuZVxuICogQHBhcmFtIHtEYXRlfFwibm93XCJ9IG9wdGlvbnMuY3VycmVudERhdGU9J25vdycgLSBUaGUgdGltZSBhbmQgZGF0ZVxuICogaW5zaWRlIHRoZSBzY2FwZS4gIFRoZSBzdHJpbmcgXCJub3dcIiBtZWFucyBzZXQgY3VycmVudERhdGUgdG8gdGhlXG4gKiBwcmVzZW50LlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMudGltZVJhdGlvPTEgVGhlIHJhdGUgdGltZSBzaG91bGQgcGFzcyBpblxuICogdGhlIHNjYXBlLCByZWxhdGl2ZSB0byBub3JtYWwuICAwLjEgbWVhbnMgdGVuIHRpbWVzIHNsb3dlci4gIDYwXG4gKiBtZWFucyBvbmUgbWludXRlIHJlYWwgdGltZSA9IG9uZSBob3VyIHNjYXBlIHRpbWUuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV+ZGF0ZUNoYW5nZX0gb3B0aW9ucy5kYXRlVXBkYXRlIGNhbGxiYWNrIGZvclxuICogd2hlbiB0aGUgc2NlbmUgdGltZSBjaGFuZ2VzICh3aGljaCBpcyBhIGxvdCkuXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlU2NlbmUoZmllbGQsIGRvbSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICAvLyBsaWdodHM6IFsndG9wbGVmdCcsICdhbWJpZW50J10sXG4gICAgICAgIGxpZ2h0czogWydzdW4nLCAnc2t5J10sXG4gICAgICAgIGN1cnJlbnREYXRlOiAnbm93JywgIC8vIGVpdGhlciBzdHJpbmcgJ25vdycgb3IgYSBEYXRlIG9iamVjdFxuICAgICAgICB0aW1lUmF0aW86IDEsXG4gICAgICAgIGRhdGVVcGRhdGU6IG51bGwgLy8gY2FsbGJhY2sgdG91cGRhdGUgdGhlIGRpc3BsYXllZCBkYXRlL3RpbWVcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gc2F2ZSB0aGUgZmllbGRcbiAgICB0aGlzLmYgPSBmaWVsZDtcblxuICAgIC8vIGRpc2NvdmVyIERPTSBjb250YWluZXJcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkb20pO1xuXG4gICAgdGhpcy5kYXRlID0gdGhpcy5fb3B0cy5jdXJyZW50RGF0ZTtcbiAgICBpZiAodGhpcy5kYXRlID09PSAnbm93Jykge1xuICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLnN0YXJ0RGF0ZSA9IHRoaXMuZGF0ZTtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAvLyBjcmVhdGUgYW5kIHNhdmUgYWxsIHRoZSBiaXRzIHdlIG5lZWRcbiAgICB0aGlzLnJlbmRlcmVyID0gdGhpcy5fbWFrZVJlbmRlcmVyKHsgZG9tOiB0aGlzLmVsZW1lbnQgfSk7XG4gICAgdGhpcy5zY2VuZSA9IHRoaXMuX21ha2VTY2VuZSgpO1xuICAgIHRoaXMuY2FtZXJhID0gdGhpcy5fbWFrZUNhbWVyYSgpO1xuICAgIHRoaXMuY29udHJvbHMgPSB0aGlzLl9tYWtlQ29udHJvbHMoKTtcbiAgICB0aGlzLmxpZ2h0cyA9IHRoaXMuX21ha2VMaWdodHModGhpcy5fb3B0cy5saWdodHMpO1xuXG4gICAgdGhpcy5jb25uZWN0RmllbGQoKTtcblxuICAgIC8vIGFkZCBncmlkcyBhbmQgaGVscGVyIGN1YmVzXG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCk7XG4gICAgdGhpcy5hZGRIZWxwZXJHcmlkKCd0b3AnKTtcbiAgICB0aGlzLmFkZEhlbHBlclNoYXBlcygpO1xuXG4gICAgdmFyIGxhc3RMb2dBdCA9IDA7IC8vIERFQlVHXG4gICAgdmFyIHJlbmRlciA9IChmdW5jdGlvbiB1bmJvdW5kUmVuZGVyKHRzKSB7XG5cbiAgICAgICAgLy8gREVCVUdcbiAgICAgICAgaWYgKGxhc3RMb2dBdCArIDIwMDAgPCB0cykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3JlbmRlcmluZy4uLicpO1xuICAgICAgICAgICAgbGFzdExvZ0F0ID0gdHM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBERUJVRyBkaXNhYmxlZCB0aW1lIHVwZGF0ZXMuLlxuICAgICAgICB0aGlzLl91cGRhdGVUaW1lKCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCByZW5kZXIgKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIoIHRoaXMuc2NlbmUsIHRoaXMuY2FtZXJhICk7XG4gICAgICAgIHRoaXMuY29udHJvbHMudXBkYXRlKCk7XG4gICAgfSkuYmluZCh0aGlzKTtcblxuICAgIHJlbmRlcigwKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlU2NlbmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZVNjZW5lO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBhIG1lc2ggdG8gdGhlIFRIUkVFLlNjZW5lIChhIHBhc3N0aHJvdWdoIGZvciBUSFJFRS5TY2VuZS5hZGQpXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHRoaW5nKSB7XG4gICAgdGhpcy5zY2VuZS5hZGQodGhpbmcpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHJlbW92ZSBhIG1lc2ggdG8gdGhlIFRIUkVFLlNjZW5lIChhIHBhc3N0aHJvdWdoIGZvciBUSFJFRS5TY2VuZS5yZW1vdmUpXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHRoaW5nKSB7XG4gICAgdGhpcy5zY2VuZS5yZW1vdmUodGhpbmcpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBibG9ja3MgZnJvbSB0aGUgYXR0YWNoZWQgU2NhcGVGaWVsZCBpbnRvIHRoZSBzY2VuZS5cbiAqXG4gKiBZb3Ugd2lsbCBwcm9iYWJseSBvbmx5IG5lZWQgdG8gY2FsbCB0aGlzIG9uY2UuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbm5lY3RGaWVsZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZi5idWlsZEJsb2Nrcyh0aGlzKTtcbiAgICB0aGlzLmYuYnVpbGRJdGVtcyh0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgaGVscGVyIGN1YmVzIGF0IHNvbWUgb2YgdGhlIGNvcm5lcnMgb2YgeW91ciBzY2FwZSwgc28geW91IGNhblxuICogc2VlIHdoZXJlIHRoZXkgYXJlIGluIHNwYWNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJTaGFwZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgd2hpdGUgPSAweGZmZmZmZjtcbiAgICB2YXIgcmVkICAgPSAweGZmMDAwMDtcbiAgICB2YXIgZ3JlZW4gPSAweDAwZmYwMDtcbiAgICB2YXIgYmx1ZSAgPSAweDAwMDBmZjtcbiAgICB2YXIgZiA9IHRoaXMuZjtcblxuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWluWSwgZi5taW5aLCB3aGl0ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWF4WCwgZi5taW5ZLCBmLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKChmLm1pblggKyBmLm1heFgpIC8gMiwgZi5taW5ZLCBmLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5tYXhZLCBmLm1pblosIGdyZWVuKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWF4WiwgYmx1ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWF4WCwgZi5tYXhZLCBmLm1pblosIHdoaXRlKTtcblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBhIGN1YmUgYXQgcG9zaXRpb24gYHhgLCBgeWAsIGB6YCB0byBjb25maXJtIHdoZXJlIHRoYXQgaXMsXG4gKiBleGFjdGx5LiAgR3JlYXQgZm9yIHRyeWluZyB0byB3b3JrIG91dCBpZiB5b3VyIHNjYXBlIGlzIGJlaW5nXG4gKiByZW5kZXJlZCB3aGVyZSB5b3UgdGhpbmsgaXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICpcbiAqIEBwYXJhbSB7KE51bWJlcnxWZWN0b3IzKX0geCBYIGNvb3JkaW5hdGUsIG9yIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9WZWN0b3IzIFRIUkVFLlZlY3RvcjN9IGNvbnRhaW5pbmcgeCwgeSBhbmQgeiBjb29yZHNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbeV0gWSBjb29yZGluYXRlXG4gKiBAcGFyYW0ge051bWJlcn0gW3pdIFogY29vcmRpbmF0ZVxuICogQHBhcmFtIHtDb2xvcnxTdHJpbmd8SW50ZWdlcn0gY29sb3I9JyNjY2NjY2MnIENvbG9yIG9mIGN1YmUuXG4gKiBDYW4gYmUgYSB7QGxpbmsgaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9NYXRoL0NvbG9yIFRIUkVFLkNvbG9yfSwgYSBjb2xvci1wYXJzZWFibGUgc3RyaW5nIGxpa2VcbiAqIGAnIzMzNjZjYydgLCBvciBhIG51bWJlciBsaWtlIGAweDMzNjZjY2AuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckN1YmUgPSBmdW5jdGlvbih4LCB5LCB6LCBjb2xvcikge1xuICAgIC8vIGZpcnN0LCBzZXQgdGhlIGNvbG9yIHRvIHNvbWV0aGluZ1xuICAgIGlmICh0eXBlb2YgY29sb3IgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gZGVmYXVsdCB0byBsaWdodCBncmV5LlxuICAgICAgICBjb2xvciA9IG5ldyBUSFJFRS5Db2xvcigweGNjY2NjYyk7XG4gICAgfVxuICAgIHZhciBwb3M7IC8vIHRoZSBwb3NpdGlvbiB0byBkcmF3IHRoZSBjdWJlXG4gICAgaWYgKHR5cGVvZiB4LnggIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gdGhlbiBpdCdzIGEgdmVjdG9yLCBhbmQgeSBtaWdodCBiZSB0aGUgY29sb3JcbiAgICAgICAgcG9zID0geDtcbiAgICAgICAgaWYgKHR5cGVvZiB5ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb2xvciA9IHk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB4IGlzbid0IGEgdmVjdG9yLCBzbyBhc3N1bWUgc2VwYXJhdGUgeCB5IGFuZCB6XG4gICAgICAgIHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIHopO1xuICAgICAgICAvLyB3ZSBjYXVnaHQgY29sb3IgYWxyZWFkeS5cbiAgICB9XG5cbiAgICAvLyBhYm91dCBhIGZpZnRpZXRoIG9mIHRoZSBmaWVsZCdzIHN1bW1lZCBkaW1lbnNpb25zXG4gICAgdmFyIHNpemUgPSAodGhpcy5mLndYICsgdGhpcy5mLndZICsgdGhpcy5mLndaKSAvIDUwO1xuICAgIC8vIHVzZSB0aGUgY29sb3VyIHdlIGRlY2lkZWQgZWFybGllclxuICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHsgY29sb3I6IGNvbG9yIH0pO1xuXG4gICAgLy8gb2theS4uIG1ha2UgaXQsIHBvc2l0aW9uIGl0LCBhbmQgc2hvdyBpdFxuICAgIHZhciBjdWJlID0gU2NhcGVJdGVtcy5jdWJlKHNpemUsIG1hdGVyaWFsKTtcbiAgICBjdWJlLnBvc2l0aW9uLmNvcHkocG9zKTtcbiAgICB0aGlzLnNjZW5lLmFkZChjdWJlKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyR3JpZCA9IGZ1bmN0aW9uKHRvcE9yQm90dG9tKSB7XG4gICAgdmFyIGd6ID0gMDtcbiAgICB2YXIgZ2MgPSAweDQ0NDQ0NDtcbiAgICBpZiAodG9wT3JCb3R0b20gPT0gJ3RvcCcpIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWF4WjtcbiAgICAgICAgZ2MgPSAweGNjY2NmZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBneiA9IHRoaXMuZi5taW5aO1xuICAgICAgICBnYyA9IDB4Y2NmZmNjO1xuICAgIH1cblxuICAgIHZhciBncmlkVyA9IE1hdGgubWF4KHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsIHRoaXMuZi5tYXhZIC0gdGhpcy5mLm1pblkpO1xuXG4gICAgLy8gR3JpZCBcInNpemVcIiBpcyB0aGUgZGlzdGFuY2UgaW4gZWFjaCBvZiB0aGUgZm91ciBkaXJlY3Rpb25zLFxuICAgIC8vIHRoZSBncmlkIHNob3VsZCBzcGFuLiAgU28gZm9yIGEgZ3JpZCBXIHVuaXRzIGFjcm9zcywgc3BlY2lmeVxuICAgIC8vIHRoZSBzaXplIGFzIFcvMi5cbiAgICB2YXIgZ3JpZFhZID0gbmV3IFRIUkVFLkdyaWRIZWxwZXIoZ3JpZFcvMiwgZ3JpZFcvMTApO1xuICAgIGdyaWRYWS5zZXRDb2xvcnMoZ2MsIGdjKTtcbiAgICBncmlkWFkucm90YXRpb24ueCA9IE1hdGguUEkvMjtcbiAgICBncmlkWFkucG9zaXRpb24uc2V0KHRoaXMuZi5taW5YICsgZ3JpZFcvMiwgdGhpcy5mLm1pblkgKyBncmlkVy8yLCBneik7XG4gICAgdGhpcy5zY2VuZS5hZGQoZ3JpZFhZKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBDcmVhdGUgYW5kIHJldHVybiBhIFRIUkVFLlJlbmRlcmVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB2YXJpb3VzIG9wdGlvbnNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudHxqUXVlcnlFbGVtfSBvcHRpb25zLmRvbSBhIGRvbSBlbGVtZW50XG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMud2lkdGggcmVuZGVyZXIgd2lkdGggKGluIHBpeGVscylcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5oZWlnaHQgcmVuZGVyZXIgaGVpZ2h0IChpbiBwaXhlbHMpXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VSZW5kZXJlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGFudGlhbGlhczogdHJ1ZSwgYWxwaGE6IHRydWUsIHByZWNpc2lvbjogXCJoaWdocFwiIH0pO1xuICAgIHJlbmRlcmVyLnNldENsZWFyQ29sb3IoIDB4MDAwMDAwLCAwKTtcbiAgICByZW5kZXJlci5zaGFkb3dNYXBFbmFibGVkID0gdHJ1ZTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRvbSkge1xuICAgICAgICB2YXIgJGRvbSA9ICQob3B0aW9ucy5kb20pO1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKCRkb20ud2lkdGgoKSwgJGRvbS5oZWlnaHQoKSk7XG4gICAgICAgICRkb20uYXBwZW5kKHJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLndpZHRoICYmIG9wdGlvbnMuaGVpZ2h0KSB7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUob3B0aW9ucy53aWR0aCwgb3B0aW9ucy5oZWlnaHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVuZGVyZXI7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgc2NhcGUgdGltZSB0byBtYXRjaCB0aGUgY3VycmVudCB0aW1lICh0YWtpbmcgaW50b1xuICogYWNjb3VudCB0aGUgdGltZVJhdGlvIGV0YykuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX3VwZGF0ZVRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdy5nZXRUaW1lKCkgLSB0aGlzLmZpcnN0UmVuZGVyO1xuICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKHRoaXMuZmlyc3RSZW5kZXIgKyAoZWxhcHNlZCAqIHRoaXMuX29wdHMudGltZVJhdGlvKSk7XG4gICAgdmFyIGNhbGxiYWNrID0gdGhpcy5fb3B0cy5kYXRlVXBkYXRlO1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrRGF0ZSA9IG5ldyBEYXRlKHRoaXMuZGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGNhbGxiYWNrRGF0ZSk7XG4gICAgICAgIH0sIDApO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVTdW4oKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB1cGRhdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc3VuIHRvIHN1aXQgdGhlIHNjYXBlIGN1cnJlbnQgdGltZS5cbiAqIEBwYXJhbSAge1RIUkVFLkRpcmVjdGlvbmFsTGlnaHR9IFtzdW5dIHRoZSBzdW4gdG8gYWN0IG9uLiAgSWYgbm90XG4gKiBzdXBwbGllZCwgdGhpcyBtZXRob2Qgd2lsbCBhY3Qgb24gdGhlIGxpZ2h0IGluIHRoaXMgc2NlbmUncyBsaWdodFxuICogbGlzdCB0aGF0IGlzIGNhbGxlZCBcInN1blwiLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVTdW4gPSBmdW5jdGlvbihzdW4pIHtcblxuICAgIGlmICh0eXBlb2Ygc3VuID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGlmIHRoZXkgZGlkbid0IHByb3ZpZGUgYSBzdW4sIHVzZSBvdXIgb3duXG4gICAgICAgIHN1biA9IHRoaXMubGlnaHRzLnN1bjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47IC8vIGJhaWwgaWYgdGhlcmUncyBubyBzdW4gV0hBVCBESUQgWU9VIERPIFlPVSBNT05TVEVSXG4gICAgfVxuXG4gICAgdmFyIHN1bkFuZ2xlID0gKHRoaXMuZGF0ZS5nZXRIb3VycygpKjYwICsgdGhpcy5kYXRlLmdldE1pbnV0ZXMoKSkgLyAxNDQwICogMiAqIE1hdGguUEk7XG4gICAgdmFyIHN1blJvdGF0aW9uQXhpcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xuXG4gICAgc3VuLnBvc2l0aW9uXG4gICAgICAgIC5zZXQoMCwgLTMgKiB0aGlzLmYud1ksIC0yMCAqIHRoaXMuZi53WilcbiAgICAgICAgLmFwcGx5QXhpc0FuZ2xlKHN1blJvdGF0aW9uQXhpcywgc3VuQW5nbGUpXG4gICAgICAgIC5hZGQodGhpcy5mLmNlbnRlcik7XG5cbiAgICB2YXIgc3VuWiA9IHN1bi5wb3NpdGlvbi56O1xuXG4gICAgLy8gc3dpdGNoIHRoZSBzdW4gb2ZmIHdoZW4gaXQncyBuaWdodCB0aW1lXG4gICAgaWYgKHN1bi5vbmx5U2hhZG93ID09IGZhbHNlICYmIHN1blogPD0gdGhpcy5mLmNlbnRlci56KSB7XG4gICAgICAgIHN1bi5vbmx5U2hhZG93ID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHN1bi5vbmx5U2hhZG93ID09IHRydWUgJiYgc3VuWiA+IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGZhZGUgb3V0IHRoZSBzaGFkb3cgZGFya25lc3Mgd2hlbiB0aGUgc3VuIGlzIGxvd1xuICAgIGlmIChzdW5aID49IHRoaXMuZi5jZW50ZXIueiAmJiBzdW5aIDw9IHRoaXMuZi5tYXhaKSB7XG4gICAgICAgIHZhciB1cG5lc3MgPSBNYXRoLm1heCgwLCAoc3VuWiAtIHRoaXMuZi5jZW50ZXIueikgLyB0aGlzLmYud1ogKiAyKTtcbiAgICAgICAgc3VuLnNoYWRvd0RhcmtuZXNzID0gMC41ICogdXBuZXNzO1xuICAgICAgICBzdW4uaW50ZW5zaXR5ID0gdXBuZXNzO1xuICAgIH1cblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlTGlnaHRzID0gZnVuY3Rpb24obGlnaHRzVG9JbmNsdWRlKSB7XG5cbiAgICB2YXIgbGlnaHRzID0ge307XG4gICAgdmFyIGYgPSB0aGlzLmY7ICAvLyBjb252ZW5pZW50IHJlZmVyZW5jZSB0byB0aGUgZmllbGRcblxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignYW1iaWVudCcpICE9IC0xKSB7XG4gICAgICAgIC8vIGFkZCBhbiBhbWJpZW50IGxpc3RcbiAgICAgICAgbGlnaHRzLmFtYmllbnQgPSBuZXcgVEhSRUUuQW1iaWVudExpZ2h0KDB4MjIyMjMzKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCd0b3BsZWZ0JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLmxlZnQgPSBuZXcgVEhSRUUuUG9pbnRMaWdodCgweGZmZmZmZiwgMSwgMCk7XG4gICAgICAgIC8vIHBvc2l0aW9uIGxpZ2h0IG92ZXIgdGhlIHZpZXdlcidzIGxlZnQgc2hvdWxkZXIuLlxuICAgICAgICAvLyAtIExFRlQgb2YgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeCB3aWR0aFxuICAgICAgICAvLyAtIEJFSElORCB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB5IHdpZHRoXG4gICAgICAgIC8vIC0gQUJPVkUgdGhlIGNhbWVyYSBieSB0aGUgZmllbGQncyBoZWlnaHRcbiAgICAgICAgbGlnaHRzLmxlZnQucG9zaXRpb24uYWRkVmVjdG9ycyhcbiAgICAgICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLFxuICAgICAgICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoLTAuNSAqIGYud1gsIC0wLjUgKiBmLndZLCAxICogZi53WilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdzdW4nKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc3VuID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZWUpO1xuICAgICAgICBsaWdodHMuc3VuLmludGVuc2l0eSA9IDEuMDtcblxuICAgICAgICB0aGlzLl91cGRhdGVTdW4obGlnaHRzLnN1bik7XG5cbiAgICAgICAgLy8gbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFWaXNpYmxlID0gdHJ1ZTsgIC8vIERFQlVHXG5cbiAgICAgICAgLy8gZGlyZWN0aW9uIG9mIHN1bmxpZ2h0XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc3VuLnRhcmdldCA9IHRhcmdldDtcblxuICAgICAgICAvLyBzdW4gZGlzdGFuY2UsIGxvbFxuICAgICAgICB2YXIgc3VuRGlzdGFuY2UgPSBsaWdodHMuc3VuLnBvc2l0aW9uLmRpc3RhbmNlVG8obGlnaHRzLnN1bi50YXJnZXQucG9zaXRpb24pO1xuICAgICAgICAvLyBsb25nZXN0IGRpYWdvbmFsIGZyb20gZmllbGQtY2VudGVyXG4gICAgICAgIHZhciBtYXhGaWVsZERpYWdvbmFsID0gZi5jZW50ZXIuZGlzdGFuY2VUbyhuZXcgVEhSRUUuVmVjdG9yMyhmLm1pblgsIGYubWluWSwgZi5taW5aKSk7XG5cbiAgICAgICAgLy8gc2hhZG93IHNldHRpbmdzXG4gICAgICAgIGxpZ2h0cy5zdW4uY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93RGFya25lc3MgPSAwLjMzO1xuXG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTmVhciA9IHN1bkRpc3RhbmNlIC0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFGYXIgPSBzdW5EaXN0YW5jZSArIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVG9wID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFSaWdodCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhQm90dG9tID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUxlZnQgPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc2t5JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnNreSA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZWVlZWZmKTtcbiAgICAgICAgbGlnaHRzLnNreS5pbnRlbnNpdHkgPSAwLjg7XG5cbiAgICAgICAgLy8gc2t5IGlzIGRpcmVjdGx5IGFib3ZlXG4gICAgICAgIHZhciBza3lIZWlnaHQgPSA1ICogZi53WjtcbiAgICAgICAgbGlnaHRzLnNreS5wb3NpdGlvbi5jb3B5KHRoaXMuY2FtZXJhLnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbGlnaHRzLnNreS5wb3NpdGlvbi5zZXRaKGYubWF4WiArIHNreUhlaWdodCk7XG5cbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5za3kudGFyZ2V0ID0gdGFyZ2V0O1xuICAgIH1cblxuICAgIGZvciAodmFyIGxpZ2h0IGluIGxpZ2h0cykge1xuICAgICAgICBpZiAobGlnaHRzLmhhc093blByb3BlcnR5KGxpZ2h0KSkge1xuICAgICAgICAgICAgdGhpcy5zY2VuZS5hZGQobGlnaHRzW2xpZ2h0XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlnaHRzO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlU2NlbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcbiAgICAvLyBhZGQgZm9nXG4gICAgLy8gc2NlbmUuZm9nID0gbmV3IFRIUkVFLkZvZyhcbiAgICAvLyAgICAgJyNmMGY4ZmYnLFxuICAgIC8vICAgICB0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLFxuICAgIC8vICAgICB0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YICogM1xuICAgIC8vICk7XG4gICAgcmV0dXJuIHNjZW5lO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ2FtZXJhID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG4gICAgLy8gdmlld2luZyBhbmdsZVxuICAgIC8vIGkgdGhpbmsgdGhpcyBpcyB0aGUgdmVydGljYWwgdmlldyBhbmdsZS4gIGhvcml6b250YWwgYW5nbGUgaXNcbiAgICAvLyBkZXJpdmVkIGZyb20gdGhpcyBhbmQgdGhlIGFzcGVjdCByYXRpby5cbiAgICB2YXIgdmlld0FuZ2xlID0gNDU7XG4gICAgdmlld0FuZ2xlID0gKG9wdGlvbnMgJiYgb3B0aW9ucy52aWV3QW5nbGUpIHx8IHZpZXdBbmdsZTtcblxuICAgIC8vIGFzcGVjdFxuICAgIHZhciB2aWV3QXNwZWN0ID0gMTYvOTtcbiAgICBpZiAodGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICB2aWV3QXNwZWN0ID0gJGVsZW0ud2lkdGgoKSAvICRlbGVtLmhlaWdodCgpO1xuICAgIH1cblxuICAgIC8vIG5lYXIgYW5kIGZhciBjbGlwcGluZ1xuICAgIHZhciBuZWFyQ2xpcCA9IDAuMTtcbiAgICB2YXIgZmFyQ2xpcCA9IDEwMDAwO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbmVhckNsaXAgPSBNYXRoLm1pbih0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAvIDEwMDA7XG4gICAgICAgIGZhckNsaXAgPSBNYXRoLm1heCh0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAqIDEwO1xuICAgIH1cblxuICAgIC8vIGNhbWVyYSBwb3NpdGlvbiBhbmQgbG9va2luZyBkaXJlY3Rpb25cbiAgICB2YXIgbG9va0hlcmUgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcbiAgICB2YXIgY2FtUG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEwLCA1KTtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIGxvb2tIZXJlID0gdGhpcy5mLmNlbnRlcjtcbiAgICAgICAgY2FtUG9zID0gbG9va0hlcmUuY2xvbmUoKS5hZGQobmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEuMSAqIHRoaXMuZi53WSwgMyAqIHRoaXMuZi53WikpO1xuICAgIH1cblxuICAgIC8vIHNldCB1cCBjYW1lcmFcbiAgICB2YXIgY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKCB2aWV3QW5nbGUsIHZpZXdBc3BlY3QsIG5lYXJDbGlwLCBmYXJDbGlwKTtcbiAgICAvLyBcInVwXCIgaXMgcG9zaXRpdmUgWlxuICAgIGNhbWVyYS51cC5zZXQoMCwwLDEpO1xuICAgIGNhbWVyYS5wb3NpdGlvbi5jb3B5KGNhbVBvcyk7XG4gICAgY2FtZXJhLmxvb2tBdChsb29rSGVyZSk7XG5cbiAgICAvLyBhZGQgdGhlIGNhbWVyYSB0byB0aGUgc2NlbmVcbiAgICBpZiAodGhpcy5zY2VuZSkge1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChjYW1lcmEpO1xuICAgIH1cblxuICAgIHJldHVybiBjYW1lcmE7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDb250cm9scyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKTtcbiAgICBpZiAodGhpcy5mICYmIHRoaXMuZi5jZW50ZXIpIHtcbiAgICAgICAgY2VudGVyID0gdGhpcy5mLmNlbnRlci5jbG9uZSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jYW1lcmEgJiYgdGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5jYW1lcmEsIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIGNvbnRyb2xzLmNlbnRlciA9IGNlbnRlcjtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xzO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJ3NjYXBlISdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU2NlbmU7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuXG52YXIgTGFtYmVydCA9IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWw7XG52YXIgUGhvbmcgPSBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBTdHVmZiAodGhhdCBpcywgVEhSRUUuTWF0ZXJpYWwpIHRoYXQgdGhpbmdzIGluIHNjYXBlcyBjYW4gYmUgbWFkZSBvdXQgb2YuXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZVN0dWZmID0ge307XG5cbi8qKiBnZW5lcmljIHN0dWZmLCBmb3IgaWYgbm90aGluZyBlbHNlIGlzIHNwZWNpZmllZFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdlbmVyaWMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSxcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjUwIH0pO1xuXG4vKiogd2F0ZXIgaXMgYmx1ZSBhbmQgYSBiaXQgdHJhbnNwYXJlbnRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53YXRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MzM5OWZmLFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNzUgfSk7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdG9uZSwgZGlydCwgYW5kIGdyb3VuZCBtYXRlcmlhbHNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKiogZGlydCBmb3IgZ2VuZXJhbCB1c2VcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5kaXJ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhhMDUyMmQgfSk7XG5cbi8vIE5pbmUgZGlydCBjb2xvdXJzIGZvciB2YXJ5aW5nIG1vaXN0dXJlIGxldmVscy4gIFN0YXJ0IGJ5IGRlZmluaW5nXG4vLyB0aGUgZHJpZXN0IGFuZCB3ZXR0ZXN0IGNvbG91cnMsIGFuZCB1c2UgLmxlcnAoKSB0byBnZXQgYSBsaW5lYXJcbi8vIGludGVycG9sYXRlZCBjb2xvdXIgZm9yIGVhY2ggb2YgdGhlIGluLWJldHdlZW4gZGlydHMuXG52YXIgZHJ5ID0gbmV3IFRIUkVFLkNvbG9yKDB4YmI4ODU1KTsgLy8gZHJ5XG52YXIgd2V0ID0gbmV3IFRIUkVFLkNvbG9yKDB4ODgyMjAwKTsgLy8gbW9pc3RcblxuLyoqIGRpcnQgYXQgdmFyeWluZyBtb2lzdHVyZSBsZXZlbHM6IGRpcnQwIGlzIGRyeSBhbmQgbGlnaHQgaW5cbiAgKiBjb2xvdXIsIGRpcnQ5IGlzIG1vaXN0IGFuZCBkYXJrLlxuICAqIEBuYW1lIGRpcnRbMC05XVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQwID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5IH0pO1xuU2NhcGVTdHVmZi5kaXJ0MSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAxLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAyLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAzLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA0LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA1LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA2LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA3LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA4LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IHdldCB9KTtcblxuLyoqIGxlYWYgbGl0dGVyLCB3aGljaCBpbiByZWFsaXR5IGlzIHVzdWFsbHkgYnJvd25pc2gsIGJ1dCB0aGlzIGhhc1xuICAqIGEgZ3JlZW5pc2ggdG9uZSB0byBkaXN0aW5ndWlzaCBpdCBmcm9tIHBsYWluIGRpcnQuXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGVhZmxpdHRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NjY2YjJmIH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGZsb3JhIC0gd29vZCwgbGVhdmVzLCBldGNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKiogZ2VuZXJpYyBicm93biB3b29kXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud29vZCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4Nzc0NDIyIH0pO1xuXG4vKiogbGlnaHQgd29vZCBmb3IgZ3VtdHJlZXMgZXRjLiAgTWF5YmUgaXQncyBhIGJpdCB0b28gbGlnaHQ/XG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGlnaHR3b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhmZmVlY2MgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDU1ODgzMyB9KTtcblxuLyoqIGEgZ2VuZXJpYyBncmVlbmlzaCBsZWFmIG1hdGVyaWFsXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZm9saWFnZSA9IG5ldyBMYW1iZXJ0KFxuICB7IGNvbG9yOiAweDU1ODgzMywgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNzUgfVxuKTtcblxuLyoqIGEgZm9saWFnZSBtYXRlcmlhbCBmb3IgdXNlIGluIHBvaW50IGNsb3VkIG9iamVjdHNcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5wb2ludEZvbGlhZ2UgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZE1hdGVyaWFsKHsgY29sb3I6IDB4NTU4ODMzLCBzaXplOiAwLjUgfSk7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYnVpbHQgbWF0ZXJpYWxzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIHNpbHZlcnkgbWV0YWxcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5tZXRhbCA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweDg4OTlhYSwgc3BlY3VsYXI6IDB4ZmZmZmZmLCBzaGluaW5lc3M6IDEwMCwgcmVmbGVjdGl2aXR5OiAwLjggfSk7XG5cbi8qKiBjb25jcmV0ZSBpbiBhIHNvcnQgb2YgbWlkLWdyZXlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5jb25jcmV0ZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4OTk5OTk5IH0pO1xuXG4vKiogcGxhc3RpYywgYSBnZW5lcmljIHdoaXRpc2ggcGxhc3RpYyB3aXRoIGEgYml0IG9mIHNoaW5pbmVzc1xuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnBsYXN0aWMgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHg5OTk5OTksIGVtaXNzaXZlOiAweDk5OTk5OSwgc3BlY3VsYXI6IDB4Y2NjY2NjIH0pO1xuXG4vKiogZ2xhc3MgaXMgc2hpbnksIGZhaXJseSB0cmFuc3BhcmVudCwgYW5kIGEgbGl0dGxlIGJsdWlzaFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdsYXNzID0gbmV3IFBob25nKFxuICB7IGNvbG9yOiAweDY2YWFmZiwgc3BlY3VsYXI6IDB4ZmZmZmZmLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC41IH1cbik7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZ2VuZXJhbCBjb2xvdXJzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIG1hdHQgYmxhY2ssIGZvciBibGFjayBzdXJmYWNlcyAoYWN0dWFsbHkgaXQncyAjMTExMTExKVxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmJsYWNrID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgxMTExMTEgfSk7XG5cbi8qKiBnbG9zcyBibGFjaywgZm9yIHNoaW55IGJsYWNrIHBhaW50ZWQgc3VyZmFjZXNcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nbG9zc0JsYWNrID0gbmV3IFBob25nKHsgY29sb3I6IDB4MDAwMDAwLCBzcGVjdWxhcjogMHg2NjY2NjYgfSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVN0dWZmO1xuXG5cblxuXG4iXX0=
