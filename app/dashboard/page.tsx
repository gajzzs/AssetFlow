"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import OrgSetup from "./components/OrgSetup";
import AssetsManager from "./components/AssetsManager";
import {
  LayoutDashboard,
  Building,
  Laptop,
  ArrowLeftRight,
  Calendar,
  Wrench,
  ClipboardList,
  BarChart3,
  Bell,
  Plus,
  LogOut,
  AlertTriangle,
  User,
  CheckCircle,
  Loader2,
  X,
  Search,
  Sliders,
  Filter
} from "lucide-react";

interface Activity {
  id: string;
  text: string;
  timestamp: string;
  type: "allocation" | "booking" | "maintenance" | "general";
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{
    name: string;
    email: string;
    orgId: string;
    orgName: string;
    role: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState("Dashboard");
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: "act-1",
      text: "Laptop AF-0114 - allocated to Priya Shah - IT dept",
      timestamp: "10 mins ago",
      type: "allocation"
    },
    {
      id: "act-2",
      text: "Room B2 - booking confirmed - 2:00 to 3:00 PM",
      timestamp: "1 hour ago",
      type: "booking"
    },
    {
      id: "act-3",
      text: "Projector AF-0062 - maintenance resolved",
      timestamp: "3 hours ago",
      type: "maintenance"
    }
  ]);



  // Statistics placeholder values
  const [stats, setStats] = useState({
    available: 0,
    allocated: 0,
    maintenance: 0,
    activeBookings: 9,
    pendingTransfers: 3,
    upcomingReturns: 12
  });

  const refreshStats = async (orgId: string) => {
    try {
      const { data: assetData, error } = await supabase
        .from("asset")
        .select("Status")
        .eq("orgid", orgId);
      if (error) throw error;
      
      const available = assetData ? assetData.filter((a: any) => a.Status?.toLowerCase() === "available").length : 0;
      const allocated = assetData ? assetData.filter((a: any) => a.Status?.toLowerCase() === "allocated").length : 0;
      const maintenance = assetData ? assetData.filter((a: any) => a.Status?.toLowerCase() === "under maintenance").length : 0;

      setStats(prev => ({
        ...prev,
        available: available,
        allocated: allocated,
        maintenance: maintenance
      }));
    } catch (err) {
      console.error("Error refreshing stats:", err);
    }
  };

  // Verify authentication & fetch user profile
  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/");
          return;
        }

        // Fetch organization employee record
        const { data: empData, error: empError } = await supabase
          .from("orgEmployee")
          .select("Name, Role, Status, orgID")
          .eq("uuid", session.user.id)
          .maybeSingle();

        if (empError || !empData) {
          console.error("No employee record found:", empError);
          router.push("/");
          return;
        }

        if (empData.Role !== "Admin") {
          // Access restricted to administrators
          console.warn("Access denied: User is not an administrator.");
          router.push("/");
          return;
        }

        // Fetch organization name
        let orgName = "AssetFlow Organization";
        const { data: orgData } = await supabase
          .from("orgList")
          .select("name")
          .eq("unID", empData.orgID)
          .maybeSingle();
        if (orgData) {
          orgName = orgData.name;
        }

        setAdminUser({
          name: empData.Name,
          email: session.user.email || "",
          orgId: empData.orgID,
          orgName: orgName,
          role: empData.Role
        });

        // Load real-time stats count from database
        await refreshStats(empData.orgID);
      } catch (err) {
        console.error("Dashboard initialization error:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };



  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-650 animate-spin" />
        <p className="text-zinc-500 mt-4 font-semibold text-sm">Loading admin environment...</p>
      </div>
    );
  }

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Organization setup", icon: Building },
    { name: "Assets", icon: Laptop },
    { name: "Allocation & Transfer", icon: ArrowLeftRight },
    { name: "Resource Booking", icon: Calendar },
    { name: "Maintenance", icon: Wrench },
    { name: "Audit", icon: ClipboardList },
    { name: "Reports", icon: BarChart3 },
    { name: "Notifications", icon: Bell }
  ];

  return (
    <div className="min-h-screen w-full flex bg-slate-50 text-zinc-900 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-zinc-200/80 flex flex-col shrink-0">
        {/* Brand / Logo */}
        <div className="h-16 px-6 border-b border-zinc-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <span className="text-white font-extrabold text-sm tracking-tighter">AF</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-900">AssetFlow</span>
          </div>
        </div>

        {/* Admin Info */}
        <div className="p-4 mx-3 my-4 bg-zinc-50 border border-zinc-200/60 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm">
            {adminUser?.name.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-900 truncate">{adminUser?.name}</p>
            <p className="text-[10px] font-semibold text-indigo-650 truncate">{adminUser?.orgName}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 pl-2 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-zinc-400"}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-zinc-200/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-50 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded-xl text-zinc-650 hover:text-rose-700 text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-zinc-200/80 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">{activeTab}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 border border-indigo-200/50 rounded-md text-indigo-650">
              ID: {adminUser?.orgId}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200/60 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-600 rounded-full" />
            </button>
            <div className="h-8 w-px bg-zinc-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700">Administrator</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-indigo-600 text-white rounded">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <div className="p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          
          {activeTab === "Dashboard" ? (
            <>
              {/* Today's Overview Grid */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Today's Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Card 1: Available */}
                  <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Available Assets</span>
                    <span className="text-3xl font-extrabold text-zinc-900">{stats.available}</span>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <Laptop className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 2: Allocated */}
                  <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Allocated Assets</span>
                    <span className="text-3xl font-extrabold text-zinc-900">{stats.allocated}</span>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 3: Under Maintenance */}
                  <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Under Maintenance</span>
                    <span className="text-3xl font-extrabold text-zinc-900">{stats.maintenance}</span>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <Wrench className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 4: Active Bookings */}
                  <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Bookings</span>
                    <span className="text-3xl font-extrabold text-zinc-900">{stats.activeBookings}</span>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 5: Pending Transfers */}
                  <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pending Transfers</span>
                    <span className="text-3xl font-extrabold text-zinc-900">{stats.pendingTransfers}</span>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 6: Upcoming Returns */}
                  <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 relative overflow-hidden group">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Upcoming Returns</span>
                    <span className="text-3xl font-extrabold text-zinc-900">{stats.upcomingReturns}</span>
                    <div className="absolute right-4 bottom-4 w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert Strip */}
              <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200/60 rounded-xl text-sm font-semibold text-rose-800 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>3 assets overdue for return - flagged for follow-up</span>
              </div>

              {/* Actions & Recent Activities Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Actions Panel */}
                <div className="bg-white border border-zinc-200/80 rounded-xl p-6 shadow-sm flex flex-col gap-4 lg:col-span-1">
                  <h4 className="font-bold text-zinc-900 text-sm uppercase tracking-wide border-b border-zinc-150 pb-2">Quick Actions</h4>
                  
                  <button 
                    onClick={() => setActiveTab("Assets")}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-sm cursor-pointer justify-center border border-transparent"
                  >
                    <Plus className="w-4 h-4" />
                    Register Asset
                  </button>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 hover:border-indigo-600 text-zinc-700 hover:text-indigo-700 font-bold rounded-xl shadow-sm hover:shadow active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-sm cursor-pointer">
                    <Calendar className="w-4 h-4" />
                    Book Resource
                  </button>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 hover:border-indigo-600 text-zinc-700 hover:text-indigo-700 font-bold rounded-xl shadow-sm hover:shadow active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-sm cursor-pointer">
                    <ClipboardList className="w-4 h-4" />
                    Raise Requests
                  </button>
                </div>

                {/* Recent Activity List */}
                <div className="bg-white border border-zinc-200/80 rounded-xl p-6 shadow-sm flex flex-col gap-4 lg:col-span-2">
                  <h4 className="font-bold text-zinc-900 text-sm uppercase tracking-wide border-b border-zinc-150 pb-2">Recent Activity</h4>
                  
                  <div className="flex flex-col gap-3">
                    {activities.map((act) => (
                      <div 
                        key={act.id} 
                        className="p-3 bg-zinc-50 border border-zinc-200/40 rounded-xl flex justify-between items-start gap-4 hover:bg-zinc-100/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className={`p-1.5 rounded-lg text-xs shrink-0 mt-0.5 ${
                            act.type === "allocation" ? "bg-indigo-50 text-indigo-600" :
                            act.type === "booking" ? "bg-blue-50 text-blue-600" :
                            act.type === "maintenance" ? "bg-amber-50 text-amber-650" :
                            "bg-emerald-50 text-emerald-600"
                          }`}>
                            {act.type === "allocation" ? <ArrowLeftRight className="w-3.5 h-3.5" /> :
                             act.type === "booking" ? <Calendar className="w-3.5 h-3.5" /> :
                             act.type === "maintenance" ? <Wrench className="w-3.5 h-3.5" /> :
                             <Laptop className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-800">{act.text}</p>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{act.type}</span>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-400 shrink-0 font-medium">{act.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          ) : activeTab === "Organization setup" ? (
            <OrgSetup orgId={adminUser?.orgId || ""} />
          ) : activeTab === "Assets" ? (
            <AssetsManager orgId={adminUser?.orgId || ""} onAssetAdded={() => adminUser && refreshStats(adminUser.orgId)} />
          ) : (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
              <Sliders className="w-12 h-12 text-zinc-350 animate-bounce" />
              <div>
                <h3 className="text-xl font-bold text-zinc-800">Section Under Construction</h3>
                <p className="text-zinc-500 mt-1 max-w-sm">
                  The "{activeTab}" functionality is planned for future modules of the AssetFlow Enterprise Suite.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("Dashboard")}
                className="mt-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold rounded-lg text-sm transition-colors shadow"
              >
                Back to Dashboard
              </button>
            </div>
          )}

        </div>
      </main>


    </div>
  );
}
