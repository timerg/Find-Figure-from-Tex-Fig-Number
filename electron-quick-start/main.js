const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const path = require('path')
const url = require('url')
const fs = require('fs');
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog

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
    // mainWindow.webContents.openDevTools()


    mainWindow.on('closed', function () {
        mainWindow = null
    })
    return mainWindow
}



ipc.on('open-file-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  }, function (files) {
    if (files) {
        event.sender.send('selected-directory', files)
    }
  })
})



app.on('ready', () => {
    win = createWindow()
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('main-render')
        if (process.platform !== 'darwin'){
            let globalPath
            // = app.getAppPath().replace(/\\[a-zA-Z0-9_-]+\\resources\\app/gi, '\\')
            // win.webContents.send('cwd', globalPath)
            globalPath = path.join(app.getAppPath(), '../../../')
        } else {
            let globalPath
            if(app.getAppPath().includes("electron-quick-start")) {
                globalPath = path.join(app.getAppPath(), '../')                  // from developing stage
            } else {
                // globalPath = app.getAppPath().replace(/\/\w+\.app\/Contents\/Resources\/app/gi, '\/')
                globalPath = path.join(app.getAppPath(), '../../../../')
            }
            win.webContents.send('cwd', globalPath)
        }
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
