/**
 * PirateMapBg — SVGベースの海賊地図背景コンポーネント
 * fixedポジションで全画面に敷き、z-0 に配置する
 */
export default function PirateMapBg() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%" height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          {/* 海洋グラデーション */}
          <radialGradient id="oceanGrad" cx="50%" cy="40%" r="70%">
            <stop offset="0%"  stopColor="#0f1e45" />
            <stop offset="60%" stopColor="#080f28" />
            <stop offset="100%" stopColor="#040810" />
          </radialGradient>

          {/* 羊皮紙風テクスチャ（フィルター） */}
          <filter id="parchment" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blend"/>
            <feComposite in="blend" in2="SourceGraphic" operator="in"/>
          </filter>

          {/* 海の波パターン */}
          <pattern id="wavePattern" x="0" y="0" width="60" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q15 0 30 10 Q45 20 60 10" fill="none" stroke="#1a3060" strokeWidth="0.8" opacity="0.5"/>
          </pattern>

          {/* 羅針盤ライン（菱形グリッド） */}
          <pattern id="rhumbGrid" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <line x1="0" y1="60" x2="120" y2="60" stroke="#c9a227" strokeWidth="0.2" opacity="0.12"/>
            <line x1="60" y1="0" x2="60" y2="120" stroke="#c9a227" strokeWidth="0.2" opacity="0.12"/>
          </pattern>

          {/* コンパスラインのマスク */}
          <radialGradient id="compassLineFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="white" stopOpacity="1"/>
            <stop offset="80%" stopColor="white" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <mask id="compassMask">
            <rect x="0" y="0" width="300" height="300" fill="url(#compassLineFade)"/>
          </mask>
        </defs>

        {/* ── ベース背景 ── */}
        <rect width="1440" height="900" fill="url(#oceanGrad)"/>

        {/* ── 波パターン ── */}
        <rect width="1440" height="900" fill="url(#wavePattern)" opacity="0.6"/>

        {/* ── 羅針盤グリッド ── */}
        <rect width="1440" height="900" fill="url(#rhumbGrid)"/>

        {/* ── 外枠（古地図の額縁） ── */}
        <rect x="14" y="10" width="1412" height="880" fill="none"
          stroke="#c9a227" strokeWidth="1.5" strokeOpacity="0.25" rx="4"/>
        <rect x="22" y="18" width="1396" height="864" fill="none"
          stroke="#c9a227" strokeWidth="0.7" strokeOpacity="0.15" rx="3"/>

        {/* ── 緯度経度風ライン ── */}
        {[0.15,0.3,0.45,0.6,0.75,0.9].map((r,i) => (
          <line key={`h${i}`} x1="14" y1={r*900} x2="1426" y2={r*900}
            stroke="#c9a227" strokeWidth="0.4" strokeOpacity="0.1"/>
        ))}
        {[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9].map((r,i) => (
          <line key={`v${i}`} x1={r*1440} y1="10" x2={r*1440} y2="890"
            stroke="#c9a227" strokeWidth="0.4" strokeOpacity="0.1"/>
        ))}

        {/* ── 航路ドット線（左上→右下） ── */}
        <path d="M 100 80 Q 400 300 700 250 Q 1000 200 1350 480"
          fill="none" stroke="#c9a227" strokeWidth="1.2" strokeOpacity="0.2"
          strokeDasharray="6 8"/>
        {/* 航路ドット線（右上→左下） */}
        <path d="M 1350 100 Q 1000 400 700 380 Q 400 360 80 600"
          fill="none" stroke="#c9a227" strokeWidth="1" strokeOpacity="0.15"
          strokeDasharray="4 10"/>

        {/* ── 島シルエット（左上エリア） ── */}
        <ellipse cx="200" cy="160" rx="55" ry="30" fill="#0d1f3f" fillOpacity="0.5"
          stroke="#c9a227" strokeWidth="0.8" strokeOpacity="0.2"/>
        <ellipse cx="215" cy="152" rx="30" ry="18" fill="#0d1f3f" fillOpacity="0.4"/>
        <ellipse cx="185" cy="165" rx="20" ry="12" fill="#0d1f3f" fillOpacity="0.35"/>

        {/* ── 島シルエット（右下エリア） ── */}
        <ellipse cx="1280" cy="760" rx="70" ry="35" fill="#0d1f3f" fillOpacity="0.5"
          stroke="#c9a227" strokeWidth="0.8" strokeOpacity="0.2"/>
        <ellipse cx="1310" cy="748" rx="40" ry="22" fill="#0d1f3f" fillOpacity="0.4"/>

        {/* ── 島シルエット（右上） ── */}
        <ellipse cx="1180" cy="140" rx="45" ry="22" fill="#0d1f3f" fillOpacity="0.45"
          stroke="#c9a227" strokeWidth="0.7" strokeOpacity="0.18"/>

        {/* ── コンパスローズ（左下コーナー） ── */}
        <g transform="translate(130,750)">
          {/* コンパス背景 */}
          <circle r="62" fill="#06091a" fillOpacity="0.7" stroke="#c9a227" strokeWidth="1" strokeOpacity="0.4"/>
          <circle r="55" fill="none" stroke="#c9a227" strokeWidth="0.4" strokeOpacity="0.3"/>
          <circle r="10" fill="#c9a227" fillOpacity="0.25"/>

          {/* 8方向ライン */}
          {[0,45,90,135,180,225,270,315].map(angle => (
            <line key={angle}
              x1="0" y1="0"
              x2={Math.sin(angle*Math.PI/180)*55}
              y2={-Math.cos(angle*Math.PI/180)*55}
              stroke="#c9a227" strokeWidth={angle%90===0 ? 0.8 : 0.4} strokeOpacity="0.35"/>
          ))}

          {/* N矢印（北） */}
          <polygon points="0,-54 -7,-30 0,-38 7,-30"
            fill="#c9a227" fillOpacity="0.8"/>
          {/* S矢印（南） */}
          <polygon points="0,54 -7,30 0,38 7,30"
            fill="#8b6914" fillOpacity="0.6"/>
          {/* E矢印 */}
          <polygon points="54,0 30,-7 38,0 30,7"
            fill="#8b6914" fillOpacity="0.5"/>
          {/* W矢印 */}
          <polygon points="-54,0 -30,-7 -38,0 -30,7"
            fill="#8b6914" fillOpacity="0.5"/>

          {/* Nラベル */}
          <text x="0" y="-60" textAnchor="middle"
            fontSize="10" fontFamily="serif" fontWeight="bold"
            fill="#c9a227" fillOpacity="0.9">N</text>

          {/* 中心点 */}
          <circle r="4" fill="#c9a227" fillOpacity="0.9"/>
          <circle r="1.5" fill="#06091a"/>
        </g>

        {/* ── ドクロマーク（中央右上エリア） ── */}
        <g transform="translate(1080,200)" opacity="0.18">
          {/* 頭部 */}
          <ellipse cx="0" cy="-8" rx="16" ry="14"
            fill="#c9a227"/>
          {/* 目 */}
          <circle cx="-5" cy="-10" r="3.5" fill="#06091a"/>
          <circle cx="5" cy="-10" r="3.5" fill="#06091a"/>
          {/* 鼻 */}
          <path d="M-2 -5 L2 -5 L0 -2 Z" fill="#06091a"/>
          {/* 歯 */}
          <rect x="-8" y="1" width="16" height="3" fill="#06091a" rx="1"/>
          <line x1="-4" y1="1" x2="-4" y2="4" stroke="#c9a227" strokeWidth="1.2"/>
          <line x1="0"  y1="1" x2="0"  y2="4" stroke="#c9a227" strokeWidth="1.2"/>
          <line x1="4"  y1="1" x2="4"  y2="4" stroke="#c9a227" strokeWidth="1.2"/>
          {/* 交差した骨 */}
          <line x1="-20" y1="16" x2="20" y2="-4" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
          <line x1="20" y1="16" x2="-20" y2="-4" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="-22" cy="17" r="5" fill="#c9a227"/>
          <circle cx="22"  cy="17" r="5" fill="#c9a227"/>
          <circle cx="-22" cy="-5" r="5" fill="#c9a227"/>
          <circle cx="22"  cy="-5" r="5" fill="#c9a227"/>
        </g>

        {/* ── "X" マーク（宝の場所） ── */}
        <g transform="translate(760,620)" opacity="0.22">
          <line x1="-14" y1="-14" x2="14" y2="14" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
          <line x1="14" y1="-14" x2="-14" y2="14" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
          <circle r="18" fill="none" stroke="#c9a227" strokeWidth="1.2" strokeDasharray="3 4"/>
        </g>

        {/* ── 隅のアンカー装飾 ── */}
        {/* 右上 */}
        <g transform="translate(1400,30) scale(0.9)" opacity="0.2">
          <AnchorSVG/>
        </g>
        {/* 左上 */}
        <g transform="translate(38,30) scale(0.9)" opacity="0.2">
          <AnchorSVG/>
        </g>

        {/* ── 周縁のビネット（暗い四隅） ── */}
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"  stopColor="transparent"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0.6"/>
        </radialGradient>
        <rect width="1440" height="900" fill="url(#vignette)"/>

        {/* ── 水平の光の帯（画面上部） ── */}
        <linearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1a3a7a" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="transparent"/>
        </linearGradient>
        <rect width="1440" height="200" fill="url(#topGlow)"/>
      </svg>
    </div>
  );
}

/** アンカーSVGパス（簡略版） */
function AnchorSVG() {
  return (
    <g fill="none" stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round">
      {/* 縦軸 */}
      <line x1="0" y1="-20" x2="0" y2="20"/>
      {/* 横棒 */}
      <line x1="-12" y1="-13" x2="12" y2="-13"/>
      {/* アンカー輪 */}
      <circle cx="0" cy="-20" r="5"/>
      {/* 下部曲線 */}
      <path d="M0 20 Q-18 12 -18 0 Q-18 -6 -12 -6" />
      <path d="M0 20 Q18 12 18 0 Q18 -6 12 -6" />
      {/* 下端の横棒 */}
      <line x1="-8" y1="20" x2="8" y2="20"/>
    </g>
  );
}
