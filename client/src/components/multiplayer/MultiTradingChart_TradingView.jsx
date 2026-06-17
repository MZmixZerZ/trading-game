"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo, useImperativeHandle, forwardRef } from "react"
import { createChart } from "lightweight-charts"
import { Play, Pause, TrendingUp, Settings, Ruler, Square } from "lucide-react"
import { Stage, Layer, Line, Rect, Circle, Text, RegularPolygon } from "react-konva"

const MultiTradingChart_TradingView = forwardRef(({ 
  symbol = "PTT", 
  onDataLoaded, 
  theme = "dark", 
  onCurrentPriceChange,
  playbackIndex = null, // For synchronized multiplayer updates
  seed = null, // For deterministic random generation across all players
  playerId = "player1", // Player identifier for independent controls
  isChartPaused = null, // External pause state control
  onChartPauseChange = null, // Callback to notify parent of pause state changes
  onGameTimeUpdate = null, // Callback to send actual game time to parent
  gameDurationSeconds = 300 // Duration of game in seconds (default 5 minutes)
}, ref) => {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const [chartData, setChartData] = useState([])
  const [allData, setAllData] = useState([])
  const [, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState(0)
  const [percentChange, setPercentChange] = useState(0)
  const [error, setError] = useState(null)
  const [volume, setVolume] = useState(0)
  const [ohlc, setOhlc] = useState({ open: 0, high: 0, low: 0, close: 0 })
  const [macdValues, setMacdValues] = useState({ macd: 0, signal: 0, histogram: 0 })
  
  // Game timing state
  const [gameStartTime, setGameStartTime] = useState(null)
  const [actualGameDuration, setActualGameDuration] = useState(0)

  // Player-specific chart controls state - each player gets independent state
  const playerStateKey = `player_${playerId}_chart_state`
  const startTimeKey = `${playerStateKey}_game_start_time`
  
  // Store the index when paused for proper resume behavior
  const [pausedAtIndex, setPausedAtIndex] = useState(null)
  
  // Debug logs only in development mode
  const debugLog = useCallback((message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message)
    }
  }, [])
  
  // Helper function to validate and sort chart data
  const validateAndSortData = useCallback((data) => {
    try {
      if (!Array.isArray(data)) {
        console.warn('validateAndSortData: Data is not an array', data);
        return [];
      }
      
      if (data.length === 0) {
        return [];
      }
      
      const validData = data.filter(d => {
        if (!d || typeof d !== 'object') return false;
        if (!d.hasOwnProperty('time')) return false;
        
        // Convert time to number if it's string
        if (typeof d.time === 'string') {
          d.time = parseFloat(d.time);
        }
        
        // Validate time
        if (!isFinite(d.time) || isNaN(d.time)) return false;
        
        // Validate value or price data
        if (typeof d.value === 'number') return isFinite(d.value);
        if (typeof d.open === 'number') return isFinite(d.open) && isFinite(d.high) && isFinite(d.low) && isFinite(d.close);
        
        return false;
      });
      
      if (validData.length === 0) {
        console.warn('validateAndSortData: No valid data after filtering');
        return [];
      }
      
      // Sort by time ascending (required by Lightweight Charts)
      const sortedData = validData.sort((a, b) => {
        return a.time - b.time;
      });
      
      // Remove duplicates with same time values (keep latest)
      const uniqueData = [];
      const timeSet = new Map(); // Use Map to keep track of indices
      
      for (let i = 0; i < sortedData.length; i++) {
        const item = sortedData[i];
        if (!timeSet.has(item.time)) {
          timeSet.set(item.time, uniqueData.length);
          uniqueData.push(item);
        } else {
          // Replace with latest data for same time
          const existingIndex = timeSet.get(item.time);
          uniqueData[existingIndex] = item;
        }
      }
      
      if (uniqueData.length !== data.length) {
        console.warn(`validateAndSortData: Filtered ${data.length} -> ${uniqueData.length} items (removed ${data.length - uniqueData.length} invalid/duplicate entries)`);
      }
      
      return uniqueData;
    } catch (error) {
      console.error('Error in validateAndSortData:', error);
      return [];
    }
  }, [])
  
  // Chart pause state management
  // IMPORTANT: isPaused only affects chart data updates, NOT the game timer
  // When paused: Chart stops updating but game time continues normally
  // This allows players to analyze the chart without losing game time
  const [internalPausedState, setInternalPausedState] = useState(() => {
    const saved = localStorage.getItem(`${playerStateKey}_paused`)
    const initialPaused = saved ? JSON.parse(saved) : false
    return initialPaused
  })
  
  // Priority: if external pause is provided (like game ended), use it
  // Otherwise, use internal state for player control
  const isPaused = isChartPaused !== null && isChartPaused !== undefined ? isChartPaused : internalPausedState
  
  // Initialize debug logging - moved after state definitions
  useEffect(() => {
    debugLog(`🎯 Chart initializing for Player: ${playerId?.slice(-8) || 'ANON'}, State Key: ${playerStateKey}`)
    debugLog(`📊 Chart received symbol: ${symbol}, gameDurationSeconds: ${gameDurationSeconds}`)
    debugLog(`🎮 Initial pause state: isPaused=${isPaused}, isChartPaused=${isChartPaused}, playerStateKey=${playerStateKey}`)
    
    // Initialize game start time
    if (!gameStartTime) {
      const startTime = Date.now()
      setGameStartTime(startTime)
      debugLog(`⏰ Game started at: ${new Date(startTime).toLocaleTimeString()}`)
    }
  }, [debugLog, playerId, playerStateKey, symbol, gameDurationSeconds, isPaused, isChartPaused, gameStartTime])
  
  // Track actual game duration
  useEffect(() => {
    if (!gameStartTime) return
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000)
      setActualGameDuration(elapsed)
      
      // Send actual game time to parent if callback provided
      if (onGameTimeUpdate) {
        onGameTimeUpdate(elapsed)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [gameStartTime, onGameTimeUpdate])

  // Add ref methods for external access
  useImperativeHandle(ref, () => ({
    getActualGameDuration: () => actualGameDuration,
    getGameStartTime: () => gameStartTime,
    resetGameTimer: () => {
      const now = Date.now()
      setGameStartTime(now)
      setActualGameDuration(0)
      localStorage.setItem(startTimeKey, now.toString())
    }
  }), [actualGameDuration, gameStartTime, startTimeKey])

  const setIsPaused = useMemo(() => {
    // If external pause control is provided, use the callback
    if (isChartPaused !== null && isChartPaused !== undefined && onChartPauseChange) {
      return (value) => {
        onChartPauseChange(typeof value === 'function' ? value(isPaused) : value)
      }
    }
    // Otherwise use internal state control
    return setInternalPausedState
  }, [isChartPaused, onChartPauseChange, isPaused])
  
  const [analysisTools, setAnalysisTools] = useState(() => {
    // Load player-specific analysis tools from localStorage
    const savedTools = localStorage.getItem(`${playerStateKey}_analysis`)
    
    if (savedTools) {
      try {
        const parsed = JSON.parse(savedTools)
        // Reset series references (can't serialize functions)
        Object.keys(parsed).forEach(key => {
          if (parsed[key].series) {
            parsed[key].series = null
          }
        })
        debugLog(`🎮 Player ${playerId?.slice(-8)} loaded analysis tools from localStorage`)
        return parsed
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to parse saved analysis tools:', error)
        }
      }
    }
    
    // Default tools - Volume as indicator only
    const initialTools = {
      sma: { enabled: false, period: 20, series: null },
      ema: { enabled: false, period: 20, series: null },
      bollinger: { enabled: false, period: 20, series: null },
      rsi: { enabled: false, period: 14, series: null },
      macd: { enabled: false, series: null },
      volume: { enabled: false }
    }
    
    debugLog(`🎮 Player ${playerId?.slice(-8)} initialized with default analysis tools`)
    return initialTools
  })

  // Measurement Tools state - player-specific
  const [measurementMode, setMeasurementMode] = useState(() => {
    const saved = localStorage.getItem(`${playerStateKey}_measurementMode`)
    return saved ? JSON.parse(saved) : false
  })
  
  const [measurementLines, setMeasurementLines] = useState(() => {
    const saved = localStorage.getItem(`${playerStateKey}_measurementLines`)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to parse saved measurement lines:', error)
        }
      }
    }
    return []
  })
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)

  // Drawing Tools State - player-specific
  const [drawingMode, setDrawingMode] = useState(() => {
    const saved = localStorage.getItem(`${playerStateKey}_drawingMode`)
    return saved ? saved : null
  })
  
  const [drawingObjects, setDrawingObjects] = useState(() => {
    const saved = localStorage.getItem(`${playerStateKey}_drawingObjects`)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (error) {
        console.warn('Failed to parse saved drawing objects:', error)
      }
    }
    return []
  })
  
  const [selectedTool, setSelectedTool] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tempDrawing, setTempDrawing] = useState(null)
  const [drawingStartPos, setDrawingStartPos] = useState(null)
  
  // Canvas Drawing overlay state (Konva)
  const stageRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Coordinate conversion functions for chart-based drawing
  const convertXToTime = useCallback((x) => {
    if (!chartRef.current) return Date.now() / 1000
    try {
      const timeScale = chartRef.current.timeScale()
      return timeScale.coordinateToTime(x) || Date.now() / 1000
    } catch {
      return Date.now() / 1000
    }
  }, [])

  const convertYToPrice = useCallback((y) => {
    if (!seriesRef.current) return 0
    try {
      return seriesRef.current.coordinateToPrice(y) || 0
    } catch {
      return 0
    }
  }, [])

  const convertTimeToX = useCallback((time) => {
    if (!chartRef.current) return 0
    try {
      const timeScale = chartRef.current.timeScale()
      return timeScale.timeToCoordinate(time) || 0
    } catch {
      return 0
    }
  }, [])

  const convertPriceToY = useCallback((price) => {
    if (!seriesRef.current) return 0
    try {
      return seriesRef.current.priceToCoordinate(price) || 0
    } catch {
      return 0
    }
  }, [])

  // Canvas Drawing event handlers (TradingView-style with price/time coordinates)
  const handleCanvasClick = useCallback((e) => {
    if (!drawingMode || !chartRef.current || !seriesRef.current) return
    
    const pos = e.target.getStage().getPointerPosition()
    const time = convertXToTime(pos.x)
    const price = convertYToPrice(pos.y)
    
    if (!drawingStartPos) {
      // Start drawing
      setDrawingStartPos({ x: pos.x, y: pos.y, time, price })
      setIsDrawing(true)
    } else {
      // Finish drawing
      const newDrawing = {
        id: `${drawingMode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: drawingMode,
        start: drawingStartPos,
        end: { x: pos.x, y: pos.y, time, price },
        style: { color: '#2196F3', strokeWidth: 2 },
        timestamp: new Date().toISOString()
      }
      
      setDrawingObjects(prev => [...prev, newDrawing])
      setDrawingStartPos(null)
      setIsDrawing(false)
      setTempDrawing(null)
    }
  }, [drawingMode, drawingStartPos, convertXToTime, convertYToPrice, setDrawingObjects, setDrawingStartPos, setIsDrawing, setTempDrawing])

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isDrawing || !drawingStartPos || !drawingMode || !chartRef.current || !seriesRef.current) return
    
    const pos = e.target.getStage().getPointerPosition()
    const time = convertXToTime(pos.x)
    const price = convertYToPrice(pos.y)
    
    setTempDrawing({
      type: drawingMode,
      start: drawingStartPos,
      end: { x: pos.x, y: pos.y, time, price },
      style: { color: '#FFD700', strokeWidth: 2 }
    })
  }, [isDrawing, drawingStartPos, drawingMode, convertXToTime, convertYToPrice, setTempDrawing])

  // Helper function to create text with background for better readability
  const createTextWithBackground = useCallback((props) => {
    const { x, y, text, fontSize = 11, fill = '#2196F3', opacity = 1 } = props
    const padding = 4
    const textWidth = text.length * (fontSize * 0.6) // Approximate text width
    const textHeight = fontSize + 4
    
    return (
      <React.Fragment>
        {/* Background rectangle for better readability */}
        <Rect
          x={x - padding}
          y={y - padding}
          width={textWidth + (padding * 2)}
          height={textHeight + (padding * 2)}
          fill="rgba(0, 0, 0, 0.8)"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
          cornerRadius={3}
          opacity={opacity * 0.9}
        />
        {/* Text */}
        <Text
          x={x}
          y={y}
          text={text}
          fontSize={fontSize}
          fontFamily="Arial"
          fill={fill}
          opacity={opacity}
        />
      </React.Fragment>
    )
  }, [])

  // Render drawing shapes for Konva with TradingView-style information
  const renderCanvasDrawing = useCallback((drawing, isTemp = false) => {
    if (!drawing || !drawing.start || !drawing.end) return null
    if (!chartRef.current || !seriesRef.current) return null

    const { type, start, end, style = {} } = drawing
    const color = isTemp ? '#FFD700' : (style.color || '#2196F3')
    const strokeWidth = style.strokeWidth || 2
    const opacity = isTemp ? 0.7 : 1
    const key = drawing.id || 'temp'

    // Convert chart coordinates to current screen coordinates with safety checks
    const x1 = start.time ? convertTimeToX(start.time) : start.x
    const y1 = start.price !== undefined ? convertPriceToY(start.price) : start.y
    const x2 = end.time ? convertTimeToX(end.time) : end.x
    const y2 = end.price !== undefined ? convertPriceToY(end.price) : end.y

    // Calculate additional info for TradingView-style display
    const getDrawingInfo = () => {
      if (!start.price || !end.price || !start.time || !end.time) return null
      
      const priceDiff = end.price - start.price
      const pricePercent = ((priceDiff / start.price) * 100).toFixed(2)
      const timeDiff = end.time - start.time
      const bars = Math.round(timeDiff / 60) // Assuming 1-minute bars
      
      return {
        priceDiff: priceDiff.toFixed(2),
        pricePercent,
        bars,
        startPrice: start.price.toFixed(2),
        endPrice: end.price.toFixed(2)
      }
    }

    const info = getDrawingInfo()

    switch (type) {
      case 'horizontalLine':
        return (
          <React.Fragment key={key}>
            <Line
              points={[0, y1, canvasSize.width, y1]}
              stroke={color}
              strokeWidth={strokeWidth}
              dash={[5, 5]}
              opacity={opacity}
            />
            {info && (
              createTextWithBackground({
                x: 10,
                y: y1 - 15,
                text: `${info.startPrice} USD`,
                fontSize: 11,
                fill: color,
                opacity
              })
            )}
          </React.Fragment>
        )

      case 'trendLine':
      case 'verticalLine':
        return (
          <React.Fragment key={key}>
            <Line
              points={[x1, y1, x2, y2]}
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
            {info && (
              createTextWithBackground({
                x: Math.max(x1, x2) + 5,
                y: Math.min(y1, y2) - 5,
                text: `${info.priceDiff} (${info.pricePercent}%)`,
                fontSize: 11,
                fill: color,
                opacity
              })
            )}
          </React.Fragment>
        )

      case 'rectangle':
        return (
          <React.Fragment key={key}>
            <Rect
              x={Math.min(x1, x2)}
              y={Math.min(y1, y2)}
              width={Math.abs(x2 - x1)}
              height={Math.abs(y2 - y1)}
              fill="rgba(33, 150, 243, 0.1)"
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
            {info && (
              createTextWithBackground({
                x: Math.min(x1, x2) + 5,
                y: Math.min(y1, y2) + 5,
                text: `Range: ${info.startPrice} - ${info.endPrice}`,
                fontSize: 11,
                fill: color,
                opacity
              })
            )}
          </React.Fragment>
        )

      case 'circle':
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2
        const centerX = (x1 + x2) / 2
        const centerY = (y1 + y2) / 2
        return (
          <React.Fragment key={key}>
            <Circle
              x={centerX}
              y={centerY}
              radius={Math.abs(radius)}
              fill="rgba(255, 107, 53, 0.1)"
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
            {info && (
              createTextWithBackground({
                x: centerX + radius + 5,
                y: centerY,
                text: `Center: ${((start.price + end.price) / 2).toFixed(2)}`,
                fontSize: 11,
                fill: color,
                opacity
              })
            )}
          </React.Fragment>
        )

      case 'triangle':
        const midX = (x1 + x2) / 2
        const midY = Math.min(y1, y2) - Math.abs(y2 - y1) * 0.5
        return (
          <React.Fragment key={key}>
            <Line
              points={[x1, y1, x2, y2, midX, midY, x1, y1]}
              fill="rgba(76, 175, 80, 0.1)"
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={opacity}
              closed={true}
            />
            {info && (
              createTextWithBackground({
                x: midX + 5,
                y: midY - 10,
                text: `△ Area: ${Math.abs(info.priceDiff).toFixed(2)} range`,
                fontSize: 11,
                fill: color,
                opacity
              })
            )}
          </React.Fragment>
        )

      case 'fibRetracement':
        const fibLevels = [
          { level: 0, label: '0.0%' },
          { level: 0.236, label: '23.6%' },
          { level: 0.382, label: '38.2%' },
          { level: 0.5, label: '50.0%' },
          { level: 0.618, label: '61.8%' },
          { level: 0.786, label: '78.6%' },
          { level: 1, label: '100.0%' }
        ]
        return (
          <React.Fragment key={key}>
            {fibLevels.map((fib, idx) => {
              const fibY = y1 + (y2 - y1) * fib.level
              const fibPrice = start.price + (end.price - start.price) * fib.level
              return (
                <React.Fragment key={`${key}-fib-${idx}`}>
                  <Line
                    points={[Math.min(x1, x2), fibY, Math.max(x1, x2), fibY]}
                    stroke={color}
                    strokeWidth={fib.level === 0.5 ? strokeWidth + 1 : strokeWidth}
                    dash={fib.level === 0 || fib.level === 1 ? [] : [3, 3]}
                    opacity={opacity}
                  />
                  {createTextWithBackground({
                    x: Math.max(x1, x2) + 5,
                    y: fibY - 5,
                    text: `${fib.label} (${fibPrice.toFixed(2)})`,
                    fontSize: 10,
                    fill: color,
                    opacity
                  })}
                </React.Fragment>
              )
            })}
          </React.Fragment>
        )

      case 'text':
        return (
          <React.Fragment key={key}>
            {createTextWithBackground({
              x: x1,
              y: y1,
              text: info ? info.text || 'Text' : 'Text',
              fontSize: 12,
              fill: color,
              opacity
            })}
          </React.Fragment>
        )

      case 'longPosition':
        return (
          <React.Fragment key={key}>
            <Line
              points={[x1, y1, x2, y1]}
              stroke="#26a69a"
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
            <RegularPolygon
              x={x2}
              y={y1}
              sides={3}
              radius={8}
              fill="#26a69a"
              rotation={90}
              opacity={opacity}
            />
            {createTextWithBackground({
              x: x1,
              y: y1 - 20,
              text: `LONG ${info ? info.startPrice : ''}`,
              fontSize: 10,
              fill: '#26a69a',
              opacity
            })}
          </React.Fragment>
        )

      case 'shortPosition':
        return (
          <React.Fragment key={key}>
            <Line
              points={[x1, y1, x2, y1]}
              stroke="#ef5350"
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
            <RegularPolygon
              x={x2}
              y={y1}
              sides={3}
              radius={8}
              fill="#ef5350"
              rotation={-90}
              opacity={opacity}
            />
            {createTextWithBackground({
              x: x1,
              y: y1 - 20,
              text: `SHORT ${info ? info.startPrice : ''}`,
              fontSize: 10,
              fill: '#ef5350',
              opacity
            })}
          </React.Fragment>
        )

      case 'forecast':
        const extendX = x2 + (x2 - x1)
        const extendY = y2 + (y2 - y1)
        const forecastStartPrice = info ? info.startPrice : 0
        const forecastEndPrice = info ? info.endPrice : 0
        const priceDiff = forecastEndPrice && forecastStartPrice ? (forecastEndPrice - forecastStartPrice).toFixed(2) : '0.00'
        const percentage = forecastStartPrice ? ((priceDiff / forecastStartPrice) * 100).toFixed(2) : '0.00'
        return (
          <React.Fragment key={key}>
            <Line
              points={[x1, y1, x2, y2]}
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
            <Line
              points={[x2, y2, extendX, extendY]}
              stroke={color}
              strokeWidth={strokeWidth}
              dash={[5, 5]}
              opacity={opacity * 0.7}
            />
            {createTextWithBackground({
              x: x1,
              y: y1 - 20,
              text: `Forecast ${priceDiff > 0 ? '+' : ''}${priceDiff} (${percentage}%)`,
              fontSize: 10,
              fill: color,
              opacity
            })}
          </React.Fragment>
        )

      default:
        return null
    }
  }, [convertTimeToX, convertPriceToY, canvasSize.width, createTextWithBackground])

  // Update canvas dimensions when chart resizes - Always active for drawing visibility
  useEffect(() => {
    let resizeTimeout
    
    const updateCanvasSize = () => {
      if (chartContainerRef.current) {
        const newWidth = chartContainerRef.current.clientWidth
        const newHeight = chartContainerRef.current.clientHeight
        
        // Only update if dimensions actually changed to prevent unnecessary re-renders
        setCanvasSize(prevSize => {
          if (prevSize.width !== newWidth || prevSize.height !== newHeight) {
            return { width: newWidth, height: newHeight }
          }
          return prevSize
        })
      }
    }

    const debouncedUpdateCanvasSize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateCanvasSize, 250) // Optimized debounce timing
    }

    // Always set up listeners so drawings stay visible
    updateCanvasSize() // Initial size
    window.addEventListener('resize', debouncedUpdateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', debouncedUpdateCanvasSize)
      clearTimeout(resizeTimeout)
    }
  }, []) // No dependencies to avoid conflicts with indicators

  // Sync drawing positions when chart data changes - Optimized for both systems
  useEffect(() => {
    // Only sync if we have drawings to maintain their positions
    if (drawingObjects.length > 0) {
      // Use gentle debounce to maintain drawing sync without interfering with indicators
      const timeoutId = setTimeout(() => {
        // Safer re-render approach - only update if canvas is still valid
        try {
          if (chartContainerRef.current && !document.hidden) {
            setCanvasSize(prev => ({ ...prev, _sync: Date.now() }))
          }
        } catch (error) {
          console.warn('Canvas sync skipped due to error:', error.message)
        }
      }, 750) // Increased debounce to 750ms for better stability
      
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData]) // Only depend on chart data changes, not drawing mode

  // Drawing tool definitions - memoized for performance
  const drawingTools = useMemo(() => ({
    // 1. Trend Line Tools
    trendLine: { name: 'Trend Line', icon: '📈', type: 'line' },
    horizontalLine: { name: 'Horizontal Line', icon: '↔️', type: 'horizontal' },
    horizontalRay: { name: 'Horizontal Ray', icon: '➡️', type: 'ray' },
    verticalLine: { name: 'Vertical Line', icon: '↕️', type: 'vertical' },
    parallelChannel: { name: 'Parallel Channel', icon: '||', type: 'channel' },
    
    // 2. Fibonacci & Measurement Tools
    fibRetracement: { name: 'Fibonacci Retracement', icon: '🌀', type: 'fibonacci' },
    fibExtension: { name: 'Fibonacci Extension', icon: '🔄', type: 'fibExt' },
    fibTimeZone: { name: 'Fib Time Zone', icon: '⏰', type: 'fibTime' },
    fibSpiral: { name: 'Fib Spiral', icon: '🌪️', type: 'spiral' },
    ruler: { name: 'Ruler/Measure', icon: '📏', type: 'measure' },
    
    // 3. Shapes
    rectangle: { name: 'Rectangle', icon: '⬜', type: 'rectangle' },
    triangle: { name: 'Triangle', icon: '🔺', type: 'triangle' },
    circle: { name: 'Circle', icon: '⭕', type: 'circle' },
    ellipse: { name: 'Ellipse', icon: '⭕', type: 'ellipse' },
    arrow: { name: 'Arrow', icon: '➤', type: 'arrow' },
    curve: { name: 'Curve', icon: '〰️', type: 'curve' },
    brush: { name: 'Brush', icon: '🖌️', type: 'brush' },
    
    // 4. Highlight & Zone Tools
    highlightZone: { name: 'Highlight Zone', icon: '🔦', type: 'zone' },
    path: { name: 'Path', icon: '🛤️', type: 'path' },
    
    // 5. Pattern Tools
    headShoulders: { name: 'Head & Shoulders', icon: '👤', type: 'pattern' },
    elliottWave: { name: 'Elliott Wave', icon: '🌊', type: 'wave' },
    abcPattern: { name: 'ABC Pattern', icon: '🔤', type: 'abc' },
    xabcdPattern: { name: 'XABCD Pattern', icon: '❌', type: 'xabcd' },
    trianglePattern: { name: 'Triangle Pattern', icon: '📐', type: 'triPattern' },
    
    // 6. Annotation & Icons
    text: { name: 'Text', icon: '📝', type: 'text' },
    note: { name: 'Note', icon: '📋', type: 'note' },
    callout: { name: 'Callout', icon: '💬', type: 'callout' },
    marker: { name: 'Marker', icon: '📍', type: 'marker' },
    
    // 7. Position Tools
    longPosition: { name: 'Long Position', icon: '📈', type: 'long' },
    shortPosition: { name: 'Short Position', icon: '📉', type: 'short' },
    forecast: { name: 'Forecast', icon: '🔮', type: 'forecast' }
  }), [])

  // Data caching for performance optimization
  const indicatorCache = useRef(new Map())
  
  // Cache key generator for indicators
  const generateCacheKey = useCallback((type, data, params) => {
    return `${type}_${data.length}_${JSON.stringify(params)}`
  }, [])
  
  // Cached technical indicator calculations
  const getCachedIndicator = useCallback((type, data, params, calculator) => {
    const cacheKey = generateCacheKey(type, data, params)
    
    if (indicatorCache.current.has(cacheKey)) {
      return indicatorCache.current.get(cacheKey)
    }
    
    const result = calculator()
    indicatorCache.current.set(cacheKey, result)
    
    // Limit cache size to prevent memory leaks
    if (indicatorCache.current.size > 50) {
      const firstKey = indicatorCache.current.keys().next().value
      indicatorCache.current.delete(firstKey)
    }
    
    return result
  }, [generateCacheKey])

  // Technical Analysis Functions with caching
  const calculateSMA = useCallback((data, period) => {
    return getCachedIndicator('sma', data, { period }, () => {
      // Validate and sort input data first
      const validatedData = validateAndSortData(data);
      if (validatedData.length < period) return [];
      
      const result = []
      for (let i = period - 1; i < validatedData.length; i++) {
        const sum = validatedData.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0)
        result.push({
          time: validatedData[i].time,
          value: sum / period
        })
      }
      return result
    })
  }, [getCachedIndicator, validateAndSortData])

  const calculateEMA = useCallback((data, period) => {
    return getCachedIndicator('ema', data, { period }, () => {
      // Validate and sort input data first
      const validatedData = validateAndSortData(data);
      if (validatedData.length === 0) return []
      
      const result = []
      const multiplier = 2 / (period + 1)
      let ema = validatedData[0].close
      
      result.push({ time: validatedData[0].time, value: ema })
      
      for (let i = 1; i < validatedData.length; i++) {
        ema = (validatedData[i].close - ema) * multiplier + ema
        result.push({ time: validatedData[i].time, value: ema })
      }
      return result
    })
  }, [getCachedIndicator, validateAndSortData])

  const calculateBollingerBands = useCallback((data, period, stdDev = 2) => {
    return getCachedIndicator('bollinger', data, { period, stdDev }, () => {
      // Validate and sort input data first
      const validatedData = validateAndSortData(data);
      if (validatedData.length < period) return { sma: [], upper: [], lower: [] };
      
      const sma = calculateSMA(validatedData, period)
      const upper = []
      const lower = []
      
      for (let i = 0; i < sma.length; i++) {
        const dataIndex = i + period - 1
        const slice = validatedData.slice(dataIndex - period + 1, dataIndex + 1)
        const variance = slice.reduce((acc, curr) => acc + Math.pow(curr.close - sma[i].value, 2), 0) / period
        const standardDeviation = Math.sqrt(variance)
        
        upper.push({
          time: sma[i].time,
          value: sma[i].value + (standardDeviation * stdDev)
        })
        
        lower.push({
          time: sma[i].time,
          value: sma[i].value - (standardDeviation * stdDev)
        })
      }
      
      return { sma, upper, lower }
    })
  }, [calculateSMA, getCachedIndicator, validateAndSortData])

  const calculateRSI = useCallback((data, period = 14) => {
    // Validate and sort input data first
    const validatedData = validateAndSortData(data);
    if (validatedData.length < period + 1) return []
    
    const gains = []
    const losses = []
    
    for (let i = 1; i < validatedData.length; i++) {
      const change = validatedData[i].close - validatedData[i - 1].close
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }
    
    const result = []
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period
    
    for (let i = period; i < validatedData.length; i++) {
      if (avgLoss === 0) {
        result.push({ time: validatedData[i].time, value: 100 })
      } else {
        const rs = avgGain / avgLoss
        const rsi = 100 - (100 / (1 + rs))
        result.push({ time: validatedData[i].time, value: rsi })
      }
      
      if (i < gains.length) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period
      }
    }
    
    return result
  }, [validateAndSortData])

  const calculateMACD = useCallback((data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    // Validate and sort input data first
    const validatedData = validateAndSortData(data);
    
    if (validatedData.length < slowPeriod + signalPeriod) {
      return { macd: [], signal: [], histogram: [] }
    }
    
    // Extract closing prices
    const closePrices = validatedData.map(d => d.close);
    
    // Simple EMA calculation (TradingView standard)
    const calculateEMA = (values, period) => {
      if (values.length < period) return [];
      
      const k = 2 / (period + 1);
      const emas = [];
      
      // First EMA is SMA
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += values[i];
      }
      let ema = sum / period;
      
      // Add EMA values starting from period index
      for (let i = period - 1; i < values.length; i++) {
        if (i === period - 1) {
          ema = sum / period; // SMA for first value
        } else {
          ema = (values[i] * k) + (ema * (1 - k));
        }
        emas.push(ema);
      }
      
      return emas;
    }
    
    // Calculate EMAs
    const fastEMA = calculateEMA(closePrices, fastPeriod);
    const slowEMA = calculateEMA(closePrices, slowPeriod);
    
    // Calculate MACD line
    const macdLine = [];
    const alignOffset = slowPeriod - fastPeriod; // 14 points difference
    
    for (let i = 0; i < slowEMA.length; i++) {
      const fastIndex = i + alignOffset;
      if (fastIndex < fastEMA.length) {
        const macdValue = fastEMA[fastIndex] - slowEMA[i];
        const timeIndex = slowPeriod - 1 + i;
        
        macdLine.push({
          time: validatedData[timeIndex].time,
          value: macdValue
        });
      }
    }
    
    // Calculate Signal line
    const signalLine = [];
    if (macdLine.length >= signalPeriod) {
      const macdValues = macdLine.map(d => d.value);
      const signalEMA = calculateEMA(macdValues, signalPeriod);
      
      for (let i = 0; i < signalEMA.length; i++) {
        const macdIndex = signalPeriod - 1 + i;
        if (macdIndex < macdLine.length) {
          signalLine.push({
            time: macdLine[macdIndex].time,
            value: signalEMA[i]
          });
        }
      }
    }
    
    // Calculate Histogram
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
      const macdIndex = signalPeriod - 1 + i;
      if (macdIndex < macdLine.length) {
        const histogramValue = macdLine[macdIndex].value - signalLine[i].value;
        histogram.push({
          time: signalLine[i].time,
          value: histogramValue
        });
      }
    }
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    }
  }, [validateAndSortData])

  // Measurement Tool Functions
  const toggleMeasurementMode = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Chart not ready for measurement mode');
      }
      return;
    }
    
    try {
      // Chart is ready, proceed with measurement mode
      setMeasurementMode(!measurementMode);
      debugLog(`🔧 Player ${playerId?.slice(-8)} ${!measurementMode ? 'enabled' : 'disabled'} measurement mode`);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error toggling measurement mode:', error);
      }
    }
  }, [measurementMode, playerId, debugLog]);

  const calculateDistance = useCallback((point1, point2) => {
    const timeDiff = Math.abs(point2.time - point1.time)
    const priceDiff = Math.abs(point2.price - point1.price)
    const priceChangePercent = ((point2.price - point1.price) / point1.price) * 100
    
    // Convert time difference to readable format
    const timeInMinutes = timeDiff / 60
    const timeStr = timeInMinutes < 60 
      ? `${Math.round(timeInMinutes)}m`
      : `${Math.round(timeInMinutes / 60)}h ${Math.round(timeInMinutes % 60)}m`
    
    return {
      timeDiff: timeStr,
      priceDiff: priceDiff.toFixed(2),
      priceChangePercent: priceChangePercent.toFixed(2)
    }
  }, [])

  const addMeasurementLine = useCallback((start, end) => {
    const distance = calculateDistance(start, end)
    const newLine = {
      id: Date.now(),
      start,
      end,
      distance,
      timestamp: new Date().toLocaleTimeString()
    }
    
    setMeasurementLines(prev => [...prev, newLine])
    debugLog(`📏 Added measurement: ${distance.priceDiff} (${distance.priceChangePercent}%) over ${distance.timeDiff}`)
  }, [calculateDistance, debugLog])

  // Function to manually go to latest data when user wants
  const goToLatestData = useCallback(() => {
    if (chartRef.current && chartData.length > 0) {
      const timeScale = chartRef.current.timeScale();
      
      // Get the latest time from chart data
      const latestTime = chartData[chartData.length - 1].time;
      
      // Calculate visible range to show last 50 bars
      const barsToShow = 50;
      const timePerBar = 60; // 1 minute per bar
      const rangeStart = latestTime - (barsToShow * timePerBar);
      
      timeScale.setVisibleRange({
        from: rangeStart,
        to: latestTime + (timePerBar * 5) // Add some right margin
      });
      
      debugLog(`� Manually scrolled to latest data`);
    }
  }, [chartData, debugLog]);

  // Function to fit all data in view
  const fitAllData = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      debugLog(`📊 Fitted all chart data in view`);
    }
  }, [debugLog]);

  const clearMeasurements = useCallback(() => {
    setMeasurementLines([])
    debugLog(`🗑️ Cleared all measurements for Player ${playerId?.slice(-8)}`)
  }, [playerId, debugLog])

  // Drawing Tools Functions
  const selectDrawingTool = useCallback((toolType) => {
    debugLog(`🛠️ Selecting drawing tool: ${toolType}`)
    setSelectedTool(toolType)
    setDrawingMode(toolType)
    debugLog(`🎨 Player ${playerId?.slice(-8)} selected drawing tool: ${toolType}`)
    
    // Store in localStorage for persistence
    localStorage.setItem(`${playerStateKey}_drawingMode`, toolType)
    localStorage.setItem(`${playerStateKey}_selectedTool`, toolType)
    
    // Show user instruction for drawing tools
    if (toolType === 'circle') {
      debugLog(`⭕ Circle tool selected! Click and drag on chart to draw circle.`)
    }
    
    // Add visual feedback via console instead of blocking alert
    debugLog(`🎨 Tool "${toolType}" selected! Click and drag on chart to draw`)
  }, [playerId, playerStateKey, debugLog])

  const clearDrawingTool = useCallback(() => {
    setSelectedTool(null)
    setDrawingMode(null)
    setIsDrawing(false)
    setTempDrawing(null)
    
    // Clear from localStorage
    localStorage.removeItem(`${playerStateKey}_drawingMode`)
    localStorage.removeItem(`${playerStateKey}_selectedTool`)
    
    debugLog(`🚫 Player ${playerId?.slice(-8)} cleared drawing tool`)
    debugLog('✅ Drawing tool cleared')
  }, [playerId, playerStateKey, debugLog])

  const clearAllDrawings = useCallback(() => {
    try {
      // Only clear drawing objects, not the entire chart
      setDrawingObjects([])
      
      // Remove any tracked drawing-related resources (NOT indicators)
      try {
        const map = drawingResourcesRef.current || {};
        Object.values(map).forEach(res => {
          if (Array.isArray(res.priceLines)) {
            res.priceLines.forEach(pl => { 
              try { 
                seriesRef.current && pl && seriesRef.current.removePriceLine(pl); 
              } catch {} 
            });
          }
          // Only remove drawing-related series, not indicator series
          if (Array.isArray(res.series)) {
            res.series.forEach(s => { 
              try { 
                chartRef.current && s && chartRef.current.removeSeries(s); 
              } catch {} 
            });
          }
        });
        drawingResourcesRef.current = {};
      } catch {}
      
      // Clear only drawing-related markers, preserve indicators
      if (seriesRef.current) {
        try {
          // Clear markers (these are typically drawing-related)
          seriesRef.current.setMarkers([]);
        } catch (error) {
          console.warn('Error clearing markers:', error);
        }
      }
      
      debugLog(`🗑️ Cleared all drawings for Player ${playerId?.slice(-8)} (Indicators preserved)`)
    } catch (error) {
      setError(`Failed to clear drawings: ${error.message}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in clearAllDrawings:', error);
      }
    }
  }, [playerId, debugLog, setError])

  // Toggle Analysis Tools with improved state sync
  const toggleAnalysisTool = useCallback((toolName, config = {}) => {
    debugLog(`🎯 Player ${playerId} toggling ${toolName}`)
    setAnalysisTools(prev => {
      const newTools = { ...prev }
      const tool = { ...newTools[toolName] }
      
      if (tool.enabled && tool.series) {
        // Remove existing series with error handling
        if (Array.isArray(tool.series)) {
          tool.series.forEach(series => {
            if (chartRef.current && series) {
              try {
                chartRef.current.removeSeries(series)
              } catch (e) {
                console.warn('Series already removed:', e.message)
              }
            }
          })
        } else if (chartRef.current && tool.series) {
          try {
            chartRef.current.removeSeries(tool.series)
          } catch (e) {
            console.warn('Series already removed:', e.message)
          }
        }
        
        tool.series = null
      }
      
      tool.enabled = !tool.enabled
      
      // Apply new configuration if provided
      if (config.period !== undefined) {
        tool.period = config.period
      }
      
      newTools[toolName] = tool
      
      // Update ref to keep it in sync with state
      analysisToolsRef.current = newTools
      
      debugLog(`✅ Player ${playerId} ${tool.enabled ? 'enabled' : 'disabled'} ${toolName}`)
      return newTools
    })
  }, [playerId, debugLog])

  // Ref to store current analysisTools to avoid dependency issues
  const analysisToolsRef = useRef(analysisTools)

  // Apply Technical Indicators to Chart with separate layers
  useEffect(() => {
    if (!chartRef.current || !chartData.length) return

    // Count active indicators to calculate proper layer spacing (including volume as indicator)
    const activeIndicators = Object.entries(analysisToolsRef.current).filter(([toolName, tool]) => 
      tool.enabled
    );
    
    // Calculate layer heights - no special handling for volume
    const mainChartHeight = 0.6; // 60% for main chart

    Object.entries(analysisToolsRef.current).forEach(([toolName, tool]) => {
      try {
        if (!tool.enabled) {
          // Remove series if tool is disabled
          if (tool.series) {
            if (Array.isArray(tool.series)) {
              tool.series.forEach(series => {
                if (chartRef.current && series) {
                  try {
                    chartRef.current.removeSeries(series)
                  } catch (e) {
                    console.warn('Series already removed:', e.message)
                  }
                }
              })
            } else if (chartRef.current && tool.series) {
              try {
                chartRef.current.removeSeries(tool.series)
              } catch (e) {
                console.warn('Series already removed:', e.message)
              }
            }
            // Clear series reference
            analysisToolsRef.current[toolName].series = null
          }
          return
        }

        // Create new series if enabled but doesn't exist
        if (!tool.series) {
          // Special handling for Volume - always place it at the bottom
          let layerTop, layerBottom;
          if (toolName === 'volume') {
            // Volume gets the bottom layer with extra padding
            layerTop = 0.85; // Start at 85% to give more space from MACD
            layerBottom = 0.98; // Go almost to the bottom
          } else {
            // Other indicators use normal spacing but adjusted for volume space
            const adjustedIndicatorHeight = 0.25 / Math.max(1, activeIndicators.length - 1); // Reserve 25% for non-volume indicators
            const nonVolumeIndex = activeIndicators.filter(([name]) => name !== 'volume').findIndex(([name]) => name === toolName);
            layerTop = mainChartHeight + (nonVolumeIndex * adjustedIndicatorHeight);
            layerBottom = Math.min(0.84, layerTop + adjustedIndicatorHeight - 0.02); // Stop before volume layer
          }
          
          switch (toolName) {
            case 'sma': {
              const smaData = calculateSMA(chartData, tool.period)
              if (smaData.length > 0) {
                const series = chartRef.current.addLineSeries({
                  color: '#00FF7F', // Changed to clear light green
                  lineWidth: 3, // เพิ่มความหนาเพื่อให้เห็นชัด
                  lineStyle: 0, // solid line
                })
                // Use helper function to validate and sort data
                const validatedSmaData = validateAndSortData(smaData);
                if (validatedSmaData.length > 0) {
                  try {
                    series.setData(validatedSmaData);
                    debugLog(`📊 SMA data set: ${validatedSmaData.length} points`);
                  } catch (error) {
                    console.error('Error setting SMA data:', error);
                  }
                }
                analysisToolsRef.current.sma.series = series
              }
              break
            }
            case 'ema': {
              const emaData = calculateEMA(chartData, tool.period)
              if (emaData.length > 0) {
                const series = chartRef.current.addLineSeries({
                  color: '#e91e63',
                  lineWidth: 2,
                })
                // Use helper function to validate and sort data
                const validatedEmaData = validateAndSortData(emaData);
                if (validatedEmaData.length > 0) {
                  try {
                    series.setData(validatedEmaData);
                    debugLog(`📊 EMA data set: ${validatedEmaData.length} points`);
                  } catch (error) {
                    console.error('Error setting EMA data:', error);
                  }
                }
                analysisToolsRef.current.ema.series = series
            }
            break
          }
          case 'bollinger': {
            const bbData = calculateBollingerBands(chartData, tool.period)
            if (bbData.sma.length > 0) {
              const upperSeries = chartRef.current.addLineSeries({
                color: '#FF6B9D', // สีชมพูสำหรับเส้นบน
                lineWidth: 2,
                lineStyle: 2, // dashed line เพื่อให้แตกต่างจาก SMA
              })
              const lowerSeries = chartRef.current.addLineSeries({
                color: '#FF6B9D', // สีเดียวกันสำหรับเส้นล่าง
                lineWidth: 2,
                lineStyle: 2, // dashed line เพื่อให้แตกต่างจาก SMA
              })
              const middleSeries = chartRef.current.addLineSeries({
                color: '#FF1493', // สีชมพูเข้มสำหรับเส้นกลาง (BB Middle = SMA)
                lineWidth: 1,
                lineStyle: 1, // dotted line เพื่อให้แตกต่างจาก SMA หลัก
              })
              
              // Use helper function to validate and sort data for all BB lines
              const validatedUpperData = validateAndSortData(bbData.upper);
              const validatedLowerData = validateAndSortData(bbData.lower);
              const validatedMiddleData = validateAndSortData(bbData.sma);
              
              try {
                if (validatedUpperData.length > 0) upperSeries.setData(validatedUpperData);
                if (validatedLowerData.length > 0) lowerSeries.setData(validatedLowerData);
                if (validatedMiddleData.length > 0) middleSeries.setData(validatedMiddleData);
                debugLog(`📊 Bollinger Bands data set: ${validatedUpperData.length} points`);
              } catch (error) {
                console.error('Error setting Bollinger Bands data:', error);
              }
              
              analysisToolsRef.current.bollinger.series = [upperSeries, middleSeries, lowerSeries]
            }
            break
          }
            case 'rsi': {
              const rsiData = calculateRSI(chartData, tool.period)
              if (rsiData.length > 0) {
                const series = chartRef.current.addLineSeries({
                  color: '#00bcd4',
                  lineWidth: 2,
                  priceScaleId: 'rsi'
                })
                
                // Add RSI reference lines for overbought (70) and oversold (30) levels
                const overboughtLine = chartRef.current.addLineSeries({
                  color: '#ef5350',
                  lineWidth: 1,
                  lineStyle: 2, // dashed line
                  priceScaleId: 'rsi',
                  lastValueVisible: false,
                  priceLineVisible: false,
                })
                
                const oversoldLine = chartRef.current.addLineSeries({
                  color: '#26a69a',
                  lineWidth: 1,
                  lineStyle: 2, // dashed line
                  priceScaleId: 'rsi',
                  lastValueVisible: false,
                  priceLineVisible: false,
                })
                
                const middleLine = chartRef.current.addLineSeries({
                  color: '#9e9e9e',
                  lineWidth: 1,
                  lineStyle: 1, // dotted line
                  priceScaleId: 'rsi',
                  lastValueVisible: false,
                  priceLineVisible: false,
                })
                
                // Configure RSI scale with calculated layer position
                chartRef.current.priceScale('rsi').applyOptions({
                  scaleMargins: { 
                    top: Math.max(0.05, layerTop), 
                    bottom: Math.max(0.05, 1 - layerBottom) 
                  },
                  mode: 0, // Normal mode
                  autoScale: true,
                  invertScale: false,
                  alignLabels: true,
                  visible: true,
                  drawTicks: true,
                  minimumWidth: 50,
                  entireTextOnly: false,
                })              // Create reference level data
              const firstTime = rsiData[0]?.time
              const lastTime = rsiData[rsiData.length - 1]?.time
              
              if (firstTime && lastTime) {
                // Overbought level at 70
                const overboughtData = [
                  { time: firstTime, value: 70 },
                  { time: lastTime, value: 70 }
                ]
                
                // Oversold level at 30
                const oversoldData = [
                  { time: firstTime, value: 30 },
                  { time: lastTime, value: 30 }
                ]
                
                // Middle level at 50
                const middleData = [
                  { time: firstTime, value: 50 },
                  { time: lastTime, value: 50 }
                ]
                
                try {
                  overboughtLine.setData(validateAndSortData(overboughtData))
                  oversoldLine.setData(validateAndSortData(oversoldData))
                  middleLine.setData(validateAndSortData(middleData))
                } catch (error) {
                  console.error('Error setting RSI reference lines:', error)
                }
              }
              
              // Use helper function to validate and sort data
              const validatedRsiData = validateAndSortData(rsiData);
              if (validatedRsiData.length > 0) {
                try {
                  series.setData(validatedRsiData);
                  debugLog(`📊 RSI data set: ${validatedRsiData.length} points`);
                } catch (error) {
                  console.error('Error setting RSI data:', error);
                }
              }
              analysisToolsRef.current.rsi.series = [series, overboughtLine, oversoldLine, middleLine]
            }
            break
          }
            case 'macd': {
              const macdData = calculateMACD(chartData)
              if (macdData.macd.length > 0) {
                const macdSeries = chartRef.current.addLineSeries({
                  color: '#2196F3',
                  lineWidth: 2,
                  priceScaleId: 'macd',
                  lastValueVisible: true,
                  priceLineVisible: false,
                })
                
                const signalSeries = chartRef.current.addLineSeries({
                  color: '#ff9800',
                  lineWidth: 2,
                  priceScaleId: 'macd',
                  lastValueVisible: true,
                  priceLineVisible: false,
                })
                
                const histogramSeries = chartRef.current.addHistogramSeries({
                  priceFormat: {
                    type: 'price',
                    precision: 4,
                    minMove: 0.0001,
                  },
                  priceScaleId: 'macd',
                  lastValueVisible: false,
                  priceLineVisible: false,
                  baseLineVisible: true,
                  baseLineColor: '#9e9e9e',
                  baseLineWidth: 1,
                })
                
                // Add zero line for MACD
                const zeroLine = chartRef.current.addLineSeries({
                  color: '#9e9e9e',
                  lineWidth: 1,
                  lineStyle: 1, // dotted line
                  priceScaleId: 'macd',
                  lastValueVisible: false,
                  priceLineVisible: false,
                })
                
                // Configure MACD scale with calculated layer position
                chartRef.current.priceScale('macd').applyOptions({
                  scaleMargins: { 
                    top: Math.max(0.05, layerTop), 
                    bottom: Math.max(0.05, 1 - layerBottom) 
                  },
                  mode: 0, // Normal mode
                  autoScale: true,
                  invertScale: false,
                  alignLabels: true,
                  visible: true,
                  drawTicks: true,
                  minimumWidth: 50,
                  entireTextOnly: false,
                })              // Use helper function to validate and sort data for all MACD components
              const validatedMacdData = validateAndSortData(macdData.macd);
              const validatedSignalData = validateAndSortData(macdData.signal);
              
              // Create histogram data with proper colors for each bar
              const validatedHistogramData = macdData.histogram.map(item => ({
                time: item.time,
                value: item.value,
                color: item.value >= 0 ? '#26a69a' : '#ef5350' // Green for positive, red for negative
              })).filter(item => 
                item.time && 
                typeof item.value === 'number' && 
                !isNaN(item.value) && 
                isFinite(item.value)
              ).sort((a, b) => a.time - b.time);
              
              try {
                if (validatedMacdData.length > 0) macdSeries.setData(validatedMacdData);
                if (validatedSignalData.length > 0) signalSeries.setData(validatedSignalData);
                if (validatedHistogramData.length > 0) histogramSeries.setData(validatedHistogramData);
                
                // Add zero line data
                const firstTime = validatedMacdData[0]?.time
                const lastTime = validatedMacdData[validatedMacdData.length - 1]?.time
                
                if (firstTime && lastTime) {
                  zeroLine.setData([
                    { time: firstTime, value: 0 },
                    { time: lastTime, value: 0 }
                  ])
                }
                
                // Debug MACD values
                const lastMacd = validatedMacdData[validatedMacdData.length - 1]?.value || 0;
                const lastSignal = validatedSignalData[validatedSignalData.length - 1]?.value || 0;
                const lastHistogram = validatedHistogramData[validatedHistogramData.length - 1]?.value || 0;
                
                debugLog(`📊 MACD data set: ${validatedMacdData.length} points, Last values - MACD: ${lastMacd.toFixed(4)}, Signal: ${lastSignal.toFixed(4)}, Histogram: ${lastHistogram.toFixed(4)}`);
                
                // Additional debug for scale issues
                const macdRange = validatedMacdData.reduce((acc, d) => {
                  acc.min = Math.min(acc.min, d.value);
                  acc.max = Math.max(acc.max, d.value);
                  return acc;
                }, { min: Infinity, max: -Infinity });
                
                const histogramRange = validatedHistogramData.reduce((acc, d) => {
                  acc.min = Math.min(acc.min, d.value);
                  acc.max = Math.max(acc.max, d.value);
                  return acc;
                }, { min: Infinity, max: -Infinity });
                
                debugLog(`📊 MACD range: ${macdRange.min.toFixed(4)} to ${macdRange.max.toFixed(4)}`);
                debugLog(`📊 Histogram range: ${histogramRange.min.toFixed(4)} to ${histogramRange.max.toFixed(4)}`);
                
              } catch (error) {
                console.error('Error setting MACD data:', error);
              }
              
              analysisToolsRef.current.macd.series = [macdSeries, signalSeries, histogramSeries, zeroLine]
            }
            break
          }
          case 'volume': {
            if (chartData.length > 0) {
              const volumeSeries = chartRef.current.addHistogramSeries({
                color: '#26a69a',
                priceFormat: {
                  type: 'volume',
                },
                priceScaleId: 'volume',
                lastValueVisible: false,
                priceLineVisible: false,
              })
              
              // Configure volume price scale with calculated layer position
              chartRef.current.priceScale('volume').applyOptions({
                scaleMargins: { 
                  top: Math.max(0.05, layerTop), 
                  bottom: Math.max(0.05, 1 - layerBottom) 
                },
                mode: 0, // Normal mode
                autoScale: true,
                invertScale: false,
                alignLabels: true,
                visible: true,
                drawTicks: true,
                minimumWidth: 50,
                entireTextOnly: false,
              })
              
              // Create volume data
              const volumeData = chartData.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? '#26a69a' : '#ef5350' // Green for up, red for down
              }))
              
              // Use helper function to validate and sort data
              const validatedVolumeData = validateAndSortData(volumeData);
              
              try {
                if (validatedVolumeData.length > 0) volumeSeries.setData(validatedVolumeData);
                debugLog(`📊 Volume data set: ${validatedVolumeData.length} points`);
              } catch (error) {
                console.error('Error setting Volume data:', error);
              }
              
              analysisToolsRef.current.volume.series = volumeSeries
            }
            break
          }
          default:
            // No action needed for unknown tools
            break
          }
        }

        // Only create series if it doesn't exist
        if (tool.series) {
          // Update existing series with new data
          switch (toolName) {
            case 'sma': {
              const smaData = calculateSMA(chartData, tool.period)
              try {
                const validatedSmaData = validateAndSortData(smaData);
                if (validatedSmaData.length > 0) tool.series.setData(validatedSmaData)
              } catch (error) {
                console.error('Error updating SMA data:', error);
              }
              break
            }
            case 'ema': {
              const emaData = calculateEMA(chartData, tool.period)
              try {
                const validatedEmaData = validateAndSortData(emaData);
                if (validatedEmaData.length > 0) tool.series.setData(validatedEmaData)
              } catch (error) {
                console.error('Error updating EMA data:', error);
              }
              break
            }
            case 'bollinger': {
              const bbData = calculateBollingerBands(chartData, tool.period)
              if (bbData.sma.length > 0 && Array.isArray(tool.series) && tool.series.length >= 3) {
                try {
                  const validatedUpperData = validateAndSortData(bbData.upper);
                  const validatedMiddleData = validateAndSortData(bbData.sma);
                  const validatedLowerData = validateAndSortData(bbData.lower);
                  
                  if (validatedUpperData.length > 0) tool.series[0].setData(validatedUpperData)
                  if (validatedMiddleData.length > 0) tool.series[1].setData(validatedMiddleData)
                  if (validatedLowerData.length > 0) tool.series[2].setData(validatedLowerData)
                } catch (error) {
                  console.error('Error updating Bollinger Bands data:', error);
                }
              }
              break
            }
            case 'rsi': {
              const rsiData = calculateRSI(chartData, tool.period)
              try {
                const validatedRsiData = validateAndSortData(rsiData);
                if (validatedRsiData.length > 0 && Array.isArray(tool.series) && tool.series.length >= 1) {
                  // Update main RSI line (first series)
                  tool.series[0].setData(validatedRsiData)
                  
                  // Update reference lines if they exist
                  if (tool.series.length >= 4) {
                    const firstTime = validatedRsiData[0]?.time
                    const lastTime = validatedRsiData[validatedRsiData.length - 1]?.time
                    
                    if (firstTime && lastTime) {
                      // Update overbought line (70)
                      tool.series[1].setData([
                        { time: firstTime, value: 70 },
                        { time: lastTime, value: 70 }
                      ])
                      
                      // Update oversold line (30)
                      tool.series[2].setData([
                        { time: firstTime, value: 30 },
                        { time: lastTime, value: 30 }
                      ])
                      
                      // Update middle line (50)
                      tool.series[3].setData([
                        { time: firstTime, value: 50 },
                        { time: lastTime, value: 50 }
                      ])
                    }
                  }
                } else if (validatedRsiData.length > 0 && tool.series && !Array.isArray(tool.series)) {
                  // Handle legacy single series format
                  tool.series.setData(validatedRsiData)
                }
              } catch (error) {
                console.error('Error updating RSI data:', error);
              }
              break
            }
            case 'macd': {
              const macdData = calculateMACD(chartData)
              if (macdData.macd.length > 0 && Array.isArray(tool.series) && tool.series.length >= 3) {
                try {
                  const validatedMacdData = validateAndSortData(macdData.macd);
                  const validatedSignalData = validateAndSortData(macdData.signal);
                  const validatedHistogramData = validateAndSortData(macdData.histogram.map(item => ({
                    ...item,
                    color: item.value >= 0 ? '#26a69a' : '#ef5350' // Green for positive, red for negative
                  })));
                  
                  if (validatedMacdData.length > 0) tool.series[0].setData(validatedMacdData)
                  if (validatedSignalData.length > 0) tool.series[1].setData(validatedSignalData)
                  if (validatedHistogramData.length > 0) tool.series[2].setData(validatedHistogramData)
                  
                  // Update zero line if it exists (4th series)
                  if (tool.series.length >= 4) {
                    const firstTime = validatedMacdData[0]?.time
                    const lastTime = validatedMacdData[validatedMacdData.length - 1]?.time
                    
                    if (firstTime && lastTime) {
                      tool.series[3].setData([
                        { time: firstTime, value: 0 },
                        { time: lastTime, value: 0 }
                      ])
                    }
                  }
                } catch (error) {
                  console.error('Error updating MACD data:', error);
                }
              }
              break
            }
            case 'volume': {
              if (chartData.length > 0 && tool.series) {
                try {
                  // Create volume data
                  const volumeData = chartData.map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.close >= d.open ? '#26a69a' : '#ef5350' // Green for up, red for down
                  }))
                  
                  // Use helper function to validate and sort data
                  const validatedVolumeData = validateAndSortData(volumeData);
                  
                  if (validatedVolumeData.length > 0) tool.series.setData(validatedVolumeData)
                } catch (error) {
                  console.error('Error updating Volume data:', error);
                }
              }
              break
            }
            default:
              // No action needed for unknown tools or tools without series
              break
          }
        }
      } catch (error) {
        console.error(`Error applying ${toolName}:`, error)
        setError(`Failed to apply ${toolName}: ${error.message}`)
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error applying ${toolName}:`, error)
        }
      }
    })
  }, [chartData, calculateSMA, calculateEMA, calculateBollingerBands, calculateRSI, calculateMACD, analysisTools, debugLog, validateAndSortData])

  // Handle play/pause functionality (only pauses chart updates, not game timer)
  const handlePlayPause = useCallback(() => {
    // Don't allow manual pause if external control is forcing pause (like game ended)
    if (isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true) {
      debugLog(`🚫 Cannot manually pause - external control is forcing pause state`)
      return
    }
    
    debugLog(`🎮 Play/Pause button clicked! currentPaused=${isPaused}`)
    
    setIsPaused(prev => {
      const newValue = !prev
      debugLog(`🎮 Toggling pause state: from=${prev} to=${newValue}`)
      
      // Save to localStorage only if using internal state
      if (isChartPaused === null || isChartPaused === undefined) {
        localStorage.setItem(`${playerStateKey}_paused`, JSON.stringify(newValue))
        debugLog(`💾 Saved pause state to localStorage: ${newValue}`)
      }
      
      // Clear debug message and provide user feedback
      debugLog(`🎮 Player ${playerId} ${newValue ? 'paused' : 'resumed'} chart updates`)
      
      // Show user-friendly notification
      if (newValue) {
        // Chart is paused - show pause notification
        debugLog('⏸️ Chart PAUSED - Game timer continues running')
        setTimeout(() => {
          debugLog('⏸️ Chart paused - Game timer continues running')
        }, 100)
      } else {
        // Chart is resumed
        debugLog('▶️ Chart RESUMED - Now showing live updates')
        setTimeout(() => {
          debugLog('▶️ Chart resumed - Now showing live updates')
        }, 100)
      }
      
      return newValue
    })
    // NOTE: This only pauses chart data updates, the game timer continues running normally
  }, [playerStateKey, playerId, isChartPaused, setIsPaused, debugLog, isPaused])

  // Add keyboard shortcut for play/pause (Spacebar)
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only handle spacebar when the chart container has focus or no input is focused
      // And only when not externally controlled (like game ended)
      if (event.code === 'Space' && 
          !event.target.closest('input, textarea, select') &&
          !(isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true)) {
        event.preventDefault()
        handlePlayPause()
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress)
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handlePlayPause, isChartPaused])

  // Save analysis tools state to localStorage when changed
  useEffect(() => {
    const toolsToSave = { ...analysisTools }
    // Remove series references before saving (can't serialize functions)
    Object.keys(toolsToSave).forEach(key => {
      if (toolsToSave[key].series) {
        toolsToSave[key] = { ...toolsToSave[key], series: null }
      }
    })
    localStorage.setItem(`${playerStateKey}_analysis`, JSON.stringify(toolsToSave))
  }, [analysisTools, playerStateKey])

  // Save measurement state to localStorage when changed (player-specific)
  useEffect(() => {
    localStorage.setItem(`${playerStateKey}_measurementMode`, JSON.stringify(measurementMode))
  }, [measurementMode, playerStateKey])

  useEffect(() => {
    localStorage.setItem(`${playerStateKey}_measurementLines`, JSON.stringify(measurementLines))
  }, [measurementLines, playerStateKey])

  
  // Enhanced multiplayer data generation with better realism
  const generateMultiplayerData = useCallback(() => {
    debugLog('🎲 Starting enhanced data generation for symbol:', symbol, 'with seed:', seed);
    
    // Use actual game duration if available, otherwise use provided or default duration
    const effectiveGameDuration = actualGameDuration > 0 ? actualGameDuration : gameDurationSeconds;
    debugLog('⏰ Game duration comparison:', {
      actual: actualGameDuration,
      provided: gameDurationSeconds,
      effective: effectiveGameDuration
    }, 'seconds');
    
    try {
      // Calculate total points based on actual game duration (1 point per second)
      const TOTAL_POINTS = effectiveGameDuration || 1800; // Use actual duration or default 30 minutes
      
      debugLog(`📊 Generating ${TOTAL_POINTS} data points for ${(TOTAL_POINTS/60).toFixed(1)} minutes (actual gameplay)`);
      
      // Seeded random number generator for consistent data across all players
      let randomSeed = seed || 12345;
      const seededRandom = () => {
        randomSeed = (randomSeed * 9301 + 49297) % 233280;
        return randomSeed / 233280;
      };
      
      // ราคาเริ่มต้นที่เหมาะสมสำหรับแต่ละ symbol
      const basePrices = {
        // TFEX
        '^SET50.BK': 1035, 'SET50': 1035, 'GOLD': 2011, 'USD': 35, 'OIL': 82, 'RUBBER': 58,
        // SET - หุ้นใหญ่
        'PTT': 100, 'CPALL': 145, 'KBANK': 157, 'SCB': 129, 'BBL': 143, 'AOT': 67, 'ADVANC': 190, 'INTUCH': 60, 'TU': 15, 'BDMS': 29,
        // SET - หุ้นกลาง
        'KTB': 15, 'TRUE': 5, 'DTAC': 40, 'CP': 30, 'CPF': 25, 'MINT': 30, 'CRC': 35, 'BGC': 15, 'HMPRO': 12, 'COM7': 25, 'OR': 20, 'BANPU': 10,
        'DELTA': 60, 'SAWAD': 45, 'PTTEP': 120, 'KCE': 50, 'SCC': 400, 'TISCO': 90, 'AP': 5,
        // MAI
        'HEMP': 2, 'LPN': 8, 'SPVI': 12, 'SMT': 15, 'PRINC': 3,
        // US
        'AAPL': 175, 'GOOGL': 2500, 'MSFT': 330, 'AMZN': 140, 'TSLA': 250, 'NVDA': 800, 'META': 320, 'NFLX': 400
      };
      
      const basePrice = basePrices[symbol] || 55.0;
      const baseVolatility = 0.008;
      const trendStrength = 0.002;
      
      // Box-Muller for normal distribution with seeded random
      const normalRandom = () => {
        let u = 0, v = 0;
        while(u === 0) u = seededRandom(); // Converting [0,1) to (0,1)
        while(v === 0) v = seededRandom();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };

      // Market regimes for realistic price action
      const regimes = [
        { name: 'bullish', drift: trendStrength * 1.5, vol: baseVolatility * 0.9 },
        { name: 'bearish', drift: -trendStrength * 1.3, vol: baseVolatility * 1.1 },
        { name: 'sideways', drift: 0, vol: baseVolatility * 0.7 },
        { name: 'volatile', drift: trendStrength * 0.3, vol: baseVolatility * 1.8 }
      ];

      let currentRegime = 2; // Start sideways
      let regimeDuration = 300 + Math.floor(seededRandom() * 600); // 5-15 minutes
      
      const startTime = Math.floor(Date.now() / 1000) - TOTAL_POINTS;
      const data = [];
      
      // Initialize first candle
      data.push({
        time: startTime,
        open: basePrice,
        high: basePrice,
        low: basePrice,
        close: basePrice,
        volume: 100000 + Math.floor(seededRandom() * 50000)
      });

      let currentPrice = basePrice;
      let volatility = baseVolatility;
      
      for (let i = 1; i < TOTAL_POINTS; i++) {
        const prev = data[i - 1];
        
        // Regime switching logic
        regimeDuration--;
        if (regimeDuration <= 0 && seededRandom() < 0.4) {
          const newRegime = Math.floor(seededRandom() * regimes.length);
          if (newRegime !== currentRegime) {
            currentRegime = newRegime;
            regimeDuration = 200 + Math.floor(seededRandom() * 800);
          }
        }
        
        const regime = regimes[currentRegime];
        
        // GARCH-like volatility clustering
        const prevReturn = Math.log(prev.close / (i > 1 ? data[i-2].close : prev.open));
        volatility = 0.1 * regime.vol + 0.85 * volatility + 0.05 * Math.abs(prevReturn);
        
        // Price movement with microstructure noise
        const noise = normalRandom() * volatility;
        const trend = regime.drift;
        const microNoise = (seededRandom() - 0.5) * 0.001;
        
        // Occasional jumps for realism
        let jump = 0;
        if (seededRandom() < 0.003) { // 0.3% chance of jump
          jump = (seededRandom() < 0.5 ? -1 : 1) * volatility * (1 + seededRandom() * 2);
        }
        
        const totalReturn = trend + noise + microNoise + jump;
        currentPrice = Math.max(1.0, prev.close * Math.exp(totalReturn));
        
        // OHLC generation with realistic spread
        const open = prev.close;
        const spread = currentPrice * (0.0002 + seededRandom() * 0.0008); // 0.02-0.1% spread
        
        // High/Low based on intrabar volatility
        const intrabarVol = volatility * (0.5 + seededRandom() * 0.8);
        const high = Math.max(open, currentPrice) + spread + Math.abs(normalRandom()) * intrabarVol * currentPrice;
        const low = Math.min(open, currentPrice) - spread - Math.abs(normalRandom()) * intrabarVol * currentPrice;
        
        // Volume with realistic patterns
        const baseVolume = 80000 + seededRandom() * 120000;
        const volumeFromMovement = 1 + Math.min(4, Math.abs(totalReturn) / volatility);
        const timeOfDayFactor = 0.7 + 0.6 * Math.sin((i % 1800) / 1800 * Math.PI); // U-shaped intraday
        const volume = Math.floor(baseVolume * volumeFromMovement * timeOfDayFactor);

        data.push({
          time: startTime + i,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(Math.max(0.1, low).toFixed(2)), // Prevent negative prices
          close: Number(currentPrice.toFixed(2)),
          volume: Math.max(1000, volume) // Minimum volume
        });
      }

      debugLog(`📈 Generated ${data.length} realistic data points for ${symbol}`);
      debugLog(`📊 Price range: ${Math.min(...data.map(d => d.low)).toFixed(2)} - ${Math.max(...data.map(d => d.high)).toFixed(2)}`);
      return data;
      
    } catch (err) {
      setError(`Failed to generate data: ${err.message}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error generating data:', err);
      }
      return [];
    }
  }, [symbol, seed, actualGameDuration, gameDurationSeconds, debugLog, setError])
  const getChartOptions = useCallback(() => ({
    layout: {
      background: { 
        type: 'solid', 
        color: theme === 'dark' ? '#131722' : '#FFFFFF' 
      },
      textColor: theme === 'dark' ? '#D9D9D9' : '#191919',
      fontSize: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    grid: {
      vertLines: {
        color: theme === 'dark' ? '#2A2E39' : '#E6E8EA',
        style: 0,
        visible: true,
      },
      horzLines: {
        color: theme === 'dark' ? '#2A2E39' : '#E6E8EA',
        style: 0,
        visible: true,
      },
    },
    crosshair: {
      mode: 1, // Normal crosshair mode
      vertLine: {
        color: theme === 'dark' ? '#9598A1' : '#787B86',
        width: 1,
        style: 3,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: theme === 'dark' ? '#363C4E' : '#FFFFFF',
      },
      horzLine: {
        color: theme === 'dark' ? '#9598A1' : '#787B86',
        width: 1,
        style: 3,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: theme === 'dark' ? '#363C4E' : '#FFFFFF',
      },
    },
    // ??????????????????????????????????????????????????????????????? interaction
    kineticScroll: {
      touch: true,
      mouse: true,
    },
    rightPriceScale: {
      borderColor: theme === 'dark' ? '#2A2E39' : '#E6E8EA',
      borderVisible: true,
      scaleMargins: {
        top: 0.1,   // 10% top margin
        bottom: 0.25, // 25% bottom margin (increased for volume space)
      },
      autoScale: true, // Enable auto-scale to ensure chart is visible
      mode: 0,
      invertScale: false,
      alignLabels: true,
      minimumWidth: 0,
      entireTextOnly: false,
    },
    timeScale: {
      borderColor: theme === 'dark' ? '#2A2E39' : '#E6E8EA',
      borderVisible: true,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 50,
      barSpacing: 12, // Increased bar spacing for better visibility
      fixLeftEdge: false,
      fixRightEdge: false,
      lockVisibleTimeRangeOnResize: false, // Allow chart to adjust on resize
      shiftVisibleRangeOnNewBar: false,
      tickMarkFormatter: (time) => {
        const date = new Date(time * 1000);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      },
    },
    watermark: {
      visible: false,
    },
    handleScroll: {
      mouseWheel: true,        // Allow zoom with mouse wheel
      pressedMouseMove: true,  // Always allow panning - drawing mode should not affect chart movement
      horzTouchDrag: true,     // Always allow touch drag - drawing mode should not affect chart movement
      vertTouchDrag: false,    // Always disable vertical touch drag
    },
    handleScale: {
      axisPressedMouseMove: true,   // Enable axis dragging for scaling
      mouseWheel: true,             // Allow zoom with mouse wheel
      pinch: true,                  // Allow pinch to zoom
    },
  }), [theme]); // Remove drawingMode dependency - chart should always work the same way

  // Get current series options
  const getSeriesOptions = useCallback(() => {
    return {
      lastValueVisible: true,
      priceLineVisible: true,
      borderVisible: true,
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    };
  }, []);

  // Refs to store current values to avoid dependency issues
  const measurementModeRef = useRef(measurementMode);
  const isDraggingRef = useRef(isDragging);
  const dragStartRef = useRef(dragStart);
  const addMeasurementLineRef = useRef(addMeasurementLine);
  const getChartOptionsRef = useRef(null); // Initialize as null
  const getSeriesOptionsRef = useRef(null); // Initialize as null
  
  // Drawing tools refs
  const drawingModeRef = useRef(drawingMode);
  const selectedToolRef = useRef(selectedTool);
  const isDrawingRef = useRef(isDrawing);
  const tempDrawingRef = useRef(tempDrawing);
  // Track created resources for each drawing object to avoid duplication
  const drawingResourcesRef = useRef({}); // { [id]: { priceLines: [], series: [] } }
  
  // Update refs when states change
  useEffect(() => {
    measurementModeRef.current = measurementMode;
  }, [measurementMode]);
  
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  
  useEffect(() => {
    dragStartRef.current = dragStart;
  }, [dragStart]);
  
  useEffect(() => {
    addMeasurementLineRef.current = addMeasurementLine;
  }, [addMeasurementLine]);
  
  useEffect(() => {
    getChartOptionsRef.current = getChartOptions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally omit getChartOptions to prevent infinite loops
  
  useEffect(() => {
    getSeriesOptionsRef.current = getSeriesOptions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally omit getSeriesOptions to prevent infinite loops

  // Initialize refs immediately
  useEffect(() => {
    if (!getChartOptionsRef.current) {
      getChartOptionsRef.current = getChartOptions;
    }
    if (!getSeriesOptionsRef.current) {
      getSeriesOptionsRef.current = getSeriesOptions;
    }
    // We intentionally exclude getChartOptions and getSeriesOptions from deps
    // to prevent infinite re-initialization loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Update drawing tools refs
  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);
  
  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);
  
  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);
  
  useEffect(() => {
    tempDrawingRef.current = tempDrawing;
  }, [tempDrawing]);

  // Chart options should not change based on drawing mode - keep chart running normally
  // Drawing mode only affects the canvas overlay, not the underlying chart behavior
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (chartRef.current) {
        const options = getChartOptions();
        chartRef.current.applyOptions(options);
      }
    }, 50); // Debounce 50ms

    return () => clearTimeout(timeoutId);
  }, [theme, getChartOptions]); // Only update when theme changes, not when drawing mode changes

  // Helper function to render trend lines like TradingView
  const renderLine = useCallback((startPoint, endPoint, style) => {
    if (!chartRef.current || !seriesRef.current) return;

    try {
      // Calculate trend line stats
      const priceChange = endPoint.price - startPoint.price;
      const timeChange = endPoint.time - startPoint.time;
      const priceChangePercent = ((endPoint.price - startPoint.price) / startPoint.price) * 100;
      const slope = priceChange / timeChange;
      const angle = Math.atan(slope) * (180 / Math.PI);

      // Create line series for drawing trend line
      const lineSeries = chartRef.current.addLineSeries({
        color: style.color,
        lineWidth: style.lineWidth || 2,
        lineStyle: style.lineStyle || 0,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
      });

      // Add line data - ENSURE TIME IS ORDERED ASC to prevent error
      const lineData = validateAndSortData([
        { time: startPoint.time, value: startPoint.price },
        { time: endPoint.time, value: endPoint.price },
      ]);

      // Validate data before setting to prevent errors
      if (lineData.length > 0) {
        lineSeries.setData(lineData);
      }

      // Add info markers at start and end points
      const markers = [
        {
          time: startPoint.time,
          position: 'belowBar',
          color: style.color,
          shape: 'arrowUp',
          text: `📈 ${startPoint.price.toFixed(4)}`,
          size: 1
        },
        {
          time: endPoint.time,
          position: 'aboveBar',
          color: style.color,
          shape: 'arrowDown',
          text: `📊 ${endPoint.price.toFixed(4)} (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`,
          size: 2
        }
      ];

      // Add mid-point info marker
      const midTime = Math.floor((startPoint.time + endPoint.time) / 2);
      
      markers.push({
        time: midTime,
        position: 'inBar',
        color: style.color,
        shape: 'circle',
        text: `📐 ${angle.toFixed(1)}°`,
        size: 1
      });

      // Add to global marker collection instead of setting directly
      if (!window.tempMarkers) window.tempMarkers = [];
      window.tempMarkers.push(...markers);

      debugLog(`📈 Trend Line: ${startPoint.price.toFixed(4)} → ${endPoint.price.toFixed(4)} | Change: ${priceChangePercent.toFixed(2)}% | Angle: ${angle.toFixed(1)}°`);
      
  return { series: [lineSeries], priceLines: [] };
    } catch (error) {
      console.error('Error rendering trend line:', error);
    }
  }, [debugLog, validateAndSortData]);

  // Helper function to render rectangle like TradingView with borders
  const renderRectangle = useCallback((startPoint, endPoint, style) => {
    if (!seriesRef.current || !chartRef.current) return;

    try {
      const topPrice = Math.max(startPoint.price, endPoint.price);
      const bottomPrice = Math.min(startPoint.price, endPoint.price);
      const leftTime = Math.min(startPoint.time, endPoint.time);
      const rightTime = Math.max(startPoint.time, endPoint.time);

      // Calculate rectangle info
      const width = rightTime - leftTime;
      const height = topPrice - bottomPrice;
      const priceChange = ((topPrice - bottomPrice) / bottomPrice) * 100;

      // Create horizontal price lines for top and bottom borders
      const topPriceLine = seriesRef.current.createPriceLine({
        price: topPrice,
        color: style.color,
        lineWidth: style.lineWidth || 2,
        lineStyle: 0, // solid line
        axisLabelVisible: false,
        title: '',
      });

      const bottomPriceLine = seriesRef.current.createPriceLine({
        price: bottomPrice,
        color: style.color,
        lineWidth: style.lineWidth || 2,
        lineStyle: 0, // solid line
        axisLabelVisible: false,
        title: '',
      });

      // Add info marker at center
      const centerTime = Math.floor((leftTime + rightTime) / 2);
      
      const infoMarker = [{
        time: centerTime,
        position: 'inBar',
        color: style.color,
        shape: 'square',
        text: `📦 H:${height.toFixed(4)} (+${priceChange.toFixed(2)}%)`,
        size: 2
      }];

      // Sort markers by time before setting
      const sortedMarkers = infoMarker.sort((a, b) => a.time - b.time);
      
      // Set info marker
      seriesRef.current.setMarkers(sortedMarkers);

      debugLog(`📦 Rectangle: ${bottomPrice.toFixed(4)} - ${topPrice.toFixed(4)} | Width: ${width} bars | Height: ${height.toFixed(4)} | Change: ${priceChange.toFixed(2)}%`);

      // Store price line references for cleanup (in real implementation)
  return { series: [], priceLines: [topPriceLine, bottomPriceLine] };
    } catch (error) {
      console.error('Error rendering rectangle:', error);
    }
  }, [debugLog]);

  // Helper function to render circle using price lines like other tools
  const renderCircle = useCallback((startPoint, endPoint, style, isTemporary = false) => {
    if (!seriesRef.current || !chartRef.current) return;

    try {
      // Validate points first
      if (!startPoint || !endPoint || 
          typeof startPoint.price !== 'number' || typeof endPoint.price !== 'number' ||
          typeof startPoint.time !== 'number' || typeof endPoint.time !== 'number') {
        console.warn('Invalid circle points:', { startPoint, endPoint });
        return null;
      }

      const centerPrice = (startPoint.price + endPoint.price) / 2;
      const radius = Math.abs(endPoint.price - startPoint.price) / 2;
      const centerTime = Math.floor((startPoint.time + endPoint.time) / 2);
      
      // Prevent creating circle with zero or very small radius (increased threshold)
      if (radius <= 0 || radius < 0.001) {
        console.warn('Circle radius too small or invalid:', radius, 'StartPrice:', startPoint.price, 'EndPrice:', endPoint.price);
        return null;
      }

      const topPrice = centerPrice + radius;
      const bottomPrice = centerPrice - radius;
      const radiusPercent = ((radius / centerPrice) * 100);
      const priceRange = Math.abs(endPoint.price - startPoint.price);

      // Only create price lines - NO LINE SERIES WHATSOEVER
      debugLog(`⭕ Creating circle price lines: Top=${topPrice.toFixed(4)}, Center=${centerPrice.toFixed(4)}, Bottom=${bottomPrice.toFixed(4)}`);
      
      // Create price lines for circle boundaries (only visual, no labels)
      seriesRef.current.createPriceLine({
        price: topPrice,
        color: style.color || '#FF6B35',
        lineWidth: 2,
        lineStyle: 2, // dotted line for circle boundary
        axisLabelVisible: false,
        title: '',
      });

      seriesRef.current.createPriceLine({
        price: bottomPrice,
        color: style.color || '#FF6B35',
        lineWidth: 2,
        lineStyle: 2, // dotted line for circle boundary
        axisLabelVisible: false,
        title: '',
      });

      // Only center line has ONE label with meaningful data
      seriesRef.current.createPriceLine({
        price: centerPrice,
        color: style.color || '#FF6B35',
        lineWidth: 1,
        lineStyle: 1, // dashed line for center
        axisLabelVisible: false,
        title: '',
      });

      // Only add marker to global collection if NOT temporary drawing (prevent drag spam)
      if (!isTemporary) {
        const centerMarker = {
          time: centerTime,
          position: 'inBar',
          color: style.color || '#FF6B35',
          shape: 'circle',
          text: `⭕ ${priceRange.toFixed(4)} (${radiusPercent.toFixed(1)}%)`,
          size: 2
        };

        if (!window.tempMarkers) window.tempMarkers = [];
        window.tempMarkers.push(centerMarker);
      }

      debugLog(`⭕ Circle SUCCESS: Center ${centerPrice.toFixed(4)} | Range ${priceRange.toFixed(4)} | ${radiusPercent.toFixed(2)}% | ${isTemporary ? 'TEMP' : 'FINAL'} | ONLY PRICE LINES`);
      
  return { series: [], priceLines: [] };
    } catch (error) {
      console.error('Error rendering circle:', error);
      return null;
    }
  }, [debugLog]);

  // Helper function to render Fibonacci retracement with price levels
  const renderFibRetracement = useCallback((startPoint, endPoint, style) => {
    if (!seriesRef.current) return;

    try {
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const priceDiff = endPoint.price - startPoint.price;
      
      // Create price lines for each Fibonacci level
      const priceLines = [];
      
      levels.forEach((level, index) => {
        const price = startPoint.price + (priceDiff * level);
        
        // Create price line for each Fibonacci level
        const fibPriceLine = seriesRef.current.createPriceLine({
          price: price,
          color: style.color || '#FFD700',
          lineWidth: index === 3 ? 2 : 1, // Make 50% level thicker
          lineStyle: index === 0 || index === levels.length - 1 ? 0 : 2, // solid for 0% and 100%, dashed for others
          axisLabelVisible: false,
          title: '',
        });
        
        priceLines.push(fibPriceLine);
      });

      // Add info marker at center
      const centerTime = Math.floor((startPoint.time + endPoint.time) / 2);
      const totalMove = ((endPoint.price - startPoint.price) / startPoint.price) * 100;
      
      const infoMarker = [{
        time: centerTime,
        position: 'inBar',
        color: style.color || '#FFD700',
        shape: 'circle',
        text: `📊 Fib ${totalMove >= 0 ? '+' : ''}${totalMove.toFixed(2)}%`,
        size: 2
      }];

      // Sort markers by time before setting
      const sortedMarkers = infoMarker.sort((a, b) => a.time - b.time);

      seriesRef.current.setMarkers(sortedMarkers);

      debugLog(`📊 Fibonacci Retracement: ${startPoint.price.toFixed(4)} → ${endPoint.price.toFixed(4)} | Move: ${totalMove.toFixed(2)}% | ${levels.length} levels`);
      
  return { series: [], priceLines };
    } catch (error) {
      console.error('Error rendering Fibonacci retracement:', error);
    }
  }, [debugLog]);

  // Helper function to render measure tool
  const renderMeasureTool = useCallback((startPoint, endPoint, style) => {
    if (!seriesRef.current) return;

    try {
      // Calculate measurements
      const priceChange = endPoint.price - startPoint.price;
      const priceChangePercent = ((endPoint.price - startPoint.price) / startPoint.price) * 100;
      const timeChange = endPoint.time - startPoint.time;
      const distance = Math.sqrt(Math.pow(priceChange, 2) + Math.pow(timeChange, 2));

      // Create measurement line
      const measureLineSeries = chartRef.current.addLineSeries({
        color: style.color || '#00D4AA',
        lineWidth: 2,
        lineStyle: 1, // dashed
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
      });

      // Ensure time data is ordered ascending to prevent "data must be asc ordered by time" error
      const measureData = validateAndSortData([
        { time: startPoint.time, value: startPoint.price },
        { time: endPoint.time, value: endPoint.price }
      ]);

      // Validate data before setting to prevent errors
      if (measureData.length > 0) {
        measureLineSeries.setData(measureData);
      }

      // Add measurement markers
      const markers = [
        {
          time: startPoint.time,
          position: 'belowBar',
          color: style.color || '#00D4AA',
          shape: 'circle',
          text: `📏 Start: ${startPoint.price.toFixed(4)}`,
          size: 1
        },
        {
          time: endPoint.time,
          position: 'aboveBar',
          color: style.color || '#00D4AA',
          shape: 'square',
          text: `📐 End: ${endPoint.price.toFixed(4)}`,
          size: 1
        }
      ];

      // Add center measurement info
      const centerTime = Math.floor((startPoint.time + endPoint.time) / 2);
      
      markers.push({
        time: centerTime,
        position: 'inBar',
        color: style.color || '#00D4AA',
        shape: 'arrowUp',
        text: `📊 Δ${priceChange.toFixed(4)} (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%) | ${timeChange} bars`,
        size: 2
      });

      // Add to global marker collection instead of setting directly
      if (!window.tempMarkers) window.tempMarkers = [];
      window.tempMarkers.push(...markers);

      debugLog(`📏 Measure Tool: Price Δ${priceChange.toFixed(4)} (${priceChangePercent.toFixed(2)}%) | Time: ${timeChange} bars | Distance: ${distance.toFixed(2)}`);
      
  return { series: [measureLineSeries], priceLines: [] };
    } catch (error) {
      setError(`Failed to render measure tool: ${error.message}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('Error rendering measure tool:', error);
      }
    }
  }, [debugLog, setError, validateAndSortData]);

  // Helper function to render horizontal line (support/resistance)
  const renderHorizontalLine = useCallback((startPoint, endPoint, style) => {
    if (!seriesRef.current) return;

    try {
      // Use the average price for horizontal line
      const linePrice = (startPoint.price + endPoint.price) / 2;
      
      // Create horizontal price line
      const horizontalLine = seriesRef.current.createPriceLine({
        price: linePrice,
        color: style.color || '#FF6B35',
        lineWidth: style.lineWidth || 2,
        lineStyle: style.lineStyle || 1, // dashed for support/resistance
        axisLabelVisible: false,
        title: '',
      });

      // Add marker with info
      const midTime = Math.floor((startPoint.time + endPoint.time) / 2);
      const lineType = linePrice > Math.min(startPoint.price, endPoint.price) ? 'Resistance' : 'Support';
      
      const marker = [{
        time: midTime,
        position: 'inBar',
        color: style.color || '#FF6B35',
        shape: 'square',
        text: `🔸 ${lineType} ${linePrice.toFixed(4)}`,
        size: 2
      }];

      // Sort markers by time before setting  
      const sortedMarkers = marker.sort((a, b) => a.time - b.time);

      seriesRef.current.setMarkers(sortedMarkers);

      debugLog(`📏 Horizontal Line (${lineType}): ${linePrice.toFixed(4)}`);
      
      return horizontalLine;
    } catch (error) {
      console.error('Error rendering horizontal line:', error);
    }
  }, [debugLog]);

  // Function to render individual drawing objects
  const renderDrawingObject = useCallback((obj, isTemporary = false) => {
    if (!chartRef.current || !obj.points || obj.points.length < 2) return;

    const { type, points, style = {} } = obj;
    const defaultStyle = {
      color: style.color || '#2196F3',
      lineWidth: style.lineWidth || 2,
      lineStyle: style.lineStyle || 0, // solid line
    };

    if (process.env.NODE_ENV === 'development') {
      debugLog(`🖊️ Rendering ${type} with ${points.length} points ${isTemporary ? '(TEMP)' : '(FINAL)'}`)
    }

  switch (type) {
      case 'trendLine':
      case 'verticalLine':
  return renderLine(points[0], points[1], defaultStyle);
      case 'horizontalLine':
  return renderHorizontalLine(points[0], points[1], defaultStyle);
      case 'rectangle':
  return renderRectangle(points[0], points[1], defaultStyle);
      case 'circle':
      case 'ellipse':
  return renderCircle(points[0], points[1], defaultStyle, isTemporary);
      case 'fibRetracement':
  return renderFibRetracement(points[0], points[1], defaultStyle);
      case 'measure':
      case 'measureTool':
  return renderMeasureTool(points[0], points[1], defaultStyle);
      case 'triangle': {
        // Render a simple triangle using three line series between 2 points + mid
        const mid = { time: Math.floor((points[0].time + points[1].time)/2), price: (points[0].price + points[1].price)/2 };
        const s1 = renderLine(points[0], mid, defaultStyle);
        const s2 = renderLine(mid, points[1], defaultStyle);
        const s3 = renderLine(points[1], points[0], defaultStyle);
        return { series: [...(s1?.series||[]), ...(s2?.series||[]), ...(s3?.series||[])], priceLines: [] };
      }
      case 'text': {
        // Add a small marker at the first point as text label
        const marker = {
          time: points[0].time,
          position: 'inBar',
          color: defaultStyle.color,
          shape: 'square',
          text: 'Text',
          size: 2,
        };
        const existing = (window.tempMarkers || []);
        existing.push(marker);
        window.tempMarkers = existing;
        return { series: [], priceLines: [] };
      }
      case 'long': {
        // Long position: entry line and target/stop as dashed lines
        const entry = seriesRef.current.createPriceLine({ price: points[0].price, color: '#26a69a', lineStyle: 0, axisLabelVisible: false, title: '' });
        const target = seriesRef.current.createPriceLine({ price: points[0].price*1.01, color: '#26a69a', lineStyle: 2, axisLabelVisible: false, title: '' });
        const stop = seriesRef.current.createPriceLine({ price: points[0].price*0.99, color: '#ef5350', lineStyle: 2, axisLabelVisible: false, title: '' });
        return { series: [], priceLines: [entry, target, stop] };
      }
      case 'short': {
        const entry = seriesRef.current.createPriceLine({ price: points[0].price, color: '#ef5350', lineStyle: 0, axisLabelVisible: false, title: '' });
        const target = seriesRef.current.createPriceLine({ price: points[0].price*0.99, color: '#ef5350', lineStyle: 2, axisLabelVisible: false, title: '' });
        const stop = seriesRef.current.createPriceLine({ price: points[0].price*1.01, color: '#26a69a', lineStyle: 2, axisLabelVisible: false, title: '' });
        return { series: [], priceLines: [entry, target, stop] };
      }
      case 'forecast': {
        // Simple forecast: extend a line forward from p0 to p1 slope
        const dt = points[1].time - points[0].time;
        const dp = points[1].price - points[0].price;
        const futureTime = points[1].time + Math.max(5, dt);
        const futurePrice = points[1].price + dp;
        return renderLine(points[1], { time: futureTime, price: futurePrice }, { ...defaultStyle, lineStyle: 1 });
      }
      default:
    console.warn(`Unknown drawing type: ${type}`);
    return null;
    }
  }, [renderLine, renderRectangle, renderCircle, renderFibRetracement, renderHorizontalLine, renderMeasureTool, debugLog]);

  // Render drawing objects on chart with proper marker management
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    // Clear all markers first to prevent label duplication
    seriesRef.current.setMarkers([]);
    
    // Initialize global marker collection
    window.tempMarkers = [];
    
    if (drawingObjects.length === 0) return;

    if (process.env.NODE_ENV === 'development') {
      debugLog(`🎨 Rendering ${drawingObjects.length} drawing objects`)
    }
    
    // Use requestAnimationFrame to prevent blocking the main thread
    requestAnimationFrame(() => {
      drawingObjects.forEach(obj => {
        try {
          // Ensure drawing has an id
          if (!obj.id) obj.id = `${obj.type}-${Math.floor(obj.points[0]?.time || Date.now())}-${Math.floor(Math.random()*1e6)}`;
          // Cleanup previous resources for this id to prevent duplicates
          const res = drawingResourcesRef.current[obj.id];
          if (res) {
            if (Array.isArray(res.priceLines)) {
              res.priceLines.forEach(pl => {
                try { seriesRef.current && pl && seriesRef.current.removePriceLine(pl); } catch {}
              });
            }
            if (Array.isArray(res.series)) {
              res.series.forEach(s => { try { chartRef.current && s && chartRef.current.removeSeries(s); } catch {} });
            }
            delete drawingResourcesRef.current[obj.id];
          }
          // Render and store new resources
          const created = renderDrawingObject(obj);
          if (created && (created.priceLines?.length || created.series?.length)) {
            drawingResourcesRef.current[obj.id] = {
              priceLines: created.priceLines || [],
              series: created.series || []
            };
          }
        } catch (error) {
          console.error('Error rendering drawing object:', error, obj);
        }
      });
      
      // Set all collected markers at once
      if (window.tempMarkers && window.tempMarkers.length > 0) {
        // Sort all markers by time before setting
        const sortedTempMarkers = window.tempMarkers.sort((a, b) => a.time - b.time);
        seriesRef.current.setMarkers(sortedTempMarkers);
        if (process.env.NODE_ENV === 'development') {
          debugLog(`🎯 Set ${sortedTempMarkers.length} markers for drawing objects`)
        }
      }
      
      // Clean up
      window.tempMarkers = [];
    });
  }, [drawingObjects, renderDrawingObject, debugLog]); // Add debugLog dependency

  // Render temporary drawing while drawing
  useEffect(() => {
    if (!chartRef.current || !tempDrawing || !tempDrawing.points) return;

    // Only render if we have enough points for the drawing type
    const requiredPoints = tempDrawing.type === 'circle' || tempDrawing.type === 'ellipse' || 
                          tempDrawing.type === 'rectangle' || tempDrawing.type === 'fibRetracement' ? 2 : 2;
    
    if (tempDrawing.points.length < requiredPoints) return;

    if (process.env.NODE_ENV === 'development') {
      debugLog(`🖊️ Rendering temporary ${tempDrawing.type} with ${tempDrawing.points.length} points`)
    }
    
    try {
      // Clear existing price lines only for temporary drawings to prevent spam
      if (seriesRef.current) {
        // Note: Unfortunately, there's no direct way to remove specific price lines
        // We rely on the isTemporary flag to prevent marker spam instead
        if (process.env.NODE_ENV === 'development') {
          debugLog(`🧹 Temporary drawing - preventing marker accumulation`)
        }
      }      // Create temporary style
      const tempStyle = {
        color: '#FFD700', // Gold color for temporary drawing
        lineWidth: 2,
        lineStyle: 1, // dashed line
      };

      // Render temporary drawing with isTemporary = true to prevent marker spam
      renderDrawingObject({
        ...tempDrawing,
        style: tempStyle
      }, true); // Pass true for isTemporary
    } catch (error) {
      console.error('Error rendering temporary drawing:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempDrawing]); // Remove renderDrawingObject to prevent infinite loop

  // Save drawing objects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${playerStateKey}_drawingObjects`, JSON.stringify(drawingObjects));
    } catch (error) {
      console.warn('Failed to save drawing objects:', error);
    }
  }, [drawingObjects, playerStateKey, playerId]);

  // Save drawing mode to localStorage
  useEffect(() => {
    if (drawingMode !== null) {
      localStorage.setItem(`${playerStateKey}_drawingMode`, drawingMode)
    } else {
      localStorage.removeItem(`${playerStateKey}_drawingMode`)
    }
  }, [drawingMode, playerStateKey])

  // Save drawing objects to localStorage
  useEffect(() => {
    localStorage.setItem(`${playerStateKey}_drawingObjects`, JSON.stringify(drawingObjects))
  }, [drawingObjects, playerStateKey])

  // Initialize chart with proper configuration
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (error) {
        console.warn('Error removing existing chart:', error);
      }
      chartRef.current = null;
      seriesRef.current = null;
    }

    if (process.env.NODE_ENV === 'development') {
      debugLog('🔧 Creating chart instance...')
    }
    
    try {
      // Get chart options with safety check
      const chartOptions = getChartOptionsRef.current && typeof getChartOptionsRef.current === 'function' 
        ? getChartOptionsRef.current() 
        : getChartOptions();
      
      // Ensure container has valid dimensions
      const containerWidth = chartContainerRef.current.clientWidth || 800;
      const containerHeight = chartContainerRef.current.clientHeight || 600;
      
      if (containerWidth < 100 || containerHeight < 100) {
        console.warn('Chart container dimensions too small:', { width: containerWidth, height: containerHeight });
        setTimeout(() => {
          // Retry after container is properly sized
          if (chartContainerRef.current) {
            const newWidth = chartContainerRef.current.clientWidth;
            const newHeight = chartContainerRef.current.clientHeight;
            if (newWidth >= 100 && newHeight >= 100) {
              // Recursively retry initialization
              window.requestAnimationFrame(() => {
                if (!chartRef.current) {
                  // Re-trigger effect
                  setError(null);
                }
              });
            }
          }
        }, 100);
        return;
      }
      
      const chart = createChart(chartContainerRef.current, {
        width: containerWidth,
        height: containerHeight,
        ...chartOptions,
      });

      // Verify chart was created successfully
      if (!chart) {
        throw new Error('Failed to create chart instance');
      }

      // Create main candlestick series (main price scale)
      const seriesOptions = getSeriesOptionsRef.current && typeof getSeriesOptionsRef.current === 'function'
        ? getSeriesOptionsRef.current()
        : getSeriesOptions();
        
      const series = chart.addCandlestickSeries({
        ...seriesOptions,
        priceScaleId: 'right', // Use right price scale for main chart
      });

      // Verify series was created successfully
      if (!series) {
        throw new Error('Failed to create candlestick series');
      }

      // Store references
      chartRef.current = chart;
      seriesRef.current = series;

      // Configure chart behavior for trading with drag support - NO AUTO SCROLL/ALIGN
      chart.timeScale().applyOptions({
        shiftVisibleRangeOnNewBar: false, // Don't auto-scroll to new bars
        lockVisibleTimeRangeOnResize: true, // Keep current view when resizing
        rightOffset: 0, // No automatic right offset
      });

      // User has complete control over chart view (zoom, pan, navigate)
      // Chart doesn't force any view or scrolling behavior
      
    } catch (error) {
      console.error('Error creating chart:', error);
      setError('Failed to create chart. Please refresh the page.');
      return;
    }

    // Handle resize events
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    // Add keyboard navigation for horizontal panning
    const handleKeyDown = (event) => {
      if (!chartRef.current) return;
      
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      
      if (!visibleRange) return;
      
      const rangeSize = visibleRange.to - visibleRange.from;
      const scrollAmount = rangeSize * 0.1; // 10% of visible range
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          timeScale.setVisibleRange({
            from: visibleRange.from - scrollAmount,
            to: visibleRange.to - scrollAmount,
          });
          break;
        case 'ArrowRight':
          event.preventDefault();
          timeScale.setVisibleRange({
            from: visibleRange.from + scrollAmount,
            to: visibleRange.to + scrollAmount,
          });
          break;
        default:
          // No action for other keys
          break;
      }
    };

    // Chart event handlers
    const handleMouseDown = (event) => {
      if (!chartRef.current || !seriesRef.current) return;
      
      try {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const timeScale = chartRef.current.timeScale();
        
        if (!timeScale || !seriesRef.current) return;
        
        const time = timeScale.coordinateToTime(x);
        const price = seriesRef.current.coordinateToPrice(y);
        
        if (time === null || price === null) return;

        // Handle drawing tools
        if (process.env.NODE_ENV === 'development') {
          debugLog(`🖱️ Mouse down - drawingMode: ${drawingModeRef.current}, selectedTool: ${selectedToolRef.current}`)
        }
        if (drawingModeRef.current && selectedToolRef.current) {
          if (process.env.NODE_ENV === 'development') {
            debugLog(`🎯 Starting drawing with ${selectedToolRef.current}`)
          }
          setIsDrawing(true);
          isDrawingRef.current = true; // Set ref immediately for mouse move handler
          const point = { time, price, x, y };
          
          switch (selectedToolRef.current) {
            case 'trendLine':
            case 'horizontalLine':
            case 'verticalLine':
            case 'arrow':
              setTempDrawing({ type: selectedToolRef.current, points: [point] });
              break;
            case 'rectangle':
            case 'circle':
            case 'ellipse':
              setTempDrawing({ type: selectedToolRef.current, points: [point] });
              break;
            case 'fibRetracement':
            case 'fibExtension':
              setTempDrawing({ type: selectedToolRef.current, points: [point] });
              break;
            default:
              break;
          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // Handle measurement mode
        if (measurementModeRef.current) {
          setIsDragging(true);
          setDragStart({ time, price });
          event.preventDefault();
        }
      } catch (error) {
        console.warn('Mouse down error:', error);
      }
    };

    const handleMouseMove = (event) => {
      if (!chartRef.current || !seriesRef.current) return;
      
      try {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const timeScale = chartRef.current.timeScale();
        
        if (!timeScale || !seriesRef.current) return;
        
        const time = timeScale.coordinateToTime(x);
        const price = seriesRef.current.coordinateToPrice(y);
        
        if (time === null || price === null) return;

        // Handle drawing tools - use throttling to prevent infinite loops
        if (isDrawingRef.current && tempDrawingRef.current && selectedToolRef.current) {
          const endPoint = { time, price, x, y };
          
          setTempDrawing(prev => {
            if (!prev || !prev.points || !prev.points[0]) return prev;
            
            return {
              ...prev,
              points: [prev.points[0], endPoint]
            };
          });
        }

        // Handle measurement mode
        if (measurementModeRef.current && isDraggingRef.current && dragStartRef.current) {
          // Visual feedback for measurement mode could be added here
          event.preventDefault();
        }
        
        event.preventDefault();
      } catch (error) {
        console.warn('Mouse move error:', error);
      }
    };

    const handleMouseUp = (event) => {
      if (!chartRef.current || !seriesRef.current) return;
      
      try {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const timeScale = chartRef.current.timeScale();
        
        if (!timeScale || !seriesRef.current) return;
        
        const time = timeScale.coordinateToTime(x);
        const price = seriesRef.current.coordinateToPrice(y);
        
        if (time === null || price === null) return;

        // Handle drawing tools completion
        if (isDrawingRef.current && tempDrawingRef.current && selectedToolRef.current) {
          const endPoint = { time, price, x, y };
          const finalDrawing = {
            type: selectedToolRef.current,
            points: [tempDrawingRef.current.points[0], endPoint],
            style: { color: '#2196F3', lineWidth: 2 }
          };

          // Add special calculations for specific tools
          if (selectedToolRef.current === 'fibRetracement') {
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            const priceDiff = endPoint.price - tempDrawingRef.current.points[0].price;
            finalDrawing.data = {
              fibLevels: levels.map(level => ({
                level,
                price: tempDrawingRef.current.points[0].price + (priceDiff * level),
                percentage: level * 100
              }))
            };
          }

          setDrawingObjects(prev => [...prev, {
            id: Date.now() + Math.random(),
            ...finalDrawing,
            timestamp: new Date().toISOString()
          }]);
          
          setIsDrawing(false);
          isDrawingRef.current = false; // Clear ref immediately
          setTempDrawing(null);
          tempDrawingRef.current = null; // Clear ref immediately
          event.preventDefault();
          return;
        }

        // Handle measurement mode completion
        if (measurementModeRef.current && isDraggingRef.current && dragStartRef.current) {
          if (addMeasurementLineRef.current && typeof addMeasurementLineRef.current === 'function') {
            addMeasurementLineRef.current(dragStartRef.current, { time, price });
          } else {
            console.warn('addMeasurementLineRef.current is not a function:', addMeasurementLineRef.current);
          }
        }
      } catch (error) {
        console.warn('Mouse up error:', error);
      } finally {
        setIsDragging(false);
        setDragStart(null);
        event.preventDefault();
      }
    };

    window.addEventListener('resize', handleResize);
    const currentContainer = chartContainerRef.current; // Copy ref for cleanup
    if (currentContainer) {
      currentContainer.addEventListener('keydown', handleKeyDown);
      currentContainer.addEventListener('mousedown', handleMouseDown);
      currentContainer.addEventListener('mousemove', handleMouseMove);
      currentContainer.addEventListener('mouseup', handleMouseUp);
      currentContainer.setAttribute('tabindex', '0'); // Make focusable for keyboard events
    }
    
    if (process.env.NODE_ENV === 'development') {
      debugLog('🔧 Chart initialized successfully')
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        debugLog('🔧 Cleaning up chart...')
      }
      window.removeEventListener('resize', handleResize);
      if (currentContainer) {
        currentContainer.removeEventListener('keydown', handleKeyDown);
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, convertXToTime, convertYToPrice, debugLog]); // Removed drawingMode, isDrawing, tempDrawing to prevent chart flickering

  // Update chart data when chartData changes
  useEffect(() => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        debugLog('No valid chartData provided')
      }
      return;
    }
    
    if (!seriesRef.current) {
      if (process.env.NODE_ENV === 'development') {
        debugLog('Chart series not ready')
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      debugLog(`📊 Updating chart with ${chartData.length} candles`)
    }
    
    try {
      // Prepare candlestick data (exclude volume)
      const candlestickData = chartData.map(({ volume, ...rest }) => rest);

      // Validate all required properties exist and are not null
      const validatedData = candlestickData.filter(item => 
        item && 
        typeof item.time === 'number' && 
        typeof item.open === 'number' && 
        typeof item.high === 'number' && 
        typeof item.low === 'number' && 
        typeof item.close === 'number' &&
        !isNaN(item.time) && 
        !isNaN(item.open) && 
        !isNaN(item.high) && 
        !isNaN(item.low) && 
        !isNaN(item.close)
      );

      // Validate and sort data before setting
      const validatedCandlestickData = validateAndSortData(validatedData);

      // Update series data with validated data
      if (validatedCandlestickData.length > 0 && seriesRef.current) {
        try {
          seriesRef.current.setData(validatedCandlestickData);
          debugLog(`📊 Main chart updated: ${validatedCandlestickData.length} points`);
          
          // Update current price and related values safely
          const latestData = validatedCandlestickData[validatedCandlestickData.length - 1];
          if (latestData && typeof latestData.close === 'number') {
            const newPrice = latestData.close;
            setCurrentPrice(newPrice);
            
            if (validatedCandlestickData.length > 1) {
              const prevData = validatedCandlestickData[validatedCandlestickData.length - 2];
              if (prevData && typeof prevData.close === 'number') {
                const change = newPrice - prevData.close;
                const percentChange = ((change / prevData.close) * 100);
                
                setPriceChange(change);
                setPercentChange(percentChange);
              }
            }
            
            // Update OHLC values
            setOhlc({
              open: latestData.open || 0,
              high: latestData.high || 0,
              low: latestData.low || 0,
              close: latestData.close || 0
            });
            
            // Update volume if available
            const latestVolume = chartData[chartData.length - 1]?.volume;
            if (typeof latestVolume === 'number') {
              setVolume(latestVolume);
            }
            
            // Trigger callback if provided
            if (onCurrentPriceChange && typeof onCurrentPriceChange === 'function') {
              onCurrentPriceChange(newPrice);
            }
          }
        } catch (error) {
          console.error('Error setting candlestick data:', error);
          setError(`Failed to update chart: ${error.message}`);
        }
      }
      
      // Volume is now handled as an indicator, not separately
      
      // DO NOT auto-fit content - let user control zoom/pan independently
      // Removed fitContent() to prevent auto-alignment
      if (chartRef.current && !chartRef.current._hasInitialFit) {
        // Only set initial fit flag without actually fitting
        chartRef.current._hasInitialFit = true; // Mark as fitted but don't call fitContent()
      }
      
      if (process.env.NODE_ENV === 'development') {
        debugLog(`✅ Chart updated successfully`)
      }
    } catch (error) {
      console.error('❌ Error updating chart:', error);
    }
    
    // Update price information
    if (chartData.length > 0) {
      const lastDataPoint = chartData[chartData.length - 1];
      const newPrice = lastDataPoint.close;
      
      setCurrentPrice(newPrice);
      setOhlc({
        open: lastDataPoint.open,
        high: lastDataPoint.high,
        low: lastDataPoint.low,
        close: lastDataPoint.close
      });
      setVolume(lastDataPoint.volume || 0);
      
      // Calculate price change
      if (chartData.length > 1) {
        const previousPrice = chartData[chartData.length - 2].close;
        const change = newPrice - previousPrice;
        const percentChg = (change / previousPrice) * 100;
        setPriceChange(change);
        setPercentChange(percentChg);
      }
      
      // Notify parent component
      if (onCurrentPriceChange) {
        onCurrentPriceChange(newPrice);
      }
      
      // Update MACD values if MACD is enabled
      if (analysisTools.macd.enabled && chartData.length > 26) {
        const macdData = calculateMACD(chartData);
        if (macdData.macd.length > 0) {
          const lastIndex = macdData.macd.length - 1;
          setMacdValues({
            macd: macdData.macd[lastIndex]?.value || 0,
            signal: macdData.signal[lastIndex]?.value || 0,
            histogram: macdData.histogram[lastIndex]?.value || 0
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData]); // Remove onCurrentPriceChange to prevent infinite loop

  // Handle playback index for synchronized multiplayer updates (improved pause/resume behavior)
  useEffect(() => {
    if (playbackIndex !== null && allData.length > 0 && seriesRef.current) {
      
      // When chart is paused, store the current index but don't update chart
      if (isPaused) {
        if (pausedAtIndex === null) {
          setPausedAtIndex(playbackIndex)
          debugLog(`⏸️ Chart paused at index ${playbackIndex} - Data frozen for analysis`)
        }
        return // Chart updates paused, but game clock keeps ticking
      }
      
      // When resuming from pause, jump to current playback index immediately
      if (pausedAtIndex !== null && !isPaused) {
        debugLog(`▶️ Resuming chart - jumping from index ${pausedAtIndex} to ${playbackIndex}`)
        setPausedAtIndex(null)
      }
      
      debugLog(`📊 Updating chart to playback index ${playbackIndex} of ${allData.length - 1} (Player: ${playerId})`);
      
      try {
        // Get data slice up to current playback index
        const dataToShow = allData.slice(0, Math.min(playbackIndex + 1, allData.length));
        
        if (dataToShow.length > 0) {
          // Validate data before using
          const validData = dataToShow.filter(item => 
            item && 
            typeof item.time === 'number' && 
            typeof item.open === 'number' && 
            typeof item.high === 'number' && 
            typeof item.low === 'number' && 
            typeof item.close === 'number' &&
            !isNaN(item.time) && 
            !isNaN(item.open) && 
            !isNaN(item.high) && 
            !isNaN(item.low) && 
            !isNaN(item.close)
          );
          
          if (validData.length > 0) {
            // Update chartData state to trigger price updates
            setChartData(validData);
            
            // Prepare data for chart
            const candlestickData = validData.map(({ volume, ...rest }) => rest);
            
            // Validate and sort data before setting
            const validatedCandlestickData = validateAndSortData(candlestickData);
            
            // Update chart series with validated data
            if (validatedCandlestickData.length > 0 && seriesRef.current) {
              seriesRef.current.setData(validatedCandlestickData);
            }
            
            setCurrentIndex(playbackIndex);
            debugLog(`✅ Chart synchronized to playback index ${playbackIndex}`);
          }
        }
      } catch (error) {
        setError(`Failed to update chart: ${error.message}`)
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error updating playback:', error);
        }
      }
    }
  }, [playbackIndex, allData, isPaused, playerId, debugLog, setError, validateAndSortData, pausedAtIndex]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (loading || allData.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        debugLog('Data loading skipped - already loading or data exists')
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      debugLog('🔧 Initializing chart data...')
    }
    setLoading(true);
    setError(null);
    
    try {
      const data = generateMultiplayerData();
      
      if (data.length === 0) {
        throw new Error('Failed to generate chart data');
      }
      
      if (process.env.NODE_ENV === 'development') {
        debugLog(`✅ Data generation complete: ${data.length} points`)
        debugLog(`📊 Price range: ${Math.min(...data.map(d => d.low)).toFixed(2)} - ${Math.max(...data.map(d => d.high)).toFixed(2)}`)
      }
      
      // Store complete dataset
      setAllData(data);
      
      // Start with reasonable amount of data for initial view
      const initialData = data.slice(0, Math.min(100, data.length));
      setChartData(initialData);
      setCurrentIndex(initialData.length - 1);
      
      // Notify parent component
      if (onDataLoaded) {
        onDataLoaded(data);
      }
      
    } catch (err) {
      console.error('??? Data loading failed:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateMultiplayerData, loading, allData.length]); // Remove onDataLoaded callback to prevent infinite loop

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - only run once on mount

  // Utility functions for formatting
  const formatPrice = useCallback((price) => {
    return price?.toFixed(2) || '0.00';
  }, []);

  const formatChange = useCallback((change, percent) => {
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    const percentStr = percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
    return `${changeStr} (${percentStr})`;
  }, []);

  const formatVolume = useCallback((vol) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  }, [])
  return (
    <div className="h-full w-full bg-gradient-to-b from-[#0f1419] to-[#131722] text-white flex flex-col">
      {/* Enhanced Header with beautiful gradients and improved layout */}
      <div className="relative bg-gradient-to-r from-[#1a1f2e] via-[#1e222d] to-[#1a1f2e] border-b border-gradient-to-r from-transparent via-[#2a2e39] to-transparent shadow-lg">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
        
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Section: Symbol, Player, Play/Pause, Status */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              {/* Enhanced Symbol Display */}
              <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-4 py-2 rounded-xl border border-blue-500/30">
                <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {symbol || 'PTT'}
                </span>
                <div className="px-2 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                  LIVE
                </div>
              </div>
              
              {/* Enhanced Player Badge */}
              <div className="px-3 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-300 border border-blue-500/50 shadow-lg" title={`Player ID: ${playerId}`}>
                <span className="text-blue-200">Player</span> 
                <span className="text-white ml-1">P{playerId?.slice(-4) || 'ANON'}</span>
              </div>
            </div>
            {/* Premium Play/Pause Button with enhanced design */}
            <button
              onClick={handlePlayPause}
              disabled={isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true}
              className={`
                relative px-4 py-3 rounded-xl font-bold text-sm
                transition-all duration-300 transform hover:scale-105 active:scale-95
                ${isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true
                  ? 'bg-gray-600 cursor-not-allowed opacity-50' // Disabled when externally controlled
                  : isPaused 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-xl shadow-green-600/40 border border-green-400/60' 
                    : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-xl shadow-orange-600/40 border border-orange-400/60'
                }
                group focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm
              `}
              title={
                isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true
                  ? "Chart controls disabled - Game has ended"
                  : `${isPaused ? 'Resume Chart Updates' : 'Pause Chart Updates'} (Game Timer Continues) - Player ${playerId?.slice(-4)} | Press Spacebar`
              }
            >
              <div className="flex items-center space-x-3">
                {isPaused ? (
                  <>
                    <Play size={18} className="text-white drop-shadow-lg" />
                    <span className="text-white font-bold drop-shadow-lg">
                      {isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true ? 'Game Ended' : 'Resume'}
                    </span>
                  </>
                ) : (
                  <>
                    <Pause size={18} className="text-white drop-shadow-lg" />
                    <span className="text-white font-bold drop-shadow-lg">Pause</span>
                  </>
                )}
                {!(isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true) && (
                  <span className="text-xs text-white/80 bg-black/30 px-2 py-1 rounded-md text-[10px] font-semibold border border-white/20">
                    Space
                  </span>
                )}
              </div>
              {/* Enhanced glow effect */}
              {!(isChartPaused !== null && isChartPaused !== undefined && isChartPaused === true) && (
                <div className={`
                  absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 
                  transition-all duration-300 blur-sm
                  ${isPaused ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gradient-to-r from-orange-400 to-amber-400'}
                `}></div>
              )}
            </button>
            {/* Premium pause indicator with beautiful styling */}
            {isPaused && (
              <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-red-900/60 to-red-800/40 border border-red-500/70 rounded-xl shadow-2xl backdrop-blur-sm">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-red-300 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-red-400 to-red-300 rounded-full opacity-50"></div>
                </div>
                <span className="text-sm text-red-100 font-bold drop-shadow-lg">Chart Paused</span>
                <div className="w-px h-4 bg-red-400/50"></div>
                <span className="text-xs text-red-200/80 font-semibold">Timer Active</span>
              </div>
            )}
            {/* Premium Chart Navigation Controls */}
            <div className="flex items-center space-x-2 bg-gradient-to-r from-[#2a2e39] to-[#2d3748] rounded-xl p-2 shadow-lg border border-[#3a3e49]">
              <button
                onClick={goToLatestData}
                className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-blue-500/30 transform hover:scale-105"
                title="Go to Latest Data"
              >
                <span className="flex items-center space-x-1">
                  <span>📊</span>
                  <span>Latest</span>
                </span>
              </button>
              <button
                onClick={fitAllData}
                className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg hover:from-emerald-500 hover:to-green-600 transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 transform hover:scale-105"
                title="Fit All Data in View"
              >
                <span className="flex items-center space-x-1">
                  <span>🔍</span>
                  <span>Fit All</span>
                </span>
              </button>
            </div>
          </div>
          {/* Enhanced Right Section: Price Display */}
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              {/* Premium Price Display */}
              <div className="text-right">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 drop-shadow-lg">
                  {formatPrice(currentPrice)}
                </span>
              </div>
            </div>
            <span className={`text-lg font-semibold ${priceChange >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              {formatChange(priceChange, percentChange)}
            </span>
          </div>
        </div>

        {/* Middle: Analysis Tools Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-[#2a2e39] rounded-lg p-1">
            <button onClick={() => toggleAnalysisTool('sma')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${analysisTools.sma.enabled ? 'bg-[#ff9800] text-white' : 'text-gray-400 hover:text-white hover:bg-[#363c4e]'}`} title="Simple Moving Average">SMA</button>
            <button onClick={() => toggleAnalysisTool('ema')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${analysisTools.ema.enabled ? 'bg-[#e91e63] text-white' : 'text-gray-400 hover:text-white hover:bg-[#363c4e]'}`} title="Exponential Moving Average">EMA</button>
            <button onClick={() => toggleAnalysisTool('bollinger')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${analysisTools.bollinger.enabled ? 'bg-[#9c27b0] text-white' : 'text-gray-400 hover:text-white hover:bg-[#363c4e]'}`} title="Bollinger Bands">BB</button>
            <button onClick={() => toggleAnalysisTool('rsi')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${analysisTools.rsi.enabled ? 'bg-[#00bcd4] text-white' : 'text-gray-400 hover:text-white hover:bg-[#363c4e]'}`} title="Relative Strength Index">RSI</button>
            <button onClick={() => toggleAnalysisTool('macd')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${analysisTools.macd.enabled ? 'bg-[#673ab7] text-white' : 'text-gray-400 hover:text-white hover:bg-[#363c4e]'}`} title="MACD (Moving Average Convergence Divergence)">MACD</button>
            <button onClick={() => toggleAnalysisTool('volume')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${analysisTools.volume.enabled ? 'bg-[#26a69a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#363c4e]'}`} title="Volume">VOL</button>
          </div>
        </div>

        {/* Right: OHLC, Volume and MACD data */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-gray-300">Time: <span className="text-white font-medium">{Math.floor(actualGameDuration / 60)}:{(actualGameDuration % 60).toString().padStart(2, '0')}</span></div>
          <div className="text-gray-300">O: <span className="text-white font-medium">{formatPrice(ohlc.open)}</span></div>
          <div className="text-gray-300">H: <span className="text-white font-medium">{formatPrice(ohlc.high)}</span></div>
          <div className="text-gray-300">L: <span className="text-white font-medium">{formatPrice(ohlc.low)}</span></div>
          <div className="text-gray-300">C: <span className="text-white font-medium">{formatPrice(ohlc.close)}</span></div>
          <div className="text-gray-300">Vol: <span className="text-white font-medium">{formatVolume(volume)}</span></div>
          {analysisTools.macd.enabled && (
            <>
              <div className="text-gray-300">MACD: <span className={`font-medium ${macdValues.macd >= 0 ? 'text-green-400' : 'text-red-400'}`}>{macdValues.macd.toFixed(4)}</span></div>
              <div className="text-gray-300">Signal: <span className={`font-medium ${macdValues.signal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{macdValues.signal.toFixed(4)}</span></div>
              <div className="text-gray-300">Hist: <span className={`font-medium ${macdValues.histogram >= 0 ? 'text-green-400' : 'text-red-400'}`}>{macdValues.histogram.toFixed(4)}</span></div>
            </>
          )}
        </div>
      </div>

      {/* Drawing Tools Panel */}
      <div className="px-4 py-2 bg-[#1e222d] border-b border-[#2a2e39]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-gray-300 text-sm font-medium">Drawing Tools:</span>
            {selectedTool && (
              <span className="px-2 py-1 bg-[#2196F3] text-white text-xs rounded animate-pulse">🎨 {drawingTools[selectedTool]?.name || selectedTool} Active</span>
            )}
            {isDrawing && (
              <span className="text-[#FFD700] text-xs font-medium animate-pulse">✏️ Drawing in progress...</span>
            )}
            {selectedTool && !isDrawing && (
              <span className="text-[#4caf50] text-xs font-medium">👆 Click and drag on chart to draw</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={toggleMeasurementMode} className={`px-2 py-1 text-xs rounded transition-colors ${measurementMode ? 'bg-[#4caf50] text-white' : 'bg-[#2a2e39] text-gray-300 hover:bg-[#363a45]'}`}><Ruler className="inline w-3 h-3 mr-1" />Measure</button>
            <button onClick={clearDrawingTool} className="px-2 py-1 text-xs bg-[#2a2e39] text-gray-300 rounded hover:bg-[#363a45] transition-colors" disabled={!selectedTool}>Clear Tool</button>
            <button onClick={clearAllDrawings} className="px-2 py-1 text-xs bg-[#ef5350] text-white rounded hover:bg-[#d32f2f] transition-colors" disabled={drawingObjects.length === 0}>Clear All ({drawingObjects.length})</button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-1">
          {['trendLine', 'horizontalLine', 'verticalLine'].map(tool => (
            <button key={tool} onClick={() => selectDrawingTool(tool)} className={`p-1 text-xs rounded transition-colors ${selectedTool === tool ? 'bg-[#2196F3] text-white' : 'bg-[#2a2e39] text-gray-300 hover:bg-[#363a45]'}`} title={drawingTools[tool]?.name}>{drawingTools[tool]?.icon}</button>
          ))}
          {['fibRetracement', 'fibExtension'].map(tool => (
            <button key={tool} onClick={() => selectDrawingTool(tool)} className={`p-1 text-xs rounded transition-colors ${selectedTool === tool ? 'bg-[#2196F3] text-white' : 'bg-[#2a2e39] text-gray-300 hover:bg-[#363a45]'}`} title={drawingTools[tool]?.name}>{drawingTools[tool]?.icon}</button>
          ))}
          {['rectangle', 'circle', 'triangle'].map(tool => (
            <button key={tool} onClick={() => selectDrawingTool(tool)} className={`p-1 text-xs rounded transition-colors ${selectedTool === tool ? 'bg-[#2196F3] text-white' : 'bg-[#2a2e39] text-gray-300 hover:bg-[#363a45]'}`} title={drawingTools[tool]?.name}>{drawingTools[tool]?.icon}</button>
          ))}
          {['text', 'longPosition', 'shortPosition', 'forecast'].map(tool => (
            <button key={tool} onClick={() => selectDrawingTool(tool)} className={`p-1 text-xs rounded transition-colors ${selectedTool === tool ? 'bg-[#2196F3] text-white' : 'bg-[#2a2e39] text-gray-300 hover:bg-[#363a45]'}`} title={drawingTools[tool]?.name}>{drawingTools[tool]?.icon}</button>
          ))}
        </div>
        {(drawingMode || isDrawing) && (
          <div className="mt-2 p-2 bg-[#2a2e39] rounded text-xs">
            {isDrawing ? (
              <div className="flex items-center space-x-2 text-[#4caf50]"><span className="animate-pulse">●</span><span>Drawing {drawingTools[selectedTool]?.name}... Click and drag to complete</span></div>
            ) : (
              <div className="text-[#2196F3]"><span>{drawingTools[selectedTool]?.name} tool selected. Click on chart to start drawing.</span></div>
            )}
          </div>
        )}
      </div>

      {(measurementMode || measurementLines.length > 0) && (
        <div className="px-4 py-2 bg-[#1e222d] border-b border-[#2a2e39]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {measurementMode && (
                <div className="flex items-center space-x-2 text-[#4caf50]"><Ruler size={16} /><span className="text-sm font-medium">Measurement Mode Active</span><span className="text-xs text-gray-400">Click and drag to measure price/time distances</span></div>
              )}
            </div>
            {measurementLines.length > 0 && (
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-300">Measurements ({measurementLines.length}):</span>
                <div className="flex items-center space-x-3 max-w-md overflow-x-auto">
                  {measurementLines.slice(-3).map((line) => (
                    <div key={line.id} className="flex items-center space-x-2 bg-[#2a2e39] px-2 py-1 rounded text-xs">
                      <span className="text-white font-medium">{line.distance.priceDiff}</span>
                      <span className={`font-medium ${parseFloat(line.distance.priceChangePercent) >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>({line.distance.priceChangePercent}%)</span>
                      <span className="text-gray-400">{line.distance.timeDiff}</span>
                    </div>
                  ))}
                  {measurementLines.length > 3 && (<span className="text-gray-400 text-xs">+{measurementLines.length - 3} more</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chart Container with Left Sidebar */}
      <div className="flex flex-1">
        {/* Enhanced Left Sidebar with Premium Design */}
        <div className="w-12 bg-gradient-to-b from-[#1a1f2e] via-[#1e222d] to-[#1a1f2e] border-r border-gray-600/40 flex flex-col items-center py-4 space-y-3 shadow-xl">
          <button 
            onClick={toggleMeasurementMode} 
            className={`p-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 ${
              measurementMode 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25' 
                : 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:shadow-md'
            }`} 
            title={`Price/Time Measurement Tool ${measurementMode ? '(Active)' : ''}`}
          >
            <Ruler size={16} />
          </button>
          {measurementLines.length > 0 && (
            <button 
              onClick={clearMeasurements} 
              className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-gradient-to-r hover:from-red-900/40 hover:to-red-800/40 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md" 
              title={`Clear ${measurementLines.length} measurement(s)`}
            >
              <span className="text-base">🗑️</span>
            </button>
          )}
          <button 
            className="p-2.5 text-gray-500 rounded-lg cursor-not-allowed opacity-50" 
            title="Trend Line (Coming Soon)" 
            disabled
          >
            <TrendingUp size={16} />
          </button>
          <button 
            className="p-2.5 text-gray-500 rounded-lg cursor-not-allowed opacity-50" 
            title="Drawing Tools (Coming Soon)" 
            disabled
          >
            <Square size={16} />
          </button>
          <button 
            className="p-2.5 text-gray-500 rounded-lg cursor-not-allowed opacity-50" 
            title="Chart Settings (Coming Soon)" 
            disabled
          >
            <Settings size={16} />
          </button>
        </div>
        {/* Premium Chart Area with Enhanced Design */}
        <div className="flex-1 relative bg-gradient-to-br from-[#0a0e1a] via-[#0d1220] to-[#0a0e1a] rounded-r-xl border border-gray-600/30 shadow-2xl overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#131722]/95 to-[#0a0e1a]/95 backdrop-blur-sm z-10">
              <div className="flex items-center space-x-4 bg-gradient-to-r from-[#1a1f2e]/80 to-[#1e222d]/80 px-6 py-4 rounded-xl border border-gray-600/40 shadow-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gradient-to-r from-blue-400 to-cyan-400"></div>
                <span className="text-gray-200 text-lg font-medium">Generating market data...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#131722]/95 to-[#0a0e1a]/95 backdrop-blur-sm z-10">
              <div className="text-center bg-gradient-to-r from-[#1a1f2e]/80 to-[#1e222d]/80 px-8 py-6 rounded-xl border border-red-500/40 shadow-xl">
                <div className="text-red-400 mb-4 text-lg font-medium">{error}</div>
                <button 
                  onClick={loadData} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg transform hover:scale-105"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          )}
          <div
            ref={chartContainerRef}
            className={`w-full h-full rounded-r-xl ${drawingMode ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ touchAction: 'none' }}
          ></div>
          {/* Canvas Drawing Overlay - Always Available for Professional Analysis */}
          {chartContainerRef.current && (
            <Stage
              ref={stageRef}
              width={canvasSize.width || chartContainerRef.current?.clientWidth || 0}
              height={canvasSize.height || chartContainerRef.current?.clientHeight || 0}
              className={`absolute inset-0 z-30 ${drawingMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
              onClick={drawingMode ? handleCanvasClick : undefined}
              onMouseMove={drawingMode ? handleCanvasMouseMove : undefined}
              listening={drawingMode}
            >
              <Layer>
                {/* Always render completed drawings so users can see their analysis */}
                {drawingObjects.map((drawing) => {
                  try {
                    return renderCanvasDrawing(drawing, false)
                  } catch (error) {
                    console.warn('Skipping drawing due to error:', error.message)
                    return null
                  }
                })}
                {/* Render temporary drawing only when in drawing mode */}
                {drawingMode && tempDrawing && (() => {
                  try {
                    return renderCanvasDrawing(tempDrawing, true)
                  } catch (error) {
                    console.warn('Skipping temp drawing due to error:', error.message)
                    return null
                  }
                })()}
              </Layer>
            </Stage>
          )}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 pointer-events-none z-10">
            {/* Main Chart Layer Indicator */}
            <div className="px-2 py-1 rounded text-xs text-white font-medium bg-blue-600 opacity-80">
              📈 MAIN CHART
            </div>
            
            {/* Volume Layer Indicator */}
            {analysisTools.volume.enabled && (
              <div className="px-2 py-1 rounded text-xs text-white font-medium bg-teal-600 opacity-80">
                📊 VOLUME
              </div>
            )}
            
            {/* Indicator Layer Indicators */}
            {Object.entries(analysisTools).map(([toolName, tool]) => {
              if (!tool.enabled || toolName === 'volume') return null;
              const getToolLabel = () => {
                switch (toolName) {
                  case 'sma': return `📈 SMA(${tool.period})`;
                  case 'ema': return `📈 EMA(${tool.period})`;
                  case 'bollinger': return `📈 BB(${tool.period})`;
                  case 'rsi': return `📊 RSI(${tool.period})`;
                  case 'macd': return '📊 MACD';
                  default: return `📊 ${toolName.toUpperCase()}`;
                }
              };
              const getToolColor = () => {
                switch (toolName) {
                  case 'sma': return 'bg-orange-600';
                  case 'ema': return 'bg-pink-600';
                  case 'bollinger': return 'bg-purple-600';
                  case 'rsi': return 'bg-cyan-600';
                  case 'macd': return 'bg-indigo-600';
                  default: return 'bg-gray-600';
                }
              };
              return (
                <div key={toolName} className={`px-2 py-1 rounded text-xs text-white font-medium ${getToolColor()} opacity-80`}>
                  {getToolLabel()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

})

// Export helper function to get actual game duration
MultiTradingChart_TradingView.getActualGameDuration = function(playerId = "player1") {
  const playerStateKey = `player_${playerId}_chart_state`
  const startTimeKey = `${playerStateKey}_game_start_time`
  const startTime = localStorage.getItem(startTimeKey)
  
  if (startTime) {
    const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000)
    return elapsed
  }
  
  return 0
}

export default MultiTradingChart_TradingView;
