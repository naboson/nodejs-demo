
const express = require('express');
var service = express();

const {app, BrowserWindow, Menu, protocol, ipcMain, dialog} = require('electron');
const {autoUpdater} = require("electron-updater");
const fs = require('fs');
const request = require('request');
var pjson = require('./package.json');
const path = require('path');
const url = require('url');
const jq = require('jquery');
const http = require('http');

let win;

const email = 'nodejs-demo-client@nodejs-demo-222303.iam.gserviceaccount.com';
const keyFile = (process.platform === 'darwin' ? path.join(__dirname, 'mac.pem') : 'resources/win.pem');
const folderId = '1pJBtkmBCX7kteCHIizTcoGyfmpwwz4tu';

var webserverStatus = null;

// creates the default window
function createDefaultWindow() {
    win = new BrowserWindow({width: 400, height: 400, maximizable: false});
    win.setMenu(null)

    const pathname = path.join(__dirname, 'index.html')
    console.log('pathname=' + pathname)
    win.loadURL(url.format({
        pathname: pathname,
        protocol: 'file:',
        slashes: true
    }));
    
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('version', pjson.version);
      win.webContents.send('webserverStatus', webserverStatus);

      win.webContents.send('debug', 'keyFile=' + keyFile);
    })
    // When Window Close.
    win.on('closed', () => {
        win = null
    });
    return win;
}

// when the app is loaded create a BrowserWindow and check for updates
app.on('ready', function() {
    if(process.argv[2] != 'dev') {
        createDefaultWindow();
        autoUpdater.checkForUpdates();
    }
});





autoUpdater.on('checking-for-update', (info) => {
    win.webContents.send('onUpdateStatusChanged', 'checking-for-update');
});

autoUpdater.on('update-available', (info) => {
    win.webContents.send('onUpdateStatusChanged', 'update-available');
});

autoUpdater.on('update-not-available', (info) => {
    win.webContents.send('onUpdateStatusChanged', 'update-not-available');
});

// when the update has been downloaded and is ready to be installed, notify the BrowserWindow
autoUpdater.on('update-downloaded', (info) => {
    // win.webContents.send('updateReady')
    win.webContents.send('onUpdateStatusChanged', 'update-downloaded');
});








// when receiving a quitAndInstall signal, quit and install the new version ;)
ipcMain.on("quitAndInstall", (event, arg) => {
    autoUpdater.quitAndInstall();
})

ipcMain.on("manualCheck", (event, arg) => {
    autoUpdater.checkForUpdates();
})

ipcMain.on("openFileDialog", (event, arg) => {
    var options = {
        'title': '選擇上傳檔案',
        'properties': ['openFile', 'multiSelections' ]
    }
    dialog.showOpenDialog(win, options, function(filePaths, booksmarks) {
        if (filePaths !== undefined ) {
            console.log('filepaths=' + filePaths);
            win.webContents.send('onFileChosen', filePaths[0]);
        }
    });
})

ipcMain.on("uploadFile", (event, filename) => {
    if (filename === undefined || filename === '') {
        console.log('沒有選擇檔案。');
        return;
    }
    
    const url = encodeURI('http://localhost:3000/uploadFile?filePath=' + filename);
    http.get(url, (resp) => {
        // onFileUploaded
        win.webContents.send('onFileUploaded');
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });

})



service.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    next();
});
 //localhost:3000/getParam?param=Tina
service.get('/getParam', function (req, res) {
   res.send('Hello ' + req.query.param + '^.^!! This is version '+pjson.version);
})
 //localhost:3000/uploadFile?filePath=C:\Users\User\Desktop\nodejs測試安裝文件.docx
service.get('/uploadFile', function (req, res) {
    uploadFile(req, res);
})







function uploadFile(req, res){
    //first: get google oauth2 token 
    var TokenCache = require('google-oauth-jwt').TokenCache, tokens = new TokenCache();
    tokens.get({
        // use the email address of the service account, as seen in the API console
        email: email,
        // use the PEM file we generated from the downloaded key
        keyFile: keyFile,
        // specify the scopes you wish to access
        scopes: ['https://www.googleapis.com/auth/drive']
    }, function (err, token) {
        var filePath = req.query.filePath;
        if(!err && filePath){
            uploadToDrive(token, filePath, res);
        }
        else{
           res.send("上傳檔案失敗! 原因:"+err); 
        }
    });
}

function uploadToDrive(token, filePath, res) {
    var fileName = filePath.replace(/^.*[\\\/]/, '');
    var fstatus = fs.statSync(filePath);
    fs.open(filePath, 'r', function(status, fileDescripter) {
        var buffer = new Buffer(fstatus.size);
        fs.read(fileDescripter, buffer, 0, buffer.length, null, function(err, num) {
            request.post({
                'url': 'https://www.googleapis.com/upload/drive/v2/files',
                'qs': {
                    'uploadType': 'multipart'
                },
                'headers' : {
                'Authorization': 'Bearer ' + token
                },
                'multipart':  [
                    {
                        'Content-Type': 'application/json; charset=UTF-8',
                        'body': JSON.stringify({
                            'title': fileName,
                            'parents': [
                                {
                                    'id': folderId
                                }
                            ]
                        })
                    },
                    {
                        'Content-Type': 'application/octet-stream',
                        'body': buffer
                    }
                ]
            }, function(err,httpResponse,body){ 
                if(!err){
                    res.send("檔案上傳成功!");
                }
                else{
                    res.send("上傳檔案失敗! 原因:"+err);
                }
            });       
      });
    })
}

//設定服務監聽localhost:3000(127.0.0.1/:3000)

service.listen('3000', function () {  
    console.log('server start on 3000 port');
    webserverStatus = '已啟動';
})
