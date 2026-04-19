'use client'
import { useState } from 'react'

interface AddMemberSheetProps {
  onAdd: (name: string) => void
  onClose: () => void
}

export function AddMemberSheet({ onAdd, onClose }: AddMemberSheetProps) {
  const [name, setName] = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-4">Add Member</h2>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter name..."
          autoFocus
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm mb-4 outline-none focus:border-indigo-400"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim()}
            onClick={handleSubmit}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl text-sm font-semibold disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
