# Reclassify Feature - Quick Guide

## 🎯 Where Is It?

**Analytics Dashboard → Click Session ID → Classification Tab → 🔄 Reclassify Button**

## 📸 What It Looks Like

```
┌──────────────────────────────────────────────────┐
│  Classification Details      [🔄 Reclassify]     │
│  ──────────────────────────────────────────      │
│                                                   │
│  Category:  [Digitise]                           │
│  Confidence: 75%                                 │
│  ...                                             │
└──────────────────────────────────────────────────┘
```

## ⚡ Quick Steps

1. **Open Session**
   - Go to Analytics Dashboard
   - Click on any Session ID

2. **Go to Classification Tab**
   - Click "Classification" tab
   - See current classification

3. **Click Reclassify**
   - Click "🔄 Reclassify" button (top right)
   - Confirm the action

4. **View Results**
   - See original vs new classification
   - Check if it changed
   - Page auto-reloads in 3 seconds

## 🎨 Result Display

### If Changed:
```
✅ Classification Changed!

Original:              →              New:
[Digitise]                           [RPA]
Confidence: 75%                      Confidence: 82%
Matrix: 1.0                          Matrix: 2.0

Confidence change: +7.0%
```

### If Unchanged:
```
ℹ️ Classification Unchanged

Original:              →              New:
[Digitise]                           [Digitise]
Confidence: 75%                      Confidence: 77%
Matrix: 1.0                          Matrix: 2.0

Confidence change: +2.0%
```

## 🔑 Key Features

- ✅ **One-Click Reclassification** - Simple button click
- ✅ **Visual Comparison** - See before/after side-by-side
- ✅ **Auto-Reload** - Page refreshes to show updates
- ✅ **Error Handling** - Clear error messages
- ✅ **Confirmation** - Prevents accidental clicks

## 💡 Common Use Cases

### After Matrix Update
```
1. Update decision matrix
2. Select test session
3. Click Reclassify
4. Review changes
```

### Quality Check
```
1. User disputes classification
2. Find session
3. Click Reclassify
4. Verify result
```

### Testing
```
1. Make improvements
2. Reclassify samples
3. Measure impact
```

## ⚠️ Requirements

- ✅ Session must have a classification
- ✅ Credentials must be in sessionStorage
- ✅ Backend must be running
- ✅ Admin access (recommended)

## 🔧 Troubleshooting

**Button not visible?**
- Check you're on Classification tab
- Verify session has classification

**Reclassification fails?**
- Check credentials in sessionStorage
- Verify backend is running
- Check browser console

**No changes?**
- Decision matrix may be same
- Check matrix version in result

## 📊 What Gets Updated

When you reclassify:
- ✅ Session classification updated
- ✅ Analytics cache invalidated
- ✅ Audit log created
- ✅ Full comparison recorded

## 🎉 That's It!

Simple, powerful, and integrated right into your existing workflow!

---

**Need more details?** See [RECLASSIFY_UI_GUIDE.md](RECLASSIFY_UI_GUIDE.md)
