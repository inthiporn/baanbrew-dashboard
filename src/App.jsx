import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import KpiCard from './components/KpiCard'
import ChartCard from './components/ChartCard'
import DailySalesChart, { DailyLegend } from './components/DailySalesChart'
import BranchSalesChart from './components/BranchSalesChart'
import { CoinsIcon, ReceiptIcon, CupIcon, UsersIcon } from './components/Icons'
import {
  normalizeRows, computeKpis, dailySales, salesByBranch,
  formatBaht, formatNumber, formatShortDate,
} from './lib/metrics'

export default function App() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  // โหลด public/sales.csv ตอนเปิดหน้า
  useEffect(() => {
    Papa.parse(`${import.meta.env.BASE_URL}sales.csv`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(normalizeRows(result.data))
        setStatus('ready')
      },
      error: (err) => {
        setError(err.message)
        setStatus('error')
      },
    })
  }, [])

  // คำนวณใหม่เฉพาะตอนข้อมูลเปลี่ยน
  const kpis = useMemo(() => computeKpis(rows), [rows])
  const daily = useMemo(() => dailySales(rows), [rows])
  const branches = useMemo(() => salesByBranch(rows), [rows])

  if (status === 'loading') return <Centered>กำลังโหลดข้อมูล…</Centered>
  if (status === 'error') return <Centered>โหลด sales.csv ไม่สำเร็จ: {error}</Centered>
  if (rows.length === 0) return <Centered>ไม่พบข้อมูลใน public/sales.csv</Centered>

  const firstDay = daily[0]?.date
  const lastDay = daily[daily.length - 1]?.date
  const perDay = kpis.totalRevenue / daily.length

  return (
    <div className="min-h-screen bg-milk font-sans text-roast-950 antialiased">
      {/* แถบหัวสีเมล็ดคั่ว */}
      <header className="bg-roast-950 pb-20 text-roast-100 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 pt-7 sm:pt-10">
          <p className="text-xs font-medium tracking-[0.18em] text-caramel uppercase">Sales dashboard</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">บ้านบรู</h1>
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill>{formatShortDate(firstDay)} – {formatShortDate(lastDay)}</Pill>
              <Pill>{branches.length} สาขา</Pill>
              <Pill>{formatNumber(rows.length)} รายการสินค้า</Pill>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-14 max-w-6xl px-4 pb-10 sm:-mt-16">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard icon={<CoinsIcon />} label="ยอดขายรวม" value={formatBaht(kpis.totalRevenue)}
            hint={`เฉลี่ยวันละ ${formatBaht(Math.round(perDay))}`} />
          <KpiCard icon={<ReceiptIcon />} label="จำนวนบิล" value={formatNumber(kpis.orderCount)}
            hint="นับ order_id ไม่ซ้ำ" />
          <KpiCard icon={<CupIcon />} label="ยอดเฉลี่ยต่อบิล" value={formatBaht(Math.round(kpis.avgPerOrder * 100) / 100)}
            hint="ยอดขายรวม ÷ จำนวนบิล" />
          <KpiCard icon={<UsersIcon />} label="ลูกค้าสมาชิก" value={formatNumber(kpis.uniqueMembers)}
            hint="ไม่นับลูกค้าทั่วไป" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ChartCard title="ยอดขายรายวัน" subtitle="บาทต่อวัน" legend={<DailyLegend />}>
              <DailySalesChart data={daily} />
            </ChartCard>
          </div>
          <div className="lg:col-span-2">
            <ChartCard title="ยอดขายแยกสาขา" subtitle="เรียงจากมากไปน้อย · % ของยอดรวม">
              <BranchSalesChart data={branches} />
            </ChartCard>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-roast-400">
          ข้อมูลจาก public/sales.csv · ยอดขาย = qty × unit_price
        </footer>
      </main>
    </div>
  )
}

function Pill({ children }) {
  return (
    <span className="rounded-full border border-roast-800 bg-roast-900 px-3 py-1 tabular-nums text-roast-200">
      {children}
    </span>
  )
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-milk font-sans text-roast-600">
      {children}
    </div>
  )
}
