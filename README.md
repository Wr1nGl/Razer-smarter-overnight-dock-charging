# Razer smarter overnight dock charging
This app is meant for safer and more battery friendly approach for razer wireless mouse charing. The goal is to charge the mouse overnight without overcharging it and without exposing the battery to unnecesary heat.

I have made this for my razer wireless dock and Basilist v3 pro 35k. It should work with other mice as well. You should be able to use synapse with this app, however there might be some time when the mouse data cannot be read because synapse is using it...

# Credits
- Server is based on https://github.com/Tekk-Know/RazerBatteryTaskbar

# Requirements
- EPS32 - or any arduido client code compatible board
- USB MUX switch which can be controlled via pins - it must be able to stop power flow to the USB 
- Always on USB power suppy in your PC 

# Wiring
- The program assumes it is getting energy from the computer
- It is set as LOW signal = computer connected (power), HIGH signal - computer disconnected (no power)

# Instructions
- build it/install the server
- add it to startup programs if not done automatically
- set up server config (right click on the taskbar icon)
- set up arduino client config
- make firewall exception for the server if needed
- test if the server can be reached (for example via browser)
- enjoy

# Client config
- MAX_RETRIES - how many times should the client try to get answer before assuming the computer is off, default 5 
- TIMEOUT - how often should the client ping the server of the computer is on, default 15
- DELAY_TIMEOUT - how often should the client ping the server if the computer is off in seconds, default 5
- MUX_SELECT_PIN - board control pin, default 25
- WIFI_NAME - "your_wifi_name"
- WIFI_PASS - "your_wifi_password"
- HOST - "your_local_ip_here"
- PORT - server port, default 5000

I have tried to make the arduino client as non-blocking as possible so you can integrate it in your projects withtout much interference. Just import the files and follow my code from the main file.

# Server config
- max battery level - the capacity you want to reach
- charge time in minutes - how long do you want to charge the mouse for per cycle (to avoid heat)
- cooling time in minutes - pause duration between charge cycles
- % charge change - how many % can 1 charge cycle give
- server port - server port- if you change it you have to change it in arduino manually

All the setting are loaded into arduino when it does server ping except server port. IF YOU CHANGE THE SERVER PORT CHANGE IT IN ARDUINO AS WELL. Also, make sure your PC has static IP otherwise arduino wont be able to find the server.

If you want to calculate % charge change, set up charge time, turn off synapse, click the "Calculate charge change" button and place the mouse on the charging dock and wait. You most likely dont have another mouse available anyway during this time, but if you do, do not close the window. I have tried to make it comsumer-proof but I did not consumer-proof this scenarion (I have made this mainly for my personal use).

# Disclaimer
It should not damage any of your devices, but everything you do with this repository is done AT YOUR OWN RISK. If you get security warning during server install, it is because the exe file doesnt have signed certificate.