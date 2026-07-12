"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Clipboard,
  Check
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    type: "create" | "join";
    orgName?: string;
    orgId: string;
    email: string;
    role: string;
    status: string;
  } | null>(null);
  
  // Create Org Form State
  const [orgName, setOrgName] = useState("");
  const [generatedOrgId, setGeneratedOrgId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Existing Org Form State
  const [joinOrgId, setJoinOrgId] = useState("");
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");

  const [copied, setCopied] = useState(false);

  // Auto-generate Organisation ID in format AF<year>-<month>-<first_word_of_org_name>
  useEffect(() => {
    if (!orgName.trim()) {
      setGeneratedOrgId("");
      return;
    }
    const firstWord = orgName.trim().split(/\s+/)[0];
    const sanitized = firstWord.replace(/[^a-zA-Z0-9]/g, "");
    if (!sanitized) {
      setGeneratedOrgId("");
      return;
    }
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    setGeneratedOrgId(`AF${year}-${month}-${sanitized}`);
  }, [orgName]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic Validation
    if (!orgName.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    if (adminPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      // 1. Check if Organization ID already exists
      const { data: existingOrg, error: checkError } = await supabase
        .from("orgList")
        .select("unID")
        .eq("unID", generatedOrgId)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Failed to check organization availability: ${checkError.message}`);
      }

      if (existingOrg) {
        throw new Error(`An organization with ID "${generatedOrgId}" already exists. Please choose a different name.`);
      }

      // 2. Sign up the user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: adminName,
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error("Failed to register admin account.");
      }

      // 3. Insert Organisation into orgList
      const { error: orgListError } = await supabase
        .from("orgList")
        .insert([
          {
            name: orgName.trim(),
            unID: generatedOrgId,
            email: adminEmail.trim(),
          }
        ]);

      if (orgListError) {
        throw new Error(`Failed to create organization record: ${orgListError.message}`);
      }

      // 4. Insert Employee into orgEmployee as Admin (Status = true)
      const { error: employeeError } = await supabase
        .from("orgEmployee")
        .insert([
          {
            Name: adminName.trim(),
            Email: adminEmail.trim(),
            Role: "Admin",
            Status: true,
            orgID: generatedOrgId,
            uuid: authData.user.id,
          }
        ]);

      if (employeeError) {
        throw new Error(`Failed to create employee profile: ${employeeError.message}`);
      }

      // Successful Creation
      setSuccess({
        type: "create",
        orgName: orgName.trim(),
        orgId: generatedOrgId,
        email: adminEmail.trim(),
        role: "Admin",
        status: "Active (Creator)",
      });

      // Reset form
      setOrgName("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic Validation
    if (!joinOrgId.trim() || !empName.trim() || !empEmail.trim() || !empPassword.trim()) {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    if (empPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      // 1. Verify that the Organisation ID actually exists
      const { data: existingOrg, error: orgError } = await supabase
        .from("orgList")
        .select("name")
        .eq("unID", joinOrgId.trim())
        .maybeSingle();

      if (orgError) {
        throw new Error(`Failed to check organization: ${orgError.message}`);
      }

      if (!existingOrg) {
        throw new Error(`Organization ID "${joinOrgId}" not found. Please verify with your administrator.`);
      }

      // 2. Sign up the user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: empEmail,
        password: empPassword,
        options: {
          data: {
            full_name: empName,
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error("Failed to register employee account.");
      }

      // 3. Insert Employee record into orgEmployee
      // Roles are assigned by Admin later. Default role: 'Employee', Status = false (pending activation)
      const { error: employeeError } = await supabase
        .from("orgEmployee")
        .insert([
          {
            Name: empName.trim(),
            Email: empEmail.trim(),
            Role: "Employee",
            Status: false, 
            orgID: joinOrgId.trim(),
          }
        ]);

      if (employeeError) {
        throw new Error(`Failed to create employee profile: ${employeeError.message}`);
      }

      // Successful Registration
      setSuccess({
        type: "join",
        orgName: existingOrg.name,
        orgId: joinOrgId.trim(),
        email: empEmail.trim(),
        role: "Employee (Pending)",
        status: "Pending Admin Approval",
      });

      // Reset form
      setJoinOrgId("");
      setEmpName("");
      setEmpEmail("");
      setEmpPassword("");

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-zinc-900 selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="w-full max-w-xl px-4 py-12 flex flex-col gap-8 z-10">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900">
            AssetFlow
          </h1>
          <p className="text-zinc-500 max-w-sm mt-1 text-sm md:text-base font-medium">
            Centralized ERP solution to track, allocate, and manage assets for organizations of all sizes.
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <span className="font-bold text-rose-950">Registration Error:</span> {error}
            </div>
          </div>
        )}

        {success && (
          <div className="flex flex-col gap-4 p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-650" />
              <div className="flex-1">
                <h3 className="text-base font-bold text-emerald-950">
                  {success.type === "create" ? "Organisation Created!" : "Employee Registered!"}
                </h3>
                <p className="text-zinc-650 mt-1 font-medium">
                  {success.type === "create" 
                    ? `Successfully created "${success.orgName}" and registered your administrator account.`
                    : `Registered under "${success.orgName}" successfully. Access requires activation.`
                  }
                </p>
              </div>
            </div>

            {/* Quick Details Box */}
            <div className="mt-2 bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-3 font-mono text-[13px] text-zinc-700 shadow-sm">
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-400">Org ID:</span>
                <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                  <span>{success.orgId}</span>
                  <button 
                    onClick={() => copyToClipboard(success.orgId)} 
                    className="p-1 hover:bg-zinc-100 rounded transition-colors text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    title="Copy Org ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-400">Admin/Email:</span>
                <span className="text-zinc-800">{success.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-400">Initial Role:</span>
                <span className="text-indigo-650 font-semibold">{success.role}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400">System Status:</span>
                <span className={`font-semibold ${success.type === "create" ? "text-emerald-650" : "text-amber-650"}`}>
                  {success.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 text-center italic mt-1">
              Please note: An email confirmation link has been sent. Check your inbox.
            </p>
          </div>
        )}

        {/* Tab Controls */}
        <div className="grid grid-cols-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
          <button
            onClick={() => { setActiveTab("create"); setError(null); setSuccess(null); }}
            className={`py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "create"
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Building2 className="w-4 h-4 text-zinc-500" />
            Create Organisation
          </button>
          <button
            onClick={() => { setActiveTab("join"); setError(null); setSuccess(null); }}
            className={`py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "join"
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <User className="w-4 h-4 text-zinc-500" />
            Existing Org
          </button>
        </div>

        {/* Onboarding Form Box */}
        <div className="bg-white border border-zinc-200/80 shadow-xl shadow-zinc-200/30 rounded-2xl p-6 md:p-8 flex flex-col animate-in fade-in zoom-in-99 duration-200">
          
          {activeTab === "create" ? (
            /* CREATE ORG FORM */
            <form onSubmit={handleCreateOrg} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Organisation Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Org ID Preview */}
              {generatedOrgId && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Generated Organisation ID</label>
                  <div className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-center text-sm font-mono text-indigo-600 border-dashed border-indigo-500/30">
                    <span>{generatedOrgId}</span>
                    <span className="text-[10px] text-indigo-600 font-sans uppercase tracking-wider font-semibold border border-indigo-500/30 px-2 py-0.5 rounded bg-indigo-50">
                      Auto Generated
                    </span>
                  </div>
                </div>
              )}

              <hr className="border-zinc-100 my-1" />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Admin Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="First & Last Name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="admin@organisation.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Initialize Organisation
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* JOIN ORG FORM */
            <form onSubmit={handleJoinOrg} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Organisation ID</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. AF2026-07-Acme"
                    value={joinOrgId}
                    onChange={(e) => setJoinOrgId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono text-sm tracking-wide"
                  />
                </div>
              </div>

              <hr className="border-zinc-100 my-1" />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="First & Last Name"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="yourname@domain.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 focus:border-indigo-500 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Register Employee Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-zinc-400 flex flex-col gap-1">
          <p>AssetFlow Enterprise ERP Platform</p>
          <p>© 2026 AssetFlow Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );;
}
