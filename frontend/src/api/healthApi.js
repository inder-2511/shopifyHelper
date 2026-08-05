import api from "./axios.js";

export const pingBackend = async () => {
  const start = performance.now();
  const response = await api.get("/");
  return {
    status: response.status,
    body: response.data,
    latencyMs: Math.round(performance.now() - start),
  };
};
