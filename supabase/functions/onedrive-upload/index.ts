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
};
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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
// Upload file to OneDrive
async function uploadFileToOneDrive(
  graphClient,
  file,
  companyId,
  employeeId,
  fileName,
  mimeType,
  reportType
) {
  try {
    // Create folder structure if it doesn't exist
    const basePath1 = `/Companies/${companyId}/Employees/${employeeId}/MedicalCertificates/${reportType}`;
    await ensureFolderPath(graphClient, basePath1);
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `medical_certificate_${timestamp}.${fileExtension}`;
    const filePath = `${basePath1}/${uniqueFileName}`;
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
async function ensureFolderPath(graphClient, path) {
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
  uploadResult,
  reportId,
  reportType,
  companyId,
  employeeId,
  uploadedBy
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
    if (!["accident_report", "illness_report"].includes(reportType)) {
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
      reportType
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
    // Log the activity
    await logActivity(
      uploadedBy,
      companyId,
      "MEDICAL_CERTIFICATE_UPLOAD",
      `Medical certificate uploaded for ${reportType} ${reportId}`,
      {
        medical_certificate: report.medical_certificate,
      },
      {
        medical_certificate: uploadResult.filePath,
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
          ...uploadResult,
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
