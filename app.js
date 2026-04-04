/* eslint-disable no-undef */
const express = require("express");
const path = require("node:path");
const { engine } = require("express-handlebars");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.engine(
  "hbs",
  engine({
    defaultLayout: "main",
    extname: "hbs",
    partialsDir: path.join(__dirname, "views", "partials"),
  }),
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index", { pageTitle: "Home Page" });
});

app.use((req, res) => {
  res.status(404).render("error", { pageTitle: "Page Not Found" });
});

app.use((err, req, res) => {
  console.error("Internal Server Error:", err);
  res.status(500).render("error", { pageTitle: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
