
THREE = require('three');

base = require('./scape/baseobject');
field = require('./scape/field');
scene = require('./scape/scene');
chunk = require('./scape/chunk');

Scape = {
    BaseObject: base,
    Chunk: chunk,
    Field: field,
    Scene: scene
}

if (typeof module !== 'undefined') {
    module.exports = Scape;
} else {
    window.Scape = Scape;
}
