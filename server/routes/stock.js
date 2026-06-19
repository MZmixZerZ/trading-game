const express = require('express');
const yahooFinance = require('yahoo-finance2').default;

const router = express.Router();

function mapSymbolForYahoo(symbol) {
  if (symbol.endsWith('.BK')) return symbol;
  if (symbol === 'GOLD') return 'GC=F';
  if (symbol === 'USD') return 'USDTHB=X';
  if (symbol === '^SET50.BK') return '^SET50.BK';
  const thaiStocks = ['PTT', 'CPALL', 'SCB', 'KBANK', 'AOT', 'ADVANC', 'BBL', 'BDMS'];
  if (thaiStocks.includes(symbol)) return symbol + '.BK';
  return symbol;
}

router.get('/quote/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const result = await yahooFinance.quote(symbol);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/intraday/:symbol', async (req, res) => {
  try {
    const rawSymbol = req.params.symbol.toUpperCase();
    const symbol = mapSymbolForYahoo(rawSymbol);
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;
    const result = await yahooFinance.chart(symbol, { interval: '1m', period1: now - oneDay, period2: now });

    if (!result.quotes || result.quotes.length === 0) {
      return res.status(200).json({ symbol, data: [], error: 'No intraday data available for this symbol.' });
    }
    const data = result.quotes
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open, high: q.high, low: q.low, close: q.close,
      }))
      .filter((d) => d.open !== null && d.high !== null && d.low !== null && d.close !== null && !isNaN(d.time));
    res.json({ symbol, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/random-intraday/:symbol', async (req, res) => {
  try {
    const rawSymbol = req.params.symbol.toUpperCase();
    const symbol = mapSymbolForYahoo(rawSymbol);
    const maxDays = 29;
    let data = [];
    let randomDate = null;
    let attempts = 0;
    let errorMsg = '';

    while (data.length === 0 && attempts < 15) {
      const randomDaysAgo = Math.floor(Math.random() * maxDays) + 1;
      const now = new Date();
      randomDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - randomDaysAgo);
      const day = randomDate.getDay();
      if (day === 0 || day === 6) { attempts++; continue; }

      const period1Date = new Date(randomDate);
      period1Date.setHours(0, 0, 0, 0);
      const period2Date = new Date(randomDate);
      period2Date.setHours(23, 59, 59, 999);

      try {
        const result = await yahooFinance.chart(symbol, {
          interval: '1m',
          period1: Math.floor(period1Date.getTime() / 1000),
          period2: Math.floor(period2Date.getTime() / 1000),
        });
        if (result.quotes && result.quotes.length > 0) {
          data = result.quotes
            .map((q) => ({
              time: Math.floor(new Date(q.date).getTime() / 1000),
              open: q.open, high: q.high, low: q.low, close: q.close,
            }))
            .filter((d) => d.open !== null && d.high !== null && d.low !== null && d.close !== null && !isNaN(d.time));
        } else {
          errorMsg = 'No intraday data available for this symbol on this date.';
        }
      } catch (err) {
        errorMsg = err.message;
      }
      attempts++;
    }

    if (data.length === 0) {
      const now = new Date();
      for (let i = 1; i <= maxDays; i++) {
        const fallbackDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const day = fallbackDate.getDay();
        if (day === 0 || day === 6) continue;

        const period1Date = new Date(fallbackDate);
        period1Date.setHours(0, 0, 0, 0);
        const period2Date = new Date(fallbackDate);
        period2Date.setHours(23, 59, 59, 999);

        try {
          const result = await yahooFinance.chart(symbol, {
            interval: '1m',
            period1: Math.floor(period1Date.getTime() / 1000),
            period2: Math.floor(period2Date.getTime() / 1000),
          });
          if (result.quotes && result.quotes.length > 0) {
            data = result.quotes
              .map((q) => ({
                time: Math.floor(new Date(q.date).getTime() / 1000),
                open: q.open, high: q.high, low: q.low, close: q.close,
              }))
              .filter((d) => d.open !== null && d.high !== null && d.low !== null && d.close !== null && !isNaN(d.time));
            randomDate = fallbackDate;
            break;
          }
        } catch (err) {
          errorMsg = err.message;
        }
      }
    }

    if (data.length === 0) {
      return res.status(200).json({
        symbol, data: [],
        date: randomDate ? randomDate.toISOString().slice(0, 10) : null,
        error: errorMsg,
      });
    }
    res.json({ symbol, data, date: randomDate.toISOString().slice(0, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
