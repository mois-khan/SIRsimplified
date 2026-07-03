import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: "Voter Assistance Portal",
  description: "Public portal for voter roll search and assistance.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Navbar />
        <main className="main-content">
          <div className="app-container">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
