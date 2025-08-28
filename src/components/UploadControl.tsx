import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useExcel } from "../context/excel/ExcelContext";

const niceError = (e: unknown) =>
  e instanceof Error ? e.message : String(e);

const accept = [
  ".xlsx",
  ".xls",
  ".csv",
].join(",");

/** Reads first sheet; stores as array-of-arrays with header row (header:1) */
async function readSheet(file: File) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("No sheets found in file.");
  // header:1 => 2D array (first row = headers). Works great with your normalizeRows().
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[];
  // strip trailing fully-empty rows
  const cleaned = aoa.filter((row: any[]) => Array.isArray(row) && row.some((c) => c !== ""));
  return cleaned;
}

const UploadControls: React.FC = () => {
  const { setExcelData, clearExcel } = useExcel();
  const [status, setStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onPick = async (f: File) => {
    try {
      setStatus("Parsing…");
      const rows = await readSheet(f);
      setExcelData(rows);
      setStatus(`Loaded ${rows.length - 1} rows from “${f.name}”.`);
      if (inputRef.current) inputRef.current.value = ""; // allow re-upload same file
    } catch (e) {
      setStatus(`Error: ${niceError(e)}`);
    }
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (file) await onPick(file);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await onPick(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: 12,
        border: "1px dashed #cbd5e1",
        borderRadius: 12,
        background: "#fafafa",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        style={{ display: "none" }}
        id="file-input"
      />
      <label htmlFor="file-input" style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: 13,
        cursor: "pointer"
      }}>
        Choose file
      </label>
      <div style={{ fontSize: 13, color: "#475569" }}>
        or drag & drop a .xlsx/.xls/.csv here
      </div>
      <button
        onClick={clearExcel}
        style={{
          marginLeft: "auto",
          border: "1px solid #e2e8f0",
          background: "#fff",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Clear
      </button>
      {status && <div style={{ fontSize: 12, color: "#334155" }}>{status}</div>}
    </div>
  );
};

export default UploadControls;
