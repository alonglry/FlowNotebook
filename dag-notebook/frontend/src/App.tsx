import { useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { AdminPage } from './components/AdminPage';
import { TopBar } from './components/TopBar';
import { Canvas } from './components/Canvas';
import { ExportModal } from './components/ExportModal';
import { StorageModal } from './components/StorageModal';
import { useGraphStore } from './store/useGraphStore';
import { storageManager } from './services/storage';

export default function App() {
  const currentView = useGraphStore((state) => state.currentView);
  const initWebSocket = useGraphStore((state) => state.initWebSocket);
  const isStorageModalOpen = useGraphStore((state) => state.isStorageModalOpen);
  const storageModalMode = useGraphStore((state) => state.storageModalMode);
  const closeStorageModal = useGraphStore((state) => state.closeStorageModal);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);

  useEffect(() => {
    initWebSocket();
    storageManager.initAll().then(() => {
      if (storageManager.googleDriveProvider.user) {
        setCurrentUser(storageManager.googleDriveProvider.user);
      }
    });
  }, [initWebSocket, setCurrentUser]);

  return (
    <div className="w-screen h-screen bg-[#070b14] text-slate-100 overflow-hidden">
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'admin' && <AdminPage />}
      {currentView === 'canvas' && (
        <div className="w-full h-full flex flex-col">
          <TopBar />
          <main className="flex-1 w-full h-full relative">
            <Canvas />
          </main>
          <ExportModal />
          <StorageModal
            isOpen={isStorageModalOpen}
            onClose={closeStorageModal}
            defaultMode={storageModalMode}
          />
        </div>
      )}
    </div>
  );
}
