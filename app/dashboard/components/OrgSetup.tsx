"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Building2,
  User,
  Tags,
  Plus,
  Edit2,
  Check,
  X,
  ShieldAlert,
  Loader2,
  Trash2,
  PlusCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

interface Employee {
  id: number;
  Name: string;
  Email: string;
  Department: string | null;
  Role: string;
  Status: boolean;
  uuid: string | null;
}

interface Department {
  id: number;
  DepartmentId: string;
  DepartmentName: string;
  uidDepartmentHead: string | null;
  isActive: boolean;
  ParentDepartmentId: string | null;
  // Resolved names for display
  headName?: string;
  parentName?: string;
}

interface CategoryField {
  name: string;
  label: string;
  type: "text" | "number" | "date";
  required: boolean;
}

interface Category {
  id: number;
  orgID: string;
  CategoryName: {
    name: string;
    fields?: CategoryField[];
  };
}

interface OrgSetupProps {
  orgId: string;
}

export default function OrgSetup({ orgId }: OrgSetupProps) {
  const [activeSubTab, setActiveSubTab] = useState<"departments" | "categories" | "employees">("departments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Master Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modals / Editors
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: "",
    headUuid: "",
    parentDeptId: "",
    isActive: true
  });

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catFields, setCatFields] = useState<CategoryField[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "date">("text");

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Employees
      const { data: empData, error: empErr } = await supabase
        .from("orgEmployee")
        .select("*")
        .eq("orgID", orgId);
      if (empErr) throw empErr;
      const fetchedEmployees = empData || [];
      setEmployees(fetchedEmployees);

      // 2. Fetch Departments
      const { data: deptData, error: deptErr } = await supabase
        .from("orgDepartment")
        .select("*")
        .eq("orgID", orgId);
      if (deptErr) throw deptErr;
      const fetchedDepts = deptData || [];

      // 3. Fetch Categories
      const { data: catData, error: catErr } = await supabase
        .from("orgCategories")
        .select("*")
        .eq("orgID", orgId);
      if (catErr) throw catErr;
      setCategories(catData || []);

      // Resolve names for display
      const resolvedDepts = fetchedDepts.map((d: any) => {
        const head = fetchedEmployees.find((e) => e.uuid === d.uidDepartmentHead);
        const parent = fetchedDepts.find((pd) => pd.DepartmentId === d.ParentDepartmentId);
        return {
          ...d,
          headName: head ? head.Name : "--",
          parentName: parent ? parent.DepartmentName : "--"
        };
      });
      setDepartments(resolvedDepts);

    } catch (err: any) {
      setError(err.message || "Failed to load master data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  // Alert message timeout helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // --- Department Functions ---
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        DepartmentName: deptForm.name.trim(),
        uidDepartmentHead: deptForm.headUuid || null,
        ParentDepartmentId: deptForm.parentDeptId || null,
        isActive: deptForm.isActive,
        orgID: orgId
      };

      if (editingDept) {
        // Update
        const { error: err } = await supabase
          .from("orgDepartment")
          .update(payload)
          .eq("id", editingDept.id);
        if (err) throw err;
        triggerSuccess(`Department "${payload.DepartmentName}" updated successfully.`);
      } else {
        // Create
        const { error: err } = await supabase
          .from("orgDepartment")
          .insert([payload]);
        if (err) throw err;
        triggerSuccess(`Department "${payload.DepartmentName}" created successfully.`);
      }

      setIsDeptModalOpen(false);
      setEditingDept(null);
      setDeptForm({ name: "", headUuid: "", parentDeptId: "", isActive: true });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save department.");
    }
  };

  const handleEditDeptClick = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.DepartmentName,
      headUuid: dept.uidDepartmentHead || "",
      parentDeptId: dept.ParentDepartmentId || "",
      isActive: dept.isActive
    });
    setIsDeptModalOpen(true);
  };

  const toggleDeptStatus = async (dept: Department) => {
    try {
      const { error: err } = await supabase
        .from("orgDepartment")
        .update({ isActive: !dept.isActive })
        .eq("id", dept.id);
      if (err) throw err;
      triggerSuccess(`Department "${dept.DepartmentName}" status toggled.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to toggle status.");
    }
  };

  // --- Category Functions ---
  const addCategoryField = () => {
    if (!newFieldName.trim() || !newFieldLabel.trim()) return;
    const key = newFieldName.trim().toLowerCase().replace(/\s+/g, "_");
    // Prevent duplicates
    if (catFields.some((f) => f.name === key)) return;
    setCatFields([...catFields, { name: key, label: newFieldLabel.trim(), type: newFieldType, required: false }]);
    setNewFieldName("");
    setNewFieldLabel("");
  };

  const removeCategoryField = (index: number) => {
    setCatFields(catFields.filter((_, i) => i !== index));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setError(null);

    try {
      const categoryObj = {
        name: catName.trim(),
        fields: catFields
      };

      const { error: err } = await supabase
        .from("orgCategories")
        .insert([{ orgID: orgId, CategoryName: categoryObj }]);
      if (err) throw err;

      triggerSuccess(`Category "${categoryObj.name}" created successfully.`);
      setIsCatModalOpen(false);
      setCatName("");
      setCatFields([]);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create category.");
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      const { error: err } = await supabase
        .from("orgCategories")
        .delete()
        .eq("id", id);
      if (err) throw err;
      triggerSuccess(`Category "${name}" deleted.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete category.");
    }
  };

  // --- Employee Directory Functions ---
  const handleUpdateEmployeeRole = async (empId: number, newRole: string) => {
    try {
      const { error: err } = await supabase
        .from("orgEmployee")
        .update({ Role: newRole })
        .eq("id", empId);
      if (err) throw err;
      triggerSuccess(`Employee role updated to ${newRole}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update employee role.");
    }
  };

  const handleUpdateEmployeeDept = async (empId: number, newDept: string) => {
    try {
      const { error: err } = await supabase
        .from("orgEmployee")
        .update({ Department: newDept || null })
        .eq("id", empId);
      if (err) throw err;
      triggerSuccess(`Employee department updated.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update department.");
    }
  };

  const toggleEmployeeStatus = async (emp: Employee) => {
    try {
      const { error: err } = await supabase
        .from("orgEmployee")
        .update({ Status: !emp.Status })
        .eq("id", emp.id);
      if (err) throw err;
      triggerSuccess(`Employee status updated.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update status.");
    }
  };

  if (loading && departments.length === 0) {
    return (
      <div className="p-8 w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
        <span className="ml-3 text-sm text-zinc-500 font-semibold">Loading setup details...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("departments")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === "departments"
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/50"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveSubTab("categories")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === "categories"
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/50"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveSubTab("employees")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === "employees"
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/50"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            Employee Directory
          </button>
        </div>

        {/* Action Button */}
        {activeSubTab === "departments" && (
          <button
            onClick={() => {
              setEditingDept(null);
              setDeptForm({ name: "", headUuid: "", parentDeptId: "", isActive: true });
              setIsDeptModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Department
          </button>
        )}
        {activeSubTab === "categories" && (
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Category
          </button>
        )}
      </div>

      {/* --- TAB CONTENT: DEPARTMENTS --- */}
      {activeSubTab === "departments" && (
        <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Head</th>
                <th className="px-6 py-4">Parent Dept</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-400 font-semibold text-sm">
                    No departments created yet. Click "Add Department" to start.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-zinc-50/50 transition-colors text-sm text-zinc-700">
                    <td className="px-6 py-4 font-bold text-zinc-900">{dept.DepartmentName}</td>
                    <td className="px-6 py-4">{dept.headName}</td>
                    <td className="px-6 py-4 font-mono text-xs">{dept.parentName}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleDeptStatus(dept)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold cursor-pointer border ${
                          dept.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                            : "bg-rose-50 text-rose-700 border-rose-250"
                        }`}
                      >
                        {dept.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditDeptClick(dept)}
                        className="p-1 text-zinc-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Department"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB CONTENT: CATEGORIES --- */}
      {activeSubTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-xl p-8 text-center text-zinc-405 lg:col-span-3 font-semibold text-sm">
              No categories registered yet. Click "Add Category" to setup asset schema.
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start border-b border-zinc-150 pb-2">
                  <div className="flex items-center gap-2">
                    <Tags className="w-4 h-4 text-indigo-650" />
                    <h4 className="font-extrabold text-zinc-900 text-sm uppercase tracking-wide">{cat.CategoryName.name}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.CategoryName.name)}
                    className="p-1 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Custom Schema Fields</span>
                  {(!cat.CategoryName.fields || cat.CategoryName.fields.length === 0) ? (
                    <span className="text-xs text-zinc-400 italic">No category-specific fields</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {cat.CategoryName.fields.map((f, i) => (
                        <div key={i} className="flex justify-between items-center bg-zinc-50 border border-zinc-200/50 rounded-lg px-2.5 py-1 text-xs">
                          <span className="font-bold text-zinc-700">{f.label}</span>
                          <span className="text-zinc-400 font-mono capitalize">{f.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- TAB CONTENT: EMPLOYEE DIRECTORY --- */}
      {activeSubTab === "employees" && (
        <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-450 font-semibold text-sm">
                    No employees registered in this organization.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors text-sm text-zinc-700">
                    <td className="px-6 py-4 font-bold text-zinc-900">{emp.Name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">{emp.Email}</td>
                    <td className="px-6 py-4">
                      {/* Department Select Picklist */}
                      <select
                        value={emp.Department || ""}
                        onChange={(e) => handleUpdateEmployeeDept(emp.id, e.target.value)}
                        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Unassigned</option>
                        {departments
                          .filter((d) => d.isActive)
                          .map((d) => (
                            <option key={d.id} value={d.DepartmentName}>
                              {d.DepartmentName}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {/* Role Promote dropdown - Admin only assigns roles here */}
                      <select
                        value={emp.Role}
                        onChange={(e) => handleUpdateEmployeeRole(emp.id, e.target.value)}
                        disabled={emp.Role === "Admin"}
                        title={emp.Role === "Admin" ? "Admin roles are immutable and cannot be changed" : "Update Role"}
                        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="Employee">Employee</option>
                        <option value="Department Head">Department Head</option>
                        <option value="Asset Manager">Asset Manager</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleEmployeeStatus(emp)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold cursor-pointer border ${
                          emp.Status
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                            : "bg-rose-50 text-rose-700 border-rose-250"
                        }`}
                      >
                        {emp.Status ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- DEPT CREATION/EDIT MODAL --- */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-650" />
                {editingDept ? "Edit Department" : "Create Department"}
              </h3>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-650 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-white text-zinc-900"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Department Head</label>
                <select
                  value={deptForm.headUuid}
                  onChange={(e) => setDeptForm({ ...deptForm, headUuid: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                >
                  <option value="">No Head Assigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.uuid || ""}>
                      {emp.Name} ({emp.Email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Parent Department (for Hierarchy)</label>
                <select
                  value={deptForm.parentDeptId}
                  onChange={(e) => setDeptForm({ ...deptForm, parentDeptId: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                >
                  <option value="">No Parent Department</option>
                  {departments
                    .filter((d) => d.DepartmentId !== editingDept?.DepartmentId)
                    .map((d) => (
                      <option key={d.id} value={d.DepartmentId}>
                        {d.DepartmentName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-between border border-zinc-150 rounded-xl p-3 bg-zinc-50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-800">Status</span>
                  <span className="text-[10px] text-zinc-400">Mark this department active or inactive</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeptForm({ ...deptForm, isActive: !deptForm.isActive })}
                  className="p-1 hover:bg-zinc-200 rounded text-indigo-650"
                >
                  {deptForm.isActive ? (
                    <ToggleRight className="w-8 h-8 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 cursor-pointer text-zinc-400" />
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-150 mt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 font-semibold rounded-lg text-sm hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CATEGORY CREATION MODAL --- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Tags className="w-4 h-4 text-indigo-650" />
                Add Asset Category
              </h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-650 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electronics, Furniture, Vehicles"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-white text-zinc-900"
                />
              </div>

              {/* Custom fields builder */}
              <div className="border border-zinc-200 rounded-xl p-4 flex flex-col gap-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Add Category-Specific Field</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Field Key (e.g. warranty_period)"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="px-2 py-1.5 border border-zinc-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-zinc-900"
                  />
                  <input
                    type="text"
                    placeholder="Field Label (e.g. Warranty Period)"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="px-2 py-1.5 border border-zinc-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-zinc-900"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as any)}
                    className="px-2 py-1.5 border border-zinc-200 rounded text-xs bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                  >
                    <option value="text">Text Field</option>
                    <option value="number">Number Field</option>
                    <option value="date">Date Field</option>
                  </select>
                  <button
                    type="button"
                    onClick={addCategoryField}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded text-xs transition-colors cursor-pointer border border-zinc-200"
                  >
                    Add Field
                  </button>
                </div>

                {/* Listed Custom Fields */}
                {catFields.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 border-t border-zinc-100 pt-2">
                    {catFields.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-50 border border-zinc-200/50 rounded px-2 py-1 text-xs">
                        <span className="font-bold text-zinc-700">{f.label} ({f.type})</span>
                        <button
                          type="button"
                          onClick={() => removeCategoryField(idx)}
                          className="text-rose-600 hover:text-rose-800 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-150 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 font-semibold rounded-lg text-sm hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
