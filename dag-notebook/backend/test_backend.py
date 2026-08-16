"""
Automated unit tests for DAG backend: sandbox isolation, immutability, DAG sorting,
and standalone compilation.
"""

import pytest
import asyncio
import pandas as pd
import numpy as np
from sandbox import execute_node_isolated
from graph_engine import GraphExecutionEngine
from compiler import compile_dag_to_script


def test_sandbox_execution_and_stdout():
    code = """
import numpy as np
x = 10
y = 20
total = x + y
print(f"Computed total: {total}")
"""
    result = execute_node_isolated("test_node", code, {}, ["total"])
    assert result["status"] == "success"
    assert "Computed total: 30" in result["stdout"]
    assert result["outputs"]["total"] == 30
    assert result["executionTimeMs"] >= 0


def test_sandbox_immutability_defensive_copy():
    # Node 1 produces a DataFrame
    original_df = pd.DataFrame({"price": [100.0, 102.0, 105.0], "vol": [10, 20, 30]})
    
    # Node 2 modifies the input DataFrame in place
    code_node_2 = """
df['price'] = df['price'] * 2
df['new_col'] = 999
print("Mutated in node 2")
"""
    input_vars = {"df": original_df}
    result = execute_node_isolated("node_2", code_node_2, input_vars, ["df"])
    
    assert result["status"] == "success"
    # Verify original DataFrame was NOT mutated
    assert original_df["price"].tolist() == [100.0, 102.0, 105.0]
    assert "new_col" not in original_df.columns
    # Verify node 2 output has the mutated values
    assert result["outputs"]["df"]["price"].tolist() == [200.0, 204.0, 210.0]


def test_dag_cycle_detection():
    engine = GraphExecutionEngine()
    nodes = [
        {"id": "A", "title": "Node A", "code": "x = 1", "inputs": [], "outputs": ["x"]},
        {"id": "B", "title": "Node B", "code": "y = x + 1", "inputs": ["x"], "outputs": ["y"]}
    ]
    edges = [
        {"source": "A", "target": "B"},
        {"source": "B", "target": "A"}  # Cycle!
    ]
    g = engine.build_networkx_graph(nodes, edges)
    is_valid, err = engine.validate_dag(g)
    assert not is_valid
    assert "circular" in err.lower() or "cycle" in err.lower()


@pytest.mark.asyncio
async def test_full_pipeline_execution():
    engine = GraphExecutionEngine()
    nodes = [
        {
            "id": "node_1",
            "title": "Data Ingestion",
            "code": "import pandas as pd\ndf = pd.DataFrame({'close': [10.0, 12.0, 11.0, 15.0]})\nprint('Loaded df')",
            "inputs": [],
            "outputs": ["df"]
        },
        {
            "id": "node_2",
            "title": "Regime Filter",
            "code": "df_regime = df.copy()\ndf_regime['regime'] = 1\nprint('Filtered regime')",
            "inputs": ["df"],
            "outputs": ["df_regime"]
        },
        {
            "id": "node_3",
            "title": "Risk Management",
            "code": "final_signals = df_regime.copy()\nfinal_signals['signal'] = 'BUY'\nprint('Calculated risk')",
            "inputs": ["df_regime"],
            "outputs": ["final_signals"]
        },
        {
            "id": "node_4",
            "title": "Summary",
            "code": "print(f'Final signal rows: {len(final_signals)}')",
            "inputs": ["final_signals"],
            "outputs": []
        }
    ]
    edges = [
        {"source": "node_1", "target": "node_2", "sourceHandle": "df", "targetHandle": "df"},
        {"source": "node_2", "target": "node_3", "sourceHandle": "df_regime", "targetHandle": "df_regime"},
        {"source": "node_3", "target": "node_4", "sourceHandle": "final_signals", "targetHandle": "final_signals"}
    ]

    events = []
    async for ev in engine.execute_graph_stream(nodes, edges):
        events.append(ev)

    types = [e["type"] for e in events]
    assert "execution_start" in types
    assert "execution_complete" in types
    
    # Check node 4 output was captured
    node_results = {e["nodeId"]: e for e in events if e.get("type") == "node_result"}
    assert "node_4" in node_results
    assert node_results["node_4"]["status"] == "success"
    assert "Final signal rows: 4" in node_results["node_4"]["stdout"]


def test_standalone_compiler():
    nodes = [
        {
            "id": "node_1",
            "title": "Data Ingestion",
            "code": "df = pd.DataFrame({'close': [100, 105, 110]})\nprint('Ingested')",
            "inputs": [],
            "outputs": ["df"]
        },
        {
            "id": "node_2",
            "title": "Processor",
            "code": "processed = df['close'].mean()\nprint(f'Mean: {processed}')",
            "inputs": ["df"],
            "outputs": ["processed"]
        }
    ]
    edges = [
        {"source": "node_1", "target": "node_2", "sourceHandle": "df", "targetHandle": "df"}
    ]
    script = compile_dag_to_script(nodes, edges)
    assert "def node_node_1" in script
    assert "def node_node_2" in script
    assert "def run_pipeline" in script

    # Execute generated standalone script
    exec_scope = {}
    exec(script, exec_scope)
    assert "run_pipeline" in exec_scope
    ctx = exec_scope["run_pipeline"]()
    assert ctx["processed"] == 105.0


def test_sandbox_timeout_interruption():
    # Long loop or sleep with short timeout
    code = """
import time
time.sleep(2)
print("Should have timed out")
"""
    result = execute_node_isolated("timeout_node", code, {}, [], timeout_seconds=0.3)
    assert result["status"] == "error"
    assert "NodeExecutionTimeoutError" in result["error"]
    assert "0.3s" in result["error"]


def test_resource_protection_infinite_stdout():
    # Attempt to output millions of characters
    code = """
for i in range(50000):
    print("1234567890" * 5)
"""
    result = execute_node_isolated("spam_node", code, {}, [])
    assert result["status"] == "success"
    # Ensure stdout was truncated to MAX_OUTPUT_LENGTH limit (100_000 chars)
    assert len(result["stdout"]) <= 101000
    assert "[Output truncated" in result["stdout"]


def test_preprocess_bang_command():
    from sandbox import preprocess_code
    raw_code = "!echo 'hello from shell'"
    processed = preprocess_code(raw_code)
    assert "subprocess.run('echo \\'hello from shell\\''" in processed or "subprocess.run" in processed
    result = execute_node_isolated("bang_node", "!echo 'shell test'", {}, [])
    assert result["status"] == "success"
