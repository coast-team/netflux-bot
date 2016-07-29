# Netflux-bot
Peer machine able to connect to a network handled by netflux API

----------
# Install & Run Netflux-bot on Raspberry Pi
Tested on

 - Raspberry Pi 3
 - Raspbian GNU/Linux 8.0 (jessie)

In this guide we install the following appications:

 - NodeJS: 6.2.2
 - Netlfux: latest

----------
## Install Netlfux-bot
### NodeJS via nvm

Install `nvm` by follow instructions on https://github.com/creationix/nvm.
Then, execute:

	nvm install 6.2.2
	nvm alias default 6.2.2

  ### Netflux-bot

  Execute the following command in `/home/pi/`.

    git clone https://github.com/coast-team/netflux-bot
    npm install

----------
## Run
### Simple
Navigate to `netflux-bot` folder and run the server.

    node server.js

By default the server listen on `ws://127.0.0.1:9000`

Howover you can specify an host and a port with the options `(-h|--host & -p|--port)`:

    node server.js -h 192.168.0.2 -p 8080

### On system boot
To run Netflux-bot on system boot with help of **Forever** node package. It ensure that Netflux-bot application will run continuously.

	npm install forever -g

Navigate to the directory `/etc/init.d/`

	cd /etc/init.d/

Create a new file here containing the following script:
```Shell
#! /bin/sh
# /etc/init.d/netfluxbotboot

### BEGIN INIT INFO
# Provides:          test
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Example initscript
# Description:       This file should be used to construct scripts to be
#                    placed in /etc/init.d.
### END INIT INFO

# Carry out specific functions when asked to by the system
case "$1" in
   start)
    echo "Starting Netflux Bot"
    # run application you want to start
    /home/pi/.nvm/versions/node/v6.2.2/bin/node /home/pi/.nvm/versions/node/v6.2.2/bin/forever --workingDir /home/pi/netflux-bot/ /home/pi/netflux-bot/server.js -nc false -h [RASPBERRY_PI_IP_ADDRESS] -p [RASPBERRY_PI_PORT] >> /home/pi/netflux-bot/server.log
   ;;
   stop)
    echo "Stopping Netflux Bot"
    # kill application you want to stop
    killall -9 node
    # Not a great approach for running
    # multiple node instances
    ;;
  *)
    echo "Usage: /etc/init.d/netfluxbotboot {start|stop}"
    exit 1
    ;;
esac

exit 0
```

**IMPORTANT**: replace `[RASPBERRY_PI_IP_ADDRESS]` and `[RASPBERRY_PI_PORT]` in the script by your value.

Save this file as *netfluxbotboot* (for example) and make it executable:

	sudo chmod 755 netfluxbotboot

Enable dependency-base boot sequencing:

	sudo update-rc.d netfluxbotboot defaults

----------
## Commands
`// TODO`
