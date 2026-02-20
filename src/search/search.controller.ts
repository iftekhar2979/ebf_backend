import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly _searchService: SearchService) {}

  @Get()
  async search(@Query("index") index: string, @Query() queryParams: Record<string, any>) {
    // Remove `index` from the query object so only actual query params are passed
    const { index: _, ...query } = queryParams;

    // Wrap the query inside a proper Elasticsearch query DSL (e.g. match_all or match)
    const esQuery = {
      query: {
        match: query,
      },
    };
    console.log("Searched Index:", index);

    // return this._searchService.search<any>(index, esQuery);
  }

  @Post(":index/:id")
  async indexDocument(@Param("index") index: string, @Param("id") id: string, @Body() document: any) {
    console.log("Searched Index:", index);
    return this._searchService.indexDocument<any>(index, id, document);
  }
}
