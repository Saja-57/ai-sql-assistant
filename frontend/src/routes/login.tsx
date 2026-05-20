import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginUser } from "../lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const result = await loginUser(email, password);

    console.log(result);

    if (result.access_token) {
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("email", email);

      navigate({ to: "/dashboard" });
    } else {
      alert("Login failed");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(to bottom right, #f5f3ff, #eef7ff)",
      }}
    >
      <div
        style={{
          width: "400px",
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontSize: "36px",
            marginBottom: "10px",
            color: "#6d28d9",
          }}
        >
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            fontSize: "16px",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            fontSize: "16px",
          }}
        />

        <button
          onClick={handleLogin}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background: "#7c3aed",
            color: "white",
            fontSize: "18px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Login
        </button>

        <button
          onClick={() => navigate({ to: "/signup" })}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #7c3aed",
            background: "white",
            color: "#7c3aed",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Create Account
        </button>

        <button
          onClick={() => navigate({ to: "/" })}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
