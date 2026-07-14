/**
 * Brisk Transfers — Driver App API client.
 * Base URL: https://brisktransfers.vectosol.online/api/driver
 *
 * Every call is JSON over HTTPS. The bearer token returned at login is sent on
 * every authenticated request via the Authorization header.
 */

import { clearToken, getToken } from '@/lib/storage';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL;
export type DriverStatus =
  | 'assigned'
  | 'heading_to_pickup'
  | 'arrived'
  | 'in_progress'
  | 'completed';

export type BookingsType = 'upcoming' | 'history' | 'all';

export interface User {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  userphone: string;
  profile_photo: string | null;
  isActive: number;
}

export interface Stats {
  amount: number;
  rides_count: number;
}

export interface Customer {
  name: string;
  email?: string;
  phone: string;
}

export interface Booking {
  booking_id: number;
  order_id: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  vehicle_type: string | null;
  total_fare: number;
  driver_status: DriverStatus;
  customer?: Customer;
  assignment_status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
}

export interface HistoryBooking {
  booking_id: number;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  completed_at: string;
  total_fare: number;
  customer?: Customer;
}

export interface DashboardData {
  earnings: {
    today: Stats;
    this_month: Stats;
  };
  upcoming_bookings: Booking[];
  recent_history: HistoryBooking[];
}

export interface BookingListResponse {
  current_page: number;
  total: number;
  last_page: number;
  bookings: Booking[];
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  data: { booking_id?: number } | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
  current_page: number;
  last_page: number;
}

export interface ApiErrorDetail {
  statusCode: number;
  message: string;
  fields?: string[];
}

export class ApiError extends Error {
  statusCode: number;
  fields?: string[];
  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.name = 'ApiError';
    this.statusCode = detail.statusCode;
    this.fields = detail.fields;
  }
}

type UnauthorizedHandler = () => void | Promise<void>;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      statusCode: 0,
      message: 'Network error. Please check your connection and try again.',
    });
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (response.status === 401 && auth) {
    await clearToken();
    unauthorizedHandler?.();
  }

  if (!response.ok || json?.status !== 'success') {
    throw new ApiError({
      statusCode: response.status,
      message: json?.message ?? `Request failed (${response.status}).`,
      fields: json?.fields,
    });
  }

  return json.data as T;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                 */
/* ------------------------------------------------------------------ */

export interface LoginResponse {
  user: User;
  token: string;
  stats: {
    today: Stats;
    this_month: Stats;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export async function register(payload: {
  user_fname: string;
  user_lname: string;
  user_email: string;
  userphone: string;
  password: string;
}): Promise<{ user_id: number }> {
  return request<{ user_id: number }>('/register', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export async function forgotPassword(user_email: string): Promise<void> {
  await request('/forgot-password', {
    method: 'POST',
    body: { user_email },
    auth: false,
  });
}

export async function resetPassword(token: string, new_password: string): Promise<void> {
  await request('/reset-password', {
    method: 'POST',
    body: { token, new_password },
    auth: false,
  });
}

/* ------------------------------------------------------------------ */
/* Social auth (Google / Apple)                                        */
/* ------------------------------------------------------------------ */

export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
  return request<LoginResponse>('/google-login', {
    method: 'POST',
    body: { id_token: idToken },
    auth: false,
  });
}

export interface AppleLoginPayload {
  identity_token: string;
  authorization_code?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export async function loginWithApple(payload: AppleLoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('/apple-login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

/* ------------------------------------------------------------------ */
/* Dashboard & bookings                                                 */
/* ------------------------------------------------------------------ */

export async function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>('/dashboard');
}

export async function getBookings(params: {
  type?: BookingsType;
  page?: number;
  limit?: number;
} = {}): Promise<BookingListResponse> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return request<BookingListResponse>(`/bookings${query ? `?${query}` : ''}`);
}

export async function getBooking(id: number | string): Promise<Booking> {
  return request<Booking>(`/booking/${id}`);
}

export async function updateBookingStatus(
  id: number | string,
  payload: {
    status: DriverStatus;
    latitude?: number;
    longitude?: number;
  }
): Promise<{
  driver_status: DriverStatus;
  ride_status: number;
  customer_notified: boolean;
}> {
  return request(`/booking/${id}/status`, {
    method: 'PUT',
    body: payload,
  });
}

export async function postLocationBatch(
  booking_id: number | string,
  locations: {
    lat: number;
    lng: number;
    timestamp: string;
    heading?: number;
    speed?: number;
  }[]
): Promise<{ stored_count: number }> {
  return request('/location/batch', {
    method: 'POST',
    body: { booking_id, locations },
  });
}

/**
 * Decline / cancel a ride that the driver has been assigned but not yet
 * started. Allowed for today's and upcoming rides before the trip begins.
 */
export async function declineBooking(
  id: number | string,
  reason?: string
): Promise<{ assignment_status?: string }> {
  return request(`/booking/${id}/decline`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

/* ------------------------------------------------------------------ */
/* Device & notifications                                               */
/* ------------------------------------------------------------------ */

export async function registerDeviceToken(expo_push_token: string): Promise<void> {
  await request('/device-token', {
    method: 'POST',
    body: { expo_push_token },
  });
}

export async function getNotifications(params: {
  page?: number;
  limit?: number;
} = {}): Promise<NotificationsResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return request<NotificationsResponse>(`/notifications${query ? `?${query}` : ''}`);
}

export async function markNotificationRead(id: number | string): Promise<void> {
  await request(`/notification/${id}/read`, { method: 'PUT' });
}

/* ------------------------------------------------------------------ */
/* Profile                                                              */
/* ------------------------------------------------------------------ */

export async function updateProfile(payload: {
  user_fname?: string;
  user_lname?: string;
  userphone?: string;
  profile_photo?: string;
}): Promise<{ user: User }> {
  return request<{ user: User }>('/profile', {
    method: 'PUT',
    body: payload,
  });
}
