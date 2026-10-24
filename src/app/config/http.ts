import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_API;

const http = axios.create({
  baseURL: BASE_URL,
});

export { http };
