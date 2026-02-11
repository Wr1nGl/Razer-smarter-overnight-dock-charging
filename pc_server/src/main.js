'use strict'
const logger = require('electron-log/main');
var { getDeviceList } = require('usb');
const { bmRequestType, DIRECTION, TYPE, RECIPIENT } = require('bmrequesttype');
var razerProducts = require('./products');
const http = require('http');
const fs = require('fs');


logger.transports.file.fileName = 'app.log';
logger.transports.file.maxSize = 100000;
logger.initialize();

const {
    app,
    Tray,
    Menu,
    nativeImage,
    Notification,
    BrowserWindow,
    ipcMain,
} = require('electron');
if (require('electron-squirrel-startup')) app.quit();

const path = require('path');
const rootPath = app.getAppPath();
const razerVendorId = 0x1532;
const batteryCheckTimeout = 60 * 1000
const init_lopp_max_counter = 30
const configPath = path.join(app.getPath('userData'), 'config.json');
let usbDevices, razerDevices, tray, contextMenu, batteryCheckInterval, settingsWindow;

//in case the computer crashes, this should avoid unnecesary overcharge
let lastKnownBattery = "100";
const DEFAULT_CONFIG = {
    battery_max_charge_level: 80,
    charge_time: 10,
    cooldown_time: 5,
    charge_gain: 3.0,
    port: 5000
};
let savedConfig = { ...DEFAULT_CONFIG };

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            battery_level: lastKnownBattery,
            ...savedConfig
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

ipcMain.on('save-settings', (event, data) => {

    const portChanged = data.port !== savedConfig.port;
    fs.writeFileSync(configPath, JSON.stringify(data));

    savedConfig = { ...data };

    if (portChanged) {
        logger.info(`Port change detected. Restarting server on port ${data.port}...`);
        
        server.close(() => {
            logger.info('Old server closed.');
            server.listen(savedConfig.port, '0.0.0.0', () => {
                logger.info(`Server successfully restarted on port ${savedConfig.port}`);
            });
        });
    }
    
    logger.info('Settings updated and saved to disk');
});

ipcMain.on('calculate_charge', (event) => {
    logger.info('Calculating charge...');
    logger.info(lastKnownBattery);
    
    const val_1 = parseFloat(lastKnownBattery);
        let minutesRemaining = savedConfig.charge_time;

        const showCountdown = () => {
            if (settingsWindow) {
                settingsWindow.webContents.send('timer-update', minutesRemaining);
            }

            if (minutesRemaining > 0) {
                setTimeout(() => {
                    minutesRemaining--;
                    showCountdown();
                }, 1000 * 60);
            } else {
                //try to read the battery
                SetTrayDetails(tray);
                const val_2 = parseFloat(lastKnownBattery);
                let power_gain = val_2 - val_1;
                
                if (power_gain <= 0){
                    power_gain = 1.0;
                } 

                savedConfig.charge_gain = parseFloat(power_gain).toFixed(2);
                fs.writeFileSync(configPath, JSON.stringify(savedConfig));

                if (settingsWindow) {
                    settingsWindow.webContents.send('load-settings', savedConfig);
                    settingsWindow.webContents.send('timer-update', 0);
                }
                
                logger.info(`Done! Gain: ${power_gain}`);
            }
        };

        showCountdown();
});

function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 400,
        height: 600,
        title: 'Server Settings',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    settingsWindow.setMenu(null)

    settingsWindow.loadFile(path.join(rootPath, 'src/settings.html'));

    settingsWindow.webContents.on('did-finish-load', () => {
        settingsWindow.webContents.send('load-settings', savedConfig);
    });

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe')
});

app.on('window-all-closed', (e) => {
    e.preventDefault(); 
});

app.whenReady().then(() => {
    logger.info('========== App Start ===========');
    logger.info(`checkInterval: ${batteryCheckTimeout}`);

    usbDevices = getDeviceList() || [];

    razerDevices = usbDevices.filter(d => d.deviceDescriptor.idVendor == razerVendorId && d.deviceDescriptor.idProduct in razerProducts)
    logger.info(`Found ${usbDevices.length} USB device(s) and ${razerDevices.length} Razer product(s)`);

    if (razerDevices.length < 1) {
        logger.warn('No Razer products detected on init');
        new Notification({title: 'Warning', body:'No Razer products detected'}).show();
    }

    //config load
    if (fs.existsSync(configPath)) {
        try {
            const fileData = JSON.parse(fs.readFileSync(configPath));
            savedConfig = { ...DEFAULT_CONFIG, ...fileData };
            logger.info('Settings merged with defaults');
        } catch (e) {
            logger.error('Config file corrupt, using defaults');
            savedConfig = { ...DEFAULT_CONFIG };
        }
    } else {
        logger.info('No config file found, using defaults');
        fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG));
    }

    //server start
    server.listen(savedConfig.port, '0.0.0.0', () => {
        logger.info('HTTP Server running');
    });

    const icon = nativeImage.createFromPath(path.join(rootPath, 'src/assets/battery_0.png'));
    tray = new Tray(icon);

    contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Server Settings', 
            type: 'normal', 
            click: createSettingsWindow 
        },
        { type: 'separator' },
        { 
            label: 'Quit', 
            type: 'normal', 
            click: QuitClick 
        }
    ]);

    //main battery check
    batteryCheckInterval = setInterval(() => {
        SetTrayDetails(tray);
    }, batteryCheckTimeout);

    //this will try to get initial battery status
    let count = 0;
    const init_loop = setInterval(() => {
        count++;
        SetTrayDetails(tray);

        if (count === init_lopp_max_counter) {
            clearInterval(init_loop);
        }
    }, 2000);

    

    tray.setContextMenu(contextMenu);
    tray.setToolTip('Searching for device');
    tray.setTitle('Razer battery life');
});
function SetTrayDetails(tray) {
    GetBattery()
        .then(battLife => {
            if (battLife == 0 || battLife === undefined) return; 

            lastKnownBattery = battLife;

            let assetPath = GetBatteryIconPath(battLife);

            tray.setImage(nativeImage.createFromPath(path.join(rootPath, assetPath)));
            tray.setToolTip(battLife == 0 ? "Device disconnected" : battLife + '%');
        })
        .catch(err => {
            let assetPath = GetBatteryIconPath(0);
            tray.setImage(nativeImage.createFromPath(path.join(rootPath, assetPath)));
            tray.setToolTip("No compatible Razer products detected");
            logger.error(err);
        });
};
function GetBatteryIconPath(val) {
    let iconName;
    iconName = Math.floor(val/10) * 10;
    return `src/assets/battery_${iconName}.png`;
};
function QuitClick() {
    clearInterval(batteryCheckInterval);
    if (process.platform !== 'darwin') app.quit();
};
function GetMessage(mouse, code) {
    logger.info(mouse, ' | GetMessage')

    // Function that creates and returns the message to be sent to the device
    let msg = Buffer.from([0x00, mouse.transactionId, 0x00, 0x00, 0x00, 0x02, 0x07, code]);
    let crc = 0;

    for (let i = 2; i < msg.length; i++) {
        crc = crc ^ msg[i];
    }

    // the next 80 bytes would be storing the data to be sent, but for getting the battery no data is sent
    msg = Buffer.concat([msg, Buffer.alloc(80)])

    // the last 2 bytes would be the crc and a zero byte
    msg = Buffer.concat([msg, Buffer.from([crc, 0])]);

    return msg;
};
function GetMouse() {
    usbDevices = getDeviceList();
    
    //filter only razer devices which are included in products.js
    razerDevices = usbDevices.filter(d => d.deviceDescriptor.idVendor == razerVendorId && d.deviceDescriptor.idProduct in razerProducts)

    const docks = [0x00A4]
    if (razerDevices && razerDevices.length > 0) {
        //if there are multiple devices
        if (razerDevices.length > 1){
            //try to ignore docks to find if mouse is connected over wire, if it is, use the connected mouse, otherwise use dock
            for (const device of razerDevices){
                if (docks.includes(device.deviceDescriptor.idProduct)){
                    logger.info('Dock detected, skipping')
                    continue;
                }
                logger.info(`Device set to: ${razerProducts[device.deviceDescriptor.idProduct].name} | GetMouse`);
                return device;
            }
        }
        //use the only valid device available
        logger.info(`Device set to: ${razerProducts[razerDevices[0].deviceDescriptor.idProduct].name} | GetMouse`);
        return razerDevices[0];
    } else {
        throw new Error('No Razer products detected | GetMouse');
    }
};

async function GetBattery() {
    // Async functions should return a promise by default.
    let mouse;
    try {
        mouse = GetMouse();
        const razerProduct = razerProducts[mouse.deviceDescriptor.idProduct];
        const msg = GetMessage(razerProduct, 0x80);
        mouse.open();

        if (mouse.configDescriptor.bConfigurationValue === null) {
            mouse.setConfiguration(1);
        }

        const interface0 = mouse.interfaces[0];
        interface0.claim();

        await new Promise((resolve, reject) => {
            mouse.controlTransfer(
                bmRequestType(DIRECTION.Out, TYPE.Class, RECIPIENT.Interface),
                0x09, 0x300, 0x00, msg,
                (err) => (err ? reject(err) : resolve())
            );
        });

        await new Promise(res => setTimeout(res, 1000));

        const percentage = await new Promise((resolve, reject) => {
            mouse.controlTransfer(
                bmRequestType(DIRECTION.In, TYPE.Class, RECIPIENT.Interface),
                0x01, 0x300, 0x00, 90,
                (err, data) => {
                    if (err) return reject(err);
                    const val = (data.readUInt8(9) / 255 * 100).toFixed(2);
                    resolve(val);
                }
            );
        });

        interface0.release((err) => { if(err) logger.error('Release error:', err); });
        
        return percentage;

    } catch (error) {
        //this is id for wired 35k pro, this is here in case i cannot read wired mouse data
        const wired_devices = [0x00CC]
        if(mouse){
            if (wired_devices.includes(mouse.deviceDescriptor.idProduct)){
                logger.error('Unaccesible wired device detected...')
                logger.error(error)
                return 0;
            }
        }
        throw error;
    } finally {
        if (mouse){
            try {
                if (mouse.interfaces && mouse.interfaces[0]) {
                    await new Promise((res) => {
                        mouse.interfaces[0].release(true, () => res()); 
                    });
                }
                mouse.close();
            } catch (closeError) {
                logger.error('Cleanup failed:', closeError.message);
            }
        }
    }
}

