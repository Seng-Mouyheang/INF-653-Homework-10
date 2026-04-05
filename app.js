/* eslint-disable no-undef */
const express = require("express");
const path = require("node:path");
const { engine } = require("express-handlebars");
const session = require("express-session");
const fs = require("node:fs");
const dotenv = require("dotenv");
const createDatabaseProvider = require("./lib/database/createDatabaseProvider");

const dotenvPaths = [
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
];

for (const dotenvPath of dotenvPaths) {
  if (fs.existsSync(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
    break;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const sessionSecret =
  process.env.SESSION_SECRET || "ra0WVSslCXaiKqTfIaEBNN8VWJ";

app.disable("x-powered-by");

let dbProvider;

app.engine(
  "hbs",
  engine({
    defaultLayout: "main",
    extname: "hbs",
    partialsDir: path.join(__dirname, "views", "partials"),
    helpers: {
      formatDate(date) {
        if (!date) {
          return "";
        }

        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
          return "";
        }

        return d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
      formatDateInput(date) {
        if (!date) {
          return "";
        }

        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
          return "";
        }

        return d.toISOString().split("T")[0];
      },
    },
  }),
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isLoggedIn = !!req.session.user;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

app.get("/", (req, res) => {
  res.render("index", { pageTitle: "Home Page" });
});

app.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const tasks = req.session.user
      ? await dbProvider.getUserTasks(req.session.user.id)
      : [];
    const errorMessage =
      typeof req.query.error === "string" ? req.query.error : "";
    const statusMessage =
      typeof req.query.status === "string" ? req.query.status : "";

    res.render("dashboard", {
      pageTitle: "Dashboard",
      title: req.session.user ? "My Tasks" : "Task Manager",
      tasks,
      hasTasks: tasks.length > 0,
      errorMessage,
      statusMessage,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/task/:id", requireAuth, async (req, res, next) => {
  try {
    const task = await dbProvider.getTaskById(
      req.params.id,
      req.session.user.id,
    );
    if (!task) {
      return res.status(404).render("error", {
        pageTitle: "Task Not Found",
        errorMessage: "Task not found",
        statusCode: 404,
      });
    }
    const errorMessage =
      typeof req.query.error === "string" ? req.query.error : "";

    res.render("task", {
      pageTitle: `Task: ${task.title}`,
      title: task.title,
      task,
      errorMessage,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/register", (req, res) => {
  const errorMessage =
    typeof req.query.error === "string" ? req.query.error : "";
  res.render("register", { pageTitle: "Register", errorMessage });
});

app.post("/register", async (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password) {
      return res.redirect(
        "/register?error=Email%20and%20password%20are%20required",
      );
    }

    if (password !== confirmPassword) {
      return res.redirect("/register?error=Passwords%20do%20not%20match");
    }

    if (password.length < 6) {
      return res.redirect(
        "/register?error=Password%20must%20be%20at%20least%206%20characters",
      );
    }

    // Try to register
    const user = await dbProvider.registerUser(email, password);
    req.session.user = { id: user._id || user.id, email: user.email };

    res.redirect("/dashboard");
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : "";
    if (message.includes("already exists")) {
      res.redirect("/register?error=Email%20already%20registered");
    } else {
      next(error);
    }
  }
});

app.get("/login", (req, res) => {
  const errorMessage =
    typeof req.query.error === "string" ? req.query.error : "";
  res.render("login", { pageTitle: "Login", errorMessage });
});

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.redirect(
        "/login?error=Email%20and%20password%20are%20required",
      );
    }

    const user = await dbProvider.findUserByEmail(email);
    if (!user) {
      return res.redirect("/login?error=Email%20or%20password%20incorrect");
    }

    const isValid = await dbProvider.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isValid) {
      return res.redirect("/login?error=Email%20or%20password%20incorrect");
    }

    req.session.user = { id: user._id || user.id, email: user.email };
    res.redirect("/dashboard");
  } catch (error) {
    next(error);
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/?error=Failed%20to%20logout");
    }
    res.redirect("/");
  });
});

app.post("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const { title, description, dueDate } = req.body;

    if (!title || !String(title).trim()) {
      return res.redirect("/dashboard?error=Task%20title%20is%20required");
    }

    const normalizedDueDate = dueDate ? new Date(dueDate) : null;
    if (normalizedDueDate && Number.isNaN(normalizedDueDate.getTime())) {
      return res.redirect("/dashboard?error=Due%20date%20is%20invalid");
    }

    await dbProvider.createTask(req.session.user.id, {
      title,
      description,
      dueDate: normalizedDueDate,
      completed: false,
    });

    res.redirect("/dashboard?status=Task%20created%20successfully");
  } catch (error) {
    next(error);
  }
});

app.post("/task/:id/update", requireAuth, async (req, res, next) => {
  try {
    const { title, description, dueDate, completed } = req.body;
    const normalizedDueDate = dueDate ? new Date(dueDate) : null;

    if (!title || !String(title).trim()) {
      return res.redirect(
        `/task/${req.params.id}?error=Task%20title%20is%20required`,
      );
    }

    if (normalizedDueDate && Number.isNaN(normalizedDueDate.getTime())) {
      return res.redirect(
        `/task/${req.params.id}?error=Due%20date%20is%20invalid`,
      );
    }

    const updatedTask = await dbProvider.updateTask(
      req.params.id,
      req.session.user.id,
      {
        title,
        description,
        completed,
        dueDate: normalizedDueDate,
      },
    );

    if (!updatedTask) {
      return res.status(404).render("error", {
        pageTitle: "Task Not Found",
        errorMessage: "Task not found",
        statusCode: 404,
      });
    }

    res.redirect(`/dashboard?status=Task%20updated%20successfully`);
  } catch (error) {
    next(error);
  }
});

app.post("/task/:id/delete", requireAuth, async (req, res, next) => {
  try {
    const deleted = await dbProvider.deleteTask(
      req.params.id,
      req.session.user.id,
    );
    if (!deleted) {
      return res.status(404).render("error", {
        pageTitle: "Task Not Found",
        errorMessage: "Task not found",
        statusCode: 404,
      });
    }

    res.redirect("/dashboard?status=Task%20deleted%20successfully");
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).render("error", {
    pageTitle: "Page Not Found",
    errorMessage: "The page you are looking for does not exist.",
    statusCode: 404,
  });
});

app.use((err, req, res, next) => {
  if (err?.stack) {
    console.error(err.stack);
  } else if (err?.message) {
    console.error(err.message);
  } else {
    console.error("Unhandled error:", err);
  }

  res.status(500).render("error", {
    errorMessage: err?.message || "An unexpected error occurred",
    pageTitle: "Internal Server Error",
    statusCode: err?.status || 500,
  });
});

async function startServer() {
  try {
    dbProvider = await createDatabaseProvider();
    console.log(`Connected to ${dbProvider.providerLabel} database provider`);

    app.listen(PORT, () => {
      console.log(`Task manager app listening on http://localhost:${PORT}`);
      console.log(`Database provider: ${dbProvider.providerLabel}`);
    });
  } catch (error) {
    if (error?.message) {
      console.error("Failed to initialize database provider:", error.message);
    } else {
      console.error("Failed to initialize database provider:", error);
    }
    process.exit(1);
  }
}

startServer();
