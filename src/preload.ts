// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import OTPService from './otp-service';

contextBridge.exposeInMainWorld('app', {
    generateOTP: (key: string) => new OTPService().getTimeBasedOTP(key),
    readUserData: async () => ipcRenderer.invoke('get-user-data'),
    writeUserData: (data: string) => ipcRenderer.invoke('set-user-data', data),
    windowResize: (edit = false) => ipcRenderer.send(edit ? 'window-edit' : 'window-view'),
});
