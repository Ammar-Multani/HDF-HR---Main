import { Stack, Tabs, usePathname, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Pressable, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Text from '@components/Text';
import { useTheme } from '@contexts/ThemeContext';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface NavItemType {
  icon: IconName;
  label: string;
  path: string;
}

// Navigation items configuration
const navigationItems: NavItemType[] = [
  { icon: 'home', label: 'Dashboard', path: '/employee' },
  { icon: 'clipboard-text', label: 'Tasks', path: '/employee/tasks' },
  { icon: 'file-document', label: 'Forms', path: '/employee/forms' },
  { icon: 'receipt', label: 'Receipts', path: '/employee/receipts' },
  { icon: 'account-circle', label: 'Profile', path: '/employee/profile' },
];

// NavItem component for sidebar
function NavItem({ icon, label, path, isActive }: NavItemType & { isActive: boolean }) {
  const router = useRouter();
  
  return (
    <Pressable
      onPress={() => router.push(path)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        color="#fff"
        size={24}
        style={{ marginRight: 16 }}
      />
      <View style={{ flex: 1 }}>
        <Text variant="semibold" style={{ fontSize: 16, color: '#fff' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// Sidebar component for web
function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      style={{
        width: 280,
        height: '100%',
        padding: 20,
      }}
    >
      <View style={{ marginBottom: 40 }}>
        <Text variant="bold" style={{ fontSize: 24, color: '#fff' }}>
          HDF-HR
        </Text>
      </View>
      
      {navigationItems.map((item) => (
        <NavItem
          key={item.path}
          {...item}
          isActive={pathname === item.path}
        />
      ))}
    </LinearGradient>
  );
}

// TabBar background component
function TabBarBackground() {
  return (
    <View
      style={{
        borderRadius: 25,
        borderWidth: 1,
        borderColor: "rgb(207, 207, 207)",
        overflow: "hidden",
        ...StyleSheet.absoluteFillObject,
      }}
    >
      <LinearGradient
        colors={[
          "rgba(10,185,129,255)",
          "rgba(6,169,169,255)",
          "rgba(38,127,161,255)",
          "rgba(54,105,157,255)",
          "rgba(74,78,153,255)",
          "rgba(94,52,149,255)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

export default function EmployeeLayout() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = isWeb && width >= 768;

  if (!isLargeScreen) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            elevation: 7,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            height: 70,
            paddingTop: 7.5,
            paddingBottom: 10,
            paddingHorizontal: 5,
            marginHorizontal: 13,
            marginBottom: 10,
            borderRadius: 25,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: "Poppins-Medium",
            color: "#fff",
          },
          tabBarActiveTintColor: "#fff",
          tabBarInactiveTintColor: "rgba(255, 255, 255, 0.7)",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="home" color={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="clipboard-text" color={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="forms"
          options={{
            title: 'Forms',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="file-document" color={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="receipts"
          options={{
            title: 'Receipts',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="receipt" color={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="account-circle" color={color} size={24} />
            ),
          }}
        />
      </Tabs>
    );
  }

  // Web layout with sidebar
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <Sidebar />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#fff',
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Dashboard',
            }}
          />
          <Stack.Screen
            name="tasks/index"
            options={{
              title: 'Tasks',
            }}
          />
          <Stack.Screen
            name="forms/index"
            options={{
              title: 'Forms',
            }}
          />
          <Stack.Screen
            name="receipts/index"
            options={{
              title: 'Receipts',
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              title: 'Profile',
            }}
          />
        </Stack>
      </View>
    </View>
  );
}
