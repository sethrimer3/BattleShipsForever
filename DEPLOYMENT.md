# Quick Start Guide - GitHub Pages Deployment

This guide will help you deploy the Battleships Forever HTML5 game to GitHub Pages in just a few minutes.

## Step-by-Step Deployment

### 1. Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/sethrimer3/BattleShipsForever`
2. Click on **Settings** (gear icon in the top menu)
3. Scroll down and click on **Pages** in the left sidebar

### 2. Configure Source

1. Under "Source", click the dropdown that says "None"
2. Select your branch (usually `main` or `master`)
3. Keep the folder selection as `/ (root)`
4. Click **Save**

### 3. Wait for Deployment

- GitHub will now build and deploy your site
- This usually takes 1-2 minutes
- A green checkmark will appear when it's ready

### 4. Access Your Game

Your game will be live at:
```
https://sethrimer3.github.io/BattleShipsForever/
```

## Verification

To verify the deployment worked:

1. Visit the URL above
2. You should see the game title "⚓ Battleships Forever ⚓"
3. Two 10x10 grids should be visible
4. Ship placement controls should be at the top

## Troubleshooting

### Page shows README instead of game
- Make sure `index.html` is in the root directory (not in a subfolder)
- Check that GitHub Pages source is set to `/ (root)` not `/docs`

### 404 Error
- Wait a few more minutes - deployment can take up to 10 minutes
- Check that GitHub Pages is enabled in Settings
- Verify the branch you selected exists and has the game files

### CSS/JS not loading
- Clear your browser cache (Ctrl+F5 or Cmd+Shift+R)
- Check browser console (F12) for errors
- Verify `style.css` and `game.js` are in the root directory

## Custom Domain (Optional)

If you want to use a custom domain:

1. In GitHub Pages settings, enter your domain in "Custom domain"
2. Add a CNAME record in your DNS settings pointing to `sethrimer3.github.io`
3. Wait for DNS propagation (can take up to 48 hours)

## Updating the Game

To update the game after deployment:

1. Make changes to the files locally
2. Commit and push to your repository
3. GitHub Pages will automatically rebuild and deploy
4. Changes will be live within 1-2 minutes

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Game README](README.md) - Full documentation
- [GitHub Issues](https://github.com/sethrimer3/BattleShipsForever/issues) - Report bugs

---

**That's it! Your game should now be playable online! 🎮⚓**

Share the URL with friends and start playing Battleships Forever in your browser!
