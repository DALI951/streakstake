import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Crown, Clock, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LeaderboardView: React.FC = () => {
  const { users, currentUser } = useAuth();
  const [metric, setMetric] = useState<'weeklyXp' | 'streak'>('weeklyXp');
  const [resetCountdown, setResetCountdown] = useState<string>('');

  // Weekly Season Reset Countdown (resets Sunday midnight)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfWeek = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      endOfWeek.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
      endOfWeek.setHours(23, 59, 59, 999);

      const diff = endOfWeek.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setResetCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedUsers = [...users].sort((a, b) => {
    if (metric === 'weeklyXp') {
      return b.weeklyXp - a.weeklyXp;
    }
    return b.currentStreak - a.currentStreak;
  });

  const top3 = sortedUsers.slice(0, 3);
  const remaining = sortedUsers.slice(3);

  return (
    <div className="space-y-6">
      {/* Header and Season Timer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#131524] border border-[#262b42] shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-white">Season Leaderboard</h2>
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400">
            Top performers win bonus XP dividends and rare seasonal arbiter badges
          </p>
        </div>

        {/* Season Countdown */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold">
            <Clock className="w-4 h-4 text-orange-400" />
            <span>Season Reset: <b>{resetCountdown}</b></span>
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center bg-[#181a2b] p-1 rounded-xl border border-[#2a304c]">
            <button
              onClick={() => setMetric('weeklyXp')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                metric === 'weeklyXp'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weekly XP
            </button>
            <button
              onClick={() => setMetric('streak')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                metric === 'streak'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Streaks 🔥
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Rank 2 (Silver) */}
        {top3[1] && (
          <div className="order-2 md:order-1 p-5 rounded-3xl bg-gradient-to-b from-[#161a2b] to-[#121422] border border-[#2b3350] flex flex-col items-center text-center relative shadow-lg">
            <span className="absolute -top-3 px-3 py-0.5 rounded-full bg-slate-300 text-slate-900 text-xs font-black ring-4 ring-[#121422]">
              #2 SILVER
            </span>
            <img
              src={top3[1].avatar}
              alt={top3[1].name}
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-400 mt-2"
            />
            <h3 className="mt-3 text-sm font-black text-white">{top3[1].name}</h3>
            <p className="text-[11px] text-slate-400">{top3[1].email}</p>

            <div className="mt-4 w-full p-2.5 rounded-xl bg-[#1b1f33] border border-[#282f4d] flex items-center justify-around text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Weekly</span>
                <span className="font-extrabold text-amber-400">+{top3[1].weeklyXp} XP</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Streak</span>
                <span className="font-extrabold text-orange-400">🔥 {top3[1].currentStreak}d</span>
              </div>
            </div>
          </div>
        )}

        {/* Rank 1 (Gold) */}
        {top3[0] && (
          <div className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-[#241e24] via-[#1a1829] to-[#141525] border-2 border-amber-500/60 flex flex-col items-center text-center relative shadow-2xl -translate-y-2">
            <div className="absolute -top-4 flex items-center space-x-1 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black shadow-lg">
              <Crown className="w-3.5 h-3.5" />
              <span>#1 CHAMPION</span>
            </div>
            <img
              src={top3[0].avatar}
              alt={top3[0].name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-amber-400 shadow-xl mt-2"
            />
            <h3 className="mt-3 text-base font-black text-white">{top3[0].name}</h3>
            <p className="text-[11px] text-amber-300 font-semibold">{top3[0].email}</p>

            <div className="mt-4 w-full p-3 rounded-2xl bg-[#1d1f36] border border-amber-500/30 flex items-center justify-around text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Weekly</span>
                <span className="text-sm font-black text-amber-400">+{top3[0].weeklyXp} XP</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Streak</span>
                <span className="text-sm font-black text-orange-400">🔥 {top3[0].currentStreak}d</span>
              </div>
            </div>
          </div>
        )}

        {/* Rank 3 (Bronze) */}
        {top3[2] && (
          <div className="order-3 p-5 rounded-3xl bg-gradient-to-b from-[#181826] to-[#121422] border border-[#2d2938] flex flex-col items-center text-center relative shadow-lg">
            <span className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-700 text-amber-100 text-xs font-black ring-4 ring-[#121422]">
              #3 BRONZE
            </span>
            <img
              src={top3[2].avatar}
              alt={top3[2].name}
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-amber-700 mt-2"
            />
            <h3 className="mt-3 text-sm font-black text-white">{top3[2].name}</h3>
            <p className="text-[11px] text-slate-400">{top3[2].email}</p>

            <div className="mt-4 w-full p-2.5 rounded-xl bg-[#1b1f33] border border-[#282f4d] flex items-center justify-around text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Weekly</span>
                <span className="font-extrabold text-amber-400">+{top3[2].weeklyXp} XP</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Streak</span>
                <span className="font-extrabold text-orange-400">🔥 {top3[2].currentStreak}d</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ranks 4+ Table */}
      {remaining.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#131524] border border-[#262b42] shadow-xl">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-4">
            Contenders
          </h3>
          <div className="space-y-2">
            {remaining.map((user, idx) => {
              const rank = idx + 4;
              const isCurrentUser = user.id === currentUser.id;

              return (
                <div
                  key={user.id}
                  className={`p-3.5 rounded-2xl flex items-center justify-between transition-all ${
                    isCurrentUser
                      ? 'bg-orange-500/15 border border-orange-500/40 text-white'
                      : 'bg-[#181a2b] border border-[#272c44] text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="w-6 text-center font-black text-slate-400 text-sm">#{rank}</span>
                    <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold leading-tight flex items-center space-x-1.5">
                        <span>{user.name}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500 text-white font-black">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Weekly XP</span>
                      <span className="text-xs font-black text-amber-400">+{user.weeklyXp} XP</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Current Streak</span>
                      <span className="text-xs font-black text-orange-400">🔥 {user.currentStreak}d</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
