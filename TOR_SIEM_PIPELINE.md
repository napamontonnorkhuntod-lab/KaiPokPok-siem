# SYSTEM CONTEXT & TOR FOR AI IDE
**Project:** AI-Powered Threat Detection & Compliance SIEM Pipeline (Lab Setup)

## 1. SYSTEM ARCHITECTURE & DATA FLOW
The data pipeline flows linearly through the following 5 stages:

### [✅ Completed] 1. Data Ingestion (Lab)
- **Attack Logs:** Simulated via a custom script `log_injector.py` pushing raw attack lines into `live_stream.log`.
- **SCA Logs:** Wazuh Agent periodically performs Security Configuration Assessment (SCA) scans on the OS/Docker baseline.

### [✅ Completed] 2. SIEM Core (Wazuh Manager)
- Wazuh Manager reads raw logs, decodes them, matches them against rulesets, and outputs ALL structured alerts in JSON format into a single central file: `shared_logs/alerts.json`.

### [✅ Completed] 3. High-Throughput Shipper (Filebeat & Kafka)
- Filebeat dynamically tails `alerts.json` and immediately forwards the JSON payloads to an Apache Kafka Topic.
- *(Status: Verified. Filebeat is successfully tailing logs and pushing them into the `wazuh-alerts` Kafka topic).*

### [✅ Completed] 4. Intelligent Router & Processor (Python Consumer & Local LLM)
- A custom Python script acts as a Kafka Consumer, pulls JSON payloads, and routes data based on the log type:
  - **ROUTE A (Bypass/SCA):** If the JSON payload contains `"sca"`, BYPASS the LLM entirely to save compute. Extract `passed`, `failed`, and policy details, then write directly to the Dashboard Database (OpenSearch).
  - **ROUTE B (AI Threat Analysis):** If the JSON payload is an attack/security alert (high rule level), pass the JSON object to a local DeepSeek-R1-8B model (running via Ollama) to analyze the threat and generate a concise summary and mitigation steps in Thai.

### [❌ Not Started] 5. Visualization (Interactive Dashboard)
- Displays a Compliance/SCA zone (Security Score Gauge [e.g., 52%] + Detailed Failed Policy Table).
- Displays a Threat Intel zone (Real-time traffic graph + Thai mitigation summaries from DeepSeek).

---

## 2. PRODUCTION UPGRADE COMPLIANCE (FUTURE SCOPE)
The architecture must remain decoupled because, in the future deployment:
- `log_injector.py` will be replaced by real corporate Wazuh Agents.
- The local DeepSeek-R1-8B model will be upgraded to an NVIDIA Morpheus pipeline running on Enterprise GPUs for line-rate processing.
- Maintenance will shift from a lab script (`clean_level_1.ps1` which truncates logs to 0 bytes) to automated daily Log Rotation (.gz compression) and a 90-day retention/purge policy compliant with Cyber Laws.

---

## 3. STRICT RULES FOR DEVELOPMENT
- **Kafka is Mandatory:** Do NOT suggest replacing Apache Kafka with simple HTTP webhooks or other tools. It is required for scalability testing.
- **SCA Routing Logic:** Do NOT send SCA logs to the LLM. You must implement the Python routing logic to filter out `"sca"` strings before calling Ollama.
- **Lightweight Config:** Keep configurations lightweight for a Docker sandbox environment.
- **Documentation:** When generating scripts, provide inline comments explaining how the code maps to this 5-stage pipeline.
