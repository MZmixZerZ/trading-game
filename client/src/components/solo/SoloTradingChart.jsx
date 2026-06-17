"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createChart } from 'lightweight-charts'
// Tutorial-like clean chart: remove toolbars

const SoloTradingChart = ({ 
  market, 
  symbol, 
  playbackTime = null, 
  startPlayback = false, 
  isPlaying: externalIsPlaying = null, // External playing state from parent
  difficulty = 'medium', 
  theme = 'dark',
  onDataLoaded, 
  onCurrentPriceChange,
  maxVisibleBars = 200, // เพิ่มข้อมูลให้มากขึ้นเพื่อการ zoom/pan
  isInteractive = true, // เปิดใช้งานการโต้ตอบ
  enableZoom = true, // เปิดใช้งานการซูม
  enablePan = true, // เปิดใช้งานการแพน
  playbackSpeed = 1, // ความเร็วในการเล่น
  isPaused = false, // สถานะการหยุด
  seed = null, // ระบบ seed สำหรับกราฟเดียวกัน
  roomCode = null // รหัสห้องสำหรับ multiplayer
}) => {
  // Chart refs
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const isDisposedRef = useRef(false);
  const seriesTypeRef = useRef('candlestick');
  const chartDataRef = useRef([]);
  const hasInitialFitRef = useRef(false); // ติดตามว่าได้ fit ครั้งแรกแล้วหรือยัง
  const userInteractedRef = useRef(false); // ติดตามว่า user ได้ zoom/pan หรือยัง
  const timeoutsRef = useRef([]); // รวม timeout IDs เพื่อเคลียร์ระหว่าง unmount

  // Utility function to safely add timeout with tracking
  const addTrackedTimeout = useCallback((fn, delay) => {
    const timeoutId = setTimeout(() => {
      // Remove from tracking array when executed
      timeoutsRef.current = timeoutsRef.current.filter(id => id !== timeoutId);
      if (!isDisposedRef.current) {
        fn();
      }
    }, delay);
    timeoutsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Cleanup all tracked timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    timeoutsRef.current = [];
  }, []);

  // UI State
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setCurrentPrice] = useState(0);
  const [activeChartType] = useState('candlestick'); // State without setter since not needed
  const [showGrid] = useState(false) // ปิด Grid เป็นค่าเริ่มต้น

  // Force crosshair settings function
  const forceCrosshairSettings = useCallback(() => {
    try {
      if (!chartRef.current || isDisposedRef.current) return;
      
      const crosshairOptions = {
        crosshair: {
          mode: 0,
          vertLine: {
            visible: true,
            labelVisible: true,
            color: theme === 'dark' ? '#9598A1' : '#787B86',
            width: 1,
            style: 3,
          },
          horzLine: {
            visible: false, // บังคับปิดเส้นแนวนอน 100%
            labelVisible: false,
            color: 'transparent',
            width: 0,
            style: 0,
          },
        },
      };
      
      if (chartRef.current && !isDisposedRef.current) {
        chartRef.current.applyOptions(crosshairOptions);
        // Force หลายครั้งเพื่อให้แน่ใจ - แต่ track timeouts
        addTrackedTimeout(() => {
          try {
            if (chartRef.current && !isDisposedRef.current) {
              chartRef.current.applyOptions(crosshairOptions);
            }
          } catch (e) {
            console.warn('Error applying crosshair options (retry 1):', e);
          }
        }, 10);
        addTrackedTimeout(() => {
          try {
            if (chartRef.current && !isDisposedRef.current) {
              chartRef.current.applyOptions(crosshairOptions);
            }
          } catch (e) {
            console.warn('Error applying crosshair options (retry 2):', e);
          }
        }, 50);
        addTrackedTimeout(() => {
          try {
            if (chartRef.current && !isDisposedRef.current) {
              chartRef.current.applyOptions(crosshairOptions);
            }
          } catch (e) {
            console.warn('Error applying crosshair options (retry 3):', e);
          }
        }, 100);
      }
    } catch (e) {
      console.warn('Error in forceCrosshairSettings:', e);
    }
  }, [theme, addTrackedTimeout]);

  // Function removed as it was unused

  // Playback state
  const TOTAL_POINTS = 1800;
  const simDataRef = useRef([]);
  const playbackRef = useRef(null);
  
  // Seeded Random Number Generator for consistent charts across players
  const createSeededRandom = useCallback((seedValue) => {
    let seed = seedValue || Math.floor(Math.random() * 1000000);
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }, []);

  // Use seed from props, roomCode, or create one
  const getChartSeed = useCallback(() => {
    if (seed !== null) return seed;
    if (roomCode) return roomCode.charCodeAt(0) * 1000 + roomCode.charCodeAt(roomCode.length - 1);
    return Date.now() % 1000000; // Fallback to time-based seed
  }, [seed, roomCode]);

  const seededRandom = useMemo(() => createSeededRandom(getChartSeed()), [createSeededRandom, getChartSeed]);
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [speed] = useState(1); // Keep old state for compatibility
  const [, setPlaybackIdx] = useState(0);
  
  // Chart recreation protection
  const chartCreationTimeoutRef = useRef(null);
  const [isRealTradingMode] = useState(false);

  // Difficulty settings - ปรับให้ใกล้เคียงตลาดจริง (Hard/Expert ใช้ความผันผวนสุดโต่ง)
  const difficultySettings = useMemo(() => {
    switch (difficulty) {
      case 'easy':
        return { volatility: 0.008, trendStrength: 0.003, noiseLevel: 0.002, jumpProbability: 0.001, jumpMagnitude: 0.01, label: 'Easy', color: '#4CAF50' };
      case 'medium':
        return { volatility: 0.012, trendStrength: 0.004, noiseLevel: 0.003, jumpProbability: 0.002, jumpMagnitude: 0.015, label: 'Medium', color: '#FF9800' };
      case 'hard':
        return { volatility: 0.045, trendStrength: 0.008, noiseLevel: 0.008, jumpProbability: 0.008, jumpMagnitude: 0.06, label: 'Hard', color: '#F44336' };
      case 'expert':
        return { volatility: 0.080, trendStrength: 0.012, noiseLevel: 0.015, jumpProbability: 0.012, jumpMagnitude: 0.10, label: 'Expert', color: '#9C27B0' };
      default:
        return { volatility: 0.012, trendStrength: 0.004, noiseLevel: 0.003, jumpProbability: 0.002, jumpMagnitude: 0.015, label: 'Medium', color: '#FF9800' };
    }
  }, [difficulty]);

  const generateSimulatedSeries = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      // Base difficulty parameters
      const baseVol = difficultySettings?.volatility || 0.012; // baseline vol
      const baseTrend = difficultySettings?.trendStrength || 0.003; // small drift strength
      const noiseLevel = difficultySettings?.noiseLevel || 0.003;

      // Helper: Normal(0,1) via Box-Muller with seeded random
      let spare = 0; let hasSpare = false;
      const randn = () => {
        if (hasSpare) { hasSpare = false; return spare; }
        let u = 0, v = 0, s = 0;
        do { u = seededRandom() * 2 - 1; v = seededRandom() * 2 - 1; s = u*u + v*v; } while (s === 0 || s >= 1);
        const mul = Math.sqrt(-2.0 * Math.log(s) / s);
        spare = v * mul; hasSpare = true; return u * mul;
      };

      // Regime states (bull/bear/sideways)
      const regimes = [
        { name: 'bull', drift: baseTrend * 1.2, volMult: 1.0 },
        { name: 'bear', drift: -baseTrend * 1.3, volMult: 1.15 },
        { name: 'sideways', drift: 0, volMult: 0.75 },
      ];
      let regimeIndex = 2; // start sideways
      let regimeTimeLeft = 1 + Math.floor(seededRandom() * 2); // 1-3 periods (5-15 minutes in 5-minute timeframe)

      // ใช้วันที่และเวลาที่เหมาะสมตาม market
      let baseDate;
      const marketType = (market || '').toLowerCase();
      
      if (marketType === 'set' || marketType === 'thai' || marketType === 'thailand') {
        // ตลาดหุ้นไทย (SET) - ช่วงเซสชั่นบ่าย 14:30-16:30
        baseDate = new Date('2024-10-31T15:30:00+07:00'); // 31 Oct 2024, 3:30 PM ICT 
      } else if (marketType === 'nasdaq' || marketType === 'nyse' || marketType === 'us') {
        // ตลาดหุ้นสหรัฐ - ช่วงเปิดตลาด (9:30 AM EST = 21:30 ICT)
        baseDate = new Date('2024-10-31T21:30:00+07:00'); // 31 Oct 2024, 9:30 PM ICT
      } else if (marketType === 'crypto' || marketType === 'cryptocurrency') {
        // ตลาด Crypto - เปิด 24 ชั่วโมง สามารถใช้เวลาใดก็ได้
        baseDate = new Date('2024-10-31T20:00:00+07:00'); // 31 Oct 2024, 8:00 PM ICT
      } else if (marketType === 'forex') {
        // ตลาด Forex - เปิด 24 ชั่วโมง ในวันธรรมดา
        baseDate = new Date('2024-10-31T09:00:00+07:00'); // 31 Oct 2024, 9:00 AM ICT
      } else {
        // Default: ใช้เวลาตลาดหุ้นไทยเป็นค่าเริ่มต้น
        baseDate = new Date('2024-10-31T15:30:00+07:00'); // 31 Oct 2024, 3:30 PM ICT
      }
      
      const startTime = Math.floor(baseDate.getTime() / 1000); // ไม่ลบ TOTAL_POINTS เพื่อให้เวลาตรงกัน
      // Symbol-based realistic starting price (ปรับให้ตรงกับหุ้น TU และหุ้นไทยอื่นๆ)
      const symbolBase = (symbol || '').toUpperCase();
      const symbolPriceMap = { 
        TU: 113, // True Corporation
        BBL: 162, // Bangkok Bank
        HMPRO: 77, // Home Product Center (ตรงกับรูปที่แสดง 77.30)
        PTT: 55, 
        AOT: 70, 
        CPALL: 60, 
        KBANK: 130, 
        ADVANC: 200,
        SCB: 120,
        GULF: 45,
        SCC: 350
      };
      const basePrice = symbolPriceMap[symbolBase] || (50 + seededRandom() * 200);

      const arr = [{ time: startTime, open: basePrice, high: basePrice, low: basePrice, close: basePrice, volume: 120000 }];

      // Volatility clustering via EWMA of past returns
      let sigma = baseVol; // instantaneous volatility
      let prevReturn = 0;

      // Intraday session pattern (U-shaped volume: high at open/close)
      const sessionLen = 4; // synthetic session length (20 minutes) for gameplay pacing in 5-minute bars

      for (let i = 1; i < TOTAL_POINTS; i++) {
        const prev = arr[i - 1];

        // Regime switching
        if (--regimeTimeLeft <= 0) {
          // 30% chance to switch regime; otherwise extend current
          if (seededRandom() < 0.3) {
            // Avoid function-in-loop to satisfy no-loop-func
            const options = regimeIndex === 0 ? [1, 2] : (regimeIndex === 1 ? [0, 2] : [0, 1]);
            regimeIndex = options[Math.floor(seededRandom() * options.length)];
          }
          regimeTimeLeft = 1 + Math.floor(seededRandom() * 3); // 1-4 periods (5-20 minutes in 5-minute timeframe)
        }
        const regime = regimes[regimeIndex];

        // EWMA volatility update: reacts to shocks and persists
        sigma = Math.max(0.0008, 0.94 * sigma + 0.06 * (Math.abs(prevReturn) + baseVol * 0.5));

        // Small cyclical component to mimic flow (very low amplitude)
        const microCycle = Math.sin(i / 180) * noiseLevel * 0.5;

        // Random shock (news) with difficulty-based probability and magnitude
        let jump = 0;
        let volumeShock = 1;
        const jumpProb = difficultySettings?.jumpProbability || 0.002;
        const jumpMag = difficultySettings?.jumpMagnitude || 0.015;
        
        if (seededRandom() < jumpProb) {
          const direction = seededRandom() < 0.5 ? -1 : 1;
          // For Hard/Expert: Much more extreme jumps
          const extremeMultiplier = (difficulty === 'hard' || difficulty === 'expert') ? (2 + seededRandom() * 4) : 1;
          jump = direction * jumpMag * extremeMultiplier;
          volumeShock = 2.5 + seededRandom() * 1.5; // 2.5x - 4x volume
          // Persist a bit more volatility after a jump
          sigma *= (difficulty === 'hard' || difficulty === 'expert') ? 1.35 : 1.15;
        }

        // Return model: drift by regime + noise (normal) + micro cycle + jump
        // dt kept as 1 for 1-second steps; scale sigma down slightly
        const z = randn();
        let r = regime.drift + microCycle + (sigma * 0.6) * z + jump;
        
        // Additional extreme volatility for Hard/Expert modes - กราฟกระชากแบบดิ่งสุดโต่ง
        if (difficulty === 'hard' || difficulty === 'expert') {
          // Add occasional dramatic price crashes or spikes
          if (seededRandom() < 0.003) { // 0.3% chance per second
            const crashDirection = seededRandom() < 0.6 ? -1 : 1; // 60% chance of crash, 40% spike
            const extremeMagnitude = (difficulty === 'expert') ? 0.15 : 0.10; // 15% for expert, 10% for hard
            r += crashDirection * extremeMagnitude * (0.5 + seededRandom() * 0.5);
          }
          
          // Add more frequent smaller extreme movements (adjusted for 5-minute timeframe)
          if (seededRandom() < 0.1) { // 10% chance per 5-minute period
            const direction = seededRandom() < 0.5 ? -1 : 1;
            const smallExtreme = (difficulty === 'expert') ? 0.04 : 0.03;
            r += direction * smallExtreme * seededRandom();
          }
        }
        
        const newClose = Math.max(0.5, prev.close * Math.exp(r));
        const newOpen = prev.close;

        // Candle shape
        const body = Math.abs(newClose - newOpen);
        const spread = Math.max(newOpen, newClose) * (0.0006 + seededRandom() * 0.0014); // 0.06% - 0.2%
        const wickFactor = 0.4 + seededRandom() * 0.9; // longer wicks in action
        const high = Math.max(newOpen, newClose) + (body + spread) * wickFactor;
        const low = Math.min(newOpen, newClose) - (body + spread) * wickFactor;

        // Intraday U-shape volume pattern (peak at start/end, lull mid-session)
        const tInSession = i % sessionLen;
        const x = tInSession / sessionLen; // 0..1
        const uShape = 0.6 + 0.9 * Math.pow((x - 0.5) * 2, 2); // 0.6..1.5, min at midday

        // Volume correlates with volatility (absolute return)
        const volBase = 80000 + seededRandom() * 160000; // 80k - 240k
        const volByMove = 1 + Math.min(6, (Math.abs(r) / (sigma + 1e-6)) * 0.8);
        const regimeVol = regime.volMult;
        const volume = Math.floor(volBase * uShape * volByMove * regimeVol * volumeShock);

        arr.push({
          time: startTime + (i * 300), // ใช้ timeframe 5 นาที (300 วินาที) ต่อ 1 บาร์ เพื่อให้ตรงกับรูป
          open: newOpen,
          high,
          low,
          close: newClose,
          volume,
        });

        prevReturn = r;
      }

      simDataRef.current = arr;
      setChartData(arr.slice(0, 50));
      setPlaybackIdx(49);
      setLoading(false);
      if (onDataLoaded) onDataLoaded(arr);
    } catch (err) {
      setError('Failed to generate data');
      setLoading(false);
    }
  }, [difficultySettings, onDataLoaded, TOTAL_POINTS, symbol, seededRandom, difficulty, market]);

  // React to external playback toggle
  useEffect(() => {
    if (isRealTradingMode) return;
    console.log(`🎮 [CHART] Received startPlayback: ${startPlayback}`);
    if (startPlayback) {
      setIsPlaying(true);
    }
  }, [startPlayback, isRealTradingMode]);

  // React to external playing state (from parent component)
  useEffect(() => {
    if (externalIsPlaying !== null) {
      console.log(`🎮 [CHART] External isPlaying changed: ${externalIsPlaying}`);
      setIsPlaying(externalIsPlaying);
    }
  }, [externalIsPlaying]);

  // React to external pause state
  useEffect(() => {
    console.log(`🎮 [CHART] Received isPaused: ${isPaused}`);
    if (isPaused) {
      console.log('🎮 [CHART] Paused by external control');
      setIsPlaying(false);
    }
  }, [isPaused]);

  // Initialize with data immediately when component mounts - ONLY ONCE
  useEffect(() => {
    if (simDataRef.current.length === 0) {
      generateSimulatedSeries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, symbol]); // Only when market or symbol changes

  // Chart initialization effect with protection
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Copy ref to variable to avoid React warning in cleanup
    // eslint-disable-next-line no-unused-vars
    const containerElement = chartContainerRef.current;
    let isActive = true;

    if (chartCreationTimeoutRef.current) {
      clearTimeout(chartCreationTimeoutRef.current);
    }

  chartCreationTimeoutRef.current = setTimeout(() => {
      if (!isActive) return;
      if (chartRef.current && seriesTypeRef.current === activeChartType && seriesRef.current) {
        try {
          if (!isDisposedRef.current) {
            chartRef.current.timeScale();
          }
          return;
        } catch (e) {
          console.warn('Existing chart is not functional, will recreate:', e);
        }
      }

      if (chartRef.current && chartRef.current._initializing) {
        return;
      }

      const initializeChart = () => {
        if (!isActive) return;

        try {
          if (chartRef.current) {
            chartRef.current._initializing = true;
            try {
              if (chartRef.current && typeof chartRef.current.remove === 'function') {
                chartRef.current.remove();
              }
            } catch (e) {
              console.warn('Error removing existing chart:', e);
            }
            chartRef.current = null;
            seriesRef.current = null;
            volumeSeriesRef.current = null;
            hasInitialFitRef.current = false; // Reset fit flag เมื่อสร้าง chart ใหม่
          }

          if (!isActive) return;

          if (!createChart || typeof createChart !== 'function') {
            setError('TradingView chart library not available');
            return;
          }

          const chartContainer = chartContainerRef.current;
          if (!chartContainer || !isActive) return;

          const containerWidth = chartContainer.clientWidth || 800;
          const containerHeight = Math.min(chartContainer.clientHeight || 500, 500); // จำกัดความสูงสูงสุดที่ 500px

          if (containerWidth === 0 || containerHeight === 0) {
            requestAnimationFrame(() => {
              if (isActive) initializeChart();
            });
            return;
          }

          if (chartRef.current && !chartRef.current._disposing) {
            return;
          }
          const chart = createChart(chartContainer, {
            width: containerWidth,
            height: containerHeight,
            layout: {
              background: { 
                type: 'solid', 
                color: theme === 'dark' ? '#0f0f0f' : '#FFFFFF' 
              },
              textColor: theme === 'dark' ? '#D9D9D9' : '#191919',
              fontSize: 12,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
            },
            grid: {
              vertLines: {
                color: theme === 'dark' ? '#1f2937' : '#e5e7eb',
                style: 0,
                visible: true,
              },
              horzLines: {
                color: theme === 'dark' ? '#1f2937' : '#e5e7eb',
                style: 0,
                visible: true,
              },
            },
            crosshair: {
              mode: 0, // Normal crosshair
              vertLine: {
                color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                width: 1,
                style: 2, // dashed
                visible: true,
                labelVisible: true,
                labelBackgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              },
              horzLine: {
                color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                width: 1,
                style: 2, // dashed
                visible: true,
                labelVisible: true,
                labelBackgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              },
            },
            rightPriceScale: {
              borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
              borderVisible: true,
              scaleMargins: {
                top: 0.1,   // 10% top margin
                bottom: 0.25, // 25% bottom margin (increased for volume space)
              },
              autoScale: true,
              entireTextOnly: false,
            },
            timeScale: {
              borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
              borderVisible: true,
              timeVisible: true,
              secondsVisible: false, // ซ่อนวินาที
              rightOffset: 12,
              barSpacing: 6,
              minBarSpacing: 0.5,
              fixLeftEdge: false,
              fixRightEdge: false,
              lockVisibleTimeRangeOnResize: true, // Prevent auto alignment on resize
              shiftVisibleRangeOnNewBar: false, // Prevent auto scroll on new data
            },
            localization: {
              timeFormatter: (timestamp) => {
                const date = new Date(timestamp * 1000);
                // แสดงเฉพาะเวลา (ชั่วโมง:นาที) เหมือนในรูป 20:00, 20:05
                return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
              },
              dateFormat: 'dd MMM yyyy',
              locale: 'th-TH',
            },
            watermark: {
              visible: false,
            },
            handleScroll: {
              mouseWheel: true, // Enable for all difficulty levels
              pressedMouseMove: true, // Enable for all difficulty levels
              horzTouchDrag: true,
              vertTouchDrag: true,
            },
            handleScale: {
              axisPressedMouseMove: true, // Enable for all difficulty levels
              mouseWheel: true, // Enable for all difficulty levels
              pinch: true,
            },
          });

          if (!chart || !isActive) {
            if (chart) {
              try {
                chart.remove();
              } catch (e) {
                console.warn('Error removing chart after failed creation:', e);
              }
            }
            return;
          }

          chart._initializing = false;
          chart._disposing = false;

          // Create main price series
          let series;
          const baseOptions = {
            lastValueVisible: true, // แสดงราคาล่าสุด
            priceLineVisible: true, // แสดงเส้นราคา
            borderVisible: true,
          };

          switch (activeChartType) {
            case 'candlestick':
              series = chart.addCandlestickSeries({
                ...baseOptions,
                upColor: '#22c55e', // สีเขียวสดใส (Tailwind green-500)
                downColor: '#ef4444', // สีแดงสดใส (Tailwind red-500)
                borderUpColor: '#16a34a', // เขียวเข้ม (Tailwind green-600)
                borderDownColor: '#dc2626', // แดงเข้ม (Tailwind red-600)
                wickUpColor: '#16a34a',
                wickDownColor: '#dc2626',
                borderVisible: true,
              });
              break;
            case 'line':
              series = chart.addLineSeries({
                ...baseOptions,
                color: '#3b82f6', // สีน้ำเงิน (Tailwind blue-500)
                lineWidth: 2,
                lineStyle: 0,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 6,
                crosshairMarkerBorderColor: '#1d4ed8',
                crosshairMarkerBackgroundColor: '#3b82f6',
                priceLineColor: '#3b82f6',
              });
              break;
            case 'area':
              series = chart.addAreaSeries({
                ...baseOptions,
                topColor: 'rgba(59, 130, 246, 0.3)', // ฟ้าอ่อน
                bottomColor: 'rgba(59, 130, 246, 0.05)', // ฟ้าจาง
                lineColor: '#3b82f6',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 6,
              });
              break;
            case 'bars':
              series = chart.addBarSeries({
                ...baseOptions,
                upColor: '#22c55e',
                downColor: '#ef4444',
                openVisible: true,
              });
              break;
            default:
              series = chart.addCandlestickSeries({
                ...baseOptions,
                upColor: '#089981',
                downColor: '#f23645',
                borderUpColor: '#089981',
                borderDownColor: '#f23645',
                wickUpColor: '#089981',
                wickDownColor: '#f23645',
              });
              break;
          }

          // เพิ่ม Volume Series ที่สวยงามยิ่งขึ้น
          const volumeSeries = chart.addHistogramSeries({
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: 'volume',
            color: theme === 'dark' ? '#374151' : '#d1d5db', // สีเทาอ่อนสำหรับ volume
            priceLineVisible: false,
            lastValueVisible: false,
            title: 'Volume',
            baseLineVisible: false,
          });
          
          // สร้าง price scale แยกสำหรับ volume with proper spacing
          chart.priceScale('volume').applyOptions({
            scaleMargins: {
              top: 0.75, // Volume ใช้พื้นที่ 25% ด้านล่าง (improved from 20%)
              bottom: 0.05, // 5% bottom margin to prevent touching
            },
            mode: 0,
            autoScale: true,
            invertScale: false,
            alignLabels: false,
            borderVisible: false,
            textColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
            visible: false, // ซ่อน volume labels เพื่อความเรียบง่าย
          });

          if (!isActive) {
            chart.remove();
            return;
          }

          chartRef.current = chart;
          seriesRef.current = series;
          volumeSeriesRef.current = volumeSeries;
          seriesTypeRef.current = activeChartType;

          // Force crosshair settings สำหรับทุก Chart Type - บังคับหลายครั้ง
          const crosshairOptions = {
            crosshair: {
              mode: 0,
              vertLine: {
                visible: true,
                labelVisible: true,
                color: theme === 'dark' ? '#9598A1' : '#787B86',
                width: 1,
                style: 3,
              },
              horzLine: {
                visible: false, // บังคับปิดเส้นแนวนอน 100%
                labelVisible: false,
                color: 'transparent',
                width: 0,
                style: 0,
              },
            },
          };
          
          // Apply crosshair settings หลายครั้งเพื่อให้แน่ใจ (อ้างอิง chartRef และเก็บ timeout ไว้เคลียร์ได้)
          const schedule = (fn, delay) => {
            const id = setTimeout(fn, delay);
            timeoutsRef.current.push(id);
            return id;
          };
          chart.applyOptions(crosshairOptions);
          schedule(() => {
            if (!isDisposedRef.current && chartRef.current) {
              chartRef.current.applyOptions(crosshairOptions);
            }
          }, 10);
          schedule(() => {
            if (!isDisposedRef.current && chartRef.current) {
              chartRef.current.applyOptions(crosshairOptions);
            }
          }, 50);
          schedule(() => {
            if (!isDisposedRef.current && chartRef.current) {
              chartRef.current.applyOptions(crosshairOptions);
            }
          }, 100);

          // Apply existing data if available
          if (chartDataRef.current.length > 0) {
            try {
              if (activeChartType === 'candlestick' || activeChartType === 'bars') {
                const ohlcData = chartDataRef.current.map(p => ({ 
                  time: p.time, 
                  open: p.open || p.close || 0, 
                  high: p.high || p.close || 0, 
                  low: p.low || p.close || 0, 
                  close: p.close || 0 
                }));
                series.setData(ohlcData);
              } else {
                const lineData = chartDataRef.current.map(p => ({ 
                  time: p.time, 
                  value: p.close || p.value || 0 
                }));
                series.setData(lineData);
              }

              const volumeData = chartDataRef.current.map((p, index) => {
                const prevClose = index > 0 ? chartDataRef.current[index - 1].close : p.close;
                const isUp = p.close >= prevClose;
                // สร้าง volume ที่สมจริงขึ้น - ปรับตามความผันผวนของราคา
                const priceChange = Math.abs(p.close - prevClose);
                const baseVolume = 80000; // volume พื้นฐาน
                const volatilityMultiplier = 1 + (priceChange / prevClose) * 10;
                const randomFactor = 0.7 + seededRandom() * 0.6; // 0.7-1.3 (seeded for consistency)
                const volumeValue = Math.floor(baseVolume * volatilityMultiplier * randomFactor);
                
                return {
                  time: p.time,
                  value: volumeValue,
                  // สี TradingView style ด้วย transparency ที่เหมาะสม
                  color: isUp ? '#08998155' : '#f2364555'
                };
              });
              volumeSeries.setData(volumeData);

              // แสดงข้อมูลเริ่มต้น: fit เฉพาะครั้งแรก
              if (chartDataRef.current.length > 10 && !hasInitialFitRef.current) {
                chart.timeScale().fitContent();
                hasInitialFitRef.current = true;
              }

              // Force crosshair settings หลังโหลดข้อมูลเสร็จ (เก็บ timeout ไว้และเช็ค disposed)
              const scheduleLater = (delay) => {
                const id = setTimeout(() => {
                  if (!isDisposedRef.current) {
                    try { forceCrosshairSettings(); } catch {}
                  }
                }, delay);
                timeoutsRef.current.push(id);
              };
              scheduleLater(100);
              scheduleLater(300);
              scheduleLater(500);
            } catch (e) {
              console.error('Error setting chart data:', e);
            }
          }

          // สร้าง Modern Tooltip ตามสไตล์ TradingView
          const tooltip = document.createElement('div');
          tooltip.style.cssText = `
            position: absolute;
            display: none;
            padding: 12px 16px;
            box-sizing: border-box;
            font-size: 12px;
            text-align: left;
            z-index: 1000;
            top: 12px;
            left: 12px;
            pointer-events: none;
            border: 1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'};
            border-radius: 12px;
            background: ${theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
            backdrop-filter: blur(8px);
            box-shadow: 0 8px 32px ${theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
            min-width: 220px;
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          `;
          chartContainer.appendChild(tooltip);

          // Add crosshair move handler with TradingView style tooltip
          const handleCrosshairMove = (param) => {
            if (!isActive) return;
            
            if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
              tooltip.style.display = 'none';
            } else {
              const data = param.seriesData.get(series);
              const volumeData = param.seriesData.get(volumeSeries);
              
              if (data && data.value !== undefined) {
                // สำหรับ Line/Area Chart - ใช้เวลาจริงจาก param.time ให้ sync กับแกนเวลา
                const price = data.value;
                const volume = volumeData ? volumeData.value : 0;
                const date = new Date(param.time * 1000);
                const formattedTime = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear() + 543} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
                const dayName = dayNames[date.getDay()];
                
                if (tooltip && price && !isNaN(price)) {
                  tooltip.innerHTML = `
                    <div style="
                      color: ${theme === 'dark' ? '#ffffff' : '#000000'}; 
                      font-weight: 700; 
                      margin-bottom: 8px; 
                      font-size: 14px;
                      border-bottom: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
                      padding-bottom: 4px;
                    ">
                      ${symbol || 'HMPRO'} • ${dayName} • ${formattedTime}
                    </div>
                    <div style="
                      padding: 8px 12px; 
                      background: rgba(59, 130, 246, 0.1); 
                      border-radius: 8px; 
                      margin-bottom: 8px;
                      border-left: 3px solid #3b82f6;
                    ">
                      <div style="color: #3b82f6; font-weight: 700; font-size: 16px;">
                        ฿${price.toFixed(2)}
                      </div>
                    </div>
                    <div style="
                      color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; 
                      font-size: 11px; 
                      padding: 4px 0;
                      border-top: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
                    ">
                      📊 Volume: ${volume.toLocaleString()}
                    </div>
                  `;
                }
              } else if (data && data.close !== undefined) {
                // สำหรับ Candlestick/Bar Chart
                const { open, high, low, close } = data;
                const volume = volumeData ? volumeData.value : 0;
                const change = close - open;
                const changePercent = ((change / open) * 100);
                const isPositive = change >= 0;
                // ใช้เวลาจริงจาก param.time ให้ sync กับแกนเวลา
                const date = new Date(param.time * 1000);
                const formattedTime = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear() + 543} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
                const dayName = dayNames[date.getDay()];
                
                tooltip.innerHTML = `
                  <div style="
                    color: ${theme === 'dark' ? '#ffffff' : '#000000'}; 
                    font-weight: 700; 
                    margin-bottom: 8px; 
                    font-size: 14px;
                    border-bottom: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
                    padding-bottom: 4px;
                  ">
                    ${symbol || 'HMPRO'} • ${dayName} • ${formattedTime}
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 8px;">
                    <div>
                      <div style="color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; margin-bottom: 2px;">
                        เปิด: <span style="color: ${theme === 'dark' ? '#ffffff' : '#000000'}; font-weight: 600;">${open.toFixed(2)}</span>
                      </div>
                      <div style="color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; margin-bottom: 2px;">
                        สูง: <span style="color: #22c55e; font-weight: 600;">${high.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div style="color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; margin-bottom: 2px;">
                        ต่ำ: <span style="color: #ef4444; font-weight: 600;">${low.toFixed(2)}</span>
                      </div>
                      <div style="color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; margin-bottom: 2px;">
                        ปิด: <span style="color: ${isPositive ? '#22c55e' : '#ef4444'}; font-weight: 600;">${close.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div style="
                    padding: 6px 8px; 
                    background: ${isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; 
                    border-radius: 6px; 
                    margin-bottom: 6px;
                  ">
                    <div style="color: ${isPositive ? '#22c55e' : '#ef4444'}; font-weight: 700; font-size: 13px;">
                      ${isPositive ? '+' : ''}${change.toFixed(2)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)
                    </div>
                  </div>
                  <div style="
                    color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; 
                    font-size: 11px; 
                    padding: 4px 0;
                    border-top: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
                  ">
                    📊 Volume: ${volume.toLocaleString()}
                  </div>
                `;
              }
              
              if (tooltip) {
                tooltip.style.display = 'block';
                
                // Safe positioning to avoid tooltip going off-screen
                const containerRect = chartContainer.getBoundingClientRect();
                const tooltipX = Math.min(param.point.x + 12, containerRect.width - 250);
                const tooltipY = Math.min(param.point.y + 12, containerRect.height - 150);
                
                tooltip.style.left = Math.max(12, tooltipX) + 'px';
                tooltip.style.top = Math.max(12, tooltipY) + 'px';
              }
            }
          };

          chart.subscribeCrosshairMove(handleCrosshairMove);

          const handleResize = () => {
            if (!chartRef.current || !chartContainerRef.current || !isActive || isDisposedRef.current) return;
            try {
              chartRef.current.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
              });
            } catch (e) {
              console.warn('Error during resize:', e);
            }
          };

          window.addEventListener('resize', handleResize);

          // เพิ่ม Event Listeners สำหรับ User Interaction
          const handleUserInteraction = () => {
            userInteractedRef.current = true;
          };

          // Enhanced chart point interaction for Hard/Expert modes only
          const handleChartClick = (param) => {
            if (difficulty !== 'hard' && difficulty !== 'expert') return;
            
            if (param && param.time && param.seriesPrices) {
              const priceData = param.seriesPrices.get(seriesRef.current);
              if (priceData) {
                console.log(`📍 [CHART CLICK] Time: ${param.time}, Price: ${priceData}, Difficulty: ${difficulty}`);
                // Add visual feedback for Hard/Expert modes
                showClickFeedback(param.time, priceData);
              }
            }
          };

          // Visual feedback for chart clicks (Hard/Expert only)
          const showClickFeedback = (time, price) => {
            // Create a temporary visual indicator
            const indicator = document.createElement('div');
            indicator.style.position = 'absolute';
            indicator.style.width = '8px';
            indicator.style.height = '8px';
            indicator.style.backgroundColor = difficulty === 'expert' ? '#9C27B0' : '#F44336';
            indicator.style.borderRadius = '50%';
            indicator.style.border = '2px solid white';
            indicator.style.zIndex = '1000';
            indicator.style.pointerEvents = 'none';
            indicator.style.transition = 'all 0.3s ease';
            
            chartContainerRef.current.appendChild(indicator);
            
            // Position the indicator (simplified positioning)
            const rect = chartContainerRef.current.getBoundingClientRect();
            indicator.style.left = `${rect.width * 0.7}px`; // Approximate positioning
            indicator.style.top = `${rect.height * 0.3}px`;
            
            // Remove after animation
            setTimeout(() => {
              if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
              }
            }, 1000);
          };

          // Subscribe to chart clicks for Hard/Expert modes
          if (difficulty === 'hard' || difficulty === 'expert') {
            chart.subscribeClick(handleChartClick);
          }

          // ติดตาม mouse และ touch events เพื่อ detect user interaction
          chartContainerRef.current.addEventListener('mousedown', handleUserInteraction);
          chartContainerRef.current.addEventListener('wheel', handleUserInteraction);
          chartContainerRef.current.addEventListener('touchstart', handleUserInteraction);

          const cleanup = () => {
            window.removeEventListener('resize', handleResize);
            
            // ลบ user interaction listeners
            if (chartContainerRef.current) {
              chartContainerRef.current.removeEventListener('mousedown', handleUserInteraction);
              chartContainerRef.current.removeEventListener('wheel', handleUserInteraction);
              chartContainerRef.current.removeEventListener('touchstart', handleUserInteraction);
            }

            if (chart && typeof chart.unsubscribeCrosshairMove === 'function') {
              chart.unsubscribeCrosshairMove(handleCrosshairMove);
            }
            
            // Unsubscribe from click events for Hard/Expert modes
            if (chart && typeof chart.unsubscribeClick === 'function' && (difficulty === 'hard' || difficulty === 'expert')) {
              chart.unsubscribeClick(handleChartClick);
            }
            
            // ลบ tooltip element
            if (tooltip && tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
          };

          chartRef.current._cleanup = cleanup;
          // mark as active (not disposed)
          isDisposedRef.current = false;

        } catch (error) {
          console.error('Chart initialization error:', error);
          if (isActive) {
            setError('Failed to initialize chart');
          }
        }
      };

      initializeChart();

    }, 100);

    return () => {
      // ตั้งธง disposed และปิดการโต้ตอบทันที
      isActive = false;
      isDisposedRef.current = true;
      
      // Use pre-copied ref to avoid React warning
      // Don't disable pointer events - this breaks interaction
      // try {
      //   if (containerElement) {
      //     containerElement.style.pointerEvents = 'none';
      //   }
      // } catch {}

      // เคลียร์ timeouts ทั้งหมดที่ถูกตั้งไว้
      try {
        if (chartCreationTimeoutRef.current) {
          clearTimeout(chartCreationTimeoutRef.current);
        }
        clearAllTimeouts(); // ใช้ function ที่ track timeout แทน
      } catch {}

      // ยกเลิก interval playback ถ้ามี
      if (playbackRef.current) {
        try { clearInterval(playbackRef.current); } catch {}
        playbackRef.current = null;
      }

      // ล้าง chart อย่างปลอดภัย
      if (chartRef.current && !chartRef.current._disposing) {
        try {
          chartRef.current._disposing = true;
          if (chartRef.current._cleanup) {
            chartRef.current._cleanup();
          }
          if (typeof chartRef.current.remove === 'function') {
            chartRef.current.remove();
          }
        } catch (e) {
          // ลดเสียง error ระหว่าง dispose
          console.warn('Chart cleanup warning:', e?.message || e);
        } finally {
          chartRef.current = null;
          seriesRef.current = null;
          volumeSeriesRef.current = null;
          seriesTypeRef.current = null;
        }
      }
    };
  }, [activeChartType, theme, showGrid, forceCrosshairSettings, enablePan, enableZoom, isInteractive, symbol, clearAllTimeouts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update chart data effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (chartData.length > 0 && seriesRef.current && chartRef.current && !chartRef.current._disposing) {
      try {
        // เพิ่มการตรวจสอบว่า chart ยังใช้งานได้อยู่หรือไม่
        if (!chartRef.current || chartRef.current._disposing) {
          return;
        }

        if (seriesTypeRef.current === 'candlestick' || seriesTypeRef.current === 'bars') {
          const ohlc = chartData.map(it => ({
            time: it.time,
            open: it.open ?? it.close ?? it.value ?? 0,
            high: it.high ?? it.close ?? it.value ?? 0,
            low: it.low ?? it.close ?? it.value ?? 0,
            close: it.close ?? it.value ?? 0,
          }));
          seriesRef.current.setData(ohlc);
        } else {
          const lineData = chartData.map(item => ({
            time: item.time,
            value: item.close || item.value || item.price || 0
          }));
          seriesRef.current.setData(lineData);
        }

        if (volumeSeriesRef.current) {
          const volumeData = chartData.map((item, index) => {
            const prevClose = index > 0 ? chartData[index - 1].close : item.close;
            const currentClose = item.close || item.value || item.price || 0;
            const isUp = currentClose >= prevClose;
            // ลด volume range ให้ดูง่ายขึ้น และสม่ำเสมอกับส่วนอื่น (using seeded random for consistency)
            const volumeValue = Math.floor(seededRandom() * 180000 + 40000);
            return {
              time: item.time,
              value: volumeValue,
              // TradingView style สีแบบใส
              color: isUp ? 'rgba(38, 166, 154, 0.7)' : 'rgba(239, 83, 80, 0.7)'
            };
          });
          volumeSeriesRef.current.setData(volumeData);
        }

        // ลบการบังคับ setVisibleRange ออก - ให้ user ควบคุม zoom/pan เอง
        // try { 
        //   // ปรับการแสดงผลให้เหมาะสมโดยไม่ zoom มากเกินไป
        //   if (chartRef.current && !isDisposedRef.current && chartData.length > 10) {
        //     const timeScale = chartRef.current.timeScale();
        //     const firstTime = chartData[0].time;
        //     const lastTime = chartData[chartData.length - 1].time;
        //     timeScale.setVisibleRange({
        //       from: firstTime,
        //       to: lastTime
        //     });
        //   }
        // } catch {}

        if (chartData.length > 0) {
          const lastDataPoint = chartData[chartData.length - 1];
          const currentPriceValue = lastDataPoint.close || lastDataPoint.value || lastDataPoint.price || 0;
          setCurrentPrice(currentPriceValue);
          
          if (onCurrentPriceChange && typeof onCurrentPriceChange === 'function') {
            try {
              onCurrentPriceChange(currentPriceValue);
            } catch (e) {
              console.error('Error calling onCurrentPriceChange:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error updating chart data:', error);
      }
    }
  }, [chartData, onCurrentPriceChange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chartDataRef.current = chartData; }, [chartData]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync chart data to ref for interval access
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { chartDataRef.current = chartData; }, [chartData]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      // Clear all tracked timeouts on unmount
      clearAllTimeouts();
      
      // Mark as disposed to prevent any further operations
      isDisposedRef.current = true;
      
      // Clear playback interval
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
      
      // Clear creation timeout
      if (chartCreationTimeoutRef.current) {
        clearTimeout(chartCreationTimeoutRef.current);
        chartCreationTimeoutRef.current = null;
      }
    };
  }, [clearAllTimeouts]); // Added dependency

  // Playback effects - only regenerate when market/symbol actually changes
  useEffect(() => {
    if (market && symbol && (simDataRef.current.length === 0 || 
        simDataRef.current[0]?.symbol !== symbol)) {
      generateSimulatedSeries();
      setIsPlaying(false);
      hasInitialFitRef.current = false; // Reset fit flag เมื่อเปลี่ยน symbol/market
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, symbol]); // Remove generateSimulatedSeries from dependencies

  useEffect(() => {
    if (playbackTime == null) return;
  // If chart was disposed (e.g., navigating away), do nothing
  if (isDisposedRef.current || !chartRef.current || !seriesRef.current) return;
    const max = Math.max(0, (simDataRef.current?.length || 1) - 1);
    const idx = Math.min(Math.max(0, Math.floor(playbackTime)), max);
    setPlaybackIdx(idx);
  if (seriesRef.current && simDataRef.current.length > 0 && !isDisposedRef.current && chartRef.current) {
      const slice = simDataRef.current.slice(0, idx + 1);
      
      // เก็บข้อมูลทั้งหมดสำหรับการ zoom/pan อิสระ
      // เฉพาะเมื่อข้อมูลมากเกินไปจริงๆ จึงจำกัด
      const visibleSlice = slice.length > maxVisibleBars ? slice.slice(-maxVisibleBars) : slice;
      
      try {
        if (!isDisposedRef.current && chartRef.current && seriesRef.current) {
          if (seriesTypeRef.current === 'candlestick' || seriesTypeRef.current === 'bars') {
            seriesRef.current.setData(visibleSlice.map(p => ({ time: p.time, open: p.open, high: p.high, low: p.low, close: p.close })));
          } else {
            seriesRef.current.setData(visibleSlice.map(p => ({ time: p.time, value: p.close })));
          }
        }
        
        // ปิด auto-fitting หลังจากแสดงข้อมูลครั้งแรกแล้ว
        // ให้ user ควบคุม zoom/pan ได้อิสระ
        if (chartRef.current && !isDisposedRef.current && visibleSlice.length > 2) {
          // Fit เฉพาะครั้งแรกที่มีข้อมูลเท่านั้น
          if (!hasInitialFitRef.current && visibleSlice.length >= 5) {
            const timeScale = chartRef.current.timeScale();
            timeScale.fitContent();
            hasInitialFitRef.current = true;
          }
          // หลังจากนั้นไม่ fit อีก - ให้ user ควบคุมเอง
        }
      } catch (e) {
        console.warn('Error updating chart data:', e);
      }
      setChartData(visibleSlice); // Update state with limited data
    }
  }, [playbackTime, isInteractive, maxVisibleBars]);

  useEffect(() => {
    console.log(`🎮 [CHART] Playback effect triggered - isPlaying: ${isPlaying}, isPaused: ${isPaused}, externalIsPlaying: ${externalIsPlaying}`);
    
    if (!isPlaying || isPaused) {
      console.log(`🎮 [CHART] Stopping playback - isPlaying: ${isPlaying}, isPaused: ${isPaused}`);
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
        console.log(`🎮 [CHART] Playback interval cleared`);
      }
      return;
    }
    
    console.log(`🎮 [CHART] Starting playback - speed: ${playbackSpeed}x`);
    // Use playbackSpeed from props, adjusted for 5-minute timeframe
    // For 5-minute bars, use appropriate playback speed
    const adjustedSpeed = (playbackSpeed || 1) * 0.3; // ปรับความเร็วให้เหมาะกับ timeframe 5 นาที
    const intervalMs = Math.max(800, Math.floor(3000 / adjustedSpeed)); // ขั้นต่ำ 800ms, ปกติ 3000ms ต่อบาร์
    
    playbackRef.current = setInterval(() => {
      // Check if component is still mounted and not disposed
      if (isDisposedRef.current) {
        if (playbackRef.current) {
          clearInterval(playbackRef.current);
          playbackRef.current = null;
        }
        return;
      }
      
      setPlaybackIdx((prev) => {
        const next = prev + 1;
        console.log(`🎮 [CHART] Advancing playback index: ${prev} → ${next}`);
        return next;
      });
    }, intervalMs);

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
        console.log(`🎮 [CHART] Cleanup: Playback interval cleared`);
      }
    };
  }, [isPlaying, playbackSpeed, isPaused, externalIsPlaying]);

  return (
    <div className="h-full w-full bg-[#131722] text-white flex flex-col relative max-h-[700px]"  style={{height: 'clamp(500px, 70vh, 700px)'}}>
      {/* Chart Container - Full Screen */}
      <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-[400px]" style={{height: '100%'}}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-slate-300 text-lg">Loading chart...</div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#131722] pointer-events-none">
            <div className="text-red-500">{error}</div>
          </div>
        )}
        
        <div 
          ref={chartContainerRef} 
          className="w-full h-full" 
          style={{ 
            pointerEvents: 'auto',
            cursor: 'crosshair',
            position: 'relative'
          }} 
        />
      </div>
    </div>
  );
};

export default SoloTradingChart;
