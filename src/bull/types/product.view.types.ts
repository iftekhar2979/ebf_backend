export const PRODUCT_VIEW_QUEUE = "product-view-queue";
export const PRODUCT_VIEW_FLUSH_JOB = "flush-buffer";
export const PRODUCT_VIEW_BUFFER_KEY = "product-view-buffer";
export const PRODUCT_VIEW_FLUSH_THRESHOLD = 100;

export interface ProductViewJobData {
  productId: number;
  userId: number;
  viewedAt: string;
}
