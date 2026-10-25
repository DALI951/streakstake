import React from 'react';
import { X, Bell, ShieldCheck, Flame, Award, Trash2, CheckCircle2 } from 'lucide-react';
import { NotificationItem } from '../types/challenge';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../context/ChallengeContext';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChallenge: (challengeId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onSelectChallenge,
}) => {
  const { currentUser } = useAuth();
  const { notifications, markNotificationAsRead, clearAllNotifications } = useChallenges();

  if (!isOpen) return null;

  const userNotifications = notifications.filter((n) => n.userId === currentUser?.id);

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'verification_request':
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'stake_burned':
        return <Flame className="w-4 h-4 text-red-500" />;
      case 'challenge_won':
        return <Award className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-[#141624] border border-[#272c44] shadow-2xl p-5 mt-14 max-h-[85vh] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#232738]">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-black text-white">Notifications & Alerts</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-[#1a1d2e] hover:bg-[#23273e] text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="mt-3 space-y-2 overflow-y-auto max-h-[60vh] pr-1">
            {userNotifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                You're all caught up! No active notifications.
              </div>
            ) : (
              userNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markNotificationAsRead(n.id);
                    if (n.challengeId) {
                      onSelectChallenge(n.challengeId);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    !n.read
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-[#181a2b] border-[#252a3f] opacity-75'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <div className="p-1.5 rounded-xl bg-[#1e2236] shrink-0 mt-0.5">
                      {getNotifIcon(n.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{n.title}</h4>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300 leading-snug">{n.body}</p>
                      <span className="mt-1.5 block text-[9px] text-slate-500">
                        {new Date(n.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        {userNotifications.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#232738] flex items-center justify-between">
            <button
              onClick={clearAllNotifications}
              className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-red-400 font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all alerts</span>
            </button>
            <span className="text-[10px] text-slate-500">Auto-clears weekly</span>
          </div>
        )}
      </div>
    </div>
  );
};
