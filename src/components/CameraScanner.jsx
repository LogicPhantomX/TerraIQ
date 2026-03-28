import { useRef, useState, useEffect, useCallback } from "react";

// ── Animated HUD ring ──────────────────────────────────────────────
function Ring({ size, color, spin, duration, dash, opacity = 1 }) {
  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;
  const dashArray = dash ? `${circumference * 0.6} ${circumference * 0.4}` : `${circumference}`;
  return (
    <svg width={size} height={size} style={{ position:"absolute", top:"50%", left:"50%",
      transform:`translate(-50%,-50%) rotate(${spin ? 0 : 0}deg)`,
      animation: spin ? `spin${duration} ${duration}s linear infinite` : "none",
      opacity, pointerEvents:"none"
    }}>
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={1.5}
        strokeDasharray={dashArray}
        style={{ filter:`drop-shadow(0 0 4px ${color})` }}
      />
      <style>{`@keyframes spin${duration} { to { transform: rotate(${spin === "cw" ? 360 : -360}deg); transform-origin: ${size/2}px ${size/2}px; } }`}</style>
    </svg>
  );
}

// ── Corner bracket ─────────────────────────────────────────────────
function Bracket({ pos, color, size = 24 }) {
  const S = {
    tl: { top:0,    left:0,   borderTop:`2px solid ${color}`, borderLeft: `2px solid ${color}` },
    tr: { top:0,    right:0,  borderTop:`2px solid ${color}`, borderRight:`2px solid ${color}` },
    bl: { bottom:0, left:0,   borderBottom:`2px solid ${color}`, borderLeft:`2px solid ${color}` },
    br: { bottom:0, right:0,  borderBottom:`2px solid ${color}`, borderRight:`2px solid ${color}` },
  };
  return <div style={{ position:"absolute", width:size, height:size,
    boxShadow:`0 0 8px ${color}40`, ...S[pos] }} />;
}

// ── Data stream widget ─────────────────────────────────────────────
function DataStream({ values, color, label }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
      <div style={{ color:`${color}80`, fontSize:7, letterSpacing:2, marginBottom:2 }}>{label}</div>
      {values.map((v, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ flex:1, height:2, backgroundColor:`${color}20` }}>
            <div style={{ width:`${v}%`, height:"100%", backgroundColor:color,
              boxShadow:`0 0 4px ${color}`, transition:"width 0.5s ease" }} />
          </div>
          <span style={{ color, fontSize:8, width:24, textAlign:"right" }}>{v}%</span>
        </div>
      ))}
    </div>
  );
}

export default function CameraScanner({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [ready,      setReady]      = useState(false);
  const [error,      setError]      = useState(null);
  const [capturing,  setCapturing]  = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  // Live HUD data — animated
  const [scanProgress, setScanProgress] = useState(0);
  const [signalBars,   setSignalBars]   = useState([65,45,80]);
  const [phase,        setPhase]        = useState("SCANNING");
  const [phaseColor,   setPhaseColor]   = useState("#00FF88");
  const [particles,    setParticles]    = useState([]);
  const [tick,         setTick]         = useState(0);
  const [scanLineY,    setScanLineY]    = useState(0);
  const [scanDir,      setScanDir]      = useState(1);
  const [neuralNodes,  setNeuralNodes]  = useState(() =>
    Array.from({length:12}, (_, i) => ({
      x: 10 + (i % 4) * 27,
      y: 10 + Math.floor(i / 4) * 35,
      active: Math.random() > 0.5,
      val: Math.floor(Math.random() * 100),
    }))
  );

  // Main animation loop
  useEffect(() => {
    let frame;
    let dir = 1;
    let pos = 0;
    const loop = () => {
      pos += dir * 0.8;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0)   { pos = 0;   dir = 1;  }
      setScanLineY(pos);
      setScanDir(dir);

      setTick(t => t + 1);
      setScanProgress(p => { const n = p + 0.4; return n > 100 ? 0 : n; });
      setSignalBars(b => b.map(v => Math.max(20, Math.min(99, v + (Math.random()-0.5)*8))));
      setNeuralNodes(nodes => nodes.map(n => ({
        ...n,
        active: Math.random() > 0.7 ? !n.active : n.active,
        val: Math.max(0, Math.min(99, n.val + Math.floor((Math.random()-0.5)*15))),
      })));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const startCamera = useCallback(async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setReady(false); setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported. Use Upload Photo instead.");
      return;
    }
    for (const c of [
      { video:{ facingMode:mode, width:{ideal:1920}, height:{ideal:1080} } },
      { video:{ facingMode:mode } },
      { video:true },
    ]) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((res,rej) => {
            videoRef.current.onloadedmetadata = res;
            videoRef.current.onerror = rej;
            setTimeout(rej, 8000);
          });
          await videoRef.current.play();
          setReady(true);
        }
        return;
      } catch(e) {
        if (e.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access in your browser settings.");
          return;
        }
      }
    }
    setError("Could not start camera. Try uploading a photo instead.");
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = async () => {
    if (!ready || capturing) return;
    setCapturing(true);
    setPhase("LOCKING TARGET");
    setPhaseColor("#FFD700");
    await new Promise(r => setTimeout(r, 400));
    setPhase("ACQUIRING");
    setPhaseColor("#FF6B35");
    await new Promise(r => setTimeout(r, 300));
    setPhase("CAPTURED");
    setPhaseColor("#FFFFFF");

    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) { setCapturing(false); setPhase("SCANNING"); setPhaseColor("#00FF88"); return; }
    c.width  = v.videoWidth  || 1280;
    c.height = v.videoHeight || 720;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.88);

    await new Promise(r => setTimeout(r, 200));
    setCapturing(false);
    setPhase("SCANNING");
    setPhaseColor("#00FF88");
    onCapture(dataUrl.split(",")[1], dataUrl);
  };

  const PC = phaseColor;
  const now = new Date();

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      backgroundColor:"#000",
      display:"flex", flexDirection:"column",
      fontFamily:"'Courier New', monospace",
      userSelect:"none",
    }}>

      {/* ── TOP HUD BAR ───────────────────────────────────────────── */}
      <div style={{
        padding:"10px 16px",
        background:"linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,0.7))",
        borderBottom:`1px solid ${PC}30`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexShrink:0,
      }}>
        {/* Left — brand */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:8, height:8, borderRadius:"50%", backgroundColor:PC,
            boxShadow:`0 0 10px ${PC}`, animation:"pulse 1.2s ease-in-out infinite",
          }} />
          <div>
            <div style={{ color:PC, fontSize:10, letterSpacing:3, fontWeight:"bold" }}>
              TERRAIQ+ VISION SYSTEM
            </div>
            <div style={{ color:`${PC}60`, fontSize:7, letterSpacing:2, marginTop:1 }}>
              PLANT IDENTIFICATION MODULE v3.2
            </div>
          </div>
        </div>
        {/* Right — time + mode */}
        <div style={{ textAlign:"right" }}>
          <div style={{ color:PC, fontSize:10, letterSpacing:2 }}>
            {now.toLocaleTimeString("en-GB")}
          </div>
          <div style={{ color:`${PC}60`, fontSize:7, letterSpacing:2, marginTop:1 }}>
            {facingMode === "environment" ? "REAR · WIDE" : "FRONT · SELFIE"}
          </div>
        </div>
      </div>

      {/* ── MAIN VIDEO ────────────────────────────────────────────── */}
      <div style={{ position:"relative", flex:1, overflow:"hidden", backgroundColor:"#000" }}>
        <video ref={videoRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}
          playsInline muted autoPlay
        />

        {/* Full HUD overlay */}
        {ready && (
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>

            {/* ── Vignette ──────────────────────────────────────── */}
            <div style={{ position:"absolute", inset:0,
              background:"radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.7) 100%)" }} />
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"22%",
              background:"linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)" }} />
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"30%",
              background:"linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }} />

            {/* ── Main target frame ─────────────────────────────── */}
            <div style={{ position:"absolute", top:"18%", left:"8%", right:"8%", bottom:"28%", overflow:"hidden" }}>

              {/* Outer frame */}
              <Bracket pos="tl" color={PC} size={32} />
              <Bracket pos="tr" color={PC} size={32} />
              <Bracket pos="bl" color={PC} size={32} />
              <Bracket pos="br" color={PC} size={32} />

              {/* Inner frame markers */}
              {[
                { top:"50%", left:0,   transform:"translateY(-50%)", w:10, h:1 },
                { top:"50%", right:0,  transform:"translateY(-50%)", w:10, h:1 },
                { left:"50%",top:0,    transform:"translateX(-50%)", w:1, h:10 },
                { left:"50%",bottom:0, transform:"translateX(-50%)", w:1, h:10 },
              ].map((s,i) => (
                <div key={i} style={{
                  position:"absolute", ...s,
                  backgroundColor:`${PC}50`,
                  width:s.w, height:s.h,
                }} />
              ))}

              {/* Animated scan line */}
              {phase === "SCANNING" && (
                <>
                  <div style={{
                    position:"absolute", left:0, right:0,
                    top:`${scanLineY}%`, height:2,
                    background:`linear-gradient(to right, transparent 0%, ${PC}80 30%, ${PC} 50%, ${PC}80 70%, transparent 100%)`,
                    boxShadow:`0 0 16px ${PC}, 0 0 32px ${PC}40`,
                  }} />
                  {/* Scan line glow trail */}
                  <div style={{
                    position:"absolute", left:"10%", right:"10%",
                    top:`${scanLineY}%`,
                    height:scanDir > 0 ? "6%" : "-6%",
                    background:`linear-gradient(to ${scanDir > 0 ? "bottom" : "top"}, ${PC}15, transparent)`,
                    transform:scanDir < 0 ? "scaleY(-1)" : "none",
                  }} />
                </>
              )}

              {/* Grid overlay */}
              <div style={{
                position:"absolute", inset:0,
                backgroundImage:`
                  linear-gradient(${PC}08 1px, transparent 1px),
                  linear-gradient(90deg, ${PC}08 1px, transparent 1px)
                `,
                backgroundSize:"32px 32px",
              }} />

              {/* Centre targeting reticle */}
              <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }}>
                {/* Multiple spinning rings */}
                <div style={{ position:"relative", width:120, height:120 }}>
                  <Ring size={120} color={PC} spin="cw"  duration={8}  dash opacity={0.6} />
                  <Ring size={90}  color={PC} spin="ccw" duration={5}  dash opacity={0.4} />
                  <Ring size={60}  color={PC} spin="cw"  duration={3}  opacity={0.7} />

                  {/* Centre dot */}
                  <div style={{
                    position:"absolute", top:"50%", left:"50%",
                    transform:"translate(-50%,-50%)",
                    width:6, height:6, borderRadius:"50%",
                    backgroundColor:PC, boxShadow:`0 0 12px ${PC}`,
                  }} />
                  {/* Crosshair */}
                  {[{top:"50%",left:"10%",width:"30%",height:1},{top:"50%",right:"10%",width:"30%",height:1},
                    {left:"50%",top:"10%",width:1,height:"30%"},{left:"50%",bottom:"10%",width:1,height:"30%"}].map((s,i) => (
                    <div key={i} style={{ position:"absolute", backgroundColor:`${PC}80`, ...s,
                      transform:"translate(-50%,-50%)" }} />
                  ))}
                </div>
              </div>

              {/* Corner glow dots */}
              {[{top:-3,left:-3},{top:-3,right:-3},{bottom:-3,left:-3},{bottom:-3,right:-3}].map((s,i) => (
                <div key={i} style={{
                  position:"absolute", width:6, height:6, borderRadius:"50%",
                  backgroundColor:PC, boxShadow:`0 0 12px ${PC}`, ...s,
                }} />
              ))}

              {/* Lock indicators when capturing */}
              {(phase === "LOCKING TARGET" || phase === "ACQUIRING") && (
                <div style={{ position:"absolute", inset:0, border:`2px solid ${PC}`,
                  boxShadow:`inset 0 0 30px ${PC}20, 0 0 30px ${PC}30`,
                  animation:"flicker 0.1s infinite",
                }} />
              )}
            </div>

            {/* ── LEFT SIDE DATA PANEL ─────────────────────────── */}
            <div style={{
              position:"absolute", left:8, top:"22%",
              display:"flex", flexDirection:"column", gap:8,
            }}>
              {/* Neural activity */}
              <div style={{
                backgroundColor:"rgba(0,0,0,0.75)",
                border:`1px solid ${PC}30`,
                padding:"8px 10px", borderRadius:4, width:90,
              }}>
                <div style={{ color:`${PC}70`, fontSize:7, letterSpacing:1.5, marginBottom:6 }}>NEURAL MAP</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:3 }}>
                  {neuralNodes.map((n,i) => (
                    <div key={i} style={{
                      width:14, height:14, borderRadius:2,
                      backgroundColor: n.active ? `${PC}` : `${PC}20`,
                      boxShadow: n.active ? `0 0 6px ${PC}` : "none",
                      transition:"all 0.3s",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <span style={{ color: n.active ? "#000" : `${PC}50`, fontSize:5 }}>
                        {n.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal bars */}
              <div style={{
                backgroundColor:"rgba(0,0,0,0.75)",
                border:`1px solid ${PC}30`,
                padding:"8px 10px", borderRadius:4,
              }}>
                <DataStream label="AI SIGNAL" values={signalBars.map(v => Math.round(v))} color={PC} />
              </div>

              {/* Scan progress */}
              <div style={{
                backgroundColor:"rgba(0,0,0,0.75)",
                border:`1px solid ${PC}30`,
                padding:"8px 10px", borderRadius:4,
              }}>
                <div style={{ color:`${PC}70`, fontSize:7, letterSpacing:1.5, marginBottom:4 }}>SCAN CYCLE</div>
                <div style={{ height:3, backgroundColor:`${PC}20`, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ width:`${Math.round(scanProgress)}%`, height:"100%",
                    backgroundColor:PC, boxShadow:`0 0 6px ${PC}`, transition:"width 0.1s" }} />
                </div>
                <div style={{ color:PC, fontSize:8, marginTop:3 }}>{Math.round(scanProgress)}%</div>
              </div>
            </div>

            {/* ── RIGHT SIDE DATA PANEL ────────────────────────── */}
            <div style={{
              position:"absolute", right:8, top:"22%",
              display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end",
            }}>
              <div style={{
                backgroundColor:"rgba(0,0,0,0.75)",
                border:`1px solid ${PC}30`,
                padding:"8px 10px", borderRadius:4, width:90,
              }}>
                <div style={{ color:`${PC}70`, fontSize:7, letterSpacing:1.5, marginBottom:6 }}>SPECTRUM</div>
                {["NIR","VIS","UV"].map((b,i) => (
                  <div key={b} style={{ marginBottom:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:`${PC}80`, fontSize:7 }}>{b}</span>
                      <span style={{ color:PC, fontSize:7 }}>{Math.round(signalBars[i] ?? 50)}%</span>
                    </div>
                    <div style={{ height:2, backgroundColor:`${PC}20`, borderRadius:1 }}>
                      <div style={{
                        width:`${Math.round(signalBars[i] ?? 50)}%`, height:"100%",
                        background:`linear-gradient(to right, ${PC}80, ${PC})`,
                        boxShadow:`0 0 4px ${PC}`, transition:"width 0.5s",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                backgroundColor:"rgba(0,0,0,0.75)",
                border:`1px solid ${PC}30`,
                padding:"8px 10px", borderRadius:4, width:90,
              }}>
                <div style={{ color:`${PC}70`, fontSize:7, letterSpacing:1.5, marginBottom:6 }}>METRICS</div>
                {[
                  ["FOCUS",  `${Math.round(70 + Math.sin(tick/20)*15)}%`],
                  ["LIGHT",  `${Math.round(55 + Math.cos(tick/15)*20)}%`],
                  ["STABLE", ready ? "YES" : "NO"],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ color:`${PC}60`, fontSize:7 }}>{l}</span>
                    <span style={{ color:PC, fontSize:8, fontWeight:"bold" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── STATUS LABEL ─────────────────────────────────── */}
            <div style={{
              position:"absolute", bottom:"28%", left:0, right:0,
              display:"flex", justifyContent:"center",
            }}>
              <div style={{
                backgroundColor:"rgba(0,0,0,0.85)",
                border:`1px solid ${PC}60`,
                padding:"6px 20px", borderRadius:2,
                color:PC, fontSize:9, letterSpacing:3, fontWeight:"bold",
                boxShadow:`0 0 20px ${PC}20`,
              }}>
                ◈ {phase} ◈
              </div>
            </div>

            {/* ── BOTTOM DATA BAR ──────────────────────────────── */}
            <div style={{
              position:"absolute", bottom:0, left:0, right:0,
              padding:"6px 16px",
              background:"linear-gradient(to top, rgba(0,0,0,0.95), transparent)",
              display:"flex", justifyContent:"space-between", alignItems:"flex-end",
            }}>
              <div style={{ color:`${PC}50`, fontSize:8, letterSpacing:1.5 }}>
                <div>TERRAIQ+ PLANT VISION</div>
                <div style={{ marginTop:2 }}>NG CROP INTELLIGENCE DB</div>
              </div>
              <div style={{ color:`${PC}50`, fontSize:8, letterSpacing:1.5, textAlign:"right" }}>
                <div>IDENTIFYING ALL PLANTS</div>
                <div style={{ marginTop:2 }}>WEEDS · CROPS · TREES</div>
              </div>
            </div>

          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.95)",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32,
          }}>
            <div style={{ color:"#FF4444", fontSize:13, letterSpacing:3, marginBottom:12 }}>⚠ VISION ERROR</div>
            <p style={{ color:"#888", fontSize:13, textAlign:"center", lineHeight:1.6, marginBottom:24 }}>{error}</p>
            <button onClick={onClose} style={{
              backgroundColor:"#1E8A4C", color:"white", padding:"12px 28px",
              borderRadius:4, border:"none", cursor:"pointer", fontWeight:"bold", letterSpacing:1,
            }}>USE UPLOAD INSTEAD</button>
          </div>
        )}

        {/* Loading */}
        {!ready && !error && (
          <div style={{
            position:"absolute", inset:0, backgroundColor:"#000",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          }}>
            {/* Loading rings */}
            <div style={{ position:"relative", width:120, height:120, marginBottom:24 }}>
              {[120,90,60].map((sz, i) => (
                <div key={i} style={{
                  position:"absolute", top:"50%", left:"50%",
                  width:sz, height:sz, borderRadius:"50%",
                  border:"1px solid #00FF8830",
                  borderTopColor:"#00FF88",
                  transform:"translate(-50%,-50%)",
                  animation:`spinLoad${i} ${1.5 + i*0.5}s linear infinite`,
                }} />
              ))}
              <div style={{ position:"absolute", top:"50%", left:"50%",
                transform:"translate(-50%,-50%)",
                width:8, height:8, borderRadius:"50%",
                backgroundColor:"#00FF88", boxShadow:"0 0 12px #00FF88",
              }} />
            </div>
            <div style={{ color:"#00FF88", fontSize:11, letterSpacing:4, marginBottom:8 }}>INITIALISING</div>
            <div style={{ color:"#666", fontSize:9, letterSpacing:2 }}>LOADING PLANT DATABASE</div>
            <style>{`
              @keyframes spinLoad0 { to { transform: translate(-50%,-50%) rotate(360deg); } }
              @keyframes spinLoad1 { to { transform: translate(-50%,-50%) rotate(-360deg); } }
              @keyframes spinLoad2 { to { transform: translate(-50%,-50%) rotate(360deg); } }
            `}</style>
          </div>
        )}
      </div>

      {/* ── CONTROL BAR ──────────────────────────────────────────── */}
      <div style={{
        backgroundColor:"rgba(0,0,0,0.97)",
        borderTop:`1px solid ${PC}25`,
        padding:"16px 28px 32px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexShrink:0,
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          width:48, height:48, borderRadius:"50%",
          backgroundColor:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.12)",
          color:"#666", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:16,
        }}>✕</button>

        {/* Main shutter */}
        <button onClick={capture} disabled={!ready || capturing}
          style={{
            width:84, height:84, borderRadius:"50%",
            backgroundColor:"transparent",
            border:`2px solid ${ready ? PC : "#333"}`,
            cursor:ready ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:ready ? `0 0 24px ${PC}40, inset 0 0 16px ${PC}10` : "none",
            transition:"all 0.2s", position:"relative",
          }}
        >
          {/* Outer rotating arc */}
          {ready && (
            <svg width={84} height={84} style={{ position:"absolute", inset:0, animation:"spinShutter 4s linear infinite" }}>
              <circle cx={42} cy={42} r={40} fill="none" stroke={PC} strokeWidth={1}
                strokeDasharray="60 200" style={{ filter:`drop-shadow(0 0 4px ${PC})` }} />
            </svg>
          )}
          <div style={{
            width:62, height:62, borderRadius:"50%",
            backgroundColor: capturing ? PC : `${PC}20`,
            border:`1px solid ${PC}50`,
            boxShadow: capturing ? `0 0 28px ${PC}` : `0 0 8px ${PC}20`,
            transition:"all 0.15s",
          }} />
        </button>

        {/* Flip */}
        <button onClick={() => {
          const next = facingMode === "environment" ? "user" : "environment";
          setFacingMode(next);
          startCamera(next);
        }} style={{
          width:48, height:48, borderRadius:"50%",
          backgroundColor:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.12)",
          color:"#888", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18,
        }}>⟳</button>
      </div>

      <canvas ref={canvasRef} style={{ display:"none" }} />
      <style>{`
        @keyframes spinShutter { to { transform: rotate(360deg); transform-origin: 42px 42px; } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes flicker { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
      `}</style>
    </div>
  );
}
