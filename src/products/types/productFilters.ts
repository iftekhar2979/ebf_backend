export interface ProductFilters {
  userId?: string;
  subCategoryId?: number;
  targetedGender?: string;
  minPrice?: number;
  maxPrice?: number;
  hasDiscount?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
