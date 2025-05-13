import { z } from 'zod';

// Review validation schema
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().min(2, 'Comment must be at least 2 characters long'),
});

export const validateReview = (data: unknown) => {
  return reviewSchema.safeParse(data);
};