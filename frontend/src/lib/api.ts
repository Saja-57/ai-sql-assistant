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
  result_summary?:
    | string
    | {
        columns?: string[];
        rows?: any[][];
        rows_count?: number;
      };
  created_at?: string;
};

export type DatasetInsights = {
  success: boolean;
  table_name?: string;
  file_name?: string;
  dataset_id?: number;
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

export function getSelectedDatasetId(): number | null {
  const value = localStorage.getItem("selected_dataset_id");

  if (!value) return null;

  const id = Number(value);

  return Number.isFinite(id) ? id : null;
}

export function setSelectedDatasetId(datasetId: number) {
  localStorage.setItem("selected_dataset_id", String(datasetId));
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

    const data: UploadResponse = await response.json();

    if (data.success && data.dataset_id) {
      setSelectedDatasetId(data.dataset_id);
      localStorage.setItem(
  "selected_dataset",
  JSON.stringify({
    id: data.dataset_id,
    filename: data.file_name,
    table_name: data.table_name,
  })
);
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function generateSQL(
  question: string,
  datasetId?: number
): Promise<SqlResponse> {
  try {
    const finalDatasetId = datasetId ?? getSelectedDatasetId() ?? 0;

    const response = await fetch(`${API_BASE_URL}/generate-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        question,
        dataset_id: finalDatasetId,
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

export async function getSchema(datasetId?: number) {
  try {
    const finalDatasetId = datasetId ?? getSelectedDatasetId();

    const url = finalDatasetId
      ? `${API_BASE_URL}/schema?dataset_id=${finalDatasetId}`
      : `${API_BASE_URL}/schema`;

    const response = await fetch(url, {
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

export async function getDatasetInsights(
  datasetId?: number
): Promise<DatasetInsights> {
  try {
    const finalDatasetId =
      datasetId ?? getSelectedDatasetId() ?? 0;

    const response = await fetch(
      `${API_BASE_URL}/dataset-insights?dataset_id=${finalDatasetId}`,
      {
        headers: {
          ...getAuthHeaders(),
        },
      }
    );

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

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && !getSelectedDatasetId()) {
      setSelectedDatasetId(data[0].id);
    }

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    const data = await response.json();

    return Array.isArray(data) ? data : [];
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
      localStorage.removeItem("selected_dataset_id");
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

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.removeItem("guest_mode");
      localStorage.removeItem("selected_dataset_id");
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export function logoutUser() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("guest_mode");
  localStorage.removeItem("selected_dataset_id");
}

export async function deleteDataset(datasetId: number) {
  const token =
    localStorage.getItem("access_token") || localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
}
export async function getDatasetSchema(datasetId: number) {
  const token = localStorage.getItem("access_token");

  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/schema`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
}

