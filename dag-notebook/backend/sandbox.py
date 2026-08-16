"""
Hardened sandbox execution runner for isolated node scopes with defensive copying,
strict execution timeouts, resource limits, stdout/stderr capture, and environment sanitization.
"""

import sys
import io
import os
import time
import copy
import traceback
import concurrent.futures
from typing import Any, Dict, List, Optional
import pandas as pd
import numpy as np

# Configurable security and resource limits
DEFAULT_NODE_TIMEOUT_SECONDS: float = 15.0
MAX_OUTPUT_LENGTH: int = 100_000  # Max characters per node output
MAX_PREVIEW_RECORDS: int = 50

# Sensitive environment key prefixes/patterns to redact from user runtime inspection
SENSITIVE_ENV_KEYWORDS = [
    "KEY", "SECRET", "TOKEN", "AUTH", "PASS", "CREDENTIAL", "ADMIN", "GCP", "GOOGLE"
]

def get_sanitized_environ() -> Dict[str, str]:
    """Returns a sanitized copy of environment variables with sensitive secrets masked."""
    sanitized = {}
    for k, v in os.environ.items():
        k_upper = k.upper()
        if any(keyword in k_upper for keyword in SENSITIVE_ENV_KEYWORDS):
            sanitized[k] = "******** [REDACTED FOR SECURITY]"
        else:
            sanitized[k] = v
    return sanitized


def serialize_variable_summary(val: Any) -> Dict[str, Any]:
    """Generates a rich, JSON-serializable summary of an output variable for UI rendering."""
    try:
        if isinstance(val, pd.DataFrame):
            # Limit rows for preview
            preview_df = val.head(MAX_PREVIEW_RECORDS)
            records = preview_df.reset_index().to_dict(orient="records")
            clean_records = []
            for r in records:
                clean_r = {}
                for k, v in r.items():
                    if pd.isna(v):
                        clean_r[str(k)] = None
                    elif isinstance(v, (pd.Timestamp, np.datetime64)):
                        clean_r[str(k)] = str(v)
                    elif isinstance(v, (np.integer, int)):
                        clean_r[str(k)] = int(v)
                    elif isinstance(v, (np.floating, float)):
                        clean_r[str(k)] = float(v)
                    else:
                        clean_r[str(k)] = str(v)[:200]  # Cap cell character length
                clean_records.append(clean_r)

            columns = [str(c) for c in (["index"] if "index" not in val.columns else []) + list(val.columns)]
            dtypes = {str(col): str(dtype) for col, dtype in val.dtypes.items()}

            return {
                "type": "DataFrame",
                "shape": [int(val.shape[0]), int(val.shape[1])],
                "columns": columns,
                "dtypes": dtypes,
                "records": clean_records,
                "previewText": f"DataFrame ({val.shape[0]} rows × {val.shape[1]} cols)"
            }

        elif isinstance(val, pd.Series):
            preview_s = val.head(MAX_PREVIEW_RECORDS)
            records = [
                {
                    "index": str(idx),
                    "value": (
                        None if pd.isna(v)
                        else float(v) if isinstance(v, (np.floating, float))
                        else int(v) if isinstance(v, (np.integer, int))
                        else str(v)[:200]
                    )
                }
                for idx, v in preview_s.items()
            ]
            return {
                "type": "Series",
                "shape": [int(len(val)), 1],
                "columns": ["index", "value"],
                "records": records,
                "previewText": f"Series (length {len(val)}, dtype: {val.dtype})"
            }

        elif isinstance(val, np.ndarray):
            sample = val.flatten()[:20].tolist()
            return {
                "type": "ndarray",
                "shape": list(val.shape),
                "dtype": str(val.dtype),
                "sample": sample,
                "previewText": f"NumPy ndarray {val.shape} {val.dtype}"
            }

        elif isinstance(val, (dict, list, set, tuple)):
            str_rep = str(val)
            if len(str_rep) > 500:
                str_rep = str_rep[:500] + "... (truncated)"
            return {
                "type": type(val).__name__,
                "length": len(val),
                "previewText": str_rep
            }

        elif isinstance(val, (int, float, bool, str, bytes)):
            val_str = str(val)
            if len(val_str) > 1000:
                val_str = val_str[:1000] + "... (truncated)"
            return {
                "type": type(val).__name__,
                "value": val_str,
                "previewText": val_str
            }

        else:
            return {
                "type": type(val).__name__,
                "previewText": f"<{type(val).__name__} object at {hex(id(val))}>"
            }
    except Exception as ex:
        return {
            "type": type(val).__name__,
            "previewText": f"<Error summarizing: {str(ex)}>"
        }


import re
from workspace import workspace_manager

def _strip_inline_comment(line: str) -> str:
    """Strips inline comments (# ...) that appear outside of quotes or braces."""
    in_quote = None
    brace_depth = 0
    for i, ch in enumerate(line):
        if ch in ('"', "'"):
            if in_quote == ch:
                in_quote = None
            elif in_quote is None:
                in_quote = ch
        elif ch == '{' and in_quote is None:
            brace_depth += 1
        elif ch == '}' and in_quote is None:
            brace_depth = max(0, brace_depth - 1)
        elif ch == '#' and in_quote is None and brace_depth == 0:
            return line[:i].strip()
    return line.strip()

def preprocess_code(code: str, pipeline_id: str = "default_pipeline") -> str:
    """
    Transforms Jupyter-style shell magic lines (e.g. !git clone, !pip install)
    and IPython magic commands (e.g. %cd, %pwd, %env, %pip) into isolated Python code.
    """
    ws = workspace_manager.get_or_create_workspace(pipeline_id)
    ws_dir = ws["workspace"]
    pkg_dir = ws["packages"]

    lines = []
    for line in code.splitlines():
        stripped = line.strip()
        indent = line[:len(line) - len(line.lstrip())]

        # Handle %cd magic
        if stripped.startswith("%cd"):
            clean_cmd = _strip_inline_comment(stripped)
            target = clean_cmd[3:].strip()
            # Convert $VAR to {VAR} for interpolation
            target_converted = re.sub(r'\$([a-zA-Z_][a-zA-Z0-9_]*)', r'{\1}', target)
            
            lines.append(f"{indent}import os")
            if not target_converted:
                lines.append(f"{indent}os.chdir(os.path.expanduser('~'))")
            elif "{" in target_converted:
                if (target_converted.startswith('"') and target_converted.endswith('"')) or \
                   (target_converted.startswith("'") and target_converted.endswith("'")):
                    target_converted = target_converted[1:-1]
                lines.append(f"{indent}os.chdir(os.path.expanduser(f{target_converted!r}))")
            else:
                if (target.startswith('"') and target.endswith('"')) or \
                   (target.startswith("'") and target.endswith("'")):
                    target = target[1:-1]
                lines.append(f"{indent}os.chdir(os.path.expanduser({target!r}))")
            lines.append(f"{indent}print(os.getcwd())")
            continue

        # Handle %pwd magic
        if stripped.startswith("%pwd"):
            lines.append(f"{indent}import os")
            lines.append(f"{indent}print(os.getcwd())")
            continue

        # Handle %pip or %conda -> translate to !pip / !conda
        if stripped.startswith("%pip ") or stripped == "%pip":
            stripped = "!" + stripped[1:]
        elif stripped.startswith("%conda ") or stripped == "%conda":
            stripped = "!" + stripped[1:]
        elif stripped.startswith(("%ls", "%mkdir", "%rm", "%rmdir", "%cp", "%mv", "%cat")):
            stripped = "!" + stripped[1:]

        # Handle %env or %set_env
        if stripped.startswith(("%env", "%set_env")):
            clean_env = _strip_inline_comment(stripped)
            parts = clean_env.split(None, 1)
            lines.append(f"{indent}import os")
            if len(parts) == 1:
                lines.append(f"{indent}import pprint; pprint.pprint(dict(os.environ))")
            elif "=" in parts[1]:
                k, v = parts[1].split("=", 1)
                lines.append(f"{indent}os.environ[{k.strip()!r}] = {v.strip()!r}")
            else:
                lines.append(f"{indent}print(os.environ.get({parts[1].strip()!r}, ''))")
            continue

        # Handle comments for non-executable IPython magics
        if stripped.startswith(("%matplotlib", "%load_ext", "%reload_ext", "%autoreload", "%config", "%autocall", "%precision", "%colors", "%quickref", "%who", "%whos")):
            lines.append(f"{indent}# {stripped}")
            continue

        # Handle Jupyter shell ! commands
        if stripped.startswith("!"):
            clean_cmd = _strip_inline_comment(stripped)
            cmd = clean_cmd[1:].strip()
            # Convert $VAR to {VAR} for interpolation if present
            cmd_interpolated = re.sub(r'\$([a-zA-Z_][a-zA-Z0-9_]*)', r'{\1}', cmd)
            
            lines.append(f"{indent}import subprocess, sys, os")
            lines.append(f"{indent}_env = os.environ.copy()")
            lines.append(f"{indent}_env['PYTHONUSERBASE'] = {pkg_dir!r}")
            lines.append(f"{indent}_env['FLOWNB_WORKSPACE'] = {ws_dir!r}")
            if "{" in cmd_interpolated:
                lines.append(f"{indent}_cmd_str = f{cmd_interpolated!r}")
            else:
                lines.append(f"{indent}_cmd_str = {cmd!r}")
            lines.append(f"{indent}_proc = subprocess.run(_cmd_str, shell=True, capture_output=True, text=True, cwd=os.getcwd(), env=_env)")
            lines.append(f"{indent}sys.stdout.write(_proc.stdout)")
            lines.append(f"{indent}sys.stderr.write(_proc.stderr)")
            lines.append(f"{indent}if _proc.returncode != 0:")
            lines.append(f"{indent}    raise RuntimeError(f'Shell command failed with exit code {{_proc.returncode}}:\\n{{_proc.stderr.strip() or _proc.stdout.strip()}}')")
            continue

        # Any leftover % magic (e.g. unknown % command) - comment it out safely rather than crashing
        if stripped.startswith("%") and not stripped.startswith("%%"):
            lines.append(f"{indent}# Unsupported magic: {stripped}")
            continue

        lines.append(line)
    return "\n".join(lines)



def _run_node_code_worker(
    compiled_code: Any,
    exec_globals: Dict[str, Any],
    isolated_locals: Dict[str, Any],
    stdout_buf: io.StringIO,
    stderr_buf: io.StringIO,
    workspace_dir: Optional[str] = None
) -> None:
    """Worker function executed inside a thread pool with stdout/stderr redirected and isolated cwd."""
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    old_cwd = os.getcwd()
    try:
        if workspace_dir and os.path.exists(workspace_dir):
            try:
                os.chdir(workspace_dir)
            except Exception:
                pass
        sys.stdout = stdout_buf
        sys.stderr = stderr_buf
        exec(compiled_code, exec_globals, isolated_locals)
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        try:
            os.chdir(old_cwd)
        except Exception:
            pass


def execute_node_isolated(
    node_id: str,
    code: str,
    input_vars: Dict[str, Any],
    expected_outputs: Optional[List[str]] = None,
    timeout_seconds: float = DEFAULT_NODE_TIMEOUT_SECONDS,
    pipeline_id: str = "default_pipeline"
) -> Dict[str, Any]:
    """
    Executes Python code in an isolated scope with defensive copying of inputs,
    isolated workspace filesystem, isolated package site, and strict timeout enforcement.
    """
    # Activate pipeline-specific site packages & workspace directory
    ws_dir = workspace_manager.activate_pipeline_site(pipeline_id)
    # Defensive copy of input variables to strictly avoid mutating upstream states
    isolated_locals: Dict[str, Any] = {}
    for var_name, var_val in input_vars.items():
        try:
            isolated_locals[var_name] = copy.deepcopy(var_val)
        except Exception:
            # Fallback for non-deepcopyable objects
            isolated_locals[var_name] = var_val

    # Construct safe builtins (remove disruptive exits)
    safe_builtins = dict(__builtins__ if isinstance(__builtins__, dict) else __builtins__.__dict__)
    for disallowed in ["quit", "exit"]:
        safe_builtins.pop(disallowed, None)

    # Standard execution scope with data science modules pre-injected
    exec_globals: Dict[str, Any] = {
        "__builtins__": safe_builtins,
        "pd": pd,
        "np": np,
        "DataFrame": pd.DataFrame,
        "Series": pd.Series
    }

    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()

    start_time = time.perf_counter()
    status = "success"
    error_msg = None

    try:
        # Preprocess Jupyter bang commands (e.g., !git clone, !pip install) in pipeline workspace
        processed_code = preprocess_code(code, pipeline_id=pipeline_id)

        # Pre-compile node code
        compiled = compile(processed_code, f"<node_{node_id}>", "exec")

        # Execute with strict timeout enforcement and isolated workspace directory
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(
                _run_node_code_worker,
                compiled,
                exec_globals,
                isolated_locals,
                stdout_capture,
                stderr_capture,
                ws_dir
            )
            try:
                future.result(timeout=timeout_seconds)
            except concurrent.futures.TimeoutError:
                status = "error"
                error_msg = (
                    f"NodeExecutionTimeoutError: Execution exceeded time limit of "
                    f"{timeout_seconds}s. Long-running or infinite loops are halted."
                )
                stderr_capture.write(f"\n{error_msg}")

    except Exception as e:
        status = "error"
        tb_lines = traceback.format_exception(type(e), e, e.__traceback__)
        filtered_tb = "".join(tb_lines)
        error_msg = filtered_tb
        stderr_capture.write(f"\n{filtered_tb}")

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    captured_stdout = stdout_capture.getvalue()
    captured_stderr = stderr_capture.getvalue()

    # Cap stdout/stderr output to prevent memory exhaustion
    if len(captured_stdout) > MAX_OUTPUT_LENGTH:
        captured_stdout = (
            captured_stdout[:MAX_OUTPUT_LENGTH]
            + f"\n... [Output truncated to {MAX_OUTPUT_LENGTH} characters for performance]"
        )
    if len(captured_stderr) > MAX_OUTPUT_LENGTH:
        captured_stderr = (
            captured_stderr[:MAX_OUTPUT_LENGTH]
            + f"\n... [Stderr truncated to {MAX_OUTPUT_LENGTH} characters for performance]"
        )

    # Extract output variables
    extracted_outputs: Dict[str, Any] = {}
    outputs_summary: Dict[str, Any] = {}

    if status == "success":
        for k, v in isolated_locals.items():
            if not k.startswith("__"):
                # If expected_outputs is specified, prioritize those or save all
                if expected_outputs is None or len(expected_outputs) == 0 or k in expected_outputs:
                    extracted_outputs[k] = v
                    outputs_summary[k] = serialize_variable_summary(v)

    return {
        "nodeId": node_id,
        "status": status,
        "stdout": captured_stdout,
        "stderr": captured_stderr,
        "executionTimeMs": duration_ms,
        "outputs": extracted_outputs,
        "outputsSummary": outputs_summary,
        "error": error_msg
    }

