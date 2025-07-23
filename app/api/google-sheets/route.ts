import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export async function POST(req: Request) {
  let { name, email, phone_number, age, plan_summary } = await req.json();

  // Ensure phone_number and plan_summary are null if undefined, to prevent columns from being skipped
  phone_number = phone_number ?? null;
  plan_summary = plan_summary ?? null;

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

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'UserInfo!A:E'; // Updated to save data in the sheet named "UserInfo"

    const values = [[name, email, phone_number, age, plan_summary]];

    const resource = {
      values,
    };

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not defined in environment variables.');
    }

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
    return NextResponse.json({ success: true, message: "Data saved to Google Sheet successfully." });
  } catch (error: any) {
    console.error("Error saving to Google Sheet:", error);
    return NextResponse.json({ success: false, message: "Failed to save data to Google Sheet.", error: error.message }, { status: 500 });
  }
} 