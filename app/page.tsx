"use client";

import { useState, useCallback, useRef, DragEvent } from "react";

interface Person {
  id: number;
  name: string;
  percent: number;
  paidAmount: string;
  note: string;
}

interface BillItem {
  id: number;
  name: string;
  price: string;
  assignedTo: number | null;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

type Mode = "percentage" | "itemized";

const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "Dollar" },
  { code: "JPY", symbol: "\u00a5", name: "Yen" },
  { code: "CNY", symbol: "\u00a5", name: "Yuan" },
  { code: "PHP", symbol: "\u20b1", name: "Peso" },
];

let nextPersonId = 3;
let nextItemId = 1;

function createEvenSplit(count: number): number {
  return parseFloat((100 / count).toFixed(2));
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("percentage");
  const [bill, setBill] = useState("");
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[3]);
  const [people, setPeople] = useState<Person[]>([
    { id: 1, name: "Person 1", percent: 50, paidAmount: "", note: "" },
    { id: 2, name: "Person 2", percent: 50, paidAmount: "", note: "" },
  ]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  const totalPercent = people.reduce((sum, p) => sum + p.percent, 0);
  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const billAmount = items.length > 0 ? itemsTotal : (parseFloat(bill) || 0);

  const discountValue = parseFloat(discount) || 0;
  const discountAmount = discountEnabled
    ? discountType === "percent"
      ? (billAmount * Math.min(discountValue, 100)) / 100
      : Math.min(discountValue, billAmount)
    : 0;
  const effectiveBillAmount = Math.max(billAmount - discountAmount, 0);

  const splitEvenly = useCallback((list: Person[]): Person[] => {
    const even = createEvenSplit(list.length);
    return list.map((p) => ({ ...p, percent: even }));
  }, []);

  // People actions
  const addPerson = () => {
    const newList = [
      ...people,
      { id: nextPersonId++, name: `Person ${people.length + 1}`, percent: 0, paidAmount: "", note: "" },
    ];
    setPeople(splitEvenly(newList));
  };

  const removePerson = (id: number) => {
    if (people.length <= 1) return;
    const newList = people.filter((p) => p.id !== id);
    setPeople(splitEvenly(newList));
    setItems(items.map((item) => (item.assignedTo === id ? { ...item, assignedTo: null } : item)));
  };

  const updateName = (id: number, name: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const updatePercent = (id: number, value: string) => {
    const percent = parseFloat(value) || 0;
    setPeople(people.map((p) => (p.id === id ? { ...p, percent } : p)));
  };

  const updatePaidAmount = (id: number, paidAmount: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, paidAmount } : p)));
  };

  const updateNote = (id: number, note: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, note } : p)));
  };

  const handleSplitEvenly = () => {
    setPeople(splitEvenly(people));
  };

  // Item actions
  const addItem = () => {
    setItems([...items, { id: nextItemId++, name: "", price: "", assignedTo: null }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItemName = (id: number, name: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, name } : item)));
  };

  const updateItemPrice = (id: number, price: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, price } : item)));
  };

  const assignItem = (itemId: number, personId: number | null) => {
    setItems(items.map((item) => (item.id === itemId ? { ...item, assignedTo: personId } : item)));
  };

  // Drag and drop
  const handleDragStart = (e: DragEvent, itemId: number) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(itemId));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent, personId: number | null) => {
    e.preventDefault();
    const itemId = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(itemId)) {
      assignItem(itemId, personId);
    }
    setDraggedItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  // Per-person totals for itemized mode
  const getPersonItems = (personId: number) =>
    items.filter((item) => item.assignedTo === personId);

  const getPersonTotal = (personId: number) =>
    getPersonItems(personId).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

  const unassignedItems = items.filter((item) => item.assignedTo === null);
  const hasItems = mode === "itemized" && items.length > 0;

  // Per-person share calculation
  const getPersonShare = (person: Person): number => {
    if (hasItems) {
      const raw = getPersonTotal(person.id);
      if (discountAmount > 0 && billAmount > 0) {
        return raw * (effectiveBillAmount / billAmount);
      }
      return raw;
    }
    return (effectiveBillAmount * person.percent) / 100;
  };

  // Balances: positive = overpaid (owed money back), negative = still owes
  const balances = people.map((p) => {
    const share = getPersonShare(p);
    const paid = parseFloat(p.paidAmount) || 0;
    return { id: p.id, name: p.name, share, paid, balance: paid - share };
  });

  const totalPaid = balances.reduce((sum, b) => sum + b.paid, 0);
  const totalOwed = balances.reduce((sum, b) => sum + b.share, 0);

  // Settlement: minimize transactions (greedy algorithm)
  type Settlement = { from: string; to: string; amount: number };
  const settlements: Settlement[] = [];
  {
    const debtors = balances
      .filter((b) => b.balance < -0.005)
      .map((b) => ({ name: b.name, amount: -b.balance }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = balances
      .filter((b) => b.balance > 0.005)
      .map((b) => ({ name: b.name, amount: b.balance }))
      .sort((a, b) => b.amount - a.amount);

    let di = 0;
    let ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const transfer = Math.min(debtors[di].amount, creditors[ci].amount);
      if (transfer > 0.005) {
        settlements.push({
          from: debtors[di].name,
          to: creditors[ci].name,
          amount: parseFloat(transfer.toFixed(2)),
        });
      }
      debtors[di].amount -= transfer;
      creditors[ci].amount -= transfer;
      if (debtors[di].amount < 0.005) di++;
      if (creditors[ci].amount < 0.005) ci++;
    }
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Build summary table data (shared between UI and export)
  type SummaryRow = { personId: number | null; person: string; item?: string; amount: string; paid: string; balance: string; note: string; isFirstForPerson: boolean };
  const summaryRows: SummaryRow[] = [];

  if (hasItems) {
    for (const person of people) {
      const pItems = getPersonItems(person.id);
      const b = balances.find((x) => x.id === person.id)!;
      const paidStr = (parseFloat(person.paidAmount) || 0) > 0 ? `${currency.symbol}${(parseFloat(person.paidAmount) || 0).toFixed(2)}` : "";
      const balStr = b.balance > 0.005 ? `+${currency.symbol}${b.balance.toFixed(2)}` : b.balance < -0.005 ? `-${currency.symbol}${(-b.balance).toFixed(2)}` : "";
      if (pItems.length === 0) {
        summaryRows.push({
          personId: person.id,
          person: person.name,
          item: "",
          amount: `${currency.symbol}0.00`,
          paid: paidStr,
          balance: balStr,
          note: person.note,
          isFirstForPerson: true,
        });
      } else {
        for (let i = 0; i < pItems.length; i++) {
          summaryRows.push({
            personId: i === 0 ? person.id : null,
            person: i === 0 ? person.name : "",
            item: pItems[i].name || "Unnamed item",
            amount: `${currency.symbol}${(parseFloat(pItems[i].price) || 0).toFixed(2)}`,
            paid: i === 0 ? paidStr : "",
            balance: i === 0 ? balStr : "",
            note: i === 0 ? person.note : "",
            isFirstForPerson: i === 0,
          });
        }
      }
    }
  } else {
    for (const person of people) {
      const amount = (effectiveBillAmount * person.percent) / 100;
      const b = balances.find((x) => x.id === person.id)!;
      const paidStr = (parseFloat(person.paidAmount) || 0) > 0 ? `${currency.symbol}${(parseFloat(person.paidAmount) || 0).toFixed(2)}` : "";
      const balStr = b.balance > 0.005 ? `+${currency.symbol}${b.balance.toFixed(2)}` : b.balance < -0.005 ? `-${currency.symbol}${(-b.balance).toFixed(2)}` : "";
      summaryRows.push({
        personId: person.id,
        person: person.name,
        amount: `${currency.symbol}${amount.toFixed(2)}`,
        paid: paidStr,
        balance: balStr,
        note: person.note,
        isFirstForPerson: true,
      });
    }
  }

  const summaryHeaders = hasItems
    ? ["Person", "Item", "Owes", "Paid", "Balance", "Notes"]
    : ["Person", "Owes", "Paid", "Balance", "Notes"];

  const exportAsImage = () => {
    const rows = summaryRows;
    const headers = summaryHeaders;

    // Total row values
    const totalAmountStr = `${currency.symbol}${totalOwed.toFixed(2)}`;
    const totalPaidStr = `${currency.symbol}${totalPaid.toFixed(2)}`;
    const unpaid = totalOwed - totalPaid;
    const totalBalStr = unpaid > 0 ? `${currency.symbol}${unpaid.toFixed(2)} unpaid` : "Settled";

    // Measure and draw on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 2;
    const fontSize = 14;
    const headerFontSize = 14;
    const padding = 12;
    const rowHeight = fontSize + padding * 2;
    const headerHeight = headerFontSize + padding * 2;
    const font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    const boldFont = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    const headerFont = `bold ${headerFontSize}px ui-sans-serif, system-ui, sans-serif`;

    // Build full cell arrays per row (all columns)
    const rowCells = rows.map((row) =>
      hasItems
        ? [row.person, row.item!, row.amount, row.paid, row.balance, row.note]
        : [row.person, row.amount, row.paid, row.balance, row.note]
    );

    // Measure column widths
    ctx.font = headerFont;
    const colWidths = headers.map((h) => ctx.measureText(h).width + padding * 2);

    ctx.font = font;
    for (const cells of rowCells) {
      cells.forEach((cell, i) => {
        const w = ctx.measureText(cell).width + padding * 2;
        if (w > colWidths[i]) colWidths[i] = w;
      });
    }

    // Account for total row in column widths
    ctx.font = boldFont;
    const totalLabelW = ctx.measureText("Total").width + padding * 2;
    if (totalLabelW > colWidths[0]) colWidths[0] = totalLabelW;
    const amountColIdx = hasItems ? 2 : 1;
    const paidColIdx = hasItems ? 3 : 2;
    const balColIdx = hasItems ? 4 : 3;
    const totalAmountW = ctx.measureText(totalAmountStr).width + padding * 2;
    if (totalAmountW > colWidths[amountColIdx]) colWidths[amountColIdx] = totalAmountW;
    const totalPaidW = ctx.measureText(totalPaidStr).width + padding * 2;
    if (totalPaidW > colWidths[paidColIdx]) colWidths[paidColIdx] = totalPaidW;
    const totalBalW = ctx.measureText(totalBalStr).width + padding * 2;
    if (totalBalW > colWidths[balColIdx]) colWidths[balColIdx] = totalBalW;

    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const tableHeight = headerHeight + rowHeight * (rows.length + 1);
    const canvasW = tableWidth + 2;
    const canvasH = tableHeight + 2;

    canvas.width = canvasW * scale;
    canvas.height = canvasH * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw header
    ctx.fillStyle = "#18181b";
    ctx.fillRect(1, 1, tableWidth, headerHeight);
    ctx.fillStyle = "#ffffff";
    ctx.font = headerFont;
    let x = 1;
    headers.forEach((h, i) => {
      ctx.fillText(h, x + padding, 1 + padding + headerFontSize * 0.85);
      x += colWidths[i];
    });

    // Draw rows
    ctx.font = font;
    for (let r = 0; r < rows.length; r++) {
      const y = 1 + headerHeight + r * rowHeight;
      const cells = rowCells[r];

      // Alternating row background
      ctx.fillStyle = r % 2 === 0 ? "#fafafa" : "#ffffff";
      ctx.fillRect(1, y, tableWidth, rowHeight);

      // Row border
      ctx.strokeStyle = "#e4e4e7";
      ctx.beginPath();
      ctx.moveTo(1, y + rowHeight);
      ctx.lineTo(1 + tableWidth, y + rowHeight);
      ctx.stroke();

      // Cell text
      ctx.fillStyle = "#27272a";
      let cx = 1;
      cells.forEach((cell, i) => {
        ctx.fillText(cell, cx + padding, y + padding + fontSize * 0.85);
        cx += colWidths[i];
      });
    }

    // Total row
    const totalY = 1 + headerHeight + rows.length * rowHeight;
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(1, totalY, tableWidth, rowHeight);
    ctx.font = boldFont;
    ctx.fillStyle = "#18181b";
    ctx.fillText("Total", 1 + padding, totalY + padding + fontSize * 0.85);

    // Total amount
    let tx = 1;
    for (let i = 0; i < amountColIdx; i++) tx += colWidths[i];
    ctx.fillText(totalAmountStr, tx + padding, totalY + padding + fontSize * 0.85);

    // Total paid
    let px = 1;
    for (let i = 0; i < paidColIdx; i++) px += colWidths[i];
    ctx.fillText(totalPaidStr, px + padding, totalY + padding + fontSize * 0.85);

    // Total balance status
    let bx = 1;
    for (let i = 0; i < balColIdx; i++) bx += colWidths[i];
    ctx.fillStyle = unpaid > 0 ? "#d97706" : "#047857";
    ctx.fillText(totalBalStr, bx + padding, totalY + padding + fontSize * 0.85);

    // Outer border
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, tableWidth, tableHeight);

    // Column dividers
    ctx.strokeStyle = "#e4e4e7";
    let dx = 1;
    for (let i = 0; i < colWidths.length - 1; i++) {
      dx += colWidths[i];
      ctx.beginPath();
      ctx.moveTo(dx, 1);
      ctx.lineTo(dx, 1 + tableHeight);
      ctx.stroke();
    }

    // Download
    const link = document.createElement("a");
    link.download = "bill-split.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-4xl">
        <canvas ref={canvasRef} className="hidden" />
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bill Splitter
          </h1>
        </div>

        {/* Top bar: Mode Toggle + Currency/Bill */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setMode("percentage")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "percentage"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Percentage Split
            </button>
            <button
              onClick={() => setMode("itemized")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "itemized"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Itemized Split
            </button>
          </div>

          {/* Currency + Bill Amount */}
          <div className="flex gap-2">
            <select
              value={currency.code}
              onChange={(e) =>
                setCurrency(CURRENCIES.find((c) => c.code === e.target.value)!)
              }
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name}
                </option>
              ))}
            </select>
            {mode === "percentage" && (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  {currency.symbol}
                </span>
                {items.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex w-44 cursor-not-allowed items-center justify-between rounded-lg border border-zinc-200 bg-zinc-100 py-2.5 pl-7 pr-3 text-lg tabular-nums text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      {itemsTotal.toFixed(2)}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400 dark:text-zinc-500">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <span className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500">
                      From {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ) : (
                  <input
                    id="bill"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={bill}
                    onChange={(e) => setBill(e.target.value)}
                    className="w-44 rounded-lg border border-zinc-300 bg-white py-2.5 pl-7 pr-3 text-lg tabular-nums text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Discount */}
        <div className="mb-6 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={(e) => setDiscountEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:ring-zinc-600"
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Discount</span>
          </label>
          {discountEnabled && (
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-zinc-300 dark:border-zinc-700">
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    discountType === "percent"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white text-zinc-500 hover:text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  } rounded-l-md`}
                >
                  %
                </button>
                <button
                  onClick={() => setDiscountType("fixed")}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    discountType === "fixed"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white text-zinc-500 hover:text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  } rounded-r-md`}
                >
                  {currency.symbol}
                </button>
              </div>
              <div className="relative">
                {discountType === "fixed" && (
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    {currency.symbol}
                  </span>
                )}
                <input
                  type="number"
                  min="0"
                  max={discountType === "percent" ? "100" : undefined}
                  step={discountType === "percent" ? "1" : "0.01"}
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className={`w-28 rounded-lg border border-zinc-300 bg-white py-2 text-sm tabular-nums text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800 ${
                    discountType === "fixed" ? "pl-6 pr-3" : "px-3"
                  }`}
                />
                {discountType === "percent" && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    %
                  </span>
                )}
              </div>
              {discountAmount > 0 && (
                <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                  &minus;{currency.symbol}{discountAmount.toFixed(2)}
                  {" = "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {currency.symbol}{effectiveBillAmount.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div>
            {mode === "percentage" && (
              <>
                <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Percentage Breakdown
                </h2>
                <div className="max-h-[168px] space-y-2 overflow-y-auto">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-zinc-50">
                        {person.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={person.percent}
                          onChange={(e) => updatePercent(person.id, e.target.value)}
                          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-right text-sm tabular-nums text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                        />
                        <span className="text-sm text-zinc-400">%</span>
                      </div>
                      <span className="w-24 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                        {currency.symbol}
                        {((effectiveBillAmount * person.percent) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Percent Indicator */}
                <div
                  className={`mt-3 flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium ${
                    Math.abs(totalPercent - 100) < 0.01
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  }`}
                >
                  <span>Total</span>
                  <span className="tabular-nums">{totalPercent.toFixed(2)}%</span>
                </div>
              </>
            )}

            {mode === "itemized" && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Bill Items
                  </h2>
                  <span className="text-xs text-zinc-400">
                    Drag items to people
                  </span>
                </div>

                <div className="max-h-[168px] space-y-2 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 rounded-lg border bg-white p-3 transition-colors dark:bg-zinc-900 ${
                        draggedItemId === item.id
                          ? "border-zinc-400 opacity-50 dark:border-zinc-500"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {/* Drag handle */}
                      <span className="cursor-grab text-zinc-300 active:cursor-grabbing dark:text-zinc-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </span>

                      {/* Item name */}
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateItemName(item.id, e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:bg-zinc-50 dark:text-zinc-50 dark:focus:border-zinc-700 dark:focus:bg-zinc-800"
                      />

                      {/* Item price */}
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.price}
                          onChange={(e) => updateItemPrice(item.id, e.target.value)}
                          className="w-24 rounded-md border border-zinc-300 bg-white py-1 pl-5 pr-2 text-right text-sm tabular-nums text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                        />
                      </div>

                      {/* Assign to person */}
                      <select
                        value={item.assignedTo ?? ""}
                        onChange={(e) =>
                          assignItem(
                            item.id,
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        className="w-28 truncate rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                      >
                        <option value="">Unassigned</option>
                        {people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      {/* Remove item */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        aria-label="Remove item"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Item */}
                <button
                  onClick={addItem}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Item
                </button>
              </>
            )}
          </div>

          {/* Right column — People & Summary */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                People
              </h2>
              {mode === "percentage" && (
                <button
                  onClick={handleSplitEvenly}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  Split Evenly
                </button>
              )}
            </div>

            <div className="max-h-[168px] space-y-2 overflow-y-auto">
              {people.map((person) => {
                const personItems = mode === "itemized" ? getPersonItems(person.id) : [];
                const personTotal = mode === "itemized" ? getPersonTotal(person.id) : 0;

                return (
                  <div
                    key={person.id}
                    onDragOver={mode === "itemized" ? handleDragOver : undefined}
                    onDrop={mode === "itemized" ? (e) => handleDrop(e, person.id) : undefined}
                    className={`rounded-lg border p-3 transition-colors ${
                      mode === "itemized" && draggedItemId !== null
                        ? "border-2 border-dashed border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800/50"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Editable name */}
                      <input
                        type="text"
                        value={person.name}
                        onChange={(e) => updateName(person.id, e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-300 focus:bg-zinc-50 dark:text-zinc-50 dark:focus:border-zinc-700 dark:focus:bg-zinc-800"
                      />

                      {mode === "itemized" && (
                        <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {currency.symbol}
                          {personTotal.toFixed(2)}
                        </span>
                      )}

                      {mode === "percentage" && (
                        <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {currency.symbol}
                          {((effectiveBillAmount * person.percent) / 100).toFixed(2)}
                        </span>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => removePerson(person.id)}
                        disabled={people.length <= 1}
                        className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        aria-label={`Remove ${person.name}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    {/* Paid amount */}
                    <div className="mt-2 flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1.5 dark:bg-emerald-950/30">
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Paid</span>
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-emerald-500 dark:text-emerald-500">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={person.paidAmount}
                          onChange={(e) => updatePaidAmount(person.id, e.target.value)}
                          className="w-full rounded-md border border-emerald-200 bg-white py-1 pl-5 pr-2 text-right text-sm tabular-nums text-emerald-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:focus:border-emerald-600 dark:focus:ring-emerald-900"
                        />
                      </div>
                    </div>

                    {/* Itemized: show assigned items */}
                    {mode === "itemized" && personItems.length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                        {personItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            <span className="truncate">
                              {item.name || "Unnamed item"}
                            </span>
                            <span className="ml-2 tabular-nums">
                              {currency.symbol}
                              {(parseFloat(item.price) || 0).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {mode === "itemized" && personItems.length === 0 && draggedItemId !== null && (
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        Drop item here
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Unassigned drop zone (itemized only) */}
              {mode === "itemized" && unassignedItems.length > 0 && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, null)}
                  className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Unassigned
                    </span>
                    <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                      {currency.symbol}
                      {unassignedItems
                        .reduce(
                          (sum, item) => sum + (parseFloat(item.price) || 0),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {unassignedItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400"
                      >
                        <span className="truncate">
                          {item.name || "Unnamed item"}
                        </span>
                        <span className="ml-2 tabular-nums">
                          {currency.symbol}
                          {(parseFloat(item.price) || 0).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Add Person */}
            <button
              onClick={addPerson}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Person
            </button>

            {/* Items total (itemized only) */}
            {mode === "itemized" && items.length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <span>Items Total</span>
                <span className="tabular-nums">
                  {currency.symbol}
                  {itemsTotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Export Preview Table */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showPreview ? "rotate-90" : ""}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
            <button
              onClick={exportAsImage}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Summary
            </button>
          </div>
          {showPreview && <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {summaryHeaders.map((header) => (
                    <th
                      key={header}
                      className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${header === "Paid" || header === "Balance" ? "w-32" : ""}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-zinc-50 dark:bg-zinc-900"
                        : "bg-white dark:bg-zinc-950"
                    }
                  >
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                      {row.person}
                    </td>
                    {hasItems && (
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                        {row.item}
                      </td>
                    )}
                    <td className="px-4 py-2 tabular-nums text-zinc-900 dark:text-zinc-100">
                      {row.amount}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-zinc-900 dark:text-zinc-100">
                      {row.paid}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {row.isFirstForPerson && row.balance ? (
                        <span className={row.balance.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                          {row.balance}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-1">
                      {row.isFirstForPerson && row.personId !== null ? (
                        <input
                          type="text"
                          value={people.find((p) => p.id === row.personId)!.note}
                          onChange={(e) => updateNote(row.personId!, e.target.value)}
                          placeholder="Add note..."
                          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-500 outline-none placeholder:text-zinc-300 focus:border-zinc-300 focus:bg-zinc-50 dark:text-zinc-400 dark:placeholder:text-zinc-600 dark:focus:border-zinc-700 dark:focus:bg-zinc-800"
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {(() => {
                  const unpaid = totalOwed - totalPaid;
                  return (
                    <tr className="border-t border-zinc-200 bg-zinc-100 font-bold dark:border-zinc-700 dark:bg-zinc-800">
                      <td className="px-4 py-2.5 text-zinc-900 dark:text-zinc-100">
                        Total
                      </td>
                      {hasItems && <td className="px-4 py-2.5" />}
                      <td className="px-4 py-2.5 tabular-nums text-zinc-900 dark:text-zinc-100">
                        {currency.symbol}{totalOwed.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-zinc-900 dark:text-zinc-100">
                        {currency.symbol}{totalPaid.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {unpaid > 0.005 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {currency.symbol}{unpaid.toFixed(2)} unpaid
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Settled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>}
        </div>

        {/* Settlement Summary */}
        {settlements.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Settlement Summary
            </h2>
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.from}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.to}</span>
                  <span className="ml-auto text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {currency.symbol}{s.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
