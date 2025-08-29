export const environment = {
  production: true,
  mifiel: {
    apiUrl: 'https://www.mifiel.com/api/v1/',
    apiKey: 'YOUR_PRODUCTION_API_KEY_HERE', // Replace with actual production API key
    appId: 'YOUR_PRODUCTION_APP_ID_HERE',   // Replace with actual production app ID
    secret: 'YOUR_PRODUCTION_SECRET_HERE',   // Replace with actual production secret
    widgetUrl: 'https://widget.mifiel.com/js/dist/mifiel.js'
  },
  conekta: {
    apiUrl: 'https://api.conekta.io',
    publicKey: 'key_YOUR_PRODUCTION_PUBLIC_KEY_HERE', // Replace with actual production public key
    privateKey: 'key_YOUR_PRODUCTION_PRIVATE_KEY_HERE' // Replace with actual production private key
  },
  // Add other environment variables as needed
  apiUrl: 'https://api.conductores-mundo.com/api',
  odoo: {
    apiKey: 'PROD_ODOO_API_KEY_HERE', // Replace with production API key
    baseUrl: 'https://conductores-del-mundo-sapi-de-cv.odoo.com',
    database: 'conductores-production',
    version: '1.0'
  },
  make: {
    baseUrl: 'https://hook.eu2.make.com',
    apiKey: 'PROD_MAKE_API_KEY_PLACEHOLDER',
    webhooks: {
      newClient: '/YOUR_PROD_WEBHOOK_ID_1', // Replace with actual Make.com production webhook ID
      documentUpload: '/YOUR_PROD_WEBHOOK_ID_2', // Replace with actual Make.com production webhook ID
      paymentConfirmation: '/YOUR_PROD_WEBHOOK_ID_3', // Replace with actual Make.com production webhook ID
      signatureComplete: '/YOUR_PROD_WEBHOOK_ID_4', // Replace with actual Make.com production webhook ID
      dashboardSync: '/YOUR_PROD_WEBHOOK_ID_5', // Replace with actual Make.com production webhook ID
      tandaUpdate: '/YOUR_PROD_WEBHOOK_ID_6', // Replace with actual Make.com production webhook ID
      analyticsReport: '/YOUR_PROD_WEBHOOK_ID_7', // Replace with actual Make.com production webhook ID
      scoringComplete: '/YOUR_PROD_WEBHOOK_ID_8' // Replace with actual Make.com production webhook ID for KINBAN scoring
    }
  },
  version: '1.0.0'
};