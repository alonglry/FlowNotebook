import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
} from '@xyflow/react';

export interface VariableSummary {
  type: string;
  shape?: number[];
  columns?: string[];
  dtypes?: Record<string, string>;
  records?: Record<string, any>[];
  previewText?: string;
  sample?: any[];
  length?: number;
  value?: string;
}

export interface NodeExecutionState {
  status: 'idle' | 'queued' | 'running' | 'success' | 'error';
  stdout: string;
  stderr: string;
  executionTimeMs?: number;
  outputsSummary?: Record<string, VariableSummary>;
  error?: string;
  lastRunTimestamp?: number;
}

export interface CodeNodeData extends Record<string, unknown> {
  title: string;
  code: string;
  inputs: string[];
  outputs: string[];
  execution: NodeExecutionState;
  isCollapsed?: boolean;
}

export type CustomNode = Node<CodeNodeData, 'codeNode'>;

const INITIAL_NODES: CustomNode[] = [
  {
    id: 'node_1',
    type: 'codeNode',
    position: { x: 50, y: 150 },
    data: {
      title: 'Data Ingestion',
      inputs: [],
      outputs: ['df'],
      code: `import pandas as pd
import numpy as np

# Generate synthetic OHLCV time-series data
np.random.seed(42)
n_periods = 500
dates = pd.date_range("2024-01-01", periods=n_periods, freq="D")

# Random walk price generator with trend and volatility
returns = np.random.normal(loc=0.0005, scale=0.02, size=n_periods)
price_path = 100.0 * np.exp(np.cumsum(returns))

close = np.round(price_path, 2)
high = np.round(close * (1 + np.abs(np.random.normal(0, 0.008, n_periods))), 2)
low = np.round(close * (1 - np.abs(np.random.normal(0, 0.008, n_periods))), 2)
open_p = np.round((close + low) / 2, 2)
volume = np.random.randint(10000, 250000, size=n_periods)

df = pd.DataFrame({
    "Date": dates,
    "Open": open_p,
    "High": high,
    "Low": low,
    "Close": close,
    "Volume": volume
})

print(f"✓ Ingested {len(df)} OHLCV records from {dates[0].strftime('%Y-%m-%d')} to {dates[-1].strftime('%Y-%m-%d')}")
print(f"✓ Price range: \${df['Low'].min():.2f} - \${df['High'].max():.2f}")`,
      execution: {
        status: 'idle',
        stdout: '',
        stderr: '',
      },
    },
  },
  {
    id: 'node_2',
    type: 'codeNode',
    position: { x: 520, y: 150 },
    data: {
      title: 'Regime Filter',
      inputs: ['df'],
      outputs: ['df_regime'],
      code: `import pandas as pd
import numpy as np

# Fit 2-state rolling volatility & trend regime model
df_regime = df.copy()

# Moving averages
df_regime["SMA_20"] = df_regime["Close"].rolling(window=20).mean()
df_regime["SMA_50"] = df_regime["Close"].rolling(window=50).mean()

# Rolling volatility (20-day annualized)
returns = df_regime["Close"].pct_change()
df_regime["Volatility"] = returns.rolling(window=20).std() * np.sqrt(252)

# Classify market regime: 0 = Low Vol Trend, 1 = High Vol / Correction
vol_threshold = df_regime["Volatility"].median()
is_bull = df_regime["SMA_20"] > df_regime["SMA_50"]
is_low_vol = df_regime["Volatility"] <= vol_threshold

df_regime["Regime"] = np.where(is_bull & is_low_vol, "Bull_LowVol", 
                       np.where(is_bull, "Bull_HighVol", "Bear_Correction"))

counts = df_regime["Regime"].value_counts().to_dict()
print("✓ Market Regime Breakdown:")
for regime, count in counts.items():
    print(f"   • {regime}: {count} days ({count/len(df_regime)*100:.1f}%)")`,
      execution: {
        status: 'idle',
        stdout: '',
        stderr: '',
      },
    },
  },
  {
    id: 'node_3',
    type: 'codeNode',
    position: { x: 990, y: 150 },
    data: {
      title: 'Risk Management',
      inputs: ['df_regime'],
      outputs: ['final_signals'],
      code: `import pandas as pd
import numpy as np

# Calculate 14-period Average True Range (ATR) & dynamic trailing stops
final_signals = df_regime.copy()

high_low = final_signals["High"] - final_signals["Low"]
high_close_prev = np.abs(final_signals["High"] - final_signals["Close"].shift(1))
low_close_prev = np.abs(final_signals["Low"] - final_signals["Close"].shift(1))

tr = pd.concat([high_low, high_close_prev, low_close_prev], axis=1).max(axis=1)
final_signals["ATR_14"] = tr.rolling(window=14).mean()

# Dynamic Trailing Stop (2.0x ATR below Close for Bull regime)
multiplier = 2.0
final_signals["Trailing_Stop"] = np.where(
    final_signals["Regime"] == "Bull_LowVol",
    final_signals["Close"] - (multiplier * final_signals["ATR_14"]),
    final_signals["Close"] - (multiplier * 1.5 * final_signals["ATR_14"])
)

# Generate Buy / Hold / Exit signal
final_signals["Signal"] = np.where(
    (final_signals["Regime"] == "Bull_LowVol") & (final_signals["Close"] > final_signals["Trailing_Stop"]),
    "BUY",
    np.where(final_signals["Close"] <= final_signals["Trailing_Stop"], "EXIT", "HOLD")
)

buy_signals = (final_signals["Signal"] == "BUY").sum()
exit_signals = (final_signals["Signal"] == "EXIT").sum()
print(f"✓ Dynamic ATR Stop computed (Mean ATR: \${final_signals['ATR_14'].mean():.2f})")
print(f"✓ Signals generated: {buy_signals} BUY periods | {exit_signals} EXIT events")`,
      execution: {
        status: 'idle',
        stdout: '',
        stderr: '',
      },
    },
  },
  {
    id: 'node_4',
    type: 'codeNode',
    position: { x: 1460, y: 150 },
    data: {
      title: 'Performance Summary',
      inputs: ['final_signals'],
      outputs: [],
      code: `import pandas as pd
import numpy as np

# Backtest simulation metrics
df_sim = final_signals.dropna().copy()
df_sim["Pct_Change"] = df_sim["Close"].pct_change()
df_sim["In_Position"] = (df_sim["Signal"] == "BUY").astype(int).shift(1).fillna(0)
df_sim["Strategy_Return"] = df_sim["In_Position"] * df_sim["Pct_Change"]

# Performance metrics
cumulative_returns = (1 + df_sim["Strategy_Return"]).cumprod()
total_return = (cumulative_returns.iloc[-1] - 1) * 100
benchmark_return = ((df_sim['Close'].iloc[-1] / df_sim['Close'].iloc[0]) - 1) * 100

sharpe_ratio = (df_sim["Strategy_Return"].mean() / (df_sim["Strategy_Return"].std() + 1e-9)) * np.sqrt(252)

running_max = cumulative_returns.cummax()
drawdown = (cumulative_returns - running_max) / running_max
max_drawdown = drawdown.min() * 100

winning_days = (df_sim["Strategy_Return"] > 0).sum()
active_days = (df_sim["In_Position"] > 0).sum()
win_rate = (winning_days / max(active_days, 1)) * 100

print("=" * 55)
print("             QUANTITATIVE STRATEGY REPORT           ")
print("=" * 55)
print(f"  • Total Strategy Return:   {total_return:>8.2f}%")
print(f"  • Benchmark Buy & Hold:    {benchmark_return:>8.2f}%")
print(f"  • Annualized Sharpe Ratio: {sharpe_ratio:>8.2f}")
print(f"  • Maximum Drawdown:        {max_drawdown:>8.2f}%")
print(f"  • Active Trading Days:     {active_days:>8d}")
print(f"  • Win Rate on Active Days: {win_rate:>8.1f}%")
print("=" * 55)
print("✓ Pipeline execution complete! Strategy model is ready for live deployment.")`,
      execution: {
        status: 'idle',
        stdout: '',
        stderr: '',
      },
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: 'e_1_2',
    type: 'customEdge',
    source: 'node_1',
    target: 'node_2',
    sourceHandle: 'df',
    targetHandle: 'df',
    animated: true,
  },
  {
    id: 'e_2_3',
    type: 'customEdge',
    source: 'node_2',
    target: 'node_3',
    sourceHandle: 'df_regime',
    targetHandle: 'df_regime',
    animated: true,
  },
  {
    id: 'e_3_4',
    type: 'customEdge',
    source: 'node_3',
    target: 'node_4',
    sourceHandle: 'final_signals',
    targetHandle: 'final_signals',
    animated: true,
  },
];

interface GraphState {
  nodes: CustomNode[];
  edges: Edge[];
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  isGraphRunning: boolean;
  ws: WebSocket | null;
  standaloneScript: string | null;
  isExportModalOpen: boolean;
  activeTabByNode: Record<string, 'console' | 'table' | 'variables'>;

  // Actions
  onNodesChange: OnNodesChange<CustomNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateNodeCode: (id: string, code: string) => void;
  updateNodeTitle: (id: string, title: string) => void;
  addNodeInput: (id: string, inputName: string) => void;
  removeNodeInput: (id: string, inputName: string) => void;
  addNodeOutput: (id: string, outputName: string) => void;
  removeNodeOutput: (id: string, outputName: string) => void;
  addNewNode: () => void;
  deleteNode: (id: string) => void;
  deleteEdge: (edgeId: string) => void;
  toggleNodeCollapse: (id: string) => void;
  setNodeTab: (nodeId: string, tab: 'console' | 'table' | 'variables') => void;
  maximizedNodeId: string | null;
  setMaximizedNodeId: (nodeId: string | null) => void;
  
  // Execution & WS
  initWebSocket: () => void;
  runGraph: () => void;
  runNode: (nodeId: string) => void;
  resetPipeline: () => void;
  exportStandaloneScript: () => Promise<void>;
  setIsExportModalOpen: (open: boolean) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  wsStatus: 'disconnected',
  isGraphRunning: false,
  ws: null,
  standaloneScript: null,
  isExportModalOpen: false,
  activeTabByNode: {},
  maximizedNodeId: null,

  setMaximizedNodeId: (id) => {
    set({ maximizedNodeId: id });
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
    });
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    // Cycle check: verify if adding connection creates a cycle
    const { edges } = get();
    const source = connection.source;
    const target = connection.target;

    if (!source || !target || source === target) return;

    // Check if path already exists from target to source
    const hasPath = (src: string, tgt: string, visited = new Set<string>()): boolean => {
      if (src === tgt) return true;
      visited.add(src);
      const outgoing = edges.filter((e) => e.source === src).map((e) => e.target);
      for (const next of outgoing) {
        if (!visited.has(next)) {
          if (hasPath(next, tgt, visited)) return true;
        }
      }
      return false;
    };

    if (hasPath(target, source)) {
      alert(`Invalid Connection: Connecting "${source}" → "${target}" would create a cycle.`);
      return;
    }

    const newEdge: Edge = {
      ...connection,
      id: `e_${source}_${target}_${Date.now()}`,
      type: 'customEdge',
      animated: true,
    };

    set({
      edges: addEdge(newEdge, edges),
    });
  },

  updateNodeCode: (id, code) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, code } } : node
      ),
    });
  },

  updateNodeTitle: (id, title) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, title } } : node
      ),
    });
  },

  addNodeInput: (id, inputName) => {
    if (!inputName.trim()) return;
    const clean = inputName.trim().replace(/\s+/g, '_');
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        if (node.data.inputs.includes(clean)) return node;
        return {
          ...node,
          data: { ...node.data, inputs: [...node.data.inputs, clean] },
        };
      }),
    });
  },

  removeNodeInput: (id, inputName) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        return {
          ...node,
          data: {
            ...node.data,
            inputs: node.data.inputs.filter((i) => i !== inputName),
          },
        };
      }),
      // Remove connected edges targeting this handle
      edges: get().edges.filter(
        (e) => !(e.target === id && e.targetHandle === inputName)
      ),
    });
  },

  addNodeOutput: (id, outputName) => {
    if (!outputName.trim()) return;
    const clean = outputName.trim().replace(/\s+/g, '_');
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        if (node.data.outputs.includes(clean)) return node;
        return {
          ...node,
          data: { ...node.data, outputs: [...node.data.outputs, clean] },
        };
      }),
    });
  },

  removeNodeOutput: (id, outputName) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        return {
          ...node,
          data: {
            ...node.data,
            outputs: node.data.outputs.filter((o) => o !== outputName),
          },
        };
      }),
      // Remove connected edges sourcing from this handle
      edges: get().edges.filter(
        (e) => !(e.source === id && e.sourceHandle === outputName)
      ),
    });
  },

  addNewNode: () => {
    const { nodes } = get();
    const count = nodes.length + 1;
    const id = `node_${Date.now()}`;
    const xPos = 100 + (nodes.length % 4) * 450;
    const yPos = 150 + Math.floor(nodes.length / 4) * 350;

    const newNode: CustomNode = {
      id,
      type: 'codeNode',
      position: { x: xPos, y: yPos },
      data: {
        title: `Custom Node ${count}`,
        inputs: ['data_in'],
        outputs: ['data_out'],
        code: `# Transform or process incoming variables\nprint(f"Executing node: {data_in if 'data_in' in locals() else 'None'}")\ndata_out = "Result from " + "${id}"`,
        execution: {
          status: 'idle',
          stdout: '',
          stderr: '',
        },
      },
    };

    set({ nodes: [...nodes, newNode] });
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
    });
  },

  toggleNodeCollapse: (id) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                isCollapsed: !node.data.isCollapsed,
              },
            }
          : node
      ),
    });
  },

  setNodeTab: (nodeId, tab) => {
    set({
      activeTabByNode: {
        ...get().activeTabByNode,
        [nodeId]: tab,
      },
    });
  },

  initWebSocket: () => {
    const existingWs = get().ws;
    if (existingWs && (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Direct connect to backend port 8000 in dev mode
    const isDev = window.location.port !== '8000';
    const hostname = window.location.hostname || 'localhost';
    const host = isDev ? `${hostname}:8000` : window.location.host;
    const wsUrl = (import.meta as any).env?.VITE_BACKEND_WS_URL || `${protocol}//${host}/ws/execute`;

    console.log('[PyCanvas] Initializing WebSocket connection to:', wsUrl);
    set({ wsStatus: 'connecting' });

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[PyCanvas] WebSocket initialization error:', err);
      set({ wsStatus: 'disconnected', ws: null });
      return;
    }

    ws.onopen = () => {
      console.log('[PyCanvas] WebSocket connected successfully.');
      set({ wsStatus: 'connected', ws });
    };

    ws.onclose = (event) => {
      console.warn('[PyCanvas] WebSocket closed:', event.code, event.reason);
      set({ wsStatus: 'disconnected', ws: null, isGraphRunning: false });
      // Auto-reconnect after 2 seconds
      setTimeout(() => {
        const currentStatus = get().wsStatus;
        if (currentStatus === 'disconnected') {
          get().initWebSocket();
        }
      }, 2000);
    };

    ws.onerror = (err) => {
      console.error('[PyCanvas] WebSocket error:', err);
      set({ wsStatus: 'disconnected', isGraphRunning: false });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'execution_start') {
          set({ isGraphRunning: true });
        } else if (payload.type === 'node_status') {
          const { nodeId, status } = payload;
          set({
            nodes: get().nodes.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      execution: { ...n.data.execution, status },
                    },
                  }
                : n
            ),
          });
        } else if (payload.type === 'node_result') {
          const { nodeId, status, stdout, stderr, executionTimeMs, outputsSummary, error } = payload;
          set({
            nodes: get().nodes.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      execution: {
                        status,
                        stdout: stdout || '',
                        stderr: stderr || '',
                        executionTimeMs,
                        outputsSummary: outputsSummary || {},
                        error,
                        lastRunTimestamp: Date.now(),
                      },
                    },
                  }
                : n
            ),
          });
        } else if (payload.type === 'execution_complete' || payload.type === 'execution_failed') {
          set({ isGraphRunning: false });
        } else if (payload.type === 'compile_result') {
          set({ standaloneScript: payload.script, isExportModalOpen: true });
        } else if (payload.type === 'error') {
          alert(`Execution Error: ${payload.message}`);
          set({ isGraphRunning: false });
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    set({ ws });
  },

  runGraph: () => {
    const { ws, wsStatus, nodes, edges } = get();
    if (!ws || wsStatus !== 'connected') {
      alert('WebSocket backend is not connected. Please ensure backend server is running.');
      return;
    }

    const payload = {
      action: 'run_graph',
      graph: {
        nodes: nodes.map((n) => ({
          id: n.id,
          title: n.data.title,
          code: n.data.code,
          inputs: n.data.inputs,
          outputs: n.data.outputs,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      },
    };

    // Reset status to idle/queued
    set({
      isGraphRunning: true,
      nodes: nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          execution: {
            ...n.data.execution,
            status: 'queued',
          },
        },
      })),
    });

    ws.send(JSON.stringify(payload));
  },

  runNode: (nodeId: string) => {
    const { ws, wsStatus, nodes, edges } = get();
    if (!ws || wsStatus !== 'connected') {
      alert('WebSocket backend is not connected.');
      return;
    }

    const payload = {
      action: 'run_node',
      nodeId,
      graph: {
        nodes: nodes.map((n) => ({
          id: n.id,
          title: n.data.title,
          code: n.data.code,
          inputs: n.data.inputs,
          outputs: n.data.outputs,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      },
    };

    set({
      nodes: nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                execution: { ...n.data.execution, status: 'queued' },
              },
            }
          : n
      ),
    });

    ws.send(JSON.stringify(payload));
  },

  resetPipeline: () => {
    set({
      nodes: INITIAL_NODES,
      edges: INITIAL_EDGES,
      activeTabByNode: {},
    });
  },

  exportStandaloneScript: async () => {
    const { nodes, edges, ws, wsStatus } = get();
    if (ws && wsStatus === 'connected') {
      ws.send(
        JSON.stringify({
          action: 'compile',
          graph: {
            nodes: nodes.map((n) => ({
              id: n.id,
              title: n.data.title,
              code: n.data.code,
              inputs: n.data.inputs,
              outputs: n.data.outputs,
            })),
            edges: edges.map((e) => ({
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            })),
          },
        })
      );
    } else {
      // Fallback via HTTP REST
      try {
        const res = await fetch('/api/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes: nodes.map((n) => ({
              id: n.id,
              title: n.data.title,
              code: n.data.code,
              inputs: n.data.inputs,
              outputs: n.data.outputs,
            })),
            edges: edges.map((e) => ({
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            })),
          }),
        });
        const data = await res.json();
        if (data.script) {
          set({ standaloneScript: data.script, isExportModalOpen: true });
        }
      } catch (e) {
        alert(`Failed to compile script: ${e}`);
      }
    }
  },

  setIsExportModalOpen: (open) => {
    set({ isExportModalOpen: open });
  },
}));
