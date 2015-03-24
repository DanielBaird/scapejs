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

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/item":5,"./scape/itemtypes":6,"./scape/scene":16,"./scape/stuff":17}],2:[function(require,module,exports){

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

},{"./baseobject":2,"./item":5,"./stuff":17}],5:[function(require,module,exports){
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
    soilPit:     require('./itemtypes/soilpit'),

    label:       require('./itemtypes/label')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/crane":11,"./itemtypes/cube":12,"./itemtypes/label":13,"./itemtypes/soilpit":14,"./itemtypes/tree":15}],7:[function(require,module,exports){
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

	c.name = options.name || 'camera';

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

},{"../../stuff":17,"./clickable":8}],8:[function(require,module,exports){
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

	var hoverRadius = 5;
	var clickRadius = 3;
	var lineLength = 8;

	var translate = new THREE.Matrix4().makeTranslation(x, y, z);

	hoverMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 })
	var hoverGeom = new THREE.SphereGeometry(hoverRadius);
	hoverGeom.applyMatrix(translate);
	var hoverBubble = new THREE.Mesh(hoverGeom, hoverMaterial);
	hoverBubble.visible = false;
	// hoverBubble.userData.type = 'hoverbubble';
	clicker.add(hoverBubble);

	var clickMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
	clickMaterial.depthTest = false;
	var clickGeom = new THREE.SphereGeometry(clickRadius, 32, 24);
	clickGeom.applyMatrix(translate);
	var clickBubble = new THREE.Mesh(clickGeom, clickMaterial);
	// clickBubble.userData.type = 'clickbubble';
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

},{"../../stuff":17}],9:[function(require,module,exports){
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

},{"../../stuff":17,"./clickable":8}],10:[function(require,module,exports){
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

},{"../../stuff":17,"./clickable":8}],11:[function(require,module,exports){
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

},{"../stuff":17,"./addons/camera":7}],12:[function(require,module,exports){
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

},{"../stuff":17}],13:[function(require,module,exports){
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

	i.textStuff = options.letters || ScapeStuff.uiWhite;
	i.lineStuff = options.pointer || i.textStuff;

	var translate = new THREE.Matrix4().makeTranslation(i.x, i.y, i.z).multiply(i.offset);

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

},{"../stuff":17}],14:[function(require,module,exports){
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

},{"../stuff":17,"./addons/clickable":8}],15:[function(require,module,exports){
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

},{"../stuff":17,"./addons/dendrometer":9,"./addons/sapflowmeter":10}],16:[function(require,module,exports){
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

},{"./baseobject":2,"./chunk":3,"./item":5,"./itemtypes":6,"./stuff":17}],17:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NhbWVyYS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2NsaWNrYWJsZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvYWRkb25zL2RlbmRyb21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9hZGRvbnMvc2FwZmxvd21ldGVyLmpzIiwic3JjL3NjYXBlL2l0ZW10eXBlcy9jcmFuZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvY3ViZS5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMvbGFiZWwuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL3NvaWxwaXQuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL3RyZWUuanMiLCJzcmMvc2NhcGUvc2NlbmUuanMiLCJzcmMvc2NhcGUvc3R1ZmYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDemRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdmlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vIFRIUkVFID0gcmVxdWlyZSgndGhyZWUnKTtcblxuLy8gbWFrZSBhbiBvYmplY3Qgb3V0IG9mIHRoZSB2YXJpb3VzIGJpdHNcblNjYXBlID0ge1xuICAgIEJhc2VPYmplY3Q6IHJlcXVpcmUoJy4vc2NhcGUvYmFzZW9iamVjdCcpLFxuICAgIENodW5rOiAgICAgIHJlcXVpcmUoJy4vc2NhcGUvY2h1bmsnKSxcbiAgICBGaWVsZDogICAgICByZXF1aXJlKCcuL3NjYXBlL2ZpZWxkJyksXG4gICAgSXRlbTogICAgICAgcmVxdWlyZSgnLi9zY2FwZS9pdGVtJyksXG4gICAgSXRlbVR5cGVzOiAgcmVxdWlyZSgnLi9zY2FwZS9pdGVtdHlwZXMnKSxcbiAgICBTY2VuZTogICAgICByZXF1aXJlKCcuL3NjYXBlL3NjZW5lJyksXG4gICAgU3R1ZmY6ICAgICAgcmVxdWlyZSgnLi9zY2FwZS9zdHVmZicpXG59XG5cbi8vIHJldHVybiB0aGUgb2JqZWN0IGlmIHdlJ3JlIGJlaW5nIGJyb3dzZXJpZmllZDsgb3RoZXJ3aXNlIGF0dGFjaFxuLy8gaXQgdG8gdGhlIGdsb2JhbCB3aW5kb3cgb2JqZWN0LlxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTY2FwZTtcbn0gZWxzZSB7XG4gICAgd2luZG93LlNjYXBlID0gU2NhcGU7XG59XG4iLCJcbi8vXG4vLyB0aGlzIFwiYmFzZVwiIG9iamVjdCBoYXMgYSBmZXcgY29udmVuaWVuY2UgZnVuY3Rpb25zIGZvciBoYW5kbGluZ1xuLy8gb3B0aW9ucyBhbmQgd2hhdG5vdFxuLy9cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIFNjYXBlT2JqZWN0KG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gICAgdGhpcy5fb3B0cyA9IE9iamVjdC5jcmVhdGUoZGVmYXVsdHMpO1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZXJnZSBuZXcgb3B0aW9ucyBpbnRvIG91ciBvcHRpb25zXG5TY2FwZU9iamVjdC5wcm90b3R5cGUubWVyZ2VPcHRpb25zID0gZnVuY3Rpb24oZXh0cmFPcHRzKSB7XG4gICAgZm9yIChvcHQgaW4gZXh0cmFPcHRzKSB7XG4gICAgICAgIHRoaXMuX29wdHNbb3B0XSA9IGV4dHJhT3B0c1tvcHRdO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVPYmplY3Q7IiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWN0YW5ndWxhciBwcmlzbSBvZiBtYXRlcmlhbCB0aGF0IHRoZSBzb2xpZCBcImdyb3VuZFwiXG4gKiBwb3J0aW9uIG9mIGEgJ3NjYXBlIGlzIG1ha2UgdXAgb2YsIGUuZy4gZGlydCwgbGVhZiBsaXR0ZXIsIHdhdGVyLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIG1lc2ggYmFzZWQgb24gdGhlIGxpbmtlZFxuICogY2h1bmsgaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGNodW5rIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayAodmVydGljYWwgY29sdW1uIHdpdGhpbiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2FwZSkgdGhhdCBvd25zIHRoaXMgY2h1bmtcbiAqIEBwYXJhbSB7SW50ZWdlcn0gbGF5ZXJJbmRleCBJbmRleCBpbnRvIHBhcmVudEJsb2NrLmcgdGhpcyBjaHVuayBpcyBhdFxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblogbG93ZXN0IFogdmFsdWUgYW55IGNodW5rIHNob3VsZCBoYXZlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUNodW5rKHNjZW5lLCBwYXJlbnRCbG9jaywgbGF5ZXJJbmRleCwgbWluWiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9ibG9jayA9IHBhcmVudEJsb2NrO1xuICAgIHRoaXMuX2lzU3VyZmFjZSA9IChsYXllckluZGV4ID09IDApO1xuICAgIHRoaXMuX2xheWVyID0gcGFyZW50QmxvY2suZ1tsYXllckluZGV4XTtcbiAgICB0aGlzLl9taW5aID0gbWluWjtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuXG4gICAgLy8gVE9ETzogZmluaXNoIGhpbSEhXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVDaHVuay5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUNodW5rLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlQ2h1bms7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogSW52b2tlIGEgcmVidWlsZCBvZiB0aGlzIGNodW5rLlxuICpcbiAqIERpc2NhcmRzIGV4aXN0aW5nIGNhY2hlZCBtZXNoIGFuZCBidWlsZHMgYSBuZXcgbWVzaCBiYXNlZCBvbiB0aGVcbiAqIGN1cnJlbnRseSBsaW5rZWQgY2h1bmsgaW5mb3JtYXRpb24uXG4gKlxuICogQHJldHVybiBub25lXG4gKi9cblNjYXBlQ2h1bmsucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91cGRhdGVNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhlIGNodW5rIHdpbGwgYmUgYXMgZGVlcCBhcyB0aGUgbGF5ZXIgc2F5c1xuICAgIHZhciBkZXB0aCA9IHRoaXMuX2xheWVyLmR6O1xuICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgIC8vIC4udW5sZXNzIHRoYXQncyAwLCBpbiB3aGljaCBjYXNlIGdvIHRvIHRoZSBib3R0b21cbiAgICAgICAgZGVwdGggPSB0aGlzLl9sYXllci56IC0gdGhpcy5fbWluWjtcbiAgICB9XG4gICAgLy8gbWFrZSBhIGdlb21ldHJ5IGZvciB0aGUgY2h1bmtcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcbiAgICAgICAgdGhpcy5fYmxvY2suZHgsIHRoaXMuX2Jsb2NrLmR5LCBkZXB0aFxuICAgICk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCB0aGlzLl9sYXllci5tKTtcbiAgICBtZXNoLnBvc2l0aW9uLnNldChcbiAgICAgICAgdGhpcy5fYmxvY2sueCArIHRoaXMuX2Jsb2NrLmR4LzIsXG4gICAgICAgIHRoaXMuX2Jsb2NrLnkgKyB0aGlzLl9ibG9jay5keS8yLFxuICAgICAgICB0aGlzLl9sYXllci56IC0gZGVwdGgvMlxuICAgICk7XG4gICAgbWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAvLyBvbmx5IHRoZSBzdXJmYWNlIGNodW5rcyByZWNlaXZlIHNoYWRvd1xuICAgIGlmICh0aGlzLl9pc1N1cmZhY2UpIHtcbiAgICAgICAgbWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9hZGRNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUuYWRkKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fcmVtb3ZlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLnJlbW92ZSh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3VwZGF0ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVNZXNoKCk7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcbiAgICB0aGlzLl9hZGRNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDaHVuazsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbSA9IHJlcXVpcmUoJy4vaXRlbScpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFRoZSBjb250YWluZXIgZm9yIGFsbCBpbmZvcm1hdGlvbiBhYm91dCBhbiBhcmVhLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFZhcmlvdXMgb3B0aW9ucyBmb3IgdGhlIFNjYXBlRmllbGQgYmVpbmcgY3JlYXRlZC5cbiAqXG4gKiBvcHRpb24gfCBkZWZhdWx0IHZhbHVlIHwgZGVzY3JpcHRpb25cbiAqIC0tLS0tLS18LS0tLS0tLS0tLS0tLS06fC0tLS0tLS0tLS0tLVxuICogYG1pblhgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBYIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WGAgICAgIHwgIDEwMCB8IGxhcmdlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1hgICB8ICAgMTAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWCBheGlzIGludG9cbiAqIGBtaW5ZYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWSBmb3IgdGhpcyBmaWVsZFxuICogYG1heFlgICAgICB8ICAxMDAgfCBsYXJnZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NZYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFkgYXhpcyBpbnRvXG4gKiBgbWluWmAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFogKHZlcnRpY2FsIGRpbWVuc2lvbikgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhaYCAgICAgfCAgIDQwIHwgbGFyZ2VzdCBaIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWmAgIHwgICA4MCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBaIGF4aXMgaW50b1xuICogYGJsb2NrR2FwYCB8IDAuMDEgfCBnYXAgdG8gbGVhdmUgYmV0d2VlbiBibG9ja3MgYWxvbmcgdGhlIFggYW5kIFkgYXhlc1xuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUZpZWxkKG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgbWluWDogMCwgICAgICAgIG1heFg6IDEwMCwgICAgICAgICAgYmxvY2tzWDogMTAsXG4gICAgICAgIG1pblk6IDAsICAgICAgICBtYXhZOiAxMDAsICAgICAgICAgIGJsb2Nrc1k6IDEwLFxuICAgICAgICBtaW5aOiAwLCAgICAgICAgbWF4WjogNDAsICAgICAgICAgICBibG9ja3NaOiA4MCxcbiAgICAgICAgYmxvY2tHYXA6IDAuMDFcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gbWluIGFuZCBtYXggdmFsdWVzIGZvciB4IHkgYW5kIHpcbiAgICB0aGlzLm1pblggPSB0aGlzLl9vcHRzLm1pblg7XG4gICAgdGhpcy5taW5ZID0gdGhpcy5fb3B0cy5taW5ZO1xuICAgIHRoaXMubWluWiA9IHRoaXMuX29wdHMubWluWjtcblxuICAgIHRoaXMubWF4WCA9IHRoaXMuX29wdHMubWF4WDtcbiAgICB0aGlzLm1heFkgPSB0aGlzLl9vcHRzLm1heFk7XG4gICAgdGhpcy5tYXhaID0gdGhpcy5fb3B0cy5tYXhaO1xuXG4gICAgLy8gY29udmVuaWVudCBcIndpZHRoc1wiXG4gICAgdGhpcy53WCA9IHRoaXMubWF4WCAtIHRoaXMubWluWDtcbiAgICB0aGlzLndZID0gdGhpcy5tYXhZIC0gdGhpcy5taW5ZO1xuICAgIHRoaXMud1ogPSB0aGlzLm1heFogLSB0aGlzLm1pblo7XG5cbiAgICAvLyBob3cgbWFueSBibG9ja3MgYWNyb3NzIHggYW5kIHk/XG4gICAgdGhpcy5ibG9ja3NYID0gdGhpcy5fb3B0cy5ibG9ja3NYO1xuICAgIHRoaXMuYmxvY2tzWSA9IHRoaXMuX29wdHMuYmxvY2tzWTtcbiAgICB0aGlzLmJsb2Nrc1ogPSB0aGlzLl9vcHRzLmJsb2Nrc1o7XG5cbiAgICAvLyBob3cgd2lkZSBpcyBlYWNoIGJsb2NrXG4gICAgdGhpcy5fYlggPSB0aGlzLndYIC8gdGhpcy5ibG9ja3NYO1xuICAgIHRoaXMuX2JZID0gdGhpcy53WSAvIHRoaXMuYmxvY2tzWTtcbiAgICB0aGlzLl9iWiA9IHRoaXMud1ogLyB0aGlzLmJsb2Nrc1o7XG5cbiAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG5cbiAgICAvLyBob3VzZWtlZXBpbmdcbiAgICB0aGlzLl9ncm91bmRTdGFja3MgPSBbXTtcbiAgICB0aGlzLl9ncm91bmRIZWlnaHRzID0gW107XG4gICAgdGhpcy5fY2FsY0NlbnRlcigpO1xuICAgIHRoaXMuX21ha2VHcmlkKCk7XG5cbiAgICB0aGlzLmNsaWNrYWJsZXMgPSBbXTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUZpZWxkO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnKCcgKyB0aGlzLm1pblggKyAnLScgKyB0aGlzLm1heFggK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5ZICsgJy0nICsgdGhpcy5tYXhZICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWiArICctJyArIHRoaXMubWF4WiArXG4gICAgICAgICcpJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuX21ha2VHcmlkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZyA9IFtdO1xuICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLmJsb2Nrc1g7IGd4KyspIHtcbiAgICAgICAgdmFyIGNvbCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5ibG9ja3NZOyBneSsrKSB7XG4gICAgICAgICAgICB2YXIgeEdhcCA9IHRoaXMuX2JYICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgeUdhcCA9IHRoaXMuX2JZICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSB7XG4gICAgICAgICAgICAgICAgeDogdGhpcy5taW5YICsgKHRoaXMuX2JYICogZ3gpICsgeEdhcCxcbiAgICAgICAgICAgICAgICBkeDogdGhpcy5fYlggLSB4R2FwIC0geEdhcCxcbiAgICAgICAgICAgICAgICB5OiB0aGlzLm1pblkgKyAodGhpcy5fYlkgKiBneSkgKyB5R2FwLFxuICAgICAgICAgICAgICAgIGR5OiB0aGlzLl9iWSAtIHlHYXAgLSB5R2FwLFxuICAgICAgICAgICAgICAgIGc6IFt7XG4gICAgICAgICAgICAgICAgICAgIHo6IHRoaXMubWF4WixcbiAgICAgICAgICAgICAgICAgICAgZHo6IDAsIC8vIDAgbWVhbnMgXCJzdHJldGNoIHRvIG1pblpcIlxuICAgICAgICAgICAgICAgICAgICBtOiBTY2FwZVN0dWZmLmdlbmVyaWMsXG4gICAgICAgICAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgaTogW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbC5wdXNoKGJsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9nLnB1c2goY29sKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYnVpbGRzIGJsb2NrIG1lc2hlcyBmb3IgZGlzcGxheSBpbiB0aGUgcHJvdmlkZWQgc2NlbmUuICBUaGlzIGlzXG4gKiBnZW5lcmFsbHkgY2FsbGVkIGJ5IHRoZSBTY2FwZVNjZW5lIG9iamVjdCB3aGVuIHlvdSBnaXZlIGl0IGFcbiAqIFNjYXBlRmllbGQsIHNvIHlvdSB3b24ndCBuZWVkIHRvIGNhbGwgaXQgeW91cnNlbGYuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIHRoZSBTY2FwZVNjZW5lIHRoYXQgd2lsbCBiZSBkaXNwbGF5aW5nXG4gKiB0aGlzIFNjYXBlRmllbGQuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmJ1aWxkQmxvY2tzID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB2YXIgbWluWiA9IHRoaXMubWluWjtcbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGxheWVySW5kZXggPSAwOyBsYXllckluZGV4IDwgYi5nLmxlbmd0aDsgbGF5ZXJJbmRleCsrKSB7XG4gICAgICAgICAgICBiLmdbbGF5ZXJJbmRleF0uY2h1bmsgPSBuZXcgU2NhcGVDaHVuayhcbiAgICAgICAgICAgICAgICBzY2VuZSwgYiwgbGF5ZXJJbmRleCwgbWluWlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGRvIHRoaXMgdG8gYWRqdXN0IGFsbCB0aGUgY2h1bmsgaGVpZ2h0c1xuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBidWlsZHMgaXRlbSBtZXNoZXMgZm9yIGRpc3BsYXkgaW4gdGhlIHByb3ZpZGVkIHNjZW5lLiAgVGhpcyBpc1xuICogZ2VuZXJhbGx5IGNhbGxlZCBieSB0aGUgU2NhcGVTY2VuZSBvYmplY3Qgd2hlbiB5b3UgZ2l2ZSBpdCBhXG4gKiBTY2FwZUZpZWxkLCBzbyB5b3Ugd29uJ3QgbmVlZCB0byBjYWxsIGl0IHlvdXJzZWxmLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfSBzY2VuZSB0aGUgU2NhcGVTY2VuZSB0aGF0IHdpbGwgYmUgZGlzcGxheWluZ1xuICogdGhpcyBTY2FwZUZpZWxkLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5idWlsZEl0ZW1zID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHZhciBtaW5aID0gdGhpcy5taW5aO1xuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaXRlbUluZGV4ID0gMDsgaXRlbUluZGV4IDwgYi5pLmxlbmd0aDsgaXRlbUluZGV4KyspIHtcbiAgICAgICAgICAgIGIuaVtpdGVtSW5kZXhdLmFkZFRvU2NlbmUoc2NlbmUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFkdmlzZSB0aGUgc2NlbmUsIGlmIHdlIGhhdmUgb25lLCB0aGF0IHRoZXJlIGFyZSBuZXcgaXRlbXMuXG5TY2FwZUZpZWxkLnByb3RvdHlwZS51cGRhdGVJdGVtcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zY2VuZSkge1xuICAgICAgICB0aGlzLl9zY2VuZS5yZWZyZXNoSXRlbXMoKTtcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHVwZGF0ZSBhbiBpdGVtLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUudXBkYXRlSXRlbSA9IGZ1bmN0aW9uKGl0ZW0sIHVwZGF0ZXMpIHtcblxuICAgIC8vIHJlbW92ZSBvbGQgY2xpY2thYmxlc1xuICAgIGl0ZW0uZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgdmFyIGNpID0gdGhpcy5jbGlja2FibGVzLmluZGV4T2YoY3ApO1xuICAgICAgICBpZiAoY2kgIT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuY2xpY2thYmxlcy5zcGxpY2UoY2ksIDEpO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICBpdGVtLnVwZGF0ZSh1cGRhdGVzKTtcbiAgICAvLyBUT0RPOiB3aGF0IGlmICh4LHkpIHBvc2l0aW9uIGlzIHVwZGF0ZWQ/XG5cbiAgICAvLyBhZGQgbmV3IGNsaWNrYWJsZXNcbiAgICBpdGVtLmVhY2hDbGlja1BvaW50KGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgIHRoaXMuY2xpY2thYmxlcy5wdXNoKGNwKTtcbiAgICB9LCB0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUFsbEl0ZW1zKCk7XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBpdGVtTGlzdC5sZW5ndGg7IHMrKykge1xuICAgICAgICB2YXIgdGhlSXRlbSA9IGl0ZW1MaXN0W3NdO1xuICAgICAgICB0aGlzLmFkZEl0ZW0odGhlSXRlbSk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlSXRlbXMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVGaWVsZC5wcm90b3R5cGUucmVtb3ZlQWxsSXRlbXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVhY2hCbG9jayhmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIGZvciAodmFyIGluZGV4PTA7IGluZGV4IDwgYmxvY2suaS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIGJsb2NrLmlbaW5kZXhdLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBibG9jay5pID0gW107XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5jbGlja2FibGVzID0gW107XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW0gPSBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudCBibG9ja1xuICAgIHZhciBwYXJlbnRCbG9jayA9IHRoaXMuZ2V0QmxvY2soaXRlbS54LCBpdGVtLnkpO1xuICAgIHBhcmVudEJsb2NrLmkucHVzaChpdGVtKTtcblxuICAgIGl0ZW0uZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgdGhpcy5jbGlja2FibGVzLnB1c2goY3ApO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gc2V0IGl0ZW0gaGVpZ2h0IHRvIHRoZSBwYXJlbnQgYmxvY2sncyBncm91bmQgaGVpZ2h0XG4gICAgaXRlbS5zZXRIZWlnaHQocGFyZW50QmxvY2suZ1swXS56KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBsaXN0IG9mIGl0ZW1zIHRvIHRoZSBzY2FwZSBhdCB2YXJpb3VzIHBvaW50cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zT2ZUeXBlID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9pdGVtcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaXRlbUxpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIGl0ZW1JbmZvID0gaXRlbUxpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkSXRlbShuZXcgU2NhcGVJdGVtKGl0ZW1JbmZvLnR5cGUsIGl0ZW1JbmZvLngsIGl0ZW1JbmZvLnksIGl0ZW1JbmZvKSk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgY2xhaW1zIG9mIHRoZSBncm91bmQgaGVpZ2h0IGF0IHZhcmlvdXMgcG9pbnRzLlxuICogVW5saWtlIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LCB0aGlzXG4gKiBtZXRob2Qgd2lsbCByZS1leHRyYXBvbGF0ZSBncm91bmQgaGVpZ2h0cyBhY3Jvc3MgdGhlIEZpZWxkIChzb1xuICogeW91IGRvbid0IG5lZWQgdG8gY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IHlvdXJzZWxmKS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBoZWlnaHRMaXN0IEEgbGlzdCBvZiBvYmplY3RzLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgemAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oaGVpZ2h0TGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGhlaWdodExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gaGVpZ2h0TGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRIZWlnaHQocHQueCwgcHQueSwgcHQueik7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBjbGFpbSB0aGF0IHRoZSBncm91bmQgaGVpZ2h0IGlzIGB6YCBhdCBwb2ludCBgeGAsYHlgLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gZXZlbnR1YWxseSBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30gYWZ0ZXIgc29cbiAqIGdyb3VuZCBoZWlnaHRzIGdldCBleHRyYXBvbGF0ZWQgYWNyb3NzIHRoZSBlbnRpcmUgRmllbGQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFkgY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgaGVpZ2h0IG9mIHRoZSBncm91bmQgYXQgcG9zaXRpb24gYHhgLGB5YFxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5wdXNoKHsgeDogeCwgeTogeSwgejogeiB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYWRkaXRpb25hbCBncm91bmQgc3RhY2tzIHRvIHRoZSBmaWVsZCdzIGdyb3VuZCBzdGFja3MuXG4gKiBUaGUgZ3JvdW5kTGlzdCBpcyBhbiBhcnJheSBvZiBkYXRhIG9iamVjdHMuICBFYWNoIG9iamVjdCBuZWVkcyB4LFxuICogeSBhbmQgeiBwcm9wZXJ0aWVzLCBhbmQgYSAnc3RhY2snIHByb3BlcnR5LCBlYWNoIG1hdGNoaW5nIHRoZVxuICogY29ycmVzcG9uZGluZyBhcmcgdG8gYWRkR3JvdW5kU3RhY2suXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHJlcGxhY2UgaWYgcmVwbGFjZSBpcyB0cnV0aHksIGRpc2NhcmQgZXhpc3RpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBncm91bmQgcG9pbnRzIGZpcnN0LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFja3MgPSBmdW5jdGlvbihncm91bmRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBncm91bmRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGdyb3VuZExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kU3RhY2socHQueCwgcHQueSwgcHQuc3RhY2spO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRTdGFja3MoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBncm91bmQgc3RhY2sgYXQgeCx5LCBzdGFydGluZyBhdCBoZWlnaHQgei5cbiAqIFRoZSBzdGFjayBpcyBhbiBhcnJheSBvZiB0d28tZWxlbWVudCBhcnJheXMgd2l0aCBhIE1hdGVyaWFsXG4gKiBhbmQgYSBkZXB0aCBudW1iZXIsIGxpa2UgdGhpczpcbiAqIFtcbiAqICAgICBbTWF0ZXJpYWwubGVhZkxpdHRlciwgMC4zXSxcbiAqICAgICBbTWF0ZXJpYWwuZGlydCwgMy41XSxcbiAqICAgICBbTWF0ZXJpYWwuc3RvbmUsIDRdXG4gKiBdXG4gKiBUaGF0IHB1dHMgYSBsZWFmbGl0dGVyIGxheWVyIDAuMyB1bml0cyBkZWVwIG9uIGEgMy41LXVuaXRcbiAqIGRlZXAgZGlydCBsYXllciwgd2hpY2ggaXMgb24gYSBzdG9uZSBsYXllci4gIElmIHRoZSBmaW5hbFxuICogbGF5ZXIncyBkZXB0aCBpcyB6ZXJvLCB0aGF0IGxheWVyIGlzIGFzc3VtZWQgdG8gZ28gYWxsIHRoZVxuICogd2F5IHRvIG1pblouXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBjYWxjR3JvdW5kKCkgYWZ0ZXIuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oeCwgeSwgc3RhY2spIHtcbiAgICAvLyBUT0RPOiBjaGVjayBmb3IgdmFsaWRpdHlcbiAgICB0aGlzLl9ncm91bmRTdGFja3MucHVzaCh7IHg6IHgsICB5OiB5LCAgc3RhY2s6IHN0YWNrIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBoZWlnaHQuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIGhlaWdodCBjbGFpbXMgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0uXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBmaW5kIGhlaWdodCBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgYWxsb3dpbmcgZWFjaFxuICAgICAgICAvLyBrbm93biBncm91bmQgaGVpZ2h0IHRvIFwidm90ZVwiIHVzaW5nIHRoZSBpbnZlcnNlIG9mXG4gICAgICAgIC8vIGl0J3Mgc3F1YXJlZCBkaXN0YW5jZSBmcm9tIHRoZSBjZW50cmUgb2YgdGhlIGJsb2NrLlxuICAgICAgICB2YXIgaCwgZHgsIGR5LCBkaXN0LCB2b3RlU2l6ZTtcbiAgICAgICAgdmFyIGJaID0gMDtcbiAgICAgICAgdmFyIHZvdGVzID0gMDtcbiAgICAgICAgZm9yICh2YXIgZ2g9MDsgZ2ggPCB0aGlzLl9ncm91bmRIZWlnaHRzLmxlbmd0aDsgZ2grKykge1xuICAgICAgICAgICAgaCA9IHRoaXMuX2dyb3VuZEhlaWdodHNbZ2hdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIGgueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBoLnk7XG4gICAgICAgICAgICBkaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICB2b3RlU2l6ZSA9IDEgLyBkaXN0O1xuICAgICAgICAgICAgYlogKz0gaC56ICogdm90ZVNpemU7XG4gICAgICAgICAgICB2b3RlcyArPSB2b3RlU2l6ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgZGl2aWRlIHRvIGZpbmQgdGhlIGF2ZXJhZ2VcbiAgICAgICAgYlogPSBiWiAvIHZvdGVzO1xuXG4gICAgICAgIC8vIGJsb2NrLWlzaCBoZWlnaHRzOiByb3VuZCB0byB0aGUgbmVhcmVzdCBfYlpcbiAgICAgICAgdmFyIGRpZmZaID0gYlogLSB0aGlzLm1pblo7XG4gICAgICAgIGJaID0gdGhpcy5taW5aICsgTWF0aC5yb3VuZChkaWZmWiAvIHRoaXMuX2JaKSAqIHRoaXMuX2JaO1xuXG4gICAgICAgIC8vIG9rYXkgbm93IHdlIGtub3cgYSBoZWlnaHQhICBzZXQgaXRcbiAgICAgICAgdGhpcy5zZXRCbG9ja0hlaWdodChibG9jaywgYlopO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIHN0YWNrcy4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgc3RhY2tzIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZFN0YWNrIGFkZEdyb3VuZFN0YWNrfS5cbiAqXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRTdGFja3MgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIG1ha2UgdGhlIHN0YWNrIGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBjb3B5aW5nIHRoZVxuICAgICAgICAvLyBuZWFyZXN0IGRlZmluZWQgc3RhY2suXG4gICAgICAgIHZhciBzLCBkeCwgZHksIHRoaXNEaXN0LCBiZXN0U3RhY2s7XG4gICAgICAgIHZhciBiZXN0RGlzdCA9IHRoaXMud1ggKyB0aGlzLndZICsgdGhpcy53WjtcbiAgICAgICAgYmVzdERpc3QgPSBiZXN0RGlzdCAqIGJlc3REaXN0O1xuICAgICAgICBmb3IgKHZhciBncz0wOyBncyA8IHRoaXMuX2dyb3VuZFN0YWNrcy5sZW5ndGg7IGdzKyspIHtcbiAgICAgICAgICAgIHMgPSB0aGlzLl9ncm91bmRTdGFja3NbZ3NdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIHMueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBzLnk7XG4gICAgICAgICAgICB0aGlzRGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgaWYgKHRoaXNEaXN0IDwgYmVzdERpc3QpIHtcbiAgICAgICAgICAgICAgICBiZXN0U3RhY2sgPSBzO1xuICAgICAgICAgICAgICAgIGJlc3REaXN0ID0gdGhpc0Rpc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBva2F5IHdlIGdvdCBhIHN0YWNrLlxuICAgICAgICB0aGlzLnNldEdyb3VuZFN0YWNrKGJsb2NrLCBiZXN0U3RhY2suc3RhY2spO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLl9jYWxjQ2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY2FsY3VsYXRlIHRoZSBjZW50cmUgb2YgdGhlIGZpZWxkIGFuZCByZWNvcmQgaXQgYXMgLmNlbnRlclxuICAgIHRoaXMuY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICh0aGlzLm1pblggKyB0aGlzLm1heFgpIC8gMixcbiAgICAgICAgKHRoaXMubWluWSArIHRoaXMubWF4WSkgLyAyLFxuICAgICAgICAodGhpcy5taW5aICsgdGhpcy5tYXhaKSAvIDJcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKGJsb2NrLCBzdGFjaykge1xuICAgIHZhciBsYXllckxldmVsID0gYmxvY2suZ1swXS56O1xuICAgIGZvciAodmFyIGxheWVyID0gMDsgbGF5ZXIgPCBzdGFjay5sZW5ndGg7IGxheWVyKyspIHtcbiAgICAgICAgYmxvY2suZ1tsYXllcl0gPSB7XG4gICAgICAgICAgICB6OiBsYXllckxldmVsLFxuICAgICAgICAgICAgZHo6IHN0YWNrW2xheWVyXVsxXSxcbiAgICAgICAgICAgIG06IHN0YWNrW2xheWVyXVswXSxcbiAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIGxheWVyTGV2ZWwgLT0gc3RhY2tbbGF5ZXJdWzFdO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5yZWJ1aWxkQ2h1bmtzID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgaWYgKGJsb2NrLmdbbF0uY2h1bmspIHtcbiAgICAgICAgICAgIGJsb2NrLmdbbF0uY2h1bmsucmVidWlsZCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRCbG9ja0hlaWdodCA9IGZ1bmN0aW9uKGJsb2NrLCB6KSB7XG4gICAgLy8gdG8gc2V0IHRoZSBibG9jayBncm91bmQgaGVpZ2h0LCB3ZSBuZWVkIHRvIGZpbmQgdGhlIGJsb2NrJ3NcbiAgICAvLyBjdXJyZW50IGdyb3VuZCBoZWlnaHQgKHRoZSB6IG9mIHRoZSB0b3AgbGF5ZXIpLCB3b3JrIG91dCBhXG4gICAgLy8gZGlmZiBiZXR3ZWVuIHRoYXQgYW5kIHRoZSBuZXcgaGVpZ2h0LCBhbmQgYWRkIHRoYXQgZGlmZiB0b1xuICAgIC8vIGFsbCB0aGUgbGF5ZXJzLlxuICAgIHZhciBkWiA9IHogLSBibG9jay5nWzBdLno7XG4gICAgdmFyIGRlcHRoO1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBibG9jay5nW2xdLnogKz0gZFo7XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmdldEJsb2NrID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIC8vIHJldHVybiB0aGUgYmxvY2sgdGhhdCBpbmNsdWRlcyAgeCx5XG4gICAgdmFyIGd4ID0gTWF0aC5mbG9vciggKHggLSB0aGlzLm1pblgpIC8gdGhpcy5fYlggKTtcbiAgICB2YXIgZ3kgPSBNYXRoLmZsb29yKCAoeSAtIHRoaXMubWluWSkgLyB0aGlzLl9iWSApO1xuICAgIHJldHVybiAodGhpcy5fZ1tneF1bZ3ldKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW52b2tlIHRoZSBjYWxsYmFjayBlYWNoIGJsb2NrIGluIHR1cm5cbi8vIGNhbGxiYWNrIHNob3VsZCBsb29rIGxpa2U6IGZ1bmN0aW9uKGVyciwgYmxvY2spIHsgLi4uIH1cbi8vIGlmIGVyciBpcyBudWxsIGV2ZXJ5dGhpbmcgaXMgZmluZS4gaWYgZXJyIGlzIG5vdCBudWxsLCB0aGVyZVxuLy8gd2FzIGFuIGVycm9yLlxuU2NhcGVGaWVsZC5wcm90b3R5cGUuZWFjaEJsb2NrID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcsIG9yZGVyKSB7XG4gICAgaWYgKG9yZGVyID09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcmRlciA9ICd4dXAteXVwJztcbiAgICB9XG4gICAgaWYgKHRoaXNBcmcgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAob3JkZXIgPT0gJ3h1cC15dXAnKSB7XG4gICAgICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLl9nLmxlbmd0aDsgZ3grKykge1xuICAgICAgICAgICAgZm9yICh2YXIgZ3kgPSAwOyBneSA8IHRoaXMuX2dbMF0ubGVuZ3RoOyBneSsrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBudWxsLCB0aGlzLl9nW2d4XVtneV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVGaWVsZDtcblxuXG5cblxuIiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5cblxuLy8gREVCVUdcbnZhciBTY2FwZUl0ZW1zID0gcmVxdWlyZSgnLi9pdGVtdHlwZXMnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGl0ZW0gdGhhdCBtaWdodCBhcHBlYXIgaW4gYSBTY2FwZS5cbiAqXG4gKiBUaGlzIHdpbGwgY3JlYXRlIChhbmQgaW50ZXJuYWxseSBjYWNoZSkgYSBzZXQgb2YgbWVzaGVzIHVzaW5nXG4gKiB0aGUgbGlua2VkIGl0ZW0gdHlwZSwgYW5kIHBvc2l0aW9uIHRoZW0gYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWRcbiAqIHgseSBsb2NhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV9IHNjZW5lIFRoZSBTY2FwZVNjZW5lIHRoZSBpdGVtIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayB0aGF0IG93bnMgdGhpcyBpdGVtXG4gKiBAcGFyYW0ge1NjYXBlSXRlbVR5cGV9IGl0ZW1UeXBlIFR5cGUgb2YgdGhpcyBpdGVtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUl0ZW0oaXRlbVR5cGUsIHgsIHksIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIHRoaXMuX3R5cGUgPSBpdGVtVHlwZTtcbiAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMuX3BvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIDApO1xuXG4gICAgaWYgKHR5cGVvZiB0aGlzLl9vcHRzLmNsaWNrSWQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRoaXMuY2xpY2tJZCA9IHRoaXMuX29wdHMuY2xpY2tJZDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBtYXliZSBoYXZlIGEgc2V0IG9mIG1lc2hlcyBmb3IgZWFjaCBzY2VuZSwgc28gYW4gaXRlbVxuICAgIC8vIGNhbiBiZSBpbiBtdWx0aXBsZSBzY2VuZXM/XG4gICAgdGhpcy5fY3JlYXRlTmV3KCk7XG5cbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluaGVyaXRhbmNlXG5TY2FwZUl0ZW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVJdGVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlSXRlbTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5fY3JlYXRlTmV3ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX21lc2hlcyAmJiB0aGlzLl9tZXNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl9kaXNwb3NlT2ZNZXNoZXMoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX2NsaWNrUG9pbnRzICYmIHRoaXMuX2NsaWNrUG9pbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbiAgICB9XG5cbiAgICB2YXIgdGhpbmdzID0gdGhpcy5fdHlwZSh0aGlzLl9vcHRzKTtcblxuICAgIHRoaXMuX21lc2hlcyA9IHRoaW5ncy5tZXNoZXM7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fY2xpY2tQb2ludHMgPSB0aGluZ3MuY2xpY2tQb2ludHM7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBjcC5wb3NpdGlvbi5jb3B5KHRoaXMuX3Bvcyk7XG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlRnJvbVNjZW5lKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVkT3B0aW9ucykge1xuICAgIHRoaXMubWVyZ2VPcHRpb25zKHVwZGF0ZWRPcHRpb25zKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVJdGVtLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbih6KSB7XG4gICAgdGhpcy5fcG9zLnNldFooeik7XG4gICAgdGhpcy5lYWNoTWVzaChmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgY3AucG9zaXRpb24uY29weSh0aGlzLl9wb3MpO1xuICAgIH0sIHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLmFkZFRvU2NlbmUgPSBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBzY2VuZS5hZGQobSk7XG4gICAgfSk7XG4gICAgdGhpcy5lYWNoQ2xpY2tQb2ludChmdW5jdGlvbihjcCkge1xuICAgICAgICBzY2VuZS5hZGQoY3ApO1xuICAgIH0pO1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlSXRlbS5wcm90b3R5cGUuX2Rpc3Bvc2VPZk1lc2hlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaE1lc2goZnVuY3Rpb24obSkge1xuICAgICAgICBpZiAobS5nZW9tZXRyeSkgbS5nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgIG0uZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2Rpc3Bvc2UnfSk7XG4gICAgfSk7XG4gICAgLy8gVE9ETzogZGlzcG9zZSBvZiBjbGlja1BvaW50c1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl9kaXNwb3NlT2ZDbGlja1BvaW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgaWYgKGNwLmdlb21ldHJ5KSBjcC5nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgIGNwLmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdkaXNwb3NlJ30pO1xuICAgIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLnJlbW92ZUZyb21TY2VuZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zY2VuZSkge1xuICAgICAgICB0aGlzLmVhY2hNZXNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lLnJlbW92ZShtKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMuZWFjaENsaWNrUG9pbnQoZnVuY3Rpb24oY3ApIHtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lLnJlbW92ZShjcCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB0aGlzLl9zY2VuZSA9IG51bGw7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUl0ZW0ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NlbmUgPSB0aGlzLl9zY2VuZTsgLy8gcmVtZW1iZXIgdGhpcyBiZWNhdXNlIHJlbW92ZUZyb21TY2VuZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aWxsIGRlbGV0ZSB0aGlzLl9zY2VuZVxuICAgIGlmICh0aGlzLl9zY2VuZSkgeyB0aGlzLnJlbW92ZUZyb21TY2VuZSgpOyB9XG4gICAgdGhpcy5fZGlzcG9zZU9mTWVzaGVzKCk7XG4gICAgdGhpcy5fZGlzcG9zZU9mQ2xpY2tQb2ludHMoKTtcblxuICAgIHRoaXMuX2NyZWF0ZU5ldygpO1xuICAgIGlmIChzY2VuZSkgeyB0aGlzLmFkZFRvU2NlbmUoc2NlbmUpOyB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGRvIHNvbWV0aGluZyB0byBlYWNoIGNsaWNrUG9pbnRcblNjYXBlSXRlbS5wcm90b3R5cGUuZWFjaENsaWNrUG9pbnQgPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGlmICh0aGlzLl9jbGlja1BvaW50cykge1xuICAgICAgICBmb3IgKHZhciBjcCA9IDA7IGNwIDwgdGhpcy5fY2xpY2tQb2ludHMubGVuZ3RoOyBjcCsrKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMuX2NsaWNrUG9pbnRzW2NwXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGRvIHNvbWV0aGluZyB0byBlYWNoIG1lc2hcblNjYXBlSXRlbS5wcm90b3R5cGUuZWFjaE1lc2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGlmICh0aGlzLl9tZXNoZXMpIHtcbiAgICAgICAgZm9yICh2YXIgbSA9IDA7IG0gPCB0aGlzLl9tZXNoZXMubGVuZ3RoOyBtKyspIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5fbWVzaGVzW21dKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW07XG4iLCJcbi8qKlxuICogQSBiYWcgb2YgaXRlbSB0eXBlcyB0aGF0IHNjYXBlcyBjYW4gaGF2ZSBpbiB0aGVtLiAgQW4gaXRlbSB0eXBlXG4gKiBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgb3B0aW9ucyBkZXNjcmliaW5nIHRoZSBpdGVtLCBhbmQgcmV0dXJuc1xuICogYW4gYXJyYXkgb2YgbWVzaGVzIHRoYXQgYXJlIHRoZSBpdGVtIChhdCAwLDAsMCkuXG4gKlxuICogV2hlbiBhIFNjYXBlSXRlbSBpcyBpbnN0YW50aWF0ZWQgaXQgaW52b2tlcyB0aGUgYXBwcm9wcmlhdGUgaXRlbVxuICogdHlwZSB0byBnZXQgbWVzaGVzLCB0aGVuIHJlLXBvc2l0aW9ucyB0aGUgbWVzaGVzIGF0IHRoZVxuICogYXBwcm9wcmlhdGUgeCx5LHogbG9jYXRpb24uXG4gKlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgU2NhcGVJdGVtcyA9IHtcbiAgICAvLyBkb2N1bWVudGF0aW9uIGZvciBpdGVtcyBhcmUgaW4gdGhlIC4vaXRlbXR5cGVzLyogZmlsZXNcbiAgICBjdWJlOiAgICAgICAgcmVxdWlyZSgnLi9pdGVtdHlwZXMvY3ViZScpLFxuICAgIHRyZWU6ICAgICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy90cmVlJyksXG4gICAgY3JhbmU6ICAgICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL2NyYW5lJyksXG4gICAgc29pbFBpdDogICAgIHJlcXVpcmUoJy4vaXRlbXR5cGVzL3NvaWxwaXQnKSxcblxuICAgIGxhYmVsOiAgICAgICByZXF1aXJlKCcuL2l0ZW10eXBlcy9sYWJlbCcpXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlSXRlbXM7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi8uLi9zdHVmZicpO1xudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogVE9ETzogd29yayBvdXQgaG93IHRvIGRvYyB0aGVzZSBhZGRvbnNcbiAgKiBAcGFyYW0ge29iamVjdH0gcGFyZW50UGFydHMgdGhlIG1lc2ggYW5kIGNsaWNrUG9pbnQgY29sbGVjdGlvblxuICAqICAgICAgICB0aGF0IGlzIHRoZSB0aGluZyB0aGUgY2FtZXJhIGlzIG1vdW50ZWQgb25cbiAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB0aGUgcGFyZW50J3Mgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlXG4gICogICAgICAgIHBhcmVudCBvYmplY3QgZmFjdG9yeVxuICAqL1xuZnVuY3Rpb24gU2NhcGVDYW1lcmFBZGRvbihwYXJlbnRQYXJ0cywgb3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwgeyBtZXNoTmFtZXM6IFtdIH07XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBtaWdodCBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuY2FtZXJhIGlzIGEgc3RyaW5nLFxuXHQvLyB1c2UgdGhhdCBzdHJpbmcgYXMgdGhlIGNsaWNrRGF0YSBhbmQgdXNlIGRlZmF1bHRzIGZvclxuXHQvLyBldmVyeXRoaW5nIGVsc2UuXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5jYW1lcmEgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5jYW1lcmEgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5jYW1lcmEgfTtcblx0fVxuXG5cdHZhciBjID0ge307XG5cblx0Yy5uYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdjYW1lcmEnO1xuXG5cdGMuaGVpZ2h0ID0gb3B0aW9ucy5jYW1lcmEuaGVpZ2h0IHx8IDM7XG5cdGMueCA9IDA7XG5cdGMueSA9IDA7XG5cblx0Yy5ib2R5V2lkdGggPSBvcHRpb25zLmNhbWVyYS5zaXplIHx8IDI7XG5cdGMuYm9keUhlaWdodCA9IGMuYm9keVdpZHRoO1xuXHRjLmJvZHlEZXB0aCA9IDAuNjcgKiBjLmJvZHlXaWR0aDtcblxuXHRjLmxlbnNMZW5ndGggPSAwLjMzICogYy5ib2R5V2lkdGg7XG5cdGMubGVuc1JhZGl1cyA9IE1hdGgubWluKGMuYm9keVdpZHRoLCBjLmJvZHlIZWlnaHQpIC8gNDtcblxuXHRjLmdsYXNzTGVuZ3RoID0gYy5sZW5zUmFkaXVzIC8gODtcblx0Yy5nbGFzc1JhZGl1cyA9IGMubGVuc1JhZGl1cyAtIGMuZ2xhc3NMZW5ndGg7XG5cblx0Yy5ib2R5U3R1ZmYgPSBvcHRpb25zLmNhbWVyYS5ib2R5IHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdGMubGVuc1N0dWZmID0gb3B0aW9ucy5jYW1lcmEubGVucyB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXHRjLmdsYXNzU3R1ZmYgPSBvcHRpb25zLmNhbWVyYS5nbGFzcyB8fCBTY2FwZVN0dWZmLmdsYXNzO1xuXG5cdGMuY2xpY2tEYXRhID0gb3B0aW9ucy5jYW1lcmEuY2xpY2tEYXRhIHx8IG51bGw7XG5cblx0Ly8gdGhlIHBvc2l0aW9uIG9mIHRoZSBjYW1lcmEgcmVsYXRpdmUgdG8gdGhlIHBhcmVudCBvYmplY3Rcblx0aWYgKGkudG93ZXJIZWlnaHQgJiYgaS50b3dlcldpZHRoICYmIGkucmluZ0gpIHtcblx0XHQvLyBpdCdzIGEgY3JhbmUsIHByb2JhYmx5LiAgUG9zaXRpb24gdGhlIGNhbWVyYSBiZWxvdyB0aGVcblx0XHQvLyByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIGNyYW5lIHRvd2VyLlxuXHRcdGMuaGVpZ2h0ID0gb3B0aW9ucy5jYW1lcmEuaGVpZ2h0IHx8IChpLnRvd2VySGVpZ2h0IC0gaS5yaW5nSCAtIDIgKiBjLmJvZHlIZWlnaHQpO1xuXHRcdGMueCA9IChpLnRvd2VyV2lkdGggKyBjLmJvZHlEZXB0aCArIGMubGVuc0xlbmd0aCkvMjtcblx0fVxuXG5cdHZhciByZWxvY2F0ZSA9IG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihjLngsIGMueSwgYy5oZWlnaHQpO1xuXG5cdC8vIHRoZSBjYW1lcmEgYm9keVxuXHR2YXIgYm9keUdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoYy5ib2R5RGVwdGgsIGMuYm9keVdpZHRoLCBjLmJvZHlIZWlnaHQpO1xuXHRib2R5R2VvbS5hcHBseU1hdHJpeCggbmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKC0xICogKGMuYm9keURlcHRoLzIgLSAoYy5ib2R5RGVwdGggLSBjLmxlbnNMZW5ndGgpLzIpLCAwLCBjLmJvZHlIZWlnaHQvMilcblx0XHQubXVsdGlwbHkocmVsb2NhdGUpXG5cdCk7XG5cdHZhciBib2R5ID0gbmV3IFRIUkVFLk1lc2goYm9keUdlb20sIGMuYm9keVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaChib2R5KTtcblx0cGFyZW50UGFydHMubWVzaGVzLnB1c2goYm9keSk7XG5cblx0Ly8gdGhlIGxlbnNcblx0dmFyIGxlbnNHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoYy5sZW5zUmFkaXVzLCBjLmxlbnNSYWRpdXMsIGMubGVuc0xlbmd0aCk7XG5cdGxlbnNHZW9tLmFwcGx5TWF0cml4KCBuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oYy5sZW5zTGVuZ3RoLzIgKyAoYy5ib2R5RGVwdGggLSBjLmxlbnNMZW5ndGgpLzIsIDAsIGMuYm9keUhlaWdodC8yKVxuXHRcdC5tdWx0aXBseShyZWxvY2F0ZSlcblx0XHQubXVsdGlwbHkobmV3IE00KCkubWFrZVJvdGF0aW9uWihNYXRoLlBJLzIpKVxuXHQpO1xuXHR2YXIgbGVucyA9IG5ldyBUSFJFRS5NZXNoKGxlbnNHZW9tLCBjLmxlbnNTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2gobGVucyk7XG5cdHBhcmVudFBhcnRzLm1lc2hlcy5wdXNoKGxlbnMpO1xuXG5cdC8vIHRoZSBnbGFzcyBsZW5zIGJpdFxuXHR2YXIgZ2xhc3NHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoYy5nbGFzc1JhZGl1cywgYy5nbGFzc1JhZGl1cywgYy5nbGFzc0xlbmd0aCk7XG5cdGdsYXNzR2VvbS5hcHBseU1hdHJpeCggbmV3IE00KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAuNSAqIChjLmJvZHlEZXB0aCArIGMubGVuc0xlbmd0aCArIGMuZ2xhc3NMZW5ndGgpLCAwLCBjLmJvZHlIZWlnaHQvMilcblx0XHQubXVsdGlwbHkocmVsb2NhdGUpXG5cdFx0Lm11bHRpcGx5KG5ldyBNNCgpLm1ha2VSb3RhdGlvblooTWF0aC5QSS8yKSlcblx0KTtcblx0dmFyIGdsYXNzID0gbmV3IFRIUkVFLk1lc2goZ2xhc3NHZW9tLCBjLmdsYXNzU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKGdsYXNzKTtcblx0cGFyZW50UGFydHMubWVzaGVzLnB1c2goZ2xhc3MpO1xuXG5cdC8vIHRoZSBjYW1lcmEgc2hvdWxkIGJlIGNsaWNrYWJsZVxuXHRpZiAoYy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2FtQ2xpY2sgPSBTY2FwZUNsaWNrYWJsZShjLm5hbWUsIGMuY2xpY2tEYXRhLCBjLngsIGMueSwgYy5oZWlnaHQgKyBjLmJvZHlIZWlnaHQvMik7XG5cdFx0cGFyZW50UGFydHMuY2xpY2tQb2ludHMucHVzaChjYW1DbGljayk7XG5cdH1cblxuXHRpLmNhbWVyYSA9IGM7XG5cblx0cmV0dXJuIHBhcmVudFBhcnRzO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUNhbWVyYUFkZG9uO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJldHVybnMgYSBDbGlja2FibGUgb2JqZWN0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdXNlZCB0byBzcGVjaWZ5IHByb3BlcnRpZXMgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5kaWFtZXRlcj0xIERpYW1ldGVyIG9mIHRydW5rIChhLmsuYS4gREJIKVxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuaGVpZ2h0PTEwIEhlaWdodCBvZiB0cmVlXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnRydW5rTWF0ZXJpYWw9U2NhcGVTdHVmZi53b29kIFdoYXQgdG8gbWFrZSB0aGUgdHJ1bmsgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmxlYWZNYXRlcmlhbD1TY2FwZVN0dWZmLmZvbGlhZ2UgV2hhdCB0byBtYWtlIHRoZSBmb2xpYWdlIG91dCBvZlxuICpcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgU2NhcGVJdGVtcy50cmVlXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ2xpY2thYmxlKG5hbWUsIGNsaWNrRGF0YSwgeCwgeSwgeikge1xuXHR2YXIgY2xpY2tlciA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXG5cdHZhciBob3ZlclJhZGl1cyA9IDU7XG5cdHZhciBjbGlja1JhZGl1cyA9IDM7XG5cdHZhciBsaW5lTGVuZ3RoID0gODtcblxuXHR2YXIgdHJhbnNsYXRlID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oeCwgeSwgeik7XG5cblx0aG92ZXJNYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7IGNvbG9yOiAweGZmZmYwMCwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuMyB9KVxuXHR2YXIgaG92ZXJHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KGhvdmVyUmFkaXVzKTtcblx0aG92ZXJHZW9tLmFwcGx5TWF0cml4KHRyYW5zbGF0ZSk7XG5cdHZhciBob3ZlckJ1YmJsZSA9IG5ldyBUSFJFRS5NZXNoKGhvdmVyR2VvbSwgaG92ZXJNYXRlcmlhbCk7XG5cdGhvdmVyQnViYmxlLnZpc2libGUgPSBmYWxzZTtcblx0Ly8gaG92ZXJCdWJibGUudXNlckRhdGEudHlwZSA9ICdob3ZlcmJ1YmJsZSc7XG5cdGNsaWNrZXIuYWRkKGhvdmVyQnViYmxlKTtcblxuXHR2YXIgY2xpY2tNYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7IGNvbG9yOiAweGZmZmZmZiwgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNCB9KVxuXHRjbGlja01hdGVyaWFsLmRlcHRoVGVzdCA9IGZhbHNlO1xuXHR2YXIgY2xpY2tHZW9tID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KGNsaWNrUmFkaXVzLCAzMiwgMjQpO1xuXHRjbGlja0dlb20uYXBwbHlNYXRyaXgodHJhbnNsYXRlKTtcblx0dmFyIGNsaWNrQnViYmxlID0gbmV3IFRIUkVFLk1lc2goY2xpY2tHZW9tLCBjbGlja01hdGVyaWFsKTtcblx0Ly8gY2xpY2tCdWJibGUudXNlckRhdGEudHlwZSA9ICdjbGlja2J1YmJsZSc7XG5cdGNsaWNrQnViYmxlLnVzZXJEYXRhLmNsaWNrRGF0YSA9IGNsaWNrRGF0YTtcblx0Y2xpY2tlci5hZGQoY2xpY2tCdWJibGUpO1xuXG5cdC8vIC8vIGFkZCB0aGUgbmFtZSBzdHVmZiB0byBjbGlja0J1YmJsZSBpbnN0ZWFkXG5cdGNsaWNrQnViYmxlLnVzZXJEYXRhLm5hbWUgPSBuYW1lO1xuXHRjbGlja0J1YmJsZS51c2VyRGF0YS5vZmZzZXQgPSB0cmFuc2xhdGU7XG5cdC8vIGNsaWNrQnViYmxlLnVzZXJEYXRhLm5hbWVQb3NpdGlvbiA9ICggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHQvLyBcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiBjbGlja1JhZGl1cy8zLCAwLCBsaW5lTGVuZ3RoICsgY2xpY2tSYWRpdXMvMilcblx0Ly8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gKTtcblxuXHQvLyAvLy8vLy8vLy8vIGlkZW50aWZpZXIgZmxhZ1xuXHQvLyB2YXIgaWRlbnQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuXHQvLyAvLy8vLy8vLy8vLyBoYXZpbmcgdGV4dCBhbHdheXMgdGhlcmUgYnV0IHVzdWFsbHkgaW52aXNpYmxlIHdhcyBNVVJERVJJTkcgcmFtIHVzYWdlLlxuXHQvLyAvLyAvLyBuYW1lIHRleHRcblx0Ly8gLy8gdmFyIG5hbWVHZW9tID0gbmV3IFRIUkVFLlRleHRHZW9tZXRyeShuYW1lLCB7XG5cdC8vIC8vIFx0Zm9udDogJ2hlbHZldGlrZXInLFxuXHQvLyAvLyBcdHNpemU6IGNsaWNrUmFkaXVzLFxuXHQvLyAvLyBcdGhlaWdodDogMC4xXG5cdC8vIC8vIH0pO1xuXHQvLyAvLyBuYW1lR2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHQvLyAvLyBcdC5tYWtlVHJhbnNsYXRpb24oLTEgKiBjbGlja1JhZGl1cy8zLCAwLCBsaW5lTGVuZ3RoICsgY2xpY2tSYWRpdXMvMilcblx0Ly8gLy8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyAvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gLy8gKTtcblx0Ly8gLy8gdmFyIG5hbWUgPSBuZXcgVEhSRUUuTWVzaChuYW1lR2VvbSwgU2NhcGVTdHVmZi51aVdoaXRlKTtcblx0Ly8gLy8gaWRlbnQuYWRkKG5hbWUpO1xuXG5cblx0Ly8gLy8gcG9pbnRlclxuXHQvLyB2YXIgbGluZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeSgwLjEsIDAuMSwgbGluZUxlbmd0aCk7XG5cdC8vIGxpbmVHZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpXG5cdC8vIFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAwLCBsaW5lTGVuZ3RoIC8gMilcblx0Ly8gXHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHQvLyBcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0Ly8gKTtcblxuXHQvLyB2YXIgbGluZSA9IG5ldyBUSFJFRS5NZXNoKGxpbmVHZW9tLCBTY2FwZVN0dWZmLnVpV2hpdGUpO1xuXHQvLyAvLyBsaW5lLnVzZXJEYXRhLnR5cGUgPSAnbmFtZWxpbmUnO1xuXHQvLyBpZGVudC5hZGQobGluZSk7XG5cblx0Ly8gaWRlbnQudmlzaWJsZSA9IGZhbHNlO1xuXHQvLyAvLyBpZGVudC51c2VyRGF0YS50eXBlID0gJ25hbWVhc3NlbWJseSc7XG5cdC8vIGNsaWNrZXIuYWRkKGlkZW50KTtcblxuXHRjbGlja2VyLnZpc2libGUgPSBmYWxzZTtcblx0cmV0dXJuIGNsaWNrZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDbGlja2FibGU7IiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHRyZWVQYXJ0cyB0aGUgbWVzaCBhbmQgY2xpY2tQb2ludCBjb2xsZWN0aW9uIHRoYXQgaXMgYSB0cmVlXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHRyZWUgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlIHRyZWUtbWFrZXJcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlRGVuZHJvbWV0ZXJBZGRvbih0cmVlUGFydHMsIG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdC8vIHN0YXJ0IHdpdGggc3RhbmRhcmQgdHJlZSBtZXNoZXNcblx0dmFyIGkgPSBpbnRlcm5hbHMgfHwgeyBtZXNoTmFtZXM6IFtdIH07XG5cblx0aS5kaWFtID0gaS5kaWFtIHx8IDE7XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBtaWdodCBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuZGVuZHJvbWV0ZXIgaXMgYSBzdHJpbmcsXG5cdC8vIHVzZSB0aGF0IHN0cmluZyBhcyB0aGUgY2xpY2tEYXRhIGFuZCB1c2UgZGVmYXVsdHMgZm9yXG5cdC8vIGV2ZXJ5dGhpbmcgZWxzZS5cblx0aWYgKHR5cGVvZiBvcHRpb25zLmRlbmRyb21ldGVyID09PSAnc3RyaW5nJykge1xuXHRcdG9wdGlvbnMuZGVuZHJvbWV0ZXIgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5kZW5kcm9tZXRlciB9O1xuXHR9XG5cblx0dmFyIGQgPSB7fTtcblxuXHRkLm5hbWUgPSBvcHRpb25zLmRlbmRyb21ldGVyLm5hbWUgfHwgJ2RlbmRyb21ldGVyJztcblxuXHRkLmJhbmRXaWR0aCA9IG9wdGlvbnMuZGVuZHJvbWV0ZXIud2lkdGggfHwgMC41O1xuXHRkLmJhbmRSYWRpdXMgPSBpLnRydW5rUmFkaXVzICsgMC4yICogZC5iYW5kV2lkdGg7XG5cdGQuYmFuZEhlaWdodCA9IE1hdGgubWluKG9wdGlvbnMuZGVuZHJvbWV0ZXIuaGVpZ2h0IHx8IDEuNSwgaS50cnVua0hlaWdodCAtIGQuYmFuZFdpZHRoLzIpO1xuXG5cdGQubWV0ZXJSYWRpdXMgPSBkLmJhbmRXaWR0aDtcblx0ZC5tZXRlckhlaWdodCA9IGQuYmFuZFdpZHRoICogMztcblxuXHRkLm1vdW50UmFkaXVzID0gZC5tZXRlclJhZGl1cyAqIDEuMTtcblx0ZC5tb3VudFdpZHRoID0gZC5tZXRlckhlaWdodCAvIDQ7XG5cblx0ZC5iYW5kU3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLmJhbmQgfHwgU2NhcGVTdHVmZi5tZXRhbDtcblx0ZC5tb3VudFN0dWZmID0gb3B0aW9ucy5kZW5kcm9tZXRlci5tb3VudCB8fCBTY2FwZVN0dWZmLmJsYWNrO1xuXHRkLm1ldGVyU3R1ZmYgPSBvcHRpb25zLmRlbmRyb21ldGVyLm1ldGVyIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cblx0ZC5jbGlja0RhdGEgPSBvcHRpb25zLmRlbmRyb21ldGVyLmNsaWNrRGF0YSB8fCBudWxsO1xuXG5cdC8vIHRoZSBzdGVlbCBiYW5kXG5cdHZhciBiYW5kR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQuYmFuZFJhZGl1cywgZC5iYW5kUmFkaXVzLCBkLmJhbmRXaWR0aCwgMTIsIDEpO1xuXHRiYW5kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgZC5iYW5kSGVpZ2h0KS5tdWx0aXBseShyb3RhdGUpKTtcblx0dmFyIGJhbmQgPSBuZXcgVEhSRUUuTWVzaChiYW5kR2VvbSwgZC5iYW5kU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlckJhbmQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJhbmQpO1xuXG5cdC8vIHRoZSBtZXRlciBpdHNlbGZcblx0dmFyIG1ldGVyQm90dG9tR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubWV0ZXJSYWRpdXMsIGQubWV0ZXJSYWRpdXMsIDAuNjcgKiBkLm1ldGVySGVpZ2h0LCA3LCAxKTtcblx0bWV0ZXJCb3R0b21HZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMgKyBkLm1ldGVyUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLm1ldGVySGVpZ2h0LzYpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgbWV0ZXJCb3R0b20gPSBuZXcgVEhSRUUuTWVzaChtZXRlckJvdHRvbUdlb20sIGQubWV0ZXJTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2RlbmRyb21ldGVyQm90dG9tJyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChtZXRlckJvdHRvbSk7XG5cblx0dmFyIG1ldGVyVG9wR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGQubWV0ZXJSYWRpdXMvNSwgZC5tZXRlclJhZGl1cywgMC4zMyAqIGQubWV0ZXJIZWlnaHQsIDcsIDEpO1xuXHRtZXRlclRvcEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvMiArIGQubWV0ZXJIZWlnaHQvNikubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBtZXRlclRvcCA9IG5ldyBUSFJFRS5NZXNoKG1ldGVyVG9wR2VvbSwgZC5tZXRlclN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJUb3AnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1ldGVyVG9wKTtcblxuXHQvLyB0aGUgbW91bnRcblx0dmFyIG1vdW50QmFuZEdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShkLm1vdW50UmFkaXVzLCBkLm1vdW50UmFkaXVzLCBkLm1vdW50V2lkdGgsIDcsIDEpO1xuXHRtb3VudEJhbmRHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbihkLmJhbmRSYWRpdXMgKyBkLm1ldGVyUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLmJhbmRXaWR0aC8yICsgZC5tb3VudFdpZHRoLzIpLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgbW91bnRCYW5kID0gbmV3IFRIUkVFLk1lc2gobW91bnRCYW5kR2VvbSwgZC5tb3VudFN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnZGVuZHJvbWV0ZXJNb3VudEJhbmQnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKG1vdW50QmFuZCk7XG5cblx0dmFyIG1vdW50R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShkLm1vdW50UmFkaXVzLCBkLm1vdW50UmFkaXVzLzIsIGQubW91bnRXaWR0aCk7XG5cdG1vdW50R2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oZC5iYW5kUmFkaXVzLCAwLCBkLmJhbmRIZWlnaHQgKyBkLmJhbmRXaWR0aC8yICsgZC5tb3VudFdpZHRoLzIpKTtcblx0dmFyIG1vdW50ID0gbmV3IFRIUkVFLk1lc2gobW91bnRHZW9tLCBkLm1vdW50U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdkZW5kcm9tZXRlck1vdW50Jyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChtb3VudCk7XG5cblx0Ly8gdGhlIGRlbmRybyBzaG91bGQgYmUgY2xpY2thYmxlXG5cdGlmIChkLmNsaWNrRGF0YSkge1xuXHRcdHZhciBkZW5kcm9DbGljayA9IFNjYXBlQ2xpY2thYmxlKGQubmFtZSwgZC5jbGlja0RhdGEsIGQuYmFuZFJhZGl1cyArIGQubWV0ZXJSYWRpdXMsIDAsIGQuYmFuZEhlaWdodCArIGQubWV0ZXJIZWlnaHQvNik7XG5cdFx0dHJlZVBhcnRzLmNsaWNrUG9pbnRzLnB1c2goZGVuZHJvQ2xpY2spO1xuXHR9XG5cblx0aS5kZW5kcm9tZXRlciA9IGQ7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVEZW5kcm9tZXRlckFkZG9uO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vLi4vc3R1ZmYnKTtcblxudmFyIE00ID0gVEhSRUUuTWF0cml4NDtcblxudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9jbGlja2FibGUnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIFRPRE86IHdvcmsgb3V0IGhvdyB0byBkb2MgdGhlc2UgYWRkb25zXG4gICogQHBhcmFtIHtvYmplY3R9IHRyZWVQYXJ0cyB0aGUgbWVzaCBhbmQgY2xpY2tQb2ludCBjb2xsZWN0aW9uIHRoYXQgaXMgYSB0cmVlXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgdGhlIHRyZWUgb3B0aW9uc1xuICAqIEBwYXJhbSB7b2JqZWN0fSBpbnRlcm5hbHMgaW50ZXJuYWwgY2FsY3VsYXRpb25zIG1ha2UgYnkgdGhlIHRyZWUtbWFrZXJcbiAgKi9cbmZ1bmN0aW9uIFNjYXBlU2FwRmxvd01ldGVyQWRkb24odHJlZVBhcnRzLCBvcHRpb25zLCBpbnRlcm5hbHMpIHtcblxuXHQvLyBzdGFydCB3aXRoIHN0YW5kYXJkIHRyZWUgbWVzaGVzXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHsgbWVzaE5hbWVzOiBbXSB9O1xuXG5cdGkuZGlhbSA9IGkuZGlhbSB8fCAxO1xuXG5cdC8vIHNwZWNpYWwgY29udmVuaWVuY2U6IGlmIG9wdGlvbnMuc2FwZmxvd21ldGVyIGlzIGEgc3RyaW5nLFxuXHQvLyB1c2UgdGhhdCBzdHJpbmcgYXMgdGhlIGNsaWNrRGF0YSBhbmQgdXNlIGRlZmF1bHRzIGZvclxuXHQvLyBldmVyeXRoaW5nIGVsc2UuXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zYXBmbG93bWV0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0b3B0aW9ucy5zYXBmbG93bWV0ZXIgPSB7IGNsaWNrRGF0YTogb3B0aW9ucy5zYXBmbG93bWV0ZXIgfTtcblx0fVxuXG5cdHZhciBzID0ge307XG5cblx0cy5uYW1lID0gb3B0aW9ucy5zYXBmbG93bWV0ZXIubmFtZSB8fCAnc2FwIGZsb3cgbWV0ZXInO1xuXG5cdHMuYmFzZVcgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5zaXplIHx8IDE7XG5cdHMuY2FwVyA9IHMuYmFzZVcgKiAxLjI7XG5cdHMuYmFzZVRoaWNrID0gcy5iYXNlVyAvIDI7XG5cdHMuY2FwVGhpY2sgPSBzLmJhc2VUaGljayAqIDEuMTtcblx0cy5sZW5ndGggPSBzLmJhc2VXICogMjtcblx0cy5iYXNlTCA9IHMubGVuZ3RoICogMC42O1xuXHRzLmNhcEwgPSAocy5sZW5ndGggLSBzLmJhc2VMKSAvIDI7XG5cdHMuaGVpZ2h0ID0gTWF0aC5taW4ob3B0aW9ucy5zYXBmbG93bWV0ZXIuaGVpZ2h0IHx8IDMsIGkudHJ1bmtIZWlnaHQgLSBzLmxlbmd0aCk7XG5cblx0cy5iYXNlU3R1ZmYgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5iYXNlIHx8IFNjYXBlU3R1ZmYubWV0YWw7XG5cdHMuY2FwU3R1ZmYgPSBvcHRpb25zLnNhcGZsb3dtZXRlci5jYXAgfHwgU2NhcGVTdHVmZi5ibGFjaztcblxuXHRzLmNsaWNrRGF0YSA9IG9wdGlvbnMuc2FwZmxvd21ldGVyLmNsaWNrRGF0YSB8fCBudWxsO1xuXG5cdHZhciBiYXNlR2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzLmJhc2VXLCBzLmJhc2VUaGljaywgcy5iYXNlTCk7XG5cdGJhc2VHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTC8yKVxuXHQpO1xuXHR2YXIgYmFzZSA9IG5ldyBUSFJFRS5NZXNoKGJhc2VHZW9tLCBzLmJhc2VTdHVmZik7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3NhcGZsb3dtZXRlcmJhc2UnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKGJhc2UpO1xuXG5cdHZhciB0b3BDYXBHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KHMuY2FwVywgcy5jYXBUaGljaywgcy5jYXBMKTtcblx0dG9wQ2FwR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgLTEgKiAoaS50cnVua1JhZGl1cyArIHMuYmFzZVRoaWNrLzIpLCBzLmhlaWdodCArIHMuYmFzZUwgKyBzLmNhcEwvMilcblx0KTtcblx0dmFyIHRvcENhcCA9IG5ldyBUSFJFRS5NZXNoKHRvcENhcEdlb20sIHMuY2FwU3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdzYXBmbG93bWV0ZXJ0b3BjYXAnKTtcblx0dHJlZVBhcnRzLm1lc2hlcy5wdXNoKHRvcENhcCk7XG5cblx0dmFyIGJvdHRvbUNhcEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkocy5jYXBXLCBzLmNhcFRoaWNrLCBzLmNhcEwpO1xuXHRib3R0b21DYXBHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpXG5cdFx0Lm1ha2VUcmFuc2xhdGlvbigwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5jYXBMLzIpXG5cdCk7XG5cdHZhciBib3R0b21DYXAgPSBuZXcgVEhSRUUuTWVzaChib3R0b21DYXBHZW9tLCBzLmNhcFN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnc2FwZmxvd21ldGVyYm90dG9tY2FwJyk7XG5cdHRyZWVQYXJ0cy5tZXNoZXMucHVzaChib3R0b21DYXApO1xuXG5cdC8vIGNsaWNrYWJsZVxuXHRpZiAocy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2xpY2sgPSBTY2FwZUNsaWNrYWJsZShzLm5hbWUsIHMuY2xpY2tEYXRhLCAwLCAtMSAqIChpLnRydW5rUmFkaXVzICsgcy5iYXNlVGhpY2svMiksIHMuaGVpZ2h0ICsgcy5iYXNlTC8yKTtcblx0XHR0cmVlUGFydHMuY2xpY2tQb2ludHMucHVzaChjbGljayk7XG5cdH1cblxuXHRpLnNhcGZsb3dtZXRlciA9IHM7XG5cblx0cmV0dXJuIHRyZWVQYXJ0cztcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTYXBGbG93TWV0ZXJBZGRvbjtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbnZhciBNNCA9IFRIUkVFLk1hdHJpeDQ7XG5cbnZhciBTY2FwZUNhbWVyYUFkZG9uID0gcmVxdWlyZSgnLi9hZGRvbnMvY2FtZXJhJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgbWVzaCBhcnJheSBmb3IgYSB0b3dlciBjcmFuZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHVzZWQgdG8gc3BlY2lmeSBwcm9wZXJ0aWVzIG9mIHRoZSBjcmFuZS5cblxuICogQHBhcmFtIHt3aWR0aH0gb3B0aW9ucy53aWR0aD0yIFdpZHRoIG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2hlaWdodH0gb3B0aW9ucy5oZWlnaHQ9NTAgSGVpZ2h0IG9mIGNyYW5lIHRvd2VyXG4gKiBAcGFyYW0ge2xlbmd0aH0gb3B0aW9ucy5sZW5ndGg9NDAgTGVuZ3RoIG9mIGNyYW5lIGJvb20sIGZyb20gdGhlXG4gKiAgICAgICAgY3JhbmUncyBjZW50cmUgYXhpcyB0byB0aGUgdGlwXG4gKiBAcGFyYW0ge3JvdGF0aW9ufSBvcHRpb25zLnJvdGF0aW9uPTAgRGVncmVlcyBvZiBib29tIHJvdGF0aW9uLFxuICogICAgICAgIGNvdW50ZWQgY2xvY2t3aXNlIGZyb20gdGhlICt2ZSBZIGRpcmVjdGlvbiAoYXdheSBmcm9tXG4gKiAgICAgICAgdGhlIGNhbWVyYSlcbiAqIEBwYXJhbSB7Y291bnRlcndlaWdodExlbmd0aH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0TGVuZ3RoPWxlbmd0aC80XG4gKiAgICAgICAgTGVuZ3RoIG9mIHRoZSBjb3VudGVyd2VpZ2h0IGJvb20sIGZyb20gdGhlIGNyYW5lJ3MgY2VudHJlXG4gKiAgICAgICAgYXhpcyB0byB0aGUgZW5kIG9mIHRoZSBjb3VudGVyd2VpZ2h0XG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnN0cnV0cz1TY2FwZVN0dWZmLmdsb3NzQmxhY2tcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIHN0cnV0cyBpbiB0aGUgdG93ZXIgYW5kIGJvb20gb3V0IG9mXG4gICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5iYXNlPVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGJhc2Ugb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnJpbmc9U2NhcGVTdHVmZi5wbGFzdGljXG4gKiAgICAgICAgV2hhdCB0byBtYWtlIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jYWJpbj1TY2FwZVN0dWZmLnBsYXN0aWNcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNhYmluIG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy53aW5kb3c9U2NhcGVTdHVmZi5nbGFzc1xuICogICAgICAgIFdoYXQgdG8gbWFrZSB0aGUgY2FiaW4gd2luZG93IG91dCBvZlxuICogQHBhcmFtIHtUSFJFRS5NYXRlcmlhbH0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0PVNjYXBlU3R1ZmYuY29uY3JldGVcbiAqICAgICAgICBXaGF0IHRvIG1ha2UgdGhlIGNvdW50ZXJ3ZWlnaHQgb3V0IG9mXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmNyYW5lXG4gKi9cbmZ1bmN0aW9uIFNjYXBlQ3JhbmVGYWN0b3J5KG9wdGlvbnMpIHtcblxuXHR2YXIgY3JhbmUgPSB7IG1lc2hlczogW10sIGNsaWNrUG9pbnRzOiBbXSB9O1xuXG5cdHZhciBpID0geyBtZXNoTmFtZXM6IFtdIH07XG5cblx0aS50b3dlcldpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAyO1xuXHRpLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDUwO1xuXHRpLmxlbmd0aCA9IG9wdGlvbnMubGVuZ3RoIHx8IDQwO1xuXHRpLmNvdW50ZXJ3ZWlnaHRMZW5ndGggPSBvcHRpb25zLmNvdW50ZXJ3ZWlnaHRMZW5ndGggfHwgKGkubGVuZ3RoIC8gNCk7XG5cdGkuc3RydXRTdHVmZiA9IG9wdGlvbnMuc3RydXRzIHx8IFNjYXBlU3R1ZmYuZ2xvc3NCbGFjaztcblx0aS5iYXNlU3R1ZmYgPSBvcHRpb25zLmJhc2UgfHwgU2NhcGVTdHVmZi5jb25jcmV0ZTtcblx0aS5yaW5nU3R1ZmYgPSBvcHRpb25zLnJpbmcgfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXHRpLmNhYmluU3R1ZmYgPSBvcHRpb25zLmNhYmluIHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblx0aS53aW5kb3dTdHVmZiA9IG9wdGlvbnMud2luZG93IHx8IFNjYXBlU3R1ZmYuZ2xhc3M7XG5cdGkuY291bnRlcndlaWdodFN0dWZmID0gb3B0aW9ucy5jb3VudGVyd2VpZ2h0IHx8IFNjYXBlU3R1ZmYuY29uY3JldGU7XG5cdGkucm90YXRpb24gPSAtMSAqIChvcHRpb25zLnJvdGF0aW9uIHx8IDApICogTWF0aC5QSSAvIDE4MDtcblxuXHRpLnRvd2VySGVpZ2h0ID0gaS5oZWlnaHQ7XG5cdGkuYmFzZVcgPSBpLnRvd2VyV2lkdGggKiAzO1xuXHRpLmJhc2VIID0gaS50b3dlcldpZHRoICogMjsgLy8gaGFsZiBvZiB0aGUgaGVpZ2h0IHdpbGwgYmUgXCJ1bmRlcmdyb3VuZFwiXG5cblx0aS5wb2xlUiA9IGkudG93ZXJXaWR0aCAvIDEwO1xuXG5cdGkucmluZ1IgPSAoKGkudG93ZXJXaWR0aCAvIDIpICogTWF0aC5TUVJUMikgKyAxLjMgKiBpLnBvbGVSO1xuXHRpLnJpbmdIID0gaS50b3dlcldpZHRoIC8gNTtcblxuXHRpLmJvb21MID0gaS5sZW5ndGg7IC8vIGxlbmd0aCBvZiBjcmFuZSBib29tXG5cdGkuY3diTCA9IGkuY291bnRlcndlaWdodExlbmd0aDsgLy8gbGVuZ3RoIG9mIGNvdW50ZXJ3ZWlnaHQgYm9vbVxuXHRpLnJvZEwgPSBpLmJvb21MICsgaS5jd2JMO1xuXHRpLmN3VyA9IGkudG93ZXJXaWR0aCAtIDMqaS5wb2xlUjtcblx0aS5jd0ggPSBpLnRvd2VyV2lkdGggKiAxLjU7XG5cdGkuY3dMID0gaS50b3dlcldpZHRoICogMS41O1xuXG5cdGkuY2FiaW5XID0gaS50b3dlcldpZHRoO1xuXHRpLmNhYmluSCA9IGkudG93ZXJXaWR0aCAqIDEuMjU7XG5cdGkuY2FiaW5MID0gaS5jYWJpbkg7XG5cblx0Ly8gdGhpcyBpcyBmb3Igcm90YXRpbmcgdGhlIGNyYW5lIGJvb21cblx0dmFyIHJvdGF0ZSA9IG5ldyBNNCgpLm1ha2VSb3RhdGlvblooaS5yb3RhdGlvbik7XG5cblx0Ly8gdGhpcyBpcyBmb3IgbWFraW5nIGN5bGluZGVycyBnbyB1cHJpZ2h0IChDeWxpbmRlckdlb21ldHJ5IHN0YXJ0cyBseWluZyBhbG9uZyB0aGUgWSBheGlzKVxuXHR2YXIgY3lsaW5kZXJSb3RhdGUgPSBuZXcgTTQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMik7XG5cblx0Ly8vLy8vLy8vLyB0aGUgYmFzZVxuXHR2YXIgYmFzZUdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5iYXNlVywgaS5iYXNlVywgaS5iYXNlSCk7XG5cdHZhciBiYXNlID0gbmV3IFRIUkVFLk1lc2goYmFzZUdlb20sIGkuYmFzZVN0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnYmFzZScpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChiYXNlKTtcblxuXHQvLy8vLy8vLy8vIHRoZSB2ZXJ0aWNhbCBtYXN0XG5cdC8vIG1ha2Ugb25lIHBvbGUgdG8gc3RhcnQgd2l0aFxuXHR2YXIgcG9sZUdlb20gPSBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeShpLnBvbGVSLCBpLnBvbGVSLCBpLnRvd2VySGVpZ2h0KTtcblx0cG9sZUdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkudG93ZXJXaWR0aC8yLCBpLnRvd2VyV2lkdGgvMiwgaS50b3dlckhlaWdodC8yKS5tdWx0aXBseShjeWxpbmRlclJvdGF0ZSkpO1xuXG5cdC8vIE1ha2UgdGhyZWUgbW9yZSBwb2xlcyBieSBjb3B5aW5nIHRoZSBmaXJzdCBwb2xlIGFuZCByb3RhdGluZyBhbm90aGVyIDkwZGVncyBhcm91bmQgdGhlIGNlbnRyZVxuXHR2YXIgcG9sZTtcblx0dmFyIHJvdGF0ZUFyb3VuZFogPSBuZXcgTTQoKS5tYWtlUm90YXRpb25aKE1hdGguUEkvMik7XG5cdGZvciAodmFyIHAgPSAwOyBwIDwgNDsgcCsrKSB7XG5cdFx0cG9sZSA9IG5ldyBUSFJFRS5NZXNoKHBvbGVHZW9tLCBpLnN0cnV0U3R1ZmYpO1xuXHRcdGkubWVzaE5hbWVzLnB1c2goJ3BvbGUnICsgcCk7XG5cdFx0Y3JhbmUubWVzaGVzLnB1c2gocG9sZSk7XG5cdFx0cG9sZUdlb20gPSBwb2xlR2VvbS5jbG9uZSgpO1xuXHRcdHBvbGVHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZUFyb3VuZFopO1xuXHR9XG5cblxuXHQvLy8vLy8vLy8vIHRoZSByaW5nIGF0IHRoZSB0b3Agb2YgdGhlIHRvd2VyXG5cdHZhciByaW5nR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkucmluZ1IsIGkucmluZ1IsIGkucmluZ0gsIDEyLCAxLCB0cnVlKTtcblx0cmluZ0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIGkudG93ZXJIZWlnaHQgLSBpLnJpbmdILzIpLm11bHRpcGx5KGN5bGluZGVyUm90YXRlKSk7XG5cdGkucmluZ1N0dWZmLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyaW5nJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKHJpbmdHZW9tLCBpLnJpbmdTdHVmZikpO1xuXG5cblx0Ly8vLy8vLy8vLyB0aGUgaG9yaXpvbnRhbCBib29tXG5cdC8vIG1ha2Ugb25lIHJvZCB0byBzdGFydCB3aXRoXG5cdHZhciB0b3BSb2RHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5wb2xlUiwgaS5wb2xlUiwgaS5yb2RMKTtcblxuXHQvLyB0b3Agcm9kXG5cdHRvcFJvZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIChpLnJvZEwvMikgLSBpLmN3YkwsIGkudG93ZXJIZWlnaHQgKyBpLnBvbGVSICsgMC41ICogaS50b3dlcldpZHRoKSk7XG5cdGxlZnRSb2RHZW9tID0gdG9wUm9kR2VvbS5jbG9uZSgpO1xuXHRyaWdodFJvZEdlb20gPSB0b3BSb2RHZW9tLmNsb25lKCk7XG5cblx0dG9wUm9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RUb3AnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2godG9wUm9kR2VvbSwgaS5zdHJ1dFN0dWZmKSk7XG5cblx0Ly8gYm90dG9tIGxlZnQgcm9kXG5cdGxlZnRSb2RHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigtMC41ICogaS50b3dlcldpZHRoICsgaS5wb2xlUiwgMCwgLTAuNSAqIGkudG93ZXJXaWR0aCkpO1xuXHRsZWZ0Um9kR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdyb2RMZWZ0Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGxlZnRSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBib3R0b20gcmlnaHQgcm9kXG5cdHJpZ2h0Um9kR2VvbS5hcHBseU1hdHJpeChuZXcgTTQoKS5tYWtlVHJhbnNsYXRpb24oMC41ICogaS50b3dlcldpZHRoIC0gaS5wb2xlUiwgMCwgLTAuNSAqIGkudG93ZXJXaWR0aCkpO1xuXHRyaWdodFJvZEdlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgncm9kUmlnaHQnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2gocmlnaHRSb2RHZW9tLCBpLnN0cnV0U3R1ZmYpKTtcblxuXHQvLyBlbmQgb2YgdGhlIGJvb21cblx0dmFyIGVuZEdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS50b3dlcldpZHRoLCBpLnBvbGVSLCAwLjUgKiBpLnRvd2VyV2lkdGggKyBpLnBvbGVSICsgaS5wb2xlUik7XG5cdGVuZEdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKDAsIGkuYm9vbUwsIGkudG93ZXJIZWlnaHQgKyAwLjI1ICogaS50b3dlcldpZHRoICsgaS5wb2xlUikpO1xuXHRlbmRHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2Jvb21DYXAnKTtcblx0Y3JhbmUubWVzaGVzLnB1c2gobmV3IFRIUkVFLk1lc2goZW5kR2VvbSwgaS5zdHJ1dFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNvdW50ZXJ3ZWlnaHRcblx0dmFyIGN3R2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpLmN3VywgaS5jd0wsIGkuY3dIKTtcblx0Y3dHZW9tLmFwcGx5TWF0cml4KG5ldyBNNCgpLm1ha2VUcmFuc2xhdGlvbigwLCAxLjAwMSAqIChpLmN3TC8yIC0gaS5jd2JMKSwgaS50b3dlckhlaWdodCkpO1xuXHRjd0dlb20uYXBwbHlNYXRyaXgocm90YXRlKTtcblx0aS5tZXNoTmFtZXMucHVzaCgnY291bnRlcndlaWdodCcpO1xuXHRjcmFuZS5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChjd0dlb20sIGkuY291bnRlcndlaWdodFN0dWZmKSk7XG5cblxuXHQvLy8vLy8vLy8vIGNhYmluXG5cdHZhciBjYWJpbkdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoaS5jYWJpblcsIGkuY2FiaW5MLCBpLmNhYmluSCk7XG5cdHZhciB3aW5kb3dHZW9tID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGkuY2FiaW5XICogMS4xLCBpLmNhYmluTCAqIDAuNiwgaS5jYWJpbkggKiAwLjYpO1xuXHRjYWJpbkdlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkuY2FiaW5XLzIgKyBpLnBvbGVSLCAwLCBpLmNhYmluSC8yICsgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyBpLnBvbGVSKSk7XG5cdHdpbmRvd0dlb20uYXBwbHlNYXRyaXgobmV3IE00KCkubWFrZVRyYW5zbGF0aW9uKGkuY2FiaW5XLzIgKyBpLnBvbGVSLCBpLmNhYmluTCAqIDAuMjUsIGkuY2FiaW5IICogMC42ICsgaS50b3dlckhlaWdodCArIGkucG9sZVIgKyBpLnBvbGVSKSk7XG5cdGNhYmluR2VvbS5hcHBseU1hdHJpeChyb3RhdGUpO1xuXHR3aW5kb3dHZW9tLmFwcGx5TWF0cml4KHJvdGF0ZSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2NhYmluJyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGNhYmluR2VvbSwgaS5jYWJpblN0dWZmKSk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2NhYmlud2luZG93Jyk7XG5cdGNyYW5lLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKHdpbmRvd0dlb20sIGkud2luZG93U3R1ZmYpKTtcblxuXHQvLy8vLy8vLy8vIGNhbWVyYVxuXHRpZiAodHlwZW9mIG9wdGlvbnMuY2FtZXJhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGNyYW5lID0gU2NhcGVDYW1lcmFBZGRvbihjcmFuZSwgb3B0aW9ucywgaSk7XG5cdH1cblxuXHQvLyByZXR1cm4gYWxsIHRoZSBjcmFuZSBiaXRzLlxuXHRyZXR1cm4gY3JhbmU7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3JhbmVGYWN0b3J5O1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcbnZhciBTY2FwZVN0dWZmID0gcmVxdWlyZSgnLi4vc3R1ZmYnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBSZXR1cm5zIGEgY3ViZSBtZXNoIG9mIHRoZSBzcGVjaWZpZWQgc2l6ZSBhbmQgbWF0ZXJpYWwuXG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBUaGUgbGVuZ3RoIG9mIGEgc2lkZSBvZiB0aGUgY3ViZS4gIERlZmF1bHRzIHRvIDEuXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBtYXRlcmlhbCBXaGF0IHRoZSBtYWtlIHRoZSBjdWJlIG91dCBvZi4gIERlZmF1bHRzIHRvIGBTY2FwZS5TdHVmZi5nZW5lcmljYFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgTm90IHVzZWQuXG4gKlxuICogQGZ1bmN0aW9uXG4gKiBAbmFtZSBTY2FwZUl0ZW1zLmN1YmVcbiAqL1xuZnVuY3Rpb24gU2NhcGVDdWJlRmFjdG9yeShvcHRpb25zKSB7XG4gICAgLy8gY29uc3RydWN0IGEgbWVzaCBcInNpdHRpbmcgb25cIiB0aGUgcG9pbnQgMCwwLDBcblxuICAgIHNpemUgPSBvcHRpb25zLnNpemUgfHwgMTtcbiAgICBtYXRlcmlhbCA9IG9wdGlvbnMubWF0ZXJpYWwgfHwgU2NhcGVTdHVmZi5nZW5lcmljO1xuXG4gICAgLy8gbWFrZXMgYSBjdWJlIGNlbnRlcmVkIG9uIDAsMCwwXG4gICAgdmFyIGdlb20gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoc2l6ZSwgc2l6ZSwgc2l6ZSk7XG5cbiAgICAvLyB0cmFuc2Zvcm0gaXQgdXAgYSBiaXQsIHNvIHdlJ3JlIGNlbnRlcmVkIG9uIHggPSAwIGFuZCB5ID0gMCwgYnV0IGhhdmUgdGhlIF9ib3R0b21fIGZhY2Ugc2l0dGluZyBvbiB6ID0gMC5cbiAgICBnZW9tLmFwcGx5TWF0cml4KCBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBzaXplLzIpICk7XG5cbiAgICAvLyByZXR1cm4gaXQgaW4gYSBkYXRhIG9iamVjdFxuXHRyZXR1cm4geyBtZXNoZXM6IFtuZXcgVEhSRUUuTWVzaChnZW9tLCBtYXRlcmlhbCldLCBjbGlja1BvaW50czogW10gfTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDdWJlRmFjdG9yeTtcbiIsIlxudmFyIFRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG52YXIgU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4uL3N0dWZmJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMubGFiZWxcbiAqL1xuZnVuY3Rpb24gU2NhcGVMYWJlbEZhY3Rvcnkob3B0aW9ucywgaW50ZXJuYWxzKSB7XG5cblx0dmFyIGxhYmVsID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLnggPSBvcHRpb25zLnggfHwgMDtcblx0aS55ID0gb3B0aW9ucy55IHx8IDA7XG5cdGkueiA9IG9wdGlvbnMueiB8fCAwO1xuXHRpLm9mZnNldCA9IG9wdGlvbnMub2Zmc2V0IHx8IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG5cblx0aS5sYWJlbFRleHQgPSBvcHRpb25zLnRleHQ7XG5cdGkudGV4dFNpemUgPSBvcHRpb25zLnNpemUgfHwgMjtcblx0aS50ZXh0V2lkdGggPSBpLnRleHRTaXplIC8gMTA7XG5cblx0aS5saW5lUmFkaXVzID0gaS50ZXh0V2lkdGggLyAyO1xuXHRpLmxpbmVMZW5ndGggPSBvcHRpb25zLmhlaWdodCB8fCBNYXRoLm1heCg4LCBpLnRleHRTaXplKTtcblxuXHRpLnRleHRTdHVmZiA9IG9wdGlvbnMubGV0dGVycyB8fCBTY2FwZVN0dWZmLnVpV2hpdGU7XG5cdGkubGluZVN0dWZmID0gb3B0aW9ucy5wb2ludGVyIHx8IGkudGV4dFN0dWZmO1xuXG5cdHZhciB0cmFuc2xhdGUgPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbihpLngsIGkueSwgaS56KS5tdWx0aXBseShpLm9mZnNldCk7XG5cblx0Ly8gdGV4dCBmb3IgdGhlIGxhYmVsXG5cdHZhciBuYW1lR2VvbSA9IG5ldyBUSFJFRS5UZXh0R2VvbWV0cnkoaS5sYWJlbFRleHQsIHtcblx0XHRmb250OiAnaGVsdmV0aWtlcicsXG5cdFx0c2l6ZTogaS50ZXh0U2l6ZSxcblx0XHRoZWlnaHQ6IDAuMVxuXHR9KTtcblx0bmFtZUdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKC0xICogaS50ZXh0U2l6ZS8zLCAwLCBpLmxpbmVMZW5ndGggKyBpLnRleHRTaXplLzIpXG5cdFx0Lm11bHRpcGx5KHRyYW5zbGF0ZSlcblx0XHQubXVsdGlwbHkobmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlUm90YXRpb25YKE1hdGguUEkvMikpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ2xhYmVsdGV4dCcpO1xuXHRsYWJlbC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChuYW1lR2VvbSwgaS50ZXh0U3R1ZmYpKTtcblxuXHQvLyBwb2ludGVyXG5cdHZhciBsaW5lR2VvbSA9IG5ldyBUSFJFRS5DeWxpbmRlckdlb21ldHJ5KGkubGluZVJhZGl1cywgaS5saW5lUmFkaXVzLCBpLmxpbmVMZW5ndGgpO1xuXHRsaW5lR2VvbS5hcHBseU1hdHJpeCggbmV3IFRIUkVFLk1hdHJpeDQoKVxuXHRcdC5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS5saW5lTGVuZ3RoIC8gMilcblx0XHQubXVsdGlwbHkodHJhbnNsYXRlKVxuXHRcdC5tdWx0aXBseShuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VSb3RhdGlvblgoTWF0aC5QSS8yKSlcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgnbGFiZWxwb2ludGVyJyk7XG5cdGxhYmVsLm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGxpbmVHZW9tLCBpLmxpbmVTdHVmZikpO1xuXG5cdHJldHVybiBsYWJlbDtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVMYWJlbEZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xudmFyIFNjYXBlQ2xpY2thYmxlID0gcmVxdWlyZSgnLi9hZGRvbnMvY2xpY2thYmxlJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMuc29pbFBpdFxuICovXG5mdW5jdGlvbiBTY2FwZVNvaWxQaXRGYWN0b3J5KG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciBwaXQgPSB7IG1lc2hlczogW10sIGNsaWNrUG9pbnRzOiBbXSB9O1xuXG5cdHZhciBpID0gaW50ZXJuYWxzIHx8IHt9O1xuXHRpLm1lc2hOYW1lcyA9IGkubWVzaE5hbWVzIHx8IFtdO1xuXG5cdGkubmFtZSA9IG9wdGlvbnMubmFtZSB8fCAnc29pbCBwaXQnO1xuXG5cdGkuYm94UyA9IG9wdGlvbnMuc2l6ZSB8fCAyO1xuXHRpLmJveEQgPSBpLmJveFMvMjtcblx0aS5ib3hIID0gaS5ib3hTOyAvLyBoZWlnaHQgb2ZmIGdyb3VuZFxuXG5cdGkucGlwZVIgPSBpLmJveEQvMztcblx0aS5waXBlRCA9IG9wdGlvbnMuZGVwdGggfHwgMjsgLy8gcGlwZSBkZXB0aCBpbnRvIGdyb3VuZFxuXHRpLnBpcGVMID0gaS5waXBlRCArIGkuYm94SDtcblx0aS5waXBlTCA9IGkucGlwZUw7XG5cblx0aS5ib3hTdHVmZiA9IG9wdGlvbnMuYm94IHx8IFNjYXBlU3R1ZmYucGxhc3RpYztcblx0aS5waXBlU3R1ZmYgPSBvcHRpb25zLnBpcGUgfHwgU2NhcGVTdHVmZi5wbGFzdGljO1xuXG5cdC8vIGN5bGluZGVyLXVwcmlnaHQgcm90YXRpb25cblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdC8vIHRoZSBib3hcblx0aS5ib3hHID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KGkuYm94UywgaS5ib3hELCBpLmJveFMpO1xuXHRpLmJveEcuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKGkuYm94Uy8zLCAwLCBpLmJveEggKyBpLmJveFMvMilcblx0KTtcblx0aS5tZXNoTmFtZXMucHVzaCgnYm94Jyk7XG5cdHBpdC5tZXNoZXMucHVzaChuZXcgVEhSRUUuTWVzaChpLmJveEcsIGkuYm94U3R1ZmYpKTtcblxuXHQvLyB0aGUgcGlwZVxuXHRpLnBpcGVHID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5waXBlUiwgaS5waXBlUiwgaS5waXBlTCk7XG5cdGkucGlwZUcuYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KClcblx0XHQubWFrZVRyYW5zbGF0aW9uKDAsIDAsIChpLmJveEggLSBpLnBpcGVEKS8yKVxuXHRcdC5tdWx0aXBseShyb3RhdGUpXG5cdCk7XG5cdGkubWVzaE5hbWVzLnB1c2goJ3BpcGUnKTtcblx0cGl0Lm1lc2hlcy5wdXNoKG5ldyBUSFJFRS5NZXNoKGkucGlwZUcsIGkucGlwZVN0dWZmKSk7XG5cblx0Ly8gbWFrZSB0aGUgcGl0IGNsaWNrYWJsZVxuXHRpZiAob3B0aW9ucy5jbGlja0RhdGEpIHtcblx0XHR2YXIgY2xpY2sgPSBTY2FwZUNsaWNrYWJsZShpLm5hbWUsIG9wdGlvbnMuY2xpY2tEYXRhLCBpLmJveFMvMywgMCwgaS5ib3hIICsgaS5ib3hTLzIpO1xuXHRcdHBpdC5jbGlja1BvaW50cy5wdXNoKGNsaWNrKTtcblx0fVxuXG5cdHJldHVybiBwaXQ7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU29pbFBpdEZhY3Rvcnk7XG4iLCJcbnZhciBUSFJFRSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LlRIUkVFIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5USFJFRSA6IG51bGwpO1xudmFyIFNjYXBlU3R1ZmYgPSByZXF1aXJlKCcuLi9zdHVmZicpO1xuXG52YXIgU2NhcGVEZW5kcm9tZXRlckFkZG9uID0gcmVxdWlyZSgnLi9hZGRvbnMvZGVuZHJvbWV0ZXInKTtcbnZhciBTY2FwZVNhcEZsb3dNZXRlckFkZG9uID0gcmVxdWlyZSgnLi9hZGRvbnMvc2FwZmxvd21ldGVyJyk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogUmV0dXJucyBhIHRyZWUgbWVzaCBvZiB0aGUgc3BlY2lmaWVkIHNpemUgYW5kIGNvbG9yLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdXNlZCB0byBzcGVjaWZ5IHByb3BlcnRpZXMgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5kaWFtZXRlcj0xIERpYW1ldGVyIG9mIHRydW5rIChhLmsuYS4gREJIKVxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuaGVpZ2h0PTEwIEhlaWdodCBvZiB0cmVlXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLnRydW5rTWF0ZXJpYWw9U2NhcGVTdHVmZi53b29kIFdoYXQgdG8gbWFrZSB0aGUgdHJ1bmsgb3V0IG9mXG4gKiBAcGFyYW0ge1RIUkVFLk1hdGVyaWFsfSBvcHRpb25zLmxlYWZNYXRlcmlhbD1TY2FwZVN0dWZmLmZvbGlhZ2UgV2hhdCB0byBtYWtlIHRoZSBmb2xpYWdlIG91dCBvZlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnRlcm5hbHMgSWYgc3VwcGxpZWQsIHRoaXMgZmFjdG9yeSB3aWxsIHNhdmUgc29tZVxuICogICAgICAgIGludGVyaW0gY2FsY3VsYXRlZCB2YWx1ZXMgaW50byB0aGlzIG9iamVjdC4gIEUuZy5cbiAqICAgICAgICB0aGUgaGVpZ2h0IG9mIHRoZSBjYW5vcHksIHRoZSBNYXRlcmlhbCB0aGUgdHJ1bmsgaXMgbWFkZSBvdXRcbiAqICAgICAgICBvZiwgZXRjLiAgVGhpcyBjYW4gaGVscCBhbm90aGVyIFNjYXBlSXRlbVR5cGUgZmFjdG9yeSB1c2VcbiAqICAgICAgICB0aGlzIGFzIGEgc3RhcnRpbmcgcG9pbnQuXG4gKiBAcGFyYW0ge0FycmF5fSBpbnRlcm5hbHMubWVzaE5hbWVzIEFuIGFycmF5IG9mIG1lc2ggbmFtZXMsIGluIHRoZVxuICogICAgICAgIHNhbWUgb3JkZXIgYXMgdGhlIG1lc2ggbGlzdCByZXR1cm5lZCBieSB0aGUgZnVuY3Rpb24uICBUaGlzXG4gKiAgICAgICAgYWxsb3dzIGRvd25zdHJlYW0gZmFjdG9yeSBmdW5jdGlvbnMgdG8gaWRlbnRpZnkgbWVzaGVzIGluXG4gKiAgICAgICAgb3JkZXIgdG8gYWx0ZXIgdGhlbS5cbiAqXG4gKiBAZnVuY3Rpb25cbiAqIEBuYW1lIFNjYXBlSXRlbXMudHJlZVxuICovXG5mdW5jdGlvbiBTY2FwZVRyZWVGYWN0b3J5KG9wdGlvbnMsIGludGVybmFscykge1xuXG5cdHZhciB0cmVlID0geyBtZXNoZXM6IFtdLCBjbGlja1BvaW50czogW10gfTtcblxuXHR2YXIgaSA9IGludGVybmFscyB8fCB7fTtcblx0aS5tZXNoTmFtZXMgPSBpLm1lc2hOYW1lcyB8fCBbXTtcblxuXHRpLmRpYW0gPSBvcHRpb25zLmRpYW1ldGVyIHx8IDE7XG5cdGkuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMTA7XG5cdGkudHJ1bmtTdHVmZiA9IG9wdGlvbnMudHJ1bmsgfHwgU2NhcGVTdHVmZi53b29kO1xuXHRpLmNhbm9weVN0dWZmID0gb3B0aW9ucy5jYW5vcHkgfHwgU2NhcGVTdHVmZi50cmFuc3BhcmVudEZvbGlhZ2U7XG5cblx0aS5jYW5vcHlIZWlnaHQgPSBpLmhlaWdodCAvIDQ7XG5cdGkudHJ1bmtIZWlnaHQgPSBpLmhlaWdodCAtIGkuY2Fub3B5SGVpZ2h0O1xuXHRpLnRydW5rUmFkaXVzID0gMiAqIGkuZGlhbSAvIDI7XG5cdGkuY2Fub3B5UmFkaXVzID0gaS50cnVua1JhZGl1cyAqIDY7XG5cblx0Ly8gdHJhbnNmb3JtcyB3ZSBuZWVkOlxuXHQvLyByb3RhdGUgc28gaXQncyBoZWlnaHQgaXMgYWxvbmcgdGhlIFogYXhpcyAoQ3lsaW5kZXJHZW9tZXRyeSBzdGFydHMgbHlpbmcgYWxvbmcgdGhlIFkgYXhpcylcblx0dmFyIHJvdGF0ZSA9IG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVJvdGF0aW9uWChNYXRoLlBJLzIpO1xuXG5cdGkudHJ1bmtHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS50cnVua1JhZGl1cy8yLCBpLnRydW5rUmFkaXVzLCBpLnRydW5rSGVpZ2h0LCAxMik7XG5cdC8vIGNlbnRlciBvbiB4ID0gMCBhbmQgeSA9IDAsIGJ1dCBoYXZlIHRoZSBfYm90dG9tXyBmYWNlIHNpdHRpbmcgb24geiA9IDBcblx0dmFyIHRydW5rUG9zaXRpb24gPSBuZXcgVEhSRUUuTWF0cml4NCgpLm1ha2VUcmFuc2xhdGlvbigwLCAwLCBpLnRydW5rSGVpZ2h0LzIpO1xuXHRpLnRydW5rR2VvbS5hcHBseU1hdHJpeCh0cnVua1Bvc2l0aW9uLm11bHRpcGx5KHJvdGF0ZSkpO1xuXHR2YXIgdHJ1bmsgPSBuZXcgVEhSRUUuTWVzaChpLnRydW5rR2VvbSwgaS50cnVua1N0dWZmKTtcblx0aS5tZXNoTmFtZXMucHVzaCgndHJ1bmsnKTtcblx0dHJlZS5tZXNoZXMucHVzaCh0cnVuayk7XG5cblx0aS5jYW5vcHlHZW9tID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoaS5jYW5vcHlSYWRpdXMsIGkuY2Fub3B5UmFkaXVzLCBpLmNhbm9weUhlaWdodCwgMTIpO1xuXHQvLyBjZW50ZXIgb24geCA9IDAsIHkgPSAwLCBidXQgaGF2ZSB0aGUgY2Fub3B5IGF0IHRoZSB0b3Bcblx0dmFyIGNhbm9weVBvc2l0aW9uID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5tYWtlVHJhbnNsYXRpb24oMCwgMCwgaS5jYW5vcHlIZWlnaHQvMiArIGkuaGVpZ2h0IC0gaS5jYW5vcHlIZWlnaHQpO1xuXHRpLmNhbm9weUdlb20uYXBwbHlNYXRyaXgoY2Fub3B5UG9zaXRpb24ubXVsdGlwbHkocm90YXRlKSk7XG5cdHZhciBjYW5vcHkgPSBuZXcgVEhSRUUuTWVzaChpLmNhbm9weUdlb20sIGkuY2Fub3B5U3R1ZmYpO1xuXHRpLm1lc2hOYW1lcy5wdXNoKCdjYW5vcHknKTtcblx0dHJlZS5tZXNoZXMucHVzaChjYW5vcHkpO1xuXG5cdC8vLy8vLy8vLy8gZGVuZHJvXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5kZW5kcm9tZXRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHR0cmVlID0gU2NhcGVEZW5kcm9tZXRlckFkZG9uKHRyZWUsIG9wdGlvbnMsIGkpO1xuXHR9XG5cblx0Ly8vLy8vLy8vLyBzYXAgZmxvdyBtZXRlclxuXHRpZiAodHlwZW9mIG9wdGlvbnMuc2FwZmxvd21ldGVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHRyZWUgPSBTY2FwZVNhcEZsb3dNZXRlckFkZG9uKHRyZWUsIG9wdGlvbnMsIGkpO1xuXHR9XG5cblx0cmV0dXJuIHRyZWU7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlVHJlZUZhY3Rvcnk7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVDaHVuayA9IHJlcXVpcmUoJy4vY2h1bmsnKTtcblxuXG4vLyBERUJVR1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcblNjYXBlSXRlbXMgPSByZXF1aXJlKCcuL2l0ZW10eXBlcycpO1xuU2NhcGVJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBAY2FsbGJhY2sgU2NhcGVTY2VuZX5kYXRlQ2hhbmdlXG4gKiBAcGFyYW0ge3N0cmluZ30gZXJyb3IgRGVzY3JpcHRpb24gb2YgZXJyb3IsIG90aGVyd2lzZSBudWxsXG4gKiBAcGFyYW0ge2RhdGV9IGRhdGUgRGF0ZSB0aGUgc2NhcGUgaXMgbm93IGRpc3BsYXlpbmdcbiAqL1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIG9mIGEgbGFuZHNjYXBlIC8gbW9vbnNjYXBlIC8gd2hhdGV2ZXJcbiAqIEBwYXJhbSB7U2NhcGVGaWVsZH0gZmllbGQgIHRoZSBmaWVsZCBiZWluZyByZW5kZXJlZFxuICogQHBhcmFtIHtzdHJpbmd9IGRvbSAgICAgICAgRE9NIGVsZW1lbnQgdGhlIHNjYXBlIHNob3VsZCBiZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyZWQgaW50by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICAgIGNvbGxlY3Rpb24gb2Ygb3B0aW9ucy4gIEFsbCBhcmUgb3B0aW9uYWwuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmxpZ2h0cz0nc3VuJywnc2t5JyAtIGFycmF5IG9mIHN0cmluZ3NcbiAqIG5hbWluZyBsaWdodHMgdG8gaW5jbHVkZSBpbiB0aGlzIHNjZW5lLiAgQ2hvb3NlIGZyb206XG4gKlxuICogc3RyaW5nICAgIHwgbGlnaHQgdHlwZVxuICogLS0tLS0tLS0tLXwtLS0tLS0tLS0tLVxuICogYHRvcGxlZnRgIHwgYSBsaWdodCBmcm9tIGFib3ZlIHRoZSBjYW1lcmEncyBsZWZ0IHNob3VsZGVyXG4gKiBgYW1iaWVudGAgfCBhIGRpbSBhbWJpZW50IGxpZ2h0XG4gKiBgc3VuYCAgICAgfCBhIGRpcmVjdGlvbmFsIGxpZ2h0IHRoYXQgb3JiaXRzIHRoZSBzY2VuZSBvbmNlIHBlciBkYXlcbiAqIGBza3lgICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBzaGluZXMgZnJvbSBhYm92ZSB0aGUgc2NlbmVcbiAqIEBwYXJhbSB7RGF0ZXxcIm5vd1wifSBvcHRpb25zLmN1cnJlbnREYXRlPSdub3cnIC0gVGhlIHRpbWUgYW5kIGRhdGVcbiAqIGluc2lkZSB0aGUgc2NhcGUuICBUaGUgc3RyaW5nIFwibm93XCIgbWVhbnMgc2V0IGN1cnJlbnREYXRlIHRvIHRoZVxuICogcHJlc2VudC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnRpbWVSYXRpbz0xIFRoZSByYXRlIHRpbWUgc2hvdWxkIHBhc3MgaW5cbiAqIHRoZSBzY2FwZSwgcmVsYXRpdmUgdG8gbm9ybWFsLiAgMC4xIG1lYW5zIHRlbiB0aW1lcyBzbG93ZXIuICA2MFxuICogbWVhbnMgb25lIG1pbnV0ZSByZWFsIHRpbWUgPSBvbmUgaG91ciBzY2FwZSB0aW1lLlxuICogQHBhcmFtIHtTY2FwZVNjZW5lfmRhdGVDaGFuZ2V9IG9wdGlvbnMuZGF0ZVVwZGF0ZSBjYWxsYmFjayBmb3JcbiAqIHdoZW4gdGhlIHNjZW5lIHRpbWUgY2hhbmdlcyAod2hpY2ggaXMgYSBsb3QpLlxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZVNjZW5lKGZpZWxkLCBkb20sIG9wdGlvbnMpIHtcblxuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgLy8gbGlnaHRzOiBbJ3RvcGxlZnQnLCAnYW1iaWVudCddLFxuICAgICAgICBsaWdodHM6IFsnc3VuJywgJ3NreSddLFxuICAgICAgICBjdXJyZW50RGF0ZTogJ25vdycsICAvLyBlaXRoZXIgc3RyaW5nICdub3cnIG9yIGEgRGF0ZSBvYmplY3RcbiAgICAgICAgdGltZVJhdGlvOiAxLFxuICAgICAgICBkYXRlVXBkYXRlOiBudWxsIC8vIGNhbGxiYWNrIHRvdXBkYXRlIHRoZSBkaXNwbGF5ZWQgZGF0ZS90aW1lXG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIHNhdmUgdGhlIGZpZWxkXG4gICAgdGhpcy5mID0gZmllbGQ7XG5cbiAgICAvLyBkaXNjb3ZlciBET00gY29udGFpbmVyXG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZG9tKTtcblxuICAgIC8vIGF0dGFjaCB0aGUgbW91c2UgaGFuZGxlcnMuLlxuICAgIHZhciBib3VuZHMgPSB0aGlzLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAvLyAuLm1vdmUgaGFuZGxlclxuICAgIHRoaXMuZWxlbWVudC5vbm1vdXNlbW92ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHRoaXMubW91c2VIb3ZlcihldmVudC5jbGllbnRYIC0gYm91bmRzLmxlZnQsIGV2ZW50LmNsaWVudFkgLSBib3VuZHMudG9wKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICAvLyAuLmNsaWNrIGhhbmRsZXJcbiAgICB0aGlzLmVsZW1lbnQub25jbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHRoaXMubW91c2VDbGljayhldmVudC5jbGllbnRYIC0gYm91bmRzLmxlZnQsIGV2ZW50LmNsaWVudFkgLSBib3VuZHMudG9wKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLmRhdGUgPSB0aGlzLl9vcHRzLmN1cnJlbnREYXRlO1xuICAgIGlmICh0aGlzLmRhdGUgPT09ICdub3cnKSB7XG4gICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgfVxuICAgIHRoaXMuc3RhcnREYXRlID0gdGhpcy5kYXRlO1xuICAgIHRoaXMuZmlyc3RSZW5kZXIgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIC8vIGNyZWF0ZSBhbmQgc2F2ZSBhbGwgdGhlIGJpdHMgd2UgbmVlZFxuICAgIHRoaXMucmVuZGVyZXIgPSB0aGlzLl9tYWtlUmVuZGVyZXIoeyBkb206IHRoaXMuZWxlbWVudCB9KTtcbiAgICB0aGlzLnNjZW5lID0gdGhpcy5fbWFrZVNjZW5lKCk7XG4gICAgdGhpcy5jYW1lcmEgPSB0aGlzLl9tYWtlQ2FtZXJhKCk7XG4gICAgdGhpcy5jb250cm9scyA9IHRoaXMuX21ha2VDb250cm9scygpO1xuICAgIHRoaXMubGlnaHRzID0gdGhpcy5fbWFrZUxpZ2h0cyh0aGlzLl9vcHRzLmxpZ2h0cyk7XG5cbiAgICB0aGlzLnVpUG9pbnRlciA9IG5ldyBTY2FwZUl0ZW0oU2NhcGVJdGVtcy5sYWJlbCwgMCwgMCwge3RleHQ6ICd1bm5hbWVkJ30pO1xuXG4gICAgdGhpcy5jb25uZWN0RmllbGQoKTtcblxuICAgIC8vIGFkZCBncmlkcyBhbmQgaGVscGVyIGN1YmVzXG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCk7XG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCd0b3AnKTtcbiAgICAvLyB0aGlzLmFkZEhlbHBlclNoYXBlcygpO1xuXG4gICAgdmFyIGxhc3RMb2dBdCA9IDA7IC8vIERFQlVHXG4gICAgdmFyIHJlbmRlciA9IChmdW5jdGlvbiB1bmJvdW5kUmVuZGVyKHRzKSB7XG5cbiAgICAgICAgLy8gREVCVUdcbiAgICAgICAgaWYgKGxhc3RMb2dBdCArIDIwMDAgPCB0cykge1xuICAgICAgICAgICAgbGFzdExvZ0F0ID0gdHM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBERUJVRyBtYXliZSB0aGUgdXBkYXRlVGltZSBpcyBkaXNhYmxlZFxuICAgICAgICB0aGlzLl91cGRhdGVUaW1lKCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCByZW5kZXIgKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIoIHRoaXMuc2NlbmUsIHRoaXMuY2FtZXJhICk7XG4gICAgICAgIHRoaXMuY29udHJvbHMudXBkYXRlKCk7XG4gICAgfSkuYmluZCh0aGlzKTtcblxuICAgIHJlbmRlcigwKTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlU2NlbmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZVNjZW5lO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBhIG1lc2ggdG8gdGhlIFRIUkVFLlNjZW5lIChhIHBhc3N0aHJvdWdoIGZvciBUSFJFRS5TY2VuZS5hZGQpXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHRoaW5nKSB7XG4gICAgdGhpcy5zY2VuZS5hZGQodGhpbmcpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHJlbW92ZSBhIG1lc2ggdG8gdGhlIFRIUkVFLlNjZW5lIChhIHBhc3N0aHJvdWdoIGZvciBUSFJFRS5TY2VuZS5yZW1vdmUpXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHRoaW5nKSB7XG4gICAgdGhpcy5zY2VuZS5yZW1vdmUodGhpbmcpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBibG9ja3MgZnJvbSB0aGUgYXR0YWNoZWQgU2NhcGVGaWVsZCBpbnRvIHRoZSBzY2VuZS5cbiAqXG4gKiBZb3Ugd2lsbCBwcm9iYWJseSBvbmx5IG5lZWQgdG8gY2FsbCB0aGlzIG9uY2UuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmNvbm5lY3RGaWVsZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZi5idWlsZEJsb2Nrcyh0aGlzKTtcbiAgICB0aGlzLmYuYnVpbGRJdGVtcyh0aGlzKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiB0ZWxsIHRoaXMgc2NlbmUgdGhhdCBpdCdzIGZpZWxkJ3MgaXRlbXMgaGF2ZSB1cGRhdGVkXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLnJlZnJlc2hJdGVtcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZi5idWlsZEl0ZW1zKHRoaXMpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBoZWxwZXIgY3ViZXMgYXQgc29tZSBvZiB0aGUgY29ybmVycyBvZiB5b3VyIHNjYXBlLCBzbyB5b3UgY2FuXG4gKiBzZWUgd2hlcmUgdGhleSBhcmUgaW4gc3BhY2UuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlclNoYXBlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB3aGl0ZSA9IDB4ZmZmZmZmO1xuICAgIHZhciByZWQgICA9IDB4ZmYwMDAwO1xuICAgIHZhciBncmVlbiA9IDB4MDBmZjAwO1xuICAgIHZhciBibHVlICA9IDB4MDAwMGZmO1xuICAgIHZhciBmID0gdGhpcy5mO1xuXG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKGYubWluWCwgZi5taW5ZLCBmLm1pblosIHdoaXRlKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5tYXhYLCBmLm1pblksIGYubWluWiwgcmVkKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoKGYubWluWCArIGYubWF4WCkgLyAyLCBmLm1pblksIGYubWluWiwgcmVkKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5taW5YLCBmLm1heFksIGYubWluWiwgZ3JlZW4pO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZShmLm1pblgsIGYubWluWSwgZi5tYXhaLCBibHVlKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoZi5tYXhYLCBmLm1heFksIGYubWluWiwgd2hpdGUpO1xuXG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLm1vdXNlSG92ZXIgPSBmdW5jdGlvbihtb3VzZVgsIG1vdXNlWSkge1xuXG4gICAgdmFyIHJheWNhc3RlciA9IG5ldyBUSFJFRS5SYXljYXN0ZXIoKTtcbiAgICBtb3VzZVBvcyA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgbW91c2VQb3MueCA9ICAgKG1vdXNlWCAvIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudC53aWR0aCkgICogMiAtIDE7XG4gICAgbW91c2VQb3MueSA9IC0gKG1vdXNlWSAvIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudC5oZWlnaHQpICogMiArIDE7XG5cbiAgICAvLyByZW1vdmUgdGhlIHVpIHBvaW50ZXJcbiAgICB0aGlzLnVpUG9pbnRlci5yZW1vdmVGcm9tU2NlbmUoKTtcblxuICAgIC8vIHNldCBhbGwgdGhlIGNsaWNrYWJsZXMgdG8gaGlkZGVuXG4gICAgZm9yICh2YXIgYz0wOyBjIDwgdGhpcy5mLmNsaWNrYWJsZXMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgdGhpcy5mLmNsaWNrYWJsZXNbY10udmlzaWJsZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIG5vdyB1bmhpZGUganVzdCB0aGUgb25lcyBpbiB0aGUgbW91c2UgYXJlYVxuICAgIHJheWNhc3Rlci5zZXRGcm9tQ2FtZXJhKG1vdXNlUG9zLCB0aGlzLmNhbWVyYSk7XG4gICAgdmFyIGludGVyc2VjdHMgPSByYXljYXN0ZXIuaW50ZXJzZWN0T2JqZWN0cyh0aGlzLmYuY2xpY2thYmxlcywgdHJ1ZSk7XG5cbiAgICB2YXIgaW50ZXJzZWN0LCBjbGlja2FibGUsIGZpcnN0Q2xpY2thYmxlID0gbnVsbDtcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBpbnRlcnNlY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGludGVyc2VjdCA9IGludGVyc2VjdHNbaV0ub2JqZWN0O1xuICAgICAgICBjbGlja2FibGUgPSBpbnRlcnNlY3QucGFyZW50O1xuICAgICAgICBpZiAoIWZpcnN0Q2xpY2thYmxlICYmIGludGVyc2VjdC51c2VyRGF0YS5jbGlja0RhdGEpIHtcbiAgICAgICAgICAgIGZpcnN0Q2xpY2thYmxlID0gaW50ZXJzZWN0O1xuICAgICAgICAgICAgaWYgKGZpcnN0Q2xpY2thYmxlLnVzZXJEYXRhLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXJzdCBjbGlja2FibGUgaGFzIGEgbmFtZSwgbWFrZSBpdCBpbnRvIGEgbGFiZWxcbiAgICAgICAgICAgICAgICB0aGlzLnVpUG9pbnRlci51cGRhdGUoe1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBmaXJzdENsaWNrYWJsZS51c2VyRGF0YS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB4OiBjbGlja2FibGUucG9zaXRpb24ueCxcbiAgICAgICAgICAgICAgICAgICAgeTogY2xpY2thYmxlLnBvc2l0aW9uLnksXG4gICAgICAgICAgICAgICAgICAgIHo6IGNsaWNrYWJsZS5wb3NpdGlvbi56LFxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IGZpcnN0Q2xpY2thYmxlLnVzZXJEYXRhLm9mZnNldFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMudWlQb2ludGVyLmFkZFRvU2NlbmUodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2xpY2thYmxlLnZpc2libGUgPSB0cnVlO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUubW91c2VDbGljayA9IGZ1bmN0aW9uKG1vdXNlWCwgbW91c2VZKSB7XG5cbiAgICB2YXIgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuICAgIG1vdXNlUG9zID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICBtb3VzZVBvcy54ID0gICAobW91c2VYIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LndpZHRoKSAgKiAyIC0gMTtcbiAgICBtb3VzZVBvcy55ID0gLSAobW91c2VZIC8gdGhpcy5yZW5kZXJlci5kb21FbGVtZW50LmhlaWdodCkgKiAyICsgMTtcblxuICAgIC8vIGZpbmQgdGhlIGludGVyc2VjdGluZyBjbGlja2FibGVzXG4gICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEobW91c2VQb3MsIHRoaXMuY2FtZXJhKTtcbiAgICB2YXIgaW50ZXJzZWN0cyA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHRoaXMuZi5jbGlja2FibGVzLCB0cnVlKTtcblxuICAgIHZhciBjbGlja2VkO1xuICAgIGZvciAodmFyIGk9MDsgaSA8IGludGVyc2VjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gdGhlIGZpcnN0IG9uZSB3aXRoIHVzZXJEYXRhLmNsaWNrRGF0YSBkZWZpbmVkIGlzIHRoZSB3aW5uZXJcbiAgICAgICAgY2xpY2tlZCA9IGludGVyc2VjdHNbaV0ub2JqZWN0O1xuICAgICAgICBpZiAoY2xpY2tlZC51c2VyRGF0YS5jbGlja0RhdGEpIHtcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgY2FsbGJhY2ssIGludm9rZSBpdFxuICAgICAgICAgICAgaWYgKHRoaXMuX29wdHMuY2xpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9vcHRzLmNsaWNrO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gY2xpY2tlZC51c2VyRGF0YS5jbGlja0RhdGE7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCggZnVuY3Rpb24oKXsgY2FsbGJhY2suY2FsbCh3aW5kb3csIGRhdGEpOyB9LCAwICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBhZGQgYSBjdWJlIGF0IHBvc2l0aW9uIGB4YCwgYHlgLCBgemAgdG8gY29uZmlybSB3aGVyZSB0aGF0IGlzLFxuICogZXhhY3RseS4gIEdyZWF0IGZvciB0cnlpbmcgdG8gd29yayBvdXQgaWYgeW91ciBzY2FwZSBpcyBiZWluZ1xuICogcmVuZGVyZWQgd2hlcmUgeW91IHRoaW5rIGl0IHNob3VsZCBiZSByZW5kZXJlZC5cbiAqXG4gKiBAcGFyYW0geyhOdW1iZXJ8VmVjdG9yMyl9IHggWCBjb29yZGluYXRlLCBvciBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvVmVjdG9yMyBUSFJFRS5WZWN0b3IzfSBjb250YWluaW5nIHgsIHkgYW5kIHogY29vcmRzXG4gKiBAcGFyYW0ge051bWJlcn0gW3ldIFkgY29vcmRpbmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IFt6XSBaIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7Q29sb3J8U3RyaW5nfEludGVnZXJ9IGNvbG9yPScjY2NjY2NjJyBDb2xvciBvZiBjdWJlLlxuICogQ2FuIGJlIGEge0BsaW5rIGh0dHA6Ly90aHJlZWpzLm9yZy9kb2NzLyNSZWZlcmVuY2UvTWF0aC9Db2xvciBUSFJFRS5Db2xvcn0sIGEgY29sb3ItcGFyc2VhYmxlIHN0cmluZyBsaWtlXG4gKiBgJyMzMzY2Y2MnYCwgb3IgYSBudW1iZXIgbGlrZSBgMHgzMzY2Y2NgLlxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJDdWJlID0gZnVuY3Rpb24oeCwgeSwgeiwgY29sb3IpIHtcbiAgICAvLyBmaXJzdCwgc2V0IHRoZSBjb2xvciB0byBzb21ldGhpbmdcbiAgICBpZiAodHlwZW9mIGNvbG9yID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgdG8gbGlnaHQgZ3JleS5cbiAgICAgICAgY29sb3IgPSBuZXcgVEhSRUUuQ29sb3IoMHhjY2NjY2MpO1xuICAgIH1cbiAgICB2YXIgcG9zOyAvLyB0aGUgcG9zaXRpb24gdG8gZHJhdyB0aGUgY3ViZVxuICAgIGlmICh0eXBlb2YgeC54ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIHRoZW4gaXQncyBhIHZlY3RvciwgYW5kIHkgbWlnaHQgYmUgdGhlIGNvbG9yXG4gICAgICAgIHBvcyA9IHg7XG4gICAgICAgIGlmICh0eXBlb2YgeSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29sb3IgPSB5O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8geCBpc24ndCBhIHZlY3Rvciwgc28gYXNzdW1lIHNlcGFyYXRlIHggeSBhbmQgelxuICAgICAgICBwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMyh4LCB5LCB6KTtcbiAgICAgICAgLy8gd2UgY2F1Z2h0IGNvbG9yIGFscmVhZHkuXG4gICAgfVxuXG4gICAgLy8gYWJvdXQgYSBmaWZ0aWV0aCBvZiB0aGUgZmllbGQncyBzdW1tZWQgZGltZW5zaW9uc1xuICAgIHZhciBzaXplID0gKHRoaXMuZi53WCArIHRoaXMuZi53WSArIHRoaXMuZi53WikgLyA1MDtcbiAgICAvLyB1c2UgdGhlIGNvbG91ciB3ZSBkZWNpZGVkIGVhcmxpZXJcbiAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7IGNvbG9yOiBjb2xvciB9KTtcblxuICAgIC8vIG9rYXkuLiBtYWtlIGl0LCBwb3NpdGlvbiBpdCwgYW5kIHNob3cgaXRcbiAgICB2YXIgY3ViZSA9IFNjYXBlSXRlbXMuY3ViZSh7IHNpemU6IHNpemUsIG1hdGVyaWFsOiBtYXRlcmlhbCB9KS5tZXNoZXNbMF07XG4gICAgY3ViZS5wb3NpdGlvbi5jb3B5KHBvcyk7XG4gICAgdGhpcy5zY2VuZS5hZGQoY3ViZSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlckdyaWQgPSBmdW5jdGlvbih0b3BPckJvdHRvbSkge1xuICAgIHZhciBneiA9IDA7XG4gICAgdmFyIGdjID0gMHg0NDQ0NDQ7XG4gICAgaWYgKHRvcE9yQm90dG9tID09ICd0b3AnKSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1heFo7XG4gICAgICAgIGdjID0gMHhjY2NjZmY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ3ogPSB0aGlzLmYubWluWjtcbiAgICAgICAgZ2MgPSAweGNjZmZjYztcbiAgICB9XG5cbiAgICB2YXIgZ3JpZFcgPSBNYXRoLm1heCh0aGlzLmYubWF4WCAtIHRoaXMuZi5taW5YLCB0aGlzLmYubWF4WSAtIHRoaXMuZi5taW5ZKTtcblxuICAgIC8vIEdyaWQgXCJzaXplXCIgaXMgdGhlIGRpc3RhbmNlIGluIGVhY2ggb2YgdGhlIGZvdXIgZGlyZWN0aW9ucyxcbiAgICAvLyB0aGUgZ3JpZCBzaG91bGQgc3Bhbi4gIFNvIGZvciBhIGdyaWQgVyB1bml0cyBhY3Jvc3MsIHNwZWNpZnlcbiAgICAvLyB0aGUgc2l6ZSBhcyBXLzIuXG4gICAgdmFyIGdyaWRYWSA9IG5ldyBUSFJFRS5HcmlkSGVscGVyKGdyaWRXLzIsIGdyaWRXLzEwKTtcbiAgICBncmlkWFkuc2V0Q29sb3JzKGdjLCBnYyk7XG4gICAgZ3JpZFhZLnJvdGF0aW9uLnggPSBNYXRoLlBJLzI7XG4gICAgZ3JpZFhZLnBvc2l0aW9uLnNldCh0aGlzLmYubWluWCArIGdyaWRXLzIsIHRoaXMuZi5taW5ZICsgZ3JpZFcvMiwgZ3opO1xuICAgIHRoaXMuc2NlbmUuYWRkKGdyaWRYWSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQ3JlYXRlIGFuZCByZXR1cm4gYSBUSFJFRS5SZW5kZXJlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdmFyaW91cyBvcHRpb25zXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR8alF1ZXJ5RWxlbX0gb3B0aW9ucy5kb20gYSBkb20gZWxlbWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLndpZHRoIHJlbmRlcmVyIHdpZHRoIChpbiBwaXhlbHMpXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuaGVpZ2h0IHJlbmRlcmVyIGhlaWdodCAoaW4gcGl4ZWxzKVxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlUmVuZGVyZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoeyBhbnRpYWxpYXM6IHRydWUsIGFscGhhOiB0cnVlLCBwcmVjaXNpb246IFwiaGlnaHBcIiB9KTtcbiAgICByZW5kZXJlci5zZXRDbGVhckNvbG9yKCAweDAwMDAwMCwgMCk7XG4gICAgLy8gcmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kb20pIHtcbiAgICAgICAgdmFyICRkb20gPSAkKG9wdGlvbnMuZG9tKTtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZSgkZG9tLndpZHRoKCksICRkb20uaGVpZ2h0KCkpO1xuICAgICAgICAkZG9tLmFwcGVuZChyZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy53aWR0aCAmJiBvcHRpb25zLmhlaWdodCkge1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKG9wdGlvbnMud2lkdGgsIG9wdGlvbnMuaGVpZ2h0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlbmRlcmVyO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHNjYXBlIHRpbWUgdG8gbWF0Y2ggdGhlIGN1cnJlbnQgdGltZSAodGFraW5nIGludG9cbiAqIGFjY291bnQgdGhlIHRpbWVSYXRpbyBldGMpLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVUaW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cuZ2V0VGltZSgpIC0gdGhpcy5maXJzdFJlbmRlcjtcbiAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSh0aGlzLmZpcnN0UmVuZGVyICsgKGVsYXBzZWQgKiB0aGlzLl9vcHRzLnRpbWVSYXRpbykpO1xuICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX29wdHMuZGF0ZVVwZGF0ZTtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBjYWxsYmFja0RhdGUgPSBuZXcgRGF0ZSh0aGlzLmRhdGUpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBjYWxsYmFja0RhdGUpO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlU3VuKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIHN1biB0byBzdWl0IHRoZSBzY2FwZSBjdXJyZW50IHRpbWUuXG4gKiBAcGFyYW0gIHtUSFJFRS5EaXJlY3Rpb25hbExpZ2h0fSBbc3VuXSB0aGUgc3VuIHRvIGFjdCBvbi4gIElmIG5vdFxuICogc3VwcGxpZWQsIHRoaXMgbWV0aG9kIHdpbGwgYWN0IG9uIHRoZSBsaWdodCBpbiB0aGlzIHNjZW5lJ3MgbGlnaHRcbiAqIGxpc3QgdGhhdCBpcyBjYWxsZWQgXCJzdW5cIi5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlU3VuID0gZnVuY3Rpb24oc3VuKSB7XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBpZiB0aGV5IGRpZG4ndCBwcm92aWRlIGEgc3VuLCB1c2Ugb3VyIG93blxuICAgICAgICBzdW4gPSB0aGlzLmxpZ2h0cy5zdW47XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBiYWlsIGlmIHRoZXJlJ3Mgbm8gc3VuIFdIQVQgRElEIFlPVSBETyBZT1UgTU9OU1RFUlxuICAgIH1cblxuICAgIHZhciBzdW5BbmdsZSA9ICh0aGlzLmRhdGUuZ2V0SG91cnMoKSo2MCArIHRoaXMuZGF0ZS5nZXRNaW51dGVzKCkpIC8gMTQ0MCAqIDIgKiBNYXRoLlBJO1xuICAgIHZhciBzdW5Sb3RhdGlvbkF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcblxuICAgIHN1bi5wb3NpdGlvblxuICAgICAgICAuc2V0KDAsIC0zICogdGhpcy5mLndZLCAtMjAgKiB0aGlzLmYud1opXG4gICAgICAgIC5hcHBseUF4aXNBbmdsZShzdW5Sb3RhdGlvbkF4aXMsIHN1bkFuZ2xlKVxuICAgICAgICAuYWRkKHRoaXMuZi5jZW50ZXIpO1xuXG4gICAgdmFyIHN1blogPSBzdW4ucG9zaXRpb24uejtcblxuICAgIC8vIHN3aXRjaCB0aGUgc3VuIG9mZiB3aGVuIGl0J3MgbmlnaHQgdGltZVxuICAgIGlmIChzdW4ub25seVNoYWRvdyA9PSBmYWxzZSAmJiBzdW5aIDw9IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChzdW4ub25seVNoYWRvdyA9PSB0cnVlICYmIHN1blogPiB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBmYWRlIG91dCB0aGUgc2hhZG93IGRhcmtuZXNzIHdoZW4gdGhlIHN1biBpcyBsb3dcbiAgICBpZiAoc3VuWiA+PSB0aGlzLmYuY2VudGVyLnogJiYgc3VuWiA8PSB0aGlzLmYubWF4Wikge1xuICAgICAgICB2YXIgdXBuZXNzID0gTWF0aC5tYXgoMCwgKHN1blogLSB0aGlzLmYuY2VudGVyLnopIC8gdGhpcy5mLndaICogMik7XG4gICAgICAgIHN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuNSAqIHVwbmVzcztcbiAgICAgICAgc3VuLmludGVuc2l0eSA9IHVwbmVzcztcbiAgICB9XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUxpZ2h0cyA9IGZ1bmN0aW9uKGxpZ2h0c1RvSW5jbHVkZSkge1xuXG4gICAgdmFyIGxpZ2h0cyA9IHt9O1xuICAgIHZhciBmID0gdGhpcy5mOyAgLy8gY29udmVuaWVudCByZWZlcmVuY2UgdG8gdGhlIGZpZWxkXG5cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ2FtYmllbnQnKSAhPSAtMSkge1xuICAgICAgICAvLyBhZGQgYW4gYW1iaWVudCBsaXN0XG4gICAgICAgIGxpZ2h0cy5hbWJpZW50ID0gbmV3IFRIUkVFLkFtYmllbnRMaWdodCgweDIyMjIzMyk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZigndG9wbGVmdCcpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5sZWZ0ID0gbmV3IFRIUkVFLlBvaW50TGlnaHQoMHhmZmZmZmYsIDEsIDApO1xuICAgICAgICAvLyBwb3NpdGlvbiBsaWdodCBvdmVyIHRoZSB2aWV3ZXIncyBsZWZ0IHNob3VsZGVyLi5cbiAgICAgICAgLy8gLSBMRUZUIG9mIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHggd2lkdGhcbiAgICAgICAgLy8gLSBCRUhJTkQgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeSB3aWR0aFxuICAgICAgICAvLyAtIEFCT1ZFIHRoZSBjYW1lcmEgYnkgdGhlIGZpZWxkJ3MgaGVpZ2h0XG4gICAgICAgIGxpZ2h0cy5sZWZ0LnBvc2l0aW9uLmFkZFZlY3RvcnMoXG4gICAgICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbixcbiAgICAgICAgICAgIG5ldyBUSFJFRS5WZWN0b3IzKC0wLjUgKiBmLndYLCAtMC41ICogZi53WSwgMSAqIGYud1opXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc3VuJykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnN1biA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmVlKTtcbiAgICAgICAgbGlnaHRzLnN1bi5pbnRlbnNpdHkgPSAxLjA7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlU3VuKGxpZ2h0cy5zdW4pO1xuXG4gICAgICAgIC8vIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7ICAvLyBERUJVR1xuXG4gICAgICAgIC8vIGRpcmVjdGlvbiBvZiBzdW5saWdodFxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnN1bi50YXJnZXQgPSB0YXJnZXQ7XG5cbiAgICAgICAgLy8gc3VuIGRpc3RhbmNlLCBsb2xcbiAgICAgICAgdmFyIHN1bkRpc3RhbmNlID0gbGlnaHRzLnN1bi5wb3NpdGlvbi5kaXN0YW5jZVRvKGxpZ2h0cy5zdW4udGFyZ2V0LnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbG9uZ2VzdCBkaWFnb25hbCBmcm9tIGZpZWxkLWNlbnRlclxuICAgICAgICB2YXIgbWF4RmllbGREaWFnb25hbCA9IGYuY2VudGVyLmRpc3RhbmNlVG8obmV3IFRIUkVFLlZlY3RvcjMoZi5taW5YLCBmLm1pblksIGYubWluWikpO1xuXG4gICAgICAgIC8vIHNoYWRvdyBzZXR0aW5nc1xuICAgICAgICBsaWdodHMuc3VuLmNhc3RTaGFkb3cgPSB0cnVlO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0RhcmtuZXNzID0gMC4zMztcblxuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYU5lYXIgPSBzdW5EaXN0YW5jZSAtIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhRmFyID0gc3VuRGlzdGFuY2UgKyBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVRvcCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhUmlnaHQgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUJvdHRvbSA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFMZWZ0ID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3NreScpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5za3kgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGVlZWVmZik7XG4gICAgICAgIGxpZ2h0cy5za3kuaW50ZW5zaXR5ID0gMC44O1xuXG4gICAgICAgIC8vIHNreSBpcyBkaXJlY3RseSBhYm92ZVxuICAgICAgICB2YXIgc2t5SGVpZ2h0ID0gNSAqIGYud1o7XG4gICAgICAgIGxpZ2h0cy5za3kucG9zaXRpb24uY29weSh0aGlzLmNhbWVyYS5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxpZ2h0cy5za3kucG9zaXRpb24uc2V0WihmLm1heFogKyBza3lIZWlnaHQpO1xuXG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc2t5LnRhcmdldCA9IHRhcmdldDtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBsaWdodCBpbiBsaWdodHMpIHtcbiAgICAgICAgaWYgKGxpZ2h0cy5oYXNPd25Qcm9wZXJ0eShsaWdodCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2NlbmUuYWRkKGxpZ2h0c1tsaWdodF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpZ2h0cztcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG4gICAgLy8gYWRkIGZvZ1xuICAgIC8vIHNjZW5lLmZvZyA9IG5ldyBUSFJFRS5Gb2coXG4gICAgLy8gICAgICcjZjBmOGZmJyxcbiAgICAvLyAgICAgdGhpcy5mLm1heFggLSB0aGlzLmYubWluWCxcbiAgICAvLyAgICAgdGhpcy5mLm1heFggLSB0aGlzLmYubWluWCAqIDNcbiAgICAvLyApO1xuICAgIHJldHVybiBzY2VuZTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUNhbWVyYSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgIC8vIHZpZXdpbmcgYW5nbGVcbiAgICAvLyBpIHRoaW5rIHRoaXMgaXMgdGhlIHZlcnRpY2FsIHZpZXcgYW5nbGUuICBob3Jpem9udGFsIGFuZ2xlIGlzXG4gICAgLy8gZGVyaXZlZCBmcm9tIHRoaXMgYW5kIHRoZSBhc3BlY3QgcmF0aW8uXG4gICAgdmFyIHZpZXdBbmdsZSA9IDQ1O1xuICAgIHZpZXdBbmdsZSA9IChvcHRpb25zICYmIG9wdGlvbnMudmlld0FuZ2xlKSB8fCB2aWV3QW5nbGU7XG5cbiAgICAvLyBhc3BlY3RcbiAgICB2YXIgdmlld0FzcGVjdCA9IDE2Lzk7XG4gICAgaWYgKHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICAgICAgdmlld0FzcGVjdCA9ICRlbGVtLndpZHRoKCkgLyAkZWxlbS5oZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvLyBuZWFyIGFuZCBmYXIgY2xpcHBpbmdcbiAgICB2YXIgbmVhckNsaXAgPSAwLjE7XG4gICAgdmFyIGZhckNsaXAgPSAxMDAwMDtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIG5lYXJDbGlwID0gTWF0aC5taW4odGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgLyAxMDAwO1xuICAgICAgICBmYXJDbGlwID0gTWF0aC5tYXgodGhpcy5mLndYLCB0aGlzLmYud1ksIHRoaXMuZi53WikgKiAxMDtcbiAgICB9XG5cbiAgICAvLyBjYW1lcmEgcG9zaXRpb24gYW5kIGxvb2tpbmcgZGlyZWN0aW9uXG4gICAgdmFyIGxvb2tIZXJlID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XG4gICAgdmFyIGNhbVBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xMCwgNSk7XG4gICAgaWYgKHRoaXMuZikge1xuICAgICAgICBsb29rSGVyZSA9IHRoaXMuZi5jZW50ZXI7XG4gICAgICAgIGNhbVBvcyA9IGxvb2tIZXJlLmNsb25lKCkuYWRkKG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0xLjEgKiB0aGlzLmYud1ksIDEgKiB0aGlzLmYud1opKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgdXAgY2FtZXJhXG4gICAgdmFyIGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSggdmlld0FuZ2xlLCB2aWV3QXNwZWN0LCBuZWFyQ2xpcCwgZmFyQ2xpcCk7XG4gICAgLy8gXCJ1cFwiIGlzIHBvc2l0aXZlIFpcbiAgICBjYW1lcmEudXAuc2V0KDAsMCwxKTtcbiAgICBjYW1lcmEucG9zaXRpb24uY29weShjYW1Qb3MpO1xuICAgIGNhbWVyYS5sb29rQXQobG9va0hlcmUpO1xuXG4gICAgLy8gYWRkIHRoZSBjYW1lcmEgdG8gdGhlIHNjZW5lXG4gICAgaWYgKHRoaXMuc2NlbmUpIHtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoY2FtZXJhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FtZXJhO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ29udHJvbHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBjZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCk7XG4gICAgaWYgKHRoaXMuZiAmJiB0aGlzLmYuY2VudGVyKSB7XG4gICAgICAgIGNlbnRlciA9IHRoaXMuZi5jZW50ZXIuY2xvbmUoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2FtZXJhICYmIHRoaXMucmVuZGVyZXIgJiYgdGhpcy5yZW5kZXJlci5kb21FbGVtZW50KSB7XG4gICAgICAgIHZhciBjb250cm9scyA9IG5ldyBUSFJFRS5PcmJpdENvbnRyb2xzKHRoaXMuY2FtZXJhLCB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICBjb250cm9scy5jZW50ZXIgPSBjZW50ZXI7XG4gICAgICAgIHJldHVybiBjb250cm9scztcbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlU2NlbmUucHJvdG90eXBlLnByaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAgICdzY2FwZSEnXG4gICAgKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZVNjZW5lO1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblxudmFyIExhbWJlcnQgPSBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsO1xudmFyIFBob25nID0gVEhSRUUuTWVzaFBob25nTWF0ZXJpYWw7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogU3R1ZmYgKHRoYXQgaXMsIFRIUkVFLk1hdGVyaWFsKSB0aGF0IHRoaW5ncyBpbiBzY2FwZXMgY2FuIGJlIG1hZGUgb3V0IG9mLlxuICogQG5hbWVzcGFjZVxuICovXG52YXIgU2NhcGVTdHVmZiA9IHt9O1xuXG4vKiogZ2VuZXJpYyBzdHVmZiwgZm9yIGlmIG5vdGhpbmcgZWxzZSBpcyBzcGVjaWZpZWRcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5nZW5lcmljID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg5OTk5OTksXG4gICAgICAgICAgICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC41MCB9KTtcblxuLyoqIHdhdGVyIGlzIGJsdWUgYW5kIGEgYml0IHRyYW5zcGFyZW50XG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYud2F0ZXIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDMzOTlmZixcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjc1IH0pO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RvbmUsIGRpcnQsIGFuZCBncm91bmQgbWF0ZXJpYWxzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIGRpcnQgZm9yIGdlbmVyYWwgdXNlXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZGlydCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4YTA1MjJkIH0pO1xuXG4vLyBOaW5lIGRpcnQgY29sb3VycyBmb3IgdmFyeWluZyBtb2lzdHVyZSBsZXZlbHMuICBTdGFydCBieSBkZWZpbmluZ1xuLy8gdGhlIGRyaWVzdCBhbmQgd2V0dGVzdCBjb2xvdXJzLCBhbmQgdXNlIC5sZXJwKCkgdG8gZ2V0IGEgbGluZWFyXG4vLyBpbnRlcnBvbGF0ZWQgY29sb3VyIGZvciBlYWNoIG9mIHRoZSBpbi1iZXR3ZWVuIGRpcnRzLlxudmFyIGRyeSA9IG5ldyBUSFJFRS5Db2xvcigweGJiODg1NSk7IC8vIGRyeVxudmFyIHdldCA9IG5ldyBUSFJFRS5Db2xvcigweDg4MjIwMCk7IC8vIG1vaXN0XG5cbi8qKiBkaXJ0IGF0IHZhcnlpbmcgbW9pc3R1cmUgbGV2ZWxzOiBkaXJ0MCBpcyBkcnkgYW5kIGxpZ2h0IGluXG4gICogY29sb3VyLCBkaXJ0OSBpcyBtb2lzdCBhbmQgZGFyay5cbiAgKiBAbmFtZSBkaXJ0WzAtOV1cbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5kaXJ0MCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeSB9KTtcblNjYXBlU3R1ZmYuZGlydDEgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDYgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDcgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDggPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgOC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDkgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiB3ZXQgfSk7XG5cbi8qKiBsZWFmIGxpdHRlciwgd2hpY2ggaW4gcmVhbGl0eSBpcyB1c3VhbGx5IGJyb3duaXNoLCBidXQgdGhpcyBoYXNcbiAgKiBhIGdyZWVuaXNoIHRvbmUgdG8gZGlzdGluZ3Vpc2ggaXQgZnJvbSBwbGFpbiBkaXJ0LlxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmxlYWZsaXR0ZXIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDY2NmIyZiB9KTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBmbG9yYSAtIHdvb2QsIGxlYXZlcywgZXRjXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIGdlbmVyaWMgYnJvd24gd29vZFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLndvb2QgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDc3NDQyMiB9KTtcblxuLyoqIGxpZ2h0IHdvb2QgZm9yIGd1bXRyZWVzIGV0Yy4gIE1heWJlIGl0J3MgYSBiaXQgdG9vIGxpZ2h0P1xuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmxpZ2h0d29vZCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4ZmZlZWNjIH0pO1xuXG4vKiogYSBnZW5lcmljIGdyZWVuaXNoIGxlYWYgbWF0ZXJpYWxcbiAgKiBAbWVtYmVyb2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi5mb2xpYWdlID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg1NTg4MzMgfSk7XG5cbi8qKiBhIGdlbmVyaWMgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmZvbGlhZ2UgPSBuZXcgTGFtYmVydChcbiAgeyBjb2xvcjogMHg1NTg4MzMsIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjkgfVxuKTtcblxuLyoqIGEgZ3JlZW5pc2ggbGVhZiBtYXRlcmlhbCB0aGF0J3MgbW9zdGx5IHNlZS10aHJvdWdoXG4gICogQG1lbWJlcm9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYudHJhbnNwYXJlbnRGb2xpYWdlID0gbmV3IExhbWJlcnQoXG4gIHsgY29sb3I6IDB4NTU4ODMzLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC4zMyB9XG4pO1xuXG4vKiogYSBmb2xpYWdlIG1hdGVyaWFsIGZvciB1c2UgaW4gcG9pbnQgY2xvdWQgb2JqZWN0c1xuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLnBvaW50Rm9saWFnZSA9IG5ldyBUSFJFRS5Qb2ludENsb3VkTWF0ZXJpYWwoeyBjb2xvcjogMHg1NTg4MzMsIHNpemU6IDAuNSB9KTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBidWlsdCBtYXRlcmlhbHNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKiogc2lsdmVyeSBtZXRhbFxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLm1ldGFsID0gbmV3IFBob25nKHsgY29sb3I6IDB4YWFiYmVlLCBzcGVjdWxhcjogMHhmZmZmZmYsIHNoaW5pbmVzczogMTAwLCByZWZsZWN0aXZpdHk6IDAuOCB9KTtcblxuLyoqIGNvbmNyZXRlIGluIGEgc29ydCBvZiBtaWQtZ3JleVxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmNvbmNyZXRlID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHg5OTk5OTkgfSk7XG5cbi8qKiBwbGFzdGljLCBhIGdlbmVyaWMgd2hpdGlzaCBwbGFzdGljIHdpdGggYSBiaXQgb2Ygc2hpbmluZXNzXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYucGxhc3RpYyA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweGNjY2NjYywgc3BlY3VsYXI6IDB4Y2NjY2NjIH0pO1xuXG4vKiogZ2xhc3MgaXMgc2hpbnksIGZhaXJseSB0cmFuc3BhcmVudCwgYW5kIGEgbGl0dGxlIGJsdWlzaFxuICAqIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdsYXNzID0gbmV3IFBob25nKFxuICB7IGNvbG9yOiAweDY2YWFmZiwgc3BlY3VsYXI6IDB4ZmZmZmZmLCB0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC41IH1cbik7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZ2VuZXJhbCBjb2xvdXJzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIG1hdHQgYmxhY2ssIGZvciBibGFjayBzdXJmYWNlcyAoYWN0dWFsbHkgaXQncyAjMTExMTExKVxuICAqIEBtZW1iZXJPZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmJsYWNrID0gbmV3IExhbWJlcnQoeyBjb2xvcjogMHgxMTExMTEgfSk7XG5cbi8qKiBtYXR0IHdoaXRlLCBmb3Igd2hpdGUgc3VyZmFjZXMgKGFjdHVhbGx5IGl0J3MgI2VlZWVlZSlcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi53aGl0ZSA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4ZWVlZWVlIH0pO1xuXG4vKiogZ2xvc3MgYmxhY2ssIGZvciBzaGlueSBibGFjayBwYWludGVkIHN1cmZhY2VzIChhY3R1YWxseSBpdCdzICMxMTExMTEpXG4gICogQG1lbWJlck9mIFNjYXBlU3R1ZmYgKi9cblNjYXBlU3R1ZmYuZ2xvc3NCbGFjayA9IG5ldyBQaG9uZyh7IGNvbG9yOiAweDExMTExMSwgc3BlY3VsYXI6IDB4NjY2NjY2IH0pO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFVJIHV0aWxpdHkgdGhpbmdzXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqIGhhcmQgd2hpdGVcbiAgKiBAbWVtYmVyT2YgU2NhcGVTdHVmZiAqL1xuU2NhcGVTdHVmZi51aVdoaXRlID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IDB4ZmZmZmZmIH0pO1xuU2NhcGVTdHVmZi51aVdoaXRlLmRlcHRoVGVzdCA9IGZhbHNlO1xuXG5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU3R1ZmY7XG5cblxuXG5cbiJdfQ==
