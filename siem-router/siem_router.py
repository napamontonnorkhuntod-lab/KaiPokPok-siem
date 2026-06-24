import json
import time
from datetime import datetime
from kafka import KafkaConsumer
from opensearchpy import OpenSearch

# --- CONFIGURATION ---
# Stage 3 Pipeline Connection
KAFKA_BROKER = "kafka:29092"
KAFKA_TOPIC = "wazuh-alerts"

# Stage 5 Pipeline Connection (OpenSearch)
OPENSEARCH_HOST = "opensearch"
OPENSEARCH_PORT = 9200

# --- OPENSEARCH CLIENT INITIALIZATION ---
print("Connecting to OpenSearch (Dashboard Database)...")
while True:
    try:
        os_client = OpenSearch(
            hosts=[{'host': OPENSEARCH_HOST, 'port': OPENSEARCH_PORT}],
            http_compress=True,
            use_ssl=False,
            verify_certs=False,
            ssl_assert_hostname=False,
            ssl_show_warn=False
        )
        if os_client.ping():
            print("✅ Connected to OpenSearch successfully!")
            break
    except Exception as e:
        print("Waiting for OpenSearch to start...")
        time.sleep(5)

# --- KAFKA CONSUMER INITIALIZATION ---
print(f"Connecting to Kafka Broker at {KAFKA_BROKER}...")
while True:
    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=[KAFKA_BROKER],
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='siem-router-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        print("✅ Connected to Kafka successfully!")
        break
    except Exception as e:
        print("Waiting for Kafka to start...")
        time.sleep(5)

# --- ROUTING LOGIC ---

def process_route_a(payload, inner_msg):
    """
    ROUTE A: Extract SCA data and push directly to OpenSearch.
    """
    try:
        data = inner_msg.get("data", {}).get("sca", {})
        is_summary = data.get("type") == "summary"
        
        doc = {
            "@timestamp": inner_msg.get("timestamp", datetime.utcnow().isoformat()),
            "agent_name": inner_msg.get("agent", {}).get("name", "unknown"),
            "policy": data.get("policy", ""),
            "type": data.get("type", "unknown")
        }

        if is_summary:
            doc["passed"] = int(data.get("passed", 0))
            doc["failed"] = int(data.get("failed", 0))
            doc["invalid"] = int(data.get("invalid", 0))
            doc["score"] = int(data.get("score", 0))
            doc["description"] = data.get("description", "")
        else:
            doc["check_title"] = data.get("check", {}).get("title", "")
            doc["check_result"] = data.get("check", {}).get("result", "")
            doc["description"] = data.get("check", {}).get("description", "")

        # Dynamic index name: sca-metrics-YYYY.MM
        current_date = datetime.utcnow().strftime("%Y.%m")
        index_name = f"sca-metrics-{current_date}"

        # Ensure index exists
        if not os_client.indices.exists(index=index_name):
            os_client.indices.create(index=index_name)
            print(f"Created OpenSearch index: {index_name}")

        # Push to OpenSearch Dashboard Database
        os_client.index(index=index_name, body=doc)
        print(f"[ROUTE A - SCA] Extracted SCA Data and pushed to {index_name} (Type: {doc['type']})")
    except Exception as e:
        print(f"Error processing Route A: {e}")

def process_route_b(payload, inner_msg):
    """
    ROUTE B: Threat Alerts. Print raw English alerts and push to OpenSearch.
    """
    try:
        rule = inner_msg.get("rule", {})
        level = rule.get("level", 0)
        desc = rule.get("description", "")
        rule_id = rule.get("id", "unknown")
        agent = inner_msg.get("agent", {}).get("name", "unknown")
        
        # Filter: Rule Level >= 5 and NOT SCA
        groups = rule.get("groups", [])
        if level >= 5 and "sca" not in groups:
            print(f"\n🚨 [ROUTE B - THREAT DETECTED]")
            print(f"   Rule ID: {rule_id}")
            print(f"   Level: {level}")
            print(f"   Agent: {agent}")
            print(f"   Description: {desc}")
            print("   Pushing raw threat log to OpenSearch...")
            
            doc = {
                "@timestamp": inner_msg.get("timestamp", datetime.utcnow().isoformat()),
                "rule_id": rule_id,
                "level": level,
                "description": desc,
                "agent_name": agent,
                "groups": groups,
                "full_log": json.dumps(inner_msg) # keep the full context if needed
            }

            # Dynamic index name: threat-alerts-YYYY.MM
            current_date = datetime.utcnow().strftime("%Y.%m")
            index_name = f"threat-alerts-{current_date}"

            # Ensure index exists
            if not os_client.indices.exists(index=index_name):
                os_client.indices.create(index=index_name)
                print(f"Created OpenSearch index: {index_name}")

            # Push to OpenSearch
            os_client.index(index=index_name, body=doc)
            print(f"   ✅ Successfully pushed to {index_name}")
            
    except Exception as e:
        print(f"Error processing Route B: {e}")

# --- MAIN LOOP ---
print("\n🎧 Listening for new alerts on wazuh-alerts topic...")
for message in consumer:
    payload = message.value
    
    # Filebeat wraps the raw JSON string inside a "message" field, extract it
    inner_msg = payload
    if "message" in payload and isinstance(payload["message"], str):
        try:
            inner_msg = json.loads(payload["message"])
        except:
            pass

    # Routing logic based on log type
    rule = inner_msg.get("rule", {})
    is_sca = "sca" in rule.get("groups", []) or inner_msg.get("location") == "sca"

    if is_sca:
        process_route_a(payload, inner_msg)
    else:
        process_route_b(payload, inner_msg)
