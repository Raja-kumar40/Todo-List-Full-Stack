
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();


app.use(cors());
app.use(express.json());


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
    }
  },
  {
    timestamps: true
  }
);


const Todo = mongoose.model("Todo", todoSchema);


app.get("/", (req, res) => {
  res.json({
    message: "Todo List API is running successfully"
  });
});


app.post("/todos", async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required"
      });
    }

    const todo = await Todo.create({
      title: title.trim()
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


app.get("/todos", async (req, res) => {
  try {
    const todos = await Todo.find().sort({
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


app.get("/todos/:id", async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

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

app.put("/todos/:id", async (req, res) => {
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

    const todo = await Todo.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
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


app.delete("/todos/:id", async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);

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


app.use((req, res) => {
  res.status(404).json({
    message: "API Route Not Found"
  });
});


const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
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
