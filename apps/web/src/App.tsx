import { useEffect, useMemo, useState } from "react";
import {
  getDashboardSummary,
  getNotifications,
  getProjectById,
  getProjects,
  getTasks,
  login,
  logout,
  refreshSession,
  updateTaskStatus,
} from "./lib/api";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "./lib/socket";
import "./App.css";

type UserRole = "ADMIN" | "PM" | "DEVELOPER";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    tasks: number;
  };
};

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string;
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type ProjectDetails = Project & {
  tasks: Task[];
};

type DashboardSummary = {
  totalProjects: number;
  totalTasks: number;
  overdueTasks: number;
  onlineUsers: number;
  byStatus: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  byPriority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
};

const STATUS_OPTIONS: Array<{
  value: TaskStatus;
  label: string;
}> = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS: Array<{
  value: TaskPriority;
  label: string;
}> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return "No due date";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isOverdue(
  dateValue: string | null,
  status: TaskStatus,
): boolean {
  if (!dateValue || status === "DONE") {
    return false;
  }

  const dueDate = new Date(dateValue);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return dueDate < today;
}

function getStatusLabel(status: TaskStatus): string {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

function getPriorityLabel(priority: TaskPriority): string {
  return (
    PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ??
    priority
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  const [email, setEmail] = useState("admin@velozity.com");
  const [password, setPassword] = useState("Password123!");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] =
    useState<string | null>(null);
  const [selectedProject, setSelectedProject] =
    useState<ProjectDetails | null>(null);

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);

    return {
      status: params.get("status") || "",
      priority: params.get("priority") || "",
      fromDate: params.get("fromDate") || "",
      toDate: params.get("toDate") || "",
    };
  });

  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [statusUpdatingTaskId, setStatusUpdatingTaskId] =
    useState<string | null>(null);

  async function loadProjects() {
    setIsLoadingProjects(true);

    try {
      const response = await getProjects();
      setProjects(response.projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadDashboardSummary() {
    try {
      const response = await getDashboardSummary();
      setSummary(response.summary);
    } catch (error) {
      console.error("Failed to load dashboard summary:", error);
    }
  }

  async function loadProjectDetails(projectId: string) {
    setIsLoadingProject(true);

    try {
      const response = await getProjectById(projectId);

      const taskResponse = await getTasks({
        projectId,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      } as Parameters<typeof getTasks>[0]);

      setSelectedProject({
        ...response.project,
        tasks: taskResponse.tasks || [],
      });
    } catch (error) {
      console.error("Failed to load project details:", error);
    } finally {
      setIsLoadingProject(false);
    }
  }

  async function loadNotifications() {
    try {
      const response = await getNotifications();

      setNotifications(response.notifications || []);
      setNotificationCount(response.unreadCount || 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  function updateFilter(
    name: keyof typeof filters,
    value: string,
  ) {
    const nextFilters = {
      ...filters,
      [name]: value,
    };

    setFilters(nextFilters);

    const params = new URLSearchParams();

    Object.entries(nextFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        params.set(key, filterValue);
      }
    });

    const query = params.toString();

    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );

    if (selectedProjectId) {
      void loadProjectDetails(selectedProjectId);
    }
  }

  function clearFilters() {
    const clearedFilters = {
      status: "",
      priority: "",
      fromDate: "",
      toDate: "",
    };

    setFilters(clearedFilters);
    window.history.replaceState(
      null,
      "",
      window.location.pathname,
    );

    if (selectedProjectId) {
      void loadProjectDetails(selectedProjectId);
    }
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const response = await login(email, password);

      setUser(response.user);
      connectSocket();

      await Promise.all([
        loadProjects(),
        loadDashboardSummary(),
        loadNotifications(),
      ]);
    } catch (error: any) {
      console.error("Login error:", error);

      setLoginError(
        error?.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    disconnectSocket();

    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }

    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    setSelectedProjectId(null);
    setSummary(null);
    setNotifications([]);
    setNotificationCount(0);
  }

  async function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    await loadProjectDetails(projectId);
  }

  async function handleStatusChange(
    taskId: string,
    nextStatus: TaskStatus,
  ) {
    setStatusUpdatingTaskId(taskId);

    try {
      await updateTaskStatus(taskId, nextStatus);

      if (selectedProjectId) {
        await loadProjectDetails(selectedProjectId);
      }

      await loadDashboardSummary();
    } catch (error: any) {
      console.error("Status update error:", error);

      window.alert(
        error?.response?.data?.message ||
          "Failed to update task status.",
      );
    } finally {
      setStatusUpdatingTaskId(null);
    }
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await refreshSession();

        setUser(response.user);
        connectSocket();

        await Promise.all([
          loadProjects(),
          loadDashboardSummary(),
          loadNotifications(),
        ]);
      } catch {
        // No valid refresh session exists.
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!socket || !user) {
      return;
    }

    function handleTaskStatusUpdated() {
      if (selectedProjectId) {
        void loadProjectDetails(selectedProjectId);
      }

      void loadDashboardSummary();
    }

    function handleTaskCreated() {
      void loadProjects();

      if (selectedProjectId) {
        void loadProjectDetails(selectedProjectId);
      }

      void loadDashboardSummary();
    }

    function handleNotification() {
      void loadNotifications();
    }

    function handlePresence() {
      void loadDashboardSummary();
    }

    socket.on(
      "task:status-updated",
      handleTaskStatusUpdated,
    );
    socket.on("task:created", handleTaskCreated);
    socket.on("notification:new", handleNotification);
    socket.on(
      "presence:count-updated",
      handlePresence,
    );

    return () => {
      socket.off(
        "task:status-updated",
        handleTaskStatusUpdated,
      );
      socket.off("task:created", handleTaskCreated);
      socket.off("notification:new", handleNotification);
      socket.off(
        "presence:count-updated",
        handlePresence,
      );
    };
  }, [selectedProjectId, user]);

  const statusTotal = useMemo(() => {
    if (!summary) {
      return 0;
    }

    return Object.values(summary.byStatus).reduce(
      (total, value) => total + value,
      0,
    );
  }, [summary]);

  const priorityTotal = useMemo(() => {
    if (!summary) {
      return 0;
    }

    return Object.values(summary.byPriority).reduce(
      (total, value) => total + value,
      0,
    );
  }, [summary]);

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell login-shell">
        <div className="login-card">
          <div className="brand-mark">V</div>

          <p className="eyebrow">Project workspace</p>

          <h1>Velozity Dashboard</h1>

          <p className="muted-text">
            Sign in to manage projects, monitor tasks, and
            track progress.
          </p>

          <form
            onSubmit={handleLogin}
            className="login-form"
          >
            <label htmlFor="email">
              Email address

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label htmlFor="password">
              Password

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            {loginError && (
              <div
                className="error-message"
                role="alert"
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="demo-note">
            Demo password:{" "}
            <strong>Password123!</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark brand-mark-small">
            V
          </div>

          <div>
            <div className="brand-title">
              Velozity Dashboard
            </div>

            <div className="brand-subtitle">
              Real-time project workspace
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="user-info">
            <span className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>

            <span className="user-details">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </span>
          </div>

          <div className="notification-wrapper">
            <button
              type="button"
              className="secondary-button notification-button"
              onClick={() =>
                setShowNotifications((visible) => !visible)
              }
              aria-expanded={showNotifications}
            >
              <span>Notifications</span>

              {notificationCount > 0 && (
                <span className="notification-count">
                  {notificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-panel">
                <div className="notification-panel-header">
                  <strong>Notifications</strong>
                  <span>
                    {notificationCount} unread
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    No notifications
                  </div>
                ) : (
                  notifications
                    .slice(0, 5)
                    .map((notification) => (
                      <div
                        className="notification-item"
                        key={notification.id}
                      >
                        {notification.message}
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        <section className="welcome-section">
          <div>
            <p className="eyebrow">Overview</p>

            <h1>Welcome back, {user.name}</h1>

            <p className="muted-text">
              Monitor project progress and task activity
              in one place.
            </p>
          </div>

          <div className="live-indicator">
            <span className="live-dot" />
            Live workspace
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card stat-card-purple">
            <span className="stat-icon">▦</span>
            <span className="stat-label">Projects</span>

            <strong className="stat-value">
              {summary?.totalProjects ?? 0}
            </strong>

            <span className="stat-footnote">
              Active workspaces
            </span>
          </div>

          <div className="stat-card stat-card-blue">
            <span className="stat-icon">✓</span>
            <span className="stat-label">Total tasks</span>

            <strong className="stat-value">
              {summary?.totalTasks ?? 0}
            </strong>

            <span className="stat-footnote">
              Across all projects
            </span>
          </div>

          <div className="stat-card stat-card-green">
            <span className="stat-icon">↗</span>
            <span className="stat-label">In progress</span>

            <strong className="stat-value">
              {summary?.byStatus.IN_PROGRESS ?? 0}
            </strong>

            <span className="stat-footnote">
              Currently being worked on
            </span>
          </div>

          <div className="stat-card stat-card-red">
            <span className="stat-icon">!</span>
            <span className="stat-label">Overdue</span>

            <strong className="stat-value">
              {summary?.overdueTasks ?? 0}
            </strong>

            <span className="stat-footnote">
              Needs attention
            </span>
          </div>
        </section>

        <section className="content-layout">
          <div className="main-column">
            <div className="content-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Projects</p>
                  <h2>Your projects</h2>
                </div>

                <span className="count-label">
                  {projects.length} total
                </span>
              </div>

              {isLoadingProjects ? (
                <div className="loading-state">
                  <div className="loading-spinner loading-spinner-small" />
                  Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <div className="empty-state">
                  No projects are available for your
                  account.
                </div>
              ) : (
                <div className="project-grid">
                  {projects.map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      className={`project-card ${
                        selectedProjectId === project.id
                          ? "project-card-selected"
                          : ""
                      }`}
                      onClick={() =>
                        void handleSelectProject(project.id)
                      }
                    >
                      <div className="project-card-top">
                        <span className="project-owner">
                          Owner: {project.owner.name}
                        </span>

                        <span className="project-task-count">
                          {project._count.tasks} tasks
                        </span>
                      </div>

                      <h3>{project.name}</h3>

                      <p>
                        {project.description ||
                          "No project description provided."}
                      </p>

                      <span className="project-card-action">
                        {selectedProjectId === project.id
                          ? "Currently selected"
                          : "View task details"}

                        <span>→</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="content-card task-details-card">
              <div className="section-header task-details-header">
                <div>
                  <p className="eyebrow">Task details</p>

                  <h2>
                    {selectedProject
                      ? selectedProject.name
                      : "Select a project"}
                  </h2>
                </div>

                {selectedProject && (
                  <span className="count-label">
                    {selectedProject.tasks.length} visible
                  </span>
                )}
              </div>

              <div className="task-filters">
                <div className="filter-field">
                  <label htmlFor="status-filter">
                    Status
                  </label>

                  <select
                    id="status-filter"
                    value={filters.status}
                    onChange={(event) =>
                      updateFilter(
                        "status",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      All statuses
                    </option>

                    {STATUS_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="priority-filter">
                    Priority
                  </label>

                  <select
                    id="priority-filter"
                    value={filters.priority}
                    onChange={(event) =>
                      updateFilter(
                        "priority",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      All priorities
                    </option>

                    {PRIORITY_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="from-date-filter">
                    Due from
                  </label>

                  <input
                    id="from-date-filter"
                    type="date"
                    value={filters.fromDate}
                    onChange={(event) =>
                      updateFilter(
                        "fromDate",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="filter-field">
                  <label htmlFor="to-date-filter">
                    Due to
                  </label>

                  <input
                    id="to-date-filter"
                    type="date"
                    value={filters.toDate}
                    onChange={(event) =>
                      updateFilter(
                        "toDate",
                        event.target.value,
                      )
                    }
                  />
                </div>

                {(filters.status ||
                  filters.priority ||
                  filters.fromDate ||
                  filters.toDate) && (
                  <button
                    type="button"
                    className="clear-filters-button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {!selectedProjectId ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    ⌁
                  </div>

                  <strong>Select a project</strong>

                  <span>
                    Choose a project above to view its
                    tasks and update status.
                  </span>
                </div>
              ) : isLoadingProject ? (
                <div className="loading-state">
                  <div className="loading-spinner loading-spinner-small" />
                  Loading project details...
                </div>
              ) : !selectedProject ||
                selectedProject.tasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    ✓
                  </div>

                  <strong>No matching tasks</strong>

                  <span>
                    This project has no tasks matching the
                    selected filters.
                  </span>
                </div>
              ) : (
                <div className="task-list">
                  {selectedProject.tasks.map((task) => {
                    const overdue = isOverdue(
                      task.dueDate,
                      task.status,
                    );

                    return (
                      <article
                        className="task-card"
                        key={task.id}
                      >
                        <div className="task-content">
                          <div className="task-heading">
                            <div className="task-title-block">
                              <h3>{task.title}</h3>

                              {task.description && (
                                <p>{task.description}</p>
                              )}
                            </div>

                            <span
                              className={`priority-badge priority-${task.priority.toLowerCase()}`}
                            >
                              <span className="priority-badge-dot" />
                              {getPriorityLabel(
                                task.priority,
                              )}
                            </span>
                          </div>

                          <div className="task-meta">
                            <span className="task-meta-item">
                              <span className="meta-icon">
                                ◎
                              </span>

                              {task.assignee?.name ||
                                "Unassigned"}
                            </span>

                            <span
                              className={`task-meta-item ${
                                overdue
                                  ? "task-date-overdue"
                                  : ""
                              }`}
                            >
                              <span className="meta-icon">
                                ◷
                              </span>

                              {overdue
                                ? "Overdue · "
                                : "Due · "}

                              {formatDate(task.dueDate)}
                            </span>

                            <span className="task-status-pill">
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                        </div>

                        <div className="task-status-wrapper">
                          <label
                            htmlFor={`task-status-${task.id}`}
                          >
                            Update status
                          </label>

                          <select
                            id={`task-status-${task.id}`}
                            className="task-status-control"
                            value={task.status}
                            disabled={
                              statusUpdatingTaskId ===
                              task.id
                            }
                            onChange={(event) =>
                              void handleStatusChange(
                                task.id,
                                event.target
                                  .value as TaskStatus,
                              )
                            }
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="sidebar">
            <div className="sidebar-card breakdown-card">
              <div className="breakdown-heading">
                <div>
                  <p className="eyebrow">
                    Status breakdown
                  </p>

                  <h2>Task status</h2>
                </div>

                <span className="breakdown-total">
                  {statusTotal}
                </span>
              </div>

              <div className="breakdown-list">
                {STATUS_OPTIONS.map((option) => {
                  const value =
                    summary?.byStatus[option.value] ?? 0;

                  const percentage =
                    statusTotal > 0
                      ? Math.round(
                          (value / statusTotal) * 100,
                        )
                      : 0;

                  return (
                    <div
                      className="breakdown-item"
                      key={option.value}
                    >
                      <div className="breakdown-item-top">
                        <div className="breakdown-label">
                          <span
                            className={`breakdown-dot breakdown-dot-${option.value.toLowerCase()}`}
                          />

                          <span>{option.label}</span>
                        </div>

                        <strong>
                          {value}
                          <small>{percentage}%</small>
                        </strong>
                      </div>

                      <div className="summary-progress">
                        <div
                          className={`summary-progress-bar summary-progress-${option.value.toLowerCase()}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sidebar-card breakdown-card">
              <div className="breakdown-heading">
                <div>
                  <p className="eyebrow">
                    Priority breakdown
                  </p>

                  <h2>Task priority</h2>
                </div>

                <span className="breakdown-total">
                  {priorityTotal}
                </span>
              </div>

              <div className="breakdown-list">
                {PRIORITY_OPTIONS.map((option) => {
                  const value =
                    summary?.byPriority[option.value] ?? 0;

                  const percentage =
                    priorityTotal > 0
                      ? Math.round(
                          (value / priorityTotal) * 100,
                        )
                      : 0;

                  return (
                    <div
                      className="breakdown-item"
                      key={option.value}
                    >
                      <div className="breakdown-item-top">
                        <div className="breakdown-label">
                          <span
                            className={`breakdown-dot breakdown-dot-${option.value.toLowerCase()}`}
                          />

                          <span>{option.label}</span>
                        </div>

                        <strong>
                          {value}
                          <small>{percentage}%</small>
                        </strong>
                      </div>

                      <div className="summary-progress">
                        <div
                          className={`summary-progress-bar summary-progress-${option.value.toLowerCase()}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sidebar-card online-card">
              <div className="online-card-icon">●</div>

              <div>
                <p className="eyebrow">Live presence</p>

                <h3>
                  {summary?.onlineUsers ?? 0} users online
                </h3>

                <p>
                  Workspace activity is updated in real
                  time.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;