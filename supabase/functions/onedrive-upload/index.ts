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

// Report types enum
const REPORT_TYPES = {
  ACCIDENT: "accident_report",
  ILLNESS: "illness_report",
} as const;

type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Environment-specific configurations
const config = {
  development: {
    maxFileSize: 20 * 1024 * 1024, // 20MB for testing
    allowedOrigins: [
      "http://localhost:8081",
      "http://localhost:3000",
      "http://localhost:19006", // Expo web
      "capacitor://localhost",
      "ionic://localhost",
    ],
    logLevel: "debug",
  },
  production: {
    maxFileSize: 10 * 1024 * 1024, // 10MB for production
    allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "")
      .split(",")
      .filter(Boolean),
    logLevel: "error",
  },
};

const envConfig =
  config[NODE_ENV === "development" ? "development" : "production"];

// Helper function to check if origin is allowed
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (envConfig.allowedOrigins.length === 0) return true; // If no origins specified, allow all
  return envConfig.allowedOrigins.some((allowed) => {
    // Handle wildcards
    if (allowed === "*") return true;
    if (allowed.endsWith("*")) {
      const prefix = allowed.slice(0, -1);
      return origin.startsWith(prefix);
    }
    return origin === allowed;
  });
}

// CORS headers function
function getCorsHeaders(origin: string | null) {
  // If origin is allowed, reflect it back, otherwise use "*"
  const allowedOrigin = isOriginAllowed(origin) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400", // 24 hours cache for preflight
    Vary: "Origin", // Important when using dynamic origins
  };
}

// Logger function with environment-specific behavior
function logger(level: string, message: string, data?: any) {
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

// Upload file to OneDrive
async function uploadFileToOneDrive(
  graphClient: any,
  file: Uint8Array,
  companyId: string,
  employeeId: string,
  fileName: string,
  mimeType: string,
  reportType: ReportType
) {
  try {
    // Create folder structure if it doesn't exist
    const basePath = `/Companies/${companyId}/Employees/${employeeId}/MedicalCertificates/${reportType}`;
    await ensureFolderPath(graphClient, basePath);

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `medical_certificate_${timestamp}.${fileExtension}`;
    const filePath = `${basePath}/${uniqueFileName}`;

    // Upload file to OneDrive using admin's drive
    const response = await graphClient
      .api(`/users/${MICROSOFT_ADMIN_EMAIL}/drive/root:${filePath}:/content`)
      .header("Content-Type", mimeType)
      .put(file);

    return {
      filePath,
      driveId: response.parentReference.driveId,
      itemId: response.id,
      webUrl: response.webUrl,
      fileName: uniqueFileName,
      mimeType,
    };
  } catch (error) {
    // Enhanced error logging
    const message = await error?.response?.text?.();
    console.error("Graph API upload error:", {
      error: message || error,
      path: basePath,
      fileName,
      mimeType,
    });
    throw new Error(message || error.message || "Failed to upload file");
  }
}

// Ensure folder path exists
async function ensureFolderPath(graphClient: any, path: string) {
  const folders = path.split("/").filter(Boolean);
  let currentPath = "";

  for (const folder of folders) {
    currentPath += `/${folder}`;
    try {
      await graphClient
        .api(`/users/${MICROSOFT_ADMIN_EMAIL}/drive/root:${currentPath}`)
        .get();
    } catch (error) {
      try {
        // Folder doesn't exist, create it
        await graphClient
          .api(`/users/${MICROSOFT_ADMIN_EMAIL}/drive/root:${currentPath}`)
          .header("Content-Type", "application/json")
          .put({
            name: folder,
            folder: {},
            "@microsoft.graph.conflictBehavior": "replace",
          });
      } catch (createError) {
        // Enhanced error logging for folder creation
        const message = await createError?.response?.text?.();
        console.error("Graph API folder creation error:", {
          error: message || createError,
          path: currentPath,
          folder,
        });
        throw new Error(
          message || createError.message || "Failed to create folder"
        );
      }
    }
  }
}

// Create document record and update report
async function createDocumentAndUpdateReport(
  uploadResult: any,
  reportId: string,
  reportType: ReportType,
  companyId: string,
  employeeId: string,
  uploadedBy: string
) {
  const { data: document, error: documentError } = await supabase
    .from("employee_documents")
    .insert([
      {
        company_id: companyId,
        employee_id: employeeId,
        document_type: "MEDICAL_CERTIFICATE",
        reference_type: reportType,
        reference_id: reportId,
        file_path: uploadResult.filePath,
        drive_id: uploadResult.driveId,
        item_id: uploadResult.itemId,
        file_url: uploadResult.webUrl,
        file_name: uploadResult.fileName,
        mime_type: uploadResult.mimeType,
        uploaded_by: uploadedBy,
        status: "active",
      },
    ])
    .select()
    .single();

  if (documentError) throw documentError;

  // Update the report with the document reference
  const { data: report, error: reportError } = await supabase
    .from(reportType)
    .update({
      medical_certificate: uploadResult.filePath,
      modified_at: new Date().toISOString(),
      modified_by: uploadedBy,
    })
    .eq("id", reportId)
    .select()
    .single();

  if (reportError) throw reportError;

  return { document, report };
}

// Log activity
async function logActivity(
  userId: string,
  companyId: string,
  activityType: string,
  description: string,
  oldValue: any,
  newValue: any,
  metadata: any
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
        ip_address: null, // Could be added if needed
        user_agent: null, // Could be added if needed
      },
    ]);

    if (error) throw error;
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - we don't want to fail the upload if logging fails
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Log incoming request in development
    if (NODE_ENV === "development") {
      logger("debug", "Incoming request", {
        method: req.method,
        origin,
        headers: Object.fromEntries(req.headers.entries()),
      });
    }

    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    let formData;
    try {
      formData = await req.formData();
      logger(
        "debug",
        "Received form data with fields:",
        Array.from(formData.keys())
      );
    } catch (e) {
      logger("error", "Failed to parse form data:", e);
      throw new Error("Invalid form data");
    }

    // Get form fields
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string;
    const employeeId = formData.get("employeeId") as string;
    const uploadedBy = formData.get("uploadedBy") as string;
    const reportId = formData.get("reportId") as string;
    const reportType = formData.get("reportType") as string;

    // Validate required fields
    if (!file) throw new Error("File is required");
    if (!companyId) throw new Error("Company ID is required");
    if (!employeeId) throw new Error("Employee ID is required");
    if (!reportId) throw new Error("Report ID is required");
    if (!reportType) throw new Error("Report type is required");
    if (!["accident_report", "illness_report"].includes(reportType)) {
      throw new Error("Invalid report type");
    }

    // Validate file size using environment-specific limit
    if (file.size > envConfig.maxFileSize) {
      throw new Error(
        `File size exceeds ${envConfig.maxFileSize / (1024 * 1024)}MB limit`
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
      reportType as ReportType
    );

    // Create document record and update report
    const { document, report } = await createDocumentAndUpdateReport(
      uploadResult,
      reportId,
      reportType as ReportType,
      companyId,
      employeeId,
      uploadedBy
    );

    // Log the activity
    await logActivity(
      uploadedBy,
      companyId,
      "MEDICAL_CERTIFICATE_UPLOAD",
      `Medical certificate uploaded for ${reportType} ${reportId}`,
      { medical_certificate: report.medical_certificate },
      { medical_certificate: uploadResult.filePath },
      {
        documentId: document.id,
        fileName: uploadResult.fileName,
        fileType: uploadResult.mimeType,
        fileSize: file.size,
        reportId,
        reportType,
      }
    );

    // Log success with environment-specific detail level
    logger(
      "info",
      "File uploaded successfully",
      NODE_ENV === "development" ? uploadResult : undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...uploadResult,
          document,
          report,
        },
        debug:
          NODE_ENV === "development"
            ? {
                environment: NODE_ENV,
                fileSize: file.size,
                timestamp: new Date().toISOString(),
              }
            : undefined,
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
    logger("error", "Function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        ...(NODE_ENV === "development"
          ? {
              details: error.stack,
              timestamp: new Date().toISOString(),
            }
          : {}),
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
});
