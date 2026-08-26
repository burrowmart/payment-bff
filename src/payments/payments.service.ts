import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPaymentServiceClient, FetchError } from '@demo/contracts';
import { getCorrelationId } from '../common/correlation/correlation.context';

export interface PaymentSummary {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface PaymentsByOrderResponse {
  orderId: string;
  count: number;
  payments: PaymentSummary[];
}

@Injectable()
export class PaymentsService {
  constructor(private readonly config: ConfigService) {}

  // Fresh client per call: correlationId lives in AsyncLocalStorage and
  // changes per request. authHeaders forwards the caller's own credential —
  // payment-service independently verifies the Cognito JWT (global guard),
  // so a request arriving without it would 401 in a real deployment.
  private client(authHeaders: Record<string, string>) {
    return createPaymentServiceClient({
      baseUrl: this.config.get<string>('paymentServiceUrl')!,
      defaultHeaders: { ...authHeaders, ...this.correlationHeaders() },
    });
  }

  private correlationHeaders(): Record<string, string> {
    const id = getCorrelationId();
    return id ? { 'x-correlation-id': id } : {};
  }

  /**
   * Pass-through + shaping: page/limit are forwarded to payment-service
   * as-is (no domain logic on them), but the response is reshaped — the wire
   * pagination envelope (page/limit/total) collapses into a flat count, and
   * each payment is trimmed to the fields this client surface needs.
   */
  async listByOrder(
    orderId: string,
    params: { page?: number; limit?: number },
    authHeaders: Record<string, string>,
  ): Promise<PaymentsByOrderResponse> {
    try {
      const page = await this.client(authHeaders).listPayments({ orderId, ...params });
      return {
        orderId,
        count: page.total,
        payments: page.data.map((p) => ({ id: p.id, amount: p.amount, status: p.status, createdAt: p.createdAt })),
      };
    } catch (err) {
      if (err instanceof FetchError) {
        throw new BadGatewayException(`payment-service returned ${err.status}`);
      }
      throw new BadGatewayException('payment-service unavailable');
    }
  }
}
