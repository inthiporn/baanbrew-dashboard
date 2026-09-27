export default function KpiCard({ label, value, hint, icon }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(28,19,14,0.06),0_8px_24px_-12px_rgba(28,19,14,0.18)] sm:p-5">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-caramel-soft text-roast-800 sm:size-9">
            {icon}
          </span>
        )}
        <p className="text-xs font-medium text-roast-600 sm:text-sm">{label}</p>
      </div>
      <p className="mt-3 truncate text-xl font-semibold tracking-tight tabular-nums text-roast-950 sm:text-[1.9rem]">
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-roast-400">{hint}</p>}
    </div>
  )
}
