
import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Appbar, Avatar, useTheme, Menu, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showMenu?: boolean;
}

const AppHeader = ({ title, showBackButton = false, showMenu = true }: AppHeaderProps) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, userRole, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = React.useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
  };

  const navigateToProfile = () => {
    closeMenu();
    navigation.navigate('Profile' as never);
  };

  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <Appbar.Header
      style={[styles.header, { backgroundColor: theme.colors.primary }]}
    >
      {showBackButton && (
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          color={theme.colors.surface}
        />
      )}
      <Appbar.Content
        title={title}
        titleStyle={{ color: theme.colors.surface, fontWeight: 'bold' }}
      />
      {showMenu && (
        <View style={styles.menuContainer}>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <TouchableOpacity onPress={openMenu}>
                <Avatar.Text
                  size={40}
                  label={getInitials()}
                  style={{ backgroundColor: theme.colors.tertiary }}
                />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              leadingIcon="account"
              onPress={navigateToProfile}
              title="Profile"
            />
            {userRole === UserRole.SUPER_ADMIN && (
              <Menu.Item
                leadingIcon="account-multiple"
                onPress={() => {
                  closeMenu();
                  navigation.navigate('Users' as never);
                }}
                title="Super Admins"
              />
            )}
            <Divider />
            <Menu.Item
              leadingIcon="logout"
              onPress={handleSignOut}
              title="Sign Out"
            />
          </Menu>
        </View>
      )}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    elevation: 4,
  },
  menuContainer: {
    marginRight: 10,
  },
});

export default AppHeader;
