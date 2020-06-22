const express = require('express');
const bodyParser = require('body-parser');
const PiCamera = require('pi-camera');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
var Binary = require('mongodb').Binary;
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
var fs = require('fs');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI = 'mongodb+srv://Camera:Camera@cluster0-gzioo.mongodb.net/mongouploads';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('index', { files: false });
    } else {
      res.render('index', { files: files });
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', (req, res) => {
  const myCamera = new PiCamera({
    mode: 'photo',
    output: `${__dirname}/photo.jpg`,
    width: 640,
    height: 480,
    nopreview: true,
  });
  myCamera.snap();
  var insert_data = {};
  insert_data.filename = fs.readFileSync('./photo.jpg', 'base64');
  var collection = conn.db.collection('uploads.files');
  collection.insertOne(insert_data, function(err, result){
  });
  res.redirect('/');
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
    res.redirect('/');
  });
});

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));
