/* eslint-disable no-undef */
const bcryptjs = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const DatabaseProvider = require("./DatabaseProvider");
const {
  SUPABASE_TABLES,
  mapUserRowToModel,
  mapTaskRowToModel,
  mapTaskInputToRow,
} = require("../database/models/supabaseModels");

class SupabaseProvider extends DatabaseProvider {
  constructor() {
    super();
    this.providerKey = "supabase";
    this.providerLabel = "Supabase";
    this.supabase = null;
  }

  async connect() {
    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing required environment variables: SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY, SUPABASE_KEY, SUPABASE_ANON_KEY",
      );
    }

    try {
      this.supabase = createClient(url, key);

      // Test connection and initialize database
      await this.initializeDatabase();
      console.log("Connected to Supabase");
    } catch (error) {
      console.error("Supabase connection error:", error);
      throw error;
    }
  }

  normalizeEmail(email) {
    return String(email).trim().toLowerCase();
  }

  toSupabaseId(value) {
    if (typeof value === "number") {
      return value;
    }

    const asString = String(value).trim();
    if (/^\d+$/.test(asString)) {
      return Number(asString);
    }

    return asString;
  }

  toDateOnlyString(value) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().split("T")[0];
  }

  async initializeDatabase() {
    const { data: existingTasks, error: tasksError } = await this.supabase
      .from(SUPABASE_TABLES.TASKS)
      .select("id")
      .limit(1);

    if (tasksError) {
      const message =
        typeof tasksError.message === "string"
          ? tasksError.message
          : "Unable to access Supabase tasks table";
      throw new Error(
        `${message}. Make sure you ran the SQL setup from README.md to create users and tasks tables.`,
      );
    }

    if (!existingTasks || existingTasks.length === 0) {
      return;
    }
  }

  // ===== USER AUTHENTICATION =====
  async registerUser(email, password) {
    const normalizedEmail = this.normalizeEmail(email);

    // Check if email already exists
    const { data: existingUser, error: existingUserError } = await this.supabase
      .from(SUPABASE_TABLES.USERS)
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingUserError && existingUserError.code !== "PGRST116") {
      throw existingUserError;
    }

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    // Insert new user
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.USERS)
      .insert([{ email: normalizedEmail, password_hash: passwordHash }])
      .select("id, email, created_at");

    if (error) {
      throw error;
    }

    return mapUserRowToModel(data[0]);
  }

  async findUserByEmail(email) {
    const normalizedEmail = this.normalizeEmail(email);

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.USERS)
      .select("id, email, password_hash")
      .eq("email", normalizedEmail)
      .single();

    if (error?.code === "PGRST116") {
      return null; // No user found
    }

    if (error) {
      throw error;
    }

    return mapUserRowToModel(data);
  }

  async verifyPassword(password, hash) {
    return await bcryptjs.compare(password, hash);
  }

  // ===== TASKS =====
  async createTask(userId, taskData) {
    const normalizedUserId = this.toSupabaseId(userId);
    const title = String(taskData?.title || "").trim();
    if (!title) {
      throw new Error("Task title is required");
    }

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.TASKS)
      .insert([mapTaskInputToRow(normalizedUserId, taskData)]) // Return the created task
      .select(
        "id, user_id, title, description, completed, due_date, created_at, updated_at",
      ); // Select the fields we need to return the created task

    if (error) {
      throw error;
    }

    return mapTaskRowToModel(data[0]);
  }

  async getUserTasks(userId) {
    const normalizedUserId = this.toSupabaseId(userId);

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.TASKS)
      .select("*")
      .eq("user_id", normalizedUserId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data.map((task) => mapTaskRowToModel(task));
  }

  async getTaskById(taskId, userId) {
    const normalizedTaskId = this.toSupabaseId(taskId);
    const normalizedUserId = this.toSupabaseId(userId);

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.TASKS)
      .select("*")
      .eq("id", normalizedTaskId)
      .eq("user_id", normalizedUserId)
      .single();

    if (error?.code === "PGRST116") {
      return null;
    }

    if (error) {
      throw error;
    }

    return mapTaskRowToModel(data);
  }

  async updateTask(taskId, userId, taskData) {
    const normalizedTaskId = this.toSupabaseId(taskId);
    const normalizedUserId = this.toSupabaseId(userId);
    const title =
      typeof taskData?.title === "string" ? taskData.title.trim() : undefined;

    if (title !== undefined && !title) {
      throw new Error("Task title is required");
    }

    const updates = {};
    if (title !== undefined) {
      updates.title = title;
    }
    if (typeof taskData?.description === "string") {
      updates.description = taskData.description.trim();
    }
    if (typeof taskData?.completed === "boolean") {
      updates.completed = taskData.completed;
    }
    if (Object.hasOwn(taskData || {}, "dueDate")) {
      updates.due_date = this.toDateOnlyString(taskData.dueDate);
    }

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.TASKS)
      .update(updates)
      .eq("id", normalizedTaskId)
      .eq("user_id", normalizedUserId)
      .select(
        "id, user_id, title, description, completed, due_date, created_at, updated_at",
      );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapTaskRowToModel(data[0]);
  }

  async deleteTask(taskId, userId) {
    const normalizedTaskId = this.toSupabaseId(taskId);
    const normalizedUserId = this.toSupabaseId(userId);

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.TASKS)
      .delete()
      .eq("id", normalizedTaskId)
      .eq("user_id", normalizedUserId)
      .select("id");

    if (error) {
      throw error;
    }

    return !!(data && data.length > 0); // Return true if a task was deleted, false otherwise
  }
}

module.exports = SupabaseProvider;
