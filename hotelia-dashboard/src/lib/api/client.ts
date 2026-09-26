import axios from 'axios';

let refreshInFlight: Promise<{ accessToken: string; refreshToken: string }> | null = null;

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize Mongo document IDs while retaining original fields.
function normalize(value: any): any {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  const result: any = Object.fromEntries(Object.entries(value).map(([k,v]) => [k,normalize(v)]));
  if (result._id && typeof result._id === 'string') result.id = result._id;
  if (typeof result.isActive === 'boolean' && result.email) result.status = result.isActive ? 'ACTIVE' : 'SUSPENDED';
  for (const key of ['user','hotel','roomType']) {
    const item = result[key + 'Id'];
    if (item && typeof item === 'object') { result[key] = item; result[key + 'Id'] = item.id; }
  }
  return result;
}

// Response interceptor
api.interceptors.response.use(
  (response) => { response.data = normalize(response.data); return response; },
  async (error) => {
    if(error.response?.data?.error?.message) error.response.data.message = error.response.data.error.message;
    const originalRequest = error.config;

    // Handle 401 - try refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          if (!refreshInFlight) {
            refreshInFlight = axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
              .then(res => {
                localStorage.setItem('accessToken', res.data.accessToken);
                localStorage.setItem('refreshToken', res.data.refreshToken);
                return res.data;
              })
              .finally(() => { refreshInFlight = null; });
          }
          const tokens = await refreshInFlight;
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed, logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// User API
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: Partial<{ name: string; phone: string }>) =>
    api.put('/users/me', data),
};

// Admin API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    api.get('/admin/users', { params }),
  getOwners: () => api.get('/admin/owners'),
  approveOwner: (id: string) => api.post(`/admin/owners/${id}/approve`),
  rejectOwner: (id: string, reason: string) =>
    api.post(`/admin/owners/${id}/reject`, { reason }),
  getHotels: (params?: { status?: string }) =>
    api.get('/admin/hotels', { params }),
  getPendingHotels: () => api.get('/admin/hotels/pending'),
  approveHotel: (id: string) => api.post(`/admin/hotels/${id}/approve`),
  rejectHotel: (id: string, reason: string) =>
    api.post(`/admin/hotels/${id}/reject`, { reason }),
  suspendUser: (id: string) => api.post(`/admin/users/${id}/suspend`),
  activateUser: (id: string) => api.post(`/admin/users/${id}/activate`),
};

// Hotel API
export const hotelApi = {
  getMyHotels: () => api.get('/hotels/owner/my-hotels'),
  getHotel: (id: string) => api.get(`/hotels/${id}`),
  createHotel: (data: Partial<{
    name: string;
    description: string;
    address: string;
    city: string;
    district?: string;
    starRating: number;
    amenities: string[];
    latitude?: number;
    longitude?: number;
  }>) => api.post('/hotels', data),
  updateHotel: (id: string, data: Partial<Record<string, unknown>>) =>
    api.put(`/hotels/${id}`, data),
  deleteHotel: (id: string) => api.delete(`/hotels/${id}`),
  submitHotel: (id: string) => api.post(`/hotels/${id}/submit`),
};

// Room Type API
export const roomTypeApi = {
  getByHotel: (hotelId: string) => api.get(`/room-types/hotel/${hotelId}`),
  create: (hotelId: string, data: Partial<{
    name: string;
    description: string;
    basePrice: number;
    maxGuests: number;
    totalRooms: number;
    amenities?: string[];
  }>) => api.post(`/room-types/hotel/${hotelId}`, data),
  update: (id: string, data: Partial<Record<string, unknown>>) =>
    api.put(`/room-types/${id}`, data),
  delete: (id: string) => api.delete(`/room-types/${id}`),
};

// Booking API
export const bookingApi = {
  getOwnerBookings: () => api.get('/owners/bookings'),
  getAdminBookings: () => api.get('/admin/bookings'),
  resolveCancellation: (id:string) => api.post(`/bookings/${id}/resolve-cancellation`),
  getMyBookings: () => api.get('/bookings'),
  getBooking: (id: string) => api.get(`/bookings/${id}`),
  cancelBooking: (id: string, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }),
  checkIn: (id: string) => api.post(`/bookings/${id}/check-in`),
  checkOut: (id: string) => api.post(`/bookings/${id}/check-out`),
};

// Review API
export const reviewApi = {
  getByHotel: (hotelId: string) => api.get(`/reviews/hotel/${hotelId}`),
  getMyReviews: () => api.get('/reviews/my-reviews'),
  getOwnerReviews: () => api.get('/reviews/owner'),
  create: (data: { hotelId: string; rating: number; title?: string; content: string }) =>
    api.post('/reviews', data),
  reply: (id: string, reply: string) =>
    api.post(`/reviews/${id}/reply`, { reply }),
};

// Owner API
export const ownerApi = {
  apply: (data: { businessName: string; businessLicense?: string }) =>
    api.post('/owners/apply', data),
  getDashboard: () => api.get('/owners/dashboard'),
  getHotelBookings: (hotelId: string) =>
    api.get(`/owners/hotels/${hotelId}/bookings`),
  getRevenue: (year?: number) => api.get('/owners/revenue', { params: { year } }),
};
