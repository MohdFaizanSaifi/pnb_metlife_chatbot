import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export async function save_to_google_sheet({
  name,
  email,
  phone_number,
  age,
  plan_summary,
}: {
  name: string;
  email: string;
  phone_number: string;
  age: number;
  plan_summary: string;
}) {
  console.log("save_to_google_sheet function called with:", {
    name,
    email,
    phone_number,
    age,
    plan_summary,
  });
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEET_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEET_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = "1Vny4RpNHUAPTvVxfOVCX1DWdsq2e3qYh0pabDZkvnBA";
    const range = 'Sheet1!A:E'; // Assuming your sheet has columns for Name, Email, Phone, Age, Plan Summary

    const values = [[name, email, phone_number, age, plan_summary]];

    const resource = {
      values,
    };

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: resource,
    });

    console.log(
      "Data successfully appended to Google Sheet:",
      result.data
    );
    return { success: true, message: "Data saved to Google Sheet successfully." };
  } catch (error) {
    console.error("Error saving to Google Sheet:", error);
    return { success: false, message: "Failed to save data to Google Sheet." };
  }
}
