// Structured logging (section 58): one JSON line per event instead of
// ad-hoc console.error(string, obj) calls with an inconsistent shape.
// Easy to grep or feed into any log aggregator later.
//
// Deliberately never takes a free-form "message" string with
// interpolated data — callers pass an `event` name plus a fields
// object, and are expected to only include what's needed to debug
// (ids, statuses), never full personal data blobs (names, phone
// numbers, comments).

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

function log(level: LogLevel, event: string, fields: LogFields): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields: LogFields = {}) => log("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => log("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => log("error", event, fields),
};
