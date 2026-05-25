import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginUser } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);

      const result = await loginUser(email, password);

      console.log("login result:", result);

      if (result.access_token) {
        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("email", email);
        localStorage.removeItem("guest_mode");

        navigate({ to: "/dashboard" });
      } else {
        alert(result.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-3xl p-8 w-full max-w-md shadow-elegant">
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>

        <p className="text-muted-foreground mb-8">
          Login to continue using your AI SQL Assistant.
        </p>

        <div className="space-y-4">
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
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-xl gradient-bg-primary text-white font-semibold shadow-elegant disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-6 text-center">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-primary font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}