export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  likeCount: number;
  isHidden: boolean;
  categoryId?: string;
  categoryName?: string;
  userId: string;
  userNickname: string;
  isLiked?: boolean;      // 현재 유저 기준
  isBookmarked?: boolean; // 현재 유저 기준
  createdAt: string;
}

export interface ServiceListQuery {
  page?: number;
  limit?: number;
  sort?: 'likes' | 'latest';
  category?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
