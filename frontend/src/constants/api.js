const getBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.port === "5173") {
      return "http://localhost:8000/api/v1";
    }
    return `${window.location.origin}/api/v1`;
  }
  return "http://localhost:8000/api/v1";
};

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.port === "5173") {
      return "ws://localhost:8000/api/v1/chat/ws";
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/v1/chat/ws`;
  }
  return "ws://localhost:8000/api/v1/chat/ws";
};

export const API_URL = getBackendUrl();
export const WS_URL = getWsUrl();
