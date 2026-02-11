export interface ProductFilters {
  userId?: number;
  subCategoryId?: number;
  targetedGender?: string;
  minPrice?: number;
  maxPrice?: number;
  hasDiscount?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}