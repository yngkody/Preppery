import React, { createContext, useContext, useState } from "react";

export type ExcelRow = any;               // keep loose; you can tighten later
export type ExcelData = ExcelRow[];       // array-of-arrays or array-of-objects

type Ctx = {
  excelData: ExcelData;
  setExcelData: (rows: ExcelData) => void;
  clearExcel: () => void;
};

const ExcelContext = createContext<Ctx | undefined>(undefined);

export const ExcelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [excelData, setExcelDataState] = useState<ExcelData>([]);

  const setExcelData = (rows: ExcelData) => setExcelDataState(rows);
  const clearExcel = () => setExcelDataState([]);

  return (
    <ExcelContext.Provider value={{ excelData, setExcelData, clearExcel }}>
      {children}
    </ExcelContext.Provider>
  );
};

export const useExcel = () => {
  const ctx = useContext(ExcelContext);
  if (!ctx) throw new Error("useExcel must be used inside <ExcelProvider>");
  return ctx;
};
