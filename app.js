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
const mongoURI = 'mongodb+srv://Camera:Camera@cluster0-gzioo.mongodb.net/mongouploads'; //строка для подключения к базе данных

// Create mongo connection
const conn = mongoose.createConnection(mongoURI); //установление соединения

// Init gfs
let gfs; //переменная для gridFs

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo); //создание объекта класса Grid с параметрами нашей бд
  gfs.collection('uploads'); 
});

// @route GET /
// @desc Loads form
app.get('/', (req, res) => { //функция обработки GET-запроса для получения изображений
  gfs.files.find().toArray((err, files) => { //поиск файлов в базе данных
    // Check if files
    if (!files || files.length === 0) {
      res.render('index', { files: false }); //если нет файлов
    } else {
      res.render('index', { files: files }); //если файлы есть
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', (req, res) => { //функция обработки POST-запроса на запись файла в бд;
  const myCamera = new PiCamera({ //создание объекта класса камеры для создание изображенияж
    mode: 'photo', //режим работы камеры(photo или video)
    output: `${__dirname}/photo.jpg`, //директория сохранения изображения
    width: 640, //ширина изображения
    height: 480, //длина
    nopreview: true, //флаг отображения работы камеры перед съемкой. Работает только для самого устройства камеры при прямом подключении экрана к нему. 
                     //Так как нам это не нужно, флаг true для отсутсвия работы камеры перед съемкой
  });
  myCamera.snap(); //функция создания изобжраения со всеми вышеперечисленными параметрами
  var insert_data = {}; //структура хранения файла в базе данных
  insert_data.filename = fs.readFileSync('./photo.jpg', 'base64'); //в поле структуры filename записываем закодированное изображение в формате base64
  var collection = conn.db.collection('uploads.files');//создание коллекции в бд для храрения файлов
  collection.insertOne(insert_data, function(err, result){ // запись файла в бд в созданную коллекцию
  });
  res.redirect('/'); //перенаправление на исходную страницу для обновления отображаемых изображения после создания новой
});

// @route GET /files/:filename
// @desc  Display single file object 
app.get('/files/:filename', (req, res) => { //функция обработки GET-запроса для получения информации о картинке в JSON формате
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => { //функция поиска файла в бд по имени файла filename
    // Check if file
    if (!file || file.length === 0) { //если файла нет, то вывод соответствующей ошибки
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file); //возвращение информации изображения в JSON формате
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => { //функция обработки запроса на удаление изображения
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => { //удаление файла по его ID в бд из коллекции 'uploads'
    if (err) {
      return res.status(404).json({ err: err }); //если ошибка
    }
    res.redirect('/'); //если нет ошибки, возвращение на исходную страницу уже с удаленным изображением
  });
});

const port = 5000; //порт

app.listen(port, () => console.log(`Server started on port ${port}`)); //запуск сервера
