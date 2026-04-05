const bcryptjs = require("bcryptjs");
const mongoose = require("mongoose");
const DatabaseProvider = require("./DatabaseProvider");
const { User, Task } = require("./models/mongoModels");

class MongoDBProvider extends DatabaseProvider {
  constructor() {
    super();
    this.providerKey = "mongodb";
    this.providerLabel = "MongoDB Atlas";
    this.connection = null;
  }

  async connect() {
    // eslint-disable-next-line no-undef
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("Missing required environment variable: MONGO_URI");
    }

    try {
      this.connection = await mongoose.connect(uri, {
        dbName: "todo_list",
      });

      // Mongoose creates collections from models on first use.
      await this.initializeDatabase();
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  async initializeDatabase() {
    await Promise.all([User.init(), Task.init()]);
  }

  // ===== USER AUTHENTICATION =====
  async registerUser(email, password) {
    const normalizedEmail = String(email).trim().toLowerCase(); // Normalize email to prevent duplicates

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    try {
      const user = await User.create({
        email: normalizedEmail,
        passwordHash,
      });

      return {
        _id: String(user._id),
        email: user.email,
      };
    } catch (error) {
      if (error?.code === 11000) {
        throw new Error("Email already exists", { cause: error });
      }
      throw error;
    }
  }

  async findUserByEmail(email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).lean();
    if (!user) {
      return null;
    }

    return {
      ...user,
      _id: String(user._id),
    };
  }

  async verifyPassword(password, hash) {
    return await bcryptjs.compare(password, hash);
  }

  // ===== TASKS =====
  async createTask(userId, taskData) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const title = String(taskData?.title || "").trim();
    if (!title) {
      throw new Error("Task title is required");
    }

    const task = await Task.create({
      userId,
      title,
      description: String(taskData?.description || "").trim(),
      completed: Boolean(taskData?.completed),
      dueDate: taskData?.dueDate || null,
    });

    return this.mapTask(task);
  }

  async getUserTasks(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return [];
    }

    const tasks = await Task.find({ userId }).sort({ createdAt: -1 }).lean();
    return tasks.map((task) => this.mapTask(task));
  }

  async getTaskById(taskId, userId) {
    if (
      !mongoose.Types.ObjectId.isValid(taskId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return null;
    }

    const task = await Task.findOne({ _id: taskId, userId }).lean();
    if (!task) {
      return null;
    }

    return this.mapTask(task);
  }

  async updateTask(taskId, userId, taskData) {
    if (
      !mongoose.Types.ObjectId.isValid(taskId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return null;
    }

    const update = {};
    if (typeof taskData?.title === "string") {
      const title = taskData.title.trim();
      if (!title) {
        throw new Error("Task title is required");
      }
      update.title = title;
    }
    if (typeof taskData?.description === "string") {
      update.description = taskData.description.trim();
    }
    if (typeof taskData?.completed === "boolean") {
      update.completed = taskData.completed;
    }
    if (Object.hasOwn(taskData || {}, "dueDate")) {
      update.dueDate = taskData.dueDate || null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { $set: update }, // Use $set to only update specified fields
      { returnDocument: "after" }, // Return the updated document
    ).lean();

    return task ? this.mapTask(task) : null;
  }

  async deleteTask(taskId, userId) {
    if (
      !mongoose.Types.ObjectId.isValid(taskId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return false;
    }

    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      userId,
    }).lean();
    return !!deletedTask; // Return true if a task was deleted, false otherwise
  }

  // Helper method to help map MongoDB documents to our task model
  mapTask(task) {
    return {
      _id: String(task._id),
      id: String(task._id),
      userId: String(task.userId),
      title: task.title,
      description: task.description || "",
      completed: Boolean(task.completed),
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}

module.exports = MongoDBProvider;
