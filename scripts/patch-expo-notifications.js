const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js'
);

if (fs.existsSync(targetFile)) {
  const content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    const patched = content.replace(
      "import { requireNativeModule } from 'expo';",
      "import { requireOptionalNativeModule } from 'expo';"
    ).replace(
      "requireNativeModule('ExpoTopicSubscriptionModule')",
      "requireOptionalNativeModule('ExpoTopicSubscriptionModule') || {}"
    );
    fs.writeFileSync(targetFile, patched, 'utf8');
    console.log('[patch] Patched ExpoTopicSubscriptionModule for Expo Go Android compatibility.');
  }
}
