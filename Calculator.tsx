import { useState, useEffect, useCallback } from "react";

type Mode = "basic" | "scientific";

interface CalcState {
  current: string;
  exprDisplay: string;
  storedValue: number | null;
  pendingOp: string | null;
  justEvaluated: boolean;
  isError: boolean;
}

const OP_SYMBOL: Record<string, string> = {
  "+": "+", "-": "−", "*": "×", "/": "÷",
  "^": "^", "nPr": "P", "nCr": "C",
};

function formatNumber(n: number): string {
  if (!isFinite(n)) return "Error";
  const rounded = Math.round(n * 1e10) / 1e10;
  if (Math.abs(rounded) >= 1e12 || (Math.abs(rounded) < 1e-9 && rounded !== 0))
    return rounded.toExponential(6);
  return rounded.toString();
}

function toRadians(deg: number) { return deg * (Math.PI / 180); }

function factorial(n: number): number | null {
  if (n < 0 || n !== Math.floor(n) || n > 170) return null;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function permutation(n: number, r: number): number | null {
  if (n < 0 || r < 0 || n !== Math.floor(n) || r !== Math.floor(r)) return null;
  if (r > n) return 0;
  const fn = factorial(n), fnr = factorial(n - r);
  return fn !== null && fnr !== null ? fn / fnr : null;
}

function combination(n: number, r: number): number | null {
  if (n < 0 || r < 0 || n !== Math.floor(n) || r !== Math.floor(r)) return null;
  if (r > n) return 0;
  const fn = factorial(n), fr = factorial(r), fnr = factorial(n - r);
  return fn !== null && fr !== null && fnr !== null ? fn / (fr * fnr) : null;
}

const initState: CalcState = {
  current: "0", exprDisplay: "", storedValue: null,
  pendingOp: null, justEvaluated: false, isError: false,
};

export default function Calculator({ mode }: { mode: Mode }) {
  const [state, setState] = useState<CalcState>(initState);

  const computeBinary = useCallback((a: number, b: number, op: string): [number | null, string | null] => {
    let r: number;
    switch (op) {
      case "+": r = a + b; break;
      case "-": r = a - b; break;
      case "*": r = a * b; break;
      case "/": if (b === 0) return [null, "Cannot divide by 0"]; r = a / b; break;
      case "^": r = Math.pow(a, b); break;
      case "nPr": { const p = permutation(a, b); if (p === null) return [null, "nPr: needs non-neg integers"]; r = p; break; }
      case "nCr": { const c = combination(a, b); if (c === null) return [null, "nCr: needs non-neg integers"]; r = c; break; }
      default: return [null, "Unknown operator"];
    }
    if (!isFinite(r)) return [null, "Result out of range"];
    return [r, null];
  }, []);

  const inputDigit = useCallback((d: string) => {
    setState((s) => {
      let current = s.current, exprDisplay = s.exprDisplay;
      if (s.justEvaluated) { current = "0"; exprDisplay = ""; }
      if (d === ".") {
        if (current.includes(".")) return s;
        current = current === "0" ? "0." : current + ".";
      } else {
        current = current === "0" ? d : current + d;
      }
      return { ...s, current, exprDisplay, justEvaluated: false, isError: false };
    });
  }, []);

  const inputOperator = useCallback((op: string) => {
    setState((s) => {
      const value = parseFloat(s.current);
      let storedValue = s.storedValue;
      if (storedValue !== null && s.pendingOp && !s.justEvaluated) {
        const [result, err] = computeBinary(storedValue, value, s.pendingOp);
        if (err) return { ...s, current: err, storedValue: null, pendingOp: null, justEvaluated: true, isError: true };
        storedValue = result!;
      } else {
        storedValue = value;
      }
      return { ...s, storedValue, pendingOp: op, justEvaluated: false,
        exprDisplay: formatNumber(storedValue) + " " + OP_SYMBOL[op], current: "0", isError: false };
    });
  }, [computeBinary]);

  const equals = useCallback(() => {
    setState((s) => {
      if (s.pendingOp === null) return s;
      const value = parseFloat(s.current);
      const [result, err] = computeBinary(s.storedValue!, value, s.pendingOp);
      if (err) return { ...s, current: err, storedValue: null, pendingOp: null, justEvaluated: true, isError: true };
      return { ...s, current: formatNumber(result!),
        exprDisplay: formatNumber(s.storedValue!) + " " + OP_SYMBOL[s.pendingOp] + " " + formatNumber(value) + " =",
        storedValue: null, pendingOp: null, justEvaluated: true, isError: false };
    });
  }, [computeBinary]);

  const clearAll = useCallback(() => setState(initState), []);

  const backspace = useCallback(() => {
    setState((s) => {
      if (s.justEvaluated) return s;
      const current = s.current.length <= 1 || (s.current.length === 2 && s.current.startsWith("-"))
        ? "0" : s.current.slice(0, -1);
      return { ...s, current, isError: false };
    });
  }, []);

  const percent = useCallback(() => {
    setState((s) => ({ ...s, current: formatNumber(parseFloat(s.current) / 100), isError: false }));
  }, []);

  const applyFn = useCallback((fn: string) => {
    setState((s) => {
      const v = parseFloat(s.current);
      let r: number;
      switch (fn) {
        case "sin": r = Math.sin(toRadians(v)); break;
        case "cos": r = Math.cos(toRadians(v)); break;
        case "tan": r = Math.tan(toRadians(v)); break;
        case "sinh": r = Math.sinh(v); break;
        case "cosh": r = Math.cosh(v); break;
        case "tanh": r = Math.tanh(v); break;
        case "log": if (v <= 0) return { ...s, current: "Invalid input for log", storedValue: null, pendingOp: null, justEvaluated: true, isError: true }; r = Math.log10(v); break;
        case "ln": if (v <= 0) return { ...s, current: "Invalid input for ln", storedValue: null, pendingOp: null, justEvaluated: true, isError: true }; r = Math.log(v); break;
        case "sqrt": if (v < 0) return { ...s, current: "Invalid input for √", storedValue: null, pendingOp: null, justEvaluated: true, isError: true }; r = Math.sqrt(v); break;
        case "square": r = v * v; break;
        case "cbrt": r = Math.cbrt(v); break;
        case "inv": if (v === 0) return { ...s, current: "Cannot divide by 0", storedValue: null, pendingOp: null, justEvaluated: true, isError: true }; r = 1 / v; break;
        case "negate": r = v * -1; break;
        case "abs": r = Math.abs(v); break;
        case "fact": {
          const f = factorial(v);
          if (f === null) return { ...s, current: v < 0 || v !== Math.floor(v) ? "x! needs non-neg integer" : "Result out of range", storedValue: null, pendingOp: null, justEvaluated: true, isError: true };
          r = f; break;
        }
        case "pi": r = Math.PI; break;
        case "e": r = Math.E; break;
        default: return s;
      }
      return { ...s, current: formatNumber(r), exprDisplay: s.justEvaluated ? "" : s.exprDisplay, justEvaluated: false, isError: false };
    });
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
      else if (e.key === ".") inputDigit(".");
      else if (["+", "-", "*", "/"].includes(e.key)) inputOperator(e.key);
      else if (e.key === "^") inputOperator("^");
      else if (e.key === "Enter" || e.key === "=") equals();
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clearAll();
      else if (e.key === "%") percent();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [inputDigit, inputOperator, equals, backspace, clearAll, percent]);

  const Key = ({ children, onClick, className = "", wide = false }:
    { children: React.ReactNode; onClick: () => void; className?: string; wide?: boolean }) => (
    <button onClick={onClick} className={`calc-key${wide ? " calc-key--wide" : ""}${className ? " " + className : ""}`}>
      {children}
    </button>
  );

  return (
    <>
      <div className="calc-display">
        <div className="calc-expr">{state.exprDisplay || "\u00a0"}</div>
        <div className={`calc-current${state.isError ? " error" : ""}`}>{state.current}</div>
      </div>
      {mode === "scientific" && (
        <div className="calc-sci-pad">
          <Key onClick={() => applyFn("sin")}>sin</Key>
          <Key onClick={() => applyFn("cos")}>cos</Key>
          <Key onClick={() => applyFn("tan")}>tan</Key>
          <Key onClick={() => applyFn("sqrt")}>√</Key>
          <Key onClick={() => applyFn("sinh")}>sinh</Key>
          <Key onClick={() => applyFn("cosh")}>cosh</Key>
          <Key onClick={() => applyFn("tanh")}>tanh</Key>
          <Key onClick={() => applyFn("square")}>x²</Key>
          <Key onClick={() => applyFn("log")}>log</Key>
          <Key onClick={() => applyFn("ln")}>ln</Key>
          <Key onClick={() => inputOperator("^")}>xʸ</Key>
          <Key onClick={() => applyFn("fact")}>x!</Key>
          <Key onClick={() => applyFn("pi")}>π</Key>
          <Key onClick={() => applyFn("e")}>e</Key>
          <Key onClick={() => inputOperator("nPr")}>nPr</Key>
          <Key onClick={() => inputOperator("nCr")}>nCr</Key>
          <Key onClick={() => applyFn("inv")}>1/x</Key>
          <Key onClick={() => applyFn("abs")}>|x|</Key>
          <Key onClick={() => applyFn("cbrt")}>∛</Key>
          <Key onClick={() => applyFn("negate")}>±</Key>
        </div>
      )}
      <div className="calc-pad">
        <Key onClick={clearAll} className="danger">AC</Key>
        <Key onClick={backspace}>⌫</Key>
        <Key onClick={percent}>%</Key>
        <Key onClick={() => inputOperator("/")} className="op">÷</Key>
        <Key onClick={() => inputDigit("7")}>7</Key>
        <Key onClick={() => inputDigit("8")}>8</Key>
        <Key onClick={() => inputDigit("9")}>9</Key>
        <Key onClick={() => inputOperator("*")} className="op">×</Key>
        <Key onClick={() => inputDigit("4")}>4</Key>
        <Key onClick={() => inputDigit("5")}>5</Key>
        <Key onClick={() => inputDigit("6")}>6</Key>
        <Key onClick={() => inputOperator("-")} className="op">−</Key>
        <Key onClick={() => inputDigit("1")}>1</Key>
        <Key onClick={() => inputDigit("2")}>2</Key>
        <Key onClick={() => inputDigit("3")}>3</Key>
        <Key onClick={() => inputOperator("+")} className="op">+</Key>
        <Key onClick={() => inputDigit("0")} wide>0</Key>
        <Key onClick={() => inputDigit(".")}>.</Key>
        <Key onClick={equals} className="equals">=</Key>
      </div>
    </>
  );
}
