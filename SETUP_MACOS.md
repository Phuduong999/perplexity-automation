# Setup Guide - macOS

## 📋 Prerequisites

- macOS 10.15+ (Catalina or later)
- Node.js 16+ and npm
- Chrome or Edge browser
- Git (optional, for cloning)

## 🛠️ Installation

### Option 1: Automated Setup (Recommended)

```bash
# Clone repository
git clone https://github.com/Phuduong999/perplexity-automation.git
cd perplexity-automation

# Run setup script
chmod +x setup-macos.sh
./setup-macos.sh
```

### Option 2: Manual Setup

```bash
# Clone repository
git clone https://github.com/Phuduong999/perplexity-automation.git
cd perplexity-automation

# Install dependencies
npm install

# Build extension
npm run build
```

## 📦 Load Extension in Chrome/Edge

### Chrome

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `dist/` folder from the project directory
6. Extension should now appear in your extensions list

### Edge

1. Open Edge
2. Navigate to `edge://extensions`
3. Enable **Developer mode** (toggle in left sidebar)
4. Click **Load unpacked**
5. Select the `dist/` folder from the project directory
6. Extension should now appear in your extensions list

## 📂 File Preparation

### Excel Files Location

Place your Excel files in `src/IngredientName/`:

```
src/IngredientName/
├── Food Exclusion Tag_RootFile_Part1.xlsx
├── Food Exclusion Tag_RootFile_Part2.xlsx
├── Food Exclusion Tag_RootFile_Part3.xlsx
├── ...
└── Food Exclusion Tag_RootFile_Part12.xlsx
```

**Important**: Files must be named exactly as shown above.

### File Format Requirements

Each Excel file must have:
- Column A: `_id` (ingredient ID)
- Column B: `Status` (REVIEW or OK)
- Column C: `Name` (ingredient name)
- Columns AT-BB: Tag columns (will be auto-filled)

## 🚀 Usage

### Starting the Workflow

1. **Open Extension Popup**
   - Click the extension icon in Chrome/Edge toolbar
   - Or use keyboard shortcut (if configured)

2. **Auto-Start**
   - Extension automatically loads Part1.xlsx
   - After 3 seconds, processing starts automatically
   - No manual intervention needed

3. **Monitor Progress**
   - Watch the log panel for real-time updates
   - Progress bar shows completion percentage
   - Current row and file information displayed

### What Happens Automatically

```
1. Load Part1.xlsx from extension folder
2. Find all rows with Status = "REVIEW"
3. For each REVIEW row:
   - Send ingredient name to Perplexity AI
   - Wait for AI response
   - Parse JSON tags from response
   - Clear old tags (columns AT-BB)
   - Write new tags to Excel
   - Update Status to "OK" with green background
4. Every 50 rows:
   - Click "New Thread" button in Perplexity
   - Reset markdown counter
   - Continue processing
5. When Part1 complete:
   - Auto-download processed file
   - Load Part2.xlsx
   - Repeat steps 2-4
6. Continue until all 12 parts processed
7. Done! 🎉
```

## 🔧 Configuration

### Change Rows Per Thread

Edit `src/excelPopup.ts`:

```typescript
const ROWS_PER_THREAD = 50; // Change to any number
```

Then rebuild:

```bash
npm run build
```

### Enable Test Mode

For quick testing with 5 rows per thread:

```typescript
const TEST_MODE = true; // Change to true
```

Then rebuild:

```bash
npm run build
```

### Change Total Parts

If you have more or fewer than 12 files:

```typescript
const TOTAL_PARTS = 12; // Change to your number
```

## 🐛 Troubleshooting

### Node.js Not Found

**Error**: `command not found: node`

**Solution**:
```bash
# Install Node.js via Homebrew
brew install node

# Or download from https://nodejs.org/
```

### Permission Denied on Setup Script

**Error**: `Permission denied: ./setup-macos.sh`

**Solution**:
```bash
chmod +x setup-macos.sh
./setup-macos.sh
```

### Extension Not Loading Excel Files

**Error**: `Failed to load Part1: Failed to fetch`

**Solution**:
1. Verify files exist in `src/IngredientName/`
2. Check file names match exactly
3. Rebuild extension: `npm run build`
4. Reload extension in Chrome

### Content Script Not Injecting

**Error**: `Receiving end does not exist`

**Solution**:
1. Open `chrome://extensions`
2. Click **service worker** to view logs
3. Reload extension
4. Refresh Perplexity tab

### Build Errors

**Error**: `Module not found` or `Cannot find module`

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📊 Expected Performance

### Processing Time

- **Per row**: ~10-15 seconds (AI response time)
- **Per 50 rows**: ~8-12 minutes
- **Per file** (324 rows): ~50-70 minutes
- **All 12 files**: ~10-14 hours

### Overnight Processing

Perfect for running overnight:
1. Start extension before bed
2. Let it run for 10-14 hours
3. Wake up to completed files in Downloads folder

## 🔍 Monitoring

### Extension Logs

- Open extension popup to see real-time logs
- Logs show:
  - Current row being processed
  - AI responses
  - Tag mappings
  - Errors (if any)
  - Progress percentage

### Browser Console

For detailed debugging:
1. Right-click extension icon → **Inspect popup**
2. View console logs
3. Check for errors

### Background Service Worker

For background script logs:
1. Go to `chrome://extensions`
2. Find your extension
3. Click **service worker**
4. View console logs

## 📥 Output Files

### Download Location

Processed files are downloaded to:
- macOS: `~/Downloads/`

### File Naming

Files keep original names:
- `Food Exclusion Tag_RootFile_Part1.xlsx`
- `Food Exclusion Tag_RootFile_Part2.xlsx`
- etc.

### File Contents

Each processed file contains:
- Original data (columns A-AS)
- New tags (columns AT-BB)
- Status changed from "REVIEW" to "OK"
- Status column has green background (#00FF00)

## 🔄 Updating

### Pull Latest Changes

```bash
cd perplexity-automation
git pull origin main
npm install
npm run build
```

### Reload Extension

1. Go to `chrome://extensions`
2. Find your extension
3. Click **Reload** button (circular arrow icon)

## 💡 Tips

### Performance Optimization

- Close unnecessary browser tabs
- Disable other extensions temporarily
- Ensure stable internet connection
- Don't put Mac to sleep during processing

### Reliability

- Keep extension popup open (don't close it)
- Don't switch away from Perplexity tab too often
- Monitor first few rows to ensure everything works
- Check logs for any errors

### Debugging

- Enable test mode for quick verification
- Check one file at a time initially
- Verify Excel file format matches requirements
- Test with small subset of rows first

## 📞 Support

### Issues

Report issues at: https://github.com/Phuduong999/perplexity-automation/issues

### Common Questions

**Q: Can I process files in parallel?**
A: No, files are processed sequentially to avoid rate limiting.

**Q: Can I pause and resume?**
A: Not currently. Stop button stops processing completely.

**Q: What if AI doesn't respond?**
A: Extension waits indefinitely. Check Perplexity tab for errors.

**Q: Can I use different Excel files?**
A: Yes, but update file names in code and rebuild.

## ✅ Verification

After setup, verify everything works:

1. **Check extension loaded**:
   - Extension icon appears in toolbar
   - No errors in `chrome://extensions`

2. **Check files present**:
   ```bash
   ls -la src/IngredientName/
   # Should show 12 .xlsx files
   ```

3. **Test with one file**:
   - Set `TEST_MODE = true`
   - Set `TOTAL_PARTS = 1`
   - Rebuild and test

4. **Monitor logs**:
   - Open popup
   - Watch for "Auto-loading Part1.xlsx..."
   - Should see processing start after 3 seconds

## 🎯 Ready to Go!

If all checks pass, you're ready to process all files:

1. Set `TEST_MODE = false`
2. Set `TOTAL_PARTS = 12`
3. Rebuild: `npm run build`
4. Reload extension
5. Open popup
6. Let it run! 🚀

