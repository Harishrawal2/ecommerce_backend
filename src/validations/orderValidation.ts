import { z } from 'zod';

// Order validation schema
const orderSchema = z.object({
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
});

export const validateOrder = (data: unknown) => {
  return orderSchema.safeParse(data);
};