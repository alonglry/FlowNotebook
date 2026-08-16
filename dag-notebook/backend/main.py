"""
FastAPI Application and WebSocket Handler for FlowNotebook execution engine.
"""

import json
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from graph_engine import GraphExecutionEngine
from compiler import compile_dag_to_script
from admin_db import (
    init_db,
    record_user_activity,
    record_pipeline,
    get_admin_overview,
    get_all_users,
    get_user_creations,
    get_recent_activity,
    ADMIN_EMAILS,
)

app = FastAPI(title="FlowNotebook Backend", version="1.0.0")

# Initialize SQLite database on startup
@app.on_event("startup")
def on_startup():
    init_db()

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


class UserTelemetryRequest(BaseModel):
    user: Dict[str, Any]
    action: Optional[str] = "heartbeat"
    details: Optional[str] = None


class PipelineTelemetryRequest(BaseModel):
    pipeline: Dict[str, Any]
    user: Dict[str, Any]


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "dag-execution-backend"}


@app.post("/api/telemetry/user")
def track_user(req: UserTelemetryRequest):
    user_id = record_user_activity(req.user, action=req.action, details=req.details)
    return {"success": True, "userId": user_id}


@app.post("/api/telemetry/pipeline")
def track_pipeline(req: PipelineTelemetryRequest):
    pipe_id = record_pipeline(req.pipeline, req.user)
    return {"success": True, "pipelineId": pipe_id}


@app.get("/api/admin/overview")
def admin_overview(admin_email: Optional[str] = None):
    # Authorization verification
    if admin_email and admin_email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required.")
    return get_admin_overview()


@app.get("/api/admin/users")
def admin_users(admin_email: Optional[str] = None):
    if admin_email and admin_email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required.")
    return get_all_users()


@app.get("/api/admin/user/{user_id}/creations")
def admin_user_creations(user_id: str, admin_email: Optional[str] = None):
    if admin_email and admin_email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required.")
    return get_user_creations(user_id)


@app.get("/api/admin/activity")
def admin_activity(limit: int = 40, admin_email: Optional[str] = None):
    if admin_email and admin_email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required.")
    return get_recent_activity(limit=limit)


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



from workspace import workspace_manager
import os
from pathlib import Path


@app.get("/api/workspace/info")
def get_workspace_info():
    """Returns the host machine workspace and notebook directories."""
    cwd = os.getcwd()
    # If running inside a subfolder (e.g. dag-notebook/backend), resolve repo root / notebooks
    possible_notebook_dirs = [
        os.environ.get("FLOWNB_NOTEBOOKS_DIR"),
        str(Path(cwd).resolve()),
        os.path.expanduser("~/Desktop/stock/notebooks"),
        str(Path.home() / "Desktop" / "stock" / "notebooks"),
    ]
    notebook_dir = next((d for d in possible_notebook_dirs if d and os.path.exists(d)), str(Path(cwd).resolve()))
    return {
        "cwd": cwd,
        "notebooksDir": notebook_dir,
        "homeDir": str(Path.home())
    }


@app.post("/api/local/save")
def save_local_file(req: Dict[str, Any]):
    """Directly saves pipeline .flownb file to local filesystem."""
    file_path = req.get("path")
    project_data = req.get("data")
    if not file_path or not project_data:
        raise HTTPException(status_code=400, detail="Missing 'path' or 'data'.")
    
    resolved_path = Path(os.path.expanduser(file_path)).resolve()
    resolved_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(resolved_path, "w", encoding="utf-8") as f:
        json.dump(project_data, f, indent=2)
        
    return {"success": True, "filePath": str(resolved_path), "message": f"Saved to {resolved_path}"}


@app.post("/api/local/load")
def load_local_file(req: Dict[str, Any]):
    """Directly loads pipeline .flownb file from local filesystem."""
    file_path = req.get("path")
    if not file_path:
        raise HTTPException(status_code=400, detail="Missing 'path'.")
        
    resolved_path = Path(os.path.expanduser(file_path)).resolve()
    if not resolved_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {resolved_path}")
        
    with open(resolved_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    return {"success": True, "filePath": str(resolved_path), "data": data}


@app.get("/api/pipelines")
def list_disk_pipelines():
    """Scans and returns all pipelines persisted on disk."""
    pipelines = workspace_manager.list_pipelines()
    return {"pipelines": pipelines, "count": len(pipelines)}


@app.get("/api/pipelines/{pipeline_id}")
def get_disk_pipeline(pipeline_id: str):
    """Loads a specific pipeline from disk."""
    data = workspace_manager.load_pipeline(pipeline_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found on disk.")
    return {"success": True, "pipeline": data}


@app.post("/api/pipelines/save")
def save_disk_pipeline(req: Dict[str, Any]):
    """Saves/updates a pipeline graph structure, code, and metadata on disk."""
    pipeline_id = req.get("id")
    if not pipeline_id:
        raise HTTPException(status_code=400, detail="Missing 'id' in pipeline data.")
    res = workspace_manager.save_pipeline(pipeline_id, req)
    return res


@app.delete("/api/pipelines/{pipeline_id}")
def delete_disk_pipeline(pipeline_id: str):
    """Deletes a pipeline folder and its pipeline.flownpy from disk."""
    success = workspace_manager.delete_pipeline(pipeline_id)
    return {"success": success, "pipelineId": pipeline_id}


@app.post("/api/pipelines/{pipeline_id}/duplicate")
def duplicate_disk_pipeline(pipeline_id: str, req: Dict[str, Any]):
    """Duplicates a pipeline on disk."""
    new_id = req.get("newId")
    new_name = req.get("newName", "Duplicated Pipeline")
    if not new_id:
        raise HTTPException(status_code=400, detail="Missing 'newId'.")
    data = workspace_manager.duplicate_pipeline(pipeline_id, new_id, new_name)
    if not data:
        raise HTTPException(status_code=404, detail=f"Source pipeline '{pipeline_id}' not found.")
    return {"success": True, "pipeline": data}


@app.get("/api/workspaces/{pipeline_id}/files")
def list_workspace_files(pipeline_id: str):
    """Returns files in the isolated workspace of the given pipeline."""
    return {"pipelineId": pipeline_id, "files": workspace_manager.list_files(pipeline_id)}


@app.post("/api/workspaces/{pipeline_id}/reset")
def reset_workspace(pipeline_id: str):
    """Resets/cleans the isolated workspace and packages of the given pipeline."""
    success = workspace_manager.clean_workspace(pipeline_id)
    return {"pipelineId": pipeline_id, "success": success}



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
            user_info = data.get("user")
            pipeline_id = data.get("pipelineId") or data.get("pipeline_id") or "default_pipeline"

            if action == "run_graph":
                if user_info:
                    try:
                        record_user_activity(user_info, action="execute_dag", details=f"Ran DAG '{pipeline_id}' with {len(nodes)} nodes")
                    except Exception:
                        pass
                async for event in engine.execute_graph_stream(nodes, edges, pipeline_id=pipeline_id):
                    await websocket.send_json(event)

            elif action == "run_node":
                target_node_id = data.get("nodeId")
                if not target_node_id:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Missing nodeId for run_node action."
                    })
                    continue
                if user_info:
                    try:
                        record_user_activity(user_info, action="execute_node", details=f"Ran node {target_node_id} in '{pipeline_id}'")
                    except Exception:
                        pass
                async for event in engine.execute_graph_stream(nodes, edges, target_node_id=target_node_id, pipeline_id=pipeline_id):
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


# Mount frontend static files if built
import os
from fastapi.staticfiles import StaticFiles

static_dirs = [
    os.path.join(os.path.dirname(__file__), "dist"),
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"),
    "/app/dist"
]

for s_dir in static_dirs:
    if os.path.exists(s_dir):
        app.mount("/", StaticFiles(directory=s_dir, html=True), name="static")
        break


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

