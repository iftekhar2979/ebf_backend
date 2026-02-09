export interface ResponseInterface<T> {
  status: string;
  message: string;
  data?: T;
  statusCode?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
