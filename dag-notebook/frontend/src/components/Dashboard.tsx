import React, { useState } from 'react';
import {
  Workflow,
  Plus,
  Search,
  Cloud,
  LogOut,
  Copy,
  Trash2,
  TrendingUp,
  BrainCircuit,
  Database,
  Layers,
  ArrowRight,
  X,
  Clock,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { useGraphStore, type PipelineItem } from '../store/useGraphStore';
import { storageManager } from '../services/storage';

export const Dashboard: React.FC = () => {
  const setCurrentView = useGraphStore((state) => state.setCurrentView);
  const pipelines = useGraphStore((state) => state.pipelines);
  const createPipeline = useGraphStore((state) => state.createPipeline);
  const openPipeline = useGraphStore((state) => state.openPipeline);
  const deletePipeline = useGraphStore((state) => state.deletePipeline);
  const duplicatePipeline = useGraphStore((state) => state.duplicatePipeline);
  const currentUser = useGraphStore((state) => state.currentUser);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'quant' | 'ml' | 'etl'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineCategory, setNewPipelineCategory] = useState<'quant' | 'ml' | 'etl' | 'custom'>('custom');

  const filteredPipelines = pipelines.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleGoogleSignIn = async () => {
    const user = await storageManager.googleDriveProvider.signIn();
    if (user) {
      setCurrentUser(user);
    }
  };

  const handleGoogleSignOut = async () => {
    await storageManager.googleDriveProvider.signOut();
    setCurrentUser(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;

    createPipeline(newPipelineName.trim(), newPipelineCategory);
    setIsCreateModalOpen(false);
    setNewPipelineName('');
  };

  const getCategoryIcon = (cat: PipelineItem['category']) => {
    switch (cat) {
      case 'quant':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'ml':
        return <BrainCircuit className="w-4 h-4 text-purple-400" />;
      case 'etl':
        return <Database className="w-4 h-4 text-amber-400" />;
      default:
        return <Layers className="w-4 h-4 text-sky-400" />;
    }
  };

  const getCategoryBadge = (cat: PipelineItem['category']) => {
    switch (cat) {
      case 'quant':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-[10px] font-semibold">Quantitative</span>;
      case 'ml':
        return <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/80 text-purple-400 text-[10px] font-semibold">Machine Learning</span>;
      case 'etl':
        return <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/80 text-amber-400 text-[10px] font-semibold">Data ETL</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-800/80 text-sky-400 text-[10px] font-semibold">Custom</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 px-6 bg-[#0c1220] border-b border-slate-800 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Home</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-lg shadow-sm">
              <Workflow className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">FlowNotebook Dashboard</span>
          </div>
        </div>

        {/* User Profile / Google Auth & Admin */}
        <div className="flex items-center space-x-3">
          {/* Admin Portal Button */}
          <button
            onClick={() => setCurrentView('admin')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              currentUser?.email?.toLowerCase() === 'alonglry@gmail.com'
                ? 'bg-amber-950/80 border-amber-700/80 text-amber-300 hover:bg-amber-900/80 shadow-md'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Open Admin & Telemetry Portal"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
          </button>

          {currentUser ? (
            <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center text-xs font-bold">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{currentUser.email}</div>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <button
                onClick={handleGoogleSignOut}
                title="Sign Out"
                className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Connect Google Drive</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Pipeline</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0e1628] to-[#0c1324] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-white">Your Python Pipelines</h1>
            <p className="text-xs text-slate-400">
              Manage, execute, and organize your Directed Acyclic Graph notebooks in isolated execution scopes.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-sky-400">{pipelines.length}</span> Pipelines Total
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Kernel Ready</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex bg-slate-900/90 rounded-xl p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({pipelines.length})
            </button>
            <button
              onClick={() => setSelectedCategory('quant')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === 'quant' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Quantitative
            </button>
            <button
              onClick={() => setSelectedCategory('ml')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === 'ml' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Machine Learning
            </button>
            <button
              onClick={() => setSelectedCategory('etl')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === 'etl' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Data ETL
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pipelines..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Pipelines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* "Create New" Quick Card */}
          <div
            onClick={() => setIsCreateModalOpen(true)}
            className="p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-sky-500/70 bg-slate-900/30 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 group-hover:border-sky-500 text-slate-400 group-hover:text-sky-400 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">
                Create New Pipeline
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Start from a blank canvas or pre-seeded templates
              </p>
            </div>
          </div>

          {/* Existing Pipeline Cards */}
          {filteredPipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-sky-950/20 transition-all flex flex-col justify-between space-y-4 group"
            >
              {/* Card Header */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(pipeline.category)}
                    {getCategoryBadge(pipeline.category)}
                  </div>
                  <div className="flex items-center space-x-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-mono">
                      {new Date(pipeline.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
                    {pipeline.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {pipeline.description}
                  </p>
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 font-mono">
                  <span className="text-slate-300 font-semibold">{pipeline.nodeCount || pipeline.nodes.length}</span> nodes • <span className="text-slate-300 font-semibold">{pipeline.edgeCount || pipeline.edges.length}</span> wires
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => duplicatePipeline(pipeline.id)}
                    title="Duplicate Pipeline"
                    className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => deletePipeline(pipeline.id)}
                    title="Delete Pipeline"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openPipeline(pipeline.id)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 shadow-sm cursor-pointer ml-1"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPipelines.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/30 border border-slate-800/80 rounded-2xl">
            No pipelines found matching your search.
          </div>
        )}
      </main>

      {/* Create Pipeline Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0e1422] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 bg-[#141b2d] border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-sky-950 text-sky-400 rounded-lg border border-sky-800">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white">Create New Python Pipeline</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Pipeline Name
                </label>
                <input
                  type="text"
                  required
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="e.g., Sentiment Analysis NLP Pipeline"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Category / Template
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('custom')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'custom'
                        ? 'bg-sky-950/80 border-sky-500 ring-1 ring-sky-500'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Blank Canvas</div>
                      <div className="text-[10px] text-slate-400">Empty workflow</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('quant')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'quant'
                        ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Quantitative</div>
                      <div className="text-[10px] text-slate-400">Trading backtest</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('ml')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'ml'
                        ? 'bg-purple-950/80 border-purple-500 ring-1 ring-purple-500'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Machine Learning</div>
                      <div className="text-[10px] text-slate-400">Model training</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('etl')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'etl'
                        ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <Database className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Data ETL</div>
                      <div className="text-[10px] text-slate-400">Cleaning pipeline</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md cursor-pointer"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
