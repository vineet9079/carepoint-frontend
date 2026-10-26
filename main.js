const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater'); // <-- 1. Import updater

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    title: 'CarePoint HMS',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  win.loadFile(indexPath).catch((err) => {
    console.error('Failed to load index.html:', err);
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // <-- 2. Check for updates silently in the background
  autoUpdater.checkForUpdatesAndNotify(); 
});

// <-- 3. Prompt the user when the download is ready
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version of CarePoint HMS has been downloaded. Restart the application to apply the updates?',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(); // Restarts and installs automatically
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});