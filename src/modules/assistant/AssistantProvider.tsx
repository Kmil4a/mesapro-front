import { useMemo, useState, type ReactNode } from "react";
import { AssistantContext } from "./assistantContext";

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const value = useMemo(() => ({ orderId, setOrderId }), [orderId]);
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
