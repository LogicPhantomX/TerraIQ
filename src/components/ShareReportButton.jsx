// ─── TerraIQ_WEB/src/components/ShareReportButton.jsx ────────────────
// Drop-in Share Report button for Scanner and SmartSoil pages
//
// SCANNER PAGE usage:
//   import ShareReportButton from "@/components/ShareReportButton";
//   <ShareReportButton type="scan" result={scanResult} farmerName={name} location={locationStr} imageDataUrl={previewUrl} />
//
// SOIL PAGE usage:
//   <ShareReportButton type="soil" result={soilResult} params={soilParams} farmerName={name} location={locationStr} />

import { useState } from "react";
import { generateSoilReport, generateScanReport } from "@/lib/generateReport";
import toast from "react-hot-toast";

export default function ShareReportButton({ type, result, params, farmerName, location, imageDataUrl, className = "" }) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!result) {
      toast.error("No report data to share yet.");
      return;
    }
    setLoading(true);
    try {
      if (type === "soil") {
        await generateSoilReport({ params, result, farmerName, location });
        toast.success("Soil Report downloaded!");
      } else {
        await generateScanReport({ result, farmerName, location, imageDataUrl });
        toast.success("Scan Report downloaded!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not generate report. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading || !result}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
        bg-terra text-white hover:bg-terra-dark disabled:opacity-50 disabled:cursor-not-allowed
        shadow-sm hover:shadow-md ${className}`}
      style={{ background: loading ? "#43A47A" : "#1E8A4C" }}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share Report
        </>
      )}
    </button>
  );
}
