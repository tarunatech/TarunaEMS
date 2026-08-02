# Deployment Guide for Employee Management System

This guide details how to deploy the **Backend** to **Render** and the **Frontend** to **Netlify**.

## Prerequisites
- A GitHub repository containing this project (both `backend` and `frontend` folders).
- Accounts on [Render](https://render.com/) and [Netlify](https://netlify.com/).
- A MongoDB Atlas database (or another MongoDB provider).

---

## Part 1: Deploying the Backend to Render

1.  **Create a Web Service:**
    - Log in to your Render dashboard.
    - Click **New +** and select **Web Service**.
    - Connect your GitHub repository.

2.  **Configure the Service:**
    - **Name:** Choose a name (e.g., `ems-backend`).
    - **Root Directory:** `backend` (Important! This tells Render to run commands inside the backend folder).
    - **Runtime:** `Node`
    - **Build Command:** `npm install`
    - **Start Command:** `npm start`

3.  **Environment Variables:**
    - Scroll down to the **Environment Variables** section and add the following keys and values:

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `NODE_ENV` | `production` | Optimization for production. |
    | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string. |
    | `JWT_SECRET` | `your_super_secret_key` | A long random string for securing tokens. |
    | `JWT_EXPIRE` | `30d` | Token expiration time (optional). |
    | `EMAIL_FROM` | `your_email@gmail.com` | Email address for sending notifications. |
    | `EMAIL_PASSWORD` | `your_app_password` | App password (not login password) for the email. |

    *Note: Render automatically sets the `PORT` variable, so you don't need to add it manually.*

4.  **Deploy:**
    - Click **Create Web Service**.
    - Wait for the deployment to finish. You will see a green "Live" badge.
    - **Copy the Backend URL:** It will look like `https://ems-backend.onrender.com`. You will need this for the frontend.

---

## Part 2: Deploying the Frontend to Netlify

1.  **Create a New Site:**
    - Log in to your Netlify dashboard.
    - Click **Add new site** > **Import from existing project**.
    - Select **GitHub** and authorize if needed.
    - Pick the same repository.

2.  **Configure the Build:**
    - **Base directory:** `frontend`
    - **Build command:** `npm run build`
    - **Publish directory:** `dist` (Since the base directory is already `frontend`, we just need `dist` relative to it).

3.  **Environment Variables:**
    - Click on **Show advanced** or go to **Site settings > Environment variables** after creation.
    - Add the following variable:

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `VITE_API_URL` | `https://ems-backend.onrender.com/api` | **Crucial:** Paste your Render Backend URL here and append `/api` at the end. |

4.  **Deploy:**
    - Click **Deploy site**.
    - Netlify will build your frontend.
    - Once done, you will get a URL like `https://your-site-name.netlify.app`.

---

## Part 3: Final Configuration

1.  **Update Backend CORS (Optional but Recommended):**
    - Go back to your `backend/server.js` (locally) or check your CORS settings.
    - Currently, `cors({ origin: true })` allows all origins, which works but is less secure.
    - For better security, you can update `backend/server.js` to allow only your Netlify domain:
      ```javascript
      app.use(cors({
        origin: ["https://your-site-name.netlify.app", "http://localhost:5173"],
        credentials: true
      }));
      ```
    - If you change this code, push it to GitHub, and Render will auto-deploy.

2.  **Test the Application:**
    - Open your Netlify URL.
    - Try to log in.
    - Check the browser console (F12) if you face issues. ensure requests are going to `onrender.com` and not `localhost`.

## Troubleshooting

- **"Connection Refused"**: Check if `VITE_API_URL` is correct in Netlify. It must not have a trailing slash if your code appends one, or vice versa. Your code uses `baseURL: BASE_URL`, so `https://.../api` is correct.
- **MongoDB Connection Error**: Check IP Whitelist in MongoDB Atlas. Allow access from anywhere (`0.0.0.0/0`) since Render IPs change.
- **Page Not Found (404) on Refresh**: Ensure `netlify.toml` is present in the `frontend` folder with the redirect rules.

