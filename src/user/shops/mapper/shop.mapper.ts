import { Product } from "src/products/entities/product.entity";
import { FlatProduct, ShopDetailResponse, ShopListItem, ShopReviewResponse } from "../dto/shop.dto";
import { ShopProfile } from "../entities/shop.entity";
import { ShopReview } from "../reviews/enitites/reviews.entity";

export class ShopMapper {
  static toFlatProduct(product: Product): FlatProduct {
    return {
      id: product.id,
      productName: product.productName,
      price: product.price ?? null,
      image: product.images?.[0]?.image ?? null,
      shopName: product.user?.shopProfile?.name ?? null,
      discountPercentage: product.discountPercentage ?? null,
      shopImage: product.user?.image ?? null,
      reviews: 0, // TODO: wire up real review count from ProductStat when available
    };
  }

  static toShopReviewResponse(review: ShopReview): ShopReviewResponse {
    return {
      id: review.id,
      rating: Number(review.rating),
      comment: review.comment ?? null,
      createdAt: review.createdAt,
      user: {
        id: review.user?.id,
        name: review.user?.first_name + review.user?.last_name,
        image: review.user?.image ?? null,
      },
    };
  }

  static toShopListItem(shop: ShopProfile): ShopListItem {
    return {
      id: shop.id,
      name: shop.name ?? null,
      logo: shop.logo ?? null,
      address: shop.shopAddress
        ? {
            city: shop.shopAddress.city ?? null,
            area: shop.shopAddress.area ?? null,
          }
        : null,
      isFavourite: shop.isFavourite ?? false,
    };
  }

  static toShopDetail(
    shop: ShopProfile,
    products: FlatProduct[],
    reviews: ShopReviewResponse[],
    averageRating: number
  ): ShopDetailResponse {
    return {
      id: shop.id,
      name: shop.name ?? null,
      contactNumber: shop.contactNumber ?? null,
      availableDays: shop.availableDays ?? [],
      openingTime: shop.openingTime ?? null,
      closingTime: shop.closingTime ?? null,
      facebookLink: shop.facebookLink ?? null,
      instagramLink: shop.instagramLink ?? null,
      whatsappLink: shop.whatsappLink ?? null,
      banner: shop.banner ?? null,
      logo: shop.logo ?? null,
      address: shop.shopAddress
        ? {
            city: shop.shopAddress.city ?? null,
            area: shop.shopAddress.area ?? null,
            postalCode: shop.shopAddress.postalCode ?? null,
            latitude: shop.shopAddress.latitude ? Number(shop.shopAddress.latitude) : null,
            longitude: shop.shopAddress.longitude ? Number(shop.shopAddress.longitude) : null,
          }
        : null,
      averageRating,
      totalReviews: reviews.length,
      reviews,
      products,
      isFavourite: shop.isFavourite ?? false,
    };
  }
}
