// ------------------------------------------------------------------
THREE = require('three');
// ------------------------------------------------------------------
/**
 * A bag of stuff that things can be made out of.
 */
var ScapeStuff = {};
var Lambert = THREE.MeshLambertMaterial;

// "generic" stuff for when nothing else is specified
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

ScapeStuff.dirt1 = new Lambert({ color: dry });
ScapeStuff.dirt2 = new Lambert({ color: dry.clone().lerp(wet, 1/8) });
ScapeStuff.dirt3 = new Lambert({ color: dry.clone().lerp(wet, 2/8) });
ScapeStuff.dirt4 = new Lambert({ color: dry.clone().lerp(wet, 3/8) });
ScapeStuff.dirt5 = new Lambert({ color: dry.clone().lerp(wet, 4/8) });
ScapeStuff.dirt6 = new Lambert({ color: dry.clone().lerp(wet, 5/8) });
ScapeStuff.dirt7 = new Lambert({ color: dry.clone().lerp(wet, 6/8) });
ScapeStuff.dirt8 = new Lambert({ color: dry.clone().lerp(wet, 7/8) });
ScapeStuff.dirt9 = new Lambert({ color: wet });

// leaf litter (in reality leaf litter is brown, but use a slightly
// greenish tone here so it doesn't just look like more dirt)
ScapeStuff.leaflitter = new Lambert({ color: 0x556b2f });

// ------------------------------------------------------------------
module.exports = ScapeStuff;




