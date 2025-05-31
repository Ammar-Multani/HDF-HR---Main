import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function Home() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Home' }} />
      <Text style={styles.text}>Welcome to HDF-HR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
}); 