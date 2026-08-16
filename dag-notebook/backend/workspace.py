"""
WorkspaceManager provides dedicated workspace directories and isolated environments
for each FlowNotebook pipeline.
"""

import os
import sys
import site
import shutil
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

# Fixed default base directory for workspaces in dag-notebook/backend/.flownotebook_workspaces
BACKEND_DIR = Path(__file__).parent.resolve()
DEFAULT_BASE_DIR = os.environ.get(
    "FLOWNB_WORKSPACES_DIR",
    str(BACKEND_DIR / ".flownotebook_workspaces")
)

class WorkspaceManager:
    """
    Manages isolated filesystem directories, environment contexts, and disk-persisted pipelines.
    """

    def __init__(self, base_dir: str = DEFAULT_BASE_DIR):
        self.base_dir = Path(base_dir).resolve()
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            self.base_dir = (BACKEND_DIR / ".flownotebook_workspaces").resolve()
            self.base_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_pipeline_id(self, pipeline_id: str) -> str:
        """Sanitizes pipeline ID to safe filesystem directory name."""
        if not pipeline_id or not isinstance(pipeline_id, str):
            return "default_pipeline"
        # Keep alphanumeric, dashes, underscores
        clean = "".join(c if (c.isalnum() or c in ("-", "_")) else "_" for c in pipeline_id)
        return clean.strip("_") or "default_pipeline"

    def get_pipeline_dir(self, pipeline_id: str) -> Path:
        clean_id = self._sanitize_pipeline_id(pipeline_id)
        return self.base_dir / clean_id

    def get_pipeline_file_path(self, pipeline_id: str) -> Path:
        return self.get_pipeline_dir(pipeline_id) / "pipeline.flownpy"

    def save_pipeline(self, pipeline_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves full graph structure, code, and metadata as pipeline.flownpy on disk."""
        ws = self.get_or_create_workspace(pipeline_id)
        pipe_file = self.get_pipeline_file_path(pipeline_id)
        
        # Ensure field consistency
        import time
        data["id"] = pipeline_id
        data["name"] = data.get("name", "Untitled Pipeline")
        data["category"] = data.get("category", "custom")
        data["source"] = data.get("source", "custom")
        data["description"] = data.get("description", "")
        data["nodes"] = data.get("nodes", [])
        data["edges"] = data.get("edges", [])
        data["nodeCount"] = len(data["nodes"])
        data["edgeCount"] = len(data["edges"])
        if "updatedAt" not in data or not data["updatedAt"]:
            data["updatedAt"] = int(time.time() * 1000)
            
        with open(pipe_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
        return {
            "success": True,
            "pipelineId": pipeline_id,
            "filePath": str(pipe_file),
            "data": data
        }

    def load_pipeline(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Loads pipeline.flownpy from disk."""
        pipe_file = self.get_pipeline_file_path(pipeline_id)
        if not pipe_file.exists():
            return None
        try:
            with open(pipe_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                data["id"] = pipeline_id
                data["name"] = data.get("name", "Untitled Pipeline")
                data["source"] = data.get("source", "custom")
                data["category"] = data.get("category", "custom")
                data["description"] = data.get("description", "")
                data["nodes"] = data.get("nodes", [])
                data["edges"] = data.get("edges", [])
                data["nodeCount"] = data.get("nodeCount", len(data["nodes"]))
                data["edgeCount"] = data.get("edgeCount", len(data["edges"]))
                return data
        except Exception as err:
            print(f"[WorkspaceManager] Error reading {pipe_file}: {err}")
            return None

    def list_pipelines(self) -> List[Dict[str, Any]]:
        """Scans .flownotebook_workspaces/ for all pipeline.flownpy files."""
        pipelines = []
        if not self.base_dir.exists():
            return pipelines

        import time
        for item in self.base_dir.iterdir():
            if item.is_dir():
                pipe_file = item / "pipeline.flownpy"
                if pipe_file.is_file():
                    try:
                        with open(pipe_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            if "id" not in data:
                                data["id"] = item.name
                            data["name"] = data.get("name", "Untitled Pipeline")
                            data["source"] = data.get("source", "custom")
                            data["category"] = data.get("category", "custom")
                            data["description"] = data.get("description", "")
                            data["nodes"] = data.get("nodes", [])
                            data["edges"] = data.get("edges", [])
                            data["nodeCount"] = data.get("nodeCount", len(data["nodes"]))
                            data["edgeCount"] = data.get("edgeCount", len(data["edges"]))
                            data["updatedAt"] = data.get("updatedAt", int(time.time() * 1000))
                            pipelines.append(data)
                    except Exception as err:
                        print(f"[WorkspaceManager] Error loading {pipe_file}: {err}")

        # Sort by updatedAt descending
        pipelines.sort(key=lambda p: p.get("updatedAt", 0), reverse=True)
        return pipelines

    def delete_pipeline(self, pipeline_id: str) -> bool:
        """Deletes pipeline directory and its pipeline.flownpy file."""
        pipe_dir = self.get_pipeline_dir(pipeline_id)
        if pipe_dir.exists():
            try:
                shutil.rmtree(pipe_dir)
                return True
            except Exception as err:
                print(f"[WorkspaceManager] Failed to delete {pipe_dir}: {err}")
                return False
        return False

    def duplicate_pipeline(self, source_id: str, new_id: str, new_name: str) -> Optional[Dict[str, Any]]:
        """Duplicates an existing pipeline on disk."""
        source_data = self.load_pipeline(source_id)
        if not source_data:
            return None

        import time
        dup_data = dict(source_data)
        dup_data["id"] = new_id
        dup_data["name"] = new_name
        dup_data["updatedAt"] = int(time.time() * 1000)

        res = self.save_pipeline(new_id, dup_data)
        return res.get("data")

    def get_or_create_workspace(self, pipeline_id: str) -> Dict[str, str]:
        """
        Creates and returns paths for the pipeline's workspace, package site, and cache.
        """
        pipe_dir = self.get_pipeline_dir(pipeline_id)
        workspace_dir = pipe_dir / "workspace"
        packages_dir = pipe_dir / "packages"
        cache_dir = pipe_dir / "cache"

        workspace_dir.mkdir(parents=True, exist_ok=True)
        packages_dir.mkdir(parents=True, exist_ok=True)
        cache_dir.mkdir(parents=True, exist_ok=True)

        # Python user-site directory structure inside packages_dir
        py_ver = f"python{sys.version_info.major}.{sys.version_info.minor}"
        site_packages_dir = packages_dir / "lib" / py_ver / "site-packages"
        site_packages_dir.mkdir(parents=True, exist_ok=True)

        return {
            "root": str(pipe_dir),
            "workspace": str(workspace_dir),
            "packages": str(packages_dir),
            "site_packages": str(site_packages_dir),
            "cache": str(cache_dir),
        }

    def get_execution_env(self, pipeline_id: str) -> Dict[str, str]:
        """
        Constructs isolated environment variables for executing pipeline code and shell commands.
        """
        ws = self.get_or_create_workspace(pipeline_id)
        env = os.environ.copy()

        # Set user base so `pip install --user` installs into this pipeline's package dir
        env["PYTHONUSERBASE"] = ws["packages"]
        env["FLOWNB_WORKSPACE"] = ws["workspace"]
        env["FLOWNB_PIPELINE_ID"] = pipeline_id

        # Prepend pipeline site-packages & workspace to PYTHONPATH
        existing_pythonpath = env.get("PYTHONPATH", "")
        paths_to_add = [ws["workspace"], ws["site_packages"]]
        if existing_pythonpath:
            paths_to_add.append(existing_pythonpath)
        env["PYTHONPATH"] = os.pathsep.join(paths_to_add)

        # Add user bin (for cli tools installed via pip)
        bin_dir = os.path.join(ws["packages"], "bin")
        os.makedirs(bin_dir, exist_ok=True)
        env["PATH"] = f"{bin_dir}{os.pathsep}{env.get('PATH', '')}"

        return env

    def activate_pipeline_site(self, pipeline_id: str) -> str:
        """
        Dynamically adds the pipeline's site-packages and workspace directory to sys.path in the current Python process.
        """
        ws = self.get_or_create_workspace(pipeline_id)
        site_pkg = ws["site_packages"]
        ws_dir = ws["workspace"]

        if site_pkg not in sys.path:
            site.addsitedir(site_pkg)
        if ws_dir not in sys.path:
            sys.path.insert(0, ws_dir)

        return ws["workspace"]

    def list_files(self, pipeline_id: str) -> List[Dict[str, Any]]:
        """Lists files inside the pipeline's isolated workspace directory."""
        ws = self.get_or_create_workspace(pipeline_id)
        workspace_dir = Path(ws["workspace"])
        file_list = []

        try:
            for item in workspace_dir.glob("**/*"):
                if not item.is_file():
                    continue
                rel_path = item.relative_to(workspace_dir)
                # Ignore internal dot folders
                if any(part.startswith(".") for part in rel_path.parts):
                    continue
                file_list.append({
                    "name": item.name,
                    "path": str(rel_path),
                    "size": item.stat().st_size,
                    "modified": item.stat().st_mtime
                })
        except Exception as err:
            print(f"[WorkspaceManager] Error listing files: {err}")

        return file_list

    def clean_workspace(self, pipeline_id: str) -> bool:
        """Cleans/resets the pipeline workspace."""
        pipe_dir = self.get_pipeline_dir(pipeline_id)
        if pipe_dir.exists():
            try:
                shutil.rmtree(pipe_dir)
                return True
            except Exception as err:
                print(f"[WorkspaceManager] Failed to delete {pipe_dir}: {err}")
                return False
        return False

# Global workspace manager singleton
workspace_manager = WorkspaceManager()
