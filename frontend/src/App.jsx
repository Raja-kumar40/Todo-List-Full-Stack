
import { useEffect, useState } from "react";
import "./App.css";
import Weather from "./components/Weather";

const API = "http://localhost:5000/todos";

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  
  const [activePage, setActivePage] = useState("dashboard");

  
  const getTodos = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTodos();
  }, []);

  
  const saveTodo = async () => {
    if (!title.trim()) return;

    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API}/${editId}` : API;

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title })
      });

      setTitle("");
      setEditId(null);
      getTodos();
    } catch (error) {
      console.log("Save Error:", error);
    }
  };

  
  const editTodo = (todo) => {
    setTitle(todo.title);
    setEditId(todo._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  
  const deleteTodo = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await fetch(`${API}/${id}`, {
        method: "DELETE"
      });

      getTodos();
    } catch (error) {
      console.log("Delete Error:", error);
    }
  };

  
  const completeTodo = async (todo) => {
    try {
      await fetch(`${API}/${todo._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: todo.title,
          completed: !todo.completed
        })
      });

      getTodos();
    } catch (error) {
      console.log("Update Error:", error);
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
  const completed = todos.filter(
    (todo) => todo.completed
  ).length;

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
    year: "numeric"
  });

  return (
    <div className="app-layout">

      {}
      <aside className="sidebar">

        <h2 className="logo">
          TaskFlow<span>.</span>
        </h2>

        <p className="menu-title">MENU</p>

        {}
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

        {}
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

        {}
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

        {}
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

        {}
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">T</div>

            <div>
              <strong>My Workspace</strong>
              <small>Personal Account</small>
            </div>
          </div>
        </div>

      </aside>

      {}
      <main className="main-content">

        {}
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

        {}
        {activePage === "weather" ? (

          <Weather />

        ) : (

          
          <>

            {}
            <section className="welcome">

              <div>
                <h1>Welcome Back! 👋</h1>
                <p>
                  Stay organized and get things done today.
                </p>
              </div>

              <div className="welcome-icon">✓</div>

            </section>

            {}
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

            {}
            <section className="task-section">

              <div className="section-heading">

                <div>
                  <h2>My Tasks</h2>
                  <p>
                    Create and manage your daily activities.
                  </p>
                </div>

                <span className="task-count">
                  {filteredTodos.length} Tasks
                </span>

              </div>

            {}
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

              {}
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

              {}
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

                      {}
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

                      {}
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

                      {}
                      <div className="task-actions">

                        <button
                          onClick={() => editTodo(todo)}
                        >
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

        {}
        <footer>
          2026 TaskFlow. All rights reserved.
        </footer>

      </main>

    </div>
  );
}

export default App;
