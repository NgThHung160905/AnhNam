const { app, BrowserWindow, protocol, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// MUST be called before app.whenReady()
// This registers app:// as a secure, standard scheme so localStorage works
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const outDir = path.join(__dirname, 'out');

function getMimeType(ext) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const urlParsed = new URL(request.url);
    let filePath = decodeURIComponent(urlParsed.pathname);

    let fullPath = path.join(outDir, filePath);

    // Directory? Try index.html
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      fullPath = path.join(fullPath, 'index.html');
    }

    // Not found? Try .html extension or fallback to index
    if (!fs.existsSync(fullPath)) {
      if (fs.existsSync(fullPath + '.html')) {
        fullPath = fullPath + '.html';
      } else {
        fullPath = path.join(outDir, 'index.html');
      }
    }

    return net.fetch(url.pathToFileURL(fullPath).toString());
  });

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Handle saving data from renderer
  ipcMain.handle('save-data', async (event, dataStr, filename) => {
    try {
      const exeDir = path.dirname(app.getPath('exe'));
      const savDir = path.join(exeDir, 'sav');

      if (!fs.existsSync(savDir)) {
        fs.mkdirSync(savDir, { recursive: true });
      }

      const filePath = path.join(savDir, filename);
      fs.writeFileSync(filePath, dataStr, 'utf-8');
      return { success: true, path: filePath };
    } catch (err) {
      console.error('Save error:', err);
      return { success: false, error: err.message };
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('app://localhost/index.html');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
