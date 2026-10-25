import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChallengeProvider, useChallenges } from './context/ChallengeContext';
import { Navbar } from './components/Navbar';
import { StatsBanner } from './components/StatsBanner';
import { ChallengeCard } from './components/ChallengeCard';
import { CreateChallengeModal } from './components/CreateChallengeModal';
import { ProofModal } from './components/ProofModal';
import { VerifyModal } from './components/VerifyModal';
import { WalkTrackerModal } from './components/WalkTrackerModal';
import { SocialFeed } from './components/SocialFeed';
import { FriendsView } from './components/FriendsView';
import { LeaderboardView } from './components/LeaderboardView';
import { BadgesView } from './components/BadgesView';
import { NotificationCenter } from './components/NotificationCenter';
import { UpdateModal } from './components/UpdateModal';
import { AuthScreen } from './components/AuthScreen';
import { checkGitHubRelease, ReleaseInfo } from './services/updateService';
import { Challenge } from './types/challenge';
import { Flame, ShieldAlert, Plus, Filter, Sparkles, Download, ArrowUpCircle, Footprints } from 'lucide-react';

const MainArena: React.FC = () => {
  const { currentUser, loadingAuth } = useAuth();
  const { challenges } = useChallenges();

  const [activeTab, setActiveTab] = useState<'challenges' | 'friends' | 'leaderboard' | 'badges'>('challenges');
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'mine' | 'walking' | 'pending'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null);

  const [proofTarget, setProofTarget] = useState<Challenge | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Challenge | null>(null);
  const [readOnlyTarget, setReadOnlyTarget] = useState<Challenge | null>(null);
  const [walkTarget, setWalkTarget] = useState<Challenge | null>(null);

  // Silent GitHub Release check on startup
  useEffect(() => {
    checkGitHubRelease().then((info) => {
      setUpdateInfo(info);
    }).catch(() => {});
  }, []);

  // Show AuthScreen if user is not signed in
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#090b12] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-orange-500/40 animate-pulse">
            <img src="/streakstake-icon.png" alt="Loading" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-bold text-orange-400">Loading StreakStake...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  // Filtered challenges list
  const filteredChallenges = challenges.filter((c) => {
    if (challengeFilter === 'mine') {
      return c.creatorId === currentUser.id;
    }
    if (challengeFilter === 'walking') {
      return c.category === 'walking' || c.proofType === 'pedometer';
    }
    if (challengeFilter === 'pending') {
      return c.status === 'pending_verification';
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
        openUpdateModal={() => setIsUpdateOpen(true)}
        hasUpdateAvailable={Boolean(updateInfo?.hasUpdate)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Dynamic Update Alert Banner if new release exists on GitHub */}
        {updateInfo?.hasUpdate && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-red-500/20 border border-orange-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-orange-500/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-orange-500/30 text-orange-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white flex items-center space-x-2">
                  <span>StreakStake {updateInfo.version} is available!</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-orange-500 text-white font-extrabold uppercase">
                    Update
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300">
                  New Android APK build ready with latest walking step detection.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUpdateOpen(true)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install APK</span>
            </button>
          </div>
        )}

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
                    { id: 'walking', label: 'Walk Tracks 🚶' },
                    { id: 'pending', label: 'Pending Review' }
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
                  <h3 className="text-base font-black text-white">Your Arena is Fresh</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Stake your XP on a walk target (e.g. 500 meters) or habit challenge to start earning streak multipliers!
                  </p>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Stake First Challenge</span>
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
                      onStartWalk={(c) => setWalkTarget(c)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right 5 cols: Real-Time Social Dashboard */}
            <div className="lg:col-span-5 space-y-4">
              <SocialFeed />

              {/* Live Step Tracking Explainer */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#16182a] to-[#121422] border border-[#262b42] shadow-xl space-y-2">
                <div className="flex items-center space-x-2">
                  <Footprints className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Walk Distance & Step Detection
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Set a distance in meters (e.g. 500m). When you walk, StreakStake's accelerometer sensor counts your physical steps and GPS records your actual distance. Once completed, your proof telemetry is automatically verified for friends to approve!
                </p>
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
            <button
              onClick={() => setIsUpdateOpen(true)}
              className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-orange-400" />
              <span>GitHub OTA Updater</span>
            </button>
            <span>Firebase Synced</span>
            <span>Step Detector Active</span>
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

      <WalkTrackerModal
        challenge={walkTarget}
        isOpen={Boolean(walkTarget)}
        onClose={() => setWalkTarget(null)}
      />

      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onSelectChallenge={handleSelectChallengeFromNotif}
      />

      <UpdateModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        onUpdateAvailableFound={(info) => setUpdateInfo(info)}
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
