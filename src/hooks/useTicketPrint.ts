import { useState, useCallback } from 'react';
import type { PrintSettings } from '../types/ticket';

interface UsePrintOptions {
  defaultPrintSettings?: PrintSettings;
  onPrintSuccess?: () => void;
  onPrintError?: (error: Error) => void;
}

interface UsePrintReturn {
  isPrinting: boolean;
  printSettings: PrintSettings;
  updatePrintSettings: (settings: Partial<PrintSettings>) => void;
  handlePrintStart: () => void;
  handlePrintComplete: () => void;
  handlePrintError: (error: Error) => void;
  resetPrintState: () => void;
}

export const useTicketPrint = ({
  defaultPrintSettings = {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
  },
  onPrintSuccess,
  onPrintError
}: UsePrintOptions = {}): UsePrintReturn => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);

  const updatePrintSettings = useCallback((settings: Partial<PrintSettings>) => {
    setPrintSettings(prev => ({
      ...prev,
      ...settings,
      margins: settings.margins ? { ...prev.margins, ...settings.margins } : prev.margins
    }));
  }, []);

  const handlePrintStart = useCallback(() => {
    setIsPrinting(true);
  }, []);

  const handlePrintComplete = useCallback(() => {
    setIsPrinting(false);
    onPrintSuccess?.();
  }, [onPrintSuccess]);

  const handlePrintError = useCallback((error: Error) => {
    setIsPrinting(false);
    onPrintError?.(error);
  }, [onPrintError]);

  const resetPrintState = useCallback(() => {
    setIsPrinting(false);
  }, []);

  return {
    isPrinting,
    printSettings,
    updatePrintSettings,
    handlePrintStart,
    handlePrintComplete,
    handlePrintError,
    resetPrintState
  };
};