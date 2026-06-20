import { useState, useEffect, useRef } from 'react';
import { AdaptiveWebRTC } from '@/lib/adaptive-webrtc';
import QualityIndicator from './QualityIndicator';
// Add these state variables
const [connectionQuality, setConnectionQuality] = useState('good');
const [showQualityWarning, setShowQualityWarning] = useState(false);
const adaptiveWebRTCRef = useRef<AdaptiveWebRTC | null>(null);

// Add this useEffect when peerConnection is available
useEffect(() => {
  if (!peerConnection) return;

  const adaptiveWebRTC = new AdaptiveWebRTC(peerConnection);
  adaptiveWebRTCRef.current = adaptiveWebRTC;

  adaptiveWebRTC.start();

  adaptiveWebRTC.onQualityChange((quality) => {
    console.log('📊 Quality changed to:', quality);
    setConnectionQuality(quality);
  });

  adaptiveWebRTC.onDegradation((quality) => {
    if (quality === 'bad') {
      setShowQualityWarning(true);
      setTimeout(() => setShowQualityWarning(false), 10000);
    } else if (quality === 'poor') {
      setShowQualityWarning(true);
      setTimeout(() => setShowQualityWarning(false), 5000);
    }
  });

  return () => {
    adaptiveWebRTC.stop();
  };
}, [peerConnection]);

// Add Quality Indicator in the return JSX
return (
  <div className="relative">
    {/* Your existing video UI */}
    
    {/* Quality Indicator - Top Right */}
    <div className="absolute top-2 right-2 z-10">
      <QualityIndicator 
        quality={connectionQuality as any} 
        isVisible={true}
      />
    </div>

    {/* Quality Warning Notification */}
    {showQualityWarning && (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm shadow-lg max-w-md text-center animate-pulse">
        {connectionQuality === 'bad' 
          ? '⚠️ Connection poor - Switching to audio-only mode' 
          : '📶 Reducing video quality due to network conditions'}
      </div>
    )}
  </div>
);