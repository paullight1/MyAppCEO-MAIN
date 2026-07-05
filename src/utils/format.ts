/**
 * Shared formatting helpers.
 *
 * Centralises currency / number / percent / date formatting so pages don't
 * hand-roll `toLocaleString()` calls or `$` string concatenation (which ignore
 * locale, currency and produce inconsistent output across the app).
 *
 * All helpers are null/undefined/NaN safe and fall back to a stable placeholder.
 */

const PLACEHOLDER = '—';

/**
 * Platform currency. The marketplace, escrow and crowdfunding flows all charge
 * in NGN via Paystack, so NGN is the default everywhere a record does not carry
 * its own `currency`. `narrowSymbol` renders the ₦ glyph instead of the "NGN"
 * ISO code.
 */
export const DEFAULT_CURRENCY = 'NGN';

const isFiniteNumber = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

const toFiniteNumber = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const parsed = parseFloat(v);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

/** Format a value as currency, e.g. `1234.5` → `₦1,234.50` (or `₦1,235` when `maximumFractionDigits: 0`). */
export function formatCurrency(
    value: number | string | null | undefined,
    options: { currency?: string; maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
): string {
    const n = toFiniteNumber(value);
    if (n == null) return PLACEHOLDER;
    const { currency = DEFAULT_CURRENCY, maximumFractionDigits = 2, minimumFractionDigits } = options;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits,
        minimumFractionDigits: minimumFractionDigits ?? Math.min(maximumFractionDigits, 2),
    }).format(n);
}

/**
 * Compact currency for dashboards / axis ticks / cards, e.g. `12450` → `₦12.5K`, `2_300_000` → `₦2.3M`.
 */
export function formatCompactCurrency(
    value: number | string | null | undefined,
    options: { currency?: string; maximumFractionDigits?: number } = {}
): string {
    const n = toFiniteNumber(value);
    if (n == null) return PLACEHOLDER;
    const { currency = DEFAULT_CURRENCY, maximumFractionDigits = 1 } = options;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        notation: 'compact',
        maximumFractionDigits,
    }).format(n);
}

/** Format a plain number with grouping, e.g. `15420` → `15,420`. */
export function formatNumber(
    value: number | null | undefined,
    maximumFractionDigits = 0
): string {
    if (!isFiniteNumber(value)) return PLACEHOLDER;
    return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

/** Compact number, e.g. `15420` → `15.4K`, `2_300_000` → `2.3M`. */
export function formatCompactNumber(
    value: number | null | undefined,
    maximumFractionDigits = 1
): string {
    if (!isFiniteNumber(value)) return PLACEHOLDER;
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits,
    }).format(value);
}

/**
 * Format a percentage. Pass the value in whole-percent units by default
 * (`12.5` → `12.5%`); pass `{ fromRatio: true }` for `0.125` → `12.5%`.
 * `signed` prefixes a `+` for positive values (useful for deltas).
 */
export function formatPercent(
    value: number | null | undefined,
    options: { maximumFractionDigits?: number; signed?: boolean; fromRatio?: boolean } = {}
): string {
    if (!isFiniteNumber(value)) return PLACEHOLDER;
    const { maximumFractionDigits = 1, signed = false, fromRatio = false } = options;
    const pct = fromRatio ? value * 100 : value;
    const body = new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Math.abs(pct));
    const sign = pct < 0 ? '−' : signed ? '+' : '';
    return `${sign}${body}%`;
}

/** Format an ISO / Date value as a short date, e.g. `Jul 5, 2026`. */
export function formatDate(
    value: string | number | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
    if (value == null) return PLACEHOLDER;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return PLACEHOLDER;
    return new Intl.DateTimeFormat('en-US', options).format(date);
}

/** Human "time ago" string, e.g. `3 hours ago`, `just now`, `in 2 days`. */
export function formatRelativeTime(
    value: string | number | Date | null | undefined,
    now: Date = new Date()
): string {
    if (value == null) return PLACEHOLDER;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return PLACEHOLDER;

    const diffMs = date.getTime() - now.getTime();
    const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 1000 * 60 * 60 * 24 * 365],
        ['month', 1000 * 60 * 60 * 24 * 30],
        ['week', 1000 * 60 * 60 * 24 * 7],
        ['day', 1000 * 60 * 60 * 24],
        ['hour', 1000 * 60 * 60],
        ['minute', 1000 * 60],
    ];
    for (const [unit, ms] of units) {
        if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
    }
    return 'just now';
}

/** Format an ISO / Date value as a short date + time, e.g. `Jul 5, 2026, 3:40 PM`. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
    return formatDate(value, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/** Progress percentage of `raised` toward `goal`, clamped to 0–100. */
export function clampPercent(raised: number | null | undefined, goal: number | null | undefined): number {
    const r = Number(raised);
    const g = Number(goal);
    if (!Number.isFinite(r) || !Number.isFinite(g) || g <= 0) return 0;
    return Math.min(Math.max((r / g) * 100, 0), 100);
}

/**
 * Human-readable countdown to a deadline: `2d 4h left`, `5h 12m left`,
 * `12m left`, or `Expired` once the deadline has passed.
 */
export function formatTimeRemaining(deadline: string | number | Date | null | undefined): string {
    if (deadline == null) return PLACEHOLDER;
    const end = deadline instanceof Date ? deadline : new Date(deadline);
    if (Number.isNaN(end.getTime())) return PLACEHOLDER;
    const diff = end.getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
}

/** Whole days between now and a future date (0 if already past). */
export function daysRemaining(deadline: string | number | Date | null | undefined): number {
    if (deadline == null) return 0;
    const end = deadline instanceof Date ? deadline : new Date(deadline);
    if (Number.isNaN(end.getTime())) return 0;
    return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
}
