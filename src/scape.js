
// ------------------------------------------------------------------
var defaultOptions = {
    minX: 0,
    minY: 0,
    minZ: 0,

    maxX: 100,
    maxY: 100,
    maxZ: 20,

    blocksX: 10,
    blocksY: 10
};
// ------------------------------------------------------------------
// ------------------------------------------------------------------
/**
 * Represents a rendering of a landscape / moonscape / whatever
 * @param {ScapeField} field  the field being rendered
 * @param {string} dom        DOM element the scape should be rendered info.
 * @param {object} options    collection of options.
 */
function Scape(field, dom, options) {
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    // save the field
    this.f = field;

    // discover DOM container
    this.element = document.getElementById(dom);

    // create and save all the bits we need
    this.renderer = this._makeRenderer({ dom: this.element });
    this.scene = this._makeScene();
    this.camera = this._makeCamera();
    this.controls = this._makeControls();


    var light = new THREE.PointLight(0xffffff, 1, 0);
    light.position.set(100,300,300)
    this.scene.add(light);

    var ambientLight = new THREE.AmbientLight(0x222222);
    this.scene.add(ambientLight);

    // f.eachColumn( function(err, c) {
    //     for (var block = 0; block < c.g.length; block++) {
    //         scene.add( new THREE.Mesh(
    //             new THREE.BoxGeometry(c.dx, c.dy, c.g[block].dz),
    //             c.g[block].m
    //             // new THREE.MeshBasicMaterial({ color: 0xff0000 })
    //             // new THREE.MeshBasicMaterial( { color: 0xffff00 } )
    //         ));
    //     }
    //     // console.log(c);
    // });

    // add grids and helper cubes
    // this.addHelperGrid();
    // this.addHelperGrid('top');
    this.addHelperShapes();

    var lastLogAt = 0; // DEBUG
    render = (function unboundRender(ts) {

        // DEBUG
        if (lastLogAt + 500 < ts) {
            console.log('rendering...');
            lastLogAt = ts;
        }

        requestAnimationFrame( render );
        this.renderer.render( this.scene, this.camera );
        this.controls.update();
    }).bind(this);

    render(0);

};
// ------------------------------------------------------------------
// inheritance
Scape.prototype = Object.create(ScapeObject.prototype);
Scape.prototype.constructor = Scape;
// ------------------------------------------------------------------
Scape.prototype.addHelperShapes = function() {

    var size = (this.f.wX + this.f.wY + this.f.wZ) / 50;

    // cubic geometry
    var cubeGeom = new THREE.BoxGeometry( size, size, size );

    var white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var red = new THREE.MeshLambertMaterial({   color: 0xff0000 });
    var green = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    var blue = new THREE.MeshLambertMaterial({  color: 0x0000ff });
    // var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    // var material = new THREE.MeshPhongMaterial( { ambient: 0x030303, color: 0xdddddd, specular: 0x009900, shininess: 30, shading: THREE.FlatShading } )

    var cube000 = new THREE.Mesh(cubeGeom, white);
    var cubeX00 = new THREE.Mesh(cubeGeom, red);
    var cubex00 = new THREE.Mesh(cubeGeom, red);
    var cube0Y0 = new THREE.Mesh(cubeGeom, green);
    var cube00Z = new THREE.Mesh(cubeGeom, blue);
    var cubeXY0 = new THREE.Mesh(cubeGeom, white);

    cube000.position.copy(new THREE.Vector3(this.f.minX, this.f.minY, this.f.minZ));
    cubeX00.position.copy(new THREE.Vector3(this.f.maxX, this.f.minY, this.f.minZ));
    cubex00.position.copy(new THREE.Vector3((this.f.minX + this.f.maxX) / 2, this.f.minY, this.f.minZ));
    cube0Y0.position.copy(new THREE.Vector3(this.f.minX, this.f.maxY, this.f.minZ));
    cube00Z.position.copy(new THREE.Vector3(this.f.minX, this.f.minY, this.f.maxZ));
    cubeXY0.position.copy(new THREE.Vector3(this.f.maxX, this.f.maxY, this.f.minZ));

    this.scene.add(cube000);
    this.scene.add(cubeX00);
    this.scene.add(cubex00);
    this.scene.add(cube0Y0);
    this.scene.add(cube00Z);
    this.scene.add(cubeXY0);
}
// ------------------------------------------------------------------
Scape.prototype.addHelperGrid = function(topOrBottom) {
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

    // Grid "size" is the distance EACH WAY the grid should span.
    // So for a grid W units across, specify the size as W/2.
    var gridXY = new THREE.GridHelper(gridW/2, gridW/10);
    gridXY.setColors(gc, gc);
    gridXY.rotation.x = Math.PI/2;
    gridXY.position.set(this.f.minX + gridW/2, this.f.minY + gridW/2, gz);
    this.scene.add(gridXY);


    // TODO: draw the grid from minX to maxX etc at top or bottom
}
// ------------------------------------------------------------------
/**
 * Create and return a THREE.Renderer.
 * @param {object} various options
 * @param {DOMElement|jQueryElem} options.dom a dom element
 * @param {integer} options.width renderer width (in pixels)
 * @param {integer} options.height renderer height (in pixels)
 */
Scape.prototype._makeRenderer = function(options) {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor( 0x000000, 0);
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
 * Create and return a THREE.Scene
 */
Scape.prototype._makeScene = function() {
    var scene = new THREE.Scene();
    // add fog
    // scene.fog = new THREE.Fog('#f0f8ff', 100, 150);
    return scene;
}
// ------------------------------------------------------------------
/**
 * [viewAngle description]
 * @type {Number}
 */
Scape.prototype._makeCamera = function(options) {

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
Scape.prototype._makeControls = function() {

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
Scape.prototype.print = function() {
    console.log(
        'scape!'
    );
}
// ------------------------------------------------------------------
