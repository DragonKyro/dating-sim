// Screen router. main.js fills these in; screens call nav.map() etc. without
// importing each other (avoids circular imports).
export const nav = {
  title: () => {},
  map: () => {},
  briefing: (_levelId) => {},
  play: (_levelId, _opts) => {},
  journal: () => {},
};
