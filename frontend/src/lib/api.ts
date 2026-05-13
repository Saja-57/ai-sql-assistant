const API_BASE_URL = "https://ai-sql-assistant-978r.onrender.com";


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

    const response = await fetch(`${API_BASE_URL}/generate-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload-csv`, {
      method: "POST",
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

    const response = await fetch(`${API_BASE_URL}/schema`);

    return await response.json();

  } catch (error) {

    return {
      success: false,
      error: String(error),
    };
  }
}