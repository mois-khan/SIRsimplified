import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "Voter Assistance Portal",
  description: "Public portal for voter roll search and assistance.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="main-content">
          <div className="app-container">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
