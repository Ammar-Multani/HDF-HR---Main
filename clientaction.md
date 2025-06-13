# OneDrive Integration Setup Requirements

Dear Client,

To enable secure document storage in OneDrive for our HR application, we need the following credentials and access. Please follow these steps:

## 1. Azure Active Directory Setup
1. Log in to [Azure Portal](https://portal.azure.com)
2. Go to "Azure Active Directory" → "App registrations" → "New registration"
3. Register a new application with these settings:
   - Name: "HDF-HR"
   - Supported account types: "Accounts in any organizational directory"
   - Platform: Web
   - Redirect URI: [Your production URL]

## 2. Required API Permissions
After registration, please configure these Microsoft Graph permissions:
- Files.ReadWrite.All
- Sites.ReadWrite.All
- User.Read.All

Important: Click "Grant admin consent" after adding permissions.

## 3. Required Credentials
Please provide us with the following credentials (found in your app registration):

1. **Application (Client) ID**
   - Location: Azure Portal → App Registration → Overview
   - Format: GUID (example: "12345678-1234-1234-1234-123456789012")

2. **Directory (Tenant) ID**
   - Location: Azure Portal → Azure Active Directory → Overview
   - Format: GUID (example: "12345678-1234-1234-1234-123456789012")

3. **Client Secret**
   - Location: Azure Portal → App Registration → Certificates & Secrets → New client secret
   - Note: Create a new secret with 24 months expiry
   - Important: Copy the secret value immediately after creation

4. **Admin Email**
   - The email of the Microsoft 365 admin account that will be used for file operations
   - Must have sufficient permissions to manage OneDrive files

## 4. Storage Location Requirements
Please confirm:
1. The SharePoint/OneDrive site where documents should be stored
2. Any specific folder structure requirements
3. Retention policy requirements for uploaded documents

## 5. Security Requirements
Please specify:
1. IP restrictions (if any)
2. Allowed domains for CORS
3. Any specific audit logging requirements
4. Data residency requirements

## Important Security Notes
- The client secret is sensitive information
- Credentials should be transmitted securely (not via email)
- We recommend using a secure password manager or encrypted communication
- The secret will expire based on your set duration (recommend 24 months)

## Next Steps
1. Create the Azure AD application following steps 1-2
2. Generate the credentials in step 3
3. Provide the credentials through a secure channel
4. We will test the integration in a staging environment
5. After approval, we will deploy to production

## Secure Transmission
Please provide these credentials through:
1. A secure password manager, OR
2. An encrypted file with password shared separately, OR
3. Your preferred secure credential sharing method

## Support Contact
If you need assistance, please contact:
[Your contact information]

## Renewal Reminder
- Mark your calendar for client secret renewal
- We recommend setting a reminder 1 month before expiry
- Current secret will expire: [Date to be filled after creation]