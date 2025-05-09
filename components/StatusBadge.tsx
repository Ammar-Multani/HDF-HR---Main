
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { TaskStatus, FormStatus, UserStatus } from '../types';

interface StatusBadgeProps {
  status: TaskStatus | FormStatus | UserStatus;
  size?: 'small' | 'medium' | 'large';
}

const StatusBadge = ({ status, size = 'medium' }: StatusBadgeProps) => {
  const getStatusColor = () => {
    switch (status) {
      case TaskStatus.OPEN:
      case FormStatus.DRAFT:
        return '#9CA3AF'; // Gray
      case TaskStatus.IN_PROGRESS:
      case FormStatus.IN_PROGRESS:
      case FormStatus.PENDING:
        return '#3B82F6'; // Blue
      case TaskStatus.AWAITING_RESPONSE:
        return '#F59E0B'; // Amber
      case TaskStatus.COMPLETED:
      case FormStatus.APPROVED:
      case UserStatus.ACTIVE:
        return '#10B981'; // Green
      case TaskStatus.OVERDUE:
      case FormStatus.DECLINED:
      case UserStatus.INACTIVE:
        return '#EF4444'; // Red
      default:
        return '#9CA3AF'; // Default gray
    }
  };

  const getStatusText = () => {
    // Convert status to title case with spaces
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
          text: { fontSize: 10 },
        };
      case 'large':
        return {
          container: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
          text: { fontSize: 14 },
        };
      default:
        return {
          container: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
          text: { fontSize: 12 },
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const backgroundColor = getStatusColor();

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor: backgroundColor + '20', borderColor: backgroundColor },
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStyles.text,
          { color: backgroundColor },
        ]}
      >
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});

export default StatusBadge;
