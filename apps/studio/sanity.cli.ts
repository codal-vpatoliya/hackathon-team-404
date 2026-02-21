import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'pwg7zxhg',
    dataset: 'priduction',
  },
  typegen: {
    path: '../web/src/**/*.{ts,tsx,js,jsx}',
    schema: '../web/src/sanity/schema.json',
    generates: '../web/src/sanity/types.ts',
  },
  deployment: {
    appId: 'o2spqe295l4kw6sgcep6994t',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
