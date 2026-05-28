const API_BASE_URL = "https://ai-sql-assistant-978r.onrender.com";

export type UploadResponse = {
  success: boolean;
  message?: string;
  dataset_id?: number;
  table_name?: string;
  file_name?: string;
  database?: string;
  columns?: string[];
  rows_count?: number;
  suggested_questions?: string[];
  error?: string;
};

export type SqlResponse = {
  success: boolean;
  history_id?: number;
  question?: string;
  dataset_id?: number;
  dataset_name?: string;
  sql?: string;
  explanation?: string;
  columns?: string[];
  rows?: any[][];
  error?: string;
};

export type DatasetItem = {
  id: number;
  table_name: string;
  file_name: string;
  rows_count?: number;
  columns?: string[];
  created_at?: string;
};

export type HistoryItem = {
  id: number;
  dataset_id?: number;
  dataset_name?: string;
  question: string;
  generated_sql?: string;
  result_summary?: string | {
    columns?: string[];
    rows?: any[][];
    rows_count?: number;
  };
  created_at?: string;
};

export type DatasetInsights = {
  success: boolean;
  table_name?: string;
  rows_count?: number;
  columns_count?: number;
  columns?: string[];
  column_types?: Record<string, string>;
  missing_values?: Record<string, number>;
  numeric_summary?: Record<
    string,
    {
      average: number;
      min: number;
      max: number;
    }
  >;
  top_values?: Record<string, Record<string, number>>;
  suggested_questions?: string[];
  error?: string;
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function generateSQL(
  question: string,
  datasetId: number
): Promise<SqlResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        question,
        dataset_id: datasetId,
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

export async function uploadCSV(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload-csv`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/schema`, {
      headers: {
        ...getAuthHeaders(),
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

export async function loginUser(email: string, password: string) {
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
      localStorage.removeItem("guest_mode");
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

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    return await response.json();
  } catch {
    return [];
  }
}

export async function getHistoryItem(historyId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/history/${historyId}`, {
      headers: {
        ...getAuthHeaders(),
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

export async function getDatasetInsights(): Promise<DatasetInsights> {
  try {
    const response = await fetch(`${API_BASE_URL}/dataset-insights`, {
      headers: {
        ...getAuthHeaders(),
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

export async function getDatasets(): Promise<DatasetItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    return await response.json();
  } catch {
    return [];
  }
}

export function logoutUser() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("guest_mode");
  localStorage.removeItem("selected_dataset_id");
}