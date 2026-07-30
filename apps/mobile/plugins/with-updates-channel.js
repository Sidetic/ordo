const { withAndroidManifest } = require('expo/config-plugins');

const CHANNEL = process.env.EXPO_UPDATES_CHANNEL || 'production';

const withUpdatesChannel = (config) =>
  withAndroidManifest(config, (c) => {
    const application = c.modResults.manifest.application[0];
    application['meta-data'] ||= [];
    const name = 'expo.modules.updates.EXPO_UPDATES_CHANNEL';
    const existing = application['meta-data'].find(
      (m) => m.$ && m.$['android:name'] === name
    );
    if (existing) {
      existing.$['android:value'] = CHANNEL;
    } else {
      application['meta-data'].push({
        $: { 'android:name': name, 'android:value': CHANNEL },
      });
    }
    return c;
  });

module.exports = withUpdatesChannel;
