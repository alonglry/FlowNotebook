import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TopBar } from './components/TopBar';
import { Canvas } from './components/Canvas';
import { ExportModal } from './components/ExportModal';
import { StorageModal } from './components/StorageModal';
import { useGraphStore } from './store/useGraphStore';
import { storageManager } from './services/storage';

export default function App() {
  const theme = useGraphStore((state) => state.theme);
  const currentView = useGraphStore((state) => state.currentView);
  const initWebSocket = useGraphStore((state) => state.initWebSocket);
  const isStorageModalOpen = useGraphStore((state) => state.isStorageModalOpen);
  const storageModalMode = useGraphStore((state) => state.storageModalMode);
  const closeStorageModal = useGraphStore((state) => state.closeStorageModal);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);

  useEffect(() => {
    // Ensure document classes and attributes are synced on mount
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    initWebSocket();
    storageManager.initAll().then(() => {
      if (storageManager.googleDriveProvider.user) {
        setCurrentUser(storageManager.googleDriveProvider.user);
      }
    });
  }, [initWebSocket, setCurrentUser]);

  return (
    <div className={`w-screen h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#070b14] text-slate-100' : 'bg-slate-50 text-slate-900'
    } overflow-hidden`}>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'canvas' && (
        <div className="w-full h-full flex flex-col">
          <TopBar />
          <main className="flex-1 w-full h-full relative">
            <Canvas />
          </main>
          <ExportModal />
        </div>
      )}
      <StorageModal
        isOpen={isStorageModalOpen}
        onClose={closeStorageModal}
        defaultMode={storageModalMode}
      />
    </div>
  );
}
