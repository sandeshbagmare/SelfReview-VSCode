# Publishing Guide for SelfReview Extension

## Prerequisites

1. **Azure DevOps Account**: You need a Microsoft account to access Azure DevOps
2. **Publisher ID**: You need to create a publisher on the VS Code Marketplace

## Step-by-Step Publishing Instructions

### 1. Create a Publisher

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click "Create publisher"
4. Fill in:
   - **Publisher ID**: A unique identifier (e.g., "yourname" or "yourcompany")
   - **Display Name**: Your name or company name
   - **Description**: Brief description of who you are

### 2. Create a Personal Access Token (PAT)

1. Go to https://dev.azure.com
2. Click on your profile icon (top right) → "Personal access tokens"
3. Click "New Token"
4. Configure:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: Select "All accessible organizations"
   - **Expiration**: Choose your preferred duration
   - **Scopes**: Select "Custom defined" and check:
     - **Marketplace**: "Acquire" and "Manage"
5. Click "Create" and **COPY THE TOKEN** (you won't see it again!)

### 3. Update package.json

Before publishing, update the `publisher` field in package.json to match your Publisher ID:

```json
"publisher": "your-publisher-id"
```

### 4. Login with vsce

Open a terminal in the extension directory and run:

```bash
npx vsce login your-publisher-id
```

When prompted, paste your Personal Access Token.

### 5. Publish the Extension

#### Option A: Publish directly
```bash
npm run publish
```

#### Option B: Manual publish with vsce
```bash
npx vsce publish
```

#### Option C: Upload VSIX manually
1. Go to https://marketplace.visualstudio.com/manage
2. Click on your publisher
3. Click "New extension" → "Visual Studio Code"
4. Drag and drop the `selfreview-0.1.0.vsix` file
5. Click "Upload"

### 6. Verify Publication

After publishing, your extension will be available at:
```
https://marketplace.visualstudio.com/items?itemName=your-publisher-id.selfreview
```

It may take a few minutes to appear in search results.

## Publishing to Open VSX (Optional but Recommended)

Open VSX is used by VS Code forks like VSCodium, Gitpod, etc.

1. Create an account at https://open-vsx.org
2. Generate an access token
3. Publish:
```bash
npx ovsx publish selfreview-0.1.0.vsix -p YOUR_OPENVSX_TOKEN
```

## Updating the Extension

To publish updates:

1. Update the version in package.json (e.g., 0.1.0 → 0.1.1)
2. Update CHANGELOG.md with changes
3. Run `npm run publish` or use version bump commands:
   - `npx vsce publish patch` (0.1.0 → 0.1.1)
   - `npx vsce publish minor` (0.1.0 → 0.2.0)
   - `npx vsce publish major` (0.1.0 → 1.0.0)

## Testing Before Publishing

You can install the VSIX locally to test:

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select `selfreview-0.1.0.vsix`

## Troubleshooting

### "Publisher not found"
- Make sure you've created a publisher at marketplace.visualstudio.com/manage
- Ensure the publisher ID in package.json matches exactly

### "Personal Access Token is invalid"
- Create a new PAT with "All accessible organizations" selected
- Ensure "Marketplace (Manage)" scope is checked

### "Extension validation failed"
- Check that all required fields in package.json are filled
- Ensure README.md exists and has content
- Verify LICENSE file exists

## Current Status

✅ Extension built successfully
✅ VSIX package created: `selfreview-0.1.0.vsix`
⏳ Ready to publish (follow steps above)

## Quick Publish Checklist

- [ ] Create publisher on marketplace.visualstudio.com
- [ ] Create Personal Access Token on dev.azure.com
- [ ] Update `publisher` field in package.json
- [ ] Run `npx vsce login your-publisher-id`
- [ ] Run `npm run publish`
- [ ] Verify extension appears on marketplace
