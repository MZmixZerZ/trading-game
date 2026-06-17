// Lightweight market period helper used when creating rooms
// Returns a random historical start date tailored to the symbol type

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Heuristic buckets for how far back to start, based on symbol type
const BUCKETS = {
  index: { minDays: 90, maxDays: 720 },
  futures: { minDays: 30, maxDays: 365 },
  fx: { minDays: 30, maxDays: 365 },
  equity: { minDays: 60, maxDays: 540 },
  default: { minDays: 60, maxDays: 540 },
};

function classifySymbol(symbol) {
  const s = String(symbol || '').toUpperCase();
  if (s.includes('^')) return 'index';
  if (s.includes('USD') || s.includes('THB') || s.includes('EUR')) return 'fx';
  if (s.includes('GOLD') || s.includes('FUT') || s.endsWith('F')) return 'futures';
  if (/^[A-Z.-]+$/.test(s)) return 'equity';
  return 'default';
}

export function getRandomTimePeriod(symbol) {
  try {
    const type = classifySymbol(symbol);
    const { minDays, maxDays } = BUCKETS[type] || BUCKETS.default;
    const daysBack = randomInt(minDays, maxDays);
    const start = new Date();
    start.setDate(start.getDate() - daysBack);

    return {
      start: formatDate(start),
    };
  } catch (e) {
    // Fallback: 90 days ago
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return { start: formatDate(start) };
  }
}

const marketDataExports = { getRandomTimePeriod };
export default marketDataExports;
