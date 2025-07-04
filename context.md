I understand better now - these screens are for administrative user creation (onboarding companies, creating employees, etc.) where you're creating accounts on behalf of users. This is an important distinction because it requires a different approach than regular user self-registration.

Let me outline a proper migration plan for these administrative user creation flows:

### Migration Plan for Administrative User Creation

1. **Supabase Admin API Usage**
Instead of `hashPassword`, we'll use Supabase's Admin API which allows creating users on behalf of others. Here's the basic pattern:

```typescript
// Example of creating a user with Supabase Admin API
const { data: newUser, error } = await supabase.auth.admin.createUser({
  email: userEmail,
  password: temporaryPassword,
  email_confirm: true, // Auto-confirm the email
  user_metadata: {
    company_id: companyId,
    role: userRole,
    created_by: adminId,
    // ... other metadata
  }
});
```

2. **Screen Updates Priority**:
Let's update the screens in this order:

a) First Tier (Company Creation):
- `CreateCompanyScreen.tsx` - Creates initial company and admin
- `CreateSuperAdminScreen.tsx` - Creates super admin users

b) Second Tier (User Management):
- `CreateCompanyAdminScreen.tsx` - Creates additional company admins
- `CreateEmployeesScreen.tsx` - Bulk employee creation
- `CreateEmployeeScreen.tsx` - Single employee creation

3. **Required Changes per Screen**:

For each screen, we need to:
1. Import Supabase client
2. Replace `hashPassword` with Supabase Admin API calls
3. Update the database operations to use the Supabase user ID
4. Add force password reset flag in user metadata

Would you like me to start with updating one of these screens as an example? I recommend starting with either:

1. `CreateCompanyScreen.tsx` - If you want to start with the company onboarding flow
2. `CreateEmployeeScreen.tsx` - If you want to start with the simpler employee creation flow

Which screen would you prefer to update first? Once you choose, I'll:
1. Show the changes needed for that screen
2. Provide the updated code
3. Explain any additional considerations for that specific use case

Please let me know which screen you'd like to tackle first, and I'll help you implement the changes using Supabase's Admin API while maintaining your existing business logic.
