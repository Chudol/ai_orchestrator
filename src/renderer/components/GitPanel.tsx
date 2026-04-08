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
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-purple-400 text-sm font-semibold">{repo.folderName}</span>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-mono text-sm font-medium px-2 py-0.5 bg-blue-900/30 rounded">
              {repo.branch ?? 'detached'}
            </span>
            {status && (
              <span className={`text-xs px-2 py-0.5 rounded ${status.dirty ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'}`}>
                {status.dirty
                  ? `${status.staged}S ${status.unstaged}M ${status.untracked}U`
                  : 'clean'}
              </span>
            )}
          </div>
        </div>
        <span className="text-gray-500 text-xs">{repo.path}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50"
          onClick={handleStatus}
          disabled={statusLoading}
        >
          {statusLoading ? 'Checking...' : 'Status'}
        </button>
        <button
          className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors relative"
          onClick={handleLoadBranches}
        >
          Checkout
        </button>
        <button
          className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50"
          onClick={handleFetch}
          disabled={fetchLoading}
        >
          {fetchLoading ? 'Fetching...' : 'Fetch'}
        </button>
        <button
          className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50"
          onClick={handlePull}
          disabled={pullLoading}
        >
          {pullLoading ? 'Pulling...' : 'Pull'}
        </button>

        {fetchResult && (
          <span className={`text-xs ${fetchResult === 'Fetched' ? 'text-green-400' : 'text-red-400'}`}>
            {fetchResult}
          </span>
        )}
        {pullResult && (
          <span className={`text-xs ${pullResult.includes('Failed') ? 'text-red-400' : 'text-green-400'} max-w-xs truncate`}>
            {pullResult}
          </span>
        )}
      </div>

      {branchesOpen && (() => {
        const filtered = branchSearch
          ? branches.filter((b) => b.toLowerCase().includes(branchSearch.toLowerCase()))
          : branches;
        return (
          <div className="mt-3 bg-gray-900 rounded border border-gray-700">
            <div className="p-2 border-b border-gray-700">
              <input
                type="text"
                className="w-full bg-gray-800 text-gray-200 text-xs px-2 py-1.5 rounded border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                placeholder="Search branches..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {checkoutLoading && (
                <div className="px-3 py-1.5 text-xs text-gray-400">Switching...</div>
              )}
              {filtered.map((b) => (
                <button
                  key={b}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors ${
                    b === repo.branch ? 'text-blue-400 font-medium' : 'text-gray-300'
                  }`}
                  onClick={() => handleCheckout(b)}
                  disabled={checkoutLoading}
                >
                  {b === repo.branch ? `* ${b}` : b}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-1.5 text-xs text-gray-500">No branches found</div>
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

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(handleRefresh, 30000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-300 font-medium">Git Repositories</span>
          <button
            className="text-gray-500 hover:text-gray-300 text-sm px-2 py-0.5 rounded hover:bg-gray-800"
            onClick={handleRefresh}
            title="Refresh"
          >
            &#8635; Refresh
          </button>
        </div>

        {trackedRepos.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-12">
            Select a session to see its tracked repositories.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trackedRepos.map((repo) => (
              <RepoCard key={repo.path} repo={repo} onBranchChanged={handleRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
