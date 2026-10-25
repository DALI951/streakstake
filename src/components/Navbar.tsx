import React, { useState } from 'react';
import { Flame, Bell, Volume2, VolumeX, Users, Trophy, Award, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../context/ChallengeContext';
import { audio } from '../services/audioService';

interface NavbarProps {
  activeTab: 'challenges' | 'friends' | 'leaderboard' | 'badges';
  setActiveTab: (tab: 'challenges' | 'friends' | 'leaderboard' | 'badges') => void;
  openCreateModal: () => void;
  openNotificationDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openCreateModal,
  openNotificationDrawer,
}) => {
  const { currentUser, users, switchUser, signInWithGoogle, resetAllData } = useAuth();
  const { unreadNotificationCount } = useChallenges();
  const [soundActive, setSoundActive] = useState<boolean>(audio.isEnabled());
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  const toggleSound = () => {
    const next = !soundActive;
    audio.setSoundEnabled(next);
    setSoundActive(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f111a]/90 backdrop-blur-md border-b border-[#232738]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('challenges')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-lg shadow-orange-500/25">
            <Flame className="w-6 h-6 text-white flame-active" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                STREAKSTAKE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                P2P
              </span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-1 hidden sm:block">Proof or Burn Accountability</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#161824] p-1 rounded-xl border border-[#262a3d]">
          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'challenges'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#1e2233]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Arena</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#1e2233]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#1e2233]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'badges'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#1e2233]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Badges</span>
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-3">
          {/* Create Challenge Quick Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Stake Challenge</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundActive ? 'Mute sound effects' : 'Enable sound effects'}
            className="p-2 rounded-xl bg-[#161824] hover:bg-[#1e2233] text-slate-400 hover:text-white border border-[#262a3d] transition-colors"
          >
            {soundActive ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={openNotificationDrawer}
            className="relative p-2 rounded-xl bg-[#161824] hover:bg-[#1e2233] text-slate-400 hover:text-white border border-[#262a3d] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[#0f111a]">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Active User Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#161824] hover:bg-[#1e2233] border border-[#262a3d] transition-all"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-orange-500/50"
              />
              <div className="text-left hidden lg:block">
                <p className="text-xs font-bold text-slate-200 leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-amber-400 font-semibold">{currentUser.totalXp} XP</p>
              </div>
            </button>

            {/* User Switcher Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#141622] border border-[#2c324a] shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#232738]">
                  <div className="text-xs font-bold text-slate-300">Switch Peer / Account</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Live Demo
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-orange-500/15 border border-orange-500/40 text-white'
                            : 'hover:bg-[#1a1d2e] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                          <div>
                            <p className="text-xs font-semibold leading-tight flex items-center space-x-1">
                              <span>{u.name}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 inline" />}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              🔥 {u.currentStreak} streak • {u.totalXp} XP
                            </p>
                          </div>
                        </div>
                        {u.stakedXp > 0 && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {u.stakedXp} locked
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-2 border-t border-[#232738] space-y-1.5">
                  <button
                    onClick={() => {
                      signInWithGoogle();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Sign in with Google</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Reset all challenge data & restore seed peers?')) {
                        resetAllData();
                        setShowUserDropdown(false);
                      }
                    }}
                    className="w-full text-center text-[10px] text-slate-500 hover:text-red-400 py-1 transition-colors"
                  >
                    Reset to default state
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-[#232738] bg-[#0c0e17] py-2 px-1">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'challenges' ? 'text-orange-400' : 'text-slate-400'
          }`}
        >
          <Flame className="w-4 h-4 mb-0.5" />
          <span>Arena</span>
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'friends' ? 'text-orange-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Friends</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'leaderboard' ? 'text-orange-400' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-4 h-4 mb-0.5" />
          <span>Ranks</span>
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'badges' ? 'text-orange-400' : 'text-slate-400'
          }`}
        >
          <Award className="w-4 h-4 mb-0.5" />
          <span>Badges</span>
        </button>
      </div>
    </header>
  );
};
