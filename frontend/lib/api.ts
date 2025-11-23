import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  WardrobeItem,
  CreateWardrobeItemDto,
  UpdateWardrobeItemDto,
  Category,
  ColorAnalysis,
  CreateColorAnalysisDto,
  StyleProfile,
  CreateStyleProfileDto,
  UpdateStyleProfileDto,
  ChatSession,
  CreateChatSessionDto,
  UpdateChatSessionDto,
  AddMessageDto,
} from '@/types/api';

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Optionally redirect to login
      }
    }
    return Promise.reject(error);
  }
);

// User API
export const userApi = {
  getAll: (): Promise<User[]> =>
    apiClient.get('/users').then((res) => res.data),
  getById: (id: string): Promise<User> =>
    apiClient.get(`/users/${id}`).then((res) => res.data),
  create: (data: CreateUserDto): Promise<User> =>
    apiClient.post('/users', data).then((res) => res.data),
  update: (id: string, data: UpdateUserDto): Promise<User> =>
    apiClient.patch(`/users/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/users/${id}`).then(() => undefined),
};

// Wardrobe API
export const wardrobeApi = {
  getAll: (userId: string, category?: Category, colorHex?: string): Promise<WardrobeItem[]> => {
    const params = new URLSearchParams({ userId });
    if (category) params.append('category', category);
    if (colorHex) params.append('colorHex', colorHex);
    return apiClient.get(`/wardrobe?${params.toString()}`).then((res) => res.data);
  },
  getById: (id: string): Promise<WardrobeItem> =>
    apiClient.get(`/wardrobe/${id}`).then((res) => res.data),
  create: (data: CreateWardrobeItemDto): Promise<WardrobeItem> =>
    apiClient.post('/wardrobe', data).then((res) => res.data),
  update: (id: string, data: UpdateWardrobeItemDto): Promise<WardrobeItem> =>
    apiClient.patch(`/wardrobe/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/wardrobe/${id}`).then(() => undefined),
};

// Analysis API
export const analysisApi = {
  getLatest: (userId: string): Promise<ColorAnalysis> =>
    apiClient.get(`/analysis/latest?userId=${userId}`).then((res) => res.data),
  getAllByUserId: (userId: string): Promise<ColorAnalysis[]> =>
    apiClient.get(`/analysis/user/${userId}`).then((res) => res.data),
  getById: (id: string): Promise<ColorAnalysis> =>
    apiClient.get(`/analysis/${id}`).then((res) => res.data),
  create: (data: CreateColorAnalysisDto): Promise<ColorAnalysis> =>
    apiClient.post('/analysis', data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/analysis/${id}`).then(() => undefined),
};

// Style Profile API
export const styleProfileApi = {
  getByUserId: (userId: string): Promise<StyleProfile> =>
    apiClient.get(`/style-profile/user/${userId}`).then((res) => res.data),
  getById: (id: string): Promise<StyleProfile> =>
    apiClient.get(`/style-profile/${id}`).then((res) => res.data),
  create: (data: CreateStyleProfileDto): Promise<StyleProfile> =>
    apiClient.post('/style-profile', data).then((res) => res.data),
  update: (id: string, data: UpdateStyleProfileDto): Promise<StyleProfile> =>
    apiClient.patch(`/style-profile/${id}`, data).then((res) => res.data),
  updateByUserId: (userId: string, data: UpdateStyleProfileDto): Promise<StyleProfile> =>
    apiClient.patch(`/style-profile/user/${userId}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/style-profile/${id}`).then(() => undefined),
};

// Chat API
export const chatApi = {
  getAllByUserId: (userId: string): Promise<ChatSession[]> =>
    apiClient.get(`/chat/user/${userId}`).then((res) => res.data),
  getBySessionId: (sessionId: string): Promise<ChatSession> =>
    apiClient.get(`/chat/session/${sessionId}`).then((res) => res.data),
  getById: (id: string): Promise<ChatSession> =>
    apiClient.get(`/chat/${id}`).then((res) => res.data),
  create: (data: CreateChatSessionDto): Promise<ChatSession> =>
    apiClient.post('/chat', data).then((res) => res.data),
  update: (id: string, data: UpdateChatSessionDto): Promise<ChatSession> =>
    apiClient.patch(`/chat/${id}`, data).then((res) => res.data),
  addMessage: (sessionId: string, data: AddMessageDto): Promise<ChatSession> =>
    apiClient.post(`/chat/${sessionId}/message`, data).then((res) => res.data),
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/chat/${id}`).then(() => undefined),
};

// Upload API
export interface UploadResponse {
  url: string;
}

export const uploadApi = {
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    
    // Create a separate axios instance for file uploads (multipart/form-data)
    const response = await axios.post<UploadResponse>(
      `${baseURL}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Add auth token if available
        ...(typeof window !== 'undefined' && localStorage.getItem('auth_token')
          ? {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
              },
            }
          : {}),
      }
    );
    
    return response.data;
  },
};

export default apiClient;

