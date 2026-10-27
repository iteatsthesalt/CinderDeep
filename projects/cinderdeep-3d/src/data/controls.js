// default bindings by KeyboardEvent.code; remappable from the controls screen
export const DEFAULT_BINDINGS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ'], dash: ['Space'], ability: ['KeyQ'], interact: ['KeyF'], potion: ['KeyR'], map: ['KeyM'], pause: ['Escape', 'KeyP'],
};
export const ACTION_LABELS = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', attack: 'Attack (or hold left click)',
  dash: 'Dash / dodge', ability: 'Ability', interact: 'Interact', potion: 'Drink a flask', map: 'Floor map', pause: 'Pause',
};
export const keyLabel = (code) => code.replace(/^Key/, '').replace(/^Arrow/, '↔ ').replace('Space', 'Space').replace('Escape', 'Esc');
