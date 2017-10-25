let mongoose = require('mongoose');
let Gridfs = require('gridfs-stream');
let connection = mongoose.connection;
let mongoDriver = mongoose.mongo;
gfs = {};
connection.on('open', function callback() {
    gfs = new Gridfs(connection.db, mongoDriver);
});
if (connection.db){
    gfs = new Gridfs(connection.db, mongoDriver);
}

/*
*
* SAMPLE READ
*   // streaming to gridfs
 //filename to store in mongodb

 // {
 //  _id: '50e03d29edfdc00d34000001',
 //  filename: 'my_file.txt',
 //  mode: 'w',
 //  chunkSize: 1024,
 //  content_type: 'plain/text',
 //  root: 'my_collection',  // Bucket will be 'my_collection' instead of 'fs'
 //  metadata: {
 //      ...
 //  }

 const options = {
 filename: request.params.identifier,
 chunkSize: 1024,
 content_type: request.file.mimetype,
 root: 'images',// Gridfs bucket
 metadata: request.body
 };

 gfs.files.find({ filename: request.params.identifier }).toArray(function (err, files) {

 if (err) next(err);
 let image = files[0];
 if (image && image._id){
 options['_id'] = image._id;
 }
 let writestream = gfs.createWriteStream(options);
 str.createReadStream(request.file.buffer).pipe(writestream);
 writestream.on('error', function(error){
 response.status(500).json({'localizedError':'There was an error saving the data'})
 })
 writestream.on('close', function (file) {
 // do something with `file`
 response.status(201).json({'file':file.filename, 'oid':JSON.stringify(file)})
 });


 });

*
* SAMPLE DELETE
*
*  gfs.remove(options, function (err) {
 if (err) {
 console.log('error ' + err);
 response.status(404).json({'localizedError': request.params.identifier + ' could not be deleted'})
 }
 else {
 response.status(200).json({})
 }

 });
* */


module.exports = gfs;
