import { ProductReview } from "../entities/product-review.entity";

export class ProductReviewResponse {
  id: number;
  rating: number;
  comment: string;
  createdAt: Date;
  images: string[];
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export class ProductReviewMapper {
  static toResponse(review: ProductReview): ProductReviewResponse {
    return {
      id: review.id,
      rating: Number(review.rating),
      comment: review.comment,
      createdAt: review.createdAt,
      images: review.images?.map((img) => img.image) || [],
      user: {
        id: review.user?.id,
        name: `${review.user?.first_name} ${review.user?.last_name}`,
        image: review.user?.image || null,
      },
    };
  }

  static toManyResponse(reviews: ProductReview[]): ProductReviewResponse[] {
    return reviews.map((review) => this.toResponse(review));
  }
}
