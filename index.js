
const express = require('express');
var service = express();

service.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    next();
});
 //localhost:3000/getParam?param=Tina
service.get('/getParam', function (req, res) {
   res.send('Hello '+req.query.param+'^.^');
})

//設定服務監聽localhost:3000(127.0.0.1/:3000)
service.listen('3000', function () {  
  console.log('server start on 3000 port')
})