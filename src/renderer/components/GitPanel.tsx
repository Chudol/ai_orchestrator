import { useState, useEffect, useCallback } from 'react';
import { useAppStore, useActiveTrackedRepos } from '../stores/appStore';
import { TrackedRepoInfo, GitStatusResult } from '@shared/types';

interface RepoCardProps {
  repo: TrackedRepoInfo;
  onBranchChanged: () => void;
}

const RepoCard = ({ repo, onBranchChanged }: RepoCardProps): JSX.Element => {
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [pullLoading, setPullLoading] = useState(false);
  const [pullResult, setPullResult] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');

  const handleStatus = async (): Promise<void> => {
    setStatusLoading(true);
    try {
      const result = await window.api.getGitStatus(repo.path);
      setStatus(result);
    } catch {
      setStatus({ dirty: false, staged: 0, unstaged: 0, untracked: 0 });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleFetch = async (): Promise<void> => {
    setFetchLoading(true);
    setFetchResult(null);
    try {
      const result = await window.api.gitFetch(repo.path);
      setFetchResult(result.success ? 'Fetched' : result.error ?? 'Failed');
      setTimeout(() => setFetchResult(null), 4000);
    } catch {
      setFetchResult('Failed');
      setTimeout(() => setFetchResult(null), 4000);
    } finally {
      setFetchLoading(false);
    }
  };

  const handlePull = async (): Promise<void> => {
    setPullLoading(true);
    setPullResult(null);
    try {
      const result = await window.api.gitPull(repo.path);
      if (result.success) {
        setPullResult(result.output || 'Up to date');
        onBranchChanged();
      } else {
        setPullResult(result.error ?? 'Failed');
      }
      setTimeout(() => setPullResult(null), 5000);
    } catch {
      setPullResult('Failed');
      setTimeout(() => setPullResult(null), 5000);
    } finally {
      setPullLoading(false);
    }
  };

  const handleLoadBranches = async (): Promise<void> => {
    if (branchesOpen) {
      setBranchesOpen(false);
      return;
    }
    const list = await window.api.getGitBranches(repo.path);
    setBranches(list);
    setBranchSearch('');
    setBranchesOpen(true);
  };

  const handleCheckout = async (branch: string): Promise<void> => {
    setCheckoutLoading(true);
    try {
      await window.api.gitCheckout(repo.path, branch);
      setBranchesOpen(false);
      onBranchChanged();
    } catch {
      // checkout failed
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="section-card card-glow p-5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/15 border border-border flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue">
              <circle cx="12" cy="12" r="3" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
            </svg>
          </div>
          <div>
            <span className="text-accent-blue font-semibold text-[14px]">{repo.folderName}</span>
            <div className="text-[10px] text-txt-3 font-mono mt-0.5 truncate max-w-[300px]">{repo.path}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-branch text-[12px] font-mono px-2.5 py-1 rounded-md font-medium">
            {repo.branch ?? 'detached'}
          </span>
          {status && (
            <span className={`text-[10px] px-2 py-1 rounded-md font-mono font-medium ${
              status.dirty
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/15'
                : 'bg-green-500/10 text-green-400 border border-green-500/15'
            }`}>
              {status.dirty
                ? `${status.staged}S ${status.unstaged}M ${status.untracked}U`
                : 'clean'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {['Status', 'Checkout', 'Fetch', 'Pull'].map((action) => {
          const loading = action === 'Status' ? statusLoading : action === 'Fetch' ? fetchLoading : action === 'Pull' ? pullLoading : false;
          const handler = action === 'Status' ? handleStatus : action === 'Checkout' ? handleLoadBranches : action === 'Fetch' ? handleFetch : handlePull;
          return (
            <button
              key={action}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-surface-2/60 hover:bg-surface-3 border border-border text-txt-2 hover:text-txt-1 transition-all disabled:opacity-40"
              onClick={handler}
              disabled={loading}
            >
              {loading ? `${action}...` : action}
            </button>
          );
        })}

        {fetchResult && (
          <span className={`text-[11px] font-medium ${fetchResult === 'Fetched' ? 'text-green-400' : 'text-red-400'}`}>
            {fetchResult}
          </span>
        )}
        {pullResult && (
          <span className={`text-[11px] font-medium max-w-xs truncate ${pullResult.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
            {pullResult}
          </span>
        )}
      </div>

      {/* Branch list */}
      {branchesOpen && (() => {
        const filtered = branchSearch
          ? branches.filter((b) => b.toLowerCase().includes(branchSearch.toLowerCase()))
          : branches;
        return (
          <div className="mt-4 glass rounded-xl overflow-hidden">
            <div className="p-2.5 border-b border-border-subtle">
              <input
                type="text"
                className="w-full bg-surface-0/50 text-txt-1 text-xs px-3 py-2 rounded-lg input-field placeholder-txt-3 font-mono"
                placeholder="Search branches..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {checkoutLoading && (
                <div className="px-4 py-2.5 text-xs text-txt-3 animate-pulse">Switching branch...</div>
              )}
              {filtered.map((b) => (
                <button
                  key={b}
                  className={`block w-full text-left px-4 py-2 text-xs hover:bg-surface-2/50 transition-colors ${
                    b === repo.branch ? 'text-accent-blue font-medium' : 'text-txt-2 hover:text-txt-1'
                  }`}
                  onClick={() => handleCheckout(b)}
                  disabled={checkoutLoading}
                >
                  {b === repo.branch && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="inline mr-1.5 -mt-0.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {b}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-3 text-xs text-txt-3 text-center">No branches found</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export const GitPanel = (): JSX.Element => {
  const trackedRepos = useActiveTrackedRepos();
  const refreshBranches = useAppStore((s) => s.refreshTrackedRepoBranches);

  const handleRefresh = useCallback(async () => {
    await refreshBranches();
  }, [refreshBranches]);

  useEffect(() => {
    const interval = setInterval(handleRefresh, 30000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-surface-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/15 to-blue-500/15 border border-border flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                <circle cx="12" cy="12" r="3" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
              </svg>
            </div>
            <span className="gradient-text font-bold text-lg">Git Repositories</span>
          </div>
          <button
            className="text-txt-3 hover:text-accent-blue text-xs px-3 py-1.5 rounded-lg hover:bg-surface-2/50 transition-all flex items-center gap-1.5"
            onClick={handleRefresh}
            title="Refresh"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 105.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            Refresh
          </button>
        </div>

        {trackedRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-txt-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20 mb-4">
              <circle cx="12" cy="12" r="3" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
            </svg>
            <span className="text-sm">Select a session to see its tracked repositories.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {trackedRepos.map((repo) => (
              <RepoCard key={repo.path} repo={repo} onBranchChanged={handleRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
