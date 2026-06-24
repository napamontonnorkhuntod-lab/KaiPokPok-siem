Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   KAIPOKPOK SIEM - FULL CLEAN RESET" -ForegroundColor Cyan
Write-Host "   ล้างข้อมูลทั้งหมดให้เหมือนไม่เคยมีการโจมตี" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ============================================================
# STEP 1: หยุดทุก Container ที่เกี่ยวข้องก่อน
# ============================================================
Write-Host "`n[1/5] Stopping Wazuh Manager, Agent, and Filebeat..." -ForegroundColor Yellow
docker compose stop wazuh-manager wazuh-agent filebeat

# ============================================================
# STEP 2: ล้าง Log ไฟล์ทาง Windows (shared_logs)
# ============================================================
Write-Host "`n[2/5] Removing and recreating shared log files (Windows side)..." -ForegroundColor Yellow
Remove-Item -Path ".\siem-back\shared_logs\alerts.log"  -ErrorAction SilentlyContinue
Remove-Item -Path ".\siem-back\shared_logs\alerts.json" -ErrorAction SilentlyContinue
New-Item    -Path ".\siem-back\shared_logs\alerts.log"  -ItemType File | Out-Null
New-Item    -Path ".\siem-back\shared_logs\alerts.json" -ItemType File | Out-Null
Write-Host "   alerts.log  -> recreated (0 bytes)" -ForegroundColor Gray
Write-Host "   alerts.json -> recreated (0 bytes)" -ForegroundColor Gray

# ล้าง live_stream log ใน victim_server
Clear-Content -Path ".\victim_server\logs\live_stream.log" -ErrorAction SilentlyContinue
Write-Host "   live_stream.log -> cleared" -ForegroundColor Gray

# ============================================================
# STEP 2.5: ล้างข้อมูลในฐานข้อมูล OpenSearch (Dashboard Database)
# ============================================================
Write-Host "`n[2.5/5] Wiping OpenSearch database indices..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:9200/threat-alerts-*,sca-metrics-*" -Method DELETE -ErrorAction Stop | Out-Null
    Write-Host "   OpenSearch indices -> wiped" -ForegroundColor Gray
} catch {
    Write-Host "   OpenSearch indices -> not found or OpenSearch is down (Skipped)" -ForegroundColor Gray
}

# ============================================================
# STEP 3: ล้าง Log ภายใน Wazuh Manager Container
# (Archives, Alerts, Queue, และ Agent State DB)
# ============================================================
Write-Host "`n[3/5] Wiping Wazuh Manager internal logs & state..." -ForegroundColor Yellow

# Start manager briefly just to run exec commands
docker compose start wazuh-manager
Start-Sleep -Seconds 8

# ล้าง alerts และ archives ภายใน container
docker exec kaipokpok-wazuh-manager sh -c "find /var/ossec/logs/alerts/   -type f -delete 2>/dev/null; true"
docker exec kaipokpok-wazuh-manager sh -c "find /var/ossec/logs/archives/ -type f -delete 2>/dev/null; true"
docker exec kaipokpok-wazuh-manager sh -c "find /var/ossec/logs/         -maxdepth 1 -name 'ossec.log*' -delete 2>/dev/null; true"

# ล้าง Queue (ข้อมูลรอประมวลผล) 
docker exec kaipokpok-wazuh-manager sh -c "find /var/ossec/queue/alerts/ -type f -delete 2>/dev/null; true"

# ล้างฐานข้อมูล SQLite ที่จดจำตำแหน่ง File offset (ตัวการของ NULL bytes!)
docker exec kaipokpok-wazuh-manager sh -c "find /var/ossec/queue/fim/db/ -type f -delete 2>/dev/null; true"
docker exec kaipokpok-wazuh-manager sh -c "find /var/ossec/var/db/       -name '*.db' -delete 2>/dev/null; true"

Write-Host "   /var/ossec/logs/alerts/    -> wiped" -ForegroundColor Gray
Write-Host "   /var/ossec/logs/archives/  -> wiped" -ForegroundColor Gray
Write-Host "   /var/ossec/queue/alerts/   -> wiped" -ForegroundColor Gray
Write-Host "   /var/ossec/var/db/*.db     -> wiped (file-offset memory cleared!)" -ForegroundColor Gray

# ============================================================
# STEP 4: ล้าง Log ภายใน Wazuh Agent Container
# ============================================================
Write-Host "`n[4/5] Wiping Wazuh Agent internal logs..." -ForegroundColor Yellow
docker compose start wazuh-agent
Start-Sleep -Seconds 5

docker exec kaipokpok-wazuh-agent sh -c "find /var/ossec/logs/ -type f -delete 2>/dev/null; true"
docker exec kaipokpok-wazuh-agent sh -c "find /var/ossec/queue/ -type f -not -name '.agent_info' -delete 2>/dev/null; true"

Write-Host "   wazuh-agent logs -> wiped" -ForegroundColor Gray

# ============================================================
# STEP 5: Restart ทุกอย่างให้ Fresh
# ============================================================
Write-Host "`n[5/5] Restarting all services fresh..." -ForegroundColor Yellow
docker compose stop wazuh-manager wazuh-agent filebeat
Start-Sleep -Seconds 3
docker compose start wazuh-manager wazuh-agent filebeat
Start-Sleep -Seconds 5

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "   FULL CLEAN RESET COMPLETE!" -ForegroundColor Green
Write-Host "   ระบบพร้อมใช้งานใหม่ 100%!" -ForegroundColor Green
Write-Host "   ไม่มีประวัติการโจมตีเหลืออยู่เลย" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
