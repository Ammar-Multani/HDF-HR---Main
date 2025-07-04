import { NavigationProp } from "@react-navigation/native";

export type RootStackParamList = {
  MainContent: undefined;
  MainTabs: undefined;
  Dashboard: undefined;
  Companies: undefined;
  Users: undefined;
  Forms: undefined;
  Receipts: undefined;
  Tasks: undefined;
  Profile: undefined;
  CompanyDetails: { companyId: string };
  CreateCompany: undefined;
  EditCompany: { companyId: string };
  TaskDetails: { id: string };
  CreateTask: undefined;
  EditTask: { id: string };
  CreateSuperAdmin: undefined;
  SuperAdminDetailsScreen: { id: string };
  EditSuperAdmin: { id: string };
  CompanyAdminDetailsScreen: { id: string };
  EditCompanyAdmin: { id: string };
  CreateCompanyAdmin: undefined;
  CreateEmployee: undefined;
  SuperAdminFormDetailsScreen: { id: string };
  CreateReceipt: undefined;
  ReceiptDetails: { id: string };
  EditReceipt: { id: string };
  ActivityLogs: undefined;
  EmployeeDetails: { id: string };
  ReceiptsListScreen: undefined;
  SuperAdminFormsScreen: undefined;
  SuperAdminTasksScreen: undefined;
  Utilities: undefined;
  SuperAdminCreateEmployeeAccidentReport: undefined;
  SuperAdminCreateEmployeeIllnessReport: undefined;
  Login: undefined;
};

export type AppNavigationProp = NavigationProp<RootStackParamList>;

export interface NavigationItem {
  icon: string;
  label: string;
  screen: keyof RootStackParamList;
}
