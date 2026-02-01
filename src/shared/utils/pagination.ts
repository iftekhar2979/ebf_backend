import { func } from "joi";
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export function pagination({ page = 1, limit = 10, total }: { page: number; limit: number; total: number }) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
}
