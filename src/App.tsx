import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChallengeProvider, useChallenges } from './context/ChallengeContext';
import { Navbar } from './components/Navbar';
import { StatsBanner } from './components/StatsBanner';
import { ChallengeCard } from './components/ChallengeCard';
import { CreateChallengeModal } from './components/CreateChallengeModal';
import { ProofModal } from './components/ProofModal';
import { VerifyModal } from './components/VerifyModal';
import { SocialFeed } from './components/SocialFeed';
import { FriendsView } from './components/FriendsView';
import { LeaderboardView } from './components/LeaderboardView';
import { BadgesView } from './components/BadgesView';
import { NotificationCenter } from './components/NotificationCenter';
import { Challenge } from './types/challenge';
import { Flame, ShieldAlert, Plus, Sparkles, Filter } from 'lucide-react';

const MainArena: React.FC = () => {
  const { currentUser } = useAuth();
  const { challenges } = useChallenges();

  const [activeTab, setActiveTab] = useState<'challenges' | 'friends' | 'leaderboard' | 'badges'>('challenges');
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'mine' | 'pending' | 'group'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [proofTarget, setProofTarget] = useState<Challenge | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Challenge | null>(null);
  const [readOnlyTarget, setReadOnlyTarget] = useState<Challenge | null>(null);

  // Filtered challenges list
  const filteredChallenges = challenges.filter((c) => {
    if (challengeFilter === 'mine') {
      return c.creatorId === currentUser.id;
    }
    if (challengeFilter === 'pending') {
      return c.status === 'pending_verification';
    }
    if (challengeFilter === 'group') {
      return c.isGroupChallenge;
    }
    return true;
  });

  const handleChallengeFriend = (_friendId: string) => {
    setActiveTab('challenges');
    setIsCreateOpen(true);
  };

  const handleSelectChallengeFromNotif = (challengeId: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;
    if (target.status === 'pending_verification') {
      setVerifyTarget(target);
    } else {
      setReadOnlyTarget(target);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d14] text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openCreateModal={() => setIsCreateOpen(true)}
        openNotificationDrawer={() => setIsNotifOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Banner with XP, Streak Multipliers & Win Rate */}
        <StatsBanner />

        {/* Tab 1: Arena (Challenges + Social Feed) */}
        {activeTab === 'challenges' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 cols: Challenge Cards & Actions */}
            <div className="lg:col-span-7 space-y-4">
              {/* Filter Tabs & Quick Action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#131524] border border-[#262b42]">
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
                  {[
                    { id: 'all', label: 'All Arena' },
                    { id: 'mine', label: 'My Stakes' },
                    { id: 'pending', label: 'Pending Review' },
                    { id: 'group', label: 'Group Battles' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setChallengeFilter(f.id as typeof challengeFilter)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        challengeFilter === f.id
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                          : 'bg-[#181a2b] text-slate-400 hover:text-white hover:bg-[#20253d]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-bold border border-orange-500/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Stake</span>
                </button>
              </div>

              {/* Challenge Cards Grid */}
              {filteredChallenges.length === 0 ? (
                <div className="py-16 p-8 rounded-3xl bg-[#131524] border border-[#262b42] text-center space-y-3">
                  <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Flame className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-white">No active challenges found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Stake your XP on your habits, workouts, or study goals to trigger streak multipliers!
                  </p>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Stake Challenge Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredChallenges.map((challenge) => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      onSubmitProof={(c) => setProofTarget(c)}
                      onVerifyProof={(c) => setVerifyTarget(c)}
                      onViewProof={(c) => setReadOnlyTarget(c)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right 5 cols: Real-Time Social Dashboard */}
            <div className="lg:col-span-5 space-y-4">
              <SocialFeed />

              {/* Peer Verification Explainer Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#16182a] to-[#121422] border border-[#262b42] shadow-xl">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    How Proof Verification Works
                  </h4>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed font-medium">
                  <p>
                    <b>1. Lock Stake:</b> Put your XP on the line before the countdown starts.
                  </p>
                  <p>
                    <b>2. Peer Check:</b> Complete the task and upload photo proof. It stays <i>Pending</i>.
                  </p>
                  <p>
                    <b>3. Proof or Burn:</b> A friend must tap <i>Verify</i>. Verified wins release the stake + <b>multiplier bonus</b>; rejected or lapsed proofs burn your XP permanently!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Friends & Accountability Network */}
        {activeTab === 'friends' && (
          <FriendsView onChallengeFriend={handleChallengeFriend} />
        )}

        {/* Tab 3: Season Leaderboard */}
        {activeTab === 'leaderboard' && <LeaderboardView />}

        {/* Tab 4: Badges & Trophies */}
        {activeTab === 'badges' && <BadgesView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1c1f30] py-6 text-center text-xs text-slate-500 bg-[#0a0c13]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-orange-400">STREAKSTAKE</span>
            <span>• Peer Verification & XP Staking Accountability</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Cross-Platform Ready</span>
            <span>Android APK Build Pipeline</span>
            <span>Automated Cron Punishments</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateChallengeModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <ProofModal
        challenge={proofTarget}
        isOpen={Boolean(proofTarget)}
        onClose={() => setProofTarget(null)}
      />

      <VerifyModal
        challenge={verifyTarget}
        isOpen={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
      />

      <VerifyModal
        challenge={readOnlyTarget}
        isOpen={Boolean(readOnlyTarget)}
        onClose={() => setReadOnlyTarget(null)}
        isReadOnly={true}
      />

      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onSelectChallenge={handleSelectChallengeFromNotif}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChallengeProvider>
        <MainArena />
      </ChallengeProvider>
    </AuthProvider>
  );
}
