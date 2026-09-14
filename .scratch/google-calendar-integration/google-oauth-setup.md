# Google OAuth setup for local Calendar access

Research date: 2026-09-14. Sources below are official Google documentation.

## 1. Create or select a Cloud project and enable Calendar API

In the Google Cloud console, select or create the project that will own this integration. Open **APIs & Services > Library > Google Workspace**, select **Google Calendar API**, and click **Enable**. Google documents that Workspace APIs must be enabled in a Cloud project before use; the Calendar service name is `calendar-json.googleapis.com`.

Source: [Enable Google Workspace APIs](https://developers.google.com/workspace/guides/enable-apis).

## 2. Configure the OAuth consent screen

Open **Google Auth platform > Branding**. Provide an app name, user-support email, audience, and developer contact email; accept the Google API Services User Data Policy. For an External app, open **Audience** and add the intended accounts under **Test users** while testing. In **Data Access**, add only:

```
https://www.googleapis.com/auth/calendar.readonly
```

This scope permits viewing and downloading calendars the user can access. Google recommends choosing the narrowest scope needed.

Sources: [Configure OAuth consent](https://developers.google.com/workspace/guides/configure-oauth-consent), [Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth).

## 3. Testing versus production

The **Audience** page controls both user type (External or Internal) and publishing status (**Testing** or **In Production**). Keep an External app in Testing and authorize only listed test users during local development. Before making an External app available broadly, move it to production and complete any Google verification required for the requested data access. External production apps require homepage, privacy-policy, and terms links configured on verified authorized domains before verification can be submitted. Google documents a lifetime cap of 100 new users for apps that show the unverified-app screen.

Sources: [Manage App Audience](https://support.google.com/cloud/answer/15549945), [Manage OAuth app branding](https://support.google.com/cloud/answer/15549049), [Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth).

## 4. Create the OAuth client

Open **Google Auth platform > Clients > Create Client** and select **Desktop app**. This is the client type for the open-source HomeChore Local Edition. Google supports the numeric loopback redirect for Desktop apps on Windows, macOS, and Linux:

```
http://127.0.0.1:8787/api/integrations/google/callback
```

HomeChore uses the standard authorization-code flow with PKCE. It requests the read-only scope above. The loopback server receives the authorization response only on the computer running HomeChore.

Sources: [Create access credentials](https://developers.google.com/workspace/guides/create-credentials), [OAuth 2.0 for iOS & Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app).

## 5. Obtain and protect the credentials

After clicking **Create**, copy the OAuth **client ID** and download the Desktop client JSON. The Desktop client secret is distributed with installed apps and is not a confidentiality boundary. It must not be treated as a Household Google credential. HomeChore includes this client identity so a Household only signs in and grants read-only Calendar access.

Do not put any Household refresh token or HomeChore `data/google-calendar.key` in source control. HomeChore generates that local key, uses it to encrypt the refresh token, and stores both only in the ignored `data/` directory. Rotate the Desktop client if it is abused or replaced.

Sources: [Manage OAuth clients](https://support.google.com/cloud/answer/15549257), [OAuth 2.0 for iOS & Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app).