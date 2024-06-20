import axios from "axios";

const azureApi = axios.create({
  baseURL: "https://graph.microsoft.com/v1.0",
  timeout: 5000,
});

export async function azureGet({
  accessToken,
  urlPart,
}: {
  accessToken: string;
  urlPart: string;
}) {
  try {
    const response = await azureApi.get(urlPart, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching data from Outlook Graph API:", error);
    throw error;
  }
}

export async function azurePost({
  accessToken,
  urlPart,
}: {
  accessToken: string;
  urlPart: string;
}) {
  try {
    const response = await azureApi.post(urlPart, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching data from Outlook Graph API:", error);
    throw error;
  }
}
