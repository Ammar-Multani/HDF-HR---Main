import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import Text from "./Text";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const pageNumbers = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(0, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <View style={styles.container}>
      <Button
        mode="text"
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        icon="chevron-left"
        style={styles.button}
      >
        {t("common.previous")}
      </Button>
      <View style={styles.pageNumbersContainer}>
        {startPage > 0 && (
          <>
            <Button
              mode="text"
              onPress={() => onPageChange(0)}
              style={styles.pageButton}
              labelStyle={[
                styles.pageButtonText,
                currentPage === 0 && { color: theme.colors.primary },
              ]}
            >
              1
            </Button>
            {startPage > 1 && <Text style={styles.ellipsis}>...</Text>}
          </>
        )}
        {pageNumbers.map((pageNum) => (
          <Button
            key={`page-${pageNum}`}
            mode="text"
            onPress={() => onPageChange(pageNum)}
            style={styles.pageButton}
            labelStyle={[
              styles.pageButtonText,
              currentPage === pageNum && { color: theme.colors.primary },
            ]}
          >
            {pageNum + 1}
          </Button>
        ))}
        {endPage < totalPages - 1 && (
          <>
            {endPage < totalPages - 2 && (
              <Text style={styles.ellipsis}>...</Text>
            )}
            <Button
              mode="text"
              onPress={() => onPageChange(totalPages - 1)}
              style={styles.pageButton}
              labelStyle={[
                styles.pageButtonText,
                currentPage === totalPages - 1 && {
                  color: theme.colors.primary,
                },
              ]}
            >
              {totalPages}
            </Button>
          </>
        )}
      </View>
      <Button
        mode="text"
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        icon="chevron-right"
        contentStyle={{ flexDirection: "row-reverse" }}
        style={styles.button}
      >
        {t("common.next")}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    width: "100%",
  },
  pageNumbersContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  button: {
    marginHorizontal: 4,
  },
  pageButton: {
    minWidth: 40,
    marginHorizontal: 2,
  },
  pageButtonText: {
    fontSize: 14,
    color: "#666",
  },
  ellipsis: {
    marginHorizontal: 8,
    color: "#666",
  },
});

export default Pagination;
