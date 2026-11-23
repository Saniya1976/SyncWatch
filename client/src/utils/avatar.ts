const AVATAR_GRADIENTS = [
  'from-red-600 to-rose-700 text-white',
  'from-purple-600 to-indigo-700 text-white',
  'from-blue-600 to-cyan-700 text-white',
  'from-emerald-600 to-teal-700 text-white',
  'from-amber-600 to-orange-700 text-white',
  'from-fuchsia-600 to-purple-700 text-white',
  'from-violet-600 to-pink-700 text-white',
  'from-teal-600 to-cyan-700 text-white',
];

export function getUserAvatar(id: string, name: string): { initial: string; gradient: string } {
  let hash = 0;
  const str = `${id || ''}_${name || ''}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const gradient = AVATAR_GRADIENTS[absHash % AVATAR_GRADIENTS.length];
  const clean = (name || 'User').trim();
  const initial = clean.length > 0 ? clean.slice(0, 2).toUpperCase() : 'U';
  return { initial, gradient };
}
