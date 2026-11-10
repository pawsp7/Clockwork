import { app } from './ui/app.js';
import { titleScreen } from './ui/screens/title.js';
import { storyScreen } from './ui/screens/story.js';
import { townScreen } from './ui/screens/town.js';
import { mapScreen } from './ui/screens/map.js';
import { trailScreen } from './ui/screens/trail.js';
import { combatScreen } from './ui/screens/combat.js';
import { endingScreen, gameOverScreen } from './ui/screens/ending.js';

app.register('title', titleScreen);
app.register('story', storyScreen);
app.register('town', townScreen);
app.register('map', mapScreen);
app.register('trail', trailScreen);
app.register('combat', combatScreen);
app.register('ending', endingScreen);
app.register('gameover', gameOverScreen);

async function boot() {
  app.init();
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* fonts are a nicety */
  }
  app.go('title', {}, { fade: false });
}

boot();

// Debug handle for the curious (and for automated checks).
window.__clockwork = app;
