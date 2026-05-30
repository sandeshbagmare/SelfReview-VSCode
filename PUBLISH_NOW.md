# Publishing Steps for Sandesh Bagmare

## Step 1: Create Your Publisher Account (Do this now)

1. **Open this URL in your browser:**
   https://marketplace.visualstudio.com/manage

2. **Sign in** with your Microsoft account
   - If you don't have one, create a Microsoft account first

3. **Create a new publisher:**
   - Click "Create publisher" button
   - Fill in the form:
     - **Publisher ID**: `sandeshbagmare` (MUST match exactly)
     - **Display Name**: `Sandesh Bagmare` (or your preferred name)
     - **Description**: Brief description about you (e.g., "Software developer creating VS Code extensions")
   - Click "Create"

## Step 2: Create Personal Access Token (PAT)

1. **Open this URL:**
   https://dev.azure.com

2. **Sign in** with the same Microsoft account

3. **Create a token:**
   - Click your profile icon (top right) → "Personal access tokens"
   - Click "New Token"
   - Configure:
     - **Name**: `VS Code Extension Publishing`
     - **Organization**: Select **"All accessible organizations"** (IMPORTANT!)
     - **Expiration**: Choose 90 days or custom
     - **Scopes**: Click "Show all scopes" at the bottom
       - Scroll down to **"Marketplace"**
       - Check both: ✅ **Acquire** and ✅ **Manage**
   - Click "Create"
   - **COPY THE TOKEN** - you'll only see it once!

## Step 3: Publish the Extension

Once you have your token, run these commands:

```powershell
cd C:\Users\sande\OneDrive\Desktop\AI\selfreview

# Login with your publisher ID
npx vsce login sandeshbagmare
# When prompted, paste your Personal Access Token

# Publish the extension
npx vsce publish
```

## Step 4: Verify Publication

After publishing (takes 2-5 minutes):

1. Your extension will be available at:
   https://marketplace.visualstudio.com/items?itemName=sandeshbagmare.selfreview

2. It will appear in VS Code search within 10-15 minutes

3. You can manage it at:
   https://marketplace.visualstudio.com/manage/publishers/sandeshbagmare

## Alternative: Manual Upload (If commands don't work)

1. Go to https://marketplace.visualstudio.com/manage
2. Click on your publisher "sandeshbagmare"
3. Click "New extension" → "Visual Studio Code"
4. Drag and drop: `C:\Users\sande\OneDrive\Desktop\AI\selfreview\selfreview-0.1.0.vsix`
5. Click "Upload"

## Troubleshooting

### "Publisher 'sandeshbagmare' not found"
- Make sure you completed Step 1 and created the publisher
- The publisher ID must be exactly: `sandeshbagmare`

### "Personal Access Token is invalid"
- Ensure you selected "All accessible organizations"
- Ensure "Marketplace (Manage)" scope is checked
- Create a new token if needed

### "Extension validation failed"
- The extension is already validated and ready
- If you see this, check the specific error message

## What Happens After Publishing?

- Extension appears on marketplace in 2-5 minutes
- Searchable in VS Code in 10-15 minutes
- You'll receive email notifications for reviews/ratings
- You can update anytime with: `npx vsce publish patch`

## Ready to Publish?

✅ Extension packaged: `selfreview-0.1.0.vsix`
✅ Publisher ID set: `sandeshbagmare`
✅ All files included and validated

**Next:** Complete Steps 1 & 2 above, then run the commands in Step 3!

---

**Need help?** If you encounter any issues, let me know and I'll help troubleshoot.
