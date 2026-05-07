'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './Header';
import Inspector from './Inspector';
import RepoIntel from './RepoIntel';
import ClientCanvasWrapper from './ClientCanvasWrapper';
import NodeTooltip from './NodeTooltip';
import FrontLoading from './FrontLoading';
import { useRepoIntel } from '@/hooks/useRepoIntel';
import { useGraphStore } from '@/stores/graphStore';

type PanelMode = 'inspector' | 'intel';

export default function Layout() {
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('inspector');

  const { data: intelData, status: intelStatus, error: intelError, fetch: fetchIntel } = useRepoIntel();

  const nodes = useGraphStore((s) => s.nodes);
  const rootNode = nodes.find((n) => n.metadata?.isRoot);
  const repoOwner = (rootNode?.metadata?.repoOwner as string) ?? '';
  const repoName = (rootNode?.metadata?.repoName as string) ?? '';

  const handlePanelToggle = (mode: PanelMode) => {
    setPanelMode(mode);
    if (mode === 'intel' && intelStatus === 'idle' && repoOwner && repoName) {
      fetchIntel(repoOwner, repoName);
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {!isLoadingComplete && (
          <FrontLoading onComplete={() => setIsLoadingComplete(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoadingComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-screen overflow-hidden flex flex-col bg-black text-slate-100"
          >
            <Header onAnalyzeSuccess={(owner, repo) => {
              setPanelMode('inspector');
              fetchIntel(owner, repo);
            }} />

            <main
              className="grid flex-1 min-h-0"
              style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}
            >
              <section className="relative overflow-hidden">
                <ClientCanvasWrapper />
                <NodeTooltip />
              </section>

              <div className="flex flex-col overflow-hidden border-l border-slate-800">
                <div className="shrink-0 flex border-b border-slate-800">
                  <button
                    type="button"
                    onClick={() => handlePanelToggle('inspector')}
                    className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                      panelMode === 'inspector'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Inspector
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePanelToggle('intel')}
                    className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                      panelMode === 'intel'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Repo Intel
                    {intelStatus === 'loading' && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse align-middle" />
                    )}
                    {intelStatus === 'ok' && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle" />
                    )}
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  {panelMode === 'inspector' && <Inspector />}

                  {panelMode === 'intel' && intelStatus === 'loading' && (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <svg className="w-6 h-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 004 12z" />
                      </svg>
                      <p className="text-xs text-slate-500">Fetching repository intelligence…</p>
                    </div>
                  )}

                  {panelMode === 'intel' && intelStatus === 'error' && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                      <p className="text-xs text-rose-400">{intelError}</p>
                      <button
                        type="button"
                        onClick={() => repoOwner && fetchIntel(repoOwner, repoName)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {panelMode === 'intel' && intelStatus === 'idle' && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                      <p className="text-xs text-slate-500">
                        Analyze a repo first, then switch to Repo Intel.
                      </p>
                    </div>
                  )}

                  {panelMode === 'intel' && intelStatus === 'ok' && intelData && (
                    <RepoIntel data={intelData} owner={repoOwner} repo={repoName} />
                  )}
                </div>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}