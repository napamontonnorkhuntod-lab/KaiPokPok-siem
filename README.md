# Kaipokpok SIEM Pipeline

โปรเจกต์นี้คือระบบ SIEM (Security Information and Event Management) ที่ผสานการทำงานของ AI (Local LLM) เข้ามาช่วยวิเคราะห์และแจ้งเตือนภัยคุกคาม (Threat Detection & Compliance) สำหรับการจำลองและศึกษาการรับมือภัยคุกคามทางไซเบอร์

## 📌 โครงสร้างโปรเจกต์ (Project Structure)
- **`compose.yml`**: ไฟล์หลักสำหรับรัน Backend Services ทั้งหมด (Zookeeper, Kafka, Wazuh, Filebeat, OpenSearch, SIEM Router)
- **`siem-front/`**: Frontend สร้างด้วย Next.js สำหรับแสดงผล Dashboard ของระบบ
- **`siem-router/`**: Python สคริปต์ (Kafka Consumer) ทำหน้าที่แยกประเภท Log ถ้าเป็น Log การโจมตีจะส่งให้ LLM วิเคราะห์ ถ้าเป็น SCA (การประเมินค่าความปลอดภัย) จะส่งเข้า OpenSearch โดยตรง
- **`victim_server/`**: โฟลเดอร์จำลองเครื่องปลายทางที่ถูกโจมตี (เชื่อมกับ Wazuh Agent)
- **`log_injector.py`**: สคริปต์สำหรับจำลองการโจมตี (เขียน Log เข้าไปที่ `victim_server/logs/live_stream.log`)

---

## 🚀 ขั้นตอนการติดตั้งและเริ่มต้นการใช้งาน (Setup Guide)

สำหรับคนในทีมที่ทำการ `git pull` โค้ดลงมาครั้งแรก ให้ทำตามขั้นตอนต่อไปนี้ตามลำดับ เพื่อให้สามารถรันระบบและพัฒนาต่อได้ทันที:

### 1. การตั้งค่า Backend และ Infrastructure (Docker)
ระบบ Backend ทั้งหมดทำงานบน Docker Container เพื่อลดปัญหาเรื่อง Environment ไม่ตรงกัน
1. ตรวจสอบว่าเปิด [Docker Desktop](https://www.docker.com/) ไว้และทำงานอยู่
2. เปิด Terminal/PowerShell ที่ Root Directory ของโปรเจกต์ (โฟลเดอร์ที่คุณได้ทำการ `git clone` โค้ดลงมา)
3. รันคำสั่งต่อไปนี้เพื่อสร้าง Image และเริ่มทำงาน Services ทั้งหมดในโหมด Background:
   ```bash
   docker compose up -d --build
   ```
4. ตรวจสอบว่า Container ทั้งหมดขึ้นสถานะ `Up` (Running) หรือไม่:
   ```bash
   docker compose ps
   ```

### 2. การตั้งค่า Frontend (Next.js Dashboard)
หน้าจอ Dashboard เอาไว้สำหรับแสดงผลข้อมูลต่างๆ
1. เปิด Terminal ใหม่ แล้วเข้าไปที่โฟลเดอร์ `siem-front`:
   ```bash
   cd siem-front
   ```
2. ทำการติดตั้ง Dependencies (ต้องมี Node.js ติดตั้งไว้):
   ```bash
   npm install
   ```
3. รัน Development Server:
   ```bash
   npm run dev
   ```
4. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` เพื่อดูหน้า Dashboard

### 3. การทดสอบและจำลองข้อมูลเข้าระบบ
เพื่อให้ระบบมีข้อมูล Log ทะลุไหลผ่าน Pipeline เข้าไปแสดงที่ Dashboard:
1. เปิด Terminal ใหม่ที่ Root Directory ของโปรเจกต์
2. รันสคริปต์จำลองการยิง Log:
   ```bash
   python log_injector.py
   ```
   *สคริปต์นี้จะอ่านชุดข้อมูลจาก `dataset.json` มาเขียนเป็นล็อกจำลองการโจมตีไปที่ `live_stream.log` แล้ว Wazuh Agent จะทำการดูดล็อกนี้ส่งเข้าระบบต่อไป*

---

## 🛠 คำสั่งการจัดการที่มีประโยชน์ (Useful Commands)

- **ปิดการทำงานระบบ Backend ชั่วคราว (หยุด Container):**
  ```bash
  docker compose stop
  ```
- **ปิดระบบและทำลาย Container/Network ทิ้ง (เมื่อต้องการล้างสภาพแวดล้อม):**
  ```bash
  docker compose down
  ```
- **ดู Log การทำงานของ AI / Router (ใช้เช็คว่า AI ตอบกลับมาไหม):**
  ```bash
  docker compose logs -f siem-router
  ```
- **เคลียร์ไฟล์ Log ออกเพื่อให้เริ่มการวิเคราะห์ใหม่ (Windows เท่านั้น):**
  ```powershell
  ./clean_level_1.ps1
  ```
