<div align="center">

# 🌿 Twig VCS

**A Git-inspired Version Control System with content-defined chunking and binary deduplication**

![Node.js](https://img.shields.io/badge/Node.js-ES%20Modules-green?logo=node.js)
![Storage](https://img.shields.io/badge/Storage-Content%20Addressable-blue)
![Dedup](https://img.shields.io/badge/Deduplication-99.54%25-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

---

## 📖 What is Twig?

Twig is a version control system built in **Node.js** that takes a different approach from Git when it comes to binary files.

Git stores full snapshots of files and uses delta compression — which works great for text, but can be wasteful for large binary assets like images, videos, compiled binaries, or game assets. Even a tiny change in a binary file forces Git to store an entirely new copy.

**Twig solves this by splitting files into variable-size chunks using Content-Defined Chunking (CDC).** Each chunk is stored once and identified by its SHA-1 hash. When a file changes, only the affected chunks are new — everything else is reused. The result: near-zero redundant storage for incrementally modified binary files.

---

## 🧠 Core Concepts

### Content-Defined Chunking (CDC)
Instead of splitting files at fixed byte offsets, Twig uses a **rolling hash** to find natural split points in the data. This means that inserting bytes at the start of a file shifts the content but not the chunk boundaries — the chunks after the inserted bytes remain identical and are reused.

### Manifests
Every file is represented by a **manifest** — a lightweight JSON document that lists the ordered sequence of chunk hashes that make up the file. The manifest is what gets committed, not the raw file.

### Content-Addressable Storage
Every chunk is stored under its SHA-1 hash in `.twig/chunks/`. If two files (or two versions of the same file) share a chunk, it is stored exactly once. No duplication, no waste.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Repository Initialization** | Set up a `.twig` directory with all required storage structures |
| **File Staging** | Add files to the index before committing |
| **Commit History** | Track changes over time with commit hashes and messages |
| **Checkout** | Restore any previous commit, reconstructing files from chunks |
| **Content-Addressable Storage** | Every object is stored and retrieved by its SHA-1 hash |
| **Manifest-Based Files** | Files are described as ordered lists of chunk hashes, not raw bytes |
| **Content-Defined Chunking** | Rolling hash finds natural chunk boundaries for maximum reuse |
| **Binary Deduplication** | Identical chunks across versions are stored only once |
| **Repository Verification** | Validate integrity of all stored objects and chunks |
| **Storage Benchmarking** | Measure chunk counts, sizes, and deduplication ratios |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or higher
- npm

### Installation

```bash
git clone https://github.com/your-username/twig-vcs.git
cd twig-vcs
npm install
npm link          # makes 'twig' available globally
```

### Quick Start

```bash
# 1. Initialize a new repository
./Twig.mjs init

# 2. Stage a file
./Twig.mjs add myfile.bin

# 3. Commit it
./Twig.mjs commit "Initial commit"

# 4. Modify the file and commit again
./Twig.mjs add myfile.bin
./Twig.mjs commit "Updated myfile"

# 5. View history
./Twig.mjs log

# 6. Go back to a previous version
./Twig.mjs checkout <commitHash>
```

---

## 🛠 Commands

```bash
./Twig.mjs init                  # Initialize a new Twig repository
./Twig.mjs add <file>            # Stage a file for the next commit
./Twig.mjs commit <message>      # Commit all staged files with a message
./Twig.mjs log                   # Show the full commit history
./Twig.mjs checkout <commitHash> # Restore the working directory to a past commit
./Twig.mjs stats                 # Show storage statistics (chunks, manifests, objects)
./Twig.mjs verify                # Verify integrity of the repository
./Twig.mjs benchmark <file>      # Benchmark CDC chunking on a file
```

---

## 🏗 Architecture

Twig's storage model flows from high-level commits down to raw binary chunks:

```
Commit
  │   A commit records a message, timestamp, parent hash,
  │   and a reference to the index snapshot.
  ↓
Index
  │   The index maps filenames to their manifest hashes,
  │   representing the state of the working directory.
  ↓
Manifest
  │   A manifest is a JSON file listing the ordered chunk
  │   hashes that compose a single file.
  ↓
Chunks
  │   Each chunk is a raw binary blob, stored under its
  │   SHA-1 hash in .twig/chunks/.
  ↓
File Data
      The original file content, split across chunks.
```

### File Reconstruction Flow

When you `checkout` a commit, Twig reconstructs files as follows:

```
Manifest  →  read ordered list of chunk hashes
    ↓
Chunk Hashes  →  locate each chunk in .twig/chunks/
    ↓
Load Chunks  →  read raw binary buffers from disk
    ↓
Buffer.concat()  →  concatenate in order
    ↓
Original File  →  written to working directory
```

### Repository Structure

```
.twig/
├── objects/        # Commit and index objects (JSON, keyed by SHA-1)
├── chunks/         # Raw binary chunks (keyed by SHA-1 of content)
├── manifests/      # Per-file manifests listing chunk hashes
├── HEAD            # Points to the current commit hash
└── index           # Staged file → manifest mapping
```

---

## 📊 Benchmark Results

These results were produced by running `twig benchmark` on a 5 MB random binary file, then modifying a few bytes and re-benchmarking.

### Chunking — Random Binary File (5 MB)

| Metric | Fixed Chunking | CDC (Twig) |
|---|---|---|
| File Size | 5 MB | 5 MB |
| Number of Chunks | 80 | 218 |
| Min Chunk Size | 65,536 bytes | 12,682 bytes |
| Max Chunk Size | 65,536 bytes | 65,313 bytes |
| Average Chunk Size | 65,536 bytes | 24,049 bytes |

CDC produces more, smaller chunks — which means finer granularity and more opportunities to reuse unchanged content.

### Deduplication — After Modifying a Few Bytes

| Metric | Value |
|---|---|
| Total Chunks | 218 |
| Reused Chunks | 217 |
| New Chunks Stored | 1 |
| **Deduplication Ratio** | **99.54%** |

> After modifying just a few bytes in a 5 MB binary file, Twig stored only **1 new chunk** out of 218. The remaining 217 chunks were identical to the previous version and required **zero additional storage**.

This is the core advantage of CDC over fixed chunking or full-file snapshots. A fixed-boundary chunker would have invalidated every chunk after the modification point; CDC naturally re-synchronizes chunk boundaries.

---

## 🛣 Roadmap

### ✅ Phase 2 — Complete

- [x] Chunk storage engine
- [x] Deduplication via content-addressable chunks
- [x] Manifest layer
- [x] File reconstruction engine
- [x] Checkout integration
- [x] Storage benchmarking

### 🔲 Phase 3 — Planned

- [ ] **FastCDC** — faster, more uniform chunking algorithm
- [ ] **Branch support** — create and switch between branches
- [ ] **Merge support** — merge diverged histories
- [ ] **Compression** — zlib/zstd compression of chunk storage
- [ ] **Remote repositories** — push/pull over HTTP or SSH

---

## 🧰 Tech Stack

| Technology | Role |
|---|---|
| **Node.js** | Runtime |
| **JavaScript (ES Modules)** | Language |
| **SHA-1** | Content-addressable hashing for chunks and objects |
| **Rolling Hash** | Content-defined chunking boundary detection |
| **Commander.js** | CLI interface |

---

## 🤝 Contributing

Contributions are welcome! If you'd like to work on a Phase 3 feature or find a bug:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/fastcdc`
3. Commit your changes: `git commit -m "Add FastCDC implementation"`
4. Push and open a pull request

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">
  Built with 🌿 by exploring what version control could look like for the binary world.
</div>