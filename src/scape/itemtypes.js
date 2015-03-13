
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
    cube:  require('./itemtypes/cube'),
    tree:  require('./itemtypes/tree'),
    crane: require('./itemtypes/crane')
};
// ------------------------------------------------------------------
module.exports = ScapeItems;
