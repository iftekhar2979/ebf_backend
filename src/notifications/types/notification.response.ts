export interface GetNotificationsResponse {
  message: string;
  statusCode: number;
  data: {
    id: number;
    msg: string;
    related: string;
    action: string;
    type: string;
    target_id: number;
    isRead: boolean;
    isImportant: boolean;
    created_at: string;
    updated_at: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
