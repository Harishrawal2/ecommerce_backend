import { z } from 'zod';

// Variant validation schema
const variantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  value: z.string().min(1, 'Variant value is required'),
});

// Product validation schema
const productSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string().min(1, 'Category is required'),
  stock: z.number().int('Stock must be an integer').nonnegative('Stock must be non-negative'),
  images: z.array(z.string().url('Invalid image URL')).optional(),
  variants: z.array(variantSchema).optional(),
});

// Update product validation schema (all fields optional)
const updateProductSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters long').optional(),
  price: z.number().positive('Price must be positive').optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
  stock: z.number().int('Stock must be an integer').nonnegative('Stock must be non-negative').optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
  variants: z.array(variantSchema).optional(),
});

export const validateProduct = (data: unknown, isUpdate = false) => {
  return isUpdate 
    ? updateProductSchema.safeParse(data)
    : productSchema.safeParse(data);
};