import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signupUser } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup() {
    if (!fullName || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);

      const result = await signupUser(fullName, email, password);

      console.log("signup result:", result);

      if (result.access_token) {
        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("email", result.user?.email || email);
        localStorage.removeItem("guest_mode");

        navigate({ to: "/dashboard" });
      } else {
        alert(
          typeof result.detail === "string"
            ? result.detail
            : result.error || "Signup failed"
        );
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Signup failed");
    } finally {
      setIsLoading(false);
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

          <div className="relative">
            <input
              className="w-full px-4 py-3 pr-12 rounded-xl border bg-background"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            onClick={handleSignup}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-xl gradient-bg-primary text-white font-semibold shadow-elegant disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account..." : "Sign up"}
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