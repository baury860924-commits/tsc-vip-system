import type { ReactNode } from "react";
import "./style.css";
export const metadata = { title: "TSC VIP 管理系統", description: "TSC VIP v0.1" };
export default function RootLayout({children}:{children:ReactNode}) {return <html lang="zh-Hant"><body>{children}</body></html>}
