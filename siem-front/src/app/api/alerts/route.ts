import { NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch';

const osClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://127.0.0.1:9200',
  ssl: { rejectUnauthorized: false }, // For lab environment
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewType = searchParams.get('type') || 'aggregated'; // 'aggregated' or 'raw'
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';

    let queryBody: any = { match_all: {} };
    if (search) {
      queryBody = {
        query_string: {
          query: `*${search}*`
        }
      };
    }

    const osSize = viewType === 'raw' ? limit : 500;
    const osFrom = viewType === 'raw' ? (page - 1) * limit : 0;

    // Fetch logs from OpenSearch
    const response = await osClient.search({
      index: 'threat-alerts-*,sca-metrics-*',
      ignore_unavailable: true, // Prevents 404 error if index doesn't exist yet
      size: osSize,
      from: osFrom,
      body: {
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: queryBody
      }
    });

    const hits = response.body.hits.hits.map((h: any) => {
      const source = h._source;
      
      // Normalize SCA metrics to look like Threat Alerts for the Dashboard
      if (h._index.startsWith('sca-metrics')) {
        return {
          id: h._id,
          ...source,
          // Assign synthetic rule_id and level for Dashboard grouping
          rule_id: source.type === 'summary' ? 'SCA-SUMMARY' : 'SCA-CHECK',
          // Failed checks get Level 5 (Yellow), Summaries get Level 3 (Green)
          level: source.check_result === 'failed' ? 5 : 3,
          description: source.check_title || source.description || source.policy || "SCA Compliance Log",
          is_sca: true
        };
      }

      return {
        id: h._id,
        ...source
      };
    });

    if (viewType === 'raw') {
      // For Live Logs tab: Return raw, un-aggregated logs with true backend pagination
      const total = response.body.hits?.total?.value || 0;
      return NextResponse.json({ 
        data: hits,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // --- AGGREGATION LOGIC (For Main Dashboard) ---
    // Group identical attacks (e.g. Brute Force) by rule_id and agent_name
    // For SCA, group by check_title to avoid flooding
    const aggregatedMap = new Map();

    for (const hit of hits) {
      // For SCA checks, group by title. For Threats, group by rule_id
      const groupKey = hit.is_sca ? hit.description : hit.rule_id;
      const key = `${groupKey}_${hit.agent_name}`;
      
      if (aggregatedMap.has(key)) {
        const existing = aggregatedMap.get(key);
        existing.count += 1;
        // Keep the most recent timestamp
        if (new Date(hit['@timestamp']) > new Date(existing['@timestamp'])) {
          existing['@timestamp'] = hit['@timestamp'];
        }
      } else {
        aggregatedMap.set(key, { ...hit, count: 1 });
      }
    }

    let aggregatedResults = Array.from(aggregatedMap.values());

    // --- SORTING LOGIC ---
    // Focus on highest level first (DESC), then by newest timestamp (DESC)
    aggregatedResults.sort((a, b) => {
      const levelDiff = (b.level || 0) - (a.level || 0);
      if (levelDiff !== 0) return levelDiff;
      
      const timeA = new Date(a['@timestamp']).getTime();
      const timeB = new Date(b['@timestamp']).getTime();
      return timeB - timeA;
    });

    // Limit to top 50 to keep UI clean and performant
    return NextResponse.json({ data: aggregatedResults.slice(0, 50) });

  } catch (error) {
    console.error("OpenSearch Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch data from OpenSearch" }, { status: 500 });
  }
}
