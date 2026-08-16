import os
import pytest
from pathlib import Path
from workspace import WorkspaceManager
from sandbox import execute_node_isolated, preprocess_code

def test_workspace_creation_and_paths(tmp_path):
    mgr = WorkspaceManager(base_dir=str(tmp_path))
    ws_a = mgr.get_or_create_workspace("pipeline_alpha")
    ws_b = mgr.get_or_create_workspace("pipeline_beta")

    assert os.path.exists(ws_a["workspace"])
    assert os.path.exists(ws_a["packages"])
    assert os.path.exists(ws_b["workspace"])
    assert ws_a["workspace"] != ws_b["workspace"]

def test_isolated_filesystem_execution(tmp_path):
    # Set manager base dir to tmp_path
    from workspace import workspace_manager
    workspace_manager.base_dir = tmp_path

    # Pipeline A creates a local file
    code_a = """
with open("test_alpha.txt", "w") as f:
    f.write("Alpha output")
res = "alpha_done"
"""
    result_a = execute_node_isolated(
        node_id="node_a",
        code=code_a,
        input_vars={},
        expected_outputs=["res"],
        pipeline_id="pipe_alpha"
    )
    assert result_a["status"] == "success"

    # Pipeline B checks its directory
    code_b = """
import os
files = os.listdir(".")
alpha_present = "test_alpha.txt" in files
"""
    result_b = execute_node_isolated(
        node_id="node_b",
        code=code_b,
        input_vars={},
        expected_outputs=["alpha_present"],
        pipeline_id="pipe_beta"
    )
    assert result_b["status"] == "success"
    # Pipeline B MUST NOT see Pipeline A's file
    assert result_b["outputs"]["alpha_present"] is False

    # Pipeline A's file list includes test_alpha.txt
    files_a = workspace_manager.list_files("pipe_alpha")
    assert any(f["name"] == "test_alpha.txt" for f in files_a)

    # Pipeline B's file list does not include test_alpha.txt
    files_b = workspace_manager.list_files("pipe_beta")
    assert not any(f["name"] == "test_alpha.txt" for f in files_b)

def test_bang_command_preprocessing():
    code = "!git clone https://github.com/example/repo.git\n!pip install scipy"
    processed = preprocess_code(code, pipeline_id="pipe_test")
    assert "FLOWNB_WORKSPACE" in processed
    assert "PYTHONUSERBASE" in processed
    assert "subprocess.run" in processed

def test_cd_and_magic_preprocessing():
    code = """
repo_name = "my_awesome_repo"
%cd {repo_name}
%pwd
%pip install requests
%matplotlib inline
"""
    processed = preprocess_code(code, pipeline_id="pipe_test")
    assert "os.chdir" in processed
    assert "print(os.getcwd())" in processed
    assert "subprocess.run" in processed
    # Make sure compiled code is valid Python syntax!
    compiled = compile(processed, "<test_node>", "exec")
    assert compiled is not None

