export function KepalaHalaman({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{judul}</h1>
        {keterangan ? <p className="mt-1 text-sm text-teks-redup">{keterangan}</p> : null}
      </div>
      {aksi}
    </div>
  );
}
