"use client";

import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { Network } from 'lucide-react';

const CustomNode = ({ data }: { data: any }) => {
  const isHighlighted = data.isHighlighted;
  
  if (data.isCategory) {
    return (
      <div className="px-4 py-2 rounded border border-zinc-800 bg-black shadow-lg">
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <span className="text-[11px] font-bold font-mono text-zinc-400 uppercase tracking-widest">{data.label}</span>
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  return (
    <div 
      className={`px-4 py-3 rounded border backdrop-blur-sm shadow-xl min-w-[200px] max-w-[280px] transition-all duration-300 ${
        isHighlighted 
          ? 'border-zinc-400 bg-zinc-800 shadow-[0_0_20px_rgba(255,255,255,0.05)] scale-105' 
          : 'border-zinc-800/50 bg-[#050505] text-zinc-300'
      }`}
      onMouseEnter={data.onMouseEnter}
      onMouseLeave={data.onMouseLeave}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex justify-between items-center mb-2 gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
        <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono truncate">{data.category.replace('_', ' ')}</span>
      </div>
      <p className="text-[12px] leading-snug">{data.statement}</p>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 100;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, edgesep: 10, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function RuleGraph() {
  const { session, activeHighlightId, setActiveHighlight } = useWorkspaceStore();
  const { rules, findings } = session;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Compute what rules should be highlighted
  const activeRuleIds = useMemo(() => {
    if (!activeHighlightId) return [];
    if (activeHighlightId.startsWith("F") || activeHighlightId.startsWith("C")) {
      const finding = findings.find(f => f.id === activeHighlightId);
      return finding ? finding.ruleIds : [];
    }
    return [activeHighlightId];
  }, [activeHighlightId, findings]);

  useEffect(() => {
    if (!rules || rules.length === 0) return;

    const categories = Array.from(new Set(rules.map(r => r.category)));
    
    // Add a central Policy node
    const initialNodes: Node[] = [
      {
        id: 'root',
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { isCategory: true, label: "POLICY DOCUMENT" },
      }
    ];

    // Add category nodes
    categories.forEach(cat => {
      initialNodes.push({
        id: `cat-${cat}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { isCategory: true, label: cat.replace(/_/g, " ") },
      });
    });

    // Add rule nodes
    rules.forEach((rule) => {
      initialNodes.push({
        id: rule.id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { 
          id: rule.id,
          statement: rule.statement,
          category: rule.category,
          isHighlighted: activeRuleIds.includes(rule.id),
          onMouseEnter: () => setActiveHighlight(rule.id),
          onMouseLeave: () => setActiveHighlight(null)
        },
      });
    });

    const initialEdges: Edge[] = [];
    
    // Link root to categories
    categories.forEach(cat => {
      initialEdges.push({
        id: `e-root-${cat}`,
        source: 'root',
        target: `cat-${cat}`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'rgba(255, 255, 255, 0.1)' },
      });
    });

    // Link categories to rules
    rules.forEach((rule) => {
      initialEdges.push({
        id: `e-cat-${rule.category}-${rule.id}`,
        source: `cat-${rule.category}`,
        target: rule.id,
        type: 'smoothstep',
        animated: activeRuleIds.includes(rule.id),
        style: { 
          stroke: activeRuleIds.includes(rule.id) ? 'rgba(161, 161, 170, 0.8)' : 'rgba(255, 255, 255, 0.1)',
          strokeWidth: activeRuleIds.includes(rule.id) ? 2 : 1
        },
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'LR'
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [rules, activeRuleIds, setActiveHighlight, setNodes, setEdges]);

  if (rules.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-black">
        <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5">
          <span className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
            <Network className="w-3.5 h-3.5" />
            Rule Graph
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-800">
          <Network className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-[11px] font-mono uppercase tracking-widest">Awaiting extraction</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A]">
      <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5 bg-black z-10">
        <span className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          <Network className="w-3.5 h-3.5" />
          Rule Graph
        </span>
        <span className="text-[11px] font-mono text-slate-600">{rules.length} nodes</span>
      </div>
      
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          className="bg-[#0A0A0A]"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#ffffff" gap={20} size={1} />
          <Controls className="opacity-30 hover:opacity-100 transition-opacity" />
        </ReactFlow>
      </div>
    </div>
  );
}
