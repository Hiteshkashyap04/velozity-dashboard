import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export async function login(email: string, password: string) {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  setAccessToken(response.data.accessToken);

  return response.data;
}

export async function refreshSession() {
  const response = await api.post("/auth/refresh");

  setAccessToken(response.data.accessToken);

  return response.data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  }
);

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function resolvePendingRequests(
  error: unknown,
  token: string | null = null
) {
  pendingRequests.forEach((request) => {
    if (error) {
      request.reject(error);
    } else if (token) {
      request.resolve(token);
    }
  });

  pendingRequests = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | InternalAxiosRequestConfig & { _retry?: boolean }
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const response = await api.post("/auth/refresh");
      const newToken = response.data.accessToken;

      setAccessToken(newToken);
      resolvePendingRequests(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      resolvePendingRequests(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function getProjects() {
  const response = await api.get("/projects");
  return response.data;
}

export async function getProjectById(projectId: string) {
  const response = await api.get(`/projects/${projectId}`);
  return response.data;
}

export async function getTasks(params?: {
  status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  projectId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const response = await api.get("/tasks", {
    params,
  });

  return response.data;
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string;
}) {
  const response = await api.post("/tasks", data);
  return response.data;
}

export async function updateTaskStatus(
  taskId: string,
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
) {
  const response = await api.patch(`/tasks/${taskId}/status`, {
    status,
  });

  return response.data;
}

export async function getDevelopers() {
  const response = await api.get("/tasks/developers");
  return response.data;
}

export async function getDashboardSummary() {
  const response = await api.get("/dashboard/summary");
  return response.data;
}

export async function getNotifications() {
  const response = await api.get("/notifications");
  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await api.get("/notifications/unread-count");
  return response.data;
}

export async function markNotificationAsRead(
  notificationId: string
) {
  const response = await api.patch(
    `/notifications/${notificationId}/read`
  );

  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await api.patch("/notifications/read-all");
  return response.data;
}
