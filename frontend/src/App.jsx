import { useEffect, useState } from "react";
import "./App.css";
import Weather from "./components/Weather";

const API = "http://localhost:5000";
const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");

  // Authentication states
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem(USER_KEY) || "null")
  );
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // API request helper: automatically sends JWT token
  const apiRequest = async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        logout();
      }

      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  // Load only logged-in user's tasks
  const getTodos = async () => {
    try {
      const data = await apiRequest(`${API}/todos`);
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Fetch Error:", error.message);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  // Verify existing login OR process token returned by Google/Facebook
  useEffect(() => {
    const checkLogin = async () => {
      const currentUrl = new URL(window.location.href);
      const socialToken = currentUrl.searchParams.get("token");
      const socialError = currentUrl.searchParams.get("socialError");
      const savedToken = localStorage.getItem(TOKEN_KEY);

      // Remove OAuth token/error from address bar immediately after reading it.
      if (socialToken || socialError) {
        currentUrl.searchParams.delete("token");
        currentUrl.searchParams.delete("provider");
        currentUrl.searchParams.delete("socialError");

        window.history.replaceState(
          {},
          document.title,
          currentUrl.pathname + currentUrl.search
        );
      }

      if (socialError) {
        setAuthError(
          socialError === "google"
            ? "Google login failed. Please try again."
            : "Facebook login failed. Please try again."
        );
      }

      const tokenToVerify = socialToken || savedToken;

      if (!tokenToVerify) {
        setToken(null);
        setUser(null);
        setAuthChecking(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${tokenToVerify}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        } else {
          const currentUser = data.user || data;

          localStorage.setItem(TOKEN_KEY, tokenToVerify);
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));

          setToken(tokenToVerify);
          setUser(currentUser);
          setAuthError("");
          setAuthMessage("");
        }
      } catch (error) {
        console.log("Authentication Check:", error.message);

        if (socialToken) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }

        setToken(null);
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    checkLogin();
  }, []);

  // Load tasks after login/token is verified
  useEffect(() => {
    if (token && user) {
      setLoading(true);
      getTodos();
    }
  }, [token, user]);

  // Login / Signup
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");

    if (authMode === "signup" && !authForm.name.trim()) {
      setAuthError("Please enter your name.");
      return;
    }

    if (!authForm.email.trim() || !authForm.password) {
      setAuthError("Please enter email and password.");
      return;
    }

    if (authForm.password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setAuthSubmitting(true);

    try {
      const endpoint =
        authMode === "signup" ? "/auth/signup" : "/auth/login";

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authForm),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      // If signup response also provides token, log user in directly
      if (data.token) {
        const currentUser = data.user || {
          name: authForm.name,
          email: authForm.email,
        };

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));

        setToken(data.token);
        setUser(currentUser);
        setAuthForm({
          name: "",
          email: "",
          password: "",
        });
        setAuthMessage("");
      } else if (authMode === "signup") {
        // Signup successful, ask user to login
        setAuthMode("login");

        setAuthForm((previous) => ({
          ...previous,
          name: "",
          password: "",
        }));

        setAuthMessage(
          data.message || "Account created successfully! Please login."
        );
      } else {
        // Login response should contain JWT
        throw new Error(
          "Login successful response did not contain a token."
        );
      }
    } catch (error) {
      setAuthError(error.message || "Unable to connect to server.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setToken(null);
    setUser(null);
    setTodos([]);
    setTitle("");
    setEditId(null);
    setSearch("");
    setFilter("All");
    setActivePage("dashboard");
    setAuthMode("login");
    setAuthMessage("");
    setAuthError("");
    setLoading(false);
  };

  // Add or update task
  const saveTodo = async () => {
    if (!title.trim()) return;

    try {
      const method = editId ? "PUT" : "POST";
      const url = editId
        ? `${API}/todos/${editId}`
        : `${API}/todos`;

      await apiRequest(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      setTitle("");
      setEditId(null);
      getTodos();
    } catch (error) {
      alert(error.message);
    }
  };

  // Edit task
  const editTodo = (todo) => {
    setTitle(todo.title);
    setEditId(todo._id);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Delete task
  const deleteTodo = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await apiRequest(`${API}/todos/${id}`, {
        method: "DELETE",
      });

      getTodos();
    } catch (error) {
      alert(error.message);
    }
  };

  // Complete / uncomplete task
  const completeTodo = async (todo) => {
    try {
      await apiRequest(`${API}/todos/${todo._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: todo.title,
          completed: !todo.completed,
        }),
      });

      getTodos();
    } catch (error) {
      alert(error.message);
    }
  };

  const showDashboard = (selectedFilter) => {
    setActivePage("dashboard");
    setFilter(selectedFilter);
  };

  const showWeather = () => {
    setActivePage("weather");
  };

  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;
  const pending = total - completed;

  const filteredTodos = todos.filter((todo) => {
    const matchesSearch = todo.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      (filter === "Completed" && todo.completed) ||
      (filter === "Pending" && !todo.completed);

    return matchesSearch && matchesFilter;
  });

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Authentication loading screen
  if (authChecking) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner"></div>
        <h2>TaskFlow</h2>
        <p>Checking your account...</p>
      </div>
    );
  }

  // Login / Signup page
  if (!token || !user) {
    return (
            <div className="auth-page">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">✓</div>
            <h1>TaskFlow<span>.</span></h1>
          </div>

          <div className="auth-hero">
            <span className="auth-tag">YOUR PRODUCTIVITY PARTNER</span>

            <h2>
              Organize your day.
              <br />
              Achieve your goals.
            </h2>

            <p>
              Manage your daily tasks, track your progress and stay focused
              on what matters most.
            </p>

            <div className="auth-feature-list">
              <div><span>✓</span> Simple task management</div>
              <div><span>✓</span> Track your daily progress</div>
              <div><span>✓</span> Your tasks, your personal space</div>
            </div>
          </div>

          <div className="auth-left-footer">
            © 2026 TaskFlow. Stay organized, stay productive.
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-mobile-brand">
              <h1>TaskFlow<span>.</span></h1>
            </div>

            <div className="auth-tabs">
              <button
                className={authMode === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Login
              </button>

              <button
                className={authMode === "signup" ? "auth-tab active" : "auth-tab"}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Create Account
              </button>
            </div>

            <h2>
              {authMode === "login"
                ? "Welcome back!"
                : "Create your account"}
            </h2>

            <p className="auth-subtitle">
              {authMode === "login"
                ? "Login to continue to your workspace."
                : "Join TaskFlow and organize your daily tasks."}
            </p>

            {authMessage && (
              <div className="auth-success">{authMessage}</div>
            )}

            {authError && (
              <div className="auth-error">{authError}</div>
            )}

            {/* Social login buttons */}
            <div className="social-auth-buttons">
              {/* Google Login */}
              <button
                type="button"
                className="social-auth-btn google-auth-btn"
                onClick={() => {
                  window.location.href = `${API}/auth/google`;
                }}
              >
                <svg
                  className="social-logo google-logo"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.6-4.2 6v5h6.8c4-3.7 6-8.8 6-14.7Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.8-5c-1.8 1.2-4.1 2-6.7 2-5.2 0-9.6-3.5-11.2-8.2H5.8v5.2C9.2 39.1 16.1 44 24 44Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.8 28c-.4-1.2-.7-2.6-.7-4s.2-2.8.7-4V14.8H5.8C4.4 17.6 3.6 20.7 3.6 24s.8 6.4 2.2 9.2l7-5.2Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.6 29.5 4 24 4 16.1 4 9.2 8.9 5.8 14.8l7 5.2c1.6-4.7 6-8.2 11.2-8.2Z"
                  />
                </svg>

                <span>Continue with Google</span>
              </button>

              {/* Facebook Login */}
              <button
                type="button"
                className="social-auth-btn facebook-auth-btn"
                onClick={() => {
                  window.location.href = `${API}/auth/facebook`;
                }}
              >
                <svg
                  className="social-logo facebook-logo"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#1877F2"
                    d="M24 12a12 12 0 1 0-13.875 11.86v-8.39H7.08V12h3.045V9.35c0-3 1.79-4.66 4.52-4.66 1.31 0 2.68.235 2.68.235v2.945h-1.51c-1.49 0-1.955.925-1.955 1.875V12h3.33l-.53 3.47h-2.8v8.39A12.003 12.003 0 0 0 24 12Z"
                  />
                  <path
                    fill="#fff"
                    d="M16.66 15.47 17.19 12h-3.33V9.745c0-.95.465-1.875 1.955-1.875h1.51V4.925s-1.37-.235-2.68-.235c-2.73 0-4.52 1.66-4.52 4.66V12H7.08v3.47h3.045v8.39a12.1 12.1 0 0 0 3.735 0v-8.39h2.8Z"
                  />
                </svg>

                <span>Continue with Facebook</span>
              </button>
            </div>

            <div className="social-auth-divider">
              <span>OR CONTINUE WITH EMAIL</span>
            </div>

            {/* Email Login / Signup Form */}
            <form onSubmit={handleAuthSubmit}>
              {authMode === "signup" && (
                <div className="auth-field">
                  <label>Full Name</label>

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={authForm.name}
                    onChange={(e) =>
                      setAuthForm({
                        ...authForm,
                        name: e.target.value,
                      })
                    }
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Email Address</label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      email: e.target.value,
                    })
                  }
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label>Password</label>

                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({
                        ...authForm,
                        password: e.target.value,
                      })
                    }
                    autoComplete={
                      authMode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {authMode === "signup" && (
                  <small className="password-hint">
                    Password must contain at least 6 characters.
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={authSubmitting}
              >
                {authSubmitting
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Login to Dashboard →"
                    : "Create Account →"}
              </button>
            </form>

            <div className="auth-switch">
              {authMode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthError("");
                      setAuthMessage("");
                    }}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                      setAuthMessage("");
                    }}
                  >
                    Login
                  </button>
                </>
              )}
            </div>

            <div className="auth-security">
              🔒 Your account and tasks are protected.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main TaskFlow Dashboard after login
  return (
        <div className="app-layout">
      <aside className="sidebar">
        <h2 className="logo">
          TaskFlow<span>.</span>
        </h2>

        <p className="menu-title">MENU</p>

        <button
          className={
            activePage === "dashboard" && filter === "All"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => showDashboard("All")}
        >
          ◫ <span>Dashboard</span>
        </button>

        <button
          className={
            activePage === "dashboard" && filter === "Pending"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => showDashboard("Pending")}
        >
          ◷ <span>Pending Tasks</span>
        </button>

        <button
          className={
            activePage === "dashboard" && filter === "Completed"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => showDashboard("Completed")}
        >
          ✓ <span>Completed Tasks</span>
        </button>

        <button
          className={
            activePage === "weather"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={showWeather}
        >
          🌤️ <span>Weather</span>
        </button>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {(user.name || user.email || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-details">
              <strong>{user.name || "User"}</strong>
              <small>{user.email || "Personal Account"}</small>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>
              {activePage === "weather"
                ? "Weather Dashboard"
                : "My Dashboard"}
            </h2>

            <p>
              {activePage === "weather"
                ? "Check live weather and forecast."
                : "Manage your daily tasks efficiently."}
            </p>
          </div>

          <div className="date-box">
            <span>📅</span>
            {today}
          </div>
        </header>

        {activePage === "weather" ? (
          <Weather />
        ) : (
          <>
            <section className="welcome">
              <div>
                <h1>
                  Welcome Back, {user.name || "User"}! 👋
                </h1>

                <p>Stay organized and get things done today.</p>
              </div>

              <div className="welcome-icon">✓</div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <div className="stat-icon blue">▤</div>
                <p>Total Tasks</p>
                <h2>{total}</h2>
                <small>All your tasks</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">✓</div>
                <p>Completed</p>
                <h2>{completed}</h2>
                <small>Tasks finished</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">◷</div>
                <p>Pending</p>
                <h2>{pending}</h2>
                <small>Tasks remaining</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">%</div>
                <p>Progress</p>
                <h2>
                  {total
                    ? Math.round((completed / total) * 100)
                    : 0}%
                </h2>
                <small>Completion rate</small>
              </div>
            </section>

            <section className="task-section">
              <div className="section-heading">
                <div>
                  <h2>My Tasks</h2>
                  <p>Create and manage your daily activities.</p>
                </div>

                <span className="task-count">
                  {filteredTodos.length} Tasks
                </span>
              </div>

              <div className="add-box">
                <input
                  type="text"
                  placeholder="What do you need to do?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && saveTodo()
                  }
                />

                <button onClick={saveTodo}>
                  {editId ? "Update Task" : "+ Add Task"}
                </button>

                {editId && (
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setTitle("");
                      setEditId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="task-toolbar">
                <input
                  type="text"
                  placeholder="⌕ Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="All">All Tasks</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="task-list">
                {loading ? (
                  <p className="empty">Loading tasks...</p>
                ) : filteredTodos.length === 0 ? (
                  <div className="empty">
                    <div>📝</div>
                    <h3>No tasks found</h3>
                    <p>Add a new task to get started.</p>
                  </div>
                ) : (
                  filteredTodos.map((todo) => (
                    <div className="task-card" key={todo._id}>
                      <button
                        className={
                          todo.completed
                            ? "check checked"
                            : "check"
                        }
                        onClick={() => completeTodo(todo)}
                      >
                        {todo.completed ? "✓" : ""}
                      </button>

                      <div className="task-info">
                        <h3
                          className={
                            todo.completed ? "task-done" : ""
                          }
                        >
                          {todo.title}
                        </h3>

                        <span
                          className={
                            todo.completed
                              ? "status done-status"
                              : "status pending-status"
                          }
                        >
                          {todo.completed
                            ? "Completed"
                            : "Pending"}
                        </span>
                      </div>

                      <div className="task-actions">
                        <button onClick={() => editTodo(todo)}>
                          ✎ Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => deleteTodo(todo._id)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        <footer>2026 TaskFlow. All rights reserved.</footer>
      </main>
    </div>
  );
}

export default App;