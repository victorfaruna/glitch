export function elapsedTime(timestamp: string, start: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.parse(timestamp) - Date.parse(start)) / 1000),
  );
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
