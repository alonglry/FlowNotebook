"""
FastAPI Application and WebSocket Handler for DAG Notebook execution canvas.
"""

import json
from typing import Any, Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from graph_engine import GraphExecutionEngine
from compiler import compile_dag_to_script

app = FastAPI(title="DAG Notebook Backend", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared graph execution engine instance
engine = GraphExecutionEngine()


class CompileRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "dag-execution-backend"}


@app.post("/api/compile")
def compile_script_endpoint(req: CompileRequest):
    try:
        script = compile_dag_to_script(req.nodes, req.edges)
        return {"success": True, "script": script}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/export-py")
def export_py_file(req: CompileRequest):
    try:
        script = compile_dag_to_script(req.nodes, req.edges)
        return PlainTextResponse(
            content=script,
            media_type="text/x-python",
            headers={"Content-Disposition": "attachment; filename=pipeline.py"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.websocket("/ws/execute")
async def websocket_execute_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)

            action = data.get("action", "run_graph")
            graph_data = data.get("graph", {})
            nodes = graph_data.get("nodes", [])
            edges = graph_data.get("edges", [])

            if action == "run_graph":
                async for event in engine.execute_graph_stream(nodes, edges):
                    await websocket.send_json(event)

            elif action == "run_node":
                target_node_id = data.get("nodeId")
                if not target_node_id:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Missing nodeId for run_node action."
                    })
                    continue
                async for event in engine.execute_graph_stream(nodes, edges, target_node_id=target_node_id):
                    await websocket.send_json(event)

            elif action == "compile":
                try:
                    script = compile_dag_to_script(nodes, edges)
                    await websocket.send_json({
                        "type": "compile_result",
                        "script": script
                    })
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Compilation failed: {str(e)}"
                    })

            elif action == "reset_cache":
                engine.node_outputs_cache.clear()
                await websocket.send_json({
                    "type": "reset_complete",
                    "message": "Engine cache cleared."
                })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown action '{action}'."
                })

    except WebSocketDisconnect:
        # Client disconnected cleanly
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
