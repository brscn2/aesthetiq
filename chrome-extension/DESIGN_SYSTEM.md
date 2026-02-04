# Aesthetiq Chrome Extension - Luxury Fashion Design System

## Overview
The Chrome extension UI has been completely redesigned to align with the Aesthetiq website's luxury fashion aesthetic. The design features a sophisticated dark theme with elegant purple and rose accents, creating a premium and refined user experience.

## Color Palette

### Background Colors
- **Primary Background**: `oklch(0.12 0 0)` - Deep charcoal (#1F1F1F)
- **Secondary Background**: `oklch(0.16 0 0)` - Slightly lighter charcoal
- **Tertiary Background**: `oklch(0.20 0 0)` - Soft dark gray (for elevated surfaces)

### Text Colors
- **Primary Text**: `oklch(0.98 0 0)` - High contrast white
- **Secondary Text**: `oklch(0.70 0 0)` - Muted gray for subtle information

### Accent Colors
- **Primary Accent**: `oklch(0.75 0.15 280)` - Elegant purple
  - Used for: Primary buttons, interactive elements, hover states
- **Secondary Accent**: `oklch(0.70 0.18 320)` - Subtle rose
  - Used for: Secondary interactions, gradients, premium highlights

### Functional Colors
- **Success**: `oklch(0.65 0.15 140)` - Soft green
- **Error**: `oklch(0.60 0.18 30)` - Muted red
- **Border**: `oklch(0.22 0 0)` - Subtle dark border
- **Hover**: `oklch(0.20 0 0)` - Slightly elevated hover state

## Typography

- **Font Family**: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Weights Used**:
  - Light: 300 (rarely used)
  - Regular: 400 (body text)
  - Medium: 500 (form labels)
  - Semibold: 600 (section headings)
  - Bold: 700 (emphasis, uppercase labels)

## Design Components

### Header
- Gradient background using primary and secondary backgrounds
- Logo with subtle drop shadow (purple glow effect)
- Icon button with hover interaction
- Elegant spacing and alignment

### Buttons
- **Primary Button**: Purple-to-rose gradient with smooth hover animation
  - Hover effect: Brightness increase + elevation + shadow
  - Transition: 0.3s ease
- **Secondary Button**: Darker background with border
  - Hover: Background color shift + border accent
- **Text Button**: Minimal style with text color hover

### Cards & Sections
- Dark background with subtle border
- Rounded corners (12px radius)
- Hover states with color transitions
- Organized spacing and hierarchy

### Form Elements
- Dark input backgrounds
- Subtle border with purple focus state
- Clear visual feedback on interaction
- Consistent spacing and sizing

## Special Effects

### Gradient Effects
- **Button Gradient**: Purple to rose accent
- **Avatar Gradient**: Purple to rose for user avatars
- **Logo Glow**: Purple drop shadow effect

### Animations
- **Transitions**: 0.2-0.3s ease for smooth interactions
- **Hover Effects**: Brightness changes + transform + shadows
- **Loading Spinner**: Purple accent color with smooth rotation
- **Toast Notifications**: Smooth slide-in animations

## Responsive Behavior

- **Popup Width**: 320px (standard Chrome extension popup)
- **Options Page**: Max-width 600px with centered layout
- **Padding**: Consistent 20px spacing
- **Touch-Friendly**: Adequate button sizes (40px+ hit targets)

## Accessibility

- **Color Contrast**: High contrast white on dark backgrounds (WCAG AAA compliant)
- **Focus States**: Clear border and shadow indicators
- **Icon Buttons**: Title attributes for descriptions
- **Form Labels**: Associated with inputs for screen readers
- **Semantic HTML**: Proper heading hierarchy and structure

## Files Updated

1. **popup/popup.css** - Main popup interface styles
2. **popup/popup.html** - Updated icon (✨ sparkle instead of 👗)
3. **options/options.css** - Settings page styles
4. **content.css** - Content script toast notifications and animations

## Design Principles Applied

1. **Luxury & Sophistication**: Deep dark theme with premium accents
2. **Minimalism**: Clean, uncluttered interface with intentional spacing
3. **Consistency**: Unified color system and component styling
4. **Elegance**: Refined typography, subtle animations, and refined details
5. **User Focus**: Clear visual hierarchy and intuitive interactions
6. **Premium Feel**: Gradients, shadows, and smooth transitions

## Future Enhancements

- Support for light theme toggle (if needed)
- Additional gradient variations for seasonal themes
- Custom font loading for enhanced typography
- Advanced animations for complex interactions
- Micro-interactions for delightful UX moments

## Integration Notes

The design system is fully compatible with the frontend's luxury fashion aesthetic. All CSS variables use the same OKLch color space for consistency across the product ecosystem.

To maintain design consistency:
- Keep color values in OKLch format
- Use consistent spacing multiples (8px base unit)
- Maintain 12px border radius for rounded corners
- Use the same font family across all surfaces
