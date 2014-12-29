
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
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor( 0xffffff, 1);

    // var renderer = new THREE.WebGLRenderer();
    renderer.setSize(containerWidth, containerHeight);
    $container.append(renderer.domElement);

    // create scene
    this.scene = new THREE.Scene();

    // add fog
    this.scene.fog = new THREE.Fog('#ddeeff', 1, 1000);

    // create camera
    var viewAngle = 45;
    var viewAspect = containerWidth / containerHeight;
    var near = 0.1, far = 20000;

    // set up camera
    var camera = new THREE.PerspectiveCamera( viewAngle, viewAspect, near, far);
    // the camera defaults to position (0,0,0)
    // set the cam position to a certain offset from field-center
    camera.position.addVectors(
        this.f.center,
        new THREE.Vector3(0, -1.1 * this.f.wY, 3 * this.f.wZ)
    );

    console.log(camera.position, this.f.center, this.f.center.clone());
    camera.lookAt(this.f.center);

    // add the camera to the scene
    this.scene.add(camera);

    // create a 10x cube
    var geometry = new THREE.BoxGeometry( 5, 5, 5 );
    // var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    // var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
    var material = new THREE.MeshPhongMaterial( { ambient: 0x030303, color: 0xdddddd, specular: 0x009900, shininess: 30, shading: THREE.FlatShading } )

    var cube00 = new THREE.Mesh( geometry, material );
    this.scene.add(cube00);

    var cube10 = new THREE.Mesh( geometry, material );
    cube10.position.copy(new THREE.Vector3(100, 0, 0));
    this.scene.add(cube10);
    var cubeh0 = new THREE.Mesh( geometry, material );
    cubeh0.position.copy(new THREE.Vector3(50, 0, 0));
    this.scene.add(cubeh0);

    var cube01 = new THREE.Mesh( geometry, material );
    cube01.position.copy(new THREE.Vector3(0, 100, 0));
    this.scene.add(cube01);

    var cube11 = new THREE.Mesh( geometry, material );
    cube11.position.copy(new THREE.Vector3(100, 100, 0));
    this.scene.add(cube11);


    var light = new THREE.PointLight(0xffffff, 1, 0);
    light.position.set(100,300,300)
    this.scene.add(light);

    // var ambientLight = new THREE.AmbientLight(0x111111);
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

    render = (function unboundRender(ts) {
        if (lastLogAt + 500 < ts) {
            console.log('rendering...');
            lastLogAt = ts;
        }
        requestAnimationFrame( render );
        renderer.render( this.scene, camera );
    }).bind(this);

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
    gridXY.position.set(gridW/2, gridW/2, gz);
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
