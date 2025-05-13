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
3. Create a `.env.local` file with the following variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_KIKI_API_KEY=your_kiki_api_key
   EXPO_PUBLIC_KIKI_BASE_URL=your_kiki_base_url
   ```

### Development

To start the development server:

```
yarn start
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
- `types/`: TypeScript type definitions

## Technologies Used

- React Native
- Expo
- TypeScript
- Supabase
- React Navigation
- React Native Paper
- React Hook Form
- Date-fns
