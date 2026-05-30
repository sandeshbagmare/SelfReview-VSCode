# SelfReview - Professional Code Review Tool for VS Code

A comprehensive VS Code extension that brings Bitbucket-style code review experience directly into your editor. Review your code changes with inline comments, track discussions, and get intelligent automated feedback - all without leaving VS Code.

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

### 📊 Professional Diff Viewer
- Bitbucket-style interface with side-by-side and unified views
- Syntax highlighting for all languages
- File-by-file navigation with change statistics
- Visual indicators for additions, deletions, and modifications

### 💬 Inline Comments & Discussions
- Click any line to add comments
- Threaded conversations with replies
- Comment status tracking (Open/Resolved/Won't Fix)
- Persistent storage that survives restarts
- Jump to source from any comment

### 🎯 Activity Feed
- Dedicated Activity tab showing all comments
- Chronological feed like Bitbucket
- Rich comment cards with status badges
- Quick actions: Reply, Resolve, Delete, Jump to Code

### 📋 Smart Overview
- Centralized dashboard for all comments
- Filter by status and severity
- Statistics and metrics
- Quick navigation to any comment

### 📝 Commit History
- Browse commits in your branch
- View author, date, message, and hash
- Per-commit diff viewing

### 🤖 Intelligent Automated Review
- Support for GPT-4, Claude, and local Ollama models
- Custom review rules from your project
- Severity classification (Bug/Security/Performance/Style)
- Contextual analysis

### 🔒 Security & Privacy
- API keys stored in encrypted SecretStorage
- All comments stored locally
- Offline capable
- No telemetry or tracking

### 📤 Export & Sharing
- Export comments only (clean format)
- Export full report (with statistics)
- Markdown format for easy sharing

## 🚀 Getting Started

### Installation

1. Install from VS Code Marketplace (search "SelfReview")
2. Or install from VSIX file: `code --install-extension selfreview-0.2.0.vsix`

### Quick Start

1. Open any workspace with a git repository
2. Press `Ctrl+Shift+P` and run "SelfReview: Open Review"
3. Review your changes in the Diff tab
4. Click any line to add a comment
5. Use Activity tab to see all comments

## 📖 Usage

### Reviewing Changes

1. Make changes to your code
2. Open SelfReview panel
3. Browse through the diff viewer
4. Add comments on specific lines
5. Track and resolve discussions

### Setting Up AI Review

**For OpenAI (GPT-4):**
```
1. Get API key from https://platform.openai.com
2. Run: "SelfReview: Set OpenAI API Key"
3. Paste your key
```

**For Anthropic (Claude):**
```
1. Get API key from https://console.anthropic.com
2. Run: "SelfReview: Set Anthropic API Key"
3. Paste your key
```

**For Ollama (Local/Free):**
```
1. Install Ollama from https://ollama.ai
2. Run: ollama pull llama3
3. No API key needed!
```

### Custom Review Rules

Create `.selfreview/review-rules.md` in your project:

```markdown
# Review Rules

## Code Quality
- All functions must have JSDoc comments
- No use of `any` type in TypeScript
- Proper error handling required

## Security
- No hardcoded credentials
- Input validation for all user inputs
- Use parameterized SQL queries
```

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Back/Forward Navigation** | Navigate between tabs with history |
| **Delete Comments** | Remove entire comment threads |
| **Activity Feed** | Bitbucket-style comment feed |
| **Export Options** | Comments only or full report |
| **Live Counters** | Real-time open/resolved tracking |
| **Status Badges** | Visual indicators for comment status |
| **Severity Tags** | Bug/Security/Perf/Style classification |

## 🔧 Commands

- `SelfReview: Open Review` - Open the review panel
- `SelfReview: Set OpenAI API Key` - Configure OpenAI
- `SelfReview: Set Anthropic API Key` - Configure Anthropic

## ⚙️ Configuration

```json
{
  "selfreview.defaultModels": [
    "gpt-4o",
    "claude-3-5-sonnet-20241022",
    "ollama:llama3"
  ],
  "selfreview.rulesFile": ".selfreview/review-rules.md"
}
```

## 📊 Comparison

| Feature | SelfReview | GitHub PR | GitLens |
|---------|-----------|-----------|---------|
| Offline Review | ✅ | ❌ | ✅ |
| Inline Comments | ✅ | ✅ | ❌ |
| AI Review | ✅ | ✅ | ❌ |
| Local Storage | ✅ | ❌ | ✅ |
| Custom Rules | ✅ | ❌ | ❌ |
| Activity Feed | ✅ | ✅ | ❌ |
| No Account Needed | ✅ | ❌ | ❌ |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with:
- React for the UI
- simple-git for Git operations
- OpenAI & Anthropic SDKs
- VS Code Extension API

## 📞 Support

- GitHub Issues: [Report a bug](https://github.com/sandeshbagmare/SelfReview-VSCode/issues)
- Email: sandeshbagmare2110@gmail.com

## 🗺️ Roadmap

- [ ] Team collaboration features
- [ ] GitHub/GitLab integration
- [ ] Review templates
- [ ] Metrics and analytics
- [ ] Multi-language UI support

---

**Enjoy reviewing your code!** ⭐ Star this repo if you find it helpful!
