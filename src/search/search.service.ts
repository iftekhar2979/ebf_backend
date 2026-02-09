import { Injectable } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";

@Injectable()
export class SearchService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
  async search<T>(index: string, query: Record<string, string>) {
    return this.elasticsearchService.search<T>({
      index: index,
      body: query,
    });
  }

  async indexDocument<T>(index: string, id: string, document: any) {
    return this.elasticsearchService.index<T>({
      index: index,
      id: id,
      body: document,
    });
  }
}
