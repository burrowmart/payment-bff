import type { Server } from 'node:http';

export default async function globalTeardown(): Promise<void> {
  const payments = (global as { __PAYMENT_STUB__?: Server }).__PAYMENT_STUB__;
  await new Promise<void>((resolve) => (payments ? payments.close(() => resolve()) : resolve()));
}
