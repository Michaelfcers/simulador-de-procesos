-- Habilitar extensión para UUIDs (necesario para las primary keys automáticas)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PERFILES (Enlazado automáticamente a los usuarios de Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  role TEXT CHECK (role IN ('profesor', 'estudiante')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PLANTILLAS DE JUEGO (Configuración base: Sobres, Aviones, etc.)
CREATE TABLE game_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  base_budget DECIMAL(10,2) NOT NULL DEFAULT 250.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CATÁLOGO DE MATERIALES (Precios dependientes de la plantilla)
CREATE TABLE template_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES game_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Ej. "Hoja de papel", "Tijera"
  price DECIMAL(10,2) NOT NULL,
  item_type TEXT CHECK (item_type IN ('materia_prima', 'herramienta')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SESIONES (Las clases en vivo gestionadas por el profesor)
CREATE TABLE sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES game_templates(id),
  professor_id UUID REFERENCES profiles(id),
  join_code TEXT UNIQUE NOT NULL, -- Ej. "SOBRES-2026"
  status TEXT CHECK (status IN ('ESPERA', 'PLANIFICACION', 'COMPRAS_PRODUCCION', 'EVALUACION', 'FINALIZADO')) DEFAULT 'ESPERA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. EQUIPOS (Las "Empresas" formadas por los estudiantes en una sesión)
CREATE TABLE teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CONTRATOS (La promesa inicial firmada)
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  promised_quantity INTEGER NOT NULL,
  agreed_price_per_unit DECIMAL(10,2) NOT NULL,
  pdf_r2_url TEXT, -- URL pública del archivo alojado en Cloudflare R2
  status TEXT CHECK (status IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')) DEFAULT 'PENDIENTE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. PRÉSTAMOS BANCARIOS (Tabla puente para aprobar/rechazar deudas)
CREATE TABLE loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL, -- Ej. 10.00 para representar 10%
  status TEXT CHECK (status IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO')) DEFAULT 'PENDIENTE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. LIBRO MAYOR (El motor financiero: transacciones de dinero)
CREATE TABLE ledger_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL, -- Positivo (ingresos) o Negativo (gastos)
  transaction_type TEXT CHECK (transaction_type IN (
    'PRESUPUESTO_INICIAL', 
    'COMPRA_MATERIAL', 
    'PRESTAMO_BANCO', 
    'PAGO_PRESTAMO_INTERES', 
    'VENTA_FINAL', 
    'PENALIZACION',
    'OTRO'
  )),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. INVENTARIO FÍSICO (Los materiales que posee el equipo en tiempo real)
CREATE TABLE team_inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  item_id UUID REFERENCES template_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, item_id) -- Un equipo no debe tener la misma herramienta en 2 filas, solo se suma la cantidad
);

-- 10. EVALUACIONES (El registro de la realidad final hecho por el profesor)
CREATE TABLE evaluations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  quality_score DECIMAL(5,2),          -- Puntaje general cualitativo
  notes TEXT,                          -- Observaciones del profesor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE evaluation_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES template_production_rubrics(id),
  quantity INTEGER NOT NULL DEFAULT 0
);

-- 11. RUBROS DE PRODUCCIÓN (Precios de venta de productos terminados según estado)
CREATE TABLE template_production_rubrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES game_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- Ej. "Aceptable", "Bajo negociación", "Tarjetas"
  price_per_unit DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 12. REGLAS BANCARIAS (Escalas de préstamos y garantías por plantilla)
ALTER TABLE game_templates ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT 10.00;
ALTER TABLE game_templates ADD COLUMN IF NOT EXISTS initial_equity DECIMAL(10,2) DEFAULT 150.00;

CREATE TABLE template_bank_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES game_templates(id) ON DELETE CASCADE,
  min_amount DECIMAL(10,2) NOT NULL,
  max_amount DECIMAL(10,2), -- NULL para "o más"
  guarantee_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 12. ESTUDIANTES INVITADOS (Identidad temporal por sesión)
CREATE TABLE session_guests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  device_token UUID NOT NULL, -- UUID generado en el frontend y guardado en LocalStorage
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- Se llena cuando se une a un equipo
  is_online BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, device_token) -- Evita duplicados del mismo dispositivo en la misma sala
);

-- 13. SOLICITUDES DE EQUIPO (Para el sistema de "pedir permiso" al profesor)
CREATE TABLE team_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES session_guests(id) ON DELETE CASCADE,
  request_type TEXT CHECK (request_type IN ('CREATE_TEAM', 'JOIN_TEAM')),
  requested_team_name TEXT, -- Solo se usa si es CREATE_TEAM
  target_team_id UUID REFERENCES teams(id), -- Solo se usa si es JOIN_TEAM
  status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
