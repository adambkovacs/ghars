export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function daysBetween(later: Date, earlier?: Date | null): number {
  if (!earlier) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

export function normalizeRecentness(days: number, maxDays: number): number {
  if (!Number.isFinite(days)) {
    return 0;
  }

  return clamp(1 - days / maxDays, 0, 1);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function monthBucket(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}
