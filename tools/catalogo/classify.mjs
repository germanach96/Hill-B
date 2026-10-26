// Clasifica cada canción de la playlist según de qué tipo de edición viene.
export const LIVE = /\b(live|en vivo|ao vivo|en directo|unplugged|ac[uú]stico|mtv|concierto|in concert|on stage|bbc sessions?)\b|\bvivo\b/i;
export const COMP = /\b(greatest hits|grandes [eé]xitos|best of|the best|lo mejor|essential|esencial|collection|colecci[oó]n|anthology|antolog[ií]a|hits|singles|retrospective|gold|platinum|definitive|the very best|20th century masters|b-sides|rarities|rarezas|exitos|éxitos)\b/i;
export const DELUXE = /\b(deluxe|expanded|edition|edici[oó]n|anniversary|aniversario|bonus|special|legacy|super|version|versi[oó]n|reissue|collector)\b/i;
export const REMASTER = /\bremaster(ed)?\b|\bremasterizado\b/i;

export function caseOf(track) {
  const a = track.album;
  if (a.album_type === 'single') return 'Sencillo';
  if (a.album_type === 'compilation' || COMP.test(a.name)) return 'Recopilatorio';
  if (LIVE.test(a.name) || /[-(]\s*(live|en vivo|ao vivo|en directo)\b/i.test(track.name)) return 'En vivo';
  if (DELUXE.test(a.name)) return 'Deluxe o edición especial';
  if (REMASTER.test(a.name)) return 'Remasterizado';
  return 'Directa';
}
