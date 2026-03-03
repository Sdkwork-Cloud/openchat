export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
export const MODE = import.meta.env.MODE;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_APP_API_BASE_URL ||
  "http://localhost:3000";

export const SDK_ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN || "";
