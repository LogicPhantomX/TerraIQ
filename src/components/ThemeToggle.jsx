import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      style={{
        position: "relative",
        width: 52,
        height: 28,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        backgroundColor: isDark ? "#1E8A4C" : "#D1D5DB",
        transition: "background-color 0.3s ease",
        flexShrink: 0,
      }}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {/* Sun */}
      <span style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)", fontSize:12, opacity: isDark ? 0 : 1, transition:"opacity 0.2s" }}>☀️</span>
      {/* Moon */}
      <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", fontSize:12, opacity: isDark ? 1 : 0, transition:"opacity 0.2s" }}>🌙</span>
      {/* Knob */}
      <span style={{
        position: "absolute",
        top: 3,
        left: isDark ? 27 : 3,
        width: 22,
        height: 22,
        borderRadius: "50%",
        backgroundColor: "white",
        transition: "left 0.3s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}
