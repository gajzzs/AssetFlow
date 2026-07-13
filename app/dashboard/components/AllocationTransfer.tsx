"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  ArrowLeftRight,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  History
} from "lucide-react";

interface AllocationTransferProps {
  orgId: string;
}

interface Asset {
  id: number;
  assetid: string;
  Name: string;
  tag: string;
  Status: string;
  Location: string;
}

interface Employee {
  id: number;
  uuid: string;
  Name: string;
  Department: string | null;
}

interface Allocation {
  id: number;
  employee_name: string;
  department: string | null;
  status: string;
  created_at: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  return_condition: string | null;
}

export default function AllocationTransfer({ orgId }: AllocationTransferProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<Allocation[]>([]);
  
  // Current allocation
  const [currentAllocation, setCurrentAllocation] = useState<Allocation | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Assets
      const { data: assetData, error: assetErr } = await supabase
        .from("asset")
        .select("id, assetid, Name, tag, Status, Location")
        .eq("orgid", orgId);
      if (assetErr) throw assetErr;
      setAssets(assetData || []);

      // Fetch Employees
      const { data: empData, error: empErr } = await supabase
        .from("orgEmployee")
        .select("id, uuid, Name, Department")
        .eq("orgID", orgId)
        .eq("Status", true); // Only active employees
      if (empErr) throw empErr;
      setEmployees(empData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const loadAssetDetails = async (asset: Asset) => {
    setSelectedAsset(asset);
    setSelectedEmployee("");
    setExpectedReturnDate("");
    setTransferReason("");
    setCurrentAllocation(null);
    setHistory([]);
    setError(null);

    try {
      const { data: allocData, error: allocErr } = await supabase
        .from("asset_allocations")
        .select("*")
        .eq("assetid", asset.assetid)
        .order("created_at", { ascending: false });

      if (allocErr) throw allocErr;

      const historyData = allocData || [];
      setHistory(historyData);

      const activeAlloc = historyData.find(a => a.status === "Active" || a.status === "Overdue");
      if (activeAlloc) {
        setCurrentAllocation(activeAlloc);
      }
    } catch (err: any) {
      setError("Failed to load asset allocation details.");
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !selectedEmployee) return;

    try {
      const emp = employees.find(e => e.uuid === selectedEmployee);
      if (!emp) return;

      const payload = {
        assetid: selectedAsset.assetid,
        asset_tag: selectedAsset.tag,
        asset_name: selectedAsset.Name,
        employee_uuid: emp.uuid,
        employee_name: emp.Name,
        department: emp.Department,
        expected_return_date: expectedReturnDate || null,
        status: "Active",
        orgid: orgId
      };

      const { error: insertErr } = await supabase.from("asset_allocations").insert([payload]);
      if (insertErr) throw insertErr;

      // Update asset status
      await supabase
        .from("asset")
        .update({ Status: "Allocated" })
        .eq("assetid", selectedAsset.assetid);

      triggerSuccess(`Asset successfully allocated to ${emp.Name}`);
      
      // Reload asset to show new state
      await loadData();
      await loadAssetDetails({ ...selectedAsset, Status: "Allocated" });
    } catch (err: any) {
      setError(err.message || "Failed to allocate asset.");
    }
  };

  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !currentAllocation || !selectedEmployee) return;

    try {
      const toEmp = employees.find(e => e.uuid === selectedEmployee);
      if (!toEmp) return;

      const payload = {
        assetid: selectedAsset.assetid,
        asset_tag: selectedAsset.tag,
        asset_name: selectedAsset.Name,
        from_employee_uuid: currentAllocation.employee_uuid, // Wait, I need to add this to the select
        from_employee_name: currentAllocation.employee_name,
        to_employee_uuid: toEmp.uuid,
        to_employee_name: toEmp.Name,
        reason: transferReason,
        status: "Requested",
        orgid: orgId
      };

      const { error: insertErr } = await supabase.from("asset_transfer_requests").insert([payload]);
      if (insertErr) throw insertErr;

      triggerSuccess(`Transfer request sent to ${toEmp.Name}`);
      setSelectedEmployee("");
      setTransferReason("");
    } catch (err: any) {
      setError(err.message || "Failed to submit transfer request.");
    }
  };


  const filteredAssets = assets.filter((asset) => {
    return (
      asset.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.tag.toLowerCase().includes(searchTerm.toLowerCase())
    );
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Asset Selection List */}
        <div className="bg-white border border-zinc-200/80 rounded-xl shadow-sm flex flex-col h-[70vh] lg:col-span-1">
          <div className="p-4 border-b border-zinc-200/80">
            <h3 className="font-extrabold text-zinc-900 text-sm uppercase tracking-wide mb-3">Select Asset</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search asset tag or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs bg-zinc-50 focus:bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : filteredAssets.length === 0 ? (
              <p className="text-center text-zinc-400 text-xs mt-4">No assets found</p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredAssets.map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => loadAssetDetails(asset)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex justify-between items-center ${
                      selectedAsset?.id === asset.id
                        ? "bg-indigo-50 border-indigo-200"
                        : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-indigo-700">{asset.tag}</p>
                      <p className="font-bold text-zinc-900 text-sm truncate">{asset.Name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      asset.Status === "Allocated" ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                      asset.Status === "Available" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      "bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}>
                      {asset.Status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedAsset ? (
            <>
              {/* Info Header */}
              <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-mono font-bold text-indigo-700">{selectedAsset.tag}</p>
                <h2 className="text-xl font-extrabold text-zinc-900">{selectedAsset.Name}</h2>
                <div className="flex gap-3 mt-2 text-xs font-semibold text-zinc-500">
                  <span className="flex items-center gap-1"><ArrowLeftRight className="w-3.5 h-3.5" /> {selectedAsset.Status}</span>
                </div>
              </div>

              {/* Dynamic Action Area based on status */}
              {currentAllocation ? (
                // ASSET IS ALLOCATED - SHOW TRANSFER UI
                <div className="bg-rose-50/30 border border-rose-200/60 rounded-xl p-6 shadow-sm flex flex-col gap-4">
                  <div className="p-3 bg-rose-100/50 border border-rose-200 text-rose-800 rounded-lg text-sm font-semibold flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p>Already Allocated to <span className="font-bold">{currentAllocation.employee_name}</span> ({currentAllocation.department || "No Dept"})</p>
                      <p className="text-rose-600 text-xs mt-1">Direct re-allocation is blocked. Submit a transfer request below.</p>
                    </div>
                  </div>

                  <form onSubmit={handleTransferRequest} className="bg-white border border-rose-100 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
                      <ArrowLeftRight className="w-4 h-4 text-rose-600" />
                      Transfer Request
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase">From</label>
                        <input type="text" disabled value={currentAllocation.employee_name} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50 text-zinc-500 cursor-not-allowed" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase">To (Select Employee)</label>
                        <select 
                          required
                          value={selectedEmployee}
                          onChange={e => setSelectedEmployee(e.target.value)}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        >
                          <option value="" disabled>Select Employee...</option>
                          {employees.filter(e => e.Name !== currentAllocation.employee_name).map(emp => (
                            <option key={emp.uuid} value={emp.uuid}>{emp.Name} ({emp.Department || "No Dept"})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Reason</label>
                      <textarea 
                        rows={3}
                        required
                        placeholder="Why is this transfer needed?"
                        value={transferReason}
                        onChange={e => setTransferReason(e.target.value)}
                        className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                      />
                    </div>

                    <button type="submit" className="self-end px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-sm shadow-sm transition-colors">
                      Submit Request
                    </button>
                  </form>
                </div>
              ) : selectedAsset.Status !== "Available" ? (
                // ASSET IS NOT AVAILABLE FOR OTHER REASONS
                 <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                    <Clock className="w-8 h-8 text-amber-500" />
                    <p className="font-bold text-amber-800">Asset Unavailable</p>
                    <p className="text-xs text-amber-600">This asset's current status is "{selectedAsset.Status}" and cannot be allocated right now.</p>
                 </div>
              ) : (
                // ASSET IS AVAILABLE - SHOW ALLOCATE UI
                <form onSubmit={handleAllocate} className="bg-white border border-zinc-200/80 rounded-xl p-6 shadow-sm flex flex-col gap-5">
                  <h3 className="font-bold text-zinc-900 border-b border-zinc-150 pb-2">Allocate Asset</h3>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Assign To</label>
                      <select 
                        required
                        value={selectedEmployee}
                        onChange={e => setSelectedEmployee(e.target.value)}
                        className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="" disabled>Select Employee / Department...</option>
                        {employees.map(emp => (
                          <option key={emp.uuid} value={emp.uuid}>{emp.Name} ({emp.Department || "No Dept"})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Expected Return (Optional)</label>
                      <input 
                        type="date"
                        value={expectedReturnDate}
                        onChange={e => setExpectedReturnDate(e.target.value)}
                        className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button type="submit" className="self-end mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Allocate Asset
                  </button>
                </form>
              )}

              {/* History Section */}
              <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-zinc-900 text-sm uppercase tracking-wide flex items-center gap-2 mb-4 border-b border-zinc-150 pb-2">
                  <History className="w-4 h-4 text-indigo-650" />
                  Allocation History
                </h4>
                
                {history.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">No allocation history available for this asset.</p>
                ) : (
                  <div className="flex flex-col gap-3 text-xs">
                    {history.map((record, idx) => (
                      <div key={idx} className="flex gap-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                        <div className="flex-1">
                          <p className="font-bold text-zinc-800">
                            {record.status === "Active" ? "Allocated to" : "Returned by"} <span className="text-indigo-700">{record.employee_name}</span> - {record.department || "No Dept"}
                          </p>
                          <p className="text-zinc-500 mt-0.5">
                            {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {record.actual_return_date && ` • Condition: ${record.return_condition || "Unknown"}`}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-md font-bold self-start ${
                          record.status === "Active" ? "bg-indigo-100 text-indigo-700" :
                          record.status === "Returned" ? "bg-zinc-200 text-zinc-700" :
                          "bg-rose-100 text-rose-700"
                        }`}>
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-zinc-200/80 rounded-xl p-12 shadow-sm h-full flex flex-col items-center justify-center text-center gap-3">
              <ArrowLeftRight className="w-12 h-12 text-zinc-300" />
              <div>
                <p className="font-bold text-zinc-700">No Asset Selected</p>
                <p className="text-sm text-zinc-500">Select an asset from the list to view its allocation status or request a transfer.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
