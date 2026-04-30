import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserPlus, Copy, Check, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: "advisor" | "admin";
  created_at: string | null;
}

interface NewUserForm {
  name: string;
  email: string;
  password: string;
  role: "advisor" | "admin";
}

interface CreatedCredentials {
  name: string;
  email: string;
  password: string;
  role: string;
}

function formatDate(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewUserForm>({ name: "", email: "", password: "", role: "advisor" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (user?.role !== "admin") {
    return <Navigate to="/advisor" replace />;
  }

  const { data: users = [], isLoading } = useQuery<TeamUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users"),
  });

  function openAddModal() {
    setForm({ name: "", email: "", password: "", role: "advisor" });
    setFormError(null);
    setCredentials(null);
    setCopied(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCredentials(null);
    setCopied(false);
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError("All fields are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/admin/users", form);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setCredentials({ ...form });
    } catch (err: any) {
      setFormError(err.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!credentials) return;
    const text = `Name:     ${credentials.name}\nEmail:    ${credentials.email}\nPassword: ${credentials.password}\nRole:     ${credentials.role}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Delete failed");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert(err.message ?? "Could not delete user.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage TFO advisor and admin accounts
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Created</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        u.role === "admin"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id === user.id ? (
                      <span className="text-xs text-muted-foreground italic">You</span>
                    ) : confirmDeleteId === u.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-destructive font-medium">Delete {u.name}?</span>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deleting}
                          className="text-xs text-destructive font-semibold hover:underline disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(u.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User / Credentials Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeModal(); }}>
        <DialogContent className="sm:max-w-md">
          {!credentials ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Add Team Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Katie Johnson"
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="katie@foundersoffice.com"
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Temporary Password</label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="TempPass123!"
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "advisor" | "admin" }))}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="advisor">Advisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Creating..." : "Create Account"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2 text-emerald-600">
                  <Check className="w-5 h-5" />
                  Account Created
                </DialogTitle>
              </DialogHeader>
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Share these credentials with the new team member. This is the only time the password will be shown.
                </p>
                <div className="bg-muted rounded-md p-4 font-mono text-sm space-y-1 border border-border">
                  <p><span className="text-muted-foreground">Name:    </span> {credentials.name}</p>
                  <p><span className="text-muted-foreground">Email:   </span> {credentials.email}</p>
                  <p><span className="text-muted-foreground">Password:</span> {credentials.password}</p>
                  <p><span className="text-muted-foreground">Role:    </span> {credentials.role}</p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleCopy}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy credentials"}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
