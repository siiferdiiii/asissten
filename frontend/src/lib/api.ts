const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});

  // Add Authorization header if token exists
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure JSON requests set content-type
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    if (typeof window === 'undefined') {
      throw new Error('Unauthorized');
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Cookie refreshToken will be sent automatically if credentials: 'include' is used.
          // In NestJS, cookies are HttpOnly, so credentials 'include' is mandatory.
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const json = await refreshRes.json();
          const newAccessToken = json.data?.accessToken;
          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            onRefreshed(newAccessToken);
            isRefreshing = false;

            // Retry original request
            headers.set('Authorization', `Bearer ${newAccessToken}`);
            const retryRes = await fetch(url, { ...options, headers });
            if (!retryRes.ok) {
              const errJson = await retryRes.json().catch(() => ({}));
              throw new Error(errJson.message || 'API request failed');
            }
            return retryRes.json();
          }
        }
      } catch (err) {
        console.error('Refresh token failed:', err);
      } finally {
        isRefreshing = false;
      }

      // If refresh failed, clear localstorage and redirect
      localStorage.removeItem('accessToken');
      localStorage.removeItem('activeDoctorProfileId');
      window.dispatchEvent(new Event('auth-logout'));
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    // If already refreshing, wait for it to finish and retry
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((newToken) => {
        headers.set('Authorization', `Bearer ${newToken}`);
        fetch(url, { ...options, headers })
          .then((res) => {
            if (!res.ok) {
              res.json().then((err) => reject(new Error(err.message || 'API request failed')));
            } else {
              resolve(res.json());
            }
          })
          .catch((err) => reject(err));
      });
    });
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || 'API request failed');
  }

  return response.json();
}
