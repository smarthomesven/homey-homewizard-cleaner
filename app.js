'use strict';

const Homey = require('homey');
const HomeyPush = require('./lib/push');

module.exports = class HomewizardCleanerApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('HomeWizard Cleaner has been initialized');
    this.push = new HomeyPush(this);
    await this.push.startPush();
  }

  async onUninit() {
    this.log('HomeWizard Cleaner has been uninitialized');
    this.push.stopPush();
  }

};
