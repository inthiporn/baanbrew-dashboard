export default function ChartCard({ title, subtitle, legend, children }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(28,19,14,0.06),0_8px_24px_-12px_rgba(28,19,14,0.18)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-base font-semibold text-roast-950">{title}</h2>
          {subtitle && <p className="text-sm text-roast-400">{subtitle}</p>}
        </div>
        {legend}
      </div>
      <div className="mt-4 h-64 sm:h-72">{children}</div>
    </section>
  )
}
