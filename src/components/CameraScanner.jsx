import { useRef, useState, useEffect, useCallback } from "react";

export default function CameraScanner({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [ready,      setReady]      = useState(false);
  const [error,      setError]      = useState(null);
  const [flash,      setFlash]      = useState(false);
  const [capturing,  setCapturing]  = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  const startCamera = useCallback(async (mode) => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setError(null);

    // Check if browser supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support camera access. Please upload a photo instead.");
      return;
    }

    // Try environment (back) camera first, fall back to any camera
    const constraints = [
      { video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } } },
      { video: { facingMode: mode } },
      { video: true },
    ];

    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve, reject) => {
            videoRef.current.onloadedmetadata = resolve;
            videoRef.current.onerror = reject;
            setTimeout(reject, 5000); // timeout after 5s
          });
          await videoRef.current.play();
          setReady(true);
        }
        return; // success — stop trying
      } catch (err) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access in your browser settings, then refresh the page.");
          return;
        }
        // Try next constraint
      }
    }
    setError("Could not start camera. Please upload a photo instead.");
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const capture = () => {
    if (!ready || capturing) return;
    setCapturing(true);
    setFlash(true);

    setTimeout(() => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) { setCapturing(false); return; }

      canvas.width  = video.videoWidth  || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64  = dataUrl.split(",")[1];

      setFlash(false);
      setCapturing(false);
      onCapture(base64, dataUrl);
    }, 150);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, backgroundColor:"#000", display:"flex", flexDirection:"column" }}>

      {/* Flash */}
      {flash && <div style={{ position:"absolute", inset:0, backgroundColor:"white", zIndex:10, opacity:0.8 }} />}

      {/* Video */}
      <div style={{ position:"relative", flex:1, overflow:"hidden" }}>
        <video
          ref={videoRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}
          playsInline muted autoPlay
        />

        {/* Scan overlay */}
        {ready && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {/* Dark borders */}
            <div style={{ position:"absolute", top:0,   left:0, right:0, height:"20%", backgroundColor:"rgba(0,0,0,0.55)" }} />
            <div style={{ position:"absolute", bottom:0,left:0, right:0, height:"32%", backgroundColor:"rgba(0,0,0,0.55)" }} />
            <div style={{ position:"absolute", top:"20%",bottom:"32%",left:0,  width:"6%", backgroundColor:"rgba(0,0,0,0.55)" }} />
            <div style={{ position:"absolute", top:"20%",bottom:"32%",right:0, width:"6%", backgroundColor:"rgba(0,0,0,0.55)" }} />

            {/* Scan frame */}
            <div style={{ position:"absolute", top:"20%", left:"6%", right:"6%", bottom:"32%" }}>
              {/* Corners */}
              {[{top:0,left:0,borderTop:"3px solid #1E8A4C",borderLeft:"3px solid #1E8A4C",borderRadius:"8px 0 0 0"},
                {top:0,right:0,borderTop:"3px solid #1E8A4C",borderRight:"3px solid #1E8A4C",borderRadius:"0 8px 0 0"},
                {bottom:0,left:0,borderBottom:"3px solid #1E8A4C",borderLeft:"3px solid #1E8A4C",borderRadius:"0 0 0 8px"},
                {bottom:0,right:0,borderBottom:"3px solid #1E8A4C",borderRight:"3px solid #1E8A4C",borderRadius:"0 0 8px 0"},
              ].map((s,i) => (
                <div key={i} style={{ position:"absolute", width:32, height:32, ...s }} />
              ))}

              {/* Scan line animation */}
              <div style={{
                position:"absolute", left:4, right:4, height:2,
                backgroundColor:"#1E8A4C",
                boxShadow:"0 0 10px #1E8A4C, 0 0 20px rgba(30,138,76,0.5)",
                animation:"scanline 2s ease-in-out infinite",
              }} />
            </div>

            {/* Hint */}
            <div style={{ position:"absolute", bottom:"30%", left:0, right:0, display:"flex", justifyContent:"center" }}>
              <div style={{ backgroundColor:"rgba(0,0,0,0.65)", padding:"8px 20px", borderRadius:999 }}>
                <p style={{ color:"white", fontSize:13, fontWeight:500 }}>Point at the affected leaf or crop</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.92)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📷</div>
            <p style={{ color:"white", fontWeight:600, fontSize:16, marginBottom:8 }}>Camera unavailable</p>
            <p style={{ color:"#9CA3AF", fontSize:14, marginBottom:24 }}>{error}</p>
            <button onClick={onClose} style={{ backgroundColor:"#1E8A4C", color:"white", padding:"12px 24px", borderRadius:12, border:"none", cursor:"pointer", fontWeight:700 }}>
              Upload Photo Instead
            </button>
          </div>
        )}

        {/* Loading */}
        {!ready && !error && (
          <div style={{ position:"absolute", inset:0, backgroundColor:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:40, height:40, border:"2px solid #1E8A4C", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", marginBottom:16 }} />
            <p style={{ color:"#9CA3AF", fontSize:13 }}>Starting camera...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ backgroundColor:"#000", padding:"20px 32px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {/* Close */}
        <button onClick={onClose} style={{ width:48, height:48, borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.15)", border:"none", cursor:"pointer", color:"white", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>
          ✕
        </button>

        {/* Shutter */}
        <button onClick={capture} disabled={!ready || capturing} style={{
          width:76, height:76, borderRadius:"50%",
          border:"4px solid white", backgroundColor:"transparent",
          cursor: ready ? "pointer" : "not-allowed",
          display:"flex", alignItems:"center", justifyContent:"center",
          opacity: ready ? 1 : 0.4,
        }}>
          <div style={{ width:60, height:60, borderRadius:"50%", backgroundColor: capturing ? "#1E8A4C" : "white", transition:"background-color 0.15s" }} />
        </button>

        {/* Flip */}
        <button onClick={flipCamera} style={{ width:48, height:48, borderRadius:"50%", backgroundColor:"rgba(255,255,255,0.15)", border:"none", cursor:"pointer", color:"white", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
          🔄
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display:"none" }} />

      <style>{`
        @keyframes scanline {
          0%   { top: 4px; }
          50%  { top: calc(100% - 4px); }
          100% { top: 4px; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
