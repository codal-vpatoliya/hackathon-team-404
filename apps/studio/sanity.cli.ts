import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'dlelvhfn',
    dataset: 'sanity-test-db',
  },
  typegen: {
    path: '../web/src/**/*.{ts,tsx,js,jsx}',
    schema: '../web/src/sanity/schema.json',
    generates: '../web/src/sanity/types.ts',
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
