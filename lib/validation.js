// Room names are W|E + number + N|S + number, e.g. "W1N1", "E10S5".
const ROOM_NAME_RE = /^[WE]\d+[NS]\d+$/

function isRoomName (value) {
  return typeof value === 'string' && ROOM_NAME_RE.test(value)
}

function parseRoomCoordinate (value) {
  // Keep integer strings used by form clients. Do not truncate or coerce
  // malformed values (arrays, null, empty strings, fractional coordinates).
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) {
    return NaN
  }
  const coordinate = Number(value)
  return isValidCoordinate(coordinate) ? coordinate : NaN
}

function isValidCoordinate (value) {
  return Number.isInteger(value) && value >= 0 && value <= 49
}

module.exports = { isRoomName, parseRoomCoordinate, isValidCoordinate }
