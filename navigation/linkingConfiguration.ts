import * as Linking from "expo-linking";

// Configure linking for deep linking and web URLs
export const linking = {
  prefixes: [
    "hdf-hr://", // Your app's URL scheme
    "https://hdfhr.netlify.app", // Your Netlify domain
  ],
  config: {
    screens: {
      MainContent: {
        screens: {
          // Auth screens
          Login: "",
          Register: "register",
          ForgotPassword: "forgot-password",

          // Super Admin screens
          SuperAdminTabs: {
            path: "admin",
            screens: {
              Dashboard: "",
              Companies: "companies",
              Users: "users",
              Forms: "forms",
              Receipts: "receipts",
              Tasks: "tasks",
              Profile: "profile",
              CompanyDetails: "company/:id",
              CreateCompany: "company/create",
              EditCompany: "company/:id/edit",
              TaskDetails: "task/:id",
              CreateTask: "task/create",
              EditTask: "task/:id/edit",
            },
          },

          // Company Admin screens
          CompanyAdminTabs: {
            path: "company",
            screens: {
              Dashboard: "",
              Employees: "employees",
              Tasks: "tasks",
              FormSubmissions: "forms",
              Profile: "profile",
              EmployeeDetails: "employee/:id",
              CreateEmployee: "employee/create",
              EditEmployee: "employee/:id/edit",
              TaskDetails: "task/:id",
              CreateTask: "task/create",
              EditTask: "task/:id/edit",
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
      // Reset password screen available at root level
      ResetPassword: {
        path: "reset-password/:token",
        parse: {
          token: (token: string) => token,
        },
      },
    },
  },
};
