import type { StorageProvider, ProjectData } from './types';

export class FileExportProvider implements StorageProvider {
  id = 'file_system';
  name = 'Save to Local (.flownb)';
  description = 'Save pipeline file directly to your local computer';
  isCloud = false;
  isAvailable = true;
  isAuthenticated = true;
  user = null;

  async saveProject(project: ProjectData): Promise<{ success: boolean; message?: string }> {
    try {
      const filename = `${(project.name || 'pipeline').toLowerCase().replace(/\s+/g, '_')}.flownb`;
      const jsonContent = JSON.stringify(project, null, 2);

      // Check if browser supports modern File System Access API (allows user to choose folder and path)
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'FlowNotebook Pipeline (*.flownb)',
                accept: {
                  'application/json': ['.flownb', '.json'],
                },
              },
            ],
          });
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(jsonContent);
          await writableStream.close();

          return { success: true, message: `Saved "${fileHandle.name || filename}" to local disk.` };
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return { success: false, message: 'Save cancelled by user.' };
          }
          console.warn('[FileExportProvider] showSaveFilePicker failed, falling back to download:', err);
        }
      }

      // Fallback: Standard browser download trigger
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      return { success: true, message: `Saved "${filename}" to Downloads.` };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to save to local file.' };
    }
  }

  async loadProject(): Promise<ProjectData | null> {
    // Check if browser supports modern File System Access API
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'FlowNotebook Pipeline (*.flownb, *.json)',
              accept: {
                'application/json': ['.flownb', '.json'],
              },
            },
          ],
          multiple: false,
        });

        const file = await fileHandle.getFile();
        const content = await file.text();
        const parsed = JSON.parse(content);
        if (parsed.nodes && parsed.edges) {
          if (!parsed.name) {
            parsed.name = file.name.replace(/\.[^/.]+$/, '');
          }
          parsed.filePath = parsed.filePath || (file as any).path || file.name;
          return parsed as ProjectData;
        } else {
          alert('Invalid FlowNotebook pipeline file format.');
          return null;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return null;
        }
        console.warn('[FileExportProvider] showOpenFilePicker fallback to standard file input:', err);
      }
    }

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
              if (!parsed.name) {
                parsed.name = file.name.replace(/\.[^/.]+$/, '');
              }
              parsed.filePath = parsed.filePath || (file as any).path || file.name;
              resolve(parsed as ProjectData);
            } else {
              alert('Invalid FlowNotebook pipeline file format.');
              resolve(null);
            }
          } catch (err) {
            alert('Failed to parse pipeline file.');
            resolve(null);
          }
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }
}

