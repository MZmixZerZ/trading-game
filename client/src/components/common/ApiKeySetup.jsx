"use client"

import { useState } from "react"

const ApiKeySetup = () => {
  const [showSetup, setShowSetup] = useState(false)
  const [apiKey, setApiKey] = useState("")

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("ALPHA_VANTAGE_API_KEY", apiKey.trim())
      alert("API Key บันทึกแล้ว! กรุณารีเฟรชหน้าเว็บ")
      setShowSetup(false)
    }
  }

  if (!showSetup) {
    return (
      <button
        onClick={() => setShowSetup(true)}
        className="fixed top-20 right-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 z-50"
      >
        ตั้งค่า API Key
      </button>
    )
  }

  return (
    <div className="fixed top-20 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 w-80">
      <h3 className="font-bold mb-2">ตั้งค่า Alpha Vantage API Key</h3>
      <p className="text-sm text-gray-600 mb-3">
        สมัครฟรีที่:{" "}
        <a
          href="https://www.alphavantage.co/support/#api-key"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          alphavantage.co
        </a>
      </p>
      <input
        type="text"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="ใส่ API Key ของคุณ"
        className="w-full p-2 border rounded mb-3"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSaveApiKey}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          บันทึก
        </button>
        <button
          onClick={() => setShowSetup(false)}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

export default ApiKeySetup
