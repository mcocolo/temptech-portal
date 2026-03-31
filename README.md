# TEMPTECH — Portal de Clientes

Portal completo de atención al cliente con foro público, reclamos, videos, manuales y panel de administración.

**Stack:** React + Vite · Supabase (DB + Auth) · Resend (emails) · Vercel (hosting)

---

## 🚀 Setup paso a paso

### 1. Clonar y preparar

```bash
git clone https://github.com/TU_USUARIO/temptech-portal.git
cd temptech-portal
npm install
```

### 2. Supabase — Base de datos

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo
2. Ir a **SQL Editor** y ejecutar el archivo completo:
   ```
   supabase/migrations/001_schema.sql
   ```
3. Ir a **Project Settings > API** y copiar:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

### 3. Resend — Emails transaccionales

1. Entrá a [resend.com](https://resend.com) y creá una cuenta
2. Verificá tu dominio (o usá `onboarding@resend.dev` para pruebas)
3. Creá una API Key en **API Keys**
4. Guardá la key, la necesitás en el paso de Edge Functions

### 4. Supabase Edge Functions — Emails

```bash
# Instalar CLI de Supabase
npm install -g supabase

# Login
supabase login

# Vincular tu proyecto (el ID está en Project Settings)
supabase link --project-ref TU_PROJECT_ID

# Configurar secrets
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set ADMIN_EMAIL=soporte@temptech.com.ar
supabase secrets set APP_URL=https://tu-dominio.vercel.app

# Deploy de la función
supabase functions deploy send-email
```

### 5. Variables de entorno locales

Copiar `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completar con tus valores:
```env
ccVITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_NAME=TEMPTECH
VITE_APP_URL=http://localhost:5173
```

### 6. Correr localmente

```bash
npm run dev
# → http://localhost:5173
```

### 7. GitHub

```bash
git init
git add .
git commit -m "feat: initial TEMPTECH portal"
git remote add origin https://github.com/TU_USUARIO/temptech-portal.git
git push -u origin main
```

### 8. Vercel — Deploy

1. Entrá a [vercel.com](https://vercel.com) → **New Project**
2. Importar el repositorio de GitHub
3. En **Environment Variables** agregar:
   ```
   VITE_SUPABASE_URL = https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJ...
   VITE_APP_URL = https://tu-proyecto.vercel.app
   ```
4. Click en **Deploy** — Vercel detecta Vite automáticamente

Cada `git push` a `main` despliega automáticamente. ✅

---

## 👤 Crear el primer admin

Después de registrarte en el portal, ir a Supabase > **Table Editor > profiles** y cambiar tu `role` de `client` a `admin`.

---

## 📁 Estructura del proyecto

```
src/
├── components/
│   ├── layout/     # Sidebar + Topbar
│   └── ui/         # Button, Input, Modal, Badge...
├── hooks/
│   └── useAuth.jsx # Context de autenticación
├── lib/
│   ├── supabase.js # Cliente Supabase
│   └── email.js    # Helpers para Resend
├── pages/
│   ├── Auth.jsx         # Login / Registro
│   ├── Dashboard.jsx    # Panel principal
│   ├── Foro.jsx         # Foro público
│   ├── Reclamos.jsx     # Centro de reclamos
│   ├── Videos.jsx       # Galería de videos
│   ├── Manuales.jsx     # Biblioteca de manuales
│   ├── Novedades.jsx    # Blog de novedades
│   ├── MisConsultas.jsx # Historial del usuario
│   └── Admin.jsx        # Panel de administración
└── styles/
    └── globals.css

supabase/
├── migrations/
│   └── 001_schema.sql   # Schema completo + RLS
└── functions/
    └── send-email/      # Edge Function para Resend
```

---

## 🔐 Roles

| Rol     | Permisos |
|---------|----------|
| `client` | Crear consultas, reclamos, ver todo el contenido público |
| `admin`  | Todo lo anterior + responder oficialmente, gestionar reclamos, publicar videos/manuales/novedades, panel admin |

---

## 📧 Emails automáticos (via Resend)

| Evento | Destinatario |
|--------|-------------|
| Nueva consulta publicada | Admin |
| Nueva respuesta en consulta | Autor del post |
| Nuevo reclamo registrado | Admin |
| Reclamo actualizado | Cliente |
