# Homework 10: Todo List App

A small Express + Handlebars task manager that uses a database factory pattern to switch between MongoDB and Supabase at startup.

## Features

- Server-rendered UI with Handlebars (`.hbs` templates)
- Todo CRUD (create, read, update, delete)
- Optional auth implemented (register/login/logout with session)
- Todos are scoped to the logged-in user
- Database provider can be switched with an environment variable

## Tech Stack

- Backend: Node.js + Express
- View Engine: express-handlebars
- Databases:
  - NoSQL: MongoDB Atlas (via Mongoose)
  - Relational: Supabase PostgreSQL
- Environment management: dotenv
- Session auth: express-session

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file in the project root.

You can use either `DB_TYPE` (assignment style) or `DB_PROVIDER` (also supported by this app).

### Example `.env`

```env
PORT=3000
DB_TYPE=mongodb # or supabase

# MongoDB Variables
MONGO_URI=your_mongodb_connection_string

# Supabase Variables
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Session
SESSION_SECRET=your-secret-session-key
```

### Supabase Notes

Before running with Supabase, execute:

- `lib/database/supabase/schema.sql`

Accepted Supabase keys are:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_KEY`
- `SUPABASE_ANON_KEY`

## Run

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Then open `http://localhost:3000`.

## Project Structure

```text
app.js
lib/
  database/
    DatabaseProvider.js
    MongoDBProvider.js
    SupabaseProvider.js
    createDatabaseProvider.js
    models/
      mongoModels.js
      supabaseModels.js
    supabase/
      schema.sql
views/
  layouts/
    main.hbs
  partials/
    header.hbs
    footer.hbs
  index.hbs
  dashboard.hbs
  task.hbs
  login.hbs
  register.hbs
  error.hbs
```

## Routes

- `GET /` - Landing page
- `GET /dashboard` - Authenticated task list
- `POST /dashboard` - Create task
- `GET /task/:id` - Task detail/edit page
- `POST /task/:id/update` - Update title/description/due date/completed
- `POST /task/:id/delete` - Delete task
- `GET /register` - Registration page
- `POST /register` - Register user
- `GET /login` - Login page
- `POST /login` - Login user
- `POST /logout` - Logout user
