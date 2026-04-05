const SUPABASE_TABLES = Object.freeze({
  USERS: "users",
  TASKS: "tasks",
});

function toIdString(value) {
  return String(value);
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateOnlyString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split("T")[0];
}

function mapUserRowToModel(row) {
  return {
    _id: toIdString(row.id),
    id: toIdString(row.id),
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function mapTaskRowToModel(row) {
  return {
    _id: toIdString(row.id),
    id: toIdString(row.id),
    userId: toIdString(row.user_id),
    title: row.title,
    description: row.description || "",
    completed: Boolean(row.completed),
    dueDate: toDateValue(row.due_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTaskInputToRow(userId, taskData) {
  return {
    user_id: userId,
    title: String(taskData.title || "").trim(),
    description: String(taskData.description || "").trim(),
    completed: Boolean(taskData.completed),
    due_date: taskData.dueDate ? toDateOnlyString(taskData.dueDate) : null,
  };
}

module.exports = {
  SUPABASE_TABLES,
  mapUserRowToModel,
  mapTaskRowToModel,
  mapTaskInputToRow,
};
