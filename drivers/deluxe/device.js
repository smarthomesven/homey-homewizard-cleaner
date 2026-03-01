'use strict';

const Homey = require('homey');
const axios = require('axios');

module.exports = class DeluxeDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    try {
      this.log('DeluxeDevice has been initialized');
      // migrations
      if (!this.hasCapability('dock')) {
        await this.addCapability('dock');
      }
      if (!this.hasCapability('start')) {
        await this.addCapability('start');
      }
      if (!this.hasCapability('state')) {
        await this.addCapability('state');
      }
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery');
      }

      if (!this.getStoreValue('state_update_16012025_migration_complete')) {
        await this.removeCapability('state');
        await this.addCapability('state');
        this.setStoreValue('state_update_16012025_migration_complete', true);
      }

      const dockAction = this.homey.flow.getActionCard('dock');
      const startAction = this.homey.flow.getActionCard('start');
      this.registerCapabilityListener('dock', async (value) => {
        if (value === true) {
          await this.sendCommand('charge');
        }
      });
      this.registerCapabilityListener('start', async (value) => {
        if (value === true) {
          await this.sendCommand('work');
        }
      });
      dockAction.registerRunListener(async (args, state) => {
        await this.sendCommand('charge');
        return true;
      });
      startAction.registerRunListener(async (args, state) => {
        await this.sendCommand('work');
        return true;
      });
      const endpoint = this.getStoreValue('endpoint');
      const token = await this.getToken();
      const statusResponse = await axios.get(`${endpoint}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      this.log('Device status response:', statusResponse.data);
      await this.startPolling();
    } catch (err) {
      this.error('Initialization error:', err.message);
      await this.setUnavailable("Initialization error");
    }
  }

  async sendCommand(command) {
    try {
      const endpoint = this.getStoreValue('endpoint');
      const token = await this.getToken();
      const response = await axios.post(`${endpoint}/control`, {
        activity: command
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      this.log(`Command ${command} response:`, response.data);
    } catch (err) {
      this.error(`Error sending command ${command}:`, err.message);
      throw err;
    }
  }

  async getToken() {
    try {
      const email = this.homey.settings.get('email');
      const password = this.homey.settings.get('password');
      const basicAuth = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");
      const tokenResponse = await axios.post('https://api.homewizardeasyonline.com/v1/auth/token', {
        device: this.getData().id
      }, {
        headers: {
          'Authorization': `${basicAuth}`
        }
      });
      this.log('Token response:', tokenResponse.data);
      const token = tokenResponse.data.token;
      if (!token) {
        throw new Error("Token not found in response.");
      }
      this.setStoreValue('token', token);
      return token;
    } catch (error) {
      this.error('Error fetching token:', error.message);
      throw new Error("Error fetching token: " + error.message);
    }
  }


  async startPolling() {
    this.pollInterval = this.homey.setInterval(async () => {
      try {
        const endpoint = this.getStoreValue('endpoint');
        const token = this.getStoreValue('token');
        try {
          const statusResponse = await axios.get(`${endpoint}/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const status = statusResponse.data;
          await this.setAvailable();
          if (status.battery_percentage && this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', status.battery_percentage);
          }
          if (status.status && this.hasCapability('state') && (status.status === "working" || status.status === "finished_charging" || status.status === "charging" || status.status === "standby" || status.status === "docking" || status.status === "malfunction")) {
            this.setCapabilityValue('state', status.status);
          } else if (status.status && this.hasCapability('state')) {
            this.setCapabilityValue('state', 'unknown');
            if (this.getStoreValue(`states_${status.status}`) !== true) {
              try {
                const result = await axios.get('https://gist.githubusercontent.com/smarthomesven/4e03927279bd25ab079ac5d588be5efd/raw/d04d6d6b77c39d2ea97e0c098edbfdfc08779229/state.json');
                await axios.post('https://device-support-requests.vercel.app/api/send-report', {
                  message: `Unknown status detected: ${status.status}`,
                  app: 'HomeWizard Cleaner',
                  report: {
                    status: status
                  }
                }).catch(this.error);
              } catch (err) {
                this.error('Error sending unknown status report:', err.message);
              }
            }
            this.setStoreValue(`states_${status.status}`, true);
          }

          this.log('Polled device status response:', statusResponse.data);
        } catch (err) {
          if (err.response && err.response.status === 401) {
            this.error('Invalid token.');
            const token = await this.getToken();
            return;
          } else {
            throw err;
          }
        }
      } catch (err) {
        this.error('Polling error:', err.message);
        await this.setUnavailable("Device unreachable");
      }
    }, 4000);
  }

  

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    if (this.pollInterval) {
      this.homey.clearInterval(this.pollInterval);
    }
    this.log('MyDevice has been deleted');
  }

};
