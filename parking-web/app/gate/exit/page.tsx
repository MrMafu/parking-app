"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRfidReader } from "@/hooks/useRfidReader";

export default function GateExitPage() {
  const { tagId, isReading, reset: resetReader, setManualTagId } = useRfidReader();
  const [manualInput, setManualInput] = useState("");

  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [waitingForClose, setWaitingForClose] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const closePollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup all polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (closePollInterval.current) clearInterval(closePollInterval.current);
    };
  }, []);

  const stopPollingRequest = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const stopPollingClose = () => {
    if (closePollInterval.current) {
      clearInterval(closePollInterval.current);
      closePollInterval.current = null;
    }
  };

  const handleReset = () => {
    stopPollingRequest();
    stopPollingClose();
    resetReader();
    setWaitingForApproval(false);
    setWaitingForClose(false);
    setRequestId(null);
    setApproved(false);
    setError("");
    setManualInput("");
  };

  const handleRequest = async () => {
    if (!tagId) return;
    setError("");
    setWaitingForApproval(true);
    setApproved(false);
    setWaitingForClose(false);
    try {
      const res = await apiFetch(`/exit-requests`, {
        method: "POST",
        body: JSON.stringify({ tagId }),
      });
      const json = await res.json();
      if (res.ok) {
        const reqId = json.data.id;
        setRequestId(reqId);
        // Poll for request deletion (attendant approval)
        pollInterval.current = setInterval(async () => {
          const checkRes = await apiFetch(`/exit-requests/${reqId}`);
          if (!checkRes.ok && checkRes.status === 404) {
            stopPollingRequest();
            // Request deleted – now wait for transaction to become Closed
            setWaitingForApproval(false);
            setWaitingForClose(true);
            // Start polling transaction status
            closePollInterval.current = setInterval(async () => {
              const txnRes = await apiFetch(`/transactions/by-tag/${encodeURIComponent(tagId)}?includeClosed=true`);
              if (txnRes.ok) {
                const txnJson = await txnRes.json();
                if (txnJson.data && txnJson.data.status === "Closed") {
                  stopPollingClose();
                  setWaitingForClose(false);
                  setApproved(true);
                  setTimeout(() => handleReset(), 3000);
                }
              } else {
                // keep polling
              }
            }, 2000);
          }
        }, 2000);
      } else {
        setError(json.message || "Failed to create exit request");
        setWaitingForApproval(false);
      }
    } catch {
      setError("Network error");
      setWaitingForApproval(false);
    }
  };

  // Auto‑trigger request when a tag is scanned
  useEffect(() => {
    if (tagId && !waitingForApproval && !waitingForClose && !approved) {
      handleRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setManualTagId(manualInput.trim());
      setManualInput("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-warning text-dark px-6 py-4 shadow-md">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Gate Exit</h1>
          <p className="text-sm opacity-75">Scan RFID tag to request exit</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Waiting for attendant approval */}
          {waitingForApproval && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-yellow-800">
                Waiting for attendant approval...
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Request #{requestId} sent for tag {tagId}
              </p>
              <button
                onClick={handleReset}
                className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-yellow-700 transition-colors"
              >
                Cancel & Scan Another
              </button>
            </div>
          )}

          {/* Waiting for transaction to close (payment/processing) */}
          {waitingForClose && (
            <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-6 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-blue-800">
                Exit approved! Finalising transaction...
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Please wait while the transaction is completed.
              </p>
            </div>
          )}

          {/* Exit approved (transaction closed) */}
          {approved && (
            <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-lg font-bold text-green-700">
                Exit approved! You may now leave.
              </p>
            </div>
          )}

          {/* Scanner UI (only when not waiting and not approved) */}
          {!waitingForApproval && !waitingForClose && !approved && (
            <>
              <div
                className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-colors ${
                  isReading ? "border-warning" : tagId ? "border-success" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold">RFID Scanner</h2>
                  {isReading ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">Reading...</span>
                  ) : tagId ? (
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">Tag Scanned</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">Waiting</span>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-6 text-center min-h-[80px] flex items-center justify-center">
                  {tagId ? (
                    <span className="text-3xl font-mono font-bold tracking-widest">{tagId}</span>
                  ) : (
                    <span className="text-gray-400 text-lg">
                      {isReading ? "Reading tag data..." : "Tap a card on the reader"}
                    </span>
                  )}
                </div>

                {!tagId && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter tag ID manually"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
                    />
                    <button
                      onClick={handleManualSubmit}
                      disabled={!manualInput.trim()}
                      className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 text-center">
                  <p className="text-red-700 font-semibold">{error}</p>
                </div>
              )}

              {tagId && (
                <button
                  onClick={handleReset}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel / Re-scan
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}