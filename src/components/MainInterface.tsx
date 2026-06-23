import React, { useState, useEffect } from "react";
import {
  listenToAppState,
  listenToSeasonRecords,
  listenToSeasonNotepad,
  addBigRecord,
  addSmallRecord,
  updateSeasonNotepad
} from "../lib/firebase";
import { resizeAndCompressImage, uploadToCloudinary } from "../lib/cloudinary";
import { AppState, BigRecord, SmallRecord } from "../types";
import {
  Plus,
  Coins,
  Calculator,
  History,
  FileText,
  Calendar,
  Layers,
  Image as ImageIcon,
  Check,
  Eye,
  X,
  UploadCloud,
  Loader,
  Notebook
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MainInterfaceProps {
  onLogout: () => void;
}

export default function MainInterface({ onLogout }: MainInterfaceProps) {
  // App state
  const [appState, setAppState] = useState<Partial<AppState>>({
    currentSeason: "",
    seasons: [],
    photoQualityKB: 50,
    profile: { name: "Md Nazrul Islam", avatarUrl: "" },
    productTypes: [],
    notepad: ""
  });

  // Season data records
  const [bigRecords, setBigRecords] = useState<BigRecord[]>([]);
  const [smallRecords, setSmallRecords] = useState<SmallRecord[]>([]);
  const [seasonNotepad, setSeasonNotepad] = useState("");

  // Modals visibility
  const [showBigForm, setShowBigForm] = useState(false);
  const [showSmallForm, setShowSmallForm] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [showPaidHistory, setShowPaidHistory] = useState(false);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Form Fields - Big record
  const [bigDate, setBigDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bigProdTypeId, setBigProdTypeId] = useState("");
  const [bigPiece, setBigPiece] = useState<number | "">("");
  const [bigPhotoFile, setBigPhotoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form Fields - Small record
  const [smallDate, setSmallDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [smallPaidTaka, setSmallPaidTaka] = useState<number | "">("");
  const [smallLoading, setSmallLoading] = useState(false);

  // Notepad text input state
  const [notepadDraft, setNotepadDraft] = useState("");
  const [notepadSaving, setNotepadSaving] = useState(false);

  // Load app state
  useEffect(() => {
    const unsubscribe = listenToAppState((state) => {
      setAppState(state);
    });
    return () => unsubscribe();
  }, []);

  // Listen to season records dynamically when currentSeason changes
  useEffect(() => {
    if (appState.currentSeason) {
      const unsubscribeRecs = listenToSeasonRecords(appState.currentSeason, (data) => {
        setBigRecords(data.bigRecords);
        setSmallRecords(data.smallRecords);
      });
      const unsubscribeNotepad = listenToSeasonNotepad(appState.currentSeason, (text) => {
        setSeasonNotepad(text);
        setNotepadDraft(text);
      });
      return () => {
        unsubscribeRecs();
        unsubscribeNotepad();
      };
    } else {
      setBigRecords([]);
      setSmallRecords([]);
      setSeasonNotepad("");
      setNotepadDraft("");
    }
  }, [appState.currentSeason]);

  // Set default product type selection once loaded
  useEffect(() => {
    if (appState.productTypes?.length && !bigProdTypeId) {
      setBigProdTypeId(appState.productTypes[0].id);
    }
  }, [appState.productTypes]);

  // Form Submission - Big Record (Add Data)
  const handleBigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appState.currentSeason) {
      alert("Please configure or add a season first!");
      return;
    }
    if (!bigProdTypeId || !bigPiece || !bigPhotoFile) {
      setUploadError("All fields including a photo are required.");
      return;
    }

    setUploadProgress(true);
    setUploadError(null);

    try {
      // Find current quality target (KB), defaults to 50
      const qualityKB = appState.photoQualityKB || 50;

      // Compress photo
      const compressedBlob = await resizeAndCompressImage(bigPhotoFile, qualityKB, false);

      // Upload to Cloudinary
      const photoUrl = await uploadToCloudinary(compressedBlob);

      // Calculate price
      const selectedType = appState.productTypes?.find((t) => t.id === bigProdTypeId);
      const productValue = selectedType ? selectedType.value : 0;
      const calculatedPrice = Number(bigPiece) * productValue;

      // Save to Firebase
      await addBigRecord(
        appState.currentSeason,
        bigDate,
        bigProdTypeId,
        Number(bigPiece),
        calculatedPrice,
        photoUrl
      );

      // Reset form & close
      setBigPiece("");
      setBigPhotoFile(null);
      setShowBigForm(false);
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || "Failed to upload or save data.");
    } finally {
      setUploadProgress(false);
    }
  };

  // Form Submission - Small Record (Add Taka Paid)
  const handleSmallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appState.currentSeason) {
      alert("Please configure or add a season first!");
      return;
    }
    if (!smallPaidTaka) {
      alert("Paid amount is required.");
      return;
    }

    setSmallLoading(true);
    try {
      await addSmallRecord(appState.currentSeason, smallDate, Number(smallPaidTaka));
      setSmallPaidTaka("");
      setShowSmallForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save paid record.");
    } finally {
      setSmallLoading(false);
    }
  };

  // Save notepad entry
  const handleSaveNotepad = async () => {
    if (!appState.currentSeason) {
      alert("Please select or add a season first.");
      return;
    }
    setNotepadSaving(true);
    try {
      await updateSeasonNotepad(appState.currentSeason, notepadDraft);
    } catch (err) {
      console.error(err);
      alert("Failed to save notepad.");
    } finally {
      setNotepadSaving(false);
    }
  };

  // Calculations for sum popup
  const getCalculationSummary = () => {
    const summaryMap: { [prodId: string]: { name: string; pieces: number; price: number } } = {};

    // Initialize all existing product types
    appState.productTypes?.forEach((type) => {
      summaryMap[type.id] = { name: type.name, pieces: 0, price: 0 };
    });

    let totalPieces = 0;
    let totalPrice = 0;

    // Accumulate values
    bigRecords.forEach((record) => {
      const typeInfo = appState.productTypes?.find((t) => t.id === record.productTypeId);
      const typeVal = typeInfo ? typeInfo.value : 0;
      const typeName = typeInfo ? typeInfo.name : "Deleted Type";

      if (!summaryMap[record.productTypeId]) {
        summaryMap[record.productTypeId] = { name: typeName, pieces: 0, price: 0 };
      }

      summaryMap[record.productTypeId].pieces += record.piece;
      summaryMap[record.productTypeId].price += record.piece * typeVal;

      totalPieces += record.piece;
      totalPrice += record.piece * typeVal;
    });

    const totalPaidTaka = smallRecords.reduce((sum, rec) => sum + rec.paidTaka, 0);
    const totalReceivable = totalPrice - totalPaidTaka;

    return {
      items: Object.values(summaryMap).filter((item) => item.pieces > 0),
      totalPieces,
      totalPrice,
      totalPaidTaka,
      totalReceivable
    };
  };

  const calcSummary = getCalculationSummary();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6" id="main-user-interface">
      {/* Profile and Header Panel */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 md:p-8 shadow-sm transition-all mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm bg-gray-100 flex items-center justify-center">
              {appState.profile?.avatarUrl ? (
                <img
                  src={appState.profile.avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-2xl font-bold bg-emerald-500 text-white w-full h-full flex items-center justify-center">
                  M
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {appState.profile?.name || "Md Nazrul Islam"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Nazrul Group Income Management
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Current Active Season
            </div>
            <div className="text-lg font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
              <Layers className="h-4 w-4" />
              {appState.currentSeason || "No active season configured"}
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-100 dark:border-zinc-800" />

        {/* Dynamic Entry & calculation Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowBigForm(true)}
            className="flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer transition-all text-sm group"
            id="add-data-big-button"
          >
            <Plus className="h-5 w-5 transform transition-transform group-hover:scale-110" />
            Add Data (Regular)
          </button>

          <button
            onClick={() => setShowSmallForm(true)}
            className="flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium hover:shadow-lg hover:shadow-sky-500/10 cursor-pointer transition-all text-sm group"
            id="add-data-small-button"
          >
            <Plus className="h-4 w-4 transform transition-transform group-hover:scale-110" />
            Add Data (Paid)
          </button>

          <button
            onClick={() => setShowCalculation(true)}
            className="flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer transition-all text-sm group"
            id="calculate-button"
          >
            <Calculator className="h-5 w-5" />
            Calculate Summaries
          </button>

          <button
            onClick={() => setShowPaidHistory(true)}
            className="flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer transition-all text-sm group"
            id="paid-history-button"
          >
            <History className="h-4 w-4" />
            Paid Histories
          </button>
        </div>
      </div>

      {/* Main Income Data Table Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">৳</span> Season Ledger Records
          </h3>
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">
            {bigRecords.length} entries
          </span>
        </div>

        {/* Scrollable Table container */}
        <div className="overflow-x-auto w-full">
          {bigRecords.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <span className="text-5xl mb-4">Empty</span>
              <p className="text-gray-400 dark:text-zinc-500 text-sm">
                No ledger records saved for {appState.currentSeason || "this season"}. Add data to get started.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="ledger-table">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800 text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Product Type</th>
                  <th className="py-4 px-6 text-right">Piece</th>
                  <th className="py-4 px-6 text-right">Value (Rate)</th>
                  <th className="py-4 px-6 text-right">Total Price</th>
                  <th className="py-4 px-6 text-center">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm text-gray-700 dark:text-zinc-300">
                {bigRecords.map((record) => {
                  const typeObj = appState.productTypes?.find((t) => t.id === record.productTypeId);
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-all"
                    >
                      <td className="py-4 px-6 font-mono text-xs">{record.date}</td>
                      <td className="py-4 px-6 font-semibold text-gray-900 dark:text-zinc-200">
                        {typeObj ? typeObj.name : "Deleted Type"}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                        {record.piece}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-gray-500 dark:text-zinc-400">
                        ৳{typeObj ? typeObj.value : 0}
                      </td>
                      <td className="py-4 px-6 text-right font-bold font-mono text-gray-900 dark:text-white">
                        ৳{record.price || record.piece * (typeObj ? typeObj.value : 0)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {record.photoUrl ? (
                          <button
                            onClick={() => setActivePhotoUrl(record.photoUrl)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all font-medium cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">No Photo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Notepad Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6 max-w-full flex flex-col items-center">
        <div className="w-full flex items-center gap-2 mb-4">
          <Notebook className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white">Notepad Diary</h3>
        </div>

        <div className="w-[90%] flex flex-col gap-3">
          <textarea
            value={notepadDraft}
            onChange={(e) => setNotepadDraft(e.target.value)}
            placeholder="Write season thoughts, custom transaction logs, or remarks here..."
            className="w-full h-[100px] p-3 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-800 dark:text-zinc-200 resize-none font-sans"
            id="notepad-textarea"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveNotepad}
              disabled={notepadSaving || !appState.currentSeason}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              id="notepad-save-button"
            >
              {notepadSaving ? (
                <>
                  <Loader className="h-3 w-3 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Save Note
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-16 text-center text-xs text-gray-400 dark:text-zinc-500 pb-8 border-t border-gray-100 dark:border-zinc-800/80 pt-6">
        <p>Develope by Md Nazrul Islam</p>
      </footer>

      {/* MODALS / OVERLAYS */}

      {/* 1. Add Data (Regular / Big Record) Form Modal */}
      <AnimatePresence>
        {showBigForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900/70 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-emerald-500 text-xl">৳</span> Add Regular Income Record
                </h3>
                <button
                  onClick={() => setShowBigForm(false)}
                  className="p-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleBigSubmit} className="p-6 space-y-4">
                {uploadError && (
                  <div className="p-3 rounded-lg text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-950/30">
                    {uploadError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bigDate}
                    onChange={(e) => setBigDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Product Type
                  </label>
                  {appState.productTypes && appState.productTypes.length > 0 ? (
                    <select
                      value={bigProdTypeId}
                      onChange={(e) => setBigProdTypeId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 dark:text-white"
                    >
                      {appState.productTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} (৳{type.value} per pc)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-100 dark:border-amber-900/30">
                      No product types available. Switch to Admin Panel to add product types.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Piece Count (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Enter piece count (e.g. 150)"
                    value={bigPiece}
                    onChange={(e) => setBigPiece(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Photo Upload
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl cursor-pointer bg-gray-50 dark:bg-zinc-900/60 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
                        <UploadCloud className="h-8 w-8 text-emerald-500 mb-2" />
                        <p className="text-xs text-gray-500 dark:text-zinc-400 text-center font-medium">
                          {bigPhotoFile ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Selected: {bigPhotoFile.name}
                            </span>
                          ) : (
                            "Select photo from device / snap photo"
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
                          Auto-cropped & compressed (Target: {appState.photoQualityKB || 50} KB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setBigPhotoFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBigForm(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 hover:dark:bg-zinc-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadProgress || !bigProdTypeId}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {uploadProgress ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" /> Compressing & Saving...
                      </>
                    ) : (
                      "Save Record"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Data (Paid / Small Record) Form Modal */}
      <AnimatePresence>
        {showSmallForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900/70 w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-sky-500 text-xl">৳</span> Add Paid Taka Payment
                </h3>
                <button
                  onClick={() => setShowSmallForm(false)}
                  className="p-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSmallSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={smallDate}
                    onChange={(e) => setSmallDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Paid Taka (Amount)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Enter payment amount in ৳"
                    value={smallPaidTaka}
                    onChange={(e) => setSmallPaidTaka(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSmallForm(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 hover:dark:bg-zinc-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={smallLoading}
                    className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {smallLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Paid Taka"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Calculate Results Summary popup */}
      <AnimatePresence>
        {showCalculation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900/70 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/20">
                <h3 className="text-lg font-bold font-display text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-indigo-500" /> Season Calculations & Receivable
                </h3>
                <button
                  onClick={() => setShowCalculation(false)}
                  className="p-1 px-2 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-900 text-indigo-900 cursor-pointer select-none font-bold"
                >
                  X
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Product Type summaries */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Breakdown by Product Type
                  </h4>

                  {calcSummary.items.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-zinc-400 py-2">
                      No records logged to summarize.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                      {calcSummary.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="py-3 flex justify-between items-center text-sm"
                        >
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-zinc-100">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                              Total: {item.pieces} pieces
                            </p>
                          </div>
                          <span className="font-bold font-mono text-gray-900 dark:text-white">
                            ৳{item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-gray-100 dark:border-zinc-800" />

                {/* Overall sum indicators */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/60">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-zinc-500">
                      Total Piece Count
                    </span>
                    <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {calcSummary.totalPieces} pcs
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/60">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-zinc-500">
                      Total Price (Sum)
                    </span>
                    <p className="text-lg font-bold font-mono text-gray-900 dark:text-white mt-1">
                      ৳{calcSummary.totalPrice}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/60">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-zinc-500">
                      Total Taka Paid
                    </span>
                    <p className="text-lg font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                      ৳{calcSummary.totalPaidTaka}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/20">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500/80 dark:text-indigo-400/80">
                      Total পাওনা (Receivable)
                    </span>
                    <p className="text-xl font-black font-mono text-indigo-700 dark:text-indigo-400 mt-1">
                      ৳{calcSummary.totalReceivable}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setShowCalculation(false)}
                    className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs cursor-pointer transition-all"
                  >
                    Dismiss Calculations
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Taka Paid History list popup */}
      <AnimatePresence>
        {showPaidHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900/70 w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-sky-500" /> Payment Received History
                </h3>
                <button
                  onClick={() => setShowPaidHistory(false)}
                  className="p-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 font-bold select-none cursor-pointer"
                >
                  X
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {smallRecords.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400 dark:text-zinc-500">
                    No payment records logged this season.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                    {smallRecords.map((item) => (
                      <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-gray-600 dark:text-zinc-300">
                            {item.date}
                          </span>
                        </div>
                        <span className="font-bold font-mono text-sky-600 dark:text-sky-400">
                          ৳{item.paidTaka} Received
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-6 border-t border-gray-100 dark:border-zinc-800/80 flex justify-between items-center mt-4">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest font-semibold">
                      Grand Total Paid
                    </p>
                    <p className="text-base font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                      ৳{smallRecords.reduce((s, r) => s + r.paidTaka, 0)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPaidHistory(false)}
                    className="px-5 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium text-xs cursor-pointer transition-all border border-gray-200 dark:border-zinc-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Custom image lightbox lightbox / popup view */}
      <AnimatePresence>
        {activePhotoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-lg w-full bg-zinc-950 rounded-2xl overflow-hidden p-6 shadow-2xl flex flex-col items-center"
            >
              <button
                onClick={() => setActivePhotoUrl(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full cursor-pointer transition-all flex items-center justify-center select-none font-bold"
              >
                X
              </button>

              <div className="w-full flex items-center justify-center mt-6">
                <img
                  src={activePhotoUrl}
                  alt="Ledger Snapped Ledger"
                  className="max-h-[60vh] max-w-full rounded-lg object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 text-center text-zinc-400 text-xs">
                Cloudinary Compressed Photo (৳ Ledger Asset)
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
