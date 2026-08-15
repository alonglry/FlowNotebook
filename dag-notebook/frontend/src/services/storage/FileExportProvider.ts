import type { StorageProvider, ProjectData } from './types';

export class FileExportProvider implements StorageProvider {
  id = 'file_system';
  name = 'Download File (.flownb)';
  description = 'Export or import project files from your computer';
  isCloud = false;
  isAvailable = true;
  isAuthenticated = true;
  user = null;

  async saveProject(project: ProjectData): Promise<{ success: boolean; message?: string }> {
    try {
      const filename = `${(project.name || 'pipeline').toLowerCase().replace(/\s+/g, '_')}.flownb`;
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      return { success: true, message: `Exported ${filename}` };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async loadProject(): Promise<ProjectData | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.flownb,.json';

      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);
            if (parsed.nodes && parsed.edges) {
              resolve(parsed as ProjectData);
            } else {
              alert('Invalid FlowNotebook file format.');
              resolve(null);
            }
          } catch (err) {
            alert('Failed to parse file.');
            resolve(null);
          }
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }
}
