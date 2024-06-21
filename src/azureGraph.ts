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
    console.error("Error fetching data from Outlook Graph API:" + urlPart);
    throw error;
  }
}

export async function azurePost({
  accessToken,
  urlPart,
  data = {},
}: {
  accessToken: string;
  urlPart: string;
  data?: any;
}) {
  try {
    const response = await azureApi.post(urlPart, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error posting data in Outlook Graph API:" + urlPart);
    throw error;
  }
}

export async function azurePatch({
  accessToken,
  urlPart,
  data = {},
}: {
  accessToken: string;
  urlPart: string;
  data?: any;
}) {
  try {
    const response = await azureApi.patch(urlPart, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error patching data in Outlook Graph API:" + urlPart);
    throw error;
  }
}
