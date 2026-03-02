export const SHOP_CACHE_KEYS = {
  /**
   * Single shop detail: shop:detail:{shopId}
   */
  shopDetail: (shopId: number) => `shop:detail:${shopId}`,

  /**
   * Shop list page: shop:list:{page}:{limit}
   */
  shopList: (page: number, limit: number) => `shop:list:${page}:${limit}`,

  /**
   * Shop search: shop:search:{name}:{city}:{area}:{page}:{limit}
   */
  shopSearch: (name = "", city = "", area = "", page: number, limit: number) =>
    `shop:search:${name}:${city}:${area}:${page}:${limit}`,

  /**
   * Pattern to invalidate all data for a shop: shop:detail:{shopId}
   */
  shopPattern: (shopId: number) => `shop:detail:${shopId}`,

  /**
   * Pattern to invalidate all shop lists/searches
   */
  shopListPattern: () => `shop:list:*`,
  shopSearchPattern: () => `shop:search:*`,
} as const;

export const SHOP_CACHE_TTL = {
  SHOP_DETAIL: 60 * 5, // 5 minutes
  SHOP_LIST: 60 * 2, // 2 minutes
  SHOP_SEARCH: 60 * 1, // 1 minute (search results change more often)
} as const;
