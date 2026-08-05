// src/api/index.js
import axios from 'axios';

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '') ||
    'https://face-votd.onrender.com/api'
});

export default API;
