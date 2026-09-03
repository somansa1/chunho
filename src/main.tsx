import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/** 렌더 도중 에러가 나도 화면이 하얗게 죽지 않도록 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#f4f5ea",
            fontFamily: "sans-serif",
            color: "#22301f",
          }}
        >
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <p style={{ fontSize: 48, margin: 0 }}>🍳</p>
            <h1 style={{ fontSize: 24, margin: "12px 0 8px" }}>앗, 냄비가 엎어졌어요</h1>
            <p style={{ fontSize: 14, color: "#5b6752", lineHeight: 1.6 }}>
              화면을 그리는 중 오류가 발생했어요. 아래 버튼을 눌러 다시 불러와 주세요.
            </p>
            <p
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "#fffef8",
                border: "1px solid #d9ddc7",
                borderRadius: 10,
                fontSize: 12,
                wordBreak: "break-all",
                textAlign: "left",
              }}
            >
              {String(this.state.error?.message ?? this.state.error)}
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("dinner-duo.menus.v1");
                  localStorage.removeItem("dinner-duo.history.v1");
                  localStorage.removeItem("dinner-duo.settings.v1");
                  localStorage.removeItem("dinner-duo.tonight.v1");
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
              style={{
                marginTop: 16,
                padding: "10px 26px",
                fontSize: 15,
                fontWeight: 700,
                color: "#fffef8",
                background: "#2f6b40",
                border: "none",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              초기화하고 다시 시작
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
