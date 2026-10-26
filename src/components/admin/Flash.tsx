export function Flash({ ok, e }: { ok?: string; e?: string }) {
  if (!ok && !e) return null;
  return (
    <p
      role={e ? "alert" : "status"}
      className={`mb-6 rounded-xl border p-3 text-sm ${
        e ? "border-danger/40 bg-danger/10 text-danger" : "border-emerald/40 bg-emerald/10 text-emerald"
      }`}
    >
      {e || ok}
    </p>
  );
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold">{children}</h1>
      {action}
    </div>
  );
}

export const statusCls = {
  PENDING: "border-gold/40 bg-gold/10 text-gold",
  APPROVED: "border-emerald/40 bg-emerald/10 text-emerald",
  REJECTED: "border-danger/40 bg-danger/10 text-danger",
};

export const statusLabel = { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado" };

export type Search = Promise<Record<string, string | undefined>>;
