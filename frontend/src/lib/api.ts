const API_BASE_URL = "http://localhost:8000";

export type SqlResponse = {
  success: boolean;
  question?: string;
  sql?: string;
  explanation?: string;
  columns?: string[];
  rows?: any[][];
  error?: string;
};

export async function generateSQL(
  question: string
): Promise<SqlResponse> {

  try {

    const token = localStorage.getItem("access_token");

    const response = await fetch(`${API_BASE_URL}/generate-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
      }),
    });

    const data: SqlResponse = await response.json();

    return data;

  } catch (error) {

    return {
      success: false,
      error: String(error),
    };
  }
}

export async function uploadCSV(file: File) {

  try {

    const token = localStorage.getItem("access_token");

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload-csv`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return await response.json();

  } catch (error) {

    return {
      success: false,
      error: String(error),
    };
  }
}

export async function getSchema() {

  try {

    const token = localStorage.getItem("access_token");

    const response = await fetch(`${API_BASE_URL}/schema`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await response.json();

  } catch (error) {

    return {
      success: false,
      error: String(error),
    };
  }
}

export async function loginUser(
  email: string,
  password: string
) {

  try {

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
    }

    return data;

  } catch (error) {

    return {
      success: false,
      error: String(error),
    };
  }
}
export async function signupUser(
  full_name: string,
  email: string,
  password: string
) {
  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name,
        email,
        password,
      }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
export async function getHistory() {
  try {
    const token = localStorage.getItem("access_token");

    const response = await fetch(`${API_BASE_URL}/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
