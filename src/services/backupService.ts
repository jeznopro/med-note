import type { Notebook, Folder } from '../types/document';

export interface BackupData {
  version: string;
  exportedAt: number;
  notebooks: Notebook[];
  folders: Folder[];
}

export function exportLibraryToJson(notebooks: Notebook[], folders: Folder[]) {
  const data: BackupData = {
    version: '1.0',
    exportedAt: Date.now(),
    notebooks,
    folders,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `MedNotes_Backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importLibraryFromJson(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed: BackupData = JSON.parse(text);
        if (!parsed.notebooks || !Array.isArray(parsed.notebooks)) {
          throw new Error('Định dạng file sao lưu không hợp lệ.');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file sao lưu.'));
    reader.readAsText(file);
  });
}
