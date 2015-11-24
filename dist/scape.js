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

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/item":5,"./scape/itemtypes":6,"./scape/scene":17,"./scape/stuff":18}],2:[function(require,module,exports){

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

},{"./baseobject":2,"./item":5,"./stuff":18}],5:[function(require,module,exports){
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
    cube:       require('./itemtypes/cube'),
    tree:       require('./itemtypes/tree'),
    crane:      require('./itemtypes/crane'),
    soilPit:    require('./itemtypes/soilpit'),
    leafLitterCatcher:  require('./itemtypes/leaflittercatcher'),

    // label:      require('./itemtypes/label'),
    camLabel:   require('./itemtypes/camlabel')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/camlabel":11,"./itemtypes/crane":12,"./itemtypes/cube":13,"./itemtypes/leaflittercatcher":14,"./itemtypes/soilpit":15,"./itemtypes/tree":16}],7:[function(require,module,exports){
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

	c.name = options.camera.name || 'camera';

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
		var camClick = ScapeClickable(c.name, c.clickData, c.x, c.y, c.height + c.bodyHeight/2);
		parentParts.clickPoints.push(camClick);
	}

	i.camera = c;

	return parentParts;
};
// ------------------------------------------------------------------
module.exports = ScapeCameraAddon;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":18,"./clickable":8}],8:[function(require,module,exports){
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
function ScapeClickable(name, clickData, x, y, z) {
	var clicker = new THREE.Object3D();

	var hoverRadius = 8;
	var clickRadius = 3.5;
	var lineLength = 8;

	var translate = new THREE.Matrix4().makeTranslation(x, y, z);

	hoverMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 })
	var hoverGeom = new THREE.SphereGeometry(hoverRadius);
	hoverGeom.applyMatrix(translate);
	var hoverBubble = new THREE.Mesh(hoverGeom, hoverMaterial);
	hoverBubble.visible = false;
	clicker.add(hoverBubble);

	var clickGeom = new THREE.SphereGeometry(clickRadius, 16, 12);
	clickGeom.applyMatrix(translate);
	var clickBubble = new THREE.Mesh(clickGeom, ScapeStuff.uiSuggest);
	clickBubble.userData.clickData = clickData;
	clicker.add(clickBubble);

	// // add the name stuff to clickBubble instead
	clickBubble.userData.name = name;
	clickBubble.userData.offset = translate;
	// clickBubble.userData.namePosition = ( new THREE.Matrix4()
	// 	.makeTranslation(-1 * clickRadius/3, 0, lineLength + clickRadius/2)
	// 	.multiply(translate)
	// 	.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	// );

	// ////////// identifier flag
	// var ident = new THREE.Object3D();

	// /////////// having text always there but usually invisible was MURDERING ram usage.
	// // // name text
	// // var nameGeom = new THREE.TextGeometry(name, {
	// // 	font: 'helvetiker',
	// // 	size: clickRadius,
	// // 	height: 0.1
	// // });
	// // nameGeom.applyMatrix( new THREE.Matrix4()
	// // 	.makeTranslation(-1 * clickRadius/3, 0, lineLength + clickRadius/2)
	// // 	.multiply(translate)
	// // 	.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	// // );
	// // var name = new THREE.Mesh(nameGeom, ScapeStuff.uiWhite);
	// // ident.add(name);


	// // pointer
	// var lineGeom = new THREE.CylinderGeometry(0.1, 0.1, lineLength);
	// lineGeom.applyMatrix( new THREE.Matrix4()
	// 	.makeTranslation(0, 0, lineLength / 2)
	// 	.multiply(translate)
	// 	.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	// );

	// var line = new THREE.Mesh(lineGeom, ScapeStuff.uiWhite);
	// // line.userData.type = 'nameline';
	// ident.add(line);

	// ident.visible = false;
	// // ident.userData.type = 'nameassembly';
	// clicker.add(ident);

	clicker.visible = false;
	return clicker;
}

module.exports = ScapeClickable;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":18}],9:[function(require,module,exports){
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

	d.name = options.dendrometer.name || 'dendrometer';

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
		var dendroClick = ScapeClickable(d.name, d.clickData, d.bandRadius + d.meterRadius, 0, d.bandHeight + d.meterHeight/6);
		treeParts.clickPoints.push(dendroClick);
	}

	i.dendrometer = d;

	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeDendrometerAddon;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":18,"./clickable":8}],10:[function(require,module,exports){
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

	s.name = options.sapflowmeter.name || 'sap flow meter';

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
		var click = ScapeClickable(s.name, s.clickData, 0, -1 * (i.trunkRadius + s.baseThick/2), s.height + s.baseL/2);
		treeParts.clickPoints.push(click);
	}

	i.sapflowmeter = s;

	return treeParts;
};
// ------------------------------------------------------------------
module.exports = ScapeSapFlowMeterAddon;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../stuff":18,"./clickable":8}],11:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');

// ------------------------------------------------------------------
/**
 * @function
 * @name ScapeItems.camLabel
 */
function ScapeCamLabelFactory(options, internals) {

	var label = { meshes: [], clickPoints: [] };

	var i = internals || {};
	i.meshNames = i.meshNames || [];

	i.x = options.x || 0;
	i.y = options.y || 0;
	i.z = options.z || 0;
	i.offset = options.offset || new THREE.Matrix4();

	// get the camera position and view direction
	i.camPos = options.camPos || new THREE.Vector3();
	i.camDir = options.camDir || new THREE.Vector3(0, 0, 1);

	console.log(i.camPos);
	console.log(i.camDir);

	i.labelText = options.text;
	i.textSize = options.size || 2;
	i.textWidth = i.textSize / 10;

	i.lineRadius = i.textWidth / 2;
	i.lineLength = options.height || Math.max(8, i.textSize);

	i.dotRadius = i.lineRadius * 1.5;

	i.glowStuff = options.glow || ScapeStuff.uiHighlight;
	i.textStuff = options.letters || ScapeStuff.uiShow;

	i.textStuff = ScapeStuff.black;

	var translate = new THREE.Matrix4().makeTranslation(i.x, i.y, i.z).multiply(i.offset);

	// // glowing ball
	// var glowGeom = new THREE.SphereGeometry(1.5, 32, 24);
	// glowGeom.applyMatrix(translate);
	// i.meshNames.push('glowbubble');
	// label.meshes.push(new THREE.Mesh(glowGeom, i.glowStuff));

	// text for the label
	var nameGeom = new THREE.TextGeometry(i.labelText, {
		font: 'helvetiker',
		size: i.textSize,
		height: 0.1
	});
	nameGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(-1 * i.textSize/3, 0, i.lineLength + i.textSize/2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);
	i.meshNames.push('labeltext');
	label.meshes.push(new THREE.Mesh(nameGeom, i.textStuff));

	// // dot
	// var dotGeom = new THREE.SphereGeometry(0.25, 16, 12);
	// dotGeom.applyMatrix(translate);
	// i.meshNames.push('dot');
	// label.meshes.push(new THREE.Mesh(dotGeom, i.lineStuff));

	// // pointer
	// var lineGeom = new THREE.CylinderGeometry(i.lineRadius, i.lineRadius, i.lineLength);
	// lineGeom.applyMatrix( new THREE.Matrix4()
	// 	.makeTranslation(0, 0, i.lineLength / 2)
	// 	.multiply(translate)
	// 	.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	// );
	// i.meshNames.push('labelpointer');
	// label.meshes.push(new THREE.Mesh(lineGeom, i.lineStuff));

	return label;
};
// ------------------------------------------------------------------
module.exports = ScapeCamLabelFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":18}],12:[function(require,module,exports){
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

},{"../stuff":18,"./addons/camera":7}],13:[function(require,module,exports){
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

},{"../stuff":18}],14:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":18,"./addons/clickable":8}],15:[function(require,module,exports){
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

	i.name = options.name || 'soil pit';

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
		var click = ScapeClickable(i.name, options.clickData, i.boxS/3, 0, i.boxH + i.boxS/2);
		pit.clickPoints.push(click);
	}

	return pit;
};
// ------------------------------------------------------------------
module.exports = ScapeSoilPitFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../stuff":18,"./addons/clickable":8}],16:[function(require,module,exports){
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

	i.trunkGeom = new THREE.CylinderGeometry(i.trunkRadius/2, i.trunkRadius, i.trunkHeight, 7);
	// center on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0
	var trunkPosition = new THREE.Matrix4().makeTranslation(0, 0, i.trunkHeight/2);
	i.trunkGeom.applyMatrix(trunkPosition.multiply(rotate));
	var trunk = new THREE.Mesh(i.trunkGeom, i.trunkStuff);
	i.meshNames.push('trunk');
	tree.meshes.push(trunk);

	i.canopyGeom = new THREE.CylinderGeometry(i.canopyRadius, i.canopyRadius, i.canopyHeight, 7);
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

},{"../stuff":18,"./addons/dendrometer":9,"./addons/sapflowmeter":10}],17:[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
// also requires OrbitControls
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
 * means one minute real time = one hour scape time.  Use 0 to freeze
 * time.
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

    this.bounds = this.element.getBoundingClientRect();

    // ..move handler
    this.element.onmousemove = function(event) {
        this.bounds = this.element.getBoundingClientRect();
        this.mouseHover(event.clientX - this.bounds.left, event.clientY - this.bounds.top);
    }.bind(this);

    // ..click handler
    this.element.onclick = function(event) {
        this.bounds = this.element.getBoundingClientRect();
        this.mouseClick(event.clientX - this.bounds.left, event.clientY - this.bounds.top);
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

    this.uiPointer = new ScapeItem(ScapeItems.camLabel, 0, 0, {text: 'unnamed'});

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

        requestAnimationFrame( render );
        this.renderer.render( this.scene, this.camera );
        this.controls.update();

        // DEBUG maybe the updateTime is disabled
        this._updateTime();

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

    // remove the ui pointer
    this.uiPointer.removeFromScene();

    // set all the clickables to hidden
    for (var c=0; c < this.f.clickables.length; c++) {
        this.f.clickables[c].visible = false;
    }

    // now unhide just the ones in the mouse area
    raycaster.setFromCamera(mousePos, this.camera);
    var intersects = raycaster.intersectObjects(this.f.clickables, true);

    var intersect, clickable, firstClickable = null;
    for (var i=0; i < intersects.length; i++) {
        intersect = intersects[i].object;
        clickable = intersect.parent;
        if (!firstClickable && intersect.userData.clickData) {
            firstClickable = intersect;
            if (firstClickable.userData.name) {
                // first clickable has a name, make it into a label
                this.uiPointer.update({
                    text: firstClickable.userData.name,
                    x: clickable.position.x,
                    y: clickable.position.y,
                    z: clickable.position.z,
                    camPos: this.camera.position.clone(),
                    camDir: this.camera.getWorldDirection(),
                    offset: firstClickable.userData.offset
                });
                // // rotate to show text to camera?
                // this.uiPointer.eachMesh(function(m) {
                //     m.up.copy(this.camera.up);
                //     m.lookAt(this.camera.position);
                // }, this);
                this.uiPointer.addToScene(this);
            }
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
        if (clicked.userData.clickData) {
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

    this.date = new Date(this.startDate.getTime() + (elapsed * this._opts.timeRatio));

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

    //  out the shadow darkness when the sun is low
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
        camPos = lookHere.clone().add(new THREE.Vector3(0, -1.7 * this.f.wY, 1 * this.f.wZ));
    }

    // set up camera
    // TODO work out which camera to use

    var camera = new THREE.PerspectiveCamera( viewAngle, viewAspect, nearClip, farClip);

    // var camera = new THREE.OrthographicCamera(
    //     0 - this.f.wX,    // left
    //     0 + this.f.wX,    // right
    //     0 + this.f.wZ,    // top
    //     0 - this.f.wZ,    // bottom
    //     nearClip,    // near
    //     farClip     // far
    // );


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
        controls.target = center;
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

},{"./baseobject":2,"./chunk":3,"./item":5,"./itemtypes":6,"./stuff":18}],18:[function(require,module,exports){
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
ScapeStuff.plastic = new Phong({ color: 0xcccccc, specular: 0xcccccc });

/** black shadecloth, slightly see through black
  * @memberOf ScapeStuff */
ScapeStuff.shadecloth = new Lambert(
  { color: 0x111111, transparent: true, opacity: 0.8 }
);

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

/** solid color for rendering UI elements
  * @memberOf ScapeStuff */
ScapeStuff.uiShow = new THREE.MeshBasicMaterial({ color: 0xffffff });
ScapeStuff.uiShow.depthTest = false;

/** mostly transparent, slightly yellowish color for hinting at UI elements
  * @memberOf ScapeStuff */
ScapeStuff.uiSuggest = new THREE.MeshBasicMaterial({ color: 0xffff66, transparent: true, opacity: 0.2 })
ScapeStuff.uiSuggest.depthTest = false;

/** bright glowing color for highlighting UI elements
  * @memberOf ScapeStuff */
ScapeStuff.uiHighlight = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
ScapeStuff.uiHighlight.depthTest = false;



// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
<<<<<<< HEAD
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NhbWVyYS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NsaWNrYWJsZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2RlbmRyb21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9hZGRvbnMvc2FwZmxvd21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9jYW1sYWJlbC5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3JhbmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2N1YmUuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2xlYWZsaXR0ZXJjYXRjaGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9zb2lscGl0LmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy90cmVlLmpzIiwic3JjL3NjYXBlL3NjZW5lLmpzIiwic3JjL3NjYXBlL3N0dWZmLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3pkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vIFRIUkVFID0gcmVxdWlyZSgndGhyZWUnKTtcblxuLy8gbWFrZSBhbiBvYmplY3Qgb3V0IG9mIHRoZSB2YXJpb3VzIGJpdHNcblNjYXBlID0ge1xuICAgIEJhc2VPYmplY3Q6IHJlcXVpcmUoJy4vc2NhcGUvYmFzZW9iamVjdCcpLFxuICAgIENodW5rOiAgICAgIHJlcXVpcmUoJy4vc2NhcGUvY2h1bmsnKSxcbiAgICBGaWVsZDogICAgICByZXF1aXJlKCcuL3NjYXBlL2ZpZWxkJyksXG4gICAgSXRlbTogICAgICAgcmVxdWlyZSgnLi9zY2FwZS9pdGVtJyksXG4gICAgSXRlbVR5cGVzOiAgcmVxdWlyZSgnLi9zY2FwZS9pdGVtdHlwZXMnKSxcbiAgICBTY2VuZTogICAgICByZXF1aXJlKCcuL3NjYXBlL3NjZW5lJyksXG4gICAgU3R1ZmY6ICAgICAgcmVxdWlyZSgnLi9zY2FwZS9zdHVmZicpXG59XG5cbi8vIHJldHVybiB0aGUgb2JqZWN0IGlmIHdlJ3JlIGJlaW5nIGJyb3dzZXJpZmllZDsgb3RoZXJ3aXNlIGF0dGFjaFxuLy8gaXQgdG8gdGhlIGdsb2JhbCB3aW5kb3cgb2JqZWN0LlxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTY2FwZTtcbn0gZWxzZSB7XG4gICAgd2luZG93LlNjYXBlID0gU2NhcGU7XG59XG4iLCJcbi8vXG4vLyB0aGlzIFwiYmFzZVwiIG9iamVjdCBoYXMgYSBmZXcgY29udmVuaWVuY2UgZnVuY3Rpb25zIGZvciBoYW5kbGluZ1xuLy8gb3B0aW9ucyBhbmQgd2hhdG5vdFxuLy9cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIFNjYXBlT2JqZWN0KG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gICAgdGhpcy5fb3B0cyA9IE9iamVjdC5jcmVhdGUoZGVmYXVsdHMpO1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZXJnZSBuZXcgb3B0aW9ucyBpbnRvIG91ciBvcHRpb25zXG5TY2FwZU9iamVjdC5wcm90b3R5cGUubWVyZ2VPcHRpb25zID0gZnVuY3Rpb24oZXh0cmFPcHRzKSB7XG4gICAgZm9yIChvcHQgaW4gZXh0cmFPcHRzKSB7XG4gICAgICAgIHRoaXMuX29wdHNbb3B0XSA9IGV4dHJhT3B0c1tvcHRdO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVPYmplY3Q7IiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWN0YW5ndWxhciBwcmlzbSBvZiBtYXRlcmlhbCB0aGF0IHRoZSBzb2xpZCBcImdyb3VuZFwiXG4gKiBwb3J0aW9uIG9mIGEgJ3NjYXBlIGlzIG1ha2UgdXAgb2YsIGUuZy4gZGlydCwgbGVhZiBsaXR0ZXIsIHdhdGVyLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIG1lc2ggYmFzZWQgb24gdGhlIGxpbmtlZFxuICogY2h1bmsgaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGNodW5rIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayAodmVydGljYWwgY29sdW1uIHdpdGhpbiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2FwZSkgdGhhdCBvd25zIHRoaXMgY2h1bmtcbiAqIEBwYXJhbSB7SW50ZWdlcn0gbGF5ZXJJbmRleCBJbmRleCBpbnRvIHBhcmVudEJsb2NrLmcgdGhpcyBjaHVuayBpcyBhdFxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblogbG93ZXN0IFogdmFsdWUgYW55IGNodW5rIHNob3VsZCBoYXZlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUNodW5rKHNjZW5lLCBwYXJlbnRCbG9jaywgbGF5ZXJJbmRleCwgbWluWiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9ibG9jayA9IHBhcmVudEJsb2NrO1xuICAgIHRoaXMuX2lzU3VyZmFjZSA9IChsYXllckluZGV4ID09IDApO1xuICAgIHRoaXMuX2xheWVyID0gcGFyZW50QmxvY2suZ1tsYXllckluZGV4XTtcbiAgICB0aGlzLl9taW5aID0gbWluWjtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuXG4gICAgLy8gVE9ETzogZmluaXNoIGhpbSEhXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVDaHVuay5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUNodW5rLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlQ2h1bms7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogSW52b2tlIGEgcmVidWlsZCBvZiB0aGlzIGNodW5rLlxuICpcbiAqIERpc2NhcmRzIGV4aXN0aW5nIGNhY2hlZCBtZXNoIGFuZCBidWlsZHMgYSBuZXcgbWVzaCBiYXNlZCBvbiB0aGVcbiAqIGN1cnJlbnRseSBsaW5rZWQgY2h1bmsgaW5mb3JtYXRpb24uXG4gKlxuICogQHJldHVybiBub25lXG4gKi9cblNjYXBlQ2h1bmsucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91cGRhdGVNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhlIGNodW5rIHdpbGwgYmUgYXMgZGVlcCBhcyB0aGUgbGF5ZXIgc2F5c1xuICAgIHZhciBkZXB0aCA9IHRoaXMuX2xheWVyLmR6O1xuICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgIC8vIC4udW5sZXNzIHRoYXQncyAwLCBpbiB3aGljaCBjYXNlIGdvIHRvIHRoZSBib3R0b21cbiAgICAgICAgZGVwdGggPSB0aGlzLl9sYXllci56IC0gdGhpcy5fbWluWjtcbiAgICB9XG4gICAgLy8gbWFrZSBhIGdlb21ldHJ5IGZvciB0aGUgY2h1bmtcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcbiAgICAgICAgdGhpcy5fYmxvY2suZHgsIHRoaXMuX2Jsb2NrLmR5LCBkZXB0aFxuICAgICk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCB0aGlzLl9sYXllci5tKTtcbiAgICBtZXNoLnBvc2l0aW9uLnNldChcbiAgICAgICAgdGhpcy5fYmxvY2sueCArIHRoaXMuX2Jsb2NrLmR4LzIsXG4gICAgICAgIHRoaXMuX2Jsb2NrLnkgKyB0aGlzLl9ibG9jay5keS8yLFxuICAgICAgICB0aGlzLl9sYXllci56IC0gZGVwdGgvMlxuICAgICk7XG4gICAgbWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAvLyBvbmx5IHRoZSBzdXJmYWNlIGNodW5rcyByZWNlaXZlIHNoYWRvd1xuICAgIGlmICh0aGlzLl9pc1N1cmZhY2UpIHtcbiAgICAgICAgbWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9hZGRNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUuYWRkKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fcmVtb3ZlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLnJlbW92ZSh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3VwZGF0ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVNZXNoKCk7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcbiAgICB0aGlzLl9hZGRNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDaHVuazsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbSA9IHJlcXVpcmUoJy4vaXRlbScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFRoZSBjb250YWluZXIgZm9yIGFsbCBpbmZvcm1hdGlvbiBhYm91dCBhbiBhcmVhLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucyBmb3IgdGhlIFNjYXBlRmllbGQgYmVpbmcgY3JlYXRlZC5cbiAqXG4gKiBvcHRpb24gfCBkZWZhdWx0IHZhbHVlIHwgZGVzY3JpcHRpb25cbiAqIC0tLS0tLS18LS0tLS0tLS0tLS0tLS06fC0tLS0tLS0tLS0tLVxuICogYG1pblhgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WGAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1hgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWCBheGlzIGludG9cbiAqIGBtaW5ZYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFlgICAgICB8ICAxMDAgfCBsYXJnZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NZYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFkgYXhpcyBpbnRvXG4gKiBgbWluWmAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFogKHZlcnRpY2FsIGRpbWVuc2lvbikgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhaYCAgICAgfCAgIDQwIHwgbGFyZ2VzdCBaIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWmAgIHwgICA4MCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBaIGF4aXMgaW50b1xuICogYGJsb2NrR2FwYCB8IDAuMDEgfCBnYXAgdG8gbGVhdmUgYmV0d2VlbiBibG9ja3MgYWxvbmcgdGhlIFggYW5kIFkgYXhlc1xuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUZpZWxkKG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgbWluWDogMCwgICAgICAgIG1heFg6IDEwMCwgICAgICAgICAgYmxvY2tzWDogMTAsXG4gICAgICAgIG1pblk6IDAsICAgICAgICBtYXhZOiAxMDAsICAgICAgICAgIGJsb2Nrc1k6IDEwLFxuICAgICAgICBtaW5aOiAwLCAgICAgICAgbWF4WjogNDAsICAgICAgICAgICBibG9ja3NaOiA4MCxcbiAgICAgICAgYmxvY2tHYXA6IDAuMDFcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gbWluIGFuZCBtYXggdmFsdWVzIGZvciB4IHkgYW5kIHpcbiAgICB0aGlzLm1pblggPSB0aGlzLl9vcHRzLm1pblg7XG4gICAgdGhpcy5taW5ZID0gdGhpcy5fb3B0cy5taW5ZO1xuICAgIHRoaXMubWluWiA9IHRoaXMuX29wdHMubWluWjtcblxuICAgIHRoaXMubWF4WCA9IHRoaXMuX29wdHMubWF4WDtcbiAgICB0aGlzLm1heFkgPSB0aGlzLl9vcHRzLm1heFk7XG4gICAgdGhpcy5tYXhaID0gdGhpcy5fb3B0cy5tYXhaO1xuXG4gICAgLy8gY29udmVuaWVudCBcIndpZHRoc1wiXG4gICAgdGhpcy53WCA9IHRoaXMubWF4WCAtIHRoaXMubWluWDtcbiAgICB0aGlzLndZID0gdGhpcy5tYXhZIC0gdGhpcy5taW5ZO1xuICAgIHRoaXMud1ogPSB0aGlzLm1heFogLSB0aGlzLm1pblo7XG5cbiAgICAvLyBob3cgbWFueSBibG9ja3MgYWNyb3NzIHggYW5kIHk/XG4gICAgdGhpcy5ibG9ja3NYID0gdGhpcy5fb3B0cy5ibG9ja3NYO1xuICAgIHRoaXMuYmxvY2tzWSA9IHRoaXMuX29wdHMuYmxvY2tzWTtcbiAgICB0aGlzLmJsb2Nrc1ogPSB0aGlzLl9vcHRzLmJsb2Nrc1o7XG5cbiAgICAvLyBob3cgd2lkZSBpcyBlYWNoIGJsb2NrXG4gICAgdGhpcy5fYlggPSB0aGlzLndYIC8gdGhpcy5ibG9ja3NYO1xuICAgIHRoaXMuX2JZID0gdGhpcy53WSAvIHRoaXMuYmxvY2tzWTtcbiAgICB0aGlzLl9iWiA9IHRoaXMud1ogLyB0aGlzLmJsb2Nrc1o7XG5cbiAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG5cbiAgICAvLyBob3VzZWtlZXBpbmdcbiAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgdGhpcy5fY2FsY0NlbnRlcigpO1xuICAgIHRoaXMuX21ha2VHcmlkKCk7XG5cbiAgICB0aGlzLmNsaWNrYWJsZXMgPSBbXTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUZpZWxkO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnKCcgKyB0aGlzLm1pblggKyAnLScgKyB0aGlzLm1heFggK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5ZICsgJy0nICsgdGhpcy5tYXhZICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWiArICctJyArIHRoaXMubWF4WiArXG4gICAgICAgICcpJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuX21ha2VHcmlkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZyA9IFtdO1xuICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLmJsb2Nrc1g7IGd4KyspIHtcbiAgICAgICAgdmFyIGNvbCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5ibG9ja3NZOyBneSsrKSB7XG4gICAgICAgICAgICB2YXIgeEdhcCA9IHRoaXMuX2JYICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgeUdhcCA9IHRoaXMuX2JZICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSB7XG4gICAgICAgICAgICAgICAgeDogdGhpcy5taW5YICsgKHRoaXMuX2JYICogZ3gpICsgeEdhcCxcbiAgICAgICAgICAgICAgICBkeDogdGhpcy5fYlggLSB4R2FwIC0geEdhcCxcbiAgICAgICAgICAgICAgICB5OiB0aGlzLm1pblkgKyAodGhpcy5fYlkgKiBneSkgKyB5R2FwLFxuICAgICAgICAgICAgICAgIGR5OiB0aGlzLl9iWSAtIHlHYXAgLSB5R2FwLFxuICAgICAgICAgICAgICAgIGc6IFt7XG4gICAgICAgICAgICAgICAgICAgIHo6IHRoaXMubWF4WixcbiAgICAgICAgICAgICAgICAgICAgZHo6IDAsIC8vIDAgbWVhbnMgXCJzdHJldGNoIHRvIG1pblpcIlxuICAgICAgICAgICAgICAgICAgICBtOiBTY2FwZVN0dWZmLmdlbmVyaWMsXG4gICAgICAgICAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgaTogW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbC5wdXNoKGJsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9nLnB1c2goY29sKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYnVpbGRzIGJsb2NrIG1lc2hlcyBmb3IgZGlzcGxheSBpbiB0aGUgcHJvdmlkZWQgc2NlbmUuICBUaGlzIGlzXG4gKiBnZW5lcmFsbHkgY2FsbGVkIGJ5IHRoZSBTY2FwZVNjZW5lIG9iamVjdCB3aGVuIHlvdSBnaXZlIGl0IGFcbiAqIFNjYXBlRmllbGQsIHNvIHlvdSB3b24ndCBuZWVkIHRvIGNhbGwgaXQgeW91cnNlbGYuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIHRoZSBTY2FwZVNjZW5lIHRoYXQgd2lsbCBiZSBkaXNwbGF5aW5nXG4gKiB0aGlzIFNjYXBlRmllbGQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmJ1aWxkQmxvY2tzID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB2YXIgbWluWiA9IHRoaXMubWluWjtcbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGxheWVySW5kZXggPSAwOyBsYXllckluZGV4IDwgYi5nLmxlbmd0aDsgbGF5ZXJJbmRleCsrKSB7XG4gICAgICAgICAgICBiLmdbbGF5ZXJJbmRleF0uY2h1bmsgPSBuZXcgU2NhcGVDaHVuayhcbiAgICAgICAgICAgICAgICBzY2VuZSwgYiwgbGF5ZXJJbmRleCwgbWluWlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGRvIHRoaXMgdG8gYWRqdXN0IGFsbCB0aGUgY2h1bmsgaGVpZ2h0c1xuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBidWlsZHMgaXRlbSBtZXNoZXMgZm9yIGRpc3BsYXkgaW4gdGhlIHByb3ZpZGVkIHNjZW5lLiAgVGhpcyBpc1xuICogZ2VuZXJhbGx5IGNhbGxlZCBieSB0aGUgU2NhcGVTY2VuZSBvYmplY3Qgd2hlbiB5b3UgZ2l2ZSBpdCBhXG4gKiBTY2FwZUZpZWxkLCBzbyB5b3Ugd29uJ3QgbmVlZCB0byBjYWxsIGl0IHlvdXJzZWxmLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSB0aGUgU2NhcGVTY2VuZSB0aGF0IHdpbGwgYmUgZGlzcGxheWluZ1xuICogdGhpcyBTY2FwZUZpZWxkLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5idWlsZEl0ZW1zID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaXRlbUluZGV4ID0gMDsgaXRlbUluZGV4IDwgYi5pLmxlbmd0aDsgaXRlbUluZGV4KyspIHtcbiAgICAgICAgICAgIGIuaVtpdGVtSW5kZXhdLmFkZFRvU2NlbmUoc2NlbmUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFkdmlzZSB0aGUgc2NlbmUsIGlmIHdlIGhhdmUgb25lLCB0aGF0IHRoZXJlIGFyZSBuZXcgaXRlbXMuXG5TY2FwZUZpZWxkLnByb3RvdHlwZS51cGRhdGVJdGVtcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zY2VuZSkge1xuICAgICAgICB0aGlzLl9zY2VuZS5yZWZyZXNoSXRlbXMoKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHVwZGF0ZSBhbiBpdGVtLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUudXBkYXRlSXRlbSA9IGZ1bmN0aW9uKGl0ZW0sIHVwZGF0ZXMpIHtcblxuICAgIC8vIHJlbW92ZSBvbGQgY2xpY2thYmxlc1xuICAgIGl0ZW0uZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgdmFyIGNpID0gdGhpcy5jbGlja2FibGVzLmluZGV4T2YoY3ApO1xuICAgICAgICBpZiAoY2kgIT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuY2xpY2thYmxlcy5zcGxpY2UoY2ksIDEpO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICBpdGVtLnVwZGF0ZSh1cGRhdGVzKTtcbiAgICAvLyBUT0RPOiB3aGF0IGlmICh4LHkpIHBvc2l0aW9uIGlzIHVwZGF0ZWQ/XG5cbiAgICAvLyBhZGQgbmV3IGNsaWNrYWJsZXNcbiAgICBpdGVtLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIHRoaXMuY2xpY2thYmxlcy5wdXNoKGNwKTtcbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUFsbEl0ZW1zKCk7XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBpdGVtTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgdGhlSXRlbSA9IGl0ZW1MaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEl0ZW0odGhlSXRlbSk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlSXRlbXMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVtb3ZlQWxsSXRlbXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVhY2hCbG9jayhmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIGZvciAodmFyIGluZGV4PTA7IGluZGV4IDwgYmxvY2suaS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIGJsb2NrLmlbaW5kZXhdLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBibG9jay5pID0gW107XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5jbGlja2FibGVzID0gW107XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW0gPSBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudCBibG9ja1xuICAgIHZhciBwYXJlbnRCbG9jayA9IHRoaXMuZ2V0QmxvY2soaXRlbS54LCBpdGVtLnkpO1xuICAgIHBhcmVudEJsb2NrLmkucHVzaChpdGVtKTtcblxuICAgIGl0ZW0uZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgdGhpcy5jbGlja2FibGVzLnB1c2goY3ApO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gc2V0IGl0ZW0gaGVpZ2h0IHRvIHRoZSBwYXJlbnQgYmxvY2sncyBncm91bmQgaGVpZ2h0XG4gICAgaXRlbS5zZXRIZWlnaHQocGFyZW50QmxvY2suZ1swXS56KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zT2ZUeXBlID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9pdGVtcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaXRlbUxpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIGl0ZW1JbmZvID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbShuZXcgU2NhcGVJdGVtKGl0ZW1JbmZvLnR5cGUsIGl0ZW1JbmZvLngsIGl0ZW1JbmZvLnksIGl0ZW1JbmZvKSk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgY2xhaW1zIG9mIHRoZSBncm91bmQgaGVpZ2h0IGF0IHZhcmlvdXMgcG9pbnRzLlxuICogVW5saWtlIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LCB0aGlzXG4gKiBtZXRob2Qgd2lsbCByZS1leHRyYXBvbGF0ZSBncm91bmQgaGVpZ2h0cyBhY3Jvc3MgdGhlIEZpZWxkIChzb1xuICogeW91IGRvbid0IG5lZWQgdG8gY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IHlvdXJzZWxmKS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBoZWlnaHRMaXN0IEEgbGlzdCBvZiBvYmplY3RzLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgemAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oaGVpZ2h0TGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGhlaWdodExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gaGVpZ2h0TGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRIZWlnaHQocHQueCwgcHQueSwgcHQueik7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBjbGFpbSB0aGF0IHRoZSBncm91bmQgaGVpZ2h0IGlzIGB6YCBhdCBwb2ludCBgeGAsYHlgLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gZXZlbnR1YWxseSBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30gYWZ0ZXIgc29cbiAqIGdyb3VuZCBoZWlnaHRzIGdldCBleHRyYXBvbGF0ZWQgYWNyb3NzIHRoZSBlbnRpcmUgRmllbGQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFkgY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgaGVpZ2h0IG9mIHRoZSBncm91bmQgYXQgcG9zaXRpb24gYHhgLGB5YFxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5wdXNoKHsgeDogeCwgeTogeSwgejogeiB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYWRkaXRpb25hbCBncm91bmQgc3RhY2tzIHRvIHRoZSBmaWVsZCdzIGdyb3VuZCBzdGFja3MuXG4gKiBUaGUgZ3JvdW5kTGlzdCBpcyBhbiBhcnJheSBvZiBkYXRhIG9iamVjdHMuICBFYWNoIG9iamVjdCBuZWVkcyB4LFxuICogeSBhbmQgeiBwcm9wZXJ0aWVzLCBhbmQgYSAnc3RhY2snIHByb3BlcnR5LCBlYWNoIG1hdGNoaW5nIHRoZVxuICogY29ycmVzcG9uZGluZyBhcmcgdG8gYWRkR3JvdW5kU3RhY2suXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHJlcGxhY2UgaWYgcmVwbGFjZSBpcyB0cnV0aHksIGRpc2NhcmQgZXhpc3RpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBncm91bmQgcG9pbnRzIGZpcnN0LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFja3MgPSBmdW5jdGlvbihncm91bmRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBncm91bmRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGdyb3VuZExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kU3RhY2socHQueCwgcHQueSwgcHQuc3RhY2spO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRTdGFja3MoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBncm91bmQgc3RhY2sgYXQgeCx5LCBzdGFydGluZyBhdCBoZWlnaHQgei5cbiAqIFRoZSBzdGFjayBpcyBhbiBhcnJheSBvZiB0d28tZWxlbWVudCBhcnJheXMgd2l0aCBhIE1hdGVyaWFsXG4gKiBhbmQgYSBkZXB0aCBudW1iZXIsIGxpa2UgdGhpczpcbiAqIFtcbiAqICAgICBbTWF0ZXJpYWwubGVhZkxpdHRlciwgMC4zXSxcbiAqICAgICBbTWF0ZXJpYWwuZGlydCwgMy41XSxcbiAqICAgICBbTWF0ZXJpYWwuc3RvbmUsIDRdXG4gKiBdXG4gKiBUaGF0IHB1dHMgYSBsZWFmbGl0dGVyIGxheWVyIDAuMyB1bml0cyBkZWVwIG9uIGEgMy41LXVuaXRcbiAqIGRlZXAgZGlydCBsYXllciwgd2hpY2ggaXMgb24gYSBzdG9uZSBsYXllci4gIElmIHRoZSBmaW5hbFxuICogbGF5ZXIncyBkZXB0aCBpcyB6ZXJvLCB0aGF0IGxheWVyIGlzIGFzc3VtZWQgdG8gZ28gYWxsIHRoZVxuICogd2F5IHRvIG1pblouXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBjYWxjR3JvdW5kKCkgYWZ0ZXIuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oeCwgeSwgc3RhY2spIHtcbiAgICAvLyBUT0RPOiBjaGVjayBmb3IgdmFsaWRpdHlcbiAgICB0aGlzLl9ncm91bmRTdGFja3MucHVzaCh7IHg6IHgsICB5OiB5LCAgc3RhY2s6IHN0YWNrIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBoZWlnaHQuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIGhlaWdodCBjbGFpbXMgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0uXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBmaW5kIGhlaWdodCBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgYWxsb3dpbmcgZWFjaFxuICAgICAgICAvLyBrbm93biBncm91bmQgaGVpZ2h0IHRvIFwidm90ZVwiIHVzaW5nIHRoZSBpbnZlcnNlIG9mXG4gICAgICAgIC8vIGl0J3Mgc3F1YXJlZCBkaXN0YW5jZSBmcm9tIHRoZSBjZW50cmUgb2YgdGhlIGJsb2NrLlxuICAgICAgICB2YXIgaCwgZHgsIGR5LCBkaXN0LCB2b3RlU2l6ZTtcbiAgICAgICAgdmFyIGJaID0gMDtcbiAgICAgICAgdmFyIHZvdGVzID0gMDtcbiAgICAgICAgZm9yICh2YXIgZ2g9MDsgZ2ggPCB0aGlzLl9ncm91bmRIZWlnaHRzLmxlbmd0aDsgZ2grKykge1xuICAgICAgICAgICAgaCA9IHRoaXMuX2dyb3VuZEhlaWdodHNbZ2hdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIGgueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBoLnk7XG4gICAgICAgICAgICBkaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICB2b3RlU2l6ZSA9IDEgLyBkaXN0O1xuICAgICAgICAgICAgYlogKz0gaC56ICogdm90ZVNpemU7XG4gICAgICAgICAgICB2b3RlcyArPSB2b3RlU2l6ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgZGl2aWRlIHRvIGZpbmQgdGhlIGF2ZXJhZ2VcbiAgICAgICAgYlogPSBiWiAvIHZvdGVzO1xuXG4gICAgICAgIC8vIGJsb2NrLWlzaCBoZWlnaHRzOiByb3VuZCB0byB0aGUgbmVhcmVzdCBfYlpcbiAgICAgICAgdmFyIGRpZmZaID0gYlogLSB0aGlzLm1pblo7XG4gICAgICAgIGJaID0gdGhpcy5taW5aICsgTWF0aC5yb3VuZChkaWZmWiAvIHRoaXMuX2JaKSAqIHRoaXMuX2JaO1xuXG4gICAgICAgIC8vIG9rYXkgbm93IHdlIGtub3cgYSBoZWlnaHQhICBzZXQgaXRcbiAgICAgICAgdGhpcy5zZXRCbG9ja0hlaWdodChibG9jaywgYlopO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIHN0YWNrcy4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgc3RhY2tzIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZFN0YWNrIGFkZEdyb3VuZFN0YWNrfS5cbiAqXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRTdGFja3MgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIG1ha2UgdGhlIHN0YWNrIGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBjb3B5aW5nIHRoZVxuICAgICAgICAvLyBuZWFyZXN0IGRlZmluZWQgc3RhY2suXG4gICAgICAgIHZhciBzLCBkeCwgZHksIHRoaXNEaXN0LCBiZXN0U3RhY2s7XG4gICAgICAgIHZhciBiZXN0RGlzdCA9IHRoaXMud1ggKyB0aGlzLndZICsgdGhpcy53WjtcbiAgICAgICAgYmVzdERpc3QgPSBiZXN0RGlzdCAqIGJlc3REaXN0O1xuICAgICAgICBmb3IgKHZhciBncz0wOyBncyA8IHRoaXMuX2dyb3VuZFN0YWNrcy5sZW5ndGg7IGdzKyspIHtcbiAgICAgICAgICAgIHMgPSB0aGlzLl9ncm91bmRTdGFja3NbZ3NdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIHMueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBzLnk7XG4gICAgICAgICAgICB0aGlzRGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgaWYgKHRoaXNEaXN0IDwgYmVzdERpc3QpIHtcbiAgICAgICAgICAgICAgICBiZXN0U3RhY2sgPSBzO1xuICAgICAgICAgICAgICAgIGJlc3REaXN0ID0gdGhpc0Rpc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBva2F5IHdlIGdvdCBhIHN0YWNrLlxuICAgICAgICB0aGlzLnNldEdyb3VuZFN0YWNrKGJsb2NrLCBiZXN0U3RhY2suc3RhY2spO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLl9jYWxjQ2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY2FsY3VsYXRlIHRoZSBjZW50cmUgb2YgdGhlIGZpZWxkIGFuZCByZWNvcmQgaXQgYXMgLmNlbnRlclxuICAgIHRoaXMuY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICh0aGlzLm1pblggKyB0aGlzLm1heFgpIC8gMixcbiAgICAgICAgKHRoaXMubWluWSArIHRoaXMubWF4WSkgLyAyLFxuICAgICAgICAodGhpcy5taW5aICsgdGhpcy5tYXhaKSAvIDJcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKGJsb2NrLCBzdGFjaykge1xuICAgIHZhciBsYXllckxldmVsID0gYmxvY2suZ1swXS56O1xuICAgIGZvciAodmFyIGxheWVyID0gMDsgbGF5ZXIgPCBzdGFjay5sZW5ndGg7IGxheWVyKyspIHtcbiAgICAgICAgYmxvY2suZ1tsYXllcl0gPSB7XG4gICAgICAgICAgICB6OiBsYXllckxldmVsLFxuICAgICAgICAgICAgZHo6IHN0YWNrW2xheWVyXVsxXSxcbiAgICAgICAgICAgIG06IHN0YWNrW2xheWVyXVswXSxcbiAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIGxheWVyTGV2ZWwgLT0gc3RhY2tbbGF5ZXJdWzFdO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5yZWJ1aWxkQ2h1bmtzID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgaWYgKGJsb2NrLmdbbF0uY2h1bmspIHtcbiAgICAgICAgICAgIGJsb2NrLmdbbF0uY2h1bmsucmVidWlsZCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRCbG9ja0hlaWdodCA9IGZ1bmN0aW9uKGJsb2NrLCB6KSB7XG4gICAgLy8gdG8gc2V0IHRoZSBibG9jayBncm91bmQgaGVpZ2h0LCB3ZSBuZWVkIHRvIGZpbmQgdGhlIGJsb2NrJ3NcbiAgICAvLyBjdXJyZW50IGdyb3VuZCBoZWlnaHQgKHRoZSB6IG9mIHRoZSB0b3AgbGF5ZXIpLCB3b3JrIG91dCBhXG4gICAgLy8gZGlmZiBiZXR3ZWVuIHRoYXQgYW5kIHRoZSBuZXcgaGVpZ2h0LCBhbmQgYWRkIHRoYXQgZGlmZiB0b1xuICAgIC8vIGFsbCB0aGUgbGF5ZXJzLlxuICAgIHZhciBkWiA9IHogLSBibG9jay5nWzBdLno7XG4gICAgdmFyIGRlcHRoO1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBibG9jay5nW2xdLnogKz0gZFo7XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmdldEJsb2NrID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIC8vIHJldHVybiB0aGUgYmxvY2sgdGhhdCBpbmNsdWRlcyAgeCx5XG4gICAgdmFyIGd4ID0gTWF0aC5mbG9vciggKHggLSB0aGlzLm1pblgpIC8gdGhpcy5fYlggKTtcbiAgICB2YXIgZ3kgPSBNYXRoLmZsb29yKCAoeSAtIHRoaXMubWluWSkgLyB0aGlzLl9iWSApO1xuICAgIHJldHVybiAodGhpcy5fZ1tneF1bZ3ldKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW52b2tlIHRoZSBjYWxsYmFjayBlYWNoIGJsb2NrIGluIHR1cm5cbi8vIGNhbGxiYWNrIHNob3VsZCBsb29rIGxpa2U6IGZ1bmN0aW9uKGVyciwgYmxvY2spIHsgLi4uIH1cbi8vIGlmIGVyciBpcyBudWxsIGV2ZXJ5dGhpbmcgaXMgZmluZS4gaWYgZXJyIGlzIG5vdCBudWxsLCB0aGVyZVxuLy8gd2FzIGFuIGVycm9yLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZWFjaEJsb2NrID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcsIG9yZGVyKSB7XG4gICAgaWYgKG9yZGVyID09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcmRlciA9ICd4dXAteXVwJztcbiAgICB9XG4gICAgaWYgKHRoaXNBcmcgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAob3JkZXIgPT0gJ3h1cC15dXAnKSB7XG4gICAgICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLl9nLmxlbmd0aDsgZ3grKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuX2dbMF0ubGVuZ3RoOyBneSsrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBudWxsLCB0aGlzLl9nW2d4XVtneV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVGaWVsZDtcblxuXG5cblxuIiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5cblxuLy8gREVCVUdcbnZhciBTY2FwZUl0ZW1zID0gcmVxdWlyZSgnLi9pdGVtdHlwZXMnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGl0ZW0gdGhhdCBtaWdodCBhcHBlYXIgaW4gYSBTY2FwZS5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBzZXQgb2YgbWVzaGVzIHVzaW5nXG4gKiB0aGUgbGlua2VkIGl0ZW0gdHlwZSwgYW5kIHBvc2l0aW9uIHRoZW0gYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWRcbiAqIHgseSBsb2NhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIFRoZSBTY2FwZVNjZW5lIHRoZSBpdGVtIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayB0aGF0IG93bnMgdGhpcyBpdGVtXG4gKiBAcGFyYW0ge1NjYXBlSXRlbVR5cGV9IGl0ZW1UeXBlIFR5cGUgb2YgdGhpcyBpdGVtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUl0ZW0oaXRlbVR5cGUsIHgsIHksIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIHRoaXMuX3R5cGUgPSBpdGVtVHlwZTtcbiAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuX3BvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIDApO1xuXG4gICAgaWYgKHR5cGVvZiB0aGlzLl9vcHRzLmNsaWNrSWQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRoaXMuY2xpY2tJZCA9IHRoaXMuX29wdHMuY2xpY2tJZDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBtYXliZSBoYXZlIGEgc2V0IG9mIG1lc2hlcyBmb3IgZWFjaCBzY2VuZSwgc28gYW4gaXRlbVxuICAgIC8vIGNhbiBiZSBpbiBtdWx0aXBsZSBzY2VuZXM/XG4gICAgdGhpcy5fY3JlYXRlTmV3KCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUl0ZW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVJdGVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlSXRlbTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fY3JlYXRlTmV3ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcyAmJiB0aGlzLl9tZXNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl9kaXNwb3NlT2ZNZXNoZXMoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX2NsaWNrUG9pbnRzICYmIHRoaXMuX2NsaWNrUG9pbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbiAgICB9XG5cbiAgICB2YXIgdGhpbmdzID0gdGhpcy5fdHlwZSh0aGlzLl9vcHRzKTtcblxuICAgIHRoaXMuX21lc2hlcyA9IHRoaW5ncy5tZXNoZXM7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fY2xpY2tQb2ludHMgPSB0aGluZ3MuY2xpY2tQb2ludHM7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBjcC5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlRnJvbVNjZW5lKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVkT3B0aW9ucykge1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKHVwZGF0ZWRPcHRpb25zKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbih6KSB7XG4gICAgdGhpcy5fcG9zLnNldFooeik7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgY3AucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmFkZFRvU2NlbmUgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBzY2VuZS5hZGQobSk7XG4gICAgfSk7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBzY2VuZS5hZGQoY3ApO1xuICAgIH0pO1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX2Rpc3Bvc2VPZk1lc2hlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBpZiAobS5nZW9tZXRyeSkgbS5nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgIG0uZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2Rpc3Bvc2UnfSk7XG4gICAgfSk7XG4gICAgLy8gVE9ETzogZGlzcG9zZSBvZiBjbGlja1BvaW50c1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl9kaXNwb3NlT2ZDbGlja1BvaW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgaWYgKGNwLmdlb21ldHJ5KSBjcC5nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgIGNwLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdkaXNwb3NlJ30pO1xuICAgIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLnJlbW92ZUZyb21TY2VuZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zY2VuZSkge1xuICAgICAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lLnJlbW92ZShtKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lLnJlbW92ZShjcCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSB0aGlzLl9zY2VuZTsgLy8gcmVtZW1iZXIgdGhpcyBiZWNhdXNlIHJlbW92ZUZyb21TY2VuZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aWxsIGRlbGV0ZSB0aGlzLl9zY2VuZVxuICAgIGlmICh0aGlzLl9zY2VuZSkgeyB0aGlzLnJlbW92ZUZyb21TY2VuZSgpOyB9XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcblxuICAgIHRoaXMuX2NyZWF0ZU5ldygpO1xuICAgIGlmIChzY2VuZSkgeyB0aGlzLmFkZFRvU2NlbmUoc2NlbmUpOyB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGRvIHNvbWV0aGluZyB0byBlYWNoIGNsaWNrUG9pbnRcblNjYXBlSXRlbS5wcm90b3R5cGUuZWFjaENsaWNrUG9pbnQgPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGlmICh0aGlzLl9jbGlja1BvaW50cykge1xuICAgICAgICBmb3IgKHZhciBjcCA9IDA7IGNwIDwgdGhpcy5fY2xpY2tQb2ludHMubGVuZ3RoOyBjcCsrKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMuX2NsaWNrUG9pbnRzW2NwXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGRvIHNvbWV0aGluZyB0byBlYWNoIG1lc2hcblNjYXBlSXRlbS5wcm90b3R5cGUuZWFjaE1lc2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGlmICh0aGlzLl9tZXNoZXMpIHtcbiAgICAgICAgZm9yICh2YXIgbSA9IDA7IG0gPCB0aGlzLl9tZXNoZXMubGVuZ3RoOyBtKyspIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5fbWVzaGVzW21dKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW07XG4iLCJcbi8qKlxuICogQSBiYWcgb2YgaXRlbSB0eXBlcyB0aGF0IHNjYXBlcyBjYW4gaGF2ZSBpbiB0aGVtLiAgQW4gaXRlbSB0eXBlXG4gKiBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgb3B0aW9ucyBkZXNjcmliaW5nIHRoZSBpdGVtLCBhbmQgcmV0dXJuc1xuICogYW4gYXJyYXkgb2YgbWVzaGVzIHRoYXQgYXJlIHRoZSBpdGVtIChhdCAwLDAsMCkuXG4gKlxuICogV2hlbiBhIFNjYXBlSXRlbSBpcyBpbnN0YW50aWF0ZWQgaXQgaW52b2tlcyB0aGUgYXBwcm9wcmlhdGUgaXRlbVxuICogdHlwZSB0byBnZXQgbWVzaGVzLCB0aGVuIHJlLXBvc2l0aW9ucyB0aGUgbWVzaGVzIGF0IHRoZVxuICogYXBwcm9wcmlhdGUgeCx5LHogbG9jYXRpb24uXG4gKlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgU2NhcGVJdGVtcyA9IHtcbiAgICAvLyBkb2N1bWVudGF0aW9uIGZvciBpdGVtcyBhcmUgaW4gdGhlIC4vaXRlbXR5cGVzLyogZmlsZXNcbiAgICBjdWJlOiAgICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy9jdWJlJyksXG4gICAgdHJlZTogICAgICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvdHJlZScpLFxuICAgIGNyYW5lOiAgICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL2NyYW5lJyksXG4gICAgc29pbFBpdDogICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvc29pbHBpdCcpLFxuICAgIGxlYWZMaXR0ZXJDYXRjaGVyOiAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvbGVhZmxpdHRlcmNhdGNoZXInKSxcblxuICAgIC8vIGxhYmVsOiAgICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL2xhYmVsJyksXG4gICAgY2FtTGFiZWw6ICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvY2FtbGFiZWwnKVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW1zO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcbnZhciBTY2FwZUNsaWNrYWJsZSA9IHJlcXVpcmUoJy4vY2xpY2thYmxlJyk7XG5cbnZhciBNNCA9IFRIUkVFLk1hdHJpeDQ7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFBhcnRzIHRoZSBtZXNoIGFuZCBjbGlja1BvaW50IGNvbGxlY3Rpb25cbiAgKiAgICAgICAgdGhhdCBpcyB0aGUgdGhpbmcgdGhlIGNhbWVyYSBpcyBtb3VudGVkIG9uXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHBhcmVudCdzIG9wdGlvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gaW50ZXJuYWxzIGludGVybmFsIGNhbGN1bGF0aW9ucyBtYWtlIGJ5IHRoZVxuICAqICAgICAgICBwYXJlbnQgb2JqZWN0IGZhY3RvcnlcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlQ2FtZXJhQWRkb24ocGFyZW50UGFydHMsIG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHsgbWVzaE5hbWVzOiBbXSB9O1xuXG5cdC8vIHRyYW5zZm9ybXMgd2UgbWlnaHQgbmVlZDpcblx0Ly8gcm90YXRlIHNvIGl0J3MgaGVpZ2h0IGlzIGFsb25nIHRoZSBaIGF4aXMgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLyBzcGVjaWFsIGNvbnZlbmllbmNlOiBpZiBvcHRpb25zLmNhbWVyYSBpcyBhIHN0cmluZyxcblx0Ly8gdXNlIHRoYXQgc3RyaW5nIGFzIHRoZSBjbGlja0RhdGEgYW5kIHVzZSBkZWZhdWx0cyBmb3Jcblx0Ly8gZXZlcnl0aGluZyBlbHNlLlxuXHRpZiAodHlwZW9mIG9wdGlvbnMuY2FtZXJhID09PSAnc3RyaW5nJykge1xuXHRcdG9wdGlvbnMuY2FtZXJhID0geyBjbGlja0RhdGE6IG9wdGlvbnMuY2FtZXJhIH07XG5cdH1cblxuXHR2YXIgYyA9IHt9O1xuXG5cdGMubmFtZSA9IG9wdGlvbnMuY2FtZXJhLm5hbWUgfHwgJ2NhbWVyYSc7XG5cblx0Yy5oZWlnaHQgPSBvcHRpb25zLmNhbWVyYS5oZWlnaHQgfHwgMztcblx0Yy54ID0gMDtcblx0Yy55ID0gMDtcblxuXHRjLmJvZHlXaWR0aCA9IG9wdGlvbnMuY2FtZXJhLnNpemUgfHwgMjtcblx0Yy5ib2R5SGVpZ2h0ID0gYy5ib2R5V2lkdGg7XG5cdGMuYm9keURlcHRoID0gMC42NyAqIGMuYm9keVdpZHRoO1xuXG5cdGMubGVuc0xlbmd0aCA9IDAuMzMgKiBjLmJvZHlXaWR0aDtcblx0Yy5sZW5zUmFkaXVzID0gTWF0aC5taW4oYy5ib2R5V2lkdGgsIGMuYm9keUhlaWdodCkgLyA0O1xuXG5cdGMuZ2xhc3NMZW5ndGggPSBjLmxlbnNSYWRpdXMgLyA4O1xuXHRjLmdsYXNzUmFkaXVzID0gYy5sZW5zUmFkaXVzIC0gYy5nbGFzc0xlbmd0aDtcblxuXHRjLmJvZHlTdHVmZiA9IG9wdGlvbnMuY2FtZXJhLmJvZHkgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblx0Yy5sZW5zU3R1ZmYgPSBvcHRpb25zLmNhbWVyYS5sZW5zIHx8IFNjYXBlU3R1ZmYuYmxhY2s7XG5cdGMuZ2xhc3NTdHVmZiA9IG9wdGlvbnMuY2FtZXJhLmdsYXNzIHx8IFNjYXBlU3R1ZmYuZ2xhc3M7XG5cblx0Yy5jbGlja0RhdGEgPSBvcHRpb25zLmNhbWVyYS5jbGlja0RhdGEgfHwgbnVsbDtcblxuXHQvLyB0aGUgcG9zaXRpb24gb2YgdGhlIGNhbWVyYSByZWxhdGl2ZSB0byB0aGUgcGFyZW50IG9iamVjdFxuXHRpZiAoaS50b3dlckhlaWdodCAmJiBpLnRvd2VyV2lkdGggJiYgaS5yaW5nSCkge1xuXHRcdC8vIGl0J3MgYSBjcmFuZSwgcHJvYmFibHkuICBQb3NpdGlvbiB0aGUgY2FtZXJhIGJlbG93IHRoZVxuXHRcdC8vIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgY3JhbmUgdG93ZXIuXG5cdFx0Yy5oZWlnaHQgPSBvcHRpb25zLmNhbWVyYS5oZWlnaHQgfHwgKGkudG93ZXJIZWlnaHQgLSBpLnJpbmdIIC0gMiAqIGMuYm9keUhlaWdodCk7XG5cdFx0Yy54ID0gKGkudG93ZXJXaWR0aCArIGMuYm9keURlcHRoICsgYy5sZW5zTGVuZ3RoKS8yO1xuXHR9XG5cblx0dmFyIHJlbG9jYXRlID0gbmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGMueCwgYy55LCBjLmhlaWdodCk7XG5cblx0Ly8gdGhlIGNhbWVyYSBib2R5XG5cdHZhciBib2R5R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShjLmJvZHlEZXB0aCwgYy5ib2R5V2lkdGgsIGMuYm9keUhlaWdodCk7XG5cdGJvZHlHZW9tLmFwcGx5TWF0cml4KCBuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiAoYy5ib2R5RGVwdGgvMiAtIChjLmJvZHlEZXB0aCAtIGMubGVuc0xlbmd0aCkvMiksIDAsIGMuYm9keUhlaWdodC8yKVxuXHRcdC5tdWx0aXBseShyZWxvY2F0ZSlcblx0KTtcblx0dmFyIGJvZHkgPSBuZXcgVEhSRUUuTWVzaChib2R5R2VvbSwgYy5ib2R5U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKGJvZHkpO1xuXHRwYXJlbnRQYXJ0cy5tZXNoZXMucHVzaChib2R5KTtcblxuXHQvLyB0aGUgbGVuc1xuXHR2YXIgbGVuc0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShjLmxlbnNSYWRpdXMsIGMubGVuc1JhZGl1cywgYy5sZW5zTGVuZ3RoKTtcblx0bGVuc0dlb20uYXBwbHlNYXRyaXgoIG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbihjLmxlbnNMZW5ndGgvMiArIChjLmJvZHlEZXB0aCAtIGMubGVuc0xlbmd0aCkvMiwgMCwgYy5ib2R5SGVpZ2h0LzIpXG5cdFx0Lm11bHRpcGx5KHJlbG9jYXRlKVxuXHRcdC5tdWx0aXBseShuZXcgTTQoKS5tYWtlUm90YXRpb25aKE1hdGguUEkvMikpXG5cdCk7XG5cdHZhciBsZW5zID0gbmV3IFRIUkVFLk1lc2gobGVuc0dlb20sIGMubGVuc1N0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaChsZW5zKTtcblx0cGFyZW50UGFydHMubWVzaGVzLnB1c2gobGVucyk7XG5cblx0Ly8gdGhlIGdsYXNzIGxlbnMgYml0XG5cdHZhciBnbGFzc0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShjLmdsYXNzUmFkaXVzLCBjLmdsYXNzUmFkaXVzLCBjLmdsYXNzTGVuZ3RoKTtcblx0Z2xhc3NHZW9tLmFwcGx5TWF0cml4KCBuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMC41ICogKGMuYm9keURlcHRoICsgYy5sZW5zTGVuZ3RoICsgYy5nbGFzc0xlbmd0aCksIDAsIGMuYm9keUhlaWdodC8yKVxuXHRcdC5tdWx0aXBseShyZWxvY2F0ZSlcblx0XHQubXVsdGlwbHkobmV3IE00KCkubWFrZVJvdGF0aW9uWihNYXRoLlBJLzIpKVxuXHQpO1xuXHR2YXIgZ2xhc3MgPSBuZXcgVEhSRUUuTWVzaChnbGFzc0dlb20sIGMuZ2xhc3NTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goZ2xhc3MpO1xuXHRwYXJlbnRQYXJ0cy5tZXNoZXMucHVzaChnbGFzcyk7XG5cblx0Ly8gdGhlIGNhbWVyYSBzaG91bGQgYmUgY2xpY2thYmxlXG5cdGlmIChjLmNsaWNrRGF0YSkge1xuXHRcdHZhciBjYW1DbGljayA9IFNjYXBlQ2xpY2thYmxlKGMubmFtZSwgYy5jbGlja0RhdGEsIGMueCwgYy55LCBjLmhlaWdodCArIGMuYm9keUhlaWdodC8yKTtcblx0XHRwYXJlbnRQYXJ0cy5jbGlja1BvaW50cy5wdXNoKGNhbUNsaWNrKTtcblx0fVxuXG5cdGkuY2FtZXJhID0gYztcblxuXHRyZXR1cm4gcGFyZW50UGFydHM7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ2FtZXJhQWRkb247XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi8uLi9zdHVmZicpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIENsaWNrYWJsZSBvYmplY3QuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB1c2VkIHRvIHNwZWNpZnkgcHJvcGVydGllcyBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmRpYW1ldGVyPTEgRGlhbWV0ZXIgb2YgdHJ1bmsgKGEuay5hLiBEQkgpXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5oZWlnaHQ9MTAgSGVpZ2h0IG9mIHRyZWVcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMudHJ1bmtNYXRlcmlhbD1TY2FwZVN0dWZmLndvb2QgV2hhdCB0byBtYWtlIHRoZSB0cnVuayBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMubGVhZk1hdGVyaWFsPVNjYXBlU3R1ZmYuZm9saWFnZSBXaGF0IHRvIG1ha2UgdGhlIGZvbGlhZ2Ugb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnRyZWVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDbGlja2FibGUobmFtZSwgY2xpY2tEYXRhLCB4LCB5LCB6KSB7XG5cdHZhciBjbGlja2VyID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG5cblx0dmFyIGhvdmVyUmFkaXVzID0gODtcblx0dmFyIGNsaWNrUmFkaXVzID0gMy41O1xuXHR2YXIgbGluZUxlbmd0aCA9IDg7XG5cblx0dmFyIHRyYW5zbGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKHgsIHksIHopO1xuXG5cdGhvdmVyTWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBjb2xvcjogMHhmZmZmMDAsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjMgfSlcblx0dmFyIGhvdmVyR2VvbSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeShob3ZlclJhZGl1cyk7XG5cdGhvdmVyR2VvbS5hcHBseU1hdHJpeCh0cmFuc2xhdGUpO1xuXHR2YXIgaG92ZXJCdWJibGUgPSBuZXcgVEhSRUUuTWVzaChob3Zlckdlb20sIGhvdmVyTWF0ZXJpYWwpO1xuXHRob3ZlckJ1YmJsZS52aXNpYmxlID0gZmFsc2U7XG5cdGNsaWNrZXIuYWRkKGhvdmVyQnViYmxlKTtcblxuXHR2YXIgY2xpY2tHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KGNsaWNrUmFkaXVzLCAxNiwgMTIpO1xuXHRjbGlja0dlb20uYXBwbHlNYXRyaXgodHJhbnNsYXRlKTtcblx0dmFyIGNsaWNrQnViYmxlID0gbmV3IFRIUkVFLk1lc2goY2xpY2tHZW9tLCBTY2FwZVN0dWZmLnVpU3VnZ2VzdCk7XG5cdGNsaWNrQnViYmxlLnVzZXJEYXRhLmNsaWNrRGF0YSA9IGNsaWNrRGF0YTtcblx0Y2xpY2tlci5hZGQoY2xpY2tCdWJibGUpO1xuXG5cdC8vIC8vIGFkZCB0aGUgbmFtZSBzdHVmZiB0byBjbGlja0J1YmJsZSBpbnN0ZWFkXG5cdGNsaWNrQnViYmxlLnVzZXJEYXRhLm5hbWUgPSBuYW1lO1xuXHRjbGlja0J1YmJsZS51c2VyRGF0YS5vZmZzZXQgPSB0cmFuc2xhdGU7XG5cdC8vIGNsaWNrQnViYmxlLnVzZXJEYXRhLm5hbWVQb3NpdGlvbiA9ICggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHQvLyBcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiBjbGlja1JhZGl1cy8zLCAwLCBsaW5lTGVuZ3RoICsgY2xpY2tSYWRpdXMvMilcblx0Ly8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gKTtcblxuXHQvLyAvLy8vLy8vLy8vIGlkZW50aWZpZXIgZmxhZ1xuXHQvLyB2YXIgaWRlbnQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuXHQvLyAvLy8vLy8vLy8vLyBoYXZpbmcgdGV4dCBhbHdheXMgdGhlcmUgYnV0IHVzdWFsbHkgaW52aXNpYmxlIHdhcyBNVVJERVJJTkcgcmFtIHVzYWdlLlxuXHQvLyAvLyAvLyBuYW1lIHRleHRcblx0Ly8gLy8gdmFyIG5hbWVHZW9tID0gbmV3IFRIUkVFLlRleHRHZW9tZXRyeShuYW1lLCB7XG5cdC8vIC8vIFx0Zm9udDogJ2hlbHZldGlrZXInLFxuXHQvLyAvLyBcdHNpemU6IGNsaWNrUmFkaXVzLFxuXHQvLyAvLyBcdGhlaWdodDogMC4xXG5cdC8vIC8vIH0pO1xuXHQvLyAvLyBuYW1lR2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHQvLyAvLyBcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiBjbGlja1JhZGl1cy8zLCAwLCBsaW5lTGVuZ3RoICsgY2xpY2tSYWRpdXMvMilcblx0Ly8gLy8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyAvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gLy8gKTtcblx0Ly8gLy8gdmFyIG5hbWUgPSBuZXcgVEhSRUUuTWVzaChuYW1lR2VvbSwgU2NhcGVTdHVmZi51aVdoaXRlKTtcblx0Ly8gLy8gaWRlbnQuYWRkKG5hbWUpO1xuXG5cblx0Ly8gLy8gcG9pbnRlclxuXHQvLyB2YXIgbGluZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeSgwLjEsIDAuMSwgbGluZUxlbmd0aCk7XG5cdC8vIGxpbmVHZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdC8vIFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAwLCBsaW5lTGVuZ3RoIC8gMilcblx0Ly8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gKTtcblxuXHQvLyB2YXIgbGluZSA9IG5ldyBUSFJFRS5NZXNoKGxpbmVHZW9tLCBTY2FwZVN0dWZmLnVpV2hpdGUpO1xuXHQvLyAvLyBsaW5lLnVzZXJEYXRhLnR5cGUgPSAnbmFtZWxpbmUnO1xuXHQvLyBpZGVudC5hZGQobGluZSk7XG5cblx0Ly8gaWRlbnQudmlzaWJsZSA9IGZhbHNlO1xuXHQvLyAvLyBpZGVudC51c2VyRGF0YS50eXBlID0gJ25hbWVhc3NlbWJseSc7XG5cdC8vIGNsaWNrZXIuYWRkKGlkZW50KTtcblxuXHRjbGlja2VyLnZpc2libGUgPSBmYWxzZTtcblx0cmV0dXJuIGNsaWNrZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDbGlja2FibGU7IiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHRyZWVQYXJ0cyB0aGUgbWVzaCBhbmQgY2xpY2tQb2ludCBjb2xsZWN0aW9uIHRoYXQgaXMgYSB0cmVlXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHRyZWUgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlIHRyZWUtbWFrZXJcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlRGVuZHJvbWV0ZXJBZGRvbih0cmVlUGFydHMsIG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdC8vIHN0YXJ0IHdpdGggc3RhbmRhcmQgdHJlZSBtZXNoZXNcblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwgeyBtZXNoTmFtZXM6IFtdIH07XG5cblx0aS5kaWFtID0gaS5kaWFtIHx8IDE7XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBtaWdodCBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuZGVuZHJvbWV0ZXIgaXMgYSBzdHJpbmcsXG5cdC8vIHVzZSB0aGF0IHN0cmluZyBhcyB0aGUgY2xpY2tEYXRhIGFuZCB1c2UgZGVmYXVsdHMgZm9yXG5cdC8vIGV2ZXJ5dGhpbmcgZWxzZS5cblx0aWYgKHR5cGVvZiBvcHRpb25zLmRlbmRyb21ldGVyID09PSAnc3RyaW5nJykge1xuXHRcdG9wdGlvbnMuZGVuZHJvbWV0ZXIgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5kZW5kcm9tZXRlciB9O1xuXHR9XG5cblx0dmFyIGQgPSB7fTtcblxuXHRkLm5hbWUgPSBvcHRpb25zLmRlbmRyb21ldGVyLm5hbWUgfHwgJ2RlbmRyb21ldGVyJztcblxuXHRkLmJhbmRXaWR0aCA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIud2lkdGggfHwgMC41O1xuXHRkLmJhbmRSYWRpdXMgPSBpLnRydW5rUmFkaXVzICsgMC4yICogZC5iYW5kV2lkdGg7XG5cdGQuYmFuZEhlaWdodCA9IE1hdGgubWluKG9wdGlvbnMuZGVuZHJvbWV0ZXIuaGVpZ2h0IHx8IDEuNSwgaS50cnVua0hlaWdodCAtIGQuYmFuZFdpZHRoLzIpO1xuXG5cdGQubWV0ZXJSYWRpdXMgPSBkLmJhbmRXaWR0aDtcblx0ZC5tZXRlckhlaWdodCA9IGQuYmFuZFdpZHRoICogMztcblxuXHRkLm1vdW50UmFkaXVzID0gZC5tZXRlclJhZGl1cyAqIDEuMTtcblx0ZC5tb3VudFdpZHRoID0gZC5tZXRlckhlaWdodCAvIDQ7XG5cblx0ZC5iYW5kU3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLmJhbmQgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblx0ZC5tb3VudFN0dWZmID0gb3B0aW9ucy5kZW5kcm9tZXRlci5tb3VudCB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXHRkLm1ldGVyU3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLm1ldGVyIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cblx0ZC5jbGlja0RhdGEgPSBvcHRpb25zLmRlbmRyb21ldGVyLmNsaWNrRGF0YSB8fCBudWxsO1xuXG5cdC8vIHRoZSBzdGVlbCBiYW5kXG5cdHZhciBiYW5kR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQuYmFuZFJhZGl1cywgZC5iYW5kUmFkaXVzLCBkLmJhbmRXaWR0aCwgMTIsIDEpO1xuXHRiYW5kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgZC5iYW5kSGVpZ2h0KS5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIGJhbmQgPSBuZXcgVEhSRUUuTWVzaChiYW5kR2VvbSwgZC5iYW5kU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlckJhbmQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJhbmQpO1xuXG5cdC8vIHRoZSBtZXRlciBpdHNlbGZcblx0dmFyIG1ldGVyQm90dG9tR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubWV0ZXJSYWRpdXMsIGQubWV0ZXJSYWRpdXMsIDAuNjcgKiBkLm1ldGVySGVpZ2h0LCA3LCAxKTtcblx0bWV0ZXJCb3R0b21HZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMgKyBkLm1ldGVyUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLm1ldGVySGVpZ2h0LzYpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgbWV0ZXJCb3R0b20gPSBuZXcgVEhSRUUuTWVzaChtZXRlckJvdHRvbUdlb20sIGQubWV0ZXJTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyQm90dG9tJyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChtZXRlckJvdHRvbSk7XG5cblx0dmFyIG1ldGVyVG9wR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubWV0ZXJSYWRpdXMvNSwgZC5tZXRlclJhZGl1cywgMC4zMyAqIGQubWV0ZXJIZWlnaHQsIDcsIDEpO1xuXHRtZXRlclRvcEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvMiArIGQubWV0ZXJIZWlnaHQvNikubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBtZXRlclRvcCA9IG5ldyBUSFJFRS5NZXNoKG1ldGVyVG9wR2VvbSwgZC5tZXRlclN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJUb3AnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1ldGVyVG9wKTtcblxuXHQvLyB0aGUgbW91bnRcblx0dmFyIG1vdW50QmFuZEdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShkLm1vdW50UmFkaXVzLCBkLm1vdW50UmFkaXVzLCBkLm1vdW50V2lkdGgsIDcsIDEpO1xuXHRtb3VudEJhbmRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMgKyBkLm1ldGVyUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLmJhbmRXaWR0aC8yICsgZC5tb3VudFdpZHRoLzIpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgbW91bnRCYW5kID0gbmV3IFRIUkVFLk1lc2gobW91bnRCYW5kR2VvbSwgZC5tb3VudFN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJNb3VudEJhbmQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1vdW50QmFuZCk7XG5cblx0dmFyIG1vdW50R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShkLm1vdW50UmFkaXVzLCBkLm1vdW50UmFkaXVzLzIsIGQubW91bnRXaWR0aCk7XG5cdG1vdW50R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLmJhbmRXaWR0aC8yICsgZC5tb3VudFdpZHRoLzIpKTtcblx0dmFyIG1vdW50ID0gbmV3IFRIUkVFLk1lc2gobW91bnRHZW9tLCBkLm1vdW50U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlck1vdW50Jyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChtb3VudCk7XG5cblx0Ly8gdGhlIGRlbmRybyBzaG91bGQgYmUgY2xpY2thYmxlXG5cdGlmIChkLmNsaWNrRGF0YSkge1xuXHRcdHZhciBkZW5kcm9DbGljayA9IFNjYXBlQ2xpY2thYmxlKGQubmFtZSwgZC5jbGlja0RhdGEsIGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvNik7XG5cdFx0dHJlZVBhcnRzLmNsaWNrUG9pbnRzLnB1c2goZGVuZHJvQ2xpY2spO1xuXHR9XG5cblx0aS5kZW5kcm9tZXRlciA9IGQ7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVEZW5kcm9tZXRlckFkZG9uO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHRyZWVQYXJ0cyB0aGUgbWVzaCBhbmQgY2xpY2tQb2ludCBjb2xsZWN0aW9uIHRoYXQgaXMgYSB0cmVlXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHRyZWUgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlIHRyZWUtbWFrZXJcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlU2FwRmxvd01ldGVyQWRkb24odHJlZVBhcnRzLCBvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHQvLyBzdGFydCB3aXRoIHN0YW5kYXJkIHRyZWUgbWVzaGVzXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHsgbWVzaE5hbWVzOiBbXSB9O1xuXG5cdGkuZGlhbSA9IGkuZGlhbSB8fCAxO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuc2FwZmxvd21ldGVyIGlzIGEgc3RyaW5nLFxuXHQvLyB1c2UgdGhhdCBzdHJpbmcgYXMgdGhlIGNsaWNrRGF0YSBhbmQgdXNlIGRlZmF1bHRzIGZvclxuXHQvLyBldmVyeXRoaW5nIGVsc2UuXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zYXBmbG93bWV0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5zYXBmbG93bWV0ZXIgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5zYXBmbG93bWV0ZXIgfTtcblx0fVxuXG5cdHZhciBzID0ge307XG5cblx0cy5uYW1lID0gb3B0aW9ucy5zYXBmbG93bWV0ZXIubmFtZSB8fCAnc2FwIGZsb3cgbWV0ZXInO1xuXG5cdHMuYmFzZVcgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5zaXplIHx8IDE7XG5cdHMuY2FwVyA9IHMuYmFzZVcgKiAxLjI7XG5cdHMuYmFzZVRoaWNrID0gcy5iYXNlVyAvIDI7XG5cdHMuY2FwVGhpY2sgPSBzLmJhc2VUaGljayAqIDEuMTtcblx0cy5sZW5ndGggPSBzLmJhc2VXICogMjtcblx0cy5iYXNlTCA9IHMubGVuZ3RoICogMC42O1xuXHRzLmNhcEwgPSAocy5sZW5ndGggLSBzLmJhc2VMKSAvIDI7XG5cdHMuaGVpZ2h0ID0gTWF0aC5taW4ob3B0aW9ucy5zYXBmbG93bWV0ZXIuaGVpZ2h0IHx8IDMsIGkudHJ1bmtIZWlnaHQgLSBzLmxlbmd0aCk7XG5cblx0cy5iYXNlU3R1ZmYgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5iYXNlIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdHMuY2FwU3R1ZmYgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5jYXAgfHwgU2NhcGVTdHVmZi5ibGFjaztcblxuXHRzLmNsaWNrRGF0YSA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLmNsaWNrRGF0YSB8fCBudWxsO1xuXG5cdHZhciBiYXNlR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzLmJhc2VXLCBzLmJhc2VUaGljaywgcy5iYXNlTCk7XG5cdGJhc2VHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTC8yKVxuXHQpO1xuXHR2YXIgYmFzZSA9IG5ldyBUSFJFRS5NZXNoKGJhc2VHZW9tLCBzLmJhc2VTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3NhcGZsb3dtZXRlcmJhc2UnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJhc2UpO1xuXG5cdHZhciB0b3BDYXBHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHMuY2FwVywgcy5jYXBUaGljaywgcy5jYXBMKTtcblx0dG9wQ2FwR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgLTEgKiAoaS50cnVua1JhZGl1cyArIHMuYmFzZVRoaWNrLzIpLCBzLmhlaWdodCArIHMuYmFzZUwgKyBzLmNhcEwvMilcblx0KTtcblx0dmFyIHRvcENhcCA9IG5ldyBUSFJFRS5NZXNoKHRvcENhcEdlb20sIHMuY2FwU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdzYXBmbG93bWV0ZXJ0b3BjYXAnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKHRvcENhcCk7XG5cblx0dmFyIGJvdHRvbUNhcEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkocy5jYXBXLCBzLmNhcFRoaWNrLCBzLmNhcEwpO1xuXHRib3R0b21DYXBHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5jYXBMLzIpXG5cdCk7XG5cdHZhciBib3R0b21DYXAgPSBuZXcgVEhSRUUuTWVzaChib3R0b21DYXBHZW9tLCBzLmNhcFN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnc2FwZmxvd21ldGVyYm90dG9tY2FwJyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChib3R0b21DYXApO1xuXG5cdC8vIGNsaWNrYWJsZVxuXHRpZiAocy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2xpY2sgPSBTY2FwZUNsaWNrYWJsZShzLm5hbWUsIHMuY2xpY2tEYXRhLCAwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTC8yKTtcblx0XHR0cmVlUGFydHMuY2xpY2tQb2ludHMucHVzaChjbGljayk7XG5cdH1cblxuXHRpLnNhcGZsb3dtZXRlciA9IHM7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTYXBGbG93TWV0ZXJBZGRvbjtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY2FtTGFiZWxcbiAqL1xuZnVuY3Rpb24gU2NhcGVDYW1MYWJlbEZhY3Rvcnkob3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIGxhYmVsID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLnggPSBvcHRpb25zLnggfHwgMDtcblx0aS55ID0gb3B0aW9ucy55IHx8IDA7XG5cdGkueiA9IG9wdGlvbnMueiB8fCAwO1xuXHRpLm9mZnNldCA9IG9wdGlvbnMub2Zmc2V0IHx8IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG5cblx0Ly8gZ2V0IHRoZSBjYW1lcmEgcG9zaXRpb24gYW5kIHZpZXcgZGlyZWN0aW9uXG5cdGkuY2FtUG9zID0gb3B0aW9ucy5jYW1Qb3MgfHwgbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0aS5jYW1EaXIgPSBvcHRpb25zLmNhbURpciB8fCBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAxKTtcblxuXHRjb25zb2xlLmxvZyhpLmNhbVBvcyk7XG5cdGNvbnNvbGUubG9nKGkuY2FtRGlyKTtcblxuXHRpLmxhYmVsVGV4dCA9IG9wdGlvbnMudGV4dDtcblx0aS50ZXh0U2l6ZSA9IG9wdGlvbnMuc2l6ZSB8fCAyO1xuXHRpLnRleHRXaWR0aCA9IGkudGV4dFNpemUgLyAxMDtcblxuXHRpLmxpbmVSYWRpdXMgPSBpLnRleHRXaWR0aCAvIDI7XG5cdGkubGluZUxlbmd0aCA9IG9wdGlvbnMuaGVpZ2h0IHx8IE1hdGgubWF4KDgsIGkudGV4dFNpemUpO1xuXG5cdGkuZG90UmFkaXVzID0gaS5saW5lUmFkaXVzICogMS41O1xuXG5cdGkuZ2xvd1N0dWZmID0gb3B0aW9ucy5nbG93IHx8IFNjYXBlU3R1ZmYudWlIaWdobGlnaHQ7XG5cdGkudGV4dFN0dWZmID0gb3B0aW9ucy5sZXR0ZXJzIHx8IFNjYXBlU3R1ZmYudWlTaG93O1xuXG5cdGkudGV4dFN0dWZmID0gU2NhcGVTdHVmZi5ibGFjaztcblxuXHR2YXIgdHJhbnNsYXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oaS54LCBpLnksIGkueikubXVsdGlwbHkoaS5vZmZzZXQpO1xuXG5cdC8vIC8vIGdsb3dpbmcgYmFsbFxuXHQvLyB2YXIgZ2xvd0dlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMS41LCAzMiwgMjQpO1xuXHQvLyBnbG93R2VvbS5hcHBseU1hdHJpeCh0cmFuc2xhdGUpO1xuXHQvLyBpLm1lc2hOYW1lcy5wdXNoKCdnbG93YnViYmxlJyk7XG5cdC8vIGxhYmVsLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGdsb3dHZW9tLCBpLmdsb3dTdHVmZikpO1xuXG5cdC8vIHRleHQgZm9yIHRoZSBsYWJlbFxuXHR2YXIgbmFtZUdlb20gPSBuZXcgVEhSRUUuVGV4dEdlb21ldHJ5KGkubGFiZWxUZXh0LCB7XG5cdFx0Zm9udDogJ2hlbHZldGlrZXInLFxuXHRcdHNpemU6IGkudGV4dFNpemUsXG5cdFx0aGVpZ2h0OiAwLjFcblx0fSk7XG5cdG5hbWVHZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigtMSAqIGkudGV4dFNpemUvMywgMCwgaS5saW5lTGVuZ3RoICsgaS50ZXh0U2l6ZS8yKVxuXHRcdC5tdWx0aXBseSh0cmFuc2xhdGUpXG5cdFx0Lm11bHRpcGx5KG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdsYWJlbHRleHQnKTtcblx0bGFiZWwubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gobmFtZUdlb20sIGkudGV4dFN0dWZmKSk7XG5cblx0Ly8gLy8gZG90XG5cdC8vIHZhciBkb3RHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuMjUsIDE2LCAxMik7XG5cdC8vIGRvdEdlb20uYXBwbHlNYXRyaXgodHJhbnNsYXRlKTtcblx0Ly8gaS5tZXNoTmFtZXMucHVzaCgnZG90Jyk7XG5cdC8vIGxhYmVsLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGRvdEdlb20sIGkubGluZVN0dWZmKSk7XG5cblx0Ly8gLy8gcG9pbnRlclxuXHQvLyB2YXIgbGluZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLmxpbmVSYWRpdXMsIGkubGluZVJhZGl1cywgaS5saW5lTGVuZ3RoKTtcblx0Ly8gbGluZUdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0Ly8gXHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkubGluZUxlbmd0aCAvIDIpXG5cdC8vIFx0Lm11bHRpcGx5KHRyYW5zbGF0ZSlcblx0Ly8gXHQubXVsdGlwbHkobmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMikpXG5cdC8vICk7XG5cdC8vIGkubWVzaE5hbWVzLnB1c2goJ2xhYmVscG9pbnRlcicpO1xuXHQvLyBsYWJlbC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChsaW5lR2VvbSwgaS5saW5lU3R1ZmYpKTtcblxuXHRyZXR1cm4gbGFiZWw7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ2FtTGFiZWxGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2FtZXJhQWRkb24gPSByZXF1aXJlKCcuL2FkZG9ucy9jYW1lcmEnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBtZXNoIGFycmF5IGZvciBhIHRvd2VyIGNyYW5lLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdXNlZCB0byBzcGVjaWZ5IHByb3BlcnRpZXMgb2YgdGhlIGNyYW5lLlxuXG4gKiBAcGFyYW0ge3dpZHRofSBvcHRpb25zLndpZHRoPTIgV2lkdGggb2YgY3JhbmUgdG93ZXJcbiAqIEBwYXJhbSB7aGVpZ2h0fSBvcHRpb25zLmhlaWdodD01MCBIZWlnaHQgb2YgY3JhbmUgdG93ZXJcbiAqIEBwYXJhbSB7bGVuZ3RofSBvcHRpb25zLmxlbmd0aD00MCBMZW5ndGggb2YgY3JhbmUgYm9vbSwgZnJvbSB0aGVcbiAqICAgICAgICBjcmFuZSdzIGNlbnRyZSBheGlzIHRvIHRoZSB0aXBcbiAqIEBwYXJhbSB7cm90YXRpb259IG9wdGlvbnMucm90YXRpb249MCBEZWdyZWVzIG9mIGJvb20gcm90YXRpb24sXG4gKiAgICAgICAgY291bnRlZCBjbG9ja3dpc2UgZnJvbSB0aGUgK3ZlIFkgZGlyZWN0aW9uIChhd2F5IGZyb21cbiAqICAgICAgICB0aGUgY2FtZXJhKVxuICogQHBhcmFtIHtjb3VudGVyd2VpZ2h0TGVuZ3RofSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHRMZW5ndGg9bGVuZ3RoLzRcbiAqICAgICAgICBMZW5ndGggb2YgdGhlIGNvdW50ZXJ3ZWlnaHQgYm9vbSwgZnJvbSB0aGUgY3JhbmUncyBjZW50cmVcbiAqICAgICAgICBheGlzIHRvIHRoZSBlbmQgb2YgdGhlIGNvdW50ZXJ3ZWlnaHRcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMuc3RydXRzPVNjYXBlU3R1ZmYuZ2xvc3NCbGFja1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgc3RydXRzIGluIHRoZSB0b3dlciBhbmQgYm9vbSBvdXQgb2ZcbiAgKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmJhc2U9U2NhcGVTdHVmZi5jb25jcmV0ZVxuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgYmFzZSBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMucmluZz1TY2FwZVN0dWZmLnBsYXN0aWNcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgdG93ZXIgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmNhYmluPVNjYXBlU3R1ZmYucGxhc3RpY1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY2FiaW4gb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLndpbmRvdz1TY2FwZVN0dWZmLmdsYXNzXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSBjYWJpbiB3aW5kb3cgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHQ9U2NhcGVTdHVmZi5jb25jcmV0ZVxuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY291bnRlcndlaWdodCBvdXQgb2ZcbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY3JhbmVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDcmFuZUZhY3Rvcnkob3B0aW9ucykge1xuXG5cdHZhciBjcmFuZSA9IHsgbWVzaGVzOiBbXSwgY2xpY2tQb2ludHM6IFtdIH07XG5cblx0dmFyIGkgPSB7IG1lc2hOYW1lczogW10gfTtcblxuXHRpLnRvd2VyV2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDI7XG5cdGkuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNTA7XG5cdGkubGVuZ3RoID0gb3B0aW9ucy5sZW5ndGggfHwgNDA7XG5cdGkuY291bnRlcndlaWdodExlbmd0aCA9IG9wdGlvbnMuY291bnRlcndlaWdodExlbmd0aCB8fCAoaS5sZW5ndGggLyA0KTtcblx0aS5zdHJ1dFN0dWZmID0gb3B0aW9ucy5zdHJ1dHMgfHwgU2NhcGVTdHVmZi5nbG9zc0JsYWNrO1xuXHRpLmJhc2VTdHVmZiA9IG9wdGlvbnMuYmFzZSB8fCBTY2FwZVN0dWZmLmNvbmNyZXRlO1xuXHRpLnJpbmdTdHVmZiA9IG9wdGlvbnMucmluZyB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cdGkuY2FiaW5TdHVmZiA9IG9wdGlvbnMuY2FiaW4gfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHRpLndpbmRvd1N0dWZmID0gb3B0aW9ucy53aW5kb3cgfHwgU2NhcGVTdHVmZi5nbGFzcztcblx0aS5jb3VudGVyd2VpZ2h0U3R1ZmYgPSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHQgfHwgU2NhcGVTdHVmZi5jb25jcmV0ZTtcblx0aS5yb3RhdGlvbiA9IC0xICogKG9wdGlvbnMucm90YXRpb24gfHwgMCkgKiBNYXRoLlBJIC8gMTgwO1xuXG5cdGkudG93ZXJIZWlnaHQgPSBpLmhlaWdodDtcblx0aS5iYXNlVyA9IGkudG93ZXJXaWR0aCAqIDM7XG5cdGkuYmFzZUggPSBpLnRvd2VyV2lkdGggKiAyOyAvLyBoYWxmIG9mIHRoZSBoZWlnaHQgd2lsbCBiZSBcInVuZGVyZ3JvdW5kXCJcblxuXHRpLnBvbGVSID0gaS50b3dlcldpZHRoIC8gMTA7XG5cblx0aS5yaW5nUiA9ICgoaS50b3dlcldpZHRoIC8gMikgKiBNYXRoLlNRUlQyKSArIDEuMyAqIGkucG9sZVI7XG5cdGkucmluZ0ggPSBpLnRvd2VyV2lkdGggLyA1O1xuXG5cdGkuYm9vbUwgPSBpLmxlbmd0aDsgLy8gbGVuZ3RoIG9mIGNyYW5lIGJvb21cblx0aS5jd2JMID0gaS5jb3VudGVyd2VpZ2h0TGVuZ3RoOyAvLyBsZW5ndGggb2YgY291bnRlcndlaWdodCBib29tXG5cdGkucm9kTCA9IGkuYm9vbUwgKyBpLmN3Ykw7XG5cdGkuY3dXID0gaS50b3dlcldpZHRoIC0gMyppLnBvbGVSO1xuXHRpLmN3SCA9IGkudG93ZXJXaWR0aCAqIDEuNTtcblx0aS5jd0wgPSBpLnRvd2VyV2lkdGggKiAxLjU7XG5cblx0aS5jYWJpblcgPSBpLnRvd2VyV2lkdGg7XG5cdGkuY2FiaW5IID0gaS50b3dlcldpZHRoICogMS4yNTtcblx0aS5jYWJpbkwgPSBpLmNhYmluSDtcblxuXHQvLyB0aGlzIGlzIGZvciByb3RhdGluZyB0aGUgY3JhbmUgYm9vbVxuXHR2YXIgcm90YXRlID0gbmV3IE00KCkubWFrZVJvdGF0aW9uWihpLnJvdGF0aW9uKTtcblxuXHQvLyB0aGlzIGlzIGZvciBtYWtpbmcgY3lsaW5kZXJzIGdvIHVwcmlnaHQgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciBjeWxpbmRlclJvdGF0ZSA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLy8vLy8vLy8vIHRoZSBiYXNlXG5cdHZhciBiYXNlR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmJhc2VXLCBpLmJhc2VXLCBpLmJhc2VIKTtcblx0dmFyIGJhc2UgPSBuZXcgVEhSRUUuTWVzaChiYXNlR2VvbSwgaS5iYXNlU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdiYXNlJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKGJhc2UpO1xuXG5cdC8vLy8vLy8vLy8gdGhlIHZlcnRpY2FsIG1hc3Rcblx0Ly8gbWFrZSBvbmUgcG9sZSB0byBzdGFydCB3aXRoXG5cdHZhciBwb2xlR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucG9sZVIsIGkucG9sZVIsIGkudG93ZXJIZWlnaHQpO1xuXHRwb2xlR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oaS50b3dlcldpZHRoLzIsIGkudG93ZXJXaWR0aC8yLCBpLnRvd2VySGVpZ2h0LzIpLm11bHRpcGx5KGN5bGluZGVyUm90YXRlKSk7XG5cblx0Ly8gTWFrZSB0aHJlZSBtb3JlIHBvbGVzIGJ5IGNvcHlpbmcgdGhlIGZpcnN0IHBvbGUgYW5kIHJvdGF0aW5nIGFub3RoZXIgOTBkZWdzIGFyb3VuZCB0aGUgY2VudHJlXG5cdHZhciBwb2xlO1xuXHR2YXIgcm90YXRlQXJvdW5kWiA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblooTWF0aC5QSS8yKTtcblx0Zm9yICh2YXIgcCA9IDA7IHAgPCA0OyBwKyspIHtcblx0XHRwb2xlID0gbmV3IFRIUkVFLk1lc2gocG9sZUdlb20sIGkuc3RydXRTdHVmZik7XG5cdFx0aS5tZXNoTmFtZXMucHVzaCgncG9sZScgKyBwKTtcblx0XHRjcmFuZS5tZXNoZXMucHVzaChwb2xlKTtcblx0XHRwb2xlR2VvbSA9IHBvbGVHZW9tLmNsb25lKCk7XG5cdFx0cG9sZUdlb20uYXBwbHlNYXRyaXgocm90YXRlQXJvdW5kWik7XG5cdH1cblxuXG5cdC8vLy8vLy8vLy8gdGhlIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgdG93ZXJcblx0dmFyIHJpbmdHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5yaW5nUiwgaS5yaW5nUiwgaS5yaW5nSCwgMTIsIDEsIHRydWUpO1xuXHRyaW5nR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS50b3dlckhlaWdodCAtIGkucmluZ0gvMikubXVsdGlwbHkoY3lsaW5kZXJSb3RhdGUpKTtcblx0aS5yaW5nU3R1ZmYuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JpbmcnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gocmluZ0dlb20sIGkucmluZ1N0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIHRoZSBob3Jpem9udGFsIGJvb21cblx0Ly8gbWFrZSBvbmUgcm9kIHRvIHN0YXJ0IHdpdGhcblx0dmFyIHRvcFJvZEdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBvbGVSLCBpLnBvbGVSLCBpLnJvZEwpO1xuXG5cdC8vIHRvcCByb2Rcblx0dG9wUm9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgKGkucm9kTC8yKSAtIGkuY3diTCwgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyAwLjUgKiBpLnRvd2VyV2lkdGgpKTtcblx0bGVmdFJvZEdlb20gPSB0b3BSb2RHZW9tLmNsb25lKCk7XG5cdHJpZ2h0Um9kR2VvbSA9IHRvcFJvZEdlb20uY2xvbmUoKTtcblxuXHR0b3BSb2RHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JvZFRvcCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaCh0b3BSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBib3R0b20gbGVmdCByb2Rcblx0bGVmdFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKC0wLjUgKiBpLnRvd2VyV2lkdGggKyBpLnBvbGVSLCAwLCAtMC41ICogaS50b3dlcldpZHRoKSk7XG5cdGxlZnRSb2RHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JvZExlZnQnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gobGVmdFJvZEdlb20sIGkuc3RydXRTdHVmZikpO1xuXG5cdC8vIGJvdHRvbSByaWdodCByb2Rcblx0cmlnaHRSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLjUgKiBpLnRvd2VyV2lkdGggLSBpLnBvbGVSLCAwLCAtMC41ICogaS50b3dlcldpZHRoKSk7XG5cdHJpZ2h0Um9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RSaWdodCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChyaWdodFJvZEdlb20sIGkuc3RydXRTdHVmZikpO1xuXG5cdC8vIGVuZCBvZiB0aGUgYm9vbVxuXHR2YXIgZW5kR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLnRvd2VyV2lkdGgsIGkucG9sZVIsIDAuNSAqIGkudG93ZXJXaWR0aCArIGkucG9sZVIgKyBpLnBvbGVSKTtcblx0ZW5kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgaS5ib29tTCwgaS50b3dlckhlaWdodCArIDAuMjUgKiBpLnRvd2VyV2lkdGggKyBpLnBvbGVSKSk7XG5cdGVuZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnYm9vbUNhcCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChlbmRHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXG5cdC8vLy8vLy8vLy8gY291bnRlcndlaWdodFxuXHR2YXIgY3dHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGkuY3dXLCBpLmN3TCwgaS5jd0gpO1xuXHRjd0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDEuMDAxICogKGkuY3dMLzIgLSBpLmN3YkwpLCBpLnRvd2VySGVpZ2h0KSk7XG5cdGN3R2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdjb3VudGVyd2VpZ2h0Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGN3R2VvbSwgaS5jb3VudGVyd2VpZ2h0U3R1ZmYpKTtcblxuXG5cdC8vLy8vLy8vLy8gY2FiaW5cblx0dmFyIGNhYmluR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmNhYmluVywgaS5jYWJpbkwsIGkuY2FiaW5IKTtcblx0dmFyIHdpbmRvd0dlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5jYWJpblcgKiAxLjEsIGkuY2FiaW5MICogMC42LCBpLmNhYmluSCAqIDAuNik7XG5cdGNhYmluR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oaS5jYWJpblcvMiArIGkucG9sZVIsIDAsIGkuY2FiaW5ILzIgKyBpLnRvd2VySGVpZ2h0ICsgaS5wb2xlUiArIGkucG9sZVIpKTtcblx0d2luZG93R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oaS5jYWJpblcvMiArIGkucG9sZVIsIGkuY2FiaW5MICogMC4yNSwgaS5jYWJpbkggKiAwLjYgKyBpLnRvd2VySGVpZ2h0ICsgaS5wb2xlUiArIGkucG9sZVIpKTtcblx0Y2FiaW5HZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdHdpbmRvd0dlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY2FiaW4nKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goY2FiaW5HZW9tLCBpLmNhYmluU3R1ZmYpKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY2FiaW53aW5kb3cnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2god2luZG93R2VvbSwgaS53aW5kb3dTdHVmZikpO1xuXG5cdC8vLy8vLy8vLy8gY2FtZXJhXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5jYW1lcmEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0Y3JhbmUgPSBTY2FwZUNhbWVyYUFkZG9uKGNyYW5lLCBvcHRpb25zLCBpKTtcblx0fVxuXG5cdC8vIHJldHVybiBhbGwgdGhlIGNyYW5lIGJpdHMuXG5cdHJldHVybiBjcmFuZTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDcmFuZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBjdWJlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBtYXRlcmlhbC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFRoZSBsZW5ndGggb2YgYSBzaWRlIG9mIHRoZSBjdWJlLiAgRGVmYXVsdHMgdG8gMS5cbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG1hdGVyaWFsIFdoYXQgdGhlIG1ha2UgdGhlIGN1YmUgb3V0IG9mLiAgRGVmYXVsdHMgdG8gYFNjYXBlLlN0dWZmLmdlbmVyaWNgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBOb3QgdXNlZC5cbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY3ViZVxuICovXG5mdW5jdGlvbiBTY2FwZUN1YmVGYWN0b3J5KG9wdGlvbnMpIHtcbiAgICAvLyBjb25zdHJ1Y3QgYSBtZXNoIFwic2l0dGluZyBvblwiIHRoZSBwb2ludCAwLDAsMFxuXG4gICAgc2l6ZSA9IG9wdGlvbnMuc2l6ZSB8fCAxO1xuICAgIG1hdGVyaWFsID0gb3B0aW9ucy5tYXRlcmlhbCB8fCBTY2FwZVN0dWZmLmdlbmVyaWM7XG5cbiAgICAvLyBtYWtlcyBhIGN1YmUgY2VudGVyZWQgb24gMCwwLDBcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzaXplLCBzaXplLCBzaXplKTtcblxuICAgIC8vIHRyYW5zZm9ybSBpdCB1cCBhIGJpdCwgc28gd2UncmUgY2VudGVyZWQgb24geCA9IDAgYW5kIHkgPSAwLCBidXQgaGF2ZSB0aGUgX2JvdHRvbV8gZmFjZSBzaXR0aW5nIG9uIHogPSAwLlxuICAgIGdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIHNpemUvMikgKTtcblxuICAgIC8vIHJldHVybiBpdCBpbiBhIGRhdGEgb2JqZWN0XG5cdHJldHVybiB7IG1lc2hlczogW25ldyBUSFJFRS5NZXNoKGdlb20sIG1hdGVyaWFsKV0sIGNsaWNrUG9pbnRzOiBbXSB9O1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUN1YmVGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbnZhciBTY2FwZUNsaWNrYWJsZSA9IHJlcXVpcmUoJy4vYWRkb25zL2NsaWNrYWJsZScpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmxlYWZMaXR0ZXJDYXRjaGVyXG4gKi9cbmZ1bmN0aW9uIFNjYXBlTGVhZkxpdHRlckNhdGNoZXJGYWN0b3J5KG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciBjYXRjaGVyID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLm5hbWUgPSBvcHRpb25zLm5hbWUgfHwgJ2xlYWYgbGl0dGVyIHRyYXAnO1xuXG5cdGkuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMjtcblx0aS53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMC44ICogaS5oZWlnaHQ7XG5cdGkucmluZ1cgPSBpLmhlaWdodCAvIDY7XG5cdGkucG9sZVIgPSBpLndpZHRoIC8gMjA7XG5cdGkucG9sZUggPSBpLmhlaWdodCAtIGkucmluZ1cvMjtcblx0aS5uZXRSID0gaS53aWR0aC8yIC0gaS5wb2xlUjtcblx0aS5uZXRMID0gMC43ICogaS5oZWlnaHQ7XG5cblx0aS5wb2xlU3R1ZmYgPSBvcHRpb25zLnBvbGVzIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdGkucmluZ1N0dWZmID0gb3B0aW9ucy5yaW5nIHx8IGkucG9sZVN0dWZmO1xuXHRpLm5ldFN0dWZmID0gb3B0aW9ucy5uZXQgfHwgU2NhcGVTdHVmZi5zaGFkZWNsb3RoO1xuXG5cdC8vIGN5bGluZGVyLXVwcmlnaHQgcm90YXRpb25cblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIG5ldFxuXHRpLm5ldEcgPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLm5ldFIsIGkubmV0Ui8yMCwgaS5uZXRMLCAxMywgMSwgdHJ1ZSk7IC8vIHRydWUgPSBvcGVuIGVuZGVkXG5cdGkubmV0Ry5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS5oZWlnaHQgLSBpLm5ldEwvMilcblx0XHQubXVsdGlwbHkocm90YXRlKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCduZXQnKTtcblx0aS5uZXRTdHVmZi5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLm5ldEcsIGkubmV0U3R1ZmYpKTtcblxuXHQvLyBuZXQgYWJvdmUgcmluZ1xuXHRpLm5ldFJpbmdHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5uZXRSICogMS4wMSwgaS5uZXRSICogMS4wMSwgaS5yaW5nVy8yLCAxMywgMSwgdHJ1ZSk7IC8vIHRydWUgPSBvcGVuIGVuZGVkXG5cdGkubmV0UmluZ0cuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkuaGVpZ2h0IC0gaS5yaW5nVy80KVxuXHRcdC5tdWx0aXBseShyb3RhdGUpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ25ldHJpbmcnKTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLm5ldFJpbmdHLCBpLm5ldFN0dWZmKSk7XG5cblx0Ly8gcmluZ1xuXHRpLnJpbmdHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5uZXRSLCBpLm5ldFIsIGkucmluZ1csIDEzLCAxLCB0cnVlKTsgLy8gdHJ1ZSA9IG9wZW4gZW5kZWRcblx0aS5yaW5nRy5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS5oZWlnaHQgLSBpLnJpbmdXLzIpXG5cdFx0Lm11bHRpcGx5KHJvdGF0ZSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgncmluZycpO1xuXHRjYXRjaGVyLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGkucmluZ0csIGkucmluZ1N0dWZmKSk7XG5cblx0Ly8gbGVmdCBwb2xlXG5cdGkubGVmdFBvbGVHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5wb2xlUiwgaS5wb2xlUiwgaS5wb2xlSCwgNSk7XG5cdGkubGVmdFBvbGVHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbihpLndpZHRoLy0yLCAwLCBpLnBvbGVILzIpXG5cdFx0Lm11bHRpcGx5KHJvdGF0ZSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgnbGVmdFBvbGUnKTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLmxlZnRQb2xlRywgaS5wb2xlU3R1ZmYpKTtcblxuXHQvLyByaWdodCBwb2xlXG5cdGkucmlnaHRQb2xlRyA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucG9sZVIsIGkucG9sZVIsIGkucG9sZUgsIDUpO1xuXHRpLnJpZ2h0UG9sZUcuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKGkud2lkdGgvMiwgMCwgaS5wb2xlSC8yKVxuXHRcdC5tdWx0aXBseShyb3RhdGUpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JpZ2h0UG9sZScpO1xuXHRjYXRjaGVyLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGkucmlnaHRQb2xlRywgaS5wb2xlU3R1ZmYpKTtcblxuXHQvLyBtYWtlIHRoZSBjYXRjaGVyIGNsaWNrYWJsZVxuXHRpZiAob3B0aW9ucy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2xpY2sgPSBTY2FwZUNsaWNrYWJsZShpLm5hbWUsIG9wdGlvbnMuY2xpY2tEYXRhLCAwLCAwLCBpLnBvbGVIKTtcblx0XHRjYXRjaGVyLmNsaWNrUG9pbnRzLnB1c2goY2xpY2spO1xuXHR9XG5cblx0cmV0dXJuIGNhdGNoZXI7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlTGVhZkxpdHRlckNhdGNoZXJGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbnZhciBTY2FwZUNsaWNrYWJsZSA9IHJlcXVpcmUoJy4vYWRkb25zL2NsaWNrYWJsZScpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnNvaWxQaXRcbiAqL1xuZnVuY3Rpb24gU2NhcGVTb2lsUGl0RmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHR2YXIgcGl0ID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLm5hbWUgPSBvcHRpb25zLm5hbWUgfHwgJ3NvaWwgcGl0JztcblxuXHRpLmJveFMgPSBvcHRpb25zLnNpemUgfHwgMjtcblx0aS5ib3hEID0gaS5ib3hTLzI7XG5cdGkuYm94SCA9IGkuYm94UzsgLy8gaGVpZ2h0IG9mZiBncm91bmRcblxuXHRpLnBpcGVSID0gaS5ib3hELzM7XG5cdGkucGlwZUQgPSBvcHRpb25zLmRlcHRoIHx8IDI7IC8vIHBpcGUgZGVwdGggaW50byBncm91bmRcblx0aS5waXBlTCA9IGkucGlwZUQgKyBpLmJveEg7XG5cdGkucGlwZUwgPSBpLnBpcGVMO1xuXG5cdGkuYm94U3R1ZmYgPSBvcHRpb25zLmJveCB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cdGkucGlwZVN0dWZmID0gb3B0aW9ucy5waXBlIHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblxuXHQvLyBjeWxpbmRlci11cHJpZ2h0IHJvdGF0aW9uXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLyB0aGUgYm94XG5cdGkuYm94RyA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmJveFMsIGkuYm94RCwgaS5ib3hTKTtcblx0aS5ib3hHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbihpLmJveFMvMywgMCwgaS5ib3hIICsgaS5ib3hTLzIpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2JveCcpO1xuXHRwaXQubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goaS5ib3hHLCBpLmJveFN0dWZmKSk7XG5cblx0Ly8gdGhlIHBpcGVcblx0aS5waXBlRyA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucGlwZVIsIGkucGlwZVIsIGkucGlwZUwpO1xuXHRpLnBpcGVHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAwLCAoaS5ib3hIIC0gaS5waXBlRCkvMilcblx0XHQubXVsdGlwbHkocm90YXRlKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdwaXBlJyk7XG5cdHBpdC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLnBpcGVHLCBpLnBpcGVTdHVmZikpO1xuXG5cdC8vIG1ha2UgdGhlIHBpdCBjbGlja2FibGVcblx0aWYgKG9wdGlvbnMuY2xpY2tEYXRhKSB7XG5cdFx0dmFyIGNsaWNrID0gU2NhcGVDbGlja2FibGUoaS5uYW1lLCBvcHRpb25zLmNsaWNrRGF0YSwgaS5ib3hTLzMsIDAsIGkuYm94SCArIGkuYm94Uy8yKTtcblx0XHRwaXQuY2xpY2tQb2ludHMucHVzaChjbGljayk7XG5cdH1cblxuXHRyZXR1cm4gcGl0O1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVNvaWxQaXRGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcblxudmFyIFNjYXBlRGVuZHJvbWV0ZXJBZGRvbiA9IHJlcXVpcmUoJy4vYWRkb25zL2RlbmRyb21ldGVyJyk7XG52YXIgU2NhcGVTYXBGbG93TWV0ZXJBZGRvbiA9IHJlcXVpcmUoJy4vYWRkb25zL3NhcGZsb3dtZXRlcicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSB0cmVlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBjb2xvci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuZGlhbWV0ZXI9MSBEaWFtZXRlciBvZiB0cnVuayAoYS5rLmEuIERCSClcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmhlaWdodD0xMCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy50cnVua01hdGVyaWFsPVNjYXBlU3R1ZmYud29vZCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5sZWFmTWF0ZXJpYWw9U2NhcGVTdHVmZi5mb2xpYWdlIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW50ZXJuYWxzIElmIHN1cHBsaWVkLCB0aGlzIGZhY3Rvcnkgd2lsbCBzYXZlIHNvbWVcbiAqICAgICAgICBpbnRlcmltIGNhbGN1bGF0ZWQgdmFsdWVzIGludG8gdGhpcyBvYmplY3QuICBFLmcuXG4gKiAgICAgICAgdGhlIGhlaWdodCBvZiB0aGUgY2Fub3B5LCB0aGUgTWF0ZXJpYWwgdGhlIHRydW5rIGlzIG1hZGUgb3V0XG4gKiAgICAgICAgb2YsIGV0Yy4gIFRoaXMgY2FuIGhlbHAgYW5vdGhlciBTY2FwZUl0ZW1UeXBlIGZhY3RvcnkgdXNlXG4gKiAgICAgICAgdGhpcyBhcyBhIHN0YXJ0aW5nIHBvaW50LlxuICogQHBhcmFtIHtBcnJheX0gaW50ZXJuYWxzLm1lc2hOYW1lcyBBbiBhcnJheSBvZiBtZXNoIG5hbWVzLCBpbiB0aGVcbiAqICAgICAgICBzYW1lIG9yZGVyIGFzIHRoZSBtZXNoIGxpc3QgcmV0dXJuZWQgYnkgdGhlIGZ1bmN0aW9uLiAgVGhpc1xuICogICAgICAgIGFsbG93cyBkb3duc3RyZWFtIGZhY3RvcnkgZnVuY3Rpb25zIHRvIGlkZW50aWZ5IG1lc2hlcyBpblxuICogICAgICAgIG9yZGVyIHRvIGFsdGVyIHRoZW0uXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnRyZWVcbiAqL1xuZnVuY3Rpb24gU2NhcGVUcmVlRmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHR2YXIgdHJlZSA9IHsgbWVzaGVzOiBbXSwgY2xpY2tQb2ludHM6IFtdIH07XG5cblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwge307XG5cdGkubWVzaE5hbWVzID0gaS5tZXNoTmFtZXMgfHwgW107XG5cblx0aS5kaWFtID0gb3B0aW9ucy5kaWFtZXRlciB8fCAxO1xuXHRpLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDEwO1xuXHRpLnRydW5rU3R1ZmYgPSBvcHRpb25zLnRydW5rIHx8IFNjYXBlU3R1ZmYud29vZDtcblx0aS5jYW5vcHlTdHVmZiA9IG9wdGlvbnMuY2Fub3B5IHx8IFNjYXBlU3R1ZmYudHJhbnNwYXJlbnRGb2xpYWdlO1xuXG5cdGkuY2Fub3B5SGVpZ2h0ID0gaS5oZWlnaHQgLyA0O1xuXHRpLnRydW5rSGVpZ2h0ID0gaS5oZWlnaHQgLSBpLmNhbm9weUhlaWdodDtcblx0aS50cnVua1JhZGl1cyA9IDIgKiBpLmRpYW0gLyAyO1xuXHRpLmNhbm9weVJhZGl1cyA9IGkudHJ1bmtSYWRpdXMgKiA2O1xuXG5cdC8vIHRyYW5zZm9ybXMgd2UgbmVlZDpcblx0Ly8gcm90YXRlIHNvIGl0J3MgaGVpZ2h0IGlzIGFsb25nIHRoZSBaIGF4aXMgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHRpLnRydW5rR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkudHJ1bmtSYWRpdXMvMiwgaS50cnVua1JhZGl1cywgaS50cnVua0hlaWdodCwgNyk7XG5cdC8vIGNlbnRlciBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDBcblx0dmFyIHRydW5rUG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBpLnRydW5rSGVpZ2h0LzIpO1xuXHRpLnRydW5rR2VvbS5hcHBseU1hdHJpeCh0cnVua1Bvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgdHJ1bmsgPSBuZXcgVEhSRUUuTWVzaChpLnRydW5rR2VvbSwgaS50cnVua1N0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgndHJ1bmsnKTtcblx0dHJlZS5tZXNoZXMucHVzaCh0cnVuayk7XG5cblx0aS5jYW5vcHlHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5jYW5vcHlSYWRpdXMsIGkuY2Fub3B5UmFkaXVzLCBpLmNhbm9weUhlaWdodCwgNyk7XG5cdC8vIGNlbnRlciBvbiB4ID0gMCwgeSA9IDAsIGJ1dCBoYXZlIHRoZSBjYW5vcHkgYXQgdGhlIHRvcFxuXHR2YXIgY2Fub3B5UG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBpLmNhbm9weUhlaWdodC8yICsgaS5oZWlnaHQgLSBpLmNhbm9weUhlaWdodCk7XG5cdGkuY2Fub3B5R2VvbS5hcHBseU1hdHJpeChjYW5vcHlQb3NpdGlvbi5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIGNhbm9weSA9IG5ldyBUSFJFRS5NZXNoKGkuY2Fub3B5R2VvbSwgaS5jYW5vcHlTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2Nhbm9weScpO1xuXHR0cmVlLm1lc2hlcy5wdXNoKGNhbm9weSk7XG5cblx0Ly8vLy8vLy8vLyBkZW5kcm9cblx0aWYgKHR5cGVvZiBvcHRpb25zLmRlbmRyb21ldGVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHRyZWUgPSBTY2FwZURlbmRyb21ldGVyQWRkb24odHJlZSwgb3B0aW9ucywgaSk7XG5cdH1cblxuXHQvLy8vLy8vLy8vIHNhcCBmbG93IG1ldGVyXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zYXBmbG93bWV0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0dHJlZSA9IFNjYXBlU2FwRmxvd01ldGVyQWRkb24odHJlZSwgb3B0aW9ucywgaSk7XG5cdH1cblxuXHRyZXR1cm4gdHJlZTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVUcmVlRmFjdG9yeTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5TY2FwZUNodW5rID0gcmVxdWlyZSgnLi9jaHVuaycpO1xuXG5cbi8vIERFQlVHXG5TY2FwZVN0dWZmID0gcmVxdWlyZSgnLi9zdHVmZicpO1xuU2NhcGVJdGVtcyA9IHJlcXVpcmUoJy4vaXRlbXR5cGVzJyk7XG5TY2FwZUl0ZW0gPSByZXF1aXJlKCcuL2l0ZW0nKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBjYWxsYmFjayBTY2FwZVNjZW5lfmRhdGVDaGFuZ2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBlcnJvciBEZXNjcmlwdGlvbiBvZiBlcnJvciwgb3RoZXJ3aXNlIG51bGxcbiAqIEBwYXJhbSB7ZGF0ZX0gZGF0ZSBEYXRlIHRoZSBzY2FwZSBpcyBub3cgZGlzcGxheWluZ1xuICovXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgb2YgYSBsYW5kc2NhcGUgLyBtb29uc2NhcGUgLyB3aGF0ZXZlclxuICogQHBhcmFtIHtTY2FwZUZpZWxkfSBmaWVsZCAgdGhlIGZpZWxkIGJlaW5nIHJlbmRlcmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gZG9tICAgICAgICBET00gZWxlbWVudCB0aGUgc2NhcGUgc2hvdWxkIGJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlZCBpbnRvLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgICAgY29sbGVjdGlvbiBvZiBvcHRpb25zLiAgQWxsIGFyZSBvcHRpb25hbC5cbiAqIEBwYXJhbSB7U3RyaW5nW119IG9wdGlvbnMubGlnaHRzPSdzdW4nLCdza3knIC0gYXJyYXkgb2Ygc3RyaW5nc1xuICogbmFtaW5nIGxpZ2h0cyB0byBpbmNsdWRlIGluIHRoaXMgc2NlbmUuICBDaG9vc2UgZnJvbTpcbiAqXG4gKiBzdHJpbmcgICAgfCBsaWdodCB0eXBlXG4gKiAtLS0tLS0tLS0tfC0tLS0tLS0tLS0tXG4gKiBgdG9wbGVmdGAgfCBhIGxpZ2h0IGZyb20gYWJvdmUgdGhlIGNhbWVyYSdzIGxlZnQgc2hvdWxkZXJcbiAqIGBhbWJpZW50YCB8IGEgZGltIGFtYmllbnQgbGlnaHRcbiAqIGBzdW5gICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBvcmJpdHMgdGhlIHNjZW5lIG9uY2UgcGVyIGRheVxuICogYHNreWAgICAgIHwgYSBkaXJlY3Rpb25hbCBsaWdodCB0aGF0IHNoaW5lcyBmcm9tIGFib3ZlIHRoZSBzY2VuZVxuICogQHBhcmFtIHtEYXRlfFwibm93XCJ9IG9wdGlvbnMuY3VycmVudERhdGU9J25vdycgLSBUaGUgdGltZSBhbmQgZGF0ZVxuICogaW5zaWRlIHRoZSBzY2FwZS4gIFRoZSBzdHJpbmcgXCJub3dcIiBtZWFucyBzZXQgY3VycmVudERhdGUgdG8gdGhlXG4gKiBwcmVzZW50LlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMudGltZVJhdGlvPTEgVGhlIHJhdGUgdGltZSBzaG91bGQgcGFzcyBpblxuICogdGhlIHNjYXBlLCByZWxhdGl2ZSB0byBub3JtYWwuICAwLjEgbWVhbnMgdGVuIHRpbWVzIHNsb3dlci4gIDYwXG4gKiBtZWFucyBvbmUgbWludXRlIHJlYWwgdGltZSA9IG9uZSBob3VyIHNjYXBlIHRpbWUuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV+ZGF0ZUNoYW5nZX0gb3B0aW9ucy5kYXRlVXBkYXRlIGNhbGxiYWNrIGZvclxuICogd2hlbiB0aGUgc2NlbmUgdGltZSBjaGFuZ2VzICh3aGljaCBpcyBhIGxvdCkuXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlU2NlbmUoZmllbGQsIGRvbSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICAvLyBsaWdodHM6IFsndG9wbGVmdCcsICdhbWJpZW50J10sXG4gICAgICAgIGxpZ2h0czogWydzdW4nLCAnc2t5J10sXG4gICAgICAgIGN1cnJlbnREYXRlOiAnbm93JywgIC8vIGVpdGhlciBzdHJpbmcgJ25vdycgb3IgYSBEYXRlIG9iamVjdFxuICAgICAgICB0aW1lUmF0aW86IDEsXG4gICAgICAgIGRhdGVVcGRhdGU6IG51bGwgLy8gY2FsbGJhY2sgdG91cGRhdGUgdGhlIGRpc3BsYXllZCBkYXRlL3RpbWVcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gc2F2ZSB0aGUgZmllbGRcbiAgICB0aGlzLmYgPSBmaWVsZDtcblxuICAgIC8vIGRpc2NvdmVyIERPTSBjb250YWluZXJcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkb20pO1xuXG4gICAgLy8gYXR0YWNoIHRoZSBtb3VzZSBoYW5kbGVycy4uXG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIC8vIC4ubW92ZSBoYW5kbGVyXG4gICAgdGhpcy5lbGVtZW50Lm9ubW91c2Vtb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdGhpcy5tb3VzZUhvdmVyKGV2ZW50LmNsaWVudFggLSBib3VuZHMubGVmdCwgZXZlbnQuY2xpZW50WSAtIGJvdW5kcy50b3ApO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIC8vIC4uY2xpY2sgaGFuZGxlclxuICAgIHRoaXMuZWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdGhpcy5tb3VzZUNsaWNrKGV2ZW50LmNsaWVudFggLSBib3VuZHMubGVmdCwgZXZlbnQuY2xpZW50WSAtIGJvdW5kcy50b3ApO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHRoaXMuZGF0ZSA9IHRoaXMuX29wdHMuY3VycmVudERhdGU7XG4gICAgaWYgKHRoaXMuZGF0ZSA9PT0gJ25vdycpIHtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5zdGFydERhdGUgPSB0aGlzLmRhdGU7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgLy8gY3JlYXRlIGFuZCBzYXZlIGFsbCB0aGUgYml0cyB3ZSBuZWVkXG4gICAgdGhpcy5yZW5kZXJlciA9IHRoaXMuX21ha2VSZW5kZXJlcih7IGRvbTogdGhpcy5lbGVtZW50IH0pO1xuICAgIHRoaXMuc2NlbmUgPSB0aGlzLl9tYWtlU2NlbmUoKTtcbiAgICB0aGlzLmNhbWVyYSA9IHRoaXMuX21ha2VDYW1lcmEoKTtcbiAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy5fbWFrZUNvbnRyb2xzKCk7XG4gICAgdGhpcy5saWdodHMgPSB0aGlzLl9tYWtlTGlnaHRzKHRoaXMuX29wdHMubGlnaHRzKTtcblxuICAgIHRoaXMudWlQb2ludGVyID0gbmV3IFNjYXBlSXRlbShTY2FwZUl0ZW1zLmNhbUxhYmVsLCAwLCAwLCB7dGV4dDogJ3VubmFtZWQnfSk7XG5cbiAgICB0aGlzLmNvbm5lY3RGaWVsZCgpO1xuXG4gICAgLy8gYWRkIGdyaWRzIGFuZCBoZWxwZXIgY3ViZXNcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoKTtcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoJ3RvcCcpO1xuICAgIC8vIHRoaXMuYWRkSGVscGVyU2hhcGVzKCk7XG5cbiAgICB2YXIgbGFzdExvZ0F0ID0gMDsgLy8gREVCVUdcbiAgICB2YXIgcmVuZGVyID0gKGZ1bmN0aW9uIHVuYm91bmRSZW5kZXIodHMpIHtcblxuICAgICAgICAvLyBERUJVR1xuICAgICAgICBpZiAobGFzdExvZ0F0ICsgMjAwMCA8IHRzKSB7XG4gICAgICAgICAgICBsYXN0TG9nQXQgPSB0cztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERFQlVHIG1heWJlIHRoZSB1cGRhdGVUaW1lIGlzIGRpc2FibGVkXG4gICAgICAgIHRoaXMuX3VwZGF0ZVRpbWUoKTtcblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHJlbmRlciApO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlciggdGhpcy5zY2VuZSwgdGhpcy5jYW1lcmEgKTtcbiAgICAgICAgdGhpcy5jb250cm9scy51cGRhdGUoKTtcbiAgICB9KS5iaW5kKHRoaXMpO1xuXG4gICAgcmVuZGVyKDApO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVTY2VuZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlU2NlbmU7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGEgbWVzaCB0byB0aGUgVEhSRUUuU2NlbmUgKGEgcGFzc3Rocm91Z2ggZm9yIFRIUkVFLlNjZW5lLmFkZClcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24odGhpbmcpIHtcbiAgICB0aGlzLnNjZW5lLmFkZCh0aGluZyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogcmVtb3ZlIGEgbWVzaCB0byB0aGUgVEhSRUUuU2NlbmUgKGEgcGFzc3Rocm91Z2ggZm9yIFRIUkVFLlNjZW5lLnJlbW92ZSlcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24odGhpbmcpIHtcbiAgICB0aGlzLnNjZW5lLnJlbW92ZSh0aGluZyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGJsb2NrcyBmcm9tIHRoZSBhdHRhY2hlZCBTY2FwZUZpZWxkIGludG8gdGhlIHNjZW5lLlxuICpcbiAqIFlvdSB3aWxsIHByb2JhYmx5IG9ubHkgbmVlZCB0byBjYWxsIHRoaXMgb25jZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuY29ubmVjdEZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mLmJ1aWxkQmxvY2tzKHRoaXMpO1xuICAgIHRoaXMuZi5idWlsZEl0ZW1zKHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHRlbGwgdGhpcyBzY2VuZSB0aGF0IGl0J3MgZmllbGQncyBpdGVtcyBoYXZlIHVwZGF0ZWRcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUucmVmcmVzaEl0ZW1zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mLmJ1aWxkSXRlbXModGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGhlbHBlciBjdWJlcyBhdCBzb21lIG9mIHRoZSBjb3JuZXJzIG9mIHlvdXIgc2NhcGUsIHNvIHlvdSBjYW5cbiAqIHNlZSB3aGVyZSB0aGV5IGFyZSBpbiBzcGFjZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG4gICAgdmFyIGYgPSB0aGlzLmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgoZi5taW5YICsgZi5tYXhYKSAvIDIsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWF4WSwgZi5taW5aLCBncmVlbik7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5taW5ZLCBmLm1heFosIGJsdWUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWF4WSwgZi5taW5aLCB3aGl0ZSk7XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUubW91c2VIb3ZlciA9IGZ1bmN0aW9uKG1vdXNlWCwgbW91c2VZKSB7XG5cbiAgICB2YXIgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuICAgIG1vdXNlUG9zID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICBtb3VzZVBvcy54ID0gICAobW91c2VYIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LndpZHRoKSAgKiAyIC0gMTtcbiAgICBtb3VzZVBvcy55ID0gLSAobW91c2VZIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LmhlaWdodCkgKiAyICsgMTtcblxuICAgIC8vIHJlbW92ZSB0aGUgdWkgcG9pbnRlclxuICAgIHRoaXMudWlQb2ludGVyLnJlbW92ZUZyb21TY2VuZSgpO1xuXG4gICAgLy8gc2V0IGFsbCB0aGUgY2xpY2thYmxlcyB0byBoaWRkZW5cbiAgICBmb3IgKHZhciBjPTA7IGMgPCB0aGlzLmYuY2xpY2thYmxlcy5sZW5ndGg7IGMrKykge1xuICAgICAgICB0aGlzLmYuY2xpY2thYmxlc1tjXS52aXNpYmxlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gbm93IHVuaGlkZSBqdXN0IHRoZSBvbmVzIGluIHRoZSBtb3VzZSBhcmVhXG4gICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEobW91c2VQb3MsIHRoaXMuY2FtZXJhKTtcbiAgICB2YXIgaW50ZXJzZWN0cyA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHRoaXMuZi5jbGlja2FibGVzLCB0cnVlKTtcblxuICAgIHZhciBpbnRlcnNlY3QsIGNsaWNrYWJsZSwgZmlyc3RDbGlja2FibGUgPSBudWxsO1xuICAgIGZvciAodmFyIGk9MDsgaSA8IGludGVyc2VjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW50ZXJzZWN0ID0gaW50ZXJzZWN0c1tpXS5vYmplY3Q7XG4gICAgICAgIGNsaWNrYWJsZSA9IGludGVyc2VjdC5wYXJlbnQ7XG4gICAgICAgIGlmICghZmlyc3RDbGlja2FibGUgJiYgaW50ZXJzZWN0LnVzZXJEYXRhLmNsaWNrRGF0YSkge1xuICAgICAgICAgICAgZmlyc3RDbGlja2FibGUgPSBpbnRlcnNlY3Q7XG4gICAgICAgICAgICBpZiAoZmlyc3RDbGlja2FibGUudXNlckRhdGEubmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIGZpcnN0IGNsaWNrYWJsZSBoYXMgYSBuYW1lLCBtYWtlIGl0IGludG8gYSBsYWJlbFxuICAgICAgICAgICAgICAgIHRoaXMudWlQb2ludGVyLnVwZGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGZpcnN0Q2xpY2thYmxlLnVzZXJEYXRhLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHg6IGNsaWNrYWJsZS5wb3NpdGlvbi54LFxuICAgICAgICAgICAgICAgICAgICB5OiBjbGlja2FibGUucG9zaXRpb24ueSxcbiAgICAgICAgICAgICAgICAgICAgejogY2xpY2thYmxlLnBvc2l0aW9uLnosXG4gICAgICAgICAgICAgICAgICAgIGNhbVBvczogdGhpcy5jYW1lcmEucG9zaXRpb24uY2xvbmUoKSxcbiAgICAgICAgICAgICAgICAgICAgY2FtRGlyOiB0aGlzLmNhbWVyYS5nZXRXb3JsZERpcmVjdGlvbigpLFxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IGZpcnN0Q2xpY2thYmxlLnVzZXJEYXRhLm9mZnNldFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIC8vIHJvdGF0ZSB0byBzaG93IHRleHQgdG8gY2FtZXJhP1xuICAgICAgICAgICAgICAgIC8vIHRoaXMudWlQb2ludGVyLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgbS51cC5jb3B5KHRoaXMuY2FtZXJhLnVwKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgbS5sb29rQXQodGhpcy5jYW1lcmEucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIC8vIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMudWlQb2ludGVyLmFkZFRvU2NlbmUodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2xpY2thYmxlLnZpc2libGUgPSB0cnVlO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUubW91c2VDbGljayA9IGZ1bmN0aW9uKG1vdXNlWCwgbW91c2VZKSB7XG5cbiAgICB2YXIgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuICAgIG1vdXNlUG9zID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICBtb3VzZVBvcy54ID0gICAobW91c2VYIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LndpZHRoKSAgKiAyIC0gMTtcbiAgICBtb3VzZVBvcy55ID0gLSAobW91c2VZIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LmhlaWdodCkgKiAyICsgMTtcblxuICAgIC8vIGZpbmQgdGhlIGludGVyc2VjdGluZyBjbGlja2FibGVzXG4gICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEobW91c2VQb3MsIHRoaXMuY2FtZXJhKTtcbiAgICB2YXIgaW50ZXJzZWN0cyA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHRoaXMuZi5jbGlja2FibGVzLCB0cnVlKTtcblxuICAgIHZhciBjbGlja2VkO1xuICAgIGZvciAodmFyIGk9MDsgaSA8IGludGVyc2VjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gdGhlIGZpcnN0IG9uZSB3aXRoIHVzZXJEYXRhLmNsaWNrRGF0YSBkZWZpbmVkIGlzIHRoZSB3aW5uZXJcbiAgICAgICAgY2xpY2tlZCA9IGludGVyc2VjdHNbaV0ub2JqZWN0O1xuICAgICAgICBpZiAoY2xpY2tlZC51c2VyRGF0YS5jbGlja0RhdGEpIHtcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgY2FsbGJhY2ssIGludm9rZSBpdFxuICAgICAgICAgICAgaWYgKHRoaXMuX29wdHMuY2xpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9vcHRzLmNsaWNrO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gY2xpY2tlZC51c2VyRGF0YS5jbGlja0RhdGE7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCggZnVuY3Rpb24oKXsgY2FsbGJhY2suY2FsbCh3aW5kb3csIGRhdGEpOyB9LCAwICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBjdWJlIGF0IHBvc2l0aW9uIGB4YCwgYHlgLCBgemAgdG8gY29uZmlybSB3aGVyZSB0aGF0IGlzLFxuICogZXhhY3RseS4gIEdyZWF0IGZvciB0cnlpbmcgdG8gd29yayBvdXQgaWYgeW91ciBzY2FwZSBpcyBiZWluZ1xuICogcmVuZGVyZWQgd2hlcmUgeW91IHRoaW5rIGl0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqXG4gKiBAcGFyYW0geyhOdW1iZXJ8VmVjdG9yMyl9IHggWCBjb29yZGluYXRlLCBvciBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvVmVjdG9yMyBUSFJFRS5WZWN0b3IzfSBjb250YWluaW5nIHgsIHkgYW5kIHogY29vcmRzXG4gKiBAcGFyYW0ge051bWJlcn0gW3ldIFkgY29vcmRpbmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IFt6XSBaIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7Q29sb3J8U3RyaW5nfEludGVnZXJ9IGNvbG9yPScjY2NjY2NjJyBDb2xvciBvZiBjdWJlLlxuICogQ2FuIGJlIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9Db2xvciBUSFJFRS5Db2xvcn0sIGEgY29sb3ItcGFyc2VhYmxlIHN0cmluZyBsaWtlXG4gKiBgJyMzMzY2Y2MnYCwgb3IgYSBudW1iZXIgbGlrZSBgMHgzMzY2Y2NgLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJDdWJlID0gZnVuY3Rpb24oeCwgeSwgeiwgY29sb3IpIHtcbiAgICAvLyBmaXJzdCwgc2V0IHRoZSBjb2xvciB0byBzb21ldGhpbmdcbiAgICBpZiAodHlwZW9mIGNvbG9yID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgdG8gbGlnaHQgZ3JleS5cbiAgICAgICAgY29sb3IgPSBuZXcgVEhSRUUuQ29sb3IoMHhjY2NjY2MpO1xuICAgIH1cbiAgICB2YXIgcG9zOyAvLyB0aGUgcG9zaXRpb24gdG8gZHJhdyB0aGUgY3ViZVxuICAgIGlmICh0eXBlb2YgeC54ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIHRoZW4gaXQncyBhIHZlY3RvciwgYW5kIHkgbWlnaHQgYmUgdGhlIGNvbG9yXG4gICAgICAgIHBvcyA9IHg7XG4gICAgICAgIGlmICh0eXBlb2YgeSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29sb3IgPSB5O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8geCBpc24ndCBhIHZlY3Rvciwgc28gYXNzdW1lIHNlcGFyYXRlIHggeSBhbmQgelxuICAgICAgICBwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCB6KTtcbiAgICAgICAgLy8gd2UgY2F1Z2h0IGNvbG9yIGFscmVhZHkuXG4gICAgfVxuXG4gICAgLy8gYWJvdXQgYSBmaWZ0aWV0aCBvZiB0aGUgZmllbGQncyBzdW1tZWQgZGltZW5zaW9uc1xuICAgIHZhciBzaXplID0gKHRoaXMuZi53WCArIHRoaXMuZi53WSArIHRoaXMuZi53WikgLyA1MDtcbiAgICAvLyB1c2UgdGhlIGNvbG91ciB3ZSBkZWNpZGVkIGVhcmxpZXJcbiAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7IGNvbG9yOiBjb2xvciB9KTtcblxuICAgIC8vIG9rYXkuLiBtYWtlIGl0LCBwb3NpdGlvbiBpdCwgYW5kIHNob3cgaXRcbiAgICB2YXIgY3ViZSA9IFNjYXBlSXRlbXMuY3ViZSh7IHNpemU6IHNpemUsIG1hdGVyaWFsOiBtYXRlcmlhbCB9KS5tZXNoZXNbMF07XG4gICAgY3ViZS5wb3NpdGlvbi5jb3B5KHBvcyk7XG4gICAgdGhpcy5zY2VuZS5hZGQoY3ViZSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckdyaWQgPSBmdW5jdGlvbih0b3BPckJvdHRvbSkge1xuICAgIHZhciBneiA9IDA7XG4gICAgdmFyIGdjID0gMHg0NDQ0NDQ7XG4gICAgaWYgKHRvcE9yQm90dG9tID09ICd0b3AnKSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1heFo7XG4gICAgICAgIGdjID0gMHhjY2NjZmY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWluWjtcbiAgICAgICAgZ2MgPSAweGNjZmZjYztcbiAgICB9XG5cbiAgICB2YXIgZ3JpZFcgPSBNYXRoLm1heCh0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLCB0aGlzLmYubWF4WSAtIHRoaXMuZi5taW5ZKTtcblxuICAgIC8vIEdyaWQgXCJzaXplXCIgaXMgdGhlIGRpc3RhbmNlIGluIGVhY2ggb2YgdGhlIGZvdXIgZGlyZWN0aW9ucyxcbiAgICAvLyB0aGUgZ3JpZCBzaG91bGQgc3Bhbi4gIFNvIGZvciBhIGdyaWQgVyB1bml0cyBhY3Jvc3MsIHNwZWNpZnlcbiAgICAvLyB0aGUgc2l6ZSBhcyBXLzIuXG4gICAgdmFyIGdyaWRYWSA9IG5ldyBUSFJFRS5HcmlkSGVscGVyKGdyaWRXLzIsIGdyaWRXLzEwKTtcbiAgICBncmlkWFkuc2V0Q29sb3JzKGdjLCBnYyk7XG4gICAgZ3JpZFhZLnJvdGF0aW9uLnggPSBNYXRoLlBJLzI7XG4gICAgZ3JpZFhZLnBvc2l0aW9uLnNldCh0aGlzLmYubWluWCArIGdyaWRXLzIsIHRoaXMuZi5taW5ZICsgZ3JpZFcvMiwgZ3opO1xuICAgIHRoaXMuc2NlbmUuYWRkKGdyaWRYWSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQ3JlYXRlIGFuZCByZXR1cm4gYSBUSFJFRS5SZW5kZXJlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdmFyaW91cyBvcHRpb25zXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR8alF1ZXJ5RWxlbX0gb3B0aW9ucy5kb20gYSBkb20gZWxlbWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLndpZHRoIHJlbmRlcmVyIHdpZHRoIChpbiBwaXhlbHMpXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuaGVpZ2h0IHJlbmRlcmVyIGhlaWdodCAoaW4gcGl4ZWxzKVxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlUmVuZGVyZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoeyBhbnRpYWxpYXM6IHRydWUsIGFscGhhOiB0cnVlLCBwcmVjaXNpb246IFwiaGlnaHBcIiB9KTtcbiAgICByZW5kZXJlci5zZXRDbGVhckNvbG9yKCAweDAwMDAwMCwgMCk7XG4gICAgLy8gcmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kb20pIHtcbiAgICAgICAgdmFyICRkb20gPSAkKG9wdGlvbnMuZG9tKTtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZSgkZG9tLndpZHRoKCksICRkb20uaGVpZ2h0KCkpO1xuICAgICAgICAkZG9tLmFwcGVuZChyZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy53aWR0aCAmJiBvcHRpb25zLmhlaWdodCkge1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKG9wdGlvbnMud2lkdGgsIG9wdGlvbnMuaGVpZ2h0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlbmRlcmVyO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHNjYXBlIHRpbWUgdG8gbWF0Y2ggdGhlIGN1cnJlbnQgdGltZSAodGFraW5nIGludG9cbiAqIGFjY291bnQgdGhlIHRpbWVSYXRpbyBldGMpLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVUaW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cuZ2V0VGltZSgpIC0gdGhpcy5maXJzdFJlbmRlcjtcbiAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSh0aGlzLmZpcnN0UmVuZGVyICsgKGVsYXBzZWQgKiB0aGlzLl9vcHRzLnRpbWVSYXRpbykpO1xuICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX29wdHMuZGF0ZVVwZGF0ZTtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBjYWxsYmFja0RhdGUgPSBuZXcgRGF0ZSh0aGlzLmRhdGUpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBjYWxsYmFja0RhdGUpO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlU3VuKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIHN1biB0byBzdWl0IHRoZSBzY2FwZSBjdXJyZW50IHRpbWUuXG4gKiBAcGFyYW0gIHtUSFJFRS5EaXJlY3Rpb25hbExpZ2h0fSBbc3VuXSB0aGUgc3VuIHRvIGFjdCBvbi4gIElmIG5vdFxuICogc3VwcGxpZWQsIHRoaXMgbWV0aG9kIHdpbGwgYWN0IG9uIHRoZSBsaWdodCBpbiB0aGlzIHNjZW5lJ3MgbGlnaHRcbiAqIGxpc3QgdGhhdCBpcyBjYWxsZWQgXCJzdW5cIi5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlU3VuID0gZnVuY3Rpb24oc3VuKSB7XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBpZiB0aGV5IGRpZG4ndCBwcm92aWRlIGEgc3VuLCB1c2Ugb3VyIG93blxuICAgICAgICBzdW4gPSB0aGlzLmxpZ2h0cy5zdW47XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBiYWlsIGlmIHRoZXJlJ3Mgbm8gc3VuIFdIQVQgRElEIFlPVSBETyBZT1UgTU9OU1RFUlxuICAgIH1cblxuICAgIHZhciBzdW5BbmdsZSA9ICh0aGlzLmRhdGUuZ2V0SG91cnMoKSo2MCArIHRoaXMuZGF0ZS5nZXRNaW51dGVzKCkpIC8gMTQ0MCAqIDIgKiBNYXRoLlBJO1xuICAgIHZhciBzdW5Sb3RhdGlvbkF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcblxuICAgIHN1bi5wb3NpdGlvblxuICAgICAgICAuc2V0KDAsIC0zICogdGhpcy5mLndZLCAtMjAgKiB0aGlzLmYud1opXG4gICAgICAgIC5hcHBseUF4aXNBbmdsZShzdW5Sb3RhdGlvbkF4aXMsIHN1bkFuZ2xlKVxuICAgICAgICAuYWRkKHRoaXMuZi5jZW50ZXIpO1xuXG4gICAgdmFyIHN1blogPSBzdW4ucG9zaXRpb24uejtcblxuICAgIC8vIHN3aXRjaCB0aGUgc3VuIG9mZiB3aGVuIGl0J3MgbmlnaHQgdGltZVxuICAgIGlmIChzdW4ub25seVNoYWRvdyA9PSBmYWxzZSAmJiBzdW5aIDw9IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChzdW4ub25seVNoYWRvdyA9PSB0cnVlICYmIHN1blogPiB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyAgb3V0IHRoZSBzaGFkb3cgZGFya25lc3Mgd2hlbiB0aGUgc3VuIGlzIGxvd1xuICAgIGlmIChzdW5aID49IHRoaXMuZi5jZW50ZXIueiAmJiBzdW5aIDw9IHRoaXMuZi5tYXhaKSB7XG4gICAgICAgIHZhciB1cG5lc3MgPSBNYXRoLm1heCgwLCAoc3VuWiAtIHRoaXMuZi5jZW50ZXIueikgLyB0aGlzLmYud1ogKiAyKTtcbiAgICAgICAgc3VuLnNoYWRvd0RhcmtuZXNzID0gMC41ICogdXBuZXNzO1xuICAgICAgICBzdW4uaW50ZW5zaXR5ID0gdXBuZXNzO1xuICAgIH1cblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlTGlnaHRzID0gZnVuY3Rpb24obGlnaHRzVG9JbmNsdWRlKSB7XG5cbiAgICB2YXIgbGlnaHRzID0ge307XG4gICAgdmFyIGYgPSB0aGlzLmY7ICAvLyBjb252ZW5pZW50IHJlZmVyZW5jZSB0byB0aGUgZmllbGRcblxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignYW1iaWVudCcpICE9IC0xKSB7XG4gICAgICAgIC8vIGFkZCBhbiBhbWJpZW50IGxpc3RcbiAgICAgICAgbGlnaHRzLmFtYmllbnQgPSBuZXcgVEhSRUUuQW1iaWVudExpZ2h0KDB4MjIyMjMzKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCd0b3BsZWZ0JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLmxlZnQgPSBuZXcgVEhSRUUuUG9pbnRMaWdodCgweGZmZmZmZiwgMSwgMCk7XG4gICAgICAgIC8vIHBvc2l0aW9uIGxpZ2h0IG92ZXIgdGhlIHZpZXdlcidzIGxlZnQgc2hvdWxkZXIuLlxuICAgICAgICAvLyAtIExFRlQgb2YgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeCB3aWR0aFxuICAgICAgICAvLyAtIEJFSElORCB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB5IHdpZHRoXG4gICAgICAgIC8vIC0gQUJPVkUgdGhlIGNhbWVyYSBieSB0aGUgZmllbGQncyBoZWlnaHRcbiAgICAgICAgbGlnaHRzLmxlZnQucG9zaXRpb24uYWRkVmVjdG9ycyhcbiAgICAgICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLFxuICAgICAgICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoLTAuNSAqIGYud1gsIC0wLjUgKiBmLndZLCAxICogZi53WilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdzdW4nKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc3VuID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZWUpO1xuICAgICAgICBsaWdodHMuc3VuLmludGVuc2l0eSA9IDEuMDtcblxuICAgICAgICB0aGlzLl91cGRhdGVTdW4obGlnaHRzLnN1bik7XG5cbiAgICAgICAgLy8gbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFWaXNpYmxlID0gdHJ1ZTsgIC8vIERFQlVHXG5cbiAgICAgICAgLy8gZGlyZWN0aW9uIG9mIHN1bmxpZ2h0XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc3VuLnRhcmdldCA9IHRhcmdldDtcblxuICAgICAgICAvLyBzdW4gZGlzdGFuY2UsIGxvbFxuICAgICAgICB2YXIgc3VuRGlzdGFuY2UgPSBsaWdodHMuc3VuLnBvc2l0aW9uLmRpc3RhbmNlVG8obGlnaHRzLnN1bi50YXJnZXQucG9zaXRpb24pO1xuICAgICAgICAvLyBsb25nZXN0IGRpYWdvbmFsIGZyb20gZmllbGQtY2VudGVyXG4gICAgICAgIHZhciBtYXhGaWVsZERpYWdvbmFsID0gZi5jZW50ZXIuZGlzdGFuY2VUbyhuZXcgVEhSRUUuVmVjdG9yMyhmLm1pblgsIGYubWluWSwgZi5taW5aKSk7XG5cbiAgICAgICAgLy8gc2hhZG93IHNldHRpbmdzXG4gICAgICAgIGxpZ2h0cy5zdW4uY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93RGFya25lc3MgPSAwLjMzO1xuXG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTmVhciA9IHN1bkRpc3RhbmNlIC0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFGYXIgPSBzdW5EaXN0YW5jZSArIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVG9wID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFSaWdodCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhQm90dG9tID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUxlZnQgPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc2t5JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnNreSA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZWVlZWZmKTtcbiAgICAgICAgbGlnaHRzLnNreS5pbnRlbnNpdHkgPSAwLjg7XG5cbiAgICAgICAgLy8gc2t5IGlzIGRpcmVjdGx5IGFib3ZlXG4gICAgICAgIHZhciBza3lIZWlnaHQgPSA1ICogZi53WjtcbiAgICAgICAgbGlnaHRzLnNreS5wb3NpdGlvbi5jb3B5KHRoaXMuY2FtZXJhLnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbGlnaHRzLnNreS5wb3NpdGlvbi5zZXRaKGYubWF4WiArIHNreUhlaWdodCk7XG5cbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5za3kudGFyZ2V0ID0gdGFyZ2V0O1xuICAgIH1cblxuICAgIGZvciAodmFyIGxpZ2h0IGluIGxpZ2h0cykge1xuICAgICAgICBpZiAobGlnaHRzLmhhc093blByb3BlcnR5KGxpZ2h0KSkge1xuICAgICAgICAgICAgdGhpcy5zY2VuZS5hZGQobGlnaHRzW2xpZ2h0XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlnaHRzO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlU2NlbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcbiAgICAvLyBhZGQgZm9nXG4gICAgLy8gc2NlbmUuZm9nID0gbmV3IFRIUkVFLkZvZyhcbiAgICAvLyAgICAgJyNmMGY4ZmYnLFxuICAgIC8vICAgICB0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLFxuICAgIC8vICAgICB0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YICogM1xuICAgIC8vICk7XG4gICAgcmV0dXJuIHNjZW5lO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ2FtZXJhID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG4gICAgLy8gdmlld2luZyBhbmdsZVxuICAgIC8vIGkgdGhpbmsgdGhpcyBpcyB0aGUgdmVydGljYWwgdmlldyBhbmdsZS4gIGhvcml6b250YWwgYW5nbGUgaXNcbiAgICAvLyBkZXJpdmVkIGZyb20gdGhpcyBhbmQgdGhlIGFzcGVjdCByYXRpby5cbiAgICB2YXIgdmlld0FuZ2xlID0gNDU7XG4gICAgdmlld0FuZ2xlID0gKG9wdGlvbnMgJiYgb3B0aW9ucy52aWV3QW5nbGUpIHx8IHZpZXdBbmdsZTtcblxuICAgIC8vIGFzcGVjdFxuICAgIHZhciB2aWV3QXNwZWN0ID0gMTYvOTtcbiAgICBpZiAodGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICB2aWV3QXNwZWN0ID0gJGVsZW0ud2lkdGgoKSAvICRlbGVtLmhlaWdodCgpO1xuICAgIH1cblxuICAgIC8vIG5lYXIgYW5kIGZhciBjbGlwcGluZ1xuICAgIHZhciBuZWFyQ2xpcCA9IDAuMTtcbiAgICB2YXIgZmFyQ2xpcCA9IDEwMDAwO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbmVhckNsaXAgPSBNYXRoLm1pbih0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAvIDEwMDA7XG4gICAgICAgIGZhckNsaXAgPSBNYXRoLm1heCh0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAqIDEwO1xuICAgIH1cblxuICAgIC8vIGNhbWVyYSBwb3NpdGlvbiBhbmQgbG9va2luZyBkaXJlY3Rpb25cbiAgICB2YXIgbG9va0hlcmUgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcbiAgICB2YXIgY2FtUG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEwLCA1KTtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIGxvb2tIZXJlID0gdGhpcy5mLmNlbnRlcjtcbiAgICAgICAgY2FtUG9zID0gbG9va0hlcmUuY2xvbmUoKS5hZGQobmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEuMSAqIHRoaXMuZi53WSwgMSAqIHRoaXMuZi53WikpO1xuICAgIH1cblxuICAgIC8vIHNldCB1cCBjYW1lcmFcbiAgICB2YXIgY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKCB2aWV3QW5nbGUsIHZpZXdBc3BlY3QsIG5lYXJDbGlwLCBmYXJDbGlwKTtcbiAgICAvLyBcInVwXCIgaXMgcG9zaXRpdmUgWlxuICAgIGNhbWVyYS51cC5zZXQoMCwwLDEpO1xuICAgIGNhbWVyYS5wb3NpdGlvbi5jb3B5KGNhbVBvcyk7XG4gICAgY2FtZXJhLmxvb2tBdChsb29rSGVyZSk7XG5cbiAgICAvLyBhZGQgdGhlIGNhbWVyYSB0byB0aGUgc2NlbmVcbiAgICBpZiAodGhpcy5zY2VuZSkge1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChjYW1lcmEpO1xuICAgIH1cblxuICAgIHJldHVybiBjYW1lcmE7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDb250cm9scyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKTtcbiAgICBpZiAodGhpcy5mICYmIHRoaXMuZi5jZW50ZXIpIHtcbiAgICAgICAgY2VudGVyID0gdGhpcy5mLmNlbnRlci5jbG9uZSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jYW1lcmEgJiYgdGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5jYW1lcmEsIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIGNvbnRyb2xzLmNlbnRlciA9IGNlbnRlcjtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xzO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJ3NjYXBlISdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU2NlbmU7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuXG52YXIgTGFtYmVydCA9IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWw7XG52YXIgUGhvbmcgPSBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBTdHVmZiAodGhhdCBpcywgVEhSRUUuTWF0ZXJpYWwpIHRoYXQgdGhpbmdzIGluIHNjYXBlcyBjYW4gYmUgbWFkZSBvdXQgb2YuXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZVN0dWZmID0ge307XG5cbi8qKiBnZW5lcmljIHN0dWZmLCBmb3IgaWYgbm90aGluZyBlbHNlIGlzIHNwZWNpZmllZFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdlbmVyaWMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSxcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjUwIH0pO1xuXG4vKiogd2F0ZXIgaXMgYmx1ZSBhbmQgYSBiaXQgdHJhbnNwYXJlbnRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53YXRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MzM5OWZmLFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNzUgfSk7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdG9uZSwgZGlydCwgYW5kIGdyb3VuZCBtYXRlcmlhbHNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKiogZGlydCBmb3IgZ2VuZXJhbCB1c2VcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5kaXJ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhhMDUyMmQgfSk7XG5cbi8vIE5pbmUgZGlydCBjb2xvdXJzIGZvciB2YXJ5aW5nIG1vaXN0dXJlIGxldmVscy4gIFN0YXJ0IGJ5IGRlZmluaW5nXG4vLyB0aGUgZHJpZXN0IGFuZCB3ZXR0ZXN0IGNvbG91cnMsIGFuZCB1c2UgLmxlcnAoKSB0byBnZXQgYSBsaW5lYXJcbi8vIGludGVycG9sYXRlZCBjb2xvdXIgZm9yIGVhY2ggb2YgdGhlIGluLWJldHdlZW4gZGlydHMuXG52YXIgZHJ5ID0gbmV3IFRIUkVFLkNvbG9yKDB4YmI4ODU1KTsgLy8gZHJ5XG52YXIgd2V0ID0gbmV3IFRIUkVFLkNvbG9yKDB4ODgyMjAwKTsgLy8gbW9pc3RcblxuLyoqIGRpcnQgYXQgdmFyeWluZyBtb2lzdHVyZSBsZXZlbHM6IGRpcnQwIGlzIGRyeSBhbmQgbGlnaHQgaW5cbiAgKiBjb2xvdXIsIGRpcnQ5IGlzIG1vaXN0IGFuZCBkYXJrLlxuICAqIEBuYW1lIGRpcnRbMC05XVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQwID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5IH0pO1xuU2NhcGVTdHVmZi5kaXJ0MSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAxLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAyLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAzLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA0LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA1LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA2LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA3LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA4LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IHdldCB9KTtcblxuLyoqIGxlYWYgbGl0dGVyLCB3aGljaCBpbiByZWFsaXR5IGlzIHVzdWFsbHkgYnJvd25pc2gsIGJ1dCB0aGlzIGhhc1xuICAqIGEgZ3JlZW5pc2ggdG9uZSB0byBkaXN0aW5ndWlzaCBpdCBmcm9tIHBsYWluIGRpcnQuXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGVhZmxpdHRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NjY2YjJmIH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGZsb3JhIC0gd29vZCwgbGVhdmVzLCBldGNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKiogZ2VuZXJpYyBicm93biB3b29kXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud29vZCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4Nzc0NDIyIH0pO1xuXG4vKiogbGlnaHQgd29vZCBmb3IgZ3VtdHJlZXMgZXRjLiAgTWF5YmUgaXQncyBhIGJpdCB0b28gbGlnaHQ/XG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGlnaHR3b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhmZmVlY2MgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDU1ODgzMyB9KTtcblxuLyoqIGEgZ2VuZXJpYyBncmVlbmlzaCBsZWFmIG1hdGVyaWFsXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZm9saWFnZSA9IG5ldyBMYW1iZXJ0KFxuICB7IGNvbG9yOiAweDU1ODgzMywgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuOSB9XG4pO1xuXG4vKiogYSBncmVlbmlzaCBsZWFmIG1hdGVyaWFsIHRoYXQncyBtb3N0bHkgc2VlLXRocm91Z2hcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi50cmFuc3BhcmVudEZvbGlhZ2UgPSBuZXcgTGFtYmVydChcbiAgeyBjb2xvcjogMHg1NTg4MzMsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjMzIH1cbik7XG5cbi8qKiBhIGZvbGlhZ2UgbWF0ZXJpYWwgZm9yIHVzZSBpbiBwb2ludCBjbG91ZCBvYmplY3RzXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYucG9pbnRGb2xpYWdlID0gbmV3IFRIUkVFLlBvaW50Q2xvdWRNYXRlcmlhbCh7IGNvbG9yOiAweDU1ODgzMywgc2l6ZTogMC41IH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGJ1aWx0IG1hdGVyaWFsc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBzaWx2ZXJ5IG1ldGFsXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubWV0YWwgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHhhYWJiZWUsIHNwZWN1bGFyOiAweGZmZmZmZiwgc2hpbmluZXNzOiAxMDAsIHJlZmxlY3Rpdml0eTogMC44IH0pO1xuXG4vKiogY29uY3JldGUgaW4gYSBzb3J0IG9mIG1pZC1ncmV5XG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuY29uY3JldGUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSB9KTtcblxuLyoqIHBsYXN0aWMsIGEgZ2VuZXJpYyB3aGl0aXNoIHBsYXN0aWMgd2l0aCBhIGJpdCBvZiBzaGluaW5lc3NcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5wbGFzdGljID0gbmV3IFBob25nKHsgY29sb3I6IDB4Y2NjY2NjLCBzcGVjdWxhcjogMHhjY2NjY2MgfSk7XG5cbi8qKiBibGFjayBzaGFkZWNsb3RoLCBzbGlnaHRseSBzZWUgdGhyb3VnaCBibGFja1xuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnNoYWRlY2xvdGggPSBuZXcgTGFtYmVydChcbiAgeyBjb2xvcjogMHgxMTExMTEsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjggfVxuKTtcblxuLyoqIGdsYXNzIGlzIHNoaW55LCBmYWlybHkgdHJhbnNwYXJlbnQsIGFuZCBhIGxpdHRsZSBibHVpc2hcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nbGFzcyA9IG5ldyBQaG9uZyhcbiAgeyBjb2xvcjogMHg2NmFhZmYsIHNwZWN1bGFyOiAweGZmZmZmZiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNSB9XG4pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGdlbmVyYWwgY29sb3Vyc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBtYXR0IGJsYWNrLCBmb3IgYmxhY2sgc3VyZmFjZXMgKGFjdHVhbGx5IGl0J3MgIzExMTExMSlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5ibGFjayA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MTExMTExIH0pO1xuXG4vKiogbWF0dCB3aGl0ZSwgZm9yIHdoaXRlIHN1cmZhY2VzIChhY3R1YWxseSBpdCdzICNlZWVlZWUpXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud2hpdGUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGVlZWVlZSB9KTtcblxuLyoqIGdsb3NzIGJsYWNrLCBmb3Igc2hpbnkgYmxhY2sgcGFpbnRlZCBzdXJmYWNlcyAoYWN0dWFsbHkgaXQncyAjMTExMTExKVxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdsb3NzQmxhY2sgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHgxMTExMTEsIHNwZWN1bGFyOiAweDY2NjY2NiB9KTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBVSSB1dGlsaXR5IHRoaW5nc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBzb2xpZCBjb2xvciBmb3IgcmVuZGVyaW5nIFVJIGVsZW1lbnRzXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYudWlTaG93ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IDB4ZmZmZmZmIH0pO1xuU2NhcGVTdHVmZi51aVNob3cuZGVwdGhUZXN0ID0gZmFsc2U7XG5cbi8qKiBtb3N0bHkgdHJhbnNwYXJlbnQsIHNsaWdodGx5IHllbGxvd2lzaCBjb2xvciBmb3IgaGludGluZyBhdCBVSSBlbGVtZW50c1xuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnVpU3VnZ2VzdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7IGNvbG9yOiAweGZmZmY2NiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuMiB9KVxuU2NhcGVTdHVmZi51aVN1Z2dlc3QuZGVwdGhUZXN0ID0gZmFsc2U7XG5cbi8qKiBicmlnaHQgZ2xvd2luZyBjb2xvciBmb3IgaGlnaGxpZ2h0aW5nIFVJIGVsZW1lbnRzXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYudWlIaWdobGlnaHQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBjb2xvcjogMHhmZmZmZmYsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjQ1IH0pXG5TY2FwZVN0dWZmLnVpSGlnaGxpZ2h0LmRlcHRoVGVzdCA9IGZhbHNlO1xuXG5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU3R1ZmY7XG5cblxuXG5cbiJdfQ==
=======
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NhbWVyYS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NsaWNrYWJsZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2RlbmRyb21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9hZGRvbnMvc2FwZmxvd21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9jcmFuZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3ViZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvbGFiZWwuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2xlYWZsaXR0ZXJjYXRjaGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9zb2lscGl0LmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy90cmVlLmpzIiwic3JjL3NjYXBlL3NjZW5lLmpzIiwic3JjL3NjYXBlL3N0dWZmLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3pkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4vLyBUSFJFRSA9IHJlcXVpcmUoJ3RocmVlJyk7XG5cbi8vIG1ha2UgYW4gb2JqZWN0IG91dCBvZiB0aGUgdmFyaW91cyBiaXRzXG5TY2FwZSA9IHtcbiAgICBCYXNlT2JqZWN0OiByZXF1aXJlKCcuL3NjYXBlL2Jhc2VvYmplY3QnKSxcbiAgICBDaHVuazogICAgICByZXF1aXJlKCcuL3NjYXBlL2NodW5rJyksXG4gICAgRmllbGQ6ICAgICAgcmVxdWlyZSgnLi9zY2FwZS9maWVsZCcpLFxuICAgIEl0ZW06ICAgICAgIHJlcXVpcmUoJy4vc2NhcGUvaXRlbScpLFxuICAgIEl0ZW1UeXBlczogIHJlcXVpcmUoJy4vc2NhcGUvaXRlbXR5cGVzJyksXG4gICAgU2NlbmU6ICAgICAgcmVxdWlyZSgnLi9zY2FwZS9zY2VuZScpLFxuICAgIFN0dWZmOiAgICAgIHJlcXVpcmUoJy4vc2NhcGUvc3R1ZmYnKVxufVxuXG4vLyByZXR1cm4gdGhlIG9iamVjdCBpZiB3ZSdyZSBiZWluZyBicm93c2VyaWZpZWQ7IG90aGVyd2lzZSBhdHRhY2hcbi8vIGl0IHRvIHRoZSBnbG9iYWwgd2luZG93IG9iamVjdC5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU2NhcGU7XG59IGVsc2Uge1xuICAgIHdpbmRvdy5TY2FwZSA9IFNjYXBlO1xufVxuIiwiXG4vL1xuLy8gdGhpcyBcImJhc2VcIiBvYmplY3QgaGFzIGEgZmV3IGNvbnZlbmllbmNlIGZ1bmN0aW9ucyBmb3IgaGFuZGxpbmdcbi8vIG9wdGlvbnMgYW5kIHdoYXRub3Rcbi8vXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBTY2FwZU9iamVjdChvcHRpb25zLCBkZWZhdWx0cykge1xuICAgIHRoaXMuX29wdHMgPSBPYmplY3QuY3JlYXRlKGRlZmF1bHRzKTtcbiAgICB0aGlzLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbWVyZ2UgbmV3IG9wdGlvbnMgaW50byBvdXIgb3B0aW9uc1xuU2NhcGVPYmplY3QucHJvdG90eXBlLm1lcmdlT3B0aW9ucyA9IGZ1bmN0aW9uKGV4dHJhT3B0cykge1xuICAgIGZvciAob3B0IGluIGV4dHJhT3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzW29wdF0gPSBleHRyYU9wdHNbb3B0XTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlT2JqZWN0OyIsIlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVjdGFuZ3VsYXIgcHJpc20gb2YgbWF0ZXJpYWwgdGhhdCB0aGUgc29saWQgXCJncm91bmRcIlxuICogcG9ydGlvbiBvZiBhICdzY2FwZSBpcyBtYWtlIHVwIG9mLCBlLmcuIGRpcnQsIGxlYWYgbGl0dGVyLCB3YXRlci5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBtZXNoIGJhc2VkIG9uIHRoZSBsaW5rZWRcbiAqIGNodW5rIGluZm9ybWF0aW9uIHRvIG1ha2UgcmVuZGVyaW5nIGluIFdlYkdMIGZhc3Rlci5cbiAqXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIFRoZSBTY2FwZVNjZW5lIHRoZSBjaHVuayB3aWxsIGJlIGFkZGVkIGludG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRCbG9jayBUaGUgYmxvY2sgKHZlcnRpY2FsIGNvbHVtbiB3aXRoaW4gdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NhcGUpIHRoYXQgb3ducyB0aGlzIGNodW5rXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGxheWVySW5kZXggSW5kZXggaW50byBwYXJlbnRCbG9jay5nIHRoaXMgY2h1bmsgaXMgYXRcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaW5aIGxvd2VzdCBaIHZhbHVlIGFueSBjaHVuayBzaG91bGQgaGF2ZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zLCBub3QgY3VycmVudGx5IHVzZWRcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVDaHVuayhzY2VuZSwgcGFyZW50QmxvY2ssIGxheWVySW5kZXgsIG1pblosIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgdGhpcy5fYmxvY2sgPSBwYXJlbnRCbG9jaztcbiAgICB0aGlzLl9pc1N1cmZhY2UgPSAobGF5ZXJJbmRleCA9PSAwKTtcbiAgICB0aGlzLl9sYXllciA9IHBhcmVudEJsb2NrLmdbbGF5ZXJJbmRleF07XG4gICAgdGhpcy5fbWluWiA9IG1pblo7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcblxuICAgIC8vIFRPRE86IGZpbmlzaCBoaW0hIVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlQ2h1bmsucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVDaHVuay5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUNodW5rO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEludm9rZSBhIHJlYnVpbGQgb2YgdGhpcyBjaHVuay5cbiAqXG4gKiBEaXNjYXJkcyBleGlzdGluZyBjYWNoZWQgbWVzaCBhbmQgYnVpbGRzIGEgbmV3IG1lc2ggYmFzZWQgb24gdGhlXG4gKiBjdXJyZW50bHkgbGlua2VkIGNodW5rIGluZm9ybWF0aW9uLlxuICpcbiAqIEByZXR1cm4gbm9uZVxuICovXG5TY2FwZUNodW5rLnByb3RvdHlwZS5yZWJ1aWxkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fY3JlYXRlTmV3TWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHRoZSBjaHVuayB3aWxsIGJlIGFzIGRlZXAgYXMgdGhlIGxheWVyIHNheXNcbiAgICB2YXIgZGVwdGggPSB0aGlzLl9sYXllci5kejtcbiAgICBpZiAoZGVwdGggPT0gMCkge1xuICAgICAgICAvLyAuLnVubGVzcyB0aGF0J3MgMCwgaW4gd2hpY2ggY2FzZSBnbyB0byB0aGUgYm90dG9tXG4gICAgICAgIGRlcHRoID0gdGhpcy5fbGF5ZXIueiAtIHRoaXMuX21pblo7XG4gICAgfVxuICAgIC8vIG1ha2UgYSBnZW9tZXRyeSBmb3IgdGhlIGNodW5rXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoXG4gICAgICAgIHRoaXMuX2Jsb2NrLmR4LCB0aGlzLl9ibG9jay5keSwgZGVwdGhcbiAgICApO1xuICAgIHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgdGhpcy5fbGF5ZXIubSk7XG4gICAgbWVzaC5wb3NpdGlvbi5zZXQoXG4gICAgICAgIHRoaXMuX2Jsb2NrLnggKyB0aGlzLl9ibG9jay5keC8yLFxuICAgICAgICB0aGlzLl9ibG9jay55ICsgdGhpcy5fYmxvY2suZHkvMixcbiAgICAgICAgdGhpcy5fbGF5ZXIueiAtIGRlcHRoLzJcbiAgICApO1xuICAgIG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgLy8gb25seSB0aGUgc3VyZmFjZSBjaHVua3MgcmVjZWl2ZSBzaGFkb3dcbiAgICBpZiAodGhpcy5faXNTdXJmYWNlKSB7XG4gICAgICAgIG1lc2gucmVjZWl2ZVNoYWRvdyA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBtZXNoO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fYWRkTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLmFkZCh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3JlbW92ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zY2VuZS5yZW1vdmUodGhpcy5fbWVzaCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl91cGRhdGVNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVtb3ZlTWVzaCgpO1xuICAgIHRoaXMuX21lc2ggPSB0aGlzLl9jcmVhdGVOZXdNZXNoKCk7XG4gICAgdGhpcy5fYWRkTWVzaCgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ2h1bms7IiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuL3N0dWZmJyk7XG5TY2FwZUl0ZW0gPSByZXF1aXJlKCcuL2l0ZW0nKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBUaGUgY29udGFpbmVyIGZvciBhbGwgaW5mb3JtYXRpb24gYWJvdXQgYW4gYXJlYS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMgZm9yIHRoZSBTY2FwZUZpZWxkIGJlaW5nIGNyZWF0ZWQuXG4gKlxuICogb3B0aW9uIHwgZGVmYXVsdCB2YWx1ZSB8IGRlc2NyaXB0aW9uXG4gKiAtLS0tLS0tfC0tLS0tLS0tLS0tLS0tOnwtLS0tLS0tLS0tLS1cbiAqIGBtaW5YYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYG1heFhgICAgICB8ICAxMDAgfCBsYXJnZXN0IFggZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NYYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFggYXhpcyBpbnRvXG4gKiBgbWluWWAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhZYCAgICAgfCAgMTAwIHwgbGFyZ2VzdCBZIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWWAgIHwgICAxMCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBZIGF4aXMgaW50b1xuICogYG1pblpgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBaICh2ZXJ0aWNhbCBkaW1lbnNpb24pIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WmAgICAgIHwgICA0MCB8IGxhcmdlc3QgWiBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1pgICB8ICAgODAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWiBheGlzIGludG9cbiAqIGBibG9ja0dhcGAgfCAwLjAxIHwgZ2FwIHRvIGxlYXZlIGJldHdlZW4gYmxvY2tzIGFsb25nIHRoZSBYIGFuZCBZIGF4ZXNcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVGaWVsZChvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICAgIG1pblg6IDAsICAgICAgICBtYXhYOiAxMDAsICAgICAgICAgIGJsb2Nrc1g6IDEwLFxuICAgICAgICBtaW5ZOiAwLCAgICAgICAgbWF4WTogMTAwLCAgICAgICAgICBibG9ja3NZOiAxMCxcbiAgICAgICAgbWluWjogMCwgICAgICAgIG1heFo6IDQwLCAgICAgICAgICAgYmxvY2tzWjogODAsXG4gICAgICAgIGJsb2NrR2FwOiAwLjAxXG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIG1pbiBhbmQgbWF4IHZhbHVlcyBmb3IgeCB5IGFuZCB6XG4gICAgdGhpcy5taW5YID0gdGhpcy5fb3B0cy5taW5YO1xuICAgIHRoaXMubWluWSA9IHRoaXMuX29wdHMubWluWTtcbiAgICB0aGlzLm1pblogPSB0aGlzLl9vcHRzLm1pblo7XG5cbiAgICB0aGlzLm1heFggPSB0aGlzLl9vcHRzLm1heFg7XG4gICAgdGhpcy5tYXhZID0gdGhpcy5fb3B0cy5tYXhZO1xuICAgIHRoaXMubWF4WiA9IHRoaXMuX29wdHMubWF4WjtcblxuICAgIC8vIGNvbnZlbmllbnQgXCJ3aWR0aHNcIlxuICAgIHRoaXMud1ggPSB0aGlzLm1heFggLSB0aGlzLm1pblg7XG4gICAgdGhpcy53WSA9IHRoaXMubWF4WSAtIHRoaXMubWluWTtcbiAgICB0aGlzLndaID0gdGhpcy5tYXhaIC0gdGhpcy5taW5aO1xuXG4gICAgLy8gaG93IG1hbnkgYmxvY2tzIGFjcm9zcyB4IGFuZCB5P1xuICAgIHRoaXMuYmxvY2tzWCA9IHRoaXMuX29wdHMuYmxvY2tzWDtcbiAgICB0aGlzLmJsb2Nrc1kgPSB0aGlzLl9vcHRzLmJsb2Nrc1k7XG4gICAgdGhpcy5ibG9ja3NaID0gdGhpcy5fb3B0cy5ibG9ja3NaO1xuXG4gICAgLy8gaG93IHdpZGUgaXMgZWFjaCBibG9ja1xuICAgIHRoaXMuX2JYID0gdGhpcy53WCAvIHRoaXMuYmxvY2tzWDtcbiAgICB0aGlzLl9iWSA9IHRoaXMud1kgLyB0aGlzLmJsb2Nrc1k7XG4gICAgdGhpcy5fYlogPSB0aGlzLndaIC8gdGhpcy5ibG9ja3NaO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBudWxsO1xuXG4gICAgLy8gaG91c2VrZWVwaW5nXG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cyA9IFtdO1xuICAgIHRoaXMuX2NhbGNDZW50ZXIoKTtcbiAgICB0aGlzLl9tYWtlR3JpZCgpO1xuXG4gICAgdGhpcy5jbGlja2FibGVzID0gW107XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUZpZWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlRmllbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVGaWVsZDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJygnICsgdGhpcy5taW5YICsgJy0nICsgdGhpcy5tYXhYICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWSArICctJyArIHRoaXMubWF4WSArXG4gICAgICAgICcsICcgKyB0aGlzLm1pblogKyAnLScgKyB0aGlzLm1heFogK1xuICAgICAgICAnKSdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlRmllbGQucHJvdG90eXBlLl9tYWtlR3JpZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2cgPSBbXTtcbiAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5ibG9ja3NYOyBneCsrKSB7XG4gICAgICAgIHZhciBjb2wgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuYmxvY2tzWTsgZ3krKykge1xuICAgICAgICAgICAgdmFyIHhHYXAgPSB0aGlzLl9iWCAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIHlHYXAgPSB0aGlzLl9iWSAqIHRoaXMuX29wdHMuYmxvY2tHYXAgLyAyO1xuICAgICAgICAgICAgdmFyIGJsb2NrID0ge1xuICAgICAgICAgICAgICAgIHg6IHRoaXMubWluWCArICh0aGlzLl9iWCAqIGd4KSArIHhHYXAsXG4gICAgICAgICAgICAgICAgZHg6IHRoaXMuX2JYIC0geEdhcCAtIHhHYXAsXG4gICAgICAgICAgICAgICAgeTogdGhpcy5taW5ZICsgKHRoaXMuX2JZICogZ3kpICsgeUdhcCxcbiAgICAgICAgICAgICAgICBkeTogdGhpcy5fYlkgLSB5R2FwIC0geUdhcCxcbiAgICAgICAgICAgICAgICBnOiBbe1xuICAgICAgICAgICAgICAgICAgICB6OiB0aGlzLm1heFosXG4gICAgICAgICAgICAgICAgICAgIGR6OiAwLCAvLyAwIG1lYW5zIFwic3RyZXRjaCB0byBtaW5aXCJcbiAgICAgICAgICAgICAgICAgICAgbTogU2NhcGVTdHVmZi5nZW5lcmljLFxuICAgICAgICAgICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgIGk6IFtdXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb2wucHVzaChibG9jayk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZy5wdXNoKGNvbCk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGJ1aWxkcyBibG9jayBtZXNoZXMgZm9yIGRpc3BsYXkgaW4gdGhlIHByb3ZpZGVkIHNjZW5lLiAgVGhpcyBpc1xuICogZ2VuZXJhbGx5IGNhbGxlZCBieSB0aGUgU2NhcGVTY2VuZSBvYmplY3Qgd2hlbiB5b3UgZ2l2ZSBpdCBhXG4gKiBTY2FwZUZpZWxkLCBzbyB5b3Ugd29uJ3QgbmVlZCB0byBjYWxsIGl0IHlvdXJzZWxmLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSB0aGUgU2NhcGVTY2VuZSB0aGF0IHdpbGwgYmUgZGlzcGxheWluZ1xuICogdGhpcyBTY2FwZUZpZWxkLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5idWlsZEJsb2NrcyA9IGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdmFyIG1pblogPSB0aGlzLm1pblo7XG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYikge1xuICAgICAgICBmb3IgKHZhciBsYXllckluZGV4ID0gMDsgbGF5ZXJJbmRleCA8IGIuZy5sZW5ndGg7IGxheWVySW5kZXgrKykge1xuICAgICAgICAgICAgYi5nW2xheWVySW5kZXhdLmNodW5rID0gbmV3IFNjYXBlQ2h1bmsoXG4gICAgICAgICAgICAgICAgc2NlbmUsIGIsIGxheWVySW5kZXgsIG1pblpcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBkbyB0aGlzIHRvIGFkanVzdCBhbGwgdGhlIGNodW5rIGhlaWdodHNcbiAgICB0aGlzLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYnVpbGRzIGl0ZW0gbWVzaGVzIGZvciBkaXNwbGF5IGluIHRoZSBwcm92aWRlZCBzY2VuZS4gIFRoaXMgaXNcbiAqIGdlbmVyYWxseSBjYWxsZWQgYnkgdGhlIFNjYXBlU2NlbmUgb2JqZWN0IHdoZW4geW91IGdpdmUgaXQgYVxuICogU2NhcGVGaWVsZCwgc28geW91IHdvbid0IG5lZWQgdG8gY2FsbCBpdCB5b3Vyc2VsZi5cbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgdGhlIFNjYXBlU2NlbmUgdGhhdCB3aWxsIGJlIGRpc3BsYXlpbmdcbiAqIHRoaXMgU2NhcGVGaWVsZC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYnVpbGRJdGVtcyA9IGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB2YXIgbWluWiA9IHRoaXMubWluWjtcbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGl0ZW1JbmRleCA9IDA7IGl0ZW1JbmRleCA8IGIuaS5sZW5ndGg7IGl0ZW1JbmRleCsrKSB7XG4gICAgICAgICAgICBiLmlbaXRlbUluZGV4XS5hZGRUb1NjZW5lKHNjZW5lKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhZHZpc2UgdGhlIHNjZW5lLCBpZiB3ZSBoYXZlIG9uZSwgdGhhdCB0aGVyZSBhcmUgbmV3IGl0ZW1zLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUudXBkYXRlSXRlbXMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fc2NlbmUpIHtcbiAgICAgICAgdGhpcy5fc2NlbmUucmVmcmVzaEl0ZW1zKCk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB1cGRhdGUgYW4gaXRlbS5cblNjYXBlRmllbGQucHJvdG90eXBlLnVwZGF0ZUl0ZW0gPSBmdW5jdGlvbihpdGVtLCB1cGRhdGVzKSB7XG5cbiAgICAvLyByZW1vdmUgb2xkIGNsaWNrYWJsZXNcbiAgICBpdGVtLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIHZhciBjaSA9IHRoaXMuY2xpY2thYmxlcy5pbmRleE9mKGNwKTtcbiAgICAgICAgaWYgKGNpICE9IC0xKSB7XG4gICAgICAgICAgICB0aGlzLmNsaWNrYWJsZXMuc3BsaWNlKGNpLCAxKTtcbiAgICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgaXRlbS51cGRhdGUodXBkYXRlcyk7XG4gICAgLy8gVE9ETzogd2hhdCBpZiAoeCx5KSBwb3NpdGlvbiBpcyB1cGRhdGVkP1xuXG4gICAgLy8gYWRkIG5ldyBjbGlja2FibGVzXG4gICAgaXRlbS5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICB0aGlzLmNsaWNrYWJsZXMucHVzaChjcCk7XG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBpdGVtcyB0byB0aGUgc2NhcGUgYXQgdmFyaW91cyBwb2ludHMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaXRlbUxpc3QgQSBsaXN0IG9mIGl0ZW1zLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgaXRlbWAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtcyA9IGZ1bmN0aW9uKGl0ZW1MaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVBbGxJdGVtcygpO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaXRlbUxpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHRoZUl0ZW0gPSBpdGVtTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRJdGVtKHRoZUl0ZW0pO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZUl0ZW1zKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnJlbW92ZUFsbEl0ZW1zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lYWNoQmxvY2soZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICBmb3IgKHZhciBpbmRleD0wOyBpbmRleCA8IGJsb2NrLmkubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBibG9jay5pW2luZGV4XS5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgYmxvY2suaSA9IFtdO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuY2xpY2thYmxlcyA9IFtdO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtID0gZnVuY3Rpb24oaXRlbSkge1xuXG4gICAgLy8gYWRkIHRvIHRoZSBwYXJlbnQgYmxvY2tcbiAgICB2YXIgcGFyZW50QmxvY2sgPSB0aGlzLmdldEJsb2NrKGl0ZW0ueCwgaXRlbS55KTtcbiAgICBwYXJlbnRCbG9jay5pLnB1c2goaXRlbSk7XG5cbiAgICBpdGVtLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIHRoaXMuY2xpY2thYmxlcy5wdXNoKGNwKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIC8vIHNldCBpdGVtIGhlaWdodCB0byB0aGUgcGFyZW50IGJsb2NrJ3MgZ3JvdW5kIGhlaWdodFxuICAgIGl0ZW0uc2V0SGVpZ2h0KHBhcmVudEJsb2NrLmdbMF0ueik7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBpdGVtcyB0byB0aGUgc2NhcGUgYXQgdmFyaW91cyBwb2ludHMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaXRlbUxpc3QgQSBsaXN0IG9mIGl0ZW1zLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgaXRlbWAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRJdGVtc09mVHlwZSA9IGZ1bmN0aW9uKGl0ZW1MaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5faXRlbXMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGl0ZW1MaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBpdGVtSW5mbyA9IGl0ZW1MaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEl0ZW0obmV3IFNjYXBlSXRlbShpdGVtSW5mby50eXBlLCBpdGVtSW5mby54LCBpdGVtSW5mby55LCBpdGVtSW5mbykpO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGNsYWltcyBvZiB0aGUgZ3JvdW5kIGhlaWdodCBhdCB2YXJpb3VzIHBvaW50cy5cbiAqIFVubGlrZSB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRIZWlnaHQgYWRkR3JvdW5kSGVpZ2h0fSwgdGhpc1xuICogbWV0aG9kIHdpbGwgcmUtZXh0cmFwb2xhdGUgZ3JvdW5kIGhlaWdodHMgYWNyb3NzIHRoZSBGaWVsZCAoc29cbiAqIHlvdSBkb24ndCBuZWVkIHRvIGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNHcm91bmRIZWlnaHRzIGNhbGNHcm91bmRIZWlnaHRzfSB5b3Vyc2VsZikuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaGVpZ2h0TGlzdCBBIGxpc3Qgb2Ygb2JqZWN0cy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYHpgIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKGhlaWdodExpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBoZWlnaHRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGhlaWdodExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kSGVpZ2h0KHB0LngsIHB0LnksIHB0LnopO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRIZWlnaHRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgY2xhaW0gdGhhdCB0aGUgZ3JvdW5kIGhlaWdodCBpcyBgemAgYXQgcG9pbnQgYHhgLGB5YC5cbiAqIElmIHlvdSBjYWxsIHRoaXMsIHJlbWVtYmVyIHRvIGV2ZW50dWFsbHkgY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IGFmdGVyIHNvXG4gKiBncm91bmQgaGVpZ2h0cyBnZXQgZXh0cmFwb2xhdGVkIGFjcm9zcyB0aGUgZW50aXJlIEZpZWxkLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFggY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geSBZIGNvb3JkaW5hdGUgb2YgdGhpcyBncm91bmQgaGVpZ2h0IHJlY29yZFxuICogQHBhcmFtIHtOdW1iZXJ9IHogdGhlIGhlaWdodCBvZiB0aGUgZ3JvdW5kIGF0IHBvc2l0aW9uIGB4YCxgeWBcbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kSGVpZ2h0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMucHVzaCh7IHg6IHgsIHk6IHksIHo6IHogfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGFkZGl0aW9uYWwgZ3JvdW5kIHN0YWNrcyB0byB0aGUgZmllbGQncyBncm91bmQgc3RhY2tzLlxuICogVGhlIGdyb3VuZExpc3QgaXMgYW4gYXJyYXkgb2YgZGF0YSBvYmplY3RzLiAgRWFjaCBvYmplY3QgbmVlZHMgeCxcbiAqIHkgYW5kIHogcHJvcGVydGllcywgYW5kIGEgJ3N0YWNrJyBwcm9wZXJ0eSwgZWFjaCBtYXRjaGluZyB0aGVcbiAqIGNvcnJlc3BvbmRpbmcgYXJnIHRvIGFkZEdyb3VuZFN0YWNrLlxuICogQHBhcmFtIHtib29sZWFufSByZXBsYWNlIGlmIHJlcGxhY2UgaXMgdHJ1dGh5LCBkaXNjYXJkIGV4aXN0aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdW5kIHBvaW50cyBmaXJzdC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oZ3JvdW5kTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgZ3JvdW5kTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgcHQgPSBncm91bmRMaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEdyb3VuZFN0YWNrKHB0LngsIHB0LnksIHB0LnN0YWNrKTtcbiAgICB9XG4gICAgdGhpcy5jYWxjR3JvdW5kU3RhY2tzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgZ3JvdW5kIHN0YWNrIGF0IHgseSwgc3RhcnRpbmcgYXQgaGVpZ2h0IHouXG4gKiBUaGUgc3RhY2sgaXMgYW4gYXJyYXkgb2YgdHdvLWVsZW1lbnQgYXJyYXlzIHdpdGggYSBNYXRlcmlhbFxuICogYW5kIGEgZGVwdGggbnVtYmVyLCBsaWtlIHRoaXM6XG4gKiBbXG4gKiAgICAgW01hdGVyaWFsLmxlYWZMaXR0ZXIsIDAuM10sXG4gKiAgICAgW01hdGVyaWFsLmRpcnQsIDMuNV0sXG4gKiAgICAgW01hdGVyaWFsLnN0b25lLCA0XVxuICogXVxuICogVGhhdCBwdXRzIGEgbGVhZmxpdHRlciBsYXllciAwLjMgdW5pdHMgZGVlcCBvbiBhIDMuNS11bml0XG4gKiBkZWVwIGRpcnQgbGF5ZXIsIHdoaWNoIGlzIG9uIGEgc3RvbmUgbGF5ZXIuICBJZiB0aGUgZmluYWxcbiAqIGxheWVyJ3MgZGVwdGggaXMgemVybywgdGhhdCBsYXllciBpcyBhc3N1bWVkIHRvIGdvIGFsbCB0aGVcbiAqIHdheSB0byBtaW5aLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gY2FsY0dyb3VuZCgpIGFmdGVyLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKHgsIHksIHN0YWNrKSB7XG4gICAgLy8gVE9ETzogY2hlY2sgZm9yIHZhbGlkaXR5XG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzLnB1c2goeyB4OiB4LCAgeTogeSwgIHN0YWNrOiBzdGFjayB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiAocmUpY2FsY3VsYXRlIHRoZSBncm91bmQgaGVpZ2h0LiAgWW91IG5lZWQgdG8gY2FsbCB0aGlzIGlmIHlvdVxuICogYWRkIGdyb3VuZCBoZWlnaHQgY2xhaW1zIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kSGVpZ2h0cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gZmluZCBoZWlnaHQgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGFsbG93aW5nIGVhY2hcbiAgICAgICAgLy8ga25vd24gZ3JvdW5kIGhlaWdodCB0byBcInZvdGVcIiB1c2luZyB0aGUgaW52ZXJzZSBvZlxuICAgICAgICAvLyBpdCdzIHNxdWFyZWQgZGlzdGFuY2UgZnJvbSB0aGUgY2VudHJlIG9mIHRoZSBibG9jay5cbiAgICAgICAgdmFyIGgsIGR4LCBkeSwgZGlzdCwgdm90ZVNpemU7XG4gICAgICAgIHZhciBiWiA9IDA7XG4gICAgICAgIHZhciB2b3RlcyA9IDA7XG4gICAgICAgIGZvciAodmFyIGdoPTA7IGdoIDwgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5sZW5ndGg7IGdoKyspIHtcbiAgICAgICAgICAgIGggPSB0aGlzLl9ncm91bmRIZWlnaHRzW2doXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBoLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gaC55O1xuICAgICAgICAgICAgZGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgdm90ZVNpemUgPSAxIC8gZGlzdDtcbiAgICAgICAgICAgIGJaICs9IGgueiAqIHZvdGVTaXplO1xuICAgICAgICAgICAgdm90ZXMgKz0gdm90ZVNpemU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGRpdmlkZSB0byBmaW5kIHRoZSBhdmVyYWdlXG4gICAgICAgIGJaID0gYlogLyB2b3RlcztcblxuICAgICAgICAvLyBibG9jay1pc2ggaGVpZ2h0czogcm91bmQgdG8gdGhlIG5lYXJlc3QgX2JaXG4gICAgICAgIHZhciBkaWZmWiA9IGJaIC0gdGhpcy5taW5aO1xuICAgICAgICBiWiA9IHRoaXMubWluWiArIE1hdGgucm91bmQoZGlmZlogLyB0aGlzLl9iWikgKiB0aGlzLl9iWjtcblxuICAgICAgICAvLyBva2F5IG5vdyB3ZSBrbm93IGEgaGVpZ2h0ISAgc2V0IGl0XG4gICAgICAgIHRoaXMuc2V0QmxvY2tIZWlnaHQoYmxvY2ssIGJaKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBzdGFja3MuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIHN0YWNrcyBvbmUgYXQgYSB0aW1lIHVzaW5nXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRTdGFjayBhZGRHcm91bmRTdGFja30uXG4gKlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jYWxjR3JvdW5kU3RhY2tzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBtYWtlIHRoZSBzdGFjayBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgY29weWluZyB0aGVcbiAgICAgICAgLy8gbmVhcmVzdCBkZWZpbmVkIHN0YWNrLlxuICAgICAgICB2YXIgcywgZHgsIGR5LCB0aGlzRGlzdCwgYmVzdFN0YWNrO1xuICAgICAgICB2YXIgYmVzdERpc3QgPSB0aGlzLndYICsgdGhpcy53WSArIHRoaXMud1o7XG4gICAgICAgIGJlc3REaXN0ID0gYmVzdERpc3QgKiBiZXN0RGlzdDtcbiAgICAgICAgZm9yICh2YXIgZ3M9MDsgZ3MgPCB0aGlzLl9ncm91bmRTdGFja3MubGVuZ3RoOyBncysrKSB7XG4gICAgICAgICAgICBzID0gdGhpcy5fZ3JvdW5kU3RhY2tzW2dzXTtcbiAgICAgICAgICAgIGR4ID0gYmxvY2sueCArICgwLjUgKiB0aGlzLl9iWCkgLSBzLng7XG4gICAgICAgICAgICBkeSA9IGJsb2NrLnkgKyAoMC41ICogdGhpcy5fYlkpIC0gcy55O1xuICAgICAgICAgICAgdGhpc0Rpc3QgPSAxICsgZHgqZHggKyBkeSpkeTtcbiAgICAgICAgICAgIGlmICh0aGlzRGlzdCA8IGJlc3REaXN0KSB7XG4gICAgICAgICAgICAgICAgYmVzdFN0YWNrID0gcztcbiAgICAgICAgICAgICAgICBiZXN0RGlzdCA9IHRoaXNEaXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb2theSB3ZSBnb3QgYSBzdGFjay5cbiAgICAgICAgdGhpcy5zZXRHcm91bmRTdGFjayhibG9jaywgYmVzdFN0YWNrLnN0YWNrKTtcblxuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fY2FsY0NlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY2VudHJlIG9mIHRoZSBmaWVsZCBhbmQgcmVjb3JkIGl0IGFzIC5jZW50ZXJcbiAgICB0aGlzLmNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAodGhpcy5taW5YICsgdGhpcy5tYXhYKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblkgKyB0aGlzLm1heFkpIC8gMixcbiAgICAgICAgKHRoaXMubWluWiArIHRoaXMubWF4WikgLyAyXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0R3JvdW5kU3RhY2sgPSBmdW5jdGlvbihibG9jaywgc3RhY2spIHtcbiAgICB2YXIgbGF5ZXJMZXZlbCA9IGJsb2NrLmdbMF0uejtcbiAgICBmb3IgKHZhciBsYXllciA9IDA7IGxheWVyIDwgc3RhY2subGVuZ3RoOyBsYXllcisrKSB7XG4gICAgICAgIGJsb2NrLmdbbGF5ZXJdID0ge1xuICAgICAgICAgICAgejogbGF5ZXJMZXZlbCxcbiAgICAgICAgICAgIGR6OiBzdGFja1tsYXllcl1bMV0sXG4gICAgICAgICAgICBtOiBzdGFja1tsYXllcl1bMF0sXG4gICAgICAgICAgICBjaHVuazogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBsYXllckxldmVsIC09IHN0YWNrW2xheWVyXVsxXTtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVidWlsZENodW5rcyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGlmIChibG9jay5nW2xdLmNodW5rKSB7XG4gICAgICAgICAgICBibG9jay5nW2xdLmNodW5rLnJlYnVpbGQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuc2V0QmxvY2tIZWlnaHQgPSBmdW5jdGlvbihibG9jaywgeikge1xuICAgIC8vIHRvIHNldCB0aGUgYmxvY2sgZ3JvdW5kIGhlaWdodCwgd2UgbmVlZCB0byBmaW5kIHRoZSBibG9jaydzXG4gICAgLy8gY3VycmVudCBncm91bmQgaGVpZ2h0ICh0aGUgeiBvZiB0aGUgdG9wIGxheWVyKSwgd29yayBvdXQgYVxuICAgIC8vIGRpZmYgYmV0d2VlbiB0aGF0IGFuZCB0aGUgbmV3IGhlaWdodCwgYW5kIGFkZCB0aGF0IGRpZmYgdG9cbiAgICAvLyBhbGwgdGhlIGxheWVycy5cbiAgICB2YXIgZFogPSB6IC0gYmxvY2suZ1swXS56O1xuICAgIHZhciBkZXB0aDtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgYmxvY2suZ1tsXS56ICs9IGRaO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5nZXRCbG9jayA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAvLyByZXR1cm4gdGhlIGJsb2NrIHRoYXQgaW5jbHVkZXMgIHgseVxuICAgIHZhciBneCA9IE1hdGguZmxvb3IoICh4IC0gdGhpcy5taW5YKSAvIHRoaXMuX2JYICk7XG4gICAgdmFyIGd5ID0gTWF0aC5mbG9vciggKHkgLSB0aGlzLm1pblkpIC8gdGhpcy5fYlkgKTtcbiAgICByZXR1cm4gKHRoaXMuX2dbZ3hdW2d5XSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGludm9rZSB0aGUgY2FsbGJhY2sgZWFjaCBibG9jayBpbiB0dXJuXG4vLyBjYWxsYmFjayBzaG91bGQgbG9vayBsaWtlOiBmdW5jdGlvbihlcnIsIGJsb2NrKSB7IC4uLiB9XG4vLyBpZiBlcnIgaXMgbnVsbCBldmVyeXRoaW5nIGlzIGZpbmUuIGlmIGVyciBpcyBub3QgbnVsbCwgdGhlcmVcbi8vIHdhcyBhbiBlcnJvci5cblNjYXBlRmllbGQucHJvdG90eXBlLmVhY2hCbG9jayA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnLCBvcmRlcikge1xuICAgIGlmIChvcmRlciA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3JkZXIgPSAneHVwLXl1cCc7XG4gICAgfVxuICAgIGlmICh0aGlzQXJnID09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzQXJnID0gdGhpcztcbiAgICB9XG4gICAgaWYgKG9yZGVyID09ICd4dXAteXVwJykge1xuICAgICAgICBmb3IgKHZhciBneCA9IDA7IGd4IDwgdGhpcy5fZy5sZW5ndGg7IGd4KyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGd5ID0gMDsgZ3kgPCB0aGlzLl9nWzBdLmxlbmd0aDsgZ3krKykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgbnVsbCwgdGhpcy5fZ1tneF1bZ3ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlRmllbGQ7XG5cblxuXG5cbiIsIlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuXG5cbi8vIERFQlVHXG52YXIgU2NhcGVJdGVtcyA9IHJlcXVpcmUoJy4vaXRlbXR5cGVzJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmVwcmVzZW50cyBhbiBpdGVtIHRoYXQgbWlnaHQgYXBwZWFyIGluIGEgU2NhcGUuXG4gKlxuICogVGhpcyB3aWxsIGNyZWF0ZSAoYW5kIGludGVybmFsbHkgY2FjaGUpIGEgc2V0IG9mIG1lc2hlcyB1c2luZ1xuICogdGhlIGxpbmtlZCBpdGVtIHR5cGUsIGFuZCBwb3NpdGlvbiB0aGVtIGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkXG4gKiB4LHkgbG9jYXRpb24uXG4gKlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSBUaGUgU2NhcGVTY2VuZSB0aGUgaXRlbSB3aWxsIGJlIGFkZGVkIGludG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRCbG9jayBUaGUgYmxvY2sgdGhhdCBvd25zIHRoaXMgaXRlbVxuICogQHBhcmFtIHtTY2FwZUl0ZW1UeXBlfSBpdGVtVHlwZSBUeXBlIG9mIHRoaXMgaXRlbVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zLCBub3QgY3VycmVudGx5IHVzZWRcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVJdGVtKGl0ZW1UeXBlLCB4LCB5LCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICB0aGlzLl90eXBlID0gaXRlbVR5cGU7XG4gICAgdGhpcy5fc2NlbmUgPSBudWxsO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLl9wb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCAwKTtcblxuICAgIGlmICh0eXBlb2YgdGhpcy5fb3B0cy5jbGlja0lkICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmNsaWNrSWQgPSB0aGlzLl9vcHRzLmNsaWNrSWQ7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogbWF5YmUgaGF2ZSBhIHNldCBvZiBtZXNoZXMgZm9yIGVhY2ggc2NlbmUsIHNvIGFuIGl0ZW1cbiAgICAvLyBjYW4gYmUgaW4gbXVsdGlwbGUgc2NlbmVzP1xuICAgIHRoaXMuX2NyZWF0ZU5ldygpO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVJdGVtLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlSXRlbS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUl0ZW07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX2NyZWF0ZU5ldyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9tZXNoZXMgJiYgdGhpcy5fbWVzaGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9jbGlja1BvaW50cyAmJiB0aGlzLl9jbGlja1BvaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuX2Rpc3Bvc2VPZkNsaWNrUG9pbnRzKCk7XG4gICAgfVxuXG4gICAgdmFyIHRoaW5ncyA9IHRoaXMuX3R5cGUodGhpcy5fb3B0cyk7XG5cbiAgICB0aGlzLl9tZXNoZXMgPSB0aGluZ3MubWVzaGVzO1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBtLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHRoaXMuX2NsaWNrUG9pbnRzID0gdGhpbmdzLmNsaWNrUG9pbnRzO1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgY3AucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUZyb21TY2VuZSgpO1xuICAgIHRoaXMuX2Rpc3Bvc2VPZk1lc2hlcygpO1xuICAgIHRoaXMuX2Rpc3Bvc2VPZkNsaWNrUG9pbnRzKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24odXBkYXRlZE9wdGlvbnMpIHtcbiAgICB0aGlzLm1lcmdlT3B0aW9ucyh1cGRhdGVkT3B0aW9ucyk7XG4gICAgdGhpcy5fdXBkYXRlKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24oeikge1xuICAgIHRoaXMuX3Bvcy5zZXRaKHopO1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBtLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIGNwLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5hZGRUb1NjZW5lID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgc2NlbmUuYWRkKG0pO1xuICAgIH0pO1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgc2NlbmUuYWRkKGNwKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl9kaXNwb3NlT2ZNZXNoZXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgaWYgKG0uZ2VvbWV0cnkpIG0uZ2VvbWV0cnkuZGlzcG9zZSgpO1xuICAgICAgICBtLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdkaXNwb3NlJ30pO1xuICAgIH0pO1xuICAgIC8vIFRPRE86IGRpc3Bvc2Ugb2YgY2xpY2tQb2ludHNcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fZGlzcG9zZU9mQ2xpY2tQb2ludHMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIGlmIChjcC5nZW9tZXRyeSkgY3AuZ2VvbWV0cnkuZGlzcG9zZSgpO1xuICAgICAgICBjcC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnZGlzcG9zZSd9KTtcbiAgICB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5yZW1vdmVGcm9tU2NlbmUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fc2NlbmUpIHtcbiAgICAgICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgICAgICB0aGlzLl9zY2VuZS5yZW1vdmUobSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB0aGlzLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgICAgICB0aGlzLl9zY2VuZS5yZW1vdmUoY3ApO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgdGhpcy5fc2NlbmUgPSBudWxsO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjZW5lID0gdGhpcy5fc2NlbmU7IC8vIHJlbWVtYmVyIHRoaXMgYmVjYXVzZSByZW1vdmVGcm9tU2NlbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2lsbCBkZWxldGUgdGhpcy5fc2NlbmVcbiAgICBpZiAodGhpcy5fc2NlbmUpIHsgdGhpcy5yZW1vdmVGcm9tU2NlbmUoKTsgfVxuICAgIHRoaXMuX2Rpc3Bvc2VPZk1lc2hlcygpO1xuICAgIHRoaXMuX2Rpc3Bvc2VPZkNsaWNrUG9pbnRzKCk7XG5cbiAgICB0aGlzLl9jcmVhdGVOZXcoKTtcbiAgICBpZiAoc2NlbmUpIHsgdGhpcy5hZGRUb1NjZW5lKHNjZW5lKTsgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBkbyBzb21ldGhpbmcgdG8gZWFjaCBjbGlja1BvaW50XG5TY2FwZUl0ZW0ucHJvdG90eXBlLmVhY2hDbGlja1BvaW50ID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBpZiAodGhpcy5fY2xpY2tQb2ludHMpIHtcbiAgICAgICAgZm9yICh2YXIgY3AgPSAwOyBjcCA8IHRoaXMuX2NsaWNrUG9pbnRzLmxlbmd0aDsgY3ArKykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLl9jbGlja1BvaW50c1tjcF0pO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBkbyBzb21ldGhpbmcgdG8gZWFjaCBtZXNoXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmVhY2hNZXNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBpZiAodGhpcy5fbWVzaGVzKSB7XG4gICAgICAgIGZvciAodmFyIG0gPSAwOyBtIDwgdGhpcy5fbWVzaGVzLmxlbmd0aDsgbSsrKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMuX21lc2hlc1ttXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVJdGVtO1xuIiwiXG4vKipcbiAqIEEgYmFnIG9mIGl0ZW0gdHlwZXMgdGhhdCBzY2FwZXMgY2FuIGhhdmUgaW4gdGhlbS4gIEFuIGl0ZW0gdHlwZVxuICogaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIG9wdGlvbnMgZGVzY3JpYmluZyB0aGUgaXRlbSwgYW5kIHJldHVybnNcbiAqIGFuIGFycmF5IG9mIG1lc2hlcyB0aGF0IGFyZSB0aGUgaXRlbSAoYXQgMCwwLDApLlxuICpcbiAqIFdoZW4gYSBTY2FwZUl0ZW0gaXMgaW5zdGFudGlhdGVkIGl0IGludm9rZXMgdGhlIGFwcHJvcHJpYXRlIGl0ZW1cbiAqIHR5cGUgdG8gZ2V0IG1lc2hlcywgdGhlbiByZS1wb3NpdGlvbnMgdGhlIG1lc2hlcyBhdCB0aGVcbiAqIGFwcHJvcHJpYXRlIHgseSx6IGxvY2F0aW9uLlxuICpcbiAqIEBuYW1lc3BhY2VcbiAqL1xudmFyIFNjYXBlSXRlbXMgPSB7XG4gICAgLy8gZG9jdW1lbnRhdGlvbiBmb3IgaXRlbXMgYXJlIGluIHRoZSAuL2l0ZW10eXBlcy8qIGZpbGVzXG4gICAgY3ViZTogICAgICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvY3ViZScpLFxuICAgIHRyZWU6ICAgICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL3RyZWUnKSxcbiAgICBjcmFuZTogICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy9jcmFuZScpLFxuICAgIHNvaWxQaXQ6ICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL3NvaWxwaXQnKSxcbiAgICBsZWFmTGl0dGVyQ2F0Y2hlcjogIHJlcXVpcmUoJy4vaXRlbXR5cGVzL2xlYWZsaXR0ZXJjYXRjaGVyJyksXG5cbiAgICBsYWJlbDogICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy9sYWJlbCcpXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlSXRlbXM7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi8uLi9zdHVmZicpO1xudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogVE9ETzogd29yayBvdXQgaG93IHRvIGRvYyB0aGVzZSBhZGRvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gcGFyZW50UGFydHMgdGhlIG1lc2ggYW5kIGNsaWNrUG9pbnQgY29sbGVjdGlvblxuICAqICAgICAgICB0aGF0IGlzIHRoZSB0aGluZyB0aGUgY2FtZXJhIGlzIG1vdW50ZWQgb25cbiAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB0aGUgcGFyZW50J3Mgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlXG4gICogICAgICAgIHBhcmVudCBvYmplY3QgZmFjdG9yeVxuICAqL1xuZnVuY3Rpb24gU2NhcGVDYW1lcmFBZGRvbihwYXJlbnRQYXJ0cywgb3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwgeyBtZXNoTmFtZXM6IFtdIH07XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBtaWdodCBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuY2FtZXJhIGlzIGEgc3RyaW5nLFxuXHQvLyB1c2UgdGhhdCBzdHJpbmcgYXMgdGhlIGNsaWNrRGF0YSBhbmQgdXNlIGRlZmF1bHRzIGZvclxuXHQvLyBldmVyeXRoaW5nIGVsc2UuXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5jYW1lcmEgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5jYW1lcmEgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5jYW1lcmEgfTtcblx0fVxuXG5cdHZhciBjID0ge307XG5cblx0Yy5uYW1lID0gb3B0aW9ucy5jYW1lcmEubmFtZSB8fCAnY2FtZXJhJztcblxuXHRjLmhlaWdodCA9IG9wdGlvbnMuY2FtZXJhLmhlaWdodCB8fCAzO1xuXHRjLnggPSAwO1xuXHRjLnkgPSAwO1xuXG5cdGMuYm9keVdpZHRoID0gb3B0aW9ucy5jYW1lcmEuc2l6ZSB8fCAyO1xuXHRjLmJvZHlIZWlnaHQgPSBjLmJvZHlXaWR0aDtcblx0Yy5ib2R5RGVwdGggPSAwLjY3ICogYy5ib2R5V2lkdGg7XG5cblx0Yy5sZW5zTGVuZ3RoID0gMC4zMyAqIGMuYm9keVdpZHRoO1xuXHRjLmxlbnNSYWRpdXMgPSBNYXRoLm1pbihjLmJvZHlXaWR0aCwgYy5ib2R5SGVpZ2h0KSAvIDQ7XG5cblx0Yy5nbGFzc0xlbmd0aCA9IGMubGVuc1JhZGl1cyAvIDg7XG5cdGMuZ2xhc3NSYWRpdXMgPSBjLmxlbnNSYWRpdXMgLSBjLmdsYXNzTGVuZ3RoO1xuXG5cdGMuYm9keVN0dWZmID0gb3B0aW9ucy5jYW1lcmEuYm9keSB8fCBTY2FwZVN0dWZmLm1ldGFsO1xuXHRjLmxlbnNTdHVmZiA9IG9wdGlvbnMuY2FtZXJhLmxlbnMgfHwgU2NhcGVTdHVmZi5ibGFjaztcblx0Yy5nbGFzc1N0dWZmID0gb3B0aW9ucy5jYW1lcmEuZ2xhc3MgfHwgU2NhcGVTdHVmZi5nbGFzcztcblxuXHRjLmNsaWNrRGF0YSA9IG9wdGlvbnMuY2FtZXJhLmNsaWNrRGF0YSB8fCBudWxsO1xuXG5cdC8vIHRoZSBwb3NpdGlvbiBvZiB0aGUgY2FtZXJhIHJlbGF0aXZlIHRvIHRoZSBwYXJlbnQgb2JqZWN0XG5cdGlmIChpLnRvd2VySGVpZ2h0ICYmIGkudG93ZXJXaWR0aCAmJiBpLnJpbmdIKSB7XG5cdFx0Ly8gaXQncyBhIGNyYW5lLCBwcm9iYWJseS4gIFBvc2l0aW9uIHRoZSBjYW1lcmEgYmVsb3cgdGhlXG5cdFx0Ly8gcmluZyBhdCB0aGUgdG9wIG9mIHRoZSBjcmFuZSB0b3dlci5cblx0XHRjLmhlaWdodCA9IG9wdGlvbnMuY2FtZXJhLmhlaWdodCB8fCAoaS50b3dlckhlaWdodCAtIGkucmluZ0ggLSAyICogYy5ib2R5SGVpZ2h0KTtcblx0XHRjLnggPSAoaS50b3dlcldpZHRoICsgYy5ib2R5RGVwdGggKyBjLmxlbnNMZW5ndGgpLzI7XG5cdH1cblxuXHR2YXIgcmVsb2NhdGUgPSBuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oYy54LCBjLnksIGMuaGVpZ2h0KTtcblxuXHQvLyB0aGUgY2FtZXJhIGJvZHlcblx0dmFyIGJvZHlHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGMuYm9keURlcHRoLCBjLmJvZHlXaWR0aCwgYy5ib2R5SGVpZ2h0KTtcblx0Ym9keUdlb20uYXBwbHlNYXRyaXgoIG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigtMSAqIChjLmJvZHlEZXB0aC8yIC0gKGMuYm9keURlcHRoIC0gYy5sZW5zTGVuZ3RoKS8yKSwgMCwgYy5ib2R5SGVpZ2h0LzIpXG5cdFx0Lm11bHRpcGx5KHJlbG9jYXRlKVxuXHQpO1xuXHR2YXIgYm9keSA9IG5ldyBUSFJFRS5NZXNoKGJvZHlHZW9tLCBjLmJvZHlTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goYm9keSk7XG5cdHBhcmVudFBhcnRzLm1lc2hlcy5wdXNoKGJvZHkpO1xuXG5cdC8vIHRoZSBsZW5zXG5cdHZhciBsZW5zR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGMubGVuc1JhZGl1cywgYy5sZW5zUmFkaXVzLCBjLmxlbnNMZW5ndGgpO1xuXHRsZW5zR2VvbS5hcHBseU1hdHJpeCggbmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKGMubGVuc0xlbmd0aC8yICsgKGMuYm9keURlcHRoIC0gYy5sZW5zTGVuZ3RoKS8yLCAwLCBjLmJvZHlIZWlnaHQvMilcblx0XHQubXVsdGlwbHkocmVsb2NhdGUpXG5cdFx0Lm11bHRpcGx5KG5ldyBNNCgpLm1ha2VSb3RhdGlvblooTWF0aC5QSS8yKSlcblx0KTtcblx0dmFyIGxlbnMgPSBuZXcgVEhSRUUuTWVzaChsZW5zR2VvbSwgYy5sZW5zU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKGxlbnMpO1xuXHRwYXJlbnRQYXJ0cy5tZXNoZXMucHVzaChsZW5zKTtcblxuXHQvLyB0aGUgZ2xhc3MgbGVucyBiaXRcblx0dmFyIGdsYXNzR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGMuZ2xhc3NSYWRpdXMsIGMuZ2xhc3NSYWRpdXMsIGMuZ2xhc3NMZW5ndGgpO1xuXHRnbGFzc0dlb20uYXBwbHlNYXRyaXgoIG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLjUgKiAoYy5ib2R5RGVwdGggKyBjLmxlbnNMZW5ndGggKyBjLmdsYXNzTGVuZ3RoKSwgMCwgYy5ib2R5SGVpZ2h0LzIpXG5cdFx0Lm11bHRpcGx5KHJlbG9jYXRlKVxuXHRcdC5tdWx0aXBseShuZXcgTTQoKS5tYWtlUm90YXRpb25aKE1hdGguUEkvMikpXG5cdCk7XG5cdHZhciBnbGFzcyA9IG5ldyBUSFJFRS5NZXNoKGdsYXNzR2VvbSwgYy5nbGFzc1N0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaChnbGFzcyk7XG5cdHBhcmVudFBhcnRzLm1lc2hlcy5wdXNoKGdsYXNzKTtcblxuXHQvLyB0aGUgY2FtZXJhIHNob3VsZCBiZSBjbGlja2FibGVcblx0aWYgKGMuY2xpY2tEYXRhKSB7XG5cdFx0dmFyIGNhbUNsaWNrID0gU2NhcGVDbGlja2FibGUoYy5uYW1lLCBjLmNsaWNrRGF0YSwgYy54LCBjLnksIGMuaGVpZ2h0ICsgYy5ib2R5SGVpZ2h0LzIpO1xuXHRcdHBhcmVudFBhcnRzLmNsaWNrUG9pbnRzLnB1c2goY2FtQ2xpY2spO1xuXHR9XG5cblx0aS5jYW1lcmEgPSBjO1xuXG5cdHJldHVybiBwYXJlbnRQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDYW1lcmFBZGRvbjtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uLy4uL3N0dWZmJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgQ2xpY2thYmxlIG9iamVjdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuZGlhbWV0ZXI9MSBEaWFtZXRlciBvZiB0cnVuayAoYS5rLmEuIERCSClcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmhlaWdodD0xMCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy50cnVua01hdGVyaWFsPVNjYXBlU3R1ZmYud29vZCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5sZWFmTWF0ZXJpYWw9U2NhcGVTdHVmZi5mb2xpYWdlIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMudHJlZVxuICovXG5mdW5jdGlvbiBTY2FwZUNsaWNrYWJsZShuYW1lLCBjbGlja0RhdGEsIHgsIHksIHopIHtcblx0dmFyIGNsaWNrZXIgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuXHR2YXIgaG92ZXJSYWRpdXMgPSA4O1xuXHR2YXIgY2xpY2tSYWRpdXMgPSAzLjU7XG5cdHZhciBsaW5lTGVuZ3RoID0gODtcblxuXHR2YXIgdHJhbnNsYXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oeCwgeSwgeik7XG5cblx0aG92ZXJNYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7IGNvbG9yOiAweGZmZmYwMCwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuMyB9KVxuXHR2YXIgaG92ZXJHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KGhvdmVyUmFkaXVzKTtcblx0aG92ZXJHZW9tLmFwcGx5TWF0cml4KHRyYW5zbGF0ZSk7XG5cdHZhciBob3ZlckJ1YmJsZSA9IG5ldyBUSFJFRS5NZXNoKGhvdmVyR2VvbSwgaG92ZXJNYXRlcmlhbCk7XG5cdGhvdmVyQnViYmxlLnZpc2libGUgPSBmYWxzZTtcblx0Y2xpY2tlci5hZGQoaG92ZXJCdWJibGUpO1xuXG5cdHZhciBjbGlja0dlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoY2xpY2tSYWRpdXMsIDMyLCAyNCk7XG5cdGNsaWNrR2VvbS5hcHBseU1hdHJpeCh0cmFuc2xhdGUpO1xuXHR2YXIgY2xpY2tCdWJibGUgPSBuZXcgVEhSRUUuTWVzaChjbGlja0dlb20sIFNjYXBlU3R1ZmYudWlTdWdnZXN0KTtcblx0Y2xpY2tCdWJibGUudXNlckRhdGEuY2xpY2tEYXRhID0gY2xpY2tEYXRhO1xuXHRjbGlja2VyLmFkZChjbGlja0J1YmJsZSk7XG5cblx0Ly8gLy8gYWRkIHRoZSBuYW1lIHN0dWZmIHRvIGNsaWNrQnViYmxlIGluc3RlYWRcblx0Y2xpY2tCdWJibGUudXNlckRhdGEubmFtZSA9IG5hbWU7XG5cdGNsaWNrQnViYmxlLnVzZXJEYXRhLm9mZnNldCA9IHRyYW5zbGF0ZTtcblx0Ly8gY2xpY2tCdWJibGUudXNlckRhdGEubmFtZVBvc2l0aW9uID0gKCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdC8vIFx0Lm1ha2VUcmFuc2xhdGlvbigtMSAqIGNsaWNrUmFkaXVzLzMsIDAsIGxpbmVMZW5ndGggKyBjbGlja1JhZGl1cy8yKVxuXHQvLyBcdC5tdWx0aXBseSh0cmFuc2xhdGUpXG5cdC8vIFx0Lm11bHRpcGx5KG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpKVxuXHQvLyApO1xuXG5cdC8vIC8vLy8vLy8vLy8gaWRlbnRpZmllciBmbGFnXG5cdC8vIHZhciBpZGVudCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXG5cdC8vIC8vLy8vLy8vLy8vIGhhdmluZyB0ZXh0IGFsd2F5cyB0aGVyZSBidXQgdXN1YWxseSBpbnZpc2libGUgd2FzIE1VUkRFUklORyByYW0gdXNhZ2UuXG5cdC8vIC8vIC8vIG5hbWUgdGV4dFxuXHQvLyAvLyB2YXIgbmFtZUdlb20gPSBuZXcgVEhSRUUuVGV4dEdlb21ldHJ5KG5hbWUsIHtcblx0Ly8gLy8gXHRmb250OiAnaGVsdmV0aWtlcicsXG5cdC8vIC8vIFx0c2l6ZTogY2xpY2tSYWRpdXMsXG5cdC8vIC8vIFx0aGVpZ2h0OiAwLjFcblx0Ly8gLy8gfSk7XG5cdC8vIC8vIG5hbWVHZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdC8vIC8vIFx0Lm1ha2VUcmFuc2xhdGlvbigtMSAqIGNsaWNrUmFkaXVzLzMsIDAsIGxpbmVMZW5ndGggKyBjbGlja1JhZGl1cy8yKVxuXHQvLyAvLyBcdC5tdWx0aXBseSh0cmFuc2xhdGUpXG5cdC8vIC8vIFx0Lm11bHRpcGx5KG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpKVxuXHQvLyAvLyApO1xuXHQvLyAvLyB2YXIgbmFtZSA9IG5ldyBUSFJFRS5NZXNoKG5hbWVHZW9tLCBTY2FwZVN0dWZmLnVpV2hpdGUpO1xuXHQvLyAvLyBpZGVudC5hZGQobmFtZSk7XG5cblxuXHQvLyAvLyBwb2ludGVyXG5cdC8vIHZhciBsaW5lR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KDAuMSwgMC4xLCBsaW5lTGVuZ3RoKTtcblx0Ly8gbGluZUdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0Ly8gXHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGxpbmVMZW5ndGggLyAyKVxuXHQvLyBcdC5tdWx0aXBseSh0cmFuc2xhdGUpXG5cdC8vIFx0Lm11bHRpcGx5KG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpKVxuXHQvLyApO1xuXG5cdC8vIHZhciBsaW5lID0gbmV3IFRIUkVFLk1lc2gobGluZUdlb20sIFNjYXBlU3R1ZmYudWlXaGl0ZSk7XG5cdC8vIC8vIGxpbmUudXNlckRhdGEudHlwZSA9ICduYW1lbGluZSc7XG5cdC8vIGlkZW50LmFkZChsaW5lKTtcblxuXHQvLyBpZGVudC52aXNpYmxlID0gZmFsc2U7XG5cdC8vIC8vIGlkZW50LnVzZXJEYXRhLnR5cGUgPSAnbmFtZWFzc2VtYmx5Jztcblx0Ly8gY2xpY2tlci5hZGQoaWRlbnQpO1xuXG5cdGNsaWNrZXIudmlzaWJsZSA9IGZhbHNlO1xuXHRyZXR1cm4gY2xpY2tlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUNsaWNrYWJsZTsiLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi8uLi9zdHVmZicpO1xuXG52YXIgTTQgPSBUSFJFRS5NYXRyaXg0O1xuXG52YXIgU2NhcGVDbGlja2FibGUgPSByZXF1aXJlKCcuL2NsaWNrYWJsZScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogVE9ETzogd29yayBvdXQgaG93IHRvIGRvYyB0aGVzZSBhZGRvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gdHJlZVBhcnRzIHRoZSBtZXNoIGFuZCBjbGlja1BvaW50IGNvbGxlY3Rpb24gdGhhdCBpcyBhIHRyZWVcbiAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB0aGUgdHJlZSBvcHRpb25zXG4gICogQHBhcmFtIHtvYmplY3R9IGludGVybmFscyBpbnRlcm5hbCBjYWxjdWxhdGlvbnMgbWFrZSBieSB0aGUgdHJlZS1tYWtlclxuICAqL1xuZnVuY3Rpb24gU2NhcGVEZW5kcm9tZXRlckFkZG9uKHRyZWVQYXJ0cywgb3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0Ly8gc3RhcnQgd2l0aCBzdGFuZGFyZCB0cmVlIG1lc2hlc1xuXHR2YXIgaSA9IGludGVybmFscyB8fCB7IG1lc2hOYW1lczogW10gfTtcblxuXHRpLmRpYW0gPSBpLmRpYW0gfHwgMTtcblxuXHQvLyB0cmFuc2Zvcm1zIHdlIG1pZ2h0IG5lZWQ6XG5cdC8vIHJvdGF0ZSBzbyBpdCdzIGhlaWdodCBpcyBhbG9uZyB0aGUgWiBheGlzIChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8gc3BlY2lhbCBjb252ZW5pZW5jZTogaWYgb3B0aW9ucy5kZW5kcm9tZXRlciBpcyBhIHN0cmluZyxcblx0Ly8gdXNlIHRoYXQgc3RyaW5nIGFzIHRoZSBjbGlja0RhdGEgYW5kIHVzZSBkZWZhdWx0cyBmb3Jcblx0Ly8gZXZlcnl0aGluZyBlbHNlLlxuXHRpZiAodHlwZW9mIG9wdGlvbnMuZGVuZHJvbWV0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5kZW5kcm9tZXRlciA9IHsgY2xpY2tEYXRhOiBvcHRpb25zLmRlbmRyb21ldGVyIH07XG5cdH1cblxuXHR2YXIgZCA9IHt9O1xuXG5cdGQubmFtZSA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIubmFtZSB8fCAnZGVuZHJvbWV0ZXInO1xuXG5cdGQuYmFuZFdpZHRoID0gb3B0aW9ucy5kZW5kcm9tZXRlci53aWR0aCB8fCAwLjU7XG5cdGQuYmFuZFJhZGl1cyA9IGkudHJ1bmtSYWRpdXMgKyAwLjIgKiBkLmJhbmRXaWR0aDtcblx0ZC5iYW5kSGVpZ2h0ID0gTWF0aC5taW4ob3B0aW9ucy5kZW5kcm9tZXRlci5oZWlnaHQgfHwgMS41LCBpLnRydW5rSGVpZ2h0IC0gZC5iYW5kV2lkdGgvMik7XG5cblx0ZC5tZXRlclJhZGl1cyA9IGQuYmFuZFdpZHRoO1xuXHRkLm1ldGVySGVpZ2h0ID0gZC5iYW5kV2lkdGggKiAzO1xuXG5cdGQubW91bnRSYWRpdXMgPSBkLm1ldGVyUmFkaXVzICogMS4xO1xuXHRkLm1vdW50V2lkdGggPSBkLm1ldGVySGVpZ2h0IC8gNDtcblxuXHRkLmJhbmRTdHVmZiA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIuYmFuZCB8fCBTY2FwZVN0dWZmLm1ldGFsO1xuXHRkLm1vdW50U3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLm1vdW50IHx8IFNjYXBlU3R1ZmYuYmxhY2s7XG5cdGQubWV0ZXJTdHVmZiA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIubWV0ZXIgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblxuXHRkLmNsaWNrRGF0YSA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIuY2xpY2tEYXRhIHx8IG51bGw7XG5cblx0Ly8gdGhlIHN0ZWVsIGJhbmRcblx0dmFyIGJhbmRHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5iYW5kUmFkaXVzLCBkLmJhbmRSYWRpdXMsIGQuYmFuZFdpZHRoLCAxMiwgMSk7XG5cdGJhbmRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBkLmJhbmRIZWlnaHQpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgYmFuZCA9IG5ldyBUSFJFRS5NZXNoKGJhbmRHZW9tLCBkLmJhbmRTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyQmFuZCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2goYmFuZCk7XG5cblx0Ly8gdGhlIG1ldGVyIGl0c2VsZlxuXHR2YXIgbWV0ZXJCb3R0b21HZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5tZXRlclJhZGl1cywgZC5tZXRlclJhZGl1cywgMC42NyAqIGQubWV0ZXJIZWlnaHQsIDcsIDEpO1xuXHRtZXRlckJvdHRvbUdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvNikubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBtZXRlckJvdHRvbSA9IG5ldyBUSFJFRS5NZXNoKG1ldGVyQm90dG9tR2VvbSwgZC5tZXRlclN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJCb3R0b20nKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1ldGVyQm90dG9tKTtcblxuXHR2YXIgbWV0ZXJUb3BHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoZC5tZXRlclJhZGl1cy81LCBkLm1ldGVyUmFkaXVzLCAwLjMzICogZC5tZXRlckhlaWdodCwgNywgMSk7XG5cdG1ldGVyVG9wR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzICsgZC5tZXRlclJhZGl1cywgMCwgZC5iYW5kSGVpZ2h0ICsgZC5tZXRlckhlaWdodC8yICsgZC5tZXRlckhlaWdodC82KS5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIG1ldGVyVG9wID0gbmV3IFRIUkVFLk1lc2gobWV0ZXJUb3BHZW9tLCBkLm1ldGVyU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlclRvcCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2gobWV0ZXJUb3ApO1xuXG5cdC8vIHRoZSBtb3VudFxuXHR2YXIgbW91bnRCYW5kR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubW91bnRSYWRpdXMsIGQubW91bnRSYWRpdXMsIGQubW91bnRXaWR0aCwgNywgMSk7XG5cdG1vdW50QmFuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQuYmFuZFdpZHRoLzIgKyBkLm1vdW50V2lkdGgvMikubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBtb3VudEJhbmQgPSBuZXcgVEhSRUUuTWVzaChtb3VudEJhbmRHZW9tLCBkLm1vdW50U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlck1vdW50QmFuZCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2gobW91bnRCYW5kKTtcblxuXHR2YXIgbW91bnRHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGQubW91bnRSYWRpdXMsIGQubW91bnRSYWRpdXMvMiwgZC5tb3VudFdpZHRoKTtcblx0bW91bnRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQuYmFuZFdpZHRoLzIgKyBkLm1vdW50V2lkdGgvMikpO1xuXHR2YXIgbW91bnQgPSBuZXcgVEhSRUUuTWVzaChtb3VudEdlb20sIGQubW91bnRTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyTW91bnQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1vdW50KTtcblxuXHQvLyB0aGUgZGVuZHJvIHNob3VsZCBiZSBjbGlja2FibGVcblx0aWYgKGQuY2xpY2tEYXRhKSB7XG5cdFx0dmFyIGRlbmRyb0NsaWNrID0gU2NhcGVDbGlja2FibGUoZC5uYW1lLCBkLmNsaWNrRGF0YSwgZC5iYW5kUmFkaXVzICsgZC5tZXRlclJhZGl1cywgMCwgZC5iYW5kSGVpZ2h0ICsgZC5tZXRlckhlaWdodC82KTtcblx0XHR0cmVlUGFydHMuY2xpY2tQb2ludHMucHVzaChkZW5kcm9DbGljayk7XG5cdH1cblxuXHRpLmRlbmRyb21ldGVyID0gZDtcblxuXHRyZXR1cm4gdHJlZVBhcnRzO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZURlbmRyb21ldGVyQWRkb247XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi8uLi9zdHVmZicpO1xuXG52YXIgTTQgPSBUSFJFRS5NYXRyaXg0O1xuXG52YXIgU2NhcGVDbGlja2FibGUgPSByZXF1aXJlKCcuL2NsaWNrYWJsZScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogVE9ETzogd29yayBvdXQgaG93IHRvIGRvYyB0aGVzZSBhZGRvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gdHJlZVBhcnRzIHRoZSBtZXNoIGFuZCBjbGlja1BvaW50IGNvbGxlY3Rpb24gdGhhdCBpcyBhIHRyZWVcbiAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB0aGUgdHJlZSBvcHRpb25zXG4gICogQHBhcmFtIHtvYmplY3R9IGludGVybmFscyBpbnRlcm5hbCBjYWxjdWxhdGlvbnMgbWFrZSBieSB0aGUgdHJlZS1tYWtlclxuICAqL1xuZnVuY3Rpb24gU2NhcGVTYXBGbG93TWV0ZXJBZGRvbih0cmVlUGFydHMsIG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdC8vIHN0YXJ0IHdpdGggc3RhbmRhcmQgdHJlZSBtZXNoZXNcblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwgeyBtZXNoTmFtZXM6IFtdIH07XG5cblx0aS5kaWFtID0gaS5kaWFtIHx8IDE7XG5cblx0Ly8gc3BlY2lhbCBjb252ZW5pZW5jZTogaWYgb3B0aW9ucy5zYXBmbG93bWV0ZXIgaXMgYSBzdHJpbmcsXG5cdC8vIHVzZSB0aGF0IHN0cmluZyBhcyB0aGUgY2xpY2tEYXRhIGFuZCB1c2UgZGVmYXVsdHMgZm9yXG5cdC8vIGV2ZXJ5dGhpbmcgZWxzZS5cblx0aWYgKHR5cGVvZiBvcHRpb25zLnNhcGZsb3dtZXRlciA9PT0gJ3N0cmluZycpIHtcblx0XHRvcHRpb25zLnNhcGZsb3dtZXRlciA9IHsgY2xpY2tEYXRhOiBvcHRpb25zLnNhcGZsb3dtZXRlciB9O1xuXHR9XG5cblx0dmFyIHMgPSB7fTtcblxuXHRzLm5hbWUgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5uYW1lIHx8ICdzYXAgZmxvdyBtZXRlcic7XG5cblx0cy5iYXNlVyA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLnNpemUgfHwgMTtcblx0cy5jYXBXID0gcy5iYXNlVyAqIDEuMjtcblx0cy5iYXNlVGhpY2sgPSBzLmJhc2VXIC8gMjtcblx0cy5jYXBUaGljayA9IHMuYmFzZVRoaWNrICogMS4xO1xuXHRzLmxlbmd0aCA9IHMuYmFzZVcgKiAyO1xuXHRzLmJhc2VMID0gcy5sZW5ndGggKiAwLjY7XG5cdHMuY2FwTCA9IChzLmxlbmd0aCAtIHMuYmFzZUwpIC8gMjtcblx0cy5oZWlnaHQgPSBNYXRoLm1pbihvcHRpb25zLnNhcGZsb3dtZXRlci5oZWlnaHQgfHwgMywgaS50cnVua0hlaWdodCAtIHMubGVuZ3RoKTtcblxuXHRzLmJhc2VTdHVmZiA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLmJhc2UgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblx0cy5jYXBTdHVmZiA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLmNhcCB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXG5cdHMuY2xpY2tEYXRhID0gb3B0aW9ucy5zYXBmbG93bWV0ZXIuY2xpY2tEYXRhIHx8IG51bGw7XG5cblx0dmFyIGJhc2VHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHMuYmFzZVcsIHMuYmFzZVRoaWNrLCBzLmJhc2VMKTtcblx0YmFzZUdlb20uYXBwbHlNYXRyaXgobmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIC0xICogKGkudHJ1bmtSYWRpdXMgKyBzLmJhc2VUaGljay8yKSwgcy5oZWlnaHQgKyBzLmJhc2VMLzIpXG5cdCk7XG5cdHZhciBiYXNlID0gbmV3IFRIUkVFLk1lc2goYmFzZUdlb20sIHMuYmFzZVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnc2FwZmxvd21ldGVyYmFzZScpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2goYmFzZSk7XG5cblx0dmFyIHRvcENhcEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkocy5jYXBXLCBzLmNhcFRoaWNrLCBzLmNhcEwpO1xuXHR0b3BDYXBHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTCArIHMuY2FwTC8yKVxuXHQpO1xuXHR2YXIgdG9wQ2FwID0gbmV3IFRIUkVFLk1lc2godG9wQ2FwR2VvbSwgcy5jYXBTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3NhcGZsb3dtZXRlcnRvcGNhcCcpO1xuXHR0cmVlUGFydHMubWVzaGVzLnB1c2godG9wQ2FwKTtcblxuXHR2YXIgYm90dG9tQ2FwR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzLmNhcFcsIHMuY2FwVGhpY2ssIHMuY2FwTCk7XG5cdGJvdHRvbUNhcEdlb20uYXBwbHlNYXRyaXgobmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIC0xICogKGkudHJ1bmtSYWRpdXMgKyBzLmJhc2VUaGljay8yKSwgcy5oZWlnaHQgKyBzLmNhcEwvMilcblx0KTtcblx0dmFyIGJvdHRvbUNhcCA9IG5ldyBUSFJFRS5NZXNoKGJvdHRvbUNhcEdlb20sIHMuY2FwU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdzYXBmbG93bWV0ZXJib3R0b21jYXAnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJvdHRvbUNhcCk7XG5cblx0Ly8gY2xpY2thYmxlXG5cdGlmIChzLmNsaWNrRGF0YSkge1xuXHRcdHZhciBjbGljayA9IFNjYXBlQ2xpY2thYmxlKHMubmFtZSwgcy5jbGlja0RhdGEsIDAsIC0xICogKGkudHJ1bmtSYWRpdXMgKyBzLmJhc2VUaGljay8yKSwgcy5oZWlnaHQgKyBzLmJhc2VMLzIpO1xuXHRcdHRyZWVQYXJ0cy5jbGlja1BvaW50cy5wdXNoKGNsaWNrKTtcblx0fVxuXG5cdGkuc2FwZmxvd21ldGVyID0gcztcblxuXHRyZXR1cm4gdHJlZVBhcnRzO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVNhcEZsb3dNZXRlckFkZG9uO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2FtZXJhQWRkb24gPSByZXF1aXJlKCcuL2FkZG9ucy9jYW1lcmEnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBtZXNoIGFycmF5IGZvciBhIHRvd2VyIGNyYW5lLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdXNlZCB0byBzcGVjaWZ5IHByb3BlcnRpZXMgb2YgdGhlIGNyYW5lLlxuXG4gKiBAcGFyYW0ge3dpZHRofSBvcHRpb25zLndpZHRoPTIgV2lkdGggb2YgY3JhbmUgdG93ZXJcbiAqIEBwYXJhbSB7aGVpZ2h0fSBvcHRpb25zLmhlaWdodD01MCBIZWlnaHQgb2YgY3JhbmUgdG93ZXJcbiAqIEBwYXJhbSB7bGVuZ3RofSBvcHRpb25zLmxlbmd0aD00MCBMZW5ndGggb2YgY3JhbmUgYm9vbSwgZnJvbSB0aGVcbiAqICAgICAgICBjcmFuZSdzIGNlbnRyZSBheGlzIHRvIHRoZSB0aXBcbiAqIEBwYXJhbSB7cm90YXRpb259IG9wdGlvbnMucm90YXRpb249MCBEZWdyZWVzIG9mIGJvb20gcm90YXRpb24sXG4gKiAgICAgICAgY291bnRlZCBjbG9ja3dpc2UgZnJvbSB0aGUgK3ZlIFkgZGlyZWN0aW9uIChhd2F5IGZyb21cbiAqICAgICAgICB0aGUgY2FtZXJhKVxuICogQHBhcmFtIHtjb3VudGVyd2VpZ2h0TGVuZ3RofSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHRMZW5ndGg9bGVuZ3RoLzRcbiAqICAgICAgICBMZW5ndGggb2YgdGhlIGNvdW50ZXJ3ZWlnaHQgYm9vbSwgZnJvbSB0aGUgY3JhbmUncyBjZW50cmVcbiAqICAgICAgICBheGlzIHRvIHRoZSBlbmQgb2YgdGhlIGNvdW50ZXJ3ZWlnaHRcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMuc3RydXRzPVNjYXBlU3R1ZmYuZ2xvc3NCbGFja1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgc3RydXRzIGluIHRoZSB0b3dlciBhbmQgYm9vbSBvdXQgb2ZcbiAgKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmJhc2U9U2NhcGVTdHVmZi5jb25jcmV0ZVxuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgYmFzZSBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMucmluZz1TY2FwZVN0dWZmLnBsYXN0aWNcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgdG93ZXIgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmNhYmluPVNjYXBlU3R1ZmYucGxhc3RpY1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY2FiaW4gb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLndpbmRvdz1TY2FwZVN0dWZmLmdsYXNzXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSBjYWJpbiB3aW5kb3cgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHQ9U2NhcGVTdHVmZi5jb25jcmV0ZVxuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY291bnRlcndlaWdodCBvdXQgb2ZcbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY3JhbmVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDcmFuZUZhY3Rvcnkob3B0aW9ucykge1xuXG5cdHZhciBjcmFuZSA9IHsgbWVzaGVzOiBbXSwgY2xpY2tQb2ludHM6IFtdIH07XG5cblx0dmFyIGkgPSB7IG1lc2hOYW1lczogW10gfTtcblxuXHRpLnRvd2VyV2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDI7XG5cdGkuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNTA7XG5cdGkubGVuZ3RoID0gb3B0aW9ucy5sZW5ndGggfHwgNDA7XG5cdGkuY291bnRlcndlaWdodExlbmd0aCA9IG9wdGlvbnMuY291bnRlcndlaWdodExlbmd0aCB8fCAoaS5sZW5ndGggLyA0KTtcblx0aS5zdHJ1dFN0dWZmID0gb3B0aW9ucy5zdHJ1dHMgfHwgU2NhcGVTdHVmZi5nbG9zc0JsYWNrO1xuXHRpLmJhc2VTdHVmZiA9IG9wdGlvbnMuYmFzZSB8fCBTY2FwZVN0dWZmLmNvbmNyZXRlO1xuXHRpLnJpbmdTdHVmZiA9IG9wdGlvbnMucmluZyB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cdGkuY2FiaW5TdHVmZiA9IG9wdGlvbnMuY2FiaW4gfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHRpLndpbmRvd1N0dWZmID0gb3B0aW9ucy53aW5kb3cgfHwgU2NhcGVTdHVmZi5nbGFzcztcblx0aS5jb3VudGVyd2VpZ2h0U3R1ZmYgPSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHQgfHwgU2NhcGVTdHVmZi5jb25jcmV0ZTtcblx0aS5yb3RhdGlvbiA9IC0xICogKG9wdGlvbnMucm90YXRpb24gfHwgMCkgKiBNYXRoLlBJIC8gMTgwO1xuXG5cdGkudG93ZXJIZWlnaHQgPSBpLmhlaWdodDtcblx0aS5iYXNlVyA9IGkudG93ZXJXaWR0aCAqIDM7XG5cdGkuYmFzZUggPSBpLnRvd2VyV2lkdGggKiAyOyAvLyBoYWxmIG9mIHRoZSBoZWlnaHQgd2lsbCBiZSBcInVuZGVyZ3JvdW5kXCJcblxuXHRpLnBvbGVSID0gaS50b3dlcldpZHRoIC8gMTA7XG5cblx0aS5yaW5nUiA9ICgoaS50b3dlcldpZHRoIC8gMikgKiBNYXRoLlNRUlQyKSArIDEuMyAqIGkucG9sZVI7XG5cdGkucmluZ0ggPSBpLnRvd2VyV2lkdGggLyA1O1xuXG5cdGkuYm9vbUwgPSBpLmxlbmd0aDsgLy8gbGVuZ3RoIG9mIGNyYW5lIGJvb21cblx0aS5jd2JMID0gaS5jb3VudGVyd2VpZ2h0TGVuZ3RoOyAvLyBsZW5ndGggb2YgY291bnRlcndlaWdodCBib29tXG5cdGkucm9kTCA9IGkuYm9vbUwgKyBpLmN3Ykw7XG5cdGkuY3dXID0gaS50b3dlcldpZHRoIC0gMyppLnBvbGVSO1xuXHRpLmN3SCA9IGkudG93ZXJXaWR0aCAqIDEuNTtcblx0aS5jd0wgPSBpLnRvd2VyV2lkdGggKiAxLjU7XG5cblx0aS5jYWJpblcgPSBpLnRvd2VyV2lkdGg7XG5cdGkuY2FiaW5IID0gaS50b3dlcldpZHRoICogMS4yNTtcblx0aS5jYWJpbkwgPSBpLmNhYmluSDtcblxuXHQvLyB0aGlzIGlzIGZvciByb3RhdGluZyB0aGUgY3JhbmUgYm9vbVxuXHR2YXIgcm90YXRlID0gbmV3IE00KCkubWFrZVJvdGF0aW9uWihpLnJvdGF0aW9uKTtcblxuXHQvLyB0aGlzIGlzIGZvciBtYWtpbmcgY3lsaW5kZXJzIGdvIHVwcmlnaHQgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciBjeWxpbmRlclJvdGF0ZSA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLy8vLy8vLy8vIHRoZSBiYXNlXG5cdHZhciBiYXNlR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmJhc2VXLCBpLmJhc2VXLCBpLmJhc2VIKTtcblx0dmFyIGJhc2UgPSBuZXcgVEhSRUUuTWVzaChiYXNlR2VvbSwgaS5iYXNlU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdiYXNlJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKGJhc2UpO1xuXG5cdC8vLy8vLy8vLy8gdGhlIHZlcnRpY2FsIG1hc3Rcblx0Ly8gbWFrZSBvbmUgcG9sZSB0byBzdGFydCB3aXRoXG5cdHZhciBwb2xlR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucG9sZVIsIGkucG9sZVIsIGkudG93ZXJIZWlnaHQpO1xuXHRwb2xlR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oaS50b3dlcldpZHRoLzIsIGkudG93ZXJXaWR0aC8yLCBpLnRvd2VySGVpZ2h0LzIpLm11bHRpcGx5KGN5bGluZGVyUm90YXRlKSk7XG5cblx0Ly8gTWFrZSB0aHJlZSBtb3JlIHBvbGVzIGJ5IGNvcHlpbmcgdGhlIGZpcnN0IHBvbGUgYW5kIHJvdGF0aW5nIGFub3RoZXIgOTBkZWdzIGFyb3VuZCB0aGUgY2VudHJlXG5cdHZhciBwb2xlO1xuXHR2YXIgcm90YXRlQXJvdW5kWiA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblooTWF0aC5QSS8yKTtcblx0Zm9yICh2YXIgcCA9IDA7IHAgPCA0OyBwKyspIHtcblx0XHRwb2xlID0gbmV3IFRIUkVFLk1lc2gocG9sZUdlb20sIGkuc3RydXRTdHVmZik7XG5cdFx0aS5tZXNoTmFtZXMucHVzaCgncG9sZScgKyBwKTtcblx0XHRjcmFuZS5tZXNoZXMucHVzaChwb2xlKTtcblx0XHRwb2xlR2VvbSA9IHBvbGVHZW9tLmNsb25lKCk7XG5cdFx0cG9sZUdlb20uYXBwbHlNYXRyaXgocm90YXRlQXJvdW5kWik7XG5cdH1cblxuXG5cdC8vLy8vLy8vLy8gdGhlIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgdG93ZXJcblx0dmFyIHJpbmdHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5yaW5nUiwgaS5yaW5nUiwgaS5yaW5nSCwgMTIsIDEsIHRydWUpO1xuXHRyaW5nR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS50b3dlckhlaWdodCAtIGkucmluZ0gvMikubXVsdGlwbHkoY3lsaW5kZXJSb3RhdGUpKTtcblx0aS5yaW5nU3R1ZmYuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JpbmcnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gocmluZ0dlb20sIGkucmluZ1N0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIHRoZSBob3Jpem9udGFsIGJvb21cblx0Ly8gbWFrZSBvbmUgcm9kIHRvIHN0YXJ0IHdpdGhcblx0dmFyIHRvcFJvZEdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBvbGVSLCBpLnBvbGVSLCBpLnJvZEwpO1xuXG5cdC8vIHRvcCByb2Rcblx0dG9wUm9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgKGkucm9kTC8yKSAtIGkuY3diTCwgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyAwLjUgKiBpLnRvd2VyV2lkdGgpKTtcblx0bGVmdFJvZEdlb20gPSB0b3BSb2RHZW9tLmNsb25lKCk7XG5cdHJpZ2h0Um9kR2VvbSA9IHRvcFJvZEdlb20uY2xvbmUoKTtcblxuXHR0b3BSb2RHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JvZFRvcCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaCh0b3BSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBib3R0b20gbGVmdCByb2Rcblx0bGVmdFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKC0wLjUgKiBpLnRvd2VyV2lkdGggKyBpLnBvbGVSLCAwLCAtMC41ICogaS50b3dlcldpZHRoKSk7XG5cdGxlZnRSb2RHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JvZExlZnQnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gobGVmdFJvZEdlb20sIGkuc3RydXRTdHVmZikpO1xuXG5cdC8vIGJvdHRvbSByaWdodCByb2Rcblx0cmlnaHRSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLjUgKiBpLnRvd2VyV2lkdGggLSBpLnBvbGVSLCAwLCAtMC41ICogaS50b3dlcldpZHRoKSk7XG5cdHJpZ2h0Um9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RSaWdodCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChyaWdodFJvZEdlb20sIGkuc3RydXRTdHVmZikpO1xuXG5cdC8vIGVuZCBvZiB0aGUgYm9vbVxuXHR2YXIgZW5kR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLnRvd2VyV2lkdGgsIGkucG9sZVIsIDAuNSAqIGkudG93ZXJXaWR0aCArIGkucG9sZVIgKyBpLnBvbGVSKTtcblx0ZW5kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgaS5ib29tTCwgaS50b3dlckhlaWdodCArIDAuMjUgKiBpLnRvd2VyV2lkdGggKyBpLnBvbGVSKSk7XG5cdGVuZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnYm9vbUNhcCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChlbmRHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXG5cdC8vLy8vLy8vLy8gY291bnRlcndlaWdodFxuXHR2YXIgY3dHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGkuY3dXLCBpLmN3TCwgaS5jd0gpO1xuXHRjd0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDEuMDAxICogKGkuY3dMLzIgLSBpLmN3YkwpLCBpLnRvd2VySGVpZ2h0KSk7XG5cdGN3R2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdjb3VudGVyd2VpZ2h0Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGN3R2VvbSwgaS5jb3VudGVyd2VpZ2h0U3R1ZmYpKTtcblxuXG5cdC8vLy8vLy8vLy8gY2FiaW5cblx0dmFyIGNhYmluR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmNhYmluVywgaS5jYWJpbkwsIGkuY2FiaW5IKTtcblx0dmFyIHdpbmRvd0dlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5jYWJpblcgKiAxLjEsIGkuY2FiaW5MICogMC42LCBpLmNhYmluSCAqIDAuNik7XG5cdGNhYmluR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oaS5jYWJpblcvMiArIGkucG9sZVIsIDAsIGkuY2FiaW5ILzIgKyBpLnRvd2VySGVpZ2h0ICsgaS5wb2xlUiArIGkucG9sZVIpKTtcblx0d2luZG93R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oaS5jYWJpblcvMiArIGkucG9sZVIsIGkuY2FiaW5MICogMC4yNSwgaS5jYWJpbkggKiAwLjYgKyBpLnRvd2VySGVpZ2h0ICsgaS5wb2xlUiArIGkucG9sZVIpKTtcblx0Y2FiaW5HZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdHdpbmRvd0dlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY2FiaW4nKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goY2FiaW5HZW9tLCBpLmNhYmluU3R1ZmYpKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY2FiaW53aW5kb3cnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2god2luZG93R2VvbSwgaS53aW5kb3dTdHVmZikpO1xuXG5cdC8vLy8vLy8vLy8gY2FtZXJhXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5jYW1lcmEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0Y3JhbmUgPSBTY2FwZUNhbWVyYUFkZG9uKGNyYW5lLCBvcHRpb25zLCBpKTtcblx0fVxuXG5cdC8vIHJldHVybiBhbGwgdGhlIGNyYW5lIGJpdHMuXG5cdHJldHVybiBjcmFuZTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDcmFuZUZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBjdWJlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBtYXRlcmlhbC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIFRoZSBsZW5ndGggb2YgYSBzaWRlIG9mIHRoZSBjdWJlLiAgRGVmYXVsdHMgdG8gMS5cbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG1hdGVyaWFsIFdoYXQgdGhlIG1ha2UgdGhlIGN1YmUgb3V0IG9mLiAgRGVmYXVsdHMgdG8gYFNjYXBlLlN0dWZmLmdlbmVyaWNgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBOb3QgdXNlZC5cbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuY3ViZVxuICovXG5mdW5jdGlvbiBTY2FwZUN1YmVGYWN0b3J5KG9wdGlvbnMpIHtcbiAgICAvLyBjb25zdHJ1Y3QgYSBtZXNoIFwic2l0dGluZyBvblwiIHRoZSBwb2ludCAwLDAsMFxuXG4gICAgc2l6ZSA9IG9wdGlvbnMuc2l6ZSB8fCAxO1xuICAgIG1hdGVyaWFsID0gb3B0aW9ucy5tYXRlcmlhbCB8fCBTY2FwZVN0dWZmLmdlbmVyaWM7XG5cbiAgICAvLyBtYWtlcyBhIGN1YmUgY2VudGVyZWQgb24gMCwwLDBcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzaXplLCBzaXplLCBzaXplKTtcblxuICAgIC8vIHRyYW5zZm9ybSBpdCB1cCBhIGJpdCwgc28gd2UncmUgY2VudGVyZWQgb24geCA9IDAgYW5kIHkgPSAwLCBidXQgaGF2ZSB0aGUgX2JvdHRvbV8gZmFjZSBzaXR0aW5nIG9uIHogPSAwLlxuICAgIGdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIHNpemUvMikgKTtcblxuICAgIC8vIHJldHVybiBpdCBpbiBhIGRhdGEgb2JqZWN0XG5cdHJldHVybiB7IG1lc2hlczogW25ldyBUSFJFRS5NZXNoKGdlb20sIG1hdGVyaWFsKV0sIGNsaWNrUG9pbnRzOiBbXSB9O1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUN1YmVGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5sYWJlbFxuICovXG5mdW5jdGlvbiBTY2FwZUxhYmVsRmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHR2YXIgbGFiZWwgPSB7IG1lc2hlczogW10sIGNsaWNrUG9pbnRzOiBbXSB9O1xuXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHt9O1xuXHRpLm1lc2hOYW1lcyA9IGkubWVzaE5hbWVzIHx8IFtdO1xuXG5cdGkueCA9IG9wdGlvbnMueCB8fCAwO1xuXHRpLnkgPSBvcHRpb25zLnkgfHwgMDtcblx0aS56ID0gb3B0aW9ucy56IHx8IDA7XG5cdGkub2Zmc2V0ID0gb3B0aW9ucy5vZmZzZXQgfHwgbmV3IFRIUkVFLk1hdHJpeDQoKTtcblxuXHRpLmxhYmVsVGV4dCA9IG9wdGlvbnMudGV4dDtcblx0aS50ZXh0U2l6ZSA9IG9wdGlvbnMuc2l6ZSB8fCAyO1xuXHRpLnRleHRXaWR0aCA9IGkudGV4dFNpemUgLyAxMDtcblxuXHRpLmxpbmVSYWRpdXMgPSBpLnRleHRXaWR0aCAvIDI7XG5cdGkubGluZUxlbmd0aCA9IG9wdGlvbnMuaGVpZ2h0IHx8IE1hdGgubWF4KDgsIGkudGV4dFNpemUpO1xuXG5cdGkuZG90UmFkaXVzID0gaS5saW5lUmFkaXVzICogMS41O1xuXG5cdGkuZ2xvd1N0dWZmID0gb3B0aW9ucy5nbG93IHx8IFNjYXBlU3R1ZmYudWlIaWdobGlnaHQ7XG5cdGkudGV4dFN0dWZmID0gb3B0aW9ucy5sZXR0ZXJzIHx8IFNjYXBlU3R1ZmYudWlTaG93O1xuXHRpLmxpbmVTdHVmZiA9IG9wdGlvbnMucG9pbnRlciB8fCBpLnRleHRTdHVmZjtcblxuXHR2YXIgdHJhbnNsYXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oaS54LCBpLnksIGkueikubXVsdGlwbHkoaS5vZmZzZXQpO1xuXG5cdC8vIGdsb3dpbmcgYmFsbFxuXHR2YXIgZ2xvd0dlb20gPSBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoMS41LCAzMiwgMjQpO1xuXHRnbG93R2VvbS5hcHBseU1hdHJpeCh0cmFuc2xhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdnbG93YnViYmxlJyk7XG5cdGxhYmVsLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGdsb3dHZW9tLCBpLmdsb3dTdHVmZikpO1xuXG5cdC8vIHRleHQgZm9yIHRoZSBsYWJlbFxuXHR2YXIgbmFtZUdlb20gPSBuZXcgVEhSRUUuVGV4dEdlb21ldHJ5KGkubGFiZWxUZXh0LCB7XG5cdFx0Zm9udDogJ2hlbHZldGlrZXInLFxuXHRcdHNpemU6IGkudGV4dFNpemUsXG5cdFx0aGVpZ2h0OiAwLjFcblx0fSk7XG5cdG5hbWVHZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigtMSAqIGkudGV4dFNpemUvMywgMCwgaS5saW5lTGVuZ3RoICsgaS50ZXh0U2l6ZS8yKVxuXHRcdC5tdWx0aXBseSh0cmFuc2xhdGUpXG5cdFx0Lm11bHRpcGx5KG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdsYWJlbHRleHQnKTtcblx0bGFiZWwubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gobmFtZUdlb20sIGkudGV4dFN0dWZmKSk7XG5cblx0Ly8gZG90XG5cdHZhciBkb3RHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDAuMjUsIDE2LCAxMik7XG5cdGRvdEdlb20uYXBwbHlNYXRyaXgodHJhbnNsYXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZG90Jyk7XG5cdGxhYmVsLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGRvdEdlb20sIGkubGluZVN0dWZmKSk7XG5cblx0Ly8gcG9pbnRlclxuXHR2YXIgbGluZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLmxpbmVSYWRpdXMsIGkubGluZVJhZGl1cywgaS5saW5lTGVuZ3RoKTtcblx0bGluZUdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkubGluZUxlbmd0aCAvIDIpXG5cdFx0Lm11bHRpcGx5KHRyYW5zbGF0ZSlcblx0XHQubXVsdGlwbHkobmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMikpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2xhYmVscG9pbnRlcicpO1xuXHRsYWJlbC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChsaW5lR2VvbSwgaS5saW5lU3R1ZmYpKTtcblxuXHRyZXR1cm4gbGFiZWw7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlTGFiZWxGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbnZhciBTY2FwZUNsaWNrYWJsZSA9IHJlcXVpcmUoJy4vYWRkb25zL2NsaWNrYWJsZScpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmxlYWZMaXR0ZXJDYXRjaGVyXG4gKi9cbmZ1bmN0aW9uIFNjYXBlTGVhZkxpdHRlckNhdGNoZXJGYWN0b3J5KG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciBjYXRjaGVyID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLm5hbWUgPSBvcHRpb25zLm5hbWUgfHwgJ2xlYWYgbGl0dGVyIHRyYXAnO1xuXG5cdGkuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMjtcblx0aS53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMC44ICogaS5oZWlnaHQ7XG5cdGkucmluZ1cgPSBpLmhlaWdodCAvIDY7XG5cdGkucG9sZVIgPSBpLndpZHRoIC8gMjA7XG5cdGkucG9sZUggPSBpLmhlaWdodCAtIGkucmluZ1cvMjtcblx0aS5uZXRSID0gaS53aWR0aC8yIC0gaS5wb2xlUjtcblx0aS5uZXRMID0gMC43ICogaS5oZWlnaHQ7XG5cblx0aS5wb2xlU3R1ZmYgPSBvcHRpb25zLnBvbGVzIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdGkucmluZ1N0dWZmID0gb3B0aW9ucy5yaW5nIHx8IGkucG9sZVN0dWZmO1xuXHRpLm5ldFN0dWZmID0gb3B0aW9ucy5uZXQgfHwgU2NhcGVTdHVmZi5zaGFkZWNsb3RoO1xuXG5cdC8vIGN5bGluZGVyLXVwcmlnaHQgcm90YXRpb25cblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIG5ldFxuXHRpLm5ldEcgPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLm5ldFIsIGkubmV0Ui8yMCwgaS5uZXRMLCAxMywgMSwgdHJ1ZSk7IC8vIHRydWUgPSBvcGVuIGVuZGVkXG5cdGkubmV0Ry5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS5oZWlnaHQgLSBpLm5ldEwvMilcblx0XHQubXVsdGlwbHkocm90YXRlKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCduZXQnKTtcblx0aS5uZXRTdHVmZi5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLm5ldEcsIGkubmV0U3R1ZmYpKTtcblxuXHQvLyBuZXQgYWJvdmUgcmluZ1xuXHRpLm5ldFJpbmdHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5uZXRSICogMS4wMSwgaS5uZXRSICogMS4wMSwgaS5yaW5nVy8yLCAxMywgMSwgdHJ1ZSk7IC8vIHRydWUgPSBvcGVuIGVuZGVkXG5cdGkubmV0UmluZ0cuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkuaGVpZ2h0IC0gaS5yaW5nVy80KVxuXHRcdC5tdWx0aXBseShyb3RhdGUpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ25ldHJpbmcnKTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLm5ldFJpbmdHLCBpLm5ldFN0dWZmKSk7XG5cblx0Ly8gcmluZ1xuXHRpLnJpbmdHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5uZXRSLCBpLm5ldFIsIGkucmluZ1csIDEzLCAxLCB0cnVlKTsgLy8gdHJ1ZSA9IG9wZW4gZW5kZWRcblx0aS5yaW5nRy5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS5oZWlnaHQgLSBpLnJpbmdXLzIpXG5cdFx0Lm11bHRpcGx5KHJvdGF0ZSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgncmluZycpO1xuXHRjYXRjaGVyLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGkucmluZ0csIGkucmluZ1N0dWZmKSk7XG5cblx0Ly8gbGVmdCBwb2xlXG5cdGkubGVmdFBvbGVHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5wb2xlUiwgaS5wb2xlUiwgaS5wb2xlSCwgNSk7XG5cdGkubGVmdFBvbGVHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbihpLndpZHRoLy0yLCAwLCBpLnBvbGVILzIpXG5cdFx0Lm11bHRpcGx5KHJvdGF0ZSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgnbGVmdFBvbGUnKTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLmxlZnRQb2xlRywgaS5wb2xlU3R1ZmYpKTtcblxuXHQvLyByaWdodCBwb2xlXG5cdGkucmlnaHRQb2xlRyA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucG9sZVIsIGkucG9sZVIsIGkucG9sZUgsIDUpO1xuXHRpLnJpZ2h0UG9sZUcuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKGkud2lkdGgvMiwgMCwgaS5wb2xlSC8yKVxuXHRcdC5tdWx0aXBseShyb3RhdGUpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JpZ2h0UG9sZScpO1xuXHRjYXRjaGVyLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGkucmlnaHRQb2xlRywgaS5wb2xlU3R1ZmYpKTtcblxuXHQvLyBtYWtlIHRoZSBjYXRjaGVyIGNsaWNrYWJsZVxuXHRpZiAob3B0aW9ucy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2xpY2sgPSBTY2FwZUNsaWNrYWJsZShpLm5hbWUsIG9wdGlvbnMuY2xpY2tEYXRhLCAwLCAwLCBpLnBvbGVIKTtcblx0XHRjYXRjaGVyLmNsaWNrUG9pbnRzLnB1c2goY2xpY2spO1xuXHR9XG5cblx0cmV0dXJuIGNhdGNoZXI7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlTGVhZkxpdHRlckNhdGNoZXJGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbnZhciBTY2FwZUNsaWNrYWJsZSA9IHJlcXVpcmUoJy4vYWRkb25zL2NsaWNrYWJsZScpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnNvaWxQaXRcbiAqL1xuZnVuY3Rpb24gU2NhcGVTb2lsUGl0RmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHR2YXIgcGl0ID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLm5hbWUgPSBvcHRpb25zLm5hbWUgfHwgJ3NvaWwgcGl0JztcblxuXHRpLmJveFMgPSBvcHRpb25zLnNpemUgfHwgMjtcblx0aS5ib3hEID0gaS5ib3hTLzI7XG5cdGkuYm94SCA9IGkuYm94UzsgLy8gaGVpZ2h0IG9mZiBncm91bmRcblxuXHRpLnBpcGVSID0gaS5ib3hELzM7XG5cdGkucGlwZUQgPSBvcHRpb25zLmRlcHRoIHx8IDI7IC8vIHBpcGUgZGVwdGggaW50byBncm91bmRcblx0aS5waXBlTCA9IGkucGlwZUQgKyBpLmJveEg7XG5cdGkucGlwZUwgPSBpLnBpcGVMO1xuXG5cdGkuYm94U3R1ZmYgPSBvcHRpb25zLmJveCB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cdGkucGlwZVN0dWZmID0gb3B0aW9ucy5waXBlIHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblxuXHQvLyBjeWxpbmRlci11cHJpZ2h0IHJvdGF0aW9uXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLyB0aGUgYm94XG5cdGkuYm94RyA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmJveFMsIGkuYm94RCwgaS5ib3hTKTtcblx0aS5ib3hHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbihpLmJveFMvMywgMCwgaS5ib3hIICsgaS5ib3hTLzIpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2JveCcpO1xuXHRwaXQubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goaS5ib3hHLCBpLmJveFN0dWZmKSk7XG5cblx0Ly8gdGhlIHBpcGVcblx0aS5waXBlRyA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucGlwZVIsIGkucGlwZVIsIGkucGlwZUwpO1xuXHRpLnBpcGVHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAwLCAoaS5ib3hIIC0gaS5waXBlRCkvMilcblx0XHQubXVsdGlwbHkocm90YXRlKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdwaXBlJyk7XG5cdHBpdC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLnBpcGVHLCBpLnBpcGVTdHVmZikpO1xuXG5cdC8vIG1ha2UgdGhlIHBpdCBjbGlja2FibGVcblx0aWYgKG9wdGlvbnMuY2xpY2tEYXRhKSB7XG5cdFx0dmFyIGNsaWNrID0gU2NhcGVDbGlja2FibGUoaS5uYW1lLCBvcHRpb25zLmNsaWNrRGF0YSwgaS5ib3hTLzMsIDAsIGkuYm94SCArIGkuYm94Uy8yKTtcblx0XHRwaXQuY2xpY2tQb2ludHMucHVzaChjbGljayk7XG5cdH1cblxuXHRyZXR1cm4gcGl0O1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVNvaWxQaXRGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcblxudmFyIFNjYXBlRGVuZHJvbWV0ZXJBZGRvbiA9IHJlcXVpcmUoJy4vYWRkb25zL2RlbmRyb21ldGVyJyk7XG52YXIgU2NhcGVTYXBGbG93TWV0ZXJBZGRvbiA9IHJlcXVpcmUoJy4vYWRkb25zL3NhcGZsb3dtZXRlcicpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSB0cmVlIG1lc2ggb2YgdGhlIHNwZWNpZmllZCBzaXplIGFuZCBjb2xvci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuZGlhbWV0ZXI9MSBEaWFtZXRlciBvZiB0cnVuayAoYS5rLmEuIERCSClcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmhlaWdodD0xMCBIZWlnaHQgb2YgdHJlZVxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy50cnVua01hdGVyaWFsPVNjYXBlU3R1ZmYud29vZCBXaGF0IHRvIG1ha2UgdGhlIHRydW5rIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5sZWFmTWF0ZXJpYWw9U2NhcGVTdHVmZi5mb2xpYWdlIFdoYXQgdG8gbWFrZSB0aGUgZm9saWFnZSBvdXQgb2ZcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW50ZXJuYWxzIElmIHN1cHBsaWVkLCB0aGlzIGZhY3Rvcnkgd2lsbCBzYXZlIHNvbWVcbiAqICAgICAgICBpbnRlcmltIGNhbGN1bGF0ZWQgdmFsdWVzIGludG8gdGhpcyBvYmplY3QuICBFLmcuXG4gKiAgICAgICAgdGhlIGhlaWdodCBvZiB0aGUgY2Fub3B5LCB0aGUgTWF0ZXJpYWwgdGhlIHRydW5rIGlzIG1hZGUgb3V0XG4gKiAgICAgICAgb2YsIGV0Yy4gIFRoaXMgY2FuIGhlbHAgYW5vdGhlciBTY2FwZUl0ZW1UeXBlIGZhY3RvcnkgdXNlXG4gKiAgICAgICAgdGhpcyBhcyBhIHN0YXJ0aW5nIHBvaW50LlxuICogQHBhcmFtIHtBcnJheX0gaW50ZXJuYWxzLm1lc2hOYW1lcyBBbiBhcnJheSBvZiBtZXNoIG5hbWVzLCBpbiB0aGVcbiAqICAgICAgICBzYW1lIG9yZGVyIGFzIHRoZSBtZXNoIGxpc3QgcmV0dXJuZWQgYnkgdGhlIGZ1bmN0aW9uLiAgVGhpc1xuICogICAgICAgIGFsbG93cyBkb3duc3RyZWFtIGZhY3RvcnkgZnVuY3Rpb25zIHRvIGlkZW50aWZ5IG1lc2hlcyBpblxuICogICAgICAgIG9yZGVyIHRvIGFsdGVyIHRoZW0uXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnRyZWVcbiAqL1xuZnVuY3Rpb24gU2NhcGVUcmVlRmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHR2YXIgdHJlZSA9IHsgbWVzaGVzOiBbXSwgY2xpY2tQb2ludHM6IFtdIH07XG5cblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwge307XG5cdGkubWVzaE5hbWVzID0gaS5tZXNoTmFtZXMgfHwgW107XG5cblx0aS5kaWFtID0gb3B0aW9ucy5kaWFtZXRlciB8fCAxO1xuXHRpLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDEwO1xuXHRpLnRydW5rU3R1ZmYgPSBvcHRpb25zLnRydW5rIHx8IFNjYXBlU3R1ZmYud29vZDtcblx0aS5jYW5vcHlTdHVmZiA9IG9wdGlvbnMuY2Fub3B5IHx8IFNjYXBlU3R1ZmYudHJhbnNwYXJlbnRGb2xpYWdlO1xuXG5cdGkuY2Fub3B5SGVpZ2h0ID0gaS5oZWlnaHQgLyA0O1xuXHRpLnRydW5rSGVpZ2h0ID0gaS5oZWlnaHQgLSBpLmNhbm9weUhlaWdodDtcblx0aS50cnVua1JhZGl1cyA9IDIgKiBpLmRpYW0gLyAyO1xuXHRpLmNhbm9weVJhZGl1cyA9IGkudHJ1bmtSYWRpdXMgKiA2O1xuXG5cdC8vIHRyYW5zZm9ybXMgd2UgbmVlZDpcblx0Ly8gcm90YXRlIHNvIGl0J3MgaGVpZ2h0IGlzIGFsb25nIHRoZSBaIGF4aXMgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHRpLnRydW5rR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkudHJ1bmtSYWRpdXMvMiwgaS50cnVua1JhZGl1cywgaS50cnVua0hlaWdodCwgMTIpO1xuXHQvLyBjZW50ZXIgb24geCA9IDAgYW5kIHkgPSAwLCBidXQgaGF2ZSB0aGUgX2JvdHRvbV8gZmFjZSBzaXR0aW5nIG9uIHogPSAwXG5cdHZhciB0cnVua1Bvc2l0aW9uID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS50cnVua0hlaWdodC8yKTtcblx0aS50cnVua0dlb20uYXBwbHlNYXRyaXgodHJ1bmtQb3NpdGlvbi5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIHRydW5rID0gbmV3IFRIUkVFLk1lc2goaS50cnVua0dlb20sIGkudHJ1bmtTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3RydW5rJyk7XG5cdHRyZWUubWVzaGVzLnB1c2godHJ1bmspO1xuXG5cdGkuY2Fub3B5R2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkuY2Fub3B5UmFkaXVzLCBpLmNhbm9weVJhZGl1cywgaS5jYW5vcHlIZWlnaHQsIDEyKTtcblx0Ly8gY2VudGVyIG9uIHggPSAwLCB5ID0gMCwgYnV0IGhhdmUgdGhlIGNhbm9weSBhdCB0aGUgdG9wXG5cdHZhciBjYW5vcHlQb3NpdGlvbiA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkuY2Fub3B5SGVpZ2h0LzIgKyBpLmhlaWdodCAtIGkuY2Fub3B5SGVpZ2h0KTtcblx0aS5jYW5vcHlHZW9tLmFwcGx5TWF0cml4KGNhbm9weVBvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgY2Fub3B5ID0gbmV3IFRIUkVFLk1lc2goaS5jYW5vcHlHZW9tLCBpLmNhbm9weVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY2Fub3B5Jyk7XG5cdHRyZWUubWVzaGVzLnB1c2goY2Fub3B5KTtcblxuXHQvLy8vLy8vLy8vIGRlbmRyb1xuXHRpZiAodHlwZW9mIG9wdGlvbnMuZGVuZHJvbWV0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0dHJlZSA9IFNjYXBlRGVuZHJvbWV0ZXJBZGRvbih0cmVlLCBvcHRpb25zLCBpKTtcblx0fVxuXG5cdC8vLy8vLy8vLy8gc2FwIGZsb3cgbWV0ZXJcblx0aWYgKHR5cGVvZiBvcHRpb25zLnNhcGZsb3dtZXRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHR0cmVlID0gU2NhcGVTYXBGbG93TWV0ZXJBZGRvbih0cmVlLCBvcHRpb25zLCBpKTtcblx0fVxuXG5cdHJldHVybiB0cmVlO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVRyZWVGYWN0b3J5O1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5USFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuLy8gYWxzbyByZXF1aXJlcyBPcmJpdENvbnRyb2xzXG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVDaHVuayA9IHJlcXVpcmUoJy4vY2h1bmsnKTtcblxuXG4vLyBERUJVR1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAY2FsbGJhY2sgU2NhcGVTY2VuZX5kYXRlQ2hhbmdlXG4gKiBAcGFyYW0ge3N0cmluZ30gZXJyb3IgRGVzY3JpcHRpb24gb2YgZXJyb3IsIG90aGVyd2lzZSBudWxsXG4gKiBAcGFyYW0ge2RhdGV9IGRhdGUgRGF0ZSB0aGUgc2NhcGUgaXMgbm93IGRpc3BsYXlpbmdcbiAqL1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIG9mIGEgbGFuZHNjYXBlIC8gbW9vbnNjYXBlIC8gd2hhdGV2ZXJcbiAqIEBwYXJhbSB7U2NhcGVGaWVsZH0gZmllbGQgIHRoZSBmaWVsZCBiZWluZyByZW5kZXJlZFxuICogQHBhcmFtIHtzdHJpbmd9IGRvbSAgICAgICAgRE9NIGVsZW1lbnQgdGhlIHNjYXBlIHNob3VsZCBiZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWQgaW50by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICAgIGNvbGxlY3Rpb24gb2Ygb3B0aW9ucy4gIEFsbCBhcmUgb3B0aW9uYWwuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmxpZ2h0cz0nc3VuJywnc2t5JyAtIGFycmF5IG9mIHN0cmluZ3NcbiAqIG5hbWluZyBsaWdodHMgdG8gaW5jbHVkZSBpbiB0aGlzIHNjZW5lLiAgQ2hvb3NlIGZyb206XG4gKlxuICogc3RyaW5nICAgIHwgbGlnaHQgdHlwZVxuICogLS0tLS0tLS0tLXwtLS0tLS0tLS0tLVxuICogYHRvcGxlZnRgIHwgYSBsaWdodCBmcm9tIGFib3ZlIHRoZSBjYW1lcmEncyBsZWZ0IHNob3VsZGVyXG4gKiBgYW1iaWVudGAgfCBhIGRpbSBhbWJpZW50IGxpZ2h0XG4gKiBgc3VuYCAgICAgfCBhIGRpcmVjdGlvbmFsIGxpZ2h0IHRoYXQgb3JiaXRzIHRoZSBzY2VuZSBvbmNlIHBlciBkYXlcbiAqIGBza3lgICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBzaGluZXMgZnJvbSBhYm92ZSB0aGUgc2NlbmVcbiAqIEBwYXJhbSB7RGF0ZXxcIm5vd1wifSBvcHRpb25zLmN1cnJlbnREYXRlPSdub3cnIC0gVGhlIHRpbWUgYW5kIGRhdGVcbiAqIGluc2lkZSB0aGUgc2NhcGUuICBUaGUgc3RyaW5nIFwibm93XCIgbWVhbnMgc2V0IGN1cnJlbnREYXRlIHRvIHRoZVxuICogcHJlc2VudC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnRpbWVSYXRpbz0xIFRoZSByYXRlIHRpbWUgc2hvdWxkIHBhc3MgaW5cbiAqIHRoZSBzY2FwZSwgcmVsYXRpdmUgdG8gbm9ybWFsLiAgMC4xIG1lYW5zIHRlbiB0aW1lcyBzbG93ZXIuICA2MFxuICogbWVhbnMgb25lIG1pbnV0ZSByZWFsIHRpbWUgPSBvbmUgaG91ciBzY2FwZSB0aW1lLiAgVXNlIDAgdG8gZnJlZXplXG4gKiB0aW1lLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfmRhdGVDaGFuZ2V9IG9wdGlvbnMuZGF0ZVVwZGF0ZSBjYWxsYmFjayBmb3JcbiAqIHdoZW4gdGhlIHNjZW5lIHRpbWUgY2hhbmdlcyAod2hpY2ggaXMgYSBsb3QpLlxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZVNjZW5lKGZpZWxkLCBkb20sIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgLy8gbGlnaHRzOiBbJ3RvcGxlZnQnLCAnYW1iaWVudCddLFxuICAgICAgICBsaWdodHM6IFsnc3VuJywgJ3NreSddLFxuICAgICAgICBjdXJyZW50RGF0ZTogJ25vdycsICAvLyBlaXRoZXIgc3RyaW5nICdub3cnIG9yIGEgRGF0ZSBvYmplY3RcbiAgICAgICAgdGltZVJhdGlvOiAxLFxuICAgICAgICBkYXRlVXBkYXRlOiBudWxsIC8vIGNhbGxiYWNrIHRvdXBkYXRlIHRoZSBkaXNwbGF5ZWQgZGF0ZS90aW1lXG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIHNhdmUgdGhlIGZpZWxkXG4gICAgdGhpcy5mID0gZmllbGQ7XG5cbiAgICAvLyBkaXNjb3ZlciBET00gY29udGFpbmVyXG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZG9tKTtcblxuICAgIHRoaXMuYm91bmRzID0gdGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgLy8gLi5tb3ZlIGhhbmRsZXJcbiAgICB0aGlzLmVsZW1lbnQub25tb3VzZW1vdmUgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB0aGlzLmJvdW5kcyA9IHRoaXMuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5tb3VzZUhvdmVyKGV2ZW50LmNsaWVudFggLSB0aGlzLmJvdW5kcy5sZWZ0LCBldmVudC5jbGllbnRZIC0gdGhpcy5ib3VuZHMudG9wKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICAvLyAuLmNsaWNrIGhhbmRsZXJcbiAgICB0aGlzLmVsZW1lbnQub25jbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHRoaXMuYm91bmRzID0gdGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB0aGlzLm1vdXNlQ2xpY2soZXZlbnQuY2xpZW50WCAtIHRoaXMuYm91bmRzLmxlZnQsIGV2ZW50LmNsaWVudFkgLSB0aGlzLmJvdW5kcy50b3ApO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHRoaXMuZGF0ZSA9IHRoaXMuX29wdHMuY3VycmVudERhdGU7XG4gICAgaWYgKHRoaXMuZGF0ZSA9PT0gJ25vdycpIHtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5zdGFydERhdGUgPSB0aGlzLmRhdGU7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgLy8gY3JlYXRlIGFuZCBzYXZlIGFsbCB0aGUgYml0cyB3ZSBuZWVkXG4gICAgdGhpcy5yZW5kZXJlciA9IHRoaXMuX21ha2VSZW5kZXJlcih7IGRvbTogdGhpcy5lbGVtZW50IH0pO1xuICAgIHRoaXMuc2NlbmUgPSB0aGlzLl9tYWtlU2NlbmUoKTtcbiAgICB0aGlzLmNhbWVyYSA9IHRoaXMuX21ha2VDYW1lcmEoKTtcbiAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy5fbWFrZUNvbnRyb2xzKCk7XG4gICAgdGhpcy5saWdodHMgPSB0aGlzLl9tYWtlTGlnaHRzKHRoaXMuX29wdHMubGlnaHRzKTtcblxuICAgIHRoaXMudWlQb2ludGVyID0gbmV3IFNjYXBlSXRlbShTY2FwZUl0ZW1zLmxhYmVsLCAwLCAwLCB7dGV4dDogJ3VubmFtZWQnfSk7XG5cbiAgICB0aGlzLmNvbm5lY3RGaWVsZCgpO1xuXG4gICAgLy8gYWRkIGdyaWRzIGFuZCBoZWxwZXIgY3ViZXNcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoKTtcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoJ3RvcCcpO1xuICAgIC8vIHRoaXMuYWRkSGVscGVyU2hhcGVzKCk7XG5cbiAgICB2YXIgbGFzdExvZ0F0ID0gMDsgLy8gREVCVUdcbiAgICB2YXIgcmVuZGVyID0gKGZ1bmN0aW9uIHVuYm91bmRSZW5kZXIodHMpIHtcblxuICAgICAgICAvLyBERUJVR1xuICAgICAgICBpZiAobGFzdExvZ0F0ICsgMjAwMCA8IHRzKSB7XG4gICAgICAgICAgICBsYXN0TG9nQXQgPSB0cztcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSggcmVuZGVyICk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKCB0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSApO1xuICAgICAgICB0aGlzLmNvbnRyb2xzLnVwZGF0ZSgpO1xuXG4gICAgICAgIC8vIERFQlVHIG1heWJlIHRoZSB1cGRhdGVUaW1lIGlzIGRpc2FibGVkXG4gICAgICAgIHRoaXMuX3VwZGF0ZVRpbWUoKTtcblxuICAgIH0pLmJpbmQodGhpcyk7XG5cbiAgICByZW5kZXIoMCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZVNjZW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVTY2VuZTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUuYWRkKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUuYWRkKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiByZW1vdmUgYSBtZXNoIHRvIHRoZSBUSFJFRS5TY2VuZSAoYSBwYXNzdGhyb3VnaCBmb3IgVEhSRUUuU2NlbmUucmVtb3ZlKVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbih0aGluZykge1xuICAgIHRoaXMuc2NlbmUucmVtb3ZlKHRoaW5nKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYmxvY2tzIGZyb20gdGhlIGF0dGFjaGVkIFNjYXBlRmllbGQgaW50byB0aGUgc2NlbmUuXG4gKlxuICogWW91IHdpbGwgcHJvYmFibHkgb25seSBuZWVkIHRvIGNhbGwgdGhpcyBvbmNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25uZWN0RmllbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmYuYnVpbGRCbG9ja3ModGhpcyk7XG4gICAgdGhpcy5mLmJ1aWxkSXRlbXModGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdGVsbCB0aGlzIHNjZW5lIHRoYXQgaXQncyBmaWVsZCdzIGl0ZW1zIGhhdmUgdXBkYXRlZFxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5yZWZyZXNoSXRlbXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmYuYnVpbGRJdGVtcyh0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgaGVscGVyIGN1YmVzIGF0IHNvbWUgb2YgdGhlIGNvcm5lcnMgb2YgeW91ciBzY2FwZSwgc28geW91IGNhblxuICogc2VlIHdoZXJlIHRoZXkgYXJlIGluIHNwYWNlLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJTaGFwZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgd2hpdGUgPSAweGZmZmZmZjtcbiAgICB2YXIgcmVkICAgPSAweGZmMDAwMDtcbiAgICB2YXIgZ3JlZW4gPSAweDAwZmYwMDtcbiAgICB2YXIgYmx1ZSAgPSAweDAwMDBmZjtcbiAgICB2YXIgZiA9IHRoaXMuZjtcblxuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWluWSwgZi5taW5aLCB3aGl0ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWF4WCwgZi5taW5ZLCBmLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKChmLm1pblggKyBmLm1heFgpIC8gMiwgZi5taW5ZLCBmLm1pblosIHJlZCk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5tYXhZLCBmLm1pblosIGdyZWVuKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWF4WiwgYmx1ZSk7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWF4WCwgZi5tYXhZLCBmLm1pblosIHdoaXRlKTtcblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5tb3VzZUhvdmVyID0gZnVuY3Rpb24obW91c2VYLCBtb3VzZVkpIHtcblxuICAgIHZhciByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG4gICAgbW91c2VQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIG1vdXNlUG9zLnggPSAgIChtb3VzZVggLyB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQud2lkdGgpICAqIDIgLSAxO1xuICAgIG1vdXNlUG9zLnkgPSAtIChtb3VzZVkgLyB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQuaGVpZ2h0KSAqIDIgKyAxO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSB1aSBwb2ludGVyXG4gICAgdGhpcy51aVBvaW50ZXIucmVtb3ZlRnJvbVNjZW5lKCk7XG5cbiAgICAvLyBzZXQgYWxsIHRoZSBjbGlja2FibGVzIHRvIGhpZGRlblxuICAgIGZvciAodmFyIGM9MDsgYyA8IHRoaXMuZi5jbGlja2FibGVzLmxlbmd0aDsgYysrKSB7XG4gICAgICAgIHRoaXMuZi5jbGlja2FibGVzW2NdLnZpc2libGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBub3cgdW5oaWRlIGp1c3QgdGhlIG9uZXMgaW4gdGhlIG1vdXNlIGFyZWFcbiAgICByYXljYXN0ZXIuc2V0RnJvbUNhbWVyYShtb3VzZVBvcywgdGhpcy5jYW1lcmEpO1xuICAgIHZhciBpbnRlcnNlY3RzID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHModGhpcy5mLmNsaWNrYWJsZXMsIHRydWUpO1xuXG4gICAgdmFyIGludGVyc2VjdCwgY2xpY2thYmxlLCBmaXJzdENsaWNrYWJsZSA9IG51bGw7XG4gICAgZm9yICh2YXIgaT0wOyBpIDwgaW50ZXJzZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbnRlcnNlY3QgPSBpbnRlcnNlY3RzW2ldLm9iamVjdDtcbiAgICAgICAgY2xpY2thYmxlID0gaW50ZXJzZWN0LnBhcmVudDtcbiAgICAgICAgaWYgKCFmaXJzdENsaWNrYWJsZSAmJiBpbnRlcnNlY3QudXNlckRhdGEuY2xpY2tEYXRhKSB7XG4gICAgICAgICAgICBmaXJzdENsaWNrYWJsZSA9IGludGVyc2VjdDtcbiAgICAgICAgICAgIGlmIChmaXJzdENsaWNrYWJsZS51c2VyRGF0YS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgLy8gZmlyc3QgY2xpY2thYmxlIGhhcyBhIG5hbWUsIG1ha2UgaXQgaW50byBhIGxhYmVsXG4gICAgICAgICAgICAgICAgdGhpcy51aVBvaW50ZXIudXBkYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZmlyc3RDbGlja2FibGUudXNlckRhdGEubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgeDogY2xpY2thYmxlLnBvc2l0aW9uLngsXG4gICAgICAgICAgICAgICAgICAgIHk6IGNsaWNrYWJsZS5wb3NpdGlvbi55LFxuICAgICAgICAgICAgICAgICAgICB6OiBjbGlja2FibGUucG9zaXRpb24ueixcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBmaXJzdENsaWNrYWJsZS51c2VyRGF0YS5vZmZzZXRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyAvLyByb3RhdGUgdG8gc2hvdyB0ZXh0IHRvIGNhbWVyYT9cbiAgICAgICAgICAgICAgICAvLyB0aGlzLnVpUG9pbnRlci5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIG0udXAuY29weSh0aGlzLmNhbWVyYS51cCk7XG4gICAgICAgICAgICAgICAgLy8gICAgIG0ubG9va0F0KHRoaXMuY2FtZXJhLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAvLyB9LCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpUG9pbnRlci5hZGRUb1NjZW5lKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNsaWNrYWJsZS52aXNpYmxlID0gdHJ1ZTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLm1vdXNlQ2xpY2sgPSBmdW5jdGlvbihtb3VzZVgsIG1vdXNlWSkge1xuXG4gICAgdmFyIHJheWNhc3RlciA9IG5ldyBUSFJFRS5SYXljYXN0ZXIoKTtcbiAgICBtb3VzZVBvcyA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgbW91c2VQb3MueCA9ICAgKG1vdXNlWCAvIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudC53aWR0aCkgICogMiAtIDE7XG4gICAgbW91c2VQb3MueSA9IC0gKG1vdXNlWSAvIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudC5oZWlnaHQpICogMiArIDE7XG5cbiAgICAvLyBmaW5kIHRoZSBpbnRlcnNlY3RpbmcgY2xpY2thYmxlc1xuICAgIHJheWNhc3Rlci5zZXRGcm9tQ2FtZXJhKG1vdXNlUG9zLCB0aGlzLmNhbWVyYSk7XG4gICAgdmFyIGludGVyc2VjdHMgPSByYXljYXN0ZXIuaW50ZXJzZWN0T2JqZWN0cyh0aGlzLmYuY2xpY2thYmxlcywgdHJ1ZSk7XG5cbiAgICB2YXIgY2xpY2tlZDtcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBpbnRlcnNlY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIHRoZSBmaXJzdCBvbmUgd2l0aCB1c2VyRGF0YS5jbGlja0RhdGEgZGVmaW5lZCBpcyB0aGUgd2lubmVyXG4gICAgICAgIGNsaWNrZWQgPSBpbnRlcnNlY3RzW2ldLm9iamVjdDtcbiAgICAgICAgaWYgKGNsaWNrZWQudXNlckRhdGEuY2xpY2tEYXRhKSB7XG4gICAgICAgICAgICAvLyBpZiB0aGVyZSBpcyBhIGNhbGxiYWNrLCBpbnZva2UgaXRcbiAgICAgICAgICAgIGlmICh0aGlzLl9vcHRzLmNsaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5fb3B0cy5jbGljaztcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGNsaWNrZWQudXNlckRhdGEuY2xpY2tEYXRhO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoIGZ1bmN0aW9uKCl7IGNhbGxiYWNrLmNhbGwod2luZG93LCBkYXRhKTsgfSwgMCApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGEgY3ViZSBhdCBwb3NpdGlvbiBgeGAsIGB5YCwgYHpgIHRvIGNvbmZpcm0gd2hlcmUgdGhhdCBpcyxcbiAqIGV4YWN0bHkuICBHcmVhdCBmb3IgdHJ5aW5nIHRvIHdvcmsgb3V0IGlmIHlvdXIgc2NhcGUgaXMgYmVpbmdcbiAqIHJlbmRlcmVkIHdoZXJlIHlvdSB0aGluayBpdCBzaG91bGQgYmUgcmVuZGVyZWQuXG4gKlxuICogQHBhcmFtIHsoTnVtYmVyfFZlY3RvcjMpfSB4IFggY29vcmRpbmF0ZSwgb3IgYSB7QGxpbmsgaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9NYXRoL1ZlY3RvcjMgVEhSRUUuVmVjdG9yM30gY29udGFpbmluZyB4LCB5IGFuZCB6IGNvb3Jkc1xuICogQHBhcmFtIHtOdW1iZXJ9IFt5XSBZIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBbel0gWiBjb29yZGluYXRlXG4gKiBAcGFyYW0ge0NvbG9yfFN0cmluZ3xJbnRlZ2VyfSBjb2xvcj0nI2NjY2NjYycgQ29sb3Igb2YgY3ViZS5cbiAqIENhbiBiZSBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvQ29sb3IgVEhSRUUuQ29sb3J9LCBhIGNvbG9yLXBhcnNlYWJsZSBzdHJpbmcgbGlrZVxuICogYCcjMzM2NmNjJ2AsIG9yIGEgbnVtYmVyIGxpa2UgYDB4MzM2NmNjYC5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyQ3ViZSA9IGZ1bmN0aW9uKHgsIHksIHosIGNvbG9yKSB7XG4gICAgLy8gZmlyc3QsIHNldCB0aGUgY29sb3IgdG8gc29tZXRoaW5nXG4gICAgaWYgKHR5cGVvZiBjb2xvciA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBkZWZhdWx0IHRvIGxpZ2h0IGdyZXkuXG4gICAgICAgIGNvbG9yID0gbmV3IFRIUkVFLkNvbG9yKDB4Y2NjY2NjKTtcbiAgICB9XG4gICAgdmFyIHBvczsgLy8gdGhlIHBvc2l0aW9uIHRvIGRyYXcgdGhlIGN1YmVcbiAgICBpZiAodHlwZW9mIHgueCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyB0aGVuIGl0J3MgYSB2ZWN0b3IsIGFuZCB5IG1pZ2h0IGJlIHRoZSBjb2xvclxuICAgICAgICBwb3MgPSB4O1xuICAgICAgICBpZiAodHlwZW9mIHkgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbG9yID0geTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHggaXNuJ3QgYSB2ZWN0b3IsIHNvIGFzc3VtZSBzZXBhcmF0ZSB4IHkgYW5kIHpcbiAgICAgICAgcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgeik7XG4gICAgICAgIC8vIHdlIGNhdWdodCBjb2xvciBhbHJlYWR5LlxuICAgIH1cblxuICAgIC8vIGFib3V0IGEgZmlmdGlldGggb2YgdGhlIGZpZWxkJ3Mgc3VtbWVkIGRpbWVuc2lvbnNcbiAgICB2YXIgc2l6ZSA9ICh0aGlzLmYud1ggKyB0aGlzLmYud1kgKyB0aGlzLmYud1opIC8gNTA7XG4gICAgLy8gdXNlIHRoZSBjb2xvdXIgd2UgZGVjaWRlZCBlYXJsaWVyXG4gICAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoeyBjb2xvcjogY29sb3IgfSk7XG5cbiAgICAvLyBva2F5Li4gbWFrZSBpdCwgcG9zaXRpb24gaXQsIGFuZCBzaG93IGl0XG4gICAgdmFyIGN1YmUgPSBTY2FwZUl0ZW1zLmN1YmUoeyBzaXplOiBzaXplLCBtYXRlcmlhbDogbWF0ZXJpYWwgfSkubWVzaGVzWzBdO1xuICAgIGN1YmUucG9zaXRpb24uY29weShwb3MpO1xuICAgIHRoaXMuc2NlbmUuYWRkKGN1YmUpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJHcmlkID0gZnVuY3Rpb24odG9wT3JCb3R0b20pIHtcbiAgICB2YXIgZ3ogPSAwO1xuICAgIHZhciBnYyA9IDB4NDQ0NDQ0O1xuICAgIGlmICh0b3BPckJvdHRvbSA9PSAndG9wJykge1xuICAgICAgICBneiA9IHRoaXMuZi5tYXhaO1xuICAgICAgICBnYyA9IDB4Y2NjY2ZmO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1pblo7XG4gICAgICAgIGdjID0gMHhjY2ZmY2M7XG4gICAgfVxuXG4gICAgdmFyIGdyaWRXID0gTWF0aC5tYXgodGhpcy5mLm1heFggLSB0aGlzLmYubWluWCwgdGhpcy5mLm1heFkgLSB0aGlzLmYubWluWSk7XG5cbiAgICAvLyBHcmlkIFwic2l6ZVwiIGlzIHRoZSBkaXN0YW5jZSBpbiBlYWNoIG9mIHRoZSBmb3VyIGRpcmVjdGlvbnMsXG4gICAgLy8gdGhlIGdyaWQgc2hvdWxkIHNwYW4uICBTbyBmb3IgYSBncmlkIFcgdW5pdHMgYWNyb3NzLCBzcGVjaWZ5XG4gICAgLy8gdGhlIHNpemUgYXMgVy8yLlxuICAgIHZhciBncmlkWFkgPSBuZXcgVEhSRUUuR3JpZEhlbHBlcihncmlkVy8yLCBncmlkVy8xMCk7XG4gICAgZ3JpZFhZLnNldENvbG9ycyhnYywgZ2MpO1xuICAgIGdyaWRYWS5yb3RhdGlvbi54ID0gTWF0aC5QSS8yO1xuICAgIGdyaWRYWS5wb3NpdGlvbi5zZXQodGhpcy5mLm1pblggKyBncmlkVy8yLCB0aGlzLmYubWluWSArIGdyaWRXLzIsIGd6KTtcbiAgICB0aGlzLnNjZW5lLmFkZChncmlkWFkpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgVEhSRUUuUmVuZGVyZXIuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHZhcmlvdXMgb3B0aW9uc1xuICogQHBhcmFtIHtET01FbGVtZW50fGpRdWVyeUVsZW19IG9wdGlvbnMuZG9tIGEgZG9tIGVsZW1lbnRcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy53aWR0aCByZW5kZXJlciB3aWR0aCAoaW4gcGl4ZWxzKVxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmhlaWdodCByZW5kZXJlciBoZWlnaHQgKGluIHBpeGVscylcbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVJlbmRlcmVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHZhciByZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKHsgYW50aWFsaWFzOiB0cnVlLCBhbHBoYTogdHJ1ZSwgcHJlY2lzaW9uOiBcImhpZ2hwXCIgfSk7XG4gICAgcmVuZGVyZXIuc2V0Q2xlYXJDb2xvciggMHgwMDAwMDAsIDApO1xuICAgIC8vIHJlbmRlcmVyLnNoYWRvd01hcEVuYWJsZWQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZG9tKSB7XG4gICAgICAgIHZhciAkZG9tID0gJChvcHRpb25zLmRvbSk7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUoJGRvbS53aWR0aCgpLCAkZG9tLmhlaWdodCgpKTtcbiAgICAgICAgJGRvbS5hcHBlbmQocmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMud2lkdGggJiYgb3B0aW9ucy5oZWlnaHQpIHtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZShvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCk7XG4gICAgfVxuICAgIHJldHVybiByZW5kZXJlcjtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB1cGRhdGVzIHRoZSBzY2FwZSB0aW1lIHRvIG1hdGNoIHRoZSBjdXJyZW50IHRpbWUgKHRha2luZyBpbnRvXG4gKiBhY2NvdW50IHRoZSB0aW1lUmF0aW8gZXRjKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlVGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIHZhciBlbGFwc2VkID0gbm93LmdldFRpbWUoKSAtIHRoaXMuZmlyc3RSZW5kZXI7XG5cbiAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSh0aGlzLnN0YXJ0RGF0ZS5nZXRUaW1lKCkgKyAoZWxhcHNlZCAqIHRoaXMuX29wdHMudGltZVJhdGlvKSk7XG5cbiAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9vcHRzLmRhdGVVcGRhdGU7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgY2FsbGJhY2tEYXRlID0gbmV3IERhdGUodGhpcy5kYXRlKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgY2FsbGJhY2tEYXRlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVN1bigpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzdW4gdG8gc3VpdCB0aGUgc2NhcGUgY3VycmVudCB0aW1lLlxuICogQHBhcmFtICB7VEhSRUUuRGlyZWN0aW9uYWxMaWdodH0gW3N1bl0gdGhlIHN1biB0byBhY3Qgb24uICBJZiBub3RcbiAqIHN1cHBsaWVkLCB0aGlzIG1ldGhvZCB3aWxsIGFjdCBvbiB0aGUgbGlnaHQgaW4gdGhpcyBzY2VuZSdzIGxpZ2h0XG4gKiBsaXN0IHRoYXQgaXMgY2FsbGVkIFwic3VuXCIuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX3VwZGF0ZVN1biA9IGZ1bmN0aW9uKHN1bikge1xuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gaWYgdGhleSBkaWRuJ3QgcHJvdmlkZSBhIHN1biwgdXNlIG91ciBvd25cbiAgICAgICAgc3VuID0gdGhpcy5saWdodHMuc3VuO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc3VuID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjsgLy8gYmFpbCBpZiB0aGVyZSdzIG5vIHN1biBXSEFUIERJRCBZT1UgRE8gWU9VIE1PTlNURVJcbiAgICB9XG5cbiAgICB2YXIgc3VuQW5nbGUgPSAodGhpcy5kYXRlLmdldEhvdXJzKCkqNjAgKyB0aGlzLmRhdGUuZ2V0TWludXRlcygpKSAvIDE0NDAgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgc3VuUm90YXRpb25BeGlzID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCk7XG5cbiAgICBzdW4ucG9zaXRpb25cbiAgICAgICAgLnNldCgwLCAtMyAqIHRoaXMuZi53WSwgLTIwICogdGhpcy5mLndaKVxuICAgICAgICAuYXBwbHlBeGlzQW5nbGUoc3VuUm90YXRpb25BeGlzLCBzdW5BbmdsZSlcbiAgICAgICAgLmFkZCh0aGlzLmYuY2VudGVyKTtcblxuICAgIHZhciBzdW5aID0gc3VuLnBvc2l0aW9uLno7XG5cbiAgICAvLyBzd2l0Y2ggdGhlIHN1biBvZmYgd2hlbiBpdCdzIG5pZ2h0IHRpbWVcbiAgICBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gZmFsc2UgJiYgc3VuWiA8PSB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3VuLm9ubHlTaGFkb3cgPT0gdHJ1ZSAmJiBzdW5aID4gdGhpcy5mLmNlbnRlci56KSB7XG4gICAgICAgIHN1bi5vbmx5U2hhZG93ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gZmFkZSBvdXQgdGhlIHNoYWRvdyBkYXJrbmVzcyB3aGVuIHRoZSBzdW4gaXMgbG93XG4gICAgaWYgKHN1blogPj0gdGhpcy5mLmNlbnRlci56ICYmIHN1blogPD0gdGhpcy5mLm1heFopIHtcbiAgICAgICAgdmFyIHVwbmVzcyA9IE1hdGgubWF4KDAsIChzdW5aIC0gdGhpcy5mLmNlbnRlci56KSAvIHRoaXMuZi53WiAqIDIpO1xuICAgICAgICBzdW4uc2hhZG93RGFya25lc3MgPSAwLjUgKiB1cG5lc3M7XG4gICAgICAgIHN1bi5pbnRlbnNpdHkgPSB1cG5lc3M7XG4gICAgfVxuXG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VMaWdodHMgPSBmdW5jdGlvbihsaWdodHNUb0luY2x1ZGUpIHtcblxuICAgIHZhciBsaWdodHMgPSB7fTtcbiAgICB2YXIgZiA9IHRoaXMuZjsgIC8vIGNvbnZlbmllbnQgcmVmZXJlbmNlIHRvIHRoZSBmaWVsZFxuXG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdhbWJpZW50JykgIT0gLTEpIHtcbiAgICAgICAgLy8gYWRkIGFuIGFtYmllbnQgbGlzdFxuICAgICAgICBsaWdodHMuYW1iaWVudCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgyMjIyMzMpO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3RvcGxlZnQnKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMubGVmdCA9IG5ldyBUSFJFRS5Qb2ludExpZ2h0KDB4ZmZmZmZmLCAxLCAwKTtcbiAgICAgICAgLy8gcG9zaXRpb24gbGlnaHQgb3ZlciB0aGUgdmlld2VyJ3MgbGVmdCBzaG91bGRlci4uXG4gICAgICAgIC8vIC0gTEVGVCBvZiB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB4IHdpZHRoXG4gICAgICAgIC8vIC0gQkVISU5EIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHkgd2lkdGhcbiAgICAgICAgLy8gLSBBQk9WRSB0aGUgY2FtZXJhIGJ5IHRoZSBmaWVsZCdzIGhlaWdodFxuICAgICAgICBsaWdodHMubGVmdC5wb3NpdGlvbi5hZGRWZWN0b3JzKFxuICAgICAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24sXG4gICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMygtMC41ICogZi53WCwgLTAuNSAqIGYud1ksIDEgKiBmLndaKVxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3N1bicpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5zdW4gPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZlZSk7XG4gICAgICAgIGxpZ2h0cy5zdW4uaW50ZW5zaXR5ID0gMS4wO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZVN1bihsaWdodHMuc3VuKTtcblxuICAgICAgICAvLyBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVZpc2libGUgPSB0cnVlOyAgLy8gREVCVUdcblxuICAgICAgICAvLyBkaXJlY3Rpb24gb2Ygc3VubGlnaHRcbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5zdW4udGFyZ2V0ID0gdGFyZ2V0O1xuXG4gICAgICAgIC8vIHN1biBkaXN0YW5jZSwgbG9sXG4gICAgICAgIHZhciBzdW5EaXN0YW5jZSA9IGxpZ2h0cy5zdW4ucG9zaXRpb24uZGlzdGFuY2VUbyhsaWdodHMuc3VuLnRhcmdldC5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxvbmdlc3QgZGlhZ29uYWwgZnJvbSBmaWVsZC1jZW50ZXJcbiAgICAgICAgdmFyIG1heEZpZWxkRGlhZ29uYWwgPSBmLmNlbnRlci5kaXN0YW5jZVRvKG5ldyBUSFJFRS5WZWN0b3IzKGYubWluWCwgZi5taW5ZLCBmLm1pblopKTtcblxuICAgICAgICAvLyBzaGFkb3cgc2V0dGluZ3NcbiAgICAgICAgbGlnaHRzLnN1bi5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuMzM7XG5cbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFOZWFyID0gc3VuRGlzdGFuY2UgLSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUZhciA9IHN1bkRpc3RhbmNlICsgbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFUb3AgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVJpZ2h0ID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFCb3R0b20gPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTGVmdCA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdza3knKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc2t5ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhlZWVlZmYpO1xuICAgICAgICBsaWdodHMuc2t5LmludGVuc2l0eSA9IDAuODtcblxuICAgICAgICAvLyBza3kgaXMgZGlyZWN0bHkgYWJvdmVcbiAgICAgICAgdmFyIHNreUhlaWdodCA9IDUgKiBmLndaO1xuICAgICAgICBsaWdodHMuc2t5LnBvc2l0aW9uLmNvcHkodGhpcy5jYW1lcmEucG9zaXRpb24pO1xuICAgICAgICAvLyBsaWdodHMuc2t5LnBvc2l0aW9uLnNldFooZi5tYXhaICsgc2t5SGVpZ2h0KTtcblxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnNreS50YXJnZXQgPSB0YXJnZXQ7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgbGlnaHQgaW4gbGlnaHRzKSB7XG4gICAgICAgIGlmIChsaWdodHMuaGFzT3duUHJvcGVydHkobGlnaHQpKSB7XG4gICAgICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodHNbbGlnaHRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaWdodHM7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VTY2VuZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICAgIC8vIGFkZCBmb2dcbiAgICAvLyBzY2VuZS5mb2cgPSBuZXcgVEhSRUUuRm9nKFxuICAgIC8vICAgICAnI2YwZjhmZicsXG4gICAgLy8gICAgIHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsXG4gICAgLy8gICAgIHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblggKiAzXG4gICAgLy8gKTtcbiAgICByZXR1cm4gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDYW1lcmEgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cbiAgICAvLyB2aWV3aW5nIGFuZ2xlXG4gICAgLy8gaSB0aGluayB0aGlzIGlzIHRoZSB2ZXJ0aWNhbCB2aWV3IGFuZ2xlLiAgaG9yaXpvbnRhbCBhbmdsZSBpc1xuICAgIC8vIGRlcml2ZWQgZnJvbSB0aGlzIGFuZCB0aGUgYXNwZWN0IHJhdGlvLlxuICAgIHZhciB2aWV3QW5nbGUgPSA0NTtcbiAgICB2aWV3QW5nbGUgPSAob3B0aW9ucyAmJiBvcHRpb25zLnZpZXdBbmdsZSkgfHwgdmlld0FuZ2xlO1xuXG4gICAgLy8gYXNwZWN0XG4gICAgdmFyIHZpZXdBc3BlY3QgPSAxNi85O1xuICAgIGlmICh0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIHZpZXdBc3BlY3QgPSAkZWxlbS53aWR0aCgpIC8gJGVsZW0uaGVpZ2h0KCk7XG4gICAgfVxuXG4gICAgLy8gbmVhciBhbmQgZmFyIGNsaXBwaW5nXG4gICAgdmFyIG5lYXJDbGlwID0gMC4xO1xuICAgIHZhciBmYXJDbGlwID0gMTAwMDA7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBuZWFyQ2xpcCA9IE1hdGgubWluKHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opIC8gMTAwMDtcbiAgICAgICAgZmFyQ2xpcCA9IE1hdGgubWF4KHRoaXMuZi53WCwgdGhpcy5mLndZLCB0aGlzLmYud1opICogMTA7XG4gICAgfVxuXG4gICAgLy8gY2FtZXJhIHBvc2l0aW9uIGFuZCBsb29raW5nIGRpcmVjdGlvblxuICAgIHZhciBsb29rSGVyZSA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApO1xuICAgIHZhciBjYW1Qb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAtMTAsIDUpO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbG9va0hlcmUgPSB0aGlzLmYuY2VudGVyO1xuICAgICAgICBjYW1Qb3MgPSBsb29rSGVyZS5jbG9uZSgpLmFkZChuZXcgVEhSRUUuVmVjdG9yMygwLCAtMS43ICogdGhpcy5mLndZLCAxICogdGhpcy5mLndaKSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IHVwIGNhbWVyYVxuICAgIC8vIFRPRE8gd29yayBvdXQgd2hpY2ggY2FtZXJhIHRvIHVzZVxuXG4gICAgdmFyIGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSggdmlld0FuZ2xlLCB2aWV3QXNwZWN0LCBuZWFyQ2xpcCwgZmFyQ2xpcCk7XG5cbiAgICAvLyB2YXIgY2FtZXJhID0gbmV3IFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYShcbiAgICAvLyAgICAgMCAtIHRoaXMuZi53WCwgICAgLy8gbGVmdFxuICAgIC8vICAgICAwICsgdGhpcy5mLndYLCAgICAvLyByaWdodFxuICAgIC8vICAgICAwICsgdGhpcy5mLndaLCAgICAvLyB0b3BcbiAgICAvLyAgICAgMCAtIHRoaXMuZi53WiwgICAgLy8gYm90dG9tXG4gICAgLy8gICAgIG5lYXJDbGlwLCAgICAvLyBuZWFyXG4gICAgLy8gICAgIGZhckNsaXAgICAgIC8vIGZhclxuICAgIC8vICk7XG5cblxuICAgIC8vIFwidXBcIiBpcyBwb3NpdGl2ZSBaXG4gICAgY2FtZXJhLnVwLnNldCgwLDAsMSk7XG4gICAgY2FtZXJhLnBvc2l0aW9uLmNvcHkoY2FtUG9zKTtcbiAgICBjYW1lcmEubG9va0F0KGxvb2tIZXJlKTtcblxuICAgIC8vIGFkZCB0aGUgY2FtZXJhIHRvIHRoZSBzY2VuZVxuICAgIGlmICh0aGlzLnNjZW5lKSB7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGNhbWVyYSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbWVyYTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwwLDApO1xuICAgIGlmICh0aGlzLmYgJiYgdGhpcy5mLmNlbnRlcikge1xuICAgICAgICBjZW50ZXIgPSB0aGlzLmYuY2VudGVyLmNsb25lKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNhbWVyYSAmJiB0aGlzLnJlbmRlcmVyICYmIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgY29udHJvbHMgPSBuZXcgVEhSRUUuT3JiaXRDb250cm9scyh0aGlzLmNhbWVyYSwgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgY29udHJvbHMudGFyZ2V0ID0gY2VudGVyO1xuICAgICAgICByZXR1cm4gY29udHJvbHM7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnc2NhcGUhJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTY2VuZTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5cbnZhciBMYW1iZXJ0ID0gVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbDtcbnZhciBQaG9uZyA9IFRIUkVFLk1lc2hQaG9uZ01hdGVyaWFsO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFN0dWZmICh0aGF0IGlzLCBUSFJFRS5NYXRlcmlhbCkgdGhhdCB0aGluZ3MgaW4gc2NhcGVzIGNhbiBiZSBtYWRlIG91dCBvZi5cbiAqIEBuYW1lc3BhY2VcbiAqL1xudmFyIFNjYXBlU3R1ZmYgPSB7fTtcblxuLyoqIGdlbmVyaWMgc3R1ZmYsIGZvciBpZiBub3RoaW5nIGVsc2UgaXMgc3BlY2lmaWVkXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2VuZXJpYyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4OTk5OTk5LFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNTAgfSk7XG5cbi8qKiB3YXRlciBpcyBibHVlIGFuZCBhIGJpdCB0cmFuc3BhcmVudFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLndhdGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgzMzk5ZmYsXG4gICAgICAgICAgICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC43NSB9KTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0b25lLCBkaXJ0LCBhbmQgZ3JvdW5kIG1hdGVyaWFsc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBkaXJ0IGZvciBnZW5lcmFsIHVzZVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGEwNTIyZCB9KTtcblxuLy8gTmluZSBkaXJ0IGNvbG91cnMgZm9yIHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzLiAgU3RhcnQgYnkgZGVmaW5pbmdcbi8vIHRoZSBkcmllc3QgYW5kIHdldHRlc3QgY29sb3VycywgYW5kIHVzZSAubGVycCgpIHRvIGdldCBhIGxpbmVhclxuLy8gaW50ZXJwb2xhdGVkIGNvbG91ciBmb3IgZWFjaCBvZiB0aGUgaW4tYmV0d2VlbiBkaXJ0cy5cbnZhciBkcnkgPSBuZXcgVEhSRUUuQ29sb3IoMHhiYjg4NTUpOyAvLyBkcnlcbnZhciB3ZXQgPSBuZXcgVEhSRUUuQ29sb3IoMHg4ODIyMDApOyAvLyBtb2lzdFxuXG4vKiogZGlydCBhdCB2YXJ5aW5nIG1vaXN0dXJlIGxldmVsczogZGlydDAgaXMgZHJ5IGFuZCBsaWdodCBpblxuICAqIGNvbG91ciwgZGlydDkgaXMgbW9pc3QgYW5kIGRhcmsuXG4gICogQG5hbWUgZGlydFswLTldXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZGlydDAgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkgfSk7XG5TY2FwZVN0dWZmLmRpcnQxID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDEvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDIvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQzID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDMvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDQvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ1ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDUvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ2ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDYvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ3ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDcvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ4ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5LmNsb25lKCkubGVycCh3ZXQsIDgvOSkgfSk7XG5TY2FwZVN0dWZmLmRpcnQ5ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogd2V0IH0pO1xuXG4vKiogbGVhZiBsaXR0ZXIsIHdoaWNoIGluIHJlYWxpdHkgaXMgdXN1YWxseSBicm93bmlzaCwgYnV0IHRoaXMgaGFzXG4gICogYSBncmVlbmlzaCB0b25lIHRvIGRpc3Rpbmd1aXNoIGl0IGZyb20gcGxhaW4gZGlydC5cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5sZWFmbGl0dGVyID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg2NjZiMmYgfSk7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZmxvcmEgLSB3b29kLCBsZWF2ZXMsIGV0Y1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBnZW5lcmljIGJyb3duIHdvb2RcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg3NzQ0MjIgfSk7XG5cbi8qKiBsaWdodCB3b29kIGZvciBndW10cmVlcyBldGMuICBNYXliZSBpdCdzIGEgYml0IHRvbyBsaWdodD9cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5saWdodHdvb2QgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGZmZWVjYyB9KTtcblxuLyoqIGEgZ2VuZXJpYyBncmVlbmlzaCBsZWFmIG1hdGVyaWFsXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZm9saWFnZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NTU4ODMzIH0pO1xuXG4vKiogYSBnZW5lcmljIGdyZWVuaXNoIGxlYWYgbWF0ZXJpYWxcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5mb2xpYWdlID0gbmV3IExhbWJlcnQoXG4gIHsgY29sb3I6IDB4NTU4ODMzLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC45IH1cbik7XG5cbi8qKiBhIGdyZWVuaXNoIGxlYWYgbWF0ZXJpYWwgdGhhdCdzIG1vc3RseSBzZWUtdGhyb3VnaFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnRyYW5zcGFyZW50Rm9saWFnZSA9IG5ldyBMYW1iZXJ0KFxuICB7IGNvbG9yOiAweDU1ODgzMywgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuMzMgfVxuKTtcblxuLyoqIGEgZm9saWFnZSBtYXRlcmlhbCBmb3IgdXNlIGluIHBvaW50IGNsb3VkIG9iamVjdHNcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5wb2ludEZvbGlhZ2UgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZE1hdGVyaWFsKHsgY29sb3I6IDB4NTU4ODMzLCBzaXplOiAwLjUgfSk7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYnVpbHQgbWF0ZXJpYWxzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIHNpbHZlcnkgbWV0YWxcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5tZXRhbCA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweGFhYmJlZSwgc3BlY3VsYXI6IDB4ZmZmZmZmLCBzaGluaW5lc3M6IDEwMCwgcmVmbGVjdGl2aXR5OiAwLjggfSk7XG5cbi8qKiBjb25jcmV0ZSBpbiBhIHNvcnQgb2YgbWlkLWdyZXlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5jb25jcmV0ZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4OTk5OTk5IH0pO1xuXG4vKiogcGxhc3RpYywgYSBnZW5lcmljIHdoaXRpc2ggcGxhc3RpYyB3aXRoIGEgYml0IG9mIHNoaW5pbmVzc1xuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnBsYXN0aWMgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHhjY2NjY2MsIHNwZWN1bGFyOiAweGNjY2NjYyB9KTtcblxuLyoqIGJsYWNrIHNoYWRlY2xvdGgsIHNsaWdodGx5IHNlZSB0aHJvdWdoIGJsYWNrXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuc2hhZGVjbG90aCA9IG5ldyBMYW1iZXJ0KFxuICB7IGNvbG9yOiAweDExMTExMSwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuOCB9XG4pO1xuXG4vKiogZ2xhc3MgaXMgc2hpbnksIGZhaXJseSB0cmFuc3BhcmVudCwgYW5kIGEgbGl0dGxlIGJsdWlzaFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdsYXNzID0gbmV3IFBob25nKFxuICB7IGNvbG9yOiAweDY2YWFmZiwgc3BlY3VsYXI6IDB4ZmZmZmZmLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC41IH1cbik7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZ2VuZXJhbCBjb2xvdXJzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIG1hdHQgYmxhY2ssIGZvciBibGFjayBzdXJmYWNlcyAoYWN0dWFsbHkgaXQncyAjMTExMTExKVxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmJsYWNrID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgxMTExMTEgfSk7XG5cbi8qKiBtYXR0IHdoaXRlLCBmb3Igd2hpdGUgc3VyZmFjZXMgKGFjdHVhbGx5IGl0J3MgI2VlZWVlZSlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53aGl0ZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4ZWVlZWVlIH0pO1xuXG4vKiogZ2xvc3MgYmxhY2ssIGZvciBzaGlueSBibGFjayBwYWludGVkIHN1cmZhY2VzIChhY3R1YWxseSBpdCdzICMxMTExMTEpXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2xvc3NCbGFjayA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweDExMTExMSwgc3BlY3VsYXI6IDB4NjY2NjY2IH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFVJIHV0aWxpdHkgdGhpbmdzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIHNvbGlkIGNvbG9yIGZvciByZW5kZXJpbmcgVUkgZWxlbWVudHNcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi51aVNob3cgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBjb2xvcjogMHhmZmZmZmYgfSk7XG5TY2FwZVN0dWZmLnVpU2hvdy5kZXB0aFRlc3QgPSBmYWxzZTtcblxuLyoqIG1vc3RseSB0cmFuc3BhcmVudCwgc2xpZ2h0bHkgeWVsbG93aXNoIGNvbG9yIGZvciBoaW50aW5nIGF0IFVJIGVsZW1lbnRzXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYudWlTdWdnZXN0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IDB4ZmZmZjY2LCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC4yIH0pXG5TY2FwZVN0dWZmLnVpU3VnZ2VzdC5kZXB0aFRlc3QgPSBmYWxzZTtcblxuLyoqIGJyaWdodCBnbG93aW5nIGNvbG9yIGZvciBoaWdobGlnaHRpbmcgVUkgZWxlbWVudHNcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi51aUhpZ2hsaWdodCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7IGNvbG9yOiAweGZmZmZmZiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNDUgfSlcblNjYXBlU3R1ZmYudWlIaWdobGlnaHQuZGVwdGhUZXN0ID0gZmFsc2U7XG5cblxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTdHVmZjtcblxuXG5cblxuIl19
>>>>>>> 5df62647b11ad792ee3a8d2243ed3d337f8890a5
