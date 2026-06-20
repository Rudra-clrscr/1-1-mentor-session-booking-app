export interface ConnectionQuality {
  packetLoss: number;    // Percentage
  rtt: number;          // Milliseconds
  bitrate: number;      // kbps
  quality: 'good' | 'fair' | 'poor' | 'bad';
}

export class NetworkMonitor {
  private peerConnection: RTCPeerConnection;
  private qualityCallbacks: ((quality: ConnectionQuality) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(peerConnection: RTCPeerConnection) {
    this.peerConnection = peerConnection;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    this.intervalId = setInterval(() => {
      this.checkQuality();
    }, 3000); // Check every 3 seconds
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkQuality() {
    try {
      const stats = await this.peerConnection.getStats();
      const quality = this.calculateQuality(stats);
      this.qualityCallbacks.forEach(cb => cb(quality));
    } catch (error) {
      console.error('Failed to get stats:', error);
    }
  }

  private calculateQuality(stats: RTCStatsReport): ConnectionQuality {
    let packetLoss = 0;
    let rtt = 0;
    let bitrate = 0;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.nominated) {
        packetLoss = report.packetsLost || 0;
        rtt = report.currentRoundTripTime * 1000 || 0;
      }
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        bitrate = report.bytesSent || 0;
      }
    });

    const quality = this.determineQuality(packetLoss, rtt);

    return {
      packetLoss,
      rtt,
      bitrate,
      quality
    };
  }

  private determineQuality(packetLoss: number, rtt: number): ConnectionQuality['quality'] {
    if (packetLoss < 2 && rtt < 100) return 'good';
    if (packetLoss < 10 && rtt < 300) return 'fair';
    if (packetLoss < 20 && rtt < 500) return 'poor';
    return 'bad';
  }

  onQualityChange(callback: (quality: ConnectionQuality) => void) {
    this.qualityCallbacks.push(callback);
  }

  removeQualityChange(callback: (quality: ConnectionQuality) => void) {
    this.qualityCallbacks = this.qualityCallbacks.filter(cb => cb !== callback);
  }
}