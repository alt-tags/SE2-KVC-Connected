"use client";

import { createContext, useContext, useState } from "react";

const DiagnosisLockContext = createContext();

export function DiagnosisLockProvider({ children }) {
  const [isDiagnosisLocked, setIsDiagnosisLocked] = useState(true);
  const [unlockReason, setUnlockReason] = useState("");

  // Function to unlock the diagnosis
  const unlockDiagnosis = (reason) => {
    setUnlockReason(reason);
    setIsDiagnosisLocked(false);
  };

  // Function to lock the diagnosis
  const lockDiagnosis = () => {
    setUnlockReason("");
    setIsDiagnosisLocked(true);
  };

  return (
    <DiagnosisLockContext.Provider
      value={{
        isDiagnosisLocked,
        unlockDiagnosis,
        lockDiagnosis,
        unlockReason,
      }}
    >
      {children}
    </DiagnosisLockContext.Provider>
  );
}

export function useDiagnosisLock() {
  return useContext(DiagnosisLockContext);
}
