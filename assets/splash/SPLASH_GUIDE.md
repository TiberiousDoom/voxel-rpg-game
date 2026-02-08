# 🎨 Splash Page / Title Screen Images

This folder contains images for the game's intro/title screen.

## 📁 What Goes Here

### Main Splash Image
**File:** `title-screen.png` or `splash.png`

**Recommended Size:**
- Width: 800-1200px
- Height: 600-800px
- Or larger for high-DPI displays

**Format:** PNG or JPG

**Content Ideas:**
- Game logo/title: "The Wound of Power"
- Dramatic artwork showing the game's theme
- Silhouette of player character
- Mystical/magical effects
- Dark fantasy atmosphere

---

## 🎨 Design Considerations

### Current Intro Screen
The intro screen currently shows:
- Title: "The Wound of Power"
- Story text about being struck by a mystical being
- Class selection (Warrior, Mage, Rogue)
- "Begin Your Journey" button
- "Load Game" button

### Splash Image Options

**Option 1: Full Background**
- Large background image behind all UI elements
- Text overlays on top
- Creates atmosphere

**Option 2: Header/Banner**
- Horizontal banner at top
- UI elements below
- Cleaner, more focused

**Option 3: Logo/Title Graphic**
- Replace text title with stylized logo image
- Can include effects, styling
- Professional look

---

## 📐 Technical Specs

### Recommended Specifications:
```
Filename: title-screen.png
Size: 1200x800px (or 1920x1080 for HD)
Format: PNG (with or without transparency)
File Size: Under 500KB (compress for web)
DPI: 72 (web standard)
```

### Style Guide:
- **Theme:** Dark fantasy, mystical, powerful
- **Colors:** Purples, blues, dark tones (matches current gradient)
- **Mood:** Epic, mysterious, inviting
- **Clarity:** Ensure text remains readable on top

---

## 💡 Design Tips

1. **Test Legibility:** Make sure white text is readable on your background
2. **Mobile-Friendly:** Consider how it looks at smaller sizes
3. **Load Time:** Keep file size reasonable (under 500KB)
4. **Focal Point:** Draw attention to center where buttons appear
5. **Atmosphere:** Match the game's magical/fantasy theme

---

## 🖼️ Example Compositions

### Composition A: Atmospheric Background
```
┌─────────────────────────────────┐
│     [Mystical Energy Effects]   │
│                                  │
│     The Wound of Power           │
│    [Subtitle/Tagline]            │
│                                  │
│    [Class Selection Cards]       │
│                                  │
│       [Begin Journey]            │
│       [Load Game]                │
└─────────────────────────────────┘
```

### Composition B: Character Focus
```
┌─────────────────────────────────┐
│  [Silhouette of Hero]            │
│                                  │
│                                  │
│     The Wound of Power           │
│                                  │
│    [Magical Wound Effect]        │
│                                  │
│    [Class Selection]             │
│    [Buttons]                     │
└─────────────────────────────────┘
```

### Composition C: Logo/Title Treatment
```
┌─────────────────────────────────┐
│                                  │
│    ╔═══════════════════╗         │
│    ║  THE WOUND OF     ║         │
│    ║     POWER         ║         │
│    ╚═══════════════════╝         │
│   [Glowing mystical effects]     │
│                                  │
│    [Class Selection]             │
│    [Buttons]                     │
└─────────────────────────────────┘
```

---

## 🚀 How It Will Be Used

Once you provide a splash image, I'll integrate it into the intro screen:

```javascript
// Example integration
<div
  className="intro-screen"
  style={{
    backgroundImage: 'url(/assets/splash/title-screen.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }}
>
  {/* UI elements overlay */}
</div>
```

---

## 📝 Variants You Can Create

You can provide multiple versions:

- `title-screen.png` - Main splash image
- `title-screen-mobile.png` - Optimized for small screens
- `logo.png` - Just the game logo/title
- `background-pattern.png` - Repeating pattern background
- `hero-silhouette.png` - Character artwork

---

## ✅ Quick Checklist

When creating your splash image:

- [ ] Size is at least 1200x800px
- [ ] File format is PNG or JPG
- [ ] File size is under 500KB
- [ ] White text will be readable on top
- [ ] Matches the dark fantasy theme
- [ ] Looks good at different screen sizes
- [ ] Has a focal point in the center

---

**Ready?** Just drop your image in this folder and let me know!
I'll integrate it into the intro screen. 🎨
