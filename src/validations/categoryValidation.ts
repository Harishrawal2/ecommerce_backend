import { z } from 'zod';

// Category validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  description: z.string().optional(),
});

// Update category validation schema (all fields optional)
const updateCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  description: z.string().optional(),
});

export const validateCategory = (data: unknown, isUpdate = false) => {
  return isUpdate 
    ? updateCategorySchema.safeParse(data)
    : categorySchema.safeParse(data);
};