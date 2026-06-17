// API สำหรับดึงข้อมูลตลาดหุ้นไทยและ TFEX
// ใช้ข้อมูลเกมที่สมจริงเป็นหลัก พร้อม fallback สำหรับ API จริง

import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// กำหนดข้อมูลพื้นฐานสำหรับแต่ละสัญลักษณ์
// eslint-disable-next-line no-unused-vars
const STOCK_BASE_DATA = {
  TFEX: {
    "^SET50.BK": {
      basePrice: 1035.62,
      volatility: 0.0008,
      trend: -0.0001,
      volumeBase: 5000000,
      name: "SET50 Index",
    },
    GOLD: {
      basePrice: 2011.5,
      volatility: 0.0012,
      trend: -0.0002,
      volumeBase: 1000000,
      name: "Gold Futures",
    },
    USD: {
      basePrice: 35.45,
      volatility: 0.0003,
      trend: 0.0001,
      volumeBase: 10000000,
      name: "USD/THB",
    },
    OIL: {
      basePrice: 82.75,
      volatility: 0.0015,
      trend: 0.0003,
      volumeBase: 2000000,
      name: "Crude Oil Futures",
    },
    RUBBER: {
      basePrice: 58.25,
      volatility: 0.0020,
      trend: -0.0004,
      volumeBase: 500000,
      name: "Rubber Futures",
    },
  },
  SET: {
    PTT: {
      basePrice: 100.48,
      volatility: 0.0015,
      trend: 0.0002,
      volumeBase: 8000000,
      name: "PTT Public Company Limited",
    },
    CPALL: {
      basePrice: 144.61,
      volatility: 0.0018,
      trend: -0.0001,
      volumeBase: 6000000,
      name: "CP ALL Public Company Limited",
    },
    KBANK: {
      basePrice: 156.75,
      volatility: 0.002,
      trend: 0.0001,
      volumeBase: 5000000,
      name: "KASIKORNBANK Public Company Limited",
    },
    SCB: {
      basePrice: 128.5,
      volatility: 0.0017,
      trend: -0.0002,
      volumeBase: 4500000,
      name: "The Siam Commercial Bank Public Company Limited",
    },
    AOT: {
      basePrice: 67.25,
      volatility: 0.0022,
      trend: 0.0003,
      volumeBase: 9000000,
      name: "Airports of Thailand Public Company Limited",
    },
    ADVANC: {
      basePrice: 189.5,
      volatility: 0.0014,
      trend: -0.0001,
      volumeBase: 3500000,
      name: "Advanced Info Service Public Company Limited",
    },
    BBL: {
      basePrice: 142.75,
      volatility: 0.0016,
      trend: 0.0001,
      volumeBase: 4000000,
      name: "Bangkok Bank Public Company Limited",
    },
    BDMS: {
      basePrice: 28.75,
      volatility: 0.0025,
      trend: 0.0002,
      volumeBase: 7000000,
      name: "Bangkok Dusit Medical Services Public Company Limited",
    },
    // Additional SET symbols
    INTUCH: {
      basePrice: 60.0,
      volatility: 0.002,
      trend: 0.0001,
      volumeBase: 2000000,
      name: "Intouch Holdings Public Company Limited",
    },
    TU: {
      basePrice: 15.0,
      volatility: 0.003,
      trend: 0.0002,
      volumeBase: 8000000,
      name: "Thai Union Group Public Company Limited",
    },
    KTB: {
      basePrice: 15.0,
      volatility: 0.0018,
      trend: 0.0001,
      volumeBase: 12000000,
      name: "Krung Thai Bank Public Company Limited",
    },
    TRUE: {
      basePrice: 5.0,
      volatility: 0.004,
      trend: 0.0003,
      volumeBase: 25000000,
      name: "True Corporation Public Company Limited",
    },
    DTAC: {
      basePrice: 40.0,
      volatility: 0.0025,
      trend: -0.0001,
      volumeBase: 3000000,
      name: "Total Access Communication Public Company Limited",
    },
    CP: {
      basePrice: 30.0,
      volatility: 0.002,
      trend: 0.0001,
      volumeBase: 5000000,
      name: "Charoen Pokphand Foods Public Company Limited",
    },
    CPF: {
      basePrice: 25.0,
      volatility: 0.0022,
      trend: 0.0002,
      volumeBase: 6000000,
      name: "Charoen Pokphand Foods Public Company Limited",
    },
    MINT: {
      basePrice: 30.0,
      volatility: 0.0024,
      trend: 0.0001,
      volumeBase: 4000000,
      name: "Minor International Public Company Limited",
    },
    CRC: {
      basePrice: 35.0,
      volatility: 0.0021,
      trend: 0.0002,
      volumeBase: 3500000,
      name: "Central Retail Corporation Public Company Limited",
    },
    BGC: {
      basePrice: 15.0,
      volatility: 0.003,
      trend: 0.0001,
      volumeBase: 2500000,
      name: "Berli Jucker Public Company Limited",
    },
    HMPRO: {
      basePrice: 12.0,
      volatility: 0.0025,
      trend: 0.0002,
      volumeBase: 8000000,
      name: "Home Product Center Public Company Limited",
    },
    COM7: {
      basePrice: 25.0,
      volatility: 0.0028,
      trend: 0.0003,
      volumeBase: 1500000,
      name: "COM7 Public Company Limited",
    },
    OR: {
      basePrice: 20.0,
      volatility: 0.0019,
      trend: 0.0001,
      volumeBase: 9000000,
      name: "PTT Oil and Retail Business Public Company Limited",
    },
    BANPU: {
      basePrice: 10.0,
      volatility: 0.0035,
      trend: 0.0002,
      volumeBase: 15000000,
      name: "Banpu Public Company Limited",
    },
    DELTA: {
      basePrice: 60.0,
      volatility: 0.0026,
      trend: 0.0003,
      volumeBase: 1200000,
      name: "Delta Electronics (Thailand) Public Company Limited",
    },
    SAWAD: {
      basePrice: 45.0,
      volatility: 0.0032,
      trend: 0.0004,
      volumeBase: 800000,
      name: "Srisawad Corporation Public Company Limited",
    },
    PTTEP: {
      basePrice: 120.0,
      volatility: 0.0023,
      trend: 0.0002,
      volumeBase: 3000000,
      name: "PTT Exploration and Production Public Company Limited",
    },
    KCE: {
      basePrice: 50.0,
      volatility: 0.0027,
      trend: 0.0001,
      volumeBase: 1800000,
      name: "KCE Electronics Public Company Limited",
    },
    SCC: {
      basePrice: 400.0,
      volatility: 0.0015,
      trend: 0.0001,
      volumeBase: 800000,
      name: "The Siam Cement Public Company Limited",
    },
    TISCO: {
      basePrice: 90.0,
      volatility: 0.002,
      trend: 0.0002,
      volumeBase: 2200000,
      name: "Tisco Financial Group Public Company Limited",
    },
    AP: {
      basePrice: 5.0,
      volatility: 0.0035,
      trend: 0.0003,
      volumeBase: 20000000,
      name: "AP (Thailand) Public Company Limited",
    },
  },
  MAI: {
    HEMP: {
      basePrice: 2.0,
      volatility: 0.005,
      trend: 0.0005,
      volumeBase: 5000000,
      name: "Natural Park Public Company Limited",
    },
    LPN: {
      basePrice: 8.0,
      volatility: 0.0045,
      trend: 0.0003,
      volumeBase: 3000000,
      name: "LPN Development Public Company Limited",
    },
    SPVI: {
      basePrice: 12.0,
      volatility: 0.004,
      trend: 0.0004,
      volumeBase: 2000000,
      name: "SPI Spirits Public Company Limited",
    },
    SMT: {
      basePrice: 15.0,
      volatility: 0.0038,
      trend: 0.0002,
      volumeBase: 1500000,
      name: "SMT Corporation Public Company Limited",
    },
    PRINC: {
      basePrice: 3.0,
      volatility: 0.006,
      trend: 0.0006,
      volumeBase: 8000000,
      name: "Principal Capital Public Company Limited",
    },
  },
  US: {
    AAPL: {
      basePrice: 175.0,
      volatility: 0.002,
      trend: 0.0002,
      volumeBase: 50000000,
      name: "Apple Inc.",
    },
    GOOGL: {
      basePrice: 2500.0,
      volatility: 0.0025,
      trend: 0.0003,
      volumeBase: 1500000,
      name: "Alphabet Inc.",
    },
    MSFT: {
      basePrice: 330.0,
      volatility: 0.0022,
      trend: 0.0002,
      volumeBase: 25000000,
      name: "Microsoft Corporation",
    },
    AMZN: {
      basePrice: 140.0,
      volatility: 0.0028,
      trend: 0.0001,
      volumeBase: 35000000,
      name: "Amazon.com Inc.",
    },
    TSLA: {
      basePrice: 250.0,
      volatility: 0.004,
      trend: 0.0004,
      volumeBase: 80000000,
      name: "Tesla Inc.",
    },
    NVDA: {
      basePrice: 800.0,
      volatility: 0.0035,
      trend: 0.0005,
      volumeBase: 40000000,
      name: "NVIDIA Corporation",
    },
    META: {
      basePrice: 320.0,
      volatility: 0.003,
      trend: 0.0003,
      volumeBase: 20000000,
      name: "Meta Platforms Inc.",
    },
    NFLX: {
      basePrice: 400.0,
      volatility: 0.0032,
      trend: 0.0002,
      volumeBase: 8000000,
      name: "Netflix Inc.",
    },
  },
};

// เก็บข้อมูลราคาปัจจุบันในหน่วยความจำ
let currentPrices = {};

// ฟังก์ชันแปลง symbol สำหรับ Yahoo Finance
const mapSymbolForYahoo = (market, symbol) => {
  if (market === "SET" || market === "MAI") return `${symbol}.BK`;
  if (market === "TFEX" && symbol === "USD") return "USDTHB=X";
  if (market === "TFEX" && symbol === "GOLD") return "GC=F";
  if (market === "TFEX" && symbol === "^SET50.BK") return "^SET50.BK";
  if (market === "US") return symbol; // US symbols use their original ticker
  return symbol;
};

// ฟังก์ชันหลักสำหรับดึงข้อมูล
export const fetchStockData = async (market, symbol) => {
  try {
    if (!market || !symbol) throw new Error("Market and symbol are required");
    const yahooSymbol = mapSymbolForYahoo(market, symbol);
    // ดึงข้อมูลจริงจาก backend
    const res = await axios.get(`${API_BASE_URL}/api/quote/${yahooSymbol}`);
    const data = res.data;
    // สร้างข้อมูลกราฟย้อนหลัง 24 ชั่วโมง (1440 จุด, 1 นาที/จุด)
    const now = new Date();
    const chartData = [];
    for (let i = 1439; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000); // ทุก 1 นาที
      chartData.push({
        time: Math.floor(timestamp.getTime() / 1000), // unix timestamp (seconds)
        price: data.regularMarketPrice,
        volume: data.regularMarketVolume || 0,
        timestamp: timestamp.getTime(),
      });
    }
    return {
      success: true,
      data: chartData,
      currentPrice: data.regularMarketPrice,
      previousClose: data.regularMarketPreviousClose,
      priceChange: data.regularMarketChange,
      percentChange: data.regularMarketChangePercent,
      symbol: data.symbol,
      market: market,
      name: data.shortName,
      isSimulated: false,
    };
  } catch (error) {
    console.error("Stock API Error (real):", error.message);
    return {
      success: false,
      error: error.message,
      data: [],
      currentPrice: 0,
      previousClose: 0,
      priceChange: 0,
    };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลราคาปัจจุบันอย่างเดียว
export const fetchCurrentPrice = async (market, symbol) => {
  try {
    if (!market || !symbol) throw new Error("Market and symbol are required");
    const yahooSymbol = mapSymbolForYahoo(market, symbol);
    const res = await axios.get(`${API_BASE_URL}/api/quote/${yahooSymbol}`);
    const data = res.data;
    return {
      success: true,
      currentPrice: data.regularMarketPrice,
      previousClose: data.regularMarketPreviousClose,
      priceChange: data.regularMarketChange,
      percentChange: data.regularMarketChangePercent,
      isSimulated: false,
    };
  } catch (error) {
    console.error("Current Price Error (real):", error.message);
    return {
      success: false,
      error: error.message,
      currentPrice: 0,
      previousClose: 0,
      priceChange: 0,
    };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลตลาดทั้งหมด
export const fetchMarketOverview = async () => {
  try {
    // สร้างข้อมูลภาพรวมตลาด
    const markets = {
      SET: {
        index: 1567.82 + (Math.random() - 0.5) * 20,
        change: (Math.random() - 0.5) * 30,
        percentChange: ((Math.random() - 0.5) * 2).toFixed(2),
        volume: Math.floor(45678000000 * (0.8 + Math.random() * 0.4)),
        topGainers: [
          {
            symbol: "KBANK",
            name: "KASIKORNBANK",
            price: currentPrices["SET:KBANK"] || 156.75,
            change: 3.25,
            percentChange: 2.12,
          },
          {
            symbol: "AOT",
            name: "Airports of Thailand",
            price: currentPrices["SET:AOT"] || 67.25,
            change: 1.25,
            percentChange: 1.89,
          },
          {
            symbol: "ADVANC",
            name: "Advanced Info Service",
            price: currentPrices["SET:ADVANC"] || 189.5,
            change: 2.5,
            percentChange: 1.34,
          },
        ],
        topLosers: [
          {
            symbol: "PTT",
            name: "PTT Public Company",
            price: currentPrices["SET:PTT"] || 100.48,
            change: -1.52,
            percentChange: -1.49,
          },
          {
            symbol: "CPALL",
            name: "CP ALL",
            price: currentPrices["SET:CPALL"] || 144.61,
            change: -0.63,
            percentChange: -0.44,
          },
          {
            symbol: "BBL",
            name: "Bangkok Bank",
            price: currentPrices["SET:BBL"] || 142.75,
            change: -0.5,
            percentChange: -0.35,
          },
        ],
      },
      TFEX: {
        products: [
          {
            symbol: "^SET50.BK",
            name: "SET50 Index",
            price: currentPrices["TFEX:^SET50.BK"] || 1035.62,
            change: -3.82,
            percentChange: -0.37,
          },
          {
            symbol: "GOLD",
            name: "Gold Futures",
            price: currentPrices["TFEX:GOLD"] || 2011.5,
            change: -4.82,
            percentChange: -0.24,
          },
          {
            symbol: "USD",
            name: "USD/THB",
            price: currentPrices["TFEX:USD"] || 35.45,
            change: 0.15,
            percentChange: 0.42,
          },
        ],
      },
    };

    return {
      success: true,
      data: markets,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Market Overview Error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ฟังก์ชันสำหรับรีเซ็ตราคาทั้งหมด (สำหรับการทดสอบ)
export const resetAllPrices = () => {
  currentPrices = {};
};

// ฟังก์ชันสำหรับดูราคาปัจจุบันทั้งหมด (สำหรับการ debug)
export const getCurrentPrices = () => {
  return { ...currentPrices };
};

// Resolve base profile for a given market symbol
export const getBaseProfile = (market, symbol) => {
  if (!symbol) return null;
  
  // First try the specific market
  const prof = (STOCK_BASE_DATA[market]?.[symbol])
    // Fallback to other markets if not found
    || (STOCK_BASE_DATA.TFEX?.[symbol])
    || (STOCK_BASE_DATA.SET?.[symbol])
    || (STOCK_BASE_DATA.MAI?.[symbol])
    || (STOCK_BASE_DATA.US?.[symbol])
    || null;
    
  return prof || { basePrice: 100, volatility: 0.001, trend: 0, volumeBase: 100000, name: symbol };
};

// Generate next 1-second OHLC tick using Thai market base data and difficulty factors
// options: { volatility: number, trendStrength: number, noiseLevel: number }
export const simulateNextTick = (market, symbol, lastPoint, options = {}) => {
  const base = getBaseProfile(market, symbol);
  const lastClose = (lastPoint?.close ?? lastPoint?.price ?? lastPoint?.value ?? base.basePrice);
  const lastTime = (lastPoint?.time ?? Math.floor(Date.now() / 1000));

  // Scale per-minute params down to per-second
  const volFactor = Math.max(0, options.volatility ?? 1);
  const trendFactor = Math.max(0, options.trendStrength ?? 1);
  const noiseLevel = Math.max(0, options.noiseLevel ?? 0.4);

  const perMinuteVol = base.volatility * volFactor; // relative to price
  const perSecondVol = perMinuteVol / 60;
  const perSecondTrend = (base.trend * trendFactor) / 60;

  // Random walk with drift
  const rand = (Math.random() - 0.5) * (1 + noiseLevel);
  const deltaRel = perSecondTrend + rand * perSecondVol; // relative change
  let nextClose = lastClose * (1 + deltaRel);
  if (!isFinite(nextClose) || nextClose <= 0) nextClose = Math.max(0.01, lastClose);

  // Synthesize OHLC around close
  const spread = Math.max(0.001 * lastClose, Math.abs(lastClose - nextClose) * 0.6);
  const open = lastClose;
  const high = Math.max(open, nextClose) + Math.random() * spread;
  const low = Math.min(open, nextClose) - Math.random() * spread;
  const volume = Math.floor((base.volumeBase || 100000) * (0.4 + Math.random() * 0.6) / (60 * 6.5));

  const time = lastTime + 1; // +1 second
  const point = {
    time,
    timestamp: time * 1000,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(nextClose.toFixed(2)),
    volume,
  };

  // Persist current price snapshot
  currentPrices[`${market}:${symbol}`] = point.close;
  return point;
};

// ฟังก์ชันสำหรับดึงข้อมูล intraday 1 นาที 1 วันเต็ม (จาก backend ใหม่)
export const fetchIntradayData = async (symbol) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/intraday/${symbol}`);
    return res.data;
  } catch (error) {
    console.error("Intraday API Error:", error.message);
    return { symbol, data: [] };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูล intraday 1 วัน (ย้อนหลังแบบสุ่ม)
export const fetchRandomIntradayData = async (symbol) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/random-intraday/${symbol}`);
    return res.data;
  } catch (error) {
    console.error("Random Intraday API Error:", error.message);
    return { symbol, data: [], date: null };
  }
};

export const fetchRandomMultiDayIntradayData = async (symbol, volatility = 1.0, trendStrength = 0.5, noiseLevel = 0.4) => {
  try {
    // สำหรับ Multiplayer ใช้ fallback data เสมอเพื่อควบคุมความเสถียร
    return generateFallbackIntradayData(symbol, volatility, trendStrength, noiseLevel);
    
  } catch (error) {
    console.error("❌ API Error:", error.message);
    return generateFallbackIntradayData(symbol, volatility, trendStrength, noiseLevel);
  }
};

// ฟังก์ชัน Smoothing ข้อมูลกราฟ - ปรับให้เหมาะกับ Multiplayer
export const smoothChartData = (data, difficulty = 'medium', isMultiplayer = false) => {
  if (!data || data.length < 3) return data;
  
  const smoothed = [...data];
  
  // สำหรับ Multiplayer ใช้การ smooth ที่เข้มข้นกว่า
  const smoothingPasses = isMultiplayer ? 2 : 1;
  const maxChangePercent = isMultiplayer ? 0.01 : 0.02; // ลดการเปลี่ยนแปลงสำหรับ Multiplayer
  
  for (let pass = 0; pass < smoothingPasses; pass++) {
    // Moving Average Filter (3-point)
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const curr = smoothed[i];
      const next = smoothed[i + 1];
      
      // ปรับราคา close ด้วย moving average
      const prevPrice = prev.close || prev.price || prev.value || 0;
      const currPrice = curr.close || curr.price || curr.value || 0;
      const nextPrice = next.close || next.price || next.value || 0;
      
      const smoothedPrice = (prevPrice + currPrice + nextPrice) / 3;
      
      // จำกัดการเปลี่ยนแปลงให้เหมาะกับ difficulty
      const maxChange = currPrice * maxChangePercent;
      const change = smoothedPrice - currPrice;
      const limitedChange = Math.max(-maxChange, Math.min(maxChange, change));
      
      if (smoothed[i].close !== undefined) {
        smoothed[i].close = Number((currPrice + limitedChange).toFixed(4));
        smoothed[i].price = smoothed[i].close;
      } else if (smoothed[i].price !== undefined) {
        smoothed[i].price = Number((currPrice + limitedChange).toFixed(4));
      } else if (smoothed[i].value !== undefined) {
        smoothed[i].value = Number((currPrice + limitedChange).toFixed(4));
      }
    }
  }
  
  return smoothed;
};

// Generate fallback intraday data with volatility settings - เหมาะสำหรับ Multiplayer
const generateFallbackIntradayData = (symbol, volatility = 1.0, trendStrength = 0.5, noiseLevel = 0.4) => {
  const baseData = STOCK_BASE_DATA.SET[symbol] || STOCK_BASE_DATA.TFEX[symbol] || {
    basePrice: 32.00, // ราคาเริ่มต้นที่เหมาะสม
    volatility: 0.005, // ลดความผันผวน
    trend: 0.0001,
    name: symbol
  };
  
  const data = [];
  // สำหรับ Multiplayer ใช้ข้อมูลที่เหมาะสม
  const totalPoints = 300; // ลดจำนวนจุดเป็น 300 จุด (5 ชั่วโมง)
  
  let currentPrice = baseData.basePrice;
  const baseTime = Math.floor(Date.now() / 1000) - totalPoints; // เวลาในรูปแบบ Unix timestamp
  
  for (let i = 0; i < totalPoints; i++) {
    // Apply difficulty settings แบบนุ่มนวล
    const adjustedVolatility = baseData.volatility * volatility * 0.5; // ลดความผันผวนอีก 50%
    const adjustedTrend = baseData.trend * trendStrength * 0.3; // ลด trend
    const noise = (Math.random() - 0.5) * noiseLevel * 0.005; // ลด noise
    
    // Generate realistic price movement แบบเรียบ
    const change = (Math.random() - 0.5) * adjustedVolatility * currentPrice + 
                   adjustedTrend * currentPrice + 
                   noise * currentPrice;
    
    // จำกัดการเปลี่ยนแปลงราคาให้เหมาะสม
    const maxChangePercent = 0.001; // 0.1% max change per tick
    const limitedChange = Math.max(-currentPrice * maxChangePercent, 
                                   Math.min(currentPrice * maxChangePercent, change));
    
    currentPrice = Math.max(currentPrice + limitedChange, baseData.basePrice * 0.95);
    currentPrice = Math.min(currentPrice, baseData.basePrice * 1.05);
    
    const timestamp = baseTime + i; // เพิ่มทีละ 1 วินาที
    const volume = Math.floor(Math.random() * 100000) + 10000; // ลด volume
    
    // Generate proper OHLC data แบบเรียบ
    const open = i === 0 ? baseData.basePrice : data[i-1].close;
    const close = currentPrice;
    
    // สร้าง high/low ที่แตกต่างน้อย
    const priceRange = Math.abs(close - open) * 0.2 + (adjustedVolatility * currentPrice * 0.1);
    const high = Math.max(open, close) + (Math.random() * priceRange * 0.3);
    const low = Math.min(open, close) - (Math.random() * priceRange * 0.3);
    
    data.push({
      time: timestamp,
      open: Number(open.toFixed(4)),
      high: Number(Math.max(open, close, high).toFixed(4)),
      low: Number(Math.min(open, close, low).toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: volume
    });
  }
  
  return data;
};

// Generate fallback data when API fails (legacy function - kept for compatibility)
// eslint-disable-next-line no-unused-vars
const generateFallbackData = (symbol, days = 5) => {
  const baseData = STOCK_BASE_DATA.TFEX[symbol] || STOCK_BASE_DATA.SET[symbol] || {
    basePrice: 100,
    volatility: 0.001,
    trend: 0,
    name: symbol
  };
  
  const data = [];
  const pointsPerDay = 390; // 6.5 hours * 60 minutes
  const totalPoints = days * pointsPerDay;
  let currentPrice = baseData.basePrice;
  
  for (let i = 0; i < totalPoints; i++) {
    // Random walk with trend
    const change = (Math.random() - 0.5) * baseData.volatility * currentPrice + baseData.trend * currentPrice;
    currentPrice = Math.max(currentPrice + change, currentPrice * 0.95); // ป้องกันราคาติดลบ
    
    const timestamp = Date.now() - (totalPoints - i) * 60000; // 1 minute intervals
    
    data.push({
      timestamp: timestamp,
      time: Math.floor(timestamp / 1000),
      close: Number(currentPrice.toFixed(2)),
      open: Number((currentPrice + (Math.random() - 0.5) * 0.5).toFixed(2)),
      high: Number((currentPrice + Math.random() * 1).toFixed(2)),
      low: Number((currentPrice - Math.random() * 1).toFixed(2)),
      volume: Math.floor(Math.random() * 10000) + 1000
    });
  }
  
  return data;
};

export const fetchIntradayDataBySymbolAndDate = async (symbol, startDate, days = 5) => {
  try {
    const reqs = [];
    let date = new Date(startDate);
    for (let i = 0; i < days; i++) {
      const dateStr = date.toISOString().split("T")[0];
      reqs.push(
        axios.get(`${API_BASE_URL}/api/intraday/${symbol}?date=${dateStr}`)
      );
      // เพิ่มวันถัดไป
      date.setDate(date.getDate() + 1);
    }
    const all = await Promise.all(reqs);
    let allData = [];
    let allDates = [];
    all.forEach(res => {
      if (res.data && res.data.data && res.data.data.length > 0) {
        allData = allData.concat(res.data.data);
        allDates.push(res.data.date || null);
      }
    });
    return { symbol, data: allData, dateList: allDates };
  } catch (error) {
    console.error("Intraday By Symbol/Date API Error:", error.message);
    return { symbol, data: [], dateList: null };
  }
};