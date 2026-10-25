import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Download, ExternalLink, CheckCircle2, Sparkles, GitBranch, ArrowUpCircle } from 'lucide-react';
import { checkGitHubRelease, CURRENT_APP_VERSION, ReleaseInfo } from '../services/updateService';
import { audio } from '../services/audioService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateAvailableFound?: (info: ReleaseInfo) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  onUpdateAvailableFound
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);

  const fetchUpdate = async () => {
    setLoading(true);
    audio.playClick();
    try {
      const info = await checkGitHubRelease();
      setReleaseInfo(info);
      setLastChecked(new Date().toLocaleTimeString());
      if (info.hasUpdate && onUpdateAvailableFound) {
        onUpdateAvailableFound(info);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !releaseInfo) {
      fetchUpdate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadApk = () => {
    if (!releaseInfo?.apkDownloadUrl) return;
    setDownloading(true);
    audio.playSuccess();
    // Trigger download
    window.open(releaseInfo.apkDownloadUrl, '_blank');
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#131524] border border-[#272c44] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232738]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">GitHub Over-The-Air Updates</h2>
              <p className="text-xs text-slate-400">Continuous deployment sync from GitHub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1a1d2e] hover:bg-[#23273e] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Version & Refresh Status Bar */}
        <div className="mt-4 p-4 rounded-2xl bg-[#181a2b] border border-[#282e48] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Installed Version</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-white">{CURRENT_APP_VERSION}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                Active Client
              </span>
            </div>
          </div>

          <button
            onClick={fetchUpdate}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-bold border border-orange-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Checking...' : 'Check GitHub'}</span>
          </button>
        </div>

        {/* Release Status Result */}
        <div className="mt-4">
          {releaseInfo && (
            <div>
              {releaseInfo.hasUpdate ? (
                /* Update Available Card */
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/15 via-[#1a1828] to-[#121422] border-2 border-orange-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-amber-400 animate-bounce" />
                      <h3 className="text-sm font-black text-white">New Update Available!</h3>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-orange-500 text-white shadow-md">
                      {releaseInfo.version}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    A new build is ready on GitHub with latest features, mechanics, and bug fixes.
                  </p>

                  {/* Release Notes */}
                  <div className="p-3 rounded-xl bg-[#0f111a] border border-[#23273a] text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                    {releaseInfo.notes}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    {releaseInfo.apkDownloadUrl ? (
                      <button
                        onClick={handleDownloadApk}
                        disabled={downloading}
                        className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-black shadow-lg shadow-orange-500/25 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {downloading
                            ? 'Starting Download...'
                            : `Download APK Update (${releaseInfo.apkSizeMb || '4.25 MB'})`}
                        </span>
                      </button>
                    ) : (
                      <a
                        href={releaseInfo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Release Assets</span>
                      </a>
                    )}

                    <a
                      href={releaseInfo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center space-x-1 px-3 py-2.5 rounded-xl bg-[#1b1f32] hover:bg-[#232840] text-slate-300 text-xs font-semibold border border-[#2b324d] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Changelog</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* Already Up-to-Date Card */
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                  <div className="inline-flex p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-white">You're on the Latest Build!</h3>
                  <p className="text-xs text-slate-300">
                    Your version <b>{CURRENT_APP_VERSION}</b> matches the latest release on GitHub.
                  </p>
                  {lastChecked && (
                    <span className="text-[10px] text-slate-400 block">
                      Last checked at {lastChecked}
                    </span>
                  )}

                  {/* Direct Link to APK anyway */}
                  {releaseInfo.apkDownloadUrl && (
                    <div className="pt-2">
                      <a
                        href={releaseInfo.apkDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline font-bold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Re-download {releaseInfo.version} APK ({releaseInfo.apkSizeMb || '4.25 MB'})</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* How Continuous Updates Work through GitHub */}
        <div className="mt-5 p-4 rounded-2xl bg-[#161828] border border-[#272c42] space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
            <GitBranch className="w-4 h-4 text-orange-400" />
            <span>How to push updates easily from anywhere:</span>
          </div>
          <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Make any changes to your code locally or in GitHub.</li>
            <li>Commit & push to the <code className="text-orange-300">main</code> branch (or push a tag like <code className="text-orange-300">v1.0.1</code>).</li>
            <li>GitHub Actions builds the new APK automatically in ~1 minute.</li>
            <li>Open this dialog in the app: it detects the update and downloads the new APK with 1 click!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
