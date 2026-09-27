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
