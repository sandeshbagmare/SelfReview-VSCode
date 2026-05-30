# Quick Test Guide

## Install and Test the Extension

1. **Install the VSIX**
   - Open VS Code
   - Press `Ctrl+Shift+X` (Extensions view)
   - Click the "..." menu at the top
   - Select "Install from VSIX..."
   - Navigate to: `C:\Users\sande\OneDrive\Desktop\AI\selfreview\selfreview-0.1.0.vsix`
   - Click "Install"

2. **Test Basic Functionality**
   - Open a folder with a git repository
   - Make some changes to files (or have uncommitted changes)
   - Press `Ctrl+Shift+P` to open Command Palette
   - Type "SelfReview: Open Review"
   - The review panel should open showing your changes

3. **Test Inline Comments**
   - In the Diff tab, hover over any changed line
   - Click the 💬 button that appears
   - Type a comment and click "Comment"
   - The comment should appear below the line

4. **Test Overview Tab**
   - Click the "Overview" tab
   - You should see your comment listed
   - Click on it to jump back to the line

5. **Test AI Review (Optional)**
   - Click "🤖 AI Review" button
   - Choose a model (you'll need an API key)
   - Set up API key: `Ctrl+Shift+P` → "SelfReview: Set OpenAI API Key"
   - Run the review again

## What to Check

✅ Extension activates without errors
✅ Diff view shows your changes
✅ Can add comments on lines
✅ Comments persist after closing/reopening
✅ Overview tab shows all comments
✅ Export to Markdown works
✅ Jump to source works

## If Something Doesn't Work

Check the Developer Console:
- `Help` → `Toggle Developer Tools`
- Look for errors in the Console tab

## Ready to Publish?

Once you've tested and everything works, follow the publishing steps in `PUBLISHING.md`!
