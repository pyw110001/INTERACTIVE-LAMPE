const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#020202',
    show: false,
  });

  // 生产模式加载 dist/index.html
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    if (serverProcess) serverProcess.kill();
    app.quit();
  });
}

// 启动 Express 后端
function startServer() {
  const serverPath = path.join(__dirname, '..', 'server', 'index.ts');
  serverProcess = fork(require.resolve('tsx/server'), [serverPath], {
    env: { ...process.env, PORT: '3001' },
    stdio: 'pipe',
  });
  serverProcess.stdout?.on('data', (data) => {
    console.log('[server]', data.toString());
  });
  serverProcess.stderr?.on('data', (data) => {
    console.error('[server]', data.toString());
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});
