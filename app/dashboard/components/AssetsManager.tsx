"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Laptop,
  Search,
  Filter,
  Plus,
  X,
  SlidersHorizontal,
  Calendar,
  DollarSign,
  MapPin,
  ClipboardList,
  Wrench,
  UserCheck,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle
} from "lucide-react";

interface CategoryField {
  name: string;
  label: string;
  type: "text" | "number" | "date";
  required: boolean;
}

interface Category {
  id: number;
  CategoryName: {
    name: string;
    fields?: CategoryField[];
  };
}

interface Asset {
  id: number;
  Name: string;
  Category: string;
  tag: string;
  "Serial Number": string;
  "Acquisition Date": string;
  "Acquisition Cost": string;
  Condition: string;
  Location: string;
  SharedBookable: string;
  Status: string;
  orgid: string;
  assetid: string;
  CustomFields?: Record<string, any>;
}

interface AssetsManagerProps {
  orgId: string;
  // Trigger update to stats in parent when an asset is registered
  onAssetAdded?: () => void;
}

export default function AssetsManager({ orgId, onAssetAdded }: AssetsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    category: "",
    serialNumber: "",
    acquisitionDate: new Date().toISOString().split("T")[0],
    acquisitionCost: "",
    condition: "New",
    location: "Main HQ",
    sharedBookable: "Bookable",
    status: "Available"
  });

  // Dynamic Custom fields values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Categories
      const { data: catData, error: catErr } = await supabase
        .from("orgCategories")
        .select("*")
        .eq("orgID", orgId);
      if (catErr) throw catErr;
      setCategories(catData || []);

      // Set default category in form if available
      if (catData && catData.length > 0 && !form.category) {
        setForm(prev => ({ ...prev, category: catData[0].CategoryName.name }));
      }

      // 2. Fetch Assets
      const { data: assetData, error: assetErr } = await supabase
        .from("asset")
        .select("*")
        .eq("orgid", orgId);
      if (assetErr) throw assetErr;
      setAssets(assetData || []);

    } catch (err: any) {
      setError(err.message || "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Find dynamic schema fields for the selected category
  const selectedCategoryObj = categories.find(
    (c) => c.CategoryName.name === form.category
  );
  const customFieldsSchema = selectedCategoryObj?.CategoryName.fields || [];

  const handleCategoryChange = (catName: string) => {
    setForm({ ...form, category: catName });
    // Reset custom fields values
    setCustomFieldValues({});
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // 1. Auto-generate asset tag (e.g. AF-0001, AF-0002, etc.)
      const nextNum = String(assets.length + 1).padStart(4, "0");
      const generatedTag = `AF-${nextNum}`;

      const payload = {
        Name: form.name.trim(),
        Category: form.category,
        tag: generatedTag,
        "Serial Number": form.serialNumber.trim(),
        "Acquisition Date": form.acquisitionDate,
        "Acquisition Cost": form.acquisitionCost.trim(),
        Condition: form.condition,
        Location: form.location.trim(),
        SharedBookable: form.sharedBookable,
        Status: form.status,
        orgid: orgId,
        assetid: crypto.randomUUID(),
        CustomFields: customFieldValues
      };

      const { error: insertErr } = await supabase.from("asset").insert([payload]);
      if (insertErr) throw insertErr;

      triggerSuccess(`Asset "${payload.Name}" successfully registered with tag ${generatedTag}.`);
      setIsModalOpen(false);
      
      // Reset form
      setForm({
        name: "",
        category: categories[0]?.CategoryName.name || "",
        serialNumber: "",
        acquisitionDate: new Date().toISOString().split("T")[0],
        acquisitionCost: "",
        condition: "New",
        location: "Main HQ",
        sharedBookable: "Bookable",
        status: "Available"
      });
      setCustomFieldValues({});

      if (onAssetAdded) {
        onAssetAdded();
      }

      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register asset.");
    }
  };

  // Status Badge styles helper
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("available")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (s.includes("allocated")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    } else if (s.includes("maintenance")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    } else if (s.includes("lost") || s.includes("disposed")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-zinc-50 text-zinc-650 border-zinc-200";
  };

  // Filter logic
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset["Serial Number"] && asset["Serial Number"].toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory ? asset.Category === filterCategory : true;
    const matchesStatus = filterStatus ? asset.Status === filterStatus : true;
    const matchesLocation = filterLocation ? asset.Location.toLowerCase().includes(filterLocation.toLowerCase()) : true;

    return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Action Header & Search Filters */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-650" />
            <h3 className="font-extrabold text-zinc-900 text-sm uppercase tracking-wide">Search & Filter Assets</h3>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Asset
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Asset Name, Tag, or Serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.CategoryName.name}>
                  {c.CategoryName.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Allocated">Allocated</option>
              <option value="Reserved">Reserved</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Lost">Lost</option>
              <option value="Retired">Retired</option>
              <option value="Disposed">Disposed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Assets List */}
        <div className={`bg-white border border-zinc-200/80 rounded-xl shadow-sm overflow-hidden ${selectedAsset ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-6 py-4">Asset Tag</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-450 font-semibold text-sm">
                    No assets match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`hover:bg-zinc-50/50 transition-colors text-sm text-zinc-700 cursor-pointer ${
                      selectedAsset?.id === asset.id ? "bg-indigo-50/40 hover:bg-indigo-50/50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-indigo-700">{asset.tag}</td>
                    <td className="px-6 py-4 font-bold text-zinc-900">{asset.Name}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      {asset.Category}
                    </td>
                    <td className="px-6 py-4 text-xs">{asset.Location}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 border text-xs font-bold rounded-full ${getStatusBadge(asset.Status)}`}>
                        {asset.Status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Asset Details Drawer */}
        {selectedAsset && (
          <div className="bg-white border border-zinc-200/80 rounded-xl p-6 shadow-sm flex flex-col gap-5 animate-in slide-in-from-right duration-250 lg:col-span-1">
            <div className="flex justify-between items-start border-b border-zinc-150 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-700">{selectedAsset.tag}</span>
                <h4 className="font-extrabold text-zinc-900 text-base leading-tight mt-0.5">{selectedAsset.Name}</h4>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-650 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-50 border border-zinc-200/40 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Category</span>
                  <span className="font-bold text-zinc-800">{selectedAsset.Category}</span>
                </div>
                <div className="bg-zinc-50 border border-zinc-200/40 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Serial Number</span>
                  <span className="font-mono text-zinc-800 truncate" title={selectedAsset["Serial Number"]}>
                    {selectedAsset["Serial Number"] || "--"}
                  </span>
                </div>
                <div className="bg-zinc-50 border border-zinc-200/40 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Acquisition Cost</span>
                  <span className="font-bold text-zinc-800">{selectedAsset["Acquisition Cost"] ? `$${selectedAsset["Acquisition Cost"]}` : "--"}</span>
                </div>
                <div className="bg-zinc-50 border border-zinc-200/40 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Acquisition Date</span>
                  <span className="font-medium text-zinc-850">{selectedAsset["Acquisition Date"] || "--"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-400">Condition:</span>
                  <span className="font-bold text-zinc-800">{selectedAsset.Condition}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-400">Location:</span>
                  <span className="font-bold text-zinc-855">{selectedAsset.Location}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-400">Type:</span>
                  <span className="font-bold text-zinc-800">{selectedAsset.SharedBookable}</span>
                </div>
              </div>

              {/* Dynamic Category Specific Values */}
              {selectedAsset.CustomFields && Object.keys(selectedAsset.CustomFields).length > 0 && (
                <div className="border border-zinc-200/60 rounded-xl p-3 bg-indigo-50/15 flex flex-col gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Category Specific Fields
                  </span>
                  <div className="flex flex-col gap-1.5 text-xs text-zinc-700">
                    {Object.entries(selectedAsset.CustomFields).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="capitalize font-semibold text-zinc-500">{key.replace(/_/g, " ")}:</span>
                        <span className="font-bold text-zinc-800">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History Section */}
              <div className="border-t border-zinc-150 pt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Asset History Log</span>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200/50 flex gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-zinc-800">Acquisition</p>
                      <p className="text-zinc-450 text-[10px]">Registered at {selectedAsset.Location}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* --- REGISTER ASSET MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-650" />
                Register New Asset
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-650 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterAsset} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Asset Name / Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Latitude 5420"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-white text-zinc-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.CategoryName.name}>
                        {c.CategoryName.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Serial Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-82910398A"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-white text-zinc-900 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Acquisition Date</label>
                  <input
                    type="date"
                    required
                    value={form.acquisitionDate}
                    onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-white text-zinc-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Acquisition Cost ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1200"
                    value={form.acquisitionCost}
                    onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-white text-zinc-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                  >
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4th Floor IT Lab"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-white text-zinc-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Usage Model</label>
                  <select
                    value={form.sharedBookable}
                    onChange={(e) => setForm({ ...form, sharedBookable: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                  >
                    <option value="Shared">Shared</option>
                    <option value="Bookable">Bookable</option>
                    <option value="Assigned">Assigned</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                  >
                    <option value="Available">Available</option>
                    <option value="Allocated">Allocated</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Lost">Lost</option>
                    <option value="Retired">Retired</option>
                    <option value="Disposed">Disposed</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Category Specific Inputs */}
              {customFieldsSchema.length > 0 && (
                <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 flex flex-col gap-3 animate-in fade-in duration-200">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category-Specific Specifications</span>
                  <div className="grid grid-cols-2 gap-3">
                    {customFieldsSchema.map((field) => (
                      <div key={field.name} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-650">{field.label}</label>
                        <input
                          type={field.type}
                          required={field.required}
                          value={customFieldValues[field.name] || ""}
                          onChange={(e) => setCustomFieldValues({
                            ...customFieldValues,
                            [field.name]: e.target.value
                          })}
                          className="px-2.5 py-1.5 border border-zinc-200 rounded text-xs bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-150 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 font-semibold rounded-lg text-sm hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
