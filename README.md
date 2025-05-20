# Business Management App

A comprehensive platform for Super Admins, Company Admins, and Employees to manage companies, tasks, and forms.

## Features

- Role-based access control with specific permissions for each role
- Company management, including creation, editing, and onboarding
- Task management with assignment, tracking, and status updates
- Form submissions for accident, illness, and staff departure reports
- Profile management for users
- Secure authentication using Supabase Auth with magic links

## Getting Started

### Prerequisites

- Node.js (version 18.18.0 or higher)
- Yarn or npm
- Expo CLI

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Copy the `.env.example` file to create your own `.env` file:
   ```
   cp .env.example .env
   ```
4. Update the `.env` file with your own values for:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_JWT_SECRET=your_jwt_secret
   EXPO_PUBLIC_KIKI_API_KEY=your_kiki_api_key (if applicable)
   EXPO_PUBLIC_KIKI_BASE_URL=your_kiki_base_url (if applicable)
   ```

### Development

To start the development server:

```
yarn start
```

### Testing and Linting

Run ESLint to check for code style issues:

```
yarn lint
```

### Building for Production

#### EAS Build

1. Install EAS CLI:

   ```
   npm install -g eas-cli
   ```

2. Login to your Expo account:

   ```
   eas login
   ```

3. Configure your project:

   ```
   eas build:configure
   ```

4. Build for Android:

   ```
   eas build --platform android --profile production
   ```

5. Build for iOS:
   ```
   eas build --platform ios --profile production
   ```

#### Local Builds

For Android:

```
yarn android
```

For iOS:

```
yarn ios
```

## Project Structure

- `assets/`: Contains all static assets like images and fonts
- `components/`: Reusable UI components
- `contexts/`: React context providers
- `lib/`: Utility functions and API clients
- `navigation/`: Navigation configuration
- `screens/`: Screen components organized by user role
  - `auth/`: Authentication screens
  - `dashboard/`: Dashboard screens
  - `superadmin/`: Super Admin screens
  - `companyadmin/`: Company Admin screens
  - `employee/`: Employee screens
  - `diagnostics/`: Diagnostic and debug screens
- `types/`: TypeScript type definitions
- `utils/`: Utility functions and helpers
- `scripts/`: Setup and maintenance scripts

## Architecture

### State Management

The application uses a combination of:

- React Context for global state (auth, theme)
- Zustand for specific feature state
- React Query for server state and API cache management

### API and Data Layer

- Supabase for backend storage, auth, and realtime features
- Custom utility functions for API operations in the `lib/` directory

### Navigation

- React Navigation for screen navigation with role-based routing

## Coding Standards

### TypeScript

- Always use proper TypeScript types
- Avoid using `any` type where possible
- Use interfaces for object shapes and types for unions/primitives

### Component Structure

- Use functional components with hooks
- Keep components focused on a single responsibility
- Extract reusable logic into custom hooks

### Styling

- Use React Native Paper for UI components
- Maintain consistent spacing and typography using the theme system

## Deployment

### Production Environments

The application can be deployed to:

- Google Play Store (Android)
- Apple App Store (iOS)

Use the EAS build system for creating production builds.

## Database Setup

For setting up the database tables and storage buckets:

```
yarn setup:tasks
yarn db:create-task-tables
yarn db:create-storage
yarn db:create-exec-sql
```

## Technologies Used

- React Native
- Expo
- TypeScript
- Supabase
- React Navigation
- React Native Paper
- React Hook Form
- Date-fns
- Zustand
- React Query
