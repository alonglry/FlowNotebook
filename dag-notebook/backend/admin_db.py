"""
SQLite Database and Telemetry Manager for FlowNotebook Admin
Tracks real registered users, active pipelines, created nodes, code snippets, and execution activity.
"""

import sqlite3
import json
import time
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "flownotebook_admin.db")
ADMIN_EMAILS = {"alonglry@gmail.com", "flownotebook.support@gmail.com"}
ADMIN_NAME = "Awai Li"


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                name TEXT,
                avatar_url TEXT,
                first_seen INTEGER,
                last_active INTEGER,
                total_executions INTEGER DEFAULT 0
            )
        """)
        
        # Pipelines Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pipelines (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                user_email TEXT,
                name TEXT,
                category TEXT,
                description TEXT,
                created_at INTEGER,
                updated_at INTEGER,
                node_count INTEGER DEFAULT 0,
                edge_count INTEGER DEFAULT 0,
                nodes_json TEXT,
                edges_json TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        
        # Activity Logs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_email TEXT,
                action_type TEXT,
                details TEXT,
                timestamp INTEGER
            )
        """)
        
        # Ensure Admin User exists with correct name "Awai Li"
        now = int(time.time() * 1000)
        cursor.execute("SELECT id FROM users WHERE email = ?", ("alonglry@gmail.com",))
        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.execute("""
                INSERT INTO users (id, email, name, avatar_url, first_seen, last_active, total_executions)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                "usr_alonglry",
                "alonglry@gmail.com",
                ADMIN_NAME,
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces",
                now,
                now,
                0
            ))
        else:
            cursor.execute("UPDATE users SET name = ? WHERE email = ?", (ADMIN_NAME, "alonglry@gmail.com"))

        conn.commit()


# Database Queries and Mutations

def record_user_activity(user_data: Dict[str, Any], action: Optional[str] = None, details: Optional[str] = None):
    now = int(time.time() * 1000)
    email = (user_data.get("email") or "").strip().lower()
    if not email:
        email = "anonymous@flownotebook.dev"
    
    user_id = user_data.get("id") or f"usr_{email.replace('@', '_').replace('.', '_')}"
    
    if email == "alonglry@gmail.com":
        name = ADMIN_NAME
    else:
        name = user_data.get("name") or email.split("@")[0]
        
    avatar_url = user_data.get("avatarUrl") or ""

    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT first_seen, total_executions FROM users WHERE email = ? OR id = ?", (email, user_id))
        row = cursor.fetchone()
        
        if row:
            first_seen = row["first_seen"]
            total_execs = row["total_executions"] + (1 if action == "execute_dag" else 0)
        else:
            first_seen = now
            total_execs = 1 if action == "execute_dag" else 0

        cursor.execute("""
            INSERT OR REPLACE INTO users (id, email, name, avatar_url, first_seen, last_active, total_executions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, email, name, avatar_url, first_seen, now, total_execs))

        if action:
            cursor.execute("""
                INSERT INTO activity_log (user_id, user_email, action_type, details, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, email, action, details or action, now))

        conn.commit()
    return user_id

def record_pipeline(pipeline_data: Dict[str, Any], user_data: Dict[str, Any]):
    now = int(time.time() * 1000)
    user_id = record_user_activity(user_data, action="save_pipeline", details=f"Saved pipeline '{pipeline_data.get('name', 'Untitled')}'")
    user_email = (user_data.get("email") or "").strip().lower()
    
    pipe_id = pipeline_data.get("id") or f"pipe_{now}"
    name = pipeline_data.get("name") or "Untitled Pipeline"
    category = pipeline_data.get("category") or "custom"
    description = pipeline_data.get("description") or ""
    nodes = pipeline_data.get("nodes") or []
    edges = pipeline_data.get("edges") or []

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT created_at FROM pipelines WHERE id = ?", (pipe_id,))
        row = cursor.fetchone()
        created_at = row["created_at"] if row else now

        cursor.execute("""
            INSERT OR REPLACE INTO pipelines
            (id, user_id, user_email, name, category, description, created_at, updated_at, node_count, edge_count, nodes_json, edges_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pipe_id,
            user_id,
            user_email,
            name,
            category,
            description,
            created_at,
            now,
            len(nodes),
            len(edges),
            json.dumps(nodes),
            json.dumps(edges)
        ))
        conn.commit()
    return pipe_id

def get_admin_overview():
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM pipelines")
        total_pipelines = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(total_executions) FROM users")
        total_executions = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT SUM(node_count) FROM pipelines")
        total_nodes = cursor.fetchone()[0] or 0

        # Recent 7-day active user count
        seven_days_ago = int(time.time() * 1000) - (7 * 86400 * 1000)
        cursor.execute("SELECT COUNT(*) FROM users WHERE last_active >= ?", (seven_days_ago,))
        active_users_7d = cursor.fetchone()[0]

    return {
        "total_users": total_users,
        "total_pipelines": total_pipelines,
        "total_executions": total_executions,
        "total_nodes": total_nodes,
        "active_users_7d": active_users_7d
    }

def get_all_users() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id, u.email, u.name, u.avatar_url, u.first_seen, u.last_active, u.total_executions,
                   COUNT(p.id) as pipeline_count
            FROM users u
            LEFT JOIN pipelines p ON u.id = p.user_id OR u.email = p.user_email
            GROUP BY u.id
            ORDER BY u.last_active DESC
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def get_user_creations(user_id_or_email: str) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        # Find user
        cursor.execute("SELECT * FROM users WHERE id = ? OR email = ?", (user_id_or_email, user_id_or_email))
        user_row = cursor.fetchone()
        user_info = dict(user_row) if user_row else None

        # Find pipelines
        cursor.execute("""
            SELECT * FROM pipelines 
            WHERE user_id = ? OR user_email = ? 
            ORDER BY updated_at DESC
        """, (user_id_or_email, user_id_or_email))
        pipelines = []
        for r in cursor.fetchall():
            item = dict(r)
            try:
                item["nodes"] = json.loads(item["nodes_json"])
            except Exception:
                item["nodes"] = []
            try:
                item["edges"] = json.loads(item["edges_json"])
            except Exception:
                item["edges"] = []
            del item["nodes_json"]
            del item["edges_json"]
            pipelines.append(item)

        # Find activity logs
        cursor.execute("""
            SELECT * FROM activity_log 
            WHERE user_id = ? OR user_email = ? 
            ORDER BY timestamp DESC LIMIT 50
        """, (user_id_or_email, user_id_or_email))
        logs = [dict(r) for r in cursor.fetchall()]

    return {
        "user": user_info,
        "pipelines": pipelines,
        "activity": logs
    }

def get_recent_activity(limit: int = 40) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.*, u.name as user_name, u.avatar_url
            FROM activity_log a
            LEFT JOIN users u ON a.user_id = u.id OR a.user_email = u.email
            ORDER BY a.timestamp DESC LIMIT ?
        """, (limit,))
        return [dict(r) for r in cursor.fetchall()]
