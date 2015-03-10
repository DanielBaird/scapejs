
/**
 * A bag of item types -- i.e. THREE.Geometrys -- that scapes can have in them.
 *
 * @namespace
 */
var ScapeItems = {
    // documentation for items are in the ./itemtypes/* files
    cube:  require('./itemtypes/cube'),
    tree:  require('./itemtypes/tree'),
    crane: require('./itemtypes/crane')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;
