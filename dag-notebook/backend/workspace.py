"""
WorkspaceManager provides dedicated workspace directories and isolated environments
for each FlowNotebook pipeline.
"""

import os
import sys
import site
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional

# Default base directory for workspaces
DEFAULT_BASE_DIR = os.environ.get(
    "FLOWNB_WORKSPACES_DIR",
    os.path.expanduser("~/.flownotebook/workspaces")
)

class WorkspaceManager:
    """
    Manages isolated filesystem directories and environment contexts for pipelines.
    """

    def __init__(self, base_dir: str = DEFAULT_BASE_DIR):
        self.base_dir = Path(base_dir).resolve()
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            # Fallback to local directory if home is restricted
            self.base_dir = Path("./.flownotebook_workspaces").resolve()
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
