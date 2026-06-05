# Neon Database Setup Guide

This guide explains how to create a Neon PostgreSQL database and configure the database connection string for the Mentor Session Booking App.

---

## Step 1: Create a Neon Account

1. Visit https://neon.com
2. Click **Sign Up**.
3. Sign up using GitHub, Google, or Email.
4. Verify your account if required.
5. Log in to the Neon Dashboard.

---

## Step 2: Create a New Neon Project

1. Click **Create Project**.
2. Enter a project name.
3. Select a region closest to your location.
4. Click **Create Project**.

Neon will automatically create a PostgreSQL database for your project.

---

## Step 3: Obtain the Database Connection String

1. Open your Neon project dashboard.
2. Navigate to **Connection Details**.
3. Locate the PostgreSQL connection string.
4. Copy the connection string.

Example:

```env
postgresql://username:password@host/database
```

This connection string will be used by the backend application to communicate with the database.

---

## Step 4: Configure the Local Environment File

Create or open the `.env` file in the backend directory.

Add the copied Neon connection string:

```env
DATABASE_URL=your_neon_connection_string
```

Replace `your_neon_connection_string` with the actual connection string copied from Neon.

For additional environment variables, refer to:

```text
docs/ENV_SETUP.md
```

---

## Step 5: Verify the Configuration

1. Save the `.env` file.
2. Restart the backend server.
3. Ensure the application starts without database connection errors.

If the server starts successfully, the Neon database has been configured correctly.

---

# Troubleshooting

## Database Connection Failed

Possible causes:

* Incorrect `DATABASE_URL`
* Invalid database credentials
* Expired or changed database password
* Neon project is unavailable

Verify the connection string and database status in the Neon Dashboard.

---

## Environment Variables Not Loading

Make sure:

* The file is named `.env`
* The file is located in the correct backend directory
* There are no extra spaces around variable names or values

Example:

```env
DATABASE_URL=postgresql://username:password@host/database
```

---

## Additional Resources

* Neon Documentation: https://neon.com/docs
* PostgreSQL Documentation: https://www.postgresql.org/docs/

Following the above steps should allow contributors to successfully create, configure, and connect a Neon PostgreSQL database for local development.

