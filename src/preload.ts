// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import OTPService from './otp-service';
import { Item } from './utils';

const windowApp = {
    generateOTP: (key?: string) => key && new OTPService().getTimeBasedOTP(key),
    readUserData: async (): Promise<string> => ipcRenderer.invoke('readUserData'),
    writeUserData: (data: string) => ipcRenderer.invoke('writeUserData', data),
    log: (message: string) => ipcRenderer.invoke('log', message),
    getScreenOTP: async (): Promise<Item | { error: string }> => ipcRenderer.invoke('getScreenOTP'),
};

export type App = typeof windowApp;

contextBridge.exposeInMainWorld('app', windowApp);
