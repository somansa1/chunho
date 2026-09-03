import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// 오프라인에서도 열 수 있도록 서비스 워커 등록 (실패해도 앱은 정상 동작)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* sandboxed iframe 등 등록 불가 환경 — 무시 */
    });
  });
}
