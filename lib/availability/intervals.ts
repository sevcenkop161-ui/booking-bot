// Plain millisecond-timestamp intervals. Kept separate from any timezone
// concerns — by the time code here runs, everything is already a UTC instant.

export interface Interval {
  start: number;
  end: number;
}

export function subtractIntervals(base: Interval[], remove: Interval[]): Interval[] {
  let result = base;
  for (const piece of remove) {
    result = result.flatMap((interval) => subtractOne(interval, piece));
  }
  return result;
}

function subtractOne(interval: Interval, remove: Interval): Interval[] {
  if (remove.end <= interval.start || remove.start >= interval.end) {
    return [interval];
  }
  const pieces: Interval[] = [];
  if (remove.start > interval.start) {
    pieces.push({ start: interval.start, end: remove.start });
  }
  if (remove.end < interval.end) {
    pieces.push({ start: remove.end, end: interval.end });
  }
  return pieces;
}
