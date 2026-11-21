"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  AudioLines,
  LayoutDashboard,
  Folder,
  Music2,
  Clock,
  Search,
  FileAudio,
  Image as ImageIcon,
  ChevronRight,
  HardDrive,
  Upload,
  Download,
  X,
  Loader2,
  Trash2,
  Pencil,
  FolderPlus,
} from "lucide-react";

type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  date: string;
  createdAt: number;
};

type FileItem = {
  id: string;
  name: string;
  folderId: string;
  category: "Cue" | "Click" | "Reference" | "Lainnya";
  size: number;
  date: string;
  createdAt: number;
  data: Blob;
};

type AppData = {
  folders: FolderItem[];
  files: FileItem[];
};

const DB_NAME = "WebMusikGBIS_v2";
const STORE_NAME = "library";
const DATA_KEY = "main";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser ini tidak mendukung IndexedDB."));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadData(): Promise<AppData> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(DATA_KEY);

    request.onsuccess = () => {
      const result = request.result as AppData | undefined;

      resolve({
        folders: Array.isArray(result?.folders) ? result.folders : [],
        files: Array.isArray(result?.files) ? result.files : [],
      });

      db.close();
    };

    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

async function saveData(data: AppData): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(data, DATA_KEY);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };

    transaction.onabort = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectCategory(filename: string): FileItem["category"] {
  const name = filename.toLowerCase();

  if (name.includes("click")) return "Click";
  if (name.includes("cue")) return "Cue";

  if (
    name.includes("reference") ||
    name.includes("referensi") ||
    name.includes("ref")
  ) {
    return "Reference";
  }

  return "Lainnya";
}

function getFolderPath(folderId: string, folders: FolderItem[]): string {
  const names: string[] = [];
  let current = folders.find((folder) => folder.id === folderId);
  let guard = 0;

  while (current && guard < folders.length + 1) {
    names.unshift(current.name);

    current = current.parentId
      ? folders.find((folder) => folder.id === current!.parentId)
      : undefined;

    guard += 1;
  }

  return names.join(" / ");
}

function getDescendantFolderIds(
  folderId: string,
  folders: FolderItem[]
): Set<string> {
  const ids = new Set<string>([folderId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const folder of folders) {
      if (
        folder.parentId &&
        ids.has(folder.parentId) &&
        !ids.has(folder.id)
      ) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }

  return ids;
}

export default function Home() {
  const [active, setActive] = useState<
    "Dashboard" | "Semua Folder" | "Semua File" | "Terakhir Dibuka" | "Folder"
  >("Dashboard");

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [recentFolderIds, setRecentFolderIds] = useState<string[]>([]);

  const [folderName, setFolderName] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const data = await loadData();

        setFolders(data.folders);
        setFiles(data.files);

        const storedRecent = window.localStorage.getItem(
          "webmusikgbis_recent_folders"
        );

        if (storedRecent) {
          const parsed = JSON.parse(storedRecent);

          if (Array.isArray(parsed)) {
            setRecentFolderIds(parsed);
          }
        }
      } catch (error) {
        console.error("Gagal membaca penyimpanan:", error);

        setErrorMessage(
          "Data tidak dapat dimuat. Coba refresh halaman atau periksa dukungan browser."
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  async function persist(
    nextFolders: FolderItem[],
    nextFiles: FileItem[]
  ): Promise<boolean> {
    setSaving(true);
    setErrorMessage("");

    try {
      await saveData({
        folders: nextFolders,
        files: nextFiles,
      });

      setFolders(nextFolders);
      setFiles(nextFiles);

      return true;
    } catch (error) {
      console.error("Gagal menyimpan data:", error);

      setErrorMessage(
        "Data gagal disimpan. Penyimpanan browser mungkin penuh atau tidak tersedia."
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  function navigateTo(section: typeof active) {
    setActive(section);
    setCurrentFolderId(null);
    setSearch("");
  }

  function openFolder(folderId: string) {
    setCurrentFolderId(folderId);
    setActive("Folder");
    setSearch("");

    const updated = [
      folderId,
      ...recentFolderIds.filter((id) => id !== folderId),
    ].slice(0, 10);

    setRecentFolderIds(updated);

    try {
      window.localStorage.setItem(
        "webmusikgbis_recent_folders",
        JSON.stringify(updated)
      );
    } catch (error) {
      console.warn("Riwayat folder tidak dapat disimpan:", error);
    }
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = folderName.trim();
    if (!name) return;

    const duplicate = folders.some(
      (folder) =>
        folder.parentId === currentFolderId &&
        folder.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
    );

    if (duplicate) {
      setErrorMessage("Nama folder sudah digunakan di lokasi ini.");
      return;
    }

    const newFolder: FolderItem = {
      id: crypto.randomUUID(),
      name,
      parentId: currentFolderId,
      date: new Date().toLocaleDateString("id-ID"),
      createdAt: Date.now(),
    };

    const success = await persist([...folders, newFolder], files);

    if (success) {
      setFolderName("");
      setShowFolderModal(false);
      setErrorMessage("");
    }
  }

  async function renameFolder(folder: FolderItem) {
    const nextName = window.prompt(
      "Masukkan nama folder baru:",
      folder.name
    );

    if (nextName === null) return;

    const name = nextName.trim();

    if (!name) {
      window.alert("Nama folder tidak boleh kosong.");
      return;
    }

    const duplicate = folders.some(
      (item) =>
        item.id !== folder.id &&
        item.parentId === folder.parentId &&
        item.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );

    if (duplicate) {
      window.alert("Nama folder sudah digunakan di lokasi ini.");
      return;
    }

    const nextFolders = folders.map((item) =>
      item.id === folder.id ? { ...item, name } : item
    );

    await persist(nextFolders, files);
  }

  async function deleteFolder(folder: FolderItem) {
    const ids = getDescendantFolderIds(folder.id, folders);
    const descendantCount = ids.size - 1;
    const fileCount = files.filter((file) =>
      ids.has(file.folderId)
    ).length;

    const confirmed = window.confirm(
      `Hapus folder "${folder.name}"?` +
        `\n${descendantCount} subfolder dan ${fileCount} file di dalamnya juga akan dihapus.` +
        "\nTindakan ini tidak dapat dibatalkan."
    );

    if (!confirmed) return;

    const nextFolders = folders.filter((item) => !ids.has(item.id));
    const nextFiles = files.filter((file) => !ids.has(file.folderId));

    const success = await persist(nextFolders, nextFiles);

    if (success) {
      setRecentFolderIds((previous) => {
        const updated = previous.filter((id) => !ids.has(id));

        try {
          window.localStorage.setItem(
            "webmusikgbis_recent_folders",
            JSON.stringify(updated)
          );
        } catch {}

        return updated;
      });

      if (currentFolderId && ids.has(currentFolderId)) {
        setCurrentFolderId(null);
        setActive("Semua Folder");
      }
    }
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);

    if (!currentFolderId || selected.length === 0) return;

    const newFiles: FileItem[] = selected.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      folderId: currentFolderId,
      category: detectCategory(file.name),
      size: file.size,
      date: new Date().toLocaleDateString("id-ID"),
      createdAt: Date.now(),
      data: file,
    }));

    await persist(folders, [...files, ...newFiles]);

    event.target.value = "";
  }

  async function renameFile(file: FileItem) {
    const nextName = window.prompt(
      "Masukkan nama file baru:",
      file.name
    );

    if (nextName === null) return;

    const name = nextName.trim();

    if (!name) {
      window.alert("Nama file tidak boleh kosong.");
      return;
    }

    const duplicate = files.some(
      (item) =>
        item.id !== file.id &&
        item.folderId === file.folderId &&
        item.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );

    if (duplicate) {
      window.alert("Nama file sudah ada di folder ini.");
      return;
    }

    const nextFiles = files.map((item) =>
      item.id === file.id
        ? {
            ...item,
            name,
            category: detectCategory(name),
          }
        : item
    );

    await persist(folders, nextFiles);
  }

  async function deleteFile(file: FileItem) {
    const confirmed = window.confirm(
      `Hapus file "${file.name}"? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    const nextFiles = files.filter((item) => item.id !== file.id);

    await persist(folders, nextFiles);
  }

  function downloadFile(file: FileItem) {
    const url = URL.createObjectURL(file.data);
    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const currentFolder = folders.find(
    (folder) => folder.id === currentFolderId
  );

  const folderPath = useMemo(() => {
    if (!currentFolderId) return [];

    const path: FolderItem[] = [];
    let current = folders.find(
      (folder) => folder.id === currentFolderId
    );

    let guard = 0;

    while (current && guard < folders.length + 1) {
      path.unshift(current);

      current = current.parentId
        ? folders.find((folder) => folder.id === current!.parentId)
        : undefined;

      guard += 1;
    }

    return path;
  }, [currentFolderId, folders]);

  const filteredFolders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (active === "Semua Folder") {
      return folders
        .filter((folder) =>
          folder.name.toLocaleLowerCase().includes(query)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (active === "Dashboard") {
      return folders
        .filter((folder) => folder.parentId === null)
        .filter((folder) =>
          folder.name.toLocaleLowerCase().includes(query)
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 4);
    }

    if (active === "Folder") {
      return folders
        .filter((folder) => folder.parentId === currentFolderId)
        .filter((folder) =>
          folder.name.toLocaleLowerCase().includes(query)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return [];
  }, [active, folders, currentFolderId, search]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    let source = files;

    if (active === "Folder") {
      source = files.filter(
        (file) => file.folderId === currentFolderId
      );
    } else if (active === "Dashboard") {
      source = [...files]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);
    }

    return source
      .filter((file) => {
        const path = getFolderPath(file.folderId, folders);

        return (
          file.name.toLocaleLowerCase().includes(query) ||
          file.category.toLocaleLowerCase().includes(query) ||
          path.toLocaleLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [active, files, currentFolderId, folders, search]);

  const recentFolders = useMemo(
    () =>
      recentFolderIds
        .map((id) => folders.find((folder) => folder.id === id))
        .filter((folder): folder is FolderItem => Boolean(folder)),
    [recentFolderIds, folders]
  );

  const pageTitle =
    active === "Folder"
      ? currentFolder?.name ?? "Folder"
      : active;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-slate-800 md:flex">
      {/* SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#111D35] p-6 text-white md:flex">
        <div className="mb-12 flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2.5">
            <AudioLines size={25} />
          </div>

          <div>
            <h1 className="font-bold tracking-wide">
              WEB MUSIK GBIS
            </h1>
            <p className="text-xs text-slate-400">
              Music Management
            </p>
          </div>
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Menu Utama
        </p>

        <nav className="space-y-2">
          {[
            { name: "Dashboard" as const, icon: LayoutDashboard },
            { name: "Semua Folder" as const, icon: Folder },
            { name: "Semua File" as const, icon: Music2 },
            { name: "Terakhir Dibuka" as const, icon: Clock },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => navigateTo(item.name)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                active === item.name
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon size={19} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-blue-400">
            <HardDrive size={18} />
            <span className="text-sm font-medium">
              Penyimpanan
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Penyimpanan lokal browser
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Data prototipe tersimpan pada browser dan perangkat ini.
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-10">
          <div>
            <p className="text-sm text-slate-400">
              Music Library
            </p>
            <p className="font-semibold">{pageTitle}</p>
          </div>

          <div className="flex items-center gap-4">
            {saving && (
              <span className="text-xs text-blue-600">
                Menyimpan...
              </span>
            )}

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              G
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-8 p-5 md:p-10">
          {/* PAGE HEADING */}
          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {active === "Dashboard"
                  ? "Selamat Datang di Web Musik GBIS"
                  : pageTitle}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Kelola semua file sequencer, cue, click, dan references.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(active === "Dashboard" ||
                active === "Semua Folder" ||
                active === "Folder") && (
                <button
                  onClick={() => {
                    setFolderName("");
                    setErrorMessage("");
                    setShowFolderModal(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                >
                  <FolderPlus size={18} />
                  Buat Folder
                </button>
              )}

              {active === "Folder" && currentFolderId && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  <Upload size={18} />
                  Upload File
                </button>
              )}
            </div>
          </section>

          {errorMessage && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{errorMessage}</p>

              <button
                onClick={() => setErrorMessage("")}
                aria-label="Tutup pesan"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* DASHBOARD STATISTICS */}
          {active === "Dashboard" && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Total Folder",
                  value: folders.length,
                  icon: Folder,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  title: "Total File",
                  value: files.length,
                  icon: FileAudio,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  title: "References",
                  value: files.filter(
                    (file) => file.category === "Reference"
                  ).length,
                  icon: ImageIcon,
                  color: "text-violet-600",
                  bg: "bg-violet-50",
                },
              ].map((stat) => (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {stat.title}
                    </p>

                    <div
                      className={`rounded-xl p-3 ${stat.bg} ${stat.color}`}
                    >
                      <stat.icon size={21} />
                    </div>
                  </div>

                  <h3 className="mt-4 text-3xl font-bold">
                    {stat.value}
                  </h3>
                </div>
              ))}
            </section>
          )}

          {/* SEARCH INPUT */}
          {active !== "Terakhir Dibuka" && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <Search size={19} className="shrink-0 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  active === "Semua File"
                    ? "Cari nama file, jenis, atau folder..."
                    : "Cari folder atau file..."
                }
                className="w-full bg-transparent text-sm outline-none"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Hapus pencarian"
                >
                  <X size={17} className="text-slate-400" />
                </button>
              )}
            </div>
          )}

          {/* BREADCRUMB */}
          {active === "Folder" && currentFolderId && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={() => navigateTo("Semua Folder")}
                className="text-blue-600 hover:underline"
              >
                Semua Folder
              </button>

              {folderPath.map((folder, index) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-2"
                >
                  <ChevronRight
                    size={15}
                    className="text-slate-400"
                  />

                  <button
                    onClick={() => openFolder(folder.id)}
                    className={
                      index === folderPath.length - 1
                        ? "font-semibold text-slate-800"
                        : "text-blue-600 hover:underline"
                    }
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* FOLDER SECTION */}
          {(active === "Dashboard" ||
            active === "Semua Folder" ||
            active === "Folder") && (
            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">
                    {active === "Dashboard"
                      ? "Folder Terbaru"
                      : active === "Folder"
                        ? "Subfolder"
                        : "Semua Folder"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {active === "Semua Folder"
                      ? "Semua folder utama dan subfolder yang telah dibuat."
                      : active === "Folder"
                        ? "Folder di dalam lokasi ini."
                        : "Kumpulan folder sequencer kamu."}
                  </p>
                </div>

                {active === "Dashboard" && (
                  <button
                    onClick={() => navigateTo("Semua Folder")}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Lihat semua
                  </button>
                )}
              </div>

              {filteredFolders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
                  <Folder
                    size={38}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-medium text-slate-600">
                    {search
                      ? "Folder tidak ditemukan."
                      : "Belum ada folder."}
                  </p>

                  {!search && (
                    <p className="mt-1 text-sm text-slate-400">
                      Tekan tombol Buat Folder untuk menambahkan folder baru.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {filteredFolders.map((folder) => {
                    const descendantIds = getDescendantFolderIds(
                      folder.id,
                      folders
                    );

                    const fileCount = files.filter((file) =>
                      descendantIds.has(file.folderId)
                    ).length;

                    const subfolderCount = folders.filter(
                      (item) => item.parentId === folder.id
                    ).length;

                    return (
                      <div
                        key={folder.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => openFolder(folder.id)}
                            className="rounded-xl bg-amber-50 p-3 text-amber-500"
                            title="Buka folder"
                          >
                            <Folder size={27} />
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => renameFolder(folder)}
                              title="Ganti nama folder"
                              className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              onClick={() => deleteFolder(folder)}
                              title="Hapus folder"
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => openFolder(folder.id)}
                          className="mt-5 w-full text-left"
                        >
                          <h4 className="break-words font-semibold">
                            {folder.name}
                          </h4>

                          <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-400">
                            <span>{fileCount} file</span>
                            <span>{subfolderCount} subfolder</span>
                          </div>

                          <div className="mt-4 flex items-center justify-between text-xs text-blue-600">
                            Buka folder
                            <ChevronRight size={16} />
                          </div>
                        </button>

                        {active === "Semua Folder" && folder.parentId && (
                          <p className="mt-2 truncate text-xs text-slate-400">
                            Lokasi: {getFolderPath(folder.parentId, folders)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ALL FILES / FOLDER FILES / DASHBOARD RECENT FILES */}
          {(active === "Dashboard" ||
            active === "Semua File" ||
            active === "Folder") && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h3 className="font-bold">
                    {active === "Dashboard"
                      ? "File Terbaru"
                      : active === "Folder"
                        ? "File dalam Folder"
                        : "Semua File"}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    {active === "Semua File"
                      ? "Seluruh file dari semua folder dan subfolder."
                      : "File yang tersimpan di perpustakaan musik."}
                  </p>
                </div>

                {active === "Dashboard" && (
                  <button
                    onClick={() => navigateTo("Semua File")}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Lihat semua
                  </button>
                )}
              </div>

              {filteredFiles.length === 0 ? (
                <div className="py-12 text-center">
                  <FileAudio
                    size={38}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-medium text-slate-600">
                    {search ? "File tidak ditemukan." : "Belum ada file."}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {active === "Folder"
                      ? "Unggah file ke folder ini untuk mulai menyimpan."
                      : "File yang diunggah akan muncul di sini."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                          <FileAudio size={20} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {file.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-400">
                            {getFolderPath(file.folderId, folders)} ·{" "}
                            {file.category} · {formatSize(file.size)} ·{" "}
                            {file.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => downloadFile(file)}
                          title="Download file"
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Download size={18} />
                        </button>

                        <button
                          onClick={() => renameFile(file)}
                          title="Ganti nama file"
                          className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => deleteFile(file)}
                          title="Hapus file"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* RECENTLY OPENED */}
          {active === "Terakhir Dibuka" && (
            <section>
              <h3 className="mb-5 text-lg font-bold">
                Folder Terakhir Dibuka
              </h3>

              {recentFolders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
                  <Clock
                    size={36}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-medium text-slate-600">
                    Belum ada riwayat folder.
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Folder yang kamu buka akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {recentFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => openFolder(folder.id)}
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-lg"
                    >
                      <Folder
                        className="text-amber-500"
                        size={28}
                      />

                      <p className="mt-4 font-semibold">
                        {folder.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        {getFolderPath(folder.id, folders)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <footer className="py-3 text-center text-xs text-slate-400">
            © 2026 Web Musik GBIS. All rights reserved.
          </footer>
        </div>
      </main>

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={uploadFiles}
      />

      {/* CREATE FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={createFolder}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  Buat Folder Baru
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {currentFolder
                    ? `Folder akan dibuat di dalam ${currentFolder.name}.`
                    : "Buat folder utama baru."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X size={19} />
              </button>
            </div>

            <label className="mb-2 block text-sm font-medium">
              Nama Folder
            </label>

            <input
              autoFocus
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Contoh: Natal 2026"
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={!folderName.trim() || saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Folder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}