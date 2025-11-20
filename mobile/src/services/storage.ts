import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export class StorageService {
  /**
   * Upload an image to Supabase Storage
   * @param uri - Local file URI from ImagePicker
   * @param bucket - Storage bucket name
   * @param path - Path within bucket (e.g., 'gratitude/couple-id/filename.jpg')
   * @returns Public URL of uploaded file
   */
  async uploadImage(uri: string, bucket: string, path: string): Promise<string> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(
    uris: string[],
    bucket: string,
    pathPrefix: string
  ): Promise<string[]> {
    const uploadPromises = uris.map((uri, index) => {
      const timestamp = Date.now();
      const filename = `${timestamp}-${index}.jpg`;
      return this.uploadImage(uri, bucket, `${pathPrefix}/${filename}`);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Upload an audio file to Supabase Storage
   * @param uri - Local file URI from audio recording
   * @param bucket - Storage bucket name
   * @param path - Path within bucket
   * @returns Public URL of uploaded file
   */
  async uploadAudio(uri: string, bucket: string, path: string): Promise<string> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([arrayBuffer], { type: 'audio/m4a' });

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          contentType: 'audio/m4a',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Audio upload error:', error);
      throw new Error('Failed to upload audio');
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  /**
   * Generate a unique file path
   */
  generateFilePath(prefix: string, userId: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}/${userId}/${timestamp}-${random}.${extension}`;
  }
}

export const storageService = new StorageService();
