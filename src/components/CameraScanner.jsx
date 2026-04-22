import { useRef, useState, useEffect, useCallback } from "react";

function Ring({ size, color, spin, duration, dash, opacity = 1 }) {
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{
      position:"absolute", top:"50%", left:"50%",
      transform:"translate(-50%,-50%)",
      animation:`ring${spin}${duration} ${duration}s linear infinite`,
      opacity, pointerEvents:"none",
    }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={1.5}
        strokeDasharray={dash ? `${circ*0.6} ${circ*0.4}` : `${circ}`}
        style={{ filter:`drop-shadow(0 0 4px ${color})` }} />
      <style>{`
        @keyframes ringcw${duration}  { to { transform: rotate(360deg);  transform-origin:${size/2}px ${size/2}px; } }
        @keyframes ringccw${duration} { to { transform: rotate(-360deg); transform-origin:${size/2}px ${size/2}px; } }
      `}</style>
    </svg>
  );
}

function Bracket({ pos, color, size = 28 }) {
  const S = {
    tl:{ top:0,    left:0,   borderTop:`2px solid ${color}`,    borderLeft:`2px solid ${color}` },
    tr:{ top:0,    right:0,  borderTop:`2px solid ${color}`,    borderRight:`2px solid ${color}` },
    bl:{ bottom:0, left:0,   borderBottom:`2px solid ${color}`, borderLeft:`2px solid ${color}` },
    br:{ bottom:0, right:0,  borderBottom:`2px solid ${color}`, borderRight:`2px solid ${color}` },
  };
  return <div style={{ position:"absolute", width:size, height:size, ...S[pos] }} />;
}

// Angle guide icons
const ANGLE_GUIDES = [
  { id:"front",   label:"Front",   icon:"◈", tip:"Point directly at the leaf or stem" },
  { id:"above",   label:"Above",   icon:"▽", tip:"Shoot from above looking down at the plant" },
  { id:"under",   label:"Underside",icon:"△", tip:"Flip leaf — show the underside for disease spots" },
  { id:"close",   label:"Close-up", icon:"⊕", tip:"Move very close to show leaf texture and spots" },
];

export default function CameraScanner({ onCapture, onClose, multiAngle = true }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef  = useRef(null);

  const [ready,        setReady]        = useState(false);
  const [error,        setError]        = useState(null);
  const [facingMode,   setFacingMode]   = useState("environment");
  const [torchOn,      setTorchOn]      = useState(false);
  const [torchSupp,    setTorchSupp]    = useState(false);
  const [nightVision,  setNightVision]  = useState(false);

  // Multi-angle state
  const [captures,     setCaptures]     = useState([]); // [{base64, preview, angle}]
  const [currentAngle, setCurrentAngle] = useState("front");
  const [phase,        setPhase]        = useState("SCANNING");
  const [phaseColor,   setPhaseColor]   = useState("#00FF88");
  const [capturing,    setCapturing]    = useState(false);
  const [showTip,      setShowTip]      = useState(true);

  // HUD animation
  const [scanY,   setScanY]   = useState(0);
  const [tick,    setTick]    = useState(0);
  const [bars,    setBars]    = useState([72,55,88]);
  const [nodes,   setNodes]   = useState(() =>
    Array.from({length:12}, () => ({ active:Math.random()>0.5, val:Math.floor(Math.random()*99) }))
  );

  useEffect(() => {
    let frame, pos=0, dir=1;
    const loop = () => {
      pos += dir*0.9; if(pos>=100){pos=100;dir=-1;} if(pos<=0){pos=0;dir=1;}
      setScanY(pos); setTick(t=>t+1);
      setBars(b => b.map(v => Math.max(20,Math.min(99,v+(Math.random()-.5)*10))));
      setNodes(ns => ns.map(n => ({
        active: Math.random()>0.75 ? !n.active : n.active,
        val: Math.max(0,Math.min(99,n.val+Math.floor((Math.random()-.5)*18))),
      })));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const startCamera = useCallback(async (mode, torch=false) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setReady(false); setError(null); trackRef.current = null;
    if (!navigator.mediaDevices?.getUserMedia) { setError("Camera not supported. Use Upload instead."); return; }

    for (const c of [
      { video:{ facingMode:mode, width:{ideal:1920}, height:{ideal:1080} } },
      { video:{ facingMode:mode } }, { video:true },
    ]) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track.getCapabilities?.() ?? {};
        setTorchSupp(!!caps.torch);
        if (torch && caps.torch) await track.applyConstraints({ advanced:[{ torch:true }] }).catch(()=>{});
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((res,rej) => { videoRef.current.onloadedmetadata=res; setTimeout(rej,8000); });
          await videoRef.current.play();
          setReady(true);
        }
        return;
      } catch(e) {
        if (e.name==="NotAllowedError") { setError("Camera permission denied. Allow camera access in settings."); return; }
      }
    }
    setError("Camera failed to start. Try uploading a photo instead.");
  }, []);

  useEffect(() => { startCamera("environment"); return () => streamRef.current?.getTracks().forEach(t=>t.stop()); }, []);

  const toggleTorch = async () => {
    if (!trackRef.current || !torchSupp) return;
    const next = !torchOn;
    await trackRef.current.applyConstraints({ advanced:[{ torch:next }] }).catch(()=>{});
    setTorchOn(next);
  };

  // Capture one photo for the current angle
  const captureAngle = async () => {
    if (!ready || capturing) return;
    setCapturing(true);
    setPhase("LOCKING"); setPhaseColor("#FFD700");
    await new Promise(r => setTimeout(r, 300));
    setPhase("CAPTURE"); setPhaseColor("#FFFFFF");

    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) { setCapturing(false); setPhase("SCANNING"); setPhaseColor("#00FF88"); return; }

    c.width = v.videoWidth||1280; c.height = v.videoHeight||720;
    const ctx = c.getContext("2d");
    if (nightVision) ctx.filter = "brightness(1.8) contrast(1.3) saturate(0.2) sepia(0.5) hue-rotate(60deg)";
    ctx.drawImage(v,0,0,c.width,c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.88);
    const base64  = dataUrl.split(",")[1];

    await new Promise(r => setTimeout(r, 180));

    if (multiAngle) {
      // Add to captures list
      setCaptures(prev => {
        const next = prev.filter(p => p.angle !== currentAngle);
        return [...next, { base64, preview:dataUrl, angle:currentAngle }];
      });
      setPhase("SCANNING"); setPhaseColor("#00FF88");
      setCapturing(false);
      setShowTip(true);

      // Move to next angle automatically
      const angles = ANGLE_GUIDES.map(a => a.id);
      const idx = angles.indexOf(currentAngle);
      if (idx < angles.length - 1) setCurrentAngle(angles[idx + 1]);
    } else {
      // Single capture mode — send immediately
      setCapturing(false); setPhase("SCANNING"); setPhaseColor("#00FF88");
      onCapture([{ base64, preview:dataUrl, angle:"front" }]);
    }
  };

  // Send all captured angles to parent
  const analyseAll = () => {
    if (captures.length === 0) return;
    onCapture(captures);
  };

  const removeCapture = (angle) => setCaptures(prev => prev.filter(c => c.angle !== angle));

  const currentGuide = ANGLE_GUIDES.find(a => a.id === currentAngle);
  const PC = phaseColor;
  const NV_FILTER = nightVision ? "brightness(1.8) contrast(1.3) saturate(0.2) sepia(0.5) hue-rotate(60deg)" : "none";

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,backgroundColor:"#000",
      display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",userSelect:"none" }}>

      {/* TOP BAR */}
      <div style={{ padding:"9px 14px",background:"linear-gradient(to bottom,rgba(0,0,0,0.95),transparent)",
        borderBottom:`1px solid ${PC}30`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
          <div style={{ width:7,height:7,borderRadius:"50%",backgroundColor:PC,
            boxShadow:`0 0 10px ${PC}`,animation:"pulse 1.2s ease-in-out infinite" }} />
          <div>
            <div style={{ color:PC,fontSize:9,letterSpacing:3,fontWeight:"bold" }}>TERRAIQ+ PLANT VISION v3</div>
            <div style={{ color:`${PC}50`,fontSize:6,letterSpacing:2 }}>SINGLE-SHOT SCAN · WEED · CROP · TREE</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          {nightVision && <span style={{ color:"#00FF44",fontSize:7,border:"1px solid #00FF44",padding:"2px 5px",borderRadius:2 }}>NV</span>}
          {torchOn     && <span style={{ color:"#FFD700",fontSize:7,border:"1px solid #FFD700",padding:"2px 5px",borderRadius:2 }}>TORCH</span>}
        </div>
      </div>

      {/* VIDEO */}
      <div style={{ position:"relative",flex:1,overflow:"hidden",backgroundColor:"#000" }}>
        <video ref={videoRef}
          style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:NV_FILTER,transition:"filter 0.3s" }}
          playsInline muted autoPlay />

        {ready && (
          <div style={{ position:"absolute",inset:0,pointerEvents:"none" }}>
            {/* Vignette */}
            <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at center,transparent 28%,rgba(0,0,0,0.72) 100%)" }} />
            <div style={{ position:"absolute",top:0,left:0,right:0,height:"20%",background:"linear-gradient(to bottom,rgba(0,0,0,0.8),transparent)" }} />
            <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"28%",background:"linear-gradient(to top,rgba(0,0,0,0.9),transparent)" }} />

            {/* Main scan frame */}
            <div style={{ position:"absolute",top:"18%",left:"8%",right:"8%",bottom:"26%",overflow:"hidden" }}>
              <Bracket pos="tl" color={PC} />
              <Bracket pos="tr" color={PC} />
              <Bracket pos="bl" color={PC} />
              <Bracket pos="br" color={PC} />

              {/* Grid */}
              <div style={{ position:"absolute",inset:0,
                backgroundImage:`linear-gradient(${PC}07 1px,transparent 1px),linear-gradient(90deg,${PC}07 1px,transparent 1px)`,
                backgroundSize:"32px 32px" }} />

              {/* Scan line */}
              {phase==="SCANNING" && (
                <div style={{ position:"absolute",left:0,right:0,top:`${scanY}%`,height:2,
                  background:`linear-gradient(to right,transparent,${PC}80 30%,${PC} 50%,${PC}80 70%,transparent)`,
                  boxShadow:`0 0 16px ${PC},0 0 32px ${PC}40` }} />
              )}

              {/* Targeting rings */}
              <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)" }}>
                <div style={{ position:"relative",width:100,height:100 }}>
                  <Ring size={100} color={PC} spin="cw"  duration={7}   dash opacity={0.55} />
                  <Ring size={72}  color={PC} spin="ccw" duration={4.5} dash opacity={0.4} />
                  <Ring size={44}  color={PC} spin="cw"  duration={2.8}      opacity={0.7} />
                  <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                    width:6,height:6,borderRadius:"50%",backgroundColor:PC,boxShadow:`0 0 12px ${PC}` }} />
                  {[{top:"50%",left:"5%",width:"25%",height:1},{top:"50%",right:"5%",width:"25%",height:1},
                    {left:"50%",top:"5%",width:1,height:"25%"},{left:"50%",bottom:"5%",width:1,height:"25%"}].map((s,i) => (
                    <div key={i} style={{ position:"absolute",backgroundColor:`${PC}70`,...s,transform:"translate(-50%,-50%)" }} />
                  ))}
                </div>
              </div>

              {/* Capture flash */}
              {phase==="CAPTURE" && <div style={{ position:"absolute",inset:0,backgroundColor:"rgba(255,255,255,0.25)",border:`2px solid ${PC}` }} />}
              {phase==="LOCKING" && <div style={{ position:"absolute",inset:0,border:"2px solid #FFD700",boxShadow:"inset 0 0 24px #FFD70020" }} />}

              {/* Corner dots */}
              {[{top:-3,left:-3},{top:-3,right:-3},{bottom:-3,left:-3},{bottom:-3,right:-3}].map((s,i) => (
                <div key={i} style={{ position:"absolute",width:6,height:6,borderRadius:"50%",
                  backgroundColor:PC,boxShadow:`0 0 12px ${PC}`,...s }} />
              ))}
            </div>

            {/* Left panel */}
            <div style={{ position:"absolute",left:6,top:"22%",display:"flex",flexDirection:"column",gap:5 }}>
              {/* Neural nodes */}
              <div style={{ backgroundColor:"rgba(0,0,0,0.8)",border:`1px solid ${PC}25`,padding:"6px 8px",borderRadius:4,width:78 }}>
                <div style={{ color:`${PC}60`,fontSize:6,letterSpacing:2,marginBottom:4 }}>NEURAL</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2 }}>
                  {nodes.map((n,i) => (
                    <div key={i} style={{ width:12,height:12,borderRadius:2,
                      backgroundColor:n.active?PC:`${PC}18`,
                      boxShadow:n.active?`0 0 4px ${PC}`:"none",transition:"all 0.3s",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <span style={{ color:n.active?"#000":`${PC}40`,fontSize:4 }}>{n.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Bars */}
              <div style={{ backgroundColor:"rgba(0,0,0,0.8)",border:`1px solid ${PC}25`,padding:"6px 8px",borderRadius:4 }}>
                {["SIG","NIR","ACQ"].map((l,i) => (
                  <div key={l} style={{ marginBottom:3 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:1 }}>
                      <span style={{ color:`${PC}60`,fontSize:5,letterSpacing:1 }}>{l}</span>
                      <span style={{ color:PC,fontSize:6 }}>{Math.round(bars[i])}%</span>
                    </div>
                    <div style={{ height:2,backgroundColor:`${PC}18`,borderRadius:1 }}>
                      <div style={{ width:`${bars[i]}%`,height:"100%",background:`linear-gradient(to right,${PC}80,${PC})`,transition:"width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ANGLE GUIDE (top center) ── */}
            {multiAngle && showTip && currentGuide && (
              <div style={{ position:"absolute",top:"20%",left:0,right:0,display:"flex",justifyContent:"center" }}
                onClick={() => setShowTip(false)}>
                <div style={{ backgroundColor:"rgba(0,0,0,0.85)",border:`1px solid ${PC}60`,
                  padding:"8px 18px",borderRadius:6,maxWidth:"70%",textAlign:"center" }}>
                  <div style={{ color:PC,fontSize:14,marginBottom:3 }}>{currentGuide.icon}</div>
                  <div style={{ color:PC,fontSize:10,fontWeight:"bold",letterSpacing:2,marginBottom:3 }}>
                    ANGLE: {currentGuide.label.toUpperCase()}
                  </div>
                  <div style={{ color:"#9CA3AF",fontSize:9 }}>{currentGuide.tip}</div>
                  <div style={{ color:`${PC}50`,fontSize:8,marginTop:4 }}>tap to dismiss</div>
                </div>
              </div>
            )}

            {/* Status label */}
            <div style={{ position:"absolute",bottom:"28%",left:0,right:0,display:"flex",justifyContent:"center" }}>
              <div style={{ backgroundColor:"rgba(0,0,0,0.85)",border:`1px solid ${PC}60`,
                padding:"5px 16px",borderRadius:2,color:PC,fontSize:9,letterSpacing:3,fontWeight:"bold" }}>
                ◈ {phase==="SCANNING" ? (currentGuide?.label?.toUpperCase() ?? "SCANNING") : phase==="LOCKING" ? "LOCKING" : "CAPTURED"} ◈
              </div>
            </div>

            {/* Angle progress strip (bottom) */}
            {multiAngle && (
              <div style={{ position:"absolute",bottom:"24%",left:0,right:0,
                display:"flex",justifyContent:"center",gap:8 }}>
                {ANGLE_GUIDES.map(ag => {
                  const captured = captures.some(c => c.angle === ag.id);
                  const isCurrent = ag.id === currentAngle;
                  return (
                    <div key={ag.id}
                      style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                        cursor:"pointer",pointerEvents:"all" }}
                      onClick={() => { setCurrentAngle(ag.id); setShowTip(true); }}>
                      <div style={{ width:32,height:32,borderRadius:8,
                        backgroundColor: captured ? PC : isCurrent ? `${PC}30` : "rgba(0,0,0,0.5)",
                        border:`1.5px solid ${captured ? PC : isCurrent ? PC : `${PC}40`}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        boxShadow: isCurrent ? `0 0 10px ${PC}50` : "none",
                        transition:"all 0.2s" }}>
                        <span style={{ fontSize:12, color: captured ? "#000" : PC }}>{ag.icon}</span>
                      </div>
                      <span style={{ color: captured ? PC : `${PC}60`, fontSize:7, letterSpacing:1 }}>
                        {ag.label.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,0.95)",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32 }}>
            <div style={{ color:"#FF4444",fontSize:12,letterSpacing:3,marginBottom:12 }}>⚠ VISION ERROR</div>
            <p style={{ color:"#888",fontSize:13,textAlign:"center",lineHeight:1.6,marginBottom:24 }}>{error}</p>
            <button onClick={onClose} style={{ backgroundColor:"#1E8A4C",color:"white",
              padding:"12px 28px",borderRadius:4,border:"none",cursor:"pointer",fontWeight:"bold" }}>
              USE UPLOAD INSTEAD
            </button>
          </div>
        )}

        {/* Loading */}
        {!ready && !error && (
          <div style={{ position:"absolute",inset:0,backgroundColor:"#000",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
            <div style={{ position:"relative",width:90,height:90,marginBottom:18 }}>
              {[90,62,34].map((sz,i) => (
                <div key={i} style={{ position:"absolute",top:"50%",left:"50%",
                  width:sz,height:sz,borderRadius:"50%",border:"1.5px solid #00FF8825",
                  borderTopColor:"#00FF88",transform:"translate(-50%,-50%)",
                  animation:`ld${i} ${1.2+i*0.4}s linear infinite` }} />
              ))}
              <style>{`@keyframes ld0{to{transform:translate(-50%,-50%)rotate(360deg);}}@keyframes ld1{to{transform:translate(-50%,-50%)rotate(-360deg);}}@keyframes ld2{to{transform:translate(-50%,-50%)rotate(360deg);}}`}</style>
            </div>
            <div style={{ color:"#00FF88",fontSize:10,letterSpacing:4 }}>INITIALISING</div>
          </div>
        )}
      </div>

      {/* CAPTURE STRIP — thumbnail previews */}
      {multiAngle && captures.length > 0 && (
        <div style={{ backgroundColor:"rgba(0,0,0,0.95)",borderTop:`1px solid ${PC}20`,
          padding:"8px 16px",display:"flex",gap:8,overflowX:"auto",flexShrink:0 }}>
          {captures.map(cap => (
            <div key={cap.angle} style={{ position:"relative",flexShrink:0 }}>
              <img src={cap.preview} alt={cap.angle}
                style={{ width:56,height:42,objectFit:"cover",borderRadius:6,
                  border:`2px solid ${PC}` }} />
              <div style={{ position:"absolute",bottom:2,left:2,right:2,
                backgroundColor:"rgba(0,0,0,0.7)",borderRadius:3,
                color:PC,fontSize:7,textAlign:"center",letterSpacing:1,padding:"1px 0" }}>
                {cap.angle.toUpperCase()}
              </div>
              <button onClick={() => removeCapture(cap.angle)} style={{
                position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",
                backgroundColor:"#C0392B",color:"white",border:"none",cursor:"pointer",
                fontSize:9,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* CONTROL BAR */}
      <div style={{ backgroundColor:"rgba(0,0,0,0.97)",borderTop:`1px solid ${PC}20`,
        padding:"12px 20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>

        <button onClick={onClose} style={{ width:42,height:42,borderRadius:"50%",
          backgroundColor:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
          color:"#666",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>✕</button>

        {/* Centre buttons */}
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
          {/* Torch + NV */}
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={toggleTorch}
              style={{ padding:"4px 10px",borderRadius:5,
                backgroundColor:torchOn?"#FFD700":"rgba(255,215,0,0.08)",
                border:`1px solid ${torchOn?"#FFD700":"rgba(255,215,0,0.3)"}`,
                color:torchOn?"#000":"#FFD700",fontSize:8,fontWeight:"bold",
                cursor:torchSupp?"pointer":"not-allowed",opacity:torchSupp?1:0.4 }}>
              ☀ TORCH
            </button>
            <button onClick={() => setNightVision(n => !n)} style={{ padding:"4px 10px",borderRadius:5,
              backgroundColor:nightVision?"#00FF44":"rgba(0,255,68,0.08)",
              border:`1px solid ${nightVision?"#00FF44":"rgba(0,255,68,0.3)"}`,
              color:nightVision?"#000":"#00FF44",fontSize:8,fontWeight:"bold",cursor:"pointer" }}>
              ◑ NV
            </button>
          </div>

          {/* Shutter */}
          <button onClick={captureAngle} disabled={!ready||capturing}
            style={{ width:76,height:76,borderRadius:"50%",backgroundColor:"transparent",
              border:`2px solid ${ready?PC:"#333"}`,cursor:ready?"pointer":"not-allowed",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:ready?`0 0 24px ${PC}40`:"none",position:"relative",transition:"all 0.2s" }}>
            <svg width={76} height={76} style={{ position:"absolute",inset:0,animation:"spinShutter 5s linear infinite" }}>
              <circle cx={38} cy={38} r={36} fill="none" stroke={PC} strokeWidth={1}
                strokeDasharray="52 178" style={{ filter:`drop-shadow(0 0 3px ${PC})` }} />
            </svg>
            <div style={{ width:58,height:58,borderRadius:"50%",
              backgroundColor:capturing?PC:`${PC}20`,border:`1px solid ${PC}50`,
              boxShadow:capturing?`0 0 28px ${PC}`:`0 0 8px ${PC}20`,transition:"all 0.15s" }} />
          </button>

          {/* Analyse button — appears when at least one capture */}
          {multiAngle && captures.length > 0 && (
            <button onClick={analyseAll}
              style={{ backgroundColor:PC,color:"#000",padding:"8px 24px",borderRadius:8,
                border:"none",cursor:"pointer",fontWeight:"bold",fontSize:11,letterSpacing:1,
                boxShadow:`0 0 16px ${PC}60` }}>
              ANALYSE {captures.length} PHOTO{captures.length>1?"S":""}
            </button>
          )}
        </div>

        <button onClick={() => { setFacingMode(m => { const n = m==="environment"?"user":"environment"; startCamera(n); return n; })} }
          style={{ width:42,height:42,borderRadius:"50%",
            backgroundColor:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
            color:"#888",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⟳</button>
      </div>

      <canvas ref={canvasRef} style={{ display:"none" }} />
      <style>{`
        @keyframes spinShutter{to{transform:rotate(360deg);transform-origin:38px 38px;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
      `}</style>
    </div>
  );
}
