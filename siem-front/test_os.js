const { Client } = require('@opensearch-project/opensearch');
const osClient = new Client({
  node: 'http://127.0.0.1:9200',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const response = await osClient.search({
      index: 'threat-alerts-*,sca-metrics-*',
      ignore_unavailable: true,
      size: 5,
      body: { query: { match_all: {} } }
    });
    console.log("Success:", response.body.hits.hits.length, "hits found.");
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
