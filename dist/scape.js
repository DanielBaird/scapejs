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

    label:      require('./itemtypes/label')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/crane":11,"./itemtypes/cube":12,"./itemtypes/label":13,"./itemtypes/leaflittercatcher":14,"./itemtypes/soilpit":15,"./itemtypes/tree":16}],7:[function(require,module,exports){
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

	var clickGeom = new THREE.SphereGeometry(clickRadius, 32, 24);
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

},{"../stuff":18,"./addons/camera":7}],12:[function(require,module,exports){
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

},{"../stuff":18}],13:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
var ScapeStuff = require('../stuff');

// ------------------------------------------------------------------
/**
 * @function
 * @name ScapeItems.label
 */
function ScapeLabelFactory(options, internals) {

	var label = { meshes: [], clickPoints: [] };

	var i = internals || {};
	i.meshNames = i.meshNames || [];

	i.x = options.x || 0;
	i.y = options.y || 0;
	i.z = options.z || 0;
	i.offset = options.offset || new THREE.Matrix4();

	i.labelText = options.text;
	i.textSize = options.size || 2;
	i.textWidth = i.textSize / 10;

	i.lineRadius = i.textWidth / 2;
	i.lineLength = options.height || Math.max(8, i.textSize);

	i.dotRadius = i.lineRadius * 1.5;

	i.glowStuff = options.glow || ScapeStuff.uiHighlight;
	i.textStuff = options.letters || ScapeStuff.uiShow;
	i.lineStuff = options.pointer || i.textStuff;

	var translate = new THREE.Matrix4().makeTranslation(i.x, i.y, i.z).multiply(i.offset);

	// glowing ball
	var glowGeom = new THREE.SphereGeometry(1.5, 32, 24);
	glowGeom.applyMatrix(translate);
	i.meshNames.push('glowbubble');
	label.meshes.push(new THREE.Mesh(glowGeom, i.glowStuff));

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

	// dot
	var dotGeom = new THREE.SphereGeometry(0.25, 16, 12);
	dotGeom.applyMatrix(translate);
	i.meshNames.push('dot');
	label.meshes.push(new THREE.Mesh(dotGeom, i.lineStuff));

	// pointer
	var lineGeom = new THREE.CylinderGeometry(i.lineRadius, i.lineRadius, i.lineLength);
	lineGeom.applyMatrix( new THREE.Matrix4()
		.makeTranslation(0, 0, i.lineLength / 2)
		.multiply(translate)
		.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2))
	);
	i.meshNames.push('labelpointer');
	label.meshes.push(new THREE.Mesh(lineGeom, i.lineStuff));

	return label;
};
// ------------------------------------------------------------------
module.exports = ScapeLabelFactory;

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

},{"../stuff":18,"./addons/dendrometer":9,"./addons/sapflowmeter":10}],17:[function(require,module,exports){
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

    this.uiPointer = new ScapeItem(ScapeItems.label, 0, 0, {text: 'unnamed'});

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
        camPos = lookHere.clone().add(new THREE.Vector3(0, -1.1 * this.f.wY, 1 * this.f.wZ));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NhbWVyYS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NsaWNrYWJsZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2RlbmRyb21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9hZGRvbnMvc2FwZmxvd21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9jcmFuZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3ViZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvbGFiZWwuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2xlYWZsaXR0ZXJjYXRjaGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9zb2lscGl0LmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy90cmVlLmpzIiwic3JjL3NjYXBlL3NjZW5lLmpzIiwic3JjL3NjYXBlL3N0dWZmLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3pkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNWlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLy8gVEhSRUUgPSByZXF1aXJlKCd0aHJlZScpO1xuXG4vLyBtYWtlIGFuIG9iamVjdCBvdXQgb2YgdGhlIHZhcmlvdXMgYml0c1xuU2NhcGUgPSB7XG4gICAgQmFzZU9iamVjdDogcmVxdWlyZSgnLi9zY2FwZS9iYXNlb2JqZWN0JyksXG4gICAgQ2h1bms6ICAgICAgcmVxdWlyZSgnLi9zY2FwZS9jaHVuaycpLFxuICAgIEZpZWxkOiAgICAgIHJlcXVpcmUoJy4vc2NhcGUvZmllbGQnKSxcbiAgICBJdGVtOiAgICAgICByZXF1aXJlKCcuL3NjYXBlL2l0ZW0nKSxcbiAgICBJdGVtVHlwZXM6ICByZXF1aXJlKCcuL3NjYXBlL2l0ZW10eXBlcycpLFxuICAgIFNjZW5lOiAgICAgIHJlcXVpcmUoJy4vc2NhcGUvc2NlbmUnKSxcbiAgICBTdHVmZjogICAgICByZXF1aXJlKCcuL3NjYXBlL3N0dWZmJylcbn1cblxuLy8gcmV0dXJuIHRoZSBvYmplY3QgaWYgd2UncmUgYmVpbmcgYnJvd3NlcmlmaWVkOyBvdGhlcndpc2UgYXR0YWNoXG4vLyBpdCB0byB0aGUgZ2xvYmFsIHdpbmRvdyBvYmplY3QuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNjYXBlO1xufSBlbHNlIHtcbiAgICB3aW5kb3cuU2NhcGUgPSBTY2FwZTtcbn1cbiIsIlxuLy9cbi8vIHRoaXMgXCJiYXNlXCIgb2JqZWN0IGhhcyBhIGZldyBjb252ZW5pZW5jZSBmdW5jdGlvbnMgZm9yIGhhbmRsaW5nXG4vLyBvcHRpb25zIGFuZCB3aGF0bm90XG4vL1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gU2NhcGVPYmplY3Qob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgICB0aGlzLl9vcHRzID0gT2JqZWN0LmNyZWF0ZShkZWZhdWx0cyk7XG4gICAgdGhpcy5tZXJnZU9wdGlvbnMob3B0aW9ucyk7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lcmdlIG5ldyBvcHRpb25zIGludG8gb3VyIG9wdGlvbnNcblNjYXBlT2JqZWN0LnByb3RvdHlwZS5tZXJnZU9wdGlvbnMgPSBmdW5jdGlvbihleHRyYU9wdHMpIHtcbiAgICBmb3IgKG9wdCBpbiBleHRyYU9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0c1tvcHRdID0gZXh0cmFPcHRzW29wdF07XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZU9iamVjdDsiLCJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmVwcmVzZW50cyBhIHJlY3Rhbmd1bGFyIHByaXNtIG9mIG1hdGVyaWFsIHRoYXQgdGhlIHNvbGlkIFwiZ3JvdW5kXCJcbiAqIHBvcnRpb24gb2YgYSAnc2NhcGUgaXMgbWFrZSB1cCBvZiwgZS5nLiBkaXJ0LCBsZWFmIGxpdHRlciwgd2F0ZXIuXG4gKlxuICogVGhpcyB3aWxsIGNyZWF0ZSAoYW5kIGludGVybmFsbHkgY2FjaGUpIGEgbWVzaCBiYXNlZCBvbiB0aGUgbGlua2VkXG4gKiBjaHVuayBpbmZvcm1hdGlvbiB0byBtYWtlIHJlbmRlcmluZyBpbiBXZWJHTCBmYXN0ZXIuXG4gKlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSBUaGUgU2NhcGVTY2VuZSB0aGUgY2h1bmsgd2lsbCBiZSBhZGRlZCBpbnRvXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyZW50QmxvY2sgVGhlIGJsb2NrICh2ZXJ0aWNhbCBjb2x1bW4gd2l0aGluIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjYXBlKSB0aGF0IG93bnMgdGhpcyBjaHVua1xuICogQHBhcmFtIHtJbnRlZ2VyfSBsYXllckluZGV4IEluZGV4IGludG8gcGFyZW50QmxvY2suZyB0aGlzIGNodW5rIGlzIGF0XG4gKiBAcGFyYW0ge051bWJlcn0gbWluWiBsb3dlc3QgWiB2YWx1ZSBhbnkgY2h1bmsgc2hvdWxkIGhhdmVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucywgbm90IGN1cnJlbnRseSB1c2VkXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ2h1bmsoc2NlbmUsIHBhcmVudEJsb2NrLCBsYXllckluZGV4LCBtaW5aLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuX2Jsb2NrID0gcGFyZW50QmxvY2s7XG4gICAgdGhpcy5faXNTdXJmYWNlID0gKGxheWVySW5kZXggPT0gMCk7XG4gICAgdGhpcy5fbGF5ZXIgPSBwYXJlbnRCbG9jay5nW2xheWVySW5kZXhdO1xuICAgIHRoaXMuX21pblogPSBtaW5aO1xuICAgIHRoaXMuX21lc2ggPSB0aGlzLl9jcmVhdGVOZXdNZXNoKCk7XG5cbiAgICAvLyBUT0RPOiBmaW5pc2ggaGltISFcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUNodW5rLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2NhcGVPYmplY3QucHJvdG90eXBlKTtcblNjYXBlQ2h1bmsucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVDaHVuaztcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBJbnZva2UgYSByZWJ1aWxkIG9mIHRoaXMgY2h1bmsuXG4gKlxuICogRGlzY2FyZHMgZXhpc3RpbmcgY2FjaGVkIG1lc2ggYW5kIGJ1aWxkcyBhIG5ldyBtZXNoIGJhc2VkIG9uIHRoZVxuICogY3VycmVudGx5IGxpbmtlZCBjaHVuayBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAcmV0dXJuIG5vbmVcbiAqL1xuU2NhcGVDaHVuay5wcm90b3R5cGUucmVidWlsZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3VwZGF0ZU1lc2goKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX2NyZWF0ZU5ld01lc2ggPSBmdW5jdGlvbigpIHtcbiAgICAvLyB0aGUgY2h1bmsgd2lsbCBiZSBhcyBkZWVwIGFzIHRoZSBsYXllciBzYXlzXG4gICAgdmFyIGRlcHRoID0gdGhpcy5fbGF5ZXIuZHo7XG4gICAgaWYgKGRlcHRoID09IDApIHtcbiAgICAgICAgLy8gLi51bmxlc3MgdGhhdCdzIDAsIGluIHdoaWNoIGNhc2UgZ28gdG8gdGhlIGJvdHRvbVxuICAgICAgICBkZXB0aCA9IHRoaXMuX2xheWVyLnogLSB0aGlzLl9taW5aO1xuICAgIH1cbiAgICAvLyBtYWtlIGEgZ2VvbWV0cnkgZm9yIHRoZSBjaHVua1xuICAgIHZhciBnZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KFxuICAgICAgICB0aGlzLl9ibG9jay5keCwgdGhpcy5fYmxvY2suZHksIGRlcHRoXG4gICAgKTtcbiAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5NZXNoKGdlb20sIHRoaXMuX2xheWVyLm0pO1xuICAgIG1lc2gucG9zaXRpb24uc2V0KFxuICAgICAgICB0aGlzLl9ibG9jay54ICsgdGhpcy5fYmxvY2suZHgvMixcbiAgICAgICAgdGhpcy5fYmxvY2sueSArIHRoaXMuX2Jsb2NrLmR5LzIsXG4gICAgICAgIHRoaXMuX2xheWVyLnogLSBkZXB0aC8yXG4gICAgKTtcbiAgICBtZXNoLmNhc3RTaGFkb3cgPSB0cnVlO1xuICAgIC8vIG9ubHkgdGhlIHN1cmZhY2UgY2h1bmtzIHJlY2VpdmUgc2hhZG93XG4gICAgaWYgKHRoaXMuX2lzU3VyZmFjZSkge1xuICAgICAgICBtZXNoLnJlY2VpdmVTaGFkb3cgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gbWVzaDtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX2FkZE1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zY2VuZS5hZGQodGhpcy5fbWVzaCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9yZW1vdmVNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUucmVtb3ZlKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fdXBkYXRlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3JlbW92ZU1lc2goKTtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuICAgIHRoaXMuX2FkZE1lc2goKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUNodW5rOyIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5TY2FwZVN0dWZmID0gcmVxdWlyZSgnLi9zdHVmZicpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogVGhlIGNvbnRhaW5lciBmb3IgYWxsIGluZm9ybWF0aW9uIGFib3V0IGFuIGFyZWEuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgVmFyaW91cyBvcHRpb25zIGZvciB0aGUgU2NhcGVGaWVsZCBiZWluZyBjcmVhdGVkLlxuICpcbiAqIG9wdGlvbiB8IGRlZmF1bHQgdmFsdWUgfCBkZXNjcmlwdGlvblxuICogLS0tLS0tLXwtLS0tLS0tLS0tLS0tLTp8LS0tLS0tLS0tLS0tXG4gKiBgbWluWGAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFggZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhYYCAgICAgfCAgMTAwIHwgbGFyZ2VzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWGAgIHwgICAxMCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBYIGF4aXMgaW50b1xuICogYG1pbllgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBZIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WWAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1lgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWSBheGlzIGludG9cbiAqIGBtaW5aYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWiAodmVydGljYWwgZGltZW5zaW9uKSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFpgICAgICB8ICAgNDAgfCBsYXJnZXN0IFogZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NaYCAgfCAgIDgwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFogYXhpcyBpbnRvXG4gKiBgYmxvY2tHYXBgIHwgMC4wMSB8IGdhcCB0byBsZWF2ZSBiZXR3ZWVuIGJsb2NrcyBhbG9uZyB0aGUgWCBhbmQgWSBheGVzXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlRmllbGQob3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICBtaW5YOiAwLCAgICAgICAgbWF4WDogMTAwLCAgICAgICAgICBibG9ja3NYOiAxMCxcbiAgICAgICAgbWluWTogMCwgICAgICAgIG1heFk6IDEwMCwgICAgICAgICAgYmxvY2tzWTogMTAsXG4gICAgICAgIG1pblo6IDAsICAgICAgICBtYXhaOiA0MCwgICAgICAgICAgIGJsb2Nrc1o6IDgwLFxuICAgICAgICBibG9ja0dhcDogMC4wMVxuICAgIH07XG5cbiAgICAvLyBpbnZva2Ugb3VyIHN1cGVyIGNvbnN0cnVjdG9yXG4gICAgU2NhcGVPYmplY3QuY2FsbCh0aGlzLCBvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG5cbiAgICAvLyBtaW4gYW5kIG1heCB2YWx1ZXMgZm9yIHggeSBhbmQgelxuICAgIHRoaXMubWluWCA9IHRoaXMuX29wdHMubWluWDtcbiAgICB0aGlzLm1pblkgPSB0aGlzLl9vcHRzLm1pblk7XG4gICAgdGhpcy5taW5aID0gdGhpcy5fb3B0cy5taW5aO1xuXG4gICAgdGhpcy5tYXhYID0gdGhpcy5fb3B0cy5tYXhYO1xuICAgIHRoaXMubWF4WSA9IHRoaXMuX29wdHMubWF4WTtcbiAgICB0aGlzLm1heFogPSB0aGlzLl9vcHRzLm1heFo7XG5cbiAgICAvLyBjb252ZW5pZW50IFwid2lkdGhzXCJcbiAgICB0aGlzLndYID0gdGhpcy5tYXhYIC0gdGhpcy5taW5YO1xuICAgIHRoaXMud1kgPSB0aGlzLm1heFkgLSB0aGlzLm1pblk7XG4gICAgdGhpcy53WiA9IHRoaXMubWF4WiAtIHRoaXMubWluWjtcblxuICAgIC8vIGhvdyBtYW55IGJsb2NrcyBhY3Jvc3MgeCBhbmQgeT9cbiAgICB0aGlzLmJsb2Nrc1ggPSB0aGlzLl9vcHRzLmJsb2Nrc1g7XG4gICAgdGhpcy5ibG9ja3NZID0gdGhpcy5fb3B0cy5ibG9ja3NZO1xuICAgIHRoaXMuYmxvY2tzWiA9IHRoaXMuX29wdHMuYmxvY2tzWjtcblxuICAgIC8vIGhvdyB3aWRlIGlzIGVhY2ggYmxvY2tcbiAgICB0aGlzLl9iWCA9IHRoaXMud1ggLyB0aGlzLmJsb2Nrc1g7XG4gICAgdGhpcy5fYlkgPSB0aGlzLndZIC8gdGhpcy5ibG9ja3NZO1xuICAgIHRoaXMuX2JaID0gdGhpcy53WiAvIHRoaXMuYmxvY2tzWjtcblxuICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcblxuICAgIC8vIGhvdXNla2VlcGluZ1xuICAgIHRoaXMuX2dyb3VuZFN0YWNrcyA9IFtdO1xuICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB0aGlzLl9jYWxjQ2VudGVyKCk7XG4gICAgdGhpcy5fbWFrZUdyaWQoKTtcblxuICAgIHRoaXMuY2xpY2thYmxlcyA9IFtdO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVGaWVsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUZpZWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlRmllbGQ7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAgICcoJyArIHRoaXMubWluWCArICctJyArIHRoaXMubWF4WCArXG4gICAgICAgICcsICcgKyB0aGlzLm1pblkgKyAnLScgKyB0aGlzLm1heFkgK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5aICsgJy0nICsgdGhpcy5tYXhaICtcbiAgICAgICAgJyknXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5fbWFrZUdyaWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9nID0gW107XG4gICAgZm9yICh2YXIgZ3ggPSAwOyBneCA8IHRoaXMuYmxvY2tzWDsgZ3grKykge1xuICAgICAgICB2YXIgY29sID0gW107XG4gICAgICAgIGZvciAodmFyIGd5ID0gMDsgZ3kgPCB0aGlzLmJsb2Nrc1k7IGd5KyspIHtcbiAgICAgICAgICAgIHZhciB4R2FwID0gdGhpcy5fYlggKiB0aGlzLl9vcHRzLmJsb2NrR2FwIC8gMjtcbiAgICAgICAgICAgIHZhciB5R2FwID0gdGhpcy5fYlkgKiB0aGlzLl9vcHRzLmJsb2NrR2FwIC8gMjtcbiAgICAgICAgICAgIHZhciBibG9jayA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aGlzLm1pblggKyAodGhpcy5fYlggKiBneCkgKyB4R2FwLFxuICAgICAgICAgICAgICAgIGR4OiB0aGlzLl9iWCAtIHhHYXAgLSB4R2FwLFxuICAgICAgICAgICAgICAgIHk6IHRoaXMubWluWSArICh0aGlzLl9iWSAqIGd5KSArIHlHYXAsXG4gICAgICAgICAgICAgICAgZHk6IHRoaXMuX2JZIC0geUdhcCAtIHlHYXAsXG4gICAgICAgICAgICAgICAgZzogW3tcbiAgICAgICAgICAgICAgICAgICAgejogdGhpcy5tYXhaLFxuICAgICAgICAgICAgICAgICAgICBkejogMCwgLy8gMCBtZWFucyBcInN0cmV0Y2ggdG8gbWluWlwiXG4gICAgICAgICAgICAgICAgICAgIG06IFNjYXBlU3R1ZmYuZ2VuZXJpYyxcbiAgICAgICAgICAgICAgICAgICAgY2h1bms6IG51bGxcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICBpOiBbXVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29sLnB1c2goYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2cucHVzaChjb2wpO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBidWlsZHMgYmxvY2sgbWVzaGVzIGZvciBkaXNwbGF5IGluIHRoZSBwcm92aWRlZCBzY2VuZS4gIFRoaXMgaXNcbiAqIGdlbmVyYWxseSBjYWxsZWQgYnkgdGhlIFNjYXBlU2NlbmUgb2JqZWN0IHdoZW4geW91IGdpdmUgaXQgYVxuICogU2NhcGVGaWVsZCwgc28geW91IHdvbid0IG5lZWQgdG8gY2FsbCBpdCB5b3Vyc2VsZi5cbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgdGhlIFNjYXBlU2NlbmUgdGhhdCB3aWxsIGJlIGRpc3BsYXlpbmdcbiAqIHRoaXMgU2NhcGVGaWVsZC5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYnVpbGRCbG9ja3MgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgbGF5ZXJJbmRleCA9IDA7IGxheWVySW5kZXggPCBiLmcubGVuZ3RoOyBsYXllckluZGV4KyspIHtcbiAgICAgICAgICAgIGIuZ1tsYXllckluZGV4XS5jaHVuayA9IG5ldyBTY2FwZUNodW5rKFxuICAgICAgICAgICAgICAgIHNjZW5lLCBiLCBsYXllckluZGV4LCBtaW5aXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZG8gdGhpcyB0byBhZGp1c3QgYWxsIHRoZSBjaHVuayBoZWlnaHRzXG4gICAgdGhpcy5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGJ1aWxkcyBpdGVtIG1lc2hlcyBmb3IgZGlzcGxheSBpbiB0aGUgcHJvdmlkZWQgc2NlbmUuICBUaGlzIGlzXG4gKiBnZW5lcmFsbHkgY2FsbGVkIGJ5IHRoZSBTY2FwZVNjZW5lIG9iamVjdCB3aGVuIHlvdSBnaXZlIGl0IGFcbiAqIFNjYXBlRmllbGQsIHNvIHlvdSB3b24ndCBuZWVkIHRvIGNhbGwgaXQgeW91cnNlbGYuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIHRoZSBTY2FwZVNjZW5lIHRoYXQgd2lsbCBiZSBkaXNwbGF5aW5nXG4gKiB0aGlzIFNjYXBlRmllbGQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmJ1aWxkSXRlbXMgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgdmFyIG1pblogPSB0aGlzLm1pblo7XG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYikge1xuICAgICAgICBmb3IgKHZhciBpdGVtSW5kZXggPSAwOyBpdGVtSW5kZXggPCBiLmkubGVuZ3RoOyBpdGVtSW5kZXgrKykge1xuICAgICAgICAgICAgYi5pW2l0ZW1JbmRleF0uYWRkVG9TY2VuZShzY2VuZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWR2aXNlIHRoZSBzY2VuZSwgaWYgd2UgaGF2ZSBvbmUsIHRoYXQgdGhlcmUgYXJlIG5ldyBpdGVtcy5cblNjYXBlRmllbGQucHJvdG90eXBlLnVwZGF0ZUl0ZW1zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3NjZW5lKSB7XG4gICAgICAgIHRoaXMuX3NjZW5lLnJlZnJlc2hJdGVtcygpO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gdXBkYXRlIGFuIGl0ZW0uXG5TY2FwZUZpZWxkLnByb3RvdHlwZS51cGRhdGVJdGVtID0gZnVuY3Rpb24oaXRlbSwgdXBkYXRlcykge1xuXG4gICAgLy8gcmVtb3ZlIG9sZCBjbGlja2FibGVzXG4gICAgaXRlbS5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICB2YXIgY2kgPSB0aGlzLmNsaWNrYWJsZXMuaW5kZXhPZihjcCk7XG4gICAgICAgIGlmIChjaSAhPSAtMSkge1xuICAgICAgICAgICAgdGhpcy5jbGlja2FibGVzLnNwbGljZShjaSwgMSk7XG4gICAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIGl0ZW0udXBkYXRlKHVwZGF0ZXMpO1xuICAgIC8vIFRPRE86IHdoYXQgaWYgKHgseSkgcG9zaXRpb24gaXMgdXBkYXRlZD9cblxuICAgIC8vIGFkZCBuZXcgY2xpY2thYmxlc1xuICAgIGl0ZW0uZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgdGhpcy5jbGlja2FibGVzLnB1c2goY3ApO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgaXRlbXMgdG8gdGhlIHNjYXBlIGF0IHZhcmlvdXMgcG9pbnRzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1MaXN0IEEgbGlzdCBvZiBpdGVtcy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYGl0ZW1gIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbXMgPSBmdW5jdGlvbihpdGVtTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsSXRlbXMoKTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGl0ZW1MaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciB0aGVJdGVtID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbSh0aGVJdGVtKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVJdGVtcygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5yZW1vdmVBbGxJdGVtcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaEJsb2NrKGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgZm9yICh2YXIgaW5kZXg9MDsgaW5kZXggPCBibG9jay5pLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgYmxvY2suaVtpbmRleF0uZGlzcG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIGJsb2NrLmkgPSBbXTtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLmNsaWNrYWJsZXMgPSBbXTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbSA9IGZ1bmN0aW9uKGl0ZW0pIHtcblxuICAgIC8vIGFkZCB0byB0aGUgcGFyZW50IGJsb2NrXG4gICAgdmFyIHBhcmVudEJsb2NrID0gdGhpcy5nZXRCbG9jayhpdGVtLngsIGl0ZW0ueSk7XG4gICAgcGFyZW50QmxvY2suaS5wdXNoKGl0ZW0pO1xuXG4gICAgaXRlbS5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICB0aGlzLmNsaWNrYWJsZXMucHVzaChjcCk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICAvLyBzZXQgaXRlbSBoZWlnaHQgdG8gdGhlIHBhcmVudCBibG9jaydzIGdyb3VuZCBoZWlnaHRcbiAgICBpdGVtLnNldEhlaWdodChwYXJlbnRCbG9jay5nWzBdLnopO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgaXRlbXMgdG8gdGhlIHNjYXBlIGF0IHZhcmlvdXMgcG9pbnRzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1MaXN0IEEgbGlzdCBvZiBpdGVtcy4gIEVhY2ggZWxlbWVudCBtdXN0XG4gKiBoYXZlIGB4YCwgYHlgLCBhbmQgYGl0ZW1gIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcGxhY2UgSWYgYSB0cnV0aHkgdmFsdWUgaXMgc3VwcGxpZWQsIHRoaXNcbiAqIG1ldGhvZCB3aWxsIGRpc2NhcmQgZXhpc3RpbmcgaGVpZ2h0IGNsYWltcyBiZWZvcmUgYWRkaW5nIHRoZXNlXG4gKiBvbmVzLiAgSWYgZmFsc2Ugb3IgdW5zdXBwbGllZCwgdGhlc2UgbmV3IGNsYWltcyB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgZXhpc3Rpbmcgb25lcy5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkSXRlbXNPZlR5cGUgPSBmdW5jdGlvbihpdGVtTGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2l0ZW1zID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBpdGVtTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgaXRlbUluZm8gPSBpdGVtTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRJdGVtKG5ldyBTY2FwZUl0ZW0oaXRlbUluZm8udHlwZSwgaXRlbUluZm8ueCwgaXRlbUluZm8ueSwgaXRlbUluZm8pKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQWRkIGEgbGlzdCBvZiBjbGFpbXMgb2YgdGhlIGdyb3VuZCBoZWlnaHQgYXQgdmFyaW91cyBwb2ludHMuXG4gKiBVbmxpa2Uge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0sIHRoaXNcbiAqIG1ldGhvZCB3aWxsIHJlLWV4dHJhcG9sYXRlIGdyb3VuZCBoZWlnaHRzIGFjcm9zcyB0aGUgRmllbGQgKHNvXG4gKiB5b3UgZG9uJ3QgbmVlZCB0byBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30geW91cnNlbGYpLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGhlaWdodExpc3QgQSBsaXN0IG9mIG9iamVjdHMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGB6YCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZEhlaWdodHMgPSBmdW5jdGlvbihoZWlnaHRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaGVpZ2h0TGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgcHQgPSBoZWlnaHRMaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEdyb3VuZEhlaWdodChwdC54LCBwdC55LCBwdC56KTtcbiAgICB9XG4gICAgdGhpcy5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGNsYWltIHRoYXQgdGhlIGdyb3VuZCBoZWlnaHQgaXMgYHpgIGF0IHBvaW50IGB4YCxgeWAuXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBldmVudHVhbGx5IGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNHcm91bmRIZWlnaHRzIGNhbGNHcm91bmRIZWlnaHRzfSBhZnRlciBzb1xuICogZ3JvdW5kIGhlaWdodHMgZ2V0IGV4dHJhcG9sYXRlZCBhY3Jvc3MgdGhlIGVudGlyZSBGaWVsZC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBYIGNvb3JkaW5hdGUgb2YgdGhpcyBncm91bmQgaGVpZ2h0IHJlY29yZFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHRoZSBoZWlnaHQgb2YgdGhlIGdyb3VuZCBhdCBwb3NpdGlvbiBgeGAsYHlgXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZEhlaWdodCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzLnB1c2goeyB4OiB4LCB5OiB5LCB6OiB6IH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhZGRpdGlvbmFsIGdyb3VuZCBzdGFja3MgdG8gdGhlIGZpZWxkJ3MgZ3JvdW5kIHN0YWNrcy5cbiAqIFRoZSBncm91bmRMaXN0IGlzIGFuIGFycmF5IG9mIGRhdGEgb2JqZWN0cy4gIEVhY2ggb2JqZWN0IG5lZWRzIHgsXG4gKiB5IGFuZCB6IHByb3BlcnRpZXMsIGFuZCBhICdzdGFjaycgcHJvcGVydHksIGVhY2ggbWF0Y2hpbmcgdGhlXG4gKiBjb3JyZXNwb25kaW5nIGFyZyB0byBhZGRHcm91bmRTdGFjay5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVwbGFjZSBpZiByZXBsYWNlIGlzIHRydXRoeSwgZGlzY2FyZCBleGlzdGluZ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VuZCBwb2ludHMgZmlyc3QuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrcyA9IGZ1bmN0aW9uKGdyb3VuZExpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGdyb3VuZExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gZ3JvdW5kTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRTdGFjayhwdC54LCBwdC55LCBwdC5zdGFjayk7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZFN0YWNrcygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGdyb3VuZCBzdGFjayBhdCB4LHksIHN0YXJ0aW5nIGF0IGhlaWdodCB6LlxuICogVGhlIHN0YWNrIGlzIGFuIGFycmF5IG9mIHR3by1lbGVtZW50IGFycmF5cyB3aXRoIGEgTWF0ZXJpYWxcbiAqIGFuZCBhIGRlcHRoIG51bWJlciwgbGlrZSB0aGlzOlxuICogW1xuICogICAgIFtNYXRlcmlhbC5sZWFmTGl0dGVyLCAwLjNdLFxuICogICAgIFtNYXRlcmlhbC5kaXJ0LCAzLjVdLFxuICogICAgIFtNYXRlcmlhbC5zdG9uZSwgNF1cbiAqIF1cbiAqIFRoYXQgcHV0cyBhIGxlYWZsaXR0ZXIgbGF5ZXIgMC4zIHVuaXRzIGRlZXAgb24gYSAzLjUtdW5pdFxuICogZGVlcCBkaXJ0IGxheWVyLCB3aGljaCBpcyBvbiBhIHN0b25lIGxheWVyLiAgSWYgdGhlIGZpbmFsXG4gKiBsYXllcidzIGRlcHRoIGlzIHplcm8sIHRoYXQgbGF5ZXIgaXMgYXNzdW1lZCB0byBnbyBhbGwgdGhlXG4gKiB3YXkgdG8gbWluWi5cbiAqIElmIHlvdSBjYWxsIHRoaXMsIHJlbWVtYmVyIHRvIGNhbGNHcm91bmQoKSBhZnRlci5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuYWRkR3JvdW5kU3RhY2sgPSBmdW5jdGlvbih4LCB5LCBzdGFjaykge1xuICAgIC8vIFRPRE86IGNoZWNrIGZvciB2YWxpZGl0eVxuICAgIHRoaXMuX2dyb3VuZFN0YWNrcy5wdXNoKHsgeDogeCwgIHk6IHksICBzdGFjazogc3RhY2sgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIGhlaWdodC4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgaGVpZ2h0IGNsYWltcyBvbmUgYXQgYSB0aW1lIHVzaW5nXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNhZGRHcm91bmRIZWlnaHQgYWRkR3JvdW5kSGVpZ2h0fS5cbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY2FsY0dyb3VuZEhlaWdodHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIGZpbmQgaGVpZ2h0IGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBhbGxvd2luZyBlYWNoXG4gICAgICAgIC8vIGtub3duIGdyb3VuZCBoZWlnaHQgdG8gXCJ2b3RlXCIgdXNpbmcgdGhlIGludmVyc2Ugb2ZcbiAgICAgICAgLy8gaXQncyBzcXVhcmVkIGRpc3RhbmNlIGZyb20gdGhlIGNlbnRyZSBvZiB0aGUgYmxvY2suXG4gICAgICAgIHZhciBoLCBkeCwgZHksIGRpc3QsIHZvdGVTaXplO1xuICAgICAgICB2YXIgYlogPSAwO1xuICAgICAgICB2YXIgdm90ZXMgPSAwO1xuICAgICAgICBmb3IgKHZhciBnaD0wOyBnaCA8IHRoaXMuX2dyb3VuZEhlaWdodHMubGVuZ3RoOyBnaCsrKSB7XG4gICAgICAgICAgICBoID0gdGhpcy5fZ3JvdW5kSGVpZ2h0c1tnaF07XG4gICAgICAgICAgICBkeCA9IGJsb2NrLnggKyAoMC41ICogdGhpcy5fYlgpIC0gaC54O1xuICAgICAgICAgICAgZHkgPSBibG9jay55ICsgKDAuNSAqIHRoaXMuX2JZKSAtIGgueTtcbiAgICAgICAgICAgIGRpc3QgPSAxICsgZHgqZHggKyBkeSpkeTtcbiAgICAgICAgICAgIHZvdGVTaXplID0gMSAvIGRpc3Q7XG4gICAgICAgICAgICBiWiArPSBoLnogKiB2b3RlU2l6ZTtcbiAgICAgICAgICAgIHZvdGVzICs9IHZvdGVTaXplO1xuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBkaXZpZGUgdG8gZmluZCB0aGUgYXZlcmFnZVxuICAgICAgICBiWiA9IGJaIC8gdm90ZXM7XG5cbiAgICAgICAgLy8gYmxvY2staXNoIGhlaWdodHM6IHJvdW5kIHRvIHRoZSBuZWFyZXN0IF9iWlxuICAgICAgICB2YXIgZGlmZlogPSBiWiAtIHRoaXMubWluWjtcbiAgICAgICAgYlogPSB0aGlzLm1pblogKyBNYXRoLnJvdW5kKGRpZmZaIC8gdGhpcy5fYlopICogdGhpcy5fYlo7XG5cbiAgICAgICAgLy8gb2theSBub3cgd2Uga25vdyBhIGhlaWdodCEgIHNldCBpdFxuICAgICAgICB0aGlzLnNldEJsb2NrSGVpZ2h0KGJsb2NrLCBiWik7XG5cbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiAocmUpY2FsY3VsYXRlIHRoZSBncm91bmQgc3RhY2tzLiAgWW91IG5lZWQgdG8gY2FsbCB0aGlzIGlmIHlvdVxuICogYWRkIGdyb3VuZCBzdGFja3Mgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kU3RhY2sgYWRkR3JvdW5kU3RhY2t9LlxuICpcbiAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY2FsY0dyb3VuZFN0YWNrcyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lYWNoQmxvY2soIGZ1bmN0aW9uKGVyciwgYmxvY2spIHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgZXJyXG5cbiAgICAgICAgLy8gbWFrZSB0aGUgc3RhY2sgZm9yIHRoaXMgZ3JvdW5kIGJsb2NrIGJ5IGNvcHlpbmcgdGhlXG4gICAgICAgIC8vIG5lYXJlc3QgZGVmaW5lZCBzdGFjay5cbiAgICAgICAgdmFyIHMsIGR4LCBkeSwgdGhpc0Rpc3QsIGJlc3RTdGFjaztcbiAgICAgICAgdmFyIGJlc3REaXN0ID0gdGhpcy53WCArIHRoaXMud1kgKyB0aGlzLndaO1xuICAgICAgICBiZXN0RGlzdCA9IGJlc3REaXN0ICogYmVzdERpc3Q7XG4gICAgICAgIGZvciAodmFyIGdzPTA7IGdzIDwgdGhpcy5fZ3JvdW5kU3RhY2tzLmxlbmd0aDsgZ3MrKykge1xuICAgICAgICAgICAgcyA9IHRoaXMuX2dyb3VuZFN0YWNrc1tnc107XG4gICAgICAgICAgICBkeCA9IGJsb2NrLnggKyAoMC41ICogdGhpcy5fYlgpIC0gcy54O1xuICAgICAgICAgICAgZHkgPSBibG9jay55ICsgKDAuNSAqIHRoaXMuX2JZKSAtIHMueTtcbiAgICAgICAgICAgIHRoaXNEaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICBpZiAodGhpc0Rpc3QgPCBiZXN0RGlzdCkge1xuICAgICAgICAgICAgICAgIGJlc3RTdGFjayA9IHM7XG4gICAgICAgICAgICAgICAgYmVzdERpc3QgPSB0aGlzRGlzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG9rYXkgd2UgZ290IGEgc3RhY2suXG4gICAgICAgIHRoaXMuc2V0R3JvdW5kU3RhY2soYmxvY2ssIGJlc3RTdGFjay5zdGFjayk7XG5cbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuX2NhbGNDZW50ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBjYWxjdWxhdGUgdGhlIGNlbnRyZSBvZiB0aGUgZmllbGQgYW5kIHJlY29yZCBpdCBhcyAuY2VudGVyXG4gICAgdGhpcy5jZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgKHRoaXMubWluWCArIHRoaXMubWF4WCkgLyAyLFxuICAgICAgICAodGhpcy5taW5ZICsgdGhpcy5tYXhZKSAvIDIsXG4gICAgICAgICh0aGlzLm1pblogKyB0aGlzLm1heFopIC8gMlxuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnNldEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oYmxvY2ssIHN0YWNrKSB7XG4gICAgdmFyIGxheWVyTGV2ZWwgPSBibG9jay5nWzBdLno7XG4gICAgZm9yICh2YXIgbGF5ZXIgPSAwOyBsYXllciA8IHN0YWNrLmxlbmd0aDsgbGF5ZXIrKykge1xuICAgICAgICBibG9jay5nW2xheWVyXSA9IHtcbiAgICAgICAgICAgIHo6IGxheWVyTGV2ZWwsXG4gICAgICAgICAgICBkejogc3RhY2tbbGF5ZXJdWzFdLFxuICAgICAgICAgICAgbTogc3RhY2tbbGF5ZXJdWzBdLFxuICAgICAgICAgICAgY2h1bms6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgbGF5ZXJMZXZlbCAtPSBzdGFja1tsYXllcl1bMV07XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnJlYnVpbGRDaHVua3MgPSBmdW5jdGlvbihibG9jaykge1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBpZiAoYmxvY2suZ1tsXS5jaHVuaykge1xuICAgICAgICAgICAgYmxvY2suZ1tsXS5jaHVuay5yZWJ1aWxkKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLnNldEJsb2NrSGVpZ2h0ID0gZnVuY3Rpb24oYmxvY2ssIHopIHtcbiAgICAvLyB0byBzZXQgdGhlIGJsb2NrIGdyb3VuZCBoZWlnaHQsIHdlIG5lZWQgdG8gZmluZCB0aGUgYmxvY2snc1xuICAgIC8vIGN1cnJlbnQgZ3JvdW5kIGhlaWdodCAodGhlIHogb2YgdGhlIHRvcCBsYXllciksIHdvcmsgb3V0IGFcbiAgICAvLyBkaWZmIGJldHdlZW4gdGhhdCBhbmQgdGhlIG5ldyBoZWlnaHQsIGFuZCBhZGQgdGhhdCBkaWZmIHRvXG4gICAgLy8gYWxsIHRoZSBsYXllcnMuXG4gICAgdmFyIGRaID0geiAtIGJsb2NrLmdbMF0uejtcbiAgICB2YXIgZGVwdGg7XG4gICAgZm9yICh2YXIgbCA9IDA7IGwgPCBibG9jay5nLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgIGJsb2NrLmdbbF0ueiArPSBkWjtcbiAgICB9XG4gICAgdGhpcy5yZWJ1aWxkQ2h1bmtzKGJsb2NrKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZ2V0QmxvY2sgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgLy8gcmV0dXJuIHRoZSBibG9jayB0aGF0IGluY2x1ZGVzICB4LHlcbiAgICB2YXIgZ3ggPSBNYXRoLmZsb29yKCAoeCAtIHRoaXMubWluWCkgLyB0aGlzLl9iWCApO1xuICAgIHZhciBneSA9IE1hdGguZmxvb3IoICh5IC0gdGhpcy5taW5ZKSAvIHRoaXMuX2JZICk7XG4gICAgcmV0dXJuICh0aGlzLl9nW2d4XVtneV0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbnZva2UgdGhlIGNhbGxiYWNrIGVhY2ggYmxvY2sgaW4gdHVyblxuLy8gY2FsbGJhY2sgc2hvdWxkIGxvb2sgbGlrZTogZnVuY3Rpb24oZXJyLCBibG9jaykgeyAuLi4gfVxuLy8gaWYgZXJyIGlzIG51bGwgZXZlcnl0aGluZyBpcyBmaW5lLiBpZiBlcnIgaXMgbm90IG51bGwsIHRoZXJlXG4vLyB3YXMgYW4gZXJyb3IuXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5lYWNoQmxvY2sgPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZywgb3JkZXIpIHtcbiAgICBpZiAob3JkZXIgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9yZGVyID0gJ3h1cC15dXAnO1xuICAgIH1cbiAgICBpZiAodGhpc0FyZyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpc0FyZyA9IHRoaXM7XG4gICAgfVxuICAgIGlmIChvcmRlciA9PSAneHVwLXl1cCcpIHtcbiAgICAgICAgZm9yICh2YXIgZ3ggPSAwOyBneCA8IHRoaXMuX2cubGVuZ3RoOyBneCsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5fZ1swXS5sZW5ndGg7IGd5KyspIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIG51bGwsIHRoaXMuX2dbZ3hdW2d5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUZpZWxkO1xuXG5cblxuXG4iLCJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVPYmplY3QgPSByZXF1aXJlKCcuL2Jhc2VvYmplY3QnKTtcblxuXG4vLyBERUJVR1xudmFyIFNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gaXRlbSB0aGF0IG1pZ2h0IGFwcGVhciBpbiBhIFNjYXBlLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIHNldCBvZiBtZXNoZXMgdXNpbmdcbiAqIHRoZSBsaW5rZWQgaXRlbSB0eXBlLCBhbmQgcG9zaXRpb24gdGhlbSBhY2NvcmRpbmcgdG8gdGhlIHNwZWNpZmllZFxuICogeCx5IGxvY2F0aW9uLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGl0ZW0gd2lsbCBiZSBhZGRlZCBpbnRvXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyZW50QmxvY2sgVGhlIGJsb2NrIHRoYXQgb3ducyB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7U2NhcGVJdGVtVHlwZX0gaXRlbVR5cGUgVHlwZSBvZiB0aGlzIGl0ZW1cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucywgbm90IGN1cnJlbnRseSB1c2VkXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlSXRlbShpdGVtVHlwZSwgeCwgeSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fdHlwZSA9IGl0ZW1UeXBlO1xuICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5fcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgMCk7XG5cbiAgICBpZiAodHlwZW9mIHRoaXMuX29wdHMuY2xpY2tJZCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5jbGlja0lkID0gdGhpcy5fb3B0cy5jbGlja0lkO1xuICAgIH1cblxuICAgIC8vIFRPRE86IG1heWJlIGhhdmUgYSBzZXQgb2YgbWVzaGVzIGZvciBlYWNoIHNjZW5lLCBzbyBhbiBpdGVtXG4gICAgLy8gY2FuIGJlIGluIG11bHRpcGxlIHNjZW5lcz9cbiAgICB0aGlzLl9jcmVhdGVOZXcoKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlSXRlbS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUl0ZW0ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NhcGVJdGVtO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl9jcmVhdGVOZXcgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fbWVzaGVzICYmIHRoaXMuX21lc2hlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuX2Rpc3Bvc2VPZk1lc2hlcygpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fY2xpY2tQb2ludHMgJiYgdGhpcy5fY2xpY2tQb2ludHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl9kaXNwb3NlT2ZDbGlja1BvaW50cygpO1xuICAgIH1cblxuICAgIHZhciB0aGluZ3MgPSB0aGlzLl90eXBlKHRoaXMuX29wdHMpO1xuXG4gICAgdGhpcy5fbWVzaGVzID0gdGhpbmdzLm1lc2hlcztcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgbS5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLl9jbGlja1BvaW50cyA9IHRoaW5ncy5jbGlja1BvaW50cztcbiAgICB0aGlzLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIGNwLnBvc2l0aW9uLmNvcHkodGhpcy5fcG9zKTtcbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVGcm9tU2NlbmUoKTtcbiAgICB0aGlzLl9kaXNwb3NlT2ZNZXNoZXMoKTtcbiAgICB0aGlzLl9kaXNwb3NlT2ZDbGlja1BvaW50cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKHVwZGF0ZWRPcHRpb25zKSB7XG4gICAgdGhpcy5tZXJnZU9wdGlvbnModXBkYXRlZE9wdGlvbnMpO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uKHopIHtcbiAgICB0aGlzLl9wb3Muc2V0Wih6KTtcbiAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgbS5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBjcC5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuYWRkVG9TY2VuZSA9IGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIHNjZW5lLmFkZChtKTtcbiAgICB9KTtcbiAgICB0aGlzLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIHNjZW5lLmFkZChjcCk7XG4gICAgfSk7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fZGlzcG9zZU9mTWVzaGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIGlmIChtLmdlb21ldHJ5KSBtLmdlb21ldHJ5LmRpc3Bvc2UoKTtcbiAgICAgICAgbS5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnZGlzcG9zZSd9KTtcbiAgICB9KTtcbiAgICAvLyBUT0RPOiBkaXNwb3NlIG9mIGNsaWNrUG9pbnRzXG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX2Rpc3Bvc2VPZkNsaWNrUG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBpZiAoY3AuZ2VvbWV0cnkpIGNwLmdlb21ldHJ5LmRpc3Bvc2UoKTtcbiAgICAgICAgY3AuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2Rpc3Bvc2UnfSk7XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUucmVtb3ZlRnJvbVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3NjZW5lKSB7XG4gICAgICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICAgICAgdGhpcy5fc2NlbmUucmVtb3ZlKG0pO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICAgICAgdGhpcy5fc2NlbmUucmVtb3ZlKGNwKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMuX3NjZW5lID0gbnVsbDtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2VuZSA9IHRoaXMuX3NjZW5lOyAvLyByZW1lbWJlciB0aGlzIGJlY2F1c2UgcmVtb3ZlRnJvbVNjZW5lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpbGwgZGVsZXRlIHRoaXMuX3NjZW5lXG4gICAgaWYgKHRoaXMuX3NjZW5lKSB7IHRoaXMucmVtb3ZlRnJvbVNjZW5lKCk7IH1cbiAgICB0aGlzLl9kaXNwb3NlT2ZNZXNoZXMoKTtcbiAgICB0aGlzLl9kaXNwb3NlT2ZDbGlja1BvaW50cygpO1xuXG4gICAgdGhpcy5fY3JlYXRlTmV3KCk7XG4gICAgaWYgKHNjZW5lKSB7IHRoaXMuYWRkVG9TY2VuZShzY2VuZSk7IH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZG8gc29tZXRoaW5nIHRvIGVhY2ggY2xpY2tQb2ludFxuU2NhcGVJdGVtLnByb3RvdHlwZS5lYWNoQ2xpY2tQb2ludCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgaWYgKHRoaXMuX2NsaWNrUG9pbnRzKSB7XG4gICAgICAgIGZvciAodmFyIGNwID0gMDsgY3AgPCB0aGlzLl9jbGlja1BvaW50cy5sZW5ndGg7IGNwKyspIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5fY2xpY2tQb2ludHNbY3BdKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZG8gc29tZXRoaW5nIHRvIGVhY2ggbWVzaFxuU2NhcGVJdGVtLnByb3RvdHlwZS5lYWNoTWVzaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcykge1xuICAgICAgICBmb3IgKHZhciBtID0gMDsgbSA8IHRoaXMuX21lc2hlcy5sZW5ndGg7IG0rKykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLl9tZXNoZXNbbV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlSXRlbTtcbiIsIlxuLyoqXG4gKiBBIGJhZyBvZiBpdGVtIHR5cGVzIHRoYXQgc2NhcGVzIGNhbiBoYXZlIGluIHRoZW0uICBBbiBpdGVtIHR5cGVcbiAqIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBvcHRpb25zIGRlc2NyaWJpbmcgdGhlIGl0ZW0sIGFuZCByZXR1cm5zXG4gKiBhbiBhcnJheSBvZiBtZXNoZXMgdGhhdCBhcmUgdGhlIGl0ZW0gKGF0IDAsMCwwKS5cbiAqXG4gKiBXaGVuIGEgU2NhcGVJdGVtIGlzIGluc3RhbnRpYXRlZCBpdCBpbnZva2VzIHRoZSBhcHByb3ByaWF0ZSBpdGVtXG4gKiB0eXBlIHRvIGdldCBtZXNoZXMsIHRoZW4gcmUtcG9zaXRpb25zIHRoZSBtZXNoZXMgYXQgdGhlXG4gKiBhcHByb3ByaWF0ZSB4LHkseiBsb2NhdGlvbi5cbiAqXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZUl0ZW1zID0ge1xuICAgIC8vIGRvY3VtZW50YXRpb24gZm9yIGl0ZW1zIGFyZSBpbiB0aGUgLi9pdGVtdHlwZXMvKiBmaWxlc1xuICAgIGN1YmU6ICAgICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL2N1YmUnKSxcbiAgICB0cmVlOiAgICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy90cmVlJyksXG4gICAgY3JhbmU6ICAgICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvY3JhbmUnKSxcbiAgICBzb2lsUGl0OiAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy9zb2lscGl0JyksXG4gICAgbGVhZkxpdHRlckNhdGNoZXI6ICByZXF1aXJlKCcuL2l0ZW10eXBlcy9sZWFmbGl0dGVyY2F0Y2hlcicpLFxuXG4gICAgbGFiZWw6ICAgICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvbGFiZWwnKVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW1zO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcbnZhciBTY2FwZUNsaWNrYWJsZSA9IHJlcXVpcmUoJy4vY2xpY2thYmxlJyk7XG5cbnZhciBNNCA9IFRIUkVFLk1hdHJpeDQ7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHBhcmVudFBhcnRzIHRoZSBtZXNoIGFuZCBjbGlja1BvaW50IGNvbGxlY3Rpb25cbiAgKiAgICAgICAgdGhhdCBpcyB0aGUgdGhpbmcgdGhlIGNhbWVyYSBpcyBtb3VudGVkIG9uXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHBhcmVudCdzIG9wdGlvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gaW50ZXJuYWxzIGludGVybmFsIGNhbGN1bGF0aW9ucyBtYWtlIGJ5IHRoZVxuICAqICAgICAgICBwYXJlbnQgb2JqZWN0IGZhY3RvcnlcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlQ2FtZXJhQWRkb24ocGFyZW50UGFydHMsIG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHsgbWVzaE5hbWVzOiBbXSB9O1xuXG5cdC8vIHRyYW5zZm9ybXMgd2UgbWlnaHQgbmVlZDpcblx0Ly8gcm90YXRlIHNvIGl0J3MgaGVpZ2h0IGlzIGFsb25nIHRoZSBaIGF4aXMgKEN5bGluZGVyR2VvbWV0cnkgc3RhcnRzIGx5aW5nIGFsb25nIHRoZSBZIGF4aXMpXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLyBzcGVjaWFsIGNvbnZlbmllbmNlOiBpZiBvcHRpb25zLmNhbWVyYSBpcyBhIHN0cmluZyxcblx0Ly8gdXNlIHRoYXQgc3RyaW5nIGFzIHRoZSBjbGlja0RhdGEgYW5kIHVzZSBkZWZhdWx0cyBmb3Jcblx0Ly8gZXZlcnl0aGluZyBlbHNlLlxuXHRpZiAodHlwZW9mIG9wdGlvbnMuY2FtZXJhID09PSAnc3RyaW5nJykge1xuXHRcdG9wdGlvbnMuY2FtZXJhID0geyBjbGlja0RhdGE6IG9wdGlvbnMuY2FtZXJhIH07XG5cdH1cblxuXHR2YXIgYyA9IHt9O1xuXG5cdGMubmFtZSA9IG9wdGlvbnMuY2FtZXJhLm5hbWUgfHwgJ2NhbWVyYSc7XG5cblx0Yy5oZWlnaHQgPSBvcHRpb25zLmNhbWVyYS5oZWlnaHQgfHwgMztcblx0Yy54ID0gMDtcblx0Yy55ID0gMDtcblxuXHRjLmJvZHlXaWR0aCA9IG9wdGlvbnMuY2FtZXJhLnNpemUgfHwgMjtcblx0Yy5ib2R5SGVpZ2h0ID0gYy5ib2R5V2lkdGg7XG5cdGMuYm9keURlcHRoID0gMC42NyAqIGMuYm9keVdpZHRoO1xuXG5cdGMubGVuc0xlbmd0aCA9IDAuMzMgKiBjLmJvZHlXaWR0aDtcblx0Yy5sZW5zUmFkaXVzID0gTWF0aC5taW4oYy5ib2R5V2lkdGgsIGMuYm9keUhlaWdodCkgLyA0O1xuXG5cdGMuZ2xhc3NMZW5ndGggPSBjLmxlbnNSYWRpdXMgLyA4O1xuXHRjLmdsYXNzUmFkaXVzID0gYy5sZW5zUmFkaXVzIC0gYy5nbGFzc0xlbmd0aDtcblxuXHRjLmJvZHlTdHVmZiA9IG9wdGlvbnMuY2FtZXJhLmJvZHkgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblx0Yy5sZW5zU3R1ZmYgPSBvcHRpb25zLmNhbWVyYS5sZW5zIHx8IFNjYXBlU3R1ZmYuYmxhY2s7XG5cdGMuZ2xhc3NTdHVmZiA9IG9wdGlvbnMuY2FtZXJhLmdsYXNzIHx8IFNjYXBlU3R1ZmYuZ2xhc3M7XG5cblx0Yy5jbGlja0RhdGEgPSBvcHRpb25zLmNhbWVyYS5jbGlja0RhdGEgfHwgbnVsbDtcblxuXHQvLyB0aGUgcG9zaXRpb24gb2YgdGhlIGNhbWVyYSByZWxhdGl2ZSB0byB0aGUgcGFyZW50IG9iamVjdFxuXHRpZiAoaS50b3dlckhlaWdodCAmJiBpLnRvd2VyV2lkdGggJiYgaS5yaW5nSCkge1xuXHRcdC8vIGl0J3MgYSBjcmFuZSwgcHJvYmFibHkuICBQb3NpdGlvbiB0aGUgY2FtZXJhIGJlbG93IHRoZVxuXHRcdC8vIHJpbmcgYXQgdGhlIHRvcCBvZiB0aGUgY3JhbmUgdG93ZXIuXG5cdFx0Yy5oZWlnaHQgPSBvcHRpb25zLmNhbWVyYS5oZWlnaHQgfHwgKGkudG93ZXJIZWlnaHQgLSBpLnJpbmdIIC0gMiAqIGMuYm9keUhlaWdodCk7XG5cdFx0Yy54ID0gKGkudG93ZXJXaWR0aCArIGMuYm9keURlcHRoICsgYy5sZW5zTGVuZ3RoKS8yO1xuXHR9XG5cblx0dmFyIHJlbG9jYXRlID0gbmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGMueCwgYy55LCBjLmhlaWdodCk7XG5cblx0Ly8gdGhlIGNhbWVyYSBib2R5XG5cdHZhciBib2R5R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShjLmJvZHlEZXB0aCwgYy5ib2R5V2lkdGgsIGMuYm9keUhlaWdodCk7XG5cdGJvZHlHZW9tLmFwcGx5TWF0cml4KCBuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiAoYy5ib2R5RGVwdGgvMiAtIChjLmJvZHlEZXB0aCAtIGMubGVuc0xlbmd0aCkvMiksIDAsIGMuYm9keUhlaWdodC8yKVxuXHRcdC5tdWx0aXBseShyZWxvY2F0ZSlcblx0KTtcblx0dmFyIGJvZHkgPSBuZXcgVEhSRUUuTWVzaChib2R5R2VvbSwgYy5ib2R5U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKGJvZHkpO1xuXHRwYXJlbnRQYXJ0cy5tZXNoZXMucHVzaChib2R5KTtcblxuXHQvLyB0aGUgbGVuc1xuXHR2YXIgbGVuc0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShjLmxlbnNSYWRpdXMsIGMubGVuc1JhZGl1cywgYy5sZW5zTGVuZ3RoKTtcblx0bGVuc0dlb20uYXBwbHlNYXRyaXgoIG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbihjLmxlbnNMZW5ndGgvMiArIChjLmJvZHlEZXB0aCAtIGMubGVuc0xlbmd0aCkvMiwgMCwgYy5ib2R5SGVpZ2h0LzIpXG5cdFx0Lm11bHRpcGx5KHJlbG9jYXRlKVxuXHRcdC5tdWx0aXBseShuZXcgTTQoKS5tYWtlUm90YXRpb25aKE1hdGguUEkvMikpXG5cdCk7XG5cdHZhciBsZW5zID0gbmV3IFRIUkVFLk1lc2gobGVuc0dlb20sIGMubGVuc1N0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaChsZW5zKTtcblx0cGFyZW50UGFydHMubWVzaGVzLnB1c2gobGVucyk7XG5cblx0Ly8gdGhlIGdsYXNzIGxlbnMgYml0XG5cdHZhciBnbGFzc0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShjLmdsYXNzUmFkaXVzLCBjLmdsYXNzUmFkaXVzLCBjLmdsYXNzTGVuZ3RoKTtcblx0Z2xhc3NHZW9tLmFwcGx5TWF0cml4KCBuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMC41ICogKGMuYm9keURlcHRoICsgYy5sZW5zTGVuZ3RoICsgYy5nbGFzc0xlbmd0aCksIDAsIGMuYm9keUhlaWdodC8yKVxuXHRcdC5tdWx0aXBseShyZWxvY2F0ZSlcblx0XHQubXVsdGlwbHkobmV3IE00KCkubWFrZVJvdGF0aW9uWihNYXRoLlBJLzIpKVxuXHQpO1xuXHR2YXIgZ2xhc3MgPSBuZXcgVEhSRUUuTWVzaChnbGFzc0dlb20sIGMuZ2xhc3NTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goZ2xhc3MpO1xuXHRwYXJlbnRQYXJ0cy5tZXNoZXMucHVzaChnbGFzcyk7XG5cblx0Ly8gdGhlIGNhbWVyYSBzaG91bGQgYmUgY2xpY2thYmxlXG5cdGlmIChjLmNsaWNrRGF0YSkge1xuXHRcdHZhciBjYW1DbGljayA9IFNjYXBlQ2xpY2thYmxlKGMubmFtZSwgYy5jbGlja0RhdGEsIGMueCwgYy55LCBjLmhlaWdodCArIGMuYm9keUhlaWdodC8yKTtcblx0XHRwYXJlbnRQYXJ0cy5jbGlja1BvaW50cy5wdXNoKGNhbUNsaWNrKTtcblx0fVxuXG5cdGkuY2FtZXJhID0gYztcblxuXHRyZXR1cm4gcGFyZW50UGFydHM7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ2FtZXJhQWRkb247XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi8uLi9zdHVmZicpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIENsaWNrYWJsZSBvYmplY3QuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB1c2VkIHRvIHNwZWNpZnkgcHJvcGVydGllcyBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmRpYW1ldGVyPTEgRGlhbWV0ZXIgb2YgdHJ1bmsgKGEuay5hLiBEQkgpXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5oZWlnaHQ9MTAgSGVpZ2h0IG9mIHRyZWVcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMudHJ1bmtNYXRlcmlhbD1TY2FwZVN0dWZmLndvb2QgV2hhdCB0byBtYWtlIHRoZSB0cnVuayBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMubGVhZk1hdGVyaWFsPVNjYXBlU3R1ZmYuZm9saWFnZSBXaGF0IHRvIG1ha2UgdGhlIGZvbGlhZ2Ugb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLnRyZWVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDbGlja2FibGUobmFtZSwgY2xpY2tEYXRhLCB4LCB5LCB6KSB7XG5cdHZhciBjbGlja2VyID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG5cblx0dmFyIGhvdmVyUmFkaXVzID0gODtcblx0dmFyIGNsaWNrUmFkaXVzID0gMy41O1xuXHR2YXIgbGluZUxlbmd0aCA9IDg7XG5cblx0dmFyIHRyYW5zbGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKHgsIHksIHopO1xuXG5cdGhvdmVyTWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBjb2xvcjogMHhmZmZmMDAsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjMgfSlcblx0dmFyIGhvdmVyR2VvbSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeShob3ZlclJhZGl1cyk7XG5cdGhvdmVyR2VvbS5hcHBseU1hdHJpeCh0cmFuc2xhdGUpO1xuXHR2YXIgaG92ZXJCdWJibGUgPSBuZXcgVEhSRUUuTWVzaChob3Zlckdlb20sIGhvdmVyTWF0ZXJpYWwpO1xuXHRob3ZlckJ1YmJsZS52aXNpYmxlID0gZmFsc2U7XG5cdGNsaWNrZXIuYWRkKGhvdmVyQnViYmxlKTtcblxuXHR2YXIgY2xpY2tHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KGNsaWNrUmFkaXVzLCAzMiwgMjQpO1xuXHRjbGlja0dlb20uYXBwbHlNYXRyaXgodHJhbnNsYXRlKTtcblx0dmFyIGNsaWNrQnViYmxlID0gbmV3IFRIUkVFLk1lc2goY2xpY2tHZW9tLCBTY2FwZVN0dWZmLnVpU3VnZ2VzdCk7XG5cdGNsaWNrQnViYmxlLnVzZXJEYXRhLmNsaWNrRGF0YSA9IGNsaWNrRGF0YTtcblx0Y2xpY2tlci5hZGQoY2xpY2tCdWJibGUpO1xuXG5cdC8vIC8vIGFkZCB0aGUgbmFtZSBzdHVmZiB0byBjbGlja0J1YmJsZSBpbnN0ZWFkXG5cdGNsaWNrQnViYmxlLnVzZXJEYXRhLm5hbWUgPSBuYW1lO1xuXHRjbGlja0J1YmJsZS51c2VyRGF0YS5vZmZzZXQgPSB0cmFuc2xhdGU7XG5cdC8vIGNsaWNrQnViYmxlLnVzZXJEYXRhLm5hbWVQb3NpdGlvbiA9ICggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHQvLyBcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiBjbGlja1JhZGl1cy8zLCAwLCBsaW5lTGVuZ3RoICsgY2xpY2tSYWRpdXMvMilcblx0Ly8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gKTtcblxuXHQvLyAvLy8vLy8vLy8vIGlkZW50aWZpZXIgZmxhZ1xuXHQvLyB2YXIgaWRlbnQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuXHQvLyAvLy8vLy8vLy8vLyBoYXZpbmcgdGV4dCBhbHdheXMgdGhlcmUgYnV0IHVzdWFsbHkgaW52aXNpYmxlIHdhcyBNVVJERVJJTkcgcmFtIHVzYWdlLlxuXHQvLyAvLyAvLyBuYW1lIHRleHRcblx0Ly8gLy8gdmFyIG5hbWVHZW9tID0gbmV3IFRIUkVFLlRleHRHZW9tZXRyeShuYW1lLCB7XG5cdC8vIC8vIFx0Zm9udDogJ2hlbHZldGlrZXInLFxuXHQvLyAvLyBcdHNpemU6IGNsaWNrUmFkaXVzLFxuXHQvLyAvLyBcdGhlaWdodDogMC4xXG5cdC8vIC8vIH0pO1xuXHQvLyAvLyBuYW1lR2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHQvLyAvLyBcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiBjbGlja1JhZGl1cy8zLCAwLCBsaW5lTGVuZ3RoICsgY2xpY2tSYWRpdXMvMilcblx0Ly8gLy8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyAvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gLy8gKTtcblx0Ly8gLy8gdmFyIG5hbWUgPSBuZXcgVEhSRUUuTWVzaChuYW1lR2VvbSwgU2NhcGVTdHVmZi51aVdoaXRlKTtcblx0Ly8gLy8gaWRlbnQuYWRkKG5hbWUpO1xuXG5cblx0Ly8gLy8gcG9pbnRlclxuXHQvLyB2YXIgbGluZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeSgwLjEsIDAuMSwgbGluZUxlbmd0aCk7XG5cdC8vIGxpbmVHZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdC8vIFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAwLCBsaW5lTGVuZ3RoIC8gMilcblx0Ly8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gKTtcblxuXHQvLyB2YXIgbGluZSA9IG5ldyBUSFJFRS5NZXNoKGxpbmVHZW9tLCBTY2FwZVN0dWZmLnVpV2hpdGUpO1xuXHQvLyAvLyBsaW5lLnVzZXJEYXRhLnR5cGUgPSAnbmFtZWxpbmUnO1xuXHQvLyBpZGVudC5hZGQobGluZSk7XG5cblx0Ly8gaWRlbnQudmlzaWJsZSA9IGZhbHNlO1xuXHQvLyAvLyBpZGVudC51c2VyRGF0YS50eXBlID0gJ25hbWVhc3NlbWJseSc7XG5cdC8vIGNsaWNrZXIuYWRkKGlkZW50KTtcblxuXHRjbGlja2VyLnZpc2libGUgPSBmYWxzZTtcblx0cmV0dXJuIGNsaWNrZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDbGlja2FibGU7IiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHRyZWVQYXJ0cyB0aGUgbWVzaCBhbmQgY2xpY2tQb2ludCBjb2xsZWN0aW9uIHRoYXQgaXMgYSB0cmVlXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHRyZWUgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlIHRyZWUtbWFrZXJcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlRGVuZHJvbWV0ZXJBZGRvbih0cmVlUGFydHMsIG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdC8vIHN0YXJ0IHdpdGggc3RhbmRhcmQgdHJlZSBtZXNoZXNcblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwgeyBtZXNoTmFtZXM6IFtdIH07XG5cblx0aS5kaWFtID0gaS5kaWFtIHx8IDE7XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBtaWdodCBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuZGVuZHJvbWV0ZXIgaXMgYSBzdHJpbmcsXG5cdC8vIHVzZSB0aGF0IHN0cmluZyBhcyB0aGUgY2xpY2tEYXRhIGFuZCB1c2UgZGVmYXVsdHMgZm9yXG5cdC8vIGV2ZXJ5dGhpbmcgZWxzZS5cblx0aWYgKHR5cGVvZiBvcHRpb25zLmRlbmRyb21ldGVyID09PSAnc3RyaW5nJykge1xuXHRcdG9wdGlvbnMuZGVuZHJvbWV0ZXIgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5kZW5kcm9tZXRlciB9O1xuXHR9XG5cblx0dmFyIGQgPSB7fTtcblxuXHRkLm5hbWUgPSBvcHRpb25zLmRlbmRyb21ldGVyLm5hbWUgfHwgJ2RlbmRyb21ldGVyJztcblxuXHRkLmJhbmRXaWR0aCA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIud2lkdGggfHwgMC41O1xuXHRkLmJhbmRSYWRpdXMgPSBpLnRydW5rUmFkaXVzICsgMC4yICogZC5iYW5kV2lkdGg7XG5cdGQuYmFuZEhlaWdodCA9IE1hdGgubWluKG9wdGlvbnMuZGVuZHJvbWV0ZXIuaGVpZ2h0IHx8IDEuNSwgaS50cnVua0hlaWdodCAtIGQuYmFuZFdpZHRoLzIpO1xuXG5cdGQubWV0ZXJSYWRpdXMgPSBkLmJhbmRXaWR0aDtcblx0ZC5tZXRlckhlaWdodCA9IGQuYmFuZFdpZHRoICogMztcblxuXHRkLm1vdW50UmFkaXVzID0gZC5tZXRlclJhZGl1cyAqIDEuMTtcblx0ZC5tb3VudFdpZHRoID0gZC5tZXRlckhlaWdodCAvIDQ7XG5cblx0ZC5iYW5kU3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLmJhbmQgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblx0ZC5tb3VudFN0dWZmID0gb3B0aW9ucy5kZW5kcm9tZXRlci5tb3VudCB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXHRkLm1ldGVyU3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLm1ldGVyIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cblx0ZC5jbGlja0RhdGEgPSBvcHRpb25zLmRlbmRyb21ldGVyLmNsaWNrRGF0YSB8fCBudWxsO1xuXG5cdC8vIHRoZSBzdGVlbCBiYW5kXG5cdHZhciBiYW5kR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQuYmFuZFJhZGl1cywgZC5iYW5kUmFkaXVzLCBkLmJhbmRXaWR0aCwgMTIsIDEpO1xuXHRiYW5kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgZC5iYW5kSGVpZ2h0KS5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIGJhbmQgPSBuZXcgVEhSRUUuTWVzaChiYW5kR2VvbSwgZC5iYW5kU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlckJhbmQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJhbmQpO1xuXG5cdC8vIHRoZSBtZXRlciBpdHNlbGZcblx0dmFyIG1ldGVyQm90dG9tR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubWV0ZXJSYWRpdXMsIGQubWV0ZXJSYWRpdXMsIDAuNjcgKiBkLm1ldGVySGVpZ2h0LCA3LCAxKTtcblx0bWV0ZXJCb3R0b21HZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMgKyBkLm1ldGVyUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLm1ldGVySGVpZ2h0LzYpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgbWV0ZXJCb3R0b20gPSBuZXcgVEhSRUUuTWVzaChtZXRlckJvdHRvbUdlb20sIGQubWV0ZXJTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyQm90dG9tJyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChtZXRlckJvdHRvbSk7XG5cblx0dmFyIG1ldGVyVG9wR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubWV0ZXJSYWRpdXMvNSwgZC5tZXRlclJhZGl1cywgMC4zMyAqIGQubWV0ZXJIZWlnaHQsIDcsIDEpO1xuXHRtZXRlclRvcEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvMiArIGQubWV0ZXJIZWlnaHQvNikubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBtZXRlclRvcCA9IG5ldyBUSFJFRS5NZXNoKG1ldGVyVG9wR2VvbSwgZC5tZXRlclN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJUb3AnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1ldGVyVG9wKTtcblxuXHQvLyB0aGUgbW91bnRcblx0dmFyIG1vdW50QmFuZEdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShkLm1vdW50UmFkaXVzLCBkLm1vdW50UmFkaXVzLCBkLm1vdW50V2lkdGgsIDcsIDEpO1xuXHRtb3VudEJhbmRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMgKyBkLm1ldGVyUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLmJhbmRXaWR0aC8yICsgZC5tb3VudFdpZHRoLzIpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgbW91bnRCYW5kID0gbmV3IFRIUkVFLk1lc2gobW91bnRCYW5kR2VvbSwgZC5tb3VudFN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJNb3VudEJhbmQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1vdW50QmFuZCk7XG5cblx0dmFyIG1vdW50R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShkLm1vdW50UmFkaXVzLCBkLm1vdW50UmFkaXVzLzIsIGQubW91bnRXaWR0aCk7XG5cdG1vdW50R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLmJhbmRXaWR0aC8yICsgZC5tb3VudFdpZHRoLzIpKTtcblx0dmFyIG1vdW50ID0gbmV3IFRIUkVFLk1lc2gobW91bnRHZW9tLCBkLm1vdW50U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlck1vdW50Jyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChtb3VudCk7XG5cblx0Ly8gdGhlIGRlbmRybyBzaG91bGQgYmUgY2xpY2thYmxlXG5cdGlmIChkLmNsaWNrRGF0YSkge1xuXHRcdHZhciBkZW5kcm9DbGljayA9IFNjYXBlQ2xpY2thYmxlKGQubmFtZSwgZC5jbGlja0RhdGEsIGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvNik7XG5cdFx0dHJlZVBhcnRzLmNsaWNrUG9pbnRzLnB1c2goZGVuZHJvQ2xpY2spO1xuXHR9XG5cblx0aS5kZW5kcm9tZXRlciA9IGQ7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVEZW5kcm9tZXRlckFkZG9uO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHRyZWVQYXJ0cyB0aGUgbWVzaCBhbmQgY2xpY2tQb2ludCBjb2xsZWN0aW9uIHRoYXQgaXMgYSB0cmVlXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHRyZWUgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlIHRyZWUtbWFrZXJcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlU2FwRmxvd01ldGVyQWRkb24odHJlZVBhcnRzLCBvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHQvLyBzdGFydCB3aXRoIHN0YW5kYXJkIHRyZWUgbWVzaGVzXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHsgbWVzaE5hbWVzOiBbXSB9O1xuXG5cdGkuZGlhbSA9IGkuZGlhbSB8fCAxO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuc2FwZmxvd21ldGVyIGlzIGEgc3RyaW5nLFxuXHQvLyB1c2UgdGhhdCBzdHJpbmcgYXMgdGhlIGNsaWNrRGF0YSBhbmQgdXNlIGRlZmF1bHRzIGZvclxuXHQvLyBldmVyeXRoaW5nIGVsc2UuXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zYXBmbG93bWV0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5zYXBmbG93bWV0ZXIgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5zYXBmbG93bWV0ZXIgfTtcblx0fVxuXG5cdHZhciBzID0ge307XG5cblx0cy5uYW1lID0gb3B0aW9ucy5zYXBmbG93bWV0ZXIubmFtZSB8fCAnc2FwIGZsb3cgbWV0ZXInO1xuXG5cdHMuYmFzZVcgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5zaXplIHx8IDE7XG5cdHMuY2FwVyA9IHMuYmFzZVcgKiAxLjI7XG5cdHMuYmFzZVRoaWNrID0gcy5iYXNlVyAvIDI7XG5cdHMuY2FwVGhpY2sgPSBzLmJhc2VUaGljayAqIDEuMTtcblx0cy5sZW5ndGggPSBzLmJhc2VXICogMjtcblx0cy5iYXNlTCA9IHMubGVuZ3RoICogMC42O1xuXHRzLmNhcEwgPSAocy5sZW5ndGggLSBzLmJhc2VMKSAvIDI7XG5cdHMuaGVpZ2h0ID0gTWF0aC5taW4ob3B0aW9ucy5zYXBmbG93bWV0ZXIuaGVpZ2h0IHx8IDMsIGkudHJ1bmtIZWlnaHQgLSBzLmxlbmd0aCk7XG5cblx0cy5iYXNlU3R1ZmYgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5iYXNlIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdHMuY2FwU3R1ZmYgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5jYXAgfHwgU2NhcGVTdHVmZi5ibGFjaztcblxuXHRzLmNsaWNrRGF0YSA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLmNsaWNrRGF0YSB8fCBudWxsO1xuXG5cdHZhciBiYXNlR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzLmJhc2VXLCBzLmJhc2VUaGljaywgcy5iYXNlTCk7XG5cdGJhc2VHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTC8yKVxuXHQpO1xuXHR2YXIgYmFzZSA9IG5ldyBUSFJFRS5NZXNoKGJhc2VHZW9tLCBzLmJhc2VTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3NhcGZsb3dtZXRlcmJhc2UnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJhc2UpO1xuXG5cdHZhciB0b3BDYXBHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHMuY2FwVywgcy5jYXBUaGljaywgcy5jYXBMKTtcblx0dG9wQ2FwR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgLTEgKiAoaS50cnVua1JhZGl1cyArIHMuYmFzZVRoaWNrLzIpLCBzLmhlaWdodCArIHMuYmFzZUwgKyBzLmNhcEwvMilcblx0KTtcblx0dmFyIHRvcENhcCA9IG5ldyBUSFJFRS5NZXNoKHRvcENhcEdlb20sIHMuY2FwU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdzYXBmbG93bWV0ZXJ0b3BjYXAnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKHRvcENhcCk7XG5cblx0dmFyIGJvdHRvbUNhcEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkocy5jYXBXLCBzLmNhcFRoaWNrLCBzLmNhcEwpO1xuXHRib3R0b21DYXBHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5jYXBMLzIpXG5cdCk7XG5cdHZhciBib3R0b21DYXAgPSBuZXcgVEhSRUUuTWVzaChib3R0b21DYXBHZW9tLCBzLmNhcFN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnc2FwZmxvd21ldGVyYm90dG9tY2FwJyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChib3R0b21DYXApO1xuXG5cdC8vIGNsaWNrYWJsZVxuXHRpZiAocy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2xpY2sgPSBTY2FwZUNsaWNrYWJsZShzLm5hbWUsIHMuY2xpY2tEYXRhLCAwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTC8yKTtcblx0XHR0cmVlUGFydHMuY2xpY2tQb2ludHMucHVzaChjbGljayk7XG5cdH1cblxuXHRpLnNhcGZsb3dtZXRlciA9IHM7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTYXBGbG93TWV0ZXJBZGRvbjtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbnZhciBNNCA9IFRIUkVFLk1hdHJpeDQ7XG5cbnZhciBTY2FwZUNhbWVyYUFkZG9uID0gcmVxdWlyZSgnLi9hZGRvbnMvY2FtZXJhJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgbWVzaCBhcnJheSBmb3IgYSB0b3dlciBjcmFuZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSBjcmFuZS5cblxuICogQHBhcmFtIHt3aWR0aH0gb3B0aW9ucy53aWR0aD0yIFdpZHRoIG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2hlaWdodH0gb3B0aW9ucy5oZWlnaHQ9NTAgSGVpZ2h0IG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2xlbmd0aH0gb3B0aW9ucy5sZW5ndGg9NDAgTGVuZ3RoIG9mIGNyYW5lIGJvb20sIGZyb20gdGhlXG4gKiAgICAgICAgY3JhbmUncyBjZW50cmUgYXhpcyB0byB0aGUgdGlwXG4gKiBAcGFyYW0ge3JvdGF0aW9ufSBvcHRpb25zLnJvdGF0aW9uPTAgRGVncmVlcyBvZiBib29tIHJvdGF0aW9uLFxuICogICAgICAgIGNvdW50ZWQgY2xvY2t3aXNlIGZyb20gdGhlICt2ZSBZIGRpcmVjdGlvbiAoYXdheSBmcm9tXG4gKiAgICAgICAgdGhlIGNhbWVyYSlcbiAqIEBwYXJhbSB7Y291bnRlcndlaWdodExlbmd0aH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0TGVuZ3RoPWxlbmd0aC80XG4gKiAgICAgICAgTGVuZ3RoIG9mIHRoZSBjb3VudGVyd2VpZ2h0IGJvb20sIGZyb20gdGhlIGNyYW5lJ3MgY2VudHJlXG4gKiAgICAgICAgYXhpcyB0byB0aGUgZW5kIG9mIHRoZSBjb3VudGVyd2VpZ2h0XG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnN0cnV0cz1TY2FwZVN0dWZmLmdsb3NzQmxhY2tcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIHN0cnV0cyBpbiB0aGUgdG93ZXIgYW5kIGJvb20gb3V0IG9mXG4gICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5iYXNlPVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGJhc2Ugb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnJpbmc9U2NhcGVTdHVmZi5wbGFzdGljXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jYWJpbj1TY2FwZVN0dWZmLnBsYXN0aWNcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNhYmluIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy53aW5kb3c9U2NhcGVTdHVmZi5nbGFzc1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY2FiaW4gd2luZG93IG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0PVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNvdW50ZXJ3ZWlnaHQgb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmNyYW5lXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3JhbmVGYWN0b3J5KG9wdGlvbnMpIHtcblxuXHR2YXIgY3JhbmUgPSB7IG1lc2hlczogW10sIGNsaWNrUG9pbnRzOiBbXSB9O1xuXG5cdHZhciBpID0geyBtZXNoTmFtZXM6IFtdIH07XG5cblx0aS50b3dlcldpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAyO1xuXHRpLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDUwO1xuXHRpLmxlbmd0aCA9IG9wdGlvbnMubGVuZ3RoIHx8IDQwO1xuXHRpLmNvdW50ZXJ3ZWlnaHRMZW5ndGggPSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHRMZW5ndGggfHwgKGkubGVuZ3RoIC8gNCk7XG5cdGkuc3RydXRTdHVmZiA9IG9wdGlvbnMuc3RydXRzIHx8IFNjYXBlU3R1ZmYuZ2xvc3NCbGFjaztcblx0aS5iYXNlU3R1ZmYgPSBvcHRpb25zLmJhc2UgfHwgU2NhcGVTdHVmZi5jb25jcmV0ZTtcblx0aS5yaW5nU3R1ZmYgPSBvcHRpb25zLnJpbmcgfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHRpLmNhYmluU3R1ZmYgPSBvcHRpb25zLmNhYmluIHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblx0aS53aW5kb3dTdHVmZiA9IG9wdGlvbnMud2luZG93IHx8IFNjYXBlU3R1ZmYuZ2xhc3M7XG5cdGkuY291bnRlcndlaWdodFN0dWZmID0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0IHx8IFNjYXBlU3R1ZmYuY29uY3JldGU7XG5cdGkucm90YXRpb24gPSAtMSAqIChvcHRpb25zLnJvdGF0aW9uIHx8IDApICogTWF0aC5QSSAvIDE4MDtcblxuXHRpLnRvd2VySGVpZ2h0ID0gaS5oZWlnaHQ7XG5cdGkuYmFzZVcgPSBpLnRvd2VyV2lkdGggKiAzO1xuXHRpLmJhc2VIID0gaS50b3dlcldpZHRoICogMjsgLy8gaGFsZiBvZiB0aGUgaGVpZ2h0IHdpbGwgYmUgXCJ1bmRlcmdyb3VuZFwiXG5cblx0aS5wb2xlUiA9IGkudG93ZXJXaWR0aCAvIDEwO1xuXG5cdGkucmluZ1IgPSAoKGkudG93ZXJXaWR0aCAvIDIpICogTWF0aC5TUVJUMikgKyAxLjMgKiBpLnBvbGVSO1xuXHRpLnJpbmdIID0gaS50b3dlcldpZHRoIC8gNTtcblxuXHRpLmJvb21MID0gaS5sZW5ndGg7IC8vIGxlbmd0aCBvZiBjcmFuZSBib29tXG5cdGkuY3diTCA9IGkuY291bnRlcndlaWdodExlbmd0aDsgLy8gbGVuZ3RoIG9mIGNvdW50ZXJ3ZWlnaHQgYm9vbVxuXHRpLnJvZEwgPSBpLmJvb21MICsgaS5jd2JMO1xuXHRpLmN3VyA9IGkudG93ZXJXaWR0aCAtIDMqaS5wb2xlUjtcblx0aS5jd0ggPSBpLnRvd2VyV2lkdGggKiAxLjU7XG5cdGkuY3dMID0gaS50b3dlcldpZHRoICogMS41O1xuXG5cdGkuY2FiaW5XID0gaS50b3dlcldpZHRoO1xuXHRpLmNhYmluSCA9IGkudG93ZXJXaWR0aCAqIDEuMjU7XG5cdGkuY2FiaW5MID0gaS5jYWJpbkg7XG5cblx0Ly8gdGhpcyBpcyBmb3Igcm90YXRpbmcgdGhlIGNyYW5lIGJvb21cblx0dmFyIHJvdGF0ZSA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblooaS5yb3RhdGlvbik7XG5cblx0Ly8gdGhpcyBpcyBmb3IgbWFraW5nIGN5bGluZGVycyBnbyB1cHJpZ2h0IChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgY3lsaW5kZXJSb3RhdGUgPSBuZXcgTTQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8vLy8vLy8vLyB0aGUgYmFzZVxuXHR2YXIgYmFzZUdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5iYXNlVywgaS5iYXNlVywgaS5iYXNlSCk7XG5cdHZhciBiYXNlID0gbmV3IFRIUkVFLk1lc2goYmFzZUdlb20sIGkuYmFzZVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnYmFzZScpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChiYXNlKTtcblxuXHQvLy8vLy8vLy8vIHRoZSB2ZXJ0aWNhbCBtYXN0XG5cdC8vIG1ha2Ugb25lIHBvbGUgdG8gc3RhcnQgd2l0aFxuXHR2YXIgcG9sZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBvbGVSLCBpLnBvbGVSLCBpLnRvd2VySGVpZ2h0KTtcblx0cG9sZUdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkudG93ZXJXaWR0aC8yLCBpLnRvd2VyV2lkdGgvMiwgaS50b3dlckhlaWdodC8yKS5tdWx0aXBseShjeWxpbmRlclJvdGF0ZSkpO1xuXG5cdC8vIE1ha2UgdGhyZWUgbW9yZSBwb2xlcyBieSBjb3B5aW5nIHRoZSBmaXJzdCBwb2xlIGFuZCByb3RhdGluZyBhbm90aGVyIDkwZGVncyBhcm91bmQgdGhlIGNlbnRyZVxuXHR2YXIgcG9sZTtcblx0dmFyIHJvdGF0ZUFyb3VuZFogPSBuZXcgTTQoKS5tYWtlUm90YXRpb25aKE1hdGguUEkvMik7XG5cdGZvciAodmFyIHAgPSAwOyBwIDwgNDsgcCsrKSB7XG5cdFx0cG9sZSA9IG5ldyBUSFJFRS5NZXNoKHBvbGVHZW9tLCBpLnN0cnV0U3R1ZmYpO1xuXHRcdGkubWVzaE5hbWVzLnB1c2goJ3BvbGUnICsgcCk7XG5cdFx0Y3JhbmUubWVzaGVzLnB1c2gocG9sZSk7XG5cdFx0cG9sZUdlb20gPSBwb2xlR2VvbS5jbG9uZSgpO1xuXHRcdHBvbGVHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZUFyb3VuZFopO1xuXHR9XG5cblxuXHQvLy8vLy8vLy8vIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyXG5cdHZhciByaW5nR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucmluZ1IsIGkucmluZ1IsIGkucmluZ0gsIDEyLCAxLCB0cnVlKTtcblx0cmluZ0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkudG93ZXJIZWlnaHQgLSBpLnJpbmdILzIpLm11bHRpcGx5KGN5bGluZGVyUm90YXRlKSk7XG5cdGkucmluZ1N0dWZmLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyaW5nJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKHJpbmdHZW9tLCBpLnJpbmdTdHVmZikpO1xuXG5cblx0Ly8vLy8vLy8vLyB0aGUgaG9yaXpvbnRhbCBib29tXG5cdC8vIG1ha2Ugb25lIHJvZCB0byBzdGFydCB3aXRoXG5cdHZhciB0b3BSb2RHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5wb2xlUiwgaS5wb2xlUiwgaS5yb2RMKTtcblxuXHQvLyB0b3Agcm9kXG5cdHRvcFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIChpLnJvZEwvMikgLSBpLmN3YkwsIGkudG93ZXJIZWlnaHQgKyBpLnBvbGVSICsgMC41ICogaS50b3dlcldpZHRoKSk7XG5cdGxlZnRSb2RHZW9tID0gdG9wUm9kR2VvbS5jbG9uZSgpO1xuXHRyaWdodFJvZEdlb20gPSB0b3BSb2RHZW9tLmNsb25lKCk7XG5cblx0dG9wUm9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RUb3AnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2godG9wUm9kR2VvbSwgaS5zdHJ1dFN0dWZmKSk7XG5cblx0Ly8gYm90dG9tIGxlZnQgcm9kXG5cdGxlZnRSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigtMC41ICogaS50b3dlcldpZHRoICsgaS5wb2xlUiwgMCwgLTAuNSAqIGkudG93ZXJXaWR0aCkpO1xuXHRsZWZ0Um9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RMZWZ0Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGxlZnRSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBib3R0b20gcmlnaHQgcm9kXG5cdHJpZ2h0Um9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMC41ICogaS50b3dlcldpZHRoIC0gaS5wb2xlUiwgMCwgLTAuNSAqIGkudG93ZXJXaWR0aCkpO1xuXHRyaWdodFJvZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgncm9kUmlnaHQnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gocmlnaHRSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBlbmQgb2YgdGhlIGJvb21cblx0dmFyIGVuZEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS50b3dlcldpZHRoLCBpLnBvbGVSLCAwLjUgKiBpLnRvd2VyV2lkdGggKyBpLnBvbGVSICsgaS5wb2xlUik7XG5cdGVuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIGkuYm9vbUwsIGkudG93ZXJIZWlnaHQgKyAwLjI1ICogaS50b3dlcldpZHRoICsgaS5wb2xlUikpO1xuXHRlbmRHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2Jvb21DYXAnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goZW5kR2VvbSwgaS5zdHJ1dFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNvdW50ZXJ3ZWlnaHRcblx0dmFyIGN3R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmN3VywgaS5jd0wsIGkuY3dIKTtcblx0Y3dHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAxLjAwMSAqIChpLmN3TC8yIC0gaS5jd2JMKSwgaS50b3dlckhlaWdodCkpO1xuXHRjd0dlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY291bnRlcndlaWdodCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChjd0dlb20sIGkuY291bnRlcndlaWdodFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNhYmluXG5cdHZhciBjYWJpbkdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5jYWJpblcsIGkuY2FiaW5MLCBpLmNhYmluSCk7XG5cdHZhciB3aW5kb3dHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGkuY2FiaW5XICogMS4xLCBpLmNhYmluTCAqIDAuNiwgaS5jYWJpbkggKiAwLjYpO1xuXHRjYWJpbkdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkuY2FiaW5XLzIgKyBpLnBvbGVSLCAwLCBpLmNhYmluSC8yICsgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyBpLnBvbGVSKSk7XG5cdHdpbmRvd0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkuY2FiaW5XLzIgKyBpLnBvbGVSLCBpLmNhYmluTCAqIDAuMjUsIGkuY2FiaW5IICogMC42ICsgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyBpLnBvbGVSKSk7XG5cdGNhYmluR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHR3aW5kb3dHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2NhYmluJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGNhYmluR2VvbSwgaS5jYWJpblN0dWZmKSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2NhYmlud2luZG93Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKHdpbmRvd0dlb20sIGkud2luZG93U3R1ZmYpKTtcblxuXHQvLy8vLy8vLy8vIGNhbWVyYVxuXHRpZiAodHlwZW9mIG9wdGlvbnMuY2FtZXJhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGNyYW5lID0gU2NhcGVDYW1lcmFBZGRvbihjcmFuZSwgb3B0aW9ucywgaSk7XG5cdH1cblxuXHQvLyByZXR1cm4gYWxsIHRoZSBjcmFuZSBiaXRzLlxuXHRyZXR1cm4gY3JhbmU7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3JhbmVGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgY3ViZSBtZXNoIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZSBhbmQgbWF0ZXJpYWwuXG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBUaGUgbGVuZ3RoIG9mIGEgc2lkZSBvZiB0aGUgY3ViZS4gIERlZmF1bHRzIHRvIDEuXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBtYXRlcmlhbCBXaGF0IHRoZSBtYWtlIHRoZSBjdWJlIG91dCBvZi4gIERlZmF1bHRzIHRvIGBTY2FwZS5TdHVmZi5nZW5lcmljYFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgTm90IHVzZWQuXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmN1YmVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDdWJlRmFjdG9yeShvcHRpb25zKSB7XG4gICAgLy8gY29uc3RydWN0IGEgbWVzaCBcInNpdHRpbmcgb25cIiB0aGUgcG9pbnQgMCwwLDBcblxuICAgIHNpemUgPSBvcHRpb25zLnNpemUgfHwgMTtcbiAgICBtYXRlcmlhbCA9IG9wdGlvbnMubWF0ZXJpYWwgfHwgU2NhcGVTdHVmZi5nZW5lcmljO1xuXG4gICAgLy8gbWFrZXMgYSBjdWJlIGNlbnRlcmVkIG9uIDAsMCwwXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoc2l6ZSwgc2l6ZSwgc2l6ZSk7XG5cbiAgICAvLyB0cmFuc2Zvcm0gaXQgdXAgYSBiaXQsIHNvIHdlJ3JlIGNlbnRlcmVkIG9uIHggPSAwIGFuZCB5ID0gMCwgYnV0IGhhdmUgdGhlIF9ib3R0b21fIGZhY2Ugc2l0dGluZyBvbiB6ID0gMC5cbiAgICBnZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBzaXplLzIpICk7XG5cbiAgICAvLyByZXR1cm4gaXQgaW4gYSBkYXRhIG9iamVjdFxuXHRyZXR1cm4geyBtZXNoZXM6IFtuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXRlcmlhbCldLCBjbGlja1BvaW50czogW10gfTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDdWJlRmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMubGFiZWxcbiAqL1xuZnVuY3Rpb24gU2NhcGVMYWJlbEZhY3Rvcnkob3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIGxhYmVsID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLnggPSBvcHRpb25zLnggfHwgMDtcblx0aS55ID0gb3B0aW9ucy55IHx8IDA7XG5cdGkueiA9IG9wdGlvbnMueiB8fCAwO1xuXHRpLm9mZnNldCA9IG9wdGlvbnMub2Zmc2V0IHx8IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG5cblx0aS5sYWJlbFRleHQgPSBvcHRpb25zLnRleHQ7XG5cdGkudGV4dFNpemUgPSBvcHRpb25zLnNpemUgfHwgMjtcblx0aS50ZXh0V2lkdGggPSBpLnRleHRTaXplIC8gMTA7XG5cblx0aS5saW5lUmFkaXVzID0gaS50ZXh0V2lkdGggLyAyO1xuXHRpLmxpbmVMZW5ndGggPSBvcHRpb25zLmhlaWdodCB8fCBNYXRoLm1heCg4LCBpLnRleHRTaXplKTtcblxuXHRpLmRvdFJhZGl1cyA9IGkubGluZVJhZGl1cyAqIDEuNTtcblxuXHRpLmdsb3dTdHVmZiA9IG9wdGlvbnMuZ2xvdyB8fCBTY2FwZVN0dWZmLnVpSGlnaGxpZ2h0O1xuXHRpLnRleHRTdHVmZiA9IG9wdGlvbnMubGV0dGVycyB8fCBTY2FwZVN0dWZmLnVpU2hvdztcblx0aS5saW5lU3R1ZmYgPSBvcHRpb25zLnBvaW50ZXIgfHwgaS50ZXh0U3R1ZmY7XG5cblx0dmFyIHRyYW5zbGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKGkueCwgaS55LCBpLnopLm11bHRpcGx5KGkub2Zmc2V0KTtcblxuXHQvLyBnbG93aW5nIGJhbGxcblx0dmFyIGdsb3dHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDEuNSwgMzIsIDI0KTtcblx0Z2xvd0dlb20uYXBwbHlNYXRyaXgodHJhbnNsYXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZ2xvd2J1YmJsZScpO1xuXHRsYWJlbC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChnbG93R2VvbSwgaS5nbG93U3R1ZmYpKTtcblxuXHQvLyB0ZXh0IGZvciB0aGUgbGFiZWxcblx0dmFyIG5hbWVHZW9tID0gbmV3IFRIUkVFLlRleHRHZW9tZXRyeShpLmxhYmVsVGV4dCwge1xuXHRcdGZvbnQ6ICdoZWx2ZXRpa2VyJyxcblx0XHRzaXplOiBpLnRleHRTaXplLFxuXHRcdGhlaWdodDogMC4xXG5cdH0pO1xuXHRuYW1lR2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiBpLnRleHRTaXplLzMsIDAsIGkubGluZUxlbmd0aCArIGkudGV4dFNpemUvMilcblx0XHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHRcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgnbGFiZWx0ZXh0Jyk7XG5cdGxhYmVsLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKG5hbWVHZW9tLCBpLnRleHRTdHVmZikpO1xuXG5cdC8vIGRvdFxuXHR2YXIgZG90R2VvbSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSgwLjI1LCAxNiwgMTIpO1xuXHRkb3RHZW9tLmFwcGx5TWF0cml4KHRyYW5zbGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RvdCcpO1xuXHRsYWJlbC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChkb3RHZW9tLCBpLmxpbmVTdHVmZikpO1xuXG5cdC8vIHBvaW50ZXJcblx0dmFyIGxpbmVHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5saW5lUmFkaXVzLCBpLmxpbmVSYWRpdXMsIGkubGluZUxlbmd0aCk7XG5cdGxpbmVHZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAwLCBpLmxpbmVMZW5ndGggLyAyKVxuXHRcdC5tdWx0aXBseSh0cmFuc2xhdGUpXG5cdFx0Lm11bHRpcGx5KG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdsYWJlbHBvaW50ZXInKTtcblx0bGFiZWwubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gobGluZUdlb20sIGkubGluZVN0dWZmKSk7XG5cblx0cmV0dXJuIGxhYmVsO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUxhYmVsRmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG52YXIgU2NhcGVDbGlja2FibGUgPSByZXF1aXJlKCcuL2FkZG9ucy9jbGlja2FibGUnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5sZWFmTGl0dGVyQ2F0Y2hlclxuICovXG5mdW5jdGlvbiBTY2FwZUxlYWZMaXR0ZXJDYXRjaGVyRmFjdG9yeShvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHR2YXIgY2F0Y2hlciA9IHsgbWVzaGVzOiBbXSwgY2xpY2tQb2ludHM6IFtdIH07XG5cblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwge307XG5cdGkubWVzaE5hbWVzID0gaS5tZXNoTmFtZXMgfHwgW107XG5cblx0aS5uYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdsZWFmIGxpdHRlciB0cmFwJztcblxuXHRpLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDI7XG5cdGkud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDAuOCAqIGkuaGVpZ2h0O1xuXHRpLnJpbmdXID0gaS5oZWlnaHQgLyA2O1xuXHRpLnBvbGVSID0gaS53aWR0aCAvIDIwO1xuXHRpLnBvbGVIID0gaS5oZWlnaHQgLSBpLnJpbmdXLzI7XG5cdGkubmV0UiA9IGkud2lkdGgvMiAtIGkucG9sZVI7XG5cdGkubmV0TCA9IDAuNyAqIGkuaGVpZ2h0O1xuXG5cdGkucG9sZVN0dWZmID0gb3B0aW9ucy5wb2xlcyB8fCBTY2FwZVN0dWZmLm1ldGFsO1xuXHRpLnJpbmdTdHVmZiA9IG9wdGlvbnMucmluZyB8fCBpLnBvbGVTdHVmZjtcblx0aS5uZXRTdHVmZiA9IG9wdGlvbnMubmV0IHx8IFNjYXBlU3R1ZmYuc2hhZGVjbG90aDtcblxuXHQvLyBjeWxpbmRlci11cHJpZ2h0IHJvdGF0aW9uXG5cdHZhciByb3RhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKTtcblxuXHQvLyBuZXRcblx0aS5uZXRHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5uZXRSLCBpLm5ldFIvMjAsIGkubmV0TCwgMTMsIDEsIHRydWUpOyAvLyB0cnVlID0gb3BlbiBlbmRlZFxuXHRpLm5ldEcuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkuaGVpZ2h0IC0gaS5uZXRMLzIpXG5cdFx0Lm11bHRpcGx5KHJvdGF0ZSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgnbmV0Jyk7XG5cdGkubmV0U3R1ZmYuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG5cdGNhdGNoZXIubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goaS5uZXRHLCBpLm5ldFN0dWZmKSk7XG5cblx0Ly8gbmV0IGFib3ZlIHJpbmdcblx0aS5uZXRSaW5nRyA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkubmV0UiAqIDEuMDEsIGkubmV0UiAqIDEuMDEsIGkucmluZ1cvMiwgMTMsIDEsIHRydWUpOyAvLyB0cnVlID0gb3BlbiBlbmRlZFxuXHRpLm5ldFJpbmdHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAwLCBpLmhlaWdodCAtIGkucmluZ1cvNClcblx0XHQubXVsdGlwbHkocm90YXRlKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCduZXRyaW5nJyk7XG5cdGNhdGNoZXIubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goaS5uZXRSaW5nRywgaS5uZXRTdHVmZikpO1xuXG5cdC8vIHJpbmdcblx0aS5yaW5nRyA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkubmV0UiwgaS5uZXRSLCBpLnJpbmdXLCAxMywgMSwgdHJ1ZSk7IC8vIHRydWUgPSBvcGVuIGVuZGVkXG5cdGkucmluZ0cuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkuaGVpZ2h0IC0gaS5yaW5nVy8yKVxuXHRcdC5tdWx0aXBseShyb3RhdGUpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3JpbmcnKTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLnJpbmdHLCBpLnJpbmdTdHVmZikpO1xuXG5cdC8vIGxlZnQgcG9sZVxuXHRpLmxlZnRQb2xlRyA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucG9sZVIsIGkucG9sZVIsIGkucG9sZUgsIDUpO1xuXHRpLmxlZnRQb2xlRy5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oaS53aWR0aC8tMiwgMCwgaS5wb2xlSC8yKVxuXHRcdC5tdWx0aXBseShyb3RhdGUpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2xlZnRQb2xlJyk7XG5cdGNhdGNoZXIubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goaS5sZWZ0UG9sZUcsIGkucG9sZVN0dWZmKSk7XG5cblx0Ly8gcmlnaHQgcG9sZVxuXHRpLnJpZ2h0UG9sZUcgPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBvbGVSLCBpLnBvbGVSLCBpLnBvbGVILCA1KTtcblx0aS5yaWdodFBvbGVHLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbihpLndpZHRoLzIsIDAsIGkucG9sZUgvMilcblx0XHQubXVsdGlwbHkocm90YXRlKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyaWdodFBvbGUnKTtcblx0Y2F0Y2hlci5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLnJpZ2h0UG9sZUcsIGkucG9sZVN0dWZmKSk7XG5cblx0Ly8gbWFrZSB0aGUgY2F0Y2hlciBjbGlja2FibGVcblx0aWYgKG9wdGlvbnMuY2xpY2tEYXRhKSB7XG5cdFx0dmFyIGNsaWNrID0gU2NhcGVDbGlja2FibGUoaS5uYW1lLCBvcHRpb25zLmNsaWNrRGF0YSwgMCwgMCwgaS5wb2xlSCk7XG5cdFx0Y2F0Y2hlci5jbGlja1BvaW50cy5wdXNoKGNsaWNrKTtcblx0fVxuXG5cdHJldHVybiBjYXRjaGVyO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUxlYWZMaXR0ZXJDYXRjaGVyRmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG52YXIgU2NhcGVDbGlja2FibGUgPSByZXF1aXJlKCcuL2FkZG9ucy9jbGlja2FibGUnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy5zb2lsUGl0XG4gKi9cbmZ1bmN0aW9uIFNjYXBlU29pbFBpdEZhY3Rvcnkob3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIHBpdCA9IHsgbWVzaGVzOiBbXSwgY2xpY2tQb2ludHM6IFtdIH07XG5cblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwge307XG5cdGkubWVzaE5hbWVzID0gaS5tZXNoTmFtZXMgfHwgW107XG5cblx0aS5uYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdzb2lsIHBpdCc7XG5cblx0aS5ib3hTID0gb3B0aW9ucy5zaXplIHx8IDI7XG5cdGkuYm94RCA9IGkuYm94Uy8yO1xuXHRpLmJveEggPSBpLmJveFM7IC8vIGhlaWdodCBvZmYgZ3JvdW5kXG5cblx0aS5waXBlUiA9IGkuYm94RC8zO1xuXHRpLnBpcGVEID0gb3B0aW9ucy5kZXB0aCB8fCAyOyAvLyBwaXBlIGRlcHRoIGludG8gZ3JvdW5kXG5cdGkucGlwZUwgPSBpLnBpcGVEICsgaS5ib3hIO1xuXHRpLnBpcGVMID0gaS5waXBlTDtcblxuXHRpLmJveFN0dWZmID0gb3B0aW9ucy5ib3ggfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHRpLnBpcGVTdHVmZiA9IG9wdGlvbnMucGlwZSB8fCBTY2FwZVN0dWZmLnBsYXN0aWM7XG5cblx0Ly8gY3lsaW5kZXItdXByaWdodCByb3RhdGlvblxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8gdGhlIGJveFxuXHRpLmJveEcgPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5ib3hTLCBpLmJveEQsIGkuYm94Uyk7XG5cdGkuYm94Ry5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oaS5ib3hTLzMsIDAsIGkuYm94SCArIGkuYm94Uy8yKVxuXHQpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdib3gnKTtcblx0cGl0Lm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGkuYm94RywgaS5ib3hTdHVmZikpO1xuXG5cdC8vIHRoZSBwaXBlXG5cdGkucGlwZUcgPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBpcGVSLCBpLnBpcGVSLCBpLnBpcGVMKTtcblx0aS5waXBlRy5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgKGkuYm94SCAtIGkucGlwZUQpLzIpXG5cdFx0Lm11bHRpcGx5KHJvdGF0ZSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgncGlwZScpO1xuXHRwaXQubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goaS5waXBlRywgaS5waXBlU3R1ZmYpKTtcblxuXHQvLyBtYWtlIHRoZSBwaXQgY2xpY2thYmxlXG5cdGlmIChvcHRpb25zLmNsaWNrRGF0YSkge1xuXHRcdHZhciBjbGljayA9IFNjYXBlQ2xpY2thYmxlKGkubmFtZSwgb3B0aW9ucy5jbGlja0RhdGEsIGkuYm94Uy8zLCAwLCBpLmJveEggKyBpLmJveFMvMik7XG5cdFx0cGl0LmNsaWNrUG9pbnRzLnB1c2goY2xpY2spO1xuXHR9XG5cblx0cmV0dXJuIHBpdDtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTb2lsUGl0RmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbnZhciBTY2FwZURlbmRyb21ldGVyQWRkb24gPSByZXF1aXJlKCcuL2FkZG9ucy9kZW5kcm9tZXRlcicpO1xudmFyIFNjYXBlU2FwRmxvd01ldGVyQWRkb24gPSByZXF1aXJlKCcuL2FkZG9ucy9zYXBmbG93bWV0ZXInKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgdHJlZSBtZXNoIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZSBhbmQgY29sb3IuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB1c2VkIHRvIHNwZWNpZnkgcHJvcGVydGllcyBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLmRpYW1ldGVyPTEgRGlhbWV0ZXIgb2YgdHJ1bmsgKGEuay5hLiBEQkgpXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5oZWlnaHQ9MTAgSGVpZ2h0IG9mIHRyZWVcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMudHJ1bmtNYXRlcmlhbD1TY2FwZVN0dWZmLndvb2QgV2hhdCB0byBtYWtlIHRoZSB0cnVuayBvdXQgb2ZcbiAqIEBwYXJhbSB7VEhSRUUuTWF0ZXJpYWx9IG9wdGlvbnMubGVhZk1hdGVyaWFsPVNjYXBlU3R1ZmYuZm9saWFnZSBXaGF0IHRvIG1ha2UgdGhlIGZvbGlhZ2Ugb3V0IG9mXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGludGVybmFscyBJZiBzdXBwbGllZCwgdGhpcyBmYWN0b3J5IHdpbGwgc2F2ZSBzb21lXG4gKiAgICAgICAgaW50ZXJpbSBjYWxjdWxhdGVkIHZhbHVlcyBpbnRvIHRoaXMgb2JqZWN0LiAgRS5nLlxuICogICAgICAgIHRoZSBoZWlnaHQgb2YgdGhlIGNhbm9weSwgdGhlIE1hdGVyaWFsIHRoZSB0cnVuayBpcyBtYWRlIG91dFxuICogICAgICAgIG9mLCBldGMuICBUaGlzIGNhbiBoZWxwIGFub3RoZXIgU2NhcGVJdGVtVHlwZSBmYWN0b3J5IHVzZVxuICogICAgICAgIHRoaXMgYXMgYSBzdGFydGluZyBwb2ludC5cbiAqIEBwYXJhbSB7QXJyYXl9IGludGVybmFscy5tZXNoTmFtZXMgQW4gYXJyYXkgb2YgbWVzaCBuYW1lcywgaW4gdGhlXG4gKiAgICAgICAgc2FtZSBvcmRlciBhcyB0aGUgbWVzaCBsaXN0IHJldHVybmVkIGJ5IHRoZSBmdW5jdGlvbi4gIFRoaXNcbiAqICAgICAgICBhbGxvd3MgZG93bnN0cmVhbSBmYWN0b3J5IGZ1bmN0aW9ucyB0byBpZGVudGlmeSBtZXNoZXMgaW5cbiAqICAgICAgICBvcmRlciB0byBhbHRlciB0aGVtLlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy50cmVlXG4gKi9cbmZ1bmN0aW9uIFNjYXBlVHJlZUZhY3Rvcnkob3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIHRyZWUgPSB7IG1lc2hlczogW10sIGNsaWNrUG9pbnRzOiBbXSB9O1xuXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHt9O1xuXHRpLm1lc2hOYW1lcyA9IGkubWVzaE5hbWVzIHx8IFtdO1xuXG5cdGkuZGlhbSA9IG9wdGlvbnMuZGlhbWV0ZXIgfHwgMTtcblx0aS5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAxMDtcblx0aS50cnVua1N0dWZmID0gb3B0aW9ucy50cnVuayB8fCBTY2FwZVN0dWZmLndvb2Q7XG5cdGkuY2Fub3B5U3R1ZmYgPSBvcHRpb25zLmNhbm9weSB8fCBTY2FwZVN0dWZmLnRyYW5zcGFyZW50Rm9saWFnZTtcblxuXHRpLmNhbm9weUhlaWdodCA9IGkuaGVpZ2h0IC8gNDtcblx0aS50cnVua0hlaWdodCA9IGkuaGVpZ2h0IC0gaS5jYW5vcHlIZWlnaHQ7XG5cdGkudHJ1bmtSYWRpdXMgPSAyICogaS5kaWFtIC8gMjtcblx0aS5jYW5vcHlSYWRpdXMgPSBpLnRydW5rUmFkaXVzICogNjtcblxuXHQvLyB0cmFuc2Zvcm1zIHdlIG5lZWQ6XG5cdC8vIHJvdGF0ZSBzbyBpdCdzIGhlaWdodCBpcyBhbG9uZyB0aGUgWiBheGlzIChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgcm90YXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0aS50cnVua0dlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnRydW5rUmFkaXVzLzIsIGkudHJ1bmtSYWRpdXMsIGkudHJ1bmtIZWlnaHQsIDEyKTtcblx0Ly8gY2VudGVyIG9uIHggPSAwIGFuZCB5ID0gMCwgYnV0IGhhdmUgdGhlIF9ib3R0b21fIGZhY2Ugc2l0dGluZyBvbiB6ID0gMFxuXHR2YXIgdHJ1bmtQb3NpdGlvbiA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkudHJ1bmtIZWlnaHQvMik7XG5cdGkudHJ1bmtHZW9tLmFwcGx5TWF0cml4KHRydW5rUG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciB0cnVuayA9IG5ldyBUSFJFRS5NZXNoKGkudHJ1bmtHZW9tLCBpLnRydW5rU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCd0cnVuaycpO1xuXHR0cmVlLm1lc2hlcy5wdXNoKHRydW5rKTtcblxuXHRpLmNhbm9weUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLmNhbm9weVJhZGl1cywgaS5jYW5vcHlSYWRpdXMsIGkuY2Fub3B5SGVpZ2h0LCAxMik7XG5cdC8vIGNlbnRlciBvbiB4ID0gMCwgeSA9IDAsIGJ1dCBoYXZlIHRoZSBjYW5vcHkgYXQgdGhlIHRvcFxuXHR2YXIgY2Fub3B5UG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBpLmNhbm9weUhlaWdodC8yICsgaS5oZWlnaHQgLSBpLmNhbm9weUhlaWdodCk7XG5cdGkuY2Fub3B5R2VvbS5hcHBseU1hdHJpeChjYW5vcHlQb3NpdGlvbi5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIGNhbm9weSA9IG5ldyBUSFJFRS5NZXNoKGkuY2Fub3B5R2VvbSwgaS5jYW5vcHlTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2Nhbm9weScpO1xuXHR0cmVlLm1lc2hlcy5wdXNoKGNhbm9weSk7XG5cblx0Ly8vLy8vLy8vLyBkZW5kcm9cblx0aWYgKHR5cGVvZiBvcHRpb25zLmRlbmRyb21ldGVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHRyZWUgPSBTY2FwZURlbmRyb21ldGVyQWRkb24odHJlZSwgb3B0aW9ucywgaSk7XG5cdH1cblxuXHQvLy8vLy8vLy8vIHNhcCBmbG93IG1ldGVyXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zYXBmbG93bWV0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0dHJlZSA9IFNjYXBlU2FwRmxvd01ldGVyQWRkb24odHJlZSwgb3B0aW9ucywgaSk7XG5cdH1cblxuXHRyZXR1cm4gdHJlZTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVUcmVlRmFjdG9yeTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5TY2FwZUNodW5rID0gcmVxdWlyZSgnLi9jaHVuaycpO1xuXG5cbi8vIERFQlVHXG5TY2FwZVN0dWZmID0gcmVxdWlyZSgnLi9zdHVmZicpO1xuU2NhcGVJdGVtcyA9IHJlcXVpcmUoJy4vaXRlbXR5cGVzJyk7XG5TY2FwZUl0ZW0gPSByZXF1aXJlKCcuL2l0ZW0nKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBjYWxsYmFjayBTY2FwZVNjZW5lfmRhdGVDaGFuZ2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBlcnJvciBEZXNjcmlwdGlvbiBvZiBlcnJvciwgb3RoZXJ3aXNlIG51bGxcbiAqIEBwYXJhbSB7ZGF0ZX0gZGF0ZSBEYXRlIHRoZSBzY2FwZSBpcyBub3cgZGlzcGxheWluZ1xuICovXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgb2YgYSBsYW5kc2NhcGUgLyBtb29uc2NhcGUgLyB3aGF0ZXZlclxuICogQHBhcmFtIHtTY2FwZUZpZWxkfSBmaWVsZCAgdGhlIGZpZWxkIGJlaW5nIHJlbmRlcmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gZG9tICAgICAgICBET00gZWxlbWVudCB0aGUgc2NhcGUgc2hvdWxkIGJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlZCBpbnRvLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgICAgY29sbGVjdGlvbiBvZiBvcHRpb25zLiAgQWxsIGFyZSBvcHRpb25hbC5cbiAqIEBwYXJhbSB7U3RyaW5nW119IG9wdGlvbnMubGlnaHRzPSdzdW4nLCdza3knIC0gYXJyYXkgb2Ygc3RyaW5nc1xuICogbmFtaW5nIGxpZ2h0cyB0byBpbmNsdWRlIGluIHRoaXMgc2NlbmUuICBDaG9vc2UgZnJvbTpcbiAqXG4gKiBzdHJpbmcgICAgfCBsaWdodCB0eXBlXG4gKiAtLS0tLS0tLS0tfC0tLS0tLS0tLS0tXG4gKiBgdG9wbGVmdGAgfCBhIGxpZ2h0IGZyb20gYWJvdmUgdGhlIGNhbWVyYSdzIGxlZnQgc2hvdWxkZXJcbiAqIGBhbWJpZW50YCB8IGEgZGltIGFtYmllbnQgbGlnaHRcbiAqIGBzdW5gICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBvcmJpdHMgdGhlIHNjZW5lIG9uY2UgcGVyIGRheVxuICogYHNreWAgICAgIHwgYSBkaXJlY3Rpb25hbCBsaWdodCB0aGF0IHNoaW5lcyBmcm9tIGFib3ZlIHRoZSBzY2VuZVxuICogQHBhcmFtIHtEYXRlfFwibm93XCJ9IG9wdGlvbnMuY3VycmVudERhdGU9J25vdycgLSBUaGUgdGltZSBhbmQgZGF0ZVxuICogaW5zaWRlIHRoZSBzY2FwZS4gIFRoZSBzdHJpbmcgXCJub3dcIiBtZWFucyBzZXQgY3VycmVudERhdGUgdG8gdGhlXG4gKiBwcmVzZW50LlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMudGltZVJhdGlvPTEgVGhlIHJhdGUgdGltZSBzaG91bGQgcGFzcyBpblxuICogdGhlIHNjYXBlLCByZWxhdGl2ZSB0byBub3JtYWwuICAwLjEgbWVhbnMgdGVuIHRpbWVzIHNsb3dlci4gIDYwXG4gKiBtZWFucyBvbmUgbWludXRlIHJlYWwgdGltZSA9IG9uZSBob3VyIHNjYXBlIHRpbWUuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV+ZGF0ZUNoYW5nZX0gb3B0aW9ucy5kYXRlVXBkYXRlIGNhbGxiYWNrIGZvclxuICogd2hlbiB0aGUgc2NlbmUgdGltZSBjaGFuZ2VzICh3aGljaCBpcyBhIGxvdCkuXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlU2NlbmUoZmllbGQsIGRvbSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICAvLyBsaWdodHM6IFsndG9wbGVmdCcsICdhbWJpZW50J10sXG4gICAgICAgIGxpZ2h0czogWydzdW4nLCAnc2t5J10sXG4gICAgICAgIGN1cnJlbnREYXRlOiAnbm93JywgIC8vIGVpdGhlciBzdHJpbmcgJ25vdycgb3IgYSBEYXRlIG9iamVjdFxuICAgICAgICB0aW1lUmF0aW86IDEsXG4gICAgICAgIGRhdGVVcGRhdGU6IG51bGwgLy8gY2FsbGJhY2sgdG91cGRhdGUgdGhlIGRpc3BsYXllZCBkYXRlL3RpbWVcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gc2F2ZSB0aGUgZmllbGRcbiAgICB0aGlzLmYgPSBmaWVsZDtcblxuICAgIC8vIGRpc2NvdmVyIERPTSBjb250YWluZXJcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkb20pO1xuXG4gICAgLy8gYXR0YWNoIHRoZSBtb3VzZSBoYW5kbGVycy4uXG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIC8vIC4ubW92ZSBoYW5kbGVyXG4gICAgdGhpcy5lbGVtZW50Lm9ubW91c2Vtb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdGhpcy5tb3VzZUhvdmVyKGV2ZW50LmNsaWVudFggLSBib3VuZHMubGVmdCwgZXZlbnQuY2xpZW50WSAtIGJvdW5kcy50b3ApO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIC8vIC4uY2xpY2sgaGFuZGxlclxuICAgIHRoaXMuZWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdGhpcy5tb3VzZUNsaWNrKGV2ZW50LmNsaWVudFggLSBib3VuZHMubGVmdCwgZXZlbnQuY2xpZW50WSAtIGJvdW5kcy50b3ApO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHRoaXMuZGF0ZSA9IHRoaXMuX29wdHMuY3VycmVudERhdGU7XG4gICAgaWYgKHRoaXMuZGF0ZSA9PT0gJ25vdycpIHtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5zdGFydERhdGUgPSB0aGlzLmRhdGU7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgLy8gY3JlYXRlIGFuZCBzYXZlIGFsbCB0aGUgYml0cyB3ZSBuZWVkXG4gICAgdGhpcy5yZW5kZXJlciA9IHRoaXMuX21ha2VSZW5kZXJlcih7IGRvbTogdGhpcy5lbGVtZW50IH0pO1xuICAgIHRoaXMuc2NlbmUgPSB0aGlzLl9tYWtlU2NlbmUoKTtcbiAgICB0aGlzLmNhbWVyYSA9IHRoaXMuX21ha2VDYW1lcmEoKTtcbiAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy5fbWFrZUNvbnRyb2xzKCk7XG4gICAgdGhpcy5saWdodHMgPSB0aGlzLl9tYWtlTGlnaHRzKHRoaXMuX29wdHMubGlnaHRzKTtcblxuICAgIHRoaXMudWlQb2ludGVyID0gbmV3IFNjYXBlSXRlbShTY2FwZUl0ZW1zLmxhYmVsLCAwLCAwLCB7dGV4dDogJ3VubmFtZWQnfSk7XG5cbiAgICB0aGlzLmNvbm5lY3RGaWVsZCgpO1xuXG4gICAgLy8gYWRkIGdyaWRzIGFuZCBoZWxwZXIgY3ViZXNcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoKTtcbiAgICAvLyB0aGlzLmFkZEhlbHBlckdyaWQoJ3RvcCcpO1xuICAgIC8vIHRoaXMuYWRkSGVscGVyU2hhcGVzKCk7XG5cbiAgICB2YXIgbGFzdExvZ0F0ID0gMDsgLy8gREVCVUdcbiAgICB2YXIgcmVuZGVyID0gKGZ1bmN0aW9uIHVuYm91bmRSZW5kZXIodHMpIHtcblxuICAgICAgICAvLyBERUJVR1xuICAgICAgICBpZiAobGFzdExvZ0F0ICsgMjAwMCA8IHRzKSB7XG4gICAgICAgICAgICBsYXN0TG9nQXQgPSB0cztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERFQlVHIG1heWJlIHRoZSB1cGRhdGVUaW1lIGlzIGRpc2FibGVkXG4gICAgICAgIHRoaXMuX3VwZGF0ZVRpbWUoKTtcblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHJlbmRlciApO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlciggdGhpcy5zY2VuZSwgdGhpcy5jYW1lcmEgKTtcbiAgICAgICAgdGhpcy5jb250cm9scy51cGRhdGUoKTtcbiAgICB9KS5iaW5kKHRoaXMpO1xuXG4gICAgcmVuZGVyKDApO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVTY2VuZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlU2NlbmU7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGEgbWVzaCB0byB0aGUgVEhSRUUuU2NlbmUgKGEgcGFzc3Rocm91Z2ggZm9yIFRIUkVFLlNjZW5lLmFkZClcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24odGhpbmcpIHtcbiAgICB0aGlzLnNjZW5lLmFkZCh0aGluZyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogcmVtb3ZlIGEgbWVzaCB0byB0aGUgVEhSRUUuU2NlbmUgKGEgcGFzc3Rocm91Z2ggZm9yIFRIUkVFLlNjZW5lLnJlbW92ZSlcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24odGhpbmcpIHtcbiAgICB0aGlzLnNjZW5lLnJlbW92ZSh0aGluZyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGJsb2NrcyBmcm9tIHRoZSBhdHRhY2hlZCBTY2FwZUZpZWxkIGludG8gdGhlIHNjZW5lLlxuICpcbiAqIFlvdSB3aWxsIHByb2JhYmx5IG9ubHkgbmVlZCB0byBjYWxsIHRoaXMgb25jZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuY29ubmVjdEZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mLmJ1aWxkQmxvY2tzKHRoaXMpO1xuICAgIHRoaXMuZi5idWlsZEl0ZW1zKHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHRlbGwgdGhpcyBzY2VuZSB0aGF0IGl0J3MgZmllbGQncyBpdGVtcyBoYXZlIHVwZGF0ZWRcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUucmVmcmVzaEl0ZW1zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mLmJ1aWxkSXRlbXModGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGhlbHBlciBjdWJlcyBhdCBzb21lIG9mIHRoZSBjb3JuZXJzIG9mIHlvdXIgc2NhcGUsIHNvIHlvdSBjYW5cbiAqIHNlZSB3aGVyZSB0aGV5IGFyZSBpbiBzcGFjZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyU2hhcGVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdoaXRlID0gMHhmZmZmZmY7XG4gICAgdmFyIHJlZCAgID0gMHhmZjAwMDA7XG4gICAgdmFyIGdyZWVuID0gMHgwMGZmMDA7XG4gICAgdmFyIGJsdWUgID0gMHgwMDAwZmY7XG4gICAgdmFyIGYgPSB0aGlzLmY7XG5cbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1pblksIGYubWluWiwgd2hpdGUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSgoZi5taW5YICsgZi5tYXhYKSAvIDIsIGYubWluWSwgZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWF4WSwgZi5taW5aLCBncmVlbik7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5taW5ZLCBmLm1heFosIGJsdWUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1heFgsIGYubWF4WSwgZi5taW5aLCB3aGl0ZSk7XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUubW91c2VIb3ZlciA9IGZ1bmN0aW9uKG1vdXNlWCwgbW91c2VZKSB7XG5cbiAgICB2YXIgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuICAgIG1vdXNlUG9zID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICBtb3VzZVBvcy54ID0gICAobW91c2VYIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LndpZHRoKSAgKiAyIC0gMTtcbiAgICBtb3VzZVBvcy55ID0gLSAobW91c2VZIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LmhlaWdodCkgKiAyICsgMTtcblxuICAgIC8vIHJlbW92ZSB0aGUgdWkgcG9pbnRlclxuICAgIHRoaXMudWlQb2ludGVyLnJlbW92ZUZyb21TY2VuZSgpO1xuXG4gICAgLy8gc2V0IGFsbCB0aGUgY2xpY2thYmxlcyB0byBoaWRkZW5cbiAgICBmb3IgKHZhciBjPTA7IGMgPCB0aGlzLmYuY2xpY2thYmxlcy5sZW5ndGg7IGMrKykge1xuICAgICAgICB0aGlzLmYuY2xpY2thYmxlc1tjXS52aXNpYmxlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gbm93IHVuaGlkZSBqdXN0IHRoZSBvbmVzIGluIHRoZSBtb3VzZSBhcmVhXG4gICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEobW91c2VQb3MsIHRoaXMuY2FtZXJhKTtcbiAgICB2YXIgaW50ZXJzZWN0cyA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHRoaXMuZi5jbGlja2FibGVzLCB0cnVlKTtcblxuICAgIHZhciBpbnRlcnNlY3QsIGNsaWNrYWJsZSwgZmlyc3RDbGlja2FibGUgPSBudWxsO1xuICAgIGZvciAodmFyIGk9MDsgaSA8IGludGVyc2VjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW50ZXJzZWN0ID0gaW50ZXJzZWN0c1tpXS5vYmplY3Q7XG4gICAgICAgIGNsaWNrYWJsZSA9IGludGVyc2VjdC5wYXJlbnQ7XG4gICAgICAgIGlmICghZmlyc3RDbGlja2FibGUgJiYgaW50ZXJzZWN0LnVzZXJEYXRhLmNsaWNrRGF0YSkge1xuICAgICAgICAgICAgZmlyc3RDbGlja2FibGUgPSBpbnRlcnNlY3Q7XG4gICAgICAgICAgICBpZiAoZmlyc3RDbGlja2FibGUudXNlckRhdGEubmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIGZpcnN0IGNsaWNrYWJsZSBoYXMgYSBuYW1lLCBtYWtlIGl0IGludG8gYSBsYWJlbFxuICAgICAgICAgICAgICAgIHRoaXMudWlQb2ludGVyLnVwZGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGZpcnN0Q2xpY2thYmxlLnVzZXJEYXRhLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHg6IGNsaWNrYWJsZS5wb3NpdGlvbi54LFxuICAgICAgICAgICAgICAgICAgICB5OiBjbGlja2FibGUucG9zaXRpb24ueSxcbiAgICAgICAgICAgICAgICAgICAgejogY2xpY2thYmxlLnBvc2l0aW9uLnosXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogZmlyc3RDbGlja2FibGUudXNlckRhdGEub2Zmc2V0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gLy8gcm90YXRlIHRvIHNob3cgdGV4dCB0byBjYW1lcmE/XG4gICAgICAgICAgICAgICAgLy8gdGhpcy51aVBvaW50ZXIuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICAgICAgICAgIC8vICAgICBtLnVwLmNvcHkodGhpcy5jYW1lcmEudXApO1xuICAgICAgICAgICAgICAgIC8vICAgICBtLmxvb2tBdCh0aGlzLmNhbWVyYS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgLy8gfSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy51aVBvaW50ZXIuYWRkVG9TY2VuZSh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjbGlja2FibGUudmlzaWJsZSA9IHRydWU7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5tb3VzZUNsaWNrID0gZnVuY3Rpb24obW91c2VYLCBtb3VzZVkpIHtcblxuICAgIHZhciByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG4gICAgbW91c2VQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIG1vdXNlUG9zLnggPSAgIChtb3VzZVggLyB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQud2lkdGgpICAqIDIgLSAxO1xuICAgIG1vdXNlUG9zLnkgPSAtIChtb3VzZVkgLyB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQuaGVpZ2h0KSAqIDIgKyAxO1xuXG4gICAgLy8gZmluZCB0aGUgaW50ZXJzZWN0aW5nIGNsaWNrYWJsZXNcbiAgICByYXljYXN0ZXIuc2V0RnJvbUNhbWVyYShtb3VzZVBvcywgdGhpcy5jYW1lcmEpO1xuICAgIHZhciBpbnRlcnNlY3RzID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHModGhpcy5mLmNsaWNrYWJsZXMsIHRydWUpO1xuXG4gICAgdmFyIGNsaWNrZWQ7XG4gICAgZm9yICh2YXIgaT0wOyBpIDwgaW50ZXJzZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyB0aGUgZmlyc3Qgb25lIHdpdGggdXNlckRhdGEuY2xpY2tEYXRhIGRlZmluZWQgaXMgdGhlIHdpbm5lclxuICAgICAgICBjbGlja2VkID0gaW50ZXJzZWN0c1tpXS5vYmplY3Q7XG4gICAgICAgIGlmIChjbGlja2VkLnVzZXJEYXRhLmNsaWNrRGF0YSkge1xuICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYSBjYWxsYmFjaywgaW52b2tlIGl0XG4gICAgICAgICAgICBpZiAodGhpcy5fb3B0cy5jbGljaykge1xuICAgICAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX29wdHMuY2xpY2s7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBjbGlja2VkLnVzZXJEYXRhLmNsaWNrRGF0YTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCBmdW5jdGlvbigpeyBjYWxsYmFjay5jYWxsKHdpbmRvdywgZGF0YSk7IH0sIDAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBhIGN1YmUgYXQgcG9zaXRpb24gYHhgLCBgeWAsIGB6YCB0byBjb25maXJtIHdoZXJlIHRoYXQgaXMsXG4gKiBleGFjdGx5LiAgR3JlYXQgZm9yIHRyeWluZyB0byB3b3JrIG91dCBpZiB5b3VyIHNjYXBlIGlzIGJlaW5nXG4gKiByZW5kZXJlZCB3aGVyZSB5b3UgdGhpbmsgaXQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICpcbiAqIEBwYXJhbSB7KE51bWJlcnxWZWN0b3IzKX0geCBYIGNvb3JkaW5hdGUsIG9yIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9WZWN0b3IzIFRIUkVFLlZlY3RvcjN9IGNvbnRhaW5pbmcgeCwgeSBhbmQgeiBjb29yZHNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbeV0gWSBjb29yZGluYXRlXG4gKiBAcGFyYW0ge051bWJlcn0gW3pdIFogY29vcmRpbmF0ZVxuICogQHBhcmFtIHtDb2xvcnxTdHJpbmd8SW50ZWdlcn0gY29sb3I9JyNjY2NjY2MnIENvbG9yIG9mIGN1YmUuXG4gKiBDYW4gYmUgYSB7QGxpbmsgaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9NYXRoL0NvbG9yIFRIUkVFLkNvbG9yfSwgYSBjb2xvci1wYXJzZWFibGUgc3RyaW5nIGxpa2VcbiAqIGAnIzMzNjZjYydgLCBvciBhIG51bWJlciBsaWtlIGAweDMzNjZjY2AuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckN1YmUgPSBmdW5jdGlvbih4LCB5LCB6LCBjb2xvcikge1xuICAgIC8vIGZpcnN0LCBzZXQgdGhlIGNvbG9yIHRvIHNvbWV0aGluZ1xuICAgIGlmICh0eXBlb2YgY29sb3IgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gZGVmYXVsdCB0byBsaWdodCBncmV5LlxuICAgICAgICBjb2xvciA9IG5ldyBUSFJFRS5Db2xvcigweGNjY2NjYyk7XG4gICAgfVxuICAgIHZhciBwb3M7IC8vIHRoZSBwb3NpdGlvbiB0byBkcmF3IHRoZSBjdWJlXG4gICAgaWYgKHR5cGVvZiB4LnggIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gdGhlbiBpdCdzIGEgdmVjdG9yLCBhbmQgeSBtaWdodCBiZSB0aGUgY29sb3JcbiAgICAgICAgcG9zID0geDtcbiAgICAgICAgaWYgKHR5cGVvZiB5ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb2xvciA9IHk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB4IGlzbid0IGEgdmVjdG9yLCBzbyBhc3N1bWUgc2VwYXJhdGUgeCB5IGFuZCB6XG4gICAgICAgIHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIHopO1xuICAgICAgICAvLyB3ZSBjYXVnaHQgY29sb3IgYWxyZWFkeS5cbiAgICB9XG5cbiAgICAvLyBhYm91dCBhIGZpZnRpZXRoIG9mIHRoZSBmaWVsZCdzIHN1bW1lZCBkaW1lbnNpb25zXG4gICAgdmFyIHNpemUgPSAodGhpcy5mLndYICsgdGhpcy5mLndZICsgdGhpcy5mLndaKSAvIDUwO1xuICAgIC8vIHVzZSB0aGUgY29sb3VyIHdlIGRlY2lkZWQgZWFybGllclxuICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHsgY29sb3I6IGNvbG9yIH0pO1xuXG4gICAgLy8gb2theS4uIG1ha2UgaXQsIHBvc2l0aW9uIGl0LCBhbmQgc2hvdyBpdFxuICAgIHZhciBjdWJlID0gU2NhcGVJdGVtcy5jdWJlKHsgc2l6ZTogc2l6ZSwgbWF0ZXJpYWw6IG1hdGVyaWFsIH0pLm1lc2hlc1swXTtcbiAgICBjdWJlLnBvc2l0aW9uLmNvcHkocG9zKTtcbiAgICB0aGlzLnNjZW5lLmFkZChjdWJlKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyR3JpZCA9IGZ1bmN0aW9uKHRvcE9yQm90dG9tKSB7XG4gICAgdmFyIGd6ID0gMDtcbiAgICB2YXIgZ2MgPSAweDQ0NDQ0NDtcbiAgICBpZiAodG9wT3JCb3R0b20gPT0gJ3RvcCcpIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWF4WjtcbiAgICAgICAgZ2MgPSAweGNjY2NmZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBneiA9IHRoaXMuZi5taW5aO1xuICAgICAgICBnYyA9IDB4Y2NmZmNjO1xuICAgIH1cblxuICAgIHZhciBncmlkVyA9IE1hdGgubWF4KHRoaXMuZi5tYXhYIC0gdGhpcy5mLm1pblgsIHRoaXMuZi5tYXhZIC0gdGhpcy5mLm1pblkpO1xuXG4gICAgLy8gR3JpZCBcInNpemVcIiBpcyB0aGUgZGlzdGFuY2UgaW4gZWFjaCBvZiB0aGUgZm91ciBkaXJlY3Rpb25zLFxuICAgIC8vIHRoZSBncmlkIHNob3VsZCBzcGFuLiAgU28gZm9yIGEgZ3JpZCBXIHVuaXRzIGFjcm9zcywgc3BlY2lmeVxuICAgIC8vIHRoZSBzaXplIGFzIFcvMi5cbiAgICB2YXIgZ3JpZFhZID0gbmV3IFRIUkVFLkdyaWRIZWxwZXIoZ3JpZFcvMiwgZ3JpZFcvMTApO1xuICAgIGdyaWRYWS5zZXRDb2xvcnMoZ2MsIGdjKTtcbiAgICBncmlkWFkucm90YXRpb24ueCA9IE1hdGguUEkvMjtcbiAgICBncmlkWFkucG9zaXRpb24uc2V0KHRoaXMuZi5taW5YICsgZ3JpZFcvMiwgdGhpcy5mLm1pblkgKyBncmlkVy8yLCBneik7XG4gICAgdGhpcy5zY2VuZS5hZGQoZ3JpZFhZKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBDcmVhdGUgYW5kIHJldHVybiBhIFRIUkVFLlJlbmRlcmVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB2YXJpb3VzIG9wdGlvbnNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudHxqUXVlcnlFbGVtfSBvcHRpb25zLmRvbSBhIGRvbSBlbGVtZW50XG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMud2lkdGggcmVuZGVyZXIgd2lkdGggKGluIHBpeGVscylcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5oZWlnaHQgcmVuZGVyZXIgaGVpZ2h0IChpbiBwaXhlbHMpXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VSZW5kZXJlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGFudGlhbGlhczogdHJ1ZSwgYWxwaGE6IHRydWUsIHByZWNpc2lvbjogXCJoaWdocFwiIH0pO1xuICAgIHJlbmRlcmVyLnNldENsZWFyQ29sb3IoIDB4MDAwMDAwLCAwKTtcbiAgICAvLyByZW5kZXJlci5zaGFkb3dNYXBFbmFibGVkID0gdHJ1ZTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRvbSkge1xuICAgICAgICB2YXIgJGRvbSA9ICQob3B0aW9ucy5kb20pO1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKCRkb20ud2lkdGgoKSwgJGRvbS5oZWlnaHQoKSk7XG4gICAgICAgICRkb20uYXBwZW5kKHJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLndpZHRoICYmIG9wdGlvbnMuaGVpZ2h0KSB7XG4gICAgICAgIHJlbmRlcmVyLnNldFNpemUob3B0aW9ucy53aWR0aCwgb3B0aW9ucy5oZWlnaHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVuZGVyZXI7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgc2NhcGUgdGltZSB0byBtYXRjaCB0aGUgY3VycmVudCB0aW1lICh0YWtpbmcgaW50b1xuICogYWNjb3VudCB0aGUgdGltZVJhdGlvIGV0YykuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX3VwZGF0ZVRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcbiAgICB2YXIgZWxhcHNlZCA9IG5vdy5nZXRUaW1lKCkgLSB0aGlzLmZpcnN0UmVuZGVyO1xuICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKHRoaXMuZmlyc3RSZW5kZXIgKyAoZWxhcHNlZCAqIHRoaXMuX29wdHMudGltZVJhdGlvKSk7XG4gICAgdmFyIGNhbGxiYWNrID0gdGhpcy5fb3B0cy5kYXRlVXBkYXRlO1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrRGF0ZSA9IG5ldyBEYXRlKHRoaXMuZGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGNhbGxiYWNrRGF0ZSk7XG4gICAgICAgIH0sIDApO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVTdW4oKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB1cGRhdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc3VuIHRvIHN1aXQgdGhlIHNjYXBlIGN1cnJlbnQgdGltZS5cbiAqIEBwYXJhbSAge1RIUkVFLkRpcmVjdGlvbmFsTGlnaHR9IFtzdW5dIHRoZSBzdW4gdG8gYWN0IG9uLiAgSWYgbm90XG4gKiBzdXBwbGllZCwgdGhpcyBtZXRob2Qgd2lsbCBhY3Qgb24gdGhlIGxpZ2h0IGluIHRoaXMgc2NlbmUncyBsaWdodFxuICogbGlzdCB0aGF0IGlzIGNhbGxlZCBcInN1blwiLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVTdW4gPSBmdW5jdGlvbihzdW4pIHtcblxuICAgIGlmICh0eXBlb2Ygc3VuID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGlmIHRoZXkgZGlkbid0IHByb3ZpZGUgYSBzdW4sIHVzZSBvdXIgb3duXG4gICAgICAgIHN1biA9IHRoaXMubGlnaHRzLnN1bjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47IC8vIGJhaWwgaWYgdGhlcmUncyBubyBzdW4gV0hBVCBESUQgWU9VIERPIFlPVSBNT05TVEVSXG4gICAgfVxuXG4gICAgdmFyIHN1bkFuZ2xlID0gKHRoaXMuZGF0ZS5nZXRIb3VycygpKjYwICsgdGhpcy5kYXRlLmdldE1pbnV0ZXMoKSkgLyAxNDQwICogMiAqIE1hdGguUEk7XG4gICAgdmFyIHN1blJvdGF0aW9uQXhpcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApO1xuXG4gICAgc3VuLnBvc2l0aW9uXG4gICAgICAgIC5zZXQoMCwgLTMgKiB0aGlzLmYud1ksIC0yMCAqIHRoaXMuZi53WilcbiAgICAgICAgLmFwcGx5QXhpc0FuZ2xlKHN1blJvdGF0aW9uQXhpcywgc3VuQW5nbGUpXG4gICAgICAgIC5hZGQodGhpcy5mLmNlbnRlcik7XG5cbiAgICB2YXIgc3VuWiA9IHN1bi5wb3NpdGlvbi56O1xuXG4gICAgLy8gc3dpdGNoIHRoZSBzdW4gb2ZmIHdoZW4gaXQncyBuaWdodCB0aW1lXG4gICAgaWYgKHN1bi5vbmx5U2hhZG93ID09IGZhbHNlICYmIHN1blogPD0gdGhpcy5mLmNlbnRlci56KSB7XG4gICAgICAgIHN1bi5vbmx5U2hhZG93ID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHN1bi5vbmx5U2hhZG93ID09IHRydWUgJiYgc3VuWiA+IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGZhZGUgb3V0IHRoZSBzaGFkb3cgZGFya25lc3Mgd2hlbiB0aGUgc3VuIGlzIGxvd1xuICAgIGlmIChzdW5aID49IHRoaXMuZi5jZW50ZXIueiAmJiBzdW5aIDw9IHRoaXMuZi5tYXhaKSB7XG4gICAgICAgIHZhciB1cG5lc3MgPSBNYXRoLm1heCgwLCAoc3VuWiAtIHRoaXMuZi5jZW50ZXIueikgLyB0aGlzLmYud1ogKiAyKTtcbiAgICAgICAgc3VuLnNoYWRvd0RhcmtuZXNzID0gMC41ICogdXBuZXNzO1xuICAgICAgICBzdW4uaW50ZW5zaXR5ID0gdXBuZXNzO1xuICAgIH1cblxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlTGlnaHRzID0gZnVuY3Rpb24obGlnaHRzVG9JbmNsdWRlKSB7XG5cbiAgICB2YXIgbGlnaHRzID0ge307XG4gICAgdmFyIGYgPSB0aGlzLmY7ICAvLyBjb252ZW5pZW50IHJlZmVyZW5jZSB0byB0aGUgZmllbGRcblxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignYW1iaWVudCcpICE9IC0xKSB7XG4gICAgICAgIC8vIGFkZCBhbiBhbWJpZW50IGxpc3RcbiAgICAgICAgbGlnaHRzLmFtYmllbnQgPSBuZXcgVEhSRUUuQW1iaWVudExpZ2h0KDB4MjIyMjMzKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCd0b3BsZWZ0JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLmxlZnQgPSBuZXcgVEhSRUUuUG9pbnRMaWdodCgweGZmZmZmZiwgMSwgMCk7XG4gICAgICAgIC8vIHBvc2l0aW9uIGxpZ2h0IG92ZXIgdGhlIHZpZXdlcidzIGxlZnQgc2hvdWxkZXIuLlxuICAgICAgICAvLyAtIExFRlQgb2YgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeCB3aWR0aFxuICAgICAgICAvLyAtIEJFSElORCB0aGUgY2FtZXJhIGJ5IDUwJSBvZiB0aGUgZmllbGQncyB5IHdpZHRoXG4gICAgICAgIC8vIC0gQUJPVkUgdGhlIGNhbWVyYSBieSB0aGUgZmllbGQncyBoZWlnaHRcbiAgICAgICAgbGlnaHRzLmxlZnQucG9zaXRpb24uYWRkVmVjdG9ycyhcbiAgICAgICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLFxuICAgICAgICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoLTAuNSAqIGYud1gsIC0wLjUgKiBmLndZLCAxICogZi53WilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGxpZ2h0c1RvSW5jbHVkZS5pbmRleE9mKCdzdW4nKSAhPSAtMSkge1xuICAgICAgICBsaWdodHMuc3VuID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZWUpO1xuICAgICAgICBsaWdodHMuc3VuLmludGVuc2l0eSA9IDEuMDtcblxuICAgICAgICB0aGlzLl91cGRhdGVTdW4obGlnaHRzLnN1bik7XG5cbiAgICAgICAgLy8gbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFWaXNpYmxlID0gdHJ1ZTsgIC8vIERFQlVHXG5cbiAgICAgICAgLy8gZGlyZWN0aW9uIG9mIHN1bmxpZ2h0XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc3VuLnRhcmdldCA9IHRhcmdldDtcblxuICAgICAgICAvLyBzdW4gZGlzdGFuY2UsIGxvbFxuICAgICAgICB2YXIgc3VuRGlzdGFuY2UgPSBsaWdodHMuc3VuLnBvc2l0aW9uLmRpc3RhbmNlVG8obGlnaHRzLnN1bi50YXJnZXQucG9zaXRpb24pO1xuICAgICAgICAvLyBsb25nZXN0IGRpYWdvbmFsIGZyb20gZmllbGQtY2VudGVyXG4gICAgICAgIHZhciBtYXhGaWVsZERpYWdvbmFsID0gZi5jZW50ZXIuZGlzdGFuY2VUbyhuZXcgVEhSRUUuVmVjdG9yMyhmLm1pblgsIGYubWluWSwgZi5taW5aKSk7XG5cbiAgICAgICAgLy8gc2hhZG93IHNldHRpbmdzXG4gICAgICAgIGxpZ2h0cy5zdW4uY2FzdFNoYWRvdyA9IHRydWU7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93RGFya25lc3MgPSAwLjMzO1xuXG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhTmVhciA9IHN1bkRpc3RhbmNlIC0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFGYXIgPSBzdW5EaXN0YW5jZSArIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVG9wID0gbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFSaWdodCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhQm90dG9tID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUxlZnQgPSAtMSAqIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc2t5JykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnNreSA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZWVlZWZmKTtcbiAgICAgICAgbGlnaHRzLnNreS5pbnRlbnNpdHkgPSAwLjg7XG5cbiAgICAgICAgLy8gc2t5IGlzIGRpcmVjdGx5IGFib3ZlXG4gICAgICAgIHZhciBza3lIZWlnaHQgPSA1ICogZi53WjtcbiAgICAgICAgbGlnaHRzLnNreS5wb3NpdGlvbi5jb3B5KHRoaXMuY2FtZXJhLnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbGlnaHRzLnNreS5wb3NpdGlvbi5zZXRaKGYubWF4WiArIHNreUhlaWdodCk7XG5cbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0YXJnZXQucG9zaXRpb24uY29weShmLmNlbnRlcik7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRhcmdldCk7XG4gICAgICAgIGxpZ2h0cy5za3kudGFyZ2V0ID0gdGFyZ2V0O1xuICAgIH1cblxuICAgIGZvciAodmFyIGxpZ2h0IGluIGxpZ2h0cykge1xuICAgICAgICBpZiAobGlnaHRzLmhhc093blByb3BlcnR5KGxpZ2h0KSkge1xuICAgICAgICAgICAgdGhpcy5zY2VuZS5hZGQobGlnaHRzW2xpZ2h0XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlnaHRzO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlU2NlbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcbiAgICAvLyBhZGQgZm9nXG4gICAgLy8gc2NlbmUuZm9nID0gbmV3IFRIUkVFLkZvZyhcbiAgICAvLyAgICAgJyNmMGY4ZmYnLFxuICAgIC8vICAgICB0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLFxuICAgIC8vICAgICB0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YICogM1xuICAgIC8vICk7XG4gICAgcmV0dXJuIHNjZW5lO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ2FtZXJhID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG4gICAgLy8gdmlld2luZyBhbmdsZVxuICAgIC8vIGkgdGhpbmsgdGhpcyBpcyB0aGUgdmVydGljYWwgdmlldyBhbmdsZS4gIGhvcml6b250YWwgYW5nbGUgaXNcbiAgICAvLyBkZXJpdmVkIGZyb20gdGhpcyBhbmQgdGhlIGFzcGVjdCByYXRpby5cbiAgICB2YXIgdmlld0FuZ2xlID0gNDU7XG4gICAgdmlld0FuZ2xlID0gKG9wdGlvbnMgJiYgb3B0aW9ucy52aWV3QW5nbGUpIHx8IHZpZXdBbmdsZTtcblxuICAgIC8vIGFzcGVjdFxuICAgIHZhciB2aWV3QXNwZWN0ID0gMTYvOTtcbiAgICBpZiAodGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICB2aWV3QXNwZWN0ID0gJGVsZW0ud2lkdGgoKSAvICRlbGVtLmhlaWdodCgpO1xuICAgIH1cblxuICAgIC8vIG5lYXIgYW5kIGZhciBjbGlwcGluZ1xuICAgIHZhciBuZWFyQ2xpcCA9IDAuMTtcbiAgICB2YXIgZmFyQ2xpcCA9IDEwMDAwO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbmVhckNsaXAgPSBNYXRoLm1pbih0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAvIDEwMDA7XG4gICAgICAgIGZhckNsaXAgPSBNYXRoLm1heCh0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAqIDEwO1xuICAgIH1cblxuICAgIC8vIGNhbWVyYSBwb3NpdGlvbiBhbmQgbG9va2luZyBkaXJlY3Rpb25cbiAgICB2YXIgbG9va0hlcmUgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcbiAgICB2YXIgY2FtUG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEwLCA1KTtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIGxvb2tIZXJlID0gdGhpcy5mLmNlbnRlcjtcbiAgICAgICAgY2FtUG9zID0gbG9va0hlcmUuY2xvbmUoKS5hZGQobmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEuMSAqIHRoaXMuZi53WSwgMSAqIHRoaXMuZi53WikpO1xuICAgIH1cblxuICAgIC8vIHNldCB1cCBjYW1lcmFcbiAgICB2YXIgY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKCB2aWV3QW5nbGUsIHZpZXdBc3BlY3QsIG5lYXJDbGlwLCBmYXJDbGlwKTtcbiAgICAvLyBcInVwXCIgaXMgcG9zaXRpdmUgWlxuICAgIGNhbWVyYS51cC5zZXQoMCwwLDEpO1xuICAgIGNhbWVyYS5wb3NpdGlvbi5jb3B5KGNhbVBvcyk7XG4gICAgY2FtZXJhLmxvb2tBdChsb29rSGVyZSk7XG5cbiAgICAvLyBhZGQgdGhlIGNhbWVyYSB0byB0aGUgc2NlbmVcbiAgICBpZiAodGhpcy5zY2VuZSkge1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChjYW1lcmEpO1xuICAgIH1cblxuICAgIHJldHVybiBjYW1lcmE7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDb250cm9scyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKTtcbiAgICBpZiAodGhpcy5mICYmIHRoaXMuZi5jZW50ZXIpIHtcbiAgICAgICAgY2VudGVyID0gdGhpcy5mLmNlbnRlci5jbG9uZSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jYW1lcmEgJiYgdGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5jYW1lcmEsIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIGNvbnRyb2xzLmNlbnRlciA9IGNlbnRlcjtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xzO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJ3NjYXBlISdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU2NlbmU7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xuXG52YXIgTGFtYmVydCA9IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWw7XG52YXIgUGhvbmcgPSBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbDtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBTdHVmZiAodGhhdCBpcywgVEhSRUUuTWF0ZXJpYWwpIHRoYXQgdGhpbmdzIGluIHNjYXBlcyBjYW4gYmUgbWFkZSBvdXQgb2YuXG4gKiBAbmFtZXNwYWNlXG4gKi9cbnZhciBTY2FwZVN0dWZmID0ge307XG5cbi8qKiBnZW5lcmljIHN0dWZmLCBmb3IgaWYgbm90aGluZyBlbHNlIGlzIHNwZWNpZmllZFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdlbmVyaWMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSxcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjUwIH0pO1xuXG4vKiogd2F0ZXIgaXMgYmx1ZSBhbmQgYSBiaXQgdHJhbnNwYXJlbnRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53YXRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MzM5OWZmLFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNzUgfSk7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdG9uZSwgZGlydCwgYW5kIGdyb3VuZCBtYXRlcmlhbHNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKiogZGlydCBmb3IgZ2VuZXJhbCB1c2VcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5kaXJ0ID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhhMDUyMmQgfSk7XG5cbi8vIE5pbmUgZGlydCBjb2xvdXJzIGZvciB2YXJ5aW5nIG1vaXN0dXJlIGxldmVscy4gIFN0YXJ0IGJ5IGRlZmluaW5nXG4vLyB0aGUgZHJpZXN0IGFuZCB3ZXR0ZXN0IGNvbG91cnMsIGFuZCB1c2UgLmxlcnAoKSB0byBnZXQgYSBsaW5lYXJcbi8vIGludGVycG9sYXRlZCBjb2xvdXIgZm9yIGVhY2ggb2YgdGhlIGluLWJldHdlZW4gZGlydHMuXG52YXIgZHJ5ID0gbmV3IFRIUkVFLkNvbG9yKDB4YmI4ODU1KTsgLy8gZHJ5XG52YXIgd2V0ID0gbmV3IFRIUkVFLkNvbG9yKDB4ODgyMjAwKTsgLy8gbW9pc3RcblxuLyoqIGRpcnQgYXQgdmFyeWluZyBtb2lzdHVyZSBsZXZlbHM6IGRpcnQwIGlzIGRyeSBhbmQgbGlnaHQgaW5cbiAgKiBjb2xvdXIsIGRpcnQ5IGlzIG1vaXN0IGFuZCBkYXJrLlxuICAqIEBuYW1lIGRpcnRbMC05XVxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmRpcnQwID0gbmV3IExhbWJlcnQoeyBjb2xvcjogZHJ5IH0pO1xuU2NhcGVTdHVmZi5kaXJ0MSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAxLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAyLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0MyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCAzLzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA0LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA1LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NiA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA2LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0NyA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA3LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeS5jbG9uZSgpLmxlcnAod2V0LCA4LzkpIH0pO1xuU2NhcGVTdHVmZi5kaXJ0OSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IHdldCB9KTtcblxuLyoqIGxlYWYgbGl0dGVyLCB3aGljaCBpbiByZWFsaXR5IGlzIHVzdWFsbHkgYnJvd25pc2gsIGJ1dCB0aGlzIGhhc1xuICAqIGEgZ3JlZW5pc2ggdG9uZSB0byBkaXN0aW5ndWlzaCBpdCBmcm9tIHBsYWluIGRpcnQuXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGVhZmxpdHRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NjY2YjJmIH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGZsb3JhIC0gd29vZCwgbGVhdmVzLCBldGNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKiogZ2VuZXJpYyBicm93biB3b29kXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud29vZCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4Nzc0NDIyIH0pO1xuXG4vKiogbGlnaHQgd29vZCBmb3IgZ3VtdHJlZXMgZXRjLiAgTWF5YmUgaXQncyBhIGJpdCB0b28gbGlnaHQ/XG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubGlnaHR3b29kID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHhmZmVlY2MgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDU1ODgzMyB9KTtcblxuLyoqIGEgZ2VuZXJpYyBncmVlbmlzaCBsZWFmIG1hdGVyaWFsXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZm9saWFnZSA9IG5ldyBMYW1iZXJ0KFxuICB7IGNvbG9yOiAweDU1ODgzMywgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuOSB9XG4pO1xuXG4vKiogYSBncmVlbmlzaCBsZWFmIG1hdGVyaWFsIHRoYXQncyBtb3N0bHkgc2VlLXRocm91Z2hcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi50cmFuc3BhcmVudEZvbGlhZ2UgPSBuZXcgTGFtYmVydChcbiAgeyBjb2xvcjogMHg1NTg4MzMsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjMzIH1cbik7XG5cbi8qKiBhIGZvbGlhZ2UgbWF0ZXJpYWwgZm9yIHVzZSBpbiBwb2ludCBjbG91ZCBvYmplY3RzXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYucG9pbnRGb2xpYWdlID0gbmV3IFRIUkVFLlBvaW50Q2xvdWRNYXRlcmlhbCh7IGNvbG9yOiAweDU1ODgzMywgc2l6ZTogMC41IH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGJ1aWx0IG1hdGVyaWFsc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBzaWx2ZXJ5IG1ldGFsXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYubWV0YWwgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHhhYWJiZWUsIHNwZWN1bGFyOiAweGZmZmZmZiwgc2hpbmluZXNzOiAxMDAsIHJlZmxlY3Rpdml0eTogMC44IH0pO1xuXG4vKiogY29uY3JldGUgaW4gYSBzb3J0IG9mIG1pZC1ncmV5XG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuY29uY3JldGUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSB9KTtcblxuLyoqIHBsYXN0aWMsIGEgZ2VuZXJpYyB3aGl0aXNoIHBsYXN0aWMgd2l0aCBhIGJpdCBvZiBzaGluaW5lc3NcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5wbGFzdGljID0gbmV3IFBob25nKHsgY29sb3I6IDB4Y2NjY2NjLCBzcGVjdWxhcjogMHhjY2NjY2MgfSk7XG5cbi8qKiBibGFjayBzaGFkZWNsb3RoLCBzbGlnaHRseSBzZWUgdGhyb3VnaCBibGFja1xuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnNoYWRlY2xvdGggPSBuZXcgTGFtYmVydChcbiAgeyBjb2xvcjogMHgxMTExMTEsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjggfVxuKTtcblxuLyoqIGdsYXNzIGlzIHNoaW55LCBmYWlybHkgdHJhbnNwYXJlbnQsIGFuZCBhIGxpdHRsZSBibHVpc2hcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nbGFzcyA9IG5ldyBQaG9uZyhcbiAgeyBjb2xvcjogMHg2NmFhZmYsIHNwZWN1bGFyOiAweGZmZmZmZiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNSB9XG4pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGdlbmVyYWwgY29sb3Vyc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBtYXR0IGJsYWNrLCBmb3IgYmxhY2sgc3VyZmFjZXMgKGFjdHVhbGx5IGl0J3MgIzExMTExMSlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5ibGFjayA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MTExMTExIH0pO1xuXG4vKiogbWF0dCB3aGl0ZSwgZm9yIHdoaXRlIHN1cmZhY2VzIChhY3R1YWxseSBpdCdzICNlZWVlZWUpXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud2hpdGUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGVlZWVlZSB9KTtcblxuLyoqIGdsb3NzIGJsYWNrLCBmb3Igc2hpbnkgYmxhY2sgcGFpbnRlZCBzdXJmYWNlcyAoYWN0dWFsbHkgaXQncyAjMTExMTExKVxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdsb3NzQmxhY2sgPSBuZXcgUGhvbmcoeyBjb2xvcjogMHgxMTExMTEsIHNwZWN1bGFyOiAweDY2NjY2NiB9KTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBVSSB1dGlsaXR5IHRoaW5nc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKiBzb2xpZCBjb2xvciBmb3IgcmVuZGVyaW5nIFVJIGVsZW1lbnRzXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYudWlTaG93ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IDB4ZmZmZmZmIH0pO1xuU2NhcGVTdHVmZi51aVNob3cuZGVwdGhUZXN0ID0gZmFsc2U7XG5cbi8qKiBtb3N0bHkgdHJhbnNwYXJlbnQsIHNsaWdodGx5IHllbGxvd2lzaCBjb2xvciBmb3IgaGludGluZyBhdCBVSSBlbGVtZW50c1xuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnVpU3VnZ2VzdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7IGNvbG9yOiAweGZmZmY2NiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuMiB9KVxuU2NhcGVTdHVmZi51aVN1Z2dlc3QuZGVwdGhUZXN0ID0gZmFsc2U7XG5cbi8qKiBicmlnaHQgZ2xvd2luZyBjb2xvciBmb3IgaGlnaGxpZ2h0aW5nIFVJIGVsZW1lbnRzXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYudWlIaWdobGlnaHQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBjb2xvcjogMHhmZmZmZmYsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjQ1IH0pXG5TY2FwZVN0dWZmLnVpSGlnaGxpZ2h0LmRlcHRoVGVzdCA9IGZhbHNlO1xuXG5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU3R1ZmY7XG5cblxuXG5cbiJdfQ==
