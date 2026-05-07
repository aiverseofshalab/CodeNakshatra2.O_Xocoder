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
  AlertTriangle,
  Shield,
  X
} from 'lucide-react';

type VulnerabilityAlert = {
  id: string;
  package: string;
  severity: string;
  description: string;
};

interface EcosystemSummary {
  ecosystem:    string;
  manifestPath: string;
  projectName:  string;
  totalDeps:    number;
  directDeps:   number;
  devDeps:      number;
}

interface AnalyzeResult {
  status:      string;
  ecosystems:  EcosystemSummary[];
  nodes:       GraphData['nodes'];
  edges:       GraphData['edges'];
  metadata:    Record<string, unknown>;
}

interface HeaderProps {
  onAnalyzeSuccess?: (owner: string, repo: string) => void;
}

function parseRepoInput(raw: string): { owner: string; repo: string } | null {
  const s = raw.trim().replace(/\.git$/, '');
  const urlMatch = s.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const slashMatch = s.match(/^([^/]+)\/([^/]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
  return null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim() 
  || (typeof window !== 'undefined' && window.location.hostname.includes('localhost') 
      ? 'http://127.0.0.1:8001' 
      : 'https://openpulse-43sj.onrender.com');

async function callAnalyze(owner: string, repo: string, ecosystem: string | null): Promise<AnalyzeResult> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, repo, ecosystem: ecosystem ?? undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function EcoBadge({ eco, count, active, onClick }: { eco: string; count: number; active: boolean; onClick: () => void }) {
  const color = ECOSYSTEM_COLORS[eco] ?? '#94a3b8';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      animate={active ? { boxShadow: [`0 0 0px ${color}`, `0 0 12px ${color}`, `0 0 0px ${color}`] } : {}}
      transition={{ duration: 1.5, repeat: active ? Infinity : 0 }}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border relative overflow-hidden"
      style={{
        backgroundColor: active ? color + '22' : 'rgba(255,255,255,0.03)',
        borderColor: active ? color + '80' : 'rgba(255,255,255,0.1)',
        color: active ? color : '#94a3b8',
      }}
    >
      {active && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}
      <motion.span 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: active ? color : '#475569' }}
        animate={active ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {eco}
      <span className="opacity-50">{count}</span>
    </motion.button>
  );
}

function ManifestBadge({ path, active, color, onClick }: { path: string; active: boolean; color: string; onClick: () => void }) {
  const parts = path.split('/');
  const file = parts.pop()!;
  const dir = parts.length ? parts.join('/') + '/' : '';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      animate={active ? { borderColor: [color + '80', color, color + '80'], boxShadow: [`0 0 0px ${color}`, `0 0 8px ${color}`, `0 0 0px ${color}`] } : {}}
      transition={{ duration: 1, repeat: active ? Infinity : 0 }}
      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono transition-all border relative"
      style={{
        backgroundColor: active ? color + '18' : 'rgba(255,255,255,0.02)',
        borderColor: active ? color + '80' : 'rgba(255,255,255,0.08)',
        color: active ? color : '#64748b',
      }}
    >
      {dir && <span className="opacity-40">{dir}</span>}
      <span>{file}</span>
      {active && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
}

export default function Header({ onAnalyzeSuccess }: HeaderProps = {}) {
  const setGraphData = useGraphStore((s) => s.setGraphData);
  const { connected, setForceDisconnect } = useApiConnection();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const [fullResult, setFullResult] = useState<AnalyzeResult | null>(null);
  const [ecosystems, setEcosystems] = useState<EcosystemSummary[]>([]);
  const [activeEco, setActiveEco] = useState<string>('all');
  const [manifestGroups, setManifestGroups] = useState<Record<string, string[]>>({});
  const [activeManifest, setActiveManifest] = useState<string>('all');

  const [vulnerabilityAlerts, setVulnerabilityAlerts] = useState<VulnerabilityAlert[]>([]);
  const [showVulnAlerts, setShowVulnAlerts] = useState(false);

  const flash = useCallback((msg: string, kind: 'ok' | 'err') => {
    if (kind === 'ok') { setSuccessMsg(msg); setError(null); }
    else { setError(msg); setSuccessMsg(null); }
    setTimeout(() => { setSuccessMsg(null); setError(null); }, 4000);
  }, []);

  const applyFilter = useCallback(
    (result: AnalyzeResult, eco: string, manifest: string) => {
      let nodes = result.nodes;
      let edges = result.edges;

      if (eco !== 'all') {
        nodes = nodes.filter((n) => (n.metadata?.ecosystem === eco) || (n.metadata?.isRoot && n.metadata?.ecosystem === eco));
      }

      if (manifest !== 'all') {
        const rootNode = nodes.find((n) => n.metadata?.isRoot && n.metadata?.manifestPath === manifest);
        if (rootNode) {
          const connectedDepIds = new Set(edges.filter((e) => e.source === rootNode.id).map((e) => e.target));
          nodes = nodes.filter((n) => n.id === rootNode.id || connectedDepIds.has(n.id));
        } else {
          nodes = nodes.filter((n) => {
            if (n.metadata?.manifestPath === manifest) return true;
            const mp = n.metadata?.manifestPaths as string[] | undefined;
            if (mp && mp.includes(manifest)) return true;
            return false;
          });
        }
      }

      const nodeIds = new Set(nodes.map((n) => n.id));
      edges = edges.filter((e) => nodeIds.has(e.source as string) && nodeIds.has(e.target as string));

      setNodes(nodes);
      setEdges(edges);
    },
    [setNodes, setEdges],
  );

  const loadDemoData = useCallback(() => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setVulnerabilityAlerts([]);
    setShowVulnAlerts(false);

    setTimeout(() => {
      setFullResult(DEMO_DATA);
      setEcosystems(DEMO_DATA.ecosystems ?? []);
      const mg = (DEMO_DATA.metadata.manifestGroups ?? {}) as Record<string, string[]>;
      setManifestGroups(mg);
      applyFilter(DEMO_DATA, 'all', 'all');
      setLoading(false);

      const ecoNames = [...new Set(DEMO_DATA.ecosystems.map((e) => e.ecosystem))].join(', ');
      flash(`🎮 Demo: ${DEMO_DATA.metadata.totalNodes} packages · ${ecoNames} · ${DEMO_DATA.metadata.totalEdges} deps`, 'ok');

      if (onAnalyzeSuccess) {
        onAnalyzeSuccess('demo', 'app');
      }

      setTimeout(() => {
        setVulnerabilityAlerts(VULNERABILITY_ALERTS);
        setShowVulnAlerts(true);
      }, 6000);
    }, 1000);
  }, [flash, applyFilter, onAnalyzeSuccess]);

  const handleAnalyze = useCallback(async () => {
    if (demoMode) {
      loadDemoData();
      return;
    }

    const parsed = parseRepoInput(input);
    if (!parsed) {
      flash('Use format: owner/repo or a full GitHub URL', 'err');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setEcosystems([]);
    setManifestGroups({});
    setActiveEco('all');
    setActiveManifest('all');
    setVulnerabilityAlerts([]);
    setShowVulnAlerts(false);

    try {
      const result = await callAnalyze(parsed.owner, parsed.repo, null);
      setFullResult(result);
      setEcosystems(result.ecosystems ?? []);
      const mg = (DEMO_DATA.metadata.manifestGroups ?? {}) as Record<string, string[]>;
      setManifestGroups(mg);
      applyFilter(result, 'all', 'all');

      const ecoNames = [...new Set(result.ecosystems.map((e) => e.ecosystem))].join(', ');
      flash(`✓ ${result.metadata.totalNodes} packages · ${ecoNames} · ${result.metadata.totalEdges} deps`, 'ok');

      // Trigger callback
      if (onAnalyzeSuccess) {
        onAnalyzeSuccess(parsed.owner, parsed.repo);
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Analysis failed', 'err');
    } finally {
      setLoading(false);
    }
  }, [input, flash, applyFilter, onAnalyzeSuccess]);

  const handleEcoChange = useCallback((eco: string) => {
    setActiveEco(eco);
    setActiveManifest('all');
    if (fullResult) applyFilter(fullResult, eco, 'all');
  }, [fullResult, applyFilter]);

  const handleManifestChange = useCallback((manifest: string) => {
    setActiveManifest(manifest);
    if (fullResult) applyFilter(fullResult, activeEco, manifest);
  }, [fullResult, activeEco, applyFilter]);

  const toggleDemoMode = useCallback(() => {
    const newDemoMode = !demoMode;
    setDemoMode(newDemoMode);
    if (setForceDisconnect) {
      setForceDisconnect(newDemoMode);
    }
    flash(newDemoMode ? '🎮 Demo Mode: API disconnected' : '🔌 Live Mode: API reconnected', 'ok');
  }, [demoMode, setForceDisconnect, flash]);

  const handleDismissAlert = useCallback((alertId: string) => {
    setVulnerabilityAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const handleInspectVulnerability = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, [setSelectedNode]);

  const uniqueEcos = [...new Set(ecosystems.map((e) => e.ecosystem))];
  const currentManifests = activeEco !== 'all' && manifestGroups[activeEco]?.length > 1 ? manifestGroups[activeEco] : [];
  const ecoColor = ECOSYSTEM_COLORS[activeEco] ?? '#94a3b8';

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="shrink-0 border-b border-white/10 bg-black/80 backdrop-blur-2xl relative overflow-hidden"
    >
      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />

      <div className="flex items-center gap-3 px-6 py-4 relative z-10">
        <motion.div className="flex items-center gap-2 shrink-0 cursor-pointer" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <motion.div animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }} className="relative">
            <div className="absolute inset-0 rounded-lg bg-white/20 blur-md animate-pulse" />
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" />
            </div>
          </motion.div>
          <motion.span className="text-base font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent hidden sm:block" animate={{ backgroundPosition: ['0%', '100%'] }} transition={{ duration: 3, repeat: Infinity }} style={{ backgroundSize: '200% auto' }}>OpenPulse</motion.span>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}><Sparkles className="w-3 h-3 text-white/40" /></motion.div>
        </motion.div>

        <div className="flex-1 flex items-center gap-2">
          <motion.div className="flex-1 relative" animate={isFocused ? { scale: 1.01 } : { scale: 1 }}>
            <motion.div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-white/5 blur-md" animate={{ opacity: isFocused ? 1 : 0 }} transition={{ duration: 0.2 }} />
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder="owner/repo  or  https://github.com/owner/repo" className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 transition-all relative z-10" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 z-10" />
          </motion.div>

          <motion.button type="button" onClick={handleAnalyze} disabled={loading || !connected} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} animate={!loading && connected ? { boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 12px rgba(255,255,255,0.3)', '0 0 0px rgba(255,255,255,0)'] } : {}} transition={{ duration: 1.5, repeat: Infinity }} className="shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all relative overflow-hidden bg-white/10 hover:bg-white/20 text-white border border-white/20 disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? (<><motion.svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 004 12z"/></motion.svg>Scanning…</>) : (<><Activity className="w-4 h-4" />Analyze</>)}
          </motion.button>
        </div>

        <motion.a href="/docs" whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Docs</span></motion.a>

        <motion.button type="button" onClick={toggleDemoMode} whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} animate={demoMode ? { boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 8px rgba(251,191,36,0.5)', '0 0 0px rgba(251,191,36,0)'] } : {}} transition={{ duration: 1.5, repeat: demoMode ? Infinity : 0 }} className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all border relative overflow-hidden" style={{ backgroundColor: demoMode ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', borderColor: demoMode ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)', color: demoMode ? '#fbbf24' : '#94a3b8' }}>
          {demoMode && <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />}
          <Power className="w-4 h-4" />
          <span className="hidden sm:inline">{demoMode ? 'Demo' : 'Live'}</span>
        </motion.button>

        <motion.div className="shrink-0 flex items-center gap-1.5 text-xs" animate={connected ? { boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 8px rgba(34,197,94,0.5)', '0 0 0px rgba(34,197,94,0)'] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
          <motion.span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`} animate={connected ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 1, repeat: Infinity }} />
          <span className={`hidden sm:inline ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>{connected ? 'API Live' : 'Offline'}</span>
        </motion.div>
      </div>

      <AnimatePresence>{(error || successMsg) && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`px-6 pb-2 text-xs font-mono ${error ? 'text-rose-400' : 'text-emerald-400'}`}>{error ?? successMsg}</motion.div>)}</AnimatePresence>

      {uniqueEcos.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-2 px-6 pb-2 flex-wrap">
          <motion.span className="text-[10px] uppercase tracking-widest text-zinc-500 shrink-0 flex items-center gap-1" whileHover={{ letterSpacing: '0.2em' }}><GitBranch className="w-3 h-3" />Ecosystem:</motion.span>
          <EcoBadge eco="all" count={ecosystems.length} active={activeEco === 'all'} onClick={() => handleEcoChange('all')} />
          {uniqueEcos.map((eco) => { const count = manifestGroups[eco]?.length ?? 1; return <EcoBadge key={eco} eco={eco} count={count} active={activeEco === eco} onClick={() => handleEcoChange(eco)} />; })}
          <motion.div className="ml-auto flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {[...new Set(ecosystems.map((e) => e.ecosystem))].map((eco) => { const total = ecosystems.filter((e) => e.ecosystem === eco).reduce((s, e) => s + e.totalDeps, 0); return <motion.span key={eco} className="text-[10px] text-zinc-600 font-mono flex items-center gap-1" whileHover={{ scale: 1.05 }}><Package className="w-3 h-3" style={{ color: ECOSYSTEM_COLORS[eco] }} /><span style={{ color: ECOSYSTEM_COLORS[eco] }}>{eco}</span> {total} deps</motion.span>; })}
          </motion.div>
        </motion.div>
      )}

      {currentManifests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-2 px-6 pb-3 flex-wrap">
          <motion.span className="text-zinc-600 text-xs shrink-0 pl-2" animate={{ x: [0, 3, 0] }} transition={{ duration: 1, repeat: Infinity }}><ChevronRight className="w-3 h-3" /></motion.span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 shrink-0 flex items-center gap-1"><Layers className="w-3 h-3" />Manifest:</span>
          <ManifestBadge path={`all ${activeEco}`} active={activeManifest === 'all'} color={ecoColor} onClick={() => handleManifestChange('all')} />
          {currentManifests.map((mf) => (<ManifestBadge key={mf} path={mf} active={activeManifest === mf} color={ecoColor} onClick={() => handleManifestChange(mf)} />))}
        </motion.div>
      )}
    </motion.header>
  );
}
