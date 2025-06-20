# HDF-HR Business Management App

A comprehensive HR and business management platform designed for organizations with multiple hierarchical roles. This application enables Super Admins, Company Admins, and Employees to efficiently manage companies, tasks, forms, and HR-related processes in a secure, multi-language environment.

## Key Features

### Role-Based Access Control
- **Super Admin**: Complete system oversight, company management, and user administration
- **Company Admin**: Employee management, task assignment, and company-specific operations
- **Employee**: Task management, form submissions, and profile maintenance

### Company Management
- Create, edit, and manage company profiles
- Track company performance metrics and growth
- Manage company-specific settings and configurations

### Task Management
- Create and assign tasks with priorities (Low, Medium, High)
- Track task status (Open, In Progress, Awaiting Response, Completed, Overdue)
- Receive notifications for task updates and deadlines

### Form Management
- Submit and process various HR forms:
  - Accident reports
  - Illness reports
  - Staff departure documentation
- Track form status and approvals

### User Management
- Comprehensive profile management
- Secure authentication with Supabase Auth
- Password reset and account recovery options

### Additional Features
- Multi-language support (German, English, French, Italian, Albanian)
- Responsive design for web, iOS, and Android platforms
- Activity logging for audit and compliance
- Receipt management and financial tracking

## Getting Started

### Prerequisites

- **Node.js**: Version 18.18.0 or higher
- **Package Manager**: Yarn (preferred) or npm
- **Expo CLI**: For development and building
- **Supabase Account**: For backend services

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd HDF-HR---Main
   ```

2. Install dependencies:
   ```bash
   yarn install
   # or
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit the .env file with your credentials
   ```

4. Configure the following environment variables in your `.env` file:
   ```
   # Required Supabase configuration
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Authentication
   EXPO_PUBLIC_JWT_SECRET=your_jwt_secret
   
   # Optional integrations
   EXPO_PUBLIC_KIKI_API_KEY=your_kiki_api_key
   EXPO_PUBLIC_KIKI_BASE_URL=your_kiki_base_url
   ```

### Database Setup

The application requires a Supabase database with the proper schema. Run the following migrations to set up your database:

```bash
# Create necessary tables and functions
yarn db:setup

# Or run individual migration scripts
yarn db:create-task-tables
yarn db:create-storage
```

### Development

#### Starting the Development Server

```bash
# Start Expo development server
yarn start

# Start with specific platform
yarn start --android
yarn start --ios
yarn start --web
```

#### Development Commands

```bash
# Run ESLint to check for code style issues
yarn lint

# Run TypeScript type checking
yarn tsc
```

## Building and Deployment

### EAS Build System

This project uses Expo Application Services (EAS) for building and deploying the application to various platforms.

#### Setup EAS

1. Install EAS CLI globally:

   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo account:

   ```bash
   eas login
   ```

3. Configure your project for EAS builds:

   ```bash
   eas build:configure
   ```

#### Build Options

##### Production Builds

```bash
# Build for Android production
yarn build:android
# or directly
eas build --platform android --profile production

# Build for iOS production
yarn build:ios
# or directly
eas build --platform ios --profile production
```

##### Preview Builds

```bash
# Build for Android preview (for testing)
yarn build:preview:android
# or directly
eas build --platform android --profile preview

# Build for iOS preview
yarn build:preview:ios
# or directly
eas build --platform ios --profile preview
```

##### Development Builds

```bash
# Build for Android development
yarn build:dev:android
# or directly
eas build --platform android --profile development

# Build for iOS development
yarn build:dev:ios
# or directly
eas build --platform ios --profile development
```

### Local Development Builds

For local testing on physical devices or emulators:

```bash
# Run on Android
yarn android

# Run on iOS
yarn ios

# Run on web
yarn web
```

### Deployment

#### App Stores

After building with EAS, you can submit your app to the app stores:

```bash
# Submit to Google Play Store
eas submit -p android

# Submit to Apple App Store
eas submit -p ios
```

#### Web Deployment

For web deployment, build the web version and deploy to your hosting provider:

```bash
# Build for web
yarn build:web

# Deploy to hosting service (example for Netlify)
npx netlify deploy --prod
```

## Project Structure

### Core Directories

```
├── assets/              # Static assets (images, fonts, etc.)
├── components/          # Reusable UI components
├── contexts/            # React context providers
├── hooks/               # Custom React hooks
├── i18n/                # Internationalization configuration
│   └── locales/         # Translation files (en, de, fr, it, sq)
├── lib/                 # Core utilities and services
│   ├── api/             # API client implementations
│   ├── config/          # Configuration files
│   ├── services/        # Service implementations
│   ├── store/           # State management stores
│   └── utils/           # Utility functions
├── navigation/          # Navigation configuration
│   └── components/      # Navigation-specific components
├── screens/             # Screen components by user role
│   ├── auth/            # Authentication screens
│   ├── companyadmin/    # Company Admin screens
│   ├── dashboard-beta/  # New dashboard implementations
│   ├── employee/        # Employee screens
│   └── superadmin/      # Super Admin screens
├── types/               # TypeScript type definitions
└── utils/               # General utility functions
```

### Key Files

- `App.tsx`: Main application component and entry point
- `index.ts`: Application registration
- `supabase-client.ts`: Supabase client configuration and utilities
- `AuthContext.tsx`: Authentication state and logic
- `ThemeContext.tsx`: Theme management and customization
- `LanguageContext.tsx`: Internationalization state management

## Architecture

### Application Architecture

The application follows a layered architecture pattern:

1. **Presentation Layer**: React Native components in `screens/` and `components/`
2. **Business Logic Layer**: Context providers, hooks, and services
3. **Data Access Layer**: Supabase client and API utilities

### State Management

The application uses a hybrid state management approach:

- **Global State**: React Context for auth, theme, and language settings
  - `AuthContext`: User authentication and role management
  - `ThemeContext`: Theme preferences and customization
  - `LanguageContext`: Language selection and translations

- **Local State**: React's useState and useReducer for component-specific state

- **Server State**: React Query for data fetching, caching, and synchronization

- **Persistent State**: Zustand combined with AsyncStorage for persistent app state

### Data Flow

1. **API Layer**: Supabase client with custom caching mechanisms
2. **Service Layer**: Business logic and data transformation
3. **Component Layer**: UI rendering and user interaction

### Navigation Architecture

- **Role-Based Navigation**: Different navigation stacks based on user role
  - `AuthNavigator`: Login, registration, and password reset flows
  - `SuperAdminNavigator`: Super Admin specific screens
  - `CompanyAdminNavigator`: Company Admin specific screens
  - `EmployeeNavigator`: Employee specific screens

- **Deep Linking**: Configured for web and mobile platforms

### Security Implementation

- JWT-based authentication with Supabase
- Role-based access control (RBAC)
- Secure password handling with hashing
- Activity logging for audit trails

## Coding Standards

### TypeScript Best Practices

- Use strict TypeScript typing with proper interfaces and types
- Avoid using `any` type; use `unknown` when type is uncertain
- Create dedicated type definitions for all data structures
- Use discriminated unions for complex state management
- Leverage TypeScript utility types (Partial, Pick, Omit, etc.)

### Component Architecture

- Use functional components with React hooks
- Follow single responsibility principle
- Implement proper component composition
- Extract reusable logic into custom hooks
- Use memoization (useMemo, useCallback) for performance optimization

### Code Organization

- Group related functionality in dedicated directories
- Use barrel exports (index.ts) for cleaner imports
- Keep component files under 300 lines; split larger components
- Maintain consistent naming conventions

### Styling Guidelines

- Use React Native Paper for UI components
- Implement responsive design patterns
- Follow the theme system for consistent styling
- Use custom Text component for typography consistency
- Implement dark/light mode theming

## Technologies

### Frontend

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and toolchain
- **TypeScript**: Static typing for JavaScript
- **React Navigation**: Navigation library
- **React Native Paper**: Material Design components
- **React Hook Form**: Form validation and handling
- **i18next**: Internationalization framework

### State Management

- **React Context API**: Global state management
- **Zustand**: Lightweight state management
- **React Query**: Server state management
- **AsyncStorage**: Persistent storage

### Backend & Services

- **Supabase**: Backend-as-a-Service (BaaS)
  - Authentication
  - PostgreSQL database
  - Storage
  - Realtime subscriptions
- **Date-fns**: Date manipulation library
- **Expo Notifications**: Push notifications

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Implement changes following the coding standards
3. Write or update tests as necessary
4. Submit a pull request with a clear description

### Code Review Process

- All code changes require at least one review
- Automated tests must pass before merging
- Follow the project's coding standards

## Troubleshooting

### Common Issues

#### Build Errors

- Clear Metro bundler cache: `expo start -c`
- Verify Node.js version compatibility
- Check for outdated dependencies: `yarn outdated`

#### Authentication Issues

- Verify Supabase configuration in `.env` file
- Check network connectivity
- Clear AsyncStorage: `AsyncStorage.clear()`

#### Performance Issues

- Use React DevTools to identify unnecessary re-renders
- Implement proper list virtualization with FlashList
- Optimize image assets and lazy loading

## License

This project is proprietary software. All rights reserved.

---

© 2023-2024 HDF-HR. All rights reserved.
