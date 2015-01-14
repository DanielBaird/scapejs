
THREE = require('three');

base  = require('./scape/baseobject');
stuff = require('./scape/stuff');
field = require('./scape/field');
scene = require('./scape/scene');
chunk = require('./scape/chunk');

Scape = {
    BaseObject: base,
    Stuff: stuff,
    Chunk: chunk,
    Field: field,
    Scene: scene
}

if (typeof module !== 'undefined') {
    module.exports = Scape;
} else {
    window.Scape = Scape;
}
