import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  Divider,
} from "react-native-paper";
import { getFontFamily, createTextStyle } from "../utils/globalStyles";

export interface GuideStep {
  title: string;
  icon: string;
  description: string;
}

interface HelpGuideModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  description?: string;
  steps: GuideStep[];
  note?: {
    title: string;
    content: string | string[];
  };
  buttonLabel?: string;
}

const HelpGuideModal = ({
  visible,
  onDismiss,
  title,
  description,
  steps,
  note,
  buttonLabel = "Got it",
}: HelpGuideModalProps) => {
  const theme = useTheme();
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = windowWidth >= 1024;
  const isMediumScreen = windowWidth >= 768 && windowWidth < 1024;

  // Calculate modal width based on screen size
  const getModalWidth = () => {
    if (isLargeScreen) return 800;
    if (isMediumScreen) return 600;
    return "95%";
  };

  const renderNoteContent = (content: string | string[]) => {
    if (Array.isArray(content)) {
      return (
        <>
          {content.map((item, index) => (
            <View key={index} style={styles.bulletPoint}>
              {index > 0 && (
                <Text
                  style={[
                    styles.bullet,
                    { color: theme.colors.onPrimaryContainer },
                  ]}
                >
                  •
                </Text>
              )}
              <Text
                style={[
                  styles.noteText,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </>
      );
    }
    return (
      <Text
        style={[styles.noteText, { color: theme.colors.onPrimaryContainer }]}
      >
        {content}
      </Text>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.background,
            width: getModalWidth(),
          },
        ]}
      >
        <Surface
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <View
            style={[styles.header, { borderBottomColor: theme.colors.outline }]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                <IconButton
                  icon="help-circle"
                  size={24}
                  iconColor={theme.colors.primary}
                  style={styles.headerIcon}
                />
              </View>
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                {title}
              </Text>
            </View>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.closeButton}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={Platform.OS !== "web"}
          >
            {description && (
              <Text
                style={[
                  styles.description,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {description}
              </Text>
            )}

            <View style={styles.stepsContainer}>
              {steps.map((step, index) => (
                <Surface
                  key={index}
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: theme.colors.primaryContainer },
                      ]}
                    >
                      <IconButton
                        icon={step.icon}
                        size={20}
                        iconColor={theme.colors.primary}
                        style={styles.stepIcon}
                      />
                    </View>
                    <Text
                      variant="titleMedium"
                      style={[
                        styles.stepTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {step.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {step.description}
                  </Text>
                </Surface>
              ))}
            </View>

            {note && (
              <Surface
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: theme.colors.primaryContainer,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text
                  style={[styles.noteTitle, { color: theme.colors.primary }]}
                >
                  {note.title}
                </Text>
                {renderNoteContent(note.content)}
              </Surface>
            )}
          </ScrollView>

          <Divider
            style={[styles.divider, { backgroundColor: theme.colors.outline }]}
          />

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={onDismiss}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.buttonLabel}
            >
              {buttonLabel}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    alignSelf: "center",
    maxHeight: Platform.OS === "web" ? "90vh" : "90%",
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  content: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    borderRadius: 12,
    padding: 4,
  },
  headerIcon: {
    margin: 0,
  },
  closeButton: {
    margin: 0,
  },
  title: {
    ...createTextStyle({ fontWeight: "600" }),
  },
  scrollView: {
    maxHeight: Platform.OS === "web" ? "calc(90vh - 180px)" : "auto",
  },
  scrollContent: {
    padding: 24,
  },
  description: {
    ...createTextStyle({ fontWeight: "normal" }),
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  stepsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  stepCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 0,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    borderRadius: 10,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  stepIcon: {
    margin: 0,
  },
  stepTitle: {
    ...createTextStyle({ fontWeight: "600" }),
  },
  stepDescription: {
    ...createTextStyle({ fontWeight: "normal" }),
    fontSize: 14,
    lineHeight: 22,
    marginLeft: 48,
  },
  noteCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  noteTitle: {
    ...createTextStyle({ fontWeight: "600" }),
    fontSize: 16,
    marginBottom: 12,
  },
  noteText: {
    ...createTextStyle({ fontWeight: "normal" }),
    fontSize: 14,
    lineHeight: 22,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    marginRight: 8,
    marginLeft: 8,
    fontSize: 16,
  },
  divider: {
    height: 1,
  },
  footer: {
    padding: 20,
    alignItems: "flex-end",
  },
  button: {
    borderRadius: 12,
    minWidth: 120,
  },
  buttonLabel: {
    ...createTextStyle({ fontWeight: "600" }),
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default HelpGuideModal;
