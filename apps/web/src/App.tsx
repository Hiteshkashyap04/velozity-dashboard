import { useEffect, useState } from "react";
import {
  getProjectById,
  getProjects,
  login,
  logout,
  refreshSession,
} from "./lib/api";
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
  dueDate: string | null;
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
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type ProjectDetails = {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  tasks: Task[];
};

function formatDate(date: string | null) {
  if (!date) {
    return "No due date";
  }

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
  };

  return labels[status];
}

function getPriorityLabel(priority: TaskPriority) {
  const labels: Record<TaskPriority, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };

  return labels[priority];
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] =
    useState<ProjectDetails | null>(null);

  const [email, setEmail] = useState("admin@velozity.com");
  const [password, setPassword] = useState("Password123!");

  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingProjectDetails, setIsLoadingProjectDetails] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await refreshSession();
        setUser(response.user);
      } catch {
        setUser(null);
      } finally {
        setIsRestoringSession(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    async function loadProjects() {
      setIsLoadingProjects(true);
      setError("");

      try {
        const response = await getProjects();
        setProjects(response.projects);
      } catch {
        setError("Unable to load projects.");
      } finally {
        setIsLoadingProjects(false);
      }
    }

    loadProjects();
  }, [user]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoggingIn(true);
    setError("");

    try {
      const response = await login(email, password);
      setUser(response.user);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    await logout();

    setUser(null);
    setProjects([]);
    setSelectedProject(null);
  }

  async function handleOpenProject(projectId: string) {
    setIsLoadingProjectDetails(true);
    setError("");

    try {
      const response = await getProjectById(projectId);
      setSelectedProject(response.project);
    } catch {
      setError("Unable to load project details.");
    } finally {
      setIsLoadingProjectDetails(false);
    }
  }

  function handleCloseProject() {
    setSelectedProject(null);
  }

  if (isRestoringSession) {
    return (
      <main className="app-shell">
        <section className="loading-screen">
          <div className="spinner" />
          <p>Restoring your session...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="login-page">
          <div className="login-card">
            <div className="brand-mark">V</div>

            <h1>Velozity Dashboard</h1>
            <p className="muted-text">
              Sign in to manage projects and tasks.
            </p>

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                type="submit"
                className="primary-button"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="demo-account">
              <strong>Demo account</strong>
              <span>admin@velozity.com</span>
              <span>Password123!</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="small-brand-mark">V</div>

          <div>
            <h1>Velozity Dashboard</h1>
            <p>Project workspace</p>
          </div>
        </div>

        <div className="topbar-user">
          <div className="user-details">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Projects</h2>
            <p className="muted-text">
              View the projects available to your account.
            </p>
          </div>

          <div className="summary-card">
            <span>Total projects</span>
            <strong>{projects.length}</strong>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {selectedProject ? (
          <section className="project-details-section">
            <div className="details-header">
              <button
                type="button"
                className="back-button"
                onClick={handleCloseProject}
              >
                ← Back to projects
              </button>

              <span className="project-owner">
                Owner: {selectedProject.owner.name}
              </span>
            </div>

            {isLoadingProjectDetails ? (
              <section className="loading-section">
                <div className="spinner" />
                <p>Loading project details...</p>
              </section>
            ) : (
              <>
                <div className="project-details-heading">
                  <div>
                    <p className="eyebrow">Project details</p>
                    <h2>{selectedProject.name}</h2>

                    <p className="project-description">
                      {selectedProject.description ||
                        "No project description provided."}
                    </p>
                  </div>

                  <div className="due-date-card">
                    <span>Due date</span>
                    <strong>{formatDate(selectedProject.dueDate)}</strong>
                  </div>
                </div>

                <div className="tasks-section">
                  <div className="section-heading">
                    <div>
                      <h3>Tasks</h3>
                      <p className="muted-text">
                        {selectedProject.tasks.length} task
                        {selectedProject.tasks.length === 1 ? "" : "s"} in
                        this project
                      </p>
                    </div>
                  </div>

                  {selectedProject.tasks.length === 0 ? (
                    <div className="empty-state">
                      <p>No tasks found for this project.</p>
                    </div>
                  ) : (
                    <div className="task-list">
                      {selectedProject.tasks.map((task) => (
                        <article className="task-row" key={task.id}>
                          <div className="task-main">
                            <h4>{task.title}</h4>

                            <p>
                              {task.description ||
                                "No task description provided."}
                            </p>

                            <div className="task-meta">
                              <span>
                                Assignee:{" "}
                                {task.assignee?.name || "Unassigned"}
                              </span>

                              <span>
                                Due: {formatDate(task.dueDate)}
                              </span>
                            </div>
                          </div>

                          <div className="task-labels">
                            <span
                              className={`status-badge status-${task.status.toLowerCase()}`}
                            >
                              {getStatusLabel(task.status)}
                            </span>

                            <span
                              className={`priority-badge priority-${task.priority.toLowerCase()}`}
                            >
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        ) : (
          <>
            {isLoadingProjects ? (
              <section className="loading-section">
                <div className="spinner" />
                <p>Loading projects...</p>
              </section>
            ) : projects.length === 0 ? (
              <section className="empty-state">
                <h3>No projects available</h3>
                <p>
                  There are currently no projects available for your account.
                </p>
              </section>
            ) : (
              <div className="project-grid">
                {projects.map((project) => (
                  <button
                    type="button"
                    className="project-card"
                    key={project.id}
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <div className="project-card-top">
                      <span className="project-tag">Project</span>
                      <span className="project-arrow">↗</span>
                    </div>

                    <h3>{project.name}</h3>

                    <p>
                      {project.description ||
                        "No project description provided."}
                    </p>

                    <div className="project-card-footer">
                      <div>
                        <span>Tasks</span>
                        <strong>{project._count.tasks}</strong>
                      </div>

                      <div>
                        <span>Due date</span>
                        <strong>{formatDate(project.dueDate)}</strong>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default App;