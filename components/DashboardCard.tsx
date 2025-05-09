
import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DashboardCardProps {
  title: string;
  count: number;
  icon: string;
  color: string;
  onPress: () => void;
}

const DashboardCard = ({ title, count, icon, color, onPress }: DashboardCardProps) => {
  const theme = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={styles.cardContainer}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    elevation: 2,
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  textContainer: {
    marginTop: 8,
  },
  count: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    opacity: 0.7,
  },
});

export default DashboardCard;
