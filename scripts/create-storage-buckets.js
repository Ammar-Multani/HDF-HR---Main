const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase credentials. Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file."
  );
  process.exit(1);
}

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStorageBuckets() {
  try {
    console.log("Setting up storage buckets in Supabase...");

    // Create task-attachments bucket if it doesn't exist
    const { data: existingBuckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }

    const taskAttachmentsBucketExists = existingBuckets.some(
      (bucket) => bucket.name === "task-attachments"
    );

    if (!taskAttachmentsBucketExists) {
      console.log("Creating task-attachments bucket...");
      const { error: createError } = await supabase.storage.createBucket(
        "task-attachments",
        {
          public: false,
          fileSizeLimit: 10485760, // 10 MB limit
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
          ],
        }
      );

      if (createError) {
        console.error("Error creating task-attachments bucket:", createError);
        return;
      }

      // Set up bucket policy for task attachments
      const { error: policyError } = await supabase.storage
        .from("task-attachments")
        .createPolicy("Authenticated users can upload files", {
          name: "authenticated_upload",
          definition: {
            role: "authenticated",
            operation: "INSERT",
          },
        });

      if (policyError) {
        console.error("Error setting up bucket policy:", policyError);
        return;
      }

      // Create a policy for downloading files
      const { error: downloadPolicyError } = await supabase.storage
        .from("task-attachments")
        .createPolicy("Authenticated users can download files", {
          name: "authenticated_download",
          definition: {
            role: "authenticated",
            operation: "SELECT",
          },
        });

      if (downloadPolicyError) {
        console.error("Error setting up download policy:", downloadPolicyError);
        return;
      }

      console.log("✅ Task attachments bucket created successfully!");
    } else {
      console.log("✅ Task attachments bucket already exists.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Execute the function
createStorageBuckets();
