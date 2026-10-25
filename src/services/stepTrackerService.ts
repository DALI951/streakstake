// Real-time Motion & GPS Walking / Step Detection Engine

export interface WalkSession {
  targetMeters: number;
  currentMeters: number;
  stepsCount: number;
  startTime: number;
  elapsedSeconds: number;
  isTracking: boolean;
  isCompleted: boolean;
  currentSpeedMps: number;
  gpsAccuracyMeters: number | null;
  strideLengthMeters: number; // default ~0.76m
  historyPaces: number[];
}

export type WalkUpdateCallback = (session: WalkSession) => void;

class StepTrackerService {
  private session: WalkSession = {
    targetMeters: 500,
    currentMeters: 0,
    stepsCount: 0,
    startTime: 0,
    elapsedSeconds: 0,
    isTracking: false,
    isCompleted: false,
    currentSpeedMps: 0,
    gpsAccuracyMeters: null,
    strideLengthMeters: 0.76,
    historyPaces: []
  };

  private callbacks: Set<WalkUpdateCallback> = new Set();
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private watchPositionId: number | null = null;
  private lastLat: number | null = null;
  private lastLon: number | null = null;
  private lastStepTimestamp: number = 0;
  private isMotionListening: boolean = false;

  // Accelerometer peak detection state
  private lastMagnitude: number = 9.8;
  private accelerationThreshold: number = 11.2; // Peak trigger threshold in m/s^2

  public subscribe(cb: WalkUpdateCallback): () => void {
    this.callbacks.add(cb);
    cb({ ...this.session });
    return () => this.callbacks.delete(cb);
  }

  private notify() {
    const clone = { ...this.session };
    this.callbacks.forEach((cb) => cb(clone));
  }

  public getSession(): WalkSession {
    return { ...this.session };
  }

  // Calculate distance between two GPS coordinates using Haversine formula
  private calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Handle Accelerometer Device Motion Events (Step Detection)
  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!this.session.isTracking || this.session.isCompleted) return;

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = Date.now();

    // Check for a step peak: transition above threshold with at least 260ms between steps
    if (
      magnitude > this.accelerationThreshold &&
      this.lastMagnitude <= this.accelerationThreshold &&
      now - this.lastStepTimestamp > 260
    ) {
      this.lastStepTimestamp = now;
      this.session.stepsCount += 1;

      // Distance from step stride length
      const stepDistanceMeters = this.session.stepsCount * this.session.strideLengthMeters;
      if (stepDistanceMeters > this.session.currentMeters) {
        this.session.currentMeters = Math.round(stepDistanceMeters);
      }

      // Haptic feedback for each step if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && this.session.stepsCount % 10 === 0) {
        try {
          navigator.vibrate(20);
        } catch {
          // ignore
        }
      }

      this.checkCompletion();
      this.notify();
    }

    this.lastMagnitude = magnitude;
  };

  private checkCompletion() {
    if (this.session.currentMeters >= this.session.targetMeters && !this.session.isCompleted) {
      this.session.isCompleted = true;
      this.session.isTracking = false;
      this.stopTracking();

      // Victory Haptic
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 200, 50, 300]);
        } catch {
          // ignore
        }
      }
    }
  }

  // Start walking tracker
  public startTracking(targetMeters: number = 500) {
    this.session = {
      targetMeters,
      currentMeters: 0,
      stepsCount: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
      isTracking: true,
      isCompleted: false,
      currentSpeedMps: 0,
      gpsAccuracyMeters: null,
      strideLengthMeters: 0.76,
      historyPaces: []
    };

    this.lastLat = null;
    this.lastLon = null;
    this.lastStepTimestamp = 0;

    // 1. Listen to Device Motion (Pedometer)
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      // For iOS 13+ permission request
      const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DME.requestPermission === 'function') {
        DME.requestPermission()
          .then((permissionState) => {
            if (permissionState === 'granted') {
              window.addEventListener('devicemotion', this.handleDeviceMotion, true);
              this.isMotionListening = true;
            }
          })
          .catch(console.warn);
      } else {
        window.addEventListener('devicemotion', this.handleDeviceMotion, true);
        this.isMotionListening = true;
      }
    }

    // 2. Listen to GPS Geolocation for outdoor walking accuracy
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        this.watchPositionId = navigator.geolocation.watchPosition(
          (position) => {
            if (!this.session.isTracking || this.session.isCompleted) return;

            const { latitude, longitude, accuracy, speed } = position.coords;
            this.session.gpsAccuracyMeters = Math.round(accuracy);
            if (speed !== null && speed >= 0) {
              this.session.currentSpeedMps = parseFloat(speed.toFixed(1));
            }

            if (this.lastLat !== null && this.lastLon !== null) {
              const deltaMeters = this.calculateHaversineMeters(this.lastLat, this.lastLon, latitude, longitude);
              // Only record plausible walking/running speed (< 12 m/s / 43 km/h and > 1.5m to eliminate jitter)
              if (deltaMeters >= 1.5 && deltaMeters < 30) {
                const stepEstimate = this.session.stepsCount * this.session.strideLengthMeters;
                const newTotalGps = this.session.currentMeters + deltaMeters;
                // Fuse GPS & step count
                this.session.currentMeters = Math.round(Math.max(newTotalGps, stepEstimate));
                this.checkCompletion();
              }
            }

            this.lastLat = latitude;
            this.lastLon = longitude;
            this.notify();
          },
          (err) => {
            console.warn('Geolocation warning (falling back to pedometer):', err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
          }
        );
      } catch (e) {
        console.warn('Geolocation error:', e);
      }
    }

    // 3. Second-by-second timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.session.isTracking && !this.session.isCompleted) {
        this.session.elapsedSeconds += 1;
        this.notify();
      }
    }, 1000);

    this.notify();
  }

  // Simulate a physical step (useful for testing on emulator or desk)
  public simulateStep(count: number = 1) {
    if (!this.session.isTracking || this.session.isCompleted) return;
    this.session.stepsCount += count;
    this.session.currentMeters += Math.round(count * this.session.strideLengthMeters);
    this.checkCompletion();
    this.notify();
  }

  public stopTracking() {
    this.session.isTracking = false;
    if (this.isMotionListening && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
      this.isMotionListening = false;
    }
    if (this.watchPositionId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.notify();
  }

  public reset() {
    this.stopTracking();
    this.session = {
      targetMeters: 500,
      currentMeters: 0,
      stepsCount: 0,
      startTime: 0,
      elapsedSeconds: 0,
      isTracking: false,
      isCompleted: false,
      currentSpeedMps: 0,
      gpsAccuracyMeters: null,
      strideLengthMeters: 0.76,
      historyPaces: []
    };
    this.notify();
  }
}

export const stepTracker = new StepTrackerService();
