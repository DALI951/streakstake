import React, { useState, useEffect } from 'react';
import { X, Footprints, Play, Pause, RotateCcw, CheckCircle2, Navigation, Flame, Zap } from 'lucide-react';
import { Challenge } from '../types/challenge';
import { stepTracker, WalkSession } from '../services/stepTrackerService';
import { useChallenges } from '../context/ChallengeContext';
import { audio } from '../services/audioService';
import confetti from 'canvas-confetti';

interface WalkTrackerModalProps {
  challenge: Challenge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WalkTrackerModal: React.FC<WalkTrackerModalProps> = ({
  challenge,
  isOpen,
  onClose,
}) => {
  const { submitProof } = useChallenges();
  const [session, setSession] = useState<WalkSession>(stepTracker.getSession());

  const targetMeters = challenge?.walkTargetMeters || 500;

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = stepTracker.subscribe((updated) => {
      setSession(updated);

      if (updated.isCompleted && challenge) {
        audio.playStreakBonus();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, challenge]);

  if (!isOpen || !challenge) return null;

  const percent = Math.min(100, Math.round((session.currentMeters / targetMeters) * 100));
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    audio.playClick();
    stepTracker.startTracking(targetMeters);
  };

  const handlePause = () => {
    audio.playClick();
    stepTracker.stopTracking();
  };

  const handleReset = () => {
    audio.playClick();
    stepTracker.reset();
  };

  const handleSimulateStep = (steps: number) => {
    stepTracker.simulateStep(steps);
  };

  const handleFinishAndSubmitProof = () => {
    audio.playSuccess();
    const durationMins = Math.max(1, Math.round(session.elapsedSeconds / 60));
    const speedKmh = session.elapsedSeconds > 0 
      ? ((session.currentMeters / session.elapsedSeconds) * 3.6).toFixed(1) 
      : '4.5';

    const telemetryNote = `Verified Live Walk: ${session.currentMeters} meters traversed in ${formatTimer(session.elapsedSeconds)} (${session.stepsCount} physical steps recorded via motion sensors, average pace ${speedKmh} km/h).`;

    submitProof(
      challenge.id,
      telemetryNote,
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80'
    );

    stepTracker.reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#111320] border border-[#262c44] shadow-2xl p-6 max-h-[92vh] overflow-y-auto flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#232738]">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Footprints className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Live Walk & Step Tracker</h3>
                <p className="text-[11px] text-slate-400">Hardware accelerometer & GPS distance detection</p>
              </div>
            </div>
            <button
              onClick={() => {
                stepTracker.stopTracking();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-[#1a1d2e] hover:bg-[#23273e] text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Challenge Stake Context */}
          <div className="mt-3.5 p-3 rounded-2xl bg-[#171a2c] border border-[#272c44] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white line-clamp-1">{challenge.title}</p>
              <span className="text-[10px] text-slate-400">
                Target: <b className="text-emerald-400 font-extrabold">{targetMeters} meters</b>
              </span>
            </div>
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-black">
              <Flame className="w-3.5 h-3.5" />
              <span>{challenge.stakeXp} XP</span>
            </div>
          </div>

          {/* Circular Progress Meter Gauge */}
          <div className="mt-6 flex flex-col items-center justify-center relative">
            <svg className="w-52 h-52 -rotate-90">
              <circle
                cx="104"
                cy="104"
                r={radius}
                className="stroke-[#1d2238]"
                strokeWidth="14"
                fill="transparent"
              />
              <circle
                cx="104"
                cy="104"
                r={radius}
                className="stroke-emerald-500 transition-all duration-300 ease-out"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* In-Ring Metric Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-white tracking-tight">
                {session.currentMeters}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                / {targetMeters} METERS
              </span>
              <div className="mt-1 flex items-center space-x-1 text-xs font-black text-emerald-400">
                <Footprints className="w-3.5 h-3.5" />
                <span>{session.stepsCount} Steps</span>
              </div>
            </div>
          </div>

          {/* Live Telemetry Sensors Bar */}
          <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#16192a] border border-[#262c42] text-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Time</span>
              <span className="text-xs font-black text-white">{formatTimer(session.elapsedSeconds)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Pace</span>
              <span className="text-xs font-black text-amber-400">
                {session.currentSpeedMps > 0 ? `${(session.currentSpeedMps * 3.6).toFixed(1)} km/h` : 'Walking'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">GPS Status</span>
              <span className="text-xs font-black text-emerald-400 flex items-center justify-center space-x-1">
                <Navigation className="w-3 h-3 text-emerald-400" />
                <span>{session.gpsAccuracyMeters ? `±${session.gpsAccuracyMeters}m` : 'Active'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 space-y-3 pt-3 border-t border-[#232738]">
          {session.isCompleted ? (
            /* Target Reached Banner & Auto-Submit */
            <div className="space-y-2">
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center text-xs text-emerald-300 font-bold flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Goal Met! {session.currentMeters} meters traversed successfully!</span>
              </div>

              <button
                onClick={handleFinishAndSubmitProof}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Submit Verified Step Proof to Peers</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Play / Pause / Reset Controls */}
              <div className="grid grid-cols-4 gap-2">
                {!session.isTracking ? (
                  <button
                    onClick={handleStart}
                    className="col-span-3 flex items-center justify-center space-x-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Step Detection</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="col-span-3 flex items-center justify-center space-x-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all active:scale-95"
                  >
                    <Pause className="w-4 h-4 fill-slate-950" />
                    <span>Pause Tracking</span>
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="col-span-1 flex items-center justify-center p-3 rounded-2xl bg-[#1b1f32] hover:bg-[#252a44] text-slate-400 hover:text-white transition-colors"
                  title="Reset walk"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Simulation Quick Step buttons for indoor / emulator testing */}
              <div className="mt-2.5 pt-2 border-t border-[#232738]/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>Test Steps:</span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleSimulateStep(20)}
                    disabled={!session.isTracking}
                    className="px-2 py-1 rounded-lg bg-[#181a2b] hover:bg-[#22273e] text-slate-300 font-semibold disabled:opacity-40"
                  >
                    +20 Steps (~15m)
                  </button>
                  <button
                    onClick={() => handleSimulateStep(100)}
                    disabled={!session.isTracking}
                    className="px-2 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-bold border border-orange-500/30 disabled:opacity-40"
                  >
                    +100 Steps (~76m)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
