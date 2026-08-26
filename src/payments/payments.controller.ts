import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { forwardAuthHeaders } from '../common/auth/forward-auth-headers.helper';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('orders/:orderId/payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @ApiOkResponse({ description: 'Payments for an order — payment-service, page/limit pass through, response reshaped' })
  list(
    @Param('orderId') orderId: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Headers() headers: Record<string, string>,
  ) {
    return this.service.listByOrder(
      orderId,
      { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined },
      forwardAuthHeaders(headers),
    );
  }
}
