import { NetworkMonitor, ConnectionQuality } from './network-monitor';

export interface VideoConstraints {
  width: number;
  height: number;
  fps: number;
}

export class AdaptiveWebRTC {
  private peerConnection: RTCPeerConnection;
  private currentQuality: ConnectionQuality['quality'] = 'good';
  private networkMonitor: NetworkMonitor;
  private onQualityChangeCallbacks: ((quality: ConnectionQuality['quality']) => void)[] = [];
  private onDegradationCallbacks: ((quality: ConnectionQuality['quality']) => void)[] = [];

  constructor(peerConnection: RTCPeerConnection) {
    this.peerConnection = peerConnection;
    this.networkMonitor = new NetworkMonitor(peerConnection);
  }

  start() {
    this.networkMonitor.onQualityChange((quality) => {
      this.handleQualityChange(quality);
    });
    this.networkMonitor.startMonitoring();
    console.log('✅ Adaptive WebRTC started');
  }

  stop() {
    this.networkMonitor.stopMonitoring();
    console.log('🛑 Adaptive WebRTC stopped');
  }

  private handleQualityChange(quality: ConnectionQuality) {
    const newQuality = quality.quality;
    
    // Only act if quality changed
    if (newQuality === this.currentQuality) return;
    
    console.log(`📊 Quality changed: ${this.currentQuality} → ${newQuality}`);
    this.currentQuality = newQuality;
    
    // Notify listeners
    this.onQualityChangeCallbacks.forEach(cb => cb(newQuality));
    
    // Adjust video if needed
    this.adjustVideoConstraints(quality);
    
    // Emit degradation warning if quality dropped
    if (['poor', 'bad'].includes(newQuality)) {
      this.onDegradationCallbacks.forEach(cb => cb(newQuality));
    }
  }

  private adjustVideoConstraints(quality: ConnectionQuality) {
    const constraints = this.getConstraintsForQuality(quality);
    
    if (!constraints) {
      // BAD quality → Audio only
      console.log('🔇 Switching to audio-only mode');
      this.disableVideoTracks();
      return;
    }

    console.log(`🎥 Adjusting video: ${constraints.width}x${constraints.height} @ ${constraints.fps}fps`);
    this.updateVideoConstraints(constraints);
  }

  private getConstraintsForQuality(quality: ConnectionQuality): VideoConstraints | null {
    const presets: Record<ConnectionQuality['quality'], VideoConstraints | null> = {
      good: { width: 1280, height: 720, fps: 30 },
      fair: { width: 854, height: 480, fps: 24 },
      poor: { width: 640, height: 360, fps: 15 },
      bad: null // Audio only
    };
    return presets[quality.quality];
  }

  private async updateVideoConstraints(constraints: VideoConstraints) {
    const senders = this.peerConnection.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    
    if (!videoSender || !videoSender.track) return;

    try {
      const newConstraints: MediaTrackConstraints = {
        width: { ideal: constraints.width },
        height: { ideal: constraints.height },
        frameRate: { ideal: constraints.fps }
      };

      await videoSender.track.applyConstraints(newConstraints);
      console.log(`✅ Video constraints updated to ${constraints.width}x${constraints.height}`);
    } catch (error) {
      console.error('Failed to update video constraints:', error);
    }
  }

  private disableVideoTracks() {
    const senders = this.peerConnection.getSenders();
    const videoSenders = senders.filter(s => s.track?.kind === 'video');
    
    videoSenders.forEach(sender => {
      if (sender.track) {
        sender.track.enabled = false;
        console.log('🎥 Video track disabled');
      }
    });
  }

  enableVideoTracks() {
    const senders = this.peerConnection.getSenders();
    const videoSenders = senders.filter(s => s.track?.kind === 'video');
    
    videoSenders.forEach(sender => {
      if (sender.track) {
        sender.track.enabled = true;
        console.log('🎥 Video track enabled');
      }
    });
  }

  onQualityChange(callback: (quality: ConnectionQuality['quality']) => void) {
    this.onQualityChangeCallbacks.push(callback);
  }

  onDegradation(callback: (quality: ConnectionQuality['quality']) => void) {
    this.onDegradationCallbacks.push(callback);
  }

  getCurrentQuality(): ConnectionQuality['quality'] {
    return this.currentQuality;
  }
}