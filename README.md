# payment-bff

## Architecture

`payment-bff` is a thin REST aggregation BFF over `payment-service` — it
holds **no domain logic and no datastore**.

- `GET /orders/:orderId/payments` forwards `page`/`limit` to payment-service
  as-is (pass-through), then reshapes the response: the wire pagination
  envelope (`page`/`limit`/`total`) collapses into a flat `count`, and each
  payment is trimmed to `{id, amount, status, createdAt}`.
- Forwards the caller's own Cognito credential downstream.

### Request flow

```
Client → GET /orders/:orderId/payments?page=1&limit=20
         ↓
PaymentsController  (forwards auth header)
         ↓
PaymentsService      (pass-through page/limit; reshapes the response)
         ↓
payment-service GET /payments?orderId=...&page=1&limit=20
```

---

## Running locally

```bash
cd ../contracts && npm install && npm run build && cd -
npm install
cp .env.example .env
npm run start:dev
# http://localhost:3000, Swagger at /api
```

### Tests

```bash
npm test          # unit — PaymentsService with payment-service HTTP calls mocked
npm run test:e2e  # e2e — real HTTP against an in-process payment-service stub
```
