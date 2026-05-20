import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signupUser } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup() {
    const result = await signupUser(fullName, email, password);

    console.log("signup result:", result);

    if (
        result.id ||
         result.email ||
         result.success ||
         result.message === "User created successfully"
     ) {
      alert("Signup successful! Please login.");
      navigate({ to: "/login" });
    } else {
      alert(
        typeof result.detail === "string"
          ? result.detail
          : result.error || "Signup failed"
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-3xl p-8 w-full max-w-md shadow-elegant">
        <h1 className="text-3xl font-bold mb-2">Create account</h1>

        <p className="text-muted-foreground mb-8">
          Sign up to save your queries and history.
        </p>

        <div className="space-y-4">

          <input
            className="w-full px-4 py-3 rounded-xl border bg-background"
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            className="w-full px-4 py-3 rounded-xl border bg-background"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full px-4 py-3 rounded-xl border bg-background"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleSignup}
            className="w-full px-4 py-3 rounded-xl gradient-bg-primary text-white font-semibold shadow-elegant"
          >
            Sign up
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-6 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}