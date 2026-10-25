import React, { useState } from 'react';
import { Flame, ShieldCheck, Heart, Skull, Zap, MessageSquare, Filter } from 'lucide-react';
import { FeedItem } from '../types/challenge';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../context/ChallengeContext';

export const SocialFeed: React.FC = () => {
  const { currentUser } = useAuth();
  const { feed, likeFeedItem } = useChallenges();
  const [filter, setFilter] = useState<string>('all');

  const filteredFeed = feed.filter((item) => {
    if (filter === 'stakes') return item.type === 'challenge_staked';
    if (filter === 'proofs') return item.type === 'proof_submitted' || item.type === 'challenge_verified';
    if (filter === 'burns') return item.type === 'xp_burned';
    if (filter === 'streaks') return item.type === 'streak_milestone';
    return true;
  });

  const getEventBadge = (type: FeedItem['type']) => {
    switch (type) {
      case 'challenge_staked':
        return { label: 'Locked Stake', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Flame };
      case 'proof_submitted':
        return { label: 'Proof Submitted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: ShieldCheck };
      case 'challenge_verified':
        return { label: 'Verified & Won', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Zap };
      case 'xp_burned':
        return { label: 'XP Burned', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Skull };
      case 'streak_milestone':
        return { label: 'Streak Bonus', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Flame };
      default:
        return { label: 'Event', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: MessageSquare };
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="rounded-3xl bg-[#131524] border border-[#262b42] p-5 sm:p-6 shadow-xl">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#232738]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-white">Live Accountability Feed</h2>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-400">Real-time peer stakes, verification verdicts & streak burns</p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 hidden sm:block" />
          {[
            { id: 'all', label: 'All' },
            { id: 'stakes', label: 'Stakes' },
            { id: 'proofs', label: 'Proofs' },
            { id: 'burns', label: 'Burns 💀' },
            { id: 'streaks', label: 'Streaks 🔥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-[#181a2b] text-slate-400 hover:text-white hover:bg-[#20243a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      <div className="mt-4 space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
        {filteredFeed.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No events found for this filter.
          </div>
        ) : (
          filteredFeed.map((item) => {
            const badge = getEventBadge(item.type);
            const Icon = badge.icon;
            const hasLiked = item.likes.includes(currentUser?.id || '');

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-[#171a2c]/80 border transition-all hover:border-[#383f60] ${
                  item.type === 'xp_burned'
                    ? 'border-red-900/40 bg-red-950/10'
                    : item.type === 'streak_milestone'
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : 'border-[#262c44]'
                }`}
              >
                {/* User & Event Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={item.userAvatar}
                      alt={item.userName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-500/30"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white">{item.userName}</span>
                        {item.verifierName && (
                          <span className="text-[10px] text-slate-400">
                            via <b className="text-emerald-400">{item.verifierName}</b>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Event Type Badge */}
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Message Body */}
                <p className="mt-2.5 text-xs text-slate-200 leading-relaxed font-medium">
                  {item.message}
                </p>

                {/* Optional Attached Proof Image Thumbnail */}
                {item.proofImageUrl && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-[#2b314d] max-h-48">
                    <img
                      src={item.proofImageUrl}
                      alt="Proof snapshot"
                      className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Interaction Footer */}
                <div className="mt-3 pt-2.5 border-t border-[#23273e] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {item.stakeXp && (
                      <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                        🔥 {item.stakeXp} XP Staked
                      </span>
                    )}
                    {item.burnedXp && (
                      <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                        💀 {item.burnedXp} XP Lost
                      </span>
                    )}
                    {item.streakCount !== undefined && item.streakCount > 0 && (
                      <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                        ⚡ {item.streakCount}-Streak
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => likeFeedItem(item.id)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      hasLiked
                        ? 'text-red-400 bg-red-500/15'
                        : 'text-slate-400 hover:text-white hover:bg-[#20253d]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-red-400 text-red-400' : ''}`} />
                    <span>{item.likes.length > 0 ? item.likes.length : 'Cheer'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
