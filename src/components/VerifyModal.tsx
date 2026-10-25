import React, { useState } from 'react';
import { X, ShieldCheck, Flame, AlertTriangle, CheckCircle2, XCircle, Award } from 'lucide-react';
import { Challenge } from '../types/challenge';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../context/ChallengeContext';

interface VerifyModalProps {
  challenge: Challenge | null;
  isOpen: boolean;
  onClose: () => void;
  isReadOnly?: boolean;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({
  challenge,
  isOpen,
  onClose,
  isReadOnly = false
}) => {
  const { currentUser } = useAuth();
  const { verifyChallenge, rejectChallenge } = useChallenges();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!isOpen || !challenge) return null;

  const isCreator = challenge.creatorId === currentUser?.id;
  const canVerify = !isCreator && challenge.status === 'pending_verification' && !isReadOnly;

  const handleVerify = () => {
    verifyChallenge(challenge.id);
    onClose();
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please specify why this proof is being rejected (e.g. outdated photo, does not match requirements).');
      return;
    }
    rejectChallenge(challenge.id, rejectReason.trim());
    onClose();
  };

  const potentialEarned = Math.round(challenge.stakeXp * challenge.bonusMultiplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#121422] border border-[#262b42] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232738]">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {isReadOnly ? 'Challenge Proof Record' : 'Peer Verification Review'}
              </h2>
              <p className="text-xs text-slate-400">
                {canVerify ? 'You have peer arbiter power. Scrutinize the proof!' : 'Proof submission details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1a1d2e] hover:bg-[#23273e] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Challenger Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#181a2b] border border-[#272c44] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={challenge.creatorAvatar}
              alt={challenge.creatorName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-500/40"
            />
            <div>
              <p className="text-xs font-bold text-white leading-tight">{challenge.creatorName}</p>
              <p className="text-[10px] text-slate-400">
                Staked <span className="text-orange-400 font-bold">{challenge.stakeXp} XP</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold">Stake Status</span>
            <span
              className={`text-xs font-black capitalize ${
                challenge.status === 'completed'
                  ? 'text-emerald-400'
                  : challenge.status === 'pending_verification'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {challenge.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Challenge Title & Rules */}
        <div className="mt-3 p-3 rounded-xl bg-[#151726] border border-[#23273a]">
          <h3 className="text-sm font-black text-white">{challenge.title}</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">{challenge.description}</p>
        </div>

        {/* Proof Submission Content */}
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Submitted Proof Evidence
          </h4>

          {challenge.proof?.notes && (
            <div className="p-3 rounded-xl bg-[#181a2b] border border-[#282e47] text-xs text-slate-200">
              <span className="text-[10px] text-slate-400 block font-bold mb-1">Challenger Notes:</span>
              "{challenge.proof.notes}"
            </div>
          )}

          {challenge.proof?.imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#2d334e] bg-black/40">
              <img
                src={challenge.proof.imageUrl}
                alt="Proof attachment"
                className="w-full max-h-72 object-contain"
              />
              <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 text-[10px] text-slate-300 font-semibold backdrop-blur-md">
                Submitted on {new Date(challenge.proof.submittedAt).toLocaleTimeString()}
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#1a1d2e] border border-[#272c42] text-center text-xs text-slate-400">
              No photo attached. Verified via completion note.
            </div>
          )}

          {/* Verification Record if already verified */}
          {challenge.proof?.verifiedByUserName && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Verified by <b>{challenge.proof.verifiedByUserName}</b> on{' '}
                {new Date(challenge.proof.verifiedAt || '').toLocaleDateString()}
              </span>
            </div>
          )}

          {challenge.proof?.rejectionReason && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-xs text-red-300">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Rejected by <b>{challenge.proof.verifiedByUserName}</b>: "{challenge.proof.rejectionReason}"
              </span>
            </div>
          )}
        </div>

        {/* Verification Action Buttons */}
        {canVerify && (
          <div className="mt-5 space-y-3 pt-4 border-t border-[#232738]">
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <span className="flex items-center space-x-1 font-semibold">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Arbiter Reward for Verifying:</span>
              </span>
              <span className="font-extrabold text-amber-400">+25 XP</span>
            </div>

            {!showRejectInput ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleVerify}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify (+{potentialEarned} XP to Creator)</span>
                </button>

                <button
                  onClick={() => setShowRejectInput(true)}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-extrabold border border-red-500/30 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Reject & Burn</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/30">
                <label className="block text-xs font-bold text-red-300">
                  Reason for Rejection (Burn XP)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Photo doesn't match requirement, downloaded from internet..."
                  className="w-full px-3 py-2 rounded-xl bg-[#181a2b] border border-red-500/40 text-white text-xs focus:outline-none"
                />
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={handleReject}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                  >
                    Confirm Rejection & Burn {challenge.stakeXp} XP
                  </button>
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="px-3 py-2 rounded-xl bg-[#202438] text-slate-400 text-xs font-semibold hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isCreator && challenge.status === 'pending_verification' && (
          <div className="mt-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-300 font-semibold">
            🛡️ Peer accountability in action: you cannot verify your own proof! Switch to a friend profile (Sarah or Marcus) to test peer approval.
          </div>
        )}
      </div>
    </div>
  );
};
