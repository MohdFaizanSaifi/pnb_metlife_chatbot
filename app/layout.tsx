import { Inter } from "next/font/google";
import "./globals.css";
import Warnings from "./components/warnings";
import { assistantId } from "./assistant-config";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PNB Metlife Insurance Chatbot",
  description:
    "A chatbot to answer the query related to insurance offered by PNB MetLife",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {assistantId ? children : <Warnings />}

        {/* <img className="logo" src="/openai.svg" alt="OpenAI Logo" /> */}
      </body>
    </html>
  );
}
