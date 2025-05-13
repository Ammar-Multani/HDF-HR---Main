import { supabase, createAuthClient } from "../lib/supabase";
import { generateJWT } from "./auth";

/**
 * Tests RLS policies by making requests with different user roles
 */
export const testRLSPolicies = async () => {
  try {
    console.log("=== TESTING RLS POLICIES ===");

    // 1. Super admin test
    console.log("\n--- TESTING SUPER ADMIN ACCESS ---");
    const superAdminId = "9b493703-31b0-406a-9be2-6a991448a245";
    const superAdminToken = await generateJWT({
      id: superAdminId,
      email: "aamultani.enacton@gmail.com",
      role: "superadmin",
    });

    // Create a client with super admin token
    const superAdminClient = createAuthClient(superAdminToken);

    // Test company access
    const { data: adminCompanyData, error: adminCompanyError } =
      await superAdminClient.from("company").select("*").limit(5);

    console.log("Super admin can access companies:", {
      success: !adminCompanyError,
      count: adminCompanyData?.length || 0,
      error: adminCompanyError?.message,
    });

    // 2. Company admin test
    console.log("\n--- TESTING COMPANY ADMIN ACCESS ---");
    const companyAdminId = "1687dcac-856a-4d9c-b613-f363934cd445";
    const companyId = "ef5501bc-e7dd-4196-8436-e548304618e7";

    const companyAdminToken = await generateJWT({
      id: companyAdminId,
      email: "test@gmail.com",
      role: "admin",
    });

    // Create a client with company admin token
    const companyAdminClient = createAuthClient(companyAdminToken);

    // Test company access (should only see their own company)
    const { data: companyAdminCompanyData, error: companyAdminCompanyError } =
      await companyAdminClient.from("company").select("*");

    console.log("Company admin can access companies:", {
      success: !companyAdminCompanyError,
      count: companyAdminCompanyData?.length || 0,
      error: companyAdminCompanyError?.message,
    });

    // Test company_user access (should only see users in their company)
    const { data: companyAdminUserData, error: companyAdminUserError } =
      await companyAdminClient.from("company_user").select("*");

    console.log("Company admin can access company users:", {
      success: !companyAdminUserError,
      count: companyAdminUserData?.length || 0,
      error: companyAdminUserError?.message,
    });

    // 3. Employee test
    console.log("\n--- TESTING EMPLOYEE ACCESS ---");
    const employeeId = "1199b0a6-bcd1-4d28-9748-a1ec96d897cb";

    const employeeToken = await generateJWT({
      id: employeeId,
      email: "test@outlook.com",
      role: "employee",
    });

    // Create a client with employee token
    const employeeClient = createAuthClient(employeeToken);

    // Test company access (should only see their own company)
    const { data: employeeCompanyData, error: employeeCompanyError } =
      await employeeClient.from("company").select("*");

    console.log("Employee can access companies:", {
      success: !employeeCompanyError,
      count: employeeCompanyData?.length || 0,
      error: employeeCompanyError?.message,
    });

    // Test company_user access (should see only self)
    const { data: employeeSelfData, error: employeeSelfError } =
      await employeeClient
        .from("company_user")
        .select("*")
        .eq("id", employeeId);

    console.log("Employee can access own data:", {
      success: !employeeSelfError,
      found: employeeSelfData && employeeSelfData.length > 0,
      error: employeeSelfError?.message,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("RLS test failed:", error);
    return {
      success: false,
      error,
    };
  }
};
