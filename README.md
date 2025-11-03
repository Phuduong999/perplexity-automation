# Perplexity Automation - Excel Tag Processor

Chrome extension tự động xử lý Excel files với Perplexity AI để tag ingredients.

## 🚀 Features

- **Auto-load 12 Excel files** từ extension folder
- **Process tất cả REVIEW rows** với Perplexity AI
- **Auto-tag ingredients** vào 9 categories (columns AT-BB)
- **Auto-download** processed files
- **Anti-detection**: Tạo new thread mỗi 50 rows
- **Fully automated**: Chạy overnight không cần can thiệp

## 📋 Requirements

- Node.js 16+
- npm hoặc yarn
- Chrome/Edge browser

## 🛠️ Setup

### Windows

```bash
# Clone repo
git clone https://github.com/Phuduong999/perplexity-automation.git
cd perplexity-automation

# Install dependencies
npm install

# Build extension
npm run build
```

### macOS

```bash
# Clone repo
git clone https://github.com/Phuduong999/perplexity-automation.git
cd perplexity-automation

# Install dependencies
npm install

# Build extension
npm run build
```

## 📦 Load Extension

### Chrome (Windows/macOS)

1. Mở Chrome → `chrome://extensions`
2. Bật **Developer mode**
3. Click **Load unpacked**
4. Chọn folder `dist/`

### Edge (Windows/macOS)

1. Mở Edge → `edge://extensions`
2. Bật **Developer mode**
3. Click **Load unpacked**
4. Chọn folder `dist/`

## 📂 File Structure

```
perplexity-automation/
├── src/
│   ├── IngredientName/          # Excel files (Part1-12)
│   │   ├── Food Exclusion Tag_RootFile_Part1.xlsx
│   │   ├── Food Exclusion Tag_RootFile_Part2.xlsx
│   │   └── ... (Part3-12)
│   ├── background.ts            # Background service worker
│   ├── content.ts               # Perplexity page automation
│   ├── excelPopup.ts            # Main workflow logic
│   ├── excelWorkflow.ts         # Excel processing
│   ├── popup.ts                 # Simple popup
│   ├── types.ts                 # TypeScript types
│   ├── utils.ts                 # Utilities
│   ├── promptForce.md           # AI prompt template
│   ├── excelPopup.html          # Excel popup UI
│   └── popup.html               # Simple popup UI
├── dist/                        # Built extension (generated)
├── manifest.json                # Extension manifest
├── webpack.config.js            # Build config
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies

```

## 🎯 Usage

### Production Mode (50 rows/thread)

1. **Place Excel files** trong `src/IngredientName/`:
   - `Food Exclusion Tag_RootFile_Part1.xlsx`
   - `Food Exclusion Tag_RootFile_Part2.xlsx`
   - ... (Part3-12)

2. **Load extension** vào Chrome/Edge

3. **Open extension popup** (click icon)

4. **Auto-start**: Extension tự động:
   - Load Part1
   - Mở Perplexity tab
   - Process tất cả REVIEW rows
   - Mỗi 50 rows → Click "New Thread"
   - Download Part1 → Load Part2 → ...
   - Xong Part12 → Done!

5. **Check results**: Files được download vào `Downloads/` folder

### Test Mode (5 rows/thread)

Để test nhanh:

```typescript
// src/excelPopup.ts
const TEST_MODE = true; // Change to true
```

Rebuild:
```bash
npm run build
```

## 📊 Workflow

```
Part1 (324 REVIEW rows)
├── Process rows 1-50 → markdown-1 to markdown-50
├── Click "New Thread" → Reset markdown counter
├── Process rows 51-100 → markdown-1 to markdown-50
├── Click "New Thread" → Reset markdown counter
├── Process rows 101-150 → markdown-1 to markdown-50
├── ... (continue until all rows done)
└── Download Part1 → Load Part2

Part2 (X REVIEW rows)
├── Process rows 1-50
├── Click "New Thread"
├── ... (same as Part1)
└── Download Part2 → Load Part3

... (Part3-12)

Part12
└── Download Part12 → ALL DONE! 🎉
```

## 🔧 Configuration

### Change rows per thread

```typescript
// src/excelPopup.ts
const ROWS_PER_THREAD = 50; // Change to any number
```

### Change total parts

```typescript
// src/excelPopup.ts
const TOTAL_PARTS = 12; // Change if you have more/less files
```

### Change Excel columns

```typescript
// src/excelWorkflow.ts
private readonly TAG_COLUMN_MAP = {
  'Allergen Tag': 'AT',
  'Dietary Preference Tag': 'AU',
  // ... add more mappings
};
```

## 🐛 Troubleshooting

### Extension không load được Excel files

**Lỗi**: `Failed to load Part1: Failed to fetch`

**Fix**:
1. Check files có trong `src/IngredientName/` không
2. Rebuild extension: `npm run build`
3. Reload extension trong Chrome

### Content script không inject

**Lỗi**: `Receiving end does not exist`

**Fix**:
1. Mở `chrome://extensions`
2. Click **service worker** để check logs
3. Reload extension
4. Refresh Perplexity tab

### Markdown không đọc được

**Lỗi**: `Timeout waiting for markdown-content-X`

**Fix**:
1. Check Perplexity có response không
2. Check console logs (F12)
3. Có thể AI đang thinking lâu → Extension sẽ đợi vô hạn

### New Thread button không click được

**Lỗi**: `New Thread button not found`

**Fix**:
1. Check Perplexity UI có thay đổi không
2. Update selector trong `src/content.ts`:
   ```typescript
   const button = document.querySelector('button[data-testid="sidebar-new-thread"]');
   ```

## 📝 Development

### Build for development

```bash
npm run build
```

### Watch mode (auto-rebuild)

```bash
npm run watch
```

### Clean build

```bash
rm -rf dist/
npm run build
```

## 🌐 Platform-Specific Notes

### Windows
- Paths use backslashes: `C:\Users\...`
- PowerShell default shell
- Chrome data: `%LOCALAPPDATA%\Google\Chrome\User Data`

### macOS
- Paths use forward slashes: `/Users/...`
- Bash/Zsh default shell
- Chrome data: `~/Library/Application Support/Google/Chrome`

## 📄 License

MIT

## 👤 Author

Phuduong999

## 🔗 Links

- GitHub: https://github.com/Phuduong999/perplexity-automation
- Issues: https://github.com/Phuduong999/perplexity-automation/issues

