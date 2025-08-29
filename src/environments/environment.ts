export const environment = {
  production: false,
  mifiel: {
    apiUrl: 'https://sandbox.mifiel.com/api/v1/',
    apiKey: 'YOUR_SANDBOX_API_KEY_HERE', // Replace with actual sandbox API key
    appId: 'YOUR_SANDBOX_APP_ID_HERE',   // Replace with actual sandbox app ID
    secret: 'YOUR_SANDBOX_SECRET_HERE',   // Replace with actual sandbox secret
    widgetUrl: 'https://widget-sandbox.mifiel.com/js/dist/mifiel.js'
  },
  conekta: {
    apiUrl: 'https://api.conekta.io',
    publicKey: 'key_YOUR_SANDBOX_PUBLIC_KEY_HERE', // Replace with actual sandbox public key
    privateKey: 'key_YOUR_SANDBOX_PRIVATE_KEY_HERE' // Replace with actual sandbox private key
  },
  // Add other environment variables as needed
  apiUrl: 'http://localhost:3000/api',
  odoo: {
    apiKey: '0f06041281c1be1e31b8610ef33da294dda8e64e',
    baseUrl: 'https://conductores-del-mundo-sapi-de-cv.odoo.com',
    database: 'conductores-del-mundo-sapi-de-cv',
    version: '1.0'
  },
  make: {
    baseUrl: 'https://hook.eu2.make.com',
    apiKey: 'DEV_MAKE_API_KEY_PLACEHOLDER',
    webhooks: {
      newClient: '/YOUR_WEBHOOK_ID_1', // Replace with actual Make.com webhook ID
      documentUpload: '/YOUR_WEBHOOK_ID_2', // Replace with actual Make.com webhook ID
      paymentConfirmation: '/YOUR_WEBHOOK_ID_3', // Replace with actual Make.com webhook ID
      signatureComplete: '/YOUR_WEBHOOK_ID_4', // Replace with actual Make.com webhook ID
      dashboardSync: '/YOUR_WEBHOOK_ID_5', // Replace with actual Make.com webhook ID
      tandaUpdate: '/YOUR_WEBHOOK_ID_6', // Replace with actual Make.com webhook ID
      analyticsReport: '/YOUR_WEBHOOK_ID_7', // Replace with actual Make.com webhook ID
      scoringComplete: '/YOUR_WEBHOOK_ID_8' // Replace with actual Make.com webhook ID for KINBAN scoring
    }
  },
  version: '1.0.0'
};