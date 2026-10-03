import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Crosshair,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Maximize2,
  RefreshCw,
  MessageSquare,
  FileText,
  Compass
} from 'lucide-react';

// ── Realistic Pune Geocoded Incident Slips ─────────────────────────────
const INITIAL_INCIDENT_SLIPS = [
  {
    id: "SLIP-8921-A",
    roadSegment: "SENAPATI BAPAT RD // SEC-04B",
    coordinates: "18.5312° N, 73.8445° E",
    timestamp: "14:18:02 UTC",
    severity: "CRITICAL",
    badgeLabel: "TIRE_HAZARD",
    depthMm: 85,
    widthCm: 72,
    gForcePeak: 2.8,
    confidence: 0.94,
    confirmVotes: 48,
    falsePositiveVotes: 1,
    userVoted: null,
    status: "DISPATCHED_TO_MAINTENANCE",
    statusColor: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
    reporter: "Field Surveyor #09",
    note: "Deep crater submerged in pooled runoff. Multiple 2-wheeler rim punctures reported near ICC Tech Park junction.",
    comments: [
      { author: "PMC Ward 04 Engineer", time: "14:25 UTC", text: "Patch truck dispatched with cold mix asphalt batch #88." },
      { author: "Commuter_Amit", time: "14:28 UTC", text: "Avoid left lane completely, high risk of vehicular rollover." }
    ]
  },
  {
    id: "SLIP-8919-C",
    roadSegment: "JANGALI MAHARAJ RD // SEC-02A",
    coordinates: "18.5204° N, 73.8567° E",
    timestamp: "13:54:11 UTC",
    severity: "MODERATE",
    badgeLabel: "RIM_THREAT",
    depthMm: 45,
    widthCm: 38,
    gForcePeak: 1.7,
    confidence: 0.88,
    confirmVotes: 23,
    falsePositiveVotes: 0,
    userVoted: null,
    status: "CREW_ASSIGNED",
    statusColor: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    imageUrl: "https://images.unsplash.com/photo-1584463699044-f25b2f2d9669?auto=format&fit=crop&w=600&q=80",
    reporter: "BusRoute-14 Dashcam",
    note: "Asphalt edge shearing right at the bus bay curb. Heavy vibration detected on front suspension.",
    comments: [
      { author: "Traffic_Marshal_Shinde", time: "14:02 UTC", text: "Cones placed along the median edge." }
    ]
  },
  {
    id: "SLIP-8904-X",
    roadSegment: "KARVE ROAD // SEC-01C",
    coordinates: "18.5089° N, 73.8291° E",
    timestamp: "12:30:45 UTC",
    severity: "RESOLVED",
    badgeLabel: "MUNI_PATCHED",
    depthMm: 0,
    widthCm: 50,
    gForcePeak: 0.4,
    confidence: 0.96,
    confirmVotes: 62,
    falsePositiveVotes: 0,
    userVoted: null,
    status: "PATCH_VERIFIED",
    statusColor: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    imageUrl: "https://images.unsplash.com/photo-1578991624414-276ef23a534f?auto=format&fit=crop&w=600&q=80",
    reporter: "Citizen Verification Team",
    note: "PMC completed mastic asphalt overlay. Road surface flush, accelerometer profile smooth at 40 km/h.",
    comments: [
      { author: "Inspector Kulkarni", time: "12:45 UTC", text: "Final inspection passed. Defect closed." }
    ]
  },
  {
    id: "SLIP-8892-F",
    roadSegment: "FERGUSSON COLLEGE RD // SEC-03",
    coordinates: "18.5244° N, 73.8412° E",
    timestamp: "11:15:30 UTC",
    severity: "CRITICAL",
    badgeLabel: "TIRE_HAZARD",
    depthMm: 92,
    widthCm: 80,
    gForcePeak: 3.1,
    confidence: 0.97,
    confirmVotes: 89,
    falsePositiveVotes: 3,
    userVoted: null,
    status: "SCHEDULED_NIGHT_WORK",
    statusColor: "text-red-400 border-red-400/30 bg-red-400/10",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=600&q=80",
    reporter: "AutoRickshaw Telemetry Unit",
    note: "Violent pothole near Gokhale Institute crossroad. High danger for two-wheelers in low visibility.",
    comments: [
      { author: "PMC Road Works", time: "11:30 UTC", text: "Scheduled for road milling and hot bitumen mix tonight at 23:00." }
    ]
  }
];

export default function TacticalRoadTelemetryDashboard() {
  const [slips, setSlips] = useState(INITIAL_INCIDENT_SLIPS);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeLayer, setActiveLayer] = useState('SATELLITE_RECON');
  const [selectedSlipId, setSelectedSlipId] = useState('SLIP-8921-A');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [timeUtc, setTimeUtc] = useState('');
  const [expandedComments, setExpandedComments] = useState({ 'SLIP-8921-A': true });

  // Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      const ms = Math.floor(d.getUTCMilliseconds() / 100);
      setTimeUtc(`${h}:${m}:${s}.${ms} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  // Vote Handler
  const handleVote = (id, type) => {
    setSlips(prev => prev.map(slip => {
      if (slip.id !== id) return slip;
      if (slip.userVoted === type) return slip; // already voted

      let confirmDelta = 0;
      let falseDelta = 0;

      if (type === 'CONFIRM') {
        confirmDelta = 1;
        if (slip.userVoted === 'FALSE_POSITIVE') falseDelta = -1;
      } else {
        falseDelta = 1;
        if (slip.userVoted === 'CONFIRM') confirmDelta = -1;
      }

      return {
        ...slip,
        confirmVotes: slip.confirmVotes + confirmDelta,
        falsePositiveVotes: slip.falsePositiveVotes + falseDelta,
        userVoted: type
      };
    }));
  };

  const toggleComments = (id) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSlips = slips.filter(slip => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CRITICAL') return slip.severity === 'CRITICAL';
    if (activeFilter === 'MODERATE') return slip.severity === 'MODERATE';
    if (activeFilter === 'RESOLVED') return slip.severity === 'RESOLVED';
    return true;
  });

  const selectedSlip = slips.find(s => s.id === selectedSlipId) || slips[0];

  return (
    <div className="min-h-screen bg-[#0D0E11] text-[#F3F4F6] font-['Geist',sans-serif] selection:bg-[#F59E0B]/30 selection:text-[#F59E0B] p-2 sm:p-3 flex flex-col gap-2">
      
      {/* ── 1. SYSTEM STATUS TELEMETRY RIBBON (TOP BAR) ───────────────────────── */}
      <header className="relative bg-[#15181C] border border-[#262B32] rounded-[4px] px-3 py-2 flex flex-wrap items-center justify-between text-xs tracking-wide">
        {/* Technical Register Corner Markers (+) */}
        <span className="absolute -top-[5px] -left-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
        <span className="absolute -top-[5px] -right-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
        <span className="absolute -bottom-[5px] -left-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
        <span className="absolute -bottom-[5px] -right-[5px] text-[#262B32] font-mono text-xs select-none">+</span>

        {/* Brand & Sector Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0D0E11] border border-[#262B32] px-2 py-1 rounded-[2px]">
            <Radio className="w-3.5 h-3.5 text-[#F59E0B] animate-pulse" />
            <span className="font-['Cabinet_Grotesk',sans-serif] font-black tracking-wider text-xs text-[#F3F4F6]">
              AERO-ROAD // TELEMETRY
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-stone-400 font-mono text-[11px]">
            <span className="text-[#38BDF8] flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              LOCK: PUNE SECTOR-04
            </span>
            <span className="text-[#262B32]">/</span>
            <span className="tabular-nums font-mono">18.5204° N, 73.8567° E</span>
            <span className="text-[#262B32]">/</span>
            <span className="text-emerald-400 text-[10px]">HDOP: 0.7m (OPTIMAL)</span>
          </div>
        </div>

        {/* Tactical Counters */}
        <div className="flex items-center gap-2 sm:gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#6B7280]">LOGGED:</span>
            <span className="font-bold text-[#F3F4F6] tabular-nums">1,428</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#6B7280]">VERIFIED_24H:</span>
            <span className="font-bold text-[#F59E0B] tabular-nums">+184</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[#6B7280]">PATCH_RATE:</span>
            <span className="font-bold text-emerald-400 tabular-nums">78.4%</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 bg-[#0D0E11] px-2 py-0.5 border border-[#262B32] rounded-[2px]">
            <Activity className="w-3 h-3 text-[#38BDF8]" />
            <span className="text-[#9CA3AF]">YOLO11s-PCI // 12.4ms</span>
          </div>

          {/* System UTC Clock */}
          <div className="bg-[#0D0E11] border border-[#262B32] px-2 py-0.5 rounded-[2px] text-[#F59E0B] font-mono tabular-nums text-[11px] font-semibold">
            {timeUtc || "00:00:00.0 UTC"}
          </div>
        </div>
      </header>

      {/* ── 2. MAIN WORKSPACE (SURVEY DECK + DISPATCH SLIPS) ──────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-[640px]">

        {/* ── LEFT & CENTER: MAIN SURVEY DECK (COL 1-7) ────────────────────────── */}
        <main className="lg:col-span-7 flex flex-col gap-2">
          
          {/* Tactical Vector Map Canvas Box */}
          <div className="relative flex-1 bg-[#15181C] border border-[#262B32] rounded-[4px] p-2 flex flex-col min-h-[380px] overflow-hidden">
            {/* Technical Register Corner Markers (+) */}
            <span className="absolute -top-[5px] -left-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
            <span className="absolute -top-[5px] -right-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
            <span className="absolute -bottom-[5px] -left-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
            <span className="absolute -bottom-[5px] -right-[5px] text-[#262B32] font-mono text-xs select-none">+</span>

            {/* Map Deck Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#262B32] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-['Cabinet_Grotesk',sans-serif] font-black text-xs tracking-wider text-[#F3F4F6]">
                  GIS SURVEY CANVAS
                </span>
                <span className="font-mono text-[10px] text-[#6B7280] bg-[#0D0E11] px-1.5 py-0.5 border border-[#262B32] rounded-[2px]">
                  ESRI TACTICAL DARK VECTOR
                </span>
              </div>

              {/* Mode Toggles */}
              <div className="flex items-center gap-1 bg-[#0D0E11] p-0.5 border border-[#262B32] rounded-[2px]">
                {['VECTOR_GIS', 'SATELLITE_RECON', 'IMU_HEAT'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setActiveLayer(mode)}
                    className={`px-2 py-0.5 text-[10px] font-mono transition-colors rounded-[2px] ${
                      activeLayer === mode
                        ? 'bg-[#F59E0B] text-black font-bold'
                        : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Layer Filter Chips */}
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto text-[11px] font-mono border-b border-[#262B32]/60">
              <span className="text-[#6B7280] text-[10px] flex items-center gap-1">
                <Filter className="w-3 h-3" /> FILTER:
              </span>
              {[
                { key: 'ALL', label: 'ALL_SECTORS' },
                { key: 'CRITICAL', label: 'CRITICAL [TIRE_HAZARD]' },
                { key: 'MODERATE', label: 'MODERATE [RIM_THREAT]' },
                { key: 'RESOLVED', label: 'CONFIRMED_PATCH' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-2 py-0.5 rounded-[2px] border text-[10px] transition-all whitespace-nowrap ${
                    activeFilter === f.key
                      ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B] font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                      : 'border-[#262B32] bg-[#0D0E11] text-[#9CA3AF] hover:border-[#38BDF8]/40 hover:text-[#F3F4F6]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Simulated Vector Grid Map Display */}
            <div className="relative flex-1 bg-[#090A0D] border border-[#262B32] rounded-[2px] mt-2 overflow-hidden flex items-center justify-center">
              
              {/* Technical Grid Background */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none" 
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #262B32 1px, transparent 1px),
                    linear-gradient(to bottom, #262B32 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }}
              />

              {/* Vector Road Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#1F242C] stroke-2">
                <line x1="10%" y1="20%" x2="90%" y2="85%" strokeWidth="8" stroke="#171A21" />
                <line x1="10%" y1="20%" x2="90%" y2="85%" strokeDasharray="6 6" stroke="#2B323D" />
                <line x1="20%" y1="90%" x2="80%" y2="10%" strokeWidth="6" stroke="#171A21" />
                <line x1="20%" y1="90%" x2="80%" y2="10%" strokeDasharray="4 4" stroke="#2B323D" />
                <circle cx="55%" cy="50%" r="90" fill="none" stroke="#262B32" strokeDasharray="2 4" />
                <circle cx="55%" cy="50%" r="180" fill="none" stroke="#262B32" strokeDasharray="1 6" />
              </svg>

              {/* Tactical Compass Overlay */}
              <div className="absolute top-2 left-2 flex items-center gap-1 font-mono text-[9px] text-[#6B7280] bg-[#0D0E11]/90 px-1.5 py-0.5 border border-[#262B32] rounded-[2px]">
                <Compass className="w-3 h-3 text-[#F59E0B]" />
                GRID_AZIMUTH: 042° // ELEV: 560M
              </div>

              {/* Dynamic Interactive Diamond Hazard Pins on Canvas */}
              {filteredSlips.map((slip, idx) => {
                const isSelected = slip.id === selectedSlipId;
                const posStyles = [
                  { top: '38%', left: '46%' },
                  { top: '54%', left: '62%' },
                  { top: '68%', left: '34%' },
                  { top: '28%', left: '72%' }
                ][idx % 4];

                const colorClass = 
                  slip.severity === 'CRITICAL' ? 'border-[#EF4444] text-[#EF4444] bg-[#EF4444]/20' :
                  slip.severity === 'MODERATE' ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/20' :
                  'border-[#10B981] text-[#10B981] bg-[#10B981]/20';

                return (
                  <button
                    key={slip.id}
                    onClick={() => setSelectedSlipId(slip.id)}
                    style={posStyles}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-1.5 cursor-pointer transition-transform group ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'
                    }`}
                  >
                    {/* Diamond Crosshair Container */}
                    <div className={`w-6 h-6 rotate-45 border flex items-center justify-center ${colorClass} ${
                      isSelected ? 'ring-2 ring-[#F3F4F6]' : ''
                    }`}>
                      <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    </div>

                    {/* Pop-up Telemetry Tag on Pin */}
                    <div className="absolute left-7 top-1/2 -translate-y-1/2 bg-[#15181C] border border-[#262B32] px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] whitespace-nowrap text-[#F3F4F6] pointer-events-none">
                      <span className="font-bold text-[#F59E0B]">{slip.id}</span> // {slip.gForcePeak}G
                    </div>
                  </button>
                );
              })}

              {/* HUD Map Footer Coordinate Lock */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2 font-mono text-[10px] text-[#9CA3AF] bg-[#0D0E11]/90 px-2 py-1 border border-[#262B32] rounded-[2px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>RADAR_LOCK: {filteredSlips.length} HAZARDS</span>
                <span className="text-[#262B32]">|</span>
                <span className="tabular-nums">ZOOM: 14.2x</span>
              </div>
            </div>
          </div>

          {/* ── COLLAPSIBLE HIGH-DENSITY SURVEY MATRIX (BOTTOM DRAWER) ────── */}
          <div className="relative bg-[#15181C] border border-[#262B32] rounded-[4px] overflow-hidden">
            {/* Drawer Toggle Header */}
            <div 
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="flex items-center justify-between px-3 py-2 bg-[#111317] border-b border-[#262B32] cursor-pointer hover:bg-[#1A1D23] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-['Cabinet_Grotesk',sans-serif] font-black text-xs tracking-wider text-[#F3F4F6]">
                  SURVEY TELEMETRY MATRIX
                </span>
                <span className="font-mono text-[10px] text-[#6B7280]">
                  [{filteredSlips.length} RECORDED DETECTIONS]
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] text-[#9CA3AF]">
                <span>{isDrawerOpen ? 'COLLAPSE' : 'EXPAND'}</span>
                {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Matrix Table */}
            {isDrawerOpen && (
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#0D0E11] text-[#6B7280] border-b border-[#262B32] text-[10px]">
                      <th className="py-1.5 px-3 font-semibold">TIME_UTC</th>
                      <th className="py-1.5 px-3 font-semibold">SECTOR_SEGMENT</th>
                      <th className="py-1.5 px-3 font-semibold">CLASSIFICATION</th>
                      <th className="py-1.5 px-3 font-semibold">G_FORCE</th>
                      <th className="py-1.5 px-3 font-semibold">DEPTH_PCI</th>
                      <th className="py-1.5 px-3 font-semibold">CITIZEN_VOTES</th>
                      <th className="py-1.5 px-3 font-semibold">DISPATCH_ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B32]">
                    {filteredSlips.map(s => {
                      const isSelected = s.id === selectedSlipId;
                      return (
                        <tr 
                          key={s.id}
                          onClick={() => setSelectedSlipId(s.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-[#1C2026] text-[#F3F4F6]' 
                              : 'hover:bg-[#171B20] text-[#9CA3AF]'
                          }`}
                        >
                          <td className="py-1.5 px-3 tabular-nums text-[#6B7280]">{s.timestamp}</td>
                          <td className="py-1.5 px-3 font-bold text-[#F3F4F6]">{s.roadSegment}</td>
                          <td className="py-1.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold border ${
                              s.severity === 'CRITICAL' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
                              s.severity === 'MODERATE' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' :
                              'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                            }`}>
                              [{s.badgeLabel}]
                            </span>
                          </td>
                          <td className="py-1.5 px-3 tabular-nums text-[#F59E0B] font-bold">{s.gForcePeak}G</td>
                          <td className="py-1.5 px-3 tabular-nums">{s.depthMm}mm ({s.widthCm}cm)</td>
                          <td className="py-1.5 px-3 tabular-nums text-emerald-400">▲ {s.confirmVotes}</td>
                          <td className="py-1.5 px-3">
                            <button className="text-[10px] text-[#38BDF8] hover:underline flex items-center gap-0.5">
                              INSPECT <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL: CROWDSOURCE DISPATCH SLIPS (COL 8-12) ────────────────── */}
        <aside className="lg:col-span-5 flex flex-col gap-2">
          
          <div className="relative bg-[#15181C] border border-[#262B32] rounded-[4px] p-2 flex flex-col h-full">
            {/* Technical Register Corner Markers (+) */}
            <span className="absolute -top-[5px] -left-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
            <span className="absolute -top-[5px] -right-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
            <span className="absolute -bottom-[5px] -left-[5px] text-[#262B32] font-mono text-xs select-none">+</span>
            <span className="absolute -bottom-[5px] -right-[5px] text-[#262B32] font-mono text-xs select-none">+</span>

            {/* Dispatch Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#262B32]">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="font-['Cabinet_Grotesk',sans-serif] font-black text-xs tracking-wider text-[#F3F4F6]">
                  FIELD INCIDENT SLIPS // DISPATCH
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#6B7280]">
                ACTIVE_QUEUE: {filteredSlips.length}
              </span>
            </div>

            {/* Scrollable Slips Deck */}
            <div className="flex-1 overflow-y-auto mt-2 space-y-2.5 pr-0.5 max-h-[720px]">
              {filteredSlips.map(slip => {
                const isSelected = slip.id === selectedSlipId;
                const isCommentsOpen = !!expandedComments[slip.id];

                return (
                  <div
                    key={slip.id}
                    onClick={() => setSelectedSlipId(slip.id)}
                    className={`relative bg-[#101216] border transition-all rounded-[4px] p-3 flex flex-col gap-2 ${
                      isSelected 
                        ? 'border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.1)]' 
                        : 'border-[#262B32] hover:border-[#38BDF8]/40'
                    }`}
                  >
                    {/* Perforated Receipt Top Bar */}
                    <div className="flex items-center justify-between border-b border-[#262B32] pb-1.5 font-mono text-[10px]">
                      <span className="font-bold text-[#F59E0B] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {slip.id}
                      </span>
                      <span className="text-[#6B7280] tabular-nums">{slip.timestamp}</span>
                    </div>

                    {/* Road Segment & Severity Tag */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-['Cabinet_Grotesk',sans-serif] font-black text-sm tracking-tight text-[#F3F4F6]">
                          {slip.roadSegment}
                        </h4>
                        <p className="font-mono text-[10px] text-[#6B7280]">{slip.coordinates}</p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-black border ${
                        slip.severity === 'CRITICAL' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
                        slip.severity === 'MODERATE' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' :
                        'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                      }`}>
                        [{slip.badgeLabel}]
                      </span>
                    </div>

                    {/* Dashcam Photo & Calibrated Bounding Box */}
                    <div className="relative aspect-[16/9] w-full bg-[#090A0D] border border-[#262B32] rounded-[2px] overflow-hidden group">
                      <img 
                        src={slip.imageUrl} 
                        alt="Road defect" 
                        className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                      />

                      {/* Calibrated HUD Bounding Overlay */}
                      <div className="absolute inset-4 border border-[#F59E0B] pointer-events-none flex flex-col justify-between p-1 bg-[#F59E0B]/5">
                        <div className="flex justify-between items-start font-mono text-[8px] text-[#F59E0B]">
                          <span className="bg-[#0D0E11]/90 px-1 border border-[#F59E0B]/40">
                            PCI: {slip.depthMm}mm DEPTH
                          </span>
                          <span className="bg-[#0D0E11]/90 px-1 border border-[#F59E0B]/40">
                            {(slip.confidence * 100).toFixed(0)}% CONF
                          </span>
                        </div>
                        <div className="font-mono text-[8px] text-[#F59E0B] bg-[#0D0E11]/90 px-1 self-start border border-[#F59E0B]/40">
                          IMU PEAK: {slip.gForcePeak}G
                        </div>
                      </div>
                    </div>

                    {/* Surveyor / Citizen Note */}
                    <div className="bg-[#0D0E11] p-2 border border-[#262B32] rounded-[2px] text-xs text-[#9CA3AF] leading-relaxed">
                      <span className="font-mono text-[10px] text-[#6B7280] block mb-0.5">
                        REPORTED BY: {slip.reporter}
                      </span>
                      {slip.note}
                    </div>

                    {/* Municipal Dispatch Status Bar */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                      <span className={`px-2 py-0.5 rounded-[2px] border font-bold ${slip.statusColor}`}>
                        [{slip.status}]
                      </span>

                      {/* Verification Voting Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVote(slip.id, 'CONFIRM'); }}
                          className={`px-2 py-1 rounded-[2px] border text-[10px] font-mono flex items-center gap-1 transition-all ${
                            slip.userVoted === 'CONFIRM'
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold'
                              : 'border-[#262B32] bg-[#0D0E11] text-[#9CA3AF] hover:border-emerald-500/50 hover:text-[#F3F4F6]'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>▲ {slip.confirmVotes}</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleVote(slip.id, 'FALSE_POSITIVE'); }}
                          className={`px-2 py-1 rounded-[2px] border text-[10px] font-mono flex items-center gap-1 transition-all ${
                            slip.userVoted === 'FALSE_POSITIVE'
                              ? 'border-red-500 bg-red-500/20 text-red-400 font-bold'
                              : 'border-[#262B32] bg-[#0D0E11] text-[#9CA3AF] hover:border-red-500/50 hover:text-[#F3F4F6]'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>▼ {slip.falsePositiveVotes}</span>
                        </button>
                      </div>
                    </div>

                    {/* Civic Discussion & Verification Thread Toggle */}
                    <div className="border-t border-[#262B32] pt-1.5 flex items-center justify-between text-[10px] font-mono text-[#6B7280]">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleComments(slip.id); }}
                        className="flex items-center gap-1 text-[#38BDF8] hover:underline"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>DISPATCH LOG & COMMENTS ({slip.comments.length})</span>
                      </button>
                      <span>HAIRLINE_REC // 01</span>
                    </div>

                    {/* Expanded Verification Thread */}
                    {isCommentsOpen && (
                      <div className="mt-1 space-y-1.5 pl-2 border-l border-[#262B32] text-xs">
                        {slip.comments.map((c, cIdx) => (
                          <div key={cIdx} className="bg-[#0D0E11] p-1.5 border border-[#262B32] rounded-[2px]">
                            <div className="flex justify-between items-center text-[10px] font-mono text-[#6B7280]">
                              <span className="font-semibold text-[#F3F4F6]">{c.author}</span>
                              <span>{c.time}</span>
                            </div>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}
