export interface ReleaseInfo {
  version: string;
  name: string;
  notes: string;
  publishedAt: string;
  htmlUrl: string;
  apkDownloadUrl?: string;
  apkSizeMb?: string;
  hasUpdate: boolean;
}

export const CURRENT_APP_VERSION = 'v1.1.0';
const GITHUB_REPO = 'DALI951/streakstake';

// Helper to compare semver-like tags (e.g. v1.0.1 > v1.0.0)
export function isNewerVersion(remoteTag: string, currentTag: string): boolean {
  const cleanRemote = remoteTag.replace(/^v/, '').trim();
  const cleanCurrent = currentTag.replace(/^v/, '').trim();

  if (cleanRemote === cleanCurrent) return false;

  const remoteParts = cleanRemote.split('.').map((p) => parseInt(p, 10) || 0);
  const currentParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(remoteParts.length, currentParts.length);
  for (let i = 0; i < maxLen; i++) {
    const r = remoteParts[i] || 0;
    const c = currentParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export async function checkGitHubRelease(): Promise<ReleaseInfo> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const data = await response.json();
    const tagName = data.tag_name || 'v1.0.0';

    // Find the APK file among assets
    const apkAsset = data.assets?.find(
      (a: { name: string }) => a.name.endsWith('.apk')
    );

    const apkSizeMb = apkAsset ? (apkAsset.size / (1024 * 1024)).toFixed(2) + ' MB' : undefined;

    const hasUpdate = isNewerVersion(tagName, CURRENT_APP_VERSION);

    return {
      version: tagName,
      name: data.name || tagName,
      notes: data.body || 'No release notes provided.',
      publishedAt: data.published_at,
      htmlUrl: data.html_url,
      apkDownloadUrl: apkAsset?.browser_download_url,
      apkSizeMb,
      hasUpdate
    };
  } catch (error) {
    console.warn('Failed to check GitHub releases:', error);
    // Fallback info
    return {
      version: CURRENT_APP_VERSION,
      name: `StreakStake ${CURRENT_APP_VERSION}`,
      notes: 'Currently running the latest release build.',
      publishedAt: new Date().toISOString(),
      htmlUrl: `https://github.com/${GITHUB_REPO}/releases`,
      apkDownloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/${CURRENT_APP_VERSION}/StreakStake-${CURRENT_APP_VERSION}.apk`,
      apkSizeMb: '4.25 MB',
      hasUpdate: false
    };
  }
}
