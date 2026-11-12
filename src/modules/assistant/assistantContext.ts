import { createContext, useContext } from "react";

export const AssistantContext = createContext<{
  orderId: string | null;
  setOrderId: (id: string | null) => void;
} | null>(null);

export function useAssistantContext() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("El asistente requiere AssistantProvider");
  return context;
}
