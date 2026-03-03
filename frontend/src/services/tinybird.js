const TINYBIRD_HOST = import.meta.env.VITE_TINYBIRD_HOST || 'https://api.us-east.tinybird.co'
const TINYBIRD_APPEND_TOKEN = import.meta.env.VITE_TINYBIRD_APPEND_TOKEN || 'your-append-token'
const TINYBIRD_READ_TOKEN = import.meta.env.VITE_TINYBIRD_READ_TOKEN || 'your-read-token'

// Name of the DataSource in Tinybird
const EVENTS_DATASOURCE = 'object_gaze_events'
// Name of the Pipe in Tinybird that aggregates the data
const RANKING_PIPE = 'top_viewed_objects'

/**
 * Tracks when a user looks at a specific 3D object in the canvas.
 * Sends an event to Tinybird via their Events API.
 *
 * @param {string} objectId - Identifier of the 3D object being viewed
 * @param {string} userId - Identifier of the user (e.g. Socket ID)
 */
export async function trackObjectGaze(objectId, userId) {
  const payload = {
    timestamp: new Date().toISOString(),
    object_id: objectId,
    user_id: userId,
    session_id: 'auto-generated', // For future session tracking
  }

  try {
    const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=${EVENTS_DATASOURCE}&token=${TINYBIRD_APPEND_TOKEN}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Tinybird error: ${response.statusText}`)
    }
    return true
  } catch (error) {
    console.error('Failed to track object gaze in Tinybird:', error)
    return false
  }
}

/**
 * Retrieves the real-time ranking of the most viewed 3D objects
 * from a Tinybird Pipe endpoint.
 *
 * @returns {Promise<Array>} Array of objects with object_id and view_count
 */
export async function getTopViewedObjects() {
  try {
    // Pipe endpoint returns aggregated JSON data
    const url = new URL(`${TINYBIRD_HOST}/v0/pipes/${RANKING_PIPE}.json`)
    url.searchParams.append('token', TINYBIRD_READ_TOKEN)

    // Example: append dynamic parameter to pipe if needed
    // url.searchParams.append('limit', 10)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Tinybird error: ${response.statusText}`)
    }

    const result = await response.json()
    // Tinybird JSON responses have a "data" array with the rows
    return result.data || []
  } catch (error) {
    console.error('Failed to get top viewed objects from Tinybird:', error)
    return []
  }
}
