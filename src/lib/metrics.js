// src/lib/metrics.js
// รวม logic คำนวณทั้งหมดของ Dashboard ไว้ที่นี่ (ไม่มีโค้ด React ในไฟล์นี้)

// ---------- แปลงข้อมูล ----------

/** แปลงข้อความเป็นตัวเลข ตัดจุลภาค/ช่องว่างออก ถ้าแปลงไม่ได้คืนค่า 0 */
function toNumber(value) {
  const n = Number(String(value ?? '').replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** ดึงวันที่ตามเวลาไทย (YYYY-MM-DD) จาก datetime */
const bangkokDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function toThaiDateKey(datetime) {
  const s = String(datetime ?? '').trim()
  // ถ้าเป็นเวลาไทย (+07:00) อยู่แล้ว ตัด 10 ตัวแรกได้เลย
  if (/^\d{4}-\d{2}-\d{2}T.*\+07:00$/.test(s)) return s.slice(0, 10)
  // กรณีอื่น (เช่น เวลา UTC) แปลงเป็นเวลาไทยก่อน
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : bangkokDate.format(d)
}

/**
 * แปลงแถวดิบจาก PapaParse ให้พร้อมคำนวณ
 * - qty, unit_price เป็นตัวเลข
 * - revenue = qty × unit_price
 * - customer_id ว่าง → null (ลูกค้าทั่วไป)
 * - ตัดแถวที่ไม่มี order_id หรือวันที่อ่านไม่ได้ทิ้ง
 */
export function normalizeRows(rawRows) {
  const rows = []
  for (const r of rawRows) {
    const orderId = String(r.order_id ?? '').trim()
    const date = toThaiDateKey(r.datetime)
    if (!orderId || !date) continue

    const qty = toNumber(r.qty)
    const unitPrice = toNumber(r.unit_price)
    const customerId = String(r.customer_id ?? '').trim()

    rows.push({
      orderId,
      date,
      branch: String(r.branch ?? '').trim() || 'ไม่ระบุสาขา',
      qty,
      unitPrice,
      revenue: qty * unitPrice,
      customerId: customerId || null,
    })
  }
  return rows
}

// ---------- ตัวชี้วัด ----------

/**
 * KPI หลัก 4 ตัว
 * - totalRevenue: ผลรวม revenue ทุกแถว
 * - orderCount: จำนวน order_id ที่ไม่ซ้ำ (1 บิลมีหลายแถว จึงนับแถวไม่ได้)
 * - avgPerOrder: totalRevenue ÷ orderCount
 * - uniqueMembers: จำนวน customer_id ที่ไม่ซ้ำ ไม่นับค่าว่าง
 */
export function computeKpis(rows) {
  let totalRevenue = 0
  const orders = new Set()
  const members = new Set()

  for (const r of rows) {
    totalRevenue += r.revenue
    orders.add(r.orderId)
    if (r.customerId) members.add(r.customerId)
  }

  const orderCount = orders.size
  return {
    totalRevenue,
    orderCount,
    avgPerOrder: orderCount ? totalRevenue / orderCount : 0,
    uniqueMembers: members.size,
  }
}

/**
 * ยอดขายรายวัน เรียงตามวันที่ พร้อมค่าเฉลี่ยเคลื่อนที่ 7 วัน
 * เติมวันที่ไม่มียอดขายเป็น 0 เพื่อไม่ให้เส้นกราฟข้ามวันไปเฉย ๆ
 * คืนค่า [{ date: '2025-04-01', revenue: 12345, ma7: 11890 }, ...]
 */
export function dailySales(rows) {
  const byDate = new Map()
  for (const r of rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.revenue)
  }
  if (byDate.size === 0) return []

  const dates = [...byDate.keys()].sort()
  const result = []
  // ใช้ UTC ในการไล่วัน เพื่อไม่ให้ timezone ของเครื่องทำให้วันเลื่อน
  const cur = new Date(`${dates[0]}T00:00:00Z`)
  const end = new Date(`${dates[dates.length - 1]}T00:00:00Z`)
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    result.push({ date: key, revenue: byDate.get(key) ?? 0 })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return addMovingAverage(result, 7)
}

/**
 * ค่าเฉลี่ยเคลื่อนที่ย้อนหลัง N วัน (รวมวันนี้)
 * ma7 ของวันที่ 7 = (ยอดวันที่ 1 + ... + ยอดวันที่ 7) ÷ 7
 * 6 วันแรกยังมีข้อมูลไม่ครบ 7 วัน จึงให้เป็น null (กราฟจะไม่วาดช่วงนั้น)
 */
export function addMovingAverage(days, window = 7) {
  let sum = 0
  return days.map((d, i) => {
    sum += d.revenue
    if (i >= window) sum -= days[i - window].revenue // ตัดวันที่หลุดหน้าต่างออก
    return { ...d, ma7: i >= window - 1 ? sum / window : null }
  })
}

/**
 * ยอดขายแยกสาขา เรียงจากมากไปน้อย พร้อมสัดส่วน (share) ของยอดขายรวม
 * คืนค่า [{ branch: 'สยาม', revenue: 54321, share: 0.276 }, ...]
 */
export function salesByBranch(rows) {
  const byBranch = new Map()
  let total = 0
  for (const r of rows) {
    byBranch.set(r.branch, (byBranch.get(r.branch) ?? 0) + r.revenue)
    total += r.revenue
  }
  return [...byBranch]
    .map(([branch, revenue]) => ({ branch, revenue, share: total ? revenue / total : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ---------- จัดรูปแบบตัวเลข ----------

const numberFmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })
const bahtFmt = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** 0.276 → "27.6%" */
export const formatPercent = (x) => `${(x * 100).toFixed(1)}%`

/** 1234567 → "1,234,567" */
export const formatNumber = (n) => numberFmt.format(n)

/** 1234.5 → "฿1,234.5" */
export const formatBaht = (n) => `฿${bahtFmt.format(n)}`

/** ย่อค่าสำหรับแกนกราฟ: 125000 → "฿125K", 1200000 → "฿1.2M" */
export function formatBahtShort(n) {
  if (Math.abs(n) >= 1_000_000) return `฿${+(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `฿${+(n / 1_000).toFixed(1)}K`
  return `฿${numberFmt.format(n)}`
}

/** '2025-04-01' → "1 เม.ย. 68" (ปี พ.ศ. 2 หลัก ใช้บนแกน X) */
const thaiShortDate = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
})

export function formatShortDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return thaiShortDate.format(new Date(Date.UTC(y, m - 1, d)))
}

// ---------- ลูกค้าสมาชิก (customers_clean.csv) ----------

export const AGE_ORDER = ['ต่ำกว่า 18', '18-24', '25-34', '35-44', '45-54', '55+']
export const GENDER_ORDER = ['หญิง', 'ชาย', 'ไม่ระบุ']

/** แปลงแถวจาก customers_clean.csv: ตัดช่องว่าง และแปลง flag เป็น boolean */
export function normalizeCustomers(rawRows) {
  const bool = (v) => String(v ?? '').trim().toLowerCase() === 'true'
  return rawRows
    .map((r) => ({
      customerId: String(r.customer_id ?? '').trim(),
      gender: String(r.gender ?? '').trim(),
      ageGroup: String(r.age_group ?? '').trim(),
      homeBranch: String(r.home_branch ?? '').trim(),
      joinedDate: String(r.joined_date ?? '').trim().slice(0, 10),
      phoneShared: bool(r.phone_shared),
      isMinor: bool(r.is_minor),
    }))
    .filter((c) => c.customerId)
}

/**
 * KPI ของลูกค้า (เทียบกับยอดขาย rows ที่ผ่าน normalizeRows แล้ว)
 * - active: สมาชิกที่มีบิลอย่างน้อย 1 บิลในข้อมูลยอดขาย
 * - memberRevenueShare: ยอดขายจากแถวที่มี customer_id ÷ ยอดขายทั้งหมด
 * - avgBillMember / avgBillWalkin: ยอดต่อบิล แยกบิลสมาชิกกับบิลลูกค้าทั่วไป
 * - newLast30: สมัครใน 30 วันก่อนวันสมัครล่าสุดในข้อมูล
 */
export function customerKpis(customers, rows) {
  const buyers = new Set()
  const bills = new Map() // orderId → { revenue, member }
  let memberRevenue = 0
  let totalRevenue = 0
  for (const r of rows) {
    totalRevenue += r.revenue
    if (r.customerId) {
      buyers.add(r.customerId)
      memberRevenue += r.revenue
    }
    const b = bills.get(r.orderId) ?? { revenue: 0, member: false }
    b.revenue += r.revenue
    b.member ||= Boolean(r.customerId)
    bills.set(r.orderId, b)
  }
  let mSum = 0, mN = 0, wSum = 0, wN = 0
  for (const b of bills.values()) {
    if (b.member) { mSum += b.revenue; mN++ } else { wSum += b.revenue; wN++ }
  }
  const active = customers.filter((c) => buyers.has(c.customerId)).length
  const lastJoin = customers.reduce((m, c) => (c.joinedDate > m ? c.joinedDate : m), '')
  const cutoff = new Date(`${lastJoin}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - 29)
  const cutoffKey = cutoff.toISOString().slice(0, 10)
  return {
    total: customers.length,
    active,
    activeRate: customers.length ? active / customers.length : 0,
    memberRevenueShare: totalRevenue ? memberRevenue / totalRevenue : 0,
    avgBillMember: mN ? mSum / mN : 0,
    avgBillWalkin: wN ? wSum / wN : 0,
    memberBillShare: bills.size ? mN / bills.size : 0,
    newLast30: customers.filter((c) => c.joinedDate >= cutoffKey).length,
    lastJoin,
    minors: customers.filter((c) => c.isMinor).length,
    phoneShared: customers.filter((c) => c.phoneShared).length,
  }
}

/**
 * จำนวนสมัครสมาชิกรายเดือน พร้อมบอกว่าเดือนไหนข้อมูลไม่ครบ
 * (เดือนสุดท้ายนับถึงวันสมัครล่าสุดในข้อมูลเท่านั้น)
 */
export function signupsByMonth(customers) {
  const map = new Map()
  let lastJoin = ''
  for (const c of customers) {
    const m = c.joinedDate.slice(0, 7)
    map.set(m, (map.get(m) ?? 0) + 1)
    if (c.joinedDate > lastJoin) lastJoin = c.joinedDate
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const [y, mo] = month.split('-').map(Number)
      const fullDays = new Date(Date.UTC(y, mo, 0)).getUTCDate()
      const days = month === lastJoin.slice(0, 7) ? Number(lastJoin.slice(8, 10)) : fullDays
      return { month, count, days, fullDays, partial: days < fullDays }
    })
}

/** นับลูกค้าตามคอลัมน์ key เรียงตาม order ที่กำหนด พร้อมสัดส่วน */
export function countCustomersBy(customers, key, order) {
  const map = new Map()
  for (const c of customers) map.set(c[key], (map.get(c[key]) ?? 0) + 1)
  const keys = order ?? [...map.keys()].sort((a, b) => map.get(b) - map.get(a))
  return keys
    .filter((k) => map.has(k))
    .map((k) => ({ label: k, count: map.get(k), share: map.get(k) / customers.length }))
}

/** สมาชิกแยกตามสาขาประจำ: จำนวนทั้งหมด และสัดส่วนที่เคยซื้อ เรียงมากไปน้อย */
export function membersByBranch(customers, rows) {
  const buyers = new Set(rows.filter((r) => r.customerId).map((r) => r.customerId))
  const map = new Map()
  for (const c of customers) {
    const b = map.get(c.homeBranch) ?? { branch: c.homeBranch, members: 0, active: 0 }
    b.members++
    if (buyers.has(c.customerId)) b.active++
    map.set(c.homeBranch, b)
  }
  return [...map.values()]
    .map((b) => ({ ...b, activeRate: b.active / b.members }))
    .sort((a, b) => b.members - a.members)
}

/** '2026-09' → "ก.ย. 69" */
export function formatThaiMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('th-TH', {
    month: 'short', year: '2-digit', timeZone: 'UTC',
  })
}
