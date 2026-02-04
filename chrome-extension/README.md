# Aesthetiq Chrome Extension

A Chrome extension that allows you to add clothing items from any website directly to your Aesthetiq virtual wardrobe.

## Features

- 🖱️ **Right-click to add** - Right-click on any clothing image to add it to your wardrobe
- ✨ **AI Analysis** - Optional AI-powered clothing analysis for automatic categorization
- 🏷️ **Quick Categories** - Quickly assign items as Top, Bottom, Shoe, or Accessory
- 📱 **Popup Interface** - Quick access to your recent items and wardrobe
- ⚙️ **Configurable** - Customize API endpoints and default behaviors

## Installation

### Development Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project

### Production Installation

The extension will be available on the Chrome Web Store (coming soon).

## Setup

1. **Install the extension** using the steps above
2. **Log in** - Click the extension icon and log in to your Aesthetiq account
3. **Configure** (optional) - Click the settings icon to configure API endpoints

### Configuration Options

- **Backend API URL**: The URL of your Aesthetiq backend (default: `http://localhost:3001/api`)
- **Frontend URL**: The URL of your Aesthetiq web app (default: `http://localhost:3000`)
- **Default Category**: Pre-select a category when adding items
- **Use AI by Default**: Automatically analyze items with AI

## Usage

### Adding Items

1. Browse to any website with clothing images
2. Right-click on a clothing image
3. Select **"Add to Aesthetiq Wardrobe"**
4. Choose one of the options:
   - **Add as Top/Bottom/Shoe/Accessory** - Quick add with selected category
   - **Add with AI Analysis** - Let AI detect category, brand, and colors

### Quick Add Modal

If you don't select a specific category, a modal will appear where you can:
- Select a category manually
- Add subcategory and brand information
- Include notes
- Enable AI analysis

### Popup Menu

Click the extension icon to:
- View recently added items
- Open your full wardrobe
- Access settings
- Log in/out

## Development

### File Structure

```
chrome-extension/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (handles context menus, API calls)
├── content.js              # Injected into web pages (UI overlays)
├── content.css             # Styles for content script
├── popup/
│   ├── popup.html          # Popup interface
│   ├── popup.js            # Popup logic
│   └── popup.css           # Popup styles
├── options/
│   ├── options.html        # Settings page
│   ├── options.js          # Settings logic
│   └── options.css         # Settings styles
├── lib/
│   └── api.js              # API communication layer
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Building Icons

Replace the placeholder icons with your actual icons:
- `icon16.png` - 16x16 pixels (toolbar)
- `icon48.png` - 48x48 pixels (extensions page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

### Testing

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Aesthetiq extension card
4. Test your changes

### Debugging

- **Background script**: Click "Inspect views: service worker" on the extension card
- **Content script**: Open DevTools on any page, check the Console
- **Popup**: Right-click the extension icon → Inspect popup

## API Endpoints Used

The extension communicates with the following Aesthetiq backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/me` | GET | Verify authentication |
| `/api/wardrobe` | POST | Create wardrobe item |
| `/api/wardrobe` | GET | Fetch recent items |
| `/api/upload/from-url` | POST | Upload image from URL |
| `/api/ai/analyze-clothing` | POST | AI clothing analysis |

## Authentication

The extension uses Clerk for authentication. Users need to:
1. Log in through the Aesthetiq web app
2. The extension stores the auth token securely in Chrome storage
3. All API requests include the auth token

## Security

- Auth tokens are stored in Chrome's secure `sync` storage
- All API requests use HTTPS in production
- CORS is configured on the backend to accept Chrome extension origins

## Troubleshooting

### "Not logged in" error
- Make sure you're logged in to Aesthetiq in the web app
- Try logging out and back in

### Images not uploading
- Check if the image URL is accessible
- Some websites block external access to images
- Try the AI analysis option which uses a different upload method

### CORS errors
- Ensure the backend CORS configuration includes Chrome extensions
- Check that the API URL is correct in settings

## License

MIT License - See LICENSE file in the main project.
