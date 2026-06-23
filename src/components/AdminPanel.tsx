import React, { useState, useEffect } from "react";
import {
  listenToAppState,
  listenToSeasonRecords,
  updateProfile,
  updatePhotoQuality,
  addSeason,
  selectSeason,
  deleteSeason,
  addProductType,
  updateProductType,
  deleteProductType,
  updateBigRecord,
  deleteBigRecord,
  updateSmallRecord,
  deleteSmallRecord
} from "../lib/firebase";
import { resizeAndCompressImage, uploadToCloudinary } from "../lib/cloudinary";
import { AppState, ProductType, BigRecord, SmallRecord } from "../types";
import {
  User,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Image as ImageIcon,
  Save,
  Check,
  RefreshCw,
  ArrowRight,
  Database,
  Briefcase,
  X,
  Loader
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminPanel() {
  const [appState, setAppState] = useState<Partial<AppState>>({
    currentSeason: "",
    seasons: [],
    photoQualityKB: 50,
    profile: { name: "Md Nazrul Islam", avatarUrl: "" },
    productTypes: [],
    notepad: ""
  });

  const [bigRecords, setBigRecords] = useState<BigRecord[]>([]);
  const [smallRecords, setSmallRecords] = useState<SmallRecord[]>([]);

  // Profile Form state
  const [profileName, setProfileName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Season state
  const [newSeasonName, setNewSeasonName] = useState("");
  const [seasonLoading, setSeasonLoading] = useState(false);

  // Quality settings state
  const [qualityValue, setQualityValue] = useState<number | "">("");
  const [qualitySaving, setQualitySaving] = useState(false);

  // Product Type state
  const [prodTypeName, setProdTypeName] = useState("");
  const [prodTypeValue, setProdTypeValue] = useState<number | "">("");
  const [prodTypeSaving, setProdTypeSaving] = useState(false);

  // Editing state variables
  const [editingProdType, setEditingProdType] = useState<ProductType | null>(null);
  const [editProdTypeName, setEditProdTypeName] = useState("");
  const [editProdTypeValue, setEditProdTypeValue] = useState<number | "">("");

  const [editingBig, setEditingBig] = useState<BigRecord | null>(null);
  const [editBigDate, setEditBigDate] = useState("");
  const [editBigPiece, setEditBigPiece] = useState<number | "">("");
  const [editBigProdTypeId, setEditBigProdTypeId] = useState("");

  const [editingSmall, setEditingSmall] = useState<SmallRecord | null>(null);
  const [editSmallDate, setEditSmallDate] = useState("");
  const [editSmallPaid, setEditSmallPaid] = useState<number | "">("");

  // Listen to app state
  useEffect(() => {
    const unsubscribe = listenToAppState((state) => {
      setAppState(state);
      setProfileName(state.profile?.name || "Md Nazrul Islam");
      setQualityValue(state.photoQualityKB || 50);
    });
    return () => unsubscribe();
  }, []);

  // Listen to records for the current season
  useEffect(() => {
    if (appState.currentSeason) {
      const unsubscribeRecs = listenToSeasonRecords(appState.currentSeason, (data) => {
        setBigRecords(data.bigRecords);
        setSmallRecords(data.smallRecords);
      });
      return () => unsubscribeRecs();
    } else {
      setBigRecords([]);
      setSmallRecords([]);
    }
  }, [appState.currentSeason]);

  // Profile Save handler
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);

    try {
      let finalAvatarUrl = appState.profile?.avatarUrl || "";

      if (avatarFile) {
        // Compress avatar to 1:1 ratio
        const compressedBlob = await resizeAndCompressImage(avatarFile, 50, true);
        finalAvatarUrl = await uploadToCloudinary(compressedBlob);
      }

      await updateProfile(profileName, finalAvatarUrl);
      setProfileSuccess(true);
      setAvatarFile(null);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Add Season handler
  const handleAddSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;
    setSeasonLoading(true);
    try {
      await addSeason(newSeasonName.trim());
      setNewSeasonName("");
    } catch (err) {
      console.error(err);
      alert("Failed to add season.");
    } finally {
      setSeasonLoading(false);
    }
  };

  // Save Photo Quality config
  const handleQualitySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualityValue || Number(qualityValue) <= 0) return;
    setQualitySaving(true);
    try {
      await updatePhotoQuality(Number(qualityValue));
      alert("Photo Quality settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save quality settings.");
    } finally {
      setQualitySaving(false);
    }
  };

  // Add Product Type
  const handleAddProductType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTypeName.trim() || !prodTypeValue) return;
    setProdTypeSaving(true);
    try {
      await addProductType(prodTypeName.trim(), Number(prodTypeValue));
      setProdTypeName("");
      setProdTypeValue("");
    } catch (err) {
      console.error(err);
      alert("Failed to add custom product type.");
    } finally {
      setProdTypeSaving(false);
    }
  };

  // Save Product Type Edit
  const handleSaveProdTypeEdit = async () => {
    if (!editingProdType || !editProdTypeName.trim() || !editProdTypeValue) return;
    try {
      await updateProductType(editingProdType.id, editProdTypeName.trim(), Number(editProdTypeValue));
      setEditingProdType(null);
    } catch (err) {
      console.error(err);
      alert("Failed to edit product type.");
    }
  };

  // Save Regular Record Edit
  const handleSaveBigEdit = async () => {
    if (!editingBig || !appState.currentSeason || !editBigPiece) return;
    try {
      const typeInfo = appState.productTypes?.find((t) => t.id === editBigProdTypeId);
      const val = typeInfo ? typeInfo.value : 0;
      const updatedPrice = Number(editBigPiece) * val;

      await updateBigRecord(appState.currentSeason, editingBig.id, {
        date: editBigDate,
        productTypeId: editBigProdTypeId,
        piece: Number(editBigPiece),
        price: updatedPrice
      });
      setEditingBig(null);
    } catch (err) {
      console.error(err);
      alert("Failed to edit records row.");
    }
  };

  // Save Paid Record Edit
  const handleSaveSmallEdit = async () => {
    if (!editingSmall || !appState.currentSeason || !editSmallPaid) return;
    try {
      await updateSmallRecord(appState.currentSeason, editingSmall.id, {
        date: editSmallDate,
        paidTaka: Number(editSmallPaid)
      });
      setEditingSmall(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update paid records row.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3" id="admin-panel-interface">
      {/* Admin header profile section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 sm:p-6 md:p-8 shadow-xs transition-all mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md bg-gray-50 flex items-center justify-center border-2 border-indigo-500">
            {appState.profile?.avatarUrl ? (
              <img
                src={appState.profile.avatarUrl}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="h-10 w-10 text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black font-display text-gray-950 dark:text-white flex items-center gap-2">
              <span className="text-indigo-500 font-normal">৳</span> Admin Studio Portal
            </h2>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
              Welcome back, {appState.profile?.name || "Md Nazrul Islam"}
            </p>
          </div>
        </div>

        <hr className="my-6 border-gray-100 dark:border-zinc-800" />

        {/* 1. Update Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
              <Settings className="h-5 w-5 text-indigo-500" /> Profile Configurations
            </h3>
            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileSuccess && (
                <div className="p-3 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100">
                  Profile updated successfully!
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-2">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-2">
                  Choose Profile Picture File (1:1 Ratio Crop)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAvatarFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-gray-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:dark:bg-indigo-950/40 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {profileSaving ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" /> Compressing & Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Profile
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 2. Photo quality & settings configurations */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
              <ImageIcon className="h-5 w-5 text-indigo-500" /> Photo Properties & Quality Limits
            </h3>
            <form onSubmit={handleQualitySave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-2">
                  Asset Compression Target (KB)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    required
                    value={qualityValue}
                    onChange={(e) =>
                      setQualityValue(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-32 px-4 py-2 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  />
                  <span className="text-sm font-semibold text-gray-500 dark:text-zinc-400">
                    KB limit per photo uploaded.
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-2">
                  Photos uploaded by regular users will automatically crop to an elegant taller 1:1.2 vertical aspect ratio, and adjust resolution quality iteratively until under this limit.
                </p>
              </div>

              <button
                type="submit"
                disabled={qualitySaving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {qualitySaving ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Quality"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>      {/* seasons, lists, and folders config section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4">
        {/* Season management list */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 sm:p-5 shadow-xs">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
            <Layers className="h-4.5 w-4.5 text-emerald-500" /> Active Seasons & Folders
          </h3>

          <form onSubmit={handleAddSeason} className="flex gap-2 mb-6">
            <input
              type="text"
              required
              placeholder="e.g. Winter 2026-A"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={seasonLoading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>

          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Season Listing
          </h4>

          {appState.seasons?.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-zinc-500">No seasons available yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {appState.seasons?.map((season) => {
                const isActive = appState.currentSeason === season;
                return (
                  <div
                    key={season}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
                        : "bg-gray-50 dark:bg-zinc-900/40 border-gray-100 dark:border-zinc-805"
                    }`}
                  >
                    <span className="font-bold dark:text-white truncate pr-2">{season}</span>
                    <div className="flex gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => selectSeason(season)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-md cursor-pointer transition-all"
                        >
                          Select
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (
                            confirm(`Are you sure you want to delete season "${season}"? It will wipe out all of its saved data recursively from Firebase.`)
                          ) {
                            deleteSeason(season);
                          }
                        }}
                        className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Type rate settings section */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 sm:p-5 shadow-xs">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
            <Database className="h-4.5 w-4.5 text-indigo-500" /> Product Type Rates & Scales
          </h3>

          <form onSubmit={handleAddProductType} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              required
              placeholder="Type Name"
              value={prodTypeName}
              onChange={(e) => setProdTypeName(e.target.value)}
              className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
            />
            <div className="flex gap-2 sm:w-44 shrink-0">
              <input
                type="number"
                min="1"
                required
                placeholder="Rate (৳)"
                value={prodTypeValue}
                onChange={(e) =>
                  setProdTypeValue(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={prodTypeSaving}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-all gap-1"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </form>

          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Available Rates
          </h4>

          {appState.productTypes?.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-zinc-500">No product types created yet.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {appState.productTypes?.map((prodType) => (
                <div
                  key={prodType.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 text-sm"
                >
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">{prodType.name}</span>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 ml-2 font-mono">
                      (৳{prodType.value} / pc)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProdType(prodType);
                        setEditProdTypeName(prodType.name);
                        setEditProdTypeValue(prodType.value);
                      }}
                      className="p-1 px-2 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 hover:dark:bg-zinc-700/60 transition-all text-xs cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete product type "${prodType.name}"?`)) {
                          deleteProductType(prodType.id);
                        }
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ledger lists, edit, & delete section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6 mb-8">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 mb-6">
          <span className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500" /> Edit & Delete Ledger Entries
          </span>
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
            {appState.currentSeason || "No active season"}
          </span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Regular Records panel */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-emerald-500" /> Regular Ledger Items
            </h4>

            {bigRecords.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500 border border-dashed border-gray-200 dark:border-zinc-850 rounded-xl">
                No items recorded.
              </p>
            ) : (
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-2">
                {bigRecords.map((rec) => {
                  const typeObj = appState.productTypes?.find((t) => t.id === rec.productTypeId);
                  return (
                    <div
                      key={rec.id}
                      className="p-3 border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/30 rounded-xl flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {typeObj ? typeObj.name : "Unknown Product"} ({rec.piece} pcs)
                        </p>
                        <p className="text-gray-500 dark:text-zinc-400 font-mono">
                          {rec.date} • Price: ৳{rec.price}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingBig(rec);
                            setEditBigDate(rec.date);
                            setEditBigPiece(rec.piece);
                            setEditBigProdTypeId(rec.productTypeId);
                          }}
                          className="p-1 px-[7.5px] rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 text-[10px] uppercase font-bold"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this row entry permanently?")) {
                              deleteBigRecord(appState.currentSeason!, rec.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 bg-gray-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Paid history records panel */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-500" /> Taka Paid Logs
            </h4>

            {smallRecords.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500 border border-dashed border-gray-200 dark:border-zinc-855 rounded-xl">
                No logs recorded.
              </p>
            ) : (
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-2">
                {smallRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/30 rounded-xl flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ৳{rec.paidTaka} Paid Amount
                      </p>
                      <p className="text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
                        {rec.date}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingSmall(rec);
                          setEditSmallDate(rec.date);
                          setEditSmallPaid(rec.paidTaka);
                        }}
                        className="p-1 px-[7.5px] rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 text-[10px] uppercase font-bold"
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this paid log permanently?")) {
                            deleteSmallRecord(appState.currentSeason!, rec.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-rose-600 bg-gray-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-16 text-center text-xs text-gray-400 dark:text-zinc-500 pb-8 border-t border-gray-100 dark:border-zinc-800/80 pt-6">
        <p>Develope by Md Nazrul Islam</p>
      </footer>

      {/* EDIT MODAL DIALOGS */}

      {/* 1. Edit Product Type Modal */}
      <AnimatePresence>
        {editingProdType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900/70 w-full max-w-sm rounded-2xl shadow-xl p-6"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Edit Rate Scale</h4>
                <button
                  onClick={() => setEditingProdType(null)}
                  className="p-1 px-2 hover:bg-gray-100 rounded text-gray-500 font-bold"
                >
                  X
                </button>
              </div>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editProdTypeName}
                    onChange={(e) => setEditProdTypeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-850 rounded-lg text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Rate (৳ per pc)
                  </label>
                  <input
                    type="number"
                    value={editProdTypeValue}
                    onChange={(e) =>
                      setEditProdTypeValue(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-850 rounded-lg text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setEditingProdType(null)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-zinc-800 text-xs rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProdTypeEdit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-medium"
                >
                  Save Quality edits
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Edit Big Record Modal */}
      <AnimatePresence>
        {editingBig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900/70 w-full max-w-sm rounded-2xl shadow-xl p-6"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Edit Ledgers row</h4>
                <button
                  onClick={() => setEditingBig(null)}
                  className="p-1 px-2 hover:bg-gray-100 rounded text-gray-500 font-bold"
                >
                  X
                </button>
              </div>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editBigDate}
                    onChange={(e) => setEditBigDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-850 rounded-lg text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Product Type
                  </label>
                  <select
                    value={editBigProdTypeId}
                    onChange={(e) => setEditBigProdTypeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-850 rounded-lg text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  >
                    {appState.productTypes?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (৳{t.value})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Pieces count
                  </label>
                  <input
                    type="number"
                    value={editBigPiece}
                    onChange={(e) =>
                      setEditBigPiece(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-850 rounded-lg text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setEditingBig(null)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-zinc-800 text-xs rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBigEdit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg"
                >
                  Apply changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Edit Small Record Modal */}
      <AnimatePresence>
        {editingSmall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900/70 w-full max-w-sm rounded-2xl shadow-xl p-6"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Modify Paid amount</h4>
                <button
                  onClick={() => setEditingSmall(null)}
                  className="p-1 px-2 hover:bg-gray-100 rounded text-gray-500 font-bold"
                >
                  X
                </button>
              </div>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editSmallDate}
                    onChange={(e) => setEditSmallDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-850 rounded-lg text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Paid Taka (Amount)
                  </label>
                  <input
                    type="number"
                    value={editSmallPaid}
                    onChange={(e) =>
                      setEditSmallPaid(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-850 rounded-lg text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setEditingSmall(null)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-zinc-800 text-xs rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSmallEdit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg"
                >
                  Apply changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
