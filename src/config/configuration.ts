export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3004',
});
