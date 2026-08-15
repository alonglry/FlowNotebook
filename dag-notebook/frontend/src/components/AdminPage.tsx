import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Workflow,
  Cpu,
  Activity,
  Search,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Code2,
  Calendar,
  Layers,
  ArrowLeft,
  Lock,
  UserCheck,
  TrendingUp,
  BrainCircuit,
  Database,
  Zap,
  Key
} from 'lucide-react';
import { useGraphStore, type CustomNode } from '../store/useGraphStore';
import { storageManager } from '../services/storage';

const AUTHORIZED_ADMIN_EMAIL = 'alonglry@gmail.com';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  first_seen: number;
  last_active: number;
  total_executions: number;
  pipeline_count: number;
}

interface PipelineRecord {
  id: string;
  user_id: string;
  user_email: string;
  name: string;
  category: 'quant' | 'ml' | 'etl' | 'custom' | string;
  description: string;
  created_at: number;
  updated_at: number;
  node_count: number;
  edge_count: number;
  nodes: CustomNode[];
  edges: any[];
}

interface ActivityLogItem {
  id: number;
  user_id: string;
  user_email: string;
  user_name?: string;
  avatar_url?: string;
  action_type: string;
  details: string;
  timestamp: number;
}

interface AdminOverview {
  total_users: number;
  total_pipelines: number;
  total_executions: number;
  total_nodes: number;
  active_users_7d: number;
}

export const AdminPage: React.FC = () => {
  const currentUser = useGraphStore((state) => state.currentUser);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);
  const setCurrentView = useGraphStore((state) => state.setCurrentView);
  const loadProjectData = useGraphStore((state) => state.loadProjectData);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overview, setOverview] = useState<AdminOverview>({
    total_users: 0,
    total_pipelines: 0,
    total_executions: 0,
    total_nodes: 0,
    active_users_7d: 0,
  });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedUserPipelines, setSelectedUserPipelines] = useState<PipelineRecord[]>([]);
  const [selectedUserActivity, setSelectedUserActivity] = useState<ActivityLogItem[]>([]);
  const [activeUserTab, setActiveUserTab] = useState<'pipelines' | 'activity'>('pipelines');
  const [selectedPipelineModal, setSelectedPipelineModal] = useState<PipelineRecord | null>(null);
  const [recentGlobalActivity, setRecentGlobalActivity] = useState<ActivityLogItem[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<'users' | 'activity'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    try {
      const emailParam = currentUser?.email || AUTHORIZED_ADMIN_EMAIL;

      // 1. Fetch Overview
      const overviewRes = await fetch(`/api/admin/overview?admin_email=${encodeURIComponent(emailParam)}`);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }

      // 2. Fetch Users List
      const usersRes = await fetch(`/api/admin/users?admin_email=${encodeURIComponent(emailParam)}`);
      if (usersRes.ok) {
        const userList: UserRecord[] = await usersRes.json();
        setUsers(userList);
        if (userList.length > 0 && !selectedUser) {
          fetchUserCreations(userList[0]);
        } else if (selectedUser) {
          const updated = userList.find((u) => u.id === selectedUser.id || u.email === selectedUser.email);
          if (updated) setSelectedUser(updated);
        }
      }

      // 3. Fetch Global Activity
      const actRes = await fetch(`/api/admin/activity?limit=50&admin_email=${encodeURIComponent(emailParam)}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setRecentGlobalActivity(actData);
      }
    } catch (err) {
      console.error('Failed to fetch admin telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchUserCreations = async (user: UserRecord) => {
    setSelectedUser(user);
    try {
      const emailParam = currentUser?.email || AUTHORIZED_ADMIN_EMAIL;
      const res = await fetch(`/api/admin/user/${encodeURIComponent(user.id)}/creations?admin_email=${encodeURIComponent(emailParam)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUserPipelines(data.pipelines || []);
        setSelectedUserActivity(data.activity || []);
      }
    } catch (err) {
      console.error('Failed to fetch user creations:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleAdminBypassLogin = () => {
    const adminProfile = {
      id: 'usr_alonglry',
      name: 'Awai Li',
      email: AUTHORIZED_ADMIN_EMAIL,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces'
    };
    setCurrentUser(adminProfile);
    localStorage.setItem('flownotebook_google_user', JSON.stringify(adminProfile));
  };

  const handleGoogleSignIn = async () => {
    const user = await storageManager.googleDriveProvider.signIn();
    if (user) {
      setCurrentUser(user);
    }
  };

  const handleInspectInCanvas = (pipeline: PipelineRecord) => {
    loadProjectData({
      name: pipeline.name,
      nodes: pipeline.nodes || [],
      edges: pipeline.edges || []
    });
    setCurrentView('canvas');
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quant':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ml':
        return <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />;
      case 'etl':
        return <Database className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  // ----------------------------------------------------
  // UNAUTHORIZED / ACCESS GATE VIEW
  // ----------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-3xl pointer-events-none -top-40 -left-20" />
        <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

        <div className="max-w-md w-full bg-[#0d1322] border border-rose-900/40 rounded-2xl p-8 shadow-2xl relative z-10 text-center backdrop-blur-xl">
          <div className="w-16 h-16 bg-rose-950/80 border border-rose-800/80 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner text-rose-400">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>

          <span className="px-3 py-1 bg-rose-950/90 text-rose-400 border border-rose-800/80 rounded-full text-xs font-semibold uppercase tracking-wider">
            Access Restricted
          </span>

          <h1 className="text-2xl font-bold text-white mt-4 mb-2">Administrator Portal</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            This administration control panel is exclusively designated for <br />
            <strong className="text-rose-300 font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/60">
              {AUTHORIZED_ADMIN_EMAIL}
            </strong>
          </p>

          {currentUser ? (
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl mb-6 text-left flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                {currentUser.name[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
              </div>
              <span className="ml-auto text-[10px] text-rose-400 bg-rose-950/80 border border-rose-900 px-2 py-0.5 rounded font-medium">
                Unauthorized
              </span>
            </div>
          ) : null}

          <div className="space-y-3">
            <button
              onClick={handleAdminBypassLogin}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-900/30 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Shield className="w-4 h-4" />
              <span>Log In as {AUTHORIZED_ADMIN_EMAIL}</span>
            </button>

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-sky-400" />
              <span>Sign in with Google Account</span>
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHORIZED ADMIN PORTAL VIEW
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Admin Header */}
      <header className="h-16 px-6 bg-[#0c1220] border-b border-slate-800 flex items-center justify-between z-30 shrink-0 select-none shadow-xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Return to Pipelines Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-white tracking-tight">FlowNotebook Admin & Telemetry</h1>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider border border-emerald-800/80">
                  Superadmin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Authorized for <strong className="text-sky-400 font-mono">{AUTHORIZED_ADMIN_EMAIL}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Admin Tabs */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMainTab('users')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeMainTab === 'users'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users & Creations</span>
            </button>
            <button
              onClick={() => setActiveMainTab('activity')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeMainTab === 'activity'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Audit Stream</span>
            </button>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh Telemetry Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setCurrentView('canvas')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Open Canvas</span>
          </button>
        </div>
      </header>

      {/* Overview Analytics Bar */}
      <div className="bg-[#0b101c] border-b border-slate-800/80 px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total Users</p>
              <p className="text-lg font-bold text-white tracking-tight">{overview.total_users}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Pipelines Created</p>
              <p className="text-lg font-bold text-white tracking-tight">{overview.total_pipelines}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">DAG Executions</p>
              <p className="text-lg font-bold text-white tracking-tight">{overview.total_executions}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total DAG Nodes</p>
              <p className="text-lg font-bold text-white tracking-tight">{overview.total_nodes}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3.5 shadow-sm col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Active (7 Days)</p>
              <p className="text-lg font-bold text-white tracking-tight">{overview.active_users_7d}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeMainTab === 'users' ? (
          <>
            {/* Left Sidebar: Users Directory */}
            <div className="w-full sm:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-[#0a0f1d] shrink-0">
              {/* Search Bar */}
              <div className="p-3.5 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 focus:border-sky-500 focus:outline-none rounded-xl text-xs text-slate-200 placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No users matching "{searchQuery}"
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    const isUserAdmin = user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();

                    return (
                      <button
                        key={user.id}
                        onClick={() => fetchUserCreations(user)}
                        className={`w-full p-4 flex items-start space-x-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-950/40 border-l-4 border-l-sky-500'
                            : 'hover:bg-slate-900/40'
                        }`}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full border border-slate-700 shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0 mt-0.5">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-slate-100 truncate flex items-center space-x-1.5">
                              <span>{user.name}</span>
                              {isUserAdmin && (
                                <span className="px-1.5 py-0.2 bg-amber-950/90 text-amber-400 border border-amber-800 text-[9px] rounded font-bold">
                                  ADMIN
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {formatDate(user.last_active)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                            {user.email}
                          </p>

                          <div className="flex items-center space-x-3 mt-2 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center space-x-1">
                              <Workflow className="w-3 h-3 text-sky-400" />
                              <span>{user.pipeline_count || 0} pipelines</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Cpu className="w-3 h-3 text-emerald-400" />
                              <span>{user.total_executions || 0} runs</span>
                            </span>
                          </div>
                        </div>

                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-sky-400 translate-x-0.5' : 'text-slate-600'}`} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Selected User Details & What They Created */}
            <div className="flex-1 flex flex-col bg-[#070b14] overflow-hidden">
              {selectedUser ? (
                <>
                  {/* User Profile Header */}
                  <div className="p-6 border-b border-slate-800 bg-[#0d1322]/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      {selectedUser.avatar_url ? (
                        <img
                          src={selectedUser.avatar_url}
                          alt=""
                          className="w-14 h-14 rounded-2xl border-2 border-sky-500/40 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 border border-slate-700 flex items-center justify-center font-bold text-lg text-white shadow-md">
                          {selectedUser.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-lg font-bold text-white">{selectedUser.name}</h2>
                          {selectedUser.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-bold">
                              Platform Administrator
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium flex items-center space-x-1">
                              <UserCheck className="w-3 h-3 text-emerald-400" />
                              <span>Registered User</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedUser.email}</p>

                        <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>First seen: {formatDate(selectedUser.first_seen)}</span>
                          </span>
                          <span>•</span>
                          <span>Last active: {formatDate(selectedUser.last_active)}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">{selectedUserPipelines.length} Pipelines Authored</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-tabs for user details */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setActiveUserTab('pipelines')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeUserTab === 'pipelines'
                            ? 'bg-sky-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Workflow className="w-3.5 h-3.5" />
                        <span>Created Pipelines ({selectedUserPipelines.length})</span>
                      </button>

                      <button
                        onClick={() => setActiveUserTab('activity')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeUserTab === 'activity'
                            ? 'bg-sky-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>User Activity History</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab Body: What User Created */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {activeUserTab === 'pipelines' ? (
                      selectedUserPipelines.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                          <Workflow className="w-8 h-8 text-slate-600 mb-2" />
                          <span>This user hasn't created any pipelines yet.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {selectedUserPipelines.map((pipe) => (
                            <div
                              key={pipe.id}
                              className="bg-[#0e1424] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
                            >
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                                      {getCategoryIcon(pipe.category)}
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-bold text-white hover:text-sky-400 transition-colors">
                                        {pipe.name}
                                      </h3>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        Updated: {formatDate(pipe.updated_at)}
                                      </span>
                                    </div>
                                  </div>

                                  <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                                    {pipe.category}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                                  {pipe.description || 'No description provided.'}
                                </p>

                                {/* Nodes & Architecture Summary */}
                                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 mb-4">
                                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-medium">
                                    <span className="flex items-center space-x-1.5">
                                      <Code2 className="w-3.5 h-3.5 text-sky-400" />
                                      <span>DAG Nodes ({pipe.node_count})</span>
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {pipe.edge_count} Edges Connected
                                    </span>
                                  </div>

                                  {/* Node pills preview */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {pipe.nodes && pipe.nodes.length > 0 ? (
                                      pipe.nodes.map((node: any, idx: number) => (
                                        <span
                                          key={node.id || idx}
                                          className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-300 flex items-center space-x-1"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          <span className="truncate max-w-[130px]">
                                            {node.data?.title || node.id}
                                          </span>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[10px] text-slate-600">No nodes found</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                                <button
                                  onClick={() => setSelectedPipelineModal(pipe)}
                                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-700"
                                >
                                  <Code2 className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Inspect Code & DAG</span>
                                </button>

                                <button
                                  onClick={() => handleInspectInCanvas(pipe)}
                                  className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-md"
                                  title="Load this user's workflow directly into FlowNotebook Canvas"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open in Canvas</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      /* Selected User Activity History */
                      <div className="space-y-3">
                        {selectedUserActivity.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                            No recorded events for this user.
                          </div>
                        ) : (
                          selectedUserActivity.map((act) => (
                            <div
                              key={act.id}
                              className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start justify-between gap-4"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="p-1.5 bg-slate-800 rounded-lg text-sky-400 shrink-0 mt-0.5">
                                  <Zap className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-200">{act.details}</p>
                                  <span className="text-[10px] text-slate-500 uppercase font-mono">
                                    Action: {act.action_type}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono shrink-0">
                                {formatDate(act.timestamp)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Select a user from the directory to inspect their profile and authored pipelines.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Live Global Platform Audit Stream Tab */
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-bold text-white">Live Platform Audit Feed</h2>
                  <p className="text-xs text-slate-400">Chronological telemetry stream of user actions and DAG runs</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-semibold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Telemetry Live</span>
                </span>
              </div>

              <div className="divide-y divide-slate-800 bg-[#0d1322] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {recentGlobalActivity.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center space-x-3.5">
                      {item.avatar_url ? (
                        <img src={item.avatar_url} alt="" className="w-8 h-8 rounded-full border border-slate-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {(item.user_name || item.user_email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-200">{item.user_name || item.user_email}</span>
                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[9px] font-mono">
                            {item.action_type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.details}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Code & Node Inspector Modal */}
      {selectedPipelineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1424] border border-slate-800 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0a0f1c]">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-800 rounded-xl">
                  <Code2 className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedPipelineModal.name}</h3>
                  <p className="text-xs text-slate-400">
                    Authored by <span className="text-slate-200 font-mono">{selectedPipelineModal.user_email}</span> • {selectedPipelineModal.node_count} Nodes
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleInspectInCanvas(selectedPipelineModal)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Canvas</span>
                </button>
                <button
                  onClick={() => setSelectedPipelineModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Node & Python Code Inspector */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedPipelineModal.nodes && selectedPipelineModal.nodes.length > 0 ? (
                selectedPipelineModal.nodes.map((node: any, idx: number) => (
                  <div key={node.id || idx} className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        <span className="text-xs font-bold text-slate-200">
                          {node.data?.title || `Node ${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">({node.id})</span>
                      </div>

                      <div className="flex items-center space-x-3 text-[10px]">
                        {node.data?.inputs && node.data.inputs.length > 0 && (
                          <span className="text-amber-400">
                            Inputs: {node.data.inputs.join(', ')}
                          </span>
                        )}
                        {node.data?.outputs && node.data.outputs.length > 0 && (
                          <span className="text-emerald-400">
                            Outputs: {node.data.outputs.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-[#080d1a] overflow-x-auto">
                      <pre className="text-[11px] font-mono text-slate-300 leading-relaxed">
                        {node.data?.code || '# No Python code entered.'}
                      </pre>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No nodes present in this pipeline.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
