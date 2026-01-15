'use strict';

const Homey = require('homey');

module.exports = class CleanerApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('HomeWizard Cleaner has been initialized');
  }

};
