"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, X, Sun, Moon, Monitor, Volume2, VolumeX, Bell, BellOff, Minimize2, Maximize2 } from 'lucide-react';

type Settings = {
  focusTime: number;
  shortBreak: number;
  longBreak: number;
  sessionsUntilLongBreak: number;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  tickSound: boolean;
};

const PomodoroTimer = () => {
  // Timer settings
  const [settings, setSettings] = useState<Settings>({
    focusTime: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsUntilLongBreak: 4,
    theme: 'system',
    soundEnabled: true,
    notificationsEnabled: true,
    autoStartBreaks: false,
    autoStartFocus: false,
    tickSound: false
  });

  // Timer state
  const [timeLeft, setTimeLeft] = useState(settings.focusTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('focus');
  const [sessionCount, setSessionCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Picture-in-Picture state
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<(() => void) | null>(null);
  const tickAudioRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check PiP support
  useEffect(() => {
    setPipSupported('pictureInPictureEnabled' in document);
  }, []);

  // Theme detection and management
  useEffect(() => {
    const detectTheme = () => {
      if (settings.theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return settings.theme === 'dark';
    };

    const updateTheme = () => {
      setIsDarkMode(detectTheme());
    };

    updateTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener(updateTheme);
      return () => mediaQuery.removeListener(updateTheme);
    }
  }, [settings.theme]);

  // Request notification permission
  useEffect(() => {
    if (settings.notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [settings.notificationsEnabled]);

  // Create audio contexts
  useEffect(() => {
    const createBeepSound = () => {
      try {
        const audioContext = new ((window.AudioContext || (window as any).webkitAudioContext) as typeof window.AudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        console.log('Audio not available');
      }
    };

    const createTickSound = () => {
      try {
        const audioContext = new ((window.AudioContext || (window as any).webkitAudioContext) as typeof window.AudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 1000;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        console.log('Audio not available');
      }
    };
    
    audioRef.current = createBeepSound;
    tickAudioRef.current = createTickSound;
  }, []);

  // Setup canvas and video for PiP
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set canvas size
    canvas.width = 320;
    canvas.height = 200;
    
    // Setup video stream from canvas
    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    video.play();

    // PiP event listeners
    const handleEnterPip = () => setIsPiPActive(true);
    const handleLeavePip = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('leavepictureinpicture', handleLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, []);

  // Enhanced PiP canvas drawing with improved UI
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Optimized canvas size for better readability
    canvas.width = 320;
    canvas.height = 200;

    // Clear with clean background
    ctx.fillStyle = isDarkMode ? '#1f2937' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle border
    ctx.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Header section
    const headerHeight = 35;
    ctx.fillStyle = isDarkMode ? '#111827' : '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, headerHeight);

    // Draw header border
    ctx.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(canvas.width, headerHeight);
    ctx.stroke();

    // Mode indicator
    const modeColors = {
      focus: '#ef4444',
      shortBreak: '#10b981',
      longBreak: '#3b82f6'
    };
    
    // Status dot
    ctx.fillStyle = modeColors[mode as keyof typeof modeColors];
    ctx.beginPath();
    ctx.arc(15, 17, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Mode text - clean and readable
    ctx.fillStyle = isDarkMode ? '#e5e7eb' : '#374151';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    const modeText = mode === 'focus' ? 'Focus' : 
                     mode === 'shortBreak' ? 'Break' : 'Long Break';
    ctx.fillText(modeText, 30, 21);

    // Running status
    ctx.textAlign = 'right';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = isRunning ? (isDarkMode ? '#10b981' : '#059669') : (isDarkMode ? '#f59e0b' : '#d97706');
    const statusText = isRunning ? '● Running' : '⏸ Paused';
    ctx.fillText(statusText, canvas.width - 10, 21);

    // Large, readable timer
    ctx.fillStyle = isDarkMode ? '#ffffff' : '#111827';
    ctx.font = 'bold 44px ui-monospace, "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(timeLeft), canvas.width / 2, 100);

    // Progress bar
    const progressWidth = canvas.width - 40;
    const totalTime = mode === 'focus' ? settings.focusTime * 60 :
                     mode === 'shortBreak' ? settings.shortBreak * 60 :
                     settings.longBreak * 60;
    const progress = Math.max(0, Math.min(1, 1 - (timeLeft / totalTime)));

    // Progress background
    ctx.fillStyle = isDarkMode ? '#374151' : '#e5e7eb';
    ctx.fillRect(20, 125, progressWidth, 8);

    // Progress fill
    if (progress > 0) {
      ctx.fillStyle = modeColors[mode as keyof typeof modeColors];
      ctx.fillRect(20, 125, progressWidth * progress, 8);
    }

    // Session indicators - clean dots
    const completedSessions = sessionCount % settings.sessionsUntilLongBreak;
    const dotSize = 5;
    const dotSpacing = 8;
    const totalDotsWidth = (settings.sessionsUntilLongBreak * dotSize) + ((settings.sessionsUntilLongBreak - 1) * (dotSpacing - dotSize));
    const startX = (canvas.width - totalDotsWidth) / 2;
    
    for (let i = 0; i < settings.sessionsUntilLongBreak; i++) {
      ctx.fillStyle = i < completedSessions 
        ? modeColors[mode as keyof typeof modeColors]
        : (isDarkMode ? '#4b5563' : '#d1d5db');
      ctx.beginPath();
      ctx.arc(startX + (i * dotSpacing), 150, dotSize/2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Bottom info - minimal and useful
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isDarkMode ? '#6b7280' : '#9ca3af';
    
    if (!isRunning && timeLeft === 0) {
      ctx.fillText('🎉 Complete! Return to tab for controls', canvas.width / 2, 175);
    } else if (timeLeft <= 60 && isRunning && timeLeft > 0) {
      ctx.fillText('⏰ Final minute', canvas.width / 2, 175);
    } else {
      ctx.fillText(`Round ${(sessionCount % settings.sessionsUntilLongBreak) + 1} of ${settings.sessionsUntilLongBreak}`, canvas.width / 2, 175);
    }

    // Watermark
    ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = isDarkMode ? '#4b5563' : '#d1d5db';
    ctx.fillText('🍅 Pomodoro Timer', canvas.width / 2, 190);

  }, [timeLeft, isRunning, mode, sessionCount, settings, isDarkMode]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev: number) => {
          const newTime = prev - 1;
          if (settings.tickSound && settings.soundEnabled && newTime <= 10 && newTime > 0) {
            if (tickAudioRef.current) {
              tickAudioRef.current();
            }
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (settings.soundEnabled && audioRef.current) {
        audioRef.current();
      }
      showNotification();
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, settings.soundEnabled, settings.tickSound]);

  const showNotification = () => {
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const title = mode === 'focus' ? 'Break Time!' : 'Focus Time!';
      const body = mode === 'focus' 
        ? (sessionCount + 1) % settings.sessionsUntilLongBreak === 0 
          ? 'Take a long break and recharge!' 
          : 'Take a short break!'
        : 'Ready for your next focus session?';
      
      new Notification(title, {
        body,
        icon: '🍅',
        tag: 'pomodoro'
      });
    }
  };

  const handleTimerComplete = () => {
    if (mode === 'focus') {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreak * 60);
        if (settings.autoStartBreaks) {
          setTimeout(() => setIsRunning(true), 1000);
        }
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreak * 60);
        if (settings.autoStartBreaks) {
          setTimeout(() => setIsRunning(true), 1000);
        }
      }
    } else {
      setMode('focus');
      setTimeLeft(settings.focusTime * 60);
      if (settings.autoStartFocus) {
        setTimeout(() => setIsRunning(true), 1000);
      }
    }
  };

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    setMode('focus');
    setTimeLeft(settings.focusTime * 60);
    setSessionCount(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeDisplay = () => {
    switch (mode) {
      case 'focus': return 'Focus Session';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
      default: return 'Focus Session';
    }
  };

  const getModeColor = () => {
    const baseColors = {
      focus: isDarkMode ? 'from-red-600 to-red-700' : 'from-red-500 to-red-600',
      shortBreak: isDarkMode ? 'from-green-600 to-green-700' : 'from-green-500 to-green-600',
      longBreak: isDarkMode ? 'from-blue-600 to-blue-700' : 'from-blue-500 to-blue-600'
    };

    switch (mode) {
      case 'focus': return baseColors.focus;
      case 'shortBreak': return baseColors.shortBreak;
      case 'longBreak': return baseColors.longBreak;
      default: return baseColors.focus;
    }
  };

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    if (!isRunning) {
      setMode('focus');
      setTimeLeft(newSettings.focusTime * 60);
      setSessionCount(0);
    }
    setShowSettings(false);
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current || !pipSupported) return;

    try {
      if (isPiPActive) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  const themeClasses = isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800';
  const cardClasses = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getModeColor()} flex items-center justify-center p-4 transition-all duration-500`}>
      {/* Hidden canvas and video for PiP */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <video ref={videoRef} style={{ display: 'none' }} muted loop />

      <div className={`${cardClasses} rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative border transition-all duration-300`}>
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className={`absolute top-6 right-14 p-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors cursor-pointer`}
        >
          <Settings size={24} />
        </button>

        {/* PiP Toggle Button */}
        {pipSupported && (
          <button
            onClick={togglePictureInPicture}
            className={`absolute top-6 right-6 p-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors cursor-pointer ${isPiPActive ? 'text-blue-500' : ''}`}
            title="Picture-in-Picture Mode"
          >
            {isPiPActive ? <Maximize2 size={24} /> : <Minimize2 size={24} />}
          </button>
        )}

        {/* PiP Status */}
        {isPiPActive && (
          <div className={`absolute top-16 right-6 text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
            PiP Active
          </div>
        )}

        {/* Session Counter */}
        <div className="mb-4">
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Sessions Completed</div>
          <div className="flex justify-center space-x-1">
            {[...Array(settings.sessionsUntilLongBreak)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < sessionCount % settings.sessionsUntilLongBreak
                    ? isDarkMode ? 'bg-gray-200' : 'bg-gray-800'
                    : isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Mode Display */}
        <div className="mb-6">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>{getModeDisplay()}</h2>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Session {Math.floor(sessionCount / settings.sessionsUntilLongBreak) + 1} • 
            Round {(sessionCount % settings.sessionsUntilLongBreak) + 1}
          </div>
        </div>

        {/* Timer Display */}
        <div className="mb-8">
          <div className={`text-6xl font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            {formatTime(timeLeft)}
          </div>
          <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
            <div
              className={`bg-gradient-to-r ${getModeColor()} h-2 rounded-full transition-all duration-1000`}
              style={{
                width: `${100 - (timeLeft / (
                  mode === 'focus' ? settings.focusTime * 60 :
                  mode === 'shortBreak' ? settings.shortBreak * 60 :
                  settings.longBreak * 60
                )) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={isRunning ? pauseTimer : startTimer}
            className={`bg-gradient-to-r ${getModeColor()} text-white px-8 py-3 rounded-full font-semibold flex items-center space-x-2 hover:shadow-lg transition-all duration-200 transform hover:scale-105 cursor-pointer`}
          >
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            <span>{isRunning ? 'Pause' : 'Start'}</span>
          </button>
          <button
            onClick={resetTimer}
            className={`${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'} text-white px-6 py-3 rounded-full font-semibold flex items-center space-x-2 hover:shadow-lg transition-all duration-200 transform hover:scale-105 cursor-pointer`}
          >
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
        </div>

        {/* PiP Info */}
        {pipSupported && !isPiPActive && (
          <div className={`mt-4 p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              💡 Click the minimize button to keep timer visible while browsing other tabs!
            </div>
          </div>
        )}

        {/* Next Up Display */}
        {!isRunning && timeLeft === 0 && (
          <div className={`mt-6 p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              ✨ Timer Complete! {
                (mode === 'focus' && settings.autoStartBreaks) || 
                (mode !== 'focus' && settings.autoStartFocus)
                  ? 'Next session starting automatically...'
                  : `Click Start for your ${
                      mode === 'focus' 
                        ? (sessionCount % settings.sessionsUntilLongBreak === settings.sessionsUntilLongBreak - 1 ? 'long break' : 'short break')
                        : 'next focus session'
                    }`
              }
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClasses} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors cursor-pointer`}
              >
                <X size={24} />
              </button>
            </div>
            
            <SettingsForm 
              settings={settings} 
              onSave={updateSettings}
              onCancel={() => setShowSettings(false)}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsForm: React.FC<{
  settings: Settings;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
  isDarkMode: boolean;
}> = ({ settings, onSave, onCancel, isDarkMode }) => {
  const [formData, setFormData] = useState<Settings>(settings);

  const handleSave = () => {
    onSave(formData);
  };

  const handleChange = (field: keyof Settings, value: any) => {
    if (field === 'focusTime' || field === 'shortBreak' || field === 'longBreak' || field === 'sessionsUntilLongBreak') {
      setFormData((prev: Settings) => ({
        ...prev,
        [field]: parseInt(value) || 1
      }));
    } else {
      setFormData((prev: Settings) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const inputClasses = `w-full px-3 py-2 border rounded-lg transition-colors ${
    isDarkMode 
      ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent' 
      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  }`;

  const labelClasses = `block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className="space-y-6">
      {/* Timer Settings */}
      <div>
        <h4 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Timer Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={labelClasses}>Focus Time (min)</div>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.focusTime}
              onChange={(e) => handleChange('focusTime', e.target.value)}
              className={inputClasses}
            />
          </div>
          
          <div>
            <div className={labelClasses}>Short Break (min)</div>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.shortBreak}
              onChange={(e) => handleChange('shortBreak', e.target.value)}
              className={inputClasses}
            />
          </div>
          
          <div>
            <div className={labelClasses}>Long Break (min)</div>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.longBreak}
              onChange={(e) => handleChange('longBreak', e.target.value)}
              className={inputClasses}
            />
          </div>
          
          <div>
            <div className={labelClasses}>Sessions until Long Break</div>
            <input
              type="number"
              min="2"
              max="8"
              value={formData.sessionsUntilLongBreak}
              onChange={(e) => handleChange('sessionsUntilLongBreak', e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div>
        <h4 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Appearance</h4>
        <div className={labelClasses}>Theme</div>
        <div className="flex space-x-2">
          {[
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'system', icon: Monitor, label: 'System' }
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => handleChange('theme', value)}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                formData.theme === value
                  ? isDarkMode 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-blue-500 border-blue-400 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Audio Settings */}
      <div>
        <h4 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Audio & Notifications</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {formData.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Completion Sound</span>
            </div>
            <button
              onClick={() => handleChange('soundEnabled', !formData.soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                formData.soundEnabled 
                  ? 'bg-blue-500' 
                  : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                formData.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {formData.notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Browser Notifications</span>
            </div>
            <button
              onClick={() => handleChange('notificationsEnabled', !formData.notificationsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                formData.notificationsEnabled 
                  ? 'bg-blue-500' 
                  : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                formData.notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tick Sound (last 10s)</span>
            <button
              onClick={() => handleChange('tickSound', !formData.tickSound)}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                formData.tickSound 
                  ? 'bg-blue-500' 
                  : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                formData.tickSound ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Auto-start Settings */}
      <div>
        <h4 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Auto-start</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Auto-start Breaks</span>
            <button
              onClick={() => handleChange('autoStartBreaks', !formData.autoStartBreaks)}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                formData.autoStartBreaks 
                  ? 'bg-blue-500' 
                  : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                formData.autoStartBreaks ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Auto-start Focus Sessions</span>
            <button
              onClick={() => handleChange('autoStartFocus', !formData.autoStartFocus)}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                formData.autoStartFocus 
                  ? 'bg-blue-500' 
                  : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                formData.autoStartFocus ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Save Settings
        </button>
        <button
          onClick={onCancel}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors cursor-pointer ${
            isDarkMode 
              ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' 
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
