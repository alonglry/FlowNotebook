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

export interface PipelineItem {
  id: string;
  name: string;
  category: 'quant' | 'ml' | 'etl' | 'custom';
  description: string;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
  nodes: CustomNode[];
  edges: Edge[];
}

const DEFAULT_PIPELINES: PipelineItem[] = [
  {
    id: 'pipe_quant_alpha',
    name: 'Quantitative Alpha Pipeline',
    category: 'quant',
    description: '4-stage systematic trading strategy with OHLCV data, regime filter, and dynamic ATR stops.',
    updatedAt: Date.now() - 3600000,
    nodeCount: 4,
    edgeCount: 3,
    nodes: INITIAL_NODES,
    edges: INITIAL_EDGES,
  },
  {
    id: 'pipe_ml_classifier',
    name: 'Customer Churn Random Forest',
    category: 'ml',
    description: 'Feature engineering, train/test split, and random forest classifier with cross-validation.',
    updatedAt: Date.now() - 86400000,
    nodeCount: 3,
    edgeCount: 2,
    nodes: [
      {
        id: 'ml_1',
        type: 'codeNode',
        position: { x: 50, y: 150 },
        data: {
          title: 'Data Generator',
          inputs: [],
          outputs: ['X', 'y'],
          code: `import pandas as pd
import numpy as np

# Generate synthetic tabular classification dataset
np.random.seed(42)
n_samples = 500
X = pd.DataFrame({
    'age': np.random.randint(18, 70, n_samples),
    'monthly_charges': np.random.uniform(20.0, 120.0, n_samples),
    'tenure_months': np.random.randint(1, 72, n_samples),
    'support_calls': np.random.poisson(2, n_samples)
})

# Churn logic with non-linear relationships
churn_prob = 1 / (1 + np.exp(-(0.03 * X['monthly_charges'] - 0.05 * X['tenure_months'] + 0.3 * X['support_calls'] - 2)))
y = (np.random.rand(n_samples) < churn_prob).astype(int)

print(f"Generated {n_samples} samples. Churn rate: {y.mean():.2%}")
print(X.head())
`,
          execution: { status: 'idle', stdout: '', stderr: '' }
        }
      },
      {
        id: 'ml_2',
        type: 'codeNode',
        position: { x: 550, y: 150 },
        data: {
          title: 'Train / Test Split & Scaler',
          inputs: ['X', 'y'],
          outputs: ['X_train', 'X_test', 'y_train', 'y_test'],
          code: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train_raw)
X_test = scaler.transform(X_test_raw)

print(f"Training set: {X_train.shape[0]} rows | Test set: {X_test.shape[0]} rows")
`,
          execution: { status: 'idle', stdout: '', stderr: '' }
        }
      },
      {
        id: 'ml_3',
        type: 'codeNode',
        position: { x: 1050, y: 150 },
        data: {
          title: 'Random Forest Model',
          inputs: ['X_train', 'X_test', 'y_train', 'y_test'],
          outputs: ['accuracy', 'feature_importance'],
          code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"Model Accuracy: {accuracy:.4f}\\n")
print("Classification Report:")
print(classification_report(y_test, y_pred))
`,
          execution: { status: 'idle', stdout: '', stderr: '' }
        }
      }
    ],
    edges: [
      { id: 'e_ml_1', source: 'ml_1', sourceHandle: 'right', target: 'ml_2', targetHandle: 'left', type: 'customEdge' },
      { id: 'e_ml_2', source: 'ml_2', sourceHandle: 'right', target: 'ml_3', targetHandle: 'left', type: 'customEdge' }
    ]
  },
  {
    id: 'pipe_etl_cleaner',
    name: 'Automated Data Quality & Imputation',
    category: 'etl',
    description: 'Data sanitation pipeline handling missing records, outlier detection, and schema validation.',
    updatedAt: Date.now() - 172800000,
    nodeCount: 2,
    edgeCount: 1,
    nodes: [
      {
        id: 'etl_1',
        type: 'codeNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Raw Sensor Data Ingest',
          inputs: [],
          outputs: ['raw_df'],
          code: `import pandas as pd
import numpy as np

# Create noisy sensor dataset with missing values
np.random.seed(101)
n = 1000
raw_df = pd.DataFrame({
    'timestamp': pd.date_range('2026-01-01', periods=n, freq='1min'),
    'temperature': np.random.normal(25.0, 3.5, n),
    'pressure': np.random.normal(101.3, 2.0, n),
    'vibration_index': np.random.exponential(1.5, n)
})

# Inject artificial nulls and outliers
raw_df.loc[np.random.choice(n, 35), 'temperature'] = np.nan
raw_df.loc[np.random.choice(n, 10), 'pressure'] = 250.0  # Spikes

print(f"Raw shape: {raw_df.shape}")
print(raw_df.isna().sum())
`,
          execution: { status: 'idle', stdout: '', stderr: '' }
        }
      },
      {
        id: 'etl_2',
        type: 'codeNode',
        position: { x: 600, y: 150 },
        data: {
          title: 'Outlier Filter & Forward-Fill',
          inputs: ['raw_df'],
          outputs: ['clean_df'],
          code: `clean_df = raw_df.copy()

# Forward fill missing temperature readings
clean_df['temperature'] = clean_df['temperature'].ffill().bfill()

# Clip pressure spikes to 3 standard deviations
p_mean = clean_df['pressure'].mean()
p_std = clean_df['pressure'].std()
clean_df['pressure'] = clean_df['pressure'].clip(lower=p_mean - 3*p_std, upper=p_mean + 3*p_std)

print("Data Cleaning Complete. Summary Statistics:")
print(clean_df.describe())
`,
          execution: { status: 'idle', stdout: '', stderr: '' }
        }
      }
    ],
    edges: [
      { id: 'e_etl_1', source: 'etl_1', sourceHandle: 'right', target: 'etl_2', targetHandle: 'left', type: 'customEdge' }
    ]
  }
];

interface GraphState {
  currentView: 'landing' | 'dashboard' | 'canvas' | 'admin';
  setCurrentView: (view: 'landing' | 'dashboard' | 'canvas' | 'admin') => void;
  pipelines: PipelineItem[];
  activePipelineId: string | null;
  createPipeline: (name: string, category?: 'quant' | 'ml' | 'etl' | 'custom') => string;
  openPipeline: (id: string) => void;
  deletePipeline: (id: string) => void;
  duplicatePipeline: (id: string) => void;

  nodes: CustomNode[];
  edges: Edge[];
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  isGraphRunning: boolean;
  ws: WebSocket | null;
  standaloneScript: string | null;
  isExportModalOpen: boolean;
  activeTabByNode: Record<string, 'console' | 'table' | 'variables'>;
  projectName: string;
  setProjectName: (name: string) => void;
  currentUser: { id: string; name: string; email: string; avatarUrl?: string } | null;
  setCurrentUser: (user: { id: string; name: string; email: string; avatarUrl?: string } | null) => void;
  isStorageModalOpen: boolean;
  storageModalMode: 'save' | 'open';
  openStorageModal: (mode: 'save' | 'open') => void;
  closeStorageModal: () => void;
  loadProjectData: (data: { name?: string; nodes: CustomNode[]; edges: Edge[] }) => void;

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
  currentView: 'canvas',
  setCurrentView: (view) => set({ currentView: view }),
  pipelines: DEFAULT_PIPELINES,
  activePipelineId: 'pipe_quant_alpha',

  createPipeline: (name, category = 'custom') => {
    const newId = `pipe_${Date.now()}`;
    const initialNode: CustomNode = {
      id: 'node_1',
      type: 'codeNode',
      position: { x: 100, y: 150 },
      data: {
        title: 'Main Script',
        inputs: [],
        outputs: ['result'],
        code: `import pandas as pd
import numpy as np

# Write your Python pipeline logic here
data = {'message': 'Hello from FlowNotebook!'}
print("Pipeline initiated successfully.")
`,
        execution: { status: 'idle', stdout: '', stderr: '' }
      }
    };

    const newPipeline: PipelineItem = {
      id: newId,
      name: name || 'Untitled Pipeline',
      category,
      description: 'Custom user defined pipeline',
      updatedAt: Date.now(),
      nodeCount: 1,
      edgeCount: 0,
      nodes: [initialNode],
      edges: []
    };

    set({
      pipelines: [newPipeline, ...get().pipelines],
      activePipelineId: newId,
      projectName: newPipeline.name,
      nodes: [initialNode],
      edges: [],
      currentView: 'canvas'
    });

    return newId;
  },

  openPipeline: (id) => {
    const found = get().pipelines.find((p) => p.id === id);
    if (found) {
      set({
        activePipelineId: id,
        projectName: found.name,
        nodes: found.nodes,
        edges: found.edges,
        currentView: 'canvas'
      });
    }
  },

  deletePipeline: (id) => {
    const updated = get().pipelines.filter((p) => p.id !== id);
    set({ pipelines: updated });
  },

  duplicatePipeline: (id) => {
    const target = get().pipelines.find((p) => p.id === id);
    if (!target) return;
    const newId = `pipe_${Date.now()}`;
    const duplicate: PipelineItem = {
      ...target,
      id: newId,
      name: `${target.name} (Copy)`,
      updatedAt: Date.now()
    };
    set({ pipelines: [duplicate, ...get().pipelines] });
  },

  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  wsStatus: 'disconnected',
  isGraphRunning: false,
  ws: null,
  standaloneScript: null,
  isExportModalOpen: false,
  activeTabByNode: {},
  maximizedNodeId: null,
  projectName: 'Quantitative Alpha Pipeline',
  currentUser: null,
  isStorageModalOpen: false,
  storageModalMode: 'save',

  setProjectName: (name) => {
    set({ projectName: name });
  },

  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  openStorageModal: (mode) => {
    set({ isStorageModalOpen: true, storageModalMode: mode });
  },

  closeStorageModal: () => {
    set({ isStorageModalOpen: false });
  },

  loadProjectData: (data) => {
    set({
      projectName: data.name || get().projectName,
      nodes: data.nodes || [],
      edges: data.edges || [],
      activeTabByNode: {},
    });
  },

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
    // Connect to backend port 8000 ONLY when running on local development (localhost / 127.0.0.1 on non-8000 port)
    const isLocalDev =
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      window.location.port !== '8000';

    const host = isLocalDev ? `${window.location.hostname}:8000` : window.location.host;
    const wsUrl = (import.meta as any).env?.VITE_BACKEND_WS_URL || `${protocol}//${host}/ws/execute`;

    console.log('[FlowNotebook] Initializing WebSocket connection to:', wsUrl);
    set({ wsStatus: 'connecting' });

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[FlowNotebook] WebSocket initialization error:', err);
      set({ wsStatus: 'disconnected', ws: null });
      return;
    }

    ws.onopen = () => {
      console.log('[FlowNotebook] WebSocket connected successfully.');
      set({ wsStatus: 'connected', ws });
    };

    ws.onclose = (event) => {
      console.warn('[FlowNotebook] WebSocket closed:', event.code, event.reason);
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
      console.error('[FlowNotebook] WebSocket error:', err);
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
    const { ws, wsStatus, nodes, edges, currentUser } = get();
    if (!ws || wsStatus !== 'connected') {
      alert('WebSocket backend is not connected. Please ensure backend server is running.');
      return;
    }

    const payload = {
      action: 'run_graph',
      user: currentUser,
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
    const { ws, wsStatus, nodes, edges, currentUser } = get();
    if (!ws || wsStatus !== 'connected') {
      alert('WebSocket backend is not connected.');
      return;
    }

    const payload = {
      action: 'run_node',
      nodeId,
      user: currentUser,
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
