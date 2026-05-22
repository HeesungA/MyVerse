import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function apiClient(creatorId?: string) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
      ...(creatorId ? { "creator-id": creatorId } : {}),
    },
  });
}

export const publicApi = axios.create({ baseURL: API_URL });
