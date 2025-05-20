import { StyleSheet, Platform, TextStyle } from 'react-native';

// Type for font weights
type FontWeight = 
  | 'normal' 
  | 'bold' 
  | '100' 
  | '200' 
  | '300' 
  | '400' 
  | '500' 
  | '600' 
  | '700' 
  | '800' 
  | '900';

/**
 * Maps font weight to the corresponding Poppins font family
 * @param weight The font weight to map
 * @returns The corresponding Poppins font family name
 */
export const getFontFamily = (weight: FontWeight = 'normal'): string => {
  switch (weight) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return 'Poppins-Bold';
    case '600':
      return 'Poppins-SemiBold';
    case '500':
      return 'Poppins-Medium';
    case '100':
    case '200':
    case '300':
      return 'Poppins-Light';
    case 'normal':
    case '400':
    default:
      return 'Poppins-Regular';
  }
};

/**
 * Function to create text styles with the appropriate Poppins font family
 * based on the fontWeight provided.
 */
export const createTextStyle = (
  style: Omit<TextStyle, 'fontFamily'> & { fontWeight?: FontWeight }
): TextStyle => {
  const { fontWeight, ...rest } = style;
  return {
    fontFamily: getFontFamily(fontWeight),
    ...rest,
  };
};

// Global styles to be used across the app
export const globalStyles = StyleSheet.create({
  text: {
    fontFamily: 'Poppins-Regular',
  },
  textBold: {
    fontFamily: 'Poppins-Bold',
  },
  textMedium: {
    fontFamily: 'Poppins-Medium',
  },
  textLight: {
    fontFamily: 'Poppins-Light',
  },
  textSemiBold: {
    fontFamily: 'Poppins-SemiBold',
  },
  textItalic: {
    fontFamily: 'Poppins-Italic',
  },
}); 