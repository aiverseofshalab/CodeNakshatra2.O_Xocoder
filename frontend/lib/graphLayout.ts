import { PERFORMANCE } from '@/lib/constants';
import type {
  AnalyzerGraphData,
  GraphData,
  GraphNode,
  NodeType,
} from '@/types/graph';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function hashValue(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getClusterIndex(type: NodeType): number {
  const lookup: Record<NodeType, number> = {
    root: 0,
    repository: 1,
    library: 2,
    api: 3,
    service: 4,
    database: 5,
    server: 6,
    ip: 7,
    threat: 8,
    vulnerability: 9,
  };

  return lookup[type] ?? 0;
}

function clusterPosition(
  node: { id: string; type: NodeType },
  index: number,
): [number, number, number] {
  const cluster = getClusterIndex(node.type);

  const hash = hashValue(node.id);

  const angle = ((hash % 360) * Math.PI) / 180;

  const radius =
    4 +
    (hash % 7) * 0.35 +
    (index % 5) * 0.42;

  const ringOffset = (cluster - 4) * 3.4;

  const y =
    ((cluster % 3) - 1) * 3.2 +
    (((hash >> 3) % 7) - 3) * 0.28;

  const x =
    Math.cos(angle) * radius +
    ringOffset;

  const z =
    Math.sin(angle) * radius +
    ((cluster % 2 === 0 ? 1 : -1) * 2.4);

  return [
    Number(x.toFixed(2)),
    Number(y.toFixed(2)),
    Number(z.toFixed(2)),
  ];
}

export function normalizeAnalyzerGraph(
  payload: AnalyzerGraphData,
): GraphData {
  const trimmedNodes = payload.nodes.slice(
    0,
    PERFORMANCE.maxNodes,
  );

  const allowedIds = new Set(
    trimmedNodes.map((node) => node.id),
  );

  const nodes: GraphNode[] = trimmedNodes.map(
    (node, index) => ({
      id: node.id,
      label: node.id,
      type: node.type,
      position: clusterPosition(node, index),

      size: clamp(
        typeof node.size === 'number' ? node.size : 1.5,
        0.9,
        2.8,
      ),

      riskScore: clamp(
        typeof node.risk === 'number' ? node.risk : 0,
        0,
        1,
      ),

      metadata: {
        origin:
          node.type === 'repository' || node.type === 'root'
            ? 'repository'
            : 'dependency',
      },
    }),
  );

  const edges = payload.edges
    .filter(
      (edge, index) =>
        index < PERFORMANCE.maxEdges &&
        allowedIds.has(edge.source) &&
        allowedIds.has(edge.target),
    )
    .map((edge, index) => ({
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      weight:
        typeof edge.weight === 'number'
          ? edge.weight
          : 1,
    }));

  return {
    nodes,
    edges,
  };
}