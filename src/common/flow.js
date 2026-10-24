(function (root) {
  'use strict';
  const destinations = { bulb: 'switches', key: 'maze', toothbrush: 'routine', cane: 'limb', spool: 'needle', suitcase: 'suitcase', chart: 'mri' };
  const minigames = Object.values(destinations);
  const initial = () => ({ stage: 'intro', found: null, activeObject: null, completed: [] });
  function act(state, event) {
    if (event.type === 'manual' && state.stage === 'intro') return { ...state, stage: 'digging' };
    if (event.type === 'found' && state.stage === 'digging' && destinations[event.object]) return { ...state, found: event.object };
    if (event.type === 'dismiss' && state.stage === 'digging') return { ...state, found: null };
    if (event.type === 'enter' && state.stage === 'digging' && state.found === event.object && destinations[event.object]) return { ...state, stage: destinations[event.object], found: null, activeObject: event.object };
    if (['back', 'fail'].includes(event.type) && minigames.includes(state.stage) && event.stage === state.stage) {
      return { ...state, stage: 'digging', found: null, activeObject: null };
    }
    if (event.type === 'complete' && minigames.includes(state.stage) && event.stage === state.stage) {
      return { stage: 'digging', found: null, activeObject: null, completed: [...new Set([...state.completed, state.stage])] };
    }
    return state;
  }
  const api = { destinations, minigames, initial, act };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DemoFlow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
