//mongodb tren mlab
var mongourl= 'mongodb://admin:admin123@ds139942.mlab.com:39942/mongotest-1';
//khai bao cho mongodb
var MongoClient = require('mongodb').MongoClient;

var _db;

module.exports = {

  connectToServer: function( callback ) {
    MongoClient.connect( mongourl, function( err, db ) {
      _db = db;
      return callback( err );
    } );
  },

  getDb: function() {
    return _db;
  }
};