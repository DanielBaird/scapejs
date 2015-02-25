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

},{"./scape/baseobject":2,"./scape/chunk":3,"./scape/field":4,"./scape/scene":7,"./scape/stuff":8}],2:[function(require,module,exports){

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

},{"./baseobject":2,"./stuff":8}],5:[function(require,module,exports){

/**
 * A bag of item types -- i.e. THREE.Geometrys -- that scapes can have in them.
 *
 * @enum
 */
var ScapeItems = {
    Cube: require('./itemtypes/cube')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;

},{"./itemtypes/cube":6}],6:[function(require,module,exports){
(function (global){

var THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);

function ScapeCube(size, options) {
    // construct a mesh "sitting on" the point 0,0,0
    size = size || 1;

    // makes a cube centered on 0,0,0
    var geom = new THREE.BoxGeometry(size, size, size);

    // transform it up a bit, so we're centered on x = 0 and y = 0, but have the _bottom_ face sitting on z = 0.
    geom.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, size/2) );

    return geom;
};
// ------------------------------------------------------------------
makeGeometry = function(size) {
};


module.exports = ScapeCube;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
ScapeObject = require('./baseobject');
ScapeChunk = require('./chunk');


// DEBUG
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
    // this.addHelperGrid('top');
    this.addHelperShapes();


    var lastLogAt = 0; // DEBUG
    render = (function unboundRender(ts) {

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

    // okay.. ready to draw
    var geom = ScapeItems.Cube(size);

    var material = new THREE.MeshLambertMaterial({ color: color });
    var cube = new THREE.Mesh(geom, material);
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

},{"./baseobject":2,"./chunk":3,"./itemtypes":5}],8:[function(require,module,exports){
(function (global){
// ------------------------------------------------------------------
THREE = (typeof window !== "undefined" ? window.THREE : typeof global !== "undefined" ? global.THREE : null);
// ------------------------------------------------------------------
/**
 * A bag of stuff -- i.e. THREE.Material -- that things can be made out of.
 *
 * @enum
 */
var ScapeStuff = {};
var Lambert = THREE.MeshLambertMaterial;

/** generic stuff, for if nothing else is specified @memberof ScapeStuff */
ScapeStuff.generic = new Lambert({ color: 0x999999,
                     transparent: true, opacity: 0.50 });

// water is blue and a bit transparent
ScapeStuff.water = new Lambert({ color: 0x3399ff,
                     transparent: true, opacity: 0.75 });

// dirt for general use
ScapeStuff.dirt = new Lambert({ color: 0xa0522d });
// Nine dirt colours for varying moisture levels.  Start by defining
// the driest and wettest colours, and use .lerp() to get a linear
// interpolated colour for each of the in-between dirts.
var dry = new THREE.Color(0xbb8855); // dry
var wet = new THREE.Color(0x882200); // moist

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

// leaf litter (in reality leaf litter is brown, but use a slightly
// greenish tone here so it doesn't just look like more dirt)
ScapeStuff.leaflitter = new Lambert({ color: 0x556b2f });

// ------------------------------------------------------------------
module.exports = ScapeStuff;





}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2NhcGUuanMiLCJzcmMvc2NhcGUvYmFzZW9iamVjdC5qcyIsInNyYy9zY2FwZS9jaHVuay5qcyIsInNyYy9zY2FwZS9maWVsZC5qcyIsInNyYy9zY2FwZS9pdGVtdHlwZXMuanMiLCJzcmMvc2NhcGUvaXRlbXR5cGVzL2N1YmUuanMiLCJzcmMvc2NhcGUvc2NlbmUuanMiLCJzcmMvc2NhcGUvc3R1ZmYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDamNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLy8gVEhSRUUgPSByZXF1aXJlKCd0aHJlZScpO1xuXG4vLyBnZXQgdGhlIHZhcmlvdXMgYml0c1xuYmFzZSAgPSByZXF1aXJlKCcuL3NjYXBlL2Jhc2VvYmplY3QnKTtcbnN0dWZmID0gcmVxdWlyZSgnLi9zY2FwZS9zdHVmZicpO1xuZmllbGQgPSByZXF1aXJlKCcuL3NjYXBlL2ZpZWxkJyk7XG5zY2VuZSA9IHJlcXVpcmUoJy4vc2NhcGUvc2NlbmUnKTtcbmNodW5rID0gcmVxdWlyZSgnLi9zY2FwZS9jaHVuaycpO1xuXG4vLyBtYWtlIGFuIG9iamVjdCBvdXQgb2YgdGhlIHZhcmlvdXMgYml0c1xuU2NhcGUgPSB7XG4gICAgQmFzZU9iamVjdDogYmFzZSxcbiAgICBTdHVmZjogc3R1ZmYsXG4gICAgQ2h1bms6IGNodW5rLFxuICAgIEZpZWxkOiBmaWVsZCxcbiAgICBTY2VuZTogc2NlbmVcbn1cblxuLy8gcmV0dXJuIHRoZSBvYmplY3QgaWYgd2UncmUgYmVpbmcgYnJvd3NlcmlmaWVkOyBvdGhlcndpc2UgYXR0YWNoXG4vLyBpdCB0byB0aGUgZ2xvYmFsIHdpbmRvdyBvYmplY3QuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNjYXBlO1xufSBlbHNlIHtcbiAgICB3aW5kb3cuU2NhcGUgPSBTY2FwZTtcbn1cbiIsIlxuLy9cbi8vIHRoaXMgXCJiYXNlXCIgb2JqZWN0IGhhcyBhIGZldyBjb252ZW5pZW5jZSBmdW5jdGlvbnMgZm9yIGhhbmRsaW5nXG4vLyBvcHRpb25zIGFuZCB3aGF0bm90XG4vL1xuXG5mdW5jdGlvbiBTY2FwZU9iamVjdChvcHRpb25zLCBkZWZhdWx0cykge1xuICAgIHRoaXMuX29wdHMgPSBPYmplY3QuY3JlYXRlKGRlZmF1bHRzKTtcbiAgICB0aGlzLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcbn07XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbWVyZ2UgbmV3IG9wdGlvbnMgaW50byBvdXIgb3B0aW9uc1xuU2NhcGVPYmplY3QucHJvdG90eXBlLm1lcmdlT3B0aW9ucyA9IGZ1bmN0aW9uKGV4dHJhT3B0cykge1xuICAgIGZvciAob3B0IGluIGV4dHJhT3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzW29wdF0gPSBleHRyYU9wdHNbb3B0XTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVPYmplY3Q7IiwiXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWN0YW5ndWxhciBwcmlzbSBvZiBtYXRlcmlhbCB0aGF0IHRoZSBzb2xpZCBcImdyb3VuZFwiXG4gKiBwb3J0aW9uIG9mIGEgJ3NjYXBlIGlzIG1ha2UgdXAgb2YsIGUuZy4gZGlydCwgbGVhZiBsaXR0ZXIsIHdhdGVyLlxuICpcbiAqIFRoaXMgd2lsbCBjcmVhdGUgKGFuZCBpbnRlcm5hbGx5IGNhY2hlKSBhIG1lc2ggYmFzZWQgb24gdGhlIGxpbmtlZFxuICogY2h1bmsgaW5mb3JtYXRpb24gdG8gbWFrZSByZW5kZXJpbmcgaW4gV2ViR0wgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSB7U2NhcGVTY2VuZX0gc2NlbmUgVGhlIFNjYXBlU2NlbmUgdGhlIGNodW5rIHdpbGwgYmUgYWRkZWQgaW50b1xuICogQHBhcmFtIHtPYmplY3R9IHBhcmVudEJsb2NrIFRoZSBibG9jayAodmVydGljYWwgY29sdW1uIHdpdGhpbiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2FwZSkgdGhhdCBvd25zIHRoaXMgY2h1bmtcbiAqIEBwYXJhbSB7SW50ZWdlcn0gbGF5ZXJJbmRleCBJbmRleCBpbnRvIHBhcmVudEJsb2NrLmcgdGhpcyBjaHVuayBpcyBhdFxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblogbG93ZXN0IFogdmFsdWUgYW55IGNodW5rIHNob3VsZCBoYXZlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMsIG5vdCBjdXJyZW50bHkgdXNlZFxuICpcbiAqIEBjbGFzc1xuICovXG5mdW5jdGlvbiBTY2FwZUNodW5rKHNjZW5lLCBwYXJlbnRCbG9jaywgbGF5ZXJJbmRleCwgbWluWiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge307XG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9ibG9jayA9IHBhcmVudEJsb2NrO1xuICAgIHRoaXMuX2lzU3VyZmFjZSA9IChsYXllckluZGV4ID09IDApO1xuICAgIHRoaXMuX2xheWVyID0gcGFyZW50QmxvY2suZ1tsYXllckluZGV4XTtcbiAgICB0aGlzLl9taW5aID0gbWluWjtcbiAgICB0aGlzLl9tZXNoID0gdGhpcy5fY3JlYXRlTmV3TWVzaCgpO1xuXG4gICAgLy8gVE9ETzogZmluaXNoIGhpbSEhXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVDaHVuay5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZUNodW5rLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlQ2h1bms7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogSW52b2tlIGEgcmVidWlsZCBvZiB0aGlzIGNodW5rLlxuICpcbiAqIERpc2NhcmRzIGV4aXN0aW5nIGNhY2hlZCBtZXNoIGFuZCBidWlsZHMgYSBuZXcgbWVzaCBiYXNlZCBvbiB0aGVcbiAqIGN1cnJlbnRseSBsaW5rZWQgY2h1bmsgaW5mb3JtYXRpb24uXG4gKlxuICogQHJldHVybiBub25lXG4gKi9cblNjYXBlQ2h1bmsucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91cGRhdGVNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9jcmVhdGVOZXdNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhlIGNodW5rIHdpbGwgYmUgYXMgZGVlcCBhcyB0aGUgbGF5ZXIgc2F5c1xuICAgIHZhciBkZXB0aCA9IHRoaXMuX2xheWVyLmR6O1xuICAgIGlmIChkZXB0aCA9PSAwKSB7XG4gICAgICAgIC8vIC4udW5sZXNzIHRoYXQncyAwLCBpbiB3aGljaCBjYXNlIGdvIHRvIHRoZSBib3R0b21cbiAgICAgICAgZGVwdGggPSB0aGlzLl9sYXllci56IC0gdGhpcy5fbWluWjtcbiAgICB9XG4gICAgLy8gbWFrZSBhIGdlb21ldHJ5IGZvciB0aGUgY2h1bmtcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShcbiAgICAgICAgdGhpcy5fYmxvY2suZHgsIHRoaXMuX2Jsb2NrLmR5LCBkZXB0aFxuICAgICk7XG4gICAgdmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaChnZW9tLCB0aGlzLl9sYXllci5tKTtcbiAgICBtZXNoLnBvc2l0aW9uLnNldChcbiAgICAgICAgdGhpcy5fYmxvY2sueCArIHRoaXMuX2Jsb2NrLmR4LzIsXG4gICAgICAgIHRoaXMuX2Jsb2NrLnkgKyB0aGlzLl9ibG9jay5keS8yLFxuICAgICAgICB0aGlzLl9sYXllci56IC0gZGVwdGgvMlxuICAgICk7XG4gICAgbWVzaC5jYXN0U2hhZG93ID0gdHJ1ZTtcbiAgICAvLyBvbmx5IHRoZSBzdXJmYWNlIGNodW5rcyByZWNlaXZlIHNoYWRvd1xuICAgIGlmICh0aGlzLl9pc1N1cmZhY2UpIHtcbiAgICAgICAgbWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlQ2h1bmsucHJvdG90eXBlLl9hZGRNZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2NlbmUuYWRkKHRoaXMuX21lc2gpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUNodW5rLnByb3RvdHlwZS5fcmVtb3ZlTWVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NjZW5lLnJlbW92ZSh0aGlzLl9tZXNoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVDaHVuay5wcm90b3R5cGUuX3VwZGF0ZU1lc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVNZXNoKCk7XG4gICAgdGhpcy5fbWVzaCA9IHRoaXMuX2NyZWF0ZU5ld01lc2goKTtcbiAgICB0aGlzLl9hZGRNZXNoKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVDaHVuazsiLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG5TY2FwZU9iamVjdCA9IHJlcXVpcmUoJy4vYmFzZW9iamVjdCcpO1xuU2NhcGVTdHVmZiA9IHJlcXVpcmUoJy4vc3R1ZmYnKTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBUaGUgY29udGFpbmVyIGZvciBhbGwgaW5mb3JtYXRpb24gYWJvdXQgYW4gYXJlYS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBWYXJpb3VzIG9wdGlvbnMgZm9yIHRoZSBTY2FwZUZpZWxkIGJlaW5nIGNyZWF0ZWQuXG4gKlxuICogb3B0aW9uIHwgZGVmYXVsdCB2YWx1ZSB8IGRlc2NyaXB0aW9uXG4gKiAtLS0tLS0tfC0tLS0tLS0tLS0tLS0tOnwtLS0tLS0tLS0tLS1cbiAqIGBtaW5YYCAgICAgfCAgICAwIHwgc21hbGxlc3QgWCBmb3IgdGhpcyBmaWVsZFxuICogYG1heFhgICAgICB8ICAxMDAgfCBsYXJnZXN0IFggZm9yIHRoaXMgZmllbGRcbiAqIGBibG9ja3NYYCAgfCAgIDEwIHwgbnVtYmVyIG9mIGJsb2NrcyB0byBkaXZpZGUgdGhlIFggYXhpcyBpbnRvXG4gKiBgbWluWWAgICAgIHwgICAgMCB8IHNtYWxsZXN0IFkgZm9yIHRoaXMgZmllbGRcbiAqIGBtYXhZYCAgICAgfCAgMTAwIHwgbGFyZ2VzdCBZIGZvciB0aGlzIGZpZWxkXG4gKiBgYmxvY2tzWWAgIHwgICAxMCB8IG51bWJlciBvZiBibG9ja3MgdG8gZGl2aWRlIHRoZSBZIGF4aXMgaW50b1xuICogYG1pblpgICAgICB8ICAgIDAgfCBzbWFsbGVzdCBaICh2ZXJ0aWNhbCBkaW1lbnNpb24pIGZvciB0aGlzIGZpZWxkXG4gKiBgbWF4WmAgICAgIHwgICA0MCB8IGxhcmdlc3QgWiBmb3IgdGhpcyBmaWVsZFxuICogYGJsb2Nrc1pgICB8ICAgODAgfCBudW1iZXIgb2YgYmxvY2tzIHRvIGRpdmlkZSB0aGUgWiBheGlzIGludG9cbiAqIGBibG9ja0dhcGAgfCAwLjA0IHwgZ2FwIHRvIGxlYXZlIGJldHdlZW4gYmxvY2tzIGFsb25nIHRoZSBYIGFuZCBZIGF4ZXNcbiAqXG4gKiBAY2xhc3NcbiAqL1xuZnVuY3Rpb24gU2NhcGVGaWVsZChvcHRpb25zKSB7XG5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICAgIG1pblg6IDAsICAgICAgICBtYXhYOiAxMDAsICAgICAgICAgIGJsb2Nrc1g6IDEwLFxuICAgICAgICBtaW5ZOiAwLCAgICAgICAgbWF4WTogMTAwLCAgICAgICAgICBibG9ja3NZOiAxMCxcbiAgICAgICAgbWluWjogMCwgICAgICAgIG1heFo6IDQwLCAgICAgICAgICAgYmxvY2tzWjogODAsXG4gICAgICAgIGJsb2NrR2FwOiAwLjA0XG4gICAgfTtcblxuICAgIC8vIGludm9rZSBvdXIgc3VwZXIgY29uc3RydWN0b3JcbiAgICBTY2FwZU9iamVjdC5jYWxsKHRoaXMsIG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcblxuICAgIC8vIG1pbiBhbmQgbWF4IHZhbHVlcyBmb3IgeCB5IGFuZCB6XG4gICAgdGhpcy5taW5YID0gdGhpcy5fb3B0cy5taW5YO1xuICAgIHRoaXMubWluWSA9IHRoaXMuX29wdHMubWluWTtcbiAgICB0aGlzLm1pblogPSB0aGlzLl9vcHRzLm1pblo7XG5cbiAgICB0aGlzLm1heFggPSB0aGlzLl9vcHRzLm1heFg7XG4gICAgdGhpcy5tYXhZID0gdGhpcy5fb3B0cy5tYXhZO1xuICAgIHRoaXMubWF4WiA9IHRoaXMuX29wdHMubWF4WjtcblxuICAgIC8vIGNvbnZlbmllbnQgXCJ3aWR0aHNcIlxuICAgIHRoaXMud1ggPSB0aGlzLm1heFggLSB0aGlzLm1pblg7XG4gICAgdGhpcy53WSA9IHRoaXMubWF4WSAtIHRoaXMubWluWTtcbiAgICB0aGlzLndaID0gdGhpcy5tYXhaIC0gdGhpcy5taW5aO1xuXG4gICAgLy8gaG93IG1hbnkgYmxvY2tzIGFjcm9zcyB4IGFuZCB5P1xuICAgIHRoaXMuYmxvY2tzWCA9IHRoaXMuX29wdHMuYmxvY2tzWDtcbiAgICB0aGlzLmJsb2Nrc1kgPSB0aGlzLl9vcHRzLmJsb2Nrc1k7XG4gICAgdGhpcy5ibG9ja3NaID0gdGhpcy5fb3B0cy5ibG9ja3NaO1xuXG4gICAgLy8gaG93IHdpZGUgaXMgZWFjaCBibG9ja1xuICAgIHRoaXMuX2JYID0gdGhpcy53WCAvIHRoaXMuYmxvY2tzWDtcbiAgICB0aGlzLl9iWSA9IHRoaXMud1kgLyB0aGlzLmJsb2Nrc1k7XG4gICAgdGhpcy5fYlogPSB0aGlzLndaIC8gdGhpcy5ibG9ja3NaO1xuXG4gICAgLy8gaG91c2VrZWVwaW5nXG4gICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cyA9IFtdO1xuICAgIHRoaXMuX2NhbGNDZW50ZXIoKTtcbiAgICB0aGlzLl9tYWtlR3JpZCgpO1xuXG4gICAgdGhpcy5faXRlbXMgPSBbXTtcblxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5oZXJpdGFuY2VcblNjYXBlRmllbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2FwZU9iamVjdC5wcm90b3R5cGUpO1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2FwZUZpZWxkO1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnKCcgKyB0aGlzLm1pblggKyAnLScgKyB0aGlzLm1heFggK1xuICAgICAgICAnLCAnICsgdGhpcy5taW5ZICsgJy0nICsgdGhpcy5tYXhZICtcbiAgICAgICAgJywgJyArIHRoaXMubWluWiArICctJyArIHRoaXMubWF4WiArXG4gICAgICAgICcpJ1xuICAgICk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVGaWVsZC5wcm90b3R5cGUuX21ha2VHcmlkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZyA9IFtdO1xuICAgIGZvciAodmFyIGd4ID0gMDsgZ3ggPCB0aGlzLmJsb2Nrc1g7IGd4KyspIHtcbiAgICAgICAgdmFyIGNvbCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5ibG9ja3NZOyBneSsrKSB7XG4gICAgICAgICAgICB2YXIgeEdhcCA9IHRoaXMuX2JYICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgeUdhcCA9IHRoaXMuX2JZICogdGhpcy5fb3B0cy5ibG9ja0dhcCAvIDI7XG4gICAgICAgICAgICB2YXIgYmxvY2sgPSB7XG4gICAgICAgICAgICAgICAgeDogdGhpcy5taW5YICsgKHRoaXMuX2JYICogZ3gpICsgeEdhcCxcbiAgICAgICAgICAgICAgICBkeDogdGhpcy5fYlggLSB4R2FwIC0geEdhcCxcbiAgICAgICAgICAgICAgICB5OiB0aGlzLm1pblkgKyAodGhpcy5fYlkgKiBneSkgKyB5R2FwLFxuICAgICAgICAgICAgICAgIGR5OiB0aGlzLl9iWSAtIHlHYXAgLSB5R2FwLFxuICAgICAgICAgICAgICAgIGc6IFt7XG4gICAgICAgICAgICAgICAgICAgIHo6IHRoaXMubWF4WixcbiAgICAgICAgICAgICAgICAgICAgZHo6IDAsIC8vIDAgbWVhbnMgXCJzdHJldGNoIHRvIG1pblpcIlxuICAgICAgICAgICAgICAgICAgICBtOiBTY2FwZVN0dWZmLmdlbmVyaWMsXG4gICAgICAgICAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb2wucHVzaChibG9jayk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZy5wdXNoKGNvbCk7XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgaXRlbXMgdG8gdGhlIHNjYXBlIGF0IHZhcmlvdXMgcG9pbnRzLlxuICogVW5saWtlIHtAbGluayBTY2FwZUZpZWxkI2FkZEl0ZW0gYWRkSXRlbX0sIHRoaXMgbWV0aG9kIHdpbGxcbiAqIHJlLXBvc2l0aW9uIGl0ZW1zIGFjcm9zcyB0aGUgRmllbGQgKHNvIHlvdSBkb24ndCBuZWVkIHRvIGNhbGxcbiAqIHtAbGluayBTY2FwZUZpZWxkI2NhbGNJdGVtcyBjYWxjSXRlbXN9IHlvdXJzZWxmKS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtTGlzdCBBIGxpc3Qgb2YgaXRlbXMuICBFYWNoIGVsZW1lbnQgbXVzdFxuICogaGF2ZSBgeGAsIGB5YCwgYW5kIGBpdGVtYCBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtCb29sZWFufSByZXBsYWNlIElmIGEgdHJ1dGh5IHZhbHVlIGlzIHN1cHBsaWVkLCB0aGlzXG4gKiBtZXRob2Qgd2lsbCBkaXNjYXJkIGV4aXN0aW5nIGhlaWdodCBjbGFpbXMgYmVmb3JlIGFkZGluZyB0aGVzZVxuICogb25lcy4gIElmIGZhbHNlIG9yIHVuc3VwcGxpZWQsIHRoZXNlIG5ldyBjbGFpbXMgd2lsbCBiZSBhZGRlZCB0b1xuICogdGhlIGV4aXN0aW5nIG9uZXMuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEl0ZW1zID0gZnVuY3Rpb24oaXRlbUxpc3QsIHJlcGxhY2UpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLl9pdGVtcyA9IFtdO1xuICAgIH1cbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpc3QgYWRkaW5nIGVhY2ggb25lLlxuICAgIGZvciAodmFyIHMgPSAwOyBzIDwgaXRlbUxpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHRoZUl0ZW0gPSBpdGVtTGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRJdGVtKHRoZUl0ZW0ueCwgdGhlSXRlbS55LCB0aGVJdGVtLml0ZW0pO1xuICAgIH1cbiAgICB0aGlzLmNhbGNJdGVtcygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEFkZCBhIGxpc3Qgb2YgY2xhaW1zIG9mIHRoZSBncm91bmQgaGVpZ2h0IGF0IHZhcmlvdXMgcG9pbnRzLlxuICogVW5saWtlIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZEhlaWdodCBhZGRHcm91bmRIZWlnaHR9LCB0aGlzXG4gKiBtZXRob2Qgd2lsbCByZS1leHRyYXBvbGF0ZSBncm91bmQgaGVpZ2h0cyBhY3Jvc3MgdGhlIEZpZWxkIChzb1xuICogeW91IGRvbid0IG5lZWQgdG8gY2FsbFxuICoge0BsaW5rIFNjYXBlRmllbGQjY2FsY0dyb3VuZEhlaWdodHMgY2FsY0dyb3VuZEhlaWdodHN9IHlvdXJzZWxmKS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBoZWlnaHRMaXN0IEEgbGlzdCBvZiBvYmplY3RzLiAgRWFjaCBlbGVtZW50IG11c3RcbiAqIGhhdmUgYHhgLCBgeWAsIGFuZCBgemAgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVwbGFjZSBJZiBhIHRydXRoeSB2YWx1ZSBpcyBzdXBwbGllZCwgdGhpc1xuICogbWV0aG9kIHdpbGwgZGlzY2FyZCBleGlzdGluZyBoZWlnaHQgY2xhaW1zIGJlZm9yZSBhZGRpbmcgdGhlc2VcbiAqIG9uZXMuICBJZiBmYWxzZSBvciB1bnN1cHBsaWVkLCB0aGVzZSBuZXcgY2xhaW1zIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBleGlzdGluZyBvbmVzLlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oaGVpZ2h0TGlzdCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuX2dyb3VuZEhlaWdodHMgPSBbXTtcbiAgICB9XG4gICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBsaXN0IGFkZGluZyBlYWNoIG9uZS5cbiAgICBmb3IgKHZhciBzID0gMDsgcyA8IGhlaWdodExpc3QubGVuZ3RoOyBzKyspIHtcbiAgICAgICAgdmFyIHB0ID0gaGVpZ2h0TGlzdFtzXTtcbiAgICAgICAgdGhpcy5hZGRHcm91bmRIZWlnaHQocHQueCwgcHQueSwgcHQueik7XG4gICAgfVxuICAgIHRoaXMuY2FsY0dyb3VuZEhlaWdodHMoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBjbGFpbSB0aGF0IHRoZSBncm91bmQgaGVpZ2h0IGlzIGB6YCBhdCBwb2ludCBgeGAsYHlgLlxuICogSWYgeW91IGNhbGwgdGhpcywgcmVtZW1iZXIgdG8gZXZlbnR1YWxseSBjYWxsXG4gKiB7QGxpbmsgU2NhcGVGaWVsZCNjYWxjR3JvdW5kSGVpZ2h0cyBjYWxjR3JvdW5kSGVpZ2h0c30gYWZ0ZXIgc29cbiAqIGdyb3VuZCBoZWlnaHRzIGdldCBleHRyYXBvbGF0ZWQgYWNyb3NzIHRoZSBlbnRpcmUgRmllbGQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb29yZGluYXRlIG9mIHRoaXMgZ3JvdW5kIGhlaWdodCByZWNvcmRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFkgY29vcmRpbmF0ZSBvZiB0aGlzIGdyb3VuZCBoZWlnaHQgcmVjb3JkXG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgaGVpZ2h0IG9mIHRoZSBncm91bmQgYXQgcG9zaXRpb24gYHhgLGB5YFxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRIZWlnaHQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgdGhpcy5fZ3JvdW5kSGVpZ2h0cy5wdXNoKHsgeDogeCwgeTogeSwgejogeiB9KTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYWRkaXRpb25hbCBncm91bmQgc3RhY2tzIHRvIHRoZSBmaWVsZCdzIGdyb3VuZCBzdGFja3MuXG4gKiBUaGUgZ3JvdW5kTGlzdCBpcyBhbiBhcnJheSBvZiBkYXRhIG9iamVjdHMuICBFYWNoIG9iamVjdCBuZWVkcyB4LFxuICogeSBhbmQgeiBwcm9wZXJ0aWVzLCBhbmQgYSAnc3RhY2snIHByb3BlcnR5LCBlYWNoIG1hdGNoaW5nIHRoZVxuICogY29ycmVzcG9uZGluZyBhcmcgdG8gYWRkR3JvdW5kU3RhY2suXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHJlcGxhY2UgaWYgcmVwbGFjZSBpcyB0cnV0aHksIGRpc2NhcmQgZXhpc3RpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBncm91bmQgcG9pbnRzIGZpcnN0LlxuICovXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5hZGRHcm91bmRTdGFja3MgPSBmdW5jdGlvbihncm91bmRMaXN0LCByZXBsYWNlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5fZ3JvdW5kU3RhY2tzID0gW107XG4gICAgfVxuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdCBhZGRpbmcgZWFjaCBvbmUuXG4gICAgZm9yICh2YXIgcyA9IDA7IHMgPCBncm91bmRMaXN0Lmxlbmd0aDsgcysrKSB7XG4gICAgICAgIHZhciBwdCA9IGdyb3VuZExpc3Rbc107XG4gICAgICAgIHRoaXMuYWRkR3JvdW5kU3RhY2socHQueCwgcHQueSwgcHQuc3RhY2spO1xuICAgIH1cbiAgICB0aGlzLmNhbGNHcm91bmRTdGFja3MoKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBBZGQgYSBncm91bmQgc3RhY2sgYXQgeCx5LCBzdGFydGluZyBhdCBoZWlnaHQgei5cbiAqIFRoZSBzdGFjayBpcyBhbiBhcnJheSBvZiB0d28tZWxlbWVudCBhcnJheXMgd2l0aCBhIE1hdGVyaWFsXG4gKiBhbmQgYSBkZXB0aCBudW1iZXIsIGxpa2UgdGhpczpcbiAqIFtcbiAqICAgICBbTWF0ZXJpYWwubGVhZkxpdHRlciwgMC4zXSxcbiAqICAgICBbTWF0ZXJpYWwuZGlydCwgMy41XSxcbiAqICAgICBbTWF0ZXJpYWwuc3RvbmUsIDRdXG4gKiBdXG4gKiBUaGF0IHB1dHMgYSBsZWFmbGl0dGVyIGxheWVyIDAuMyB1bml0cyBkZWVwIG9uIGEgMy41LXVuaXRcbiAqIGRlZXAgZGlydCBsYXllciwgd2hpY2ggaXMgb24gYSBzdG9uZSBsYXllci4gIElmIHRoZSBmaW5hbFxuICogbGF5ZXIncyBkZXB0aCBpcyB6ZXJvLCB0aGF0IGxheWVyIGlzIGFzc3VtZWQgdG8gZ28gYWxsIHRoZVxuICogd2F5IHRvIG1pblouXG4gKiBJZiB5b3UgY2FsbCB0aGlzLCByZW1lbWJlciB0byBjYWxjR3JvdW5kKCkgYWZ0ZXIuXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmFkZEdyb3VuZFN0YWNrID0gZnVuY3Rpb24oeCwgeSwgc3RhY2spIHtcbiAgICAvLyBUT0RPOiBjaGVjayBmb3IgdmFsaWRpdHlcbiAgICB0aGlzLl9ncm91bmRTdGFja3MucHVzaCh7IHg6IHgsICB5OiB5LCAgc3RhY2s6IHN0YWNrIH0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIChyZSljYWxjdWxhdGUgdGhlIGdyb3VuZCBoZWlnaHQuICBZb3UgbmVlZCB0byBjYWxsIHRoaXMgaWYgeW91XG4gKiBhZGQgZ3JvdW5kIGhlaWdodCBjbGFpbXMgb25lIGF0IGEgdGltZSB1c2luZ1xuICoge0BsaW5rIFNjYXBlRmllbGQjYWRkR3JvdW5kSGVpZ2h0IGFkZEdyb3VuZEhlaWdodH0uXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRIZWlnaHRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBibG9jaykge1xuICAgICAgICAvLyBUT0RPOiBjaGVjayBlcnJcblxuICAgICAgICAvLyBmaW5kIGhlaWdodCBmb3IgdGhpcyBncm91bmQgYmxvY2sgYnkgYWxsb3dpbmcgZWFjaFxuICAgICAgICAvLyBrbm93biBncm91bmQgaGVpZ2h0IHRvIFwidm90ZVwiIHVzaW5nIHRoZSBpbnZlcnNlIG9mXG4gICAgICAgIC8vIGl0J3Mgc3F1YXJlZCBkaXN0YW5jZSBmcm9tIHRoZSBjZW50cmUgb2YgdGhlIGJsb2NrLlxuICAgICAgICB2YXIgaCwgZHgsIGR5LCBkaXN0LCB2b3RlU2l6ZTtcbiAgICAgICAgdmFyIGJaID0gMDtcbiAgICAgICAgdmFyIHZvdGVzID0gMDtcbiAgICAgICAgZm9yICh2YXIgZ2g9MDsgZ2ggPCB0aGlzLl9ncm91bmRIZWlnaHRzLmxlbmd0aDsgZ2grKykge1xuICAgICAgICAgICAgaCA9IHRoaXMuX2dyb3VuZEhlaWdodHNbZ2hdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIGgueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBoLnk7XG4gICAgICAgICAgICBkaXN0ID0gMSArIGR4KmR4ICsgZHkqZHk7XG4gICAgICAgICAgICB2b3RlU2l6ZSA9IDEgLyBkaXN0O1xuICAgICAgICAgICAgYlogKz0gaC56ICogdm90ZVNpemU7XG4gICAgICAgICAgICB2b3RlcyArPSB2b3RlU2l6ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgZGl2aWRlIHRvIGZpbmQgdGhlIGF2ZXJhZ2VcbiAgICAgICAgYlogPSBiWiAvIHZvdGVzO1xuXG4gICAgICAgIC8vIGJsb2NrLWlzaCBoZWlnaHRzOiByb3VuZCB0byB0aGUgbmVhcmVzdCBfYlpcbiAgICAgICAgdmFyIGRpZmZaID0gYlogLSB0aGlzLm1pblo7XG4gICAgICAgIGJaID0gdGhpcy5taW5aICsgTWF0aC5yb3VuZChkaWZmWiAvIHRoaXMuX2JaKSAqIHRoaXMuX2JaO1xuXG4gICAgICAgIC8vIG9rYXkgbm93IHdlIGtub3cgYSBoZWlnaHQhICBzZXQgaXRcbiAgICAgICAgdGhpcy5zZXRCbG9ja0hlaWdodChibG9jaywgYlopO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogKHJlKWNhbGN1bGF0ZSB0aGUgZ3JvdW5kIHN0YWNrcy4gIFlvdSBuZWVkIHRvIGNhbGwgdGhpcyBpZiB5b3VcbiAqIGFkZCBncm91bmQgc3RhY2tzIG9uZSBhdCBhIHRpbWUgdXNpbmdcbiAqIHtAbGluayBTY2FwZUZpZWxkI2FkZEdyb3VuZFN0YWNrIGFkZEdyb3VuZFN0YWNrfS5cbiAqXG4gKi9cblNjYXBlRmllbGQucHJvdG90eXBlLmNhbGNHcm91bmRTdGFja3MgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZWFjaEJsb2NrKCBmdW5jdGlvbihlcnIsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGVyclxuXG4gICAgICAgIC8vIG1ha2UgdGhlIHN0YWNrIGZvciB0aGlzIGdyb3VuZCBibG9jayBieSBjb3B5aW5nIHRoZVxuICAgICAgICAvLyBuZWFyZXN0IGRlZmluZWQgc3RhY2suXG4gICAgICAgIHZhciBzLCBkeCwgZHksIHRoaXNEaXN0LCBiZXN0U3RhY2s7XG4gICAgICAgIHZhciBiZXN0RGlzdCA9IHRoaXMud1ggKyB0aGlzLndZICsgdGhpcy53WjtcbiAgICAgICAgYmVzdERpc3QgPSBiZXN0RGlzdCAqIGJlc3REaXN0O1xuICAgICAgICBmb3IgKHZhciBncz0wOyBncyA8IHRoaXMuX2dyb3VuZFN0YWNrcy5sZW5ndGg7IGdzKyspIHtcbiAgICAgICAgICAgIHMgPSB0aGlzLl9ncm91bmRTdGFja3NbZ3NdO1xuICAgICAgICAgICAgZHggPSBibG9jay54ICsgKDAuNSAqIHRoaXMuX2JYKSAtIHMueDtcbiAgICAgICAgICAgIGR5ID0gYmxvY2sueSArICgwLjUgKiB0aGlzLl9iWSkgLSBzLnk7XG4gICAgICAgICAgICB0aGlzRGlzdCA9IDEgKyBkeCpkeCArIGR5KmR5O1xuICAgICAgICAgICAgaWYgKHRoaXNEaXN0IDwgYmVzdERpc3QpIHtcbiAgICAgICAgICAgICAgICBiZXN0U3RhY2sgPSBzO1xuICAgICAgICAgICAgICAgIGJlc3REaXN0ID0gdGhpc0Rpc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBva2F5IHdlIGdvdCBhIHN0YWNrLlxuICAgICAgICB0aGlzLnNldEdyb3VuZFN0YWNrKGJsb2NrLCBiZXN0U3RhY2suc3RhY2spO1xuXG4gICAgfSwgdGhpcyk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLl9jYWxjQ2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY2FsY3VsYXRlIHRoZSBjZW50cmUgb2YgdGhlIGZpZWxkIGFuZCByZWNvcmQgaXQgYXMgLmNlbnRlclxuICAgIHRoaXMuY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICh0aGlzLm1pblggKyB0aGlzLm1heFgpIC8gMixcbiAgICAgICAgKHRoaXMubWluWSArIHRoaXMubWF4WSkgLyAyLFxuICAgICAgICAodGhpcy5taW5aICsgdGhpcy5tYXhaKSAvIDJcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRHcm91bmRTdGFjayA9IGZ1bmN0aW9uKGJsb2NrLCBzdGFjaykge1xuICAgIHZhciBsYXllckxldmVsID0gYmxvY2suZ1swXS56O1xuICAgIGZvciAodmFyIGxheWVyID0gMDsgbGF5ZXIgPCBzdGFjay5sZW5ndGg7IGxheWVyKyspIHtcbiAgICAgICAgYmxvY2suZ1tsYXllcl0gPSB7XG4gICAgICAgICAgICB6OiBsYXllckxldmVsLFxuICAgICAgICAgICAgZHo6IHN0YWNrW2xheWVyXVsxXSxcbiAgICAgICAgICAgIG06IHN0YWNrW2xheWVyXVswXSxcbiAgICAgICAgICAgIGNodW5rOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIGxheWVyTGV2ZWwgLT0gc3RhY2tbbGF5ZXJdWzFdO1xuICAgIH1cbiAgICB0aGlzLnJlYnVpbGRDaHVua3MoYmxvY2spO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5yZWJ1aWxkQ2h1bmtzID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICBmb3IgKHZhciBsID0gMDsgbCA8IGJsb2NrLmcubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgaWYgKGJsb2NrLmdbbF0uY2h1bmspIHtcbiAgICAgICAgICAgIGJsb2NrLmdbbF0uY2h1bmsucmVidWlsZCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5zZXRCbG9ja0hlaWdodCA9IGZ1bmN0aW9uKGJsb2NrLCB6KSB7XG4gICAgLy8gdG8gc2V0IHRoZSBibG9jayBncm91bmQgaGVpZ2h0LCB3ZSBuZWVkIHRvIGZpbmQgdGhlIGJsb2NrJ3NcbiAgICAvLyBjdXJyZW50IGdyb3VuZCBoZWlnaHQgKHRoZSB6IG9mIHRoZSB0b3AgbGF5ZXIpLCB3b3JrIG91dCBhXG4gICAgLy8gZGlmZiBiZXR3ZWVuIHRoYXQgYW5kIHRoZSBuZXcgaGVpZ2h0LCBhbmQgYWRkIHRoYXQgZGlmZiB0b1xuICAgIC8vIGFsbCB0aGUgbGF5ZXJzLlxuICAgIHZhciBkWiA9IHogLSBibG9jay5nWzBdLno7XG4gICAgdmFyIGRlcHRoO1xuICAgIGZvciAodmFyIGwgPSAwOyBsIDwgYmxvY2suZy5sZW5ndGg7IGwrKykge1xuICAgICAgICBibG9jay5nW2xdLnogKz0gZFo7XG4gICAgfVxuICAgIHRoaXMucmVidWlsZENodW5rcyhibG9jayk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblNjYXBlRmllbGQucHJvdG90eXBlLmdldEJsb2NrID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIC8vIHJldHVybiB0aGUgYmxvY2sgdGhhdCBpbmNsdWRlcyAgeCx5XG4gICAgdmFyIGd4ID0gKHggLSB0aGlzLm1pblgpIC8gdGhpcy5fYlg7XG4gICAgdmFyIGd5ID0gKHkgLSB0aGlzLm1pblkpIC8gdGhpcy5fYlk7XG4gICAgcmV0dXJuICh0aGlzLl9nW2d4XVtneV0pO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbnZva2UgdGhlIGNhbGxiYWNrIGVhY2ggYmxvY2sgaW4gdHVyblxuLy8gY2FsbGJhY2sgc2hvdWxkIGxvb2sgbGlrZTogZnVuY3Rpb24oZXJyLCBibG9jaykgeyAuLi4gfVxuLy8gaWYgZXJyIGlzIG51bGwgZXZlcnl0aGluZyBpcyBmaW5lLiBpZiBlcnIgaXMgbm90IG51bGwsIHRoZXJlXG4vLyB3YXMgYW4gZXJyb3IuXG5TY2FwZUZpZWxkLnByb3RvdHlwZS5lYWNoQmxvY2sgPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZywgb3JkZXIpIHtcbiAgICBpZiAob3JkZXIgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9yZGVyID0gJ3h1cC15dXAnO1xuICAgIH1cbiAgICBpZiAodGhpc0FyZyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpc0FyZyA9IHRoaXM7XG4gICAgfVxuICAgIGlmIChvcmRlciA9PSAneHVwLXl1cCcpIHtcbiAgICAgICAgZm9yICh2YXIgZ3ggPSAwOyBneCA8IHRoaXMuX2cubGVuZ3RoOyBneCsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBneSA9IDA7IGd5IDwgdGhpcy5fZ1swXS5sZW5ndGg7IGd5KyspIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIG51bGwsIHRoaXMuX2dbZ3hdW2d5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUZpZWxkO1xuXG5cblxuXG4iLCJcbi8qKlxuICogQSBiYWcgb2YgaXRlbSB0eXBlcyAtLSBpLmUuIFRIUkVFLkdlb21ldHJ5cyAtLSB0aGF0IHNjYXBlcyBjYW4gaGF2ZSBpbiB0aGVtLlxuICpcbiAqIEBlbnVtXG4gKi9cbnZhciBTY2FwZUl0ZW1zID0ge1xuICAgIEN1YmU6IHJlcXVpcmUoJy4vaXRlbXR5cGVzL2N1YmUnKVxufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubW9kdWxlLmV4cG9ydHMgPSBTY2FwZUl0ZW1zO1xuIiwiXG52YXIgVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblxuZnVuY3Rpb24gU2NhcGVDdWJlKHNpemUsIG9wdGlvbnMpIHtcbiAgICAvLyBjb25zdHJ1Y3QgYSBtZXNoIFwic2l0dGluZyBvblwiIHRoZSBwb2ludCAwLDAsMFxuICAgIHNpemUgPSBzaXplIHx8IDE7XG5cbiAgICAvLyBtYWtlcyBhIGN1YmUgY2VudGVyZWQgb24gMCwwLDBcbiAgICB2YXIgZ2VvbSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShzaXplLCBzaXplLCBzaXplKTtcblxuICAgIC8vIHRyYW5zZm9ybSBpdCB1cCBhIGJpdCwgc28gd2UncmUgY2VudGVyZWQgb24geCA9IDAgYW5kIHkgPSAwLCBidXQgaGF2ZSB0aGUgX2JvdHRvbV8gZmFjZSBzaXR0aW5nIG9uIHogPSAwLlxuICAgIGdlb20uYXBwbHlNYXRyaXgoIG5ldyBUSFJFRS5NYXRyaXg0KCkubWFrZVRyYW5zbGF0aW9uKDAsIDAsIHNpemUvMikgKTtcblxuICAgIHJldHVybiBnZW9tO1xufTtcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxubWFrZUdlb21ldHJ5ID0gZnVuY3Rpb24oc2l6ZSkge1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlQ3ViZTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuVEhSRUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5USFJFRSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuVEhSRUUgOiBudWxsKTtcblNjYXBlT2JqZWN0ID0gcmVxdWlyZSgnLi9iYXNlb2JqZWN0Jyk7XG5TY2FwZUNodW5rID0gcmVxdWlyZSgnLi9jaHVuaycpO1xuXG5cbi8vIERFQlVHXG5TY2FwZUl0ZW1zID0gcmVxdWlyZSgnLi9pdGVtdHlwZXMnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEBjYWxsYmFjayBTY2FwZVNjZW5lfmRhdGVDaGFuZ2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBlcnJvciBEZXNjcmlwdGlvbiBvZiBlcnJvciwgb3RoZXJ3aXNlIG51bGxcbiAqIEBwYXJhbSB7ZGF0ZX0gZGF0ZSBEYXRlIHRoZSBzY2FwZSBpcyBub3cgZGlzcGxheWluZ1xuICovXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgb2YgYSBsYW5kc2NhcGUgLyBtb29uc2NhcGUgLyB3aGF0ZXZlclxuICogQHBhcmFtIHtTY2FwZUZpZWxkfSBmaWVsZCAgdGhlIGZpZWxkIGJlaW5nIHJlbmRlcmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gZG9tICAgICAgICBET00gZWxlbWVudCB0aGUgc2NhcGUgc2hvdWxkIGJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlZCBpbnRvLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgICAgY29sbGVjdGlvbiBvZiBvcHRpb25zLiAgQWxsIGFyZSBvcHRpb25hbC5cbiAqIEBwYXJhbSB7U3RyaW5nW119IG9wdGlvbnMubGlnaHRzPSdzdW4nLCdza3knIC0gYXJyYXkgb2Ygc3RyaW5nc1xuICogbmFtaW5nIGxpZ2h0cyB0byBpbmNsdWRlIGluIHRoaXMgc2NlbmUuICBDaG9vc2UgZnJvbTpcbiAqXG4gKiBzdHJpbmcgICAgfCBsaWdodCB0eXBlXG4gKiAtLS0tLS0tLS0tfC0tLS0tLS0tLS0tXG4gKiBgdG9wbGVmdGAgfCBhIGxpZ2h0IGZyb20gYWJvdmUgdGhlIGNhbWVyYSdzIGxlZnQgc2hvdWxkZXJcbiAqIGBhbWJpZW50YCB8IGEgZGltIGFtYmllbnQgbGlnaHRcbiAqIGBzdW5gICAgICB8IGEgZGlyZWN0aW9uYWwgbGlnaHQgdGhhdCBvcmJpdHMgdGhlIHNjZW5lIG9uY2UgcGVyIGRheVxuICogYHNreWAgICAgIHwgYSBkaXJlY3Rpb25hbCBsaWdodCB0aGF0IHNoaW5lcyBmcm9tIGFib3ZlIHRoZSBzY2VuZVxuICogQHBhcmFtIHtEYXRlfFwibm93XCJ9IG9wdGlvbnMuY3VycmVudERhdGU9J25vdycgLSBUaGUgdGltZSBhbmQgZGF0ZVxuICogaW5zaWRlIHRoZSBzY2FwZS4gIFRoZSBzdHJpbmcgXCJub3dcIiBtZWFucyBzZXQgY3VycmVudERhdGUgdG8gdGhlXG4gKiBwcmVzZW50LlxuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMudGltZVJhdGlvPTEgVGhlIHJhdGUgdGltZSBzaG91bGQgcGFzcyBpblxuICogdGhlIHNjYXBlLCByZWxhdGl2ZSB0byBub3JtYWwuICAwLjEgbWVhbnMgdGVuIHRpbWVzIHNsb3dlci4gIDYwXG4gKiBtZWFucyBvbmUgbWludXRlIHJlYWwgdGltZSA9IG9uZSBob3VyIHNjYXBlIHRpbWUuXG4gKiBAcGFyYW0ge1NjYXBlU2NlbmV+ZGF0ZUNoYW5nZX0gb3B0aW9ucy5kYXRlVXBkYXRlIGNhbGxiYWNrIGZvclxuICogd2hlbiB0aGUgc2NlbmUgdGltZSBjaGFuZ2VzICh3aGljaCBpcyBhIGxvdCkuXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFNjYXBlU2NlbmUoZmllbGQsIGRvbSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgICAvLyBsaWdodHM6IFsndG9wbGVmdCcsICdhbWJpZW50J10sXG4gICAgICAgIGxpZ2h0czogWydzdW4nLCAnc2t5J10sXG4gICAgICAgIGN1cnJlbnREYXRlOiAnbm93JywgIC8vIGVpdGhlciBzdHJpbmcgJ25vdycgb3IgYSBEYXRlIG9iamVjdFxuICAgICAgICB0aW1lUmF0aW86IDEsXG4gICAgICAgIGRhdGVVcGRhdGU6IG51bGwgLy8gY2FsbGJhY2sgdG91cGRhdGUgdGhlIGRpc3BsYXllZCBkYXRlL3RpbWVcbiAgICB9O1xuXG4gICAgLy8gaW52b2tlIG91ciBzdXBlciBjb25zdHJ1Y3RvclxuICAgIFNjYXBlT2JqZWN0LmNhbGwodGhpcywgb3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXG4gICAgLy8gc2F2ZSB0aGUgZmllbGRcbiAgICB0aGlzLmYgPSBmaWVsZDtcblxuICAgIC8vIGRpc2NvdmVyIERPTSBjb250YWluZXJcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkb20pO1xuXG4gICAgdGhpcy5kYXRlID0gdGhpcy5fb3B0cy5jdXJyZW50RGF0ZTtcbiAgICBpZiAodGhpcy5kYXRlID09PSAnbm93Jykge1xuICAgICAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLnN0YXJ0RGF0ZSA9IHRoaXMuZGF0ZTtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAvLyBjcmVhdGUgYW5kIHNhdmUgYWxsIHRoZSBiaXRzIHdlIG5lZWRcbiAgICB0aGlzLnJlbmRlcmVyID0gdGhpcy5fbWFrZVJlbmRlcmVyKHsgZG9tOiB0aGlzLmVsZW1lbnQgfSk7XG4gICAgdGhpcy5zY2VuZSA9IHRoaXMuX21ha2VTY2VuZSgpO1xuICAgIHRoaXMuY2FtZXJhID0gdGhpcy5fbWFrZUNhbWVyYSgpO1xuICAgIHRoaXMuY29udHJvbHMgPSB0aGlzLl9tYWtlQ29udHJvbHMoKTtcbiAgICB0aGlzLmxpZ2h0cyA9IHRoaXMuX21ha2VMaWdodHModGhpcy5fb3B0cy5saWdodHMpO1xuXG4gICAgdGhpcy5hZGRCbG9ja3MoKTtcblxuICAgIC8vIGFkZCBncmlkcyBhbmQgaGVscGVyIGN1YmVzXG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCk7XG4gICAgLy8gdGhpcy5hZGRIZWxwZXJHcmlkKCd0b3AnKTtcbiAgICB0aGlzLmFkZEhlbHBlclNoYXBlcygpO1xuXG5cbiAgICB2YXIgbGFzdExvZ0F0ID0gMDsgLy8gREVCVUdcbiAgICByZW5kZXIgPSAoZnVuY3Rpb24gdW5ib3VuZFJlbmRlcih0cykge1xuXG4gICAgICAgIC8vIERFQlVHXG4gICAgICAgIGlmIChsYXN0TG9nQXQgKyAyMDAwIDwgdHMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcuLi4nKTtcbiAgICAgICAgICAgIGxhc3RMb2dBdCA9IHRzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gREVCVUcgZGlzYWJsZWQgdGltZSB1cGRhdGVzLi5cbiAgICAgICAgLy8gdGhpcy5fdXBkYXRlVGltZSgpO1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHJlbmRlciApO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlciggdGhpcy5zY2VuZSwgdGhpcy5jYW1lcmEgKTtcbiAgICAgICAgdGhpcy5jb250cm9scy51cGRhdGUoKTtcbiAgICB9KS5iaW5kKHRoaXMpO1xuXG4gICAgcmVuZGVyKDApO1xuXG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmhlcml0YW5jZVxuU2NhcGVTY2VuZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNjYXBlT2JqZWN0LnByb3RvdHlwZSk7XG5TY2FwZVNjZW5lLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjYXBlU2NlbmU7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGJsb2NrcyBmcm9tIHRoZSBhdHRhY2hlZCBTY2FwZUZpZWxkIGludG8gdGhlIHNjZW5lLlxuICpcbiAqIFlvdSB3aWxsIHByb2JhYmx5IG9ubHkgbmVlZCB0byBjYWxsIHRoaXMgb25jZS5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkQmxvY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoZVNjZW5lID0gdGhpcy5zY2VuZTtcbiAgICB2YXIgbWluWiA9IHRoaXMuZi5taW5aO1xuICAgIHZhciBkZXB0aCwgbGF5ZXI7XG4gICAgdGhpcy5mLmVhY2hCbG9jayggZnVuY3Rpb24oZXJyLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGxheWVySW5kZXggPSAwOyBsYXllckluZGV4IDwgYi5nLmxlbmd0aDsgbGF5ZXJJbmRleCsrKSB7XG4gICAgICAgICAgICBiLmdbbGF5ZXJJbmRleF0uY2h1bmsgPSBuZXcgU2NhcGVDaHVuayhcbiAgICAgICAgICAgICAgICB0aGVTY2VuZSwgYiwgbGF5ZXJJbmRleCwgbWluWlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZi5jYWxjR3JvdW5kSGVpZ2h0cygpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIGFkZCBoZWxwZXIgY3ViZXMgYXQgc29tZSBvZiB0aGUgY29ybmVycyBvZiB5b3VyIHNjYXBlLCBzbyB5b3UgY2FuXG4gKiBzZWUgd2hlcmUgdGhleSBhcmUgaW4gc3BhY2UuXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLmFkZEhlbHBlclNoYXBlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB3aGl0ZSA9IDB4ZmZmZmZmO1xuICAgIHZhciByZWQgICA9IDB4ZmYwMDAwO1xuICAgIHZhciBncmVlbiA9IDB4MDBmZjAwO1xuICAgIHZhciBibHVlICA9IDB4MDAwMGZmO1xuXG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKHRoaXMuZi5taW5YLCB0aGlzLmYubWluWSwgdGhpcy5mLm1pblosIHdoaXRlKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUodGhpcy5mLm1heFgsIHRoaXMuZi5taW5ZLCB0aGlzLmYubWluWiwgcmVkKTtcbiAgICB0aGlzLmFkZEhlbHBlckN1YmUoKHRoaXMuZi5taW5YICsgdGhpcy5mLm1heFgpIC8gMiwgdGhpcy5mLm1pblksIHRoaXMuZi5taW5aLCByZWQpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSh0aGlzLmYubWluWCwgdGhpcy5mLm1heFksIHRoaXMuZi5taW5aLCBncmVlbik7XG4gICAgdGhpcy5hZGRIZWxwZXJDdWJlKHRoaXMuZi5taW5YLCB0aGlzLmYubWluWSwgdGhpcy5mLm1heFosIGJsdWUpO1xuICAgIHRoaXMuYWRkSGVscGVyQ3ViZSh0aGlzLmYubWF4WCwgdGhpcy5mLm1heFksIHRoaXMuZi5taW5aLCB3aGl0ZSk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogYWRkIGEgY3ViZSBhdCBwb3NpdGlvbiBgeGAsIGB5YCwgYHpgIHRvIGNvbmZpcm0gd2hlcmUgdGhhdCBpcyxcbiAqIGV4YWN0bHkuICBHcmVhdCBmb3IgdHJ5aW5nIHRvIHdvcmsgb3V0IGlmIHlvdXIgc2NhcGUgaXMgYmVpbmdcbiAqIHJlbmRlcmVkIHdoZXJlIHlvdSB0aGluayBpdCBzaG91bGQgYmUgcmVuZGVyZWQuXG4gKlxuICogQHBhcmFtIHsoTnVtYmVyfFZlY3RvcjMpfSB4IFggY29vcmRpbmF0ZSwgb3IgYSB7QGxpbmsgaHR0cDovL3RocmVlanMub3JnL2RvY3MvI1JlZmVyZW5jZS9NYXRoL1ZlY3RvcjMgVEhSRUUuVmVjdG9yM30gY29udGFpbmluZyB4LCB5IGFuZCB6IGNvb3Jkc1xuICogQHBhcmFtIHtOdW1iZXJ9IFt5XSBZIGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBbel0gWiBjb29yZGluYXRlXG4gKiBAcGFyYW0ge0NvbG9yfFN0cmluZ3xJbnRlZ2VyfSBjb2xvcj0nI2NjY2NjYycgQ29sb3Igb2YgY3ViZS5cbiAqIENhbiBiZSBhIHtAbGluayBodHRwOi8vdGhyZWVqcy5vcmcvZG9jcy8jUmVmZXJlbmNlL01hdGgvQ29sb3IgVEhSRUUuQ29sb3J9LCBhIGNvbG9yLXBhcnNlYWJsZSBzdHJpbmcgbGlrZVxuICogYCcjMzM2NmNjJ2AsIG9yIGEgbnVtYmVyIGxpa2UgYDB4MzM2NmNjYC5cbiAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuYWRkSGVscGVyQ3ViZSA9IGZ1bmN0aW9uKHgsIHksIHosIGNvbG9yKSB7XG4gICAgLy8gZmlyc3QsIHNldCB0aGUgY29sb3IgdG8gc29tZXRoaW5nXG4gICAgaWYgKHR5cGVvZiBjb2xvciA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBkZWZhdWx0IHRvIGxpZ2h0IGdyZXkuXG4gICAgICAgIGNvbG9yID0gbmV3IFRIUkVFLkNvbG9yKDB4Y2NjY2NjKTtcbiAgICB9XG4gICAgdmFyIHBvczsgLy8gdGhlIHBvc2l0aW9uIHRvIGRyYXcgdGhlIGN1YmVcbiAgICBpZiAodHlwZW9mIHgueCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyB0aGVuIGl0J3MgYSB2ZWN0b3IsIGFuZCB5IG1pZ2h0IGJlIHRoZSBjb2xvclxuICAgICAgICBwb3MgPSB4O1xuICAgICAgICBpZiAodHlwZW9mIHkgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbG9yID0geTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHggaXNuJ3QgYSB2ZWN0b3IsIHNvIGFzc3VtZSBzZXBhcmF0ZSB4IHkgYW5kIHpcbiAgICAgICAgcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoeCwgeSwgeik7XG4gICAgICAgIC8vIHdlIGNhdWdodCBjb2xvciBhbHJlYWR5LlxuICAgIH1cbiAgICAvLyBhYm91dCBhIGZpZnRpZXRoIG9mIHRoZSBmaWVsZCdzIHN1bW1lZCBkaW1lbnNpb25zXG4gICAgdmFyIHNpemUgPSAodGhpcy5mLndYICsgdGhpcy5mLndZICsgdGhpcy5mLndaKSAvIDUwO1xuXG4gICAgLy8gb2theS4uIHJlYWR5IHRvIGRyYXdcbiAgICB2YXIgZ2VvbSA9IFNjYXBlSXRlbXMuQ3ViZShzaXplKTtcblxuICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHsgY29sb3I6IGNvbG9yIH0pO1xuICAgIHZhciBjdWJlID0gbmV3IFRIUkVFLk1lc2goZ2VvbSwgbWF0ZXJpYWwpO1xuICAgIGN1YmUucG9zaXRpb24uY29weShwb3MpO1xuICAgIHRoaXMuc2NlbmUuYWRkKGN1YmUpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5hZGRIZWxwZXJHcmlkID0gZnVuY3Rpb24odG9wT3JCb3R0b20pIHtcbiAgICB2YXIgZ3ogPSAwO1xuICAgIHZhciBnYyA9IDB4NDQ0NDQ0O1xuICAgIGlmICh0b3BPckJvdHRvbSA9PSAndG9wJykge1xuICAgICAgICBneiA9IHRoaXMuZi5tYXhaO1xuICAgICAgICBnYyA9IDB4Y2NjY2ZmO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGd6ID0gdGhpcy5mLm1pblo7XG4gICAgICAgIGdjID0gMHhjY2ZmY2M7XG4gICAgfVxuXG4gICAgdmFyIGdyaWRXID0gTWF0aC5tYXgodGhpcy5mLm1heFggLSB0aGlzLmYubWluWCwgdGhpcy5mLm1heFkgLSB0aGlzLmYubWluWSk7XG5cbiAgICAvLyBHcmlkIFwic2l6ZVwiIGlzIHRoZSBkaXN0YW5jZSBpbiBlYWNoIG9mIHRoZSBmb3VyIGRpcmVjdGlvbnMsXG4gICAgLy8gdGhlIGdyaWQgc2hvdWxkIHNwYW4uICBTbyBmb3IgYSBncmlkIFcgdW5pdHMgYWNyb3NzLCBzcGVjaWZ5XG4gICAgLy8gdGhlIHNpemUgYXMgVy8yLlxuICAgIHZhciBncmlkWFkgPSBuZXcgVEhSRUUuR3JpZEhlbHBlcihncmlkVy8yLCBncmlkVy8xMCk7XG4gICAgZ3JpZFhZLnNldENvbG9ycyhnYywgZ2MpO1xuICAgIGdyaWRYWS5yb3RhdGlvbi54ID0gTWF0aC5QSS8yO1xuICAgIGdyaWRYWS5wb3NpdGlvbi5zZXQodGhpcy5mLm1pblggKyBncmlkVy8yLCB0aGlzLmYubWluWSArIGdyaWRXLzIsIGd6KTtcbiAgICB0aGlzLnNjZW5lLmFkZChncmlkWFkpO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgVEhSRUUuUmVuZGVyZXIuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHZhcmlvdXMgb3B0aW9uc1xuICogQHBhcmFtIHtET01FbGVtZW50fGpRdWVyeUVsZW19IG9wdGlvbnMuZG9tIGEgZG9tIGVsZW1lbnRcbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy53aWR0aCByZW5kZXJlciB3aWR0aCAoaW4gcGl4ZWxzKVxuICogQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmhlaWdodCByZW5kZXJlciBoZWlnaHQgKGluIHBpeGVscylcbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVJlbmRlcmVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHZhciByZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKHsgYW50aWFsaWFzOiB0cnVlLCBhbHBoYTogdHJ1ZSB9KTtcbiAgICByZW5kZXJlci5zZXRDbGVhckNvbG9yKCAweDAwMDAwMCwgMCk7XG4gICAgcmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kb20pIHtcbiAgICAgICAgdmFyICRkb20gPSAkKG9wdGlvbnMuZG9tKTtcbiAgICAgICAgcmVuZGVyZXIuc2V0U2l6ZSgkZG9tLndpZHRoKCksICRkb20uaGVpZ2h0KCkpO1xuICAgICAgICAkZG9tLmFwcGVuZChyZW5kZXJlci5kb21FbGVtZW50KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy53aWR0aCAmJiBvcHRpb25zLmhlaWdodCkge1xuICAgICAgICByZW5kZXJlci5zZXRTaXplKG9wdGlvbnMud2lkdGgsIG9wdGlvbnMuaGVpZ2h0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlbmRlcmVyO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIHVwZGF0ZXMgdGhlIHNjYXBlIHRpbWUgdG8gbWF0Y2ggdGhlIGN1cnJlbnQgdGltZSAodGFraW5nIGludG9cbiAqIGFjY291bnQgdGhlIHRpbWVSYXRpbyBldGMpLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl91cGRhdGVUaW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgdmFyIGVsYXBzZWQgPSBub3cuZ2V0VGltZSgpIC0gdGhpcy5maXJzdFJlbmRlcjtcbiAgICB0aGlzLmRhdGUgPSBuZXcgRGF0ZSh0aGlzLmZpcnN0UmVuZGVyICsgKGVsYXBzZWQgKiB0aGlzLl9vcHRzLnRpbWVSYXRpbykpO1xuICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX29wdHMuZGF0ZVVwZGF0ZTtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBjYWxsYmFja0RhdGUgPSBuZXcgRGF0ZSh0aGlzLmRhdGUpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBjYWxsYmFja0RhdGUpO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlU3VuKCk7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogdXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIHN1biB0byBzdWl0IHRoZSBzY2FwZSBjdXJyZW50IHRpbWUuXG4gKiBAcGFyYW0gIHtUSFJFRS5EaXJlY3Rpb25hbExpZ2h0fSBbc3VuXSB0aGUgc3VuIHRvIGFjdCBvbi4gIElmIG5vdFxuICogc3VwcGxpZWQsIHRoaXMgbWV0aG9kIHdpbGwgYWN0IG9uIHRoZSBsaWdodCBpbiB0aGlzIHNjZW5lJ3MgbGlnaHRcbiAqIGxpc3QgdGhhdCBpcyBjYWxsZWQgXCJzdW5cIi5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fdXBkYXRlU3VuID0gZnVuY3Rpb24oc3VuKSB7XG5cbiAgICBpZiAodHlwZW9mIHN1biA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBpZiB0aGV5IGRpZG4ndCBwcm92aWRlIGEgc3VuLCB1c2Ugb3VyIG93blxuICAgICAgICBzdW4gPSB0aGlzLmxpZ2h0cy5zdW47XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzdW4gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBiYWlsIGlmIHRoZXJlJ3Mgbm8gc3VuIEFSUlJIIFdIQVQgRElEIFlPVSBET1xuICAgIH1cblxuICAgIHZhciBzdW5BbmdsZSA9ICh0aGlzLmRhdGUuZ2V0SG91cnMoKSo2MCArIHRoaXMuZGF0ZS5nZXRNaW51dGVzKCkpIC8gMTQ0MCAqIDIgKiBNYXRoLlBJO1xuICAgIHZhciBzdW5Sb3RhdGlvbkF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKTtcblxuICAgIHN1bi5wb3NpdGlvblxuICAgICAgICAuc2V0KDAsIC0zICogdGhpcy5mLndZLCAtMjAgKiB0aGlzLmYud1opXG4gICAgICAgIC5hcHBseUF4aXNBbmdsZShzdW5Sb3RhdGlvbkF4aXMsIHN1bkFuZ2xlKVxuICAgICAgICAuYWRkKHRoaXMuZi5jZW50ZXIpO1xuXG4gICAgdmFyIHN1blogPSBzdW4ucG9zaXRpb24uejtcblxuICAgIC8vIHN3aXRjaCB0aGUgc3VuIG9mZiB3aGVuIGl0J3MgbmlnaHQgdGltZVxuICAgIGlmIChzdW4ub25seVNoYWRvdyA9PSBmYWxzZSAmJiBzdW5aIDw9IHRoaXMuZi5jZW50ZXIueikge1xuICAgICAgICBzdW4ub25seVNoYWRvdyA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChzdW4ub25seVNoYWRvdyA9PSB0cnVlICYmIHN1blogPiB0aGlzLmYuY2VudGVyLnopIHtcbiAgICAgICAgc3VuLm9ubHlTaGFkb3cgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBmYWRlIG91dCB0aGUgc2hhZG93IGRhcmtuZXNzIHdoZW4gdGhlIHN1biBpcyBsb3dcbiAgICBpZiAoc3VuWiA+PSB0aGlzLmYuY2VudGVyLnogJiYgc3VuWiA8PSB0aGlzLmYubWF4Wikge1xuICAgICAgICB2YXIgdXBuZXNzID0gTWF0aC5tYXgoMCwgKHN1blogLSB0aGlzLmYuY2VudGVyLnopIC8gdGhpcy5mLndaICogMik7XG4gICAgICAgIHN1bi5zaGFkb3dEYXJrbmVzcyA9IDAuNSAqIHVwbmVzcztcbiAgICAgICAgc3VuLmludGVuc2l0eSA9IHVwbmVzcztcbiAgICB9XG5cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZUxpZ2h0cyA9IGZ1bmN0aW9uKGxpZ2h0c1RvSW5jbHVkZSkge1xuXG4gICAgdmFyIGxpZ2h0cyA9IHt9O1xuICAgIHZhciBmID0gdGhpcy5mOyAgLy8gY29udmVuaWVudCByZWZlcmVuY2UgdG8gdGhlIGZpZWxkXG5cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ2FtYmllbnQnKSAhPSAtMSkge1xuICAgICAgICAvLyBhZGQgYW4gYW1iaWVudCBsaXN0XG4gICAgICAgIGxpZ2h0cy5hbWJpZW50ID0gbmV3IFRIUkVFLkFtYmllbnRMaWdodCgweDIyMjIzMyk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZigndG9wbGVmdCcpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5sZWZ0ID0gbmV3IFRIUkVFLlBvaW50TGlnaHQoMHhmZmZmZmYsIDEsIDApO1xuICAgICAgICAvLyBwb3NpdGlvbiBsaWdodCBvdmVyIHRoZSB2aWV3ZXIncyBsZWZ0IHNob3VsZGVyLi5cbiAgICAgICAgLy8gLSBMRUZUIG9mIHRoZSBjYW1lcmEgYnkgNTAlIG9mIHRoZSBmaWVsZCdzIHggd2lkdGhcbiAgICAgICAgLy8gLSBCRUhJTkQgdGhlIGNhbWVyYSBieSA1MCUgb2YgdGhlIGZpZWxkJ3MgeSB3aWR0aFxuICAgICAgICAvLyAtIEFCT1ZFIHRoZSBjYW1lcmEgYnkgdGhlIGZpZWxkJ3MgaGVpZ2h0XG4gICAgICAgIGxpZ2h0cy5sZWZ0LnBvc2l0aW9uLmFkZFZlY3RvcnMoXG4gICAgICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbixcbiAgICAgICAgICAgIG5ldyBUSFJFRS5WZWN0b3IzKC0wLjUgKiBmLndYLCAtMC41ICogZi53WSwgMSAqIGYud1opXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChsaWdodHNUb0luY2x1ZGUuaW5kZXhPZignc3VuJykgIT0gLTEpIHtcbiAgICAgICAgbGlnaHRzLnN1biA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmVlKTtcbiAgICAgICAgbGlnaHRzLnN1bi5pbnRlbnNpdHkgPSAxLjA7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlU3VuKGxpZ2h0cy5zdW4pO1xuXG4gICAgICAgIC8vIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhVmlzaWJsZSA9IHRydWU7ICAvLyBERUJVR1xuXG4gICAgICAgIC8vIGRpcmVjdGlvbiBvZiBzdW5saWdodFxuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRhcmdldC5wb3NpdGlvbi5jb3B5KGYuY2VudGVyKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGFyZ2V0KTtcbiAgICAgICAgbGlnaHRzLnN1bi50YXJnZXQgPSB0YXJnZXQ7XG5cbiAgICAgICAgLy8gc3VuIGRpc3RhbmNlLCBsb2xcbiAgICAgICAgdmFyIHN1bkRpc3RhbmNlID0gbGlnaHRzLnN1bi5wb3NpdGlvbi5kaXN0YW5jZVRvKGxpZ2h0cy5zdW4udGFyZ2V0LnBvc2l0aW9uKTtcbiAgICAgICAgLy8gbG9uZ2VzdCBkaWFnb25hbCBmcm9tIGZpZWxkLWNlbnRlclxuICAgICAgICB2YXIgbWF4RmllbGREaWFnb25hbCA9IGYuY2VudGVyLmRpc3RhbmNlVG8obmV3IFRIUkVFLlZlY3RvcjMoZi5taW5YLCBmLm1pblksIGYubWluWikpO1xuXG4gICAgICAgIC8vIHNoYWRvdyBzZXR0aW5nc1xuICAgICAgICBsaWdodHMuc3VuLmNhc3RTaGFkb3cgPSB0cnVlO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0RhcmtuZXNzID0gMC4zMztcblxuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYU5lYXIgPSBzdW5EaXN0YW5jZSAtIG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhRmFyID0gc3VuRGlzdGFuY2UgKyBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYVRvcCA9IG1heEZpZWxkRGlhZ29uYWw7XG4gICAgICAgIGxpZ2h0cy5zdW4uc2hhZG93Q2FtZXJhUmlnaHQgPSBtYXhGaWVsZERpYWdvbmFsO1xuICAgICAgICBsaWdodHMuc3VuLnNoYWRvd0NhbWVyYUJvdHRvbSA9IC0xICogbWF4RmllbGREaWFnb25hbDtcbiAgICAgICAgbGlnaHRzLnN1bi5zaGFkb3dDYW1lcmFMZWZ0ID0gLTEgKiBtYXhGaWVsZERpYWdvbmFsO1xuICAgIH1cbiAgICBpZiAobGlnaHRzVG9JbmNsdWRlLmluZGV4T2YoJ3NreScpICE9IC0xKSB7XG4gICAgICAgIGxpZ2h0cy5za3kgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGVlZWVmZik7XG4gICAgICAgIGxpZ2h0cy5za3kuaW50ZW5zaXR5ID0gMC44O1xuXG4gICAgICAgIC8vIHNreSBpcyBkaXJlY3RseSBhYm92ZVxuICAgICAgICB2YXIgc2t5SGVpZ2h0ID0gNSAqIGYud1o7XG4gICAgICAgIGxpZ2h0cy5za3kucG9zaXRpb24uY29weSh0aGlzLmNhbWVyYS5wb3NpdGlvbik7XG4gICAgICAgIC8vIGxpZ2h0cy5za3kucG9zaXRpb24uc2V0WihmLm1heFogKyBza3lIZWlnaHQpO1xuXG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcbiAgICAgICAgdGFyZ2V0LnBvc2l0aW9uLmNvcHkoZi5jZW50ZXIpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0YXJnZXQpO1xuICAgICAgICBsaWdodHMuc2t5LnRhcmdldCA9IHRhcmdldDtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBsaWdodCBpbiBsaWdodHMpIHtcbiAgICAgICAgaWYgKGxpZ2h0cy5oYXNPd25Qcm9wZXJ0eShsaWdodCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2NlbmUuYWRkKGxpZ2h0c1tsaWdodF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpZ2h0cztcbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqIEBwcml2YXRlICovXG5TY2FwZVNjZW5lLnByb3RvdHlwZS5fbWFrZVNjZW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG4gICAgLy8gYWRkIGZvZ1xuICAgIC8vIHNjZW5lLmZvZyA9IG5ldyBUSFJFRS5Gb2coJyNmMGY4ZmYnLCAxMDAsIDE1MCk7XG4gICAgcmV0dXJuIHNjZW5lO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKiogQHByaXZhdGUgKi9cblNjYXBlU2NlbmUucHJvdG90eXBlLl9tYWtlQ2FtZXJhID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG4gICAgLy8gdmlld2luZyBhbmdsZVxuICAgIC8vIGkgdGhpbmsgdGhpcyBpcyB0aGUgdmVydGljYWwgdmlldyBhbmdsZS4gIGhvcml6b250YWwgYW5nbGUgaXNcbiAgICAvLyBkZXJpdmVkIGZyb20gdGhpcyBhbmQgdGhlIGFzcGVjdCByYXRpby5cbiAgICB2YXIgdmlld0FuZ2xlID0gNDU7XG4gICAgdmlld0FuZ2xlID0gKG9wdGlvbnMgJiYgb3B0aW9ucy52aWV3QW5nbGUpIHx8IHZpZXdBbmdsZTtcblxuICAgIC8vIGFzcGVjdFxuICAgIHZhciB2aWV3QXNwZWN0ID0gMTYvOTtcbiAgICBpZiAodGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuICAgICAgICB2aWV3QXNwZWN0ID0gJGVsZW0ud2lkdGgoKSAvICRlbGVtLmhlaWdodCgpO1xuICAgIH1cblxuICAgIC8vIG5lYXIgYW5kIGZhciBjbGlwcGluZ1xuICAgIHZhciBuZWFyQ2xpcCA9IDAuMTtcbiAgICB2YXIgZmFyQ2xpcCA9IDEwMDAwO1xuICAgIGlmICh0aGlzLmYpIHtcbiAgICAgICAgbmVhckNsaXAgPSBNYXRoLm1pbih0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAvIDEwMDA7XG4gICAgICAgIGZhckNsaXAgPSBNYXRoLm1heCh0aGlzLmYud1gsIHRoaXMuZi53WSwgdGhpcy5mLndaKSAqIDEwO1xuICAgIH1cblxuICAgIC8vIGNhbWVyYSBwb3NpdGlvbiBhbmQgbG9va2luZyBkaXJlY3Rpb25cbiAgICB2YXIgbG9va0hlcmUgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKTtcbiAgICB2YXIgY2FtUG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEwLCA1KTtcbiAgICBpZiAodGhpcy5mKSB7XG4gICAgICAgIGxvb2tIZXJlID0gdGhpcy5mLmNlbnRlcjtcbiAgICAgICAgY2FtUG9zID0gbG9va0hlcmUuY2xvbmUoKS5hZGQobmV3IFRIUkVFLlZlY3RvcjMoMCwgLTEuMSAqIHRoaXMuZi53WSwgMyAqIHRoaXMuZi53WikpO1xuICAgIH1cblxuICAgIC8vIHNldCB1cCBjYW1lcmFcbiAgICB2YXIgY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKCB2aWV3QW5nbGUsIHZpZXdBc3BlY3QsIG5lYXJDbGlwLCBmYXJDbGlwKTtcbiAgICAvLyBcInVwXCIgaXMgcG9zaXRpdmUgWlxuICAgIGNhbWVyYS51cC5zZXQoMCwwLDEpO1xuICAgIGNhbWVyYS5wb3NpdGlvbi5jb3B5KGNhbVBvcyk7XG4gICAgY2FtZXJhLmxvb2tBdChsb29rSGVyZSk7XG5cbiAgICAvLyBhZGQgdGhlIGNhbWVyYSB0byB0aGUgc2NlbmVcbiAgICBpZiAodGhpcy5zY2VuZSkge1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChjYW1lcmEpO1xuICAgIH1cblxuICAgIHJldHVybiBjYW1lcmE7XG59XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKiBAcHJpdmF0ZSAqL1xuU2NhcGVTY2VuZS5wcm90b3R5cGUuX21ha2VDb250cm9scyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKTtcbiAgICBpZiAodGhpcy5mICYmIHRoaXMuZi5jZW50ZXIpIHtcbiAgICAgICAgY2VudGVyID0gdGhpcy5mLmNlbnRlci5jbG9uZSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jYW1lcmEgJiYgdGhpcy5yZW5kZXJlciAmJiB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGNvbnRyb2xzID0gbmV3IFRIUkVFLk9yYml0Q29udHJvbHModGhpcy5jYW1lcmEsIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gICAgICAgIGNvbnRyb2xzLmNlbnRlciA9IGNlbnRlcjtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xzO1xuICAgIH1cbn1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuU2NhcGVTY2VuZS5wcm90b3R5cGUucHJpbnQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJ3NjYXBlISdcbiAgICApO1xufVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5tb2R1bGUuZXhwb3J0cyA9IFNjYXBlU2NlbmU7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblRIUkVFID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuVEhSRUUgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLlRIUkVFIDogbnVsbCk7XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogQSBiYWcgb2Ygc3R1ZmYgLS0gaS5lLiBUSFJFRS5NYXRlcmlhbCAtLSB0aGF0IHRoaW5ncyBjYW4gYmUgbWFkZSBvdXQgb2YuXG4gKlxuICogQGVudW1cbiAqL1xudmFyIFNjYXBlU3R1ZmYgPSB7fTtcbnZhciBMYW1iZXJ0ID0gVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbDtcblxuLyoqIGdlbmVyaWMgc3R1ZmYsIGZvciBpZiBub3RoaW5nIGVsc2UgaXMgc3BlY2lmaWVkIEBtZW1iZXJvZiBTY2FwZVN0dWZmICovXG5TY2FwZVN0dWZmLmdlbmVyaWMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweDk5OTk5OSxcbiAgICAgICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLCBvcGFjaXR5OiAwLjUwIH0pO1xuXG4vLyB3YXRlciBpcyBibHVlIGFuZCBhIGJpdCB0cmFuc3BhcmVudFxuU2NhcGVTdHVmZi53YXRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4MzM5OWZmLFxuICAgICAgICAgICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuNzUgfSk7XG5cbi8vIGRpcnQgZm9yIGdlbmVyYWwgdXNlXG5TY2FwZVN0dWZmLmRpcnQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiAweGEwNTIyZCB9KTtcbi8vIE5pbmUgZGlydCBjb2xvdXJzIGZvciB2YXJ5aW5nIG1vaXN0dXJlIGxldmVscy4gIFN0YXJ0IGJ5IGRlZmluaW5nXG4vLyB0aGUgZHJpZXN0IGFuZCB3ZXR0ZXN0IGNvbG91cnMsIGFuZCB1c2UgLmxlcnAoKSB0byBnZXQgYSBsaW5lYXJcbi8vIGludGVycG9sYXRlZCBjb2xvdXIgZm9yIGVhY2ggb2YgdGhlIGluLWJldHdlZW4gZGlydHMuXG52YXIgZHJ5ID0gbmV3IFRIUkVFLkNvbG9yKDB4YmI4ODU1KTsgLy8gZHJ5XG52YXIgd2V0ID0gbmV3IFRIUkVFLkNvbG9yKDB4ODgyMjAwKTsgLy8gbW9pc3RcblxuU2NhcGVTdHVmZi5kaXJ0MCA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IGRyeSB9KTtcblNjYXBlU3R1ZmYuZGlydDEgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDIgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDMgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgMy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDQgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDUgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNS85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDYgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNi85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDcgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgNy85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDggPSBuZXcgTGFtYmVydCh7IGNvbG9yOiBkcnkuY2xvbmUoKS5sZXJwKHdldCwgOC85KSB9KTtcblNjYXBlU3R1ZmYuZGlydDkgPSBuZXcgTGFtYmVydCh7IGNvbG9yOiB3ZXQgfSk7XG5cbi8vIGxlYWYgbGl0dGVyIChpbiByZWFsaXR5IGxlYWYgbGl0dGVyIGlzIGJyb3duLCBidXQgdXNlIGEgc2xpZ2h0bHlcbi8vIGdyZWVuaXNoIHRvbmUgaGVyZSBzbyBpdCBkb2Vzbid0IGp1c3QgbG9vayBsaWtlIG1vcmUgZGlydClcblNjYXBlU3R1ZmYubGVhZmxpdHRlciA9IG5ldyBMYW1iZXJ0KHsgY29sb3I6IDB4NTU2YjJmIH0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1vZHVsZS5leHBvcnRzID0gU2NhcGVTdHVmZjtcblxuXG5cblxuIl19
