import * as Linking from "expo-linking";

// Configure linking for deep linking and web URLs
export const linking = {
  prefixes: [
    "hdf-hr://", // Your app's URL scheme
    "https://hdfhr.netlify.app", // Your Netlify domain
  ],
  config: {
    screens: {
      // Auth screens
      Login: "",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResetPassword: {
        path: "reset-password",
        parse: {
          token: (token: string) => token,
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
};
