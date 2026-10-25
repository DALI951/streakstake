import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Flame, Upload, Eye, CheckCircle2, XCircle, Users, Footprints, Play } from 'lucide-react';
import { Challenge } from '../types/challenge';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../context/ChallengeContext';

interface ChallengeCardProps {
  challenge: Challenge;
  onSubmitProof: (challenge: Challenge) => void;
  onVerifyProof: (challenge: Challenge) => void;
  onViewProof: (challenge: Challenge) => void;
  onStartWalk?: (challenge: Challenge) => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onSubmitProof,
  onVerifyProof,
  onViewProof,
  onStartWalk,
}) => {
  const { currentUser } = useAuth();
  const { burnChallengeManually } = useChallenges();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  const isCreator = currentUser?.id === challenge.creatorId;
  const isWalkingChallenge = challenge.category === 'walking' || challenge.proofType === 'pedometer';

  // Real-time countdown ticker
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const deadline = new Date(challenge.deadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(hours < 2);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [challenge.deadline]);

  // Category styling
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'walking':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'fitness':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'coding':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'reading':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'health':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div
      className={`group relative rounded-2xl bg-[#141624] border transition-all duration-200 p-5 flex flex-col justify-between shadow-xl ${
        challenge.status === 'active'
          ? isUrgent
            ? 'border-red-500/60 ring-1 ring-red-500/30'
            : 'border-[#262b40] hover:border-orange-500/40'
          : challenge.status === 'pending_verification'
          ? 'border-amber-500/50 bg-[#161726]'
          : challenge.status === 'completed'
          ? 'border-emerald-500/30 bg-[#0f151e]'
          : 'border-red-900/40 bg-[#141014] opacity-80'
      }`}
    >
      {/* Top Header: Creator & Status */}
      <div>
        <div className="flex items-center justify-between gap-2">
          {/* Creator Pill */}
          <div className="flex items-center space-x-2">
            <img
              src={challenge.creatorAvatar}
              alt={challenge.creatorName}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-orange-500/40"
            />
            <div className="leading-tight">
              <span className="text-xs font-bold text-slate-200">
                {isCreator ? 'You' : challenge.creatorName}
              </span>
              <p className="text-[10px] text-slate-400">
                {new Date(challenge.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {challenge.status === 'active' && (
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  isUrgent
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                    : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{timeLeft}</span>
              </span>
            )}

            {challenge.status === 'pending_verification' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                <ShieldCheck className="w-3 h-3" />
                <span>Pending Review</span>
              </span>
            )}

            {challenge.status === 'completed' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified & Won</span>
              </span>
            )}

            {(challenge.status === 'failed' || challenge.status === 'rejected') && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                <XCircle className="w-3 h-3" />
                <span>Stake Burned</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="mt-3.5">
          <div className="flex items-center space-x-2">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryBadge(
                challenge.category
              )}`}
            >
              {challenge.category}
            </span>

            {challenge.walkTargetMeters && (
              <span className="inline-flex items-center space-x-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Footprints className="w-2.5 h-2.5" />
                <span>{challenge.walkTargetMeters} Meters</span>
              </span>
            )}

            {challenge.isGroupChallenge && (
              <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Users className="w-2.5 h-2.5" />
                <span>Group Stake</span>
              </span>
            )}
          </div>

          <h3 className="mt-2 text-base font-extrabold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
            {challenge.title}
          </h3>
          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Stake & Multiplier Bar */}
      <div className="mt-4 pt-3 border-t border-[#23273a] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Stake Chip */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-black text-orange-400">{challenge.stakeXp}</span>
            <span className="text-[10px] font-bold text-slate-400">XP</span>
          </div>

          {/* Multiplier / Payout */}
          {challenge.bonusMultiplier > 1.0 && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40">
              <span className="text-[11px] font-black text-amber-300">
                ⚡ {challenge.bonusMultiplier}x Bonus
              </span>
            </div>
          )}
        </div>

        {/* Potential / Won XP */}
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-medium">
            {challenge.status === 'completed' ? 'Total Won' : 'Potential Payout'}
          </span>
          <span className="text-xs font-black text-emerald-400">
            +{Math.round(challenge.stakeXp * challenge.bonusMultiplier)} XP
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-2">
        {challenge.status === 'active' && isCreator && (
          <div className="space-y-2">
            {isWalkingChallenge && onStartWalk && (
              <button
                onClick={() => onStartWalk(challenge)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Footprints className="w-4 h-4" />
                <span>Track Live Walk ({challenge.walkTargetMeters || 500}m)</span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onSubmitProof(challenge)}
                className={`${isWalkingChallenge ? 'col-span-2' : 'col-span-2'} flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Proof</span>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Surrender this challenge and burn ${challenge.stakeXp} XP?`)) {
                    burnChallengeManually(challenge.id);
                  }
                }}
                className="col-span-1 py-2 px-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-colors"
              >
                Surrender
              </button>
            </div>
          </div>
        )}

        {challenge.status === 'active' && !isCreator && (
          <div className="py-2 text-center text-xs text-slate-400 bg-[#1a1d2e] rounded-xl border border-[#272c42]">
            Waiting for {challenge.creatorName} to complete...
          </div>
        )}

        {challenge.status === 'pending_verification' && (
          <div className="space-y-1.5">
            {!isCreator ? (
              <button
                onClick={() => onVerifyProof(challenge)}
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all animate-pulse"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Friend's Proof (+25 XP)</span>
              </button>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <span className="font-semibold flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Waiting for peer review...</span>
                </span>
                <button
                  onClick={() => onViewProof(challenge)}
                  className="underline text-[11px] font-bold hover:text-white"
                >
                  View Proof
                </button>
              </div>
            )}
          </div>
        )}

        {(challenge.status === 'completed' || challenge.status === 'rejected' || challenge.status === 'failed') && (
          <button
            onClick={() => onViewProof(challenge)}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[#1b1e2e] hover:bg-[#23273c] text-slate-300 text-xs font-semibold border border-[#272c42] transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>View Challenge Record</span>
          </button>
        )}
      </div>
    </div>
  );
};
