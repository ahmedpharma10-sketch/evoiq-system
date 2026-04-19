import { CSVExport } from "./csvExportService";

const GOOGLE_DRIVE_SETTINGS_KEY = "corporate-management-google-drive-settings";

export interface GoogleDriveSettings {
  folderUrl: string;
  folderId?: string;
}

export const googleDriveService = {
  getSettings(): GoogleDriveSettings {
    try {
      const data = localStorage.getItem(GOOGLE_DRIVE_SETTINGS_KEY);
      return data ? JSON.parse(data) : { folderUrl: "https://drive.google.com/drive/folders/1agPX40NbWw7hEMU0CpWaG6zR17JCbJ1T?usp=sharing" };
    } catch {
      return { folderUrl: "https://drive.google.com/drive/folders/1agPX40NbWw7hEMU0CpWaG6zR17JCbJ1T?usp=sharing" };
    }
  },

  saveSettings(settings: GoogleDriveSettings): void {
    localStorage.setItem(GOOGLE_DRIVE_SETTINGS_KEY, JSON.stringify(settings));
  },

  extractFolderId(folderUrl: string): string | null {
    // Extract folder ID from various Google Drive URL formats
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
    const match = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  },

  /**
   * Upload CSV files to Google Drive
   * This requires Google OAuth and Drive API integration
   */
  async uploadToGoogleDrive(exports: CSVExport[], accessToken: string): Promise<{ success: boolean; error?: string; uploadedFiles?: string[] }> {
    const settings = this.getSettings();
    const folderId = this.extractFolderId(settings.folderUrl);

    if (!folderId) {
      return { success: false, error: "Invalid Google Drive folder URL" };
    }

    if (!accessToken) {
      return { success: false, error: "Google Drive access token required. Please authenticate." };
    }

    const uploadedFiles: string[] = [];

    try {
      for (const csvExport of exports) {
        const metadata = {
          name: csvExport.filename,
          mimeType: 'text/csv',
          parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([csvExport.content], { type: 'text/csv' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: form,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to upload ${csvExport.filename}: ${error}`);
        }

        uploadedFiles.push(csvExport.filename);
      }

      return { success: true, uploadedFiles };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error during upload" 
      };
    }
  },

  /**
   * Download all CSVs locally (fallback when Google Drive is not configured)
   */
  downloadCSVsLocally(exports: CSVExport[]): void {
    exports.forEach(csvExport => {
      const blob = new Blob([csvExport.content], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", csvExport.filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  },
};
