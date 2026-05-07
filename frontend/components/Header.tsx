'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/stores/graphStore';
import { useApiConnection } from '@/hooks/useApiGraph';
import { ECOSYSTEM_COLORS } from '@/lib/constants';
import type { GraphData } from '@/types/graph';

import {
  Search,
  Zap,
  Activity,
  Package,
  GitBranch,
  Sparkles,
  ChevronRight,
  Layers,
  FileText,
  Power,
  Brain,
  ShieldAlert,
} from 'lucide-react';

type VulnerabilityAlert = {
  id: string;
  package: string;
  severity: string;
  description: string;
};

interface EcosystemSummary {
  ecosystem: string;
  manifestPath: string;
  projectName: string;
  totalDeps: number;
  directDeps: number;
  devDeps: number;
}

interface AnalyzeResult {
  status: string;
  ecosystems: EcosystemSummary[];
  nodes: GraphData['nodes'];
  edges: GraphData['edges'];
  metadata: Record<string, any>;
}

interface DependencyAdvice {
  package: string;
  purpose: string;
  risk_level: string;
  best_alternatives: {
    name: string;
    reason: string;
    score: string;
  }[];
  recommendation: string;
  modern_choice: string;
  fastest_choice: string;
  safest_choice: string;
}

interface HeaderProps {
  onAnalyzeSuccess?: (owner: string, repo: string) => void;
}

function parseRepoInput(
  raw: string,
): { owner: string; repo: string } | null {
  const s = raw.trim().replace(/\.git$/, '');

  const urlMatch = s.match(
    /github\.com\/([^/]+)\/([^/]+)/,
  );

  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
    };
  }

  const slashMatch = s.match(
    /^([^/]+)\/([^/]+)$/,
  );

  if (slashMatch) {
    return {
      owner: slashMatch[1],
      repo: slashMatch[2],
    };
  }

  return null;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  (typeof window !== 'undefined' &&
  window.location.hostname.includes(
    'localhost',
  )
    ? 'http://127.0.0.1:8001'
    : 'https://openpulse-43sj.onrender.com');

async function callAnalyze(
  owner: string,
  repo: string,
  ecosystem: string | null,
): Promise<AnalyzeResult> {
  const res = await fetch(
    `${API_BASE}/api/analyze`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner,
        repo,
        ecosystem: ecosystem ?? undefined,
      }),
    },
  );

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({}));

    throw new Error(
      err.detail ?? `HTTP ${res.status}`,
    );
  }

  return res.json();
}

async function callDependencyAdvisor(
  packageName: string,
): Promise<DependencyAdvice> {
  const res = await fetch(
    `${API_BASE}/api/advisor`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_name: packageName,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(
      'Dependency advisor failed',
    );
  }

  return res.json();
}

function EcoBadge({
  eco,
  count,
  active,
  onClick,
}: {
  eco: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const color =
    ECOSYSTEM_COLORS[eco] ?? '#94a3b8';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border"
      style={{
        backgroundColor: active
          ? `${color}22`
          : 'rgba(255,255,255,0.03)',
        borderColor: active
          ? `${color}80`
          : 'rgba(255,255,255,0.1)',
        color: active ? color : '#94a3b8',
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: active
            ? color
            : '#475569',
        }}
      />

      {eco}

      <span className="opacity-50">
        {count}
      </span>
    </motion.button>
  );
}

function ManifestBadge({
  path,
  active,
  color,
  onClick,
}: {
  path: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono transition-all border"
      style={{
        backgroundColor: active
          ? `${color}18`
          : 'rgba(255,255,255,0.02)',
        borderColor: active
          ? `${color}80`
          : 'rgba(255,255,255,0.08)',
        color: active ? color : '#64748b',
      }}
    >
      {path}
    </motion.button>
  );
}

export default function Header({
  onAnalyzeSuccess,
}: HeaderProps = {}) {
  const setGraphData = useGraphStore(
    (s) => s.setGraphData,
  );

  const setNodes = useGraphStore(
    (s: any) => s.setNodes,
  );

  const setEdges = useGraphStore(
    (s: any) => s.setEdges,
  );

  const { connected, setForceDisconnect } =
    useApiConnection();

  const [input, setInput] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [advisorLoading, setAdvisorLoading] =
    useState(false);

  const [advisorInput, setAdvisorInput] =
    useState('');

  const [advisorResult, setAdvisorResult] =
    useState<DependencyAdvice | null>(null);

  const [error, setError] = useState<
    string | null
  >(null);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  const [demoMode, setDemoMode] =
    useState(false);

  const [fullResult, setFullResult] =
    useState<AnalyzeResult | null>(null);

  const [ecosystems, setEcosystems] =
    useState<EcosystemSummary[]>([]);

  const [activeEco, setActiveEco] =
    useState<string>('all');

  const [manifestGroups, setManifestGroups] =
    useState<Record<string, string[]>>({});

  const [activeManifest, setActiveManifest] =
    useState<string>('all');

  const flash = useCallback(
    (msg: string, kind: 'ok' | 'err') => {
      if (kind === 'ok') {
        setSuccessMsg(msg);
        setError(null);
      } else {
        setError(msg);
        setSuccessMsg(null);
      }

      setTimeout(() => {
        setSuccessMsg(null);
        setError(null);
      }, 4000);
    },
    [],
  );

  const applyFilter = useCallback(
    (
      result: AnalyzeResult,
      eco: string,
      manifest: string,
    ) => {
      let nodes = result.nodes;
      let edges = result.edges;

      if (eco !== 'all') {
        nodes = nodes.filter(
          (n: any) =>
            n.metadata?.ecosystem === eco ||
            (n.metadata?.isRoot &&
              n.metadata?.ecosystem === eco),
        );
      }

      if (manifest !== 'all') {
        nodes = nodes.filter((n: any) => {
          if (
            n.metadata?.manifestPath ===
            manifest
          )
            return true;

          const mp =
            n.metadata?.manifestPaths;

          return (
            Array.isArray(mp) &&
            mp.includes(manifest)
          );
        });
      }

      const nodeIds = new Set(
        nodes.map((n: any) => n.id),
      );

      edges = edges.filter(
        (e: any) =>
          nodeIds.has(e.source) &&
          nodeIds.has(e.target),
      );

      setNodes(nodes);
      setEdges(edges);
    },
    [setNodes, setEdges],
  );

  const handleAnalyze = useCallback(async () => {
    const parsed = parseRepoInput(input);

    if (!parsed) {
      flash(
        'Use format: owner/repo or GitHub URL',
        'err',
      );
      return;
    }

    setLoading(true);

    try {
      const result = await callAnalyze(
        parsed.owner,
        parsed.repo,
        null,
      );

      setFullResult(result);

      setGraphData({
        nodes: result.nodes,
        edges: result.edges,
      });

      setEcosystems(
        result.ecosystems ?? [],
      );

      const mg =
        (result.metadata
          ?.manifestGroups as Record<
          string,
          string[]
        >) ?? {};

      setManifestGroups(mg);

      applyFilter(result, 'all', 'all');

      flash(
        `✓ ${result.nodes.length} packages analyzed`,
        'ok',
      );

      if (onAnalyzeSuccess) {
        onAnalyzeSuccess(
          parsed.owner,
          parsed.repo,
        );
      }
    } catch (err) {
      flash(
        err instanceof Error
          ? err.message
          : 'Analysis failed',
        'err',
      );
    } finally {
      setLoading(false);
    }
  }, [
    input,
    flash,
    setGraphData,
    applyFilter,
    onAnalyzeSuccess,
  ]);

  const handleAdvisor = useCallback(async () => {
    if (!advisorInput.trim()) {
      flash(
        'Enter dependency/package name',
        'err',
      );
      return;
    }

    setAdvisorLoading(true);

    try {
      const result =
        await callDependencyAdvisor(
          advisorInput,
        );

      setAdvisorResult(result);

      flash(
        `AI analyzed ${advisorInput}`,
        'ok',
      );
    } catch (err) {
      flash(
        'Dependency advisor failed',
        'err',
      );
    } finally {
      setAdvisorLoading(false);
    }
  }, [advisorInput, flash]);

  const handleEcoChange = useCallback(
    (eco: string) => {
      setActiveEco(eco);

      setActiveManifest('all');

      if (fullResult) {
        applyFilter(
          fullResult,
          eco,
          'all',
        );
      }
    },
    [fullResult, applyFilter],
  );

  const handleManifestChange =
    useCallback(
      (manifest: string) => {
        setActiveManifest(manifest);

        if (fullResult) {
          applyFilter(
            fullResult,
            activeEco,
            manifest,
          );
        }
      },
      [fullResult, activeEco, applyFilter],
    );

  const toggleDemoMode = useCallback(() => {
    const newMode = !demoMode;

    setDemoMode(newMode);

    if (setForceDisconnect) {
      setForceDisconnect(newMode);
    }

    flash(
      newMode
        ? 'Demo Mode Enabled'
        : 'Live Mode Enabled',
      'ok',
    );
  }, [demoMode, setForceDisconnect, flash]);

  const uniqueEcos = [
    ...new Set(
      ecosystems.map((e) => e.ecosystem),
    ),
  ];

  const currentManifests =
    activeEco !== 'all' &&
    manifestGroups[activeEco]?.length > 1
      ? manifestGroups[activeEco]
      : [];

  const ecoColor =
    ECOSYSTEM_COLORS[activeEco] ??
    '#94a3b8';

  return (
    <motion.header className="shrink-0 border-b border-white/10 bg-black/80 backdrop-blur-2xl">

      <div className="flex items-center gap-3 px-6 py-4">

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" />
          </div>

          <span className="text-base font-bold text-white">
            OpenPulse
          </span>
        </div>

        <div className="flex-1 flex items-center gap-2">

          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                handleAnalyze()
              }
              placeholder="owner/repo"
              className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white"
            />

            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm"
          >
            {loading
              ? 'Scanning...'
              : 'Analyze'}
          </button>
        </div>

        <button
          type="button"
          onClick={toggleDemoMode}
          className="px-3 py-2 rounded-xl border border-white/10 text-zinc-300 text-xs"
        >
          {demoMode ? 'Demo' : 'Live'}
        </button>
      </div>

      <div className="px-6 pb-5">

        <div className="border border-white/10 bg-white/5 rounded-2xl p-4">

          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-cyan-400" />

            <h2 className="text-white font-semibold">
              AI Dependency Advisor
            </h2>
          </div>

          <div className="flex gap-2">

            <input
              type="text"
              value={advisorInput}
              onChange={(e) =>
                setAdvisorInput(
                  e.target.value,
                )
              }
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                handleAdvisor()
              }
              placeholder="react, lodash, express, axios..."
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
            />

            <button
              type="button"
              onClick={handleAdvisor}
              disabled={advisorLoading}
              className="px-5 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium"
            >
              {advisorLoading
                ? 'Thinking...'
                : 'Analyze Package'}
            </button>
          </div>

          {advisorResult && (
            <div className="mt-5 space-y-4">

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-white" />

                  <span className="text-white font-semibold">
                    {advisorResult.package}
                  </span>
                </div>

                <p className="text-sm text-zinc-300">
                  {advisorResult.purpose}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />

                    <span className="text-red-300 text-sm font-semibold">
                      Risk Level
                    </span>
                  </div>

                  <p className="text-white text-sm">
                    {
                      advisorResult.risk_level
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <span className="text-emerald-300 text-sm font-semibold">
                    Modern Choice
                  </span>

                  <p className="text-white text-sm mt-2">
                    {
                      advisorResult.modern_choice
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <span className="text-blue-300 text-sm font-semibold">
                    Safest Choice
                  </span>

                  <p className="text-white text-sm mt-2">
                    {
                      advisorResult.safest_choice
                    }
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="text-white font-semibold mb-3">
                  Recommendation
                </h3>

                <p className="text-zinc-300 text-sm">
                  {
                    advisorResult.recommendation
                  }
                </p>
              </div>

              {advisorResult
                .best_alternatives
                ?.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">

                  <h3 className="text-white font-semibold mb-4">
                    Best Alternatives
                  </h3>

                  <div className="space-y-3">

                    {advisorResult.best_alternatives.map(
                      (
                        alt,
                        index,
                      ) => (
                        <div
                          key={index}
                          className="border border-white/10 rounded-xl p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-300 font-medium">
                              {alt.name}
                            </span>

                            <span className="text-xs text-zinc-400">
                              Score:{' '}
                              {alt.score}
                            </span>
                          </div>

                          <p className="text-sm text-zinc-400 mt-2">
                            {alt.reason}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(error || successMsg) && (
          <motion.div className="px-6 pb-2 text-xs font-mono">
            <span
              className={
                error
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }
            >
              {error ?? successMsg}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {uniqueEcos.length > 0 && (
        <div className="flex items-center gap-2 px-6 pb-2 flex-wrap">

          <EcoBadge
            eco="all"
            count={ecosystems.length}
            active={activeEco === 'all'}
            onClick={() =>
              handleEcoChange('all')
            }
          />

          {uniqueEcos.map((eco) => (
            <EcoBadge
              key={eco}
              eco={eco}
              count={
                manifestGroups[eco]
                  ?.length ?? 1
              }
              active={activeEco === eco}
              onClick={() =>
                handleEcoChange(eco)
              }
            />
          ))}
        </div>
      )}

      {currentManifests.length > 0 && (
        <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">

          <ManifestBadge
            path={`all ${activeEco}`}
            active={
              activeManifest === 'all'
            }
            color={ecoColor}
            onClick={() =>
              handleManifestChange('all')
            }
          />

          {currentManifests.map((mf) => (
            <ManifestBadge
              key={mf}
              path={mf}
              active={
                activeManifest === mf
              }
              color={ecoColor}
              onClick={() =>
                handleManifestChange(mf)
              }
            />
          ))}
        </div>
      )}
    </motion.header>
  );
}