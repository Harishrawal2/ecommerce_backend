import { z } from 'zod';

// Cart item validation schema
const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
});

export const validateCartItem = (data: unknown) => {
  return cartItemSchema.safeParse(data);
};