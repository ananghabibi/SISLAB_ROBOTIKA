import { keluar } from "@/app/masuk/aksi";
import { Button } from "@/components/ui/button";

export function TombolKeluar() {
  return (
    <form action={keluar}>
      <Button type="submit" variant="garis" className="w-full">
        Keluar
      </Button>
    </form>
  );
}
