import { useRef, useState, useEffect, useCallback } from "react";

// Animated corner bracket
function Corner({ position }) {
  const styles = {
    "tl": { top: 0,    left: 0,   borderTop:  "3px solid #00FF88", borderLeft:  "3px solid #00FF88" },
    "tr": { top: 0,    right: 0,  borderTop:  "3px solid #00FF88", borderRight: "3px solid #00FF88" },
    "bl": { bottom: 0, left: 0,   borderBottom:"3px solid #00FF88", borderLeft: "3px solid #00FF88" },
    "br": { bottom: 0, right: 0,  borderBottom:"3px solid #00FF88", borderRight:"3px solid #00FF88" },
  };
  return <div style={{ position:"absolute", width:28, height:28, ...styles[position] }} />;
}

export default function CameraScanner({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef   = useRef(null);

  const [ready,      setReady]      = useState(false);
  const [error,      setError]      = useState(null);
  const [capturing,  setCapturing]  = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [scanLine,   setScanLine]   = useState(0);
  const [scanPhase,  setScanPhase]  = useState("scanning"); // scanning | locked | capturing
  const [fps,        setFps]        = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const lastFpsTime = useRef(Date.now());

  // Animate scan line
  useEffect(() => {
    let direction = 1;
    let pos = 0;
    const animate = () => {
      pos += direction * 1.2;
      if (pos >= 100) { pos = 100; direction = -1; }
      if (pos <= 0)   { pos = 0;   direction = 1;  }
      setScanLine(pos);

      // FPS counter
      setFrameCount(c => {
        const now = Date.now();
        if (now - lastFpsTime.current >= 1000) {
          setFps(c);
          lastFpsTime.current = now;
          return 0;
        }
        return c + 1;
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const startCamera = useCallback(async (mode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setReady(false); setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported on this browser. Use Upload Photo instead.");
      return;
    }

    const attempts = [
      { video: { facingMode: mode, width:{ ideal:1920 }, height:{ ideal:1080 } } },
      { video: { facingMode: mode } },
      { video: true },
    ];

    for (const constraint of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((res, rej) => {
            videoRef.current.onloadedmetadata = res;
            videoRef.current.onerror = rej;
            setTimeout(rej, 6000);
          });
          await videoRef.current.play();
          setReady(true);
        }
        return;
      } catch(err) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Allow camera access in your browser settings.");
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
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const capture = async () => {
    if (!ready || capturing) return;
    setScanPhase("locked");
    setCapturing(true);

    await new Promise(r => setTimeout(r, 300));
    setScanPhase("capturing");
    await new Promise(r => setTimeout(r, 200));

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { setCapturing(false); setScanPhase("scanning"); return; }

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64  = dataUrl.split(",")[1];

    setCapturing(false);
    setScanPhase("scanning");
    onCapture(base64, dataUrl);
  };

  const PHASE_COLORS = {
    scanning:   "#00FF88",
    locked:     "#FFD700",
    capturing:  "#FFFFFF",
  };
  const color = PHASE_COLORS[scanPhase];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      backgroundColor:"#000",
      display:"flex", flexDirection:"column",
      fontFamily:"'Courier New', monospace",
    }}>

      {/* ── HUD Header ──────────────────────────────────────────────── */}
      <div style={{
        padding:"12px 16px",
        backgroundColor:"rgba(0,0,0,0.85)",
        borderBottom:"1px solid rgba(0,255,136,0.3)",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Blinking status dot */}
          <div style={{
            width:8, height:8, borderRadius:"50%",
            backgroundColor: ready ? color : "#666",
            boxShadow: ready ? `0 0 8px ${color}` : "none",
            animation: ready ? "blink 1s infinite" : "none",
          }} />
          <span style={{ color:color, fontSize:11, letterSpacing:2, fontWeight:"bold" }}>
            {ready ? `TERRAIQ+ VISION` : "INITIALISING"}
          </span>
        </div>
        <div style={{ display:"flex", gap:16, color:"#666", fontSize:10, letterSpacing:1 }}>
          <span style={{ color: ready ? "#00FF88" : "#666" }}>FPS: {fps || "--"}</span>
          <span>RES: HD</span>
          <span style={{ color: facingMode === "environment" ? "#00FF88" : "#FFD700" }}>
            {facingMode === "environment" ? "REAR" : "FRONT"}
          </span>
        </div>
      </div>

      {/* ── Video area ──────────────────────────────────────────────── */}
      <div style={{ position:"relative", flex:1, overflow:"hidden", backgroundColor:"#000" }}>
        <video
          ref={videoRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}
          playsInline muted autoPlay
        />

        {/* Dark vignette overlay */}
        {ready && (
          <div style={{ position:"absolute", inset:0 }}>
            {/* Corner masks */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"18%", background:"linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)" }} />
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"28%", background:"linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }} />
            <div style={{ position:"absolute", top:"18%", bottom:"28%", left:0, width:"7%", background:"linear-gradient(to right, rgba(0,0,0,0.55), transparent)" }} />
            <div style={{ position:"absolute", top:"18%", bottom:"28%", right:0, width:"7%", background:"linear-gradient(to left, rgba(0,0,0,0.55), transparent)" }} />

            {/* Main scan frame */}
            <div style={{
              position:"absolute",
              top:"18%", left:"7%", right:"7%", bottom:"28%",
              boxShadow:`inset 0 0 40px rgba(0,0,0,0.3)`,
            }}>
              {/* Corner brackets */}
              <Corner position="tl" />
              <Corner position="tr" />
              <Corner position="bl" />
              <Corner position="br" />

              {/* Corner glow dots */}
              {[{top:-2,left:-2},{top:-2,right:-2},{bottom:-2,left:-2},{bottom:-2,right:-2}].map((s,i) => (
                <div key={i} style={{
                  position:"absolute", width:6, height:6, borderRadius:"50%",
                  backgroundColor:color, boxShadow:`0 0 10px ${color}`, ...s,
                }} />
              ))}

              {/* Scan line */}
              {scanPhase === "scanning" && (
                <div style={{
                  position:"absolute", left:0, right:0,
                  top:`${scanLine}%`,
                  height:2,
                  background:`linear-gradient(to right, transparent, ${color}, transparent)`,
                  boxShadow:`0 0 12px ${color}, 0 0 24px rgba(0,255,136,0.3)`,
                  pointerEvents:"none",
                }} />
              )}

              {/* LOCKED crosshair */}
              {scanPhase === "locked" && (
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ position:"relative", width:60, height:60 }}>
                    <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, backgroundColor:"#FFD700", boxShadow:"0 0 8px #FFD700" }} />
                    <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, backgroundColor:"#FFD700", boxShadow:"0 0 8px #FFD700" }} />
                    <div style={{ position:"absolute", inset:10, border:"1px solid rgba(255,215,0,0.4)", borderRadius:"50%" }} />
                  </div>
                </div>
              )}

              {/* CAPTURE flash */}
              {scanPhase === "capturing" && (
                <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(255,255,255,0.25)", border:"2px solid white" }} />
              )}

              {/* Grid overlay — subtle */}
              <div style={{
                position:"absolute", inset:0,
                backgroundImage:`
                  linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)
                `,
                backgroundSize:"40px 40px",
                pointerEvents:"none",
              }} />
            </div>

            {/* HUD — top data */}
            <div style={{ position:"absolute", top:"2%", left:"8%", right:"8%", display:"flex", justifyContent:"space-between" }}>
              <div style={{ color:"rgba(0,255,136,0.7)", fontSize:9, letterSpacing:1.5 }}>
                <div>LAT: 9.0820°N</div>
                <div>LON: 8.6753°E</div>
              </div>
              <div style={{ color:"rgba(0,255,136,0.7)", fontSize:9, letterSpacing:1.5, textAlign:"right" }}>
                <div>{new Date().toLocaleTimeString()}</div>
                <div>AI VISION v2.1</div>
              </div>
            </div>

            {/* Status label */}
            <div style={{
              position:"absolute", bottom:"30%", left:0, right:0,
              display:"flex", justifyContent:"center",
            }}>
              <div style={{
                backgroundColor:"rgba(0,0,0,0.7)",
                border:`1px solid ${color}`,
                padding:"6px 16px", borderRadius:4,
                color:color, fontSize:10, letterSpacing:2, fontWeight:"bold",
                boxShadow:`0 0 12px rgba(0,255,136,0.2)`,
              }}>
                {scanPhase === "scanning"  && "POINT AT CROP OR LEAF"}
                {scanPhase === "locked"    && "⬡ TARGET LOCKED"}
                {scanPhase === "capturing" && "■ CAPTURING IMAGE"}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            position:"absolute", inset:0,
            backgroundColor:"rgba(0,0,0,0.92)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            padding:32, textAlign:"center",
          }}>
            <div style={{ color:"#FF4444", fontSize:14, letterSpacing:2, marginBottom:12 }}>⚠ CAMERA ERROR</div>
            <p style={{ color:"#999", fontSize:13, marginBottom:24, lineHeight:1.6 }}>{error}</p>
            <button onClick={onClose} style={{
              backgroundColor:"#1E8A4C", color:"white",
              padding:"12px 28px", borderRadius:6, border:"none",
              cursor:"pointer", fontWeight:"bold", letterSpacing:1,
            }}>
              USE UPLOAD INSTEAD
            </button>
          </div>
        )}

        {/* Loading state */}
        {!ready && !error && (
          <div style={{
            position:"absolute", inset:0,
            backgroundColor:"#000",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
          }}>
            <div style={{
              width:48, height:48, border:"2px solid #00FF88",
              borderTopColor:"transparent", borderRadius:"50%",
              animation:"spin 0.8s linear infinite", marginBottom:16,
            }} />
            <div style={{ color:"#00FF88", fontSize:11, letterSpacing:3 }}>INITIALISING VISION</div>
            <div style={{ color:"#666", fontSize:10, marginTop:6, letterSpacing:1 }}>LOADING NIGERIAN CROP DATABASE</div>
          </div>
        )}
      </div>

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor:"rgba(0,0,0,0.95)",
        borderTop:"1px solid rgba(0,255,136,0.2)",
        padding:"16px 24px 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>

        {/* Close */}
        <button onClick={onClose} style={{
          width:46, height:46, borderRadius:"50%",
          backgroundColor:"rgba(255,255,255,0.08)",
          border:"1px solid rgba(255,255,255,0.15)",
          color:"#aaa", cursor:"pointer", fontSize:14,
          display:"flex", alignItems:"center", justifyContent:"center",
          letterSpacing:0,
        }}>
          ✕
        </button>

        {/* Shutter — main capture button */}
        <button onClick={capture} disabled={!ready || capturing}
          style={{
            width:80, height:80, borderRadius:"50%",
            backgroundColor:"transparent",
            border:`3px solid ${ready ? color : "#333"}`,
            cursor: ready ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow: ready ? `0 0 20px ${color}40` : "none",
            transition:"all 0.2s",
          }}
        >
          <div style={{
            width:62, height:62, borderRadius:"50%",
            backgroundColor: capturing ? color : ready ? `${color}30` : "#222",
            border:`1px solid ${ready ? `${color}60` : "#333"}`,
            transition:"all 0.15s",
            boxShadow: capturing ? `0 0 24px ${color}` : "none",
          }} />
        </button>

        {/* Flip */}
        <button onClick={flipCamera} style={{
          width:46, height:46, borderRadius:"50%",
          backgroundColor:"rgba(255,255,255,0.08)",
          border:"1px solid rgba(255,255,255,0.15)",
          color:"#aaa", cursor:"pointer", fontSize:16,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          ⟳
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display:"none" }} />

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  );
}