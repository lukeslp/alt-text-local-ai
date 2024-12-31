const { notarize } = require('@electron/notarize');
const { build } = require('../package.json');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip if not running on CI and no credentials provided
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('Skipping notarization: No Apple ID or app-specific password provided');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath} with Apple ID ${process.env.APPLE_ID}`);

  try {
    await notarize({
      tool: 'notarytool',
      appPath,
      appBundleId: build.appId,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    });
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }

  console.log('Notarization complete');
}; 