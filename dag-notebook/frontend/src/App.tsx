import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Canvas } from './components/Canvas';
import { ExportModal } from './components/ExportModal';
import { useGraphStore } from './store/useGraphStore';

export default function App() {
  const initWebSocket = useGraphStore((state) => state.initWebSocket);

  useEffect(() => {
    initWebSocket();
  }, [initWebSocket]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#090d16] text-slate-100 overflow-hidden">
      <TopBar />
      <main className="flex-1 w-full h-full relative">
        <Canvas />
      </main>
      <ExportModal />
    </div>
  );
}
