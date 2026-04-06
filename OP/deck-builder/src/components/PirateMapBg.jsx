/**
 * PirateMapBg — 豪華な海賊地図SVG背景
 * fixed・z-0・pointer-events-none で全画面に敷く
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
          {/* ─── グラデーション ─── */}
          <radialGradient id="pmOcean" cx="50%" cy="40%" r="75%">
            <stop offset="0%"  stopColor="#0f1e45"/>
            <stop offset="55%" stopColor="#080f28"/>
            <stop offset="100%" stopColor="#030610"/>
          </radialGradient>
          <radialGradient id="pmVig" cx="50%" cy="50%" r="72%">
            <stop offset="0%"  stopColor="transparent"/>
            <stop offset="85%" stopColor="#000" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0.8"/>
          </radialGradient>
          <linearGradient id="pmTopGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1a3a7a" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="transparent"/>
          </linearGradient>
          <linearGradient id="pmBotGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="transparent"/>
            <stop offset="100%" stopColor="#200a00" stopOpacity="0.35"/>
          </linearGradient>

          {/* 波パターン */}
          <pattern id="pmWave" x="0" y="0" width="80" height="24" patternUnits="userSpaceOnUse">
            <path d="M0 12 Q20 2 40 12 Q60 22 80 12" fill="none" stroke="#1a3560" strokeWidth="0.9" opacity="0.55"/>
            <path d="M0 19 Q20 9 40 19 Q60 29 80 19" fill="none" stroke="#102040" strokeWidth="0.5" opacity="0.35"/>
          </pattern>

          {/* グリッドパターン */}
          <pattern id="pmGrid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <line x1="0" y1="40" x2="80" y2="40" stroke="#c9a227" strokeWidth="0.2" opacity="0.13"/>
            <line x1="40" y1="0" x2="40" y2="80" stroke="#c9a227" strokeWidth="0.2" opacity="0.13"/>
          </pattern>

          {/* コンパスラインフェード */}
          <radialGradient id="pmCFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="white" stopOpacity="1"/>
            <stop offset="75%" stopColor="white" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <mask id="pmCMask1">
            <rect x="-110" y="-110" width="220" height="220" fill="url(#pmCFade)"/>
          </mask>
          <mask id="pmCMask2">
            <rect x="-70" y="-70" width="140" height="140" fill="url(#pmCFade)"/>
          </mask>

          {/* 錨グラデ */}
          <linearGradient id="pmAnchorG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#c9a227"/>
            <stop offset="100%" stopColor="#8b6914"/>
          </linearGradient>
        </defs>

        {/* ══ ベース海洋 ══ */}
        <rect width="1440" height="900" fill="url(#pmOcean)"/>
        <rect width="1440" height="900" fill="url(#pmWave)" opacity="0.7"/>
        <rect width="1440" height="900" fill="url(#pmGrid)"/>

        {/* ══ 外枠（二重額縁） ══ */}
        <rect x="12" y="8"  width="1416" height="884" fill="none"
          stroke="#c9a227" strokeWidth="2"   strokeOpacity="0.35" rx="3"/>
        <rect x="20" y="16" width="1400" height="868" fill="none"
          stroke="#c9a227" strokeWidth="0.7" strokeOpacity="0.18" rx="2"/>
        <rect x="28" y="24" width="1384" height="852" fill="none"
          stroke="#c9a227" strokeWidth="0.3" strokeOpacity="0.1"  rx="1"/>

        {/* コーナー装飾（×印） */}
        {[[18,14],[1422,14],[18,886],[1422,886]].map(([x,y],i)=>(
          <g key={i} transform={`translate(${x},${y})`} opacity="0.45">
            <line x1="-6" y1="-6" x2="6" y2="6" stroke="#c9a227" strokeWidth="1.2"/>
            <line x1="6"  y1="-6" x2="-6" y2="6" stroke="#c9a227" strokeWidth="1.2"/>
            <circle r="2.5" fill="none" stroke="#c9a227" strokeWidth="0.8"/>
          </g>
        ))}

        {/* ══ 経緯線（ラベル付き） ══ */}
        {/* 緯度線 */}
        {[
          [150, '75°N'], [300, '60°N'], [450, '45°N'],
          [600, '30°N'], [750, 'EQ'], [850, '15°S'],
        ].map(([y, label]) => (
          <g key={label}>
            <line x1="28" y1={y} x2="1412" y2={y}
              stroke="#c9a227" strokeWidth="0.35" strokeOpacity="0.12"/>
            <text x="35" y={y - 3} fontSize="7" fontFamily="serif"
              fill="#c9a227" fillOpacity="0.3">{label}</text>
            <text x="1400" y={y - 3} fontSize="7" fontFamily="serif"
              fill="#c9a227" fillOpacity="0.3" textAnchor="end">{label}</text>
          </g>
        ))}
        {/* 経度線 */}
        {[
          [180, '90°W'], [360, '45°W'], [540, '0°'], [720, '45°E'],
          [900, '90°E'], [1080, '135°E'], [1260, '180°'],
        ].map(([x, label]) => (
          <g key={label}>
            <line x1={x} y1="24" x2={x} y2="876"
              stroke="#c9a227" strokeWidth="0.35" strokeOpacity="0.12"/>
            <text x={x + 3} y="36" fontSize="7" fontFamily="serif"
              fill="#c9a227" fillOpacity="0.3">{label}</text>
          </g>
        ))}

        {/* ══ 航路（破線） ══ */}
        <path d="M 80 200 Q 300 350 580 280 Q 860 210 1100 420 Q 1250 530 1380 380"
          fill="none" stroke="#c9a227" strokeWidth="1.4" strokeOpacity="0.22"
          strokeDasharray="7 9"/>
        <path d="M 1380 700 Q 1100 600 820 660 Q 540 720 280 580 Q 140 510 60 600"
          fill="none" stroke="#c9a227" strokeWidth="1" strokeOpacity="0.16"
          strokeDasharray="4 11"/>
        <path d="M 400 60 Q 600 180 720 340 Q 820 480 900 700"
          fill="none" stroke="#c9a227" strokeWidth="0.8" strokeOpacity="0.13"
          strokeDasharray="3 8"/>
        {/* 航路上の小さな矢印マーカー */}
        {[[580,280],[1100,420]].map(([x,y],i)=>(
          <polygon key={i} points={`${x},${y-5} ${x-4},${y+4} ${x+4},${y+4}`}
            fill="#c9a227" fillOpacity="0.25" transform={`rotate(30,${x},${y})`}/>
        ))}

        {/* ══ 島シルエット群 ══ */}
        {/* 左上・大島 */}
        <g opacity="0.55">
          <ellipse cx="160" cy="175" rx="62" ry="34" fill="#0c1c3a" stroke="#c9a227" strokeWidth="0.9" strokeOpacity="0.28"/>
          <ellipse cx="178" cy="163" rx="36" ry="21" fill="#0a1630"/>
          <ellipse cx="138" cy="182" rx="24" ry="14" fill="#0a1630"/>
          {/* 山 */}
          <polygon points="160,148 145,175 175,175" fill="#0d2040" opacity="0.6"/>
          <polygon points="145,152 132,175 158,175" fill="#0a1830" opacity="0.5"/>
          {/* 木 */}
          <line x1="190" y1="175" x2="190" y2="162" stroke="#8b6914" strokeWidth="1" opacity="0.4"/>
          <ellipse cx="190" cy="158" rx="5" ry="6" fill="#1a3a1a" opacity="0.4"/>
          <text x="160" y="200" textAnchor="middle" fontSize="8" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.35" fontStyle="italic">Dawn Island</text>
        </g>

        {/* 右上・中島 */}
        <g opacity="0.5">
          <ellipse cx="1240" cy="130" rx="50" ry="26" fill="#0c1c3a" stroke="#c9a227" strokeWidth="0.8" strokeOpacity="0.25"/>
          <ellipse cx="1260" cy="122" rx="28" ry="16" fill="#0a1630"/>
          <polygon points="1240,110 1225,130 1255,130" fill="#0d2040" opacity="0.5"/>
          <text x="1240" y="150" textAnchor="middle" fontSize="7" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.3" fontStyle="italic">Skypeia</text>
        </g>

        {/* 右下・大島 */}
        <g opacity="0.55">
          <ellipse cx="1310" cy="770" rx="75" ry="38" fill="#0c1c3a" stroke="#c9a227" strokeWidth="0.9" strokeOpacity="0.28"/>
          <ellipse cx="1340" cy="756" rx="44" ry="25" fill="#0a1630"/>
          <ellipse cx="1280" cy="778" rx="30" ry="17" fill="#0a1630"/>
          <polygon points="1310,745 1292,770 1328,770" fill="#0d2040" opacity="0.6"/>
          <line x1="1345" y1="770" x2="1345" y2="752" stroke="#8b6914" strokeWidth="1.2" opacity="0.4"/>
          <ellipse cx="1345" cy="748" rx="6" ry="7" fill="#1a3a1a" opacity="0.4"/>
          <text x="1310" y="800" textAnchor="middle" fontSize="8" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.35" fontStyle="italic">Wano Kuni</text>
        </g>

        {/* 中央上・小島 */}
        <g opacity="0.4">
          <ellipse cx="720" cy="90" rx="32" ry="16" fill="#0c1c3a" stroke="#c9a227" strokeWidth="0.6" strokeOpacity="0.2"/>
          <ellipse cx="730" cy="83" rx="18" ry="10" fill="#0a1630"/>
          <text x="720" y="108" textAnchor="middle" fontSize="7" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.28" fontStyle="italic">Alabasta</text>
        </g>

        {/* 左下・中島 */}
        <g opacity="0.45">
          <ellipse cx="220" cy="760" rx="55" ry="28" fill="#0c1c3a" stroke="#c9a227" strokeWidth="0.8" strokeOpacity="0.22"/>
          <ellipse cx="240" cy="750" rx="30" ry="17" fill="#0a1630"/>
          <polygon points="218,740 204,762 232,762" fill="#0d2040" opacity="0.55"/>
          <text x="220" y="785" textAnchor="middle" fontSize="7" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.3" fontStyle="italic">Dressrosa</text>
        </g>

        {/* ══ グランドライン帯 ══ */}
        <rect x="28" y="724" width="1384" height="2"
          fill="none" stroke="#c9a227" strokeWidth="1" strokeOpacity="0.18" strokeDasharray="12 6"/>
        <text x="50" y="718" fontSize="9" fontFamily="serif" fontStyle="italic"
          fill="#c9a227" fillOpacity="0.28" letterSpacing="3">— GRAND LINE —</text>

        {/* ══ 大型コンパスローズ（左下） ══ */}
        <g transform="translate(128,770)">
          {/* 外リング */}
          <circle r="78" fill="#06091a" fillOpacity="0.65" stroke="#c9a227" strokeWidth="1.2" strokeOpacity="0.5"/>
          <circle r="70" fill="none" stroke="#c9a227" strokeWidth="0.4" strokeOpacity="0.3"/>
          <circle r="56" fill="none" stroke="#c9a227" strokeWidth="0.3" strokeOpacity="0.22"/>
          <circle r="34" fill="none" stroke="#c9a227" strokeWidth="0.3" strokeOpacity="0.18"/>
          <circle r="10" fill="#c9a227" fillOpacity="0.22" stroke="#c9a227" strokeWidth="0.5" strokeOpacity="0.4"/>

          {/* 16方位ライン */}
          {Array.from({length:16},(_,i)=>i*22.5).map(a=>(
            <line key={a}
              x1={Math.sin(a*Math.PI/180)*10}  y1={-Math.cos(a*Math.PI/180)*10}
              x2={Math.sin(a*Math.PI/180)*70}  y2={-Math.cos(a*Math.PI/180)*70}
              stroke="#c9a227"
              strokeWidth={a%90===0 ? 0.9 : a%45===0 ? 0.6 : 0.3}
              strokeOpacity={a%90===0 ? 0.45 : a%45===0 ? 0.32 : 0.18}/>
          ))}

          {/* 主方位 矢印（4方向） */}
          {/* N */}
          <polygon points="0,-70 -7,-42 0,-52 7,-42" fill="#c9a227" fillOpacity="0.9"/>
          <polygon points="0,-70 -7,-42 0,-52 7,-42" fill="#fff" fillOpacity="0.15"/>
          {/* S */}
          <polygon points="0,70 -7,42 0,52 7,42"  fill="#8b6914" fillOpacity="0.7"/>
          {/* E */}
          <polygon points="70,0 42,-7 52,0 42,7"  fill="#8b6914" fillOpacity="0.6"/>
          {/* W */}
          <polygon points="-70,0 -42,-7 -52,0 -42,7" fill="#8b6914" fillOpacity="0.6"/>

          {/* 斜め方位 小矢印 */}
          {[45,135,225,315].map(a=>{
            const r1=34, r2=54;
            const sx=Math.sin(a*Math.PI/180), cx=-Math.cos(a*Math.PI/180);
            return (
              <polygon key={a}
                points={`${sx*r2},${cx*r2} ${sx*r1-6*cx},${cx*r1-6*sx} ${sx*r1+6*cx},${cx*r1+6*sx}`}
                fill="#8b6914" fillOpacity="0.5"/>
            );
          })}

          {/* 方位ラベル */}
          <text y="-58" textAnchor="middle" fontSize="13" fontFamily="serif" fontWeight="bold"
            fill="#c9a227" fillOpacity="1">N</text>
          <text y="68"  textAnchor="middle" fontSize="10" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.7">S</text>
          <text x="62"  y="4"  textAnchor="middle" fontSize="10" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.7">E</text>
          <text x="-62" y="4"  textAnchor="middle" fontSize="10" fontFamily="serif"
            fill="#c9a227" fillOpacity="0.7">W</text>

          {/* 中心 */}
          <circle r="5" fill="#c9a227" fillOpacity="0.9"/>
          <circle r="2" fill="#06091a"/>
        </g>

        {/* ══ 小型コンパス（右上） ══ */}
        <g transform="translate(1360,80)">
          <circle r="44" fill="#06091a" fillOpacity="0.6" stroke="#c9a227" strokeWidth="0.8" strokeOpacity="0.4"/>
          <circle r="38" fill="none" stroke="#c9a227" strokeWidth="0.3" strokeOpacity="0.22"/>
          {Array.from({length:8},(_,i)=>i*45).map(a=>(
            <line key={a}
              x1={Math.sin(a*Math.PI/180)*6}  y1={-Math.cos(a*Math.PI/180)*6}
              x2={Math.sin(a*Math.PI/180)*38} y2={-Math.cos(a*Math.PI/180)*38}
              stroke="#c9a227" strokeWidth={a%90===0?0.7:0.35}
              strokeOpacity={a%90===0?0.38:0.2}/>
          ))}
          <polygon points="0,-38 -4,-22 0,-28 4,-22" fill="#c9a227" fillOpacity="0.85"/>
          <polygon points="0,38 -4,22 0,28 4,22"   fill="#8b6914" fillOpacity="0.6"/>
          <polygon points="38,0 22,-4 28,0 22,4"   fill="#8b6914" fillOpacity="0.5"/>
          <polygon points="-38,0 -22,-4 -28,0 -22,4" fill="#8b6914" fillOpacity="0.5"/>
          <text y="-44" textAnchor="middle" fontSize="9" fontFamily="serif" fontWeight="bold"
            fill="#c9a227" fillOpacity="0.9">N</text>
          <circle r="3.5" fill="#c9a227" fillOpacity="0.85"/>
          <circle r="1.2" fill="#06091a"/>
        </g>

        {/* ══ 帆船シルエット（中央） ══ */}
        <g transform="translate(720,480)" opacity="0.14">
          {/* 船体 */}
          <path d="M-70 0 Q-65 20 0 24 Q65 20 70 0 Z" fill="#c9a227"/>
          {/* マスト */}
          <line x1="0"   y1="0"  x2="0"  y2="-90" stroke="#c9a227" strokeWidth="3"/>
          <line x1="-30" y1="0"  x2="-30" y2="-55" stroke="#c9a227" strokeWidth="2"/>
          <line x1="30"  y1="0"  x2="30"  y2="-55" stroke="#c9a227" strokeWidth="2"/>
          {/* 帆 */}
          <path d="M-2 -88 Q-40 -65 -38 -20 L-2 -20 Z"  fill="#c9a227" opacity="0.8"/>
          <path d="M2  -88 Q40  -65 38  -20 L2  -20 Z"  fill="#c9a227" opacity="0.6"/>
          <path d="M-29 -53 Q-52 -38 -50 -8 L-29 -8 Z"  fill="#c9a227" opacity="0.6"/>
          <path d="M29  -53 Q52  -38 50  -8 L29  -8 Z"  fill="#c9a227" opacity="0.5"/>
          {/* ジョリーロジャー旗 */}
          <rect x="-1" y="-90" width="18" height="12" fill="#c9a227" opacity="0.7"/>
          <circle cx="9" cy="-84" r="3" fill="#06091a" opacity="0.7"/>
          {/* 横帆ロープ */}
          <line x1="-40" y1="-22" x2="40" y2="-22" stroke="#c9a227" strokeWidth="1"/>
          <line x1="-53" y1="-10" x2="53" y2="-10" stroke="#c9a227" strokeWidth="1"/>
          {/* 波 */}
          <path d="M-80 18 Q-60 10 -40 18 Q-20 26 0 18 Q20 10 40 18 Q60 26 80 18"
            fill="none" stroke="#c9a227" strokeWidth="1.5" opacity="0.5"/>
        </g>

        {/* ══ ドクロ・クロスボーン（右上エリア） ══ */}
        <g transform="translate(1090,210)" opacity="0.2">
          {/* 頭蓋骨 */}
          <ellipse cx="0" cy="-10" rx="20" ry="18" fill="#c9a227"/>
          <circle cx="-6" cy="-13" r="5" fill="#06091a"/>
          <circle cx="6"  cy="-13" r="5" fill="#06091a"/>
          <ellipse cx="0" cy="-5" rx="3" ry="2.5" fill="#06091a" opacity="0.5"/>
          <rect x="-10" y="4" width="20" height="4" fill="#06091a" rx="1"/>
          <line x1="-4" y1="4" x2="-4" y2="8" stroke="#c9a227" strokeWidth="1.5"/>
          <line x1="0"  y1="4" x2="0"  y2="8" stroke="#c9a227" strokeWidth="1.5"/>
          <line x1="4"  y1="4" x2="4"  y2="8" stroke="#c9a227" strokeWidth="1.5"/>
          {/* 交差した骨 */}
          <line x1="-28" y1="24" x2="28" y2="-4"  stroke="#c9a227" strokeWidth="5.5" strokeLinecap="round"/>
          <line x1="28"  y1="24" x2="-28" y2="-4" stroke="#c9a227" strokeWidth="5.5" strokeLinecap="round"/>
          <circle cx="-30" cy="25"  r="7" fill="#c9a227"/>
          <circle cx="30"  cy="25"  r="7" fill="#c9a227"/>
          <circle cx="-30" cy="-5"  r="7" fill="#c9a227"/>
          <circle cx="30"  cy="-5"  r="7" fill="#c9a227"/>
        </g>

        {/* ══ 海の怪物（クラーケン風・左中） ══ */}
        <g transform="translate(80,480)" opacity="0.12">
          {/* 頭 */}
          <ellipse cx="0" cy="0" rx="30" ry="22" fill="#c9a227"/>
          {/* 目 */}
          <circle cx="-10" cy="-5" r="6" fill="#06091a"/>
          <circle cx="10"  cy="-5" r="6" fill="#06091a"/>
          <circle cx="-9"  cy="-6" r="2" fill="#c9a227"/>
          <circle cx="11"  cy="-6" r="2" fill="#c9a227"/>
          {/* 触手（6本） */}
          {[-40,-24,-8,8,24,40].map((ox,i)=>(
            <path key={i}
              d={`M${ox} 18 Q${ox-8} 50 ${ox-4} 80 Q${ox} 110 ${ox+6} 130`}
              fill="none" stroke="#c9a227" strokeWidth={3-Math.abs(i-2.5)*0.4} strokeLinecap="round" opacity="0.8"/>
          ))}
          {/* 触手の先端 */}
          {[-34,-18,-2,14,30,46].map((ox,i)=>(
            <circle key={i} cx={ox+6} cy={130} r="4" fill="#c9a227" opacity="0.6"/>
          ))}
        </g>

        {/* ══ 宝の地図マーク ══ */}
        {/* X マーク（中央左） */}
        <g transform="translate(580,590)" opacity="0.24">
          <circle r="22" fill="none" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="4 5"/>
          <line x1="-14" y1="-14" x2="14" y2="14" stroke="#c9a227" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="14"  y1="-14" x2="-14" y2="14" stroke="#c9a227" strokeWidth="3.5" strokeLinecap="round"/>
        </g>
        {/* 宝箱（中央下） */}
        <g transform="translate(860,810)" opacity="0.18">
          <rect x="-22" y="-14" width="44" height="28" fill="#c9a227" rx="3"/>
          <rect x="-22" y="-14" width="44" height="13" fill="#8b6914" rx="3"/>
          <rect x="-22" y="-14" width="44" height="2"  fill="#c9a227" opacity="0.5"/>
          <rect x="-5"  y="-6"  width="10" height="14" fill="#06091a" rx="2"/>
          <circle cx="0" cy="0" r="3" fill="#c9a227"/>
        </g>

        {/* ══ 大型錨（右下コーナー） ══ */}
        <g transform="translate(1400,830)" opacity="0.2">
          <circle cx="0" cy="-38" r="10" fill="none" stroke="url(#pmAnchorG)" strokeWidth="3.5"/>
          <line x1="0" y1="-28" x2="0" y2="40" stroke="url(#pmAnchorG)" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="-25" y1="-10" x2="25" y2="-10" stroke="url(#pmAnchorG)" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M-28 40 Q-28 55 0 55 Q28 55 28 40" fill="none" stroke="url(#pmAnchorG)" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="-14" y1="40" x2="14" y2="40" stroke="url(#pmAnchorG)" strokeWidth="3" strokeLinecap="round"/>
        </g>

        {/* 小錨（左上コーナー） */}
        <g transform="translate(50,50)" opacity="0.18">
          <circle cx="0" cy="-22" r="6" fill="none" stroke="#c9a227" strokeWidth="2.5"/>
          <line x1="0" y1="-16" x2="0" y2="26" stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="-16" y1="-4" x2="16" y2="-4" stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M-18 26 Q-18 36 0 36 Q18 36 18 26" fill="none" stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round"/>
        </g>

        {/* 小錨（右上） */}
        <g transform="translate(1400,55)" opacity="0.16">
          <circle cx="0" cy="-18" r="5" fill="none" stroke="#c9a227" strokeWidth="2"/>
          <line x1="0" y1="-13" x2="0" y2="20" stroke="#c9a227" strokeWidth="2" strokeLinecap="round"/>
          <line x1="-13" y1="-3" x2="13" y2="-3" stroke="#c9a227" strokeWidth="2" strokeLinecap="round"/>
          <path d="M-14 20 Q-14 28 0 28 Q14 28 14 20" fill="none" stroke="#c9a227" strokeWidth="2" strokeLinecap="round"/>
        </g>

        {/* ══ 舵輪（右中央） ══ */}
        <g transform="translate(1390,450)" opacity="0.15">
          <circle r="40" fill="none" stroke="#c9a227" strokeWidth="2"/>
          <circle r="28" fill="none" stroke="#c9a227" strokeWidth="1.5"/>
          <circle r="8"  fill="#c9a227" fillOpacity="0.4" stroke="#c9a227" strokeWidth="1.5"/>
          {Array.from({length:8},(_,i)=>i*45).map(a=>(
            <line key={a}
              x1={Math.sin(a*Math.PI/180)*8}   y1={-Math.cos(a*Math.PI/180)*8}
              x2={Math.sin(a*Math.PI/180)*40}  y2={-Math.cos(a*Math.PI/180)*40}
              stroke="#c9a227" strokeWidth="2" strokeLinecap="round"/>
          ))}
          {Array.from({length:8},(_,i)=>i*45).map(a=>(
            <circle key={a}
              cx={Math.sin(a*Math.PI/180)*40}
              cy={-Math.cos(a*Math.PI/180)*40}
              r="4" fill="#c9a227" fillOpacity="0.6"/>
          ))}
        </g>

        {/* ══ 「THE NEW WORLD」テキスト ══ */}
        <text x="1100" y="820" textAnchor="middle" fontSize="11" fontFamily="serif"
          fontStyle="italic" fontWeight="bold" letterSpacing="4"
          fill="#c9a227" fillOpacity="0.22">— THE NEW WORLD —</text>
        <text x="340" y="820" textAnchor="middle" fontSize="10" fontFamily="serif"
          fontStyle="italic" letterSpacing="3"
          fill="#c9a227" fillOpacity="0.18">EAST BLUE</text>
        <text x="1100" y="60" textAnchor="middle" fontSize="10" fontFamily="serif"
          fontStyle="italic" letterSpacing="3"
          fill="#c9a227" fillOpacity="0.18">SKYPIEA</text>

        {/* ══ ── ONE PIECEシルエット ── ══ */}

        {/* 🎩 麦わら帽子（中央やや上） */}
        <g transform="translate(470,305)" opacity="0.14">
          {/* ブリム（ひさし） */}
          <ellipse cx="0" cy="0" rx="68" ry="17" fill="#c9a227"/>
          {/* クラウン */}
          <path d="M-36 -2 Q-38 -44 0 -50 Q38 -44 36 -2 Z" fill="#c9a227"/>
          {/* 赤いリボンバンド */}
          <rect x="-36" y="-14" width="72" height="14" fill="#a06010" rx="1"/>
          {/* ブリム下面のライン */}
          <ellipse cx="0" cy="0" rx="68" ry="17" fill="none" stroke="#8b6914" strokeWidth="1.5" opacity="0.5"/>
          {/* ひも */}
          <path d="M44 8 Q65 35 60 58" fill="none" stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
        </g>

        {/* ⚔️ 刀3本（ゾロ風・右中央） */}
        <g transform="translate(990,620)" opacity="0.13">
          {/* 刀1（左斜め） */}
          <g transform="rotate(-28)">
            <polygon points="-3,-88 3,-88 0,-112" fill="#c9a227"/>
            <rect x="-3" y="-88" width="6" height="108" fill="#c9a227" rx="1"/>
            <ellipse cx="0" cy="22" rx="13" ry="5" fill="#8b6914"/>
            <rect x="-4" y="22" width="8" height="34" fill="#8b6914" rx="1.5"/>
            <circle cx="0" cy="56" r="4.5" fill="#8b6914"/>
          </g>
          {/* 刀2（垂直） */}
          <g transform="rotate(0)">
            <polygon points="-3,-88 3,-88 0,-112" fill="#c9a227"/>
            <rect x="-3" y="-88" width="6" height="108" fill="#c9a227" rx="1"/>
            <ellipse cx="0" cy="22" rx="13" ry="5" fill="#8b6914"/>
            <rect x="-4" y="22" width="8" height="34" fill="#8b6914" rx="1.5"/>
            <circle cx="0" cy="56" r="4.5" fill="#8b6914"/>
          </g>
          {/* 刀3（右斜め） */}
          <g transform="rotate(28)">
            <polygon points="-3,-88 3,-88 0,-112" fill="#c9a227"/>
            <rect x="-3" y="-88" width="6" height="108" fill="#c9a227" rx="1"/>
            <ellipse cx="0" cy="22" rx="13" ry="5" fill="#8b6914"/>
            <rect x="-4" y="22" width="8" height="34" fill="#8b6914" rx="1.5"/>
            <circle cx="0" cy="56" r="4.5" fill="#8b6914"/>
          </g>
        </g>

        {/* 👨‍🍳 コック帽（サンジ風・上部中央左） */}
        <g transform="translate(625,158)" opacity="0.13">
          {/* 帽子本体（背の高いふくらみ） */}
          <path d="M-24 0 Q-30 -55 -14 -76 Q0 -90 14 -76 Q30 -55 24 0 Z" fill="#c9a227"/>
          {/* 上部の丸みポンポン */}
          <ellipse cx="0" cy="-78" rx="16" ry="14" fill="#c9a227"/>
          {/* ベースバンド */}
          <rect x="-26" y="-14" width="52" height="18" fill="#c9a227"/>
          <ellipse cx="0" cy="-14" rx="26" ry="6" fill="#c9a227"/>
          {/* バンドの折り返し線 */}
          <line x1="-26" y1="-6" x2="26" y2="-6" stroke="#8b6914" strokeWidth="1.5" opacity="0.6"/>
        </g>

        {/* 🎩 シルクハット（ブルック風・右下） */}
        <g transform="translate(1185,720)" opacity="0.13">
          {/* ブリム */}
          <ellipse cx="0" cy="0" rx="42" ry="10" fill="#c9a227"/>
          {/* 帽子本体 */}
          <rect x="-26" y="-68" width="52" height="70" fill="#c9a227" rx="2"/>
          {/* 帽子トップ */}
          <ellipse cx="0" cy="-68" rx="26" ry="7" fill="#c9a227"/>
          {/* バンド */}
          <rect x="-26" y="-16" width="52" height="9" fill="#8b6914" opacity="0.75"/>
          {/* ブリム上部のライン */}
          <ellipse cx="0" cy="0" rx="42" ry="10" fill="none" stroke="#8b6914" strokeWidth="1.2" opacity="0.5"/>
        </g>

        {/* 🍎 悪魔の実 （左中・渦巻き模様） */}
        <g transform="translate(308,360)" opacity="0.13">
          <path d="M0 -42 Q32 -24 32 6 Q32 36 0 44 Q-32 36 -32 6 Q-32 -24 0 -42 Z" fill="#c9a227"/>
          {/* 渦巻き */}
          <path d="M0 -4 Q14 -20 20 -6 Q20 9 8 17 Q-6 22 -14 12 Q-20 2 -16 -10 Q-10 -22 0 -24 Q14 -26 20 -14"
            fill="none" stroke="#06091a" strokeWidth="2.2" strokeOpacity="0.45"/>
          {/* へた */}
          <path d="M0 -42 Q5 -58 12 -54" fill="none" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
          <path d="M0 -42 Q-4 -56 -9 -51" fill="none" stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round"/>
        </g>

        {/* 🍎 悪魔の実 （右上エリア） */}
        <g transform="translate(1050,390)" opacity="0.11">
          <path d="M0 -36 Q27 -20 27 5 Q27 30 0 38 Q-27 30 -27 5 Q-27 -20 0 -36 Z" fill="#c9a227"/>
          {/* 渦巻き */}
          <path d="M0 -3 Q11 -17 17 -5 Q17 8 6 14 Q-5 18 -12 10 Q-17 1 -13 -8 Q-8 -18 0 -20 Q11 -22 17 -12"
            fill="none" stroke="#06091a" strokeWidth="2" strokeOpacity="0.4"/>
          {/* へた */}
          <path d="M0 -36 Q4 -50 10 -46" fill="none" stroke="#c9a227" strokeWidth="2.8" strokeLinecap="round"/>
        </g>

        {/* ══ ── ここまでONE PIECEシルエット ── ══ */}

        {/* ══ ビネット（四隅を暗く） ══ */}
        <rect width="1440" height="900" fill="url(#pmVig)"/>
        {/* 上部光彩 */}
        <rect width="1440" height="220" fill="url(#pmTopGlow)"/>
        {/* 下部 */}
        <rect y="700" width="1440" height="200" fill="url(#pmBotGlow)"/>
      </svg>
    </div>
  );
}
