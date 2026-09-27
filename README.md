# บ้านบรู Dashboard

Dashboard ยอดขายร้านกาแฟบ้านบรู อ่านข้อมูลจาก `public/sales.csv` แล้วแสดง KPI และกราฟ (งาน Lab 1)

**เครื่องมือ:** React + Vite · Tailwind CSS v4 · Recharts · PapaParse

## สิ่งที่แสดง

- KPI: ยอดขายรวม, จำนวนบิล (order_id ไม่ซ้ำ), ยอดเฉลี่ยต่อบิล, จำนวนลูกค้าสมาชิก
- ยอดขายรายวัน พร้อมเส้นค่าเฉลี่ย 7 วัน (วันที่แบบไทย เช่น 1 เม.ย. 68)
- ยอดขายแยกสาขา เรียงจากมากไปน้อย พร้อมสัดส่วน %

## วิธีรัน

```bash
npm install
npm run dev
```

แล้วเปิด http://localhost:5173

## โครงสร้าง

```
public/sales.csv          ข้อมูลยอดขาย (1 แถว = 1 รายการสินค้า)
src/lib/metrics.js        logic คำนวณทั้งหมด
src/components/           KPI card, กราฟรายวัน, ยอดแยกสาขา
src/App.jsx               โหลด CSV และจัดหน้า
```

ยอดขาย = qty × unit_price
