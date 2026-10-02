import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import KpiCard from './KpiCard'
import ChartCard from './ChartCard'
import { UsersIcon, CupIcon, CoinsIcon, ReceiptIcon } from './Icons'
import {
  customerKpis, signupsByMonth, countCustomersBy, membersByBranch,
  AGE_ORDER, GENDER_ORDER, formatBaht, formatNumber, formatPercent, formatThaiMonth,
} from '../lib/metrics'

const MAIN = '#6b4c3b'    // roast-600 สีหลักของส่วนลูกค้า
const ACCENT = '#c7843a'  // caramel เน้นค่าสูงสุด
const AXIS = '#a88a78'
const GRID = '#efe9e4'

/** ส่วนแสดงข้อมูลลูกค้าสมาชิก (จาก customers_clean.csv ที่ผ่าน Lab 2.1 แล้ว) */
export default function CustomerSection({ customers, rows }) {
  const k = useMemo(() => customerKpis(customers, rows), [customers, rows])
  const signups = useMemo(() => signupsByMonth(customers), [customers])
  const ages = useMemo(() => countCustomersBy(customers, 'ageGroup', AGE_ORDER), [customers])
  const genders = useMemo(() => countCustomersBy(customers, 'gender', GENDER_ORDER), [customers])
  const branches = useMemo(() => membersByBranch(customers, rows), [customers, rows])

  // ข้อความสรุป คำนวณจากข้อมูลจริง
  const full = signups.filter((s) => !s.partial)
  const firstQ = full.slice(0, 3), lastQ = full.slice(-3)
  const avg = (a) => a.reduce((s, x) => s + x.count, 0) / a.length
  const growth = avg(lastQ) / avg(firstQ) - 1
  const topAge = [...ages].sort((a, b) => b.count - a.count)[0]
  const youngShare = ages.filter((a) => ['18-24', '25-34'].includes(a.label)).reduce((s, a) => s + a.share, 0)
  const lowActive = [...branches].sort((a, b) => a.activeRate - b.activeRate)[0]
  const billGap = k.avgBillMember / k.avgBillWalkin - 1

  return (
    <section id="customers" className="mt-10 scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-caramel">Members</p>
          <h2 className="font-display text-2xl font-bold text-roast-950">ลูกค้าสมาชิก</h2>
        </div>
        <p className="text-sm text-roast-400">จาก customers_clean.csv (ผ่าน Data Profiling ใน Lab 2.1)</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={<UsersIcon />} label="สมาชิกทั้งหมด" value={formatNumber(k.total)}
          hint={`สมัครใหม่ 30 วันล่าสุด ${formatNumber(k.newLast30)} คน`} />
        <KpiCard icon={<ReceiptIcon />} label="เคยซื้อแล้ว" value={formatPercent(k.activeRate)}
          hint={`${formatNumber(k.active)} จาก ${formatNumber(k.total)} คน`} />
        <KpiCard icon={<CoinsIcon />} label="ยอดขายจากสมาชิก" value={formatPercent(k.memberRevenueShare)}
          hint={`${formatPercent(k.memberBillShare)} ของบิลทั้งหมด`} />
        <KpiCard icon={<CupIcon />} label="ยอดต่อบิล สมาชิก" value={formatBaht(Math.round(k.avgBillMember))}
          hint={`ลูกค้าทั่วไป ${formatBaht(Math.round(k.avgBillWalkin))} (${billGap >= 0 ? '+' : ''}${formatPercent(billGap)})`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartCard
            title="สมัครสมาชิกใหม่รายเดือน"
            subtitle={`3 เดือนล่าสุดเฉลี่ย ${formatNumber(Math.round(avg(lastQ)))} คน/เดือน ${growth >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${formatPercent(Math.abs(growth))} จาก 3 เดือนแรก`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signups} margin={{ top: 18, right: 18, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tickFormatter={formatThaiMonth} interval="preserveStartEnd" minTickGap={18}
                  tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} width={36} />
                <Tooltip
                  cursor={{ fill: '#f5f5f4' }}
                  labelFormatter={formatThaiMonth}
                  formatter={(v, _k, item) => [
                    `${formatNumber(v)} คน${item.payload.partial ? ` (ข้อมูล ${item.payload.days}/${item.payload.fullDays} วัน)` : ''}`,
                    'สมัครใหม่',
                  ]}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {signups.map((s) => <Cell key={s.month} fill={MAIN} fillOpacity={s.partial ? 0.35 : 1} />)}
                  <LabelList dataKey="month" content={({ x, y, width, index }) => signups[index].partial ? (
                    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="#6b4c3b">
                      {signups[index].days} วัน
                    </text>
                  ) : null} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard
            title="กลุ่มอายุ"
            subtitle={`${topAge.label} ปีมากที่สุด · อายุ 18–34 รวมกัน ${formatPercent(youngShare)}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ages} layout="vertical" margin={{ top: 0, right: 88, bottom: 0, left: 0 }}>
                <XAxis type="number" hide domain={[0, 'auto']} />
                <YAxis type="category" dataKey="label" width={78} tickLine={false} axisLine={false}
                  tick={{ fontSize: 12, fill: '#44403c' }} />
                <Tooltip cursor={{ fill: '#f5f5f4' }}
                  formatter={(v, _k, item) => [`${formatNumber(v)} คน (${formatPercent(item.payload.share)})`, 'สมาชิก']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
                  {ages.map((a) => <Cell key={a.label} fill={a.label === topAge.label ? ACCENT : MAIN} />)}
                  <LabelList dataKey="count" content={({ x, y, width, height, index }) => (
                    <text x={x + width + 6} y={y + height / 2 + 4} fontSize={11} fill="#44403c">
                      {formatNumber(ages[index].count)} · {formatPercent(ages[index].share)}
                    </text>
                  )} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartCard
            title="สมาชิกตามสาขาประจำ"
            subtitle={`${branches[0].branch}มีสมาชิกมากที่สุด · ${lowActive.branch}มีสัดส่วนคนที่เคยซื้อต่ำสุด ${formatPercent(lowActive.activeRate)}`}
          >
            <ol className="flex h-full flex-col justify-around gap-2">
              {branches.map((b, i) => (
                <li key={b.branch} title={`${b.branch}: สมาชิก ${formatNumber(b.members)} คน เคยซื้อ ${formatNumber(b.active)} คน`}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-roast-900">{b.branch}</span>
                    <span className="tabular-nums text-roast-600">
                      <span className="font-semibold text-roast-950">{formatNumber(b.members)} คน</span>
                      <span className="ml-2 text-xs text-roast-400">เคยซื้อ {formatPercent(b.activeRate)}</span>
                    </span>
                  </div>
                  {/* แถบเต็ม = สมาชิกทั้งหมด, ส่วนเข้ม = เคยซื้อแล้ว */}
                  <div className="h-2.5 rounded-full bg-roast-100">
                    <div className="relative h-full rounded-full bg-roast-200" style={{ width: `${(b.members / branches[0].members) * 100}%` }}>
                      <div className={`h-full rounded-full ${i === 0 ? 'bg-caramel' : 'bg-roast-600'}`} style={{ width: `${b.activeRate * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="เพศ" subtitle="ใช้ด้วยความระวัง ดูหมายเหตุด้านล่าง">
            <div className="flex h-full flex-col justify-center gap-4">
              {genders.map((g) => (
                <div key={g.label}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-roast-900">{g.label}</span>
                    <span className="tabular-nums"><span className="font-semibold">{formatNumber(g.count)}</span>
                      <span className="ml-2 text-xs text-roast-400">{formatPercent(g.share)}</span></span>
                  </div>
                  <div className="h-2.5 rounded-full bg-roast-100">
                    <div className="h-full rounded-full bg-roast-600" style={{ width: `${g.share * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-caramel-soft/60 p-4 text-sm leading-relaxed text-roast-800 sm:p-5">
        <p className="font-semibold text-roast-950">ข้อจำกัดของข้อมูลลูกค้า (จาก Data Profiling)</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>เบอร์โทรถูกปิดบังตรงกลาง มี {formatNumber(k.phoneShared)} คนที่เบอร์ชนกันโดยบังเอิญ จึงใช้แยกตัวตนหรือส่ง SMS ไม่ได้</li>
          <li>ชื่อเล่นกับเพศขัดกันจำนวนมาก (เช่น "สมชาย" เพศหญิง) ข้อมูลเพศจึงไม่ควรใช้ตัดสินใจละเอียด</li>
          <li>มีสมาชิกอายุต่ำกว่า 18 ปี {formatNumber(k.minors)} คน ต้องได้ความยินยอมตาม PDPA ก่อนส่งโปรโมชัน</li>
          <li>สมาชิกที่ยังไม่เคยซื้อส่วนใหญ่เพิ่งสมัคร ใช้ทำแคมเปญต้อนรับสมาชิกใหม่ได้</li>
        </ul>
      </div>
    </section>
  )
}
