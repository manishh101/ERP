import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export function getPagination(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

