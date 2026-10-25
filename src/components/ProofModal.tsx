import React, { useState } from 'react';
import { X, Upload, Camera, FileText, CheckCircle2 } from 'lucide-react';
import { Challenge } from '../types/challenge';
import { useChallenges } from '../context/ChallengeContext';

interface ProofModalProps {
  challenge: Challenge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProofModal: React.FC<ProofModalProps> = ({ challenge, isOpen, onClose }) => {
  const { submitProof } = useChallenges();
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedSample, setSelectedSample] = useState<string>('');

  if (!isOpen || !challenge) return null;

  // Sample proof images for instant one-click testing
  const sampleProofs = [
    { label: 'Strava Run GPS', url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80' },
    { label: 'Coding Commit', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80' },
    { label: 'Book Highlight', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80' },
    { label: 'Gym Workout', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80' },
  ];

  const handleSelectSample = (url: string) => {
    setSelectedSample(url);
    setImageUrl(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setSelectedSample('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitProof(challenge.id, notes.trim(), imageUrl || selectedSample);
    setNotes('');
    setImageUrl('');
    setSelectedSample('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#121422] border border-[#262b42] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#232738]">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Submit Proof</h2>
              <p className="text-xs text-slate-400">Lock in your victory before peer review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1a1d2e] hover:bg-[#23273e] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Challenge Summary */}
        <div className="mt-4 p-3 rounded-2xl bg-[#181a2b] border border-[#272c44]">
          <p className="text-xs font-bold text-white line-clamp-1">{challenge.title}</p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Locked Stake: <b className="text-orange-400">{challenge.stakeXp} XP</b></span>
            <span>Multiplier: <b className="text-amber-300">{challenge.bonusMultiplier}x</b></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Notes / Completion Log */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Completion Notes</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Describe what you accomplished (e.g. Completed 5.2 km in 27m, pushed commit #43a8)"
              className="w-full px-3 py-2 rounded-xl bg-[#181a2b] border border-[#282e47] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* Photo Proof Upload & Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span>Attach Proof Photo</span>
            </label>

            {/* Upload Area */}
            <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-[#2d334e] hover:border-orange-500/50 bg-[#161828] cursor-pointer transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-300">Click to upload photo or screenshot</span>
              <span className="text-[10px] text-slate-500">PNG, JPG, WEBP accepted</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Quick Sample Photos for instant testing */}
            <div className="mt-2.5">
              <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Or pick instant test proof:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {sampleProofs.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => handleSelectSample(sample.url)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-left truncate ${
                      selectedSample === sample.url
                        ? 'bg-purple-500/30 border-purple-400 text-white'
                        : 'bg-[#181a2b] border-[#272c42] text-slate-400 hover:text-white'
                    }`}
                  >
                    📸 {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {(imageUrl || selectedSample) && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-[#2d334e] max-h-40">
                <img
                  src={imageUrl || selectedSample}
                  alt="Proof preview"
                  className="w-full h-40 object-cover"
                />
                <span className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white">
                  Proof Attached
                </span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
            ⏳ Submitting will set status to <b>"Pending Peer Review"</b>. At least one participating friend must tap <b>Verify</b> to release your stake and award XP!
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit for Peer Verification</span>
          </button>
        </form>
      </div>
    </div>
  );
};
