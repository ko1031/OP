const COLOR_MAP = {
  赤: { bg: 'bg-red-600',    text: 'text-white',   label: '赤' },
  緑: { bg: 'bg-green-600',  text: 'text-white',   label: '緑' },
  青: { bg: 'bg-blue-600',   text: 'text-white',   label: '青' },
  紫: { bg: 'bg-purple-600', text: 'text-white',   label: '紫' },
  黒: { bg: 'bg-gray-800',   text: 'text-white',   label: '黒' },
  黄: { bg: 'bg-yellow-400', text: 'text-gray-900',label: '黄' },
};

export default function ColorBadge({ color, small = false }) {
  const cfg = COLOR_MAP[color] || { bg: 'bg-gray-600', text: 'text-white', label: color };
  const size = small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span className={`inline-block rounded font-bold ${cfg.bg} ${cfg.text} ${size}`}>
      {cfg.label}
    </span>
  );
}

export { COLOR_MAP };
