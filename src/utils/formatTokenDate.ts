/**
 * Token Date Formatting Utilities (v2.0)
 *
 * Consistent date/time formatting for token-related displays.
 * Uses the token's generated_at timestamp for accurate timing.
 */

/**
 * Formats a timestamp into a human-readable date + time string.
 * Example: "22 Mar 2026, 10:35 PM"
 */
export function formatGeneratedAt(isoString: string): string {
  const d = new Date(isoString);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${day} ${month} ${year}, ${time}`;
}

/**
 * Compact format for queue cards and constrained UI.
 * Example: "10:35 PM"
 */
export function formatGeneratedAtCompact(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date as DD/MM/YYYY for display.
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Format a date as YYYY-MM-DD for Supabase storage.
 */
export function formatForDB(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
