import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Compass, 
  MapPin, 
  Navigation, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Info,
  Settings,
  Map as MapIcon,
  Bus,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { getSunPosition, calculateBearing, getSeatRecommendation } from './utils/solarMath';
import { fetchWeather, WeatherData } from './services/weatherService';
import { cn } from './utils/cn';

// --- Types ---
interface RouteStep {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  bearing: number;
}

interface AppState {
  source: string;
  destination: string;
  travelDate: Date;
  weather: WeatherData | null;
  route: RouteStep[] | null;
  currentStepIndex: number;
  isNight: boolean;
  isLoading: boolean;
  error: string | null;
}

// --- Components ---

const CompassCalibrationWarning = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-24 left-6 right-6 z-50 bg-orange-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-orange-400"
    >
      <div className="bg-white/20 p-3 rounded-xl">
        <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm">Compass Calibration Needed</h4>
        <p className="text-xs text-white/80">Move your phone in a figure-8 pattern to improve accuracy.</p>
      </div>
      <button 
        onClick={onDismiss}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <ChevronRight className="w-5 h-5 rotate-90" />
      </button>
    </motion.div>
  );
};

const BackgroundGradient = ({ time, isNight }: { time: Date; isNight: boolean }) => {
  const hour = time.getHours();
  
  // Sunset aesthetic image
  const sunsetImg = "https://images.unsplash.com/photo-1472120482482-d44b0e9751d7?auto=format&fit=crop&w=1920&q=80";
  const nightImg = "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1920&q=80";
  const dayImg = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80";

  let bgImg = dayImg;
  let overlayClass = "bg-blue-600/20";

  if (isNight) {
    bgImg = nightImg;
    overlayClass = "bg-slate-900/60";
  } else if (hour >= 16 && hour < 20) {
    bgImg = sunsetImg;
    overlayClass = "bg-purple-900/30";
  } else if (hour >= 5 && hour < 8) {
    bgImg = sunsetImg;
    overlayClass = "bg-orange-900/20";
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <motion.img 
        key={bgImg}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2 }}
        src={bgImg} 
        className="absolute inset-0 w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div className={cn("absolute inset-0 transition-colors duration-1000", overlayClass)} />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
      
      {isNight && (
        <div className="absolute inset-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const BusVisualizer = ({ recommendation, sunAzimuth, busHeading, deviceHeading }: { recommendation: string; sunAzimuth: number; busHeading: number; deviceHeading: number | null }) => {
  const relativeSunAngle = (sunAzimuth - busHeading + 360) % 360;

  return (
    <div className="relative w-full h-64 flex items-center justify-center overflow-hidden">
      {/* Sun/Moon Orbit */}
      <motion.div 
        className="absolute w-full h-full"
        animate={{ rotate: relativeSunAngle - 90 }}
        transition={{ type: 'spring', stiffness: 50 }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8">
          {recommendation === 'NIGHT' ? (
            <Moon className="w-12 h-12 text-yellow-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          ) : (
            <Sun className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
          )}
        </div>
      </motion.div>

      {/* Bus Graphic */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div 
          className="relative"
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {/* Bus Body */}
          <div className="w-48 h-24 bg-blue-600 rounded-t-2xl border-b-8 border-slate-800 relative overflow-hidden shadow-2xl">
            {/* Windows */}
            <div className="flex gap-2 p-3">
              <div className={cn("flex-1 h-10 rounded-sm transition-colors duration-500", 
                recommendation === 'LEFT' ? "bg-yellow-200/80 shadow-[inset_0_0_10px_rgba(255,255,0,0.5)]" : "bg-sky-200/40")}></div>
              <div className={cn("flex-1 h-10 rounded-sm transition-colors duration-500", 
                recommendation === 'LEFT' ? "bg-yellow-200/80 shadow-[inset_0_0_10px_rgba(255,255,0,0.5)]" : "bg-sky-200/40")}></div>
              <div className={cn("flex-1 h-10 rounded-sm transition-colors duration-500", 
                recommendation === 'LEFT' ? "bg-yellow-200/80 shadow-[inset_0_0_10px_rgba(255,255,0,0.5)]" : "bg-sky-200/40")}></div>
            </div>
            
            {/* Highlights for sides */}
            <div className={cn("absolute inset-y-0 left-0 w-4 transition-opacity duration-500", 
              recommendation === 'LEFT' ? "bg-yellow-400/40 opacity-100" : "opacity-0")}></div>
            <div className={cn("absolute inset-y-0 right-0 w-4 transition-opacity duration-500", 
              recommendation === 'RIGHT' ? "bg-yellow-400/40 opacity-100" : "opacity-0")}></div>
          </div>
          
          {/* Wheels */}
          <div className="flex justify-around -mt-2">
            <div className="w-8 h-8 bg-slate-800 rounded-full border-4 border-slate-700 animate-spin" style={{ animationDuration: '1s' }}></div>
            <div className="w-8 h-8 bg-slate-800 rounded-full border-4 border-slate-700 animate-spin" style={{ animationDuration: '1s' }}></div>
          </div>
        </motion.div>
        
        <div className="mt-4 text-white font-bold text-lg flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5" style={{ transform: `rotate(${busHeading}deg)` }} />
            Route: {Math.round(busHeading)}°
          </div>
          {deviceHeading !== null && (
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Compass className="w-4 h-4" style={{ transform: `rotate(${deviceHeading}deg)` }} />
              Device: {Math.round(deviceHeading)}°
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RecommendationCard = ({ recommendation, weather }: { recommendation: string; weather: WeatherData | null }) => {
  const getMessage = () => {
    switch (recommendation) {
      case 'LEFT': return { text: 'Sit on LEFT side', icon: <Sun className="text-yellow-400" />, color: 'text-yellow-400' };
      case 'RIGHT': return { text: 'Sit on RIGHT side', icon: <Sun className="text-yellow-400" />, color: 'text-yellow-400' };
      case 'NIGHT': return { text: 'Night time journey', icon: <Moon className="text-blue-200" />, color: 'text-blue-200' };
      case 'LOW_SUN': return { text: 'Low sun, use shades', icon: <AlertTriangle className="text-orange-400" />, color: 'text-orange-400' };
      default: return { text: 'No direct sunlight', icon: <Cloud className="text-slate-300" />, color: 'text-slate-300' };
    }
  };

  const msg = getMessage();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-purple-900/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/70 uppercase tracking-widest text-xs font-bold">Best Seat Recommendation</h3>
        <Info className="w-4 h-4 text-white/40" />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="p-4 bg-white/10 rounded-2xl">
          {msg.icon}
        </div>
        <div>
          <h2 className={cn("text-2xl font-black", msg.color)}>{msg.text}</h2>
          <p className="text-white/60 text-sm">
            {weather?.condition === 'Clear' ? 'Strong sunlight expected.' : 'Cloud cover may reduce glare.'}
          </p>
        </div>
      </div>

      {weather && (
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {weather.condition === 'Rain' ? <CloudRain className="text-blue-400" /> : 
             weather.condition === 'Snow' ? <CloudSnow className="text-white" /> : 
             <Cloud className="text-slate-300" />}
            <div>
              <p className="text-white font-medium">{weather.condition}</p>
              <p className="text-white/40 text-xs">{weather.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-xl font-bold">{Math.round(weather.temp)}°C</p>
            <p className="text-white/40 text-xs">Outside Temp</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>({
    source: '',
    destination: '',
    travelDate: new Date(),
    weather: null,
    route: null,
    currentStepIndex: 0,
    isNight: false,
    isLoading: false,
    error: null,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [needsCalibration, setNeedsCalibration] = useState(false);

  // Real-time tracking
  useEffect(() => {
    const win = window as any;
    
    const handleCalibration = (e: Event) => {
      e.preventDefault();
      setNeedsCalibration(true);
    };

    win.addEventListener('compassneedscalibration', handleCalibration);
    
    if (typeof win !== 'undefined' && 'ondeviceorientationabsolute' in win) {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (e.absolute && e.alpha !== null) {
          setDeviceHeading(360 - e.alpha);
        }
      };
      win.addEventListener('deviceorientationabsolute', handleOrientation);
      return () => win.removeEventListener('deviceorientationabsolute', handleOrientation);
    } else if (typeof win !== 'undefined' && 'ondeviceorientation' in win) {
      const handleOrientation = (e: any) => {
        if (e.webkitCompassHeading !== undefined) {
          setDeviceHeading(e.webkitCompassHeading);
        }
      };
      win.addEventListener('deviceorientation', handleOrientation);
      return () => {
        win.removeEventListener('deviceorientation', handleOrientation);
        win.removeEventListener('compassneedscalibration', handleCalibration);
      };
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Mock route fetching for demo purposes if API key is missing
  const fetchRoute = async () => {
    if (!state.source || !state.destination) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // In a real app, we'd use Google Maps Directions API here.
      // For this demo, we'll simulate a route with some bearings.
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockRoute: RouteStep[] = [
        { start: { lat: 40.7128, lng: -74.0060 }, end: { lat: 40.7306, lng: -73.9352 }, bearing: 45 },
        { start: { lat: 40.7306, lng: -73.9352 }, end: { lat: 40.7589, lng: -73.9851 }, bearing: 315 },
        { start: { lat: 40.7589, lng: -73.9851 }, end: { lat: 40.8075, lng: -73.9626 }, bearing: 90 },
      ];

      const weather = await fetchWeather(mockRoute[0].start.lat, mockRoute[0].start.lng);
      
      setState(prev => ({
        ...prev,
        route: mockRoute,
        weather,
        isLoading: false,
      }));
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Failed to fetch route.' }));
    }
  };

  const currentStep = state.route ? state.route[state.currentStepIndex] : null;
  const sunPos = currentStep 
    ? getSunPosition(state.travelDate, currentStep.start.lat, currentStep.start.lng)
    : getSunPosition(state.travelDate, 40.7128, -74.0060); // Default to NYC

  const recommendation = currentStep 
    ? getSeatRecommendation(currentStep.bearing, sunPos.azimuth, sunPos.altitude)
    : 'NONE';

  useEffect(() => {
    setState(prev => ({ ...prev, isNight: sunPos.altitude < 0 }));
  }, [sunPos.altitude]);

  return (
    <div className="min-h-screen font-sans transition-colors duration-500 text-white">
      <BackgroundGradient time={state.travelDate} isNight={state.isNight} />
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </button>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    setNeedsCalibration(true);
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Compass className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-medium">Test Calibration Warning</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
                
                <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                  <p className="text-xs text-white/40 uppercase font-bold tracking-widest">App Info</p>
                  <p className="text-sm text-white/60">SunSide v1.0.0</p>
                  <p className="text-xs text-white/30">Built with React & Gemini AI</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {needsCalibration && (
          <CompassCalibrationWarning onDismiss={() => setNeedsCalibration(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-purple-900/40 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10">
            <Sun className="text-yellow-400 w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white drop-shadow-md">SUNSIDE</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-purple-900/40 backdrop-blur-xl rounded-full border border-white/10 hover:bg-white/20 transition-colors shadow-lg"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pb-12 space-y-8">
        {/* Input Form */}
        <section className="bg-purple-900/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="text" 
                placeholder="Source Location"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={state.source}
                onChange={e => setState(prev => ({ ...prev, source: e.target.value }))}
              />
            </div>
            <div className="relative">
              <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="text" 
                placeholder="Destination"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={state.destination}
                onChange={e => setState(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="date" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none"
                value={format(state.travelDate, 'yyyy-MM-dd')}
                onChange={e => setState(prev => ({ ...prev, travelDate: new Date(e.target.value + 'T' + format(prev.travelDate, 'HH:mm')) }))}
              />
            </div>
            <div className="flex-1 relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="time" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none"
                value={format(state.travelDate, 'HH:mm')}
                onChange={e => {
                  const [h, m] = e.target.value.split(':');
                  const newDate = new Date(state.travelDate);
                  newDate.setHours(parseInt(h), parseInt(m));
                  setState(prev => ({ ...prev, travelDate: newDate }));
                }}
              />
            </div>
          </div>

          <button 
            onClick={fetchRoute}
            disabled={state.isLoading || !state.source || !state.destination}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 disabled:from-slate-800 disabled:to-slate-900 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
          >
            {state.isLoading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Calculate Route <ChevronRight className="w-5 h-5" /></>
            )}
          </button>
        </section>

        {/* Visualizer Section */}
        <AnimatePresence mode="wait">
          {state.route ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <BusVisualizer 
                recommendation={recommendation} 
                sunAzimuth={sunPos.azimuth} 
                busHeading={currentStep?.bearing || 0} 
                deviceHeading={deviceHeading}
              />

              <RecommendationCard recommendation={recommendation} weather={state.weather} />

              {/* Route Progress */}
              <div className="bg-purple-900/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white/70 uppercase tracking-widest text-xs font-bold">Route Leg</h3>
                  <span className="text-white/40 text-xs font-mono">{state.currentStepIndex + 1} / {state.route.length}</span>
                </div>
                <div className="flex gap-2">
                  {state.route.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setState(prev => ({ ...prev, currentStepIndex: i }))}
                      className={cn(
                        "h-2 flex-1 rounded-full transition-all duration-300",
                        i === state.currentStepIndex ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Compass className="w-4 h-4" />
                    <span>Leg Bearing: {Math.round(currentStep?.bearing || 0)}°</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <Sun className="w-4 h-4" />
                    <span>Sun Azimuth: {Math.round(sunPos.azimuth)}°</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 space-y-4"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                <Bus className="w-10 h-10 text-white/20" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white/60">Ready for your trip?</h3>
                <p className="text-white/40 text-sm max-w-[200px] mx-auto">Enter your route details above to find the best seat.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Mini Map Preview Placeholder */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-end pointer-events-auto">
          <button className="bg-purple-900/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 hover:bg-white/20 transition-all">
            <MapIcon className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-bold text-white">Mini-Map Preview</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
