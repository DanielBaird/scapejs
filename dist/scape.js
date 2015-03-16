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

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/scene":11,"./scape/stuff":12}],2:[function(require,module,exports){

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
 * `blockGap` | 0.01 | gap to leave between blocks along the X and Y axes
 *
 * @class
 */
function ScapeField(options) {

    var defaultOptions = {
        minX: 0,        maxX: 100,          blocksX: 10,
        minY: 0,        maxY: 100,          blocksY: 10,
        minZ: 0,        maxZ: 40,           blocksZ: 80,
        blockGap: 0.01
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
        this.removeAllItems();
    }
    // loop through the list adding each one.
    for (var s = 0; s < itemList.length; s++) {
        var theItem = itemList[s];
        this.addItem(theItem);
    }
}
// ------------------------------------------------------------------
ScapeField.prototype.removeAllItems = function() {
    this.eachBlock(function(err, block) {
        for (var index=0; index < block.i.length; index++) {
            block.i[index].dispose();
        }
        block.i = [];
    }, this);
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

},{"./baseobject":2,"./item":5,"./stuff":12}],5:[function(require,module,exports){
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

    if (typeof this._opts.clickId !== 'undefined') {
        this.clickId = this._opts.clickId;
    }

    // TODO: maybe have a set of meshes for each scene, so an item
    // can be in multiple scenes?
    this._createNew();

    if (this._clickPoints.length > 0) {
        console.log(this._clickPoints);
    }

};
// ------------------------------------------------------------------
// inheritance
ScapeItem.prototype = Object.create(ScapeObject.prototype);
ScapeItem.prototype.constructor = ScapeItem;
// ------------------------------------------------------------------
ScapeItem.prototype._createNew = function() {
    if (this._meshes && this._meshes.length > 0) {
        this._disposeOfMeshes();
    }
    if (this._clickPoints && this._clickPoints.length > 0) {
        this._disposeOfClickPoints();
    }

    var things = this._type(this._opts);

    this._meshes = things.meshes;
    this.eachMesh(function(m) {
        m.position.copy(this._pos);
    }, this);

    this._clickPoints = things.clickPoints;
    this.eachClickPoint(function(cp) {
        cp.position.copy(this._pos);
    }, this);
}
// ------------------------------------------------------------------
ScapeItem.prototype.dispose = function() {
    this.removeFromScene();
    this._disposeOfMeshes();
    this._disposeOfClickPoints();
}
// ------------------------------------------------------------------
ScapeItem.prototype.update = function(updatedOptions) {
    this.mergeOptions(updatedOptions);
    this._update();
}
// ------------------------------------------------------------------
ScapeItem.prototype.setHeight = function(z) {
    this._pos.setZ(z);
    this.eachMesh(function(m) {
        m.position.copy(this._pos);
    }, this);
    this.eachClickPoint(function(cp) {
        cp.position.copy(this._pos);
    }, this);
}
// ------------------------------------------------------------------
ScapeItem.prototype.addToScene = function(scene) {
    this.eachMesh(function(m) {
        scene.add(m);
    });
    this.eachClickPoint(function(cp) {
        scene.add(cp);
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
ScapeItem.prototype._disposeOfClickPoints = function() {
    this.eachClickPoint(function(cp) {
        if (cp.geometry) cp.geometry.dispose();
        cp.dispatchEvent({type: 'dispose'});
    });
}
// ------------------------------------------------------------------
ScapeItem.prototype.removeFromScene = function() {
    if (this._scene) {
        this.eachMesh(function(m) {
            this._scene.remove(m);
        }, this);
        this.eachClickPoint(function(cp) {
            this._scene.remove(cp);
        }, this);
        this._scene = null;
    }
}
// ------------------------------------------------------------------
ScapeItem.prototype._update = function() {
    var scene = this._scene; // remember this because removeFromScene
                             // will delete this._scene
    if (this._scene) { this.removeFromScene(); }
    this._disposeOfMeshes();
    this._disposeOfClickPoints();

    this._createNew();
    if (scene) { this.addToScene(scene); }
}
// ------------------------------------------------------------------
// do something to each clickPoint
ScapeItem.prototype.eachClickPoint = function(callback, thisArg) {
    if (this._clickPoints) {
        for (var cp = 0; cp < this._clickPoints.length; cp++) {
            callback.call(thisArg, this._clickPoints[cp]);
        }
    }
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
    cube:        require('./itemtypes/cube'),
    tree:        require('./itemtypes/tree'),
    sensorTree:  require('./itemtypes/sensortree'),
    crane:       require('./itemtypes/crane')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/crane":7,"./itemtypes/cube":8,"./itemtypes/sensortree":9,"./itemtypes/tree":10}],7:[function(require,module,exports){
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
	return { meshes: craneParts, clickPoints: [] };
};
// ------------------------------------------------------------------
module.exports = ScapeCraneFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":12}],8:[function(require,module,exports){
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
function ScapeCubeFactory(options) {
    // construct a mesh "sitting on" the point 0,0,0

    size = options.size || 1;
    material = options.material || ScapeStuff.generic;

    // makes a cube centered on 0,0,0
    var geom = new THREE.BoxGeometry(size, size, size);

    // transform it up a bit, so we're centered on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0.
    geom.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, size/2) );

    // return it in a data object
	return { meshes: [new THREE.Mesh(geom, material)], clickPoints: [] };
};
// ------------------------------------------------------------------
module.exports = ScapeCubeFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":12}],9:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');

var M4 = THREE.Matrix4;

var ScapeTreeFactory = require('./tree.js');
// ------------------------------------------------------------------
/**
 * Returns a tree mesh of the specified size and color, with added
 * sensors attached.
 * @param {Object} options used to specify properties of the tree.
 * @param {number} options.diameter=1 Diameter of trunk (a.k.a. DBH)
 * @param {number} options.height=10 Height of tree
 * @param {THREE.Material} options.trunkMaterial=ScapeStuff.wood What to make the trunk out of
 * @param {THREE.Material} options.leafMaterial=ScapeStuff.foliage What to make the foliage out of
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeSensorTreeFactory(options, internals) {

	// start with standard tree meshes
	var i = internals || {};
	var treeParts = ScapeTreeFactory(options, i);

	i.diam = i.diam || 1;

	// transforms we might need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// now add the extra sensors

	////////// dendro
	if (typeof options.dendrometer !== 'undefined') {
		var d = {};
		d.bandWidth = options.dendrometer.width || 0.5;
		d.bandRadius = i.trunkRadius + 0.2 * d.bandWidth;
		d.bandHeight = Math.min(options.dendrometer.height || 1.5, i.trunkHeight - d.bandWidth/2);

		d.meterRadius = d.bandWidth;
		d.meterHeight = d.bandWidth * 3;

		d.mountRadius = d.meterRadius * 1.1;
		d.mountWidth = d.meterHeight / 4;

		d.bandStuff = options.dendrometer.band || ScapeStuff.metal;
		d.mountStuff = options.dendrometer.mount || ScapeStuff.black;
		d.meterStuff = options.dendrometer.meter || ScapeStuff.metal;

		// the steel band
		var bandGeom = new THREE.CylinderGeometry(d.bandRadius, d.bandRadius, d.bandWidth, 12, 1);
		bandGeom.applyMatrix(new M4().makeTranslation(0, 0, d.bandHeight).multiply(rotate));
		var band = new THREE.Mesh(bandGeom, d.bandStuff);
		i.meshNames.push('dendrometerBand');
		treeParts.meshes.push(band);

		// the meter itself
		var meterBottomGeom = new THREE.CylinderGeometry(d.meterRadius, d.meterRadius, 0.67 * d.meterHeight, 7, 1);
		meterBottomGeom.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/6).multiply(rotate));
		var meterBottom = new THREE.Mesh(meterBottomGeom, d.meterStuff);
		i.meshNames.push('dendrometerBottom');
		treeParts.meshes.push(meterBottom);

		var meterTopGeom = new THREE.CylinderGeometry(d.meterRadius/5, d.meterRadius, 0.33 * d.meterHeight, 7, 1);
		meterTopGeom.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/2 + d.meterHeight/6).multiply(rotate));
		var meterTop = new THREE.Mesh(meterTopGeom, d.meterStuff);
		i.meshNames.push('dendrometerTop');
		treeParts.meshes.push(meterTop);

		// the mount
		var mountBandGeom = new THREE.CylinderGeometry(d.mountRadius, d.mountRadius, d.mountWidth, 7, 1);
		mountBandGeom.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.bandWidth/2 + d.mountWidth/2).multiply(rotate));
		var mountBand = new THREE.Mesh(mountBandGeom, d.mountStuff);
		i.meshNames.push('dendrometerMountBand');
		treeParts.meshes.push(mountBand);

		var mountGeom = new THREE.BoxGeometry(d.mountRadius, d.mountRadius/2, d.mountWidth);
		mountGeom.applyMatrix(new M4().makeTranslation(d.bandRadius, 0, d.bandHeight + d.bandWidth/2 + d.mountWidth/2));
		var mount = new THREE.Mesh(mountGeom, d.mountStuff);
		i.meshNames.push('dendrometerMount');
		treeParts.meshes.push(mount);

		// the dendro should be clickable
		var dendroClick = new THREE.Object3D();
		dendroClick.visible = false;
		dendroClick.applyMatrix(new M4().makeTranslation(d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/6));
		treeParts.clickPoints.push(dendroClick);

		i.dendrometer = d;
	}
	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeSensorTreeFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":12,"./tree.js":10}],10:[function(require,module,exports){
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
 * @param {Object} internals If supplied, this factory will save some
 *        interim calculated values into this object.  E.g.
 *        the height of the canopy, the Material the trunk is made out
 *        of, etc.  This can help another ScapeItemType factory use
 *        this as a starting point.
 * @param {Array} internals.meshNames An array of mesh names, in the
 *        same order as the mesh list returned by the function.  This
 *        allows downstream factory functions to identify meshes in
 *        order to alter them.
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeTreeFactory(options, internals) {

	var i = internals || {};

	i.diam = options.diameter || 1;
	i.height = options.height || 10;
	i.trunkStuff = options.trunk || ScapeStuff.wood;
	i.canopyStuff = options.canopy || ScapeStuff.foliage;

	i.canopyHeight = i.height / 4;
	i.trunkHeight = i.height - i.canopyHeight;
	i.trunkRadius = 2 * i.diam / 2;
	i.canopyRadius = i.trunkRadius * 6;

	i.trunkGeom = new THREE.CylinderGeometry(i.trunkRadius/2, i.trunkRadius, i.trunkHeight, 12);
	i.canopyGeom = new THREE.CylinderGeometry(i.canopyRadius, i.canopyRadius, i.canopyHeight, 12);

	// transforms we need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var trunkPosition = new THREE.Matrix4().makeTranslation(0, 0, i.trunkHeight/2);

	// center on x = 0, y = 0, but have the canopy at the top
	var canopyPosition = new THREE.Matrix4().makeTranslation(0, 0, i.canopyHeight/2 + i.height - i.canopyHeight);

	i.trunkGeom.applyMatrix(trunkPosition.multiply(rotate));
	i.canopyGeom.applyMatrix(canopyPosition.multiply(rotate));

	var trunk = new THREE.Mesh(i.trunkGeom, i.trunkStuff);
	var canopy = new THREE.Mesh(i.canopyGeom, i.canopyStuff);
	i.meshNames = ['trunk','canopy'];

	return { meshes: [trunk, canopy], clickPoints: [] };
};
// ------------------------------------------------------------------
module.exports = ScapeTreeFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":12}],11:[function(require,module,exports){
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
    var cube = ScapeItems.cube({ size: size, material: material }).meshes[0];
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

},{"./baseobject":2,"./chunk":3,"./item":5,"./itemtypes":6,"./stuff":12}],12:[function(require,module,exports){
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
ScapeStuff.metal = new Phong({ color: 0xaabbee, specular: 0xffffff, shininess: 100, reflectivity: 0.8 });

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

/** gloss black, for shiny black painted surfaces (actually it's #111111)
  * @memberOf ScapeStuff */
ScapeStuff.glossBlack = new Phong({ color: 0x111111, specular: 0x666666 });

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3JhbmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2N1YmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL3NlbnNvcnRyZWUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL3RyZWUuanMiLCJzcmMvc2NhcGUvc2NlbmUuanMiLCJzcmMvc2NhcGUvc3R1ZmYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOWNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLy8gVEhSRUUgPSByZXF1aXJlKCd0aHJlZScpO1xuXG4vLyBnZXQgdGhlIHZhcmlvdXMgYml0c1xuYmFzZSAgPSByZXF1aXJlKCcuL3NjYXBlL2Jhc2VvYmplY3QnKTtcbnN0dWZmID0gcmVxdWlyZSgnLi9zY2FwZS9zdHVmZicpO1xuZmllbGQgPSByZXF1aXJlKCcuL3NjYXBlL2ZpZWxkJyk7XG5zY2VuZSA9IHJlcXVpcmUoJy4vc2NhcGUvc2NlbmUnKTtcbmNodW5rID0gcmVxdWlyZSgnLi9zY2FwZS9jaHVuaycpO1xuXG4vLyBtYWtlIGFuIG9iamVjdCBvdXQgb2YgdGhlIHZhcmlvdXMgYml0c1xuU2NhcGUgPSB7XG4gICAgQmFzZU9iamVjdDogYmFzZSxcbiAgICBTdHVmZjogc3R1ZmYsXG4gICAgQ2h1bms6IGNodW5rLFxuICAgIEZpZWxkOiBmaWVsZCxcbiAgICBTY2VuZTogc2NlbmVcbn1cblxuLy8gcmV0dXJuIHRoZSBvYmplY3QgaWYgd2UncmUgYmVpbmcgYnJvd3NlcmlmaWVkOyBvdGhlcndpc2UgYXR0YWNoXG4vLyBpdCB0byB0aGUgZ2xvYmFsIHdpbmRvdyBvYmplY3QuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNjYXBlO1xufSBlbHNlIHtcbiAgICB3aW5kb3cuU2NhcGUgPSBTY2FwZTtcbn1cbiIsIlxuLy9cbi8vIHRoaXMgXCJiYXNlXCIgb2JqZWN0IGhhcyBhIGZldyBjb252ZW5pZW5jZSBmdW5jdGlvbnMgZm9yIGhhbmRsaW5nXG4vLyBvcHRpb25zIGFuZCB3aGF0bm90XG4vL1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gU2NhcGVPYmplY3Qob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgICB0aGlzLl9vcHRzID0gT2JqZWN0LmNyZWF0ZShkZWZhdWx0cyk7XG4gICAgdGhpcy5tZXJnZU9wdGlvbnMob3B0aW9ucyk7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lcmdlIG5ldyBvcHRpb25zIGludG8gb3VyIG9wdGlvbnNcblNjYXBlT2JqZWN0LnByb3RvdHlwZS5tZXJnZU9wdGlvbnMgPSBmdW5jdGlvbihleHRyYU9wdHMpIHtcbiAgICBmb3IgKG9wdCBpbiBleHRyYU9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0c1tvcHRdID0gZXh0cmFPcHRzW29wdF07XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZU9iamVjdDsiLCJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmVwcmVzZW50cyBhIHJlY3Rhbmd1bGFyIHByaXNtIG9mIG1hdGVyaWFsIHRoYXQgdGhlIHNvbGlkIFwiZ3JvdW5kXCJcbiAqIHBvcnRpb24gb2YgYSAnc2NhcGUgaXMgbWFrZSB1cCBvZiwgZS5nLiBkaXJ0LCBsZWFmIGxpdHRlciwgd2F0ZXIuXG4gKlxuICogVGhpcyB3aWxsIGNyZWF0ZSAoYW5kIGludGVybmFsbHkgY2FjaGUpIGEgbWVzaCBiYXNlZCBvbiB0aGUgbGlua2VkXG4gKiBjaHVuayBpbmZvcm1hdGlvbiB0byBtYWtlIHJlbmRlcmluZyBpbiBXZWJHTCBmYXN0ZXIuXG4gKlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSBUaGUgU2NhcGVTY2VuZSB0aGUgY2h1bmsgd2lsbCBiZSBhZGRlZCBpbnRvXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyZW50QmxvY2sgVGhlIGJsb2NrICh2ZXJ0aWNhbCBjb2x1bW4gd2l0aGluIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjYXBlKSB0aGF0IG93bnMgdGhpcyBjaHVua1xuICogQHBhcmFtIHtJbnRlZ2VyfSBsYXllckluZGV4IEluZGV4IGludG8gcGFyZW50QmxvY2suZyB0aGlzIGNodW5rIGlzIGF0XG4gKiBAcGFyYW0ge051bWJlcn0gbWluWiBsb3dlc3QgWiB2YWx1ZSBhbnkgY2h1bmsgc2hvdWxkIGhhdmVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucywgbm90IGN1cnJlbnRseSB1c2VkXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ2h1bmsoc2NlbmUsIHBhcmVudEJsb2NrLCBsYXllckluZGV4LCBtaW5aLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuX2Jsb2NrID0gcGFyZW50QmxvY2s7XG4gICAgdGhpcy5faXNTdXJmYWNlID0gKGxheWVySW5kZXggPT0gMCk7XG4gICAgdGhpcy5fbGF5ZXIgPSBwYXJlbnRCbG9jay5nW2xheWVySW5kZXhdO1xuICAgIHRoaXMuX21pblogPSBtaW5aO1xuICAgIHRoaXMuX21lc2ggPSB0aGlzLl9jcmVhdGVOZXdNZXNoKCk7XG5cbiAgICAvLyBUT0RPOiBmaW5pc2ggaGltISFcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUNodW5rLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlQ2h1bmsucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVDaHVuaztcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBJbnZva2UgYSByZWJ1aWxkIG9mIHRoaXMgY2h1bmsuXG4gKlxuICogRGlzY2FyZHMgZXhpc3RpbmcgY2FjaGVkIG1lc2ggYW5kIGJ1aWxkcyBhIG5ldyBtZXNoIGJhc2VkIG9uIHRoZVxuICogY3VycmVudGx5IGxpbmtlZCBjaHVuayBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAcmV0dXJuIG5vbmVcbiAqL1xuU2NhcGVDaHVuay5wcm90b3R5cGUucmVidWlsZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3VwZGF0ZU1lc2goKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX2NyZWF0ZU5ld01lc2ggPSBmdW5jdGlvbigpIHtcbiAgICAvLyB0aGUgY2h1bmsgd2lsbCBiZSBhcyBkZWVwIGFzIHRoZSBsYXllciBzYXlzXG4gICAgdmFyIGRlcHRoID0gdGhpcy5fbGF5ZXIuZHo7XG4gICAgaWYgKGRlcHRoID09IDApIHtcbiAgICAgICAgLy8gLi51bmxlc3MgdGhhdCdzIDAsIGluIHdoaWNoIGNhc2UgZ28gdG8gdGhlIGJvdHRvbVxuICAgICAgICBkZXB0aCA9IHRoaXMuX2xheWVyLnogLSB0aGlzLl9taW5aO1xuICAgIH1cbiAgICAvLyBtYWtlIGEgZ2VvbWV0cnkgZm9yIHRoZSBjaHVua1xuICAgIHZhciBnZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KFxuICAgICAgICB0aGlzLl9ibG9jay5keCwgdGhpcy5fYmxvY2suZHksIGRlcHRoXG4gICAgKTtcbiAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIHRoaXMuX2xheWVyLm0pO1xuICAgIG1lc2gucG9zaXRpb24uc2V0KFxuICAgICAgICB0aGlzLl9ibG9jay54ICsgdGhpcy5fYmxvY2suZHgvMixcbiAgICAgICAgdGhpcy5fYmxvY2sueSArIHRoaXMuX2Jsb2NrLmR5LzIsXG4gICAgICAgIHRoaXMuX2xheWVyLnogLSBkZXB0aC8yXG4gICAgKTtcbiAgICBtZXNoLmNhc3RTaGFkb3cgPSB0cnVlO1xuICAgIC8vIG9ubHkgdGhlIHN1cmZhY2UgY2h1bmtzIHJlY2VpdmUgc2hhZG93XG4gICAgaWYgKHRoaXMuX2lzU3VyZmFjZSkge1xuICAgICAgICBtZXNoLnJlY2VpdmVTaGFkb3cgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gbWVzaDtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX2FkZE1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zY2VuZS5hZGQodGhpcy5fbWVzaCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9yZW1vdmVNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUucmVtb3ZlKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fdXBkYXRlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3JlbW92ZU1lc2goKTtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuICAgIHRoaXMuX2FkZE1lc2goKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUNodW5rOyIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5TY2FwZVN0dWZmID0gcmVxdWlyZSgnLi9zdHVmZicpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogVGhlIGNvbnRhaW5lciBmb3IgYWxsIGluZm9ybWF0aW9uIGFib3V0IGFuIGFyZWEuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zIGZvciB0aGUgU2NhcGVGaWVsZCBiZWluZyBjcmVhdGVkLlxuICpcbiAqIG9wdGlvbiB8IGRlZmF1bHQgdmFsdWUgfCBkZXNjcmlwdGlvblxuICogLS0tLS0tLXwtLS0tLS0tLS0tLS0tLTp8LS0tLS0tLS0tLS0tXG4gKiBgbWluWGAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFggZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhYYCAgICAgfCAgMTAwIHwgbGFyZ2VzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWGAgIHwgICAxMCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBYIGF4aXMgaW50b1xuICogYG1pbllgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBZIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WWAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1lgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWSBheGlzIGludG9cbiAqIGBtaW5aYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWiAodmVydGljYWwgZGltZW5zaW9uKSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFpgICAgICB8ICAgNDAgfCBsYXJnZXN0IFogZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NaYCAgfCAgIDgwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFogYXhpcyBpbnRvXG4gKiBgYmxvY2tHYXBgIHwgMC4wMSB8IGdhcCB0byBsZWF2ZSBiZXR3ZWVuIGJsb2NrcyBhbG9uZyB0aGUgWCBhbmQgWSBheGVzXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlRmllbGQob3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICBtaW5YOiAwLCAgICAgICAgbWF4WDogMTAwLCAgICAgICAgICBibG9ja3NYOiAxMCxcbiAgICAgICAgbWluWTogMCwgICAgICAgIG1heFk6IDEwMCwgICAgICAgICAgYmxvY2tzWTogMTAsXG4gICAgICAgIG1pblo6IDAsICAgICAgICBtYXhaOiA0MCwgICAgICAgICAgIGJsb2Nrc1o6IDgwLFxuICAgICAgICBibG9ja0dhcDogMC4wMVxuICAgIH07XG5cbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICAvLyBtaW4gYW5kIG1heCB2YWx1ZXMgZm9yIHggeSBhbmQgelxuICAgIHRoaXMubWluWCA9IHRoaXMuX29wdHMubWluWDtcbiAgICB0aGlzLm1pblkgPSB0aGlzLl9vcHRzLm1pblk7XG4gICAgdGhpcy5taW5aID0gdGhpcy5fb3B0cy5taW5aO1xuXG4gICAgdGhpcy5tYXhYID0gdGhpcy5fb3B0cy5tYXhYO1xuICAgIHRoaXMubWF4WSA9IHRoaXMuX29wdHMubWF4WTtcbiAgICB0aGlzLm1heFogPSB0aGlzLl9vcHRzLm1heFo7XG5cbiAgICAvLyBjb252ZW5pZW50IFwid2lkdGhzXCJcbiAgICB0aGlzLndYID0gdGhpcy5tYXhYIC0gdGhpcy5taW5YO1xuICAgIHRoaXMud1kgPSB0aGlzLm1heFkgLSB0aGlzLm1pblk7XG4gICAgdGhpcy53WiA9IHRoaXMubWF4WiAtIHRoaXMubWluWjtcblxuICAgIC8vIGhvdyBtYW55IGJsb2NrcyBhY3Jvc3MgeCBhbmQgeT9cbiAgICB0aGlzLmJsb2Nrc1ggPSB0aGlzLl9vcHRzLmJsb2Nrc1g7XG4gICAgdGhpcy5ibG9ja3NZID0gdGhpcy5fb3B0cy5ibG9ja3NZO1xuICAgIHRoaXMuYmxvY2tzWiA9IHRoaXMuX29wdHMuYmxvY2tzWjtcblxuICAgIC8vIGhvdyB3aWRlIGlzIGVhY2ggYmxvY2tcbiAgICB0aGlzLl9iWCA9IHRoaXMud1ggLyB0aGlzLmJsb2Nrc1g7XG4gICAgdGhpcy5fYlkgPSB0aGlzLndZIC8gdGhpcy5ibG9ja3NZO1xuICAgIHRoaXMuX2JaID0gdGhpcy53WiAvIHRoaXMuYmxvY2tzWjtcblxuICAgIC8vIGhvdXNla2VlcGluZ1xuICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB0aGlzLl9jYWxjQ2VudGVyKCk7XG4gICAgdGhpcy5fbWFrZUdyaWQoKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUZpZWxkO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnKCcgKyB0aGlzLm1pblggKyAnLScgKyB0aGlzLm1heFggK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5ZICsgJy0nICsgdGhpcy5tYXhZICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWiArICctJyArIHRoaXMubWF4WiArXG4gICAgICAgICcpJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuX21ha2VHcmlkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZyA9IFtdO1xuICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLmJsb2Nrc1g7IGd4KyspIHtcbiAgICAgICAgdmFyIGNvbCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5ibG9ja3NZOyBneSsrKSB7XG4gICAgICAgICAgICB2YXIgeEdhcCA9IHRoaXMuX2JYICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgeUdhcCA9IHRoaXMuX2JZICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSB7XG4gICAgICAgICAgICAgICAgeDogdGhpcy5taW5YICsgKHRoaXMuX2JYICogZ3gpICsgeEdhcCxcbiAgICAgICAgICAgICAgICBkeDogdGhpcy5fYlggLSB4R2FwIC0geEdhcCxcbiAgICAgICAgICAgICAgICB5OiB0aGlzLm1pblkgKyAodGhpcy5fYlkgKiBneSkgKyB5R2FwLFxuICAgICAgICAgICAgICAgIGR5OiB0aGlzLl9iWSAtIHlHYXAgLSB5R2FwLFxuICAgICAgICAgICAgICAgIGc6IFt7XG4gICAgICAgICAgICAgICAgICAgIHo6IHRoaXMubWF4WixcbiAgICAgICAgICAgICAgICAgICAgZHo6IDAsIC8vIDAgbWVhbnMgXCJzdHJldGNoIHRvIG1pblpcIlxuICAgICAgICAgICAgICAgICAgICBtOiBTY2FwZVN0dWZmLmdlbmVyaWMsXG4gICAgICAgICAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgaTogW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbC5wdXNoKGJsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9nLnB1c2goY29sKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYnVpbGRzIGJsb2NrIG1lc2hlcyBmb3IgZGlzcGxheSBpbiB0aGUgcHJvdmlkZWQgc2NlbmUuICBUaGlzIGlzXG4gKiBnZW5lcmFsbHkgY2FsbGVkIGJ5IHRoZSBTY2FwZVNjZW5lIG9iamVjdCB3aGVuIHlvdSBnaXZlIGl0IGFcbiAqIFNjYXBlRmllbGQsIHNvIHlvdSB3b24ndCBuZWVkIHRvIGNhbGwgaXQgeW91cnNlbGYuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIHRoZSBTY2FwZVNjZW5lIHRoYXQgd2lsbCBiZSBkaXNwbGF5aW5nXG4gKiB0aGlzIFNjYXBlRmllbGQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmJ1aWxkQmxvY2tzID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB2YXIgbWluWiA9IHRoaXMubWluWjtcbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGxheWVySW5kZXggPSAwOyBsYXllckluZGV4IDwgYi5nLmxlbmd0aDsgbGF5ZXJJbmRleCsrKSB7XG4gICAgICAgICAgICBiLmdbbGF5ZXJJbmRleF0uY2h1bmsgPSBuZXcgU2NhcGVDaHVuayhcbiAgICAgICAgICAgICAgICBzY2VuZSwgYiwgbGF5ZXJJbmRleCwgbWluWlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGRvIHRoaXMgdG8gYWRqdXN0IGFsbCB0aGUgY2h1bmsgaGVpZ2h0c1xuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBidWlsZHMgaXRlbSBtZXNoZXMgZm9yIGRpc3BsYXkgaW4gdGhlIHByb3ZpZGVkIHNjZW5lLiAgVGhpcyBpc1xuICogZ2VuZXJhbGx5IGNhbGxlZCBieSB0aGUgU2NhcGVTY2VuZSBvYmplY3Qgd2hlbiB5b3UgZ2l2ZSBpdCBhXG4gKiBTY2FwZUZpZWxkLCBzbyB5b3Ugd29uJ3QgbmVlZCB0byBjYWxsIGl0IHlvdXJzZWxmLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSB0aGUgU2NhcGVTY2VuZSB0aGF0IHdpbGwgYmUgZGlzcGxheWluZ1xuICogdGhpcyBTY2FwZUZpZWxkLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5idWlsZEl0ZW1zID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB2YXIgbWluWiA9IHRoaXMubWluWjtcbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGl0ZW1JbmRleCA9IDA7IGl0ZW1JbmRleCA8IGIuaS5sZW5ndGg7IGl0ZW1JbmRleCsrKSB7XG4gICAgICAgICAgICBiLmlbaXRlbUluZGV4XS5hZGRUb1NjZW5lKHNjZW5lKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgaXRlbXMgdG8gdGhlIHNjYXBlIGF0IHZhcmlvdXMgcG9pbnRzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1MaXN0IEEgbGlzdCBvZiBpdGVtcy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYGl0ZW1gIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbXMgPSBmdW5jdGlvbihpdGVtTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsSXRlbXMoKTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGl0ZW1MaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciB0aGVJdGVtID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbSh0aGVJdGVtKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnJlbW92ZUFsbEl0ZW1zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lYWNoQmxvY2soZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICBmb3IgKHZhciBpbmRleD0wOyBpbmRleCA8IGJsb2NrLmkubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBibG9jay5pW2luZGV4XS5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgYmxvY2suaSA9IFtdO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtID0gZnVuY3Rpb24oaXRlbSkge1xuXG4gICAgLy8gYWRkIHRvIHRoZSBwYXJlbnQgYmxvY2tcbiAgICB2YXIgcGFyZW50QmxvY2sgPSB0aGlzLmdldEJsb2NrKGl0ZW0ueCwgaXRlbS55KTtcbiAgICBwYXJlbnRCbG9jay5pLnB1c2goaXRlbSk7XG5cbiAgICAvLyBzZXQgaXRlbSBoZWlnaHQgdG8gdGhlIHBhcmVudCBibG9jaydzIGdyb3VuZCBoZWlnaHRcbiAgICBpdGVtLnNldEhlaWdodChwYXJlbnRCbG9jay5nWzBdLnopO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgaXRlbXMgdG8gdGhlIHNjYXBlIGF0IHZhcmlvdXMgcG9pbnRzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1MaXN0IEEgbGlzdCBvZiBpdGVtcy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYGl0ZW1gIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbXNPZlR5cGUgPSBmdW5jdGlvbihpdGVtTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2l0ZW1zID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBpdGVtTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgdGhlSXRlbSA9IGl0ZW1MaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEl0ZW1PZlR5cGUodGhlSXRlbS50eXBlLCB0aGVJdGVtLngsIHRoZUl0ZW0ueSwgdGhlSXRlbSk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtT2ZUeXBlID0gZnVuY3Rpb24oaXRlbVR5cGUsIHgsIHksIG9wdGlvbnMpIHtcblxuICAgIC8vIG1ha2UgdGhlIGl0ZW1cbiAgICB2YXIgaXRlbSA9IG5ldyBTY2FwZUl0ZW0oaXRlbVR5cGUsIHgsIHksIG9wdGlvbnMpO1xuXG4gICAgLy8gYWRkIHRvIHRoZSBwYXJlbnQgYmxvY2tcbiAgICB2YXIgcGFyZW50QmxvY2sgPSB0aGlzLmdldEJsb2NrKHgsIHkpO1xuICAgIHBhcmVudEJsb2NrLmkucHVzaChpdGVtKTtcblxuICAgIC8vIHNldCBpdGVtIGhlaWdodCB0byB0aGUgcGFyZW50IGJsb2NrJ3MgZ3JvdW5kIGhlaWdodFxuICAgIGl0ZW0uc2V0SGVpZ2h0KHBhcmVudEJsb2NrLmdbMF0ueik7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBjbGFpbXMgb2YgdGhlIGdyb3VuZCBoZWlnaHQgYXQgdmFyaW91cyBwb2ludHMuXG4gKiBVbmxpa2Uge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0sIHRoaXNcbiAqIG1ldGhvZCB3aWxsIHJlLWV4dHJhcG9sYXRlIGdyb3VuZCBoZWlnaHRzIGFjcm9zcyB0aGUgRmllbGQgKHNvXG4gKiB5b3UgZG9uJ3QgbmVlZCB0byBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30geW91cnNlbGYpLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGhlaWdodExpc3QgQSBsaXN0IG9mIG9iamVjdHMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGB6YCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZEhlaWdodHMgPSBmdW5jdGlvbihoZWlnaHRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaGVpZ2h0TGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgcHQgPSBoZWlnaHRMaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEdyb3VuZEhlaWdodChwdC54LCBwdC55LCBwdC56KTtcbiAgICB9XG4gICAgdGhpcy5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGNsYWltIHRoYXQgdGhlIGdyb3VuZCBoZWlnaHQgaXMgYHpgIGF0IHBvaW50IGB4YCxgeWAuXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBldmVudHVhbGx5IGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNHcm91bmRIZWlnaHRzIGNhbGNHcm91bmRIZWlnaHRzfSBhZnRlciBzb1xuICogZ3JvdW5kIGhlaWdodHMgZ2V0IGV4dHJhcG9sYXRlZCBhY3Jvc3MgdGhlIGVudGlyZSBGaWVsZC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBYIGNvb3JkaW5hdGUgb2YgdGhpcyBncm91bmQgaGVpZ2h0IHJlY29yZFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHRoZSBoZWlnaHQgb2YgdGhlIGdyb3VuZCBhdCBwb3NpdGlvbiBgeGAsYHlgXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZEhlaWdodCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzLnB1c2goeyB4OiB4LCB5OiB5LCB6OiB6IH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhZGRpdGlvbmFsIGdyb3VuZCBzdGFja3MgdG8gdGhlIGZpZWxkJ3MgZ3JvdW5kIHN0YWNrcy5cbiAqIFRoZSBncm91bmRMaXN0IGlzIGFuIGFycmF5IG9mIGRhdGEgb2JqZWN0cy4gIEVhY2ggb2JqZWN0IG5lZWRzIHgsXG4gKiB5IGFuZCB6IHByb3BlcnRpZXMsIGFuZCBhICdzdGFjaycgcHJvcGVydHksIGVhY2ggbWF0Y2hpbmcgdGhlXG4gKiBjb3JyZXNwb25kaW5nIGFyZyB0byBhZGRHcm91bmRTdGFjay5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVwbGFjZSBpZiByZXBsYWNlIGlzIHRydXRoeSwgZGlzY2FyZCBleGlzdGluZ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VuZCBwb2ludHMgZmlyc3QuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrcyA9IGZ1bmN0aW9uKGdyb3VuZExpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGdyb3VuZExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gZ3JvdW5kTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRTdGFjayhwdC54LCBwdC55LCBwdC5zdGFjayk7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZFN0YWNrcygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGdyb3VuZCBzdGFjayBhdCB4LHksIHN0YXJ0aW5nIGF0IGhlaWdodCB6LlxuICogVGhlIHN0YWNrIGlzIGFuIGFycmF5IG9mIHR3by1lbGVtZW50IGFycmF5cyB3aXRoIGEgTWF0ZXJpYWxcbiAqIGFuZCBhIGRlcHRoIG51bWJlciwgbGlrZSB0aGlzOlxuICogW1xuICogICAgIFtNYXRlcmlhbC5sZWFmTGl0dGVyLCAwLjNdLFxuICogICAgIFtNYXRlcmlhbC5kaXJ0LCAzLjVdLFxuICogICAgIFtNYXRlcmlhbC5zdG9uZSwgNF1cbiAqIF1cbiAqIFRoYXQgcHV0cyBhIGxlYWZsaXR0ZXIgbGF5ZXIgMC4zIHVuaXRzIGRlZXAgb24gYSAzLjUtdW5pdFxuICogZGVlcCBkaXJ0IGxheWVyLCB3aGljaCBpcyBvbiBhIHN0b25lIGxheWVyLiAgSWYgdGhlIGZpbmFsXG4gKiBsYXllcidzIGRlcHRoIGlzIHplcm8sIHRoYXQgbGF5ZXIgaXMgYXNzdW1lZCB0byBnbyBhbGwgdGhlXG4gKiB3YXkgdG8gbWluWi5cbiAqIElmIHlvdSBjYWxsIHRoaXMsIHJlbWVtYmVyIHRvIGNhbGNHcm91bmQoKSBhZnRlci5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kU3RhY2sgPSBmdW5jdGlvbih4LCB5LCBzdGFjaykge1xuICAgIC8vIFRPRE86IGNoZWNrIGZvciB2YWxpZGl0eVxuICAgIHRoaXMuX2dyb3VuZFN0YWNrcy5wdXNoKHsgeDogeCwgIHk6IHksICBzdGFjazogc3RhY2sgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIGhlaWdodC4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgaGVpZ2h0IGNsYWltcyBvbmUgYXQgYSB0aW1lIHVzaW5nXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRIZWlnaHQgYWRkR3JvdW5kSGVpZ2h0fS5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY2FsY0dyb3VuZEhlaWdodHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIGZpbmQgaGVpZ2h0IGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBhbGxvd2luZyBlYWNoXG4gICAgICAgIC8vIGtub3duIGdyb3VuZCBoZWlnaHQgdG8gXCJ2b3RlXCIgdXNpbmcgdGhlIGludmVyc2Ugb2ZcbiAgICAgICAgLy8gaXQncyBzcXVhcmVkIGRpc3RhbmNlIGZyb20gdGhlIGNlbnRyZSBvZiB0aGUgYmxvY2suXG4gICAgICAgIHZhciBoLCBkeCwgZHksIGRpc3QsIHZvdGVTaXplO1xuICAgICAgICB2YXIgYlogPSAwO1xuICAgICAgICB2YXIgdm90ZXMgPSAwO1xuICAgICAgICBmb3IgKHZhciBnaD0wOyBnaCA8IHRoaXMuX2dyb3VuZEhlaWdodHMubGVuZ3RoOyBnaCsrKSB7XG4gICAgICAgICAgICBoID0gdGhpcy5fZ3JvdW5kSGVpZ2h0c1tnaF07XG4gICAgICAgICAgICBkeCA9IGJsb2NrLnggKyAoMC41ICogdGhpcy5fYlgpIC0gaC54O1xuICAgICAgICAgICAgZHkgPSBibG9jay55ICsgKDAuNSAqIHRoaXMuX2JZKSAtIGgueTtcbiAgICAgICAgICAgIGRpc3QgPSAxICsgZHgqZHggKyBkeSpkeTtcbiAgICAgICAgICAgIHZvdGVTaXplID0gMSAvIGRpc3Q7XG4gICAgICAgICAgICBiWiArPSBoLnogKiB2b3RlU2l6ZTtcbiAgICAgICAgICAgIHZvdGVzICs9IHZvdGVTaXplO1xuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBkaXZpZGUgdG8gZmluZCB0aGUgYXZlcmFnZVxuICAgICAgICBiWiA9IGJaIC8gdm90ZXM7XG5cbiAgICAgICAgLy8gYmxvY2staXNoIGhlaWdodHM6IHJvdW5kIHRvIHRoZSBuZWFyZXN0IF9iWlxuICAgICAgICB2YXIgZGlmZlogPSBiWiAtIHRoaXMubWluWjtcbiAgICAgICAgYlogPSB0aGlzLm1pblogKyBNYXRoLnJvdW5kKGRpZmZaIC8gdGhpcy5fYlopICogdGhpcy5fYlo7XG5cbiAgICAgICAgLy8gb2theSBub3cgd2Uga25vdyBhIGhlaWdodCEgIHNldCBpdFxuICAgICAgICB0aGlzLnNldEJsb2NrSGVpZ2h0KGJsb2NrLCBiWik7XG5cbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiAocmUpY2FsY3VsYXRlIHRoZSBncm91bmQgc3RhY2tzLiAgWW91IG5lZWQgdG8gY2FsbCB0aGlzIGlmIHlvdVxuICogYWRkIGdyb3VuZCBzdGFja3Mgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kU3RhY2sgYWRkR3JvdW5kU3RhY2t9LlxuICpcbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY2FsY0dyb3VuZFN0YWNrcyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gbWFrZSB0aGUgc3RhY2sgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGNvcHlpbmcgdGhlXG4gICAgICAgIC8vIG5lYXJlc3QgZGVmaW5lZCBzdGFjay5cbiAgICAgICAgdmFyIHMsIGR4LCBkeSwgdGhpc0Rpc3QsIGJlc3RTdGFjaztcbiAgICAgICAgdmFyIGJlc3REaXN0ID0gdGhpcy53WCArIHRoaXMud1kgKyB0aGlzLndaO1xuICAgICAgICBiZXN0RGlzdCA9IGJlc3REaXN0ICogYmVzdERpc3Q7XG4gICAgICAgIGZvciAodmFyIGdzPTA7IGdzIDwgdGhpcy5fZ3JvdW5kU3RhY2tzLmxlbmd0aDsgZ3MrKykge1xuICAgICAgICAgICAgcyA9IHRoaXMuX2dyb3VuZFN0YWNrc1tnc107XG4gICAgICAgICAgICBkeCA9IGJsb2NrLnggKyAoMC41ICogdGhpcy5fYlgpIC0gcy54O1xuICAgICAgICAgICAgZHkgPSBibG9jay55ICsgKDAuNSAqIHRoaXMuX2JZKSAtIHMueTtcbiAgICAgICAgICAgIHRoaXNEaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICBpZiAodGhpc0Rpc3QgPCBiZXN0RGlzdCkge1xuICAgICAgICAgICAgICAgIGJlc3RTdGFjayA9IHM7XG4gICAgICAgICAgICAgICAgYmVzdERpc3QgPSB0aGlzRGlzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG9rYXkgd2UgZ290IGEgc3RhY2suXG4gICAgICAgIHRoaXMuc2V0R3JvdW5kU3RhY2soYmxvY2ssIGJlc3RTdGFjay5zdGFjayk7XG5cbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuX2NhbGNDZW50ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBjYWxjdWxhdGUgdGhlIGNlbnRyZSBvZiB0aGUgZmllbGQgYW5kIHJlY29yZCBpdCBhcyAuY2VudGVyXG4gICAgdGhpcy5jZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgKHRoaXMubWluWCArIHRoaXMubWF4WCkgLyAyLFxuICAgICAgICAodGhpcy5taW5ZICsgdGhpcy5tYXhZKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblogKyB0aGlzLm1heFopIC8gMlxuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnNldEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oYmxvY2ssIHN0YWNrKSB7XG4gICAgdmFyIGxheWVyTGV2ZWwgPSBibG9jay5nWzBdLno7XG4gICAgZm9yICh2YXIgbGF5ZXIgPSAwOyBsYXllciA8IHN0YWNrLmxlbmd0aDsgbGF5ZXIrKykge1xuICAgICAgICBibG9jay5nW2xheWVyXSA9IHtcbiAgICAgICAgICAgIHo6IGxheWVyTGV2ZWwsXG4gICAgICAgICAgICBkejogc3RhY2tbbGF5ZXJdWzFdLFxuICAgICAgICAgICAgbTogc3RhY2tbbGF5ZXJdWzBdLFxuICAgICAgICAgICAgY2h1bms6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgbGF5ZXJMZXZlbCAtPSBzdGFja1tsYXllcl1bMV07XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnJlYnVpbGRDaHVua3MgPSBmdW5jdGlvbihibG9jaykge1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBpZiAoYmxvY2suZ1tsXS5jaHVuaykge1xuICAgICAgICAgICAgYmxvY2suZ1tsXS5jaHVuay5yZWJ1aWxkKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnNldEJsb2NrSGVpZ2h0ID0gZnVuY3Rpb24oYmxvY2ssIHopIHtcbiAgICAvLyB0byBzZXQgdGhlIGJsb2NrIGdyb3VuZCBoZWlnaHQsIHdlIG5lZWQgdG8gZmluZCB0aGUgYmxvY2snc1xuICAgIC8vIGN1cnJlbnQgZ3JvdW5kIGhlaWdodCAodGhlIHogb2YgdGhlIHRvcCBsYXllciksIHdvcmsgb3V0IGFcbiAgICAvLyBkaWZmIGJldHdlZW4gdGhhdCBhbmQgdGhlIG5ldyBoZWlnaHQsIGFuZCBhZGQgdGhhdCBkaWZmIHRvXG4gICAgLy8gYWxsIHRoZSBsYXllcnMuXG4gICAgdmFyIGRaID0geiAtIGJsb2NrLmdbMF0uejtcbiAgICB2YXIgZGVwdGg7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGJsb2NrLmdbbF0ueiArPSBkWjtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZ2V0QmxvY2sgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgLy8gcmV0dXJuIHRoZSBibG9jayB0aGF0IGluY2x1ZGVzICB4LHlcbiAgICB2YXIgZ3ggPSBNYXRoLmZsb29yKCAoeCAtIHRoaXMubWluWCkgLyB0aGlzLl9iWCApO1xuICAgIHZhciBneSA9IE1hdGguZmxvb3IoICh5IC0gdGhpcy5taW5ZKSAvIHRoaXMuX2JZICk7XG4gICAgcmV0dXJuICh0aGlzLl9nW2d4XVtneV0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbnZva2UgdGhlIGNhbGxiYWNrIGVhY2ggYmxvY2sgaW4gdHVyblxuLy8gY2FsbGJhY2sgc2hvdWxkIGxvb2sgbGlrZTogZnVuY3Rpb24oZXJyLCBibG9jaykgeyAuLi4gfVxuLy8gaWYgZXJyIGlzIG51bGwgZXZlcnl0aGluZyBpcyBmaW5lLiBpZiBlcnIgaXMgbm90IG51bGwsIHRoZXJlXG4vLyB3YXMgYW4gZXJyb3IuXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5lYWNoQmxvY2sgPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZywgb3JkZXIpIHtcbiAgICBpZiAob3JkZXIgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9yZGVyID0gJ3h1cC15dXAnO1xuICAgIH1cbiAgICBpZiAodGhpc0FyZyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpc0FyZyA9IHRoaXM7XG4gICAgfVxuICAgIGlmIChvcmRlciA9PSAneHVwLXl1cCcpIHtcbiAgICAgICAgZm9yICh2YXIgZ3ggPSAwOyBneCA8IHRoaXMuX2cubGVuZ3RoOyBneCsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5fZ1swXS5sZW5ndGg7IGd5KyspIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIG51bGwsIHRoaXMuX2dbZ3hdW2d5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUZpZWxkO1xuXG5cblxuXG4iLCJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblxuXG4vLyBERUJVR1xudmFyIFNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gaXRlbSB0aGF0IG1pZ2h0IGFwcGVhciBpbiBhIFNjYXBlLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIHNldCBvZiBtZXNoZXMgdXNpbmdcbiAqIHRoZSBsaW5rZWQgaXRlbSB0eXBlLCBhbmQgcG9zaXRpb24gdGhlbSBhY2NvcmRpbmcgdG8gdGhlIHNwZWNpZmllZFxuICogeCx5IGxvY2F0aW9uLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGl0ZW0gd2lsbCBiZSBhZGRlZCBpbnRvXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyZW50QmxvY2sgVGhlIGJsb2NrIHRoYXQgb3ducyB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7U2NhcGVJdGVtVHlwZX0gaXRlbVR5cGUgVHlwZSBvZiB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucywgbm90IGN1cnJlbnRseSB1c2VkXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlSXRlbShpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fdHlwZSA9IGl0ZW1UeXBlO1xuICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5fcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgMCk7XG5cbiAgICBpZiAodHlwZW9mIHRoaXMuX29wdHMuY2xpY2tJZCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5jbGlja0lkID0gdGhpcy5fb3B0cy5jbGlja0lkO1xuICAgIH1cblxuICAgIC8vIFRPRE86IG1heWJlIGhhdmUgYSBzZXQgb2YgbWVzaGVzIGZvciBlYWNoIHNjZW5lLCBzbyBhbiBpdGVtXG4gICAgLy8gY2FuIGJlIGluIG11bHRpcGxlIHNjZW5lcz9cbiAgICB0aGlzLl9jcmVhdGVOZXcoKTtcblxuICAgIGlmICh0aGlzLl9jbGlja1BvaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuX2NsaWNrUG9pbnRzKTtcbiAgICB9XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUl0ZW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVJdGVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlSXRlbTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fY3JlYXRlTmV3ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcyAmJiB0aGlzLl9tZXNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl9kaXNwb3NlT2ZNZXNoZXMoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX2NsaWNrUG9pbnRzICYmIHRoaXMuX2NsaWNrUG9pbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbiAgICB9XG5cbiAgICB2YXIgdGhpbmdzID0gdGhpcy5fdHlwZSh0aGlzLl9vcHRzKTtcblxuICAgIHRoaXMuX21lc2hlcyA9IHRoaW5ncy5tZXNoZXM7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fY2xpY2tQb2ludHMgPSB0aGluZ3MuY2xpY2tQb2ludHM7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBjcC5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlRnJvbVNjZW5lKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVkT3B0aW9ucykge1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKHVwZGF0ZWRPcHRpb25zKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbih6KSB7XG4gICAgdGhpcy5fcG9zLnNldFooeik7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgY3AucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmFkZFRvU2NlbmUgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBzY2VuZS5hZGQobSk7XG4gICAgfSk7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBzY2VuZS5hZGQoY3ApO1xuICAgIH0pO1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX2Rpc3Bvc2VPZk1lc2hlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBpZiAobS5nZW9tZXRyeSkgbS5nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgIG0uZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2Rpc3Bvc2UnfSk7XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX2Rpc3Bvc2VPZkNsaWNrUG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBpZiAoY3AuZ2VvbWV0cnkpIGNwLmdlb21ldHJ5LmRpc3Bvc2UoKTtcbiAgICAgICAgY3AuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2Rpc3Bvc2UnfSk7XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUucmVtb3ZlRnJvbVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3NjZW5lKSB7XG4gICAgICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICAgICAgdGhpcy5fc2NlbmUucmVtb3ZlKG0pO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICAgICAgdGhpcy5fc2NlbmUucmVtb3ZlKGNwKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2VuZSA9IHRoaXMuX3NjZW5lOyAvLyByZW1lbWJlciB0aGlzIGJlY2F1c2UgcmVtb3ZlRnJvbVNjZW5lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpbGwgZGVsZXRlIHRoaXMuX3NjZW5lXG4gICAgaWYgKHRoaXMuX3NjZW5lKSB7IHRoaXMucmVtb3ZlRnJvbVNjZW5lKCk7IH1cbiAgICB0aGlzLl9kaXNwb3NlT2ZNZXNoZXMoKTtcbiAgICB0aGlzLl9kaXNwb3NlT2ZDbGlja1BvaW50cygpO1xuXG4gICAgdGhpcy5fY3JlYXRlTmV3KCk7XG4gICAgaWYgKHNjZW5lKSB7IHRoaXMuYWRkVG9TY2VuZShzY2VuZSk7IH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZG8gc29tZXRoaW5nIHRvIGVhY2ggY2xpY2tQb2ludFxuU2NhcGVJdGVtLnByb3RvdHlwZS5lYWNoQ2xpY2tQb2ludCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgaWYgKHRoaXMuX2NsaWNrUG9pbnRzKSB7XG4gICAgICAgIGZvciAodmFyIGNwID0gMDsgY3AgPCB0aGlzLl9jbGlja1BvaW50cy5sZW5ndGg7IGNwKyspIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5fY2xpY2tQb2ludHNbY3BdKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZG8gc29tZXRoaW5nIHRvIGVhY2ggbWVzaFxuU2NhcGVJdGVtLnByb3RvdHlwZS5lYWNoTWVzaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcykge1xuICAgICAgICBmb3IgKHZhciBtID0gMDsgbSA8IHRoaXMuX21lc2hlcy5sZW5ndGg7IG0rKykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLl9tZXNoZXNbbV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlSXRlbTtcbiIsIlxuLyoqXG4gKiBBIGJhZyBvZiBpdGVtIHR5cGVzIHRoYXQgc2NhcGVzIGNhbiBoYXZlIGluIHRoZW0uICBBbiBpdGVtIHR5cGVcbiAqIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBvcHRpb25zIGRlc2NyaWJpbmcgdGhlIGl0ZW0sIGFuZCByZXR1cm5zXG4gKiBhbiBhcnJheSBvZiBtZXNoZXMgdGhhdCBhcmUgdGhlIGl0ZW0gKGF0IDAsMCwwKS5cbiAqXG4gKiBXaGVuIGEgU2NhcGVJdGVtIGlzIGluc3RhbnRpYXRlZCBpdCBpbnZva2VzIHRoZSBhcHByb3ByaWF0ZSBpdGVtXG4gKiB0eXBlIHRvIGdldCBtZXNoZXMsIHRoZW4gcmUtcG9zaXRpb25zIHRoZSBtZXNoZXMgYXQgdGhlXG4gKiBhcHByb3ByaWF0ZSB4LHkseiBsb2NhdGlvbi5cbiAqXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZUl0ZW1zID0ge1xuICAgIC8vIGRvY3VtZW50YXRpb24gZm9yIGl0ZW1zIGFyZSBpbiB0aGUgLi9pdGVtdHlwZXMvKiBmaWxlc1xuICAgIGN1YmU6ICAgICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy9jdWJlJyksXG4gICAgdHJlZTogICAgICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL3RyZWUnKSxcbiAgICBzZW5zb3JUcmVlOiAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvc2Vuc29ydHJlZScpLFxuICAgIGNyYW5lOiAgICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy9jcmFuZScpXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlSXRlbXM7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuXG52YXIgTTQgPSBUSFJFRS5NYXRyaXg0O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBtZXNoIGFycmF5IGZvciBhIHRvd2VyIGNyYW5lLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdXNlZCB0byBzcGVjaWZ5IHByb3BlcnRpZXMgb2YgdGhlIGNyYW5lLlxuXG4gKiBAcGFyYW0ge3dpZHRofSBvcHRpb25zLndpZHRoPTIgV2lkdGggb2YgY3JhbmUgdG93ZXJcbiAqIEBwYXJhbSB7aGVpZ2h0fSBvcHRpb25zLmhlaWdodD01MCBIZWlnaHQgb2YgY3JhbmUgdG93ZXJcbiAqIEBwYXJhbSB7bGVuZ3RofSBvcHRpb25zLmxlbmd0aD00MCBMZW5ndGggb2YgY3JhbmUgYm9vbSwgZnJvbSB0aGVcbiAqICAgICAgICBjcmFuZSdzIGNlbnRyZSBheGlzIHRvIHRoZSB0aXBcbiAqIEBwYXJhbSB7cm90YXRpb259IG9wdGlvbnMucm90YXRpb249MCBEZWdyZWVzIG9mIGJvb20gcm90YXRpb24sXG4gKiAgICAgICAgY291bnRlZCBjbG9ja3dpc2UgZnJvbSB0aGUgK3ZlIFkgZGlyZWN0aW9uIChhd2F5IGZyb21cbiAqICAgICAgICB0aGUgY2FtZXJhKVxuICogQHBhcmFtIHtjb3VudGVyd2VpZ2h0TGVuZ3RofSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHRMZW5ndGg9bGVuZ3RoLzRcbiAqICAgICAgICBMZW5ndGggb2YgdGhlIGNvdW50ZXJ3ZWlnaHQgYm9vbSwgZnJvbSB0aGUgY3JhbmUncyBjZW50cmVcbiAqICAgICAgICBheGlzIHRvIHRoZSBlbmQgb2YgdGhlIGNvdW50ZXJ3ZWlnaHRcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMuc3RydXRzPVNjYXBlU3R1ZmYuZ2xvc3NCbGFja1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgc3RydXRzIGluIHRoZSB0b3dlciBhbmQgYm9vbSBvdXQgb2ZcbiAgKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmJhc2U9U2NhcGVTdHVmZi5jb25jcmV0ZVxuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgYmFzZSBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMucmluZz1TY2FwZVN0dWZmLnBsYXN0aWNcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgdG93ZXIgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmNhYmluPVNjYXBlU3R1ZmYucGxhc3RpY1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY2FiaW4gb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLndpbmRvdz1TY2FwZVN0dWZmLmdsYXNzXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSBjYWJpbiB3aW5kb3cgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHQ9U2NhcGVTdHVmZi5jb25jcmV0ZVxuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY291bnRlcndlaWdodCBvdXQgb2ZcbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY3JhbmVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDcmFuZUZhY3Rvcnkob3B0aW9ucykge1xuXG5cdHZhciBjcmFuZVBhcnRzID0gW107XG5cblx0dmFyIHRvd2VyV2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDI7XG5cdHZhciBoZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCA1MDtcblx0dmFyIGxlbmd0aCA9IG9wdGlvbnMubGVuZ3RoIHx8IDQwO1xuXHR2YXIgY291bnRlcndlaWdodExlbmd0aCA9IG9wdGlvbnMuY291bnRlcndlaWdodExlbmd0aCB8fCAobGVuZ3RoIC8gNCk7XG5cdHZhciBzdHJ1dFN0dWZmID0gb3B0aW9ucy5zdHJ1dHMgfHwgU2NhcGVTdHVmZi5nbG9zc0JsYWNrO1xuXHR2YXIgYmFzZVN0dWZmID0gb3B0aW9ucy5iYXNlIHx8IFNjYXBlU3R1ZmYuY29uY3JldGU7XG5cdHZhciByaW5nU3R1ZmYgPSBvcHRpb25zLnJpbmcgfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHR2YXIgY2FiaW5TdHVmZiA9IG9wdGlvbnMuY2FiaW4gfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHR2YXIgd2luZG93U3R1ZmYgPSBvcHRpb25zLndpbmRvdyB8fCBTY2FwZVN0dWZmLmdsYXNzO1xuXHR2YXIgY291bnRlcndlaWdodFN0dWZmID0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0IHx8IFNjYXBlU3R1ZmYuY29uY3JldGU7XG5cdHZhciByb3RhdGlvbiA9IC0xICogKG9wdGlvbnMucm90YXRpb24gfHwgMCkgKiBNYXRoLlBJIC8gMTgwO1xuXG5cdHZhciB0b3dlckhlaWdodCA9IGhlaWdodDtcblx0dmFyIGJhc2VXID0gdG93ZXJXaWR0aCAqIDM7XG5cdHZhciBiYXNlSCA9IHRvd2VyV2lkdGggKiAyOyAvLyBoYWxmIG9mIHRoZSBoZWlnaHQgd2lsbCBiZSBcInVuZGVyZ3JvdW5kXCJcblxuXHR2YXIgcG9sZVIgPSB0b3dlcldpZHRoIC8gMTA7XG5cblx0dmFyIHJpbmdSID0gKCh0b3dlcldpZHRoIC8gMikgKiBNYXRoLlNRUlQyKSArIDEuMyAqIHBvbGVSO1xuXHR2YXIgcmluZ0ggPSB0b3dlcldpZHRoIC8gNTtcblxuXHR2YXIgYm9vbUwgPSBsZW5ndGg7IC8vIGxlbmd0aCBvZiBjcmFuZSBib29tXG5cdHZhciBjd2JMID0gY291bnRlcndlaWdodExlbmd0aDsgLy8gbGVuZ3RoIG9mIGNvdW50ZXJ3ZWlnaHQgYm9vbVxuXHR2YXIgcm9kTCA9IGJvb21MICsgY3diTDtcblx0dmFyIGN3VyA9IHRvd2VyV2lkdGggLSAzKnBvbGVSO1xuXHR2YXIgY3dIID0gdG93ZXJXaWR0aCAqIDEuNTtcblx0dmFyIGN3TCA9IHRvd2VyV2lkdGggKiAxLjU7XG5cblx0dmFyIGNhYmluVyA9IHRvd2VyV2lkdGg7XG5cdHZhciBjYWJpbkggPSB0b3dlcldpZHRoICogMS4yNTtcblx0dmFyIGNhYmluTCA9IGNhYmluSDtcblxuXHQvLyB0aGlzIGlzIGZvciByb3RhdGluZyB0aGUgY3JhbmUgYm9vbVxuXHR2YXIgcm90YXRlID0gbmV3IE00KCkubWFrZVJvdGF0aW9uWihyb3RhdGlvbik7XG5cblx0Ly8gdGhpcyBpcyBmb3IgbWFraW5nIGN5bGluZGVycyBnbyB1cHJpZ2h0IChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgY3lsaW5kZXJSb3RhdGUgPSBuZXcgTTQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8vLy8vLy8vLyB0aGUgYmFzZVxuXHR2YXIgYmFzZUdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoYmFzZVcsIGJhc2VXLCBiYXNlSCk7XG5cdHZhciBiYXNlID0gbmV3IFRIUkVFLk1lc2goYmFzZUdlb20sIGJhc2VTdHVmZik7XG5cdGNyYW5lUGFydHMucHVzaChiYXNlKTtcblxuXHQvLy8vLy8vLy8vIHRoZSB2ZXJ0aWNhbCBtYXN0XG5cdC8vIG1ha2Ugb25lIHBvbGUgdG8gc3RhcnQgd2l0aFxuXHR2YXIgcG9sZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShwb2xlUiwgcG9sZVIsIHRvd2VySGVpZ2h0KTtcblx0cG9sZUdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKHRvd2VyV2lkdGgvMiwgdG93ZXJXaWR0aC8yLCB0b3dlckhlaWdodC8yKS5tdWx0aXBseShjeWxpbmRlclJvdGF0ZSkpO1xuXG5cdC8vIE1ha2UgdGhyZWUgbW9yZSBwb2xlcyBieSBjb3B5aW5nIHRoZSBmaXJzdCBwb2xlIGFuZCByb3RhdGluZyBhbm90aGVyIDkwZGVncyBhcm91bmQgdGhlIGNlbnRyZVxuXHR2YXIgcG9sZTtcblx0dmFyIHJvdGF0ZUFyb3VuZFogPSBuZXcgTTQoKS5tYWtlUm90YXRpb25aKE1hdGguUEkvMik7XG5cdGZvciAodmFyIHAgPSAwOyBwIDwgNDsgcCsrKSB7XG5cdFx0cG9sZSA9IG5ldyBUSFJFRS5NZXNoKHBvbGVHZW9tLCBzdHJ1dFN0dWZmKTtcblx0XHRjcmFuZVBhcnRzLnB1c2gocG9sZSk7XG5cdFx0cG9sZUdlb20gPSBwb2xlR2VvbS5jbG9uZSgpO1xuXHRcdHBvbGVHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZUFyb3VuZFopO1xuXHR9XG5cblxuXHQvLy8vLy8vLy8vIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyXG5cdHZhciByaW5nR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KHJpbmdSLCByaW5nUiwgcmluZ0gsIDEyLCAxLCB0cnVlKTtcblx0cmluZ0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIHRvd2VySGVpZ2h0IC0gcmluZ0gvMikubXVsdGlwbHkoY3lsaW5kZXJSb3RhdGUpKTtcblx0cmluZ1N0dWZmLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2gocmluZ0dlb20sIHJpbmdTdHVmZikpO1xuXG5cblx0Ly8vLy8vLy8vLyB0aGUgaG9yaXpvbnRhbCBib29tXG5cdC8vIG1ha2Ugb25lIHJvZCB0byBzdGFydCB3aXRoXG5cdHZhciB0b3BSb2RHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkocG9sZVIsIHBvbGVSLCByb2RMKTtcblxuXHQvLyB0b3Agcm9kXG5cdHRvcFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIChyb2RMLzIpIC0gY3diTCwgdG93ZXJIZWlnaHQgKyBwb2xlUiArIDAuNSAqIHRvd2VyV2lkdGgpKTtcblx0bGVmdFJvZEdlb20gPSB0b3BSb2RHZW9tLmNsb25lKCk7XG5cdHJpZ2h0Um9kR2VvbSA9IHRvcFJvZEdlb20uY2xvbmUoKTtcblxuXHR0b3BSb2RHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaCh0b3BSb2RHZW9tLCBzdHJ1dFN0dWZmKSk7XG5cblx0Ly8gYm90dG9tIGxlZnQgcm9kXG5cdGxlZnRSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigtMC41ICogdG93ZXJXaWR0aCArIHBvbGVSLCAwLCAtMC41ICogdG93ZXJXaWR0aCkpO1xuXHRsZWZ0Um9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2gobGVmdFJvZEdlb20sIHN0cnV0U3R1ZmYpKTtcblxuXHQvLyBib3R0b20gcmlnaHQgcm9kXG5cdHJpZ2h0Um9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMC41ICogdG93ZXJXaWR0aCAtIHBvbGVSLCAwLCAtMC41ICogdG93ZXJXaWR0aCkpO1xuXHRyaWdodFJvZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKHJpZ2h0Um9kR2VvbSwgc3RydXRTdHVmZikpO1xuXG5cdC8vIGVuZCBvZiB0aGUgYm9vbVxuXHR2YXIgZW5kR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSh0b3dlcldpZHRoLCBwb2xlUiwgMC41ICogdG93ZXJXaWR0aCArIHBvbGVSICsgcG9sZVIpO1xuXHRlbmRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCBib29tTCwgdG93ZXJIZWlnaHQgKyAwLjI1ICogdG93ZXJXaWR0aCArIHBvbGVSKSk7XG5cdGVuZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKGVuZEdlb20sIHN0cnV0U3R1ZmYpKTtcblxuXG5cdC8vLy8vLy8vLy8gY291bnRlcndlaWdodFxuXHR2YXIgY3dHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGN3VywgY3dMLCBjd0gpO1xuXHRjd0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDEuMDAxICogKGN3TC8yIC0gY3diTCksIHRvd2VySGVpZ2h0KSk7XG5cdGN3R2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRjcmFuZVBhcnRzLnB1c2gobmV3IFRIUkVFLk1lc2goY3dHZW9tLCBjb3VudGVyd2VpZ2h0U3R1ZmYpKTtcblxuXG5cdC8vLy8vLy8vLy8gY2FiaW5cblx0dmFyIGNhYmluR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShjYWJpblcsIGNhYmluTCwgY2FiaW5IKTtcblx0dmFyIHdpbmRvd0dlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoY2FiaW5XICogMS4xLCBjYWJpbkwgKiAwLjYsIGNhYmluSCAqIDAuNik7XG5cdGNhYmluR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oY2FiaW5XLzIgKyBwb2xlUiwgMCwgY2FiaW5ILzIgKyB0b3dlckhlaWdodCArIHBvbGVSICsgcG9sZVIpKTtcblx0d2luZG93R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oY2FiaW5XLzIgKyBwb2xlUiwgY2FiaW5MICogMC4yNSwgY2FiaW5IICogMC42ICsgdG93ZXJIZWlnaHQgKyBwb2xlUiArIHBvbGVSKSk7XG5cdGNhYmluR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHR3aW5kb3dHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGNyYW5lUGFydHMucHVzaChuZXcgVEhSRUUuTWVzaChjYWJpbkdlb20sIGNhYmluU3R1ZmYpKTtcblx0Y3JhbmVQYXJ0cy5wdXNoKG5ldyBUSFJFRS5NZXNoKHdpbmRvd0dlb20sIHdpbmRvd1N0dWZmKSk7XG5cblx0Ly8gcmV0dXJuIGFsbCB0aGUgY3JhbmUgYml0cy5cblx0cmV0dXJuIHsgbWVzaGVzOiBjcmFuZVBhcnRzLCBjbGlja1BvaW50czogW10gfTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDcmFuZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBjdWJlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBtYXRlcmlhbC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFRoZSBsZW5ndGggb2YgYSBzaWRlIG9mIHRoZSBjdWJlLiAgRGVmYXVsdHMgdG8gMS5cbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG1hdGVyaWFsIFdoYXQgdGhlIG1ha2UgdGhlIGN1YmUgb3V0IG9mLiAgRGVmYXVsdHMgdG8gYFNjYXBlLlN0dWZmLmdlbmVyaWNgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBOb3QgdXNlZC5cbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY3ViZVxuICovXG5mdW5jdGlvbiBTY2FwZUN1YmVGYWN0b3J5KG9wdGlvbnMpIHtcbiAgICAvLyBjb25zdHJ1Y3QgYSBtZXNoIFwic2l0dGluZyBvblwiIHRoZSBwb2ludCAwLDAsMFxuXG4gICAgc2l6ZSA9IG9wdGlvbnMuc2l6ZSB8fCAxO1xuICAgIG1hdGVyaWFsID0gb3B0aW9ucy5tYXRlcmlhbCB8fCBTY2FwZVN0dWZmLmdlbmVyaWM7XG5cbiAgICAvLyBtYWtlcyBhIGN1YmUgY2VudGVyZWQgb24gMCwwLDBcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzaXplLCBzaXplLCBzaXplKTtcblxuICAgIC8vIHRyYW5zZm9ybSBpdCB1cCBhIGJpdCwgc28gd2UncmUgY2VudGVyZWQgb24geCA9IDAgYW5kIHkgPSAwLCBidXQgaGF2ZSB0aGUgX2JvdHRvbV8gZmFjZSBzaXR0aW5nIG9uIHogPSAwLlxuICAgIGdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIHNpemUvMikgKTtcblxuICAgIC8vIHJldHVybiBpdCBpbiBhIGRhdGEgb2JqZWN0XG5cdHJldHVybiB7IG1lc2hlczogW25ldyBUSFJFRS5NZXNoKGdlb20sIG1hdGVyaWFsKV0sIGNsaWNrUG9pbnRzOiBbXSB9O1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUN1YmVGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlVHJlZUZhY3RvcnkgPSByZXF1aXJlKCcuL3RyZWUuanMnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgdHJlZSBtZXNoIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZSBhbmQgY29sb3IsIHdpdGggYWRkZWRcbiAqIHNlbnNvcnMgYXR0YWNoZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB1c2VkIHRvIHNwZWNpZnkgcHJvcGVydGllcyBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmRpYW1ldGVyPTEgRGlhbWV0ZXIgb2YgdHJ1bmsgKGEuay5hLiBEQkgpXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5oZWlnaHQ9MTAgSGVpZ2h0IG9mIHRyZWVcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMudHJ1bmtNYXRlcmlhbD1TY2FwZVN0dWZmLndvb2QgV2hhdCB0byBtYWtlIHRoZSB0cnVuayBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMubGVhZk1hdGVyaWFsPVNjYXBlU3R1ZmYuZm9saWFnZSBXaGF0IHRvIG1ha2UgdGhlIGZvbGlhZ2Ugb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnRyZWVcbiAqL1xuZnVuY3Rpb24gU2NhcGVTZW5zb3JUcmVlRmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHQvLyBzdGFydCB3aXRoIHN0YW5kYXJkIHRyZWUgbWVzaGVzXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHt9O1xuXHR2YXIgdHJlZVBhcnRzID0gU2NhcGVUcmVlRmFjdG9yeShvcHRpb25zLCBpKTtcblxuXHRpLmRpYW0gPSBpLmRpYW0gfHwgMTtcblxuXHQvLyB0cmFuc2Zvcm1zIHdlIG1pZ2h0IG5lZWQ6XG5cdC8vIHJvdGF0ZSBzbyBpdCdzIGhlaWdodCBpcyBhbG9uZyB0aGUgWiBheGlzIChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8gbm93IGFkZCB0aGUgZXh0cmEgc2Vuc29yc1xuXG5cdC8vLy8vLy8vLy8gZGVuZHJvXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5kZW5kcm9tZXRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHR2YXIgZCA9IHt9O1xuXHRcdGQuYmFuZFdpZHRoID0gb3B0aW9ucy5kZW5kcm9tZXRlci53aWR0aCB8fCAwLjU7XG5cdFx0ZC5iYW5kUmFkaXVzID0gaS50cnVua1JhZGl1cyArIDAuMiAqIGQuYmFuZFdpZHRoO1xuXHRcdGQuYmFuZEhlaWdodCA9IE1hdGgubWluKG9wdGlvbnMuZGVuZHJvbWV0ZXIuaGVpZ2h0IHx8IDEuNSwgaS50cnVua0hlaWdodCAtIGQuYmFuZFdpZHRoLzIpO1xuXG5cdFx0ZC5tZXRlclJhZGl1cyA9IGQuYmFuZFdpZHRoO1xuXHRcdGQubWV0ZXJIZWlnaHQgPSBkLmJhbmRXaWR0aCAqIDM7XG5cblx0XHRkLm1vdW50UmFkaXVzID0gZC5tZXRlclJhZGl1cyAqIDEuMTtcblx0XHRkLm1vdW50V2lkdGggPSBkLm1ldGVySGVpZ2h0IC8gNDtcblxuXHRcdGQuYmFuZFN0dWZmID0gb3B0aW9ucy5kZW5kcm9tZXRlci5iYW5kIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdFx0ZC5tb3VudFN0dWZmID0gb3B0aW9ucy5kZW5kcm9tZXRlci5tb3VudCB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXHRcdGQubWV0ZXJTdHVmZiA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIubWV0ZXIgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblxuXHRcdC8vIHRoZSBzdGVlbCBiYW5kXG5cdFx0dmFyIGJhbmRHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5iYW5kUmFkaXVzLCBkLmJhbmRSYWRpdXMsIGQuYmFuZFdpZHRoLCAxMiwgMSk7XG5cdFx0YmFuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGQuYmFuZEhlaWdodCkubXVsdGlwbHkocm90YXRlKSk7XG5cdFx0dmFyIGJhbmQgPSBuZXcgVEhSRUUuTWVzaChiYW5kR2VvbSwgZC5iYW5kU3R1ZmYpO1xuXHRcdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyQmFuZCcpO1xuXHRcdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChiYW5kKTtcblxuXHRcdC8vIHRoZSBtZXRlciBpdHNlbGZcblx0XHR2YXIgbWV0ZXJCb3R0b21HZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5tZXRlclJhZGl1cywgZC5tZXRlclJhZGl1cywgMC42NyAqIGQubWV0ZXJIZWlnaHQsIDcsIDEpO1xuXHRcdG1ldGVyQm90dG9tR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzICsgZC5tZXRlclJhZGl1cywgMCwgZC5iYW5kSGVpZ2h0ICsgZC5tZXRlckhlaWdodC82KS5tdWx0aXBseShyb3RhdGUpKTtcblx0XHR2YXIgbWV0ZXJCb3R0b20gPSBuZXcgVEhSRUUuTWVzaChtZXRlckJvdHRvbUdlb20sIGQubWV0ZXJTdHVmZik7XG5cdFx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJCb3R0b20nKTtcblx0XHR0cmVlUGFydHMubWVzaGVzLnB1c2gobWV0ZXJCb3R0b20pO1xuXG5cdFx0dmFyIG1ldGVyVG9wR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubWV0ZXJSYWRpdXMvNSwgZC5tZXRlclJhZGl1cywgMC4zMyAqIGQubWV0ZXJIZWlnaHQsIDcsIDEpO1xuXHRcdG1ldGVyVG9wR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzICsgZC5tZXRlclJhZGl1cywgMCwgZC5iYW5kSGVpZ2h0ICsgZC5tZXRlckhlaWdodC8yICsgZC5tZXRlckhlaWdodC82KS5tdWx0aXBseShyb3RhdGUpKTtcblx0XHR2YXIgbWV0ZXJUb3AgPSBuZXcgVEhSRUUuTWVzaChtZXRlclRvcEdlb20sIGQubWV0ZXJTdHVmZik7XG5cdFx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJUb3AnKTtcblx0XHR0cmVlUGFydHMubWVzaGVzLnB1c2gobWV0ZXJUb3ApO1xuXG5cdFx0Ly8gdGhlIG1vdW50XG5cdFx0dmFyIG1vdW50QmFuZEdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShkLm1vdW50UmFkaXVzLCBkLm1vdW50UmFkaXVzLCBkLm1vdW50V2lkdGgsIDcsIDEpO1xuXHRcdG1vdW50QmFuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQuYmFuZFdpZHRoLzIgKyBkLm1vdW50V2lkdGgvMikubXVsdGlwbHkocm90YXRlKSk7XG5cdFx0dmFyIG1vdW50QmFuZCA9IG5ldyBUSFJFRS5NZXNoKG1vdW50QmFuZEdlb20sIGQubW91bnRTdHVmZik7XG5cdFx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJNb3VudEJhbmQnKTtcblx0XHR0cmVlUGFydHMubWVzaGVzLnB1c2gobW91bnRCYW5kKTtcblxuXHRcdHZhciBtb3VudEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoZC5tb3VudFJhZGl1cywgZC5tb3VudFJhZGl1cy8yLCBkLm1vdW50V2lkdGgpO1xuXHRcdG1vdW50R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLmJhbmRXaWR0aC8yICsgZC5tb3VudFdpZHRoLzIpKTtcblx0XHR2YXIgbW91bnQgPSBuZXcgVEhSRUUuTWVzaChtb3VudEdlb20sIGQubW91bnRTdHVmZik7XG5cdFx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJNb3VudCcpO1xuXHRcdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChtb3VudCk7XG5cblx0XHQvLyB0aGUgZGVuZHJvIHNob3VsZCBiZSBjbGlja2FibGVcblx0XHR2YXIgZGVuZHJvQ2xpY2sgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblx0XHRkZW5kcm9DbGljay52aXNpYmxlID0gZmFsc2U7XG5cdFx0ZGVuZHJvQ2xpY2suYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvNikpO1xuXHRcdHRyZWVQYXJ0cy5jbGlja1BvaW50cy5wdXNoKGRlbmRyb0NsaWNrKTtcblxuXHRcdGkuZGVuZHJvbWV0ZXIgPSBkO1xuXHR9XG5cdHJldHVybiB0cmVlUGFydHM7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU2Vuc29yVHJlZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSB0cmVlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBjb2xvci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuZGlhbWV0ZXI9MSBEaWFtZXRlciBvZiB0cnVuayAoYS5rLmEuIERCSClcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmhlaWdodD0xMCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy50cnVua01hdGVyaWFsPVNjYXBlU3R1ZmYud29vZCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5sZWFmTWF0ZXJpYWw9U2NhcGVTdHVmZi5mb2xpYWdlIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW50ZXJuYWxzIElmIHN1cHBsaWVkLCB0aGlzIGZhY3Rvcnkgd2lsbCBzYXZlIHNvbWVcbiAqICAgICAgICBpbnRlcmltIGNhbGN1bGF0ZWQgdmFsdWVzIGludG8gdGhpcyBvYmplY3QuICBFLmcuXG4gKiAgICAgICAgdGhlIGhlaWdodCBvZiB0aGUgY2Fub3B5LCB0aGUgTWF0ZXJpYWwgdGhlIHRydW5rIGlzIG1hZGUgb3V0XG4gKiAgICAgICAgb2YsIGV0Yy4gIFRoaXMgY2FuIGhlbHAgYW5vdGhlciBTY2FwZUl0ZW1UeXBlIGZhY3RvcnkgdXNlXG4gKiAgICAgICAgdGhpcyBhcyBhIHN0YXJ0aW5nIHBvaW50LlxuICogQHBhcmFtIHtBcnJheX0gaW50ZXJuYWxzLm1lc2hOYW1lcyBBbiBhcnJheSBvZiBtZXNoIG5hbWVzLCBpbiB0aGVcbiAqICAgICAgICBzYW1lIG9yZGVyIGFzIHRoZSBtZXNoIGxpc3QgcmV0dXJuZWQgYnkgdGhlIGZ1bmN0aW9uLiAgVGhpc1xuICogICAgICAgIGFsbG93cyBkb3duc3RyZWFtIGZhY3RvcnkgZnVuY3Rpb25zIHRvIGlkZW50aWZ5IG1lc2hlcyBpblxuICogICAgICAgIG9yZGVyIHRvIGFsdGVyIHRoZW0uXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnRyZWVcbiAqL1xuZnVuY3Rpb24gU2NhcGVUcmVlRmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblxuXHRpLmRpYW0gPSBvcHRpb25zLmRpYW1ldGVyIHx8IDE7XG5cdGkuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMTA7XG5cdGkudHJ1bmtTdHVmZiA9IG9wdGlvbnMudHJ1bmsgfHwgU2NhcGVTdHVmZi53b29kO1xuXHRpLmNhbm9weVN0dWZmID0gb3B0aW9ucy5jYW5vcHkgfHwgU2NhcGVTdHVmZi5mb2xpYWdlO1xuXG5cdGkuY2Fub3B5SGVpZ2h0ID0gaS5oZWlnaHQgLyA0O1xuXHRpLnRydW5rSGVpZ2h0ID0gaS5oZWlnaHQgLSBpLmNhbm9weUhlaWdodDtcblx0aS50cnVua1JhZGl1cyA9IDIgKiBpLmRpYW0gLyAyO1xuXHRpLmNhbm9weVJhZGl1cyA9IGkudHJ1bmtSYWRpdXMgKiA2O1xuXG5cdGkudHJ1bmtHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS50cnVua1JhZGl1cy8yLCBpLnRydW5rUmFkaXVzLCBpLnRydW5rSGVpZ2h0LCAxMik7XG5cdGkuY2Fub3B5R2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkuY2Fub3B5UmFkaXVzLCBpLmNhbm9weVJhZGl1cywgaS5jYW5vcHlIZWlnaHQsIDEyKTtcblxuXHQvLyB0cmFuc2Zvcm1zIHdlIG5lZWQ6XG5cdC8vIHJvdGF0ZSBzbyBpdCdzIGhlaWdodCBpcyBhbG9uZyB0aGUgWiBheGlzIChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8gY2VudGVyIG9uIHggPSAwIGFuZCB5ID0gMCwgYnV0IGhhdmUgdGhlIF9ib3R0b21fIGZhY2Ugc2l0dGluZyBvbiB6ID0gMFxuXHR2YXIgdHJ1bmtQb3NpdGlvbiA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkudHJ1bmtIZWlnaHQvMik7XG5cblx0Ly8gY2VudGVyIG9uIHggPSAwLCB5ID0gMCwgYnV0IGhhdmUgdGhlIGNhbm9weSBhdCB0aGUgdG9wXG5cdHZhciBjYW5vcHlQb3NpdGlvbiA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkuY2Fub3B5SGVpZ2h0LzIgKyBpLmhlaWdodCAtIGkuY2Fub3B5SGVpZ2h0KTtcblxuXHRpLnRydW5rR2VvbS5hcHBseU1hdHJpeCh0cnVua1Bvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHRpLmNhbm9weUdlb20uYXBwbHlNYXRyaXgoY2Fub3B5UG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cblx0dmFyIHRydW5rID0gbmV3IFRIUkVFLk1lc2goaS50cnVua0dlb20sIGkudHJ1bmtTdHVmZik7XG5cdHZhciBjYW5vcHkgPSBuZXcgVEhSRUUuTWVzaChpLmNhbm9weUdlb20sIGkuY2Fub3B5U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcyA9IFsndHJ1bmsnLCdjYW5vcHknXTtcblxuXHRyZXR1cm4geyBtZXNoZXM6IFt0cnVuaywgY2Fub3B5XSwgY2xpY2tQb2ludHM6IFtdIH07XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlVHJlZUZhY3Rvcnk7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVDaHVuayA9IHJlcXVpcmUoJy4vY2h1bmsnKTtcblxuXG4vLyBERUJVR1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAY2FsbGJhY2sgU2NhcGVTY2VuZX5kYXRlQ2hhbmdlXG4gKiBAcGFyYW0ge3N0cmluZ30gZXJyb3IgRGVzY3JpcHRpb24gb2YgZXJyb3IsIG90aGVyd2lzZSBudWxsXG4gKiBAcGFyYW0ge2RhdGV9IGRhdGUgRGF0ZSB0aGUgc2NhcGUgaXMgbm93IGRpc3BsYXlpbmdcbiAqL1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIG9mIGEgbGFuZHNjYXBlIC8gbW9vbnNjYXBlIC8gd2hhdGV2ZXJcbiAqIEBwYXJhbSB7U2NhcGVGaWVsZH0gZmllbGQgIHRoZSBmaWVsZCBiZWluZyByZW5kZXJlZFxuICogQHBhcmFtIHtzdHJpbmd9IGRvbSAgICAgICAgRE9NIGVsZW1lbnQgdGhlIHNjYXBlIHNob3VsZCBiZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWQgaW50by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICAgIGNvbGxlY3Rpb24gb2Ygb3B0aW9ucy4gIEFsbCBhcmUgb3B0aW9uYWwuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmxpZ2h0cz0nc3VuJywnc2t5JyAtIGFycmF5IG9mIHN0cmluZ3NcbiAqIG5hbWluZyBsaWdodHMgdG8gaW5jbHVkZSBpbiB0aGlzIHNjZW5lLiAgQ2hvb3NlIGZyb206XG4gKlxuICogc3RyaW5nICAgIHwgbGlnaHQgdHlwZVxuICogLS0tLS0tLS0tLXwtLS0tLS0tLS0tLVxuICogYHRvcGxlZnRgIHwgYSBsaWdodCBmcm9tIGFib3ZlIHRoZSBjYW1lcmEncyBsZWZ0IHNob3VsZGVyXG4gKiBgYW1iaWVudGAgfCBhIGRpbSBhbWJpZW50IGxpZ2h0XG4gKiBgc3VuYCAgICAgfCBhIGRpcmVjdGlvbmFsIGxpZ2h0IHRoYXQgb3JiaXRzIHRoZSBzY2VuZSBvbmNlIHBlciBkYXlcbiAqIGBza3lgICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBzaGluZXMgZnJvbSBhYm92ZSB0aGUgc2NlbmVcbiAqIEBwYXJhbSB7RGF0ZXxcIm5vd1wifSBvcHRpb25zLmN1cnJlbnREYXRlPSdub3cnIC0gVGhlIHRpbWUgYW5kIGRhdGVcbiAqIGluc2lkZSB0aGUgc2NhcGUuICBUaGUgc3RyaW5nIFwibm93XCIgbWVhbnMgc2V0IGN1cnJlbnREYXRlIHRvIHRoZVxuICogcHJlc2VudC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnRpbWVSYXRpbz0xIFRoZSByYXRlIHRpbWUgc2hvdWxkIHBhc3MgaW5cbiAqIHRoZSBzY2FwZSwgcmVsYXRpdmUgdG8gbm9ybWFsLiAgMC4xIG1lYW5zIHRlbiB0aW1lcyBzbG93ZXIuICA2MFxuICogbWVhbnMgb25lIG1pbnV0ZSByZWFsIHRpbWUgPSBvbmUgaG91ciBzY2FwZSB0aW1lLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfmRhdGVDaGFuZ2V9IG9wdGlvbnMuZGF0ZVVwZGF0ZSBjYWxsYmFjayBmb3JcbiAqIHdoZW4gdGhlIHNjZW5lIHRpbWUgY2hhbmdlcyAod2hpY2ggaXMgYSBsb3QpLlxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZVNjZW5lKGZpZWxkLCBkb20sIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgLy8gbGlnaHRzOiBbJ3RvcGxlZnQnLCAnYW1iaWVudCddLFxuICAgICAgICBsaWdodHM6IFsnc3VuJywgJ3NreSddLFxuICAgICAgICBjdXJyZW50RGF0ZTogJ25vdycsICAvLyBlaXRoZXIgc3RyaW5nICdub3cnIG9yIGEgRGF0ZSBvYmplY3RcbiAgICAgICAgdGltZVJhdGlvOiAxLFxuICAgICAgICBkYXRlVXBkYXRlOiBudWxsIC8vIGNhbGxiYWNrIHRvdXBkYXRlIHRoZSBkaXNwbGF5ZWQgZGF0ZS90aW1lXG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIHNhdmUgdGhlIGZpZWxkXG4gICAgdGhpcy5mID0gZmllbGQ7XG5cbiAgICAvLyBkaXNjb3ZlciBET00gY29udGFpbmVyXG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZG9tKTtcblxuICAgIHRoaXMuZGF0ZSA9IHRoaXMuX29wdHMuY3VycmVudERhdGU7XG4gICAgaWYgKHRoaXMuZGF0ZSA9PT0gJ25vdycpIHtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5zdGFydERhdGUgPSB0aGlzLmRhdGU7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgLy8gY3JlYXRlIGFuZCBzYXZlIGFsbCB0aGUgYml0cyB3ZSBuZWVkXG4gICAgdGhpcy5yZW5kZXJlciA9IHRoaXMuX21ha2VSZW5kZXJlcih7IGRvbTogdGhpcy5lbGVtZW50IH0pO1xuICAgIHRoaXMuc2NlbmUgPSB0aGlzLl9tYWtlU2NlbmUoKTtcbiAgICB0aGlzLmNhbWVyYSA9IHRoaXMuX21ha2VDYW1lcmEoKTtcbiAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy5fbWFrZUNvbnRyb2xzKCk7XG4gICAgdGhpcy5saWdodHMgPSB0aGlzLl9tYWtlTGlnaHRzKHRoaXMuX29wdHMubGlnaHRzKTtcblxuICAgIHRoaXMuY29ubmVjdEZpZWxkKCk7XG5cbiAgICAvLyBhZGQgZ3JpZHMgYW5kIGhlbHBlciBjdWJlc1xuICAgIC8vIHRoaXMuYWRkSGVscGVyR3JpZCgpO1xuICAgIHRoaXMuYWRkSGVscGVyR3JpZCgndG9wJyk7XG4gICAgdGhpcy5hZGRIZWxwZXJTaGFwZXMoKTtcblxuICAgIHZhciBsYXN0TG9nQXQgPSAwOyAvLyBERUJVR1xuICAgIHZhciByZW5kZXIgPSAoZnVuY3Rpb24gdW5ib3VuZFJlbmRlcih0cykge1xuXG4gICAgICAgIC8vIERFQlVHXG4gICAgICAgIGlmIChsYXN0TG9nQXQgKyAyMDAwIDwgdHMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcuLi4nKTtcbiAgICAgICAgICAgIGxhc3RMb2dBdCA9IHRzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gREVCVUcgZGlzYWJsZWQgdGltZSB1cGRhdGVzLi5cbiAgICAgICAgdGhpcy5fdXBkYXRlVGltZSgpO1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSggcmVuZGVyICk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKCB0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSApO1xuICAgICAgICB0aGlzLmNvbnRyb2xzLnVwZGF0ZSgpO1xuICAgIH0pLmJpbmQodGhpcyk7XG5cbiAgICByZW5kZXIoMCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZVNjZW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVTY2VuZTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUuYWRkKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUuYWRkKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiByZW1vdmUgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUucmVtb3ZlKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUucmVtb3ZlKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYmxvY2tzIGZyb20gdGhlIGF0dGFjaGVkIFNjYXBlRmllbGQgaW50byB0aGUgc2NlbmUuXG4gKlxuICogWW91IHdpbGwgcHJvYmFibHkgb25seSBuZWVkIHRvIGNhbGwgdGhpcyBvbmNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25uZWN0RmllbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmYuYnVpbGRCbG9ja3ModGhpcyk7XG4gICAgdGhpcy5mLmJ1aWxkSXRlbXModGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGhlbHBlciBjdWJlcyBhdCBzb21lIG9mIHRoZSBjb3JuZXJzIG9mIHlvdXIgc2NhcGUsIHNvIHlvdSBjYW5cbiAqIHNlZSB3aGVyZSB0aGV5IGFyZSBpbiBzcGFjZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG4gICAgdmFyIGYgPSB0aGlzLmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgoZi5taW5YICsgZi5tYXhYKSAvIDIsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWF4WSwgZi5taW5aLCBncmVlbik7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5taW5ZLCBmLm1heFosIGJsdWUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWF4WSwgZi5taW5aLCB3aGl0ZSk7XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBjdWJlIGF0IHBvc2l0aW9uIGB4YCwgYHlgLCBgemAgdG8gY29uZmlybSB3aGVyZSB0aGF0IGlzLFxuICogZXhhY3RseS4gIEdyZWF0IGZvciB0cnlpbmcgdG8gd29yayBvdXQgaWYgeW91ciBzY2FwZSBpcyBiZWluZ1xuICogcmVuZGVyZWQgd2hlcmUgeW91IHRoaW5rIGl0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqXG4gKiBAcGFyYW0geyhOdW1iZXJ8VmVjdG9yMyl9IHggWCBjb29yZGluYXRlLCBvciBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvVmVjdG9yMyBUSFJFRS5WZWN0b3IzfSBjb250YWluaW5nIHgsIHkgYW5kIHogY29vcmRzXG4gKiBAcGFyYW0ge051bWJlcn0gW3ldIFkgY29vcmRpbmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IFt6XSBaIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7Q29sb3J8U3RyaW5nfEludGVnZXJ9IGNvbG9yPScjY2NjY2NjJyBDb2xvciBvZiBjdWJlLlxuICogQ2FuIGJlIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9Db2xvciBUSFJFRS5Db2xvcn0sIGEgY29sb3ItcGFyc2VhYmxlIHN0cmluZyBsaWtlXG4gKiBgJyMzMzY2Y2MnYCwgb3IgYSBudW1iZXIgbGlrZSBgMHgzMzY2Y2NgLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJDdWJlID0gZnVuY3Rpb24oeCwgeSwgeiwgY29sb3IpIHtcbiAgICAvLyBmaXJzdCwgc2V0IHRoZSBjb2xvciB0byBzb21ldGhpbmdcbiAgICBpZiAodHlwZW9mIGNvbG9yID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgdG8gbGlnaHQgZ3JleS5cbiAgICAgICAgY29sb3IgPSBuZXcgVEhSRUUuQ29sb3IoMHhjY2NjY2MpO1xuICAgIH1cbiAgICB2YXIgcG9zOyAvLyB0aGUgcG9zaXRpb24gdG8gZHJhdyB0aGUgY3ViZVxuICAgIGlmICh0eXBlb2YgeC54ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIHRoZW4gaXQncyBhIHZlY3RvciwgYW5kIHkgbWlnaHQgYmUgdGhlIGNvbG9yXG4gICAgICAgIHBvcyA9IHg7XG4gICAgICAgIGlmICh0eXBlb2YgeSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29sb3IgPSB5O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8geCBpc24ndCBhIHZlY3Rvciwgc28gYXNzdW1lIHNlcGFyYXRlIHggeSBhbmQgelxuICAgICAgICBwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCB6KTtcbiAgICAgICAgLy8gd2UgY2F1Z2h0IGNvbG9yIGFscmVhZHkuXG4gICAgfVxuXG4gICAgLy8gYWJvdXQgYSBmaWZ0aWV0aCBvZiB0aGUgZmllbGQncyBzdW1tZWQgZGltZW5zaW9uc1xuICAgIHZhciBzaXplID0gKHRoaXMuZi53WCArIHRoaXMuZi53WSArIHRoaXMuZi53WikgLyA1MDtcbiAgICAvLyB1c2UgdGhlIGNvbG91ciB3ZSBkZWNpZGVkIGVhcmxpZXJcbiAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7IGNvbG9yOiBjb2xvciB9KTtcblxuICAgIC8vIG9rYXkuLiBtYWtlIGl0LCBwb3NpdGlvbiBpdCwgYW5kIHNob3cgaXRcbiAgICB2YXIgY3ViZSA9IFNjYXBlSXRlbXMuY3ViZSh7IHNpemU6IHNpemUsIG1hdGVyaWFsOiBtYXRlcmlhbCB9KS5tZXNoZXNbMF07XG4gICAgY3ViZS5wb3NpdGlvbi5jb3B5KHBvcyk7XG4gICAgdGhpcy5zY2VuZS5hZGQoY3ViZSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckdyaWQgPSBmdW5jdGlvbih0b3BPckJvdHRvbSkge1xuICAgIHZhciBneiA9IDA7XG4gICAgdmFyIGdjID0gMHg0NDQ0NDQ7XG4gICAgaWYgKHRvcE9yQm90dG9tID09ICd0b3AnKSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1heFo7XG4gICAgICAgIGdjID0gMHhjY2NjZmY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWluWjtcbiAgICAgICAgZ2MgPSAweGNjZmZjYztcbiAgICB9XG5cbiAgICB2YXIgZ3JpZFcgPSBNYXRoLm1heCh0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLCB0aGlzLmYubWF4WSAtIHRoaXMuZi5taW5ZKTtcblxuICAgIC8vIEdyaWQgXCJzaXplXCIgaXMgdGhlIGRpc3RhbmNlIGluIGVhY2ggb2YgdGhlIGZvdXIgZGlyZWN0aW9ucyxcbiAgICAvLyB0aGUgZ3JpZCBzaG91bGQgc3Bhbi4gIFNvIGZvciBhIGdyaWQgVyB1bml0cyBhY3Jvc3MsIHNwZWNpZnlcbiAgICAvLyB0aGUgc2l6ZSBhcyBXLzIuXG4gICAgdmFyIGdyaWRYWSA9IG5ldyBUSFJFRS5HcmlkSGVscGVyKGdyaWRXLzIsIGdyaWRXLzEwKTtcbiAgICBncmlkWFkuc2V0Q29sb3JzKGdjLCBnYyk7XG4gICAgZ3JpZFhZLnJvdGF0aW9uLnggPSBNYXRoLlBJLzI7XG4gICAgZ3JpZFhZLnBvc2l0aW9uLnNldCh0aGlzLmYubWluWCArIGdyaWRXLzIsIHRoaXMuZi5taW5ZICsgZ3JpZFcvMiwgZ3opO1xuICAgIHRoaXMuc2NlbmUuYWRkKGdyaWRYWSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQ3JlYXRlIGFuZCByZXR1cm4gYSBUSFJFRS5SZW5kZXJlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdmFyaW91cyBvcHRpb25zXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR8alF1ZXJ5RWxlbX0gb3B0aW9ucy5kb20gYSBkb20gZWxlbWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLndpZHRoIHJlbmRlcmVyIHdpZHRoIChpbiBwaXhlbHMpXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuaGVpZ2h0IHJlbmRlcmVyIGhlaWdodCAoaW4gcGl4ZWxzKVxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlUmVuZGVyZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoeyBhbnRpYWxpYXM6IHRydWUsIGFscGhhOiB0cnVlLCBwcmVjaXNpb246IFwiaGlnaHBcIiB9KTtcbiAgICByZW5kZXJlci5zZXRDbGVhckNvbG9yKCAweDAwMDAwMCwgMCk7XG4gICAgcmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kb20pIHtcbiAgICAgICAgdmFyICRkb20gPSAkKG9wdGlvbnMuZG9tKTtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZSgkZG9tLndpZHRoKCksICRkb20uaGVpZ2h0KCkpO1xuICAgICAgICAkZG9tLmFwcGVuZChyZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy53aWR0aCAmJiBvcHRpb25zLmhlaWdodCkge1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKG9wdGlvbnMud2lkdGgsIG9wdGlvbnMuaGVpZ2h0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlbmRlcmVyO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHNjYXBlIHRpbWUgdG8gbWF0Y2ggdGhlIGN1cnJlbnQgdGltZSAodGFraW5nIGludG9cbiAqIGFjY291bnQgdGhlIHRpbWVSYXRpbyBldGMpLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVUaW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cuZ2V0VGltZSgpIC0gdGhpcy5maXJzdFJlbmRlcjtcbiAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSh0aGlzLmZpcnN0UmVuZGVyICsgKGVsYXBzZWQgKiB0aGlzLl9vcHRzLnRpbWVSYXRpbykpO1xuICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX29wdHMuZGF0ZVVwZGF0ZTtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBjYWxsYmFja0RhdGUgPSBuZXcgRGF0ZSh0aGlzLmRhdGUpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBjYWxsYmFja0RhdGUpO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlU3VuKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIHN1biB0byBzdWl0IHRoZSBzY2FwZSBjdXJyZW50IHRpbWUuXG4gKiBAcGFyYW0gIHtUSFJFRS5EaXJlY3Rpb25hbExpZ2h0fSBbc3VuXSB0aGUgc3VuIHRvIGFjdCBvbi4gIElmIG5vdFxuICogc3VwcGxpZWQsIHRoaXMgbWV0aG9kIHdpbGwgYWN0IG9uIHRoZSBsaWdodCBpbiB0aGlzIHNjZW5lJ3MgbGlnaHRcbiAqIGxpc3QgdGhhdCBpcyBjYWxsZWQgXCJzdW5cIi5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlU3VuID0gZnVuY3Rpb24oc3VuKSB7XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBpZiB0aGV5IGRpZG4ndCBwcm92aWRlIGEgc3VuLCB1c2Ugb3VyIG93blxuICAgICAgICBzdW4gPSB0aGlzLmxpZ2h0cy5zdW47XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBiYWlsIGlmIHRoZXJlJ3Mgbm8gc3VuIFdIQVQgRElEIFlPVSBETyBZT1UgTU9OU1RFUlxuICAgIH1cblxuICAgIHZhciBzdW5BbmdsZSA9ICh0aGlzLmRhdGUuZ2V0SG91cnMoKSo2MCArIHRoaXMuZGF0ZS5nZXRNaW51dGVzKCkpIC8gMTQ0MCAqIDIgKiBNYXRoLlBJO1xuICAgIHZhciBzdW5Sb3RhdGlvbkF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcblxuICAgIHN1bi5wb3NpdGlvblxuICAgICAgICAuc2V0KDAsIC0zICogdGhpcy5mLndZLCAtMjAgKiB0aGlzLmYud1opXG4gICAgICAgIC5hcHBseUF4aXNBbmdsZShzdW5Sb3RhdGlvbkF4aXMsIHN1bkFuZ2xlKVxuICAgICAgICAuYWRkKHRoaXMuZi5jZW50ZXIpO1xuXG4gICAgdmFyIHN1blogPSBzdW4ucG9zaXRpb24uejtcblxuICAgIC8vIHN3aXRjaCB0aGUgc3VuIG9mZiB3aGVuIGl0J3MgbmlnaHQgdGltZVxuICAgIGlmIChzdW4ub25seVNoYWRvdyA9PSBmYWxzZSAmJiBzdW5aIDw9IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChzdW4ub25seVNoYWRvdyA9PSB0cnVlICYmIHN1blogPiB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBmYWRlIG91dCB0aGUgc2hhZG93IGRhcmtuZXNzIHdoZW4gdGhlIHN1biBpcyBsb3dcbiAgICBpZiAoc3VuWiA+PSB0aGlzLmYuY2VudGVyLnogJiYgc3VuWiA8PSB0aGlzLmYubWF4Wikge1xuICAgICAgICB2YXIgdXBuZXNzID0gTWF0aC5tYXgoMCwgKHN1blogLSB0aGlzLmYuY2VudGVyLnopIC8gdGhpcy5mLndaICogMik7XG4gICAgICAgIHN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuNSAqIHVwbmVzcztcbiAgICAgICAgc3VuLmludGVuc2l0eSA9IHVwbmVzcztcbiAgICB9XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUxpZ2h0cyA9IGZ1bmN0aW9uKGxpZ2h0c1RvSW5jbHVkZSkge1xuXG4gICAgdmFyIGxpZ2h0cyA9IHt9O1xuICAgIHZhciBmID0gdGhpcy5mOyAgLy8gY29udmVuaWVudCByZWZlcmVuY2UgdG8gdGhlIGZpZWxkXG5cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ2FtYmllbnQnKSAhPSAtMSkge1xuICAgICAgICAvLyBhZGQgYW4gYW1iaWVudCBsaXN0XG4gICAgICAgIGxpZ2h0cy5hbWJpZW50ID0gbmV3IFRIUkVFLkFtYmllbnRMaWdodCgweDIyMjIzMyk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZigndG9wbGVmdCcpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5sZWZ0ID0gbmV3IFRIUkVFLlBvaW50TGlnaHQoMHhmZmZmZmYsIDEsIDApO1xuICAgICAgICAvLyBwb3NpdGlvbiBsaWdodCBvdmVyIHRoZSB2aWV3ZXIncyBsZWZ0IHNob3VsZGVyLi5cbiAgICAgICAgLy8gLSBMRUZUIG9mIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHggd2lkdGhcbiAgICAgICAgLy8gLSBCRUhJTkQgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeSB3aWR0aFxuICAgICAgICAvLyAtIEFCT1ZFIHRoZSBjYW1lcmEgYnkgdGhlIGZpZWxkJ3MgaGVpZ2h0XG4gICAgICAgIGxpZ2h0cy5sZWZ0LnBvc2l0aW9uLmFkZFZlY3RvcnMoXG4gICAgICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbixcbiAgICAgICAgICAgIG5ldyBUSFJFRS5WZWN0b3IzKC0wLjUgKiBmLndYLCAtMC41ICogZi53WSwgMSAqIGYud1opXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc3VuJykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnN1biA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmVlKTtcbiAgICAgICAgbGlnaHRzLnN1bi5pbnRlbnNpdHkgPSAxLjA7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlU3VuKGxpZ2h0cy5zdW4pO1xuXG4gICAgICAgIC8vIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7ICAvLyBERUJVR1xuXG4gICAgICAgIC8vIGRpcmVjdGlvbiBvZiBzdW5saWdodFxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnN1bi50YXJnZXQgPSB0YXJnZXQ7XG5cbiAgICAgICAgLy8gc3VuIGRpc3RhbmNlLCBsb2xcbiAgICAgICAgdmFyIHN1bkRpc3RhbmNlID0gbGlnaHRzLnN1bi5wb3NpdGlvbi5kaXN0YW5jZVRvKGxpZ2h0cy5zdW4udGFyZ2V0LnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbG9uZ2VzdCBkaWFnb25hbCBmcm9tIGZpZWxkLWNlbnRlclxuICAgICAgICB2YXIgbWF4RmllbGREaWFnb25hbCA9IGYuY2VudGVyLmRpc3RhbmNlVG8obmV3IFRIUkVFLlZlY3RvcjMoZi5taW5YLCBmLm1pblksIGYubWluWikpO1xuXG4gICAgICAgIC8vIHNoYWRvdyBzZXR0aW5nc1xuICAgICAgICBsaWdodHMuc3VuLmNhc3RTaGFkb3cgPSB0cnVlO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0RhcmtuZXNzID0gMC4zMztcblxuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYU5lYXIgPSBzdW5EaXN0YW5jZSAtIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhRmFyID0gc3VuRGlzdGFuY2UgKyBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVRvcCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhUmlnaHQgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUJvdHRvbSA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFMZWZ0ID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3NreScpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5za3kgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGVlZWVmZik7XG4gICAgICAgIGxpZ2h0cy5za3kuaW50ZW5zaXR5ID0gMC44O1xuXG4gICAgICAgIC8vIHNreSBpcyBkaXJlY3RseSBhYm92ZVxuICAgICAgICB2YXIgc2t5SGVpZ2h0ID0gNSAqIGYud1o7XG4gICAgICAgIGxpZ2h0cy5za3kucG9zaXRpb24uY29weSh0aGlzLmNhbWVyYS5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxpZ2h0cy5za3kucG9zaXRpb24uc2V0WihmLm1heFogKyBza3lIZWlnaHQpO1xuXG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc2t5LnRhcmdldCA9IHRhcmdldDtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBsaWdodCBpbiBsaWdodHMpIHtcbiAgICAgICAgaWYgKGxpZ2h0cy5oYXNPd25Qcm9wZXJ0eShsaWdodCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2NlbmUuYWRkKGxpZ2h0c1tsaWdodF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpZ2h0cztcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG4gICAgLy8gYWRkIGZvZ1xuICAgIC8vIHNjZW5lLmZvZyA9IG5ldyBUSFJFRS5Gb2coXG4gICAgLy8gICAgICcjZjBmOGZmJyxcbiAgICAvLyAgICAgdGhpcy5mLm1heFggLSB0aGlzLmYubWluWCxcbiAgICAvLyAgICAgdGhpcy5mLm1heFggLSB0aGlzLmYubWluWCAqIDNcbiAgICAvLyApO1xuICAgIHJldHVybiBzY2VuZTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNhbWVyYSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgIC8vIHZpZXdpbmcgYW5nbGVcbiAgICAvLyBpIHRoaW5rIHRoaXMgaXMgdGhlIHZlcnRpY2FsIHZpZXcgYW5nbGUuICBob3Jpem9udGFsIGFuZ2xlIGlzXG4gICAgLy8gZGVyaXZlZCBmcm9tIHRoaXMgYW5kIHRoZSBhc3BlY3QgcmF0aW8uXG4gICAgdmFyIHZpZXdBbmdsZSA9IDQ1O1xuICAgIHZpZXdBbmdsZSA9IChvcHRpb25zICYmIG9wdGlvbnMudmlld0FuZ2xlKSB8fCB2aWV3QW5nbGU7XG5cbiAgICAvLyBhc3BlY3RcbiAgICB2YXIgdmlld0FzcGVjdCA9IDE2Lzk7XG4gICAgaWYgKHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgdmlld0FzcGVjdCA9ICRlbGVtLndpZHRoKCkgLyAkZWxlbS5oZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvLyBuZWFyIGFuZCBmYXIgY2xpcHBpbmdcbiAgICB2YXIgbmVhckNsaXAgPSAwLjE7XG4gICAgdmFyIGZhckNsaXAgPSAxMDAwMDtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIG5lYXJDbGlwID0gTWF0aC5taW4odGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgLyAxMDAwO1xuICAgICAgICBmYXJDbGlwID0gTWF0aC5tYXgodGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgKiAxMDtcbiAgICB9XG5cbiAgICAvLyBjYW1lcmEgcG9zaXRpb24gYW5kIGxvb2tpbmcgZGlyZWN0aW9uXG4gICAgdmFyIGxvb2tIZXJlID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XG4gICAgdmFyIGNhbVBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xMCwgNSk7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBsb29rSGVyZSA9IHRoaXMuZi5jZW50ZXI7XG4gICAgICAgIGNhbVBvcyA9IGxvb2tIZXJlLmNsb25lKCkuYWRkKG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xLjEgKiB0aGlzLmYud1ksIDMgKiB0aGlzLmYud1opKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgdXAgY2FtZXJhXG4gICAgdmFyIGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSggdmlld0FuZ2xlLCB2aWV3QXNwZWN0LCBuZWFyQ2xpcCwgZmFyQ2xpcCk7XG4gICAgLy8gXCJ1cFwiIGlzIHBvc2l0aXZlIFpcbiAgICBjYW1lcmEudXAuc2V0KDAsMCwxKTtcbiAgICBjYW1lcmEucG9zaXRpb24uY29weShjYW1Qb3MpO1xuICAgIGNhbWVyYS5sb29rQXQobG9va0hlcmUpO1xuXG4gICAgLy8gYWRkIHRoZSBjYW1lcmEgdG8gdGhlIHNjZW5lXG4gICAgaWYgKHRoaXMuc2NlbmUpIHtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoY2FtZXJhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FtZXJhO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ29udHJvbHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBjZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCk7XG4gICAgaWYgKHRoaXMuZiAmJiB0aGlzLmYuY2VudGVyKSB7XG4gICAgICAgIGNlbnRlciA9IHRoaXMuZi5jZW50ZXIuY2xvbmUoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2FtZXJhICYmIHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciBjb250cm9scyA9IG5ldyBUSFJFRS5PcmJpdENvbnRyb2xzKHRoaXMuY2FtZXJhLCB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICBjb250cm9scy5jZW50ZXIgPSBjZW50ZXI7XG4gICAgICAgIHJldHVybiBjb250cm9scztcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAgICdzY2FwZSEnXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVNjZW5lO1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblxudmFyIExhbWJlcnQgPSBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsO1xudmFyIFBob25nID0gVEhSRUUuTWVzaFBob25nTWF0ZXJpYWw7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogU3R1ZmYgKHRoYXQgaXMsIFRIUkVFLk1hdGVyaWFsKSB0aGF0IHRoaW5ncyBpbiBzY2FwZXMgY2FuIGJlIG1hZGUgb3V0IG9mLlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgU2NhcGVTdHVmZiA9IHt9O1xuXG4vKiogZ2VuZXJpYyBzdHVmZiwgZm9yIGlmIG5vdGhpbmcgZWxzZSBpcyBzcGVjaWZpZWRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nZW5lcmljID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg5OTk5OTksXG4gICAgICAgICAgICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC41MCB9KTtcblxuLyoqIHdhdGVyIGlzIGJsdWUgYW5kIGEgYml0IHRyYW5zcGFyZW50XG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud2F0ZXIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDMzOTlmZixcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjc1IH0pO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RvbmUsIGRpcnQsIGFuZCBncm91bmQgbWF0ZXJpYWxzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIGRpcnQgZm9yIGdlbmVyYWwgdXNlXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZGlydCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4YTA1MjJkIH0pO1xuXG4vLyBOaW5lIGRpcnQgY29sb3VycyBmb3IgdmFyeWluZyBtb2lzdHVyZSBsZXZlbHMuICBTdGFydCBieSBkZWZpbmluZ1xuLy8gdGhlIGRyaWVzdCBhbmQgd2V0dGVzdCBjb2xvdXJzLCBhbmQgdXNlIC5sZXJwKCkgdG8gZ2V0IGEgbGluZWFyXG4vLyBpbnRlcnBvbGF0ZWQgY29sb3VyIGZvciBlYWNoIG9mIHRoZSBpbi1iZXR3ZWVuIGRpcnRzLlxudmFyIGRyeSA9IG5ldyBUSFJFRS5Db2xvcigweGJiODg1NSk7IC8vIGRyeVxudmFyIHdldCA9IG5ldyBUSFJFRS5Db2xvcigweDg4MjIwMCk7IC8vIG1vaXN0XG5cbi8qKiBkaXJ0IGF0IHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzOiBkaXJ0MCBpcyBkcnkgYW5kIGxpZ2h0IGluXG4gICogY29sb3VyLCBkaXJ0OSBpcyBtb2lzdCBhbmQgZGFyay5cbiAgKiBAbmFtZSBkaXJ0WzAtOV1cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5kaXJ0MCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeSB9KTtcblNjYXBlU3R1ZmYuZGlydDEgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDYgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDcgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDggPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgOC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDkgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiB3ZXQgfSk7XG5cbi8qKiBsZWFmIGxpdHRlciwgd2hpY2ggaW4gcmVhbGl0eSBpcyB1c3VhbGx5IGJyb3duaXNoLCBidXQgdGhpcyBoYXNcbiAgKiBhIGdyZWVuaXNoIHRvbmUgdG8gZGlzdGluZ3Vpc2ggaXQgZnJvbSBwbGFpbiBkaXJ0LlxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmxlYWZsaXR0ZXIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDY2NmIyZiB9KTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBmbG9yYSAtIHdvb2QsIGxlYXZlcywgZXRjXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIGdlbmVyaWMgYnJvd24gd29vZFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLndvb2QgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDc3NDQyMiB9KTtcblxuLyoqIGxpZ2h0IHdvb2QgZm9yIGd1bXRyZWVzIGV0Yy4gIE1heWJlIGl0J3MgYSBiaXQgdG9vIGxpZ2h0P1xuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmxpZ2h0d29vZCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4ZmZlZWNjIH0pO1xuXG4vKiogYSBnZW5lcmljIGdyZWVuaXNoIGxlYWYgbWF0ZXJpYWxcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5mb2xpYWdlID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg1NTg4MzMgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydChcbiAgeyBjb2xvcjogMHg1NTg4MzMsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjc1IH1cbik7XG5cbi8qKiBhIGZvbGlhZ2UgbWF0ZXJpYWwgZm9yIHVzZSBpbiBwb2ludCBjbG91ZCBvYmplY3RzXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYucG9pbnRGb2xpYWdlID0gbmV3IFRIUkVFLlBvaW50Q2xvdWRNYXRlcmlhbCh7IGNvbG9yOiAweDU1ODgzMywgc2l6ZTogMC41IH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGJ1aWx0IG1hdGVyaWFsc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBzaWx2ZXJ5IG1ldGFsXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubWV0YWwgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHhhYWJiZWUsIHNwZWN1bGFyOiAweGZmZmZmZiwgc2hpbmluZXNzOiAxMDAsIHJlZmxlY3Rpdml0eTogMC44IH0pO1xuXG4vKiogY29uY3JldGUgaW4gYSBzb3J0IG9mIG1pZC1ncmV5XG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuY29uY3JldGUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSB9KTtcblxuLyoqIHBsYXN0aWMsIGEgZ2VuZXJpYyB3aGl0aXNoIHBsYXN0aWMgd2l0aCBhIGJpdCBvZiBzaGluaW5lc3NcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5wbGFzdGljID0gbmV3IFBob25nKHsgY29sb3I6IDB4OTk5OTk5LCBlbWlzc2l2ZTogMHg5OTk5OTksIHNwZWN1bGFyOiAweGNjY2NjYyB9KTtcblxuLyoqIGdsYXNzIGlzIHNoaW55LCBmYWlybHkgdHJhbnNwYXJlbnQsIGFuZCBhIGxpdHRsZSBibHVpc2hcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nbGFzcyA9IG5ldyBQaG9uZyhcbiAgeyBjb2xvcjogMHg2NmFhZmYsIHNwZWN1bGFyOiAweGZmZmZmZiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNSB9XG4pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGdlbmVyYWwgY29sb3Vyc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBtYXR0IGJsYWNrLCBmb3IgYmxhY2sgc3VyZmFjZXMgKGFjdHVhbGx5IGl0J3MgIzExMTExMSlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5ibGFjayA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MTExMTExIH0pO1xuXG4vKiogZ2xvc3MgYmxhY2ssIGZvciBzaGlueSBibGFjayBwYWludGVkIHN1cmZhY2VzIChhY3R1YWxseSBpdCdzICMxMTExMTEpXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2xvc3NCbGFjayA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweDExMTExMSwgc3BlY3VsYXI6IDB4NjY2NjY2IH0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTdHVmZjtcblxuXG5cblxuIl19
