'use strict';

const Homey = require('homey');
const axios = require('axios');

module.exports = class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');
  }

  async onPair(session) {
    session.setHandler("login", async (data) => {
      try {
        const email = data.email;
        const password = data.password;
        if (!data.email || !data.password) {
          return false;
        }
        const basicAuth = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");
        const response = await axios.get('https://api.homewizardeasyonline.com/v1/auth/devices', {
          headers: {
            'Authorization': `${basicAuth}`
          }
        });
        this.homey.settings.set('email', email);
        this.homey.settings.set('password', password);
        this.homey.settings.set('loggedIn', true);
        await session.showView('list_devices');
        return true;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          return false;
        }
        throw new Error("Error during API key check: " + error.message);
      }
    });

    session.setHandler("showView", async (viewId) => {
      if (viewId === 'login') {
        const loggedIn = this.homey.settings.get('loggedIn');
        if (!loggedIn) {
          await session.showView('list_devices');
          return;
        }
      }
    });

    session.setHandler("list_devices", async (data) => {
      try {
        const email = this.homey.settings.get('email');
        const password = this.homey.settings.get('password');
        if (!email || !password) {
          throw new Error("Email or password not found in storage.");
        }
        const basicAuth = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");
        const response = await axios.get('https://api.homewizardeasyonline.com/v1/auth/devices', {
          headers: {
            'Authorization': `${basicAuth}`
          }
        });
        const links = response.data.devices.filter(d => d.type === "cleaner");
        if (links.length === 0) {
          return [];
        }
        return links.map(link => ({
          name: link.name,
          data: {
            id: link.identifier,
          },
          store: {
            id: link.identifier,
            endpoint: link.endpoint
          },
        }));
      } catch (error) {
        throw new Error("Error while fetching links: " + error.message);
      }
    });
  }

  async onRepair(session) {
    session.setHandler("login", async (data) => {
      try {
        const email = data.email;
        const password = data.password;
        if (!data.email || !data.password) {
          return false;
        }
        const basicAuth = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");
        const response = await axios.get('https://api.homewizardeasyonline.com/v1/auth/devices', {
          headers: {
            'Authorization': `${basicAuth}`
          }
        });
        this.homey.settings.set('email', email);
        this.homey.settings.set('password', password);
        this.homey.settings.set('loggedIn', true);
        await session.done();
        return true;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          return false;
        }
        throw new Error("Error during API key check: " + error.message);
      }
    });
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
      // {
      //   name: 'My Device',
      //   data: {
      //     id: 'my-device',
      //   },
      //   store: {
      //     address: '127.0.0.1',
      //   },
      // },
    ];
  }

};
