import { apiRequest } from "../../api/client";

export interface AssistantReply {
  text: string;
  actions: Array<{ label: string; href: string }>;
  suggestions: string[];
  orderId?: string;
  source: "manual" | "live";
  checkedAt: string;
  mode?: "gemini" | "basic";
  notice?: string;
}

export const assistantApi = {
  message: (body: { message: string; locationId: string; orderId?: string; page: string; history?: Array<{ role: "user" | "assistant"; text: string }> }, signal: AbortSignal) =>
    apiRequest<AssistantReply>("/assistant/messages", { method: "POST", body: JSON.stringify(body), signal }),
};
