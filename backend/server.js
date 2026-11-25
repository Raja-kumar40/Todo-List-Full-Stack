const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");
const passport = require("./config/passport");
const socialAuthRoutes = require("./routes/socialAuthRoutes");

const app = express();

// ==================== MIDDLEWARE ====================

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

app.use(express.json());

// Passport initialize
app.use(passport.initialize());

// Social login routes
app.use("/auth", socialAuthRoutes);

// ==================== TODO MODEL ====================

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    completed: {
      type: Boolean,
      default: false
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Todo = mongoose.model("Todo", todoSchema);

// ==================== AUTH MIDDLEWARE ====================

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Please login first"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

// ==================== HOME ROUTE ====================

app.get("/", (req, res) => {
  res.json({
    message: "Todo List API is running successfully"
  });
});

// ==================== SIGNUP API ====================

app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Signup failed",
      error: error.message
    });
  }
});

// ==================== LOGIN API ====================

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});

// ==================== GET PROFILE ====================

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch profile"
    });
  }
});

// ==================== CREATE TODO ====================

app.post("/todos", authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required"
      });
    }

    const todo = await Todo.create({
      title: title.trim(),
      userId: req.userId
    });

    res.status(201).json({
      message: "Todo Created Successfully",
      todo
    });
  } catch (error) {
    res.status(500).json({
      message: "Error Creating Todo",
      error: error.message
    });
  }
});

// ==================== GET ALL TODOS ====================

app.get("/todos", authMiddleware, async (req, res) => {
  try {
    const todos = await Todo.find({
      userId: req.userId
    }).sort({
      createdAt: -1
    });

    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({
      message: "Error Fetching Todos",
      error: error.message
    });
  }
});

// ==================== GET SINGLE TODO ====================

app.get("/todos/:id", authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!todo) {
      return res.status(404).json({
        message: "Todo Not Found"
      });
    }

    res.status(200).json(todo);
  } catch (error) {
    res.status(400).json({
      message: "Invalid Todo ID",
      error: error.message
    });
  }
});

// ==================== UPDATE TODO ====================

app.put("/todos/:id", authMiddleware, async (req, res) => {
  try {
    const { title, completed } = req.body;

    const updateData = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Valid task title is required"
        });
      }

      updateData.title = title.trim();
    }

    if (completed !== undefined) {
      if (typeof completed !== "boolean") {
        return res.status(400).json({
          message: "Completed must be true or false"
        });
      }

      updateData.completed = completed;
    }

    const todo = await Todo.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId
      },
      {
        $set: updateData
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!todo) {
      return res.status(404).json({
        message: "Todo Not Found"
      });
    }

    res.status(200).json({
      message: "Todo Updated Successfully",
      todo
    });
  } catch (error) {
    res.status(400).json({
      message: "Error Updating Todo",
      error: error.message
    });
  }
});

// ==================== DELETE TODO ====================

app.delete("/todos/:id", authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!todo) {
      return res.status(404).json({
        message: "Todo Not Found"
      });
    }

    res.status(200).json({
      message: "Todo Deleted Successfully"
    });
  } catch (error) {
    res.status(400).json({
      message: "Error Deleting Todo",
      error: error.message
    });
  }
});

// ==================== 404 ROUTE ====================

app.use((req, res) => {
  res.status(404).json({
    message: "API Route Not Found"
  });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Failed:", error.message);
    process.exit(1);
  });