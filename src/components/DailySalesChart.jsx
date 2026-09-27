import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatBaht, formatBahtShort, formatShortDate } from '../lib/metrics'

const CARAMEL = '#c7843a'
const DAILY = '#eae1da' // เส้นรายวันสีจาง
const AXIS = '#a88a78'
const GRID = '#efe9e4'

// legend แบบเขียนเอง วางไว้หัวการ์ด
export function DailyLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-roast-600">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: DAILY }} /> ยอดขายรายวัน
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-[3px] w-4 rounded" style={{ background: CARAMEL }} /> ค่าเฉลี่ย 7 วัน
      </span>
    </div>
  )
}

function DailyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl bg-roast-950 px-3 py-2 text-xs text-roast-100 shadow-lg">
      <p className="mb-1 font-medium text-white">{formatShortDate(label)}</p>
      <p className="tabular-nums">ยอดขาย {formatBaht(d.revenue)}</p>
      {d.ma7 != null && (
        <p className="tabular-nums text-caramel-soft">เฉลี่ย 7 วัน {formatBaht(Math.round(d.ma7))}</p>
      )}
    </div>
  )
}

export default function DailySalesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="ma7Fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CARAMEL} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CARAMEL} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 12, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          minTickGap={36}
          dy={6}
        />
        <YAxis
          tickFormatter={formatBahtShort}
          tick={{ fontSize: 12, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<DailyTooltip />} cursor={{ stroke: AXIS, strokeDasharray: '3 3' }} />
        {/* เส้นรายวัน: บางและจาง เป็นพื้นหลัง */}
        <Line
          type="linear"
          dataKey="revenue"
          stroke={DAILY}
          strokeWidth={1}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        {/* ค่าเฉลี่ย 7 วัน: เส้นหลัก มีพื้นไล่สีด้านล่าง */}
        <Area
          type="monotone"
          dataKey="ma7"
          stroke={CARAMEL}
          strokeWidth={2.75}
          fill="url(#ma7Fill)"
          dot={false}
          activeDot={{ r: 5, fill: CARAMEL, stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
