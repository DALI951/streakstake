import React from 'react';
import { Flame, ShieldAlert, Award, TrendingUp, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../context/ChallengeContext';

export const StatsBanner: React.FC = () => {
  const { currentUser } = useAuth();
  const { calculateMultiplier } = useChallenges();

  const nextMultiplier = calculateMultiplier(currentUser.currentStreak);
  const totalGames = currentUser.challengesCompleted + currentUser.challengesFailed;
  const winRate = totalGames > 0 ? Math.round((currentUser.challengesCompleted / totalGames) * 100) : 100;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#151828] via-[#10131f] to-[#0c0e18] border border-[#272c42] p-5 sm:p-6 shadow-2xl">
      {/* Background ambient glow circles */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* User Identity & Streak Flagship */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-orange-500/30 shadow-lg"
            />
            {currentUser.currentStreak >= 3 && (
              <span className="absolute -bottom-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 ring-2 ring-[#0f111a] text-xs shadow-lg animate-bounce">
                🔥
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{currentUser.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                Rank #{currentUser.currentStreak >= 5 ? 'Elite' : currentUser.currentStreak >= 2 ? 'Pro' : 'Initiate'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>

            {/* Streak Status Pill */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold shadow-inner">
                <Flame className={`w-4 h-4 text-orange-400 ${currentUser.currentStreak > 0 ? 'flame-active' : ''}`} />
                <span>
                  {currentUser.currentStreak === 0 ? 'Streak Inactive (0)' : `${currentUser.currentStreak}-Day Streak`}
                </span>
              </div>

              {currentUser.currentStreak >= 2 ? (
                <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black animate-pulse">
                  <span>⚡ {nextMultiplier}x Multiplier Active!</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  {3 - currentUser.currentStreak} more wins to unlock 1.5x bonus multiplier
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Gamification Stats Grid */}
        <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Available XP */}
          <div className="p-3.5 rounded-2xl bg-[#181b2a]/90 border border-[#262c42] flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Available XP</span>
            </span>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-xl sm:text-2xl font-black text-amber-400">{currentUser.totalXp}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold">XP</span>
            </div>
          </div>

          {/* Locked XP Stake */}
          <div className="p-3.5 rounded-2xl bg-[#181b2a]/90 border border-[#262c42] flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-orange-400" />
              <span>At Stake</span>
            </span>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-xl sm:text-2xl font-black text-orange-400">{currentUser.stakedXp}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold">XP</span>
            </div>
          </div>

          {/* Win Rate */}
          <div className="p-3.5 rounded-2xl bg-[#181b2a]/90 border border-[#262c42] flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Win Rate</span>
            </span>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{winRate}%</span>
              <span className="text-[10px] text-slate-400">({currentUser.challengesCompleted}W/{currentUser.challengesFailed}L)</span>
            </div>
          </div>

          {/* Peer Arbiter Count */}
          <div className="p-3.5 rounded-2xl bg-[#181b2a]/90 border border-[#262c42] flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              <span>Proofs Verified</span>
            </span>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-xl sm:text-2xl font-black text-blue-400">{currentUser.proofsVerifiedCount}</span>
              <span className="text-[10px] text-slate-400">peers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
