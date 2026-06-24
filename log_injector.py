import time
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

TARGET_LOG_FILE = "./victim_server/logs/live_stream.log"
DATASET_FILE = "dataset.json"  # ชี้ไปที่ไฟล์ dataset โดยตรง

print("🚀 [kaipokpok-injector] เริ่มต้นอ่านข้อมูลจำลองจากไฟล์ Dataset...")
os.makedirs(os.path.dirname(TARGET_LOG_FILE), exist_ok=True)

# เปิดอ่านไฟล์ Dataset ทีละบรรทัดแล้วเขียนลงท่อส่งทันที
with open(DATASET_FILE, "r", encoding="utf-8") as infile:
    for line in infile:
        log = line.strip()
        if not log:
            continue  # ข้ามบรรทัดที่เป็นช่องว่าง
            
        with open(TARGET_LOG_FILE, "a", encoding="utf-8") as outfile:
            outfile.write(log + "\n")
            
        print(f"✏️ ฉีดข้อความสำเร็จ ➔ {log[:70]}...")
        time.sleep(2)

print("✅ ฉีดข้อมูลจาก Dataset ครบถ้วนทุกเหตุการณ์แล้ว!")