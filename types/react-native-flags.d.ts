declare module 'react-native-flags' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  interface FlagProps extends ViewProps {
    /**
     * The country code for the flag (ISO 3166-1 alpha-2)
     */
    code: string;
    
    /**
     * The size of the flag
     */
    size?: number;
    
    /**
     * Type of the flag
     */
    type?: 'flat' | 'shiny';
  }

  const Flag: ComponentType<FlagProps>;
  
  export default Flag;
} 