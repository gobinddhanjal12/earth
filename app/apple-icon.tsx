import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#01030a",
          color: "#8edbff",
          fontSize: 92,
          fontWeight: 650,
        }}
      >
        E
      </div>
    ),
    size,
  );
}
