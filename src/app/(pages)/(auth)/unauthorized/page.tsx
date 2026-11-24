import Link from "next/link";
import { ShieldAlert, Home, LogIn } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main
      className="page-bg-auth"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "radial-gradient(circle at center, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 1) 100%)",
      }}
    >
      <section
        className="glass-panel"
        style={{ width: "100%", maxWidth: "500px", padding: "40px 32px", textAlign: "center", borderRadius: "20px" }}
      >
        <div style={{ display: "inline-flex", padding: "16px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.12)", marginBottom: "18px", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
          <ShieldAlert size={44} color="var(--accent-red)" />
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "12px", color: "#fff" }}>Access Denied</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "28px", fontSize: "0.95rem", lineHeight: 1.5 }}>
          Your authenticated account role does not have permission to view this portal area or college tenant.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn-primary" href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}>
            <Home size={16} /> Return to Home
          </Link>
          <Link className="btn-secondary" href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}>
            <LogIn size={16} /> Sign In with Different Account
          </Link>
        </div>
      </section>
    </main>
  );
}
