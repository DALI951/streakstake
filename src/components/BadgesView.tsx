import React from 'react';
import { Award, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserBadge } from '../types/challenge';
import { useAuth } from '../context/AuthContext';

export const BadgesView: React.FC = () => {
  const { currentUser } = useAuth();

  const allBadges: (UserBadge & { reqText: string })[] = [
    {
      id: 'b1',
      name: 'First Blood',
      description: 'Staked and won your first accountability challenge in the arena.',
      icon: '🗡️',
      rarity: 'common',
      reqText: 'Win 1 challenge with proof verification'
    },
    {
      id: 'b2',
      name: 'Triple Threat',
      description: 'Maintained a 3-challenge streak to trigger the 1.5x payout multiplier.',
      icon: '🔥',
      rarity: 'rare',
      reqText: 'Reach a 3-consecutive challenge streak'
    },
    {
      id: 'b3',
      name: 'High Roller',
      description: 'Locked in 200+ XP on a single stake, proving absolute conviction.',
      icon: '💎',
      rarity: 'epic',
      reqText: 'Stake 200+ XP on a single challenge'
    },
    {
      id: 'b4',
      name: 'Fair Arbiter',
      description: 'Reviewed and verified 5 peer proof submissions to keep peers accountable.',
      icon: '⚖️',
      rarity: 'rare',
      reqText: 'Verify 5 friend proof submissions'
    },
    {
      id: 'b5',
      name: 'Iron Will',
      description: 'Maintained an unbroken 7-day challenge streak without a single burn.',
      icon: '🛡️',
      rarity: 'epic',
      reqText: 'Reach a 7-day unbroken streak'
    },
    {
      id: 'b6',
      name: 'Legendary',
      description: 'Surpassed 2,000 total verified XP and established peer mastery.',
      icon: '👑',
      rarity: 'legendary',
      reqText: 'Earn 2,000+ total lifetime XP'
    }
  ];

  const getRarityBadge = (rarity: UserBadge['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'rare':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'epic':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'legendary':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse';
    }
  };

  const unlockedIds = currentUser.badges.map((b) => b.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#131524] border border-[#262b42] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-white">Milestone Trophies & Badges</h2>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400">
            Earn permanent accolades for unbroken consistency, high stakes, and fair peer arbitration
          </p>
        </div>

        <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-[#181a2b] border border-[#272c44]">
          <Award className="w-5 h-5 text-orange-400" />
          <span className="text-xs font-bold text-white">
            Unlocked: <b className="text-orange-400">{unlockedIds.length}</b> / {allBadges.length}
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allBadges.map((badge) => {
          const isUnlocked = unlockedIds.includes(badge.id);

          return (
            <div
              key={badge.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                isUnlocked
                  ? 'bg-[#151728] border-orange-500/40 shadow-lg shadow-orange-500/5'
                  : 'bg-[#11131f] border-[#222538] opacity-60'
              }`}
            >
              <div>
                {/* Badge Top Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/40 shadow-inner'
                          : 'bg-[#1a1d2e] border-[#272c44] grayscale'
                      }`}
                    >
                      {badge.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">{badge.name}</h3>
                      <span
                        className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border ${getRarityBadge(
                          badge.rarity
                        )}`}
                      >
                        {badge.rarity}
                      </span>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px]">Unlocked</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-slate-500 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Locked</span>
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-slate-300 leading-relaxed font-medium">
                  {badge.description}
                </p>
              </div>

              {/* Requirement footer */}
              <div className="mt-4 pt-3 border-t border-[#23273a] flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Unlock Criteria:</span>
                <span className="text-slate-300 font-bold">{badge.reqText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
