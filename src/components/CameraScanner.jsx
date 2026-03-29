import { useRef, useState, useEffect, useCallback } from "react";

function Ring({ size, color, spin, duration, dash, opacity = 1 }) {
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{
      position:"absolute", top:"50%", left:"50%",
      transform:"translate(-50%,-50%)",
      animation:`spin${spin}${duration} ${duration}s linear infinite`,
      opacity, pointerEvents:"none",
    }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={1.5}
        strokeDasharray={dash ? `${circ*0.6} ${circ*0.4}` : `${circ}`}
        style={{ filter:`drop-shadow(0 0 4px ${color})` }} />
      <style>{`
        @keyframes spincw${duration} { to { transform: rotate(360deg); transform-origin: ${size/2}px ${size/2}px; } }
        @keyframes spinccw${duration} { to { transform: rotate(-360deg); transform-origin: ${size/2}px ${size/2}px; } }
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

export default function CameraScanner({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef  = useRef(null);

  const [ready,      setReady]      = useState(false);
  const [error,      setError]      = useState(null);
  const [capturing,  setCapturing]  = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [torchOn,    setTorchOn]    = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [nightVision,setNightVision]= useState(false);
  const [phase,      setPhase]      = useState("SCANNING");
  const [phaseColor, setPhaseColor] = useState("#00FF88");
  const [scanY,      setScanY]      = useState(0);
  const [tick,       setTick]       = useState(0);
  const [nodes,      setNodes]      = useState(() =>
    Array.from({length:16}, () => ({ active:Math.random()>0.5, val:Math.floor(Math.random()*99) }))
  );
  const [bars, setBars] = useState([72,55,88]);

  // Animation loop
  useEffect(() => {
    let frame, pos=0, dir=1;
    const loop = () => {
      pos += dir * 0.9; if(pos>=100){pos=100;dir=-1;} if(pos<=0){pos=0;dir=1;}
      setScanY(pos);
      setTick(t => t+1);
      setBars(b => b.map(v => Math.max(20,Math.min(99,v+(Math.random()-.5)*10))));
      setNodes(ns => ns.map(n => ({
        active: Math.random()>0.75 ? !n.active : n.active,
        val: Math.max(0,Math.min(99,n.val+Math.floor((Math.random()-.5)*20))),
      })));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const startCamera = useCallback(async (mode, torch=false) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setReady(false); setError(null); trackRef.current = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported. Use Upload Photo instead."); return;
    }

    const constraints = [
      { video:{ facingMode:mode, width:{ideal:1920}, height:{ideal:1080} } },
      { video:{ facingMode:mode } },
      { video:true },
    ];

    for (const c of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        // Check torch support
        const caps = track.getCapabilities?.() ?? {};
        setTorchSupported(!!caps.torch);

        if (torch && caps.torch) {
          await track.applyConstraints({ advanced:[{ torch:true }] }).catch(()=>{});
        }

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
          setError("Camera permission denied. Allow camera access then try again."); return;
        }
      }
    }
    setError("Could not start camera. Use Upload Photo instead.");
  }, []);

  useEffect(() => {
    startCamera(facingMode, false);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    if (!trackRef.current || !torchSupported) return;
    const next = !torchOn;
    try {
      await trackRef.current.applyConstraints({ advanced:[{ torch:next }] });
      setTorchOn(next);
    } catch { toast?.error?.("Torch not available"); }
  };

  const capture = async () => {
    if (!ready || capturing) return;
    setCapturing(true);
    setPhase("LOCKING"); setPhaseColor("#FFD700");
    await new Promise(r => setTimeout(r,350));
    setPhase("CAPTURE"); setPhaseColor("#FFFFFF");

    const v = videoRef.current, c = canvasRef.current;
    if (v && c) {
      c.width = v.videoWidth||1280; c.height = v.videoHeight||720;
      const ctx = c.getContext("2d");
      // Apply night vision filter to captured image if active
      if (nightVision) {
        ctx.filter = "brightness(2) contrast(1.4) saturate(0) sepia(1) hue-rotate(60deg)";
      }
      ctx.drawImage(v,0,0,c.width,c.height);
      const dataUrl = c.toDataURL("image/jpeg", 0.88);
      await new Promise(r => setTimeout(r,200));
      setCapturing(false); setPhase("SCANNING"); setPhaseColor("#00FF88");
      onCapture(dataUrl.split(",")[1], dataUrl);
    }
  };

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    setTorchOn(false);
    startCamera(next, false);
  };

  const PC = phaseColor;
  const NV_FILTER = nightVision
    ? "brightness(1.8) contrast(1.3) saturate(0.2) sepia(0.5) hue-rotate(60deg)"
    : "none";

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,backgroundColor:"#000",
      display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",userSelect:"none" }}>

      {/* TOP BAR */}
      <div style={{ padding:"10px 16px", background:"linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)",
        borderBottom:`1px solid ${PC}30`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:7,height:7,borderRadius:"50%",backgroundColor:PC,
            boxShadow:`0 0 10px ${PC}`,animation:"pulse 1.2s ease-in-out infinite" }} />
          <div>
            <div style={{ color:PC, fontSize:10, letterSpacing:3, fontWeight:"bold" }}>TERRAIQ+ VISION v3</div>
            <div style={{ color:`${PC}50`, fontSize:7, letterSpacing:2 }}>PLANT · WEED · TREE SCANNER</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {nightVision && <span style={{ color:"#00FF44", fontSize:8, letterSpacing:2, border:"1px solid #00FF44", padding:"2px 6px", borderRadius:2 }}>NV</span>}
          {torchOn    && <span style={{ color:"#FFD700", fontSize:8, letterSpacing:2, border:"1px solid #FFD700", padding:"2px 6px", borderRadius:2 }}>TORCH</span>}
          <div style={{ color:`${PC}60`, fontSize:9, letterSpacing:1 }}>
            {facingMode === "environment" ? "REAR" : "FRONT"}
          </div>
        </div>
      </div>

      {/* VIDEO */}
      <div style={{ position:"relative", flex:1, overflow:"hidden", backgroundColor:"#000" }}>
        <video ref={videoRef}
          style={{ position:"absolute",inset:0,width:"100%",height:"100%",
            objectFit:"cover", filter:NV_FILTER, transition:"filter 0.3s" }}
          playsInline muted autoPlay />

        {ready && (
          <div style={{ position:"absolute",inset:0,pointerEvents:"none" }}>
            {/* Vignette */}
            <div style={{ position:"absolute",inset:0, background:"radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)" }} />
            <div style={{ position:"absolute",top:0,left:0,right:0,height:"20%", background:"linear-gradient(to bottom,rgba(0,0,0,0.8),transparent)" }} />
            <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"30%", background:"linear-gradient(to top,rgba(0,0,0,0.9),transparent)" }} />

            {/* Main target frame */}
            <div style={{ position:"absolute",top:"18%",left:"8%",right:"8%",bottom:"28%",overflow:"hidden" }}>
              <Bracket pos="tl" color={PC} />
              <Bracket pos="tr" color={PC} />
              <Bracket pos="bl" color={PC} />
              <Bracket pos="br" color={PC} />

              {/* Grid */}
              <div style={{ position:"absolute",inset:0,
                backgroundImage:`linear-gradient(${PC}07 1px,transparent 1px),linear-gradient(90deg,${PC}07 1px,transparent 1px)`,
                backgroundSize:"32px 32px" }} />

              {/* Scan line */}
              {phase==="SCANNING" && <>
                <div style={{ position:"absolute",left:0,right:0,top:`${scanY}%`,height:2,
                  background:`linear-gradient(to right,transparent,${PC}80 30%,${PC} 50%,${PC}80 70%,transparent)`,
                  boxShadow:`0 0 16px ${PC},0 0 32px ${PC}40` }} />
                <div style={{ position:"absolute",left:"10%",right:"10%",top:`${scanY}%`,
                  height:"5%",background:`linear-gradient(to bottom,${PC}12,transparent)` }} />
              </>}

              {/* Targeting rings */}
              <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)" }}>
                <div style={{ position:"relative",width:110,height:110 }}>
                  <Ring size={110} color={PC} spin="cw"  duration={7}  dash opacity={0.55} />
                  <Ring size={82}  color={PC} spin="ccw" duration={4.5} dash opacity={0.4} />
                  <Ring size={54}  color={PC} spin="cw"  duration={2.8} opacity={0.7} />
                  <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                    width:6,height:6,borderRadius:"50%",backgroundColor:PC,boxShadow:`0 0 12px ${PC}` }} />
                  {/* Crosshairs */}
                  {[{top:"50%",left:"5%",width:"25%",height:1},{top:"50%",right:"5%",width:"25%",height:1},
                    {left:"50%",top:"5%",width:1,height:"25%"},{left:"50%",bottom:"5%",width:1,height:"25%"}].map((s,i) => (
                    <div key={i} style={{ position:"absolute",backgroundColor:`${PC}70`,...s,transform:"translate(-50%,-50%)" }} />
                  ))}
                </div>
              </div>

              {/* Capture flash */}
              {phase==="CAPTURE" && <div style={{ position:"absolute",inset:0,backgroundColor:"rgba(255,255,255,0.2)",border:`2px solid ${PC}` }} />}
              {/* Lock */}
              {phase==="LOCKING" && <div style={{ position:"absolute",inset:0,border:`2px solid #FFD700`,
                boxShadow:"inset 0 0 24px #FFD70020" }} />}

              {/* Corner glow dots */}
              {[{top:-3,left:-3},{top:-3,right:-3},{bottom:-3,left:-3},{bottom:-3,right:-3}].map((s,i) => (
                <div key={i} style={{ position:"absolute",width:6,height:6,borderRadius:"50%",
                  backgroundColor:PC,boxShadow:`0 0 12px ${PC}`,...s }} />
              ))}
            </div>

            {/* Left panel */}
            <div style={{ position:"absolute",left:6,top:"22%",display:"flex",flexDirection:"column",gap:6 }}>
              {/* Neural nodes */}
              <div style={{ backgroundColor:"rgba(0,0,0,0.8)",border:`1px solid ${PC}25`,
                padding:"7px 9px",borderRadius:4,width:84 }}>
                <div style={{ color:`${PC}60`,fontSize:6,letterSpacing:2,marginBottom:5 }}>NEURAL</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2.5 }}>
                  {nodes.map((n,i) => (
                    <div key={i} style={{ width:13,height:13,borderRadius:2,
                      backgroundColor:n.active?PC:`${PC}18`,
                      boxShadow:n.active?`0 0 5px ${PC}`:"none",transition:"all 0.3s",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <span style={{ color:n.active?"#000":`${PC}40`,fontSize:4.5 }}>{n.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bars */}
              <div style={{ backgroundColor:"rgba(0,0,0,0.8)",border:`1px solid ${PC}25`,padding:"7px 9px",borderRadius:4 }}>
                {["SIG","NIR","ACQ"].map((l,i) => (
                  <div key={l} style={{ marginBottom:4 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:2 }}>
                      <span style={{ color:`${PC}60`,fontSize:6,letterSpacing:1 }}>{l}</span>
                      <span style={{ color:PC,fontSize:7 }}>{Math.round(bars[i])}%</span>
                    </div>
                    <div style={{ height:2,backgroundColor:`${PC}18`,borderRadius:1 }}>
                      <div style={{ width:`${bars[i]}%`,height:"100%",background:`linear-gradient(to right,${PC}80,${PC})`,transition:"width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div style={{ position:"absolute",right:6,top:"22%",display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end" }}>
              <div style={{ backgroundColor:"rgba(0,0,0,0.8)",border:`1px solid ${PC}25`,padding:"7px 9px",borderRadius:4,width:84 }}>
                <div style={{ color:`${PC}60`,fontSize:6,letterSpacing:2,marginBottom:5 }}>METRICS</div>
                {[["FOCUS",`${Math.round(70+Math.sin(tick/20)*15)}%`],
                  ["LIGHT",nightVision?"NV-ON":`${Math.round(55+Math.cos(tick/15)*20)}%`],
                  ["STABLE",ready?"YES":"NO"],
                  ["TORCH",torchOn?"ON":"OFF"],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                    <span style={{ color:`${PC}50`,fontSize:6 }}>{l}</span>
                    <span style={{ color:torchOn&&l==="TORCH"?"#FFD700":nightVision&&l==="LIGHT"?"#00FF44":PC,fontSize:7,fontWeight:"bold" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div style={{ position:"absolute",bottom:"29%",left:0,right:0,display:"flex",justifyContent:"center" }}>
              <div style={{ backgroundColor:"rgba(0,0,0,0.85)",border:`1px solid ${PC}60`,
                padding:"5px 18px",borderRadius:2,color:PC,fontSize:9,letterSpacing:3,fontWeight:"bold" }}>
                ◈ {phase === "SCANNING" ? "POINT AT PLANT" : phase === "LOCKING" ? "LOCKING TARGET" : "CAPTURED"} ◈
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,0.95)",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32 }}>
            <div style={{ color:"#FF4444",fontSize:12,letterSpacing:3,marginBottom:12 }}>⚠ VISION ERROR</div>
            <p style={{ color:"#888",fontSize:13,textAlign:"center",lineHeight:1.6,marginBottom:24 }}>{error}</p>
            <button onClick={onClose} style={{ backgroundColor:"#1E8A4C",color:"white",
              padding:"12px 28px",borderRadius:4,border:"none",cursor:"pointer",fontWeight:"bold",letterSpacing:1 }}>
              USE UPLOAD INSTEAD
            </button>
          </div>
        )}

        {/* Loading */}
        {!ready && !error && (
          <div style={{ position:"absolute",inset:0,backgroundColor:"#000",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
            <div style={{ position:"relative",width:100,height:100,marginBottom:20 }}>
              {[100,70,40].map((sz,i) => (
                <div key={i} style={{ position:"absolute",top:"50%",left:"50%",
                  width:sz,height:sz,borderRadius:"50%",border:"1.5px solid #00FF8825",
                  borderTopColor:"#00FF88",transform:"translate(-50%,-50%)",
                  animation:`ld${i} ${1.2+i*0.4}s linear infinite` }} />
              ))}
              <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                width:8,height:8,borderRadius:"50%",backgroundColor:"#00FF88",boxShadow:"0 0 12px #00FF88" }} />
            </div>
            <div style={{ color:"#00FF88",fontSize:10,letterSpacing:4 }}>INITIALISING</div>
            <div style={{ color:"#555",fontSize:8,letterSpacing:2,marginTop:6 }}>LOADING PLANT DATABASE</div>
            <style>{`@keyframes ld0{to{transform:translate(-50%,-50%)rotate(360deg);}}@keyframes ld1{to{transform:translate(-50%,-50%)rotate(-360deg);}}@keyframes ld2{to{transform:translate(-50%,-50%)rotate(360deg);}}`}</style>
          </div>
        )}
      </div>

      {/* CONTROL BAR */}
      <div style={{ backgroundColor:"rgba(0,0,0,0.97)",borderTop:`1px solid ${PC}20`,
        padding:"14px 20px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>

        {/* Close */}
        <button onClick={onClose} style={{ width:44,height:44,borderRadius:"50%",
          backgroundColor:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
          color:"#666",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>✕</button>

        {/* Center controls */}
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
          {/* Torch + Night Vision row */}
          <div style={{ display:"flex",gap:10 }}>
            {/* Torch — only show if supported */}
            <button onClick={toggleTorch}
              title={!torchSupported ? "Torch not supported on this device" : ""}
              style={{ padding:"5px 12px",borderRadius:6,
                backgroundColor:torchOn?"#FFD700":"rgba(255,215,0,0.08)",
                border:`1px solid ${torchOn?"#FFD700":"rgba(255,215,0,0.3)"}`,
                color:torchOn?"#000":"#FFD700",fontSize:9,fontWeight:"bold",letterSpacing:1.5,
                cursor:torchSupported?"pointer":"not-allowed",opacity:torchSupported?1:0.4 }}>
              ☀ TORCH {torchOn?"ON":"OFF"}
            </button>
            {/* Night vision */}
            <button onClick={() => setNightVision(n => !n)} style={{ padding:"5px 12px",borderRadius:6,
              backgroundColor:nightVision?"#00FF44":"rgba(0,255,68,0.08)",
              border:`1px solid ${nightVision?"#00FF44":"rgba(0,255,68,0.3)"}`,
              color:nightVision?"#000":"#00FF44",fontSize:9,fontWeight:"bold",letterSpacing:1.5,cursor:"pointer" }}>
              ◑ NV {nightVision?"ON":"OFF"}
            </button>
          </div>

          {/* Shutter */}
          <button onClick={capture} disabled={!ready||capturing}
            style={{ width:80,height:80,borderRadius:"50%",backgroundColor:"transparent",
              border:`2px solid ${ready?PC:"#333"}`,cursor:ready?"pointer":"not-allowed",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:ready?`0 0 24px ${PC}40,inset 0 0 16px ${PC}10`:"none",
              transition:"all 0.2s",position:"relative" }}>
            <svg width={80} height={80} style={{ position:"absolute",inset:0,
              animation:"spinShutter 5s linear infinite" }}>
              <circle cx={40} cy={40} r={38} fill="none" stroke={PC} strokeWidth={1}
                strokeDasharray="55 190" style={{ filter:`drop-shadow(0 0 3px ${PC})` }} />
            </svg>
            <div style={{ width:60,height:60,borderRadius:"50%",
              backgroundColor:capturing?PC:`${PC}20`,border:`1px solid ${PC}50`,
              boxShadow:capturing?`0 0 28px ${PC}`:`0 0 8px ${PC}20`,transition:"all 0.15s" }} />
          </button>
        </div>

        {/* Flip */}
        <button onClick={flipCamera} style={{ width:44,height:44,borderRadius:"50%",
          backgroundColor:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
          color:"#888",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⟳</button>
      </div>

      <canvas ref={canvasRef} style={{ display:"none" }} />
      <style>{`
        @keyframes spinShutter{to{transform:rotate(360deg);transform-origin:40px 40px;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
      `}</style>
    </div>
  );
}
