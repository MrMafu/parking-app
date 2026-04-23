"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useRfidReader } from "@/hooks/useRfidReader";

type ParkingArea = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  status: string;
};

export default function GateEntryPage() {
  const params = useParams();
  const areaId = Number(params.areaId);

  const { tagId, isReading, scanCount, reset: resetReader, setManualTagId } = useRfidReader();
  const [manualInput, setManualInput] = useState("");

  const [area, setArea] = useState<ParkingArea | null>(null);
  const [areaLoading, setAreaLoading] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  // New states for waiting approval
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchArea = useCallback(async () => {
    if (isNaN(areaId)) return;
    try {
      const res = await apiFetch(`/parking-areas/public/${areaId}`);
      if (res.ok) {
        const json = await res.json();
        setArea(json.data ?? null);
      }
    } catch {
      // ignore
    } finally {
      setAreaLoading(false);
    }
  }, [areaId]);

  useEffect(() => {
    fetchArea();
  }, [fetchArea]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const handleNewScan = () => {
    resetReader();
    setSuccessMsg("");
    setError("");
    setManualInput("");
    setWaitingForApproval(false);
    setApproved(false);
    setRejected(false);
    setRequestId(null);
    stopPolling();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setManualTagId(manualInput.trim());
      setManualInput("");
    }
  };

  const handleRequest = async () => {
    if (!tagId || isNaN(areaId)) return;
    setError("");
    setSuccessMsg("");
    setWaitingForApproval(true);
    try {
      const res = await apiFetch(`/entry-requests`, {
        method: "POST",
        body: JSON.stringify({ tagId, areaId }),
      });
      const json = await res.json();
      if (res.ok) {
        const reqId = json.data.id;
        setRequestId(reqId);
        setSuccessMsg(`Request sent — awaiting attendant approval (req #${reqId})`);
        // Start polling for request status
        pollInterval.current = setInterval(async () => {
          // Check if request still exists
          const checkRes = await apiFetch(`/entry-requests/${reqId}`);
          if (!checkRes.ok && checkRes.status === 404) {
            // Request deleted – either approved or rejected
            stopPolling();
            // Check if an open transaction exists for this tag
            const txnRes = await apiFetch(`/transactions/public/by-tag/${encodeURIComponent(tagId)}`);
            if (txnRes.ok) {
              const txnJson = await txnRes.json();
              if (txnJson.data && txnJson.data.status === "Open") {
                setApproved(true);
                setSuccessMsg("✅ Entry approved! You may now enter.");
                // Reset reader after 3 seconds
                setTimeout(() => handleNewScan(), 3000);
              } else {
                setRejected(true);
                setError("❌ Entry request rejected.");
                setTimeout(() => handleNewScan(), 3000);
              }
            } else {
              setRejected(true);
              setError("❌ Entry request rejected (no active transaction).");
              setTimeout(() => handleNewScan(), 3000);
            }
          }
        }, 2000);
      } else {
        setError(json.message || "Failed to create request");
        setWaitingForApproval(false);
      }
    } catch {
      setError("Network error");
      setWaitingForApproval(false);
    }
  };

  // When a tag is scanned, immediately create an entry request.
  useEffect(() => {
    if (tagId && !waitingForApproval && !successMsg && !approved && !rejected) {
      handleRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId]);

  if (areaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-2xl font-bold text-danger">Parking area not found</p>
          <p className="text-gray-500 mt-2">Area ID: {areaId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white px-6 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Gate Entry</h1>
            <p className="text-sm opacity-90">{area.name}</p>
          </div>
          <div className="text-right text-sm">
            <p>
              <span className="opacity-75">Occupied:</span>{" "}
              <span className="font-bold">{area.occupied}/{area.capacity}</span>
            </p>
            <p className={`font-semibold ${area.occupied >= area.capacity ? "text-red-200" : "text-green-200"}`}>
              {area.occupied >= area.capacity ? "FULL" : `${area.capacity - area.occupied} spots left`}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Success message after approval */}
          {approved && (
            <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-lg font-bold text-green-700">Entry approved! You may now enter.</p>
            </div>
          )}

          {/* Rejected message */}
          {rejected && (
            <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-6 text-center">
              <p className="text-4xl mb-3">❌</p>
              <p className="text-lg font-bold text-red-700">Entry request rejected.</p>
            </div>
          )}

          {/* Waiting for approval */}
          {waitingForApproval && !approved && !rejected && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-yellow-800">Waiting for attendant approval...</p>
              <p className="text-sm text-yellow-700 mt-1">{successMsg}</p>
              <button
                onClick={handleNewScan}
                className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-yellow-700 transition-colors"
              >
                Cancel & Scan Another
              </button>
            </div>
          )}

          {/* Initial scanner UI (only when not waiting and not approved/rejected) */}
          {!waitingForApproval && !approved && !rejected && (
            <>
              <div
                className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-colors ${
                  isReading
                    ? "border-warning"
                    : tagId
                    ? "border-success"
                    : "border-gray-200"
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

                <p className="text-xs text-gray-400 text-center mt-3">
                  Total scans this session: {scanCount}
                </p>

                {!tagId && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter tag ID manually"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                <div className="space-y-3">
                  <button
                    onClick={handleNewScan}
                    className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel / Re-scan
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}