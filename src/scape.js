
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
function Scape(field, dom, options) {
    // invoke our super constructor
    ScapeObject.call(this, options, defaultOptions);

    // save the field
    this.f = field;

    // DOM element
    this.e = document.getElementById(dom);

    // DEBUG

    // discover container
    var $container = $(this.e);
    var containerWidth = $container.width();
    var containerHeight = $container.height();

    // create renderer
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    $container.append(renderer.domElement);

    // create scene
    this.scene = new THREE.Scene();

    // create camera
    var viewAngle = 45;
    var viewAspect = containerWidth / containerHeight;
    var near = 0.1, far = 20000;
    // set up camera
    var camera = new THREE.PerspectiveCamera( viewAngle, viewAspect, near, far);
    // add the camera to the scene
    this.scene.add(camera);
    // the camera defaults to position (0,0,0)
    //  so pull it back (z = 400) and up (y = 100) and set the angle towards the scene origin
    camera.position.set(12,5.2,60);
    camera.lookAt(this.scene.position);

    // create a 1x cube
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    // var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
    // var material = new THREE.MeshPhongMaterial( { ambient: 0x030303, color: 0xdddddd, specular: 0x009900, shininess: 30, shading: THREE.FlatShading } )
    var cube = new THREE.Mesh( geometry, material );
    this.scene.add( cube );

    var light = new THREE.PointLight(0xffffff, 1, 0);
    light.position.set(100,300,300)
    this.scene.add(light);

    var ambientLight = new THREE.AmbientLight(0x111111);
    // this.scene.add(ambientLight);


    var axes = new THREE.AxisHelper(50);
    this.scene.add(axes);


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

    this.groundGrid();
    this.groundGrid('top');

    var lastLogAt = 0;

    render = function render(ts) {
        if (lastLogAt + 500 < ts) {
            console.log('rndr');
            lastLogAt = ts;
        }
        requestAnimationFrame( render );
        renderer.render( this.scene, camera );
    }.bind(this);

    render(0);





};
// ------------------------------------------------------------------
// inheritance
Scape.prototype = Object.create(ScapeObject.prototype);
Scape.prototype.constructor = Scape;
// ------------------------------------------------------------------
Scape.prototype.groundGrid = function(topOrBottom) {
    var gz = 0;
    var gc = 0x444444;
    if (topOrBottom == 'top') {
        gz = this.f.maxZ;
        gc = 0x000066;
    } else {
        gz = this.f.minZ;
        gc = 0x006600;
    }

    var gridW = Math.max(this.f.maxX - this.f.minX, this.f.maxY - this.f.minY);

    var gridXY = new THREE.GridHelper(gridW, 1);
    gridXY.setColors(gc, gc);
    gridXY.rotation.x = Math.PI/2;
    gridXY.position.set(gridW, gridW, gz);
    this.scene.add(gridXY);


    // TODO: draw the grid from minX to maxX etc at top or bottom
}
// ------------------------------------------------------------------
Scape.prototype.print = function() {
    console.log(
        'scape!'
    );
}
// ------------------------------------------------------------------
