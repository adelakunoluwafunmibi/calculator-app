import { useState } from "react";
import Calculator from "./Calculator";

type Mode = "basic" | "scientific";

export default function App() {
  const [mode, setMode] = useState<Mode>("basic");

  return (
    <div className="calc-device">
      <div className="calc-topbar">
        <span className="calc-label">Calculator</span>
        <div className="calc-mode-toggle">
          <button
            className={`calc-mode-btn${mode === "basic" ? " active" : ""}`}
            onClick={() => setMode("basic")}
          >
            Basic
          </button>
          <button
            className={`calc-mode-btn${mode === "scientific" ? " active" : ""}`}
            onClick={() => setMode("scientific")}
          >
            Scientific
          </button>
        </div>
      </div>
      <Calculator mode={mode} />
      <div className="calc-footnote">
        {mode === "basic" && "+ − × ÷ arithmetic operations"}
        {mode === "scientific" && "sin · cos · tan · log · ln · x² · xʸ · x! · nPr · nCr"}
      </div>
      <div className="calc-author">
        <span className="calc-author-name">Adelakun Abdulsaamii Oluwafunbi</span>
        <span className="calc-author-course">SEN 104 / SEN 214</span>
      </div>
    </div>
  );
}
