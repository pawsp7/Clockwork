import { app } from '../app.js';
import { h, btn } from '../dom.js';
import { audio } from '../../core/audio.js';

export function openSettings(extra = []) {
  app.openSheet((close) => {
    const slider = (key) => {
      const out = h('span.dim', `${Math.round(audio.prefs[key] * 100)}`);
      const input = h('input.slider', {
        type: 'range',
        min: 0,
        max: 100,
        value: Math.round(audio.prefs[key] * 100),
        oninput: (e) => {
          audio.prefs[key] = e.target.value / 100;
          out.textContent = e.target.value;
          audio.savePrefs();
        },
      });
      return [input, out];
    };
    const speeds = ['slow', 'normal', 'fast', 'instant'];
    return h(
      'div.panel.sheet',
      { style: { left: '220px', right: '220px', top: '90px', bottom: 'auto' } },
      h('div.sheet-head', h('div', h('h2', 'Settings'))),
      h(
        'div.sheet-body',
        h('div.settings-row', h('span', 'Music'), ...slider('music')),
        h('div.settings-row', h('span', 'Sound effects'), ...slider('sfx')),
        h(
          'div.settings-row',
          h('span', 'Mute all'),
          btn(audio.prefs.muted ? 'Muted' : 'On', () => {
            audio.prefs.muted = !audio.prefs.muted;
            audio.savePrefs();
            app.refreshSheet();
          }, { cls: `small${audio.prefs.muted ? ' selected' : ''}` }),
          h('span'),
        ),
        h(
          'div.settings-row',
          h('span', 'Text speed'),
          h(
            'div.row',
            speeds.map((s) =>
              btn(s[0].toUpperCase() + s.slice(1), () => {
                app.settings.textSpeed = s;
                app.saveSettings();
                app.refreshSheet();
              }, { cls: `small${app.settings.textSpeed === s ? ' selected' : ''}` }),
            ),
          ),
          h('span'),
        ),
        extra,
      ),
      h('div.sheet-foot', h('span.faint', { style: { fontSize: '13px' } }, 'Your journey saves itself in town and when you set out.'), h('div.spacer'), btn('Close', close, { cls: 'small' })),
    );
  });
}

/** A small yes/no prompt drawn in the game's style. */
export function confirmSheet(title, text, yes, { yesLabel = 'Yes', noLabel = 'Cancel' } = {}) {
  app.openSheet((close) =>
    h(
      'div.panel.sheet',
      { style: { left: '250px', right: '250px', top: '160px', bottom: 'auto' } },
      h('div.sheet-head', h('div', h('h2', title))),
      h('div.sheet-body', h('p.dim', { style: { fontSize: '16px', lineHeight: 1.45 } }, text)),
      h(
        'div.sheet-foot',
        h('div.spacer'),
        btn(noLabel, close, { cls: 'small' }),
        btn(yesLabel, () => {
          close();
          yes();
        }, { cls: 'small primary' }),
      ),
    ),
  );
}
