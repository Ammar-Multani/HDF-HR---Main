import * as Linking from "expo-linking";

// Parse Supabase URL format (converts # to ? for proper parameter parsing)
const parseSupabaseUrl = (url: string) => {
  return url.includes("#") ? url.replace("#", "?") : url;
};

// Configure linking for deep linking and web URLs
export const linking = {
  prefixes: [
    "hdf-hr://", // Your app's URL scheme
    "https://hdf-hr.vercel.app", // Your Netlify domain
    "http://localhost:8081", // For local development
    Linking.createURL("/"),
  ],
  config: {
    screens: {
      // Auth screens
      Login: "",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResetPassword: {
        path: "auth/reset-password",
        parse: {
          token: (token: string) => token,
          access_token: (token: string) => token,
          refresh_token: (token: string) => token,
          type: (type: string) => type,
        },
      },

      // Super Admin Main Navigation
      MainTabs: {
        path: "admin",
        screens: {
          Dashboard: "",
          Companies: "companies",
          Users: "users",
          Forms: "forms",
          Receipts: "receipts",
          Tasks: "tasks",
          Profile: "profile",
        },
      },

      // Super Admin Detail Screens
      CompanyDetails: "admin/company/:companyId",
      CreateCompany: "admin/company/create",
      EditCompany: "admin/company/:companyId/edit",
      TaskDetails: "admin/task/:id",
      CreateTask: "admin/task/create",
      EditTask: "admin/task/:id/edit",
      CreateSuperAdmin: "admin/user/create",
      SuperAdminDetailsScreen: "admin/user/:id",
      EditSuperAdmin: "admin/user/:id/edit",
      CompanyAdminDetailsScreen: "admin/company-admin/:id",
      EditCompanyAdmin: "admin/company-admin/:id/edit",
      CreateCompanyAdmin: "admin/company-admin/create",
      CreateEmployee: "admin/employee/create",
      SuperAdminFormDetailsScreen: "admin/form/:id",
      SuperAdminCreateEmployeeAccidentReport: "admin/form/accident/create",
      SuperAdminCreateEmployeeIllnessReport: "admin/form/illness/create",
      SuperAdminCreateEmployeeStaffDeparture: "admin/form/departure/create",
      CreateReceipt: "admin/receipt/create",
      ReceiptDetails: "admin/receipt/:id",
      EditReceipt: "admin/receipt/:id/edit",
      ActivityLogs: "admin/logs",

      // Company Admin screens
      CompanyAdminTabs: {
        path: "company-admin",
        screens: {
          Dashboard: "",
          Employees: "employees",
          Tasks: "tasks",
          FormSubmissions: "forms",
          Receipts: "receipts",
          Profile: "profile",
          CreateCompanyReceipt: "receipts/create",
          CompanyReceiptDetails: "receipts/:receiptId",
          EditCompanyReceipt: "receipts/:receiptId/edit",
        },
      },

      // Employee screens
      EmployeeTabs: {
        path: "employee",
        screens: {
          Dashboard: "",
          Tasks: "tasks",
          Forms: "forms",
          Profile: "profile",
        },
      },
    },
  },
  getInitialURL: async () => {
    const url = await Linking.getInitialURL();
    if (url != null) {
      return parseSupabaseUrl(url);
    }
    return url;
  },
  subscribe: (listener: (url: string) => void) => {
    const onReceiveURL = ({ url }: { url: string }) => {
      const parsedUrl = parseSupabaseUrl(url);
      listener(parsedUrl);
    };

    // Listen for deep link events
    const subscription = Linking.addEventListener("url", onReceiveURL);

    return () => {
      subscription.remove();
    };
  },
};
