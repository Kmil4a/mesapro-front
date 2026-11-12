import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Bot, LoaderCircle, MessageCircle, Send, Trash2, X } from "lucide-react";
import { useLocation as useRouteLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { hasModuleAccess } from "../../auth/moduleAccess";
import { useLocation } from "../../context/LocationContext";
import { assistantApi, type AssistantReply } from "./assistant.api";
import { useAssistantContext } from "./assistantContext";

interface ChatMessage { id: string; role: "user" | "assistant"; text: string; reply?: AssistantReply }
const welcome: ChatMessage = {
  id: "welcome", role: "assistant",
  text: "Hola, soy el asistente de MesaPro. Te ayudo con los pasos de atención y consulto pedidos de tu sucursal. Abre un pedido para preguntarme qué falta para completarlo.",
};

export function AssistantWidget() {
  const { user } = useAuth();
  const { locationId, locations } = useLocation();
  const { orderId } = useAssistantContext();
  const route = useRouteLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastOrderId, setLastOrderId] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const lastQuery = useRef("");
  const lastReply = [...messages].reverse().find(message => message.reply)?.reply;
  const contextualOrder = orderId ?? lastOrderId;
  const pageSuggestions: Record<string, string[]> = {
    "/caja": ["¿Cómo funciona el efectivo en caja?", "¿Cómo hago una venta para llevar?", "Buscar un pedido por código o cliente"],
    "/mesas": ["¿Cómo creo un pedido de mesa?", "¿Qué pedidos tengo pendientes de entrega?", "Buscar un pedido por código o cliente"],
    "/productos": ["¿Por qué no aparece un producto?", "¿Las cantidades pueden ser decimales?", "¿Cómo hago una venta para llevar?"],
    "/reportes": ["¿Dónde reviso las ventas?", "¿Qué pedidos están pendientes de entrega?", "Buscar un pedido por código o cliente"],
  };
  const suggestions = contextualOrder
    ? ["¿Qué falta para completar este pedido?", "¿Cómo reimprimo el vale de este pedido?", "¿Qué pedidos están pendientes de entrega?"]
    : pageSuggestions[route.pathname] ?? lastReply?.suggestions ?? (user?.role === "WAITER"
      ? ["¿Cómo creo un pedido de mesa?", "¿Qué pedidos tengo pendientes de entrega?", "Buscar un pedido por código o cliente"]
      : ["¿Cómo hago una venta para llevar?", "¿Qué pedidos están pendientes de entrega?", "Buscar un pedido por código o cliente"]);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  function close() { setOpen(false); triggerRef.current?.focus(); }

  async function send(message: string, retry = false) {
    const text = message.trim();
    if (!text || busy || !locationId) return;
    const previous = messages.filter(entry => entry.id !== "welcome");
    if (retry && previous.at(-1)?.role === "user" && previous.at(-1)?.text === text) previous.pop();
    const history = previous.slice(-8).map(entry => ({ role: entry.role, text: entry.text.slice(0, 2500) }));
    const controller = new AbortController();
    requestRef.current = controller;
    lastQuery.current = text;
    if (!retry) setMessages(current => [...current, { id: crypto.randomUUID(), role: "user" as const, text }].slice(-40));
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const reply = await assistantApi.message({ message: text, locationId, page: route.pathname, history, ...(contextualOrder ? { orderId: contextualOrder } : {}) }, controller.signal);
      if (controller.signal.aborted) return;
      setLastOrderId(reply.orderId);
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant" as const, text: reply.text, reply }].slice(-40));
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No pude consultar el asistente. Inténtalo nuevamente.");
    } finally {
      if (!controller.signal.aborted) { setBusy(false); inputRef.current?.focus(); }
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(draft); }
  function clear() { setMessages([welcome]); setLastOrderId(undefined); setError(""); setDraft(""); inputRef.current?.focus(); }

  if (!user || user.role === "KITCHEN") return null;
  return (
    <>
      {open && (
        <section role="dialog" aria-modal="false" aria-labelledby="assistant-title" onKeyDown={event => { if (event.key === "Escape") close(); }}
          className="fixed bottom-24 right-3 z-40 flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-6 sm:w-[420px]">
          <header className="flex shrink-0 items-center gap-3 bg-indigo-600 px-4 py-3 text-white">
            <Bot size={23} />
            <div className="min-w-0 flex-1"><h2 id="assistant-title" className="font-semibold">Asistente MesaPro</h2><p className="truncate text-xs text-indigo-100">{locations.find(location => location.id === locationId)?.name ?? "Selecciona una sucursal"}</p></div>
            <button type="button" onClick={clear} disabled={busy} title="Limpiar conversación" aria-label="Limpiar conversación" className="rounded-lg p-2 hover:bg-indigo-500 disabled:opacity-50"><Trash2 size={17} /></button>
            <button type="button" onClick={close} aria-label="Cerrar asistente" className="rounded-lg p-2 hover:bg-indigo-500"><X size={20} /></button>
          </header>
          <div className="shrink-0 border-b bg-slate-50 px-4 py-2 text-xs text-slate-600">
            {lastReply?.mode === "gemini" ? "Gemini · " : lastReply?.mode === "basic" ? "Modo básico · " : "Asistente de pedidos · "} {contextualOrder ? `Pedido #${contextualOrder.slice(-6).toUpperCase()}` : "Sin pedido seleccionado"}
          </div>
          <div ref={logRef} role="log" aria-label="Conversación con el asistente" aria-live="polite" aria-relevant="additions" className="min-h-32 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map(message => (
              <div key={message.id} className={message.role === "user" ? "ml-8 rounded-2xl rounded-br-sm bg-indigo-600 p-3 text-sm text-white" : "mr-3 rounded-2xl rounded-bl-sm bg-slate-100 p-3 text-sm text-slate-800"}>
                <p className="mb-1 text-[11px] font-semibold opacity-70">{message.role === "user" ? "Tú" : "MesaPro"}</p>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                {message.reply?.notice && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{message.reply.notice}</p>}
                {message.reply && <>
                  {message.reply.actions.filter(action => hasModuleAccess(action.href.split("?")[0], user.role)).length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                    {message.reply.actions.filter(action => hasModuleAccess(action.href.split("?")[0], user.role)).map(action => (
                      <button type="button" key={`${action.label}:${action.href}`} onClick={() => { navigate(action.href); close(); }} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50">{action.label}<ArrowUpRight size={13} /></button>
                    ))}
                  </div>}
                  <p className="mt-2 text-[10px] text-slate-500">{message.reply.mode === "gemini" ? "IA Gemini · " : ""}{message.reply.source === "live" ? `Datos consultados a las ${new Date(message.reply.checkedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}. Consulta nuevamente para actualizar.` : "Guía de uso de MesaPro"}</p>
                </>}
              </div>
            ))}
            {busy && <p role="status" className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={15} className="animate-spin" />Consultando…</p>}
          </div>
          <div className="shrink-0 border-t px-4 pt-3">
            <div className="flex flex-wrap gap-1.5">{suggestions.slice(0, 3).map(suggestion => <button type="button" key={suggestion} disabled={busy || !locationId} onClick={() => void send(suggestion)} className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1.5 text-left text-xs text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">{suggestion}</button>)}</div>
            {error && <div role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}<button type="button" className="ml-2 font-semibold underline" disabled={busy} onClick={() => void send(lastQuery.current, true)}>Reintentar</button></div>}
            {!locationId && <p className="mt-2 text-xs text-amber-800">Selecciona una sucursal para utilizar el asistente.</p>}
            <form onSubmit={submit} className="my-3 flex items-center gap-2">
              <label htmlFor="assistant-message" className="sr-only">Mensaje al asistente</label>
              <input ref={inputRef} id="assistant-message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} disabled={busy || !locationId} autoComplete="off" placeholder="Pregunta o escribe un código de retiro…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50" />
              <button type="submit" disabled={busy || !locationId || !draft.trim()} aria-label="Enviar mensaje" className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 disabled:opacity-40"><Send size={18} /></button>
            </form>
          </div>
        </section>
      )}
      <button ref={triggerRef} type="button" onClick={() => setOpen(current => !current)} aria-label={open ? "Cerrar asistente MesaPro" : "Abrir asistente MesaPro"} aria-expanded={open} className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3.5 font-medium text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 sm:right-6">
        {open ? <X size={21} /> : <MessageCircle size={21} />}<span className="text-sm">Asistente</span>
      </button>
    </>
  );
}
