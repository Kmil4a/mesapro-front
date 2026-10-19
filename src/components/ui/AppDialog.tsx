import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AlertTriangle, CircleHelp, X } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type InputOptions = ConfirmOptions & {
  label: string;
  initialValue?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
};

type DialogState =
  | (ConfirmOptions & { kind: "confirm"; resolve: (value: boolean) => void })
  | (InputOptions & { kind: "input"; resolve: (value: string | null) => void });

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  input: (options: InputOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setValue("");
      setDialog({ kind: "confirm", ...options, resolve });
    });
  }, []);

  const input = useCallback((options: InputOptions) => {
    return new Promise<string | null>((resolve) => {
      setValue(options.initialValue ?? "");
      setDialog({ kind: "input", ...options, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean | string | null) => {
      if (!dialog) return;
      if (dialog.kind === "confirm") dialog.resolve(Boolean(result));
      else dialog.resolve(typeof result === "string" ? result : null);
      setDialog(null);
    },
    [dialog],
  );

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, close]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    if (dialog.kind === "confirm") close(true);
    else if (!dialog.required || value.trim()) close(value);
  }

  return (
    <DialogContext.Provider value={{ confirm, input }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(null);
          }}
        >
          <form
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby="app-dialog-description"
            onSubmit={submit}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
          >
            <div className="flex items-start gap-4 p-6 pb-4">
              <div
                className={`rounded-xl p-3 ${dialog.tone === "danger" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"}`}
              >
                {dialog.tone === "danger" ? (
                  <AlertTriangle size={22} />
                ) : (
                  <CircleHelp size={22} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="app-dialog-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {dialog.title}
                </h2>
                <p
                  id="app-dialog-description"
                  className="mt-1 text-sm leading-6 text-slate-600"
                >
                  {dialog.description}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => close(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            {dialog.kind === "input" && (
              <div className="px-6 pb-5">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dialog.label}
                </label>
                {dialog.multiline ? (
                  <textarea
                    autoFocus
                    rows={4}
                    value={value}
                    required={dialog.required}
                    placeholder={dialog.placeholder}
                    onChange={(event) => setValue(event.target.value)}
                    className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                ) : (
                  <input
                    autoFocus
                    value={value}
                    required={dialog.required}
                    placeholder={dialog.placeholder}
                    onChange={(event) => setValue(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <button
                type="button"
                onClick={() => close(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {dialog.cancelLabel ?? "Cancelar"}
              </button>
              <button
                type="submit"
                disabled={
                  dialog.kind === "input" && !!dialog.required && !value.trim()
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${dialog.tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {dialog.confirmLabel ??
                  (dialog.kind === "input" ? "Guardar" : "Confirmar")}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context)
    throw new Error("useAppDialog debe usarse dentro de AppDialogProvider");
  return context;
}
