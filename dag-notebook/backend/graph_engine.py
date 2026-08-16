"""
Graph execution engine utilizing NetworkX for DAG validation, topological sorting,
and streaming telemetry execution with defensive data passing.
"""

import asyncio
import copy
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple
import networkx as nx
from sandbox import execute_node_isolated

class GraphExecutionEngine:
    def __init__(self):
        # Cache for intermediate results across runs if needed
        self.node_outputs_cache: Dict[str, Dict[str, Any]] = {}

    def build_networkx_graph(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> nx.DiGraph:
        g = nx.DiGraph()
        for node in nodes:
            g.add_node(node["id"], data=node)

        for edge in edges:
            src = edge["source"]
            tgt = edge["target"]
            src_handle = edge.get("sourceHandle")
            tgt_handle = edge.get("targetHandle")
            g.add_edge(src, tgt, sourceHandle=src_handle, targetHandle=tgt_handle)

        return g

    def validate_dag(self, g: nx.DiGraph) -> Tuple[bool, Optional[str]]:
        if not nx.is_directed_acyclic_graph(g):
            try:
                cycles = list(nx.simple_cycles(g))
                return False, f"Graph contains circular dependencies: {cycles}"
            except Exception:
                return False, "Graph contains circular dependencies (cycles are not allowed in DAGs)."
        return True, None

    def get_topological_order(self, g: nx.DiGraph) -> List[str]:
        return list(nx.topological_sort(g))

    def get_ancestors_subgraph(self, g: nx.DiGraph, target_node_id: str) -> List[str]:
        """Gets all ancestors needed to run a specific node in topological order."""
        ancestors = nx.ancestors(g, target_node_id)
        sub_nodes = ancestors.union({target_node_id})
        subgraph = g.subgraph(sub_nodes)
        return list(nx.topological_sort(subgraph))

    async def execute_graph_stream(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        target_node_id: Optional[str] = None,
        pipeline_id: str = "default_pipeline"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes the graph (or a target node with its dependencies) in topologically sorted order
        within the pipeline's isolated workspace.
        Yields real-time telemetry events for WebSocket streaming.
        """
        g = self.build_networkx_graph(nodes, edges)
        is_valid, error_msg = self.validate_dag(g)

        if not is_valid:
            yield {
                "type": "error",
                "message": error_msg or "Cycle detected in DAG."
            }
            return

        node_map = {n["id"]: n for n in nodes}

        if target_node_id:
            if target_node_id not in node_map:
                yield {
                    "type": "error",
                    "message": f"Target node {target_node_id} does not exist in graph."
                }
                return
            exec_order = self.get_ancestors_subgraph(g, target_node_id)
        else:
            exec_order = self.get_topological_order(g)

        yield {
            "type": "execution_start",
            "executionOrder": exec_order,
            "totalNodes": len(exec_order)
        }

        # Store runtime outputs for this execution pass
        # Key: (node_id, handle_or_var_name) -> value
        # Also: var_name -> value (for auto-resolution)
        data_bus: Dict[str, Any] = {}
        for nid, outs in self.node_outputs_cache.items():
            for var_name, val in outs.items():
                data_bus[f"{nid}:{var_name}"] = val
                data_bus[var_name] = val

        # Set pending nodes to queued
        for node_id in exec_order:
            yield {
                "type": "node_status",
                "nodeId": node_id,
                "status": "queued"
            }

        # Execute node by node in topological sequence
        for node_id in exec_order:
            node_data = node_map[node_id]
            code = node_data.get("code", "")
            inputs = node_data.get("inputs", [])
            outputs = node_data.get("outputs", [])

            yield {
                "type": "node_status",
                "nodeId": node_id,
                "status": "running"
            }

            # Resolve input variables from incoming edges
            input_vars: Dict[str, Any] = {}

            # Check edges targeting this node
            incoming_edges = [e for e in edges if e["target"] == node_id]
            for edge in incoming_edges:
                src_node = edge["source"]
                src_handle = edge.get("sourceHandle")
                tgt_handle = edge.get("targetHandle")

                # Try resolving by specific sourceHandle
                val = None
                if src_handle and f"{src_node}:{src_handle}" in data_bus:
                    val = data_bus[f"{src_node}:{src_handle}"]
                elif src_handle and src_handle in data_bus:
                    val = data_bus[src_handle]
                elif tgt_handle and tgt_handle in data_bus:
                    val = data_bus[tgt_handle]
                else:
                    # Generic side handle fallback: fetch the first output of src_node
                    src_outs = self.node_outputs_cache.get(src_node, {})
                    if src_outs:
                        # Grab first available output from source node
                        first_key = list(src_outs.keys())[0]
                        val = src_outs[first_key]

                # Determine which input variable name on target receives this value
                target_var_name = tgt_handle
                if not target_var_name or target_var_name in ["top", "bottom", "left", "right"]:
                    # Map to the first unfilled input of this node
                    unfilled = [inp for inp in inputs if inp not in input_vars]
                    if unfilled:
                        target_var_name = unfilled[0]
                    elif inputs:
                        target_var_name = inputs[0]
                    elif src_handle and src_handle not in ["top", "bottom", "left", "right"]:
                        target_var_name = src_handle

                if target_var_name and val is not None:
                    input_vars[target_var_name] = val
                elif src_handle and src_handle not in ["top", "bottom", "left", "right"]:
                    input_vars[src_handle] = val

            # Also check if any declared input was not satisfied by edge, try data_bus
            for inp in inputs:
                if inp not in input_vars and inp in data_bus:
                    input_vars[inp] = data_bus[inp]

            # Execute the node in sandbox
            # Allow event loop yield so websockets can transmit
            await asyncio.sleep(0.01)

            result = execute_node_isolated(
                node_id=node_id,
                code=code,
                input_vars=input_vars,
                expected_outputs=outputs,
                pipeline_id=pipeline_id
            )

            if result["status"] == "success":
                # Save extracted outputs to bus with zero mutation guarantees
                if node_id not in self.node_outputs_cache:
                    self.node_outputs_cache[node_id] = {}

                for out_var, out_val in result["outputs"].items():
                    data_bus[f"{node_id}:{out_var}"] = out_val
                    data_bus[out_var] = out_val
                    self.node_outputs_cache[node_id][out_var] = out_val

                yield {
                    "type": "node_result",
                    "nodeId": node_id,
                    "status": "success",
                    "stdout": result["stdout"],
                    "stderr": result["stderr"],
                    "executionTimeMs": result["executionTimeMs"],
                    "outputsSummary": result["outputsSummary"]
                }
            else:
                yield {
                    "type": "node_result",
                    "nodeId": node_id,
                    "status": "error",
                    "stdout": result["stdout"],
                    "stderr": result["stderr"],
                    "executionTimeMs": result["executionTimeMs"],
                    "outputsSummary": {},
                    "error": result["error"]
                }
                # Stop downstream execution on error
                yield {
                    "type": "execution_failed",
                    "failedNodeId": node_id,
                    "error": result["error"]
                }
                return

        yield {
            "type": "execution_complete",
            "message": "All nodes executed successfully."
        }
