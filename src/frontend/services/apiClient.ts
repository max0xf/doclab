import { AUTH_API_URL } from '../constants';
import { trackPerformance } from '../utils/performanceTracker';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? 'GET';
  const url = `${AUTH_API_URL}${path}`;
  const operation = `${method} ${path}`;

  return trackPerformance(
    operation,
    async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        headers['X-CSRFToken'] = getCsrfToken();
      }

      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }

      // Handle empty responses (204 No Content, etc.)
      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return res.json() as Promise<T>;
    },
    url
  );
}

export const apiClient = { request };
