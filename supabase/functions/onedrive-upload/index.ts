import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Client } from "https://cdn.skypack.dev/@microsoft/microsoft-graph-client";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Environment variables
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID") || "";
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET") || "";
const MICROSOFT_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "";
const MICROSOFT_ADMIN_EMAIL = Deno.env.get("MICROSOFT_ADMIN_EMAIL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const NODE_ENV = Deno.env.get("NODE_ENV") || "production";
// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Folder structure constants
const FOLDER_STRUCTURE = {
  ROOT: "HDFHR-System",
  COMPANIES: "Companies",
  DOCUMENT_TYPES: {
    MEDICAL_CERTIFICATES: "Medical-Certificates",
    EMPLOYEE_DOCUMENTS: "Employee-Documents",
    TASK_ATTACHMENTS: "Task-Attachments",
    RECEIPTS: "Receipts",
    AHV_CARDS: "AHV-Cards",
    ID_CARDS: "ID-Cards",
  },
  REPORT_TYPES: {
    ACCIDENT: "Accident-Reports",
    ILLNESS: "Illness-Reports",
    DEPARTURE: "Departure-Reports",
    RECEIPT: "Company-Receipts",
  },
};

// File naming and validation
const FILE_CONSTANTS = {
  PREFIXES: {
    MEDICAL_CERTIFICATE: "med-cert",
    AHV_CARD: "ahv-card",
    ID_CARD: "id-card",
    TASK_ATTACHMENT: "task-attach",
    RECEIPT: "receipt",
  },
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/heic",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  MAX_FILENAME_LENGTH: 100,
};

// Generate unique filename with meaningful components
function generateUniqueFilename(
  originalFilename: string,
  reportType: string,
  metadata: any
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileExtension = originalFilename.split(".").pop()?.toLowerCase() || "";

  // Get sequence IDs
  const companySeqId = metadata.company_sequence_id || "";
  const employeeSeqId = metadata.company_user_sequence_id || "";
  const formSeqId = metadata.form_sequence_id || "";

  // Create meaningful filename components
  let prefix = FILE_CONSTANTS.PREFIXES.MEDICAL_CERTIFICATE;
  let reportTypeShort = "DOC";

  // Set appropriate prefix and report type based on the report type
  if (reportType === "accident_report") {
    prefix = FILE_CONSTANTS.PREFIXES.MEDICAL_CERTIFICATE;
    reportTypeShort = "ACC";
  } else if (reportType === "illness_report") {
    prefix = FILE_CONSTANTS.PREFIXES.MEDICAL_CERTIFICATE;
    reportTypeShort = "ILL";
  } else if (reportType === "company_receipt") {
    prefix = FILE_CONSTANTS.PREFIXES.RECEIPT;
    reportTypeShort = "REC";
  }

  // Format: prefix_reportType_companySeqId_employeeSeqId_formSeqId_timestamp.ext
  return `${prefix}_${reportTypeShort}_C${companySeqId}_E${employeeSeqId}_${formSeqId ? `F${formSeqId}_` : ""}${timestamp}.${fileExtension}`;
}

// Build folder path with company and employee names if available
function buildFolderPath(
  companyId: string,
  employeeId: string,
  reportType: string,
  metadata: any
) {
  // Get company and employee sequence IDs
  const companySeqId = metadata.company_sequence_id;
  const employeeSeqId = metadata.company_user_sequence_id;

  if (!companySeqId) {
    throw new Error("Company sequence ID is required");
  }

  // Get company and employee names from metadata if available
  const companyName = metadata.company_name
    ? `C${companySeqId}-${sanitizeFolderName(metadata.company_name)}`
    : `C${companySeqId}`;

  // Handle different report types
  if (reportType === "company_receipt") {
    // Company receipts go in a different folder structure
    return `/${FOLDER_STRUCTURE.ROOT}/${FOLDER_STRUCTURE.COMPANIES}/${companyName}/${FOLDER_STRUCTURE.DOCUMENT_TYPES.RECEIPTS}/${FOLDER_STRUCTURE.REPORT_TYPES.RECEIPT}`;
  } else {
    // For employee-related documents, require employee sequence ID
    if (!employeeSeqId) {
      throw new Error(
        "Employee sequence ID is required for employee documents"
      );
    }

    const employeeName = metadata.employee_name
      ? `E${employeeSeqId}-${sanitizeFolderName(metadata.employee_name)}`
      : `E${employeeSeqId}`;

    const reportFolder =
      reportType === "accident_report"
        ? FOLDER_STRUCTURE.REPORT_TYPES.ACCIDENT
        : FOLDER_STRUCTURE.REPORT_TYPES.ILLNESS;

    return `/${FOLDER_STRUCTURE.ROOT}/${FOLDER_STRUCTURE.COMPANIES}/${companyName}/Employees/${employeeName}/${FOLDER_STRUCTURE.DOCUMENT_TYPES.MEDICAL_CERTIFICATES}/${reportFolder}`;
  }
}

// Sanitize folder names to be valid
function sanitizeFolderName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-") // Replace invalid chars with hyphen
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .slice(0, 50); // Limit length
}

// Validate folder name
function isValidFolderName(name: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(name);
}

// Validate file
function validateFile(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
    );
  }

  // Check mime type
  if (!FILE_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `File type ${file.type} is not allowed. Allowed types: ${FILE_CONSTANTS.ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  // Check filename length
  if (file.name.length > FILE_CONSTANTS.MAX_FILENAME_LENGTH) {
    throw new Error(
      `Filename is too long. Maximum length is ${FILE_CONSTANTS.MAX_FILENAME_LENGTH} characters`
    );
  }

  return true;
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Environment-specific configurations
const config = {
  development: {
    maxFileSize: 20 * 1024 * 1024,
    allowedOrigins: [
      "http://localhost:8081",
      "http://localhost:3000",
      "http://localhost:19006",
      "capacitor://localhost",
      "ionic://localhost",
      "https://hdfhr.netlify.app",
    ],
    logLevel: "debug",
  },
  production: {
    maxFileSize: 10 * 1024 * 1024,
    allowedOrigins: [
      "https://hdfhr.netlify.app",
      ...(Deno.env.get("ADDITIONAL_ALLOWED_ORIGINS") || "")
        .split(",")
        .filter(Boolean),
    ],
    logLevel: "error",
  },
};
const envConfig =
  config[NODE_ENV === "development" ? "development" : "production"];
// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-version",
};
// Logger function with environment-specific behavior
function logger(level, message, data) {
  if (NODE_ENV === "development" || level === "error") {
    console.log(`[${level.toUpperCase()}] ${message}`, data || "");
  }
}
// Initialize Microsoft Graph Client
async function initializeGraphClient() {
  try {
    // Get access token using client credentials flow
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      }
    );
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token response error:", errorData);
      throw new Error("Failed to get access token");
    }
    const { access_token } = await tokenResponse.json();
    // Initialize Graph client with the access token
    return Client.init({
      authProvider: (done) => done(null, access_token),
    });
  } catch (error) {
    console.error("Failed to initialize Graph client:", error);
    throw error;
  }
}

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 5000, // 5 seconds
};

// Helper function for exponential backoff
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry wrapper function
async function withRetry(operation, retryCount = 0) {
  try {
    return await operation();
  } catch (error) {
    if (retryCount >= RETRY_CONFIG.MAX_RETRIES) {
      throw error;
    }

    const delay = Math.min(
      RETRY_CONFIG.INITIAL_DELAY * Math.pow(2, retryCount),
      RETRY_CONFIG.MAX_DELAY
    );

    console.log(`Retry attempt ${retryCount + 1} after ${delay}ms`);
    await sleep(delay);
    return withRetry(operation, retryCount + 1);
  }
}

// Create sharing link for the file
async function createSharingLink(graphClient, itemId) {
  try {
    const permission = {
      type: "view",
      scope: "anonymous",
    };

    const response = await graphClient
      .api(`/users/${MICROSOFT_ADMIN_EMAIL}/drive/items/${itemId}/createLink`)
      .post({
        type: "view",
        scope: "anonymous",
      });

    return response.link;
  } catch (error) {
    console.error("Error creating sharing link:", error);
    throw error;
  }
}

// Upload file to OneDrive
async function uploadFileToOneDrive(
  graphClient,
  file,
  companyId,
  employeeId,
  fileName,
  mimeType,
  reportType,
  metadata
) {
  try {
    // Validate file first
    validateFile({ name: fileName, type: mimeType, size: file.byteLength });

    // Get additional metadata for folder naming
    const { data: companyData } = await supabase
      .from("company")
      .select("company_name, company_sequence_id")
      .eq("id", companyId)
      .single();

    let employeeData = null;
    if (reportType !== "company_receipt") {
      // Only fetch employee data for employee-related documents
      const { data: empData } = await supabase
        .from("company_user")
        .select("first_name, last_name, company_user_sequence_id")
        .eq("id", employeeId)
        .single();

      employeeData = empData;
    }

    // Get form sequence ID based on report type
    let reportData = null;
    if (
      reportType !== "company_receipt" &&
      metadata.reportId &&
      metadata.reportId !== "temp"
    ) {
      const { data: repData } = await supabase
        .from(reportType)
        .select("form_sequence_id")
        .eq("id", metadata.reportId)
        .single();

      reportData = repData;
    }

    // Combine metadata
    const enrichedMetadata = {
      ...metadata,
      company_name: companyData?.company_name,
      company_sequence_id: companyData?.company_sequence_id,
      employee_name: employeeData
        ? `${employeeData.first_name}-${employeeData.last_name}`
        : undefined,
      company_user_sequence_id: employeeData?.company_user_sequence_id,
      form_sequence_id: reportData?.form_sequence_id,
    };

    const basePath = buildFolderPath(
      companyId,
      employeeId,
      reportType,
      enrichedMetadata
    );
    await ensureFolderPath(graphClient, basePath);

    // Generate unique filename using the new function
    const uniqueFileName = generateUniqueFilename(
      fileName,
      reportType,
      enrichedMetadata
    );
    const filePath = `${basePath}/${uniqueFileName}`;

    // Upload file to OneDrive using admin's drive with retry logic
    const response = await withRetry(async () => {
      try {
        return await graphClient
          .api(
            `/users/${MICROSOFT_ADMIN_EMAIL}/drive/root:${filePath}:/content`
          )
          .header("Content-Type", mimeType)
          .put(file);
      } catch (uploadError) {
        // Enhance error information
        const errorDetails = await uploadError?.response?.text?.();
        const enhancedError = new Error(
          `Upload failed: ${errorDetails || uploadError.message}`
        );
        enhancedError.originalError = uploadError;
        enhancedError.context = {
          filePath,
          mimeType,
          fileSize: file.byteLength,
        };
        throw enhancedError;
      }
    });

    // Create sharing link
    console.log("Creating sharing link for item:", response.id);
    const sharingLink = await createSharingLink(graphClient, response.id);
    console.log("Sharing link created:", sharingLink);

    return {
      filePath,
      driveId: response.parentReference.driveId,
      itemId: response.id,
      webUrl: response.webUrl,
      sharingLink: sharingLink.webUrl,
      fileName: uniqueFileName,
      mimeType,
    };
  } catch (error) {
    console.error("Graph API upload error:", {
      error: error.message,
      context: error.context,
      originalError: error.originalError,
    });
    throw error;
  }
}

// Ensure folder path exists
async function ensureFolderPath(graphClient, path) {
  const folders = path.split("/").filter(Boolean);
  let currentPath = "";

  for (const folder of folders) {
    currentPath += `/${folder}`;

    await withRetry(async () => {
      try {
        await graphClient
          .api(`/users/${MICROSOFT_ADMIN_EMAIL}/drive/root:${currentPath}`)
          .get();
      } catch (error) {
        if (error.statusCode === 404) {
          // Folder doesn't exist, create it
          await graphClient
            .api(`/users/${MICROSOFT_ADMIN_EMAIL}/drive/root:${currentPath}`)
            .header("Content-Type", "application/json")
            .put({
              name: folder,
              folder: {},
              "@microsoft.graph.conflictBehavior": "replace",
            });
        } else {
          throw error;
        }
      }
    });
  }
}

// Create document record and update report
async function createDocumentAndUpdateReport(
  uploadResult,
  reportId,
  reportType,
  companyId,
  employeeId,
  uploadedBy
) {
  // Handle company receipts differently
  if (reportType === "company_receipt") {
    // For receipts, update the receipt record with the sharing link and file details
    if (reportId && reportId !== "temp") {
      const { error: updateError } = await supabase
        .from("receipts")
        .update({
          receipt_image_path: uploadResult.sharingLink,
          updated_at: new Date().toISOString(),
          // Add any other relevant file details you want to store
          // but don't use document_id since we're not creating document records for receipts
        })
        .eq("id", reportId);

      if (updateError) {
        console.error("Error updating receipt with file details:", updateError);
        throw updateError;
      }
    }

    return {
      document: {
        file_path: uploadResult.filePath,
        file_url: uploadResult.sharingLink,
        id: null, // No document record needed for receipts
      },
      report: null,
    };
  }

  // Handle other document types (medical certificates, etc.)
  const { data: document, error: documentError } = await supabase
    .from("employee_documents")
    .insert([
      {
        company_id: companyId,
        employee_id: employeeId,
        document_type:
          reportType === "accident_report"
            ? "MEDICAL_CERTIFICATE"
            : "ILLNESS_CERTIFICATE",
        reference_type: reportType,
        reference_id: reportId,
        file_path: uploadResult.filePath,
        drive_id: uploadResult.driveId,
        item_id: uploadResult.itemId,
        file_url: uploadResult.sharingLink,
        file_name: uploadResult.fileName,
        mime_type: uploadResult.mimeType,
        uploaded_by: uploadedBy,
        status: "active",
      },
    ])
    .select()
    .single();

  if (documentError) throw documentError;

  // Update the report with the document ID
  const { data: report, error: reportError } = await supabase
    .from(reportType)
    .update({
      medical_certificate: document.id,
    })
    .eq("id", reportId)
    .select()
    .single();

  if (reportError) throw reportError;

  return {
    document,
    report,
  };
}

// Log activity
async function logActivity(
  userId,
  companyId,
  activityType,
  description,
  oldValue,
  newValue,
  metadata
) {
  try {
    const { error } = await supabase.from("activity_logs").insert([
      {
        user_id: userId,
        company_id: companyId,
        activity_type: activityType,
        description,
        old_value: oldValue,
        new_value: newValue,
        metadata,
        ip_address: null,
        user_agent: null,
      },
    ]);
    if (error) throw error;
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - we don't want to fail the upload if logging fails
  }
}

// Update document record after deletion
async function updateDocumentAfterDeletion(documentId, userId, companyId) {
  try {
    // First get the document details for logging
    const { data: document, error: fetchError } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError) throw fetchError;

    // Update the document status to deleted - using updated_at instead of modified_at
    const { error: updateError } = await supabase
      .from("employee_documents")
      .update({
        status: "deleted",
        updated_at: new Date().toISOString(),
        // Don't use modified_at/modified_by as they don't exist
      })
      .eq("id", documentId);

    if (updateError) throw updateError;

    // Log the activity
    await logActivity(
      userId,
      companyId,
      "MEDICAL_CERTIFICATE_DELETE",
      `Medical certificate deleted: ${document.file_name}`,
      {
        document_status: document.status,
        file_path: document.file_path,
      },
      {
        document_status: "deleted",
      },
      {
        documentId: documentId,
        fileName: document.file_name,
        fileType: document.mime_type,
        reportId: document.reference_id,
        reportType: document.reference_type,
      }
    );

    return { success: true, document };
  } catch (error) {
    console.error("Error updating document after deletion:", error);
    throw error;
  }
}

// Add new function to delete file from OneDrive
async function deleteFileFromOneDrive(graphClient, itemId) {
  try {
    console.log(`Attempting to delete file with item ID: ${itemId}`);

    // Delete the file using Microsoft Graph API
    try {
      await withRetry(async () => {
        try {
          return await graphClient
            .api(`/users/${MICROSOFT_ADMIN_EMAIL}/drive/items/${itemId}`)
            .delete();
        } catch (deleteError) {
          // Check if the error is "item not found" (404) - if so, consider it a success
          if (deleteError.statusCode === 404) {
            console.log(
              `Item ${itemId} not found, considering deletion successful`
            );
            return { success: true };
          }

          // For other errors, enhance error information
          const errorDetails = await deleteError?.response?.text?.();
          const enhancedError = new Error(
            `Delete failed: ${errorDetails || deleteError.message}`
          );
          enhancedError.originalError = deleteError;
          enhancedError.context = {
            itemId,
          };
          throw enhancedError;
        }
      });
    } catch (error) {
      // If the error is "item not found", consider it successful
      if (error.originalError && error.originalError.statusCode === 404) {
        console.log(
          `Item ${itemId} not found after retries, considering deletion successful`
        );
        return { success: true };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Graph API delete error:", {
      error: error.message,
      context: error.context,
      originalError: error.originalError,
    });
    throw error;
  }
}

serve(async (req) => {
  // Log all incoming request details
  console.log("Request details:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  try {
    // Log request method
    console.log(`Processing ${req.method} request`);

    // Handle DELETE requests for file deletion
    if (req.method === "DELETE") {
      // Verify authorization
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing authorization header",
          }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Parse request body
      let requestData;
      try {
        requestData = await req.json();
        console.log("Received delete request data:", requestData);
      } catch (e) {
        console.error("Failed to parse JSON data:", e);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid JSON data",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Validate required fields for deletion
      const { itemId, documentId, userId, companyId, reportId, reportType } =
        requestData;

      if (!itemId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Item ID is required for deletion",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!documentId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Document ID is required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!userId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "User ID is required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!companyId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Company ID is required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Initialize Graph client
      const graphClient = await initializeGraphClient();

      // Delete file from OneDrive
      await deleteFileFromOneDrive(graphClient, itemId);

      // Update document record
      const { document } = await updateDocumentAfterDeletion(
        documentId,
        userId,
        companyId
      );

      // Update the report to remove the document reference if reportId and reportType are provided
      if (reportId && reportType) {
        const { error: reportError } = await supabase
          .from(reportType)
          .update({
            medical_certificate: null,
            document_id: null,
            updated_at: new Date().toISOString(), // Use updated_at instead of modified_at
            // Don't use modified_by as it might not exist
          })
          .eq("id", reportId);

        if (reportError) {
          console.error("Error updating report:", reportError);
        }
      }

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: "File deleted successfully",
          document,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: `Method ${req.method} not allowed`,
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Original POST request handling for file upload continues here
    // Verify authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // Get and validate request body
    let formData;
    try {
      formData = await req.formData();
      console.log(
        "Received form data with fields:",
        Array.from(formData.keys())
      );
    } catch (e) {
      console.error("Failed to parse form data:", e);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid form data",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // Get form fields
    const file = formData.get("file");
    const companyId = formData.get("companyId");
    const employeeId = formData.get("employeeId");
    const uploadedBy = formData.get("uploadedBy");
    const reportId = formData.get("reportId");
    const reportType = formData.get("reportType");

    // Parse metadata
    let metadata;
    try {
      const metadataStr = formData.get("metadata");
      metadata = metadataStr ? JSON.parse(metadataStr as string) : {};
      // Ensure reportId is available in metadata
      metadata.reportId = reportId;
    } catch (error) {
      console.error("Error parsing metadata:", error);
      metadata = { reportId };
    }

    // Validate required fields
    if (!file) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "File is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!companyId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Company ID is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!employeeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Employee ID is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!reportId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Report ID is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!reportType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Report type is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // Update to allow company_receipt as a valid report type
    if (
      !["accident_report", "illness_report", "company_receipt"].includes(
        reportType
      )
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid report type",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // Initialize Graph client
    const graphClient = await initializeGraphClient();
    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    // Upload file to OneDrive
    const uploadResult = await uploadFileToOneDrive(
      graphClient,
      uint8Array,
      companyId,
      employeeId,
      file.name,
      file.type,
      reportType,
      metadata
    );
    // Create document record and update report
    const { document, report } = await createDocumentAndUpdateReport(
      uploadResult,
      reportId,
      reportType,
      companyId,
      employeeId,
      uploadedBy
    );
    // Log the activity with appropriate activity type
    let activityType = "MEDICAL_CERTIFICATE_UPLOAD";
    if (reportType === "company_receipt") {
      activityType = "RECEIPT_UPLOAD";
    }

    await logActivity(
      uploadedBy,
      companyId,
      activityType,
      `${reportType === "company_receipt" ? "Receipt" : "Medical certificate"} uploaded for ${reportType} ${reportId}`,
      {
        document_path: null,
      },
      {
        document_path: uploadResult.filePath,
      },
      {
        documentId: document.id,
        fileName: uploadResult.fileName,
        fileType: uploadResult.mimeType,
        fileSize: file.size,
        reportId,
        reportType,
      }
    );
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          filePath: uploadResult.filePath,
          driveId: uploadResult.driveId,
          itemId: uploadResult.itemId,
          webUrl: uploadResult.webUrl,
          sharingLink: uploadResult.sharingLink,
          fileName: uploadResult.fileName,
          mimeType: uploadResult.mimeType,
          document,
          report,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
