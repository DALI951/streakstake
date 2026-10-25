import React, { useState } from 'react';
import { Search, UserPlus, Flame, Award, ShieldCheck, Swords, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { audio } from '../services/audioService';

interface FriendsViewProps {
  onChallengeFriend: (friendId: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ onChallengeFriend }) => {
  const { currentUser, users, addFriend, removeFriend } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');

  const friendProfiles = users.filter((u) => currentUser?.friends?.includes(u.id));
  const nonFriends = users.filter((u) => u.id !== currentUser?.id && !currentUser?.friends?.includes(u.id));

  const filteredFriends = friendProfiles.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCustomFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendEmail.trim()) return;

    // Check if user already exists
    const existing = users.find(
      (u) => u.email.toLowerCase() === newFriendEmail.trim().toLowerCase()
    );

    if (existing) {
      addFriend(existing.id);
      audio.playClick();
      setNewFriendEmail('');
      setShowAddModal(false);
      return;
    }

    alert("We couldn't find a challenger with that email. You can add one of the suggested peer champions below!");
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#131524] border border-[#262b42]">
        <div>
          <h2 className="text-xl font-black text-white">Accountability Network</h2>
          <p className="text-xs text-slate-400">
            Peers who hold you accountable, review proof, and compete in group stakes
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#181a2b] border border-[#292f49] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Peer</span>
          </button>
        </div>
      </div>

      {/* Friends Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFriends.map((friend) => (
          <div
            key={friend.id}
            className="p-5 rounded-3xl bg-[#141624] border border-[#262b42] hover:border-orange-500/40 transition-all flex flex-col justify-between shadow-lg"
          >
            <div>
              {/* Profile Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-orange-500/30"
                    />
                    {friend.currentStreak >= 3 && (
                      <span className="absolute -bottom-1 -right-1 text-xs">🔥</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">{friend.name}</h3>
                    <p className="text-[10px] text-slate-400">{friend.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{friend.currentStreak}d</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#181a2b] border border-[#272c44] text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Balance</span>
                  <span className="text-xs font-black text-amber-400">{friend.totalXp} XP</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Locked</span>
                  <span className="text-xs font-black text-orange-400">{friend.stakedXp} XP</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Verified</span>
                  <span className="text-xs font-black text-blue-400">{friend.proofsVerifiedCount}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-[#23273e] flex items-center space-x-2">
              <button
                onClick={() => onChallengeFriend(friend.id)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Challenge Peer</span>
              </button>

              <button
                onClick={() => {
                  if (confirm(`Remove ${friend.name} from accountability partners?`)) {
                    removeFriend(friend.id);
                  }
                }}
                className="py-2 px-2.5 rounded-xl bg-[#1d2033] hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-semibold border border-[#2c3250] transition-colors"
                title="Remove friend"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested Peers to Connect */}
      {nonFriends.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#131524] border border-[#262b42] mt-6">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3">
            Suggested Accountability Champions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nonFriends.map((peer) => (
              <div
                key={peer.id}
                className="p-3.5 rounded-2xl bg-[#181a2b] border border-[#272c44] flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <img src={peer.avatar} alt={peer.name} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{peer.name}</p>
                    <p className="text-[10px] text-slate-400">🔥 {peer.currentStreak} streak • {peer.totalXp} XP</p>
                  </div>
                </div>

                <button
                  onClick={() => addFriend(peer.id)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-bold border border-blue-500/30 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#141624] border border-[#262b42] p-6 shadow-2xl">
            <h3 className="text-base font-black text-white">Find Accountability Peer</h3>
            <p className="text-xs text-slate-400 mt-1">Enter their email or handle</p>

            <form onSubmit={handleAddCustomFriend} className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="e.g. sarah.chen@streakstake.dev"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1d2e] border border-[#2a304a] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-all"
                >
                  Send Peer Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#202438] text-slate-400 text-xs font-semibold hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
