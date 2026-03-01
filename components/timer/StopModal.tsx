"use client";

import { useState } from "react";

interface StopModalProps {
  onSaveFinish: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function StopModal({
  onSaveFinish,
  onDiscard,
  onCancel,
}: StopModalProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (confirmDiscard) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-8">
        <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 text-gray-900">
          <h3 className="mb-2 text-lg font-bold">Are you sure?</h3>
          <p className="mb-5 text-sm text-gray-600">
            This workout will not be saved.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onDiscard}
              className="flex-1 rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white active:opacity-80"
            >
              Discard
            </button>
            <button
              onClick={() => setConfirmDiscard(false)}
              className="flex-1 rounded-xl bg-gray-100 py-3.5 text-base font-semibold text-gray-900 active:bg-gray-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-8">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 text-gray-900">
        <h3 className="mb-4 text-lg font-bold">Stop Workout?</h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={onSaveFinish}
            className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-white active:opacity-80"
          >
            Save & Finish
          </button>
          <button
            onClick={() => setConfirmDiscard(true)}
            className="w-full rounded-xl bg-red-100 py-3.5 text-base font-semibold text-red-700 active:bg-red-200"
          >
            Discard
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl bg-gray-100 py-3.5 text-base font-semibold text-gray-700 active:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
