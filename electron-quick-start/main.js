const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const path = require('path')
const url = require('url')
const fs = require('fs');

let mainWindow
let win = null
let fileStream

function createWindow () {
    mainWindow = new BrowserWindow({width: 800, height: 600})
    mainWindow.loadURL(
        url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
      })

    )
    mainWindow.webContents.openDevTools()


    mainWindow.on('closed', function () {
        mainWindow = null
    })
    return mainWindow
}






app.on('ready', () => {
    win = createWindow()
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('stream_message', "openfilestream")
    })
})

app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})



app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
