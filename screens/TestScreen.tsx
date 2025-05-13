import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { testRLSPolicies } from "../utils/testRLS";
import { generateJWT, verifyJWT } from "../utils/auth";
import { supabase } from "../lib/supabase";
import { EXPO_PUBLIC_JWT_SECRET } from "@env";

const TestScreen = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Check environment variables
      addResult("Checking environment variables...");
      const jwtSecret = EXPO_PUBLIC_JWT_SECRET;
      if (!jwtSecret) {
        addResult("ERROR: JWT_SECRET is not set in environment variables!");
      } else {
        addResult(
          `JWT_SECRET is set (first few chars): ${jwtSecret.substring(0, 3)}...`
        );
      }

      // Test JWT generation
      addResult("\nTesting JWT generation...");
      const userData = {
        id: "9b493703-31b0-406a-9be2-6a991448a245", // Super admin
        email: "aamultani.enacton@gmail.com",
        role: "superadmin",
      };

      const token = await generateJWT(userData);
      addResult(`Generated JWT token: ${token.substring(0, 20)}...`);

      // Verify JWT
      const decodedToken = await verifyJWT(token);
      addResult(`Decoded JWT: ${JSON.stringify(decodedToken, null, 2)}`);

      // Test admin lookup
      addResult("\nTesting admin lookup...");
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("*")
        .eq("id", "9b493703-31b0-406a-9be2-6a991448a245");

      if (adminError) {
        addResult(`Admin lookup error: ${adminError.message}`);
      } else {
        addResult(`Admin lookup result: ${JSON.stringify(adminData, null, 2)}`);
      }

      // Test company_user lookup
      addResult("\nTesting company_user lookup...");
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_user")
        .select("*")
        .eq("id", "1199b0a6-bcd1-4d28-9748-a1ec96d897cb");

      if (companyUserError) {
        addResult(`Company User lookup error: ${companyUserError.message}`);
      } else {
        addResult(
          `Company User lookup result: ${JSON.stringify(companyUserData, null, 2)}`
        );
      }

      // Test RLS policies
      addResult("\nTesting RLS policies...");
      await testRLSPolicies();
      addResult("RLS tests completed, check console for details");
    } catch (error: any) {
      addResult(`Test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addResult = (message: string) => {
    setResults((prev) => [...prev, message]);
    console.log(message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RLS and JWT Test</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={runTest}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Running Tests..." : "Run Tests"}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#4285f4",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: "monospace",
  },
});

export default TestScreen;
