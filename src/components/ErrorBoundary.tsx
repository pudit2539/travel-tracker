// src/components/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw, Home, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleSafeReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {}
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090611] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#130d22] border border-rose-900/60 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-900/30">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-900">
                Crash Protection Safe Mode
              </span>
              <h1 className="text-lg font-black text-white mt-2">
                เกิดข้อผิดพลาดในการแสดงผล
              </h1>
              <p className="text-xs text-purple-300/70 mt-1 leading-relaxed">
                ระบบเปิดโหมดป้องกันความเสียหายอัตโนมัติ ข้อมูลของคุณยังปลอดภัยอยู่ในฐานข้อมูล
              </p>
            </div>

            {this.state.error && (
              <div className="text-left p-3 rounded-xl bg-black/40 border border-rose-900/40 text-[11px] font-mono text-rose-300 max-h-24 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleSafeReload}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> โหลดหน้าเว็บใหม่
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="py-2.5 px-3 rounded-xl border border-purple-800 bg-[#1c1328] hover:bg-purple-950 text-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="h-4 w-4" /> กลับหน้าหลัก
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
