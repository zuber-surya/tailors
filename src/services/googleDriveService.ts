/**
 * Service for interacting with Google Drive API
 */

export interface GoogleDriveUploadResponse {
  id: string;
  name: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export const googleDriveService = {
  /**
   * Uploads a file to a specific Google Drive folder
   */
  async uploadFile(
    file: File,
    folderId: string,
    accessToken: string
  ): Promise<GoogleDriveUploadResponse> {
    const metadata = {
      name: file.name,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Drive upload failed');
    }

    return response.json();
  },

  /**
   * Gets a direct download link (or webViewLink) for a file
   */
  async getFileLink(fileId: string, accessToken: string): Promise<{ webViewLink: string; thumbnailLink: string }> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,thumbnailLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch file link from Google Drive');
    }

    return response.json();
  },

  /**
   * Generates a direct preview link from a file ID
   * Note: only works if the file is shareable
   */
  getDirectUrl(fileId: string) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
};
