// Shared in-memory state — all Maps live here so routes and socket handlers share the same references
const quizHistory = new Map();
const userProfiles = new Map();
const gameRooms = new Map();
const playerRooms = new Map();
const roomChartData = new Map();
const roomPlaybackState = new Map();

function generateSeededRandomData(symbol, seed, pointsCount = 300) {
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  const data = [];
  const startTime = Math.floor(Date.now() / 1000) - pointsCount;

  const symbolBases = {
    '^SET50.BK': 1035.0, 'SET50': 1035.0, 'GOLD': 2011.0, 'USD': 35.0,
    'PTT': 100.0, 'CPALL': 145.0, 'KBANK': 157.0, 'SCB': 129.0, 'BBL': 143.0, 'AOT': 67.0,
    'ADVANC': 190.0, 'INTUCH': 60.0, 'TU': 15.0, 'BDMS': 29.0,
    'KTB': 15.0, 'TRUE': 5.0, 'DTAC': 40.0, 'CP': 30.0, 'CPF': 25.0, 'MINT': 30.0,
    'CRC': 35.0, 'BGC': 15.0, 'HMPRO': 12.0, 'COM7': 25.0, 'OR': 20.0, 'BANPU': 10.0,
    'DELTA': 60.0, 'SAWAD': 45.0, 'PTTEP': 120.0, 'KCE': 50.0, 'SCC': 400.0, 'TISCO': 90.0, 'AP': 5.0,
    'HEMP': 2.0, 'LPN': 8.0, 'SPVI': 12.0, 'SMT': 15.0, 'PRINC': 3.0,
    'AAPL': 175.0, 'GOOGL': 2500.0, 'MSFT': 330.0, 'AMZN': 140.0, 'TSLA': 250.0,
    'NVDA': 800.0, 'META': 320.0, 'NFLX': 400.0
  };

  let currentPrice = symbolBases[symbol] || 100;
  const basePrice = currentPrice;

  for (let i = 0; i < pointsCount; i++) {
    const time = startTime + i;
    const randomValue1 = seededRandom(seed + i * 137);
    const trend = Math.sin(i / 50) * 0.002;
    const volatility = 0.015;
    const change = (randomValue1 - 0.5) * volatility + trend;
    currentPrice = currentPrice * (1 + change);
    const maxDeviation = 0.3;
    if (currentPrice > basePrice * (1 + maxDeviation)) currentPrice = basePrice * (1 + maxDeviation);
    if (currentPrice < basePrice * (1 - maxDeviation)) currentPrice = basePrice * (1 - maxDeviation);

    const openPrice = i === 0 ? basePrice : data[i - 1].close;
    const volatilityFactor = 0.01;
    const high = Math.max(openPrice, currentPrice) * (1 + seededRandom(seed + i * 353) * volatilityFactor);
    const low = Math.min(openPrice, currentPrice) * (1 - seededRandom(seed + i * 461) * volatilityFactor);

    data.push({
      time,
      open: Number(openPrice.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(currentPrice.toFixed(2)),
      volume: Math.floor(1000 + seededRandom(seed + i * 577) * 5000)
    });
  }

  return data;
}

module.exports = {
  quizHistory, userProfiles, gameRooms, playerRooms,
  roomChartData, roomPlaybackState,
  generateSeededRandomData
};
