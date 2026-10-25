import React, { useState } from 'react';
import { X, Flame, ShieldAlert, Users, Award, Clock } from 'lucide-react';
import { ChallengeCategory } from '../types/challenge';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../context/ChallengeContext';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, users } = useAuth();
  const { createChallenge, calculateMultiplier } = useChallenges();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ChallengeCategory>('fitness');
  const [stakeXp, setStakeXp] = useState<number>(100);
  const [deadlineHours, setDeadlineHours] = useState<number>(6);
  const [proofType, setProofType] = useState<'photo' | 'checklist' | 'mixed'>('photo');
  const [isGroupChallenge, setIsGroupChallenge] = useState<boolean>(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  if (!isOpen) return null;

  const multiplier = calculateMultiplier(currentUser.currentStreak);
  const potentialPayout = Math.round(stakeXp * multiplier);
  const availableFriends = users.filter((u) => u.id !== currentUser.id);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a challenge title.');
      return;
    }

    if (currentUser.totalXp < stakeXp) {
      alert(`Insufficient XP balance! You have ${currentUser.totalXp} XP, but are trying to stake ${stakeXp} XP.`);
      return;
    }

    const success = createChallenge({
      title: title.trim(),
      description: description.trim() || 'No additional instructions provided.',
      category,
      stakeXp,
      deadlineHours,
      proofType,
      isGroupChallenge,
      participantIds: selectedFriends
    });

    if (success) {
      // Reset form
      setTitle('');
      setDescription('');
      setStakeXp(100);
      setDeadlineHours(6);
      setIsGroupChallenge(false);
      setSelectedFriends([]);
      onClose();
    }
  };

  const categories: { key: ChallengeCategory; label: string; icon: string }[] = [
    { key: 'fitness', label: 'Fitness', icon: '🏃' },
    { key: 'coding', label: 'Coding', icon: '💻' },
    { key: 'reading', label: 'Reading', icon: '📚' },
    { key: 'health', label: 'Health', icon: '🥗' },
    { key: 'mindset', label: 'Mindset', icon: '🧘' }
  ];

  const stakePresets = [50, 100, 150, 250, 500];
  const deadlinePresets = [
    { hours: 1, label: '1 Hour (Sprint)' },
    { hours: 3, label: '3 Hours' },
    { hours: 6, label: '6 Hours' },
    { hours: 12, label: '12 Hours' },
    { hours: 24, label: '24 Hours (Full Day)' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#121422] border border-[#262b42] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232738]">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Flame className="w-5 h-5 flame-active" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Stake New Challenge</h2>
              <p className="text-xs text-slate-400">Put XP on the line with peer accountability</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1a1d2e] hover:bg-[#23273e] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Challenge Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5km morning run, Solve 3 LeetCode problems..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#181a2b] border border-[#282e47] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              required
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-5 gap-2">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                    category === c.key
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-md shadow-orange-500/10'
                      : 'bg-[#181a2b] border-[#262b42] text-slate-400 hover:bg-[#1f2338]'
                  }`}
                >
                  <span className="text-base mb-0.5">{c.icon}</span>
                  <span className="text-[10px]">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Requirements / Proof Guidelines
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What proof must be provided to peers to get verified? (e.g. Strava GPS link, photo of completed notebook, commit URL)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#181a2b] border border-[#282e47] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* XP Stake Selector */}
          <div className="p-4 rounded-2xl bg-[#16182a] border border-[#272c44]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>XP Stake (Locked in Escrow)</span>
              </label>
              <span className="text-xs font-black text-orange-400">{stakeXp} XP</span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 mb-3">
              {stakePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setStakeXp(preset)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    stakeXp === preset
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-[#1d2035] hover:bg-[#252942] text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min={25}
              max={Math.min(currentUser.totalXp, 1000)}
              step={25}
              value={stakeXp}
              onChange={(e) => setStakeXp(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />

            {/* Multiplier / Risk Summary */}
            <div className="mt-3 pt-3 border-t border-[#23273e] flex items-center justify-between text-xs">
              <span className="text-slate-400">Available: <b className="text-white">{currentUser.totalXp} XP</b></span>
              <div className="text-right">
                <span className="text-slate-400">Streak Multiplier: </span>
                <span className="font-black text-amber-300">{multiplier}x</span>
                <span className="text-emerald-400 font-extrabold ml-1.5">
                  (Win: +{potentialPayout} XP)
                </span>
              </div>
            </div>
          </div>

          {/* Deadline Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Deadline & Auto-Burn Timer</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {deadlinePresets.map((d) => (
                <button
                  key={d.hours}
                  type="button"
                  onClick={() => setDeadlineHours(d.hours)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    deadlineHours === d.hours
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-[#181a2b] border-[#262b42] text-slate-400 hover:bg-[#1f2338]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proof Type */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Required Proof Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProofType('photo')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  proofType === 'photo'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                    : 'bg-[#181a2b] border-[#262b42] text-slate-400 hover:bg-[#1f2338]'
                }`}
              >
                📸 Photo / Screenshot
              </button>
              <button
                type="button"
                onClick={() => setProofType('checklist')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  proofType === 'checklist'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                    : 'bg-[#181a2b] border-[#262b42] text-slate-400 hover:bg-[#1f2338]'
                }`}
              >
                ☑️ Checklist & Note
              </button>
            </div>
          </div>

          {/* Group Challenge Toggle */}
          <div className="p-3.5 rounded-2xl bg-[#16182a] border border-[#272c44]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Group Challenge</h4>
                  <p className="text-[10px] text-slate-400">Invite peers to lock equal stakes</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isGroupChallenge}
                onChange={(e) => setIsGroupChallenge(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
            </div>

            {isGroupChallenge && (
              <div className="mt-3 pt-3 border-t border-[#23273e] space-y-2">
                <p className="text-[11px] text-slate-400 font-medium">Select Friends to Challenge:</p>
                <div className="flex flex-wrap gap-2">
                  {availableFriends.map((f) => {
                    const isSelected = selectedFriends.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFriend(f.id)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-indigo-500/30 border-indigo-400 text-white'
                            : 'bg-[#1c1f33] border-[#2b314d] text-slate-400 hover:text-white'
                        }`}
                      >
                        <img src={f.avatar} alt={f.name} className="w-4 h-4 rounded-full object-cover" />
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Punishment Warning Banner */}
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start space-x-2 text-xs text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <b>Accountability Rule:</b> If you miss the deadline or your proof is rejected by a peer, your <b>{stakeXp} XP stake will be incinerated</b> and your streak will reset to 0!
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white text-sm font-extrabold shadow-xl shadow-orange-600/30 active:scale-95 transition-all"
          >
            <Award className="w-4 h-4" />
            <span>Lock In {stakeXp} XP Stake</span>
          </button>
        </form>
      </div>
    </div>
  );
};
