// User roles
export enum UserRole {
  SUPER_ADMIN = "superadmin",
  COMPANY_ADMIN = "admin",
  EMPLOYEE = "employee",
}

// User status
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// Task priority
export enum TaskPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

// Task status
export enum TaskStatus {
  OPEN = "Open",
  IN_PROGRESS = "In Progress",
  AWAITING_RESPONSE = "Awaiting Response",
  COMPLETED = "Completed",
  OVERDUE = "Overdue",
}

// Form status
export enum FormStatus {
  DRAFT = "draft",
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  APPROVED = "approved",
  DECLINED = "declined",
}

// ID types
export enum IDType {
  PASSPORT = "passport",
  ID_CARD = "id_card",
  DRIVERS_LICENSE = "drivers_license",
}

// Gender
export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

// Marital status
export enum MaritalStatus {
  SINGLE = "single",
  MARRIED = "married",
  DIVORCED = "divorced",
  WIDOWED = "widowed",
}

// Employment type
export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
  TEMPORARY = "temporary",
}

// Document types for staff departure
export enum DocumentType {
  LETTER_OF_TERMINATION = "letter_of_termination",
  WAGE_STATEMENT = "wage_statement",
  REFERENCE_LETTER = "reference_letter",
  EXIT_INTERVIEW = "exit_interview",
  RESIGNATION_LETTER = "resignation_letter",
  EQUIPMENT_RETURN = "equipment_return",
  FINAL_SETTLEMENT = "final_settlement",
  NON_DISCLOSURE = "non_disclosure",
  NON_COMPETE = "non_compete",
}

// Payment method
export enum PaymentMethod {
  CASH = "cash",
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  BANK_TRANSFER = "bank_transfer",
}

// User interface
export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

// Admin interface
export interface Admin extends User {
  name: string;
}

// Company interface
export interface Company {
  id: string;
  company_name: string;
  contact_number: string;
  contact_email: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  registration_number: string;
  industry_type: string;
  stakeholders: Array<{
    name: string;
    percentage: number;
  }>;
  vat_type: string;
}

// Company User interface
export interface CompanyUser {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  active_status: UserStatus;
  created_by: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  date_of_birth: string;
  nationality: string;
  id_type: IDType;
  ahv_number: string;
  marital_status: MaritalStatus;
  gender: Gender;
  employment_start_date: string;
  employment_end_date?: string;
  employment_type: EmploymentType;
  workload_percentage: number;
  job_title: string;
  education: string;
  ahv_card_path?: string;
  id_card_path?: string;
  bank_details: {
    bank_name: string;
    account_number: string;
    iban: string;
    swift_code: string;
  };
  comments?: string;
}

// Task interface
export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string | string[]; // User ID
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  reminder_days_before: number;
}

// Task Comment interface
export interface TaskComment {
  id: string;
  task_id: string;
  sender_id: string;
  company_id: string;
  message: string;
  created_at: string;
}

// Task Attachment interface
export interface TaskAttachment {
  id: string;
  task_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

// Accident Report interface
export interface AccidentReport {
  id: string;
  company_id: string;
  employee_id: string;
  accident_address: string;
  city: string;
  date_of_accident: string;
  time_of_accident: string;
  accident_description: string;
  objects_involved: string;
  injuries: string;
  accident_type: string;
  medical_certificate: string;
  comments?: string;
  created_at: string;
  updated_at: string;
  modified_at: string;
  modified_by: string;
  status: FormStatus;
}

// Illness Report interface
export interface IllnessReport {
  id: string;
  company_id: string;
  employee_id: string;
  leave_description: string;
  date_of_onset_leave: string;
  medical_certificate: string;
  comments?: string;
  submission_date: string;
  updated_at: string;
  modified_at: string;
  modified_by: string;
  status: FormStatus;
}

// Staff Departure Report interface
export interface StaffDepartureReport {
  id: string;
  company_id: string;
  employee_id: string;
  exit_date: string;
  comments?: string;
  documents_required: DocumentType[];
  documents_submitted?: Record<DocumentType, string | null>;
  status: FormStatus;
  submission_date: string;
  updated_at: string;
  modified_at: string;
  modified_by: string;
}

// Receipt interface
export interface Receipt {
  id: string;
  company_id: string;
  receipt_number: string;
  date: string;
  merchant_name: string;
  line_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total_amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  merchant_address: string;
  receipt_image_path: string;
  ocr_result?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Document picker related types
export interface DocumentUpload {
  uri: string;
  name: string;
  type: string;
  size: number;
}
