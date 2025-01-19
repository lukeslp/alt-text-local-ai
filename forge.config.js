module.exports = {
  packagerConfig: {
    asar: true,
    icon: 'assets/icon',
    osxSign: {
      identity: 'Developer ID Application: Luke Steuber',
      'hardened-runtime': true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      'signature-flags': 'library'
    },
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'alt_text_ai',
        authors: 'Luke Steuber',
        description: 'AI-powered alt text generator for images',
        iconUrl: 'https://raw.githubusercontent.com/lukeslp/alt-text-generator/main/assets/icon.ico',
        setupIcon: 'assets/icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: 'assets/icon.icns',
        background: 'assets/dmg-background.png',
        contents: [
          {
            x: 130,
            y: 220,
            type: 'file',
            path: 'out/Alt Text AI-darwin-x64/Alt Text AI.app'
          },
          {
            x: 410,
            y: 220,
            type: 'link',
            path: '/Applications'
          }
        ],
        window: {
          width: 540,
          height: 380
        }
      }
    }
  ]
}; 