"use client";

import { useState, useCallback, DragEvent } from "react";

interface Person {
  id: number;
  name: string;
  percent: number;
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
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [people, setPeople] = useState<Person[]>([
    { id: 1, name: "Person 1", percent: 50 },
    { id: 2, name: "Person 2", percent: 50 },
  ]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);

  const totalPercent = people.reduce((sum, p) => sum + p.percent, 0);
  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const billAmount = items.length > 0 ? itemsTotal : (parseFloat(bill) || 0);

  const splitEvenly = useCallback((list: Person[]): Person[] => {
    const even = createEvenSplit(list.length);
    return list.map((p) => ({ ...p, percent: even }));
  }, []);

  // People actions
  const addPerson = () => {
    const newList = [
      ...people,
      { id: nextPersonId++, name: `Person ${people.length + 1}`, percent: 0 },
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

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Bill Splitter
        </h1>

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
                  <span className="inline-flex w-44 items-center rounded-lg border border-zinc-200 bg-zinc-100 py-2.5 pl-7 pr-3 text-lg tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
                    {itemsTotal.toFixed(2)}
                  </span>
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div>
            {mode === "percentage" && (
              <>
                <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Percentage Breakdown
                </h2>
                <div className="space-y-2">
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
                        {((billAmount * person.percent) / 100).toFixed(2)}
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

                <div className="space-y-2">
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

            <div className="space-y-2">
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
                          {((billAmount * person.percent) / 100).toFixed(2)}
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
      </main>
    </div>
  );
}
