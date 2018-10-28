
const express = require('express');
var service = express();

const {app, BrowserWindow, Menu, protocol, ipcMain} = require('electron');
const {autoUpdater} = require("electron-updater");
var pjson = require('./package.json');
let win;
// creates the default window
function createDefaultWindow() {
    win = new BrowserWindow({width: 400, height: 300});
    win.loadURL(`file://${__dirname}/index.html`);
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('version', pjson.version);
    })
    win.on('closed', () => app.quit());
    return win;
}

// when the app is loaded create a BrowserWindow and check for updates
app.on('ready', function() {
    createDefaultWindow();
    autoUpdater.checkForUpdates();
});

// when the update has been downloaded and is ready to be installed, notify the BrowserWindow
autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('updateReady')
});

// when receiving a quitAndInstall signal, quit and install the new version ;)
ipcMain.on("quitAndInstall", (event, arg) => {
    autoUpdater.quitAndInstall();
})

service.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    next();
});
 //localhost:3000/getParam?param=Tina
service.get('/getParam', function (req, res) {
   res.send('Hello '+req.query.param+'^.^!! This is version'+pjson.version);
})

//設定服務監聽localhost:3000(127.0.0.1/:3000)
service.listen('3000', function () {  
  console.log('server start on 3000 port')
})