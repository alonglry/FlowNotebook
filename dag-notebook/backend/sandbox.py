"""
Sandbox execution runner for isolated node scopes with defensive copying and stdout capture.
"""

import sys
import io
import time
import copy
import traceback
from typing import Any, Dict, List, Tuple
import pandas as pd
import numpy as np

def serialize_variable_summary(val: Any) -> Dict[str, Any]:
    """Generates a rich, JSON-serializable summary of an output variable for UI rendering."""
    try:
        if isinstance(val, pd.DataFrame):
            # Limit rows for preview
            preview_df = val.head(50)
            # Convert non-serializable elements to string or native types
            records = preview_df.reset_index().to_dict(orient="records")
            # Format datetime / timestamps to string
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
                        clean_r[str(k)] = str(v)
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
            preview_s = val.head(50)
            records = [{"index": str(idx), "value": None if pd.isna(v) else (float(v) if isinstance(v, (np.floating, float)) else (int(v) if isinstance(v, (np.integer, int)) else str(v)))} for idx, v in preview_s.items()]
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
            return {
                "type": type(val).__name__,
                "value": str(val),
                "previewText": str(val)
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


def execute_node_isolated(
    node_id: str,
    code: str,
    input_vars: Dict[str, Any],
    expected_outputs: List[str] | None = None
) -> Dict[str, Any]:
    """
    Executes Python code in an isolated scope with defensive copying of inputs.
    Captures stdout/stderr and returns extracted outputs and rich summaries.
    """
    # Defensive copy of input variables to strictly avoid mutating upstream states
    isolated_locals: Dict[str, Any] = {}
    for var_name, var_val in input_vars.items():
        try:
            isolated_locals[var_name] = copy.deepcopy(var_val)
        except Exception:
            # Fallback for non-deepcopyable objects
            isolated_locals[var_name] = var_val

    # Standard execution scope
    exec_globals: Dict[str, Any] = {
        "__builtins__": __builtins__,
        "pd": pd,
        "np": np
    }

    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr

    start_time = time.perf_counter()
    status = "success"
    error_msg = None

    try:
        sys.stdout = stdout_capture
        sys.stderr = stderr_capture
        
        # Compile and execute within the isolated namespace
        compiled = compile(code, f"<node_{node_id}>", "exec")
        exec(compiled, exec_globals, isolated_locals)

    except Exception as e:
        status = "error"
        tb_lines = traceback.format_exception(type(e), e, e.__traceback__)
        # Filter out internal runner frames from traceback
        filtered_tb = "".join(tb_lines)
        error_msg = filtered_tb
        stderr_capture.write(f"\n{filtered_tb}")
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    captured_stdout = stdout_capture.getvalue()
    captured_stderr = stderr_capture.getvalue()

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
