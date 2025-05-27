import { app, BrowserWindow, ipcMain, safeStorage, desktopCapturer } from 'electron';
import path from 'path';
import fs from 'fs';
import { Jimp } from 'jimp';
import jsqr from 'jsqr';
import { Item } from './utils';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow: BrowserWindow | null;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 300,
        height: 600,
        x: 50,
        y: 50,
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
};

const USER_DATA_PATH = path.join(app.getPath('userData'), 'otp-data.txt');

ipcMain.handle('readUserData', async () => {
    let data = '';

    try {
        data = safeStorage.decryptString(fs.readFileSync(USER_DATA_PATH));
    } catch (error) {
        console.log('Error retrieving user data', error);
        // you may want to propagate the error, up to you
    }

    console.log('User data:', data);
    return data;
});

function limitPromiseResponseTime<T>(promise: Promise<T>, time = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Promise timed out'));
        }, time);

        promise
            .then((result) => {
                clearTimeout(timeout);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

ipcMain.handle('getScreenOTP', async (): Promise<Item | { error: string }> => {
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 2000, height: 2000 },
    });
    if (sources.length === 0) {
        console.log('No screen sources found');
        return { error: 'No screen sources found' };
    }
    const dataUrl = sources[0].thumbnail.toDataURL();

    const image = await Jimp.read(dataUrl);

    // Get the image data
    const imageData = {
        data: new Uint8ClampedArray(image.bitmap.data),
        width: image.bitmap.width,
        height: image.bitmap.height,
    };

    const code = jsqr(imageData.data, image.width, image.height);

    if (!code) {
        console.log('No QR code found');
        return { error: 'No QR code found' };
    }

    const url = new URL(code.data);
    const issuer = url.searchParams.get('issuer') || '';
    const account = url.pathname.slice(1); // Remove leading slash
    const secret = url.searchParams.get('secret') || '';

    if (!secret) {
        console.log('Invalid QR code found');
        return { error: 'Invalid QR code found' };
    }

    return {
        issuer,
        account,
        secret,
        id: 'item-' + Date.now(),
        blob: [issuer, account].join(' ').toLowerCase(),
    };
});

ipcMain.handle('writeUserData', (event, data) => {
    fs.writeFileSync(USER_DATA_PATH, Uint8Array.from(safeStorage.encryptString(data)));
});

ipcMain.handle('log', (event, data) => {
    console.log(data);
});

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
