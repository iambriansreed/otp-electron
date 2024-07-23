import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        x: 100,
        y: 100,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
        },
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    const USER_DATA_PATH = path.join(app.getPath('userData'), 'otp-data.txt');

    ipcMain.on('window-view', () => {
        mainWindow.setSize(400, 600);
    });

    ipcMain.on('window-edit', () => {
        mainWindow.setSize(600, 600);
    });

    ipcMain.handle('get-user-data', async () => {
        let data = '';
        try {
            data = fs.readFileSync(USER_DATA_PATH, 'utf-8').replace(/\n+/g, '\n\n');
        } catch (error) {
            console.log('Error retrieving user data', error);
            // you may want to propagate the error, up to you
        }

        return data;
    });

    ipcMain.handle('set-user-data', (event, data) => {
        fs.writeFileSync(USER_DATA_PATH, data.replace(/\n+/g, '\n'));
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
