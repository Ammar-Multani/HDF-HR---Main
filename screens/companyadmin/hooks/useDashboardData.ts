import { useState, useEffect } from "react";
import { Dimensions, Platform } from "react-native";
import { supabase, isNetworkAvailable } from "../../../lib/supabase";
import { TaskStatus, FormStatus } from "../../../types";
import { useTranslation } from "react-i18next";

export interface EmployeeData {
  id: string;
  name: string;
  forms_count: number;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  employeeGrowth: string;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksGrowth: string;
  totalForms: number;
  pendingForms: number;
  formsGrowth: string;
  monthlyEmployees: number[];
  monthlyForms: number[];
  monthLabels: string[];
  topEmployees: EmployeeData[];
  latestActivities: any[];
}

export const useDashboardData = (user: any) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    employeeGrowth: "+0%",
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    tasksGrowth: "+0%",
    totalForms: 0,
    pendingForms: 0,
    formsGrowth: "+0%",
    monthlyEmployees: [],
    monthlyForms: [],
    monthLabels: [],
    topEmployees: [],
    latestActivities: [],
  });

  const [windowDimensions, setWindowDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const helpGuideSteps = [
    {
      title: "Overview Statistics",
      icon: "chart-box",
      description: t(
        "View key metrics including total employees, tasks, and forms. Growth percentages show changes from the previous period."
      ),
    },
    {
      title: "Employee Analytics",
      icon: "account-group",
      description: t(
        "Track employee onboarding trends with monthly charts and view top performing employees based on form submissions."
      ),
    },
    {
      title: "Task Management",
      icon: "clipboard-check",
      description: t(
        "Monitor task statuses including pending, completed, and overdue tasks. Keep track of task progress and deadlines."
      ),
    },
    {
      title: "Form Analytics",
      icon: "file-document",
      description: t(
        "Analyze form submission trends over time, including accident reports, illness reports, and departure forms."
      ),
    },
  ];

  const helpGuideNote = {
    title: "Important Notes",
    content: [
      "All statistics are updated in real-time when refreshing",
      "Growth percentages compare current numbers with previous period",
      "Charts show data for the last 5 months",
      "Top employees are ranked by total form submissions",
      "Task statistics are color-coded by status for easy tracking",
    ],
  };

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setWindowDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const isLargeScreen = windowDimensions.width >= 1440;
  const isMediumScreen =
    windowDimensions.width >= 768 && windowDimensions.width < 1440;

  const checkNetworkStatus = async () => {
    const isAvailable = await isNetworkAvailable();
    setNetworkStatus(isAvailable);
    return isAvailable;
  };

  const fetchCompanyId = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("company_user")
        .select("company_id, company:company_id(company_name)")
        .eq("id", user.id)
        .single();
      if (error) {
        console.error("Error fetching company ID:", error);
        return null;
      }
      if (data && (data as any).company) {
        // @ts-ignore
        setCompanyName((data as any).company.company_name || "");
      }
      return (data as any)?.company_id || null;
    } catch (err) {
      console.error("Error fetching company ID:", err);
      return null;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const networkAvailable = await checkNetworkStatus();
      if (!networkAvailable) {
        setError("You're offline. Dashboard data may be outdated.");
      }
      const currentCompanyId = companyId || (await fetchCompanyId());
      if (!currentCompanyId) {
        console.error("No company ID found");
        setLoading(false);
        return;
      }
      setCompanyId(currentCompanyId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const startMonthIndex =
        currentMonth >= 4 ? currentMonth - 4 : 12 + (currentMonth - 4);
      const recentMonths: number[] = [];
      for (let i = 0; i < 5; i++) {
        const monthIndex = (startMonthIndex + i) % 12;
        recentMonths.push(monthIndex);
      }
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const [
        { count: totalEmployees },
        { count: todayEmployees },
        { count: activeEmployees },
        { count: totalTasks },
        { count: todayTasks },
        { count: pendingTasks },
        { count: completedTasks },
        { count: overdueTasks },
        { count: accidentReports },
        { count: illnessReports },
        { count: departureReports },
        { count: todayAccidentReports },
        { count: todayIllnessReports },
        { count: todayDepartureReports },
        { count: pendingAccidentReports },
        { count: pendingIllnessReports },
        { count: pendingDepartureReports },
      ] = await Promise.all([
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("active_status", "active"),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [
            TaskStatus.OPEN,
            TaskStatus.IN_PROGRESS,
            TaskStatus.AWAITING_RESPONSE,
          ]),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("status", TaskStatus.COMPLETED),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("status", TaskStatus.OVERDUE),
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("submission_date", today.toISOString()),
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]),
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]),
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]),
      ]);

      const totalForms =
        (accidentReports || 0) +
        (illnessReports || 0) +
        (departureReports || 0);
      const todayForms =
        (todayAccidentReports || 0) +
        (todayIllnessReports || 0) +
        (todayDepartureReports || 0);
      const pendingForms =
        (pendingAccidentReports || 0) +
        (pendingIllnessReports || 0) +
        (pendingDepartureReports || 0);
      let employeeGrowth = "+0%";
      if (totalEmployees && todayEmployees) {
        if (totalEmployees === todayEmployees) {
          employeeGrowth = "+100%";
        } else {
          const previousEmployees = totalEmployees - todayEmployees;
          const growthRate =
            previousEmployees > 0 ? (todayEmployees / previousEmployees) * 100 : 0;
          employeeGrowth =
            (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";
        }
      }
      let tasksGrowth = "+0%";
      if (totalTasks && todayTasks) {
        if (totalTasks === todayTasks) {
          tasksGrowth = "+100%";
        } else {
          const previousTasks = totalTasks - todayTasks;
          const growthRate =
            previousTasks > 0 ? (todayTasks / previousTasks) * 100 : 0;
          tasksGrowth =
            (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";
        }
      }
      let formsGrowth = "+0%";
      if (totalForms && todayForms) {
        if (totalForms === todayForms) {
          formsGrowth = "+100%";
        } else {
          const previousForms = totalForms - todayForms;
          const growthRate =
            previousForms > 0 ? (todayForms / previousForms) * 100 : 0;
          formsGrowth =
            (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";
        }
      }
      const allMonthsEmployeeData = new Array(12).fill(0);
      const allMonthsFormData = new Array(12).fill(0);
      const monthlyEmployeePromises = [] as Promise<any>[];
      const monthlyAccidentFormPromises = [] as Promise<any>[];
      const monthlyIllnessFormPromises = [] as Promise<any>[];
      const monthlyDepartureFormPromises = [] as Promise<any>[];
      for (let month = 0; month < 12; month++) {
        const dateYear = currentMonth >= month ? currentYear : currentYear - 1;
        const monthStart = new Date(dateYear, month, 1);
        const monthEnd = new Date(dateYear, month + 1, 0);
        monthlyEmployeePromises.push(
          supabase
            .from("company_user")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );
        monthlyAccidentFormPromises.push(
          supabase
            .from("accident_report")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );
        monthlyIllnessFormPromises.push(
          supabase
            .from("illness_report")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("submission_date", monthStart.toISOString())
            .lte("submission_date", monthEnd.toISOString())
        );
        monthlyDepartureFormPromises.push(
          supabase
            .from("staff_departure_report")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );
      }
      const [monthlyEmployeeData, monthlyAccidentForms, monthlyIllnessForms, monthlyDepartureForms] = await Promise.all([
        Promise.all(monthlyEmployeePromises),
        Promise.all(monthlyAccidentFormPromises),
        Promise.all(monthlyIllnessFormPromises),
        Promise.all(monthlyDepartureFormPromises),
      ]);
      monthlyEmployeeData.forEach((res, index) => {
        allMonthsEmployeeData[index] = res.count || 0;
      });
      monthlyAccidentForms.forEach((res, index) => {
        allMonthsFormData[index] += res.count || 0;
      });
      monthlyIllnessForms.forEach((res, index) => {
        allMonthsFormData[index] += res.count || 0;
      });
      monthlyDepartureForms.forEach((res, index) => {
        allMonthsFormData[index] += res.count || 0;
      });
      const monthlyEmployees = recentMonths.map((month) => allMonthsEmployeeData[month]);
      const monthlyForms = recentMonths.map((month) => allMonthsFormData[month]);
      const monthLabels = recentMonths.map((month) => monthNames[month]);
      setStats((prev) => ({
        ...prev,
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        employeeGrowth,
        totalTasks: totalTasks || 0,
        pendingTasks: pendingTasks || 0,
        completedTasks: completedTasks || 0,
        overdueTasks: overdueTasks || 0,
        tasksGrowth,
        totalForms,
        pendingForms,
        formsGrowth,
        monthlyEmployees,
        monthlyForms,
        monthLabels,
      }));
      const { data: companyEmployees } = await supabase
        .from("company_user")
        .select("id, first_name, last_name")
        .eq("company_id", currentCompanyId);
      const { data: accidentForms } = await supabase
        .from("accident_report")
        .select("employee_id")
        .eq("company_id", currentCompanyId);
      const { data: illnessForms } = await supabase
        .from("illness_report")
        .select("employee_id")
        .eq("company_id", currentCompanyId);
      const { data: departureForms } = await supabase
        .from("staff_departure_report")
        .select("employee_id")
        .eq("company_id", currentCompanyId);
      const employeeFormCounts: { [key: string]: number } = {};
      if (accidentForms) {
        accidentForms.forEach((form) => {
          if (form.employee_id) {
            employeeFormCounts[form.employee_id] =
              (employeeFormCounts[form.employee_id] || 0) + 1;
          }
        });
      }
      if (illnessForms) {
        illnessForms.forEach((form) => {
          if (form.employee_id) {
            employeeFormCounts[form.employee_id] =
              (employeeFormCounts[form.employee_id] || 0) + 1;
          }
        });
      }
      if (departureForms) {
        departureForms.forEach((form) => {
          if (form.employee_id) {
            employeeFormCounts[form.employee_id] =
              (employeeFormCounts[form.employee_id] || 0) + 1;
          }
        });
      }
      if (companyEmployees) {
        const employeesWithFormCounts = companyEmployees.map((employee) => ({
          id: employee.id,
          name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
          forms_count: employeeFormCounts[employee.id] || 0,
        }));
        const topEmployees = employeesWithFormCounts.sort(
          (a, b) => b.forms_count - a.forms_count
        );
        setStats((prevStats) => ({
          ...prevStats,
          topEmployees,
        }));
      }
      const { data: latestActivities } = await supabase
        .from("activity_logs")
        .select("*")
        .or(`company_id.eq.${currentCompanyId},user_id.eq.${user?.id}`)
        .neq("activity_type", "SYSTEM_MAINTENANCE")
        .order("created_at", { ascending: false })
        .limit(20);
      if (latestActivities) {
        const companyRelatedLogs = latestActivities.filter((log) => {
          if (log.company_id === currentCompanyId) return true;
          if (!log.company_id && log.user_id === user?.id) return true;
          if (log.metadata) {
            if (log.metadata.company && log.metadata.company.id === currentCompanyId)
              return true;
            if (log.metadata.created_by && log.metadata.created_by.id === user?.id)
              return true;
            if (log.metadata.updated_by && log.metadata.updated_by.id === user?.id)
              return true;
            if (log.metadata.company_admin && log.metadata.company_admin.id === user?.id)
              return true;
          }
          return false;
        });
        const recentLogs = companyRelatedLogs.slice(0, 10);
        setStats((prevStats) => ({
          ...prevStats,
          latestActivities: recentLogs || [],
        }));
      } else {
        setStats((prevStats) => ({
          ...prevStats,
          latestActivities: [],
        }));
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Error fetching dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const onRefresh = async () => {
    const isConnected = await checkNetworkStatus();
    if (!isConnected) {
      setError("Cannot refresh while offline");
      return;
    }
    setRefreshing(true);
    fetchDashboardData();
  };

  return {
    loading,
    refreshing,
    companyName,
    networkStatus,
    error,
    stats,
    helpModalVisible,
    setHelpModalVisible,
    showAllEmployees,
    setShowAllEmployees,
    isLargeScreen,
    isMediumScreen,
    windowDimensions,
    onRefresh,
    helpGuideSteps,
    helpGuideNote,
  };
};

export default useDashboardData;
