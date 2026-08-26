import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function Beranda() {
  const sesi = await auth();
  redirect(sesi?.user?.id ? "/dasbor" : "/masuk");
}
