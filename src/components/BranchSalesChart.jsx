import { formatBaht, formatPercent } from '../lib/metrics'

// แถบแนวนอนแบบ HTML: อ่านชื่อสาขาภาษาไทยง่ายกว่า และแสดงยอด + สัดส่วนได้ครบ
// data ต้องเรียงจากมากไปน้อยมาแล้ว (salesByBranch ทำให้)
export default function BranchSalesChart({ data }) {
  const max = data[0]?.revenue || 1
  return (
    <ol className="flex h-full flex-col justify-around gap-3">
      {data.map((d, i) => (
        <li key={d.branch} className="group" title={`${d.branch}: ${formatBaht(d.revenue)}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-roast-900">
              <span className="w-4 text-xs tabular-nums text-roast-400">{i + 1}</span>
              {d.branch}
            </span>
            <span className="tabular-nums text-roast-600">
              <span className="font-semibold text-roast-950">{formatBaht(d.revenue)}</span>
              <span className="ml-2 text-xs text-roast-400">{formatPercent(d.share)}</span>
            </span>
          </div>
          <div className="ml-6 h-2.5 rounded-full bg-roast-100">
            <div
              className={`h-full rounded-full transition-[filter] group-hover:brightness-110 ${
                i === 0 ? 'bg-caramel' : 'bg-roast-600'
              }`}
              style={{ width: `${(d.revenue / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
