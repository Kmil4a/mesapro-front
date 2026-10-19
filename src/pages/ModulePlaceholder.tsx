import { Construction } from "lucide-react";

interface Props {
  title: string;
}

export function ModulePlaceholder({ title }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>

      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
        <Construction size={40} className="mb-4 text-indigo-500" />

        <h3 className="text-lg font-semibold">Módulo en desarrollo</h3>

        <p className="mt-2 max-w-md text-sm text-slate-500">
          La navegación está preparada. Próximamente se integrarán las
          funcionalidades de este módulo con la API del backend.
        </p>
      </div>
    </div>
  );
}
