# 🔐 Krypton Vault

> **Zero-Knowledge, Self-Destructing Secret Sharing**  
> End-to-end encrypted ephemeral messaging built with Next.js, Redis, and the Web Crypto API.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)](https://redis.io/)
[![Security](https://img.shields.io/badge/Encryption-AES--GCM--256-emerald?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

---

## 🌟 Overview

**Krypton Vault** is a secure, privacy-first web application designed for sharing passwords, API keys, private tokens, and sensitive notes over untrusted channels (Slack, Discord, Email, WhatsApp). 

By leveraging **in-browser cryptographic primitives** and **URL hash fragments**, the server never has access to the plaintext content or the decryption key. Once viewed, secrets are permanently erased from server memory.

---

## 🛡️ Security Architecture

Krypton Vault is designed around a **Zero-Knowledge** model:

```
Sender Browser                         Krypton Server (Redis)               Recipient Browser
  │                                           │                                   │
  ├─ 1. Generate 256-bit AES-GCM Key         │                                   │
  ├─ 2. Encrypt plaintext payload             │                                   │
  ├─ 3. POST { ciphertext, iv, ttl } ────────>│                                   │
  │     (Key is NEVER sent)                   ├─ 4. Store in Redis with TTL       │
  │                                           │                                   │
  ├─ 5. Construct URL: .../secret/:id#<KEY>   │                                   │
  │                                           │                                   │
  └─ 6. Share link with recipient ─────────── ┼ ─────────────────────────────────>│
                                              │                                   ├─ 7. Extract #<KEY> locally
                                              │<── 8. POST /api/secrets/:id ──────┤
                                              ├─ 9. Atomic GETDEL (erases memory) │
                                              ├─── 10. Return { ciphertext, iv }─>│
                                              │                                   ├─ 11. Decrypt with local #<KEY>
                                              │                                   └─ 12. Display plaintext to user
```

### Key Security Guarantees

1. **Client-Side Encryption:** Plaintext is encrypted locally in the user's browser using AES-GCM 256-bit via the native `window.crypto.subtle` API.
2. **Zero-Knowledge Key Storage:** The 256-bit raw symmetric key is appended as a URL hash fragment (`#key`). RFC standards dictate that hash fragments are **never transmitted to the server** in HTTP requests.
3. **Atomic Self-Destruction:** Secret retrieval is powered by Redis 7's atomic `GETDEL` command. The payload is permanently purged from memory upon reading, ensuring it can never be retrieved a second time.
4. **Link Preview & Crawler Protection:** Opening the link displays a confirmation screen first rather than burning the secret immediately. This prevents automated scrapers (Slack, Discord, iMessage preview bots) from accidentally destroying the secret.
5. **Configurable TTL:** Secrets automatically expire and self-destruct after a user-chosen duration (5 minutes, 1 hour, 24 hours, or 7 days) if left unread.

---

## ✨ Features

- ⚡ **Instant Link Generation:** Create one-time encrypted links in seconds.
- ⏱️ **Granular Expiration:** Choose from 5 Minutes, 1 Hour, 1 Day, or 7 Days.
- 📋 **One-Click Clipboard:** Fast copying with animated visual confirmation.
- 🧹 **Privacy Screen Clear:** Instant screen wipe button to prevent shoulder-surfing.
- 🎨 **Modern Cyber Aesthetic:** Deep dark theme with glassmorphism, glowing accents, and Geist typography.
- 📱 **Fully Responsive:** Seamlessly optimized across desktop, tablet, and mobile devices.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database / Cache:** [Redis 7](https://redis.io/) via `ioredis`
- **Cryptography:** Web Crypto API (`SubtleCrypto` AES-GCM 256-bit)
- **Language:** TypeScript 5

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v20.x or higher
- **npm** or **pnpm**
- **Docker** (for running Redis locally)

### 1. Clone the Repository

```bash
git clone https://github.com/kang-prog/krypton-vault.git
cd krypton-vault
```

### 2. Start Redis Container

Use the included `docker-compose.yml` to launch Redis:

```bash
docker compose up -d
```

Verify Redis is active:
```bash
docker ps
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
REDIS_URL=redis://localhost:6379
```

### 4. Install Dependencies & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Reference

### 1. Create Secret
- **Method:** `POST /api/secrets`
- **Body:**
  ```json
  {
    "ciphertext": "base64-encoded-ciphertext",
    "iv": "base64-encoded-iv",
    "ttlSeconds": 3600
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "id": "c2ed525c21d5b20a0cbf26e9561f7871",
    "ttlSeconds": 3600,
    "success": true
  }
  ```

### 2. Check Secret Status (Without Burning)
- **Method:** `GET /api/secrets/:id`
- **Response (`200 OK`):**
  ```json
  {
    "exists": true,
    "ttl": 3540
  }
  ```

### 3. Reveal & Burn Secret (Single-Use Destruction)
- **Method:** `POST /api/secrets/:id`
- **Response (`200 OK`):**
  ```json
  {
    "ciphertext": "base64-encoded-ciphertext",
    "iv": "base64-encoded-iv",
    "burned": true
  }
  ```
- *Note:* Subsequent calls will return `404 Not Found` because the record is deleted immediately.

---

## 🧪 Testing & Validation

Run the TypeScript compiler check:
```bash
npx tsc --noEmit
```

Run ESLint:
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
