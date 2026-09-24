'use client';

import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'workflow' | 'syntax' | 'engine' | 'review' | 'privacy';

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('workflow');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 id="help-modal-title" className="text-sm font-semibold text-slate-100 uppercase tracking-wider font-mono">
                TemplaFill Documentation & User Guide
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Panduan lengkap alur kerja, sintaks template, mesin ekstraksi AI Gemini, dan keamanan data
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-sm font-mono px-2 py-1 rounded border border-slate-800 hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            ESC / [✕]
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto scrollbar-thin">
          {[
            { id: 'workflow', label: '1. Alur Kerja' },
            { id: 'syntax', label: '2. Sintaks Template' },
            { id: 'engine', label: '3. Mesin Dual AI' },
            { id: 'review', label: '4. Verifikasi & Edit' },
            { id: 'privacy', label: '5. Privasi & Keamanan' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabKey)}
              className={`px-4 py-2.5 text-xs font-mono font-medium tracking-wide transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
          {/* TAB 1: WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-2">
                  Langkah Pemrosesan Dokumen
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  TemplaFill mengekstrak informasi terstruktur dari dokumen PDF sumber secara cerdas dan memetakannya langsung ke placeholder template dokumen Anda tanpa merusak tata letak asli.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">1</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Upload Dokumen</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Pilih atau tarik (drag-and-drop) <strong>Source PDF</strong> (kontrak, laporan finansial, invoice, CV) dan <strong>Template Dokumen</strong> (.docx, .xlsx, atau .pptx) yang berisi placeholder.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">2</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Ekstraksi RAG & AI</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      PyMuPDF mem-parsing teks PDF, membuat semantic chunking, menghasilkan embedding vektor, dan memanggil <strong>Google Gemini 3.6 Flash</strong> untuk menemukan data persis yang dibutuhkan.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">3</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Review & Verifikasi</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Periksa nilai yang ditemukan, skor keyakinan (confidence), nomor halaman sumber, dan kutipan teks. Anda dapat mengedit nilai secara instan atau meminta re-ekstraksi dengan instruksi khusus.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">4</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Ekspor Dokumen Terisi</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Klik konfirmasi dan sistem akan menghasilkan dokumen Word, Excel, atau PowerPoint baru dengan semua placeholder terisi sempurna dan format asli tetap rapi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded text-xs space-y-1">
                <span className="font-mono text-blue-400 font-semibold uppercase">Mode Tamu / Tanpa Login:</span>
                <p className="text-slate-400">
                  TemplaFill dapat langsung digunakan tanpa memerlukan akun, pendaftaran, ataupun kredensial login. Sesi pemrosesan disimpan secara instan di browser Anda.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SYNTAX */}
          {activeTab === 'syntax' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Format Template yang Didukung
                </h3>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                    <span className="text-blue-400 font-mono font-bold text-xs">Microsoft Word</span>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">.DOCX</p>
                    <p className="text-[10px] text-slate-500 mt-1">Paragraf & Tabel</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                    <span className="text-emerald-400 font-mono font-bold text-xs">Microsoft Excel</span>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">.XLSX</p>
                    <p className="text-[10px] text-slate-500 mt-1">Sel Teks & Formula</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                    <span className="text-amber-400 font-mono font-bold text-xs">PowerPoint</span>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">.PPTX</p>
                    <p className="text-[10px] text-slate-500 mt-1">Text Box & Shapes</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  4 Pilihan Sintaks Placeholder
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  Anda bebas menggunakan salah satu dari 4 gaya penulisan placeholder berikut pada template dokumen Anda:
                </p>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-blue-300 font-bold">{'{{nama_field}}'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">Contoh: {'{{client_name}}'}, {'{{total_amount}}'}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">Sangat Direkomendasikan</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-indigo-300 font-bold">{'[nama_field]'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">Contoh: [effective_date], [vendor_name]</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Square Brackets</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-indigo-300 font-bold">{'<<nama_field>>'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">Contoh: &lt;&lt;contract_title&gt;&gt;</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Double Angle Brackets</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-indigo-300 font-bold">{'__nama_field__'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">Contoh: __invoice_number__</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Double Underscore</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                <span className="font-mono text-slate-200 font-semibold uppercase">Fleksibilitas Pencocokan:</span>
                <ul className="list-disc list-inside text-slate-400 space-y-1 mt-1">
                  <li><strong>Case-insensitive:</strong> {'{{Client_Name}}'} akan cocok dengan field `client_name`.</li>
                  <li><strong>Whitespace-tolerant:</strong> Spasi ekstra seperti {'{{  total_amount  }}'} otomatis dibersihkan.</li>
                  <li><strong>Preservasi Styling:</strong> Warna teks, ukuran font, tebal (bold), dan kemiringan (italic) pada placeholder akan diterapkan utuh ke data hasil ekstraksi.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: ENGINE */}
          {activeTab === 'engine' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Arsitektur Dual Extraction Engine
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  TemplaFill mengimplementasikan arsitektur pipeline ganda berdaya tahan tinggi, memastikan dokumen Anda selalu terproses tanpa gagal meskipun API AI eksternal sedang mengalami limit kuota.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-blue-400 uppercase">
                      1. Mesin Utama: Google Gemini 3.6 Flash + RAG
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      Primary AI
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Menggunakan model generative terbaru Google Gemini Flash dengan semantic vector retrieval melalui <code>gemini-embedding-001</code> (3072 dimensi). Mampu memahami konteks klausul kompleks, tabel finansial, dan penalaran semantik bernuansa tinggi.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-emerald-400 uppercase">
                      2. Mesin Cadangan: Heuristik & Aturan Lokal (Zero-Downtime Fallback)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Auto Fallback
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Apabila akun Google AI Studio mengalami limit kuota gratis (429 Too Many Requests) atau lonjakan beban server (503 Service Unavailable), TemplaFill secara otomatis beralih ke mesin heuristik lokal (deterministic pattern, regex, dan structural parsing). Proses ekstraksi tetap berjalan sukses tanpa menampilkan layar error kepada pengguna.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs">
                <span className="font-mono text-slate-300 font-semibold uppercase">Transparansi Sumber:</span>
                <p className="text-slate-400 mt-1">
                  Saat mode heuristik aktif, sistem menampilkan banner informatif di layar review, sehingga Anda mengetahui mesin mana yang sedang memproses data Anda.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEW & CONFIDENCE */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Tingkat Skor Keyakinan (Confidence Score)
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  Setiap field yang diekstraksi diberi indikator keyakinan untuk memudahkan proses audit data:
                </p>

                <div className="space-y-2 mt-2 text-xs">
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/60 rounded">
                    <div className="flex items-center justify-between font-mono font-bold text-emerald-400">
                      <span>HIGH CONFIDENCE (80% - 100%)</span>
                      <span className="text-[10px] uppercase font-sans text-emerald-300">Siap Pakai</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Data ditemukan secara pasti dan identik dengan teks pada PDF sumber tanpa ambiguitas konteks.
                    </p>
                  </div>

                  <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded">
                    <div className="flex items-center justify-between font-mono font-bold text-amber-400">
                      <span>MEDIUM CONFIDENCE (50% - 79%)</span>
                      <span className="text-[10px] uppercase font-sans text-amber-300">Disarankan Dicek</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Data disimpulkan dari paragraf sekitar atau format implisit. Periksa kutipan sumber untuk memastikan akurasi.
                    </p>
                  </div>

                  <div className="p-2.5 bg-rose-950/30 border border-rose-800/60 rounded">
                    <div className="flex items-center justify-between font-mono font-bold text-rose-400">
                      <span>LOW CONFIDENCE / NOT FOUND (&lt; 50%)</span>
                      <span className="text-[10px] uppercase font-sans text-rose-300">Perlu Penyesuaian</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Data tidak ditemukan secara eksplisit pada dokumen sumber. Anda dapat mengisinya secara manual atau menggunakan fitur Re-Extract.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Fitur Koreksi & Re-Ekstraksi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="font-mono text-slate-200 font-bold block mb-1">Edit Langsung (Inline Edit)</span>
                    <p className="text-slate-400">
                      Klik pada nilai field apa pun di tabel review untuk langsung mengetik atau memodifikasi nilainya sesuai kebutuhan.
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="font-mono text-slate-200 font-bold block mb-1">Re-Extract dengan Prompt Hint</span>
                    <p className="text-slate-400">
                      Klik tombol &quot;Re-Extract&quot; dan ketik petunjuk khusus (contoh: <em>&quot;Cari nomor kontrak di bagian header halaman 1&quot;</em>) untuk mencari ulang dengan fokus tertentu.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Kebijakan Tanpa Retensi Data (Zero Data Retention)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  TemplaFill dirancang dengan standar privasi ketat yang mematuhi prinsip GDPR dan PDP. Dokumen kerja Anda merupakan data rahasia Anda sendiri.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">1. Bebas Login & Tanpa Jejak Profil:</span>
                  <p className="text-slate-400 mt-1">
                    Anda tidak perlu memasukkan email, nomor telepon, atau data kredensial pribadi untuk menggunakan platform ini.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">2. Tidak Digunakan untuk Pelatihan AI:</span>
                  <p className="text-slate-400 mt-1">
                    Isi dokumen PDF dan nilai template Anda tidak pernah digunakan untuk melatih atau menyempurnakan model AI publik mana pun.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">3. Pembersihan Otomatis (Auto-Purge):</span>
                  <p className="text-slate-400 mt-1">
                    File sementara di memori backend otomatis dihapus setelah tugas selesai atau maksimal 1 jam setelah sesi berakhir.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">4. Enkripsi Transmisi End-to-End:</span>
                  <p className="text-slate-400 mt-1">
                    Semua pertukaran data antara browser dan server dilindungi dengan enkripsi HTTPS TLS 1.3 standar industri.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs font-mono text-slate-400">
          <span>TemplaFill v0.1.0 • Google Gemini 3.6 Flash</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium uppercase tracking-wider text-[11px] transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
