import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const NODE_ENV = Deno.env.get("NODE_ENV") || "production";
// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-version",
};
// Logger function
const logDebug = (...args) => {
  console.log(...args);
};
// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email);
}
// Function to map role names to database enum values
function mapRoleToDbEnum(role) {
  const roleMapping = {
    company_admin: "admin",
    admin: "admin",
    employee: "employee",
    super_admin: "superadmin",
  };
  return roleMapping[role] || role;
}
// Function to check if user exists by email
async function checkUserExists(email) {
  try {
    console.log(`Checking user existence for: ${email}`);
    // Method 1: Check in admin table
    const { data: adminUser, error: adminError } = await supabase
      .from("admin")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (adminError) {
      console.log(`Admin table check error: ${adminError.message}`);
    }
    if (adminUser) {
      console.log(`User found in admin table: ${email}`);
      return {
        exists: true,
        user: null,
      };
    }
    // Method 2: Check in company_user table
    const { data: companyUser, error: companyError } = await supabase
      .from("company_user")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (companyError) {
      console.log(`Company_user table check error: ${companyError.message}`);
    }
    if (companyUser) {
      console.log(`User found in company_user table: ${email}`);
      return {
        exists: true,
        user: null,
      };
    }
    // Method 3: Check auth users using listUsers (less efficient but works)
    try {
      const { data: authUsers, error: listError } =
        await supabase.auth.admin.listUsers();
      if (!listError && authUsers?.users) {
        const existingUser = authUsers.users.find(
          (user) => user.email === email
        );
        if (existingUser) {
          console.log(`User found in auth.users: ${email}`);
          return {
            exists: true,
            user: existingUser,
          };
        }
      }
    } catch (listError) {
      console.log(`Auth list users failed: ${listError}`);
    }
    console.log(`User does not exist: ${email}`);
    return {
      exists: false,
      user: null,
    };
  } catch (error) {
    console.error("Error in checkUserExists:", error);
    return {
      exists: false,
      user: null,
    };
  }
}
// Function to create a user and handle role-specific operations
async function createUserWithRole(params) {
  const { email, password, user_metadata, email_confirm = true } = params;
  try {
    console.log(`Starting user creation for: ${email}`);
    console.log(`User metadata:`, JSON.stringify(user_metadata, null, 2));
    // Validate inputs
    if (!email || !password) {
      return {
        user: null,
        error: {
          code: "validation_error",
          message: "Email and password are required",
        },
      };
    }
    if (!isValidEmail(email)) {
      return {
        user: null,
        error: {
          code: "validation_error",
          message: "Invalid email format",
        },
      };
    }
    if (password.length < 6) {
      return {
        user: null,
        error: {
          code: "validation_error",
          message: "Password must be at least 6 characters long",
        },
      };
    }
    // Check if user already exists
    const { exists } = await checkUserExists(email);
    if (exists) {
      console.log(`User already exists: ${email}`);
      return {
        user: null,
        error: {
          code: "user_exists",
          message: `User with email ${email} already exists`,
          details: {
            email,
          },
        },
      };
    }
    // Create user in Supabase Auth
    const createUserPayload = {
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: email_confirm,
    };
    console.log(
      `Creating auth user with simplified payload:`,
      JSON.stringify(createUserPayload, null, 2)
    );
    const { data: authUser, error: createError } =
      await supabase.auth.admin.createUser(createUserPayload);
    if (createError) {
      console.error("Error creating auth user:", createError);
      return {
        user: null,
        error: {
          code: "auth_error",
          message: createError.message,
          details: createError,
        },
      };
    }
    if (!authUser?.user) {
      console.error("No user returned from auth creation");
      return {
        user: null,
        error: {
          code: "creation_failed",
          message: "No user returned from auth creation",
        },
      };
    }
    console.log(`Auth user created successfully: ${authUser.user.id}`);
    // Update user metadata
    if (user_metadata && Object.keys(user_metadata).length > 0) {
      console.log("Updating user metadata...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.user.id,
        {
          user_metadata: {
            ...user_metadata,
            created_at: new Date().toISOString(),
            email: email.toLowerCase().trim(),
          },
        }
      );
      if (updateError) {
        console.error("Error updating user metadata:", updateError);
      }
    }
    // Based on the role, insert into appropriate table
    try {
      if (user_metadata.role === "employee") {
        if (!user_metadata.company_id) {
          console.error("Company ID missing for employee");
          await supabase.auth.admin.deleteUser(authUser.user.id);
          return {
            user: null,
            error: {
              code: "validation_error",
              message: "company_id is required for employees",
            },
          };
        }
        const dbRole = mapRoleToDbEnum(user_metadata.role);
        console.log(
          `Creating employee record for company: ${user_metadata.company_id}`
        );
        const companyUserData = {
          id: authUser.user.id,
          company_id: user_metadata.company_id,
          email: email.toLowerCase().trim(),
          role: dbRole,
          first_name: user_metadata.first_name || "",
          last_name: user_metadata.last_name || "",
          active_status: "active",
          created_at: new Date().toISOString(),
          phone_number: user_metadata.phone_number,
          nationality: user_metadata.nationality,
          date_of_birth: user_metadata.date_of_birth,
          marital_status: user_metadata.marital_status,
          gender: user_metadata.gender,
          employment_start_date: user_metadata.employment_start_date,
          employment_end_date: user_metadata.employment_end_date,
          employment_type: user_metadata.employment_type,
          workload_percentage: user_metadata.workload_percentage,
          job_title: user_metadata.job_title,
          address: user_metadata.address,
          bank_details: user_metadata.bank_details,
          comments: user_metadata.comments,
          ahv_number: user_metadata.ahv_number,
          education: user_metadata.education,
          created_by: user_metadata.created_by,
        };
        console.log(
          "Inserting company user with data:",
          JSON.stringify(companyUserData, null, 2)
        );
        const { error: companyUserError } = await supabase
          .from("company_user")
          .insert([companyUserData]);
        if (companyUserError) {
          console.error(
            "Company user record creation failed:",
            companyUserError
          );
          await supabase.auth.admin.deleteUser(authUser.user.id);
          return {
            user: null,
            error: {
              code: "company_user_creation_failed",
              message: "Failed to create company user record",
              details: companyUserError,
            },
          };
        }
        console.log("Employee record created successfully");
      } else if (user_metadata.role === "super_admin") {
        console.log("Creating super admin record");
        const { error: adminError } = await supabase.from("admin").insert([
          {
            id: authUser.user.id,
            email: email.toLowerCase().trim(),
            role: "superadmin",
            status: true,
            name:
              `${user_metadata.first_name || ""} ${user_metadata.last_name || ""}`.trim() ||
              email,
            created_at: new Date().toISOString(),
          },
        ]);
        if (adminError) {
          console.error("Admin record creation failed:", adminError);
          // Rollback auth user creation
          await supabase.auth.admin.deleteUser(authUser.user.id);
          return {
            user: null,
            error: {
              code: "admin_creation_failed",
              message: "Failed to create admin record",
              details: adminError,
            },
          };
        }
        console.log("Super admin record created successfully");
      } else if (["company_admin", "employee"].includes(user_metadata.role)) {
        if (!user_metadata.company_id) {
          console.error("Company ID missing for company user");
          await supabase.auth.admin.deleteUser(authUser.user.id);
          return {
            user: null,
            error: {
              code: "validation_error",
              message: "company_id is required for company users",
            },
          };
        }
        // Map the role to the correct database enum value
        const dbRole = mapRoleToDbEnum(user_metadata.role);
        console.log(
          `Creating ${user_metadata.role} (db: ${dbRole}) record for company: ${user_metadata.company_id}`
        );
        const companyUserData = {
          id: authUser.user.id,
          company_id: user_metadata.company_id,
          email: email.toLowerCase().trim(),
          role: dbRole,
          first_name: user_metadata.first_name || "",
          last_name: user_metadata.last_name || "",
          active_status: "active",
          created_at: new Date().toISOString(),
        };
        // Only add optional fields if they have meaningful values
        if (
          user_metadata.phone_number &&
          user_metadata.phone_number !== "Not provided"
        ) {
          companyUserData.phone_number = user_metadata.phone_number;
        }
        if (
          user_metadata.nationality &&
          user_metadata.nationality !== "Not provided"
        ) {
          companyUserData.nationality = user_metadata.nationality;
        }
        if (
          user_metadata.date_of_birth &&
          user_metadata.date_of_birth !== new Date().toISOString()
        ) {
          companyUserData.date_of_birth = user_metadata.date_of_birth;
        }
        console.log(
          "Inserting company user with data:",
          JSON.stringify(companyUserData, null, 2)
        );
        const { error: companyUserError } = await supabase
          .from("company_user")
          .insert([companyUserData]);
        if (companyUserError) {
          console.error(
            "Company user record creation failed:",
            companyUserError
          );
          // Rollback auth user creation
          await supabase.auth.admin.deleteUser(authUser.user.id);
          return {
            user: null,
            error: {
              code: "company_user_creation_failed",
              message: "Failed to create company user record",
              details: companyUserError,
            },
          };
        }
        console.log(`${user_metadata.role} record created successfully`);
      }
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      // Rollback auth user creation
      try {
        await supabase.auth.admin.deleteUser(authUser.user.id);
      } catch (rollbackError) {
        console.error("Failed to rollback user creation:", rollbackError);
      }
      return {
        user: null,
        error: {
          code: "database_error",
          message: "Failed to create user records",
          details: dbError,
        },
      };
    }
    console.log(`User creation completed successfully for: ${email}`);
    return {
      user: authUser.user,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error in createUserWithRole:", error);
    return {
      user: null,
      error: {
        code: "unexpected_error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        details: error,
      },
    };
  }
}
// Function to create multiple users (for bulk employee creation)
async function createMultipleUsers(users) {
  const results = [];
  const errors = [];
  for (const user of users) {
    const { user: createdUser, error } = await createUserWithRole(user);
    if (error) {
      errors.push({
        email: user.email,
        error,
      });
    } else {
      results.push(createdUser);
    }
  }
  return {
    results,
    errors,
  };
}
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  try {
    if (req.method !== "POST") {
      throw new Error(`Method ${req.method} not allowed`);
    }
    // Get request body
    const requestData = await req.json();
    console.log("Received request:", JSON.stringify(requestData, null, 2));
    const { action } = requestData;
    if (!action) {
      throw new Error("Action is required");
    }
    let result;
    switch (action) {
      case "create_super_admin":
        console.log("Processing create_super_admin");
        result = await createUserWithRole({
          email: requestData.email,
          password: requestData.password,
          user_metadata: {
            role: "super_admin",
            created_by: requestData.created_by,
            first_name: requestData.first_name,
            last_name: requestData.last_name,
          },
        });
        break;
      case "create_company_admin":
        console.log("Processing create_company_admin");
        result = await createUserWithRole({
          email: requestData.email,
          password: requestData.password,
          user_metadata: {
            role: "company_admin",
            company_id: requestData.company_id,
            created_by: requestData.created_by,
            first_name: requestData.first_name,
            last_name: requestData.last_name,
          },
        });
        break;
      case "create_employee":
        console.log("Processing create_employee");
        result = await createUserWithRole({
          email: requestData.email,
          password: requestData.password,
          user_metadata: {
            role: "employee",
            company_id: requestData.company_id,
            created_by: requestData.created_by,
            first_name: requestData.first_name,
            last_name: requestData.last_name,
            department: requestData.department,
            position: requestData.position,
          },
        });
        break;
      case "create_multiple_employees":
        console.log("Processing create_multiple_employees");
        result = await createMultipleUsers(requestData.users);
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }
    console.log("Request processed successfully");
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "function_error",
          message: error.message,
          details: error,
        },
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
