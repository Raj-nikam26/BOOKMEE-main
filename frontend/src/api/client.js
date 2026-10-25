import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Three kinds of account, each with its own token:
// admin panel, customer (marketplace + booking pages), and business (everything else).
const tokenKeyFor = (url = "") => {
  if (url.startsWith("/admin")) return "adminToken";
  if (url.startsWith("/customer") || url.startsWith("/public")) {
    return "customerToken";
  }
  return "token";
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKeyFor(config.url));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default client;
