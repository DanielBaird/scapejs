(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// THREE = require('three');

// make an object out of the various bits
Scape = {
    BaseObject: require('./scape/baseobject'),
    Chunk:      require('./scape/chunk'),
    Field:      require('./scape/field'),
    Item:       require('./scape/item'),
    ItemTypes:  require('./scape/itemtypes'),
    Scene:      require('./scape/scene'),
    Stuff:      require('./scape/stuff')
}

// return the object if we're being browserified; otherwise attach
// it to the global window object.
if (typeof module !== 'undefined') {
    module.exports = Scape;
} else {
    window.Scape = Scape;
}

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/item":5,"./scape/itemtypes":6,"./scape/scene":15,"./scape/stuff":16}],2:[function(require,module,exports){

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

    this._scene = null;

    // housekeeping
    this._groundStacks = [];
    this._groundHeights = [];
    this._calcCenter();
    this._makeGrid();

    this.clickables = [];

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
    this._scene = scene;
    var minZ = this.minZ;
    this.eachBlock( function(err, b) {
        for (var itemIndex = 0; itemIndex < b.i.length; itemIndex++) {
            b.i[itemIndex].addToScene(scene);
        }
    });
}
// ------------------------------------------------------------------
// advise the scene, if we have one, that there are new items.
ScapeField.prototype.updateItems = function() {
    if (this._scene) {
        this._scene.refreshItems();
    }
}
// ------------------------------------------------------------------
// update an item.
ScapeField.prototype.updateItem = function(item, updates) {

    // remove old clickables
    item.eachClickPoint(function(cp) {
        var ci = this.clickables.indexOf(cp);
        if (ci != -1) {
            this.clickables.splice(ci, 1);
        }
    }, this);

    item.update(updates);
    // TODO: what if (x,y) position is updated?

    // add new clickables
    item.eachClickPoint(function(cp) {
        this.clickables.push(cp);
    }, this);
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
    this.updateItems();
}
// ------------------------------------------------------------------
ScapeField.prototype.removeAllItems = function() {
    this.eachBlock(function(err, block) {
        for (var index=0; index < block.i.length; index++) {
            block.i[index].dispose();
        }
        block.i = [];
    }, this);
    this.clickables = [];
}
// ------------------------------------------------------------------
ScapeField.prototype.addItem = function(item) {

    // add to the parent block
    var parentBlock = this.getBlock(item.x, item.y);
    parentBlock.i.push(item);

    item.eachClickPoint(function(cp) {
        this.clickables.push(cp);
    }, this);

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
        var itemInfo = itemList[s];
        this.addItem(new ScapeItem(itemInfo.type, itemInfo.x, itemInfo.y, itemInfo));
    }
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

},{"./baseobject":2,"./item":5,"./stuff":16}],5:[function(require,module,exports){
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
    // TODO: dispose of clickPoints
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
    crane:       require('./itemtypes/crane'),
    soilPit:     require('./itemtypes/soilpit')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/crane":11,"./itemtypes/cube":12,"./itemtypes/soilpit":13,"./itemtypes/tree":14}],7:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../../stuff');
var ScapeClickable = require('./clickable');

var M4 = THREE.Matrix4;

// ------------------------------------------------------------------
/** TODO: work out how to doc these addons
  * @param {object} parentParts the mesh and clickPoint collection
  *        that is the thing the camera is mounted on
  * @param {object} options the parent's options
  * @param {object} internals internal calculations make by the
  *        parent object factory
  */
function ScapeCameraAddon(parentParts, options, internals) {

	var i = internals || { meshNames: [] };

	// transforms we might need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// special convenience: if options.camera is a string,
	// use that string as the clickData and use defaults for
	// everything else.
	if (typeof options.camera === 'string') {
		options.camera = { clickData: options.camera };
	}

	var c = {};

	c.height = options.camera.height || 3;
	c.x = 0;
	c.y = 0;

	c.bodyWidth = options.camera.size || 2;
	c.bodyHeight = c.bodyWidth;
	c.bodyDepth = 0.67 * c.bodyWidth;

	c.lensLength = 0.33 * c.bodyWidth;
	c.lensRadius = Math.min(c.bodyWidth, c.bodyHeight) / 4;

	c.glassLength = c.lensRadius / 8;
	c.glassRadius = c.lensRadius - c.glassLength;

	c.bodyStuff = options.camera.body || ScapeStuff.metal;
	c.lensStuff = options.camera.lens || ScapeStuff.black;
	c.glassStuff = options.camera.glass || ScapeStuff.glass;

	c.clickData = options.camera.clickData || null;

	// the position of the camera relative to the parent object
	if (i.towerHeight && i.towerWidth && i.ringH) {
		// it's a crane, probably.  Position the camera below the
		// ring at the top of the crane tower.
		c.height = options.camera.height || (i.towerHeight - i.ringH - 2 * c.bodyHeight);
		c.x = (i.towerWidth + c.bodyDepth + c.lensLength)/2;
	}

	var relocate = new M4().makeTranslation(c.x, c.y, c.height);

	// the camera body
	var bodyGeom = new THREE.BoxGeometry(c.bodyDepth, c.bodyWidth, c.bodyHeight);
	bodyGeom.applyMatrix( new M4()
		.makeTranslation(-1 * (c.bodyDepth/2 - (c.bodyDepth - c.lensLength)/2), 0, c.bodyHeight/2)
		.multiply(relocate)
	);
	var body = new THREE.Mesh(bodyGeom, c.bodyStuff);
	i.meshNames.push(body);
	parentParts.meshes.push(body);

	// the lens
	var lensGeom = new THREE.CylinderGeometry(c.lensRadius, c.lensRadius, c.lensLength);
	lensGeom.applyMatrix( new M4()
		.makeTranslation(c.lensLength/2 + (c.bodyDepth - c.lensLength)/2, 0, c.bodyHeight/2)
		.multiply(relocate)
		.multiply(new M4().makeRotationZ(Math.PI/2))
	);
	var lens = new THREE.Mesh(lensGeom, c.lensStuff);
	i.meshNames.push(lens);
	parentParts.meshes.push(lens);

	// the glass lens bit
	var glassGeom = new THREE.CylinderGeometry(c.glassRadius, c.glassRadius, c.glassLength);
	glassGeom.applyMatrix( new M4()
		.makeTranslation(0.5 * (c.bodyDepth + c.lensLength + c.glassLength), 0, c.bodyHeight/2)
		.multiply(relocate)
		.multiply(new M4().makeRotationZ(Math.PI/2))
	);
	var glass = new THREE.Mesh(glassGeom, c.glassStuff);
	i.meshNames.push(glass);
	parentParts.meshes.push(glass);

	// the camera should be clickable
	if (c.clickData) {
		var camClick = ScapeClickable(c.clickData, c.x, c.y, c.height + c.bodyHeight/2);
		parentParts.clickPoints.push(camClick);
	}

	i.camera = c;

	return parentParts;
};
// ------------------------------------------------------------------
module.exports = ScapeCameraAddon;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":16,"./clickable":8}],8:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../../stuff');

// ------------------------------------------------------------------
/**
 * Returns a Clickable object.
 * @param {Object} options used to specify properties of the tree.
 * @param {number} options.diameter=1 Diameter of trunk (a.k.a. DBH)
 * @param {number} options.height=10 Height of tree
 * @param {THREE.Material} options.trunkMaterial=ScapeStuff.wood What to make the trunk out of
 * @param {THREE.Material} options.leafMaterial=ScapeStuff.foliage What to make the foliage out of
 *
 * @function
 * @name ScapeItems.tree
 */
function ScapeClickable(clickData, x, y, z) {
	var clicker = new THREE.Object3D();

	var hoverRadius = 12;
	var clickRadius = 2;
	var lineLength = 8;

	var translate = new THREE.Matrix4().makeTranslation(x, y, z);

	// var hoverMaterial = new THREE.Material();
	// hoverMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, transparent: true, opacity: 0.33 })
	hoverMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 })
	var hoverGeom = new THREE.SphereGeometry(hoverRadius, 32, 24);
	hoverGeom.applyMatrix(translate);
	var hoverBubble = new THREE.Mesh(hoverGeom, hoverMaterial);
	hoverBubble.visible = false;
	clicker.add(hoverBubble);

	var clickMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
	clickMaterial.depthTest = false;
	var clickGeom = new THREE.SphereGeometry(clickRadius, 32, 24);
	clickGeom.applyMatrix(translate);
	var clickBubble = new THREE.Mesh(clickGeom, clickMaterial);
	clickBubble.userData.clickData = clickData;
	clicker.add(clickBubble);

	////////// identifier flag
	var ident = new THREE.Object3D();

	// name text
	var nameGeom = new THREE.TextGeometry('clicktest', {
		font: 'helvetiker',
		size: clickRadius,
		height: 0.1
	});
	nameGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(-1 * clickRadius/2, 0, lineLength + clickRadius/2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);
	var name = new THREE.Mesh(nameGeom, ScapeStuff.uiWhite);
	ident.add(name);


	// pointer
	var lineGeom = new THREE.CylinderGeometry(0.1, 0.1, lineLength);
	lineGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, lineLength / 2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);

	var line = new THREE.Mesh(lineGeom, ScapeStuff.uiWhite);
	ident.add(line);

	ident.visible = false;
	clicker.add(ident);

	clicker.visible = false;
	return clicker;
}

module.exports = ScapeClickable;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":16}],9:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../../stuff');

var M4 = THREE.Matrix4;

var ScapeClickable = require('./clickable');
// ------------------------------------------------------------------
/** TODO: work out how to doc these addons
  * @param {object} treeParts the mesh and clickPoint collection that is a tree
  * @param {object} options the tree options
  * @param {object} internals internal calculations make by the tree-maker
  */
function ScapeDendrometerAddon(treeParts, options, internals) {

	// start with standard tree meshes
	var i = internals || { meshNames: [] };

	i.diam = i.diam || 1;

	// transforms we might need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	// special convenience: if options.dendrometer is a string,
	// use that string as the clickData and use defaults for
	// everything else.
	if (typeof options.dendrometer === 'string') {
		options.dendrometer = { clickData: options.dendrometer };
	}

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

	d.clickData = options.dendrometer.clickData || null;

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
	if (d.clickData) {
		var dendroClick = ScapeClickable(d.clickData, d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/6);
		treeParts.clickPoints.push(dendroClick);
	}

	i.dendrometer = d;

	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeDendrometerAddon;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":16,"./clickable":8}],10:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../../stuff');

var M4 = THREE.Matrix4;

var ScapeClickable = require('./clickable');
// ------------------------------------------------------------------
/** TODO: work out how to doc these addons
  * @param {object} treeParts the mesh and clickPoint collection that is a tree
  * @param {object} options the tree options
  * @param {object} internals internal calculations make by the tree-maker
  */
function ScapeSapFlowMeterAddon(treeParts, options, internals) {

	// start with standard tree meshes
	var i = internals || { meshNames: [] };

	i.diam = i.diam || 1;

	// special convenience: if options.sapflowmeter is a string,
	// use that string as the clickData and use defaults for
	// everything else.
	if (typeof options.sapflowmeter === 'string') {
		options.sapflowmeter = { clickData: options.sapflowmeter };
	}

	var s = {};

	s.baseW = options.sapflowmeter.size || 1;
	s.capW = s.baseW * 1.2;
	s.baseThick = s.baseW / 2;
	s.capThick = s.baseThick * 1.1;
	s.length = s.baseW * 2;
	s.baseL = s.length * 0.6;
	s.capL = (s.length - s.baseL) / 2;
	s.height = Math.min(options.sapflowmeter.height || 3, i.trunkHeight - s.length);

	s.baseStuff = options.sapflowmeter.base || ScapeStuff.metal;
	s.capStuff = options.sapflowmeter.cap || ScapeStuff.black;

	s.clickData = options.sapflowmeter.clickData || null;

	var baseGeom = new THREE.BoxGeometry(s.baseW, s.baseThick, s.baseL);
	baseGeom.applyMatrix(new M4()
		.makeTranslation(0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.baseL/2)
	);
	var base = new THREE.Mesh(baseGeom, s.baseStuff);
	i.meshNames.push('sapflowmeterbase');
	treeParts.meshes.push(base);

	var topCapGeom = new THREE.BoxGeometry(s.capW, s.capThick, s.capL);
	topCapGeom.applyMatrix(new M4()
		.makeTranslation(0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.baseL + s.capL/2)
	);
	var topCap = new THREE.Mesh(topCapGeom, s.capStuff);
	i.meshNames.push('sapflowmetertopcap');
	treeParts.meshes.push(topCap);

	var bottomCapGeom = new THREE.BoxGeometry(s.capW, s.capThick, s.capL);
	bottomCapGeom.applyMatrix(new M4()
		.makeTranslation(0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.capL/2)
	);
	var bottomCap = new THREE.Mesh(bottomCapGeom, s.capStuff);
	i.meshNames.push('sapflowmeterbottomcap');
	treeParts.meshes.push(bottomCap);

	// clickable
	if (s.clickData) {
		var click = ScapeClickable(s.clickData, 0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.baseL/2);
		treeParts.clickPoints.push(click);
	}

	i.sapflowmeter = s;

	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeSapFlowMeterAddon;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":16,"./clickable":8}],11:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');

var M4 = THREE.Matrix4;

var ScapeCameraAddon = require('./addons/camera');

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

	var crane = { meshes: [], clickPoints: [] };

	var i = { meshNames: [] };

	i.towerWidth = options.width || 2;
	i.height = options.height || 50;
	i.length = options.length || 40;
	i.counterweightLength = options.counterweightLength || (i.length / 4);
	i.strutStuff = options.struts || ScapeStuff.glossBlack;
	i.baseStuff = options.base || ScapeStuff.concrete;
	i.ringStuff = options.ring || ScapeStuff.plastic;
	i.cabinStuff = options.cabin || ScapeStuff.plastic;
	i.windowStuff = options.window || ScapeStuff.glass;
	i.counterweightStuff = options.counterweight || ScapeStuff.concrete;
	i.rotation = -1 * (options.rotation || 0) * Math.PI / 180;

	i.towerHeight = i.height;
	i.baseW = i.towerWidth * 3;
	i.baseH = i.towerWidth * 2; // half of the height will be "underground"

	i.poleR = i.towerWidth / 10;

	i.ringR = ((i.towerWidth / 2) * Math.SQRT2) + 1.3 * i.poleR;
	i.ringH = i.towerWidth / 5;

	i.boomL = i.length; // length of crane boom
	i.cwbL = i.counterweightLength; // length of counterweight boom
	i.rodL = i.boomL + i.cwbL;
	i.cwW = i.towerWidth - 3*i.poleR;
	i.cwH = i.towerWidth * 1.5;
	i.cwL = i.towerWidth * 1.5;

	i.cabinW = i.towerWidth;
	i.cabinH = i.towerWidth * 1.25;
	i.cabinL = i.cabinH;

	// this is for rotating the crane boom
	var rotate = new M4().makeRotationZ(i.rotation);

	// this is for making cylinders go upright (CylinderGeometry starts lying along the Y axis)
	var cylinderRotate = new M4().makeRotationX(Math.PI/2);

	////////// the base
	var baseGeom = new THREE.BoxGeometry(i.baseW, i.baseW, i.baseH);
	var base = new THREE.Mesh(baseGeom, i.baseStuff);
	i.meshNames.push('base');
	crane.meshes.push(base);

	////////// the vertical mast
	// make one pole to start with
	var poleGeom = new THREE.CylinderGeometry(i.poleR, i.poleR, i.towerHeight);
	poleGeom.applyMatrix(new M4().makeTranslation(i.towerWidth/2, i.towerWidth/2, i.towerHeight/2).multiply(cylinderRotate));

	// Make three more poles by copying the first pole and rotating another 90degs around the centre
	var pole;
	var rotateAroundZ = new M4().makeRotationZ(Math.PI/2);
	for (var p = 0; p < 4; p++) {
		pole = new THREE.Mesh(poleGeom, i.strutStuff);
		i.meshNames.push('pole' + p);
		crane.meshes.push(pole);
		poleGeom = poleGeom.clone();
		poleGeom.applyMatrix(rotateAroundZ);
	}


	////////// the ring at the top of the tower
	var ringGeom = new THREE.CylinderGeometry(i.ringR, i.ringR, i.ringH, 12, 1, true);
	ringGeom.applyMatrix(new M4().makeTranslation(0, 0, i.towerHeight - i.ringH/2).multiply(cylinderRotate));
	i.ringStuff.side = THREE.DoubleSide;
	i.meshNames.push('ring');
	crane.meshes.push(new THREE.Mesh(ringGeom, i.ringStuff));


	////////// the horizontal boom
	// make one rod to start with
	var topRodGeom = new THREE.CylinderGeometry(i.poleR, i.poleR, i.rodL);

	// top rod
	topRodGeom.applyMatrix(new M4().makeTranslation(0, (i.rodL/2) - i.cwbL, i.towerHeight + i.poleR + 0.5 * i.towerWidth));
	leftRodGeom = topRodGeom.clone();
	rightRodGeom = topRodGeom.clone();

	topRodGeom.applyMatrix(rotate);
	i.meshNames.push('rodTop');
	crane.meshes.push(new THREE.Mesh(topRodGeom, i.strutStuff));

	// bottom left rod
	leftRodGeom.applyMatrix(new M4().makeTranslation(-0.5 * i.towerWidth + i.poleR, 0, -0.5 * i.towerWidth));
	leftRodGeom.applyMatrix(rotate);
	i.meshNames.push('rodLeft');
	crane.meshes.push(new THREE.Mesh(leftRodGeom, i.strutStuff));

	// bottom right rod
	rightRodGeom.applyMatrix(new M4().makeTranslation(0.5 * i.towerWidth - i.poleR, 0, -0.5 * i.towerWidth));
	rightRodGeom.applyMatrix(rotate);
	i.meshNames.push('rodRight');
	crane.meshes.push(new THREE.Mesh(rightRodGeom, i.strutStuff));

	// end of the boom
	var endGeom = new THREE.BoxGeometry(i.towerWidth, i.poleR, 0.5 * i.towerWidth + i.poleR + i.poleR);
	endGeom.applyMatrix(new M4().makeTranslation(0, i.boomL, i.towerHeight + 0.25 * i.towerWidth + i.poleR));
	endGeom.applyMatrix(rotate);
	i.meshNames.push('boomCap');
	crane.meshes.push(new THREE.Mesh(endGeom, i.strutStuff));


	////////// counterweight
	var cwGeom = new THREE.BoxGeometry(i.cwW, i.cwL, i.cwH);
	cwGeom.applyMatrix(new M4().makeTranslation(0, 1.001 * (i.cwL/2 - i.cwbL), i.towerHeight));
	cwGeom.applyMatrix(rotate);
	i.meshNames.push('counterweight');
	crane.meshes.push(new THREE.Mesh(cwGeom, i.counterweightStuff));


	////////// cabin
	var cabinGeom = new THREE.BoxGeometry(i.cabinW, i.cabinL, i.cabinH);
	var windowGeom = new THREE.BoxGeometry(i.cabinW * 1.1, i.cabinL * 0.6, i.cabinH * 0.6);
	cabinGeom.applyMatrix(new M4().makeTranslation(i.cabinW/2 + i.poleR, 0, i.cabinH/2 + i.towerHeight + i.poleR + i.poleR));
	windowGeom.applyMatrix(new M4().makeTranslation(i.cabinW/2 + i.poleR, i.cabinL * 0.25, i.cabinH * 0.6 + i.towerHeight + i.poleR + i.poleR));
	cabinGeom.applyMatrix(rotate);
	windowGeom.applyMatrix(rotate);
	i.meshNames.push('cabin');
	crane.meshes.push(new THREE.Mesh(cabinGeom, i.cabinStuff));
	i.meshNames.push('cabinwindow');
	crane.meshes.push(new THREE.Mesh(windowGeom, i.windowStuff));

	////////// camera
	if (typeof options.camera !== 'undefined') {
		crane = ScapeCameraAddon(crane, options, i);
	}

	// return all the crane bits.
	return crane;
};
// ------------------------------------------------------------------
module.exports = ScapeCraneFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":16,"./addons/camera":7}],12:[function(require,module,exports){
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

},{"../stuff":16}],13:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');
var ScapeClickable = require('./addons/clickable');

// ------------------------------------------------------------------
/**
 * @function
 * @name ScapeItems.soilPit
 */
function ScapeSoilPitFactory(options, internals) {

	var pit = { meshes: [], clickPoints: [] };

	var i = internals || {};
	i.meshNames = i.meshNames || [];

	i.boxS = options.size || 2;
	i.boxD = i.boxS/2;
	i.boxH = i.boxS; // height off ground

	i.pipeR = i.boxD/3;
	i.pipeD = options.depth || 2; // pipe depth into ground
	i.pipeL = i.pipeD + i.boxH;
	i.pipeL = i.pipeL;

	i.boxStuff = options.box || ScapeStuff.plastic;
	i.pipeStuff = options.pipe || ScapeStuff.plastic;

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
		.multiply(rotate)
	);
	i.meshNames.push('pipe');
	pit.meshes.push(new THREE.Mesh(i.pipeG, i.pipeStuff));

	// make the pit clickable
	if (options.clickData) {
		var click = ScapeClickable(options.clickData, i.boxS/3, 0, i.boxH + i.boxS/2);
		pit.clickPoints.push(click);
	}

	return pit;
};
// ------------------------------------------------------------------
module.exports = ScapeSoilPitFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":16,"./addons/clickable":8}],14:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');

var ScapeDendrometerAddon = require('./addons/dendrometer');
var ScapeSapFlowMeterAddon = require('./addons/sapflowmeter');
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

	var tree = { meshes: [], clickPoints: [] };

	var i = internals || {};
	i.meshNames = i.meshNames || [];

	i.diam = options.diameter || 1;
	i.height = options.height || 10;
	i.trunkStuff = options.trunk || ScapeStuff.wood;
	i.canopyStuff = options.canopy || ScapeStuff.transparentFoliage;

	i.canopyHeight = i.height / 4;
	i.trunkHeight = i.height - i.canopyHeight;
	i.trunkRadius = 2 * i.diam / 2;
	i.canopyRadius = i.trunkRadius * 6;

	// transforms we need:
	// rotate so it's height is along the Z axis (CylinderGeometry starts lying along the Y axis)
	var rotate = new THREE.Matrix4().makeRotationX(Math.PI/2);

	i.trunkGeom = new THREE.CylinderGeometry(i.trunkRadius/2, i.trunkRadius, i.trunkHeight, 12);
	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var trunkPosition = new THREE.Matrix4().makeTranslation(0, 0, i.trunkHeight/2);
	i.trunkGeom.applyMatrix(trunkPosition.multiply(rotate));
	var trunk = new THREE.Mesh(i.trunkGeom, i.trunkStuff);
	i.meshNames.push('trunk');
	tree.meshes.push(trunk);

	i.canopyGeom = new THREE.CylinderGeometry(i.canopyRadius, i.canopyRadius, i.canopyHeight, 12);
	// center on x = 0, y = 0, but have the canopy at the top
	var canopyPosition = new THREE.Matrix4().makeTranslation(0, 0, i.canopyHeight/2 + i.height - i.canopyHeight);
	i.canopyGeom.applyMatrix(canopyPosition.multiply(rotate));
	var canopy = new THREE.Mesh(i.canopyGeom, i.canopyStuff);
	i.meshNames.push('canopy');
	tree.meshes.push(canopy);

	////////// dendro
	if (typeof options.dendrometer !== 'undefined') {
		tree = ScapeDendrometerAddon(tree, options, i);
	}

	////////// sap flow meter
	if (typeof options.sapflowmeter !== 'undefined') {
		tree = ScapeSapFlowMeterAddon(tree, options, i);
	}

	return tree;
};
// ------------------------------------------------------------------
module.exports = ScapeTreeFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":16,"./addons/dendrometer":9,"./addons/sapflowmeter":10}],15:[function(require,module,exports){
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

    // attach the mouse handlers..
    var bounds = this.element.getBoundingClientRect();

    // ..move handler
    this.element.onmousemove = function(event) {
        this.mouseHover(event.clientX - bounds.left, event.clientY - bounds.top);
    }.bind(this);

    // ..click handler
    this.element.onclick = function(event) {
        this.mouseClick(event.clientX - bounds.left, event.clientY - bounds.top);
    }.bind(this);

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
            lastLogAt = ts;
        }

        // DEBUG maybe the updateTime is disabled
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
 * tell this scene that it's field's items have updated
 */
ScapeScene.prototype.refreshItems = function() {
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
ScapeScene.prototype.mouseHover = function(mouseX, mouseY) {

    var raycaster = new THREE.Raycaster();
    mousePos = new THREE.Vector2();
    mousePos.x =   (mouseX / this.renderer.domElement.width)  * 2 - 1;
    mousePos.y = - (mouseY / this.renderer.domElement.height) * 2 + 1;

    // set all the clickables to hidden
    for (var c=0; c < this.f.clickables.length; c++) {
        this.f.clickables[c].visible = false;
        this.f.clickables[c].children[2].visible = false;
    }

    // now unhide just the ones in the mouse area
    raycaster.setFromCamera(mousePos, this.camera);
    var intersects = raycaster.intersectObjects(this.f.clickables, true);

    var clickable, taggedFirstClickable = false;
    for (var i=0; i < intersects.length; i++) {
        clickable = intersects[i].object.parent;
        if (!taggedFirstClickable && intersects[i].userData && intersect[i].userData.clickData) {
            intersects.parent.children[2].visible = true;
            taggedFirstClickable = true;
        }
        clickable.visible = true;
    }
}
// ------------------------------------------------------------------
ScapeScene.prototype.mouseClick = function(mouseX, mouseY) {

    var raycaster = new THREE.Raycaster();
    mousePos = new THREE.Vector2();
    mousePos.x =   (mouseX / this.renderer.domElement.width)  * 2 - 1;
    mousePos.y = - (mouseY / this.renderer.domElement.height) * 2 + 1;

    // find the intersecting clickables
    raycaster.setFromCamera(mousePos, this.camera);
    var intersects = raycaster.intersectObjects(this.f.clickables, true);

    var clicked;
    for (var i=0; i < intersects.length; i++) {
        // the first one with userData.clickData defined is the winner
        clicked = intersects[i].object;
        if (clicked.userData && clicked.userData.clickData) {
            // if there is a callback, invoke it
            if (this._opts.click) {
                var callback = this._opts.click;
                var data = clicked.userData.clickData;
                setTimeout( function(){ callback.call(window, data); }, 0 );
            }
            break;
        }
    }
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
    // renderer.shadowMapEnabled = true;
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
        camPos = lookHere.clone().add(new THREE.Vector3(0, -1.1 * this.f.wY, 2 * this.f.wZ));
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

},{"./baseobject":2,"./chunk":3,"./item":5,"./itemtypes":6,"./stuff":16}],16:[function(require,module,exports){
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
  { color: 0x558833, transparent: true, opacity: 0.9 }
);

/** a greenish leaf material that's mostly see-through
  * @memberof ScapeStuff */
ScapeStuff.transparentFoliage = new Lambert(
  { color: 0x558833, transparent: true, opacity: 0.33 }
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

/** matt white, for white surfaces (actually it's #eeeeee)
  * @memberOf ScapeStuff */
ScapeStuff.white = new Lambert({ color: 0xeeeeee });

/** gloss black, for shiny black painted surfaces (actually it's #111111)
  * @memberOf ScapeStuff */
ScapeStuff.glossBlack = new Phong({ color: 0x111111, specular: 0x666666 });

/////////////////////////////////////////////////////////////////////
// UI utility things
/////////////////////////////////////////////////////////////////////

/** hard white
  * @memberOf ScapeStuff */
ScapeStuff.uiWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
ScapeStuff.uiWhite.depthTest = false;



// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NhbWVyYS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NsaWNrYWJsZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2RlbmRyb21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9hZGRvbnMvc2FwZmxvd21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9jcmFuZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3ViZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvc29pbHBpdC5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvdHJlZS5qcyIsInNyYy9zY2FwZS9zY2VuZS5qcyIsInNyYy9zY2FwZS9zdHVmZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN6ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeGhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vIFRIUkVFID0gcmVxdWlyZSgndGhyZWUnKTtcblxuLy8gbWFrZSBhbiBvYmplY3Qgb3V0IG9mIHRoZSB2YXJpb3VzIGJpdHNcblNjYXBlID0ge1xuICAgIEJhc2VPYmplY3Q6IHJlcXVpcmUoJy4vc2NhcGUvYmFzZW9iamVjdCcpLFxuICAgIENodW5rOiAgICAgIHJlcXVpcmUoJy4vc2NhcGUvY2h1bmsnKSxcbiAgICBGaWVsZDogICAgICByZXF1aXJlKCcuL3NjYXBlL2ZpZWxkJyksXG4gICAgSXRlbTogICAgICAgcmVxdWlyZSgnLi9zY2FwZS9pdGVtJyksXG4gICAgSXRlbVR5cGVzOiAgcmVxdWlyZSgnLi9zY2FwZS9pdGVtdHlwZXMnKSxcbiAgICBTY2VuZTogICAgICByZXF1aXJlKCcuL3NjYXBlL3NjZW5lJyksXG4gICAgU3R1ZmY6ICAgICAgcmVxdWlyZSgnLi9zY2FwZS9zdHVmZicpXG59XG5cbi8vIHJldHVybiB0aGUgb2JqZWN0IGlmIHdlJ3JlIGJlaW5nIGJyb3dzZXJpZmllZDsgb3RoZXJ3aXNlIGF0dGFjaFxuLy8gaXQgdG8gdGhlIGdsb2JhbCB3aW5kb3cgb2JqZWN0LlxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTY2FwZTtcbn0gZWxzZSB7XG4gICAgd2luZG93LlNjYXBlID0gU2NhcGU7XG59XG4iLCJcbi8vXG4vLyB0aGlzIFwiYmFzZVwiIG9iamVjdCBoYXMgYSBmZXcgY29udmVuaWVuY2UgZnVuY3Rpb25zIGZvciBoYW5kbGluZ1xuLy8gb3B0aW9ucyBhbmQgd2hhdG5vdFxuLy9cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIFNjYXBlT2JqZWN0KG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gICAgdGhpcy5fb3B0cyA9IE9iamVjdC5jcmVhdGUoZGVmYXVsdHMpO1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZXJnZSBuZXcgb3B0aW9ucyBpbnRvIG91ciBvcHRpb25zXG5TY2FwZU9iamVjdC5wcm90b3R5cGUubWVyZ2VPcHRpb25zID0gZnVuY3Rpb24oZXh0cmFPcHRzKSB7XG4gICAgZm9yIChvcHQgaW4gZXh0cmFPcHRzKSB7XG4gICAgICAgIHRoaXMuX29wdHNbb3B0XSA9IGV4dHJhT3B0c1tvcHRdO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVPYmplY3Q7IiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWN0YW5ndWxhciBwcmlzbSBvZiBtYXRlcmlhbCB0aGF0IHRoZSBzb2xpZCBcImdyb3VuZFwiXG4gKiBwb3J0aW9uIG9mIGEgJ3NjYXBlIGlzIG1ha2UgdXAgb2YsIGUuZy4gZGlydCwgbGVhZiBsaXR0ZXIsIHdhdGVyLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIG1lc2ggYmFzZWQgb24gdGhlIGxpbmtlZFxuICogY2h1bmsgaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGNodW5rIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayAodmVydGljYWwgY29sdW1uIHdpdGhpbiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2FwZSkgdGhhdCBvd25zIHRoaXMgY2h1bmtcbiAqIEBwYXJhbSB7SW50ZWdlcn0gbGF5ZXJJbmRleCBJbmRleCBpbnRvIHBhcmVudEJsb2NrLmcgdGhpcyBjaHVuayBpcyBhdFxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblogbG93ZXN0IFogdmFsdWUgYW55IGNodW5rIHNob3VsZCBoYXZlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUNodW5rKHNjZW5lLCBwYXJlbnRCbG9jaywgbGF5ZXJJbmRleCwgbWluWiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9ibG9jayA9IHBhcmVudEJsb2NrO1xuICAgIHRoaXMuX2lzU3VyZmFjZSA9IChsYXllckluZGV4ID09IDApO1xuICAgIHRoaXMuX2xheWVyID0gcGFyZW50QmxvY2suZ1tsYXllckluZGV4XTtcbiAgICB0aGlzLl9taW5aID0gbWluWjtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuXG4gICAgLy8gVE9ETzogZmluaXNoIGhpbSEhXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVDaHVuay5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUNodW5rLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlQ2h1bms7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogSW52b2tlIGEgcmVidWlsZCBvZiB0aGlzIGNodW5rLlxuICpcbiAqIERpc2NhcmRzIGV4aXN0aW5nIGNhY2hlZCBtZXNoIGFuZCBidWlsZHMgYSBuZXcgbWVzaCBiYXNlZCBvbiB0aGVcbiAqIGN1cnJlbnRseSBsaW5rZWQgY2h1bmsgaW5mb3JtYXRpb24uXG4gKlxuICogQHJldHVybiBub25lXG4gKi9cblNjYXBlQ2h1bmsucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91cGRhdGVNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhlIGNodW5rIHdpbGwgYmUgYXMgZGVlcCBhcyB0aGUgbGF5ZXIgc2F5c1xuICAgIHZhciBkZXB0aCA9IHRoaXMuX2xheWVyLmR6O1xuICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgIC8vIC4udW5sZXNzIHRoYXQncyAwLCBpbiB3aGljaCBjYXNlIGdvIHRvIHRoZSBib3R0b21cbiAgICAgICAgZGVwdGggPSB0aGlzLl9sYXllci56IC0gdGhpcy5fbWluWjtcbiAgICB9XG4gICAgLy8gbWFrZSBhIGdlb21ldHJ5IGZvciB0aGUgY2h1bmtcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcbiAgICAgICAgdGhpcy5fYmxvY2suZHgsIHRoaXMuX2Jsb2NrLmR5LCBkZXB0aFxuICAgICk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCB0aGlzLl9sYXllci5tKTtcbiAgICBtZXNoLnBvc2l0aW9uLnNldChcbiAgICAgICAgdGhpcy5fYmxvY2sueCArIHRoaXMuX2Jsb2NrLmR4LzIsXG4gICAgICAgIHRoaXMuX2Jsb2NrLnkgKyB0aGlzLl9ibG9jay5keS8yLFxuICAgICAgICB0aGlzLl9sYXllci56IC0gZGVwdGgvMlxuICAgICk7XG4gICAgbWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAvLyBvbmx5IHRoZSBzdXJmYWNlIGNodW5rcyByZWNlaXZlIHNoYWRvd1xuICAgIGlmICh0aGlzLl9pc1N1cmZhY2UpIHtcbiAgICAgICAgbWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9hZGRNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUuYWRkKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fcmVtb3ZlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLnJlbW92ZSh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3VwZGF0ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVNZXNoKCk7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcbiAgICB0aGlzLl9hZGRNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDaHVuazsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbSA9IHJlcXVpcmUoJy4vaXRlbScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFRoZSBjb250YWluZXIgZm9yIGFsbCBpbmZvcm1hdGlvbiBhYm91dCBhbiBhcmVhLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucyBmb3IgdGhlIFNjYXBlRmllbGQgYmVpbmcgY3JlYXRlZC5cbiAqXG4gKiBvcHRpb24gfCBkZWZhdWx0IHZhbHVlIHwgZGVzY3JpcHRpb25cbiAqIC0tLS0tLS18LS0tLS0tLS0tLS0tLS06fC0tLS0tLS0tLS0tLVxuICogYG1pblhgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WGAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1hgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWCBheGlzIGludG9cbiAqIGBtaW5ZYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFlgICAgICB8ICAxMDAgfCBsYXJnZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NZYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFkgYXhpcyBpbnRvXG4gKiBgbWluWmAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFogKHZlcnRpY2FsIGRpbWVuc2lvbikgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhaYCAgICAgfCAgIDQwIHwgbGFyZ2VzdCBaIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWmAgIHwgICA4MCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBaIGF4aXMgaW50b1xuICogYGJsb2NrR2FwYCB8IDAuMDEgfCBnYXAgdG8gbGVhdmUgYmV0d2VlbiBibG9ja3MgYWxvbmcgdGhlIFggYW5kIFkgYXhlc1xuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUZpZWxkKG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgbWluWDogMCwgICAgICAgIG1heFg6IDEwMCwgICAgICAgICAgYmxvY2tzWDogMTAsXG4gICAgICAgIG1pblk6IDAsICAgICAgICBtYXhZOiAxMDAsICAgICAgICAgIGJsb2Nrc1k6IDEwLFxuICAgICAgICBtaW5aOiAwLCAgICAgICAgbWF4WjogNDAsICAgICAgICAgICBibG9ja3NaOiA4MCxcbiAgICAgICAgYmxvY2tHYXA6IDAuMDFcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gbWluIGFuZCBtYXggdmFsdWVzIGZvciB4IHkgYW5kIHpcbiAgICB0aGlzLm1pblggPSB0aGlzLl9vcHRzLm1pblg7XG4gICAgdGhpcy5taW5ZID0gdGhpcy5fb3B0cy5taW5ZO1xuICAgIHRoaXMubWluWiA9IHRoaXMuX29wdHMubWluWjtcblxuICAgIHRoaXMubWF4WCA9IHRoaXMuX29wdHMubWF4WDtcbiAgICB0aGlzLm1heFkgPSB0aGlzLl9vcHRzLm1heFk7XG4gICAgdGhpcy5tYXhaID0gdGhpcy5fb3B0cy5tYXhaO1xuXG4gICAgLy8gY29udmVuaWVudCBcIndpZHRoc1wiXG4gICAgdGhpcy53WCA9IHRoaXMubWF4WCAtIHRoaXMubWluWDtcbiAgICB0aGlzLndZID0gdGhpcy5tYXhZIC0gdGhpcy5taW5ZO1xuICAgIHRoaXMud1ogPSB0aGlzLm1heFogLSB0aGlzLm1pblo7XG5cbiAgICAvLyBob3cgbWFueSBibG9ja3MgYWNyb3NzIHggYW5kIHk/XG4gICAgdGhpcy5ibG9ja3NYID0gdGhpcy5fb3B0cy5ibG9ja3NYO1xuICAgIHRoaXMuYmxvY2tzWSA9IHRoaXMuX29wdHMuYmxvY2tzWTtcbiAgICB0aGlzLmJsb2Nrc1ogPSB0aGlzLl9vcHRzLmJsb2Nrc1o7XG5cbiAgICAvLyBob3cgd2lkZSBpcyBlYWNoIGJsb2NrXG4gICAgdGhpcy5fYlggPSB0aGlzLndYIC8gdGhpcy5ibG9ja3NYO1xuICAgIHRoaXMuX2JZID0gdGhpcy53WSAvIHRoaXMuYmxvY2tzWTtcbiAgICB0aGlzLl9iWiA9IHRoaXMud1ogLyB0aGlzLmJsb2Nrc1o7XG5cbiAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG5cbiAgICAvLyBob3VzZWtlZXBpbmdcbiAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgdGhpcy5fY2FsY0NlbnRlcigpO1xuICAgIHRoaXMuX21ha2VHcmlkKCk7XG5cbiAgICB0aGlzLmNsaWNrYWJsZXMgPSBbXTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUZpZWxkO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnKCcgKyB0aGlzLm1pblggKyAnLScgKyB0aGlzLm1heFggK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5ZICsgJy0nICsgdGhpcy5tYXhZICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWiArICctJyArIHRoaXMubWF4WiArXG4gICAgICAgICcpJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuX21ha2VHcmlkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZyA9IFtdO1xuICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLmJsb2Nrc1g7IGd4KyspIHtcbiAgICAgICAgdmFyIGNvbCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5ibG9ja3NZOyBneSsrKSB7XG4gICAgICAgICAgICB2YXIgeEdhcCA9IHRoaXMuX2JYICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgeUdhcCA9IHRoaXMuX2JZICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSB7XG4gICAgICAgICAgICAgICAgeDogdGhpcy5taW5YICsgKHRoaXMuX2JYICogZ3gpICsgeEdhcCxcbiAgICAgICAgICAgICAgICBkeDogdGhpcy5fYlggLSB4R2FwIC0geEdhcCxcbiAgICAgICAgICAgICAgICB5OiB0aGlzLm1pblkgKyAodGhpcy5fYlkgKiBneSkgKyB5R2FwLFxuICAgICAgICAgICAgICAgIGR5OiB0aGlzLl9iWSAtIHlHYXAgLSB5R2FwLFxuICAgICAgICAgICAgICAgIGc6IFt7XG4gICAgICAgICAgICAgICAgICAgIHo6IHRoaXMubWF4WixcbiAgICAgICAgICAgICAgICAgICAgZHo6IDAsIC8vIDAgbWVhbnMgXCJzdHJldGNoIHRvIG1pblpcIlxuICAgICAgICAgICAgICAgICAgICBtOiBTY2FwZVN0dWZmLmdlbmVyaWMsXG4gICAgICAgICAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgaTogW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbC5wdXNoKGJsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9nLnB1c2goY29sKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYnVpbGRzIGJsb2NrIG1lc2hlcyBmb3IgZGlzcGxheSBpbiB0aGUgcHJvdmlkZWQgc2NlbmUuICBUaGlzIGlzXG4gKiBnZW5lcmFsbHkgY2FsbGVkIGJ5IHRoZSBTY2FwZVNjZW5lIG9iamVjdCB3aGVuIHlvdSBnaXZlIGl0IGFcbiAqIFNjYXBlRmllbGQsIHNvIHlvdSB3b24ndCBuZWVkIHRvIGNhbGwgaXQgeW91cnNlbGYuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIHRoZSBTY2FwZVNjZW5lIHRoYXQgd2lsbCBiZSBkaXNwbGF5aW5nXG4gKiB0aGlzIFNjYXBlRmllbGQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmJ1aWxkQmxvY2tzID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB2YXIgbWluWiA9IHRoaXMubWluWjtcbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGxheWVySW5kZXggPSAwOyBsYXllckluZGV4IDwgYi5nLmxlbmd0aDsgbGF5ZXJJbmRleCsrKSB7XG4gICAgICAgICAgICBiLmdbbGF5ZXJJbmRleF0uY2h1bmsgPSBuZXcgU2NhcGVDaHVuayhcbiAgICAgICAgICAgICAgICBzY2VuZSwgYiwgbGF5ZXJJbmRleCwgbWluWlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGRvIHRoaXMgdG8gYWRqdXN0IGFsbCB0aGUgY2h1bmsgaGVpZ2h0c1xuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBidWlsZHMgaXRlbSBtZXNoZXMgZm9yIGRpc3BsYXkgaW4gdGhlIHByb3ZpZGVkIHNjZW5lLiAgVGhpcyBpc1xuICogZ2VuZXJhbGx5IGNhbGxlZCBieSB0aGUgU2NhcGVTY2VuZSBvYmplY3Qgd2hlbiB5b3UgZ2l2ZSBpdCBhXG4gKiBTY2FwZUZpZWxkLCBzbyB5b3Ugd29uJ3QgbmVlZCB0byBjYWxsIGl0IHlvdXJzZWxmLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSB0aGUgU2NhcGVTY2VuZSB0aGF0IHdpbGwgYmUgZGlzcGxheWluZ1xuICogdGhpcyBTY2FwZUZpZWxkLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5idWlsZEl0ZW1zID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaXRlbUluZGV4ID0gMDsgaXRlbUluZGV4IDwgYi5pLmxlbmd0aDsgaXRlbUluZGV4KyspIHtcbiAgICAgICAgICAgIGIuaVtpdGVtSW5kZXhdLmFkZFRvU2NlbmUoc2NlbmUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFkdmlzZSB0aGUgc2NlbmUsIGlmIHdlIGhhdmUgb25lLCB0aGF0IHRoZXJlIGFyZSBuZXcgaXRlbXMuXG5TY2FwZUZpZWxkLnByb3RvdHlwZS51cGRhdGVJdGVtcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zY2VuZSkge1xuICAgICAgICB0aGlzLl9zY2VuZS5yZWZyZXNoSXRlbXMoKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHVwZGF0ZSBhbiBpdGVtLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUudXBkYXRlSXRlbSA9IGZ1bmN0aW9uKGl0ZW0sIHVwZGF0ZXMpIHtcblxuICAgIC8vIHJlbW92ZSBvbGQgY2xpY2thYmxlc1xuICAgIGl0ZW0uZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgdmFyIGNpID0gdGhpcy5jbGlja2FibGVzLmluZGV4T2YoY3ApO1xuICAgICAgICBpZiAoY2kgIT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuY2xpY2thYmxlcy5zcGxpY2UoY2ksIDEpO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICBpdGVtLnVwZGF0ZSh1cGRhdGVzKTtcbiAgICAvLyBUT0RPOiB3aGF0IGlmICh4LHkpIHBvc2l0aW9uIGlzIHVwZGF0ZWQ/XG5cbiAgICAvLyBhZGQgbmV3IGNsaWNrYWJsZXNcbiAgICBpdGVtLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIHRoaXMuY2xpY2thYmxlcy5wdXNoKGNwKTtcbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUFsbEl0ZW1zKCk7XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBpdGVtTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgdGhlSXRlbSA9IGl0ZW1MaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEl0ZW0odGhlSXRlbSk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlSXRlbXMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVtb3ZlQWxsSXRlbXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVhY2hCbG9jayhmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIGZvciAodmFyIGluZGV4PTA7IGluZGV4IDwgYmxvY2suaS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIGJsb2NrLmlbaW5kZXhdLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBibG9jay5pID0gW107XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5jbGlja2FibGVzID0gW107XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW0gPSBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudCBibG9ja1xuICAgIHZhciBwYXJlbnRCbG9jayA9IHRoaXMuZ2V0QmxvY2soaXRlbS54LCBpdGVtLnkpO1xuICAgIHBhcmVudEJsb2NrLmkucHVzaChpdGVtKTtcblxuICAgIGl0ZW0uZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgdGhpcy5jbGlja2FibGVzLnB1c2goY3ApO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gc2V0IGl0ZW0gaGVpZ2h0IHRvIHRoZSBwYXJlbnQgYmxvY2sncyBncm91bmQgaGVpZ2h0XG4gICAgaXRlbS5zZXRIZWlnaHQocGFyZW50QmxvY2suZ1swXS56KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zT2ZUeXBlID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9pdGVtcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaXRlbUxpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIGl0ZW1JbmZvID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbShuZXcgU2NhcGVJdGVtKGl0ZW1JbmZvLnR5cGUsIGl0ZW1JbmZvLngsIGl0ZW1JbmZvLnksIGl0ZW1JbmZvKSk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgY2xhaW1zIG9mIHRoZSBncm91bmQgaGVpZ2h0IGF0IHZhcmlvdXMgcG9pbnRzLlxuICogVW5saWtlIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LCB0aGlzXG4gKiBtZXRob2Qgd2lsbCByZS1leHRyYXBvbGF0ZSBncm91bmQgaGVpZ2h0cyBhY3Jvc3MgdGhlIEZpZWxkIChzb1xuICogeW91IGRvbid0IG5lZWQgdG8gY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IHlvdXJzZWxmKS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBoZWlnaHRMaXN0IEEgbGlzdCBvZiBvYmplY3RzLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgemAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oaGVpZ2h0TGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGhlaWdodExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gaGVpZ2h0TGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRIZWlnaHQocHQueCwgcHQueSwgcHQueik7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBjbGFpbSB0aGF0IHRoZSBncm91bmQgaGVpZ2h0IGlzIGB6YCBhdCBwb2ludCBgeGAsYHlgLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gZXZlbnR1YWxseSBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30gYWZ0ZXIgc29cbiAqIGdyb3VuZCBoZWlnaHRzIGdldCBleHRyYXBvbGF0ZWQgYWNyb3NzIHRoZSBlbnRpcmUgRmllbGQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFkgY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgaGVpZ2h0IG9mIHRoZSBncm91bmQgYXQgcG9zaXRpb24gYHhgLGB5YFxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5wdXNoKHsgeDogeCwgeTogeSwgejogeiB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYWRkaXRpb25hbCBncm91bmQgc3RhY2tzIHRvIHRoZSBmaWVsZCdzIGdyb3VuZCBzdGFja3MuXG4gKiBUaGUgZ3JvdW5kTGlzdCBpcyBhbiBhcnJheSBvZiBkYXRhIG9iamVjdHMuICBFYWNoIG9iamVjdCBuZWVkcyB4LFxuICogeSBhbmQgeiBwcm9wZXJ0aWVzLCBhbmQgYSAnc3RhY2snIHByb3BlcnR5LCBlYWNoIG1hdGNoaW5nIHRoZVxuICogY29ycmVzcG9uZGluZyBhcmcgdG8gYWRkR3JvdW5kU3RhY2suXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHJlcGxhY2UgaWYgcmVwbGFjZSBpcyB0cnV0aHksIGRpc2NhcmQgZXhpc3RpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBncm91bmQgcG9pbnRzIGZpcnN0LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFja3MgPSBmdW5jdGlvbihncm91bmRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBncm91bmRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGdyb3VuZExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kU3RhY2socHQueCwgcHQueSwgcHQuc3RhY2spO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRTdGFja3MoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBncm91bmQgc3RhY2sgYXQgeCx5LCBzdGFydGluZyBhdCBoZWlnaHQgei5cbiAqIFRoZSBzdGFjayBpcyBhbiBhcnJheSBvZiB0d28tZWxlbWVudCBhcnJheXMgd2l0aCBhIE1hdGVyaWFsXG4gKiBhbmQgYSBkZXB0aCBudW1iZXIsIGxpa2UgdGhpczpcbiAqIFtcbiAqICAgICBbTWF0ZXJpYWwubGVhZkxpdHRlciwgMC4zXSxcbiAqICAgICBbTWF0ZXJpYWwuZGlydCwgMy41XSxcbiAqICAgICBbTWF0ZXJpYWwuc3RvbmUsIDRdXG4gKiBdXG4gKiBUaGF0IHB1dHMgYSBsZWFmbGl0dGVyIGxheWVyIDAuMyB1bml0cyBkZWVwIG9uIGEgMy41LXVuaXRcbiAqIGRlZXAgZGlydCBsYXllciwgd2hpY2ggaXMgb24gYSBzdG9uZSBsYXllci4gIElmIHRoZSBmaW5hbFxuICogbGF5ZXIncyBkZXB0aCBpcyB6ZXJvLCB0aGF0IGxheWVyIGlzIGFzc3VtZWQgdG8gZ28gYWxsIHRoZVxuICogd2F5IHRvIG1pblouXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBjYWxjR3JvdW5kKCkgYWZ0ZXIuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oeCwgeSwgc3RhY2spIHtcbiAgICAvLyBUT0RPOiBjaGVjayBmb3IgdmFsaWRpdHlcbiAgICB0aGlzLl9ncm91bmRTdGFja3MucHVzaCh7IHg6IHgsICB5OiB5LCAgc3RhY2s6IHN0YWNrIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBoZWlnaHQuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIGhlaWdodCBjbGFpbXMgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0uXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBmaW5kIGhlaWdodCBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgYWxsb3dpbmcgZWFjaFxuICAgICAgICAvLyBrbm93biBncm91bmQgaGVpZ2h0IHRvIFwidm90ZVwiIHVzaW5nIHRoZSBpbnZlcnNlIG9mXG4gICAgICAgIC8vIGl0J3Mgc3F1YXJlZCBkaXN0YW5jZSBmcm9tIHRoZSBjZW50cmUgb2YgdGhlIGJsb2NrLlxuICAgICAgICB2YXIgaCwgZHgsIGR5LCBkaXN0LCB2b3RlU2l6ZTtcbiAgICAgICAgdmFyIGJaID0gMDtcbiAgICAgICAgdmFyIHZvdGVzID0gMDtcbiAgICAgICAgZm9yICh2YXIgZ2g9MDsgZ2ggPCB0aGlzLl9ncm91bmRIZWlnaHRzLmxlbmd0aDsgZ2grKykge1xuICAgICAgICAgICAgaCA9IHRoaXMuX2dyb3VuZEhlaWdodHNbZ2hdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIGgueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBoLnk7XG4gICAgICAgICAgICBkaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICB2b3RlU2l6ZSA9IDEgLyBkaXN0O1xuICAgICAgICAgICAgYlogKz0gaC56ICogdm90ZVNpemU7XG4gICAgICAgICAgICB2b3RlcyArPSB2b3RlU2l6ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgZGl2aWRlIHRvIGZpbmQgdGhlIGF2ZXJhZ2VcbiAgICAgICAgYlogPSBiWiAvIHZvdGVzO1xuXG4gICAgICAgIC8vIGJsb2NrLWlzaCBoZWlnaHRzOiByb3VuZCB0byB0aGUgbmVhcmVzdCBfYlpcbiAgICAgICAgdmFyIGRpZmZaID0gYlogLSB0aGlzLm1pblo7XG4gICAgICAgIGJaID0gdGhpcy5taW5aICsgTWF0aC5yb3VuZChkaWZmWiAvIHRoaXMuX2JaKSAqIHRoaXMuX2JaO1xuXG4gICAgICAgIC8vIG9rYXkgbm93IHdlIGtub3cgYSBoZWlnaHQhICBzZXQgaXRcbiAgICAgICAgdGhpcy5zZXRCbG9ja0hlaWdodChibG9jaywgYlopO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIHN0YWNrcy4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgc3RhY2tzIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZFN0YWNrIGFkZEdyb3VuZFN0YWNrfS5cbiAqXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRTdGFja3MgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIG1ha2UgdGhlIHN0YWNrIGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBjb3B5aW5nIHRoZVxuICAgICAgICAvLyBuZWFyZXN0IGRlZmluZWQgc3RhY2suXG4gICAgICAgIHZhciBzLCBkeCwgZHksIHRoaXNEaXN0LCBiZXN0U3RhY2s7XG4gICAgICAgIHZhciBiZXN0RGlzdCA9IHRoaXMud1ggKyB0aGlzLndZICsgdGhpcy53WjtcbiAgICAgICAgYmVzdERpc3QgPSBiZXN0RGlzdCAqIGJlc3REaXN0O1xuICAgICAgICBmb3IgKHZhciBncz0wOyBncyA8IHRoaXMuX2dyb3VuZFN0YWNrcy5sZW5ndGg7IGdzKyspIHtcbiAgICAgICAgICAgIHMgPSB0aGlzLl9ncm91bmRTdGFja3NbZ3NdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIHMueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBzLnk7XG4gICAgICAgICAgICB0aGlzRGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgaWYgKHRoaXNEaXN0IDwgYmVzdERpc3QpIHtcbiAgICAgICAgICAgICAgICBiZXN0U3RhY2sgPSBzO1xuICAgICAgICAgICAgICAgIGJlc3REaXN0ID0gdGhpc0Rpc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBva2F5IHdlIGdvdCBhIHN0YWNrLlxuICAgICAgICB0aGlzLnNldEdyb3VuZFN0YWNrKGJsb2NrLCBiZXN0U3RhY2suc3RhY2spO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLl9jYWxjQ2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY2FsY3VsYXRlIHRoZSBjZW50cmUgb2YgdGhlIGZpZWxkIGFuZCByZWNvcmQgaXQgYXMgLmNlbnRlclxuICAgIHRoaXMuY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICh0aGlzLm1pblggKyB0aGlzLm1heFgpIC8gMixcbiAgICAgICAgKHRoaXMubWluWSArIHRoaXMubWF4WSkgLyAyLFxuICAgICAgICAodGhpcy5taW5aICsgdGhpcy5tYXhaKSAvIDJcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKGJsb2NrLCBzdGFjaykge1xuICAgIHZhciBsYXllckxldmVsID0gYmxvY2suZ1swXS56O1xuICAgIGZvciAodmFyIGxheWVyID0gMDsgbGF5ZXIgPCBzdGFjay5sZW5ndGg7IGxheWVyKyspIHtcbiAgICAgICAgYmxvY2suZ1tsYXllcl0gPSB7XG4gICAgICAgICAgICB6OiBsYXllckxldmVsLFxuICAgICAgICAgICAgZHo6IHN0YWNrW2xheWVyXVsxXSxcbiAgICAgICAgICAgIG06IHN0YWNrW2xheWVyXVswXSxcbiAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIGxheWVyTGV2ZWwgLT0gc3RhY2tbbGF5ZXJdWzFdO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5yZWJ1aWxkQ2h1bmtzID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgaWYgKGJsb2NrLmdbbF0uY2h1bmspIHtcbiAgICAgICAgICAgIGJsb2NrLmdbbF0uY2h1bmsucmVidWlsZCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRCbG9ja0hlaWdodCA9IGZ1bmN0aW9uKGJsb2NrLCB6KSB7XG4gICAgLy8gdG8gc2V0IHRoZSBibG9jayBncm91bmQgaGVpZ2h0LCB3ZSBuZWVkIHRvIGZpbmQgdGhlIGJsb2NrJ3NcbiAgICAvLyBjdXJyZW50IGdyb3VuZCBoZWlnaHQgKHRoZSB6IG9mIHRoZSB0b3AgbGF5ZXIpLCB3b3JrIG91dCBhXG4gICAgLy8gZGlmZiBiZXR3ZWVuIHRoYXQgYW5kIHRoZSBuZXcgaGVpZ2h0LCBhbmQgYWRkIHRoYXQgZGlmZiB0b1xuICAgIC8vIGFsbCB0aGUgbGF5ZXJzLlxuICAgIHZhciBkWiA9IHogLSBibG9jay5nWzBdLno7XG4gICAgdmFyIGRlcHRoO1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBibG9jay5nW2xdLnogKz0gZFo7XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmdldEJsb2NrID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIC8vIHJldHVybiB0aGUgYmxvY2sgdGhhdCBpbmNsdWRlcyAgeCx5XG4gICAgdmFyIGd4ID0gTWF0aC5mbG9vciggKHggLSB0aGlzLm1pblgpIC8gdGhpcy5fYlggKTtcbiAgICB2YXIgZ3kgPSBNYXRoLmZsb29yKCAoeSAtIHRoaXMubWluWSkgLyB0aGlzLl9iWSApO1xuICAgIHJldHVybiAodGhpcy5fZ1tneF1bZ3ldKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW52b2tlIHRoZSBjYWxsYmFjayBlYWNoIGJsb2NrIGluIHR1cm5cbi8vIGNhbGxiYWNrIHNob3VsZCBsb29rIGxpa2U6IGZ1bmN0aW9uKGVyciwgYmxvY2spIHsgLi4uIH1cbi8vIGlmIGVyciBpcyBudWxsIGV2ZXJ5dGhpbmcgaXMgZmluZS4gaWYgZXJyIGlzIG5vdCBudWxsLCB0aGVyZVxuLy8gd2FzIGFuIGVycm9yLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZWFjaEJsb2NrID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcsIG9yZGVyKSB7XG4gICAgaWYgKG9yZGVyID09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcmRlciA9ICd4dXAteXVwJztcbiAgICB9XG4gICAgaWYgKHRoaXNBcmcgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAob3JkZXIgPT0gJ3h1cC15dXAnKSB7XG4gICAgICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLl9nLmxlbmd0aDsgZ3grKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuX2dbMF0ubGVuZ3RoOyBneSsrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBudWxsLCB0aGlzLl9nW2d4XVtneV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVGaWVsZDtcblxuXG5cblxuIiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5cblxuLy8gREVCVUdcbnZhciBTY2FwZUl0ZW1zID0gcmVxdWlyZSgnLi9pdGVtdHlwZXMnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGl0ZW0gdGhhdCBtaWdodCBhcHBlYXIgaW4gYSBTY2FwZS5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBzZXQgb2YgbWVzaGVzIHVzaW5nXG4gKiB0aGUgbGlua2VkIGl0ZW0gdHlwZSwgYW5kIHBvc2l0aW9uIHRoZW0gYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWRcbiAqIHgseSBsb2NhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIFRoZSBTY2FwZVNjZW5lIHRoZSBpdGVtIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayB0aGF0IG93bnMgdGhpcyBpdGVtXG4gKiBAcGFyYW0ge1NjYXBlSXRlbVR5cGV9IGl0ZW1UeXBlIFR5cGUgb2YgdGhpcyBpdGVtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUl0ZW0oaXRlbVR5cGUsIHgsIHksIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIHRoaXMuX3R5cGUgPSBpdGVtVHlwZTtcbiAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuX3BvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIDApO1xuXG4gICAgaWYgKHR5cGVvZiB0aGlzLl9vcHRzLmNsaWNrSWQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRoaXMuY2xpY2tJZCA9IHRoaXMuX29wdHMuY2xpY2tJZDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBtYXliZSBoYXZlIGEgc2V0IG9mIG1lc2hlcyBmb3IgZWFjaCBzY2VuZSwgc28gYW4gaXRlbVxuICAgIC8vIGNhbiBiZSBpbiBtdWx0aXBsZSBzY2VuZXM/XG4gICAgdGhpcy5fY3JlYXRlTmV3KCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUl0ZW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVJdGVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlSXRlbTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fY3JlYXRlTmV3ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcyAmJiB0aGlzLl9tZXNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl9kaXNwb3NlT2ZNZXNoZXMoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX2NsaWNrUG9pbnRzICYmIHRoaXMuX2NsaWNrUG9pbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbiAgICB9XG5cbiAgICB2YXIgdGhpbmdzID0gdGhpcy5fdHlwZSh0aGlzLl9vcHRzKTtcblxuICAgIHRoaXMuX21lc2hlcyA9IHRoaW5ncy5tZXNoZXM7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fY2xpY2tQb2ludHMgPSB0aGluZ3MuY2xpY2tQb2ludHM7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBjcC5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlRnJvbVNjZW5lKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVkT3B0aW9ucykge1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKHVwZGF0ZWRPcHRpb25zKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbih6KSB7XG4gICAgdGhpcy5fcG9zLnNldFooeik7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgY3AucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmFkZFRvU2NlbmUgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBzY2VuZS5hZGQobSk7XG4gICAgfSk7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBzY2VuZS5hZGQoY3ApO1xuICAgIH0pO1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX2Rpc3Bvc2VPZk1lc2hlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBpZiAobS5nZW9tZXRyeSkgbS5nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgIG0uZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2Rpc3Bvc2UnfSk7XG4gICAgfSk7XG4gICAgLy8gVE9ETzogZGlzcG9zZSBvZiBjbGlja1BvaW50c1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl9kaXNwb3NlT2ZDbGlja1BvaW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgaWYgKGNwLmdlb21ldHJ5KSBjcC5nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgIGNwLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdkaXNwb3NlJ30pO1xuICAgIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLnJlbW92ZUZyb21TY2VuZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zY2VuZSkge1xuICAgICAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lLnJlbW92ZShtKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lLnJlbW92ZShjcCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSB0aGlzLl9zY2VuZTsgLy8gcmVtZW1iZXIgdGhpcyBiZWNhdXNlIHJlbW92ZUZyb21TY2VuZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aWxsIGRlbGV0ZSB0aGlzLl9zY2VuZVxuICAgIGlmICh0aGlzLl9zY2VuZSkgeyB0aGlzLnJlbW92ZUZyb21TY2VuZSgpOyB9XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcblxuICAgIHRoaXMuX2NyZWF0ZU5ldygpO1xuICAgIGlmIChzY2VuZSkgeyB0aGlzLmFkZFRvU2NlbmUoc2NlbmUpOyB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGRvIHNvbWV0aGluZyB0byBlYWNoIGNsaWNrUG9pbnRcblNjYXBlSXRlbS5wcm90b3R5cGUuZWFjaENsaWNrUG9pbnQgPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGlmICh0aGlzLl9jbGlja1BvaW50cykge1xuICAgICAgICBmb3IgKHZhciBjcCA9IDA7IGNwIDwgdGhpcy5fY2xpY2tQb2ludHMubGVuZ3RoOyBjcCsrKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMuX2NsaWNrUG9pbnRzW2NwXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGRvIHNvbWV0aGluZyB0byBlYWNoIG1lc2hcblNjYXBlSXRlbS5wcm90b3R5cGUuZWFjaE1lc2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGlmICh0aGlzLl9tZXNoZXMpIHtcbiAgICAgICAgZm9yICh2YXIgbSA9IDA7IG0gPCB0aGlzLl9tZXNoZXMubGVuZ3RoOyBtKyspIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5fbWVzaGVzW21dKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW07XG4iLCJcbi8qKlxuICogQSBiYWcgb2YgaXRlbSB0eXBlcyB0aGF0IHNjYXBlcyBjYW4gaGF2ZSBpbiB0aGVtLiAgQW4gaXRlbSB0eXBlXG4gKiBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgb3B0aW9ucyBkZXNjcmliaW5nIHRoZSBpdGVtLCBhbmQgcmV0dXJuc1xuICogYW4gYXJyYXkgb2YgbWVzaGVzIHRoYXQgYXJlIHRoZSBpdGVtIChhdCAwLDAsMCkuXG4gKlxuICogV2hlbiBhIFNjYXBlSXRlbSBpcyBpbnN0YW50aWF0ZWQgaXQgaW52b2tlcyB0aGUgYXBwcm9wcmlhdGUgaXRlbVxuICogdHlwZSB0byBnZXQgbWVzaGVzLCB0aGVuIHJlLXBvc2l0aW9ucyB0aGUgbWVzaGVzIGF0IHRoZVxuICogYXBwcm9wcmlhdGUgeCx5LHogbG9jYXRpb24uXG4gKlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgU2NhcGVJdGVtcyA9IHtcbiAgICAvLyBkb2N1bWVudGF0aW9uIGZvciBpdGVtcyBhcmUgaW4gdGhlIC4vaXRlbXR5cGVzLyogZmlsZXNcbiAgICBjdWJlOiAgICAgICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvY3ViZScpLFxuICAgIHRyZWU6ICAgICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy90cmVlJyksXG4gICAgY3JhbmU6ICAgICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL2NyYW5lJyksXG4gICAgc29pbFBpdDogICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL3NvaWxwaXQnKVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW1zO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcbnZhciBTY2FwZUNsaWNrYWJsZSA9IHJlcXVpcmUoJy4vY2xpY2thYmxlJyk7XG5cbnZhciBNNCA9IFRIUkVFLk1hdHJpeDQ7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFBhcnRzIHRoZSBtZXNoIGFuZCBjbGlja1BvaW50IGNvbGxlY3Rpb25cbiAgKiAgICAgICAgdGhhdCBpcyB0aGUgdGhpbmcgdGhlIGNhbWVyYSBpcyBtb3VudGVkIG9uXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHBhcmVudCdzIG9wdGlvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gaW50ZXJuYWxzIGludGVybmFsIGNhbGN1bGF0aW9ucyBtYWtlIGJ5IHRoZVxuICAqICAgICAgICBwYXJlbnQgb2JqZWN0IGZhY3RvcnlcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlQ2FtZXJhQWRkb24ocGFyZW50UGFydHMsIG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHsgbWVzaE5hbWVzOiBbXSB9O1xuXG5cdC8vIHRyYW5zZm9ybXMgd2UgbWlnaHQgbmVlZDpcblx0Ly8gcm90YXRlIHNvIGl0J3MgaGVpZ2h0IGlzIGFsb25nIHRoZSBaIGF4aXMgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLyBzcGVjaWFsIGNvbnZlbmllbmNlOiBpZiBvcHRpb25zLmNhbWVyYSBpcyBhIHN0cmluZyxcblx0Ly8gdXNlIHRoYXQgc3RyaW5nIGFzIHRoZSBjbGlja0RhdGEgYW5kIHVzZSBkZWZhdWx0cyBmb3Jcblx0Ly8gZXZlcnl0aGluZyBlbHNlLlxuXHRpZiAodHlwZW9mIG9wdGlvbnMuY2FtZXJhID09PSAnc3RyaW5nJykge1xuXHRcdG9wdGlvbnMuY2FtZXJhID0geyBjbGlja0RhdGE6IG9wdGlvbnMuY2FtZXJhIH07XG5cdH1cblxuXHR2YXIgYyA9IHt9O1xuXG5cdGMuaGVpZ2h0ID0gb3B0aW9ucy5jYW1lcmEuaGVpZ2h0IHx8IDM7XG5cdGMueCA9IDA7XG5cdGMueSA9IDA7XG5cblx0Yy5ib2R5V2lkdGggPSBvcHRpb25zLmNhbWVyYS5zaXplIHx8IDI7XG5cdGMuYm9keUhlaWdodCA9IGMuYm9keVdpZHRoO1xuXHRjLmJvZHlEZXB0aCA9IDAuNjcgKiBjLmJvZHlXaWR0aDtcblxuXHRjLmxlbnNMZW5ndGggPSAwLjMzICogYy5ib2R5V2lkdGg7XG5cdGMubGVuc1JhZGl1cyA9IE1hdGgubWluKGMuYm9keVdpZHRoLCBjLmJvZHlIZWlnaHQpIC8gNDtcblxuXHRjLmdsYXNzTGVuZ3RoID0gYy5sZW5zUmFkaXVzIC8gODtcblx0Yy5nbGFzc1JhZGl1cyA9IGMubGVuc1JhZGl1cyAtIGMuZ2xhc3NMZW5ndGg7XG5cblx0Yy5ib2R5U3R1ZmYgPSBvcHRpb25zLmNhbWVyYS5ib2R5IHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdGMubGVuc1N0dWZmID0gb3B0aW9ucy5jYW1lcmEubGVucyB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXHRjLmdsYXNzU3R1ZmYgPSBvcHRpb25zLmNhbWVyYS5nbGFzcyB8fCBTY2FwZVN0dWZmLmdsYXNzO1xuXG5cdGMuY2xpY2tEYXRhID0gb3B0aW9ucy5jYW1lcmEuY2xpY2tEYXRhIHx8IG51bGw7XG5cblx0Ly8gdGhlIHBvc2l0aW9uIG9mIHRoZSBjYW1lcmEgcmVsYXRpdmUgdG8gdGhlIHBhcmVudCBvYmplY3Rcblx0aWYgKGkudG93ZXJIZWlnaHQgJiYgaS50b3dlcldpZHRoICYmIGkucmluZ0gpIHtcblx0XHQvLyBpdCdzIGEgY3JhbmUsIHByb2JhYmx5LiAgUG9zaXRpb24gdGhlIGNhbWVyYSBiZWxvdyB0aGVcblx0XHQvLyByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIGNyYW5lIHRvd2VyLlxuXHRcdGMuaGVpZ2h0ID0gb3B0aW9ucy5jYW1lcmEuaGVpZ2h0IHx8IChpLnRvd2VySGVpZ2h0IC0gaS5yaW5nSCAtIDIgKiBjLmJvZHlIZWlnaHQpO1xuXHRcdGMueCA9IChpLnRvd2VyV2lkdGggKyBjLmJvZHlEZXB0aCArIGMubGVuc0xlbmd0aCkvMjtcblx0fVxuXG5cdHZhciByZWxvY2F0ZSA9IG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihjLngsIGMueSwgYy5oZWlnaHQpO1xuXG5cdC8vIHRoZSBjYW1lcmEgYm9keVxuXHR2YXIgYm9keUdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoYy5ib2R5RGVwdGgsIGMuYm9keVdpZHRoLCBjLmJvZHlIZWlnaHQpO1xuXHRib2R5R2VvbS5hcHBseU1hdHJpeCggbmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKC0xICogKGMuYm9keURlcHRoLzIgLSAoYy5ib2R5RGVwdGggLSBjLmxlbnNMZW5ndGgpLzIpLCAwLCBjLmJvZHlIZWlnaHQvMilcblx0XHQubXVsdGlwbHkocmVsb2NhdGUpXG5cdCk7XG5cdHZhciBib2R5ID0gbmV3IFRIUkVFLk1lc2goYm9keUdlb20sIGMuYm9keVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaChib2R5KTtcblx0cGFyZW50UGFydHMubWVzaGVzLnB1c2goYm9keSk7XG5cblx0Ly8gdGhlIGxlbnNcblx0dmFyIGxlbnNHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoYy5sZW5zUmFkaXVzLCBjLmxlbnNSYWRpdXMsIGMubGVuc0xlbmd0aCk7XG5cdGxlbnNHZW9tLmFwcGx5TWF0cml4KCBuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oYy5sZW5zTGVuZ3RoLzIgKyAoYy5ib2R5RGVwdGggLSBjLmxlbnNMZW5ndGgpLzIsIDAsIGMuYm9keUhlaWdodC8yKVxuXHRcdC5tdWx0aXBseShyZWxvY2F0ZSlcblx0XHQubXVsdGlwbHkobmV3IE00KCkubWFrZVJvdGF0aW9uWihNYXRoLlBJLzIpKVxuXHQpO1xuXHR2YXIgbGVucyA9IG5ldyBUSFJFRS5NZXNoKGxlbnNHZW9tLCBjLmxlbnNTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2gobGVucyk7XG5cdHBhcmVudFBhcnRzLm1lc2hlcy5wdXNoKGxlbnMpO1xuXG5cdC8vIHRoZSBnbGFzcyBsZW5zIGJpdFxuXHR2YXIgZ2xhc3NHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoYy5nbGFzc1JhZGl1cywgYy5nbGFzc1JhZGl1cywgYy5nbGFzc0xlbmd0aCk7XG5cdGdsYXNzR2VvbS5hcHBseU1hdHJpeCggbmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAuNSAqIChjLmJvZHlEZXB0aCArIGMubGVuc0xlbmd0aCArIGMuZ2xhc3NMZW5ndGgpLCAwLCBjLmJvZHlIZWlnaHQvMilcblx0XHQubXVsdGlwbHkocmVsb2NhdGUpXG5cdFx0Lm11bHRpcGx5KG5ldyBNNCgpLm1ha2VSb3RhdGlvblooTWF0aC5QSS8yKSlcblx0KTtcblx0dmFyIGdsYXNzID0gbmV3IFRIUkVFLk1lc2goZ2xhc3NHZW9tLCBjLmdsYXNzU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKGdsYXNzKTtcblx0cGFyZW50UGFydHMubWVzaGVzLnB1c2goZ2xhc3MpO1xuXG5cdC8vIHRoZSBjYW1lcmEgc2hvdWxkIGJlIGNsaWNrYWJsZVxuXHRpZiAoYy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2FtQ2xpY2sgPSBTY2FwZUNsaWNrYWJsZShjLmNsaWNrRGF0YSwgYy54LCBjLnksIGMuaGVpZ2h0ICsgYy5ib2R5SGVpZ2h0LzIpO1xuXHRcdHBhcmVudFBhcnRzLmNsaWNrUG9pbnRzLnB1c2goY2FtQ2xpY2spO1xuXHR9XG5cblx0aS5jYW1lcmEgPSBjO1xuXG5cdHJldHVybiBwYXJlbnRQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDYW1lcmFBZGRvbjtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uLy4uL3N0dWZmJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgQ2xpY2thYmxlIG9iamVjdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuZGlhbWV0ZXI9MSBEaWFtZXRlciBvZiB0cnVuayAoYS5rLmEuIERCSClcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmhlaWdodD0xMCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy50cnVua01hdGVyaWFsPVNjYXBlU3R1ZmYud29vZCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5sZWFmTWF0ZXJpYWw9U2NhcGVTdHVmZi5mb2xpYWdlIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMudHJlZVxuICovXG5mdW5jdGlvbiBTY2FwZUNsaWNrYWJsZShjbGlja0RhdGEsIHgsIHksIHopIHtcblx0dmFyIGNsaWNrZXIgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuXHR2YXIgaG92ZXJSYWRpdXMgPSAxMjtcblx0dmFyIGNsaWNrUmFkaXVzID0gMjtcblx0dmFyIGxpbmVMZW5ndGggPSA4O1xuXG5cdHZhciB0cmFuc2xhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbih4LCB5LCB6KTtcblxuXHQvLyB2YXIgaG92ZXJNYXRlcmlhbCA9IG5ldyBUSFJFRS5NYXRlcmlhbCgpO1xuXHQvLyBob3Zlck1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoeyBjb2xvcjogMHhmZmZmMDAsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjMzIH0pXG5cdGhvdmVyTWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBjb2xvcjogMHhmZmZmMDAsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjMgfSlcblx0dmFyIGhvdmVyR2VvbSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeShob3ZlclJhZGl1cywgMzIsIDI0KTtcblx0aG92ZXJHZW9tLmFwcGx5TWF0cml4KHRyYW5zbGF0ZSk7XG5cdHZhciBob3ZlckJ1YmJsZSA9IG5ldyBUSFJFRS5NZXNoKGhvdmVyR2VvbSwgaG92ZXJNYXRlcmlhbCk7XG5cdGhvdmVyQnViYmxlLnZpc2libGUgPSBmYWxzZTtcblx0Y2xpY2tlci5hZGQoaG92ZXJCdWJibGUpO1xuXG5cdHZhciBjbGlja01hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IDB4ZmZmZmZmLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC40IH0pXG5cdGNsaWNrTWF0ZXJpYWwuZGVwdGhUZXN0ID0gZmFsc2U7XG5cdHZhciBjbGlja0dlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoY2xpY2tSYWRpdXMsIDMyLCAyNCk7XG5cdGNsaWNrR2VvbS5hcHBseU1hdHJpeCh0cmFuc2xhdGUpO1xuXHR2YXIgY2xpY2tCdWJibGUgPSBuZXcgVEhSRUUuTWVzaChjbGlja0dlb20sIGNsaWNrTWF0ZXJpYWwpO1xuXHRjbGlja0J1YmJsZS51c2VyRGF0YS5jbGlja0RhdGEgPSBjbGlja0RhdGE7XG5cdGNsaWNrZXIuYWRkKGNsaWNrQnViYmxlKTtcblxuXHQvLy8vLy8vLy8vIGlkZW50aWZpZXIgZmxhZ1xuXHR2YXIgaWRlbnQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuXHQvLyBuYW1lIHRleHRcblx0dmFyIG5hbWVHZW9tID0gbmV3IFRIUkVFLlRleHRHZW9tZXRyeSgnY2xpY2t0ZXN0Jywge1xuXHRcdGZvbnQ6ICdoZWx2ZXRpa2VyJyxcblx0XHRzaXplOiBjbGlja1JhZGl1cyxcblx0XHRoZWlnaHQ6IDAuMVxuXHR9KTtcblx0bmFtZUdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKC0xICogY2xpY2tSYWRpdXMvMiwgMCwgbGluZUxlbmd0aCArIGNsaWNrUmFkaXVzLzIpXG5cdFx0Lm11bHRpcGx5KHRyYW5zbGF0ZSlcblx0XHQubXVsdGlwbHkobmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMikpXG5cdCk7XG5cdHZhciBuYW1lID0gbmV3IFRIUkVFLk1lc2gobmFtZUdlb20sIFNjYXBlU3R1ZmYudWlXaGl0ZSk7XG5cdGlkZW50LmFkZChuYW1lKTtcblxuXG5cdC8vIHBvaW50ZXJcblx0dmFyIGxpbmVHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoMC4xLCAwLjEsIGxpbmVMZW5ndGgpO1xuXHRsaW5lR2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgbGluZUxlbmd0aCAvIDIpXG5cdFx0Lm11bHRpcGx5KHRyYW5zbGF0ZSlcblx0XHQubXVsdGlwbHkobmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMikpXG5cdCk7XG5cblx0dmFyIGxpbmUgPSBuZXcgVEhSRUUuTWVzaChsaW5lR2VvbSwgU2NhcGVTdHVmZi51aVdoaXRlKTtcblx0aWRlbnQuYWRkKGxpbmUpO1xuXG5cdGlkZW50LnZpc2libGUgPSBmYWxzZTtcblx0Y2xpY2tlci5hZGQoaWRlbnQpO1xuXG5cdGNsaWNrZXIudmlzaWJsZSA9IGZhbHNlO1xuXHRyZXR1cm4gY2xpY2tlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUNsaWNrYWJsZTsiLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi8uLi9zdHVmZicpO1xuXG52YXIgTTQgPSBUSFJFRS5NYXRyaXg0O1xuXG52YXIgU2NhcGVDbGlja2FibGUgPSByZXF1aXJlKCcuL2NsaWNrYWJsZScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogVE9ETzogd29yayBvdXQgaG93IHRvIGRvYyB0aGVzZSBhZGRvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gdHJlZVBhcnRzIHRoZSBtZXNoIGFuZCBjbGlja1BvaW50IGNvbGxlY3Rpb24gdGhhdCBpcyBhIHRyZWVcbiAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB0aGUgdHJlZSBvcHRpb25zXG4gICogQHBhcmFtIHtvYmplY3R9IGludGVybmFscyBpbnRlcm5hbCBjYWxjdWxhdGlvbnMgbWFrZSBieSB0aGUgdHJlZS1tYWtlclxuICAqL1xuZnVuY3Rpb24gU2NhcGVEZW5kcm9tZXRlckFkZG9uKHRyZWVQYXJ0cywgb3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0Ly8gc3RhcnQgd2l0aCBzdGFuZGFyZCB0cmVlIG1lc2hlc1xuXHR2YXIgaSA9IGludGVybmFscyB8fCB7IG1lc2hOYW1lczogW10gfTtcblxuXHRpLmRpYW0gPSBpLmRpYW0gfHwgMTtcblxuXHQvLyB0cmFuc2Zvcm1zIHdlIG1pZ2h0IG5lZWQ6XG5cdC8vIHJvdGF0ZSBzbyBpdCdzIGhlaWdodCBpcyBhbG9uZyB0aGUgWiBheGlzIChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8gc3BlY2lhbCBjb252ZW5pZW5jZTogaWYgb3B0aW9ucy5kZW5kcm9tZXRlciBpcyBhIHN0cmluZyxcblx0Ly8gdXNlIHRoYXQgc3RyaW5nIGFzIHRoZSBjbGlja0RhdGEgYW5kIHVzZSBkZWZhdWx0cyBmb3Jcblx0Ly8gZXZlcnl0aGluZyBlbHNlLlxuXHRpZiAodHlwZW9mIG9wdGlvbnMuZGVuZHJvbWV0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5kZW5kcm9tZXRlciA9IHsgY2xpY2tEYXRhOiBvcHRpb25zLmRlbmRyb21ldGVyIH07XG5cdH1cblxuXHR2YXIgZCA9IHt9O1xuXG5cdGQuYmFuZFdpZHRoID0gb3B0aW9ucy5kZW5kcm9tZXRlci53aWR0aCB8fCAwLjU7XG5cdGQuYmFuZFJhZGl1cyA9IGkudHJ1bmtSYWRpdXMgKyAwLjIgKiBkLmJhbmRXaWR0aDtcblx0ZC5iYW5kSGVpZ2h0ID0gTWF0aC5taW4ob3B0aW9ucy5kZW5kcm9tZXRlci5oZWlnaHQgfHwgMS41LCBpLnRydW5rSGVpZ2h0IC0gZC5iYW5kV2lkdGgvMik7XG5cblx0ZC5tZXRlclJhZGl1cyA9IGQuYmFuZFdpZHRoO1xuXHRkLm1ldGVySGVpZ2h0ID0gZC5iYW5kV2lkdGggKiAzO1xuXG5cdGQubW91bnRSYWRpdXMgPSBkLm1ldGVyUmFkaXVzICogMS4xO1xuXHRkLm1vdW50V2lkdGggPSBkLm1ldGVySGVpZ2h0IC8gNDtcblxuXHRkLmJhbmRTdHVmZiA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIuYmFuZCB8fCBTY2FwZVN0dWZmLm1ldGFsO1xuXHRkLm1vdW50U3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLm1vdW50IHx8IFNjYXBlU3R1ZmYuYmxhY2s7XG5cdGQubWV0ZXJTdHVmZiA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIubWV0ZXIgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblxuXHRkLmNsaWNrRGF0YSA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIuY2xpY2tEYXRhIHx8IG51bGw7XG5cblx0Ly8gdGhlIHN0ZWVsIGJhbmRcblx0dmFyIGJhbmRHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5iYW5kUmFkaXVzLCBkLmJhbmRSYWRpdXMsIGQuYmFuZFdpZHRoLCAxMiwgMSk7XG5cdGJhbmRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBkLmJhbmRIZWlnaHQpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgYmFuZCA9IG5ldyBUSFJFRS5NZXNoKGJhbmRHZW9tLCBkLmJhbmRTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyQmFuZCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2goYmFuZCk7XG5cblx0Ly8gdGhlIG1ldGVyIGl0c2VsZlxuXHR2YXIgbWV0ZXJCb3R0b21HZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5tZXRlclJhZGl1cywgZC5tZXRlclJhZGl1cywgMC42NyAqIGQubWV0ZXJIZWlnaHQsIDcsIDEpO1xuXHRtZXRlckJvdHRvbUdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvNikubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBtZXRlckJvdHRvbSA9IG5ldyBUSFJFRS5NZXNoKG1ldGVyQm90dG9tR2VvbSwgZC5tZXRlclN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJCb3R0b20nKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1ldGVyQm90dG9tKTtcblxuXHR2YXIgbWV0ZXJUb3BHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5tZXRlclJhZGl1cy81LCBkLm1ldGVyUmFkaXVzLCAwLjMzICogZC5tZXRlckhlaWdodCwgNywgMSk7XG5cdG1ldGVyVG9wR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzICsgZC5tZXRlclJhZGl1cywgMCwgZC5iYW5kSGVpZ2h0ICsgZC5tZXRlckhlaWdodC8yICsgZC5tZXRlckhlaWdodC82KS5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIG1ldGVyVG9wID0gbmV3IFRIUkVFLk1lc2gobWV0ZXJUb3BHZW9tLCBkLm1ldGVyU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlclRvcCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2gobWV0ZXJUb3ApO1xuXG5cdC8vIHRoZSBtb3VudFxuXHR2YXIgbW91bnRCYW5kR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubW91bnRSYWRpdXMsIGQubW91bnRSYWRpdXMsIGQubW91bnRXaWR0aCwgNywgMSk7XG5cdG1vdW50QmFuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQuYmFuZFdpZHRoLzIgKyBkLm1vdW50V2lkdGgvMikubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBtb3VudEJhbmQgPSBuZXcgVEhSRUUuTWVzaChtb3VudEJhbmRHZW9tLCBkLm1vdW50U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlck1vdW50QmFuZCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2gobW91bnRCYW5kKTtcblxuXHR2YXIgbW91bnRHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGQubW91bnRSYWRpdXMsIGQubW91bnRSYWRpdXMvMiwgZC5tb3VudFdpZHRoKTtcblx0bW91bnRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQuYmFuZFdpZHRoLzIgKyBkLm1vdW50V2lkdGgvMikpO1xuXHR2YXIgbW91bnQgPSBuZXcgVEhSRUUuTWVzaChtb3VudEdlb20sIGQubW91bnRTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyTW91bnQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1vdW50KTtcblxuXHQvLyB0aGUgZGVuZHJvIHNob3VsZCBiZSBjbGlja2FibGVcblx0aWYgKGQuY2xpY2tEYXRhKSB7XG5cdFx0dmFyIGRlbmRyb0NsaWNrID0gU2NhcGVDbGlja2FibGUoZC5jbGlja0RhdGEsIGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvNik7XG5cdFx0dHJlZVBhcnRzLmNsaWNrUG9pbnRzLnB1c2goZGVuZHJvQ2xpY2spO1xuXHR9XG5cblx0aS5kZW5kcm9tZXRlciA9IGQ7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVEZW5kcm9tZXRlckFkZG9uO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHRyZWVQYXJ0cyB0aGUgbWVzaCBhbmQgY2xpY2tQb2ludCBjb2xsZWN0aW9uIHRoYXQgaXMgYSB0cmVlXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHRyZWUgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlIHRyZWUtbWFrZXJcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlU2FwRmxvd01ldGVyQWRkb24odHJlZVBhcnRzLCBvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHQvLyBzdGFydCB3aXRoIHN0YW5kYXJkIHRyZWUgbWVzaGVzXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHsgbWVzaE5hbWVzOiBbXSB9O1xuXG5cdGkuZGlhbSA9IGkuZGlhbSB8fCAxO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuc2FwZmxvd21ldGVyIGlzIGEgc3RyaW5nLFxuXHQvLyB1c2UgdGhhdCBzdHJpbmcgYXMgdGhlIGNsaWNrRGF0YSBhbmQgdXNlIGRlZmF1bHRzIGZvclxuXHQvLyBldmVyeXRoaW5nIGVsc2UuXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zYXBmbG93bWV0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5zYXBmbG93bWV0ZXIgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5zYXBmbG93bWV0ZXIgfTtcblx0fVxuXG5cdHZhciBzID0ge307XG5cblx0cy5iYXNlVyA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLnNpemUgfHwgMTtcblx0cy5jYXBXID0gcy5iYXNlVyAqIDEuMjtcblx0cy5iYXNlVGhpY2sgPSBzLmJhc2VXIC8gMjtcblx0cy5jYXBUaGljayA9IHMuYmFzZVRoaWNrICogMS4xO1xuXHRzLmxlbmd0aCA9IHMuYmFzZVcgKiAyO1xuXHRzLmJhc2VMID0gcy5sZW5ndGggKiAwLjY7XG5cdHMuY2FwTCA9IChzLmxlbmd0aCAtIHMuYmFzZUwpIC8gMjtcblx0cy5oZWlnaHQgPSBNYXRoLm1pbihvcHRpb25zLnNhcGZsb3dtZXRlci5oZWlnaHQgfHwgMywgaS50cnVua0hlaWdodCAtIHMubGVuZ3RoKTtcblxuXHRzLmJhc2VTdHVmZiA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLmJhc2UgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblx0cy5jYXBTdHVmZiA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLmNhcCB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXG5cdHMuY2xpY2tEYXRhID0gb3B0aW9ucy5zYXBmbG93bWV0ZXIuY2xpY2tEYXRhIHx8IG51bGw7XG5cblx0dmFyIGJhc2VHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHMuYmFzZVcsIHMuYmFzZVRoaWNrLCBzLmJhc2VMKTtcblx0YmFzZUdlb20uYXBwbHlNYXRyaXgobmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIC0xICogKGkudHJ1bmtSYWRpdXMgKyBzLmJhc2VUaGljay8yKSwgcy5oZWlnaHQgKyBzLmJhc2VMLzIpXG5cdCk7XG5cdHZhciBiYXNlID0gbmV3IFRIUkVFLk1lc2goYmFzZUdlb20sIHMuYmFzZVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnc2FwZmxvd21ldGVyYmFzZScpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2goYmFzZSk7XG5cblx0dmFyIHRvcENhcEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkocy5jYXBXLCBzLmNhcFRoaWNrLCBzLmNhcEwpO1xuXHR0b3BDYXBHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTCArIHMuY2FwTC8yKVxuXHQpO1xuXHR2YXIgdG9wQ2FwID0gbmV3IFRIUkVFLk1lc2godG9wQ2FwR2VvbSwgcy5jYXBTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3NhcGZsb3dtZXRlcnRvcGNhcCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2godG9wQ2FwKTtcblxuXHR2YXIgYm90dG9tQ2FwR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzLmNhcFcsIHMuY2FwVGhpY2ssIHMuY2FwTCk7XG5cdGJvdHRvbUNhcEdlb20uYXBwbHlNYXRyaXgobmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIC0xICogKGkudHJ1bmtSYWRpdXMgKyBzLmJhc2VUaGljay8yKSwgcy5oZWlnaHQgKyBzLmNhcEwvMilcblx0KTtcblx0dmFyIGJvdHRvbUNhcCA9IG5ldyBUSFJFRS5NZXNoKGJvdHRvbUNhcEdlb20sIHMuY2FwU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdzYXBmbG93bWV0ZXJib3R0b21jYXAnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJvdHRvbUNhcCk7XG5cblx0Ly8gY2xpY2thYmxlXG5cdGlmIChzLmNsaWNrRGF0YSkge1xuXHRcdHZhciBjbGljayA9IFNjYXBlQ2xpY2thYmxlKHMuY2xpY2tEYXRhLCAwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTC8yKTtcblx0XHR0cmVlUGFydHMuY2xpY2tQb2ludHMucHVzaChjbGljayk7XG5cdH1cblxuXHRpLnNhcGZsb3dtZXRlciA9IHM7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTYXBGbG93TWV0ZXJBZGRvbjtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbnZhciBNNCA9IFRIUkVFLk1hdHJpeDQ7XG5cbnZhciBTY2FwZUNhbWVyYUFkZG9uID0gcmVxdWlyZSgnLi9hZGRvbnMvY2FtZXJhJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgbWVzaCBhcnJheSBmb3IgYSB0b3dlciBjcmFuZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSBjcmFuZS5cblxuICogQHBhcmFtIHt3aWR0aH0gb3B0aW9ucy53aWR0aD0yIFdpZHRoIG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2hlaWdodH0gb3B0aW9ucy5oZWlnaHQ9NTAgSGVpZ2h0IG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2xlbmd0aH0gb3B0aW9ucy5sZW5ndGg9NDAgTGVuZ3RoIG9mIGNyYW5lIGJvb20sIGZyb20gdGhlXG4gKiAgICAgICAgY3JhbmUncyBjZW50cmUgYXhpcyB0byB0aGUgdGlwXG4gKiBAcGFyYW0ge3JvdGF0aW9ufSBvcHRpb25zLnJvdGF0aW9uPTAgRGVncmVlcyBvZiBib29tIHJvdGF0aW9uLFxuICogICAgICAgIGNvdW50ZWQgY2xvY2t3aXNlIGZyb20gdGhlICt2ZSBZIGRpcmVjdGlvbiAoYXdheSBmcm9tXG4gKiAgICAgICAgdGhlIGNhbWVyYSlcbiAqIEBwYXJhbSB7Y291bnRlcndlaWdodExlbmd0aH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0TGVuZ3RoPWxlbmd0aC80XG4gKiAgICAgICAgTGVuZ3RoIG9mIHRoZSBjb3VudGVyd2VpZ2h0IGJvb20sIGZyb20gdGhlIGNyYW5lJ3MgY2VudHJlXG4gKiAgICAgICAgYXhpcyB0byB0aGUgZW5kIG9mIHRoZSBjb3VudGVyd2VpZ2h0XG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnN0cnV0cz1TY2FwZVN0dWZmLmdsb3NzQmxhY2tcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIHN0cnV0cyBpbiB0aGUgdG93ZXIgYW5kIGJvb20gb3V0IG9mXG4gICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5iYXNlPVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGJhc2Ugb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnJpbmc9U2NhcGVTdHVmZi5wbGFzdGljXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jYWJpbj1TY2FwZVN0dWZmLnBsYXN0aWNcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNhYmluIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy53aW5kb3c9U2NhcGVTdHVmZi5nbGFzc1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY2FiaW4gd2luZG93IG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0PVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNvdW50ZXJ3ZWlnaHQgb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmNyYW5lXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3JhbmVGYWN0b3J5KG9wdGlvbnMpIHtcblxuXHR2YXIgY3JhbmUgPSB7IG1lc2hlczogW10sIGNsaWNrUG9pbnRzOiBbXSB9O1xuXG5cdHZhciBpID0geyBtZXNoTmFtZXM6IFtdIH07XG5cblx0aS50b3dlcldpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAyO1xuXHRpLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDUwO1xuXHRpLmxlbmd0aCA9IG9wdGlvbnMubGVuZ3RoIHx8IDQwO1xuXHRpLmNvdW50ZXJ3ZWlnaHRMZW5ndGggPSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHRMZW5ndGggfHwgKGkubGVuZ3RoIC8gNCk7XG5cdGkuc3RydXRTdHVmZiA9IG9wdGlvbnMuc3RydXRzIHx8IFNjYXBlU3R1ZmYuZ2xvc3NCbGFjaztcblx0aS5iYXNlU3R1ZmYgPSBvcHRpb25zLmJhc2UgfHwgU2NhcGVTdHVmZi5jb25jcmV0ZTtcblx0aS5yaW5nU3R1ZmYgPSBvcHRpb25zLnJpbmcgfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHRpLmNhYmluU3R1ZmYgPSBvcHRpb25zLmNhYmluIHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblx0aS53aW5kb3dTdHVmZiA9IG9wdGlvbnMud2luZG93IHx8IFNjYXBlU3R1ZmYuZ2xhc3M7XG5cdGkuY291bnRlcndlaWdodFN0dWZmID0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0IHx8IFNjYXBlU3R1ZmYuY29uY3JldGU7XG5cdGkucm90YXRpb24gPSAtMSAqIChvcHRpb25zLnJvdGF0aW9uIHx8IDApICogTWF0aC5QSSAvIDE4MDtcblxuXHRpLnRvd2VySGVpZ2h0ID0gaS5oZWlnaHQ7XG5cdGkuYmFzZVcgPSBpLnRvd2VyV2lkdGggKiAzO1xuXHRpLmJhc2VIID0gaS50b3dlcldpZHRoICogMjsgLy8gaGFsZiBvZiB0aGUgaGVpZ2h0IHdpbGwgYmUgXCJ1bmRlcmdyb3VuZFwiXG5cblx0aS5wb2xlUiA9IGkudG93ZXJXaWR0aCAvIDEwO1xuXG5cdGkucmluZ1IgPSAoKGkudG93ZXJXaWR0aCAvIDIpICogTWF0aC5TUVJUMikgKyAxLjMgKiBpLnBvbGVSO1xuXHRpLnJpbmdIID0gaS50b3dlcldpZHRoIC8gNTtcblxuXHRpLmJvb21MID0gaS5sZW5ndGg7IC8vIGxlbmd0aCBvZiBjcmFuZSBib29tXG5cdGkuY3diTCA9IGkuY291bnRlcndlaWdodExlbmd0aDsgLy8gbGVuZ3RoIG9mIGNvdW50ZXJ3ZWlnaHQgYm9vbVxuXHRpLnJvZEwgPSBpLmJvb21MICsgaS5jd2JMO1xuXHRpLmN3VyA9IGkudG93ZXJXaWR0aCAtIDMqaS5wb2xlUjtcblx0aS5jd0ggPSBpLnRvd2VyV2lkdGggKiAxLjU7XG5cdGkuY3dMID0gaS50b3dlcldpZHRoICogMS41O1xuXG5cdGkuY2FiaW5XID0gaS50b3dlcldpZHRoO1xuXHRpLmNhYmluSCA9IGkudG93ZXJXaWR0aCAqIDEuMjU7XG5cdGkuY2FiaW5MID0gaS5jYWJpbkg7XG5cblx0Ly8gdGhpcyBpcyBmb3Igcm90YXRpbmcgdGhlIGNyYW5lIGJvb21cblx0dmFyIHJvdGF0ZSA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblooaS5yb3RhdGlvbik7XG5cblx0Ly8gdGhpcyBpcyBmb3IgbWFraW5nIGN5bGluZGVycyBnbyB1cHJpZ2h0IChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgY3lsaW5kZXJSb3RhdGUgPSBuZXcgTTQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8vLy8vLy8vLyB0aGUgYmFzZVxuXHR2YXIgYmFzZUdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5iYXNlVywgaS5iYXNlVywgaS5iYXNlSCk7XG5cdHZhciBiYXNlID0gbmV3IFRIUkVFLk1lc2goYmFzZUdlb20sIGkuYmFzZVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnYmFzZScpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChiYXNlKTtcblxuXHQvLy8vLy8vLy8vIHRoZSB2ZXJ0aWNhbCBtYXN0XG5cdC8vIG1ha2Ugb25lIHBvbGUgdG8gc3RhcnQgd2l0aFxuXHR2YXIgcG9sZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBvbGVSLCBpLnBvbGVSLCBpLnRvd2VySGVpZ2h0KTtcblx0cG9sZUdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkudG93ZXJXaWR0aC8yLCBpLnRvd2VyV2lkdGgvMiwgaS50b3dlckhlaWdodC8yKS5tdWx0aXBseShjeWxpbmRlclJvdGF0ZSkpO1xuXG5cdC8vIE1ha2UgdGhyZWUgbW9yZSBwb2xlcyBieSBjb3B5aW5nIHRoZSBmaXJzdCBwb2xlIGFuZCByb3RhdGluZyBhbm90aGVyIDkwZGVncyBhcm91bmQgdGhlIGNlbnRyZVxuXHR2YXIgcG9sZTtcblx0dmFyIHJvdGF0ZUFyb3VuZFogPSBuZXcgTTQoKS5tYWtlUm90YXRpb25aKE1hdGguUEkvMik7XG5cdGZvciAodmFyIHAgPSAwOyBwIDwgNDsgcCsrKSB7XG5cdFx0cG9sZSA9IG5ldyBUSFJFRS5NZXNoKHBvbGVHZW9tLCBpLnN0cnV0U3R1ZmYpO1xuXHRcdGkubWVzaE5hbWVzLnB1c2goJ3BvbGUnICsgcCk7XG5cdFx0Y3JhbmUubWVzaGVzLnB1c2gocG9sZSk7XG5cdFx0cG9sZUdlb20gPSBwb2xlR2VvbS5jbG9uZSgpO1xuXHRcdHBvbGVHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZUFyb3VuZFopO1xuXHR9XG5cblxuXHQvLy8vLy8vLy8vIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyXG5cdHZhciByaW5nR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucmluZ1IsIGkucmluZ1IsIGkucmluZ0gsIDEyLCAxLCB0cnVlKTtcblx0cmluZ0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkudG93ZXJIZWlnaHQgLSBpLnJpbmdILzIpLm11bHRpcGx5KGN5bGluZGVyUm90YXRlKSk7XG5cdGkucmluZ1N0dWZmLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyaW5nJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKHJpbmdHZW9tLCBpLnJpbmdTdHVmZikpO1xuXG5cblx0Ly8vLy8vLy8vLyB0aGUgaG9yaXpvbnRhbCBib29tXG5cdC8vIG1ha2Ugb25lIHJvZCB0byBzdGFydCB3aXRoXG5cdHZhciB0b3BSb2RHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5wb2xlUiwgaS5wb2xlUiwgaS5yb2RMKTtcblxuXHQvLyB0b3Agcm9kXG5cdHRvcFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIChpLnJvZEwvMikgLSBpLmN3YkwsIGkudG93ZXJIZWlnaHQgKyBpLnBvbGVSICsgMC41ICogaS50b3dlcldpZHRoKSk7XG5cdGxlZnRSb2RHZW9tID0gdG9wUm9kR2VvbS5jbG9uZSgpO1xuXHRyaWdodFJvZEdlb20gPSB0b3BSb2RHZW9tLmNsb25lKCk7XG5cblx0dG9wUm9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RUb3AnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2godG9wUm9kR2VvbSwgaS5zdHJ1dFN0dWZmKSk7XG5cblx0Ly8gYm90dG9tIGxlZnQgcm9kXG5cdGxlZnRSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigtMC41ICogaS50b3dlcldpZHRoICsgaS5wb2xlUiwgMCwgLTAuNSAqIGkudG93ZXJXaWR0aCkpO1xuXHRsZWZ0Um9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RMZWZ0Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGxlZnRSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBib3R0b20gcmlnaHQgcm9kXG5cdHJpZ2h0Um9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMC41ICogaS50b3dlcldpZHRoIC0gaS5wb2xlUiwgMCwgLTAuNSAqIGkudG93ZXJXaWR0aCkpO1xuXHRyaWdodFJvZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgncm9kUmlnaHQnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gocmlnaHRSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBlbmQgb2YgdGhlIGJvb21cblx0dmFyIGVuZEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS50b3dlcldpZHRoLCBpLnBvbGVSLCAwLjUgKiBpLnRvd2VyV2lkdGggKyBpLnBvbGVSICsgaS5wb2xlUik7XG5cdGVuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIGkuYm9vbUwsIGkudG93ZXJIZWlnaHQgKyAwLjI1ICogaS50b3dlcldpZHRoICsgaS5wb2xlUikpO1xuXHRlbmRHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2Jvb21DYXAnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goZW5kR2VvbSwgaS5zdHJ1dFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNvdW50ZXJ3ZWlnaHRcblx0dmFyIGN3R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmN3VywgaS5jd0wsIGkuY3dIKTtcblx0Y3dHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAxLjAwMSAqIChpLmN3TC8yIC0gaS5jd2JMKSwgaS50b3dlckhlaWdodCkpO1xuXHRjd0dlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY291bnRlcndlaWdodCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChjd0dlb20sIGkuY291bnRlcndlaWdodFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNhYmluXG5cdHZhciBjYWJpbkdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5jYWJpblcsIGkuY2FiaW5MLCBpLmNhYmluSCk7XG5cdHZhciB3aW5kb3dHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGkuY2FiaW5XICogMS4xLCBpLmNhYmluTCAqIDAuNiwgaS5jYWJpbkggKiAwLjYpO1xuXHRjYWJpbkdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkuY2FiaW5XLzIgKyBpLnBvbGVSLCAwLCBpLmNhYmluSC8yICsgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyBpLnBvbGVSKSk7XG5cdHdpbmRvd0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkuY2FiaW5XLzIgKyBpLnBvbGVSLCBpLmNhYmluTCAqIDAuMjUsIGkuY2FiaW5IICogMC42ICsgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyBpLnBvbGVSKSk7XG5cdGNhYmluR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHR3aW5kb3dHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2NhYmluJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGNhYmluR2VvbSwgaS5jYWJpblN0dWZmKSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2NhYmlud2luZG93Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKHdpbmRvd0dlb20sIGkud2luZG93U3R1ZmYpKTtcblxuXHQvLy8vLy8vLy8vIGNhbWVyYVxuXHRpZiAodHlwZW9mIG9wdGlvbnMuY2FtZXJhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGNyYW5lID0gU2NhcGVDYW1lcmFBZGRvbihjcmFuZSwgb3B0aW9ucywgaSk7XG5cdH1cblxuXHQvLyByZXR1cm4gYWxsIHRoZSBjcmFuZSBiaXRzLlxuXHRyZXR1cm4gY3JhbmU7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3JhbmVGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgY3ViZSBtZXNoIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZSBhbmQgbWF0ZXJpYWwuXG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBUaGUgbGVuZ3RoIG9mIGEgc2lkZSBvZiB0aGUgY3ViZS4gIERlZmF1bHRzIHRvIDEuXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBtYXRlcmlhbCBXaGF0IHRoZSBtYWtlIHRoZSBjdWJlIG91dCBvZi4gIERlZmF1bHRzIHRvIGBTY2FwZS5TdHVmZi5nZW5lcmljYFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgTm90IHVzZWQuXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmN1YmVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDdWJlRmFjdG9yeShvcHRpb25zKSB7XG4gICAgLy8gY29uc3RydWN0IGEgbWVzaCBcInNpdHRpbmcgb25cIiB0aGUgcG9pbnQgMCwwLDBcblxuICAgIHNpemUgPSBvcHRpb25zLnNpemUgfHwgMTtcbiAgICBtYXRlcmlhbCA9IG9wdGlvbnMubWF0ZXJpYWwgfHwgU2NhcGVTdHVmZi5nZW5lcmljO1xuXG4gICAgLy8gbWFrZXMgYSBjdWJlIGNlbnRlcmVkIG9uIDAsMCwwXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoc2l6ZSwgc2l6ZSwgc2l6ZSk7XG5cbiAgICAvLyB0cmFuc2Zvcm0gaXQgdXAgYSBiaXQsIHNvIHdlJ3JlIGNlbnRlcmVkIG9uIHggPSAwIGFuZCB5ID0gMCwgYnV0IGhhdmUgdGhlIF9ib3R0b21fIGZhY2Ugc2l0dGluZyBvbiB6ID0gMC5cbiAgICBnZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBzaXplLzIpICk7XG5cbiAgICAvLyByZXR1cm4gaXQgaW4gYSBkYXRhIG9iamVjdFxuXHRyZXR1cm4geyBtZXNoZXM6IFtuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXRlcmlhbCldLCBjbGlja1BvaW50czogW10gfTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDdWJlRmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG52YXIgU2NhcGVDbGlja2FibGUgPSByZXF1aXJlKCcuL2FkZG9ucy9jbGlja2FibGUnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5zb2lsUGl0XG4gKi9cbmZ1bmN0aW9uIFNjYXBlU29pbFBpdEZhY3Rvcnkob3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIHBpdCA9IHsgbWVzaGVzOiBbXSwgY2xpY2tQb2ludHM6IFtdIH07XG5cblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwge307XG5cdGkubWVzaE5hbWVzID0gaS5tZXNoTmFtZXMgfHwgW107XG5cblx0aS5ib3hTID0gb3B0aW9ucy5zaXplIHx8IDI7XG5cdGkuYm94RCA9IGkuYm94Uy8yO1xuXHRpLmJveEggPSBpLmJveFM7IC8vIGhlaWdodCBvZmYgZ3JvdW5kXG5cblx0aS5waXBlUiA9IGkuYm94RC8zO1xuXHRpLnBpcGVEID0gb3B0aW9ucy5kZXB0aCB8fCAyOyAvLyBwaXBlIGRlcHRoIGludG8gZ3JvdW5kXG5cdGkucGlwZUwgPSBpLnBpcGVEICsgaS5ib3hIO1xuXHRpLnBpcGVMID0gaS5waXBlTDtcblxuXHRpLmJveFN0dWZmID0gb3B0aW9ucy5ib3ggfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHRpLnBpcGVTdHVmZiA9IG9wdGlvbnMucGlwZSB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cblx0Ly8gY3lsaW5kZXItdXByaWdodCByb3RhdGlvblxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8gdGhlIGJveFxuXHRpLmJveEcgPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5ib3hTLCBpLmJveEQsIGkuYm94Uyk7XG5cdGkuYm94Ry5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oaS5ib3hTLzMsIDAsIGkuYm94SCArIGkuYm94Uy8yKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdib3gnKTtcblx0cGl0Lm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGkuYm94RywgaS5ib3hTdHVmZikpO1xuXG5cdC8vIHRoZSBwaXBlXG5cdGkucGlwZUcgPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBpcGVSLCBpLnBpcGVSLCBpLnBpcGVMKTtcblx0aS5waXBlRy5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgKGkuYm94SCAtIGkucGlwZUQpLzIpXG5cdFx0Lm11bHRpcGx5KHJvdGF0ZSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgncGlwZScpO1xuXHRwaXQubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goaS5waXBlRywgaS5waXBlU3R1ZmYpKTtcblxuXHQvLyBtYWtlIHRoZSBwaXQgY2xpY2thYmxlXG5cdGlmIChvcHRpb25zLmNsaWNrRGF0YSkge1xuXHRcdHZhciBjbGljayA9IFNjYXBlQ2xpY2thYmxlKG9wdGlvbnMuY2xpY2tEYXRhLCBpLmJveFMvMywgMCwgaS5ib3hIICsgaS5ib3hTLzIpO1xuXHRcdHBpdC5jbGlja1BvaW50cy5wdXNoKGNsaWNrKTtcblx0fVxuXG5cdHJldHVybiBwaXQ7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU29pbFBpdEZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuXG52YXIgU2NhcGVEZW5kcm9tZXRlckFkZG9uID0gcmVxdWlyZSgnLi9hZGRvbnMvZGVuZHJvbWV0ZXInKTtcbnZhciBTY2FwZVNhcEZsb3dNZXRlckFkZG9uID0gcmVxdWlyZSgnLi9hZGRvbnMvc2FwZmxvd21ldGVyJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIHRyZWUgbWVzaCBvZiB0aGUgc3BlY2lmaWVkIHNpemUgYW5kIGNvbG9yLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdXNlZCB0byBzcGVjaWZ5IHByb3BlcnRpZXMgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5kaWFtZXRlcj0xIERpYW1ldGVyIG9mIHRydW5rIChhLmsuYS4gREJIKVxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuaGVpZ2h0PTEwIEhlaWdodCBvZiB0cmVlXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnRydW5rTWF0ZXJpYWw9U2NhcGVTdHVmZi53b29kIFdoYXQgdG8gbWFrZSB0aGUgdHJ1bmsgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmxlYWZNYXRlcmlhbD1TY2FwZVN0dWZmLmZvbGlhZ2UgV2hhdCB0byBtYWtlIHRoZSBmb2xpYWdlIG91dCBvZlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnRlcm5hbHMgSWYgc3VwcGxpZWQsIHRoaXMgZmFjdG9yeSB3aWxsIHNhdmUgc29tZVxuICogICAgICAgIGludGVyaW0gY2FsY3VsYXRlZCB2YWx1ZXMgaW50byB0aGlzIG9iamVjdC4gIEUuZy5cbiAqICAgICAgICB0aGUgaGVpZ2h0IG9mIHRoZSBjYW5vcHksIHRoZSBNYXRlcmlhbCB0aGUgdHJ1bmsgaXMgbWFkZSBvdXRcbiAqICAgICAgICBvZiwgZXRjLiAgVGhpcyBjYW4gaGVscCBhbm90aGVyIFNjYXBlSXRlbVR5cGUgZmFjdG9yeSB1c2VcbiAqICAgICAgICB0aGlzIGFzIGEgc3RhcnRpbmcgcG9pbnQuXG4gKiBAcGFyYW0ge0FycmF5fSBpbnRlcm5hbHMubWVzaE5hbWVzIEFuIGFycmF5IG9mIG1lc2ggbmFtZXMsIGluIHRoZVxuICogICAgICAgIHNhbWUgb3JkZXIgYXMgdGhlIG1lc2ggbGlzdCByZXR1cm5lZCBieSB0aGUgZnVuY3Rpb24uICBUaGlzXG4gKiAgICAgICAgYWxsb3dzIGRvd25zdHJlYW0gZmFjdG9yeSBmdW5jdGlvbnMgdG8gaWRlbnRpZnkgbWVzaGVzIGluXG4gKiAgICAgICAgb3JkZXIgdG8gYWx0ZXIgdGhlbS5cbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMudHJlZVxuICovXG5mdW5jdGlvbiBTY2FwZVRyZWVGYWN0b3J5KG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciB0cmVlID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLmRpYW0gPSBvcHRpb25zLmRpYW1ldGVyIHx8IDE7XG5cdGkuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMTA7XG5cdGkudHJ1bmtTdHVmZiA9IG9wdGlvbnMudHJ1bmsgfHwgU2NhcGVTdHVmZi53b29kO1xuXHRpLmNhbm9weVN0dWZmID0gb3B0aW9ucy5jYW5vcHkgfHwgU2NhcGVTdHVmZi50cmFuc3BhcmVudEZvbGlhZ2U7XG5cblx0aS5jYW5vcHlIZWlnaHQgPSBpLmhlaWdodCAvIDQ7XG5cdGkudHJ1bmtIZWlnaHQgPSBpLmhlaWdodCAtIGkuY2Fub3B5SGVpZ2h0O1xuXHRpLnRydW5rUmFkaXVzID0gMiAqIGkuZGlhbSAvIDI7XG5cdGkuY2Fub3B5UmFkaXVzID0gaS50cnVua1JhZGl1cyAqIDY7XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdGkudHJ1bmtHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS50cnVua1JhZGl1cy8yLCBpLnRydW5rUmFkaXVzLCBpLnRydW5rSGVpZ2h0LCAxMik7XG5cdC8vIGNlbnRlciBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDBcblx0dmFyIHRydW5rUG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBpLnRydW5rSGVpZ2h0LzIpO1xuXHRpLnRydW5rR2VvbS5hcHBseU1hdHJpeCh0cnVua1Bvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgdHJ1bmsgPSBuZXcgVEhSRUUuTWVzaChpLnRydW5rR2VvbSwgaS50cnVua1N0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgndHJ1bmsnKTtcblx0dHJlZS5tZXNoZXMucHVzaCh0cnVuayk7XG5cblx0aS5jYW5vcHlHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5jYW5vcHlSYWRpdXMsIGkuY2Fub3B5UmFkaXVzLCBpLmNhbm9weUhlaWdodCwgMTIpO1xuXHQvLyBjZW50ZXIgb24geCA9IDAsIHkgPSAwLCBidXQgaGF2ZSB0aGUgY2Fub3B5IGF0IHRoZSB0b3Bcblx0dmFyIGNhbm9weVBvc2l0aW9uID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS5jYW5vcHlIZWlnaHQvMiArIGkuaGVpZ2h0IC0gaS5jYW5vcHlIZWlnaHQpO1xuXHRpLmNhbm9weUdlb20uYXBwbHlNYXRyaXgoY2Fub3B5UG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBjYW5vcHkgPSBuZXcgVEhSRUUuTWVzaChpLmNhbm9weUdlb20sIGkuY2Fub3B5U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdjYW5vcHknKTtcblx0dHJlZS5tZXNoZXMucHVzaChjYW5vcHkpO1xuXG5cdC8vLy8vLy8vLy8gZGVuZHJvXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5kZW5kcm9tZXRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHR0cmVlID0gU2NhcGVEZW5kcm9tZXRlckFkZG9uKHRyZWUsIG9wdGlvbnMsIGkpO1xuXHR9XG5cblx0Ly8vLy8vLy8vLyBzYXAgZmxvdyBtZXRlclxuXHRpZiAodHlwZW9mIG9wdGlvbnMuc2FwZmxvd21ldGVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHRyZWUgPSBTY2FwZVNhcEZsb3dNZXRlckFkZG9uKHRyZWUsIG9wdGlvbnMsIGkpO1xuXHR9XG5cblx0cmV0dXJuIHRyZWU7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlVHJlZUZhY3Rvcnk7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVDaHVuayA9IHJlcXVpcmUoJy4vY2h1bmsnKTtcblxuXG4vLyBERUJVR1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAY2FsbGJhY2sgU2NhcGVTY2VuZX5kYXRlQ2hhbmdlXG4gKiBAcGFyYW0ge3N0cmluZ30gZXJyb3IgRGVzY3JpcHRpb24gb2YgZXJyb3IsIG90aGVyd2lzZSBudWxsXG4gKiBAcGFyYW0ge2RhdGV9IGRhdGUgRGF0ZSB0aGUgc2NhcGUgaXMgbm93IGRpc3BsYXlpbmdcbiAqL1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIG9mIGEgbGFuZHNjYXBlIC8gbW9vbnNjYXBlIC8gd2hhdGV2ZXJcbiAqIEBwYXJhbSB7U2NhcGVGaWVsZH0gZmllbGQgIHRoZSBmaWVsZCBiZWluZyByZW5kZXJlZFxuICogQHBhcmFtIHtzdHJpbmd9IGRvbSAgICAgICAgRE9NIGVsZW1lbnQgdGhlIHNjYXBlIHNob3VsZCBiZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWQgaW50by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICAgIGNvbGxlY3Rpb24gb2Ygb3B0aW9ucy4gIEFsbCBhcmUgb3B0aW9uYWwuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmxpZ2h0cz0nc3VuJywnc2t5JyAtIGFycmF5IG9mIHN0cmluZ3NcbiAqIG5hbWluZyBsaWdodHMgdG8gaW5jbHVkZSBpbiB0aGlzIHNjZW5lLiAgQ2hvb3NlIGZyb206XG4gKlxuICogc3RyaW5nICAgIHwgbGlnaHQgdHlwZVxuICogLS0tLS0tLS0tLXwtLS0tLS0tLS0tLVxuICogYHRvcGxlZnRgIHwgYSBsaWdodCBmcm9tIGFib3ZlIHRoZSBjYW1lcmEncyBsZWZ0IHNob3VsZGVyXG4gKiBgYW1iaWVudGAgfCBhIGRpbSBhbWJpZW50IGxpZ2h0XG4gKiBgc3VuYCAgICAgfCBhIGRpcmVjdGlvbmFsIGxpZ2h0IHRoYXQgb3JiaXRzIHRoZSBzY2VuZSBvbmNlIHBlciBkYXlcbiAqIGBza3lgICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBzaGluZXMgZnJvbSBhYm92ZSB0aGUgc2NlbmVcbiAqIEBwYXJhbSB7RGF0ZXxcIm5vd1wifSBvcHRpb25zLmN1cnJlbnREYXRlPSdub3cnIC0gVGhlIHRpbWUgYW5kIGRhdGVcbiAqIGluc2lkZSB0aGUgc2NhcGUuICBUaGUgc3RyaW5nIFwibm93XCIgbWVhbnMgc2V0IGN1cnJlbnREYXRlIHRvIHRoZVxuICogcHJlc2VudC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnRpbWVSYXRpbz0xIFRoZSByYXRlIHRpbWUgc2hvdWxkIHBhc3MgaW5cbiAqIHRoZSBzY2FwZSwgcmVsYXRpdmUgdG8gbm9ybWFsLiAgMC4xIG1lYW5zIHRlbiB0aW1lcyBzbG93ZXIuICA2MFxuICogbWVhbnMgb25lIG1pbnV0ZSByZWFsIHRpbWUgPSBvbmUgaG91ciBzY2FwZSB0aW1lLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfmRhdGVDaGFuZ2V9IG9wdGlvbnMuZGF0ZVVwZGF0ZSBjYWxsYmFjayBmb3JcbiAqIHdoZW4gdGhlIHNjZW5lIHRpbWUgY2hhbmdlcyAod2hpY2ggaXMgYSBsb3QpLlxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZVNjZW5lKGZpZWxkLCBkb20sIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgLy8gbGlnaHRzOiBbJ3RvcGxlZnQnLCAnYW1iaWVudCddLFxuICAgICAgICBsaWdodHM6IFsnc3VuJywgJ3NreSddLFxuICAgICAgICBjdXJyZW50RGF0ZTogJ25vdycsICAvLyBlaXRoZXIgc3RyaW5nICdub3cnIG9yIGEgRGF0ZSBvYmplY3RcbiAgICAgICAgdGltZVJhdGlvOiAxLFxuICAgICAgICBkYXRlVXBkYXRlOiBudWxsIC8vIGNhbGxiYWNrIHRvdXBkYXRlIHRoZSBkaXNwbGF5ZWQgZGF0ZS90aW1lXG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIHNhdmUgdGhlIGZpZWxkXG4gICAgdGhpcy5mID0gZmllbGQ7XG5cbiAgICAvLyBkaXNjb3ZlciBET00gY29udGFpbmVyXG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZG9tKTtcblxuICAgIC8vIGF0dGFjaCB0aGUgbW91c2UgaGFuZGxlcnMuLlxuICAgIHZhciBib3VuZHMgPSB0aGlzLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAvLyAuLm1vdmUgaGFuZGxlclxuICAgIHRoaXMuZWxlbWVudC5vbm1vdXNlbW92ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHRoaXMubW91c2VIb3ZlcihldmVudC5jbGllbnRYIC0gYm91bmRzLmxlZnQsIGV2ZW50LmNsaWVudFkgLSBib3VuZHMudG9wKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICAvLyAuLmNsaWNrIGhhbmRsZXJcbiAgICB0aGlzLmVsZW1lbnQub25jbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHRoaXMubW91c2VDbGljayhldmVudC5jbGllbnRYIC0gYm91bmRzLmxlZnQsIGV2ZW50LmNsaWVudFkgLSBib3VuZHMudG9wKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLmRhdGUgPSB0aGlzLl9vcHRzLmN1cnJlbnREYXRlO1xuICAgIGlmICh0aGlzLmRhdGUgPT09ICdub3cnKSB7XG4gICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgfVxuICAgIHRoaXMuc3RhcnREYXRlID0gdGhpcy5kYXRlO1xuICAgIHRoaXMuZmlyc3RSZW5kZXIgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIC8vIGNyZWF0ZSBhbmQgc2F2ZSBhbGwgdGhlIGJpdHMgd2UgbmVlZFxuICAgIHRoaXMucmVuZGVyZXIgPSB0aGlzLl9tYWtlUmVuZGVyZXIoeyBkb206IHRoaXMuZWxlbWVudCB9KTtcbiAgICB0aGlzLnNjZW5lID0gdGhpcy5fbWFrZVNjZW5lKCk7XG4gICAgdGhpcy5jYW1lcmEgPSB0aGlzLl9tYWtlQ2FtZXJhKCk7XG4gICAgdGhpcy5jb250cm9scyA9IHRoaXMuX21ha2VDb250cm9scygpO1xuICAgIHRoaXMubGlnaHRzID0gdGhpcy5fbWFrZUxpZ2h0cyh0aGlzLl9vcHRzLmxpZ2h0cyk7XG5cbiAgICB0aGlzLmNvbm5lY3RGaWVsZCgpO1xuXG4gICAgLy8gYWRkIGdyaWRzIGFuZCBoZWxwZXIgY3ViZXNcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoKTtcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoJ3RvcCcpO1xuICAgIC8vIHRoaXMuYWRkSGVscGVyU2hhcGVzKCk7XG5cbiAgICB2YXIgbGFzdExvZ0F0ID0gMDsgLy8gREVCVUdcbiAgICB2YXIgcmVuZGVyID0gKGZ1bmN0aW9uIHVuYm91bmRSZW5kZXIodHMpIHtcblxuICAgICAgICAvLyBERUJVR1xuICAgICAgICBpZiAobGFzdExvZ0F0ICsgMjAwMCA8IHRzKSB7XG4gICAgICAgICAgICBsYXN0TG9nQXQgPSB0cztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERFQlVHIG1heWJlIHRoZSB1cGRhdGVUaW1lIGlzIGRpc2FibGVkXG4gICAgICAgIHRoaXMuX3VwZGF0ZVRpbWUoKTtcblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHJlbmRlciApO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlciggdGhpcy5zY2VuZSwgdGhpcy5jYW1lcmEgKTtcbiAgICAgICAgdGhpcy5jb250cm9scy51cGRhdGUoKTtcbiAgICB9KS5iaW5kKHRoaXMpO1xuXG4gICAgcmVuZGVyKDApO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVTY2VuZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlU2NlbmU7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGEgbWVzaCB0byB0aGUgVEhSRUUuU2NlbmUgKGEgcGFzc3Rocm91Z2ggZm9yIFRIUkVFLlNjZW5lLmFkZClcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24odGhpbmcpIHtcbiAgICB0aGlzLnNjZW5lLmFkZCh0aGluZyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogcmVtb3ZlIGEgbWVzaCB0byB0aGUgVEhSRUUuU2NlbmUgKGEgcGFzc3Rocm91Z2ggZm9yIFRIUkVFLlNjZW5lLnJlbW92ZSlcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24odGhpbmcpIHtcbiAgICB0aGlzLnNjZW5lLnJlbW92ZSh0aGluZyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGJsb2NrcyBmcm9tIHRoZSBhdHRhY2hlZCBTY2FwZUZpZWxkIGludG8gdGhlIHNjZW5lLlxuICpcbiAqIFlvdSB3aWxsIHByb2JhYmx5IG9ubHkgbmVlZCB0byBjYWxsIHRoaXMgb25jZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuY29ubmVjdEZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mLmJ1aWxkQmxvY2tzKHRoaXMpO1xuICAgIHRoaXMuZi5idWlsZEl0ZW1zKHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHRlbGwgdGhpcyBzY2VuZSB0aGF0IGl0J3MgZmllbGQncyBpdGVtcyBoYXZlIHVwZGF0ZWRcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUucmVmcmVzaEl0ZW1zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mLmJ1aWxkSXRlbXModGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGhlbHBlciBjdWJlcyBhdCBzb21lIG9mIHRoZSBjb3JuZXJzIG9mIHlvdXIgc2NhcGUsIHNvIHlvdSBjYW5cbiAqIHNlZSB3aGVyZSB0aGV5IGFyZSBpbiBzcGFjZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG4gICAgdmFyIGYgPSB0aGlzLmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgoZi5taW5YICsgZi5tYXhYKSAvIDIsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWF4WSwgZi5taW5aLCBncmVlbik7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5taW5ZLCBmLm1heFosIGJsdWUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWF4WSwgZi5taW5aLCB3aGl0ZSk7XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUubW91c2VIb3ZlciA9IGZ1bmN0aW9uKG1vdXNlWCwgbW91c2VZKSB7XG5cbiAgICB2YXIgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuICAgIG1vdXNlUG9zID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICBtb3VzZVBvcy54ID0gICAobW91c2VYIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LndpZHRoKSAgKiAyIC0gMTtcbiAgICBtb3VzZVBvcy55ID0gLSAobW91c2VZIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LmhlaWdodCkgKiAyICsgMTtcblxuICAgIC8vIHNldCBhbGwgdGhlIGNsaWNrYWJsZXMgdG8gaGlkZGVuXG4gICAgZm9yICh2YXIgYz0wOyBjIDwgdGhpcy5mLmNsaWNrYWJsZXMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgdGhpcy5mLmNsaWNrYWJsZXNbY10udmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmYuY2xpY2thYmxlc1tjXS5jaGlsZHJlblsyXS52aXNpYmxlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gbm93IHVuaGlkZSBqdXN0IHRoZSBvbmVzIGluIHRoZSBtb3VzZSBhcmVhXG4gICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEobW91c2VQb3MsIHRoaXMuY2FtZXJhKTtcbiAgICB2YXIgaW50ZXJzZWN0cyA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHRoaXMuZi5jbGlja2FibGVzLCB0cnVlKTtcblxuICAgIHZhciBjbGlja2FibGUsIHRhZ2dlZEZpcnN0Q2xpY2thYmxlID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaT0wOyBpIDwgaW50ZXJzZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjbGlja2FibGUgPSBpbnRlcnNlY3RzW2ldLm9iamVjdC5wYXJlbnQ7XG4gICAgICAgIGlmICghdGFnZ2VkRmlyc3RDbGlja2FibGUgJiYgaW50ZXJzZWN0c1tpXS51c2VyRGF0YSAmJiBpbnRlcnNlY3RbaV0udXNlckRhdGEuY2xpY2tEYXRhKSB7XG4gICAgICAgICAgICBpbnRlcnNlY3RzLnBhcmVudC5jaGlsZHJlblsyXS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIHRhZ2dlZEZpcnN0Q2xpY2thYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjbGlja2FibGUudmlzaWJsZSA9IHRydWU7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5tb3VzZUNsaWNrID0gZnVuY3Rpb24obW91c2VYLCBtb3VzZVkpIHtcblxuICAgIHZhciByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG4gICAgbW91c2VQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIG1vdXNlUG9zLnggPSAgIChtb3VzZVggLyB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQud2lkdGgpICAqIDIgLSAxO1xuICAgIG1vdXNlUG9zLnkgPSAtIChtb3VzZVkgLyB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQuaGVpZ2h0KSAqIDIgKyAxO1xuXG4gICAgLy8gZmluZCB0aGUgaW50ZXJzZWN0aW5nIGNsaWNrYWJsZXNcbiAgICByYXljYXN0ZXIuc2V0RnJvbUNhbWVyYShtb3VzZVBvcywgdGhpcy5jYW1lcmEpO1xuICAgIHZhciBpbnRlcnNlY3RzID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHModGhpcy5mLmNsaWNrYWJsZXMsIHRydWUpO1xuXG4gICAgdmFyIGNsaWNrZWQ7XG4gICAgZm9yICh2YXIgaT0wOyBpIDwgaW50ZXJzZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyB0aGUgZmlyc3Qgb25lIHdpdGggdXNlckRhdGEuY2xpY2tEYXRhIGRlZmluZWQgaXMgdGhlIHdpbm5lclxuICAgICAgICBjbGlja2VkID0gaW50ZXJzZWN0c1tpXS5vYmplY3Q7XG4gICAgICAgIGlmIChjbGlja2VkLnVzZXJEYXRhICYmIGNsaWNrZWQudXNlckRhdGEuY2xpY2tEYXRhKSB7XG4gICAgICAgICAgICAvLyBpZiB0aGVyZSBpcyBhIGNhbGxiYWNrLCBpbnZva2UgaXRcbiAgICAgICAgICAgIGlmICh0aGlzLl9vcHRzLmNsaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5fb3B0cy5jbGljaztcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGNsaWNrZWQudXNlckRhdGEuY2xpY2tEYXRhO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoIGZ1bmN0aW9uKCl7IGNhbGxiYWNrLmNhbGwod2luZG93LCBkYXRhKTsgfSwgMCApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGEgY3ViZSBhdCBwb3NpdGlvbiBgeGAsIGB5YCwgYHpgIHRvIGNvbmZpcm0gd2hlcmUgdGhhdCBpcyxcbiAqIGV4YWN0bHkuICBHcmVhdCBmb3IgdHJ5aW5nIHRvIHdvcmsgb3V0IGlmIHlvdXIgc2NhcGUgaXMgYmVpbmdcbiAqIHJlbmRlcmVkIHdoZXJlIHlvdSB0aGluayBpdCBzaG91bGQgYmUgcmVuZGVyZWQuXG4gKlxuICogQHBhcmFtIHsoTnVtYmVyfFZlY3RvcjMpfSB4IFggY29vcmRpbmF0ZSwgb3IgYSB7QGxpbmsgaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9NYXRoL1ZlY3RvcjMgVEhSRUUuVmVjdG9yM30gY29udGFpbmluZyB4LCB5IGFuZCB6IGNvb3Jkc1xuICogQHBhcmFtIHtOdW1iZXJ9IFt5XSBZIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBbel0gWiBjb29yZGluYXRlXG4gKiBAcGFyYW0ge0NvbG9yfFN0cmluZ3xJbnRlZ2VyfSBjb2xvcj0nI2NjY2NjYycgQ29sb3Igb2YgY3ViZS5cbiAqIENhbiBiZSBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvQ29sb3IgVEhSRUUuQ29sb3J9LCBhIGNvbG9yLXBhcnNlYWJsZSBzdHJpbmcgbGlrZVxuICogYCcjMzM2NmNjJ2AsIG9yIGEgbnVtYmVyIGxpa2UgYDB4MzM2NmNjYC5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyQ3ViZSA9IGZ1bmN0aW9uKHgsIHksIHosIGNvbG9yKSB7XG4gICAgLy8gZmlyc3QsIHNldCB0aGUgY29sb3IgdG8gc29tZXRoaW5nXG4gICAgaWYgKHR5cGVvZiBjb2xvciA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBkZWZhdWx0IHRvIGxpZ2h0IGdyZXkuXG4gICAgICAgIGNvbG9yID0gbmV3IFRIUkVFLkNvbG9yKDB4Y2NjY2NjKTtcbiAgICB9XG4gICAgdmFyIHBvczsgLy8gdGhlIHBvc2l0aW9uIHRvIGRyYXcgdGhlIGN1YmVcbiAgICBpZiAodHlwZW9mIHgueCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyB0aGVuIGl0J3MgYSB2ZWN0b3IsIGFuZCB5IG1pZ2h0IGJlIHRoZSBjb2xvclxuICAgICAgICBwb3MgPSB4O1xuICAgICAgICBpZiAodHlwZW9mIHkgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbG9yID0geTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHggaXNuJ3QgYSB2ZWN0b3IsIHNvIGFzc3VtZSBzZXBhcmF0ZSB4IHkgYW5kIHpcbiAgICAgICAgcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgeik7XG4gICAgICAgIC8vIHdlIGNhdWdodCBjb2xvciBhbHJlYWR5LlxuICAgIH1cblxuICAgIC8vIGFib3V0IGEgZmlmdGlldGggb2YgdGhlIGZpZWxkJ3Mgc3VtbWVkIGRpbWVuc2lvbnNcbiAgICB2YXIgc2l6ZSA9ICh0aGlzLmYud1ggKyB0aGlzLmYud1kgKyB0aGlzLmYud1opIC8gNTA7XG4gICAgLy8gdXNlIHRoZSBjb2xvdXIgd2UgZGVjaWRlZCBlYXJsaWVyXG4gICAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoeyBjb2xvcjogY29sb3IgfSk7XG5cbiAgICAvLyBva2F5Li4gbWFrZSBpdCwgcG9zaXRpb24gaXQsIGFuZCBzaG93IGl0XG4gICAgdmFyIGN1YmUgPSBTY2FwZUl0ZW1zLmN1YmUoeyBzaXplOiBzaXplLCBtYXRlcmlhbDogbWF0ZXJpYWwgfSkubWVzaGVzWzBdO1xuICAgIGN1YmUucG9zaXRpb24uY29weShwb3MpO1xuICAgIHRoaXMuc2NlbmUuYWRkKGN1YmUpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJHcmlkID0gZnVuY3Rpb24odG9wT3JCb3R0b20pIHtcbiAgICB2YXIgZ3ogPSAwO1xuICAgIHZhciBnYyA9IDB4NDQ0NDQ0O1xuICAgIGlmICh0b3BPckJvdHRvbSA9PSAndG9wJykge1xuICAgICAgICBneiA9IHRoaXMuZi5tYXhaO1xuICAgICAgICBnYyA9IDB4Y2NjY2ZmO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1pblo7XG4gICAgICAgIGdjID0gMHhjY2ZmY2M7XG4gICAgfVxuXG4gICAgdmFyIGdyaWRXID0gTWF0aC5tYXgodGhpcy5mLm1heFggLSB0aGlzLmYubWluWCwgdGhpcy5mLm1heFkgLSB0aGlzLmYubWluWSk7XG5cbiAgICAvLyBHcmlkIFwic2l6ZVwiIGlzIHRoZSBkaXN0YW5jZSBpbiBlYWNoIG9mIHRoZSBmb3VyIGRpcmVjdGlvbnMsXG4gICAgLy8gdGhlIGdyaWQgc2hvdWxkIHNwYW4uICBTbyBmb3IgYSBncmlkIFcgdW5pdHMgYWNyb3NzLCBzcGVjaWZ5XG4gICAgLy8gdGhlIHNpemUgYXMgVy8yLlxuICAgIHZhciBncmlkWFkgPSBuZXcgVEhSRUUuR3JpZEhlbHBlcihncmlkVy8yLCBncmlkVy8xMCk7XG4gICAgZ3JpZFhZLnNldENvbG9ycyhnYywgZ2MpO1xuICAgIGdyaWRYWS5yb3RhdGlvbi54ID0gTWF0aC5QSS8yO1xuICAgIGdyaWRYWS5wb3NpdGlvbi5zZXQodGhpcy5mLm1pblggKyBncmlkVy8yLCB0aGlzLmYubWluWSArIGdyaWRXLzIsIGd6KTtcbiAgICB0aGlzLnNjZW5lLmFkZChncmlkWFkpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgVEhSRUUuUmVuZGVyZXIuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHZhcmlvdXMgb3B0aW9uc1xuICogQHBhcmFtIHtET01FbGVtZW50fGpRdWVyeUVsZW19IG9wdGlvbnMuZG9tIGEgZG9tIGVsZW1lbnRcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy53aWR0aCByZW5kZXJlciB3aWR0aCAoaW4gcGl4ZWxzKVxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmhlaWdodCByZW5kZXJlciBoZWlnaHQgKGluIHBpeGVscylcbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVJlbmRlcmVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHZhciByZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKHsgYW50aWFsaWFzOiB0cnVlLCBhbHBoYTogdHJ1ZSwgcHJlY2lzaW9uOiBcImhpZ2hwXCIgfSk7XG4gICAgcmVuZGVyZXIuc2V0Q2xlYXJDb2xvciggMHgwMDAwMDAsIDApO1xuICAgIC8vIHJlbmRlcmVyLnNoYWRvd01hcEVuYWJsZWQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZG9tKSB7XG4gICAgICAgIHZhciAkZG9tID0gJChvcHRpb25zLmRvbSk7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUoJGRvbS53aWR0aCgpLCAkZG9tLmhlaWdodCgpKTtcbiAgICAgICAgJGRvbS5hcHBlbmQocmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMud2lkdGggJiYgb3B0aW9ucy5oZWlnaHQpIHtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZShvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCk7XG4gICAgfVxuICAgIHJldHVybiByZW5kZXJlcjtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB1cGRhdGVzIHRoZSBzY2FwZSB0aW1lIHRvIG1hdGNoIHRoZSBjdXJyZW50IHRpbWUgKHRha2luZyBpbnRvXG4gKiBhY2NvdW50IHRoZSB0aW1lUmF0aW8gZXRjKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlVGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIHZhciBlbGFwc2VkID0gbm93LmdldFRpbWUoKSAtIHRoaXMuZmlyc3RSZW5kZXI7XG4gICAgdGhpcy5kYXRlID0gbmV3IERhdGUodGhpcy5maXJzdFJlbmRlciArIChlbGFwc2VkICogdGhpcy5fb3B0cy50aW1lUmF0aW8pKTtcbiAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9vcHRzLmRhdGVVcGRhdGU7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgY2FsbGJhY2tEYXRlID0gbmV3IERhdGUodGhpcy5kYXRlKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgY2FsbGJhY2tEYXRlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVN1bigpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzdW4gdG8gc3VpdCB0aGUgc2NhcGUgY3VycmVudCB0aW1lLlxuICogQHBhcmFtICB7VEhSRUUuRGlyZWN0aW9uYWxMaWdodH0gW3N1bl0gdGhlIHN1biB0byBhY3Qgb24uICBJZiBub3RcbiAqIHN1cHBsaWVkLCB0aGlzIG1ldGhvZCB3aWxsIGFjdCBvbiB0aGUgbGlnaHQgaW4gdGhpcyBzY2VuZSdzIGxpZ2h0XG4gKiBsaXN0IHRoYXQgaXMgY2FsbGVkIFwic3VuXCIuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX3VwZGF0ZVN1biA9IGZ1bmN0aW9uKHN1bikge1xuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gaWYgdGhleSBkaWRuJ3QgcHJvdmlkZSBhIHN1biwgdXNlIG91ciBvd25cbiAgICAgICAgc3VuID0gdGhpcy5saWdodHMuc3VuO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc3VuID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjsgLy8gYmFpbCBpZiB0aGVyZSdzIG5vIHN1biBXSEFUIERJRCBZT1UgRE8gWU9VIE1PTlNURVJcbiAgICB9XG5cbiAgICB2YXIgc3VuQW5nbGUgPSAodGhpcy5kYXRlLmdldEhvdXJzKCkqNjAgKyB0aGlzLmRhdGUuZ2V0TWludXRlcygpKSAvIDE0NDAgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgc3VuUm90YXRpb25BeGlzID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XG5cbiAgICBzdW4ucG9zaXRpb25cbiAgICAgICAgLnNldCgwLCAtMyAqIHRoaXMuZi53WSwgLTIwICogdGhpcy5mLndaKVxuICAgICAgICAuYXBwbHlBeGlzQW5nbGUoc3VuUm90YXRpb25BeGlzLCBzdW5BbmdsZSlcbiAgICAgICAgLmFkZCh0aGlzLmYuY2VudGVyKTtcblxuICAgIHZhciBzdW5aID0gc3VuLnBvc2l0aW9uLno7XG5cbiAgICAvLyBzd2l0Y2ggdGhlIHN1biBvZmYgd2hlbiBpdCdzIG5pZ2h0IHRpbWVcbiAgICBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gZmFsc2UgJiYgc3VuWiA8PSB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gdHJ1ZSAmJiBzdW5aID4gdGhpcy5mLmNlbnRlci56KSB7XG4gICAgICAgIHN1bi5vbmx5U2hhZG93ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gZmFkZSBvdXQgdGhlIHNoYWRvdyBkYXJrbmVzcyB3aGVuIHRoZSBzdW4gaXMgbG93XG4gICAgaWYgKHN1blogPj0gdGhpcy5mLmNlbnRlci56ICYmIHN1blogPD0gdGhpcy5mLm1heFopIHtcbiAgICAgICAgdmFyIHVwbmVzcyA9IE1hdGgubWF4KDAsIChzdW5aIC0gdGhpcy5mLmNlbnRlci56KSAvIHRoaXMuZi53WiAqIDIpO1xuICAgICAgICBzdW4uc2hhZG93RGFya25lc3MgPSAwLjUgKiB1cG5lc3M7XG4gICAgICAgIHN1bi5pbnRlbnNpdHkgPSB1cG5lc3M7XG4gICAgfVxuXG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VMaWdodHMgPSBmdW5jdGlvbihsaWdodHNUb0luY2x1ZGUpIHtcblxuICAgIHZhciBsaWdodHMgPSB7fTtcbiAgICB2YXIgZiA9IHRoaXMuZjsgIC8vIGNvbnZlbmllbnQgcmVmZXJlbmNlIHRvIHRoZSBmaWVsZFxuXG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdhbWJpZW50JykgIT0gLTEpIHtcbiAgICAgICAgLy8gYWRkIGFuIGFtYmllbnQgbGlzdFxuICAgICAgICBsaWdodHMuYW1iaWVudCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgyMjIyMzMpO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3RvcGxlZnQnKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMubGVmdCA9IG5ldyBUSFJFRS5Qb2ludExpZ2h0KDB4ZmZmZmZmLCAxLCAwKTtcbiAgICAgICAgLy8gcG9zaXRpb24gbGlnaHQgb3ZlciB0aGUgdmlld2VyJ3MgbGVmdCBzaG91bGRlci4uXG4gICAgICAgIC8vIC0gTEVGVCBvZiB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB4IHdpZHRoXG4gICAgICAgIC8vIC0gQkVISU5EIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHkgd2lkdGhcbiAgICAgICAgLy8gLSBBQk9WRSB0aGUgY2FtZXJhIGJ5IHRoZSBmaWVsZCdzIGhlaWdodFxuICAgICAgICBsaWdodHMubGVmdC5wb3NpdGlvbi5hZGRWZWN0b3JzKFxuICAgICAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24sXG4gICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMygtMC41ICogZi53WCwgLTAuNSAqIGYud1ksIDEgKiBmLndaKVxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3N1bicpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5zdW4gPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZlZSk7XG4gICAgICAgIGxpZ2h0cy5zdW4uaW50ZW5zaXR5ID0gMS4wO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZVN1bihsaWdodHMuc3VuKTtcblxuICAgICAgICAvLyBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVZpc2libGUgPSB0cnVlOyAgLy8gREVCVUdcblxuICAgICAgICAvLyBkaXJlY3Rpb24gb2Ygc3VubGlnaHRcbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5zdW4udGFyZ2V0ID0gdGFyZ2V0O1xuXG4gICAgICAgIC8vIHN1biBkaXN0YW5jZSwgbG9sXG4gICAgICAgIHZhciBzdW5EaXN0YW5jZSA9IGxpZ2h0cy5zdW4ucG9zaXRpb24uZGlzdGFuY2VUbyhsaWdodHMuc3VuLnRhcmdldC5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxvbmdlc3QgZGlhZ29uYWwgZnJvbSBmaWVsZC1jZW50ZXJcbiAgICAgICAgdmFyIG1heEZpZWxkRGlhZ29uYWwgPSBmLmNlbnRlci5kaXN0YW5jZVRvKG5ldyBUSFJFRS5WZWN0b3IzKGYubWluWCwgZi5taW5ZLCBmLm1pblopKTtcblxuICAgICAgICAvLyBzaGFkb3cgc2V0dGluZ3NcbiAgICAgICAgbGlnaHRzLnN1bi5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuMzM7XG5cbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFOZWFyID0gc3VuRGlzdGFuY2UgLSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUZhciA9IHN1bkRpc3RhbmNlICsgbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFUb3AgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVJpZ2h0ID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFCb3R0b20gPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTGVmdCA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdza3knKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc2t5ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhlZWVlZmYpO1xuICAgICAgICBsaWdodHMuc2t5LmludGVuc2l0eSA9IDAuODtcblxuICAgICAgICAvLyBza3kgaXMgZGlyZWN0bHkgYWJvdmVcbiAgICAgICAgdmFyIHNreUhlaWdodCA9IDUgKiBmLndaO1xuICAgICAgICBsaWdodHMuc2t5LnBvc2l0aW9uLmNvcHkodGhpcy5jYW1lcmEucG9zaXRpb24pO1xuICAgICAgICAvLyBsaWdodHMuc2t5LnBvc2l0aW9uLnNldFooZi5tYXhaICsgc2t5SGVpZ2h0KTtcblxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnNreS50YXJnZXQgPSB0YXJnZXQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgbGlnaHQgaW4gbGlnaHRzKSB7XG4gICAgICAgIGlmIChsaWdodHMuaGFzT3duUHJvcGVydHkobGlnaHQpKSB7XG4gICAgICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodHNbbGlnaHRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaWdodHM7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VTY2VuZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICAgIC8vIGFkZCBmb2dcbiAgICAvLyBzY2VuZS5mb2cgPSBuZXcgVEhSRUUuRm9nKFxuICAgIC8vICAgICAnI2YwZjhmZicsXG4gICAgLy8gICAgIHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsXG4gICAgLy8gICAgIHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblggKiAzXG4gICAgLy8gKTtcbiAgICByZXR1cm4gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDYW1lcmEgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cbiAgICAvLyB2aWV3aW5nIGFuZ2xlXG4gICAgLy8gaSB0aGluayB0aGlzIGlzIHRoZSB2ZXJ0aWNhbCB2aWV3IGFuZ2xlLiAgaG9yaXpvbnRhbCBhbmdsZSBpc1xuICAgIC8vIGRlcml2ZWQgZnJvbSB0aGlzIGFuZCB0aGUgYXNwZWN0IHJhdGlvLlxuICAgIHZhciB2aWV3QW5nbGUgPSA0NTtcbiAgICB2aWV3QW5nbGUgPSAob3B0aW9ucyAmJiBvcHRpb25zLnZpZXdBbmdsZSkgfHwgdmlld0FuZ2xlO1xuXG4gICAgLy8gYXNwZWN0XG4gICAgdmFyIHZpZXdBc3BlY3QgPSAxNi85O1xuICAgIGlmICh0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIHZpZXdBc3BlY3QgPSAkZWxlbS53aWR0aCgpIC8gJGVsZW0uaGVpZ2h0KCk7XG4gICAgfVxuXG4gICAgLy8gbmVhciBhbmQgZmFyIGNsaXBwaW5nXG4gICAgdmFyIG5lYXJDbGlwID0gMC4xO1xuICAgIHZhciBmYXJDbGlwID0gMTAwMDA7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBuZWFyQ2xpcCA9IE1hdGgubWluKHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opIC8gMTAwMDtcbiAgICAgICAgZmFyQ2xpcCA9IE1hdGgubWF4KHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opICogMTA7XG4gICAgfVxuXG4gICAgLy8gY2FtZXJhIHBvc2l0aW9uIGFuZCBsb29raW5nIGRpcmVjdGlvblxuICAgIHZhciBsb29rSGVyZSA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xuICAgIHZhciBjYW1Qb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAtMTAsIDUpO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbG9va0hlcmUgPSB0aGlzLmYuY2VudGVyO1xuICAgICAgICBjYW1Qb3MgPSBsb29rSGVyZS5jbG9uZSgpLmFkZChuZXcgVEhSRUUuVmVjdG9yMygwLCAtMS4xICogdGhpcy5mLndZLCAyICogdGhpcy5mLndaKSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IHVwIGNhbWVyYVxuICAgIHZhciBjYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoIHZpZXdBbmdsZSwgdmlld0FzcGVjdCwgbmVhckNsaXAsIGZhckNsaXApO1xuICAgIC8vIFwidXBcIiBpcyBwb3NpdGl2ZSBaXG4gICAgY2FtZXJhLnVwLnNldCgwLDAsMSk7XG4gICAgY2FtZXJhLnBvc2l0aW9uLmNvcHkoY2FtUG9zKTtcbiAgICBjYW1lcmEubG9va0F0KGxvb2tIZXJlKTtcblxuICAgIC8vIGFkZCB0aGUgY2FtZXJhIHRvIHRoZSBzY2VuZVxuICAgIGlmICh0aGlzLnNjZW5lKSB7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGNhbWVyYSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbWVyYTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwwLDApO1xuICAgIGlmICh0aGlzLmYgJiYgdGhpcy5mLmNlbnRlcikge1xuICAgICAgICBjZW50ZXIgPSB0aGlzLmYuY2VudGVyLmNsb25lKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNhbWVyYSAmJiB0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgY29udHJvbHMgPSBuZXcgVEhSRUUuT3JiaXRDb250cm9scyh0aGlzLmNhbWVyYSwgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgY29udHJvbHMuY2VudGVyID0gY2VudGVyO1xuICAgICAgICByZXR1cm4gY29udHJvbHM7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnc2NhcGUhJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTY2VuZTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5cbnZhciBMYW1iZXJ0ID0gVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbDtcbnZhciBQaG9uZyA9IFRIUkVFLk1lc2hQaG9uZ01hdGVyaWFsO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFN0dWZmICh0aGF0IGlzLCBUSFJFRS5NYXRlcmlhbCkgdGhhdCB0aGluZ3MgaW4gc2NhcGVzIGNhbiBiZSBtYWRlIG91dCBvZi5cbiAqIEBuYW1lc3BhY2VcbiAqL1xudmFyIFNjYXBlU3R1ZmYgPSB7fTtcblxuLyoqIGdlbmVyaWMgc3R1ZmYsIGZvciBpZiBub3RoaW5nIGVsc2UgaXMgc3BlY2lmaWVkXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2VuZXJpYyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4OTk5OTk5LFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNTAgfSk7XG5cbi8qKiB3YXRlciBpcyBibHVlIGFuZCBhIGJpdCB0cmFuc3BhcmVudFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLndhdGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgzMzk5ZmYsXG4gICAgICAgICAgICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC43NSB9KTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0b25lLCBkaXJ0LCBhbmQgZ3JvdW5kIG1hdGVyaWFsc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBkaXJ0IGZvciBnZW5lcmFsIHVzZVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGEwNTIyZCB9KTtcblxuLy8gTmluZSBkaXJ0IGNvbG91cnMgZm9yIHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzLiAgU3RhcnQgYnkgZGVmaW5pbmdcbi8vIHRoZSBkcmllc3QgYW5kIHdldHRlc3QgY29sb3VycywgYW5kIHVzZSAubGVycCgpIHRvIGdldCBhIGxpbmVhclxuLy8gaW50ZXJwb2xhdGVkIGNvbG91ciBmb3IgZWFjaCBvZiB0aGUgaW4tYmV0d2VlbiBkaXJ0cy5cbnZhciBkcnkgPSBuZXcgVEhSRUUuQ29sb3IoMHhiYjg4NTUpOyAvLyBkcnlcbnZhciB3ZXQgPSBuZXcgVEhSRUUuQ29sb3IoMHg4ODIyMDApOyAvLyBtb2lzdFxuXG4vKiogZGlydCBhdCB2YXJ5aW5nIG1vaXN0dXJlIGxldmVsczogZGlydDAgaXMgZHJ5IGFuZCBsaWdodCBpblxuICAqIGNvbG91ciwgZGlydDkgaXMgbW9pc3QgYW5kIGRhcmsuXG4gICogQG5hbWUgZGlydFswLTldXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZGlydDAgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkgfSk7XG5TY2FwZVN0dWZmLmRpcnQxID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDEvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDIvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQzID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDMvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDQvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ1ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDUvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ2ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDYvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ3ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDcvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ4ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDgvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ5ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogd2V0IH0pO1xuXG4vKiogbGVhZiBsaXR0ZXIsIHdoaWNoIGluIHJlYWxpdHkgaXMgdXN1YWxseSBicm93bmlzaCwgYnV0IHRoaXMgaGFzXG4gICogYSBncmVlbmlzaCB0b25lIHRvIGRpc3Rpbmd1aXNoIGl0IGZyb20gcGxhaW4gZGlydC5cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5sZWFmbGl0dGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg2NjZiMmYgfSk7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZmxvcmEgLSB3b29kLCBsZWF2ZXMsIGV0Y1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBnZW5lcmljIGJyb3duIHdvb2RcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg3NzQ0MjIgfSk7XG5cbi8qKiBsaWdodCB3b29kIGZvciBndW10cmVlcyBldGMuICBNYXliZSBpdCdzIGEgYml0IHRvbyBsaWdodD9cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5saWdodHdvb2QgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGZmZWVjYyB9KTtcblxuLyoqIGEgZ2VuZXJpYyBncmVlbmlzaCBsZWFmIG1hdGVyaWFsXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZm9saWFnZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NTU4ODMzIH0pO1xuXG4vKiogYSBnZW5lcmljIGdyZWVuaXNoIGxlYWYgbWF0ZXJpYWxcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5mb2xpYWdlID0gbmV3IExhbWJlcnQoXG4gIHsgY29sb3I6IDB4NTU4ODMzLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC45IH1cbik7XG5cbi8qKiBhIGdyZWVuaXNoIGxlYWYgbWF0ZXJpYWwgdGhhdCdzIG1vc3RseSBzZWUtdGhyb3VnaFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnRyYW5zcGFyZW50Rm9saWFnZSA9IG5ldyBMYW1iZXJ0KFxuICB7IGNvbG9yOiAweDU1ODgzMywgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuMzMgfVxuKTtcblxuLyoqIGEgZm9saWFnZSBtYXRlcmlhbCBmb3IgdXNlIGluIHBvaW50IGNsb3VkIG9iamVjdHNcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5wb2ludEZvbGlhZ2UgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZE1hdGVyaWFsKHsgY29sb3I6IDB4NTU4ODMzLCBzaXplOiAwLjUgfSk7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYnVpbHQgbWF0ZXJpYWxzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIHNpbHZlcnkgbWV0YWxcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5tZXRhbCA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweGFhYmJlZSwgc3BlY3VsYXI6IDB4ZmZmZmZmLCBzaGluaW5lc3M6IDEwMCwgcmVmbGVjdGl2aXR5OiAwLjggfSk7XG5cbi8qKiBjb25jcmV0ZSBpbiBhIHNvcnQgb2YgbWlkLWdyZXlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5jb25jcmV0ZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4OTk5OTk5IH0pO1xuXG4vKiogcGxhc3RpYywgYSBnZW5lcmljIHdoaXRpc2ggcGxhc3RpYyB3aXRoIGEgYml0IG9mIHNoaW5pbmVzc1xuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnBsYXN0aWMgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHg5OTk5OTksIGVtaXNzaXZlOiAweDk5OTk5OSwgc3BlY3VsYXI6IDB4Y2NjY2NjIH0pO1xuXG4vKiogZ2xhc3MgaXMgc2hpbnksIGZhaXJseSB0cmFuc3BhcmVudCwgYW5kIGEgbGl0dGxlIGJsdWlzaFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdsYXNzID0gbmV3IFBob25nKFxuICB7IGNvbG9yOiAweDY2YWFmZiwgc3BlY3VsYXI6IDB4ZmZmZmZmLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC41IH1cbik7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZ2VuZXJhbCBjb2xvdXJzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIG1hdHQgYmxhY2ssIGZvciBibGFjayBzdXJmYWNlcyAoYWN0dWFsbHkgaXQncyAjMTExMTExKVxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmJsYWNrID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgxMTExMTEgfSk7XG5cbi8qKiBtYXR0IHdoaXRlLCBmb3Igd2hpdGUgc3VyZmFjZXMgKGFjdHVhbGx5IGl0J3MgI2VlZWVlZSlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53aGl0ZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4ZWVlZWVlIH0pO1xuXG4vKiogZ2xvc3MgYmxhY2ssIGZvciBzaGlueSBibGFjayBwYWludGVkIHN1cmZhY2VzIChhY3R1YWxseSBpdCdzICMxMTExMTEpXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2xvc3NCbGFjayA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweDExMTExMSwgc3BlY3VsYXI6IDB4NjY2NjY2IH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFVJIHV0aWxpdHkgdGhpbmdzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIGhhcmQgd2hpdGVcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi51aVdoaXRlID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IDB4ZmZmZmZmIH0pO1xuU2NhcGVTdHVmZi51aVdoaXRlLmRlcHRoVGVzdCA9IGZhbHNlO1xuXG5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU3R1ZmY7XG5cblxuXG5cbiJdfQ==
