/**
 * payment-bff e2e verification.
 * payment-service is a minimal in-process HTTP stub started by
 * test/global-setup.ts (PAYMENT_SERVICE_URL).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const asJson = async <T>(res: Response): Promise<T> => (await res.json()) as T;

  it('GET /health — returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await asJson(res)).toEqual({ status: 'ok' });
  });

  it('GET /orders/:orderId/payments — pass-through page/limit, reshaped response', async () => {
    const res = await fetch(`${baseUrl}/orders/order-1/payments?page=1&limit=5`);
    expect(res.status).toBe(200);

    const body = await asJson<{ orderId: string; count: number; payments: { id: string; status: string }[] }>(res);
    expect(body.orderId).toBe('order-1');
    expect(body.count).toBe(1);
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0].status).toBe('SUCCEEDED');
    // Reshaped: no page/limit/total envelope leaking through
    expect(body).not.toHaveProperty('page');
    expect(body).not.toHaveProperty('total');
  });

  it('GET /orders/:orderId/payments — empty list for an order with no payments', async () => {
    const res = await fetch(`${baseUrl}/orders/no-payments/payments`);
    expect(res.status).toBe(200);
    const body = await asJson<{ count: number; payments: unknown[] }>(res);
    expect(body.count).toBe(0);
    expect(body.payments).toEqual([]);
  });
});
