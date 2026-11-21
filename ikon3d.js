// 🧊 Ikon 3D (Microsoft Fluent Emoji 3D, lesen MIT — ikon3d/LICENSE-fluentui-emoji.txt)
// i3d('💰') → <img> ikon 3D; jika tiada padanan, emoji asal dipulangkan.
export const IKON3D = {"💰": "money_bag", "📅": "calendar", "🧾": "receipt", "📦": "package", "💸": "money_with_wings", "🪙": "coin", "📊": "bar_chart", "📘": "blue_book", "🧳": "luggage", "🚗": "automobile", "📝": "memo", "⬆️": "up_arrow", "👷": "construction_worker", "👥": "busts_in_silhouette", "💬": "speech_balloon", "🕘": "alarm_clock", "🗒": "spiral_notepad", "📢": "loudspeaker", "🏷": "label", "📜": "scroll", "📲": "mobile_phone_with_arrow", "🦁": "lion", "⚙️": "gear", "⭐": "star", "📣": "megaphone", "👁": "eye", "🏠": "house", "💳": "credit_card", "🔧": "wrench", "✏️": "pencil", "🎟": "admission_tickets", "🔐": "locked_with_key", "🛠": "hammer_and_wrench", "🪪": "identification_card", "⏰": "alarm_clock"};
const BASE = new URL('./ikon3d/', import.meta.url).href;
const buangVS = e => String(e || '').replace(/\uFE0F/g, '');
export function i3d(emoji, kelas = 'i3d'){
  const f = IKON3D[emoji] || IKON3D[buangVS(emoji)] || Object.entries(IKON3D).find(([k]) => buangVS(k) === buangVS(emoji))?.[1];
  return f ? `<img class="${kelas}" src="${BASE}${f}.png" alt="" loading="lazy" decoding="async">` : emoji;
}
// '💰 Kewangan' → ikon 3D + teks
export function teks3d(s, kelas = 'i3d'){
  const m = String(s || '').match(/^(\S+)\s+(.*)$/u);
  if(!m) return s;
  const img = i3d(m[1], kelas);
  return img === m[1] ? s : `${img}<span>${m[2]}</span>`;
}
