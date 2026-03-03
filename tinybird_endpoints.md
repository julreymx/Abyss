# Tinybird Endpoints Integration for OS_mental

This document outlines the API structure designed for integrating Tinybird into the OS_mental 3D Canvas.

## Data Source: object_gaze_events
Used to track what objects users are looking at in real-time.

**Endpoint:** `POST https://api.us-east.tinybird.co/v0/events?name=object_gaze_events`

**Schema expected by the Events API:**
```json
{
  "timestamp": "Datetime",
  "object_id": "String",
  "user_id": "String",
  "session_id": "String"
}
```

## Pipe: top_viewed_objects
An aggregated endpoint (Pipe) that returns the ranking of the most viewed objects.

**Endpoint:** `GET https://api.us-east.tinybird.co/v0/pipes/top_viewed_objects.json`

**Expected SQL Query in Tinybird Pipe:**
```sql
%
SELECT object_id, count(object_id) as views
FROM object_gaze_events
WHERE timestamp >= now() - interval 5 minute
GROUP BY object_id
ORDER BY views DESC
LIMIT {{Int32(limit, 10)}}
```

**Response Format:**
```json
{
  "meta": [
    { "name": "object_id", "type": "String" },
    { "name": "views", "type": "UInt64" }
  ],
  "data": [
    { "object_id": "crystal_01", "views": 150 },
    { "object_id": "gpu_fluid", "views": 89 }
  ],
  "rows": 2
}
```
