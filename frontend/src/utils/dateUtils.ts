const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

/**
 * Parses either ISO ("2026-11-26") or formatted ("Nov 15, 2026") date strings
 * into a local midnight Date without timezone shift bugs.
 */
export function parseLibraryDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10)
    );
  }

  // Formatted: "Nov 15, 2026"
  const textMatch = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
  if (textMatch) {
    const month = MONTH_MAP[textMatch[1].toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(textMatch[3], 10), month, parseInt(textMatch[2], 10));
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return new Date();
}

export function formatDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const d = parseLibraryDate(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formats date as "Nov 24/26" (Mon DD/YY).
 */
export function formatShortSlashDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const d = parseLibraryDate(dateStr);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${month} ${day}/${year}`;
}

export function formatBillShortDate(dateStr?: string, offsetDays = 0): string {
  const base = dateStr ? parseLibraryDate(dateStr) : new Date();
  if (offsetDays !== 0) {
    base.setDate(base.getDate() + offsetDays);
  }
  const day = base.getDate();
  const month = base.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
}

export interface LoanTimingInfo {
  daysRemaining: number;
  daysLate: number;
  fineRupees: number;
  progressRatio: number; // 0.1 .. 1.0
  statusColor: 'green' | 'yellow' | 'red';
}

const FINE_RUPEES_PER_DAY = 2;

export function getLoanTimingInfo(issueDateStr: string, dueDateStr: string): LoanTimingInfo {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = parseLibraryDate(issueDateStr);
  const end = parseLibraryDate(dueDateStr);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.round((end.getTime() - todayMidnight.getTime()) / msPerDay);
  const daysLate = daysRemaining < 0 ? Math.abs(daysRemaining) : 0;
  const fineRupees = daysLate * FINE_RUPEES_PER_DAY;

  const totalSpan = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));
  const elapsed = Math.max(0, Math.round((todayMidnight.getTime() - start.getTime()) / msPerDay));
  const progressRatio = Math.min(1, Math.max(0.12, elapsed / totalSpan));

  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  if (daysRemaining <= 0) {
    statusColor = 'red';
  } else if (daysRemaining === 1) {
    statusColor = 'yellow';
  }

  return {
    daysRemaining,
    daysLate,
    fineRupees,
    progressRatio,
    statusColor
  };
}
