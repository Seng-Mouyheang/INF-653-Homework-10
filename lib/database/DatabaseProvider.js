class DatabaseProvider {
  constructor() {
    this.providerKey = null;
    this.providerLabel = null;
  }

  // ===== USER AUTHENTICATION =====
  async registerUser(email, password) {
    throw new Error("registerUser must be implemented");
  }

  async findUserByEmail(email) {
    throw new Error("findUserByEmail must be implemented");
  }

  async verifyPassword(password, hash) {
    throw new Error("verifyPassword must be implemented");
  }

  // ===== TASKS =====
  async createTask(userId, taskData) {
    throw new Error("createTask must be implemented");
  }

  async getUserTasks(userId) {
    throw new Error("getUserTasks must be implemented");
  }

  async getTaskById(taskId, userId) {
    throw new Error("getTaskById must be implemented");
  }

  async updateTask(taskId, userId, taskData) {
    throw new Error("updateTask must be implemented");
  }

  async deleteTask(taskId, userId) {
    throw new Error("deleteTask must be implemented");
  }
}

module.exports = DatabaseProvider;
