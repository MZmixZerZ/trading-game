import React from "react";

function TradeItemBox({
  type = "buy",
  symbol = "",
  price = "-",
  amount = "-",
  total = "-",
  currency = "",
  datetime = "",
}) {
  function formatDate(d) {
    if (!d) return "";

    try {
      let parsedDate;

      if (typeof d === "object" && typeof d.toDate === "function") {
        parsedDate = d.toDate();
      } else if (typeof d === "object" && "seconds" in d) {
        parsedDate = new Date(d.seconds * 1000);
      } else if (typeof d === "string") {
        const cleaned = d
          .replace("at", "")
          .replace("UTC+7", "GMT+0700")
          .replace(/\u202F/g, " ")
          .trim();

        parsedDate = new Date(cleaned);
      } else {
        parsedDate = new Date(d);
      }

      if (isNaN(parsedDate)) return "";

      return (
        parsedDate.toLocaleString("th-TH", {
          year: "2-digit",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " น."
      );
    } catch {
      return "";
    }
  }

  return (
    <div className="bg-[#22242c] rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center border border-[#30334a] shadow">
      {/* Left */}
      <div>
        <div
          className={`text-lg font-extrabold mb-2 ${
            type === "buy" ? "text-[#36dd6b]" : "text-[#ff6565]"
          }`}
        >
          {type === "buy" ? "ซื้อ" : "ขาย"} {symbol}
        </div>
        <div className="text-white">
          ราคาที่ได้จริง <span className="font-bold">
            {typeof price === "number" ? price.toFixed(2) : price}
          </span>
        </div>
        <div className="text-white">
          จำนวนหุ้น <span className="font-bold">
            {typeof amount === "number" ? amount.toFixed(2) : amount}
          </span>
        </div>
      </div>
      {/* Right */}
      <div className="flex flex-col items-end mt-3 sm:mt-0">
        <div className="text-xl font-extrabold text-[#36dd6b]">
          {typeof total === "number" ? total.toFixed(2) : total} {currency}
        </div>
        <div className="text-[#bbbbbb] text-sm mt-1">
          {formatDate(datetime)}
        </div>
      </div>
    </div>
  );
}

export default TradeItemBox;
