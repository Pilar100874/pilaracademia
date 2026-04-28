import { useState, useEffect, useCallback } from 'react';

type Listener = () => void;

interface Snapshot {
  results: Record<string, any>;
  processing: Record<string, boolean>;
  errors: Record<string, string>;
}

class NodeResultStore {
  private _results: Record<string, any> = {};
  private _processing: Record<string, boolean> = {};
  private _errors: Record<string, string> = {};
  private _listeners: Set<Listener> = new Set();
  private _version = 0;

  subscribe(listener: Listener) {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  private _notify() {
    this._version++;
    this._listeners.forEach(l => l());
  }

  getVersion() {
    return this._version;
  }

  getResult(nodeId: string) {
    return this._results[nodeId];
  }

  getProcessing(nodeId: string) {
    return this._processing[nodeId] || false;
  }

  getError(nodeId: string) {
    return this._errors[nodeId];
  }

  getAllResults() {
    return this._results;
  }

  getAllProcessing() {
    return this._processing;
  }

  getAllErrors() {
    return this._errors;
  }

  setResult(nodeId: string, result: any) {
    this._results = { ...this._results, [nodeId]: result };
    this._notify();
  }

  setProcessing(nodeId: string, isProcessing: boolean) {
    this._processing = { ...this._processing, [nodeId]: isProcessing };
    this._notify();
  }

  setError(nodeId: string, error: string) {
    this._errors = { ...this._errors, [nodeId]: error };
    this._notify();
  }

  clearError(nodeId: string) {
    const { [nodeId]: _, ...rest } = this._errors;
    this._errors = rest;
    this._notify();
  }

  clearAll() {
    this._results = {};
    this._processing = {};
    this._errors = {};
    this._notify();
  }
}

export const nodeResultStore = new NodeResultStore();

export function useNodeResult(nodeId: string) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = nodeResultStore.subscribe(() => {
      forceUpdate(v => v + 1);
    });
    return unsub;
  }, [nodeId]);

  return {
    result: nodeResultStore.getResult(nodeId),
    isProcessing: nodeResultStore.getProcessing(nodeId),
    error: nodeResultStore.getError(nodeId),
  };
}

export function useNodeResults() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = nodeResultStore.subscribe(() => {
      forceUpdate(v => v + 1);
    });
    return unsub;
  }, []);

  return {
    results: nodeResultStore.getAllResults(),
    processing: nodeResultStore.getAllProcessing(),
    errors: nodeResultStore.getAllErrors(),
  };
}
