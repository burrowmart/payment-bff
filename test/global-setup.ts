/**
 * Jest globalSetup — runs once before any test file is loaded.
 * payment-bff has no datastore; its only dependency is payment-service,
 * stood up here as a minimal in-process HTTP stub.
 */
import { createServer, type Server } from 'node:http';

function startPaymentStub(): Promise<Server> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.method === 'GET' && req.url?.startsWith('/payments')) {
        const url = new URL(req.url, 'http://localhost');
        const orderId = url.searchParams.get('orderId');
        if (orderId === 'no-payments') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            data: [
              { id: 'pay-1', orderId, userId: 'alice@example.com', amount: 500, status: 'SUCCEEDED', createdAt: new Date().toISOString(), updatedAt: '' },
            ],
            total: 1,
            page: Number(url.searchParams.get('page') ?? '1'),
            limit: Number(url.searchParams.get('limit') ?? '20'),
          }),
        );
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'not found' }));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function port(server: Server): number {
  const addr = server.address();
  if (typeof addr !== 'object' || addr === null) throw new Error('stub server failed to bind a TCP port');
  return addr.port;
}

export default async function globalSetup(): Promise<void> {
  const payments = await startPaymentStub();

  process.env.PORT = '3014';
  process.env.AUTH_DISABLED = 'true';
  process.env.PAYMENT_SERVICE_URL = `http://127.0.0.1:${port(payments)}`;

  (global as { __PAYMENT_STUB__?: Server }).__PAYMENT_STUB__ = payments;
}
