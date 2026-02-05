# Firebase Storage Setup Guide

## Fix CORS Error

You're getting a CORS error because Firebase Storage needs to be configured to allow uploads from your domain.

### Option 1: Using Google Cloud Console (Easiest)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **Cloud Storage** → **Browser**
4. Click on your storage bucket (`hub-project-6b1f6.firebasestorage.app`)
5. Click on **Permissions** tab
6. Click **Grant Access**
7. Add principal: `allUsers`
8. Role: **Storage Object Viewer**
9. Click **Save**

### Option 2: Using gsutil (Command Line)

If you have Google Cloud SDK installed:

```bash
gsutil cors set cors.json gs://hub-project-6b1f6.firebasestorage.app
```

The `cors.json` file is already created in your project root.

### Option 3: Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Storage** → **Rules**
4. Copy and paste the contents from `storage.rules` in your project
5. Click **Publish**

## Update Storage Rules

Go to Firebase Console → Storage → Rules and use the rules from `storage.rules`:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{filename} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }

    match /profiles/{filename} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

This allows:
- Anyone to read images (public access for viewing)
- Only authenticated users to upload
- Max file size of 5MB

## After Setup

Once you've configured CORS and updated the rules, refresh your app and try uploading again. The CORS error should be gone!
