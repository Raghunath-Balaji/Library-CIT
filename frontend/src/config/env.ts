// Frontend Configuration & Environment Extension
export const APP_CONFIG = {
  // Toggle between local mock JSON data and the live FastAPI backend
  USE_MOCK_DATA: true,
  BACKEND_URL: "http://10.0.2.2:8000/api", // Standard Android emulator localhost; use actual LAN IP on real devices
  FALLBACK_LOCAL_URL: "http://localhost:8000/api",
  DEFAULT_MAX_SHELVES: 10,
  DEFAULT_MAX_BOOKS_PER_SHELF: 50,
  INITIAL_CATEGORIES: [
    "Computer Science",
    "Electronics",
    "Physics",
    "Mechanical Engineering",
    "Civil Engineering"
  ]
};
