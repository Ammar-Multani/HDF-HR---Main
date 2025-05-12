import { Platform } from "react-native";
import DocumentPicker, {
  DocumentPickerResponse,
  DocumentPickerOptions,
  types,
} from "@react-native-documents/picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";

/**
 * Pick a document from the device
 * @param {DocumentPickerOptions} options - Options for document picker
 * @returns {Promise<DocumentPickerResponse | null>} - The picked document or null if cancelled
 */
export const pickDocument = async (
  options: DocumentPickerOptions = { type: [types.pdf, types.images] }
): Promise<DocumentPickerResponse | null> => {
  try {
    const result = await DocumentPicker.pick(options);
    return result[0]; // Return the first picked document
  } catch (error: any) {
    // Check for cancellation based on error message
    if (
      error.code === "DOCUMENT_PICKER_CANCELED" ||
      error.message?.includes("canceled") ||
      error.message?.includes("cancelled")
    ) {
      console.log("Document picking was cancelled");
      return null;
    } else {
      console.error("Error picking document:", error);
      throw error;
    }
  }
};

/**
 * Upload a document to Supabase storage
 * @param {DocumentPickerResponse} document - The document to upload
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The path within the bucket
 * @returns {Promise<string>} - The URL of the uploaded document
 */
export const uploadDocumentToStorage = async (
  document: DocumentPickerResponse,
  bucket: string,
  path: string
): Promise<string> => {
  try {
    // For expo-managed apps, we need to read the file first
    let fileUri = document.uri;
    let fileContent;

    // Read file content based on platform
    if (Platform.OS === "ios" || Platform.OS === "android") {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      // Read file as base64
      fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      throw new Error("Unsupported platform");
    }

    // Generate file path with timestamp to avoid name conflicts
    const timestamp = Date.now();
    const fileName =
      document.name ||
      `document-${timestamp}${document.name ? "." + document.name.split(".").pop() : ""}`;
    const filePath = `${path}/${fileName}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileContent, {
        contentType: document.type || "application/octet-stream",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

/**
 * Pick and upload a document in one step
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The path within the bucket
 * @param {DocumentPickerOptions} options - Options for document picker
 * @returns {Promise<string | null>} - The URL of the uploaded document or null if cancelled
 */
export const pickAndUploadDocument = async (
  bucket: string,
  path: string,
  options: DocumentPickerOptions = { type: [types.pdf, types.images] }
): Promise<string | null> => {
  try {
    const document = await pickDocument(options);
    if (!document) {
      return null;
    }

    return await uploadDocumentToStorage(document, bucket, path);
  } catch (error) {
    console.error("Error picking and uploading document:", error);
    throw error;
  }
};
