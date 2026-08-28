import { ImageResponse } from "next/og";

export const alt = "The Living Planet — An interactive 3D Earth story";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px",
          background:
            "radial-gradient(circle at 78% 18%, rgba(17, 71, 126, 0.42), transparent 38%), linear-gradient(180deg, #06111f 0%, #01030a 100%)",
          color: "#f4f8ff",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#8edbff",
          }}
        >
          Interactive Earth Story
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 520,
              lineHeight: 0.92,
              letterSpacing: "-0.05em",
            }}
          >
            The Living Planet
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 780,
              fontSize: 28,
              lineHeight: 1.4,
              color: "rgba(201, 218, 237, 0.86)",
            }}
          >
            Surface, interior, and atmosphere — one real-time Three.js globe.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
