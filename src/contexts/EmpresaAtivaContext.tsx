import React from 'react';
import { EmpresaAtivaContext, useEmpresaAtivaState } from '@/hooks/useEmpresaAtiva';

export const EmpresaAtivaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const empresaAtivaState = useEmpresaAtivaState();

  return (
    <EmpresaAtivaContext.Provider value={empresaAtivaState}>
      {children}
    </EmpresaAtivaContext.Provider>
  );
};
