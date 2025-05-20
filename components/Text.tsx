import React from "react";
import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { globalStyles, getFontFamily } from "../utils/globalStyles";

export interface CustomTextProps extends TextProps {
  variant?: "regular" | "medium" | "semibold" | "bold" | "light" | "italic";
}

/**
 * Custom Text component that uses Poppins font by default
 */
const Text: React.FC<CustomTextProps> = ({
  children,
  style,
  variant = "regular",
  ...props
}) => {
  // Select the appropriate style based on the variant
  let variantStyle;
  switch (variant) {
    case "bold":
      variantStyle = globalStyles.textBold;
      break;
    case "medium":
      variantStyle = globalStyles.textMedium;
      break;
    case "semibold":
      variantStyle = globalStyles.textSemiBold;
      break;
    case "light":
      variantStyle = globalStyles.textLight;
      break;
    case "italic":
      variantStyle = globalStyles.textItalic;
      break;
    case "regular":
    default:
      variantStyle = globalStyles.text;
  }

  return (
    <RNText style={[variantStyle, style]} {...props}>
      {children}
    </RNText>
  );
};

export default Text;
