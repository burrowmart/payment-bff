import { BadGatewayException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../src/payments/payments.service';

const config = { get: () => 'http://payment-service.test' } as unknown as ConfigService;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new PaymentsService(config);
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  it('passes orderId/page/limit through, and reshapes the paginated response into {orderId, count, payments}', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: [
          { id: 'pay-1', orderId: 'order-1', userId: 'alice@example.com', amount: 500, status: 'SUCCEEDED', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '' },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    );

    const result = await service.listByOrder('order-1', { page: 1, limit: 20 }, { authorization: 'Bearer tok' });

    const [calledUrl, init] = fetchMock.mock.calls[0];
    const qs = new URL(calledUrl).searchParams;
    expect(qs.get('orderId')).toBe('order-1');
    expect(qs.get('page')).toBe('1');
    expect(qs.get('limit')).toBe('20');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');

    expect(result).toEqual({
      orderId: 'order-1',
      count: 1,
      payments: [{ id: 'pay-1', amount: 500, status: 'SUCCEEDED', createdAt: '2026-01-01T00:00:00.000Z' }],
    });
  });

  it('throws BadGatewayException when payment-service errors', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { message: 'boom' }));

    await expect(service.listByOrder('order-1', {}, {})).rejects.toThrow(BadGatewayException);
  });
});
