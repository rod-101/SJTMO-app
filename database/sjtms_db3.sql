--
-- PostgreSQL database dump
--

\restrict T2HNhvVhAxnsey9Z3kbL6CwgQnkzofKOzAopqgWz2IdvkNQ4hVVV1itZ5BYxn3G

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg12+2)
-- Dumped by pg_dump version 18.3

-- Started on 2026-09-29 18:20:31

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: db_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO db_user;

--
-- TOC entry 248 (class 1255 OID 16728)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: db_user
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO db_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 235 (class 1259 OID 16710)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id uuid,
    user_name character varying(150),
    action character varying(100) NOT NULL,
    target_table character varying(50),
    target_id text,
    old_value jsonb,
    new_value jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO db_user;

--
-- TOC entry 234 (class 1259 OID 16709)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: db_user
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO db_user;

--
-- TOC entry 3604 (class 0 OID 0)
-- Dependencies: 234
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: db_user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 221 (class 1259 OID 16428)
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.email_verification_tokens OWNER TO db_user;

--
-- TOC entry 227 (class 1259 OID 16553)
-- Name: motorists; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.motorists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    license_no character varying(30),
    birthday date,
    address text,
    contact_no character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid
);


ALTER TABLE public.motorists OWNER TO db_user;

--
-- TOC entry 231 (class 1259 OID 16643)
-- Name: ordinances; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.ordinances (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255),
    uploaded_by uuid,
    upload_date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ordinances OWNER TO db_user;

--
-- TOC entry 230 (class 1259 OID 16642)
-- Name: ordinances_id_seq; Type: SEQUENCE; Schema: public; Owner: db_user
--

CREATE SEQUENCE public.ordinances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordinances_id_seq OWNER TO db_user;

--
-- TOC entry 3605 (class 0 OID 0)
-- Dependencies: 230
-- Name: ordinances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: db_user
--

ALTER SEQUENCE public.ordinances_id_seq OWNED BY public.ordinances.id;


--
-- TOC entry 222 (class 1259 OID 16447)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_reset_tokens OWNER TO db_user;

--
-- TOC entry 232 (class 1259 OID 16660)
-- Name: patrol_areas; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.patrol_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.patrol_areas OWNER TO db_user;

--
-- TOC entry 233 (class 1259 OID 16674)
-- Name: patrol_assignments; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.patrol_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enforcer_id uuid NOT NULL,
    area_id uuid NOT NULL,
    shift_date date NOT NULL,
    shift_start time without time zone,
    shift_end time without time zone,
    notes text,
    status character varying(20) DEFAULT 'assigned'::character varying NOT NULL,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT patrol_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'acknowledged'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.patrol_assignments OWNER TO db_user;

--
-- TOC entry 229 (class 1259 OID 16604)
-- Name: payments; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    receipt_no character varying(50) NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    processed_by uuid,
    payment_method character varying(30) DEFAULT 'cash'::character varying,
    paid_at timestamp with time zone DEFAULT now(),
    notes text,
    receipt_filename character varying(255),
    submitted_by_motorist boolean DEFAULT false NOT NULL,
    verified boolean DEFAULT true NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    CONSTRAINT payments_amount_paid_check CHECK ((amount_paid > (0)::numeric)),
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'gcash'::character varying, 'bank_transfer'::character varying, 'others'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO db_user;

--
-- TOC entry 236 (class 1259 OID 16734)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    token_hash character varying(255) NOT NULL,
    user_agent text,
    ip_address character varying(64),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO db_user;

--
-- TOC entry 223 (class 1259 OID 16466)
-- Name: staff_invite_tokens; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.staff_invite_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    invited_by uuid,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.staff_invite_tokens OWNER TO db_user;

--
-- TOC entry 219 (class 1259 OID 16399)
-- Name: ticket_seq; Type: SEQUENCE; Schema: public; Owner: db_user
--

CREATE SEQUENCE public.ticket_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_seq OWNER TO db_user;

--
-- TOC entry 226 (class 1259 OID 16503)
-- Name: tickets; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_no character varying(30) DEFAULT ('TCT-'::text || lpad((nextval('public.ticket_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    motorist_id uuid,
    motorist_name character varying(150) NOT NULL,
    license_no character varying(30),
    enforcer_id uuid,
    enforcer_name character varying(150) NOT NULL,
    violation_type character varying(255),
    notes text,
    date_issued timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    access_token uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid,
    evidence_filename character varying(255),
    CONSTRAINT tickets_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'payment_submitted'::character varying, 'paid'::character varying, 'resolved'::character varying, 'dismissed'::character varying, 'disputed'::character varying, 'overdue'::character varying])::text[])))
);


ALTER TABLE public.tickets OWNER TO db_user;

--
-- TOC entry 220 (class 1259 OID 16400)
-- Name: users; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    birthday date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'pending_verification'::character varying,
    last_login timestamp with time zone,
    token_version integer DEFAULT 0,
    email_verified boolean DEFAULT false,
    email_verified_at timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'enforcer'::character varying, 'motorist'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'pending_verification'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO db_user;

--
-- TOC entry 228 (class 1259 OID 16579)
-- Name: vehicles; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    motorist_id uuid,
    plate_no character varying(20),
    no_plate boolean DEFAULT false,
    vehicle_type character varying(30),
    make character varying(100),
    model character varying(100),
    color character varying(50),
    or_cr_no character varying(50),
    or_cr_presented boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vehicles_vehicle_type_check CHECK (((vehicle_type)::text = ANY ((ARRAY['motorcycle'::character varying, 'car'::character varying, 'suv'::character varying, 'truck'::character varying, 'jeepney'::character varying, 'tricycle'::character varying, 'van'::character varying, 'bus'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.vehicles OWNER TO db_user;

--
-- TOC entry 225 (class 1259 OID 16492)
-- Name: violation_types; Type: TABLE; Schema: public; Owner: db_user
--

CREATE TABLE public.violation_types (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    fine numeric(10,2) DEFAULT 0.00
);


ALTER TABLE public.violation_types OWNER TO db_user;

--
-- TOC entry 224 (class 1259 OID 16491)
-- Name: violation_types_id_seq; Type: SEQUENCE; Schema: public; Owner: db_user
--

CREATE SEQUENCE public.violation_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.violation_types_id_seq OWNER TO db_user;

--
-- TOC entry 3606 (class 0 OID 0)
-- Dependencies: 224
-- Name: violation_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: db_user
--

ALTER SEQUENCE public.violation_types_id_seq OWNED BY public.violation_types.id;


--
-- TOC entry 3330 (class 2604 OID 16713)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 3321 (class 2604 OID 16646)
-- Name: ordinances id; Type: DEFAULT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.ordinances ALTER COLUMN id SET DEFAULT nextval('public.ordinances_id_seq'::regclass);


--
-- TOC entry 3298 (class 2604 OID 16495)
-- Name: violation_types id; Type: DEFAULT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.violation_types ALTER COLUMN id SET DEFAULT nextval('public.violation_types_id_seq'::regclass);


--
-- TOC entry 3597 (class 0 OID 16710)
-- Dependencies: 235
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.audit_logs (id, user_id, user_name, action, target_table, target_id, old_value, new_value, ip_address, created_at) FROM stdin;
1	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	assign_patrol	patrol_assignments	8755297d-7664-4254-be67-b7f2700faa58	\N	{"area_id": "176f7d63-e8ea-45c9-ac09-392459a3e8a4", "enforcer": "Cindy Salazar", "shift_date": "2026-08-31"}	10.25.104.130	2026-08-31 05:07:51.307198+00
2	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	assign_patrol	patrol_assignments	50b22f93-eaf2-44f7-8401-b074d70473ec	\N	{"area_id": "176f7d63-e8ea-45c9-ac09-392459a3e8a4", "enforcer": "Chevy Chevrolei Hernandez", "shift_date": "2026-08-31"}	10.25.104.130	2026-08-31 05:08:18.565589+00
3	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	TICKET_ISSUED	tickets	63caee8e-e8bd-47bd-a729-b7ec511a7a5f	\N	{"ticket_no": "TCT-00201", "motorist_name": "Nestor Pascual", "vehicle_plate": "NAR 5091", "violation_type": "No Helmet"}	\N	2026-08-31 05:18:51.470487+00
4	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	TICKET_ISSUED	tickets	3b137051-61e9-4340-aab5-50185d161cd5	\N	{"ticket_no": "TCT-00202", "motorist_name": "Allan Dilon Esteves", "vehicle_plate": "JHR 9271", "violation_type": "No Helmet"}	\N	2026-08-31 05:25:43.0538+00
5	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	assign_patrol	patrol_assignments	63494dca-08ba-48b5-b739-4b35407bc41b	\N	{"area_id": "176f7d63-e8ea-45c9-ac09-392459a3e8a4", "enforcer": "Chevy Chevrolei Hernandez", "shift_date": "2026-09-03"}	10.30.219.11	2026-09-03 00:42:07.303604+00
6	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	assign_patrol	patrol_assignments	66ffa40a-e0e6-4826-8b4c-a5c60fedeaec	\N	{"area_id": "176f7d63-e8ea-45c9-ac09-392459a3e8a4", "enforcer": "Cindy Salazar", "shift_date": "2026-09-03"}	10.30.99.55	2026-09-03 00:45:49.438878+00
7	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	TICKET_ISSUED	tickets	e4b10f73-e303-4c0f-8e51-c581b189e41a	\N	{"ticket_no": "TCT-00203", "motorist_name": "ayessa peralta", "vehicle_plate": "SJN 0619", "violation_type": "Illegal Parking, Reckless Driving, No Helmet"}	\N	2026-09-10 11:00:00.817742+00
8	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	assign_patrol	patrol_assignments	4bd08720-ef12-462e-92cf-f8a89159ffa6	\N	{"area_id": "ea822547-3ff6-4887-91e6-11f99e8d9aa0", "enforcer": "Cindy Salazar", "shift_date": "2026-09-11"}	10.26.93.129	2026-09-10 11:56:44.956411+00
9	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	assign_patrol	patrol_assignments	ac583689-357a-4732-b3e5-ec5e89545b98	\N	{"area_id": "9d872d0f-fd5d-4cbc-b499-8dd80a49645e", "enforcer": "Chevy Chevrolei Hernandez", "shift_date": "2026-09-11"}	10.29.192.116	2026-09-10 11:58:50.101766+00
10	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	PAYMENT_RECORDED	payments	a6327229-0ced-4179-8780-8e038c01c732	\N	{"ticket_id": "3b137051-61e9-4340-aab5-50185d161cd5", "receipt_no": "SJ-990022", "amount_paid": "500.00", "payment_method": "cash"}	\N	2026-09-13 20:42:52.530557+00
11	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	TICKET_ISSUED	tickets	ee15254e-6497-4e5f-8973-a1dccdd674c0	\N	{"ticket_no": "TCT-00204", "motorist_name": "Jake Rosete", "vehicle_plate": "SJ-2345", "violation_type": "No Helmet"}	\N	2026-09-17 06:19:47.161801+00
12	993c8558-1fc7-4e41-beda-399eed19a082	Jake Rosete	PAYMENT_SUBMITTED_BY_MOTORIST	payments	49a939aa-cf23-4b25-a9a1-77c3e3b68105	\N	{"ticket_id": "ee15254e-6497-4e5f-8973-a1dccdd674c0", "receipt_no": "TCT-123457", "amount_paid": "500.00", "payment_method": "cash"}	\N	2026-09-17 06:29:41.178323+00
13	a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	PAYMENT_VERIFIED	payments	49a939aa-cf23-4b25-a9a1-77c3e3b68105	\N	{"ticket_id": "ee15254e-6497-4e5f-8973-a1dccdd674c0"}	\N	2026-09-17 06:31:02.898742+00
\.


--
-- TOC entry 3583 (class 0 OID 16428)
-- Dependencies: 221
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.email_verification_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
acc7ba75-f480-4fea-a4d6-815dc79c58c0	b108324f-2fe7-47db-bd4e-fd05d9466bd7	360d717fc26de611a4fdb1fcc933e1ec10df356071f9ffef63406521a1482502	2026-09-03 10:12:40.424+00	2026-09-02 10:14:20.342674+00	2026-09-02 10:12:42.140159+00
cfba70e3-904f-450d-84b5-ecdb87f0531f	4e559637-dca5-4b6f-9a7f-466f8ce45cfc	0bcef6a041ef693ccbbc58fc9258c78ef82a5f9c4933d6289f6801d3fb8548d0	2026-09-11 11:02:59.717+00	2026-09-10 11:03:35.904802+00	2026-09-10 11:02:59.100868+00
2c0b1ae1-e5a7-412f-bea2-a227db05a5db	993c8558-1fc7-4e41-beda-399eed19a082	6168138f6a6dabb6759d6fd83b29267612699facb17fee5a38a10936cbc1a495	2026-09-18 06:25:00.793+00	2026-09-17 06:25:39.491774+00	2026-09-17 06:25:00.34177+00
\.


--
-- TOC entry 3589 (class 0 OID 16553)
-- Dependencies: 227
-- Data for Name: motorists; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.motorists (id, first_name, last_name, license_no, birthday, address, contact_no, created_at, updated_at, user_id) FROM stdin;
79d6d2da-ae32-414f-8d92-9bcf5931306d	Leonora	Evangelista	\N	\N	\N	09720351347	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
ee97d3bb-22b3-4b9e-bed8-30a36bd2d1ad	Eduardo	Kabigting	\N	\N	\N	09340371669	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
69cf0683-8953-4303-b31d-2715aa462cf8	Dennis	Bautista	\N	\N	\N	09551488244	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3ffd10fb-42ba-4eb9-b3a4-dc5ab13105e8	Leandro	Castillo	\N	\N	\N	09812235333	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
421a813d-735c-4e02-a023-0b62cc7af99d	Mariano	Salazar	\N	\N	\N	09845463521	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
84f9bde3-9663-4791-8ace-e5b877cce3a0	Elena	Bagamasbad	\N	\N	\N	09544404235	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
65d909c6-f264-4a33-a265-dad701b1ce61	John	Ramos	\N	\N	\N	09321088732	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
cec1ef86-4d20-4c5d-ac89-9cef42008468	Herminio	Galang	\N	\N	\N	09044651377	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
dfb46de4-1779-48c5-80eb-f016b5c0866e	Jocelyn	Lacap	\N	\N	\N	09151705025	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
ec840ec2-e42f-408c-bd7d-4e2c80bbc712	Gemma	Pineda	\N	\N	\N	09966886773	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3dbca453-c90e-4681-b3d2-8ffaf894bd07	Carlos	Evangelista	\N	\N	\N	09094646081	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
da426c1e-1f33-4a29-b725-f8e0c265464a	Celestino	Hernandez	\N	\N	\N	09777754409	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2b369792-2651-465b-8f40-d5c1ad353eca	Rommel	Mallari	\N	\N	\N	09671175183	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c01c852e-8541-4106-a8ea-55e6c8358d9a	Cornelio	Tinio	\N	\N	\N	09333000314	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
412cf07f-2348-49e6-aec4-6bf7bfe6ecf5	Domingo	Mallari	\N	\N	\N	09155400034	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
45b4bf76-2197-4153-a014-b38dbf1a4bc1	Nestor	Villanueva	\N	\N	\N	09151896896	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
917a7066-b584-45d8-b273-8f442513b6c9	Gemma	Bautista	\N	\N	\N	09344608870	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
4de7d8b3-b976-4ac8-b031-918e4663e8bb	Leonora	Tiongson	\N	\N	\N	09824593309	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f3f4209f-355f-45f2-80ce-b6de72f21c7d	Teresita	Tayag	\N	\N	\N	09275478702	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
6a04a52b-0f06-4dc4-8b85-687a0c77d72f	Zenaida	Mandap	\N	\N	\N	09748218879	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
97b7e325-0386-4a85-8f19-86bc598e6938	Marvin	Dungca	\N	\N	\N	09391150212	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
006fe65b-0e4b-4a62-b584-c3cff94b0ea7	Danilo	Tayag	\N	\N	\N	09157784057	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
fba75231-03e3-418b-9df9-e7e007c40344	Cornelio	Ramos	\N	\N	\N	09121971374	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
5dbf54f3-97f2-4396-ac2d-70311f96dcd2	Miguel	Torres	\N	\N	\N	09568967637	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
14c39426-8418-4ee1-b768-6b1953176ffd	Herminio	Gutierrez	\N	\N	\N	09646075138	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
36ed3ea6-ee10-4137-8b8d-6bc7d30d01d2	Nestor	Ramos	\N	\N	\N	09387803095	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
744e038e-bf37-433d-8677-78323fa5d217	Manuel	Garcia	\N	\N	\N	09879483256	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
87d6be9f-77fd-4140-8ec8-010096ae76e7	Marvin	Bautista	\N	\N	\N	09315333606	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
390bd475-e488-4a0c-88e4-e2d9f2f81f5b	Zenaida	Macaraeg	\N	\N	\N	09846828050	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a58d721f-98cf-4682-9210-99583f6d93d2	Sheila	Buenaventura	\N	\N	\N	09643012466	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
0ca0068c-51d2-4f12-bf9f-b07c4edea9ad	Ramon	Tolentino	\N	\N	\N	09472529295	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
55e9749a-4da2-4e61-b11e-e12bba04ab40	Pedro	Sison	\N	\N	\N	09292179631	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
6c282b06-d6cd-4ff6-9453-75e78fce9cc3	Leandro	Concepcion	\N	\N	\N	09735627620	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
5c5155ab-cb8b-48fc-910f-ba131efa87dd	Alfredo	Galang	\N	\N	\N	09657054411	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8b7a8e2f-310e-4d30-91de-402af8dbf62b	Marilou	Dela Torre	\N	\N	\N	09311339674	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
28f0638f-0196-4f46-ad1e-67ead9162fd9	Eduardo	Navarro	\N	\N	\N	09284686748	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
d775ce10-452b-45d0-a339-ccb1d223f84f	Ramon	Tinio	\N	\N	\N	09983344438	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
1ed3c9ca-6a40-47cf-9499-08629fce2b60	Juan	Dimaculangan	\N	\N	\N	09784946481	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
381c8426-24ae-4256-878c-c9708ce8a2d9	Rodel	Tiongson	\N	\N	\N	09789422659	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a878fbb5-5f21-463c-b56c-58f1b43b2030	Fernando	Aguilar	\N	\N	\N	09591863131	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
340ca04c-3438-42b8-b367-eb564abef02a	Alfredo	Lingad	\N	\N	\N	09561063818	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
24095ed2-0c9e-4333-b771-eddbb1a9a402	Remedios	Hernandez	\N	\N	\N	09780593324	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8f842b9d-3bea-4ee2-bd50-23c0d7d75bfb	Noel	Dela Cruz	\N	\N	\N	09785358819	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
7f33cf04-d351-431a-91bd-95db86987cb7	Antonio	Malit	\N	\N	\N	09198601830	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
16c00cf3-19c0-4b87-91ff-6d3edcb5f81a	Sherwin	Policarpio	\N	\N	\N	09781615675	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8976f19d-a0cd-4459-a653-c37e51f98edd	Ricardo	Espiritu	\N	\N	\N	09219558503	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
87a585d9-b237-4473-b0ce-ef8a4eec1435	Perla	Sison	\N	\N	\N	09284369630	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
040fd03b-204e-44c9-8bcd-074d9515aa66	Evelyn	Yumul	\N	\N	\N	09671195479	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
fb1e3696-2879-4fa3-b741-28c5a15be841	Jose	Garcia	\N	\N	\N	09872560470	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
9be75cb1-61b9-4fed-881b-c80467ae2314	Arturo	Paglinawan	\N	\N	\N	09786600128	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
ccb93aed-71a2-4c42-b0bb-188e85fb076d	Domingo	Paglinawan	\N	\N	\N	09635925814	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8e1777be-7dc1-4408-9f60-62323593e260	Bernardo	Ocampo	\N	\N	\N	09478486234	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8e75b5e3-a7d3-4bb4-9a23-6d291955c4aa	Perla	Soriano	\N	\N	\N	09124871550	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
aae5ed99-7b46-40d5-aaa0-a1b8f43ea6bd	Corazon	Ferrer	\N	\N	\N	09205517931	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
56944817-ef4e-4d5d-9c69-1b9211067e7b	Leandro	Macapagal	\N	\N	\N	09287643788	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
535bb3e4-4caa-49a9-8178-dc69d361f063	Alejandro	Galang	\N	\N	\N	09106857841	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
23fbdc8d-c739-4713-b7c8-d0538487e194	Simplicio	Soriano	\N	\N	\N	09964757088	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
dd364e1c-3302-46fc-99a0-0c297abe5633	Evelyn	Silverio	\N	\N	\N	09998792570	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2614c3b8-bf53-42dd-91d6-d0f321e39bd8	Alfredo	Galang	\N	\N	\N	09063066392	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
83ff01e2-1b12-4d0d-931c-68ce3f1fc510	Simplicio	Hernandez	\N	\N	\N	09846131477	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
5d266376-b85e-4ce4-8cea-4725af5e7c74	Miguel	Manalo	\N	\N	\N	09157724383	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3c2e42e9-30b4-4ddd-96d9-0cd992ff70e1	Ernesto	Flores	\N	\N	\N	09662573935	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
587a5cc7-d4d3-453e-802d-0f7167ca31dd	Alvin	Magpantay	\N	\N	\N	09010394113	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f0ac1348-d5f5-48da-bcd5-ffc2d10f30b2	Carlos	Lacap	\N	\N	\N	09242280734	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f6af87ad-c3cb-4b7a-ab97-50a001d5e94d	Jayson	Lingad	\N	\N	\N	09095858700	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c395b5da-6f1a-452d-9f3a-a4b12795c96f	Celestino	Galang	\N	\N	\N	09022001194	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3d5ec6c1-f613-4391-8161-29442f173780	Fernando	Dungca	\N	\N	\N	09835044641	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
9696acbf-72e1-4397-be5f-4416d084754f	Carlos	Dela Cruz	\N	\N	\N	09439878618	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f8abecf5-ea81-4fd7-a2fe-b3667065a157	Rosa	Sison	\N	\N	\N	09395927394	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
119e1416-7da8-4daf-85f4-d4a047ad6812	Ramon	Castillo	\N	\N	\N	09486314149	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
5b949e7c-29c5-41a2-86b7-04fbbddba14c	Zenaida	Dimaculangan	\N	\N	\N	09536234565	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
d3d6ab2a-1c78-4422-a2df-9d2aecfa19e4	Cristina	Reyes	\N	\N	\N	09665623638	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
9c16e684-3830-4739-bf80-152144d86271	Zenaida	Dela Cruz	\N	\N	\N	09294034258	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
fff4ee4a-23e0-458b-bbb8-b6553dd4c1ea	Roberto	Manalo	\N	\N	\N	09793103887	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3df8bfb2-c1db-4cbe-b923-db4a758fc813	Arturo	Tiongson	\N	\N	\N	09698772401	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
b610039e-6255-4651-b02d-297a6cfd512d	Cornelio	Dela Cruz	\N	\N	\N	09666400066	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
83a6148f-c5ed-4a4e-96b2-1634e8dfa2ea	Evelyn	Gonzales	\N	\N	\N	09599187073	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
237265b0-2698-484b-a54b-9bb61efc7df4	Miguel	Panlilio	\N	\N	\N	09966962711	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
0e816893-d713-4204-bd6c-8d326f28a2ec	Maria	Garcia	\N	\N	\N	09861951438	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
d01f3396-1a4b-460f-9bd3-819c1916983c	Alvin	Beltran	\N	\N	\N	09440129328	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
1ed7e36b-c668-4047-9aaf-79ae93dfebaf	Ana	Tinio	\N	\N	\N	09371297275	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
4a5322e7-2d1f-481b-a777-83203c499b45	Renz	Dungca	\N	\N	\N	09481200362	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
4347a433-1ebf-4191-b308-997b9bc519c9	Arturo	Mallari	\N	\N	\N	09685731630	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
473df490-aa70-4794-98af-2a954ce228b2	Teodoro	Silverio	\N	\N	\N	09930794399	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
70afd47c-87ec-4947-a363-a790737ef5c6	Rodrigo	Espiritu	\N	\N	\N	09446814142	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
66573242-baa5-4a58-a7ea-6ad2b8f5a377	Marilou	Evangelista	\N	\N	\N	09150597448	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2394bc9b-d313-462a-8491-b46db7c2124d	Rowena	Hernandez	\N	\N	\N	09841428109	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c6b6c014-a424-48b8-ae21-551a724d1408	Antonio	Cruz	\N	\N	\N	09315044682	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2fe507f2-cfa3-41e3-bad6-b1e6bca40abd	Lourdes	Aguilar	\N	\N	\N	09739180011	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
d61eb64f-9450-4dbb-a97f-0aecc7cedb10	Ricardo	Reyes	\N	\N	\N	09162240029	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a89d6b79-5e38-40c7-9074-320551bd7f66	Cornelio	Lacap	\N	\N	\N	09212044126	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
e3c4505a-0a7f-4878-bc53-fb075cc0bb45	Aldrin	Flores	\N	\N	\N	09824063849	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
162011f5-e764-498c-8f68-5e43fe994602	Dennis	Dela Cruz	\N	\N	\N	09558833822	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
84242360-1f10-4048-ba36-3ef31324576e	Noel	Paglinawan	\N	\N	\N	09841220221	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2e1ef2fe-77de-4e5c-ae86-4d308fb89d7f	Teodoro	Mendoza	\N	\N	\N	09566697277	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
ce1c58d5-b817-4630-b8d2-bee0b80239d5	Jocelyn	Galang	\N	\N	\N	09868474836	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
630265b9-567a-4b86-a4b3-b7ad574a512e	Evelyn	Macaraeg	\N	\N	\N	09274337243	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a1f1dded-d092-42a9-a063-0771145934a2	Celestino	Pangilinan	\N	\N	\N	09005818757	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f0a9021c-15b0-4bd4-98ed-0047abdb8bd1	Juan	dela Cruz	\N	\N	\N	09925941615	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
ed24ed62-02a6-41bd-9d90-b975d2cc4771	Zenaida	Cruz	\N	\N	\N	09606207793	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2f314fc0-72fa-4d4e-80ce-b89027b49246	Sherwin	Pascual	\N	\N	\N	09500312433	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
9152b377-7e31-49c1-8e02-bd550634e1ca	Elena	Reyes	\N	\N	\N	09704897781	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
de621475-7705-4b4f-8e38-79ca57912899	Renato	Torres	\N	\N	\N	09763922241	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f9da1607-ebd7-4799-ac8a-4f63648b4efa	Marvin	Evangelista	\N	\N	\N	09375318605	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
15b10737-4150-4634-a437-fcd1487d84e3	Crisanto	Cruz	\N	\N	\N	09587274081	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
68eccd7d-8198-41a2-8c75-3c2a4435f022	Nestor	Macaraeg	\N	\N	\N	09287438950	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c4be30b4-e8c4-4819-899d-7b341ba9a03e	Teresita	Policarpio	\N	\N	\N	09141315774	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
7ec54295-5a1f-4550-aa26-4f1af8235e5e	Domingo	Concepcion	\N	\N	\N	09840964620	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3b5faad6-222f-4030-91da-28cdbc1a5988	Manuel	Sison	\N	\N	\N	09588000083	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
58718a3f-bb2d-4a2a-8043-8e77bb3270f2	Jomar	Kabigting	\N	\N	\N	09014971758	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
d8d41761-efac-4599-a273-c744e0f4d422	Crisanto	Aquino	\N	\N	\N	09714425164	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
034f97b3-2500-4d72-b317-daca10dbd37e	Alejandro	Concepcion	\N	\N	\N	09804784661	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
e5ea0b7f-bed1-400a-9ad2-df6cd6c56eee	Kevin	Reyes	\N	\N	\N	09420641997	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
9cfd1d74-3623-40ca-b461-7eda0e04f66b	Marilyn	Salazar	\N	\N	\N	09083385754	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c7d717bd-86b4-4338-8878-0af2fb9911ba	Ramon	Gutierrez	\N	\N	\N	09637250792	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3dc9b132-75ea-4263-b3c3-747e0c2e0cb4	Teodoro	Villanueva	\N	\N	\N	09220765713	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
0a99eead-42a7-4a81-b89f-cc2882de8e42	Antonio	Castillo	\N	\N	\N	09012689357	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
0298c64b-718d-4a2e-b3f9-48f4f0d7e523	Cristina	Mallari	\N	\N	\N	09527704423	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
49b52119-5b5b-452d-b295-8395d6803a7a	Zenaida	Concepcion	\N	\N	\N	09283931169	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
5b1d79d9-f870-4172-81c2-e152b15daec0	Nestor	Soriano	\N	\N	\N	09192642485	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
14f3ab52-3fcb-4011-a488-289a87ade001	Domingo	Mateo	\N	\N	\N	09211222699	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
619b19c0-53ab-4500-8ae2-5ff428b32e10	Marilyn	Castillo	\N	\N	\N	09809217973	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
32f32fa7-727a-40a9-9448-75d402f8e22b	Ryan	Beltran	\N	\N	\N	09045999823	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
7bdaf57e-fd59-4c95-8411-9a9eff52f7fd	Jose	Garcia	\N	\N	\N	09497141763	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
ada3db76-da39-4048-aff2-8d96a5ca43c4	Nestor	Evangelista	\N	\N	\N	09427228384	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8c4f0f29-70da-40b3-8272-02664bd61f4d	Ligaya	Concepcion	\N	\N	\N	09048190884	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2c26c6c6-5fa9-499e-ba1f-6a10b9d7ce9f	Gemma	Sison	\N	\N	\N	09125478982	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
805e53e5-03ab-4481-ae60-c2cb3b092097	Leandro	Salazar	\N	\N	\N	09619537057	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
420c3303-c4dc-4bae-9712-7d8f5f43a24c	Jerick	Gutierrez	\N	\N	\N	09603530183	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
67ffa600-4885-42c0-b2e9-606c31860045	Remedios	Lacap	\N	\N	\N	09252547313	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
4403c4c2-a532-47f0-a4cf-8811207ffb15	Marilyn	Bautista	\N	\N	\N	09660701382	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
cdd7bb9b-b808-44de-860d-4cc30d90ec02	Alvin	Tolentino	\N	\N	\N	09798877170	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
7bf630c5-3e7e-4d48-b108-45c0cda8ea2d	Armando	Hernandez	\N	\N	\N	09859671195	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8b174fa4-27f4-4603-b20c-e06f7924fafd	Noel	Cruz	\N	\N	\N	09212670737	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
0c42f433-93bd-4c73-baaa-38f9d3b2b4d0	Rowena	Reyes	\N	\N	\N	09452776364	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
b7b63054-352e-4b42-b8a3-399a0e48fd81	Arjay	Evangelista	\N	\N	\N	09540309014	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
431173a5-7480-4785-a766-ca586ae785ff	Leonora	Navarro	\N	\N	\N	09216877294	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
fbf18ff6-e5db-498f-8c24-6cbbbaf1dffd	Danilo	Yumul	\N	\N	\N	09968852330	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a419550d-eefb-48ce-9af8-11d66a0b07c5	Manuel	Dungca	\N	\N	\N	09166870352	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
b2f98389-b602-4616-9e5d-97ebf786b6b5	Corazon	Dela Torre	\N	\N	\N	09419027241	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
1ce317a7-955b-4571-bc8f-57b9dfda6752	Fernando	Lingad	\N	\N	\N	09880853258	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a22b28db-816b-4861-a8f1-229d23b05e45	Miguel	Dela Cruz	\N	\N	\N	09933822191	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
edd425a4-b33e-4ded-8bc1-8fb4677886eb	Antonio	Tayag	\N	\N	\N	09974077845	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
d5d7cf0e-ee4e-42f8-be27-9c31ea95c169	Carlos	Bagamasbad	\N	\N	\N	09606975111	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f9ee1cd2-0bd7-4101-b390-ab43330e7982	Pedro	Lacap	\N	\N	\N	09419635545	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
dc8178ff-234f-43bb-9cf6-b7e0906b22bd	Corazon	Reyes	\N	\N	\N	09181925466	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
76ea0b7a-f943-4bf1-a632-d2c52cded37b	Mariano	Torres	\N	\N	\N	09911787077	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c6f42100-68f3-4733-8097-2ada11459c24	Jose	Garcia	\N	\N	\N	09342861964	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
54170f12-8460-4b66-b495-6c125ef235e5	Rosa	Dela Cruz	\N	\N	\N	09995647789	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
858cdeee-fb9d-4813-9022-bc736428e1a5	Teresita	Lingad	\N	\N	\N	09365859956	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
b69e33bd-7721-4c5a-9cb5-d1ef706078e7	Domingo	Bautista	\N	\N	\N	09263633485	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8cff5cf1-19e5-46d8-899d-c40f15f2649e	Rodrigo	Galang	\N	\N	\N	09815066216	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
acd3a0ff-e58d-4395-aaeb-6ddf06ee9c64	Renz	Pascual	\N	\N	\N	09305457848	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
746267ac-e826-45bf-b7f3-254eae1344cf	Ricardo	Dungca	\N	\N	\N	09098162536	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
fa97d9d1-01aa-4f5a-99b9-76a5a2f67d9e	Marilou	Malit	\N	\N	\N	09097901378	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
32d78afe-602a-4fca-9a71-16387fbb73f3	Nestor	Lingad	\N	\N	\N	09956523739	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3595679c-8c99-4134-9a76-4b2b5df773c4	Renato	Aquino	\N	\N	\N	09483597523	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
7df36bfa-474e-4f93-acee-9cd4452da688	Eugenio	Cruz	\N	\N	\N	09988446085	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
0f1028a7-2f5a-44d3-b808-663d5d0681e5	Arjay	Tiongson	\N	\N	\N	09862936984	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f555659a-5c97-487d-a767-2c1a2d1a071c	Arturo	Lingad	\N	\N	\N	09537333630	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
50821931-bfbe-4e1b-831f-5c2275c9c88e	Evelyn	Concepcion	\N	\N	\N	09654077395	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
aad456e9-b016-428b-87e4-63ef565f89cf	Roberto	Salazar	\N	\N	\N	09975526659	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
4dcbd343-8b66-4885-8d98-71ade17c9696	Rodel	Bautista	\N	\N	\N	09130722736	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
aa9f2fc8-29d5-4273-94d9-3d6eefd71c5a	Crisanto	Silverio	\N	\N	\N	09213893306	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
5f4b867f-d67e-4a33-a45b-84e0c7a49175	Rodrigo	Dimaculangan	\N	\N	\N	09582428974	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
231b98bd-6bb9-4a75-8f1f-83e61e7d2abe	Alvin	Pascual	\N	\N	\N	09239292649	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
da1e7db5-92bd-40ea-9e9e-42803dfcea06	Florentino	Gutierrez	\N	\N	\N	09161808387	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3c80506b-d3e0-43c4-bb3c-8e0534dd28b0	Teresita	Silverio	\N	\N	\N	09718008192	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
564f6a27-f0d6-4d9d-bbc9-5079dd5f04fb	Alvin	Soriano	\N	\N	\N	09881126485	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a9f433a9-d1e8-46d1-b377-7ca6d4e9a4be	Alfredo	Aquino	\N	\N	\N	09194635442	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
ecac3bd8-6a5b-4d3b-807f-408cf86ccfef	Renato	Buenaventura	\N	\N	\N	09260681669	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
7461976b-fefe-48c6-bf47-424da7174c1e	Marvin	Magpantay	\N	\N	\N	09663234339	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
d84333c0-1855-4d14-baf7-f7c2026dac8a	Jose	Garcia	\N	\N	\N	09348668167	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a797555d-a6fe-4469-9aca-c66c4e082b1c	Alfredo	Silverio	\N	\N	\N	09722275599	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2d781aef-f08b-4645-b90d-7d2f991c3e66	Renz	Mandap	\N	\N	\N	09642338500	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
78edda7b-f52b-4f93-8701-9f52a8e37eac	Alfredo	Tiongson	\N	\N	\N	09695944388	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
28c3f064-9465-4472-9924-f42adc9e0d1e	Leonora	Dimaculangan	\N	\N	\N	09679976434	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a140f98b-0ce6-4f55-9d5a-83c38f6eb986	Renz	Dela Torre	\N	\N	\N	09504889729	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c26e2535-099b-4926-88c3-34c816e666c8	Leonora	Aquino	\N	\N	\N	09611113163	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
4eb9b3f0-7c89-456c-9264-af388ffb6beb	Simplicio	Bagamasbad	\N	\N	\N	09286234959	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
78325bf5-8fe9-4902-9b3b-9bd474e9d9ba	Rolando	Reyes	\N	\N	\N	09945815925	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8cfe8b13-486b-4d68-90a8-7dd291f4b30b	Ramon	Sison	\N	\N	\N	09462066852	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a7275160-cc20-45da-a612-cb792fc49efc	Teresita	Tolentino	\N	\N	\N	09426909393	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
b5b1b0dc-3835-4df2-87b2-739cd250f52c	Roberto	Soriano	\N	\N	\N	09415853223	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a47a9568-482d-477f-b702-dc3d729eb1fa	Jerick	Silverio	\N	\N	\N	09523730610	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
7173938f-fe20-4066-ad04-e550138f8ea2	Evelyn	Ramos	\N	\N	\N	09795973427	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
9bd4316c-994e-4ea4-8175-aedadeecf05e	Alejandro	Dela Torre	\N	\N	\N	09650296520	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
8d9c5338-faaa-46c8-b53a-2cacd35e10c7	Mark	Salazar	\N	\N	\N	09031548911	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
404dbb65-ca80-477c-8cfa-d8d2fdb1daf0	Miguel	Pangilinan	\N	\N	\N	09233145571	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
304c1b9e-3b49-4ef4-b22e-6b8d6ea9e7d6	Ryan	Mateo	\N	\N	\N	09596127243	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
00e0674a-2a67-4a79-b2e7-628c10a392b4	Renato	Sison	\N	\N	\N	09544095604	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
069897c5-7e79-4713-b9c4-f51b47380f0f	Rodrigo	Panlilio	\N	\N	\N	09637953966	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
a57fa5c2-9abd-418f-a333-d6864f19b45a	Victorino	Sison	\N	\N	\N	09226953390	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
f29bb683-46b8-4177-b932-cef19d779310	Corazon	Pascual	\N	\N	\N	09083159345	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
089efe52-440f-48be-88d4-ab8bfb3205d1	Renz	Bartolome	\N	\N	\N	09944879194	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
3ee1fcd7-ee64-4add-9c4e-93a445ac3bba	Aldrin	Garcia	\N	\N	\N	09339222064	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
c40d3218-710a-4e36-9c5a-613c86945cbb	Danilo	Dela Cruz	\N	\N	\N	09373898912	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	\N
2b8ddd87-a2c0-4787-8a42-05de5c213e07	Nestor	Pascual	\N	\N	\N	09129906968	2026-08-31 04:43:24.612775+00	2026-08-31 05:18:51.470487+00	\N
b38b9d10-f640-4bb4-8575-f77389fda0a7	Allan Dilon	Esteves	\N	\N	\N	\N	2026-08-31 05:25:43.0538+00	2026-08-31 05:25:43.0538+00	27475903-2fe7-40d0-91de-e96a8797df96
6652eb93-d344-417f-abdf-10e134ac346f	Jose	Garcia	N94-03-948033	\N	\N	09173100352	2026-08-31 04:43:24.612775+00	2026-09-02 10:12:42.140159+00	b108324f-2fe7-47db-bd4e-fd05d9466bd7
55bf9751-d8c9-4df3-bc0e-c7e95aa32d54	ayessa	peralta	\N	\N	magbay	09099965721	2026-09-10 11:00:00.817742+00	2026-09-10 11:00:00.817742+00	\N
976b32af-9f85-470f-89f3-dc407d9745f8	Jake	Rosete	\N	1994-09-18	\N	\N	2026-09-17 06:19:47.161801+00	2026-09-17 06:19:47.161801+00	\N
\.


--
-- TOC entry 3593 (class 0 OID 16643)
-- Dependencies: 231
-- Data for Name: ordinances; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.ordinances (id, title, filename, original_name, uploaded_by, upload_date) FROM stdin;
2	Municipal Ordinances	1788352522693-728637021.pdf	Municipal Ordinances.pdf	\N	2026-09-02 12:35:23.298582+00
3	Old Municipal Ordinances	1788352828365-98829995.pdf	Old Municipal Ordinances.pdf	\N	2026-09-02 12:40:28.52881+00
4	Ordinance No. 841- Rules & Regulations on tricycle franchising, operation and identification	1788352904221-262707457.pdf	ORDINANCE NO. 841.pdf	\N	2026-09-02 12:41:44.723626+00
\.


--
-- TOC entry 3584 (class 0 OID 16447)
-- Dependencies: 222
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- TOC entry 3594 (class 0 OID 16660)
-- Dependencies: 232
-- Data for Name: patrol_areas; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.patrol_areas (id, name, description, latitude, longitude, created_at, updated_at) FROM stdin;
cab13cf5-f00b-4d54-8abe-7c58530e5572	Poblacion	Town center and public market	\N	\N	2026-08-31 04:08:35.484796+00	2026-08-31 04:08:35.484796+00
176f7d63-e8ea-45c9-ac09-392459a3e8a4	National Highway	Main highway stretch	\N	\N	2026-08-31 04:08:35.484796+00	2026-08-31 04:08:35.484796+00
31ee3c69-2b6a-4f97-83d6-ef320f71bffc	Terminal Area	Jeepney and tricycle terminal	\N	\N	2026-08-31 04:08:35.484796+00	2026-08-31 04:08:35.484796+00
ea822547-3ff6-4887-91e6-11f99e8d9aa0	public market	\N	\N	\N	2026-08-31 07:48:54.102529+00	2026-08-31 07:48:54.102529+00
3fa1daf1-44d5-4690-8a57-e35cddb9bf4a	Liboro Street (Chinabank)	\N	\N	\N	2026-09-10 11:59:41.606425+00	2026-09-10 11:59:41.606425+00
\.


--
-- TOC entry 3595 (class 0 OID 16674)
-- Dependencies: 233
-- Data for Name: patrol_assignments; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.patrol_assignments (id, enforcer_id, area_id, shift_date, shift_start, shift_end, notes, status, assigned_by, created_at, updated_at) FROM stdin;
50b22f93-eaf2-44f7-8401-b074d70473ec	bed5ead2-ce0a-4301-b230-7b4fc94bbaa5	176f7d63-e8ea-45c9-ac09-392459a3e8a4	2026-08-31	14:00:00	\N	\N	assigned	a9e58a5a-30e8-4eda-b881-e6d0552597f2	2026-08-31 05:08:18.565589+00	2026-08-31 05:08:18.565589+00
8755297d-7664-4254-be67-b7f2700faa58	3882d705-6bba-4352-85a9-7e872120b96a	176f7d63-e8ea-45c9-ac09-392459a3e8a4	2026-08-31	14:00:00	17:00:00	\N	acknowledged	a9e58a5a-30e8-4eda-b881-e6d0552597f2	2026-08-31 05:07:51.307198+00	2026-08-31 05:08:45.816125+00
63494dca-08ba-48b5-b739-4b35407bc41b	bed5ead2-ce0a-4301-b230-7b4fc94bbaa5	176f7d63-e8ea-45c9-ac09-392459a3e8a4	2026-09-03	09:42:00	21:43:00	\N	assigned	a9e58a5a-30e8-4eda-b881-e6d0552597f2	2026-09-03 00:42:07.303604+00	2026-09-03 00:42:07.303604+00
66ffa40a-e0e6-4826-8b4c-a5c60fedeaec	3882d705-6bba-4352-85a9-7e872120b96a	176f7d63-e8ea-45c9-ac09-392459a3e8a4	2026-09-03	09:46:00	21:46:00	\N	assigned	a9e58a5a-30e8-4eda-b881-e6d0552597f2	2026-09-03 00:45:49.438878+00	2026-09-03 00:45:49.438878+00
4bd08720-ef12-462e-92cf-f8a89159ffa6	3882d705-6bba-4352-85a9-7e872120b96a	ea822547-3ff6-4887-91e6-11f99e8d9aa0	2026-09-11	07:00:00	09:00:00	focus on student with no helmet	completed	a9e58a5a-30e8-4eda-b881-e6d0552597f2	2026-09-10 11:56:44.956411+00	2026-09-10 11:59:08.592313+00
\.


--
-- TOC entry 3591 (class 0 OID 16604)
-- Dependencies: 229
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.payments (id, ticket_id, receipt_no, amount_paid, processed_by, payment_method, paid_at, notes, receipt_filename, submitted_by_motorist, verified, verified_by, verified_at) FROM stdin;
a6327229-0ced-4179-8780-8e038c01c732	3b137051-61e9-4340-aab5-50185d161cd5	SJ-990022	500.00	a9e58a5a-30e8-4eda-b881-e6d0552597f2	cash	2026-09-13 20:42:00+00	\N	\N	f	t	\N	\N
49a939aa-cf23-4b25-a9a1-77c3e3b68105	ee15254e-6497-4e5f-8973-a1dccdd674c0	TCT-123457	500.00	\N	cash	2026-09-17 06:26:00+00	\N	1789626581186-717089822.jpg	t	t	a9e58a5a-30e8-4eda-b881-e6d0552597f2	2026-09-17 06:31:02.898742+00
\.


--
-- TOC entry 3598 (class 0 OID 16734)
-- Dependencies: 236
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.refresh_tokens (id, user_id, token_hash, user_agent, ip_address, expires_at, revoked_at, last_used_at, created_at) FROM stdin;
5465d435-3756-4e1b-8bc5-9c9d967fd041	a9e58a5a-30e8-4eda-b881-e6d0552597f2	ca7ec32f394558696aa68fb7fd46d7796ed2143838201c54c098b269783bdd0b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.31.76.1	2026-09-07 04:53:03.987+00	\N	\N	2026-08-31 04:53:03.988789+00
f986ba4c-c887-42a5-b5c5-511d32af951f	a9e58a5a-30e8-4eda-b881-e6d0552597f2	0e179a2004994fd2e23243dd7d53c908996e20cf1925d3ffcfa4fdd94d15e8c6	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.25.104.130	2026-09-07 04:55:16.286+00	\N	\N	2026-08-31 04:55:16.287682+00
eac1629a-ab4f-47b8-82f4-561e8ebe17da	a9e58a5a-30e8-4eda-b881-e6d0552597f2	8dcc9304f951ea4a2fee549a32eec8913e0d2bee2b6bf0476c45c4fb7e49ce45	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.25.104.130	2026-09-07 04:55:39.079+00	\N	\N	2026-08-31 04:55:39.079324+00
9e34b525-cea6-4f7e-b7f5-07a4483e7f44	27475903-2fe7-40d0-91de-e96a8797df96	524e12ab2898ee5989e1f5aeccff9ec0f9312a5785d190eaf91e04f64b83a9d3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.31.76.1	2026-09-07 04:57:38.387+00	\N	\N	2026-08-31 04:57:38.387062+00
27793a00-a201-426e-9e2c-8d63f8329b80	3882d705-6bba-4352-85a9-7e872120b96a	2600cd74a8a04e770dbac8373658f09432de5dd44ab51369a6347ca79a583a6e	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 05:05:39.485+00	\N	\N	2026-08-31 05:05:39.485732+00
68d388f3-65f6-4cf6-808c-3c2b002e76a3	27475903-2fe7-40d0-91de-e96a8797df96	704d4e9c80f1fadfdc746347fae4509d8820c9de476796088bf20574f2c2e2b1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.31.76.1	2026-09-07 05:18:24.586+00	\N	\N	2026-08-31 05:18:24.586456+00
af443173-1ea4-4ca6-bec3-8688aabe578a	3882d705-6bba-4352-85a9-7e872120b96a	36f2476e41a4c94e1bbcc91ba340df70559a95c73479ef7f89f0b3ee5fdfb2e6	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 05:19:41.679+00	\N	\N	2026-08-31 05:19:41.679749+00
a74b510c-f709-4533-bd76-1f7888f0925a	3882d705-6bba-4352-85a9-7e872120b96a	016ade23fc5c76a9d29ce479b7392567f42977453901c1923befd5ef5dfbc3e8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.31.76.1	2026-09-07 05:29:15.391+00	\N	\N	2026-08-31 05:29:15.391148+00
c16e21f6-6c17-49c7-8af3-1ba97f45e7c9	27475903-2fe7-40d0-91de-e96a8797df96	2176064c0ef73c2231917fb3e461e464d916bed26cc9aff4a65742f47e5d42d5	Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36	10.31.76.1	2026-09-07 05:31:36.496+00	\N	\N	2026-08-31 05:31:36.496168+00
adc6152c-8194-4d87-95bf-e6a997998545	a9e58a5a-30e8-4eda-b881-e6d0552597f2	f7a3684e5048eacbd24576d344eafcf64d1118af32b3ff6c16231ae2039abf68	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.24.40.136	2026-09-07 05:32:27.881+00	\N	\N	2026-08-31 05:32:27.881325+00
335dd8bb-e583-41a7-a23d-eb4f54fcb3a0	3882d705-6bba-4352-85a9-7e872120b96a	31a2708890adc71913afa9b45a27d50488de81dd0502edcfd073ef979fd0c954	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 05:34:34.181+00	\N	\N	2026-08-31 05:34:34.180829+00
12f9b199-fbc0-4afd-8f56-4428af63f058	46517122-9167-427c-9245-c195e91d7347	4e6a45b5b8cc9d224ceee9ba954d642059ba159c62df6046062296dc1dbc55ef	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.31.76.1	2026-09-07 05:59:08.412+00	\N	\N	2026-08-31 05:59:08.412816+00
bb9f3ef5-c85f-45ac-806a-91d9fe3a644f	46517122-9167-427c-9245-c195e91d7347	e2b9c3e226383088499fa8fd1abbe49ae979abbf297977384dd1db98bea815b3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.31.76.1	2026-09-07 05:59:30.182+00	\N	\N	2026-08-31 05:59:30.1818+00
c67aea52-0302-4fdd-8373-56de0efeed03	46517122-9167-427c-9245-c195e91d7347	206df7b3a950707019f423af527501e9c81e9874811ee3887d5b62d4f2cbe83d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-07 06:01:26.368+00	2026-08-31 06:17:33.96497+00	2026-08-31 06:17:33.96497+00	2026-08-31 06:01:26.149904+00
9579dfbe-1b89-4f55-9729-524781d08f1c	46517122-9167-427c-9245-c195e91d7347	14321de20844547df54a9171599caf189ae0daf444de5b1538b4b6cd53c32de2	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-07 06:17:35.95+00	2026-08-31 06:33:34.018964+00	2026-08-31 06:33:34.018964+00	2026-08-31 06:17:33.96497+00
7e1a982a-99cf-420c-8eb0-27753ba51607	3882d705-6bba-4352-85a9-7e872120b96a	d02a8c57990ba0fded477c42b003aeccca03bd7ddafe81dd954b4e27e9c1abc2	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.31.76.1	2026-09-07 07:30:52.801+00	\N	\N	2026-08-31 07:30:52.800919+00
eb00b5e0-9dde-43fb-a04e-e810a516ca29	1da6c555-1347-4b46-8caf-7d572143f64c	1295fba013f03f92fe380ccab14f50c0a5bb908104543523eac1155b12e7ef93	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.24.40.136	2026-09-07 07:32:41.765+00	\N	\N	2026-08-31 07:32:41.765144+00
c4c50aa4-ae4c-4a94-b43b-df95b7d5af0e	bed5ead2-ce0a-4301-b230-7b4fc94bbaa5	1412f24692efe40540015c4b70b94bd0ff3a1cc151e28c1cebd193200f8b9fc6	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 07:33:55.3+00	\N	\N	2026-08-31 07:33:55.299905+00
769e8627-0f9c-488d-83e2-a6d54c9d0d5c	27475903-2fe7-40d0-91de-e96a8797df96	b490c7d2b969eef384fee3b38e20daf8ee814771b6716ae22ea09e89817bd5a8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 07:34:28.793+00	\N	\N	2026-08-31 07:34:28.793081+00
07c0fe47-dee5-4674-a6a4-95fa25e54253	1da6c555-1347-4b46-8caf-7d572143f64c	fbee5ef17c1f355ae03622c4e46eb017e5d506ee0c3ef03de2a6b4d2df8795f9	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 07:41:31.597+00	\N	\N	2026-08-31 07:41:31.597204+00
358f23c5-4e1e-404c-9b3f-de51d7524807	a9e58a5a-30e8-4eda-b881-e6d0552597f2	80d189b6faf885bcc6c56cffcd59bc5da92f8115b17cde323cae60391c115faf	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	10.25.104.130	2026-09-07 07:46:07.1+00	\N	\N	2026-08-31 07:46:07.100204+00
942b51d1-5a01-47a5-9e2a-1a83cc36ad86	1da6c555-1347-4b46-8caf-7d572143f64c	f2474940545f2106cf970f3c2d3475749b9c45f385632033c8bd085d6d2e6cd0	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 07:49:55.699+00	\N	\N	2026-08-31 07:49:55.698814+00
2eaa65d5-f924-4461-8007-1a5063ce02d2	3882d705-6bba-4352-85a9-7e872120b96a	0746e1798c1c41a3c4f420042a70418493af5569a91b3014ece407b20267f549	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.25.104.130	2026-09-07 07:57:38.498+00	\N	\N	2026-08-31 07:57:38.497868+00
1be4c6e2-3db4-4335-ac49-e6e575ae685b	27475903-2fe7-40d0-91de-e96a8797df96	3d14bd0a9f7d36e4a347c85150c4fb92d431ec8cda46730e16c911c5a4a24610	Mozilla/5.0 (Linux; Android 9; vivo Y85 Build/PKQ1.190118.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.7204.179 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/526.0.0.5.107;FBCX/modulariab;]	10.24.40.136	2026-09-07 13:45:37.619+00	\N	\N	2026-08-31 13:45:37.619288+00
6f917a62-d4e4-424e-b95b-84ae513be567	46517122-9167-427c-9245-c195e91d7347	84c40e51c37590cd6fde1728ea01b8e4188e4ed7ea0b478ae3d737c598f979a6	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-07 06:33:35.316+00	2026-09-02 10:03:06.751812+00	2026-09-02 10:03:06.751812+00	2026-08-31 06:33:34.018964+00
b01b20a6-a963-4d80-9f08-759c894e5177	46517122-9167-427c-9245-c195e91d7347	dcefaf55079a86f3d013bfcc7af24c759949c2f85627881661b950018f2f58bf	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-09 10:03:04.73+00	2026-09-02 10:08:38.852668+00	\N	2026-09-02 10:03:06.751812+00
9a4dfdd7-71c6-4cc7-ba94-a794fed1b1a3	b108324f-2fe7-47db-bd4e-fd05d9466bd7	87c8b6b62fd5f14f07f06c2332b43cace93164a2211cc19cc8c13e7b1e77838a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-09 10:14:45.062+00	\N	\N	2026-09-02 10:14:47.5168+00
ecc785ca-1203-45f2-9c72-a607a3c93e07	a9e58a5a-30e8-4eda-b881-e6d0552597f2	acb76cd3c868a4b84aa062c8030e363c6a6bb81a5762d9af79e8f4e5e515af94	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.24.89.247	2026-09-09 11:14:48.664+00	\N	\N	2026-09-02 11:14:48.662955+00
5ca9190d-0051-4c59-a4bc-a4ddffa256ba	27475903-2fe7-40d0-91de-e96a8797df96	4a9c1a0b2c48cda8393170f1ab67d91147eb72ea5cc61e09f3e53291fba13bf2	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.31.45.4	2026-09-09 11:17:15.563+00	\N	\N	2026-09-02 11:17:15.563074+00
140df858-d4e9-4462-a900-ede565beb745	a9e58a5a-30e8-4eda-b881-e6d0552597f2	5ebb11ff72fc5cdb440934f76c84798cedfa76289d3595c9177b06e0898ad14e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.31.45.4	2026-09-09 12:15:18.456+00	\N	\N	2026-09-02 12:15:18.457608+00
5b849adb-c906-4d95-b7d4-648a1c248cd0	27475903-2fe7-40d0-91de-e96a8797df96	e084f079245832fa80e0e2f13a306b46bfad7b3a7a119eaaf5fc11d6b9200d0c	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.29.126.182	2026-09-09 12:27:43.459+00	\N	\N	2026-09-02 12:27:43.46015+00
4877ca01-9f9a-4010-8d0a-e2a04bc4bd08	a9e58a5a-30e8-4eda-b881-e6d0552597f2	4d7a62a1f30af13581efeb9b6fa490be6700858aa9c9fac1f965c81815ef944c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.24.89.247	2026-09-09 12:30:39.85+00	\N	\N	2026-09-02 12:30:39.851142+00
6d2d90f8-0ae8-48c5-ab7a-1b2107244c58	a9e58a5a-30e8-4eda-b881-e6d0552597f2	06f444ad49f33bbcc32453a6a9f771c90d71d696f55f2f61ac5b0df5b68fd66b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.30.211.96	2026-09-10 00:18:19.509+00	\N	\N	2026-09-03 00:18:19.606052+00
72ba7226-f243-4cc1-83fb-9ff6f79a3fd9	a9e58a5a-30e8-4eda-b881-e6d0552597f2	a1d96b4f45f4e9e456bc9922c71a35f48d9e8c7ac88075e94026545a2d650b6a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.30.99.55	2026-09-10 00:35:41.764+00	\N	\N	2026-09-03 00:35:41.764749+00
764d343b-6a41-40fa-ac67-15dcac5887e2	27475903-2fe7-40d0-91de-e96a8797df96	8dab3c900491ab700e40d8ef7631126a0d72c0f936a0c9896d76035ae43a2262	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.30.219.11	2026-09-10 00:38:29.725+00	\N	\N	2026-09-03 00:38:29.725628+00
73b89115-984b-4f14-8299-84a4976c542b	bed5ead2-ce0a-4301-b230-7b4fc94bbaa5	538e603aa3e111a98c7b91de063adcd0aae8f8915001a04c9a460352f9e9c072	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.30.99.55	2026-09-10 00:43:04.93+00	\N	\N	2026-09-03 00:43:04.930125+00
86adde81-c827-40ec-b641-2c85561083b6	a9e58a5a-30e8-4eda-b881-e6d0552597f2	3fbd23bbda9822c59016e40d8520c6b3f7b7d20f3c4e41f72b203f0e4b8afb11	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.30.211.96	2026-09-10 00:50:53.634+00	\N	\N	2026-09-03 00:50:53.634749+00
f692bd4f-bf8a-441a-9d11-c55114ab7b6b	a9e58a5a-30e8-4eda-b881-e6d0552597f2	587e6f68960e2ab7d5b6fa8d726d22acde5705fa2997ea4edd6fab7ac73b2aff	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.29.192.116	2026-09-15 07:30:00.052+00	\N	\N	2026-09-08 07:30:00.052232+00
9dd8c1ad-f5f8-4bf2-a771-a9a8c7736ba8	3882d705-6bba-4352-85a9-7e872120b96a	9059cc24f4a2af00cfc45d2ed7c7da5bbb91e41663708ac5acecb68e3eb7712e	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22C5142a [FBAN/FBIOS;FBAV/577.0.0.22.107;FBBV/1055880302;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/18.2;FBSS/2;FBCR/;FBID/phone;FBLC/en_PH;FBOP/80]	10.26.93.129	2026-09-15 07:32:01.632+00	\N	\N	2026-09-08 07:32:01.632747+00
f2ad45bb-dfbb-4556-9da9-1cbba744b62e	a9e58a5a-30e8-4eda-b881-e6d0552597f2	a5c89bce5dd17cebcb8b22eb28ca63c1dc639f9bdcd5b071d4cbe16b22de768e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.29.121.232	2026-09-15 07:34:39.241+00	\N	\N	2026-09-08 07:34:39.240754+00
ecf8c53f-1271-42ee-85bd-a201d67ee8c8	27475903-2fe7-40d0-91de-e96a8797df96	04e5b92a6cc5e62b4a84544ed9a2a3ef8c71010baf2327e2819b6ff6837a5b01	Mozilla/5.0 (Linux; Android 9; vivo Y85 Build/PKQ1.190118.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.7204.179 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/527.0.0.9.101;FBCX/modulariab;]	10.29.192.116	2026-09-15 07:47:40.84+00	\N	\N	2026-09-08 07:47:40.839345+00
488d1c8a-710e-4d96-b5fc-8f101f0918f2	a9e58a5a-30e8-4eda-b881-e6d0552597f2	2f9f0be18e3edf46bf40ec80eeee7ea2868cd98e0563dc64b7894a205a816f8a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.29.121.232	2026-09-17 04:25:46.725+00	\N	\N	2026-09-10 04:25:46.725179+00
224f10d4-eb32-4148-9549-432eb9fe4725	a9e58a5a-30e8-4eda-b881-e6d0552597f2	344f487bc5d54c6da6209e3738491c566be64d7577e2086261816b3c5aa836af	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	10.29.121.232	2026-09-17 10:54:17.903+00	\N	\N	2026-09-10 10:54:17.903873+00
527b6722-d8aa-4b9c-9947-a923e533c3b8	3882d705-6bba-4352-85a9-7e872120b96a	8275d76ad27d4c814bf10535bd4d7eff9863cbdeec3af229eb2d0169712bf34f	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22C5142a [FBAN/FBIOS;FBAV/577.0.0.22.107;FBBV/1055880302;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/18.2;FBSS/2;FBCR/;FBID/phone;FBLC/en_PH;FBOP/80]	10.26.93.129	2026-09-17 10:55:36.1+00	\N	\N	2026-09-10 10:55:36.100417+00
ffbb94eb-c4ee-458b-b91d-30dd5689e8c8	4e559637-dca5-4b6f-9a7f-466f8ce45cfc	b0fe4625a0f63a440ab810d85b193389c6c43bbe69e9eb0b625b143e7d832fe8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36	10.26.93.129	2026-09-17 11:03:54.309+00	\N	\N	2026-09-10 11:03:54.309946+00
c4b990c7-bad3-4ed0-969c-9066b26a69bf	a9e58a5a-30e8-4eda-b881-e6d0552597f2	0b168eb9a3e11c168bd3e28deef8d40070b0501996a21841c46a45ca212d689a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	10.29.192.116	2026-09-17 11:22:16.513+00	\N	\N	2026-09-10 11:22:16.514904+00
fb14260d-0c63-48f1-905c-f3807de8fafa	a9e58a5a-30e8-4eda-b881-e6d0552597f2	69c55778dfbf86a842e3103d04d97ffa47984d162d65ab96d6f251ecf9b3f81c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	10.26.93.129	2026-09-17 11:39:11.603+00	\N	\N	2026-09-10 11:39:11.603699+00
c2de38dc-526b-4991-8917-0f6b341c5d22	a9e58a5a-30e8-4eda-b881-e6d0552597f2	fb4e54cddf43dff09d1bc327c53189c51c3d9a38eed68af9ea114336bc22fa73	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	10.29.121.232	2026-09-17 11:54:49.419+00	\N	\N	2026-09-10 11:54:49.419516+00
f4c4b05c-a386-45c4-8b13-d7e83e3fbdd0	bed5ead2-ce0a-4301-b230-7b4fc94bbaa5	4d3702c07ce3b4f986ba781250957dd7bf6a771bdfa04f2a33b8607891c8c737	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.29.121.232	2026-09-17 15:11:49.639+00	\N	\N	2026-09-10 15:11:49.642023+00
cf76f72c-4802-4fec-b6e9-09bcde3174e4	bed5ead2-ce0a-4301-b230-7b4fc94bbaa5	41f4eb0df9cd7292dcb03a965356ac1f086d1b77db0c56d0170cdc047aed20ab	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.29.121.232	2026-09-17 15:28:15.542+00	\N	\N	2026-09-10 15:28:15.543503+00
ea890325-8cc2-407a-a139-00bb16fc3f71	27475903-2fe7-40d0-91de-e96a8797df96	288eeeeb386781bfd4d8902013ad17a5c6d9b1ecbaf0b0b3e16e3f31afe5ceba	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.26.93.129	2026-09-17 15:48:10.851+00	\N	\N	2026-09-10 15:48:10.852062+00
efaa6994-8d9e-4751-abd1-482612b3410a	27475903-2fe7-40d0-91de-e96a8797df96	8a87f22d9beb9097f8bab95c8369ca6ac64067687d6a4b9fe1b483d07427f0e4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.26.93.129	2026-09-17 15:52:07.845+00	\N	\N	2026-09-10 15:52:07.846751+00
93ca3d59-c3bb-4f04-b5b5-eb9cd7d44c34	a9e58a5a-30e8-4eda-b881-e6d0552597f2	368a56d2f0ca45991acf69a83fc60f3768c21ada1a87f202bcfeb0958ff7fdb1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	10.29.192.116	2026-09-18 12:14:49.889+00	\N	\N	2026-09-11 12:14:49.890824+00
8aac73d5-be5c-4468-9421-b53fada7aa92	a9e58a5a-30e8-4eda-b881-e6d0552597f2	79d492ec46cd27532c95e91e6c5f02a9437b94db9bfce2ab7b1c32ac2ea6970e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	10.29.121.232	2026-09-18 12:30:44.806+00	\N	\N	2026-09-11 12:30:44.807446+00
6b5a1803-c638-43c7-b611-f691beddd544	3882d705-6bba-4352-85a9-7e872120b96a	3500e33cf9e0114b5e7dc6e084423622ac0b06ac4d913f7b1134517b1823b9df	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22C5142a [FBAN/FBIOS;FBAV/577.0.0.22.107;FBBV/1055880302;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/18.2;FBSS/2;FBCR/;FBID/phone;FBLC/en_PH;FBOP/80]	10.26.93.129	2026-09-18 12:43:20.214+00	\N	\N	2026-09-11 12:43:20.214542+00
8db1f31b-8745-4292-8a50-ddad066125c6	3882d705-6bba-4352-85a9-7e872120b96a	a887ac7c5606de3518ee3f6b4a91726a534afe81031df3ffd110c47becea0fe0	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/152.0.7977.64 Mobile/15E148 Safari/604.1	10.26.93.129	2026-09-18 12:44:17.384+00	\N	\N	2026-09-11 12:44:17.385314+00
c67fa6ac-653b-4b9a-aa36-976f073d70af	4e559637-dca5-4b6f-9a7f-466f8ce45cfc	e529a5e22067a8fce4d14e0d47389bd10a255f56e275858973aade6406f9270c	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/152.0.7977.64 Mobile/15E148 Safari/604.1	10.29.192.116	2026-09-18 12:47:16.18+00	\N	\N	2026-09-11 12:47:16.180881+00
f8ac9f91-2b6b-4ee5-b747-a5c19d37d42f	a9e58a5a-30e8-4eda-b881-e6d0552597f2	454f937ce32c3bd66e25456678e17ffa885bd56e32332edc1523854c5c9591d4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 02:00:28.266+00	2026-09-12 04:21:59.832876+00	2026-09-12 04:21:59.832876+00	2026-09-12 02:00:29.048342+00
ea36b320-46c2-49da-90d5-9d2f7d15c9c5	a9e58a5a-30e8-4eda-b881-e6d0552597f2	a902b4c8abc152958fb532dba8acf3ae3a57efd6d8cc5276162d886ce973fcbe	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 04:22:00.353+00	2026-09-12 04:37:39.619473+00	2026-09-12 04:37:39.619473+00	2026-09-12 04:21:59.832876+00
71c42b08-bed6-47b8-9ad4-6ea1436b1522	a9e58a5a-30e8-4eda-b881-e6d0552597f2	62c415d51d3d16623f74aa2747406117ef7943bd73b7913c565d1f452835dcfe	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 04:37:40.236+00	2026-09-12 04:53:39.629803+00	2026-09-12 04:53:39.629803+00	2026-09-12 04:37:39.619473+00
c501cb55-ac40-4fc4-a8c2-8320c989a8c9	a9e58a5a-30e8-4eda-b881-e6d0552597f2	db23a0c3fd57f969d31692a89d636f7f2407691e685836a63f1a8a734e9a729b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 04:53:40.326+00	2026-09-12 05:09:39.807131+00	2026-09-12 05:09:39.807131+00	2026-09-12 04:53:39.629803+00
e916cbd3-8e15-4b63-b176-a2846ead4dcf	a9e58a5a-30e8-4eda-b881-e6d0552597f2	81c84c63a8fee5171cb841cf8f897d85f66cfe53c35727c0f161895f92e3e05f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 05:09:40.595+00	2026-09-12 05:25:39.423574+00	2026-09-12 05:25:39.423574+00	2026-09-12 05:09:39.807131+00
f5966d27-3b34-4820-b9c9-6955efb6ffb3	a9e58a5a-30e8-4eda-b881-e6d0552597f2	3f5d72aca99c9ee9dd1b209b63eaea0253477496eec70ba51b5eba7da1ad52b4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 05:25:40.287+00	2026-09-12 05:41:39.82359+00	2026-09-12 05:41:39.82359+00	2026-09-12 05:25:39.423574+00
5752a13f-87ed-459d-8a89-aef6ed01c7e6	a9e58a5a-30e8-4eda-b881-e6d0552597f2	5770131a9c5bab3a310c030d0d0180d9620dc25c05e1106d773c307c97b419db	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 05:41:41.416+00	2026-09-12 05:57:39.333496+00	2026-09-12 05:57:39.333496+00	2026-09-12 05:41:39.82359+00
08c666a8-5361-49ff-af9c-8f785261994a	a9e58a5a-30e8-4eda-b881-e6d0552597f2	c7489d345b14fe915c4c0597992c88da666f8990795a6fdc01b2a913a84d408a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-19 05:57:41.017+00	2026-09-13 20:41:21.521512+00	2026-09-13 20:41:21.521512+00	2026-09-12 05:57:39.333496+00
1866b123-f5a2-4395-b326-2a4a72187178	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e6093902cd27564252cfbddc9fcd9304dfd2edcccae490fa9b8c49768ce4d0fa	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-20 20:41:24.547+00	2026-09-14 12:31:36.044323+00	2026-09-14 12:31:36.044323+00	2026-09-13 20:41:21.521512+00
f4f1ffa8-79ee-4625-b648-58ac86b57e66	a9e58a5a-30e8-4eda-b881-e6d0552597f2	6cc288904d3ad611915d659587f9437e77eb29113561e082812335c5f2f95775	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-21 12:31:35.539+00	\N	\N	2026-09-14 12:31:36.044323+00
1ece0634-34b7-4556-85b3-498dfb07f7bb	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e755477522138b1dcc71795de48607aa9aacb020b2cd8f717330852bb9475c9b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-21 13:19:17.804+00	2026-09-14 13:34:23.589953+00	2026-09-14 13:34:23.589953+00	2026-09-14 13:19:18.553182+00
0e1fea65-ce55-4549-ab04-3966462bf7ee	a9e58a5a-30e8-4eda-b881-e6d0552597f2	69018301db0e69d4d5607f5584e29e7c8e3b04ca045962073efa0ac77d4f806a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-21 13:34:23.422+00	2026-09-14 13:49:30.726792+00	2026-09-14 13:49:30.726792+00	2026-09-14 13:34:23.589953+00
ff55465b-cfc4-46f9-b244-52dfe552e682	a9e58a5a-30e8-4eda-b881-e6d0552597f2	7b381e3a5c0459290decfe5bc75e321068dcd9bd93fe8439472786af4f450a97	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-21 13:49:30.638+00	2026-09-15 06:08:16.70824+00	2026-09-15 06:08:16.70824+00	2026-09-14 13:49:30.726792+00
f31e8124-7fa3-4937-9f77-f07c4e93cb01	a9e58a5a-30e8-4eda-b881-e6d0552597f2	25797ed28e87e1bcd9c816b6ef5f721d52e29f96ea3e6f4a967b387db4613a27	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 06:08:17.124+00	2026-09-15 06:24:16.940864+00	2026-09-15 06:24:16.940864+00	2026-09-15 06:08:16.70824+00
81e1f7b6-0be7-4da1-9d3d-8094a2146ed0	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e8854bdedc503a24799c6868eee82c64f36bb61604ee3ad0dd91735131bea4b0	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 06:24:17.449+00	2026-09-15 06:40:16.858243+00	2026-09-15 06:40:16.858243+00	2026-09-15 06:24:16.940864+00
471088dd-fb42-42d4-8385-4cc37c23d758	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e85ce4d33bd6c51461352ef87f99f3610425c3944c629436562a0c8ac0e59ca3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 06:40:17.448+00	2026-09-15 06:56:16.762325+00	2026-09-15 06:56:16.762325+00	2026-09-15 06:40:16.858243+00
29a84c55-554b-485b-a20a-5a7ba730a626	a9e58a5a-30e8-4eda-b881-e6d0552597f2	ba35a7abf8ba858a676b38d51881cc0fe387e325047419ccde3ee095b890f780	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 06:56:17.44+00	2026-09-15 07:12:16.682779+00	2026-09-15 07:12:16.682779+00	2026-09-15 06:56:16.762325+00
fac07f0f-cfb9-4562-a0cb-3519b9fe6e59	a9e58a5a-30e8-4eda-b881-e6d0552597f2	ffbd7a6a331d7a63a5eb9a45854a31bb49a5b6b4c01082ff2597d119872eb35b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 07:12:17.438+00	2026-09-15 07:33:51.513225+00	2026-09-15 07:33:51.513225+00	2026-09-15 07:12:16.682779+00
ab3436b7-b691-4dbc-8ab2-e8b6ef27d46b	a9e58a5a-30e8-4eda-b881-e6d0552597f2	a6a7db4d5a462ad45539f6ab15b27681b91f2a35863b624683bbbdff32b95792	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2026-09-22 07:33:52.488+00	\N	\N	2026-09-15 07:33:51.513225+00
ba86055c-83dc-4296-9036-8fb08bb3c610	a9e58a5a-30e8-4eda-b881-e6d0552597f2	ed3f97dbae9fa63026b43f7881dd275493a7200865eac4950d59999d4d5b1692	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 07:34:43.125+00	2026-09-15 07:49:57.118123+00	2026-09-15 07:49:57.118123+00	2026-09-15 07:34:42.738025+00
32befa2b-2a6a-4460-b842-20f7beebe1f8	a9e58a5a-30e8-4eda-b881-e6d0552597f2	ab483558e056475397d7a8194106a6d99aef7360d0ba2c7adbc0ba7d3e67777e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 07:49:58.091+00	2026-09-15 08:05:11.927365+00	2026-09-15 08:05:11.927365+00	2026-09-15 07:49:57.118123+00
e5f0d720-4ad5-45ef-a03b-9a2f7c836f2a	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e9addf7a3d057f24e535b052dd28b176ee6163304b82f3587c008298d8029f05	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 08:05:12.986+00	2026-09-15 08:20:16.312312+00	2026-09-15 08:20:16.312312+00	2026-09-15 08:05:11.927365+00
2bea3467-51d6-48d8-a2e3-7a8b1847af33	a9e58a5a-30e8-4eda-b881-e6d0552597f2	7fc7a0eeb70c6029a8b3f09b850c63ff295e32accddd82c343a699cc832ada56	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 08:20:17.44+00	2026-09-15 08:35:27.492545+00	2026-09-15 08:35:27.492545+00	2026-09-15 08:20:16.312312+00
356cd281-2114-453f-91ac-0f2959da555e	a9e58a5a-30e8-4eda-b881-e6d0552597f2	6e65403e5ee1675d39cad9a91d87af780d0cbbf768f111825dbf4f15e0f8dacf	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 08:35:28.707+00	2026-09-15 08:50:39.176019+00	2026-09-15 08:50:39.176019+00	2026-09-15 08:35:27.492545+00
66cb1cee-6b4d-4db8-a47d-47509f602da4	a9e58a5a-30e8-4eda-b881-e6d0552597f2	3ec19bf491c21b9ffdd57733092560f398c8423e23e8b6c71594f3647a7c3b2b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 08:50:40.481+00	\N	\N	2026-09-15 08:50:39.176019+00
b7b4cd87-2acb-45e4-a1da-c1b176597193	a9e58a5a-30e8-4eda-b881-e6d0552597f2	618c4a4c8dc8b6f4085069bdfdcf6a98ffb9dcf6ef9c3e67a568ac0e94f9343b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 09:04:48.733+00	2026-09-15 09:19:52.161825+00	2026-09-15 09:19:52.161825+00	2026-09-15 09:04:47.86042+00
bc016d04-26a5-40ec-b85e-3cef11636687	a9e58a5a-30e8-4eda-b881-e6d0552597f2	490a926c32d14f9646f2bff71f670c2e706c72e808f1b474c0db4cd22378e178	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 09:19:53.626+00	2026-09-15 09:34:52.965373+00	2026-09-15 09:34:52.965373+00	2026-09-15 09:19:52.161825+00
1fc95a2a-0dba-4ec8-8223-3792f9404c73	a9e58a5a-30e8-4eda-b881-e6d0552597f2	5841b26a13d06d8f5318390e6b58d823dfbb19d53bccd5c6afa6521ea21400c9	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 09:34:54.505+00	2026-09-15 09:50:15.833262+00	2026-09-15 09:50:15.833262+00	2026-09-15 09:34:52.965373+00
310dc5a7-126c-4c96-b98e-fe950525e956	a9e58a5a-30e8-4eda-b881-e6d0552597f2	b369e3e9dda71c728b9e45b02795ab99358211319b7a9109f91cf97d059d35a6	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 09:50:16.326+00	2026-09-15 10:05:22.586044+00	2026-09-15 10:05:22.586044+00	2026-09-15 09:50:15.833262+00
e52b5233-fe42-4043-a1fa-a38f3e60e4dd	a9e58a5a-30e8-4eda-b881-e6d0552597f2	85b29cd44da65284d25ccf55d5a89804e2afc5a97f102f5c8bc659174c05b31f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 10:05:23.162+00	2026-09-15 10:20:32.237136+00	2026-09-15 10:20:32.237136+00	2026-09-15 10:05:22.586044+00
fe78a016-f419-4dbb-b5d2-1f8bac4c94c9	a9e58a5a-30e8-4eda-b881-e6d0552597f2	841ca5cb044c702c30cbdf9de8043ca50be205e638acc8cada714747f9e7475d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 10:20:32.89+00	\N	\N	2026-09-15 10:20:32.237136+00
5320c8a8-061f-4c3a-a2e6-418985766dfa	a9e58a5a-30e8-4eda-b881-e6d0552597f2	b139487bd6b1528fecc90d1e8055ef566cf1b08dece5883513a5439daff7f0c3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 10:21:49.676+00	\N	\N	2026-09-15 10:21:49.515458+00
a4f2c4a9-ed64-48dc-99b2-eb61fc1ab0be	a9e58a5a-30e8-4eda-b881-e6d0552597f2	1a797a129368cc229d3d2938b6111cbc260369e9f38d4550ab82eb0e02b0acc4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 10:32:57.676+00	\N	\N	2026-09-15 10:32:57.453741+00
7fe3a0dc-e60a-4f46-8f31-3bae51a857fb	a9e58a5a-30e8-4eda-b881-e6d0552597f2	23cb9f70d298dfb46f2b29de7d129319067c6310c9d0d276dfe3fec574e4e16d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.31.44.131	2026-09-22 10:58:45.742+00	\N	\N	2026-09-15 10:58:45.745739+00
0a9e77a1-65c1-4ffc-9949-2149df94bc0c	a9e58a5a-30e8-4eda-b881-e6d0552597f2	0092d01136839364809ee9fa27a2b07c47e459578ae3114b37b6bb10caa83021	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 10:46:35.701+00	2026-09-15 11:01:58.185516+00	2026-09-15 11:01:58.185516+00	2026-09-15 10:46:35.403227+00
e7921297-2798-428c-9462-b833dda789c5	a9e58a5a-30e8-4eda-b881-e6d0552597f2	349c486c854b57c182a712bc14fc652927d3f18653af225d6c379ac4a6f53fa1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 11:01:59.065+00	\N	\N	2026-09-15 11:01:58.185516+00
b7fc1cba-5cb8-4427-a9e2-9f6642068dfd	a9e58a5a-30e8-4eda-b881-e6d0552597f2	f487b42442bb3ca79c5e60b31ffd8ca5b619a05145911e84e60f984e62f4e88d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 11:06:29.082+00	2026-09-15 11:22:16.441055+00	2026-09-15 11:22:16.441055+00	2026-09-15 11:06:28.675574+00
0587893c-eb7d-4a0c-a5e9-21f7a8eb7b73	a9e58a5a-30e8-4eda-b881-e6d0552597f2	73f9105e07443feeb4e073c41c553b1651e7754c8c468ca9c16c2eb22521ad32	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 11:22:17.448+00	2026-09-15 11:37:46.982791+00	2026-09-15 11:37:46.982791+00	2026-09-15 11:22:16.441055+00
a8a81fee-4fc8-4b87-a8bd-672f529cb0df	a9e58a5a-30e8-4eda-b881-e6d0552597f2	d7eca246bd624c7e09c6ab8afd68051f0f41ce8a7b78e4c3a549ab2e761b02a7	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 11:37:48.057+00	2026-09-15 11:53:00.055984+00	2026-09-15 11:53:00.055984+00	2026-09-15 11:37:46.982791+00
ddce6700-3f9b-4510-82a0-10b16903a5a3	a9e58a5a-30e8-4eda-b881-e6d0552597f2	183a032b13ea84024cfedfd6ea66973198065a29a79af3fcffde5a4341b9e155	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 11:53:01.408+00	2026-09-15 12:08:15.275637+00	2026-09-15 12:08:15.275637+00	2026-09-15 11:53:00.055984+00
f4093573-6834-4e7d-89a7-0347293d3768	a9e58a5a-30e8-4eda-b881-e6d0552597f2	5fa3dfe88aa62623c33a286af1d385ea71abc3d82a54db6ecf86d8e8ffb01027	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 12:08:16.554+00	2026-09-15 12:24:15.815789+00	2026-09-15 12:24:15.815789+00	2026-09-15 12:08:15.275637+00
3ab0c37e-b8a7-4159-8675-a71d7f262d63	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e5ac24673ea282ec5bb3cc9c2874a8307f9e6eb808b1bbc1b4e78e6f6dc59624	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 12:24:17.377+00	2026-09-15 12:40:15.618901+00	2026-09-15 12:40:15.618901+00	2026-09-15 12:24:15.815789+00
4d370724-a3ca-4819-8f92-8338610ccb0f	a9e58a5a-30e8-4eda-b881-e6d0552597f2	95591c479f8e0a33f70d3f605b7d3a56f933a9aa1ff733e17520728596644fd1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 12:40:17.088+00	2026-09-15 12:56:14.927489+00	2026-09-15 12:56:14.927489+00	2026-09-15 12:40:15.618901+00
312bdeb6-61bd-445c-b3a3-843e81a523e9	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e1137b1465156539468e60e78d7bcc5a85190513b109cfc935c4f4364f4a47d5	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.29.206.4	2026-09-24 03:13:05.113+00	\N	\N	2026-09-17 03:13:05.114752+00
b9b69f31-3258-49a9-b7ac-f8d938c84252	a9e58a5a-30e8-4eda-b881-e6d0552597f2	903019cd859eefbb0e720c0654012679bddd3ebfafeaad2514cb92084359a114	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.25.120.81	2026-09-24 03:28:38.315+00	\N	\N	2026-09-17 03:28:38.316071+00
45799235-7c2c-41e6-9c36-878891cb7102	a9e58a5a-30e8-4eda-b881-e6d0552597f2	0fba8e78f7096942f9bfb472ab29214d2594dd97e5ec9d6a0866ca490c23a367	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.29.206.4	2026-09-24 06:08:39.891+00	\N	\N	2026-09-17 06:08:39.891688+00
9c7e5693-a429-4317-9d9d-4503d56ffe3f	a9e58a5a-30e8-4eda-b881-e6d0552597f2	718bf574a92201f0fc082652201f07ae03b7095bfe8e5e4e115a318af1a1f03d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.31.44.131	2026-09-24 06:08:59.387+00	\N	\N	2026-09-17 06:08:59.388271+00
b433f495-67cb-494b-bd80-cc6a56f1ef3e	a9e58a5a-30e8-4eda-b881-e6d0552597f2	d1f8ed7e343f0ffa1240e450e40150c65e3b7661780063a483939689e182adf6	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.29.206.4	2026-09-24 06:13:34.703+00	\N	\N	2026-09-17 06:13:34.783488+00
aece971d-19dc-4958-9900-a7345728319c	3882d705-6bba-4352-85a9-7e872120b96a	411298db6439e51251f65b0aaa38bd99e457155f5337da16f6ed58d3600a8aef	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22C5142a [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/18.2;FBSS/2;FBCR/;FBID/phone;FBLC/en_PH;FBOP/80]	10.29.206.4	2026-09-24 06:13:46.095+00	\N	\N	2026-09-17 06:13:46.096759+00
48d920c2-c6e3-4851-a782-5f56599b361c	27475903-2fe7-40d0-91de-e96a8797df96	9af6edb4379dd61d7cda7df0ddb49ba9021d2faf5730f4359958b5d23e3d7fe5	Mozilla/5.0 (Linux; Android 9; vivo Y85 Build/PKQ1.190118.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.118 Mobile Safari/537.36 VivoBrowser/10.8.3.4	10.29.206.4	2026-09-24 06:14:30.79+00	\N	\N	2026-09-17 06:14:30.791302+00
c20b029f-f226-49d8-9561-52e313231bf2	3882d705-6bba-4352-85a9-7e872120b96a	88ef7e6bc651ae5852e0463b5c65a4e9229ea5f574be486108162af4a6342b62	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22C5142a [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/18.2;FBSS/2;FBCR/;FBID/phone;FBLC/en_PH;FBOP/80]	10.29.206.4	2026-09-24 06:15:34.393+00	\N	\N	2026-09-17 06:15:34.394167+00
2633ae1b-8580-4355-b158-2fe83da23f58	3882d705-6bba-4352-85a9-7e872120b96a	ab78027ec18d02868ea380413d977c6603110db5c4ed1980320957e2e6c54290	Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22C5142a [FBAN/FBIOS;FBAV/579.0.0.23.106;FBBV/1068430635;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/18.2;FBSS/2;FBCR/;FBID/phone;FBLC/en_PH;FBOP/80]	10.31.44.131	2026-09-24 06:16:57.491+00	\N	\N	2026-09-17 06:16:57.491904+00
5b74a24a-869d-4a95-878d-b2d39498ecd3	993c8558-1fc7-4e41-beda-399eed19a082	5ea4fb6d7715c8afbca0b69050e93f542b07e7cfc11773e4aecc9f708dca8dc0	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36	10.31.44.131	2026-09-24 06:26:30.694+00	\N	\N	2026-09-17 06:26:30.694817+00
c0410e91-3c19-4f11-9c91-2b4fd02586e2	a9e58a5a-30e8-4eda-b881-e6d0552597f2	413513dc8c2d051fb23abb77982d78e95ae87dcb6a9eb4ec893a210f3bb7a455	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	10.29.206.4	2026-09-24 06:29:43.697+00	\N	\N	2026-09-17 06:29:43.698426+00
25c8be61-d708-42be-9de5-63c449951687	a9e58a5a-30e8-4eda-b881-e6d0552597f2	ee435aaf58532751330f1546431915db17f26736996b978f5809741185fb4364	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-22 12:56:17.596+00	2026-09-19 14:59:57.470539+00	2026-09-19 14:59:57.470539+00	2026-09-15 12:56:14.927489+00
4a8a38d2-4246-47ca-a874-ff7e1c6d36a3	a9e58a5a-30e8-4eda-b881-e6d0552597f2	7a217d921ed1716a05f4aeb2556eb467f3fd963071fd7a7d048dcef867097d24	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.29.235.113	2026-09-30 10:24:33.413+00	\N	\N	2026-09-23 10:24:33.414279+00
31c90783-926b-4718-8899-01ba750f7a93	a9e58a5a-30e8-4eda-b881-e6d0552597f2	5037f42ead8e91ba17ea27e6980a6f56cb5371fb065e97b20d2b2fa089a279f7	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-09-26 14:59:58.483+00	2026-09-25 11:54:51.694842+00	2026-09-25 11:54:51.694842+00	2026-09-19 14:59:57.470539+00
e9e70c97-542c-4cda-a4d5-d369dfc985a7	a9e58a5a-30e8-4eda-b881-e6d0552597f2	dce6bdb842e51e20eda06fa9c60218f9585dc9264c0b4f56114c1e9d1cd5c358	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	10.29.235.113	2026-10-02 11:56:28.538+00	\N	\N	2026-09-25 11:56:28.53947+00
584a0043-d248-4dde-9324-4b2493cb0f56	a9e58a5a-30e8-4eda-b881-e6d0552597f2	782cb21788b3b9d7e4c1a877f4707627264b998df1d5ff2bf4f1ceab96017f44	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-10-02 11:54:51.134+00	2026-09-25 12:10:03.939734+00	2026-09-25 12:10:03.939734+00	2026-09-25 11:54:51.694842+00
ad40e285-c7ed-46d4-b936-2e59dc0ef10b	a9e58a5a-30e8-4eda-b881-e6d0552597f2	8ad95d629325777d73866ea11b5426ac3d02158ccfce67573f3dcd56affb947f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-10-02 12:10:03.431+00	2026-09-25 12:26:03.90426+00	2026-09-25 12:26:03.90426+00	2026-09-25 12:10:03.939734+00
76d1b54d-f23c-4f10-bf37-9ab4590990b2	a9e58a5a-30e8-4eda-b881-e6d0552597f2	a1d8a62c0d57fc05220f4968878ce1c2169f0caaafc23fe1e351d11791e4385e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-10-02 12:26:03.481+00	2026-09-25 12:57:16.547262+00	2026-09-25 12:57:16.547262+00	2026-09-25 12:26:03.90426+00
0e13d9d5-b372-40d2-ab48-64569e524f6f	a9e58a5a-30e8-4eda-b881-e6d0552597f2	b6b886dde817ee6e47e521404eef12ca946b1153c204645ae19fe8e8b44ff79b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-10-02 12:57:16.28+00	2026-09-25 13:13:03.749936+00	2026-09-25 13:13:03.749936+00	2026-09-25 12:57:16.547262+00
a7cb6c05-9358-4c95-935b-ed9db087bcbb	a9e58a5a-30e8-4eda-b881-e6d0552597f2	7aebe81e4d39678356e8d4aa6a8adb88be59d947f7a33787bcf78048d8373315	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-10-02 13:13:03.578+00	2026-09-25 13:28:16.534683+00	2026-09-25 13:28:16.534683+00	2026-09-25 13:13:03.749936+00
5485262e-c947-47fc-9b69-e17859760c1b	a9e58a5a-30e8-4eda-b881-e6d0552597f2	9ca4943a9a988579ce148ed3937fe36fde910d25e0f4db6c686c289bfcf9263d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-10-02 13:28:16.466+00	2026-09-29 08:35:27.523835+00	2026-09-29 08:35:27.523835+00	2026-09-25 13:28:16.534683+00
cd6c5da3-4021-4cd2-afdb-0ccb874a575b	a9e58a5a-30e8-4eda-b881-e6d0552597f2	e30f08cf19b04a8af5801c7c1d73389221383b1c2782054cad42e1e1cb6eb510	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	::1	2026-10-06 08:35:25.025+00	\N	\N	2026-09-29 08:35:27.523835+00
\.


--
-- TOC entry 3585 (class 0 OID 16466)
-- Dependencies: 223
-- Data for Name: staff_invite_tokens; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.staff_invite_tokens (id, user_id, token_hash, invited_by, expires_at, used_at, created_at) FROM stdin;
\.


--
-- TOC entry 3588 (class 0 OID 16503)
-- Dependencies: 226
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.tickets (id, ticket_no, motorist_id, motorist_name, license_no, enforcer_id, enforcer_name, violation_type, notes, date_issued, status, latitude, longitude, is_deleted, created_at, updated_at, access_token, vehicle_id, evidence_filename) FROM stdin;
9bcbac6e-54b3-45be-9c86-384c6b7c066c	TCT-00001	6652eb93-d344-417f-abdf-10e134ac346f	Jose Garcia	\N	\N	Enforcer Juan	Beating Red Light	Ran red light at intersection.	2026-06-24 10:15:20.036+00	pending	12.35124354	121.06546047	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	df91dbfd-f0fb-49ec-8690-8915fc00ebde	baf380ff-0a77-421c-854e-d1cc4bff85f2	\N
caadb0c9-1985-4d4a-90bb-c23de985d472	TCT-00002	79d6d2da-ae32-414f-8d92-9bcf5931306d	Leonora Evangelista	\N	\N	Enforcer Lito	Obstruction	Vehicle causing road obstruction.	2026-07-17 07:25:01.109+00	dismissed	12.35546465	121.06775310	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	62b57151-bd4a-4784-9705-a847984dd112	4148fdc2-30a5-4672-9fcd-6cad10189b84	\N
5d211937-5713-4bef-86dc-20d4e881bd45	TCT-00003	ee97d3bb-22b3-4b9e-bed8-30a36bd2d1ad	Eduardo Kabigting	\N	\N	Enforcer Dante	Obstruction	Vehicle causing road obstruction.	2026-08-11 02:26:21.248+00	pending	12.35128994	121.06366964	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	3cfe4d11-0124-4de5-a37b-4d48fef2e1f9	e014794b-693a-4e7b-882f-823eff1c6386	\N
34bd66d4-bb63-44a8-b23d-26cd64e827d1	TCT-00004	69cf0683-8953-4303-b31d-2715aa462cf8	Dennis Bautista	\N	\N	Enforcer Ricky	No Helmet	Motorist apprehended riding without helmet.	2026-06-18 00:32:40.114+00	pending	12.35703475	121.07194617	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	509899b7-4737-4657-b8dc-a48ea69f051d	f12c8da3-53bb-4475-b119-19c470ead3b7	\N
49b62242-c9f2-46cd-bbf8-b8856f98f9c1	TCT-00005	3ffd10fb-42ba-4eb9-b3a4-dc5ab13105e8	Leandro Castillo	\N	\N	Enforcer Tony	Illegal Parking	Vehicle parked on no-parking zone.	2026-08-29 06:40:20.146+00	dismissed	12.35620581	121.07412949	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	cc0b432b-18d8-44d6-812d-156c56b19e6c	695d3f71-d984-4e3d-94f1-94ec7ee97f48	\N
fc1d1f62-ad2c-41ee-8446-d3135f1d31ee	TCT-00006	421a813d-735c-4e02-a023-0b62cc7af99d	Mariano Salazar	\N	\N	Enforcer Tony	No Helmet	No helmet worn. First offense.	2026-08-22 22:50:50.113+00	pending	12.35883476	121.07165233	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	adccc0ab-7644-494c-93ab-2b4554c33bb4	93b1cbfa-1fa9-4301-b52d-9a6fa75e6172	\N
e55e24b6-b775-4216-87af-74ace364bd70	TCT-00007	2b8ddd87-a2c0-4787-8a42-05de5c213e07	Nestor Pascual	\N	\N	Enforcer Ricky	No License	Student permit only — driving without supervisor.	2026-06-22 03:53:25.302+00	dismissed	12.35160243	121.06483910	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	7a2153ff-ee5f-4034-ba4a-63c2baa3c243	71a12c3e-9e3e-4d2a-9b06-59e1ac7d6a64	\N
58e7459d-a7c0-4157-9673-04f90f5688b4	TCT-00008	84f9bde3-9663-4791-8ace-e5b877cce3a0	Elena Bagamasbad	\N	\N	Enforcer Dante	Illegal Parking	Vehicle parked on no-parking zone.	2026-06-12 22:16:56.827+00	pending	12.35876285	121.07303651	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	2b982288-de68-49ac-b161-e3d3310f2c87	371df0d3-6a03-4223-a5c1-2d3729ac8fd4	\N
7a122c5d-8a3b-4522-95ac-a8bff51adc2f	TCT-00009	65d909c6-f264-4a33-a265-dad701b1ce61	John Ramos	\N	\N	Enforcer Juan	Beating Red Light	Ran red light at intersection.	2026-06-27 01:47:12.957+00	resolved	12.35417826	121.06594132	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	da083c61-9cce-44d0-a551-a0a5bc733fec	b87f688c-3896-425f-a4c7-140e255629cc	\N
b45da529-13d1-4b1a-af9d-cd425793b90c	TCT-00010	cec1ef86-4d20-4c5d-ac89-9cef42008468	Herminio Galang	\N	\N	Enforcer Ricky	Beating Red Light	Beating red light during peak hours.	2026-08-06 02:15:10.617+00	disputed	12.35154949	121.06540076	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b024edc0-5569-40e8-b547-f196fb89492b	5ca8ef5b-583d-4438-96ac-785df175e856	\N
ea91b1ae-3c51-49f7-a92b-f877aa465675	TCT-00011	dfb46de4-1779-48c5-80eb-f016b5c0866e	Jocelyn Lacap	\N	\N	Enforcer Bert	Reckless Driving	Cutting lanes and overtaking unsafely.	2026-08-16 02:10:58.361+00	paid	12.35548679	121.06843755	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	14fde2db-90be-43eb-a174-2910313a2187	5480dffc-acb8-48a7-af0c-12ddd8ba2052	\N
1367a68e-cc9b-4897-a3be-5ee81e732cc2	TCT-00012	ec840ec2-e42f-408c-bd7d-4e2c80bbc712	Gemma Pineda	\N	\N	Enforcer Juan	Illegal Parking	Vehicle left unattended in no-parking area.	2026-08-30 01:12:35.203+00	pending	12.35626624	121.07433138	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	eeaba26e-b70c-4a75-b698-916ecb23946a	f5aa7954-f1fa-4faa-87e7-c5a0b9411c39	\N
967b9716-dd8d-4894-b2d1-6a2389b7c40f	TCT-00013	3dbca453-c90e-4681-b3d2-8ffaf894bd07	Carlos Evangelista	\N	\N	Enforcer Marco	Illegal Parking, Obstruction	Parked in front of fire hydrant.	2026-07-11 11:12:07.51+00	pending	12.35940198	121.04449788	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	624c3305-a779-40f4-9158-c0fcb8bb772e	79849a1c-2987-43dd-9d9f-9c3121bfe1b4	\N
6018d397-48c1-4073-a9a4-129110fcfcc4	TCT-00014	da426c1e-1f33-4a29-b725-f8e0c265464a	Celestino Hernandez	\N	\N	Enforcer Marco	No License	Driver failed to produce license when flagged down.	2026-06-21 03:30:29.605+00	pending	12.35934769	121.04424305	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	71232028-ba71-47af-a331-68ce2b04924c	f773efc2-0f77-48d2-819b-79d20254d807	\N
cce0a24a-4565-4448-941f-1a2befdc2b9d	TCT-00015	2b369792-2651-465b-8f40-d5c1ad353eca	Rommel Mallari	\N	\N	Enforcer Tony	No License	No valid driver's license presented at checkpoint.	2026-06-08 09:19:00.438+00	dismissed	12.35727064	121.04495418	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	bc830dc1-6d43-4b46-8d64-e3fe1e68d609	7ad202d7-92e3-4f87-ac8d-fabcf2670253	\N
07b1b636-4fe7-4966-b66e-58c86264d9e2	TCT-00016	c01c852e-8541-4106-a8ea-55e6c8358d9a	Cornelio Tinio	\N	\N	Enforcer Bert	Beating Red Light	Witnessed running red light — no hesitation.	2026-06-26 08:06:38.671+00	disputed	12.35073365	121.06354393	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	1f954e61-d100-4c3e-95f4-fd01206ce7a9	5f94ef2d-31bb-4b90-ac4a-8944b98783e5	\N
297ca659-bc25-4900-b8fb-c3ba3ddacef2	TCT-00018	45b4bf76-2197-4153-a014-b38dbf1a4bc1	Nestor Villanueva	\N	\N	Enforcer Juan	Obstruction	Tricycle loading passengers in the middle of the road.	2026-08-28 10:12:22.545+00	dismissed	12.35508600	121.06854040	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	6761f264-8372-4d19-9a76-72b72a1cbc57	121342e8-5cb0-4790-8a0b-932164952088	\N
79a4b59e-4e4d-46bd-8ecd-2c5961f0f9b1	TCT-00019	917a7066-b584-45d8-b273-8f442513b6c9	Gemma Bautista	\N	\N	Enforcer Dante	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-08-20 05:33:06.926+00	resolved	12.35639459	121.07240944	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	848ae932-a2ab-4ca7-b326-b9e23a2325de	3bb3ff57-5f43-4413-9932-8728e9688c2a	\N
670c8bc5-cc90-44a2-8658-ca43c26a102e	TCT-00020	4de7d8b3-b976-4ac8-b031-918e4663e8bb	Leonora Tiongson	\N	\N	Enforcer Bert	No License	No valid driver's license presented at checkpoint.	2026-07-13 06:36:57.665+00	pending	12.35861190	121.04671814	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	2e5540c3-567c-480a-8811-f2824b6d7375	4784770b-d322-47a8-a963-5cab07484bfa	\N
5da00e45-98dc-4f0b-ad87-f81e64082df3	TCT-00021	f3f4209f-355f-45f2-80ce-b6de72f21c7d	Teresita Tayag	\N	\N	Enforcer Bert	Reckless Driving	Motorist ran past stop line and ignored enforcer signal.	2026-07-12 09:14:12.359+00	pending	12.35267048	121.06436799	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	3852114a-82f5-4772-926d-905118c1df22	7dcd1efe-86b1-4122-bb84-eefffd626cb5	\N
57d52300-09ed-4dfe-87c4-3f1e21db7b08	TCT-00022	6a04a52b-0f06-4dc4-8b85-687a0c77d72f	Zenaida Mandap	\N	\N	Enforcer Dante	Beating Red Light	Traffic light violation observed. No stopping.	2026-08-24 08:17:24.925+00	pending	12.35809446	121.04556409	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	92d6e630-dc59-4cda-af00-bb1ada085047	b43f6ca5-28ee-45fb-9919-32f854149f54	\N
d9b5e824-8296-4817-b2ca-e90244a4c04c	TCT-00023	97b7e325-0386-4a85-8f19-86bc598e6938	Marvin Dungca	\N	\N	Enforcer Tony	Illegal Parking	Parked in front of fire hydrant.	2026-08-20 01:37:40.067+00	resolved	12.35900702	121.04471541	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	bb728950-758d-46d7-aafc-4095b50af69a	fa916058-9a10-4c91-aa3a-c6e8fed7c6d6	\N
7a451984-6558-440d-88d0-74944cf48c05	TCT-00024	006fe65b-0e4b-4a62-b584-c3cff94b0ea7	Danilo Tayag	\N	\N	Enforcer Juan	No License	Driving without license after prior confiscation.	2026-07-19 05:00:24.69+00	resolved	12.35439896	121.06779010	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	54d4cabe-7c45-45d4-b7ca-44d2b6583b64	469ee070-dd57-472f-85e8-f64126ac164d	\N
77fe3ca1-03f9-4b42-bd7e-fa17ff875433	TCT-00025	fba75231-03e3-418b-9df9-e7e007c40344	Cornelio Ramos	\N	\N	Enforcer Juan	Illegal Parking	Obstructing traffic flow due to illegal parking.	2026-07-04 03:49:02.336+00	dismissed	12.35746398	121.04585225	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	2f454805-494f-4c88-ab52-7e9da66ccf10	821785f7-990b-485c-92c8-2677534af84c	\N
0a7c1a05-5c56-428d-b2d4-5533dea066ba	TCT-00026	5dbf54f3-97f2-4396-ac2d-70311f96dcd2	Miguel Torres	\N	\N	Enforcer Tony	Reckless Driving, No Helmet	Reported near-collision due to reckless driving.	2026-06-29 07:59:30.815+00	paid	12.35432517	121.06655253	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d6e6c2b6-6395-4f75-99a9-ca0c58de81d1	5afe3547-15d7-42ef-a196-330d2be7d50e	\N
1db18649-7995-43c7-9eb7-05a26488643d	TCT-00027	14c39426-8418-4ee1-b768-6b1953176ffd	Herminio Gutierrez	\N	\N	Enforcer Marco	Obstruction	Vehicle causing road obstruction.	2026-08-11 05:46:49.377+00	disputed	12.35088886	121.06356677	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f43dff50-83c5-41b8-8162-8df1fabe48a8	b46e2a35-bbd0-469d-9c9b-8756397eabbd	\N
5c201d6a-dd40-4888-bfec-f060714b6f2e	TCT-00017	412cf07f-2348-49e6-aec4-6bf7bfe6ecf5	Domingo Mallari	\N	\N	Enforcer Lito	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-08-31 07:06:01.527+00	dismissed	12.35020312	121.06317891	f	2026-08-31 04:43:24.612775+00	2026-09-03 00:37:17.767472+00	37e73184-5d80-49ad-b46c-b7a06d2aa3b3	d8f62f0c-bd6d-40fa-a882-f903fc399a8a	\N
cc2f1e8c-c33e-4d0b-ac6d-d2a70b0ca992	TCT-00028	36ed3ea6-ee10-4137-8b8d-6bc7d30d01d2	Nestor Ramos	\N	\N	Enforcer Juan	Obstruction	Vehicle causing road obstruction.	2026-07-23 01:45:02.559+00	pending	12.35387422	121.06888093	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	08f24822-a088-4eb2-9503-af341f57568c	5122ad14-1e24-45dc-bf9f-0910cddd3809	\N
fa094f4a-a081-469b-b12a-1140f725bf18	TCT-00029	744e038e-bf37-433d-8677-78323fa5d217	Manuel Garcia	\N	\N	Enforcer Dante	Obstruction	Tricycle loading passengers in the middle of the road.	2026-08-02 09:20:22.085+00	pending	12.35147673	121.06576301	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	c6feaaad-86d3-4379-a0fc-9688fe1f8370	0645be1c-8c8c-455a-943f-d3b673b80d23	\N
53f269f3-b337-44ec-a187-92b9d25ee188	TCT-00030	87d6be9f-77fd-4140-8ec8-010096ae76e7	Marvin Bautista	\N	\N	Enforcer Ricky	No Helmet	Habal-habal driver without helmet.	2026-07-28 05:19:49.519+00	resolved	12.35501254	121.06762807	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9227f0d9-d6cc-4965-be91-8305a9c9dbf4	89880ca7-21d3-4a48-8d10-778ec41c44a3	\N
1954bb83-01cd-47a7-a003-39288dcf9365	TCT-00031	390bd475-e488-4a0c-88e4-e2d9f2f81f5b	Zenaida Macaraeg	\N	\N	Enforcer Dante	No Helmet	No helmet worn. First offense.	2026-08-08 10:38:56.191+00	paid	12.35769689	121.07221826	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	6cd796c8-0378-4cea-a529-e88786ffbc7f	b866169c-37e2-4289-8cbf-d0fa16e7b1d4	\N
a781734c-67ec-44df-aa11-7ec077599dce	TCT-00032	a58d721f-98cf-4682-9210-99583f6d93d2	Sheila Buenaventura	\N	\N	Enforcer Dante	No License	No valid driver's license presented at checkpoint.	2026-06-06 03:46:20.865+00	pending	12.35480566	121.06626451	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	bff8a869-7462-4ac3-8339-1618a578e372	0775e4ed-6ae2-4051-9bbb-af9515037566	\N
fad20761-1604-4dfa-b407-af67e3575554	TCT-00033	0ca0068c-51d2-4f12-bf9f-b07c4edea9ad	Ramon Tolentino	\N	\N	Enforcer Marco	No License	No valid driver's license presented at checkpoint.	2026-06-13 02:29:13.721+00	pending	12.35865119	121.04411105	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9ee80720-467f-456a-bd68-f7cdf1eac862	f44a2664-d4d0-479a-a002-2b1f971f99cf	\N
33b0bff9-7784-4642-8b1f-142a18ffc574	TCT-00034	55e9749a-4da2-4e61-b11e-e12bba04ab40	Pedro Sison	\N	\N	Enforcer Ricky	No License	No valid driver's license presented at checkpoint.	2026-08-17 10:41:11.65+00	pending	12.35867314	121.07170638	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9da4824a-ffab-4409-810d-3c5111c6c8a5	85fb008f-7cd4-4b2a-a328-a550e629596f	\N
74bca6d1-bf50-4c52-9335-59ba25523a22	TCT-00035	6c282b06-d6cd-4ff6-9453-75e78fce9cc3	Leandro Concepcion	\N	\N	Enforcer Marco	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-08-13 02:46:26.091+00	dismissed	12.35552839	121.06843207	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0b0de560-c000-4d03-857b-e9d3bb75880b	3ba9e087-7e5e-495c-a6b8-1f9b60b858d7	\N
9adf458c-a35d-4089-99bd-098f55b4866b	TCT-00036	5c5155ab-cb8b-48fc-910f-ba131efa87dd	Alfredo Galang	\N	\N	Enforcer Dante	No License	Expired license presented. Treated as no license.	2026-07-05 09:53:16.008+00	pending	12.35355804	121.06818123	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	a2a818f7-a89e-4234-b392-30b3a99ad837	64bb8698-9b7b-4b23-931d-752735bfe118	\N
45b2c235-4e45-4840-a34d-6c68c5d4eb6f	TCT-00037	8b7a8e2f-310e-4d30-91de-402af8dbf62b	Marilou Dela Torre	\N	\N	Enforcer Lito	No Helmet	Rider and back rider both without helmets.	2026-06-08 02:56:43.851+00	resolved	12.35358214	121.06764405	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	42cc444f-3af9-4de4-93ae-219c8531bb13	d662b0e0-04b5-4062-8a85-91403721c095	\N
031df5a6-2699-49ca-ac96-a80c17b8516c	TCT-00038	28f0638f-0196-4f46-ad1e-67ead9162fd9	Eduardo Navarro	\N	\N	Enforcer Juan	No License	Student permit only — driving without supervisor.	2026-08-01 06:39:03.748+00	disputed	12.35779532	121.07299153	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	69db044f-2508-42cd-bb8f-e65ad93e5a70	5ff4b9e5-9ab1-4b50-aede-ca2dcd611d0c	\N
a8b688a1-44fd-43b8-ba2b-0fc85f7d6618	TCT-00039	d775ce10-452b-45d0-a339-ccb1d223f84f	Ramon Tinio	\N	\N	Enforcer Bert	No License, Beating Red Light	Expired license presented. Treated as no license.	2026-06-20 03:19:43.758+00	resolved	12.35208836	121.06379636	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	2596ab87-f389-43f9-bd9a-a70222466cf5	dcc3dd0a-7541-4ddd-b89d-f467996fe9f2	\N
2e85cb57-0481-4d39-b1e0-ae46cba73575	TCT-00040	1ed3c9ca-6a40-47cf-9499-08629fce2b60	Juan Dimaculangan	\N	\N	Enforcer Bert	Obstruction	Tricycle loading passengers in the middle of the road.	2026-07-26 03:23:30.795+00	pending	12.35281588	121.06618295	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9d88dbc8-f036-46f6-b1ae-e304e6bc38b4	e569f777-2747-492d-ad3d-c2076dc5df1b	\N
f4089117-4a14-4b64-b107-4eac47b29a17	TCT-00041	381c8426-24ae-4256-878c-c9708ce8a2d9	Rodel Tiongson	\N	\N	Enforcer Bert	No Helmet	Rider and back rider both without helmets.	2026-08-09 09:35:53.649+00	pending	12.35089793	121.06331258	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	300d19c6-9c30-4aa1-b1f9-a799a272237a	b3175d75-bf01-4278-a712-b53c9e91834c	\N
2c95524b-91fd-44d0-a3ef-3201657c3c4a	TCT-00042	a878fbb5-5f21-463c-b56c-58f1b43b2030	Fernando Aguilar	\N	\N	Enforcer Lito	Beating Red Light	Ran red light at intersection.	2026-08-25 04:43:04.392+00	pending	12.35625162	121.07404594	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	ee60e524-cd39-4318-921d-53ee970e0e61	6a2b95ad-8ec7-4dd0-bf23-decca747deb3	\N
db49e143-a751-4847-a832-593974572f37	TCT-00043	340ca04c-3438-42b8-b367-eb564abef02a	Alfredo Lingad	\N	\N	Enforcer Ricky	Illegal Parking	Parked in front of fire hydrant.	2026-06-21 11:04:33.448+00	paid	12.35794173	121.07382910	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	11d96232-bfed-4049-9549-0435fb1bd534	5ebd5704-4b1a-49ea-a164-3dca07fb1849	\N
d3872cad-541c-4cc1-b8da-8a340635629a	TCT-00044	24095ed2-0c9e-4333-b771-eddbb1a9a402	Remedios Hernandez	\N	\N	Enforcer Ricky	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-08-17 04:12:33.936+00	pending	12.35964794	121.04487016	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f974035e-6ad9-4d5e-959b-0e793a53298a	b516ddca-f2ba-4030-ab8f-f2357e28aba6	\N
f437a2fc-14a6-4058-aa30-867bce4fea1c	TCT-00045	8f842b9d-3bea-4ee2-bd50-23c0d7d75bfb	Noel Dela Cruz	\N	\N	Enforcer Juan	Beating Red Light	Motorist ignored red signal.	2026-08-26 11:49:41.542+00	pending	12.35847272	121.04614707	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	82464c50-bf07-4816-a6d8-88c3a16b8d77	c9b87f72-5e97-415b-bce7-188473eba647	\N
ef55119d-631a-4664-9025-872260b996b1	TCT-00046	7f33cf04-d351-431a-91bd-95db86987cb7	Antonio Malit	\N	\N	Enforcer Juan	Beating Red Light	Witnessed running red light — no hesitation.	2026-06-03 23:27:38.28+00	pending	12.35653974	121.07187877	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	3e67a4b0-b901-47f8-9524-df3472da68a4	f46bad7c-4ee6-4df7-ad71-665810392d3b	\N
98645008-8e7e-41a3-ade5-1678e9c4c765	TCT-00047	16c00cf3-19c0-4b87-91ff-6d3edcb5f81a	Sherwin Policarpio	\N	\N	Enforcer Marco	Beating Red Light	Beating red light during peak hours.	2026-08-14 08:46:55.956+00	pending	12.35731251	121.07379896	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	895f7f77-7d8a-44cb-93f9-b26858ff43e1	79c3dcfa-2995-4af8-bf20-70b7b30d330a	\N
7ef1614a-f454-4ebc-b180-5c405341543e	TCT-00048	8976f19d-a0cd-4459-a653-c37e51f98edd	Ricardo Espiritu	\N	\N	Enforcer Tony	Obstruction	Loading/unloading in prohibited area.	2026-08-26 10:58:26.087+00	pending	12.35910815	121.04629483	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	27436b50-8292-49ec-9688-8ce7985fde84	c53c42c3-7450-48a3-8ada-9a78e67d6858	\N
7ab76d61-2e05-4d96-8256-ba328127dc5e	TCT-00049	87a585d9-b237-4473-b0ce-ef8a4eec1435	Perla Sison	\N	\N	Enforcer Bert	Illegal Parking	Vehicle parked on no-parking zone.	2026-07-14 22:48:52.615+00	pending	12.35281548	121.06511292	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	64cecc2b-4f6a-45da-a01a-73a6f24a3561	1f0a5bc9-70b0-46b2-91aa-66f34a400858	\N
e08714d7-6881-440d-84e4-4d0a49c57be3	TCT-00050	040fd03b-204e-44c9-8bcd-074d9515aa66	Evelyn Yumul	\N	\N	Enforcer Tony	Beating Red Light	Beating red light during peak hours.	2026-07-31 08:57:59.847+00	dismissed	12.35191488	121.06514092	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f50899a8-77eb-4bf1-81c0-db831c3866e9	7591be18-e139-48f5-a45d-ca066df32abd	\N
3d8a5c26-f7a4-4709-8282-f827b8fb704b	TCT-00051	fb1e3696-2879-4fa3-b741-28c5a15be841	Jose Garcia	\N	\N	Enforcer Bert	Beating Red Light	Motorist ignored red signal.	2026-06-07 00:19:55.403+00	disputed	12.35794492	121.07168201	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	77565157-77c1-41fa-9655-2ea0c19ee6a6	ec21d348-8f70-4c1d-a6ac-c5a452425a16	\N
c7bc3c22-14e4-47e7-8b58-db412ade2d63	TCT-00052	9be75cb1-61b9-4fed-881b-c80467ae2314	Arturo Paglinawan	\N	\N	Enforcer Tony	No License, Beating Red Light	Driving without license after prior confiscation.	2026-07-04 22:06:08.202+00	resolved	12.35510989	121.06820780	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	647feb6a-00f9-4a0e-9e2e-0303b296c86e	5bcb3368-3ea0-4bff-a30b-41fea42174ad	\N
9bf143ef-88fc-4137-87f8-c11cb219456a	TCT-00053	ccb93aed-71a2-4c42-b0bb-188e85fb076d	Domingo Paglinawan	\N	\N	Enforcer Marco	No Helmet	Motorist apprehended riding without helmet.	2026-06-18 02:41:09.263+00	pending	12.35435986	121.06632832	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	51466b08-3cf7-4d5e-81b1-568f3127dd39	3cf1c1b4-4af6-4f4a-81cf-aae2ba96ae4d	\N
a3eb9ab4-a4d6-4e12-b43c-6197a9437ba8	TCT-00054	8e1777be-7dc1-4408-9f60-62323593e260	Bernardo Ocampo	\N	\N	Enforcer Dante	No Helmet	Motorist apprehended riding without helmet.	2026-08-07 04:06:26.102+00	disputed	12.35136411	121.06334966	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	e6657e42-b5a9-46f9-afb5-590a69169dc6	b0c504a0-45f8-4cc9-9a45-6d6b609e730b	\N
e10c4174-9e77-4b54-8e7a-a389452e1c29	TCT-00055	8e75b5e3-a7d3-4bb4-9a23-6d291955c4aa	Perla Soriano	\N	\N	Enforcer Marco	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-06-16 08:23:53.466+00	paid	12.35417085	121.06863005	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	e7950872-3fed-4a98-bc86-7bee7c6ff40a	a929d949-dcdd-4823-831d-079ed726603d	\N
d60eb3c0-be91-4ac9-b0da-e17213870605	TCT-00056	aae5ed99-7b46-40d5-aaa0-a1b8f43ea6bd	Corazon Ferrer	\N	\N	Enforcer Ricky	Beating Red Light	Witnessed running red light — no hesitation.	2026-06-20 02:20:29.412+00	pending	12.35748980	121.07446247	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	cf1a5a9e-5ba1-4a02-8e0e-537fa99a606c	0b489a1e-a37a-48ca-ba6f-558733ebd557	\N
fc438ac3-1a55-4b9b-84fb-fe41e8be18ae	TCT-00057	56944817-ef4e-4d5d-9c69-1b9211067e7b	Leandro Macapagal	\N	\N	Enforcer Tony	No Helmet	No helmet worn. First offense.	2026-07-30 06:16:57.57+00	dismissed	12.35964860	121.04604683	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	548d515e-02ba-4de9-8830-766274dc8299	442d58af-4f4a-40f0-ac25-925d7732d8b5	\N
12dc1007-5c82-4ed6-9681-449294fe1f86	TCT-00059	23fbdc8d-c739-4713-b7c8-d0538487e194	Simplicio Soriano	\N	\N	Enforcer Bert	Beating Red Light	Witnessed running red light — no hesitation.	2026-08-25 02:10:40.371+00	pending	12.35800543	121.07442308	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	c824ded4-6901-4704-9686-5dcfc430d2b0	57f87fea-34ec-4f0a-a727-c419cab21797	\N
cf968031-a561-4809-bb47-3f16ae5781d3	TCT-00060	dd364e1c-3302-46fc-99a0-0c297abe5633	Evelyn Silverio	\N	\N	Enforcer Bert	No Helmet	Motorist apprehended riding without helmet.	2026-07-10 00:07:50.898+00	paid	12.35607784	121.07262363	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	60cf0ed8-74f7-46a2-8deb-f9bac637df93	03236769-636e-45f4-b0d4-1c75a6a03a00	\N
21fbf12c-e27e-414d-98d8-f1f327fa338c	TCT-00061	2614c3b8-bf53-42dd-91d6-d0f321e39bd8	Alfredo Galang	\N	\N	Enforcer Marco	Obstruction	Tricycle loading passengers in the middle of the road.	2026-06-18 10:39:44.897+00	paid	12.35315953	121.06706813	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	54ea70f1-f095-44a5-8e9a-e38d7df2ed1a	f3779e3c-f867-43d8-9add-82a7349776e7	\N
4d48f3ac-262d-438e-a3f7-e68eee9ee26b	TCT-00062	83ff01e2-1b12-4d0d-931c-68ce3f1fc510	Simplicio Hernandez	\N	\N	Enforcer Bert	Illegal Parking	Obstructing traffic flow due to illegal parking.	2026-06-05 03:05:29.014+00	pending	12.35493427	121.06707862	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d7eb7fb6-52c4-48cb-952e-b64b6eda6bc9	069b5f74-b37f-4763-a968-4ca2c68b8435	\N
4e986277-1e59-4930-9534-633de7231ca6	TCT-00063	5d266376-b85e-4ce4-8cea-4725af5e7c74	Miguel Manalo	\N	\N	Enforcer Juan	Illegal Parking	Double-parking reported.	2026-07-27 22:01:57.309+00	pending	12.35831193	121.07351231	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	4f9d6967-c9d5-49fa-9a52-0124d230dc7e	f5e1b87b-d35a-4aad-8e5f-735c1e65b25d	\N
bb2e8b6c-8de0-49ee-bdc7-e62f18e4120f	TCT-00064	3c2e42e9-30b4-4ddd-96d9-0cd992ff70e1	Ernesto Flores	\N	\N	Enforcer Ricky	No Helmet	Habal-habal driver without helmet.	2026-06-09 09:36:10.447+00	dismissed	12.35453790	121.06654455	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0a357548-97b2-4c39-bfdf-337ed0fd00c3	f92ddffe-1623-4952-adc8-e67ab7405755	\N
1900e3e3-8dbb-4d89-8fd6-068347e8dfed	TCT-00065	587a5cc7-d4d3-453e-802d-0f7167ca31dd	Alvin Magpantay	\N	\N	Enforcer Bert	Illegal Parking, Obstruction	Obstructing traffic flow due to illegal parking.	2026-08-29 23:30:28.715+00	dismissed	12.35668689	121.07397090	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	5abc7eae-6351-418e-ba88-b5ad50b16612	e7d06b01-6491-4a0c-8c41-6eea0c9e2ab6	\N
8c02967a-497b-40b8-9196-e69b16a61b77	TCT-00066	f0ac1348-d5f5-48da-bcd5-ffc2d10f30b2	Carlos Lacap	\N	\N	Enforcer Bert	Illegal Parking	Vehicle parked on no-parking zone.	2026-06-13 09:40:43.835+00	pending	12.35848488	121.07357557	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0e5a7694-ab43-4979-b559-be34975d852e	19253d53-06f4-49ea-85dd-948c15436131	\N
fc3076ef-dc3f-4535-b23a-3db93d25b1a4	TCT-00067	f6af87ad-c3cb-4b7a-ab97-50a001d5e94d	Jayson Lingad	\N	\N	Enforcer Juan	Obstruction	Tricycle loading passengers in the middle of the road.	2026-06-28 09:06:46.854+00	pending	12.35731260	121.04510719	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	8020d950-83c2-44a6-aec0-bc21920dadc9	6e2baf39-ffee-4cc9-9f4e-2874561161a9	\N
42712bda-85c9-4c5c-bc14-6a399b5f851b	TCT-00068	c395b5da-6f1a-452d-9f3a-a4b12795c96f	Celestino Galang	\N	\N	Enforcer Dante	Reckless Driving	Overspeeding and swerving.	2026-06-14 09:29:57.413+00	pending	12.34997606	121.06422499	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f5420d11-cef0-4d1f-b3be-b28d7dc20fc5	aa21ed88-8b28-4874-98ac-27c1fe486ec8	\N
cac78b19-215f-4bbc-ad72-5dfe5ece647f	TCT-00070	9696acbf-72e1-4397-be5f-4416d084754f	Carlos Dela Cruz	\N	\N	Enforcer Ricky	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-08-04 07:11:12.608+00	pending	12.35685426	121.04667874	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	dbd3aeda-c297-476c-b89d-5cb0bfefa068	ba8213a6-072a-4102-974c-5e1c1d0c4577	\N
4a7952c0-472f-4ff0-bcca-516bf984b4a3	TCT-00071	f8abecf5-ea81-4fd7-a2fe-b3667065a157	Rosa Sison	\N	\N	Enforcer Bert	Reckless Driving	Cutting lanes and overtaking unsafely.	2026-08-30 11:23:03.067+00	pending	12.35806253	121.04480829	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	8c42954b-c509-4e97-8059-1402cc39354b	cc5ec0ac-1ef0-4633-9986-b18195e78a9f	\N
ff62de2f-56ec-4ea3-b706-3dbf66f2b682	TCT-00072	119e1416-7da8-4daf-85f4-d4a047ad6812	Ramon Castillo	\N	\N	Enforcer Marco	Obstruction	Vehicle causing road obstruction.	2026-07-13 03:44:37.812+00	pending	12.35784171	121.07167941	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	eab65ab7-a5f8-4328-89fb-36e634c3e060	90bdd838-7d4d-473d-affb-8f44111a87ab	\N
b235ddd6-bd18-4a17-8c85-0642d5102668	TCT-00073	5b949e7c-29c5-41a2-86b7-04fbbddba14c	Zenaida Dimaculangan	\N	\N	Enforcer Dante	Obstruction	Vehicle causing road obstruction.	2026-07-28 05:45:05.891+00	pending	12.35804180	121.07333222	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b99a562c-5732-495a-99ec-d7f29401cfe6	85c3d0ad-6e28-4f84-ad39-5f00ee8ce84b	\N
156d62af-8b52-4b01-8e24-456130763cbf	TCT-00074	d3d6ab2a-1c78-4422-a2df-9d2aecfa19e4	Cristina Reyes	\N	\N	Enforcer Dante	Reckless Driving	Overspeeding and swerving.	2026-06-26 00:49:33.734+00	resolved	12.35136795	121.06316284	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9081f171-e6da-475d-9d1b-bca239e6c2db	3bdb164e-40b9-4026-b940-ad7480589ebc	\N
85a4ad2f-e287-4df4-aadb-82f7eb7addc8	TCT-00075	9c16e684-3830-4739-bf80-152144d86271	Zenaida Dela Cruz	\N	\N	Enforcer Bert	Reckless Driving	Motorist ran past stop line and ignored enforcer signal.	2026-06-09 04:52:31.256+00	pending	12.35844836	121.07444343	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	525c82d6-b9c7-496c-ad77-eb1f6396f348	dd5d1846-a8bd-4195-a3bb-e2e02b3b312c	\N
f01a37ae-6838-45fd-a764-1db5562c6aaa	TCT-00076	fff4ee4a-23e0-458b-bbb8-b6553dd4c1ea	Roberto Manalo	\N	\N	Enforcer Ricky	Beating Red Light	Traffic light violation observed. No stopping.	2026-07-18 02:11:43.796+00	paid	12.35432922	121.06646352	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	fe3efffe-34c1-480b-a066-bb17d88f27c7	a29bbd08-24c9-4da3-9991-642c10f64494	\N
c9ef5094-d124-4b20-b786-cfedce3b3632	TCT-00077	3df8bfb2-c1db-4cbe-b923-db4a758fc813	Arturo Tiongson	\N	\N	Enforcer Tony	Beating Red Light	Traffic light violation observed. No stopping.	2026-07-07 23:48:12.659+00	pending	12.35021246	121.06494961	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b01b3aa7-af4b-40da-9d5e-fb7c26369de2	d1a2cde7-3c16-43d9-a19e-93fbfb59c7ef	\N
7c3ab2fa-0587-4cf5-a4ae-b6590949bdc3	TCT-00078	b610039e-6255-4651-b02d-297a6cfd512d	Cornelio Dela Cruz	\N	\N	Enforcer Lito	Illegal Parking, Obstruction	Vehicle left unattended in no-parking area.	2026-07-18 10:43:24.626+00	resolved	12.35791321	121.04651987	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	22120505-038f-483a-ace2-b79a490aff2d	c5a59674-c1d3-4a72-ae14-901be3048acf	\N
05584d3a-19fb-400f-bdd9-cc9816c2894e	TCT-00079	83a6148f-c5ed-4a4e-96b2-1634e8dfa2ea	Evelyn Gonzales	\N	\N	Enforcer Bert	Obstruction	Illegal vending blocking traffic flow.	2026-07-12 23:25:23.762+00	pending	12.35890093	121.07396725	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0390049e-4bb0-4f2b-a6e7-c25fab37cbd9	c16f5862-3eac-4979-bf34-30a589a91d1d	\N
9bc6cf6e-195d-4455-89e5-14a62f305601	TCT-00080	237265b0-2698-484b-a54b-9bb61efc7df4	Miguel Panlilio	\N	\N	Enforcer Lito	Obstruction	Vehicle causing road obstruction.	2026-08-18 02:03:29.206+00	dismissed	12.35783666	121.07221185	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d9cad13d-fcee-4dbf-930d-6cb98e698c62	0ca4c154-d0e0-482d-90c5-56c0fa540af1	\N
1b7917c5-9b09-4d74-a98e-e34c0e01e02f	TCT-00081	0e816893-d713-4204-bd6c-8d326f28a2ec	Maria Garcia	\N	\N	Enforcer Marco	No Helmet	Motorist apprehended riding without helmet.	2026-08-23 11:17:23.599+00	dismissed	12.35881109	121.04415416	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	eebb645c-c8ab-45b7-a250-7aaef288eb16	e2e2c68c-75f3-4d04-bf1c-a2f120407db6	\N
7f19eae0-631b-47de-a784-db566cb28639	TCT-00082	d01f3396-1a4b-460f-9bd3-819c1916983c	Alvin Beltran	\N	\N	Enforcer Lito	Beating Red Light	Traffic light violation observed. No stopping.	2026-06-07 01:59:27.606+00	paid	12.35897345	121.07363892	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	ac320948-b16d-4487-85ec-6152e893021d	2832bece-ea89-439d-a168-b2e277622b6b	\N
3928142d-ed50-40dd-bd79-64b7a4dfa8d8	TCT-00083	1ed7e36b-c668-4047-9aaf-79ae93dfebaf	Ana Tinio	\N	\N	Enforcer Bert	No Helmet	No helmet worn. First offense.	2026-06-22 08:53:13.652+00	pending	12.35132992	121.06452015	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	cf571515-2dac-4a47-8f5f-b073fa5fb07f	409ea6ae-5859-41c9-acd5-c2f57cd90771	\N
a72a8524-0328-4679-97c4-3fb9e698fb72	TCT-00084	4a5322e7-2d1f-481b-a777-83203c499b45	Renz Dungca	\N	\N	Enforcer Bert	No License	No valid driver's license presented at checkpoint.	2026-08-03 02:44:03.849+00	pending	12.35747817	121.07374698	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	944b7c0d-f55b-4f18-af59-62b82542b2be	1efce38f-2a3d-44c0-ac15-8409dd786774	\N
f371e3c3-2728-4b46-a194-8a1c07a90717	TCT-00085	4347a433-1ebf-4191-b308-997b9bc519c9	Arturo Mallari	\N	\N	Enforcer Lito	Beating Red Light	Traffic light violation observed. No stopping.	2026-08-25 23:43:39.321+00	disputed	12.35787970	121.04559153	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	46a05452-e385-44ea-9c40-55d34412b4cf	fca5ba5e-2588-4f22-acd1-c4a5709e4c90	\N
94747d69-d5b7-4919-a014-c69558a3716d	TCT-00086	473df490-aa70-4794-98af-2a954ce228b2	Teodoro Silverio	\N	\N	Enforcer Juan	No Helmet	Rider and back rider both without helmets.	2026-06-22 08:53:02.18+00	pending	12.35487269	121.06825147	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f58fba7f-584b-4cb2-be55-3ab7b1ec052a	c1ada38d-a368-4832-8bc6-58fb2cc05d68	\N
5517a8fb-b6ac-4719-9f61-f1a4ad589c24	TCT-00087	70afd47c-87ec-4947-a363-a790737ef5c6	Rodrigo Espiritu	\N	\N	Enforcer Juan	No Helmet	Motorist apprehended riding without helmet.	2026-06-30 22:26:06.048+00	pending	12.35445708	121.06796073	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	168926b4-288e-4e09-b802-9340534b8c4c	1dc86382-9585-4f03-951d-12d86648b307	\N
6b16c603-c35f-436b-a7f9-0ed99ab043a4	TCT-00088	66573242-baa5-4a58-a7ea-6ad2b8f5a377	Marilou Evangelista	\N	\N	Enforcer Ricky	No License	Expired license presented. Treated as no license.	2026-06-16 02:06:45.504+00	pending	12.35783641	121.04408594	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	56649ecb-ddbc-44e4-916c-23e969cb9743	700b2107-eeff-4ff8-8294-1b6d901cbc4f	\N
76c7bf6f-df02-4ba7-99f8-517b27d42be5	TCT-00089	2394bc9b-d313-462a-8491-b46db7c2124d	Rowena Hernandez	\N	\N	Enforcer Marco	Illegal Parking	Obstructing traffic flow due to illegal parking.	2026-06-05 00:48:18.46+00	pending	12.35773079	121.07198608	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	59432ff3-d6fd-4a72-bf6a-1097523ae069	c04f37f0-00c8-4c7d-9314-b66d62ad45c6	\N
ad8d852b-e0c5-4783-9d20-6387a3c9fc16	TCT-00090	c6b6c014-a424-48b8-ae21-551a724d1408	Antonio Cruz	\N	\N	Enforcer Bert	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-08-11 03:44:10.87+00	paid	12.35795901	121.04634671	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	306aadf3-f644-4d38-9eef-beb53f24c5c6	1af3c743-8357-47bb-b0f3-ead8c36bcef4	\N
bdda15f8-d3c7-419a-a295-d5b63255fa06	TCT-00091	2fe507f2-cfa3-41e3-bad6-b1e6bca40abd	Lourdes Aguilar	\N	\N	Enforcer Juan	No Helmet, No License	Habal-habal driver without helmet.	2026-07-10 08:51:04.662+00	pending	12.35853349	121.07255572	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	7e327ae1-7c7a-468c-a2a2-05b44669e5e4	e14e0847-543f-4663-9316-f5ee8012d12b	\N
c98226d9-fab0-487b-bb79-fa40498889b7	TCT-00092	d61eb64f-9450-4dbb-a97f-0aecc7cedb10	Ricardo Reyes	\N	\N	Enforcer Marco	Illegal Parking	Vehicle left unattended in no-parking area.	2026-06-05 01:53:44.31+00	pending	12.35126887	121.06346908	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	5183a062-5572-4ca9-9451-b7c6d2d63271	5686cd60-4e11-412f-8eb1-47a089443ebf	\N
c456f00e-0bde-4c61-a2c1-34abb432725d	TCT-00093	a89d6b79-5e38-40c7-9074-320551bd7f66	Cornelio Lacap	\N	\N	Enforcer Marco	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-07-06 06:30:46.389+00	resolved	12.35691136	121.04654166	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9e133bff-2dda-4c7d-8ebe-fe07e71ea6c2	43df86bf-9d68-415a-8043-71c366f76dbf	\N
42bbb1b6-1a48-4e07-8ce4-7518f96047db	TCT-00094	e3c4505a-0a7f-4878-bc53-fb075cc0bb45	Aldrin Flores	\N	\N	Enforcer Juan	Obstruction	Tricycle loading passengers in the middle of the road.	2026-07-24 00:31:33.468+00	paid	12.35542864	121.06877793	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	71981e20-1129-467e-bd67-92097db6b832	bcab9a8b-d66c-4939-8ed7-7e7e2eb3dcbb	\N
32f35f7d-6ca0-4b88-9f54-9d41051ee7f3	TCT-00095	162011f5-e764-498c-8f68-5e43fe994602	Dennis Dela Cruz	\N	\N	Enforcer Lito	Reckless Driving	Cutting lanes and overtaking unsafely.	2026-07-09 10:47:01.599+00	disputed	12.35747083	121.07306495	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0a1ac932-afd0-4753-a491-ebad1b96f7a4	11c1815a-700d-43f7-8be8-49edfc8fbec1	\N
621644b3-8f84-47b5-8412-095230912cad	TCT-00096	84242360-1f10-4048-ba36-3ef31324576e	Noel Paglinawan	\N	\N	Enforcer Lito	Beating Red Light	Beating red light during peak hours.	2026-07-23 05:09:34.394+00	resolved	12.35620007	121.07206017	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	26cde6bc-f2a3-45dd-97f4-70d509c0b8b9	e014cd6c-f060-4a44-8e30-71ecddd39d39	\N
93adeac0-a210-4cfa-b9b1-9d9f7370e9df	TCT-00097	2e1ef2fe-77de-4e5c-ae86-4d308fb89d7f	Teodoro Mendoza	\N	\N	Enforcer Ricky	Reckless Driving	Motorist ran past stop line and ignored enforcer signal.	2026-06-28 04:46:58.731+00	paid	12.35066974	121.06498975	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	4e087f13-9c48-444e-8936-fbb386502153	3895d7b5-122e-40a0-9a41-2db1c7120580	\N
a8697050-fd8e-43ac-a3c4-8df25d9d5dd5	TCT-00098	ce1c58d5-b817-4630-b8d2-bee0b80239d5	Jocelyn Galang	\N	\N	Enforcer Ricky	Illegal Parking	Obstructing traffic flow due to illegal parking.	2026-08-31 00:16:31.349+00	pending	12.35952841	121.04609755	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	aa43d682-9bbd-4682-9459-7fe095276d29	447b38ea-6a35-4e14-bf0f-fbb555b7dcd0	\N
e844ed8d-76fd-4df8-b2cb-e3a40f675d59	TCT-00099	630265b9-567a-4b86-a4b3-b7ad574a512e	Evelyn Macaraeg	\N	\N	Enforcer Lito	Illegal Parking	Double-parking reported.	2026-08-08 06:42:37.665+00	pending	12.35266711	121.06341700	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9323efb8-6e78-476b-866d-715c7146467d	f10ceaf0-6f81-4b74-a977-4648caf8475f	\N
bdab8798-3c59-46d1-80f0-613d026448a5	TCT-00100	a1f1dded-d092-42a9-a063-0771145934a2	Celestino Pangilinan	\N	\N	Enforcer Dante	Illegal Parking	Obstructing traffic flow due to illegal parking.	2026-08-24 22:17:09.753+00	paid	12.35801589	121.04519134	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	26afed4e-497f-4b97-955c-8a29bd4eafcc	4851db11-793f-40d6-ab62-4871001f6359	\N
ded4ac94-c1de-441a-833a-e6c7ac713259	TCT-00101	f0a9021c-15b0-4bd4-98ed-0047abdb8bd1	Juan dela Cruz	\N	\N	Enforcer Marco	Reckless Driving	Weaving through traffic recklessly.	2026-07-16 03:58:41.127+00	disputed	12.35673276	121.04555012	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	21947dee-53fc-4f32-974a-171588d3131a	0459cf63-1a83-44a2-b2d9-c5fd25547197	\N
efeb4613-8a37-4cba-9dc4-e0b419b353b6	TCT-00102	ed24ed62-02a6-41bd-9d90-b975d2cc4771	Zenaida Cruz	\N	\N	Enforcer Lito	No License	Driver failed to produce license when flagged down.	2026-08-13 01:55:43.788+00	pending	12.35096702	121.06502942	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	087ea099-c932-4961-bb84-cc936b05b38d	5dbe589a-6988-4766-b9b9-1f611b3f1f4b	\N
4843eaa0-a4d9-43b9-b7c8-271032b4366d	TCT-00103	2f314fc0-72fa-4d4e-80ce-b89027b49246	Sherwin Pascual	\N	\N	Enforcer Marco	No License	Student permit only — driving without supervisor.	2026-07-04 07:40:43.378+00	disputed	12.35437329	121.06752494	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b7834d14-c64a-45d6-ab83-1e75161ef8ec	762daf2e-50f3-46a4-8b6f-27d18ff029b5	\N
b6c5ae08-72a7-4bbd-9c91-7276a8c6fbd7	TCT-00104	9152b377-7e31-49c1-8e02-bd550634e1ca	Elena Reyes	\N	\N	Enforcer Ricky	Reckless Driving, No Helmet	Reported near-collision due to reckless driving.	2026-07-21 01:43:38.121+00	pending	12.35286769	121.06729360	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	58586025-7d0f-4eb9-b8ab-494a673a165b	3b8cad3c-3d4c-46d1-adde-a6a2798c5a6c	\N
f4d930f2-7e31-4109-a318-5445ee81febb	TCT-00105	de621475-7705-4b4f-8e38-79ca57912899	Renato Torres	\N	\N	Enforcer Lito	Beating Red Light	Witnessed running red light — no hesitation.	2026-06-14 03:59:59.819+00	pending	12.35875246	121.04591338	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0a7e0078-8008-4dc7-8815-436bd2a97a04	db9df3d3-74cd-4610-8db8-79ee72b4923d	\N
fbbf9458-b6d4-4a07-b1e6-b907796c1743	TCT-00106	f9da1607-ebd7-4799-ac8a-4f63648b4efa	Marvin Evangelista	\N	\N	Enforcer Lito	Illegal Parking	Parked in front of fire hydrant.	2026-08-06 08:25:12.522+00	pending	12.35102562	121.06307685	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	201847d0-a915-49dd-89aa-73b61921523a	9eb2805d-1490-4796-af13-2338aa0ce906	\N
e8122c45-9594-4a6a-bcbd-aaeb32bc046c	TCT-00107	15b10737-4150-4634-a437-fcd1487d84e3	Crisanto Cruz	\N	\N	Enforcer Ricky	Beating Red Light	Beating red light during peak hours.	2026-08-07 22:10:42.219+00	pending	12.35835225	121.07307927	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	ab4e1d5f-c4bf-423a-a1f9-da1c9e1a2a7e	49775f2d-0ace-4607-8659-dcc080efaa0b	\N
cdb6b2ce-61c2-4f8c-9b72-ae6f5a72f37a	TCT-00108	68eccd7d-8198-41a2-8c75-3c2a4435f022	Nestor Macaraeg	\N	\N	Enforcer Ricky	Beating Red Light	Ran red light at intersection.	2026-06-04 05:23:27.737+00	pending	12.35806033	121.07196988	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	3c27b858-1e0a-42db-a9d8-b069014949ea	b39d4ea4-3a83-487d-b801-c7e500fad990	\N
4c6d2dfe-46f0-4c5c-87f6-f4be211e15ae	TCT-00109	c4be30b4-e8c4-4819-899d-7b341ba9a03e	Teresita Policarpio	\N	\N	Enforcer Bert	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-07-27 08:24:14.336+00	pending	12.35848716	121.04518525	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	2d9639db-0c74-4e97-8502-69edfd27fe5b	ddd97b84-fd74-4d88-9050-606017688a70	\N
661b9444-50b0-4ad6-ac87-51b6be1dbe2d	TCT-00110	7ec54295-5a1f-4550-aa26-4f1af8235e5e	Domingo Concepcion	\N	\N	Enforcer Tony	Beating Red Light	Beating red light during peak hours.	2026-06-12 01:52:28.298+00	dismissed	12.35481223	121.06687926	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	efd72e7a-023c-479a-958e-3781054f2500	c15ece0a-bcdf-4823-a70c-1555a926571a	\N
a7ffa88c-66cd-45f5-b7f5-6ce6efd5d97f	TCT-00111	3b5faad6-222f-4030-91da-28cdbc1a5988	Manuel Sison	\N	\N	Enforcer Tony	No Helmet	Rider and back rider both without helmets.	2026-07-06 01:26:36.802+00	dismissed	12.34986912	121.06507793	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	44c9f2d7-5bef-4ea4-ba1f-d1010e41149a	a80712c3-493f-448b-b4f9-3b3b2a4c3220	\N
0e7c7fc1-0965-4f2e-951b-a7d90ff68ab0	TCT-00112	58718a3f-bb2d-4a2a-8043-8e77bb3270f2	Jomar Kabigting	\N	\N	Enforcer Marco	No License	Student permit only — driving without supervisor.	2026-08-16 05:59:06.977+00	dismissed	12.35105287	121.06397222	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f75ad545-c415-46e7-8a28-bcb1a47a17ce	55af6a1f-cf3d-4136-acf6-afa914be677d	\N
3a81ccec-66b0-4f27-9d08-fb367d03beaf	TCT-00113	d8d41761-efac-4599-a273-c744e0f4d422	Crisanto Aquino	\N	\N	Enforcer Ricky	No Helmet	Habal-habal driver without helmet.	2026-08-05 00:19:49.026+00	dismissed	12.35915854	121.04599580	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9fe028cb-1ee7-4fd0-a22f-b7529d7aa70e	8c090e6b-42b1-47c3-9bc4-e70db1cb9337	\N
2b1e29c9-ffc0-40d4-a8e1-8adc71364f58	TCT-00114	034f97b3-2500-4d72-b317-daca10dbd37e	Alejandro Concepcion	\N	\N	Enforcer Lito	Obstruction	Tricycle loading passengers in the middle of the road.	2026-07-09 01:50:58.305+00	resolved	12.35508248	121.06770513	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b445c4db-7b26-425b-9a13-d22d7bcc59c8	a4ac24a1-9646-4d2a-8403-c013a7691f73	\N
8a26087e-5dda-44b8-a436-395f6d4b9b28	TCT-00115	e5ea0b7f-bed1-400a-9ad2-df6cd6c56eee	Kevin Reyes	\N	\N	Enforcer Marco	Reckless Driving	Motorist ran past stop line and ignored enforcer signal.	2026-07-02 09:46:04.615+00	pending	12.35550798	121.06604614	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	dde4da0d-51ed-4167-a73f-b5a93681f764	5e8dcab5-e178-4c63-9393-cefb2f380071	\N
202751a6-d326-44e8-864e-5ff92eee2655	TCT-00116	9cfd1d74-3623-40ca-b461-7eda0e04f66b	Marilyn Salazar	\N	\N	Enforcer Dante	No License	Student permit only — driving without supervisor.	2026-08-04 02:48:29.383+00	dismissed	12.35343166	121.06871147	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	6713c09a-4d9d-48e0-9512-4de5f1db5624	df330b0b-4596-46d1-b9d7-41c2bd1fc8e2	\N
239b1aab-48e7-4c59-8fc4-b3e4b97b1b3c	TCT-00117	c7d717bd-86b4-4338-8878-0af2fb9911ba	Ramon Gutierrez	\N	\N	Enforcer Marco	No License, Beating Red Light	No valid driver's license presented at checkpoint.	2026-08-24 23:16:04.278+00	pending	12.35195862	121.06504624	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	48eb6480-8975-4292-a1a9-958b1d6b131a	d38ebb67-f5e2-42d3-a799-a6d35567b287	\N
fe076f03-09eb-40de-9959-5f53e3474418	TCT-00118	3dc9b132-75ea-4263-b3c3-747e0c2e0cb4	Teodoro Villanueva	\N	\N	Enforcer Tony	Beating Red Light	Traffic light violation observed. No stopping.	2026-06-17 08:00:06.659+00	pending	12.35218867	121.06357405	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d463095d-c071-4f52-90b1-25eb66a2ce8d	61e41265-b539-4a74-a6ed-bdd564d8e29f	\N
0b07738e-3b15-4244-878c-6bb31a677b44	TCT-00119	0a99eead-42a7-4a81-b89f-cc2882de8e42	Antonio Castillo	\N	\N	Enforcer Ricky	Reckless Driving	Motorist ran past stop line and ignored enforcer signal.	2026-07-06 01:31:46.738+00	dismissed	12.35250725	121.06351321	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	44eb3fc6-b756-4c90-8f65-3717cf22fd49	97348fbd-5307-40df-9be4-8032c536a96c	\N
da7bb35d-6480-481d-908d-c89beff77ceb	TCT-00120	0298c64b-718d-4a2e-b3f9-48f4f0d7e523	Cristina Mallari	\N	\N	Enforcer Juan	No Helmet	Rider and back rider both without helmets.	2026-07-13 05:45:39.83+00	pending	12.35409016	121.06661908	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	79ec72ea-6145-487b-a32c-715a52208fae	4e80925a-2811-4e1f-9f5a-fe317b3471ec	\N
59c69c71-0285-473c-b2a3-9190a9210cd0	TCT-00121	49b52119-5b5b-452d-b295-8395d6803a7a	Zenaida Concepcion	\N	\N	Enforcer Dante	Illegal Parking	Vehicle parked on no-parking zone.	2026-07-11 05:31:49.428+00	pending	12.35258532	121.06646817	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	7114444c-d9c0-4b23-bfcb-5569dd0a276a	4482ca6c-b226-4b2b-9f60-290104be90f3	\N
1f34ad8e-ca2e-4e5d-aedb-e36b59d537a2	TCT-00122	5b1d79d9-f870-4172-81c2-e152b15daec0	Nestor Soriano	\N	\N	Enforcer Juan	No Helmet	Rider and back rider both without helmets.	2026-07-30 01:03:37.154+00	pending	12.35249111	121.06417768	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	4021bc54-e978-443f-a709-c119379970f8	aa8c114f-37db-4c78-87db-faf74f3a173b	\N
4ac9766f-85cf-4c13-94db-9e83d5057a06	TCT-00123	14f3ab52-3fcb-4011-a488-289a87ade001	Domingo Mateo	\N	\N	Enforcer Marco	Reckless Driving	Cutting lanes and overtaking unsafely.	2026-08-07 23:53:33.193+00	dismissed	12.35701980	121.04540213	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	83881dc3-16c7-4ca2-9642-d98c29974a5c	8adcb89d-0fa3-4f13-9991-07676b1c1a40	\N
23bca877-c175-4c4c-9b8a-dee92d8dfe5e	TCT-00124	619b19c0-53ab-4500-8ae2-5ff428b32e10	Marilyn Castillo	\N	\N	Enforcer Ricky	No License	Expired license presented. Treated as no license.	2026-08-05 08:21:45.28+00	pending	12.35369178	121.06638478	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	32ae7968-06b8-42b4-8607-a4a6ff4456d6	1b187e35-4b8b-4129-b95a-039b5d2f4ae3	\N
cc83e44d-59e2-4b9a-918d-864dbdd5b01f	TCT-00125	32f32fa7-727a-40a9-9448-75d402f8e22b	Ryan Beltran	\N	\N	Enforcer Dante	Obstruction	Vehicle causing road obstruction.	2026-08-12 01:45:11.222+00	disputed	12.35221638	121.06443556	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	c973f9c9-1217-4381-b324-e39fd1aa1500	4ed6793d-f530-4b97-bc82-e0f7b69ccf66	\N
03ded224-044c-40a8-a6a0-6666eb80fef3	TCT-00126	7bdaf57e-fd59-4c95-8411-9a9eff52f7fd	Jose Garcia	\N	\N	Enforcer Bert	No License	Driver failed to produce license when flagged down.	2026-07-04 00:36:27.786+00	disputed	12.35761095	121.07258574	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	e3493063-5f70-4626-9c11-9ce9895e52b4	a8f98aa8-d562-4b34-b420-7fe4de99fc21	\N
3014fe65-a9f7-48cd-955d-143ee4e1ba82	TCT-00127	ada3db76-da39-4048-aff2-8d96a5ca43c4	Nestor Evangelista	\N	\N	Enforcer Tony	Illegal Parking	Obstructing traffic flow due to illegal parking.	2026-07-06 04:34:14.355+00	pending	12.35755079	121.04650280	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	bd78bac4-dca4-4c27-a6cb-75d2e84fe8f4	289ce00a-2979-49e5-b0ff-a5e30b11932c	\N
297c8ba6-ee52-4465-96eb-583cbe7ccca9	TCT-00128	8c4f0f29-70da-40b3-8272-02664bd61f4d	Ligaya Concepcion	\N	\N	Enforcer Dante	Obstruction	Illegal vending blocking traffic flow.	2026-06-08 09:30:13.87+00	pending	12.35040310	121.06464708	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	181272ff-cd18-42cf-b8c4-4b4ed8a8ec88	ecd8d656-41de-41c2-8806-98c2c87dba20	\N
bd458dab-fb4b-4511-bd56-a766098b7dd0	TCT-00129	2c26c6c6-5fa9-499e-ba1f-6a10b9d7ce9f	Gemma Sison	\N	\N	Enforcer Tony	Obstruction	Illegal vending blocking traffic flow.	2026-06-09 00:41:15.456+00	pending	12.35328661	121.06645972	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	54aa04a4-1ad3-4111-a5a3-9bd588a589a1	71c4ccf1-5a74-40ee-b46c-bf029b09094c	\N
6d9ddbf2-2cdd-4a9e-8b27-838c7635f034	TCT-00130	805e53e5-03ab-4481-ae60-c2cb3b092097	Leandro Salazar	\N	\N	Enforcer Tony	No License, Beating Red Light	Expired license presented. Treated as no license.	2026-08-16 01:18:59.813+00	dismissed	12.35369607	121.06657893	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	28703458-33ba-4663-9916-c0b736c8a8c1	7881c632-2adf-453c-af11-b0df3740dc9a	\N
0d52fa1c-5bcc-4a23-bb70-e68f2eb3e1ed	TCT-00131	420c3303-c4dc-4bae-9712-7d8f5f43a24c	Jerick Gutierrez	\N	\N	Enforcer Tony	Reckless Driving	Overspeeding and swerving.	2026-08-17 03:43:26.755+00	paid	12.35153340	121.06533465	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	7022aaba-19ec-43e0-aefa-031c127d54d3	e9d81f85-6cc3-40fe-8f9f-d70617cb9315	\N
ee0319b7-353f-4096-a648-71242da2ee4b	TCT-00132	67ffa600-4885-42c0-b2e9-606c31860045	Remedios Lacap	\N	\N	Enforcer Tony	No Helmet	Habal-habal driver without helmet.	2026-06-04 00:54:35.48+00	pending	12.35025494	121.06301848	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	273813b7-56d0-446b-baf1-f4cbe392e191	32df1010-92ea-4edb-bb43-4a572fe61ed0	\N
72cfde11-e3db-4cbd-94a3-69f0ea5cd76c	TCT-00133	4403c4c2-a532-47f0-a4cf-8811207ffb15	Marilyn Bautista	\N	\N	Enforcer Dante	No License	Driving without license after prior confiscation.	2026-07-09 05:05:53.982+00	disputed	12.35755392	121.04402767	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	4725f4e4-a754-4ec8-800d-dbb02dca4191	11f8d6a0-aea0-4aaa-a2ae-d0447a70781f	\N
03e8da09-a12b-4e3a-b8dc-ab310c823072	TCT-00134	cdd7bb9b-b808-44de-860d-4cc30d90ec02	Alvin Tolentino	\N	\N	Enforcer Dante	No Helmet	Motorist apprehended riding without helmet.	2026-07-26 04:44:00.213+00	resolved	12.35352373	121.06790044	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	cf09a3a5-6841-4af6-953c-cfa80031e971	fb6f52f4-b302-4d1d-85e7-ddc8a76d5fc8	\N
86329a07-8012-4f2c-816a-05217c02a21a	TCT-00135	7bf630c5-3e7e-4d48-b108-45c0cda8ea2d	Armando Hernandez	\N	\N	Enforcer Marco	No License	Driving without license after prior confiscation.	2026-06-11 11:07:29.82+00	dismissed	12.35905936	121.04600099	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	496cbc6f-a3b6-4c24-a5d8-948a544e4375	e71aea92-5f4d-40b7-988d-b7995e8a9e6d	\N
64cbaa2f-5736-4c02-bdc2-a2c6ebf20f0e	TCT-00136	8b174fa4-27f4-4603-b20c-e06f7924fafd	Noel Cruz	\N	\N	Enforcer Juan	No License	No valid driver's license presented at checkpoint.	2026-07-06 22:22:44.277+00	disputed	12.35419432	121.06787850	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	ff76dfd4-a392-467d-b476-9304e92ae675	d61c963a-602f-452a-97fa-d5e1a2aebcf7	\N
909f7f68-bc56-40ea-aae1-634b93e02920	TCT-00137	0c42f433-93bd-4c73-baaa-38f9d3b2b4d0	Rowena Reyes	\N	\N	Enforcer Dante	Beating Red Light	Ran red light at intersection.	2026-06-23 11:45:05.243+00	pending	12.35296871	121.06781624	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f22785bc-ad50-4121-8e3e-258b3265f771	892fd755-8b54-43d3-8c54-c70c0cb822c4	\N
8953f723-2639-4180-a187-8432e8218003	TCT-00138	b7b63054-352e-4b42-b8a3-399a0e48fd81	Arjay Evangelista	\N	\N	Enforcer Dante	Obstruction	Illegal vending blocking traffic flow.	2026-07-10 07:10:15.382+00	pending	12.35600937	121.07407816	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	383eb6ce-52d1-43ec-9b56-61ba58f89288	fc537845-07f3-4300-8c92-c8b181a8968a	\N
b45fec40-d62f-460b-b9d9-5080f708a0d6	TCT-00139	431173a5-7480-4785-a766-ca586ae785ff	Leonora Navarro	\N	\N	Enforcer Dante	Beating Red Light	Motorist ignored red signal.	2026-08-12 05:56:00.822+00	resolved	12.35308328	121.06832232	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	23573016-77c9-4a96-b651-a5c303e99793	6970e5cb-bead-4e64-99e5-0bd77acfbc7b	\N
7df7104c-ca9f-4688-881f-e949f3c938f0	TCT-00140	fbf18ff6-e5db-498f-8c24-6cbbbaf1dffd	Danilo Yumul	\N	\N	Enforcer Lito	No Helmet	Motorist apprehended riding without helmet.	2026-08-13 00:27:24.752+00	pending	12.35238963	121.06549825	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	cb297af8-6a24-49ca-8860-387df6b0e123	0be476b7-ef76-441c-a51c-a97de22982a1	\N
427d27fd-3a25-472f-87e0-cd821afe9239	TCT-00141	a419550d-eefb-48ce-9af8-11d66a0b07c5	Manuel Dungca	\N	\N	Enforcer Juan	Reckless Driving	Overspeeding and swerving.	2026-06-14 23:32:32.652+00	resolved	12.35769834	121.07388787	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f364bf7a-dedd-4283-90ed-c10d5620cf08	40a46413-a84c-4ea2-8b14-3ac83dca58c6	\N
6871ce90-8191-4f4c-97f2-674bb85f92e5	TCT-00143	b2f98389-b602-4616-9e5d-97ebf786b6b5	Corazon Dela Torre	\N	\N	Enforcer Bert	No License, Beating Red Light	Expired license presented. Treated as no license.	2026-07-29 08:32:38.438+00	pending	12.35281309	121.06456971	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b5cb84a0-a694-4a41-a704-d0b83a52c5a7	09af6e5e-8aab-4c59-a324-0cd5921d3848	\N
152765af-2285-4dda-9bca-987a79d271eb	TCT-00144	1ce317a7-955b-4571-bc8f-57b9dfda6752	Fernando Lingad	\N	\N	Enforcer Juan	Illegal Parking	Double-parking reported.	2026-07-11 04:23:30.207+00	dismissed	12.35702159	121.04442670	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	af1e0d23-278d-4686-8e6d-ebfc0e5cbcab	a09f4e33-48a4-4ed3-b1c2-c45c5002392d	\N
3c270104-7144-4f32-bc54-8dbeb462eb1f	TCT-00145	a22b28db-816b-4861-a8f1-229d23b05e45	Miguel Dela Cruz	\N	\N	Enforcer Juan	No License	Student permit only — driving without supervisor.	2026-07-14 04:06:28.622+00	resolved	12.35112067	121.06311553	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	871fbaa9-84a5-43c1-9056-d29ac4b8a203	5b4ea0da-6f13-4c9d-831c-21547d64bb83	\N
074d070d-6954-41ff-929b-caceac988c19	TCT-00146	edd425a4-b33e-4ded-8bc1-8fb4677886eb	Antonio Tayag	\N	\N	Enforcer Tony	Beating Red Light	Motorist ignored red signal.	2026-07-09 08:38:29.864+00	pending	12.35739246	121.07364997	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	53956791-cda1-40f5-bb6a-354a73a1a0c0	1fb4af36-1a21-4408-99b5-2cc0a3d281a9	\N
beae18dd-527c-4a0b-83cd-944bdd676302	TCT-00147	d5d7cf0e-ee4e-42f8-be27-9c31ea95c169	Carlos Bagamasbad	\N	\N	Enforcer Tony	Beating Red Light	Traffic light violation observed. No stopping.	2026-06-16 23:56:10.304+00	pending	12.35860995	121.07214088	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	a7b13b77-0c53-43ea-a7c1-dfa8a450aeb5	cd553b62-890c-4f7c-9e9f-ee2354e85d51	\N
08575945-42d5-4607-aa77-098d5d05e387	TCT-00148	f9ee1cd2-0bd7-4101-b390-ab43330e7982	Pedro Lacap	\N	\N	Enforcer Marco	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-08-03 06:08:08.906+00	pending	12.35856353	121.04459454	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9867c685-8f2c-4724-9347-9fde996dc79f	f64e22d8-b94c-420a-ac08-815faedf9d34	\N
ad77338c-8d50-481a-b58f-ffc9bdb5bd87	TCT-00149	dc8178ff-234f-43bb-9cf6-b7e0906b22bd	Corazon Reyes	\N	\N	Enforcer Marco	Beating Red Light	Ran red light at intersection.	2026-06-27 00:47:41.908+00	disputed	12.35492099	121.06718824	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	a181bd88-9471-4e7a-aa49-a08d469731ad	f0bc2d3b-ca28-4229-a753-7e62dedd3ae7	\N
6086fe14-99df-4589-9927-29f152177c68	TCT-00150	76ea0b7a-f943-4bf1-a632-d2c52cded37b	Mariano Torres	\N	\N	Enforcer Lito	No License	Driving without license after prior confiscation.	2026-06-10 06:42:59.328+00	dismissed	12.35637361	121.07347857	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	5e95f1b4-3077-4a97-ab78-71fd1cbc1272	08d0aa07-c7bf-46b0-b5d9-1db8b4b4b188	\N
29dfe3da-d23c-41a4-817e-6575ccd59995	TCT-00151	c6f42100-68f3-4733-8097-2ada11459c24	Jose Garcia	\N	\N	Enforcer Dante	Beating Red Light	Ran red light at intersection.	2026-07-29 03:02:45.615+00	pending	12.35823972	121.04516455	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	627377d6-892b-4721-a4db-150bf42bd04d	0a17523f-a3c8-4274-8d74-5c9ebd03c4a4	\N
3785dd03-3081-4e28-8ec2-61002d60f470	TCT-00152	54170f12-8460-4b66-b495-6c125ef235e5	Rosa Dela Cruz	\N	\N	Enforcer Marco	Obstruction	Illegal vending blocking traffic flow.	2026-06-09 05:13:11.463+00	pending	12.35504075	121.06704758	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	661e1ad3-c3ba-4860-9e33-77a35bb93f22	27fc4a4b-32e7-4ad9-8aa1-fda12d6ada2b	\N
2efe6800-4a4a-499c-b8ca-0c022b8d4d7f	TCT-00153	858cdeee-fb9d-4813-9022-bc736428e1a5	Teresita Lingad	\N	\N	Enforcer Ricky	No Helmet	No helmet worn. First offense.	2026-08-22 09:11:31.594+00	disputed	12.35229521	121.06332323	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	1f93860b-ec50-4f1a-973e-6efffd52c279	e2742d04-7aa1-41e0-beb0-daf8f4772471	\N
d47c108b-a4e9-4183-8c9a-4e63e45c4c6a	TCT-00154	b69e33bd-7721-4c5a-9cb5-d1ef706078e7	Domingo Bautista	\N	\N	Enforcer Juan	Illegal Parking	Double-parking reported.	2026-08-18 10:01:14.128+00	resolved	12.35458010	121.06654247	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	fb273c69-e828-4d13-a26f-9c395da2fa47	ed858707-5d3d-45e0-86d4-8ad7ff9fb623	\N
164b1ada-620d-4583-b39e-96a66c9ea50a	TCT-00155	8cff5cf1-19e5-46d8-899d-c40f15f2649e	Rodrigo Galang	\N	\N	Enforcer Lito	Beating Red Light	Traffic light violation observed. No stopping.	2026-07-24 05:10:51.196+00	dismissed	12.35270304	121.06865355	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d59effbd-9cc0-4902-bf66-1512956f03be	516a3211-83b7-4bd4-8093-45024048798f	\N
54e7fe51-cef5-4f99-a8c9-09517651d627	TCT-00156	acd3a0ff-e58d-4395-aaeb-6ddf06ee9c64	Renz Pascual	\N	\N	Enforcer Dante	Reckless Driving, No Helmet	Cutting lanes and overtaking unsafely.	2026-07-07 04:01:40.935+00	pending	12.35917486	121.04431678	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0a942c4f-34b1-42bf-86b9-1001c7452452	589d72d9-6e19-4896-a6a4-e23f9902a8ab	\N
8d2b2187-6b93-4191-9b1a-d610a26a5300	TCT-00157	746267ac-e826-45bf-b7f3-254eae1344cf	Ricardo Dungca	\N	\N	Enforcer Marco	Illegal Parking	Vehicle left unattended in no-parking area.	2026-06-22 02:29:11.933+00	dismissed	12.35493349	121.06614748	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	be090f1d-5d85-4609-bf5c-d0acaa95cee9	366c42b9-67c2-4422-9732-e99ba651032d	\N
7ae288ec-117d-46b8-8e86-9817fe8123fd	TCT-00158	fa97d9d1-01aa-4f5a-99b9-76a5a2f67d9e	Marilou Malit	\N	\N	Enforcer Bert	Obstruction	Tricycle loading passengers in the middle of the road.	2026-07-20 09:52:02.181+00	resolved	12.35342967	121.06751064	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	a3afa83b-1bde-4d15-8c07-e9b6eb89cf30	f0eae382-602c-431a-a637-e332953779f3	\N
a62c1743-5b24-44fd-ba25-330730760ac1	TCT-00159	32d78afe-602a-4fca-9a71-16387fbb73f3	Nestor Lingad	\N	\N	Enforcer Juan	Reckless Driving	Weaving through traffic recklessly.	2026-07-07 22:54:22.552+00	dismissed	12.35853409	121.04574700	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	81243353-c298-46a8-aa6f-b1f7eaeea2d8	e2ae36c8-d589-4a63-b077-d50fda1ee9f9	\N
1558c96d-f9ed-4bc1-880b-1376ff5adcf0	TCT-00160	3595679c-8c99-4134-9a76-4b2b5df773c4	Renato Aquino	\N	\N	Enforcer Bert	Illegal Parking	Vehicle left unattended in no-parking area.	2026-07-26 01:17:24.829+00	pending	12.35535865	121.06824188	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	260896fe-d5a2-4f3a-b678-978f06ab7b10	60fd185c-55e9-403c-b9ed-8a7a3bdb4c1c	\N
0fa20bc5-9b75-40b1-9653-dccc5821e2c9	TCT-00161	7df36bfa-474e-4f93-acee-9cd4452da688	Eugenio Cruz	\N	\N	Enforcer Bert	Illegal Parking	Double-parking reported.	2026-07-05 07:34:27.371+00	pending	12.35268347	121.06445624	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	8a4c8471-dd13-451c-a5ed-90c245b6eb50	86c40a1c-48e4-4244-ac76-472045e3c454	\N
0dee7f4f-c43d-484f-993b-786854dccbb0	TCT-00162	0f1028a7-2f5a-44d3-b808-663d5d0681e5	Arjay Tiongson	\N	\N	Enforcer Bert	Reckless Driving	Motorist ran past stop line and ignored enforcer signal.	2026-06-05 05:15:13.81+00	pending	12.35787183	121.07172275	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	4814975b-74fb-4f9d-ad75-42351ea218e2	65773351-2715-49ea-a510-bcefc9ab4ceb	\N
95966cd8-064f-47c4-99cb-0595c2d1c207	TCT-00163	f555659a-5c97-487d-a767-2c1a2d1a071c	Arturo Lingad	\N	\N	Enforcer Juan	Reckless Driving	Overspeeding and swerving.	2026-06-21 09:07:44.35+00	pending	12.35859545	121.07239872	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	38be6cf4-fd60-4368-8fdc-7e983c3df1ef	31920629-ab31-4862-81fc-70ced1ce3a39	\N
7fd48533-9061-4060-9027-7e50b1e1b1f4	TCT-00164	50821931-bfbe-4e1b-831f-5c2275c9c88e	Evelyn Concepcion	\N	\N	Enforcer Ricky	Reckless Driving	Overspeeding and swerving.	2026-08-12 01:32:37.839+00	paid	12.35114110	121.06356757	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	97048ad3-1029-4e34-81b5-11c6c8e4a575	5032d873-63ee-4a3b-8721-1c1cf4002102	\N
3563d595-330d-42a3-b485-0e2b67e45720	TCT-00165	aad456e9-b016-428b-87e4-63ef565f89cf	Roberto Salazar	\N	\N	Enforcer Dante	No License	Expired license presented. Treated as no license.	2026-08-21 07:06:48.124+00	pending	12.35101645	121.06349115	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d76730f9-2b52-4954-a4ab-e3ceae432b77	830a5115-a072-4f92-bd23-1af3dda24095	\N
edb91c6a-841d-480c-b671-5e49cbe7e5d6	TCT-00166	4dcbd343-8b66-4885-8d98-71ade17c9696	Rodel Bautista	\N	\N	Enforcer Lito	Obstruction	Vehicle causing road obstruction.	2026-07-03 09:09:57.492+00	pending	12.35266624	121.06817444	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	bac33499-8887-42bd-8cc0-56f95f392603	85f76ba6-6cdc-4526-a8ac-025be1f347ef	\N
89495eaf-8a29-4ad0-a828-19ff9544d812	TCT-00167	aa9f2fc8-29d5-4273-94d9-3d6eefd71c5a	Crisanto Silverio	\N	\N	Enforcer Dante	No Helmet	Habal-habal driver without helmet.	2026-07-27 02:08:20.829+00	pending	12.35870009	121.04481781	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9fff2560-5ab0-4d9b-8746-297f527b8660	5171bc72-baa0-409e-9ccc-c96949215a17	\N
b4e49ae1-7a50-45f9-9a4a-459830aa0fa6	TCT-00168	5f4b867f-d67e-4a33-a45b-84e0c7a49175	Rodrigo Dimaculangan	\N	\N	Enforcer Juan	Beating Red Light	Beating red light during peak hours.	2026-07-14 09:05:33.227+00	pending	12.35615309	121.07179165	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0c0ff363-8148-4403-bf43-10f7176082a5	f53aef18-c42c-46dd-a219-fc555d699245	\N
2f76f443-c311-4ca1-af68-1929ec4ca42b	TCT-00169	231b98bd-6bb9-4a75-8f1f-83e61e7d2abe	Alvin Pascual	\N	\N	Enforcer Juan	Illegal Parking, Obstruction	Parked in front of fire hydrant.	2026-07-22 01:42:27.743+00	pending	12.35538578	121.06726013	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	09001a90-06f2-406c-babc-9d5a94af4df5	4742d27d-9c20-4f4d-a86d-6b3367998424	\N
4d46ae58-857b-4620-80d7-081097ae5f0c	TCT-00170	da1e7db5-92bd-40ea-9e9e-42803dfcea06	Florentino Gutierrez	\N	\N	Enforcer Juan	Obstruction	Tricycle loading passengers in the middle of the road.	2026-08-09 07:18:15.017+00	pending	12.35301307	121.06775886	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	45d6be5a-6108-428b-af0d-7bd5b9dd56d2	e8f8b7cd-66ef-4ee2-86f2-53a7a796a97d	\N
279e2a41-2a16-4f7f-bae0-713ded8da78d	TCT-00171	3c80506b-d3e0-43c4-bb3c-8e0534dd28b0	Teresita Silverio	\N	\N	Enforcer Juan	No Helmet	Motorist apprehended riding without helmet.	2026-07-20 01:10:15.687+00	pending	12.35724447	121.07380116	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	968856ec-8320-40ec-8e3d-1270cb926cb0	6a85b2a6-8ac4-42bb-b186-ea74ab655c37	\N
19f0590c-d30c-4cb1-8739-c4c89613fc82	TCT-00172	564f6a27-f0d6-4d9d-bbc9-5079dd5f04fb	Alvin Soriano	\N	\N	Enforcer Tony	Beating Red Light	Motorist ignored red signal.	2026-07-31 08:34:55.866+00	pending	12.35838545	121.07308627	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	82e4addb-d8ab-44b3-b7f8-7e44cc6746ea	d4aeed3c-2c2b-4d9c-8593-1567df621c1d	\N
82956ddf-5cc9-4390-9076-7ee91404c43d	TCT-00173	a9f433a9-d1e8-46d1-b377-7ca6d4e9a4be	Alfredo Aquino	\N	\N	Enforcer Bert	No Helmet	Habal-habal driver without helmet.	2026-06-09 02:34:33.888+00	paid	12.35763569	121.07420002	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	1d5552bf-8a59-4316-9816-f6e5ba402c92	88c34fa0-932f-4533-af01-d0ef00980e2d	\N
b313550a-b643-4ced-b747-8b294860bad5	TCT-00174	ecac3bd8-6a5b-4d3b-807f-408cf86ccfef	Renato Buenaventura	\N	\N	Enforcer Lito	Reckless Driving	Overspeeding and swerving.	2026-06-20 22:01:09.526+00	disputed	12.35799702	121.04530876	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	a415f944-f584-4fea-b8c9-78aaea6a5f47	1fd183ac-2187-4eab-a7bf-11b65eb9bb31	\N
1a9e08e8-0e8d-4636-bacb-e1476a31f3d3	TCT-00175	7461976b-fefe-48c6-bf47-424da7174c1e	Marvin Magpantay	\N	\N	Enforcer Dante	Obstruction	Illegal vending blocking traffic flow.	2026-07-06 11:44:08.595+00	dismissed	12.35829571	121.07155592	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	bf9b6c53-bf46-4b0d-a68d-782ec78a80cd	dc91e8b7-9cb1-47a6-8328-e97538197704	\N
ff511028-917a-4369-b21a-37f673f0522b	TCT-00176	d84333c0-1855-4d14-baf7-f7c2026dac8a	Jose Garcia	\N	\N	Enforcer Lito	No Helmet	Rider and back rider both without helmets.	2026-06-10 05:00:01.353+00	paid	12.35647212	121.07293145	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9f67a256-d591-42fc-a2aa-05dd2067bc16	a02a3da8-2751-4f8c-acee-c8e7803904bd	\N
53a71329-bd64-4ad8-a735-e8f38eb5721d	TCT-00177	a797555d-a6fe-4469-9aca-c66c4e082b1c	Alfredo Silverio	\N	\N	Enforcer Bert	Illegal Parking	Vehicle left unattended in no-parking area.	2026-06-09 23:21:49.133+00	pending	12.35753709	121.04525301	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	4ff2f395-e5fc-44a0-9a83-8015865307e4	64eef91d-3c8b-456c-ba73-f1786e4e1ffb	\N
0a9f9a1a-65fa-4530-a334-3584864b31c8	TCT-00178	2d781aef-f08b-4645-b90d-7d2f991c3e66	Renz Mandap	\N	\N	Enforcer Bert	Obstruction	Motorcycle parked on sidewalk causing pedestrian obstruction.	2026-07-25 11:26:33.57+00	pending	12.35860060	121.04503211	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	f707cc74-2df0-47ab-ba91-6d600325d850	5e30795c-5271-413c-9279-898c74bdd426	\N
edd3ff47-1f17-486a-8dbc-992a829fa726	TCT-00179	78edda7b-f52b-4f93-8701-9f52a8e37eac	Alfredo Tiongson	\N	\N	Enforcer Tony	Reckless Driving	Reported near-collision due to reckless driving.	2026-08-28 03:28:45.161+00	resolved	12.35117873	121.06331432	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	aa9ecc67-2e39-464a-b945-351bb0c0c64a	ed8a1e32-0dd9-4332-8b5d-5499bfa6e57a	\N
1e7db24f-fff3-4023-b1c5-ea1eb6a06b1a	TCT-00180	28c3f064-9465-4472-9924-f42adc9e0d1e	Leonora Dimaculangan	\N	\N	Enforcer Lito	Beating Red Light	Witnessed running red light — no hesitation.	2026-06-17 03:08:15.582+00	disputed	12.35519786	121.06845116	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	7699be7f-0ee2-4b1e-9e6a-04b6675ef321	a542972a-b50a-486b-8ac7-cc7a22c80cd8	\N
1876608b-1421-48dd-9f87-04c2696f2aac	TCT-00181	a140f98b-0ce6-4f55-9d5a-83c38f6eb986	Renz Dela Torre	\N	\N	Enforcer Lito	Reckless Driving	Cutting lanes and overtaking unsafely.	2026-08-23 04:17:46.564+00	pending	12.35188105	121.06350465	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	acc8b837-fe49-42e2-ad0e-56e364aab490	d9116d14-2510-4fbe-a635-8915b94d4348	\N
64008566-9273-4b75-892e-4406420c5bdd	TCT-00182	c26e2535-099b-4926-88c3-34c816e666c8	Leonora Aquino	\N	\N	Enforcer Juan	No Helmet, No License	Motorist apprehended riding without helmet.	2026-08-22 10:23:41.372+00	dismissed	12.35078142	121.06492206	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	129adcbc-7570-4b45-ba2c-a538ad130644	f431af64-711b-4b12-ab61-2efbb3bd3385	\N
e0dc9732-08ad-4509-8bb5-865bc22408df	TCT-00183	4eb9b3f0-7c89-456c-9264-af388ffb6beb	Simplicio Bagamasbad	\N	\N	Enforcer Bert	No Helmet	Motorist apprehended riding without helmet.	2026-07-17 23:28:49.027+00	paid	12.35859943	121.07181561	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	11f05bc8-e9cb-4a62-ac74-fb86cc3109e5	77de1370-ef7c-4bf9-bd44-da49040827f5	\N
cd6c97ca-f836-44aa-a0ea-50612179aafe	TCT-00184	78325bf5-8fe9-4902-9b3b-9bd474e9d9ba	Rolando Reyes	\N	\N	Enforcer Ricky	Obstruction	Illegal vending blocking traffic flow.	2026-05-31 23:07:56.009+00	paid	12.35346178	121.06760583	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	1868a7cc-a4d4-4924-87a2-7dbc3916881a	20873d03-5c19-4d42-8403-fa342ddb5110	\N
11f45670-68d5-466b-9be4-b8ecb9753a96	TCT-00185	8cfe8b13-486b-4d68-90a8-7dd291f4b30b	Ramon Sison	\N	\N	Enforcer Dante	Illegal Parking	Double-parking reported.	2026-06-15 02:22:27.112+00	pending	12.35276380	121.06565930	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d31bc104-797b-4a5b-8afb-8b450051fe65	cf483a16-728b-487f-978b-db10b90be2b1	\N
bb158f44-806d-4b4c-bb02-338e225beb9d	TCT-00186	a7275160-cc20-45da-a612-cb792fc49efc	Teresita Tolentino	\N	\N	Enforcer Ricky	Beating Red Light	Witnessed running red light — no hesitation.	2026-06-18 10:37:56.327+00	pending	12.35322105	121.06619887	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0490ccab-d976-407a-a473-d288176f7499	10731967-12c6-4336-a5af-f30b54d224df	\N
17ea56d0-0ec5-4740-96b5-19987bf0c842	TCT-00187	b5b1b0dc-3835-4df2-87b2-739cd250f52c	Roberto Soriano	\N	\N	Enforcer Tony	Illegal Parking	Double-parking reported.	2026-06-25 02:32:38.813+00	pending	12.35696085	121.04616224	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	d5af8e74-835d-4d27-9a4e-b11983d182e2	808e4bca-d70b-433a-9882-93776f61b2d7	\N
d90f31d7-b196-4a7d-b3cf-3c05c3908b77	TCT-00188	a47a9568-482d-477f-b702-dc3d729eb1fa	Jerick Silverio	\N	\N	Enforcer Dante	Obstruction	Illegal vending blocking traffic flow.	2026-06-09 01:30:44.86+00	pending	12.35779973	121.04581641	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b9665e1e-039b-4d9c-9dfa-aa804f79e68d	4c24c0e5-54cf-49b5-83eb-17ff86e94aac	\N
49087bea-7f25-4e0a-a69d-14be6af7dec2	TCT-00189	7173938f-fe20-4066-ad04-e550138f8ea2	Evelyn Ramos	\N	\N	Enforcer Dante	Illegal Parking	Vehicle parked on no-parking zone.	2026-06-21 06:05:49.263+00	pending	12.35376239	121.06658907	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	149812fa-0092-4b8c-9cc5-1642b2b2ef71	fea4a0f7-74ee-4630-af50-170996402da1	\N
6a3c8c89-e38b-42d4-a9d6-c760315774e4	TCT-00190	9bd4316c-994e-4ea4-8175-aedadeecf05e	Alejandro Dela Torre	\N	\N	Enforcer Ricky	No License	Driver failed to produce license when flagged down.	2026-07-29 02:17:56.234+00	resolved	12.35462464	121.06886355	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	e1204720-48f7-4d65-9e56-dbd4e2837bb1	e84ae14e-b660-4ba0-9876-11f0f151f046	\N
09f66c7e-2f24-434d-8436-2d1f0d61f913	TCT-00191	8d9c5338-faaa-46c8-b53a-2cacd35e10c7	Mark Salazar	\N	\N	Enforcer Dante	No Helmet	No helmet worn. First offense.	2026-08-11 08:29:43.052+00	pending	12.35833120	121.04528960	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9990d84a-4a49-4acb-8206-0eb01f91bdac	82b1c067-b332-4bd1-bec5-403d6fd95a92	\N
63d9d9f7-141e-4867-b967-f62533fdd859	TCT-00192	404dbb65-ca80-477c-8cfa-d8d2fdb1daf0	Miguel Pangilinan	\N	\N	Enforcer Tony	No License	Driver failed to produce license when flagged down.	2026-06-08 10:45:34.79+00	disputed	12.35116250	121.06325210	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	5f181bd7-9e40-4209-a718-3da94560ccc6	c56d478c-b62d-49fa-9f44-ce46b4958aee	\N
168f7d27-7557-438e-a67e-a07d1ec99a0e	TCT-00193	304c1b9e-3b49-4ef4-b22e-6b8d6ea9e7d6	Ryan Mateo	\N	\N	Enforcer Dante	No Helmet	Helmet not strapped properly, considered as no helmet.	2026-07-24 08:05:24.852+00	pending	12.35118356	121.06579127	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	56e3d9bb-fd17-4068-b74e-871f8af82812	93769fc2-a513-402c-b18e-271f13528ce4	\N
c4d58e71-8116-4987-ac5d-ca01511ecb74	TCT-00194	00e0674a-2a67-4a79-b2e7-628c10a392b4	Renato Sison	\N	\N	Enforcer Lito	Reckless Driving	Reported near-collision due to reckless driving.	2026-06-10 22:25:08.618+00	pending	12.35718591	121.07337959	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	0f8b85c6-a5df-4f2d-a5b8-2a3526f90d71	61d96624-1722-482b-a23c-73314b015c5f	\N
6511e7fc-7c88-4d52-8b2d-72e08220290a	TCT-00195	069897c5-7e79-4713-b9c4-f51b47380f0f	Rodrigo Panlilio	\N	\N	Enforcer Dante	Reckless Driving, No Helmet	Motorist ran past stop line and ignored enforcer signal.	2026-07-17 05:07:35.132+00	paid	12.35508518	121.06642338	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	b4e39844-f5ad-4ebc-8c4c-7f606b696c64	c5e63888-e483-42bc-a2dd-9690ca415d56	\N
6ef83ffd-8310-4a4b-9bf3-b3025cf17e06	TCT-00196	a57fa5c2-9abd-418f-a333-d6864f19b45a	Victorino Sison	\N	\N	Enforcer Lito	Beating Red Light	Traffic light violation observed. No stopping.	2026-06-29 04:02:49.848+00	dismissed	12.35804360	121.04463847	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	18851c96-44a5-4304-8a0b-186105ad7ebb	8d45ce68-fe99-405b-bb26-da57ac9b42c4	\N
a80a3a68-3c26-4491-85a9-4a1071ca6420	TCT-00197	f29bb683-46b8-4177-b932-cef19d779310	Corazon Pascual	\N	\N	Enforcer Marco	Illegal Parking	Vehicle parked on no-parking zone.	2026-06-17 06:09:11.539+00	paid	12.35779623	121.04407235	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	73ea2bf7-73cb-4f7b-9fdc-c57fb2c75902	a167e524-56a3-4066-b05d-1c74ee1566d8	\N
1995913b-3037-45df-b772-f015d2367c46	TCT-00198	089efe52-440f-48be-88d4-ab8bfb3205d1	Renz Bartolome	\N	\N	Enforcer Dante	Illegal Parking	Parked in front of fire hydrant.	2026-06-17 02:19:52.307+00	dismissed	12.35285971	121.06650988	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	2c31fc2b-ceb2-48fc-94c3-64292bddb033	c84ca948-7140-4b96-b739-74adca888af4	\N
d2d97fa3-55a1-4cc2-94b8-e164b9f9b15e	TCT-00199	3ee1fcd7-ee64-4add-9c4e-93a445ac3bba	Aldrin Garcia	\N	\N	Enforcer Juan	Beating Red Light	Traffic light violation observed. No stopping.	2026-06-24 11:59:47.89+00	dismissed	12.35083485	121.06404919	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	913f4ff2-e467-4c19-93a2-823ac39bd154	b93fbcf0-083f-46fc-a836-0482bf107743	\N
446991c9-8374-49d3-b259-0ed476d57035	TCT-00200	c40d3218-710a-4e36-9c5a-613c86945cbb	Danilo Dela Cruz	\N	\N	Enforcer Bert	No Helmet	Rider and back rider both without helmets.	2026-07-21 05:00:13.524+00	resolved	12.35091972	121.06291134	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00	9913e396-74ec-47e1-8807-3ecb8c2dc9c4	a66c263b-1e8a-4fef-9a55-6aa1fe2a434f	\N
63caee8e-e8bd-47bd-a729-b7ec511a7a5f	TCT-00201	2b8ddd87-a2c0-4787-8a42-05de5c213e07	Nestor Pascual	\N	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	No Helmet	nagdroga habang nagmomotor	2026-08-31 05:18:51.470487+00	pending	12.37140112	121.03502967	f	2026-08-31 05:18:51.470487+00	2026-08-31 05:18:52.67508+00	5a72ed1a-f57f-4cfe-a9af-3aad17822094	71a12c3e-9e3e-4d2a-9b06-59e1ac7d6a64	1788153532643-510119210.jpg
9acb4915-c5fc-42d7-b5d0-327d692db2d7	TCT-00069	3d5ec6c1-f613-4391-8161-29442f173780	Fernando Dungca	\N	\N	Enforcer Tony	Beating Red Light	Beating red light during peak hours.	2026-08-27 06:52:39.375+00	dismissed	12.35132031	121.06338569	f	2026-08-31 04:43:24.612775+00	2026-09-02 12:16:21.682879+00	4201deb2-f6cf-4bf2-a569-7af2670335a8	20143faf-20ac-4529-a74a-7ea3f4ae28ae	\N
e4b10f73-e303-4c0f-8e51-c581b189e41a	TCT-00203	55bf9751-d8c9-4df3-bc0e-c7e95aa32d54	ayessa peralta	\N	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	Illegal Parking, Reckless Driving, No Helmet	ang ganda niya guys ikukulong ko na to sa bisig ko	2026-09-10 11:00:00.817742+00	pending	12.40962152	121.08781950	f	2026-09-10 11:00:00.817742+00	2026-09-10 11:00:02.796891+00	0dc1b7db-ea0a-40a8-ac3f-47bae3291e72	ce219ac4-18a7-40cf-ac22-3f4c667c25d5	1789038002054-969006266.jpg
3b137051-61e9-4340-aab5-50185d161cd5	TCT-00202	b38b9d10-f640-4bb4-8575-f77389fda0a7	Allan Dilon Esteves	\N	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	No Helmet		2026-08-31 05:25:43.0538+00	paid	12.37170440	121.03491130	f	2026-08-31 05:25:43.0538+00	2026-09-13 20:42:52.530557+00	b0fcccd2-0b0f-4b5f-8824-8dddc5890d60	b6404cab-8162-4bc6-a60f-7dfb582b8aa0	1788153945136-945932436.jpg
0a9b9690-cee3-4e9c-9bcc-7134146cff38	TCT-00058	535bb3e4-4caa-49a9-8178-dc69d361f063	Alejandro Galang	\N	\N	Enforcer Bert	Obstruction	Tricycle loading passengers in the middle of the road.	2026-08-01 03:53:03.969+00	disputed	12.35896770	121.07184696	t	2026-08-31 04:43:24.612775+00	2026-09-15 10:54:37.78119+00	6605fb74-ef8f-4ee6-9225-cd5d7c2ba7b9	d6c50a60-c4b1-47da-9c5c-370424a610c5	\N
f9883a7d-1ad5-4f76-9a30-590fc55a2587	TCT-00142	\N	Alejandro Galang	\N	\N	Enforcer Bert	Obstruction	Vehicle causing road obstruction.	2026-08-24 09:27:02.833+00	disputed	12.35891245	121.04592687	t	2026-08-31 04:43:24.612775+00	2026-09-15 10:54:43.070565+00	b2ac8844-fd92-4190-b1f6-3a21026bde80	01a8672a-28be-4b29-9bf7-4c6b2fbcb8ef	\N
ee15254e-6497-4e5f-8973-a1dccdd674c0	TCT-00204	976b32af-9f85-470f-89f3-dc407d9745f8	Jake Rosete	\N	3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	No Helmet		2026-09-17 06:19:47.161801+00	paid	12.35467963	121.06651097	f	2026-09-17 06:19:47.161801+00	2026-09-17 06:31:02.898742+00	765bb6eb-7bcb-45b9-a627-8e87c7fc6c80	b153be4f-ebf1-4784-a888-b90b112eaf3d	1789625989755-355247836.jpg
\.


--
-- TOC entry 3582 (class 0 OID 16400)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.users (id, name, email, password, role, birthday, is_active, created_at, updated_at, status, last_login, token_version, email_verified, email_verified_at) FROM stdin;
b108324f-2fe7-47db-bd4e-fd05d9466bd7	Kenneth Marigmen	sss.rodjones@gmail.com	$2a$10$yiu6vTheTUn.WtB8.COpd.zas/6e/yeuqYWj2SSCTpLMi/rs2tyua	motorist	1990-04-11	t	2026-09-02 10:12:42.140159+00	2026-09-02 10:14:47.346537+00	active	2026-09-02 10:14:47.346537+00	0	t	2026-09-02 10:14:20.342674+00
993c8558-1fc7-4e41-beda-399eed19a082	Jake Rosete	hire.mework28@gmail.com	$2a$10$gzukOFUXDmvgUobfmXw5y.RHXg/ugCX2GHj5CfGxC0HY6LzjqHZza	motorist	1994-09-17	t	2026-09-17 06:25:00.34177+00	2026-09-17 06:26:30.690902+00	active	2026-09-17 06:26:30.690902+00	0	t	2026-09-17 06:25:39.491774+00
a9e58a5a-30e8-4eda-b881-e6d0552597f2	Estelito Balleza	estelito@gmail.com	$2b$10$6epHdr7BK4yOj1iP9rkMgeprxvLWDxwlCs07VLpEFNcvc96G.JnDe	admin	\N	t	2026-08-31 04:30:53.600018+00	2026-09-25 11:56:28.533346+00	active	2026-09-25 11:56:28.533346+00	0	t	2026-08-31 04:30:53.600018+00
4e559637-dca5-4b6f-9a7f-466f8ce45cfc	Ayessa Peralta	ayessaperalta2006@gmail.com	$2a$10$gbXVKcl4jd.MulFHn53at.ZEChxeYsb9uDAitOhZdXtgzpXzdCuHC	motorist	2006-08-09	t	2026-09-10 11:02:59.100868+00	2026-09-11 12:47:16.176656+00	active	2026-09-11 12:47:16.176656+00	0	t	2026-09-10 11:03:35.904802+00
46517122-9167-427c-9245-c195e91d7347	Rodjones Rosalinda	rodjonesrosalinda@gmail.com	$2b$10$.HHN.bU8CWqfMBPNQWmqjuq.gmwyFXTqtJN7tq/Psyi2/YQ03YToy	admin	\N	t	2026-08-31 05:05:21.190783+00	2026-08-31 06:01:25.889143+00	active	2026-08-31 06:01:25.889143+00	0	t	2026-08-31 05:05:21.190783+00
1da6c555-1347-4b46-8caf-7d572143f64c	Nicole Belarmino	princessnicolebelarmino239@gmail.com	$2b$10$IxW8j3c4beIDf.MTtPm.aO/b9pqSRySSm11o.xAOeovFSGZx09yrm	enforcer	\N	t	2026-08-31 04:42:44.213048+00	2026-08-31 07:49:55.693163+00	active	2026-08-31 07:49:55.693163+00	0	t	2026-08-31 04:42:44.213048+00
27475903-2fe7-40d0-91de-e96a8797df96	Allan Dilon Esteves	allandilonesteves24@gmail.com	$2b$10$pO9xC6J7aCaTCiK0jnvwouuCqjg5eCRnBo3TXcB8.ZMlOOT3xwJBi	motorist	\N	t	2026-08-31 04:42:43.419103+00	2026-09-17 06:14:30.786504+00	active	2026-09-17 06:14:30.786504+00	0	t	2026-08-31 04:42:43.419103+00
bed5ead2-ce0a-4301-b230-7b4fc94bbaa5	Chevy Chevrolei Hernandez	school.chev28@gmail.com	$2b$10$S9SxXjT9ybjZfKv9GuD8KOyWFanUxOWuBtmIKlfT1LhXPxbPXxDx6	enforcer	\N	t	2026-08-31 04:30:53.853723+00	2026-09-10 15:28:15.537871+00	active	2026-09-10 15:28:15.537871+00	0	t	2026-08-31 04:30:53.853723+00
3882d705-6bba-4352-85a9-7e872120b96a	Cindy Salazar	cindysalazar555@gmail.com	$2b$10$583.IQk.WR6v/No931EkdeDZ4pzAgMbrfnT6DdPWBHeP2R31cq8va	enforcer	\N	t	2026-08-31 04:42:43.702183+00	2026-09-17 06:16:57.488201+00	active	2026-09-17 06:16:57.488201+00	0	t	2026-08-31 04:42:43.702183+00
\.


--
-- TOC entry 3590 (class 0 OID 16579)
-- Dependencies: 228
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.vehicles (id, motorist_id, plate_no, no_plate, vehicle_type, make, model, color, or_cr_no, or_cr_presented, created_at, updated_at) FROM stdin;
baf380ff-0a77-421c-854e-d1cc4bff85f2	6652eb93-d344-417f-abdf-10e134ac346f	NAX 3880	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4148fdc2-30a5-4672-9fcd-6cad10189b84	79d6d2da-ae32-414f-8d92-9bcf5931306d	NAV 7898	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e014794b-693a-4e7b-882f-823eff1c6386	ee97d3bb-22b3-4b9e-bed8-30a36bd2d1ad	NAX 8190	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f12c8da3-53bb-4475-b119-19c470ead3b7	69cf0683-8953-4303-b31d-2715aa462cf8	NAR 6524	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
695d3f71-d984-4e3d-94f1-94ec7ee97f48	3ffd10fb-42ba-4eb9-b3a4-dc5ab13105e8	ABG 8585	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
93b1cbfa-1fa9-4301-b52d-9a6fa75e6172	421a813d-735c-4e02-a023-0b62cc7af99d	NAX 9135	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
371df0d3-6a03-4223-a5c1-2d3729ac8fd4	84f9bde3-9663-4791-8ace-e5b877cce3a0	NAV 3891	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b87f688c-3896-425f-a4c7-140e255629cc	65d909c6-f264-4a33-a265-dad701b1ce61	NAR 6243	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5ca8ef5b-583d-4438-96ac-785df175e856	cec1ef86-4d20-4c5d-ac89-9cef42008468	ABG 1908	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5480dffc-acb8-48a7-af0c-12ddd8ba2052	dfb46de4-1779-48c5-80eb-f016b5c0866e	ACF 9705	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f5aa7954-f1fa-4faa-87e7-c5a0b9411c39	ec840ec2-e42f-408c-bd7d-4e2c80bbc712	NAV 7560	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
79849a1c-2987-43dd-9d9f-9c3121bfe1b4	3dbca453-c90e-4681-b3d2-8ffaf894bd07	NAW 7240	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f773efc2-0f77-48d2-819b-79d20254d807	da426c1e-1f33-4a29-b725-f8e0c265464a	NAV 7960	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
7ad202d7-92e3-4f87-ac8d-fabcf2670253	2b369792-2651-465b-8f40-d5c1ad353eca	ACF 0566	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5f94ef2d-31bb-4b90-ac4a-8944b98783e5	c01c852e-8541-4106-a8ea-55e6c8358d9a	NAV 2462	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d8f62f0c-bd6d-40fa-a882-f903fc399a8a	412cf07f-2348-49e6-aec4-6bf7bfe6ecf5	NAU 9086	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
121342e8-5cb0-4790-8a0b-932164952088	45b4bf76-2197-4153-a014-b38dbf1a4bc1	NAW 8511	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
3bb3ff57-5f43-4413-9932-8728e9688c2a	917a7066-b584-45d8-b273-8f442513b6c9	ABG 6407	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4784770b-d322-47a8-a963-5cab07484bfa	4de7d8b3-b976-4ac8-b031-918e4663e8bb	ACF 6373	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
7dcd1efe-86b1-4122-bb84-eefffd626cb5	f3f4209f-355f-45f2-80ce-b6de72f21c7d	ABG 0939	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b43f6ca5-28ee-45fb-9919-32f854149f54	6a04a52b-0f06-4dc4-8b85-687a0c77d72f	NAR 2316	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
fa916058-9a10-4c91-aa3a-c6e8fed7c6d6	97b7e325-0386-4a85-8f19-86bc598e6938	ACE 5064	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
469ee070-dd57-472f-85e8-f64126ac164d	006fe65b-0e4b-4a62-b584-c3cff94b0ea7	NAW 0278	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
821785f7-990b-485c-92c8-2677534af84c	fba75231-03e3-418b-9df9-e7e007c40344	ACF 4303	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5afe3547-15d7-42ef-a196-330d2be7d50e	5dbf54f3-97f2-4396-ac2d-70311f96dcd2	NAV 0372	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b46e2a35-bbd0-469d-9c9b-8756397eabbd	14c39426-8418-4ee1-b768-6b1953176ffd	NAW 4001	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5122ad14-1e24-45dc-bf9f-0910cddd3809	36ed3ea6-ee10-4137-8b8d-6bc7d30d01d2	NAR 2395	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
0645be1c-8c8c-455a-943f-d3b673b80d23	744e038e-bf37-433d-8677-78323fa5d217	NAR 6888	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
89880ca7-21d3-4a48-8d10-778ec41c44a3	87d6be9f-77fd-4140-8ec8-010096ae76e7	NAU 0129	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b866169c-37e2-4289-8cbf-d0fa16e7b1d4	390bd475-e488-4a0c-88e4-e2d9f2f81f5b	ACE 0608	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
0775e4ed-6ae2-4051-9bbb-af9515037566	a58d721f-98cf-4682-9210-99583f6d93d2	NAR 7545	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f44a2664-d4d0-479a-a002-2b1f971f99cf	0ca0068c-51d2-4f12-bf9f-b07c4edea9ad	NAW 7267	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
85fb008f-7cd4-4b2a-a328-a550e629596f	55e9749a-4da2-4e61-b11e-e12bba04ab40	ABG 5294	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
3ba9e087-7e5e-495c-a6b8-1f9b60b858d7	6c282b06-d6cd-4ff6-9453-75e78fce9cc3	ACE 5583	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
64bb8698-9b7b-4b23-931d-752735bfe118	5c5155ab-cb8b-48fc-910f-ba131efa87dd	NAX 4742	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d662b0e0-04b5-4062-8a85-91403721c095	8b7a8e2f-310e-4d30-91de-402af8dbf62b	NAS 7482	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5ff4b9e5-9ab1-4b50-aede-ca2dcd611d0c	28f0638f-0196-4f46-ad1e-67ead9162fd9	NAU 9810	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
dcc3dd0a-7541-4ddd-b89d-f467996fe9f2	d775ce10-452b-45d0-a339-ccb1d223f84f	ACF 1837	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e569f777-2747-492d-ad3d-c2076dc5df1b	1ed3c9ca-6a40-47cf-9499-08629fce2b60	NAR 9632	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b3175d75-bf01-4278-a712-b53c9e91834c	381c8426-24ae-4256-878c-c9708ce8a2d9	NAR 7547	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
6a2b95ad-8ec7-4dd0-bf23-decca747deb3	a878fbb5-5f21-463c-b56c-58f1b43b2030	NAX 5379	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5ebd5704-4b1a-49ea-a164-3dca07fb1849	340ca04c-3438-42b8-b367-eb564abef02a	ACF 5182	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b516ddca-f2ba-4030-ab8f-f2357e28aba6	24095ed2-0c9e-4333-b771-eddbb1a9a402	ACD 0043	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c9b87f72-5e97-415b-bce7-188473eba647	8f842b9d-3bea-4ee2-bd50-23c0d7d75bfb	ABG 3813	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f46bad7c-4ee6-4df7-ad71-665810392d3b	7f33cf04-d351-431a-91bd-95db86987cb7	NAR 6468	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
79c3dcfa-2995-4af8-bf20-70b7b30d330a	16c00cf3-19c0-4b87-91ff-6d3edcb5f81a	ABG 1655	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c53c42c3-7450-48a3-8ada-9a78e67d6858	8976f19d-a0cd-4459-a653-c37e51f98edd	ABG 3448	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
1f0a5bc9-70b0-46b2-91aa-66f34a400858	87a585d9-b237-4473-b0ce-ef8a4eec1435	NAU 0635	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
7591be18-e139-48f5-a45d-ca066df32abd	040fd03b-204e-44c9-8bcd-074d9515aa66	NAX 5696	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
ec21d348-8f70-4c1d-a6ac-c5a452425a16	fb1e3696-2879-4fa3-b741-28c5a15be841	NAR 5202	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5bcb3368-3ea0-4bff-a30b-41fea42174ad	9be75cb1-61b9-4fed-881b-c80467ae2314	NAR 0338	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
3cf1c1b4-4af6-4f4a-81cf-aae2ba96ae4d	ccb93aed-71a2-4c42-b0bb-188e85fb076d	NAU 7157	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b0c504a0-45f8-4cc9-9a45-6d6b609e730b	8e1777be-7dc1-4408-9f60-62323593e260	NAV 9205	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a929d949-dcdd-4823-831d-079ed726603d	8e75b5e3-a7d3-4bb4-9a23-6d291955c4aa	ACF 2025	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
0b489a1e-a37a-48ca-ba6f-558733ebd557	aae5ed99-7b46-40d5-aaa0-a1b8f43ea6bd	NAU 5914	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
442d58af-4f4a-40f0-ac25-925d7732d8b5	56944817-ef4e-4d5d-9c69-1b9211067e7b	ACF 4128	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d6c50a60-c4b1-47da-9c5c-370424a610c5	535bb3e4-4caa-49a9-8178-dc69d361f063	NAR 4911	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
57f87fea-34ec-4f0a-a727-c419cab21797	23fbdc8d-c739-4713-b7c8-d0538487e194	ABG 4144	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
03236769-636e-45f4-b0d4-1c75a6a03a00	dd364e1c-3302-46fc-99a0-0c297abe5633	NAV 3214	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f3779e3c-f867-43d8-9add-82a7349776e7	2614c3b8-bf53-42dd-91d6-d0f321e39bd8	NAW 4873	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
069b5f74-b37f-4763-a968-4ca2c68b8435	83ff01e2-1b12-4d0d-931c-68ce3f1fc510	NAS 7292	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f5e1b87b-d35a-4aad-8e5f-735c1e65b25d	5d266376-b85e-4ce4-8cea-4725af5e7c74	NAR 5517	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f92ddffe-1623-4952-adc8-e67ab7405755	3c2e42e9-30b4-4ddd-96d9-0cd992ff70e1	NAX 9861	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e7d06b01-6491-4a0c-8c41-6eea0c9e2ab6	587a5cc7-d4d3-453e-802d-0f7167ca31dd	ABG 9658	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
19253d53-06f4-49ea-85dd-948c15436131	f0ac1348-d5f5-48da-bcd5-ffc2d10f30b2	NAX 8926	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
6e2baf39-ffee-4cc9-9f4e-2874561161a9	f6af87ad-c3cb-4b7a-ab97-50a001d5e94d	ACF 0071	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
aa21ed88-8b28-4874-98ac-27c1fe486ec8	c395b5da-6f1a-452d-9f3a-a4b12795c96f	NAR 3234	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
20143faf-20ac-4529-a74a-7ea3f4ae28ae	3d5ec6c1-f613-4391-8161-29442f173780	NAX 2748	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
ba8213a6-072a-4102-974c-5e1c1d0c4577	9696acbf-72e1-4397-be5f-4416d084754f	ACE 9373	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
cc5ec0ac-1ef0-4633-9986-b18195e78a9f	f8abecf5-ea81-4fd7-a2fe-b3667065a157	ACD 3747	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
90bdd838-7d4d-473d-affb-8f44111a87ab	119e1416-7da8-4daf-85f4-d4a047ad6812	ACD 3054	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
85c3d0ad-6e28-4f84-ad39-5f00ee8ce84b	5b949e7c-29c5-41a2-86b7-04fbbddba14c	NAR 7220	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
3bdb164e-40b9-4026-b940-ad7480589ebc	d3d6ab2a-1c78-4422-a2df-9d2aecfa19e4	NAR 2063	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
dd5d1846-a8bd-4195-a3bb-e2e02b3b312c	9c16e684-3830-4739-bf80-152144d86271	NAX 4412	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a29bbd08-24c9-4da3-9991-642c10f64494	fff4ee4a-23e0-458b-bbb8-b6553dd4c1ea	NAU 7252	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d1a2cde7-3c16-43d9-a19e-93fbfb59c7ef	3df8bfb2-c1db-4cbe-b923-db4a758fc813	ACE 1099	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c5a59674-c1d3-4a72-ae14-901be3048acf	b610039e-6255-4651-b02d-297a6cfd512d	NAS 9283	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c16f5862-3eac-4979-bf34-30a589a91d1d	83a6148f-c5ed-4a4e-96b2-1634e8dfa2ea	ABG 8344	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
0ca4c154-d0e0-482d-90c5-56c0fa540af1	237265b0-2698-484b-a54b-9bb61efc7df4	ACF 6345	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e2e2c68c-75f3-4d04-bf1c-a2f120407db6	0e816893-d713-4204-bd6c-8d326f28a2ec	NAV 2547	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
2832bece-ea89-439d-a168-b2e277622b6b	d01f3396-1a4b-460f-9bd3-819c1916983c	ACE 4748	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
409ea6ae-5859-41c9-acd5-c2f57cd90771	1ed7e36b-c668-4047-9aaf-79ae93dfebaf	ACD 4408	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
1efce38f-2a3d-44c0-ac15-8409dd786774	4a5322e7-2d1f-481b-a777-83203c499b45	ABG 1254	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
fca5ba5e-2588-4f22-acd1-c4a5709e4c90	4347a433-1ebf-4191-b308-997b9bc519c9	NAR 0143	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c1ada38d-a368-4832-8bc6-58fb2cc05d68	473df490-aa70-4794-98af-2a954ce228b2	NAR 7682	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
1dc86382-9585-4f03-951d-12d86648b307	70afd47c-87ec-4947-a363-a790737ef5c6	NAR 1322	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
700b2107-eeff-4ff8-8294-1b6d901cbc4f	66573242-baa5-4a58-a7ea-6ad2b8f5a377	ABG 8113	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c04f37f0-00c8-4c7d-9314-b66d62ad45c6	2394bc9b-d313-462a-8491-b46db7c2124d	NAR 9791	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
1af3c743-8357-47bb-b0f3-ead8c36bcef4	c6b6c014-a424-48b8-ae21-551a724d1408	NAU 9478	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e14e0847-543f-4663-9316-f5ee8012d12b	2fe507f2-cfa3-41e3-bad6-b1e6bca40abd	NAW 0798	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5686cd60-4e11-412f-8eb1-47a089443ebf	d61eb64f-9450-4dbb-a97f-0aecc7cedb10	ACE 7561	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
43df86bf-9d68-415a-8043-71c366f76dbf	a89d6b79-5e38-40c7-9074-320551bd7f66	NAV 4862	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
bcab9a8b-d66c-4939-8ed7-7e7e2eb3dcbb	e3c4505a-0a7f-4878-bc53-fb075cc0bb45	ACD 7678	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
11c1815a-700d-43f7-8be8-49edfc8fbec1	162011f5-e764-498c-8f68-5e43fe994602	ACE 8639	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e014cd6c-f060-4a44-8e30-71ecddd39d39	84242360-1f10-4048-ba36-3ef31324576e	NAR 3769	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
3895d7b5-122e-40a0-9a41-2db1c7120580	2e1ef2fe-77de-4e5c-ae86-4d308fb89d7f	NAS 4392	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
447b38ea-6a35-4e14-bf0f-fbb555b7dcd0	ce1c58d5-b817-4630-b8d2-bee0b80239d5	ACE 0572	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f10ceaf0-6f81-4b74-a977-4648caf8475f	630265b9-567a-4b86-a4b3-b7ad574a512e	NAR 7770	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4851db11-793f-40d6-ab62-4871001f6359	a1f1dded-d092-42a9-a063-0771145934a2	ACE 0577	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
0459cf63-1a83-44a2-b2d9-c5fd25547197	f0a9021c-15b0-4bd4-98ed-0047abdb8bd1	ACF 8175	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5dbe589a-6988-4766-b9b9-1f611b3f1f4b	ed24ed62-02a6-41bd-9d90-b975d2cc4771	ABG 3331	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
762daf2e-50f3-46a4-8b6f-27d18ff029b5	2f314fc0-72fa-4d4e-80ce-b89027b49246	ACD 6334	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
3b8cad3c-3d4c-46d1-adde-a6a2798c5a6c	9152b377-7e31-49c1-8e02-bd550634e1ca	ABG 2158	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
db9df3d3-74cd-4610-8db8-79ee72b4923d	de621475-7705-4b4f-8e38-79ca57912899	NAV 8111	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
9eb2805d-1490-4796-af13-2338aa0ce906	f9da1607-ebd7-4799-ac8a-4f63648b4efa	NAS 3839	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
49775f2d-0ace-4607-8659-dcc080efaa0b	15b10737-4150-4634-a437-fcd1487d84e3	NAU 7912	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b39d4ea4-3a83-487d-b801-c7e500fad990	68eccd7d-8198-41a2-8c75-3c2a4435f022	NAU 0890	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
ddd97b84-fd74-4d88-9050-606017688a70	c4be30b4-e8c4-4819-899d-7b341ba9a03e	NAU 5671	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c15ece0a-bcdf-4823-a70c-1555a926571a	7ec54295-5a1f-4550-aa26-4f1af8235e5e	NAV 4776	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a80712c3-493f-448b-b4f9-3b3b2a4c3220	3b5faad6-222f-4030-91da-28cdbc1a5988	ABG 6018	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
55af6a1f-cf3d-4136-acf6-afa914be677d	58718a3f-bb2d-4a2a-8043-8e77bb3270f2	NAU 1843	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
8c090e6b-42b1-47c3-9bc4-e70db1cb9337	d8d41761-efac-4599-a273-c744e0f4d422	NAV 6088	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a4ac24a1-9646-4d2a-8403-c013a7691f73	034f97b3-2500-4d72-b317-daca10dbd37e	ACD 4914	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5e8dcab5-e178-4c63-9393-cefb2f380071	e5ea0b7f-bed1-400a-9ad2-df6cd6c56eee	ACF 3844	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
df330b0b-4596-46d1-b9d7-41c2bd1fc8e2	9cfd1d74-3623-40ca-b461-7eda0e04f66b	ACE 1963	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d38ebb67-f5e2-42d3-a799-a6d35567b287	c7d717bd-86b4-4338-8878-0af2fb9911ba	NAX 2756	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
61e41265-b539-4a74-a6ed-bdd564d8e29f	3dc9b132-75ea-4263-b3c3-747e0c2e0cb4	ACD 1839	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
97348fbd-5307-40df-9be4-8032c536a96c	0a99eead-42a7-4a81-b89f-cc2882de8e42	NAW 9305	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4e80925a-2811-4e1f-9f5a-fe317b3471ec	0298c64b-718d-4a2e-b3f9-48f4f0d7e523	NAV 6111	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4482ca6c-b226-4b2b-9f60-290104be90f3	49b52119-5b5b-452d-b295-8395d6803a7a	NAV 8588	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
aa8c114f-37db-4c78-87db-faf74f3a173b	5b1d79d9-f870-4172-81c2-e152b15daec0	ACD 7080	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
8adcb89d-0fa3-4f13-9991-07676b1c1a40	14f3ab52-3fcb-4011-a488-289a87ade001	NAV 2422	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
1b187e35-4b8b-4129-b95a-039b5d2f4ae3	619b19c0-53ab-4500-8ae2-5ff428b32e10	NAU 2635	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4ed6793d-f530-4b97-bc82-e0f7b69ccf66	32f32fa7-727a-40a9-9448-75d402f8e22b	NAW 3217	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a8f98aa8-d562-4b34-b420-7fe4de99fc21	7bdaf57e-fd59-4c95-8411-9a9eff52f7fd	NAW 9171	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
289ce00a-2979-49e5-b0ff-a5e30b11932c	ada3db76-da39-4048-aff2-8d96a5ca43c4	NAW 4267	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
ecd8d656-41de-41c2-8806-98c2c87dba20	8c4f0f29-70da-40b3-8272-02664bd61f4d	NAW 0402	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
71c4ccf1-5a74-40ee-b46c-bf029b09094c	2c26c6c6-5fa9-499e-ba1f-6a10b9d7ce9f	ACF 1585	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
7881c632-2adf-453c-af11-b0df3740dc9a	805e53e5-03ab-4481-ae60-c2cb3b092097	NAR 1402	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e9d81f85-6cc3-40fe-8f9f-d70617cb9315	420c3303-c4dc-4bae-9712-7d8f5f43a24c	NAR 0118	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
32df1010-92ea-4edb-bb43-4a572fe61ed0	67ffa600-4885-42c0-b2e9-606c31860045	ACD 0481	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
11f8d6a0-aea0-4aaa-a2ae-d0447a70781f	4403c4c2-a532-47f0-a4cf-8811207ffb15	ACE 5297	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
fb6f52f4-b302-4d1d-85e7-ddc8a76d5fc8	cdd7bb9b-b808-44de-860d-4cc30d90ec02	NAV 9579	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e71aea92-5f4d-40b7-988d-b7995e8a9e6d	7bf630c5-3e7e-4d48-b108-45c0cda8ea2d	NAU 7858	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d61c963a-602f-452a-97fa-d5e1a2aebcf7	8b174fa4-27f4-4603-b20c-e06f7924fafd	NAR 7159	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
892fd755-8b54-43d3-8c54-c70c0cb822c4	0c42f433-93bd-4c73-baaa-38f9d3b2b4d0	NAX 3552	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
fc537845-07f3-4300-8c92-c8b181a8968a	b7b63054-352e-4b42-b8a3-399a0e48fd81	NAX 1400	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
6970e5cb-bead-4e64-99e5-0bd77acfbc7b	431173a5-7480-4785-a766-ca586ae785ff	ACE 9767	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
0be476b7-ef76-441c-a51c-a97de22982a1	fbf18ff6-e5db-498f-8c24-6cbbbaf1dffd	NAR 2755	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
40a46413-a84c-4ea2-8b14-3ac83dca58c6	a419550d-eefb-48ce-9af8-11d66a0b07c5	NAU 9776	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
09af6e5e-8aab-4c59-a324-0cd5921d3848	b2f98389-b602-4616-9e5d-97ebf786b6b5	NAR 2289	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a09f4e33-48a4-4ed3-b1c2-c45c5002392d	1ce317a7-955b-4571-bc8f-57b9dfda6752	ACF 0941	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5b4ea0da-6f13-4c9d-831c-21547d64bb83	a22b28db-816b-4861-a8f1-229d23b05e45	NAR 2475	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
1fb4af36-1a21-4408-99b5-2cc0a3d281a9	edd425a4-b33e-4ded-8bc1-8fb4677886eb	ACF 5787	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
cd553b62-890c-4f7c-9e9f-ee2354e85d51	d5d7cf0e-ee4e-42f8-be27-9c31ea95c169	NAV 5661	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f64e22d8-b94c-420a-ac08-815faedf9d34	f9ee1cd2-0bd7-4101-b390-ab43330e7982	NAV 7574	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f0bc2d3b-ca28-4229-a753-7e62dedd3ae7	dc8178ff-234f-43bb-9cf6-b7e0906b22bd	NAU 6449	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
08d0aa07-c7bf-46b0-b5d9-1db8b4b4b188	76ea0b7a-f943-4bf1-a632-d2c52cded37b	NAR 0529	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
0a17523f-a3c8-4274-8d74-5c9ebd03c4a4	c6f42100-68f3-4733-8097-2ada11459c24	NAR 1904	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
27fc4a4b-32e7-4ad9-8aa1-fda12d6ada2b	54170f12-8460-4b66-b495-6c125ef235e5	NAW 9703	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e2742d04-7aa1-41e0-beb0-daf8f4772471	858cdeee-fb9d-4813-9022-bc736428e1a5	ACE 1159	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
ed858707-5d3d-45e0-86d4-8ad7ff9fb623	b69e33bd-7721-4c5a-9cb5-d1ef706078e7	NAR 7449	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
516a3211-83b7-4bd4-8093-45024048798f	8cff5cf1-19e5-46d8-899d-c40f15f2649e	NAX 7751	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
589d72d9-6e19-4896-a6a4-e23f9902a8ab	acd3a0ff-e58d-4395-aaeb-6ddf06ee9c64	NAR 1799	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
366c42b9-67c2-4422-9732-e99ba651032d	746267ac-e826-45bf-b7f3-254eae1344cf	NAR 5255	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f0eae382-602c-431a-a637-e332953779f3	fa97d9d1-01aa-4f5a-99b9-76a5a2f67d9e	NAU 4178	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e2ae36c8-d589-4a63-b077-d50fda1ee9f9	32d78afe-602a-4fca-9a71-16387fbb73f3	NAW 1662	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
60fd185c-55e9-403c-b9ed-8a7a3bdb4c1c	3595679c-8c99-4134-9a76-4b2b5df773c4	NAX 5940	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
86c40a1c-48e4-4244-ac76-472045e3c454	7df36bfa-474e-4f93-acee-9cd4452da688	NAU 6171	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
65773351-2715-49ea-a510-bcefc9ab4ceb	0f1028a7-2f5a-44d3-b808-663d5d0681e5	ABG 6144	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
31920629-ab31-4862-81fc-70ced1ce3a39	f555659a-5c97-487d-a767-2c1a2d1a071c	NAX 3205	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5032d873-63ee-4a3b-8721-1c1cf4002102	50821931-bfbe-4e1b-831f-5c2275c9c88e	ACF 4690	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
830a5115-a072-4f92-bd23-1af3dda24095	aad456e9-b016-428b-87e4-63ef565f89cf	NAR 3766	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
85f76ba6-6cdc-4526-a8ac-025be1f347ef	4dcbd343-8b66-4885-8d98-71ade17c9696	ACE 3859	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5171bc72-baa0-409e-9ccc-c96949215a17	aa9f2fc8-29d5-4273-94d9-3d6eefd71c5a	NAV 4185	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f53aef18-c42c-46dd-a219-fc555d699245	5f4b867f-d67e-4a33-a45b-84e0c7a49175	ABG 4103	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4742d27d-9c20-4f4d-a86d-6b3367998424	231b98bd-6bb9-4a75-8f1f-83e61e7d2abe	NAU 7047	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e8f8b7cd-66ef-4ee2-86f2-53a7a796a97d	da1e7db5-92bd-40ea-9e9e-42803dfcea06	NAV 7615	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
6a85b2a6-8ac4-42bb-b186-ea74ab655c37	3c80506b-d3e0-43c4-bb3c-8e0534dd28b0	NAV 7279	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d4aeed3c-2c2b-4d9c-8593-1567df621c1d	564f6a27-f0d6-4d9d-bbc9-5079dd5f04fb	NAU 1617	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
88c34fa0-932f-4533-af01-d0ef00980e2d	a9f433a9-d1e8-46d1-b377-7ca6d4e9a4be	NAR 6049	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
1fd183ac-2187-4eab-a7bf-11b65eb9bb31	ecac3bd8-6a5b-4d3b-807f-408cf86ccfef	ACE 2727	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
dc91e8b7-9cb1-47a6-8328-e97538197704	7461976b-fefe-48c6-bf47-424da7174c1e	ACE 7880	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a02a3da8-2751-4f8c-acee-c8e7803904bd	d84333c0-1855-4d14-baf7-f7c2026dac8a	NAR 4570	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
64eef91d-3c8b-456c-ba73-f1786e4e1ffb	a797555d-a6fe-4469-9aca-c66c4e082b1c	NAW 7584	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
5e30795c-5271-413c-9279-898c74bdd426	2d781aef-f08b-4645-b90d-7d2f991c3e66	NAX 5096	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
ed8a1e32-0dd9-4332-8b5d-5499bfa6e57a	78edda7b-f52b-4f93-8701-9f52a8e37eac	NAR 4858	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a542972a-b50a-486b-8ac7-cc7a22c80cd8	28c3f064-9465-4472-9924-f42adc9e0d1e	NAR 9629	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
d9116d14-2510-4fbe-a635-8915b94d4348	a140f98b-0ce6-4f55-9d5a-83c38f6eb986	NAU 2930	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
f431af64-711b-4b12-ab61-2efbb3bd3385	c26e2535-099b-4926-88c3-34c816e666c8	NAW 1975	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
77de1370-ef7c-4bf9-bd44-da49040827f5	4eb9b3f0-7c89-456c-9264-af388ffb6beb	ACD 6918	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
20873d03-5c19-4d42-8403-fa342ddb5110	78325bf5-8fe9-4902-9b3b-9bd474e9d9ba	NAW 6532	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
cf483a16-728b-487f-978b-db10b90be2b1	8cfe8b13-486b-4d68-90a8-7dd291f4b30b	NAS 3677	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
10731967-12c6-4336-a5af-f30b54d224df	a7275160-cc20-45da-a612-cb792fc49efc	NAX 8073	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
808e4bca-d70b-433a-9882-93776f61b2d7	b5b1b0dc-3835-4df2-87b2-739cd250f52c	NAR 8334	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
4c24c0e5-54cf-49b5-83eb-17ff86e94aac	a47a9568-482d-477f-b702-dc3d729eb1fa	ACF 3935	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
fea4a0f7-74ee-4630-af50-170996402da1	7173938f-fe20-4066-ad04-e550138f8ea2	NAS 8806	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
e84ae14e-b660-4ba0-9876-11f0f151f046	9bd4316c-994e-4ea4-8175-aedadeecf05e	NAS 1280	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
82b1c067-b332-4bd1-bec5-403d6fd95a92	8d9c5338-faaa-46c8-b53a-2cacd35e10c7	NAX 2719	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c56d478c-b62d-49fa-9f44-ce46b4958aee	404dbb65-ca80-477c-8cfa-d8d2fdb1daf0	NAR 1737	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
93769fc2-a513-402c-b18e-271f13528ce4	304c1b9e-3b49-4ef4-b22e-6b8d6ea9e7d6	NAV 5246	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
61d96624-1722-482b-a23c-73314b015c5f	00e0674a-2a67-4a79-b2e7-628c10a392b4	ACD 3207	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c5e63888-e483-42bc-a2dd-9690ca415d56	069897c5-7e79-4713-b9c4-f51b47380f0f	ACF 7857	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
8d45ce68-fe99-405b-bb26-da57ac9b42c4	a57fa5c2-9abd-418f-a333-d6864f19b45a	NAU 8830	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a167e524-56a3-4066-b05d-1c74ee1566d8	f29bb683-46b8-4177-b932-cef19d779310	NAR 6198	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
c84ca948-7140-4b96-b739-74adca888af4	089efe52-440f-48be-88d4-ab8bfb3205d1	ACD 6629	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
b93fbcf0-083f-46fc-a836-0482bf107743	3ee1fcd7-ee64-4add-9c4e-93a445ac3bba	ABG 8156	f	car	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
a66c263b-1e8a-4fef-9a55-6aa1fe2a434f	c40d3218-710a-4e36-9c5a-613c86945cbb	ACD 9760	f	jeepney	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 04:43:24.612775+00
71a12c3e-9e3e-4d2a-9b06-59e1ac7d6a64	2b8ddd87-a2c0-4787-8a42-05de5c213e07	NAR 5091	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-08-31 05:18:51.470487+00
b6404cab-8162-4bc6-a60f-7dfb582b8aa0	b38b9d10-f640-4bb4-8575-f77389fda0a7	JHR 9271	f	motorcycle	\N	\N	\N	\N	f	2026-08-31 05:25:43.0538+00	2026-08-31 05:25:43.0538+00
ce219ac4-18a7-40cf-ac22-3f4c667c25d5	55bf9751-d8c9-4df3-bc0e-c7e95aa32d54	SJN 0619	f	motorcycle	Yamaha	Mio Gear	Black Gray	\N	t	2026-09-10 11:00:00.817742+00	2026-09-10 11:00:00.817742+00
01a8672a-28be-4b29-9bf7-4c6b2fbcb8ef	\N	NAS 9725	f	tricycle	\N	\N	\N	\N	f	2026-08-31 04:43:24.612775+00	2026-09-15 10:45:34.754109+00
b153be4f-ebf1-4784-a888-b90b112eaf3d	976b32af-9f85-470f-89f3-dc407d9745f8	SJ-2345	f	motorcycle	Mio	Gear	Red	\N	t	2026-09-17 06:19:47.161801+00	2026-09-17 06:19:47.161801+00
\.


--
-- TOC entry 3587 (class 0 OID 16492)
-- Dependencies: 225
-- Data for Name: violation_types; Type: TABLE DATA; Schema: public; Owner: db_user
--

COPY public.violation_types (id, name, fine) FROM stdin;
1	No Helmet	500.00
2	Illegal Parking	300.00
3	No License	1000.00
4	Reckless Driving	1500.00
5	Beating Red Light	1000.00
6	Obstruction	500.00
\.


--
-- TOC entry 3607 (class 0 OID 0)
-- Dependencies: 234
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: db_user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 13, true);


--
-- TOC entry 3608 (class 0 OID 0)
-- Dependencies: 230
-- Name: ordinances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: db_user
--

SELECT pg_catalog.setval('public.ordinances_id_seq', 4, true);


--
-- TOC entry 3609 (class 0 OID 0)
-- Dependencies: 219
-- Name: ticket_seq; Type: SEQUENCE SET; Schema: public; Owner: db_user
--

SELECT pg_catalog.setval('public.ticket_seq', 204, true);


--
-- TOC entry 3610 (class 0 OID 0)
-- Dependencies: 224
-- Name: violation_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: db_user
--

SELECT pg_catalog.setval('public.violation_types_id_seq', 6, true);


--
-- TOC entry 3406 (class 2606 OID 16720)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3350 (class 2606 OID 16438)
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3352 (class 2606 OID 16440)
-- Name: email_verification_tokens email_verification_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 3384 (class 2606 OID 16565)
-- Name: motorists motorists_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.motorists
    ADD CONSTRAINT motorists_pkey PRIMARY KEY (id);


--
-- TOC entry 3395 (class 2606 OID 16654)
-- Name: ordinances ordinances_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.ordinances
    ADD CONSTRAINT ordinances_pkey PRIMARY KEY (id);


--
-- TOC entry 3356 (class 2606 OID 16457)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3358 (class 2606 OID 16459)
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 3397 (class 2606 OID 16673)
-- Name: patrol_areas patrol_areas_name_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.patrol_areas
    ADD CONSTRAINT patrol_areas_name_key UNIQUE (name);


--
-- TOC entry 3399 (class 2606 OID 16671)
-- Name: patrol_areas patrol_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.patrol_areas
    ADD CONSTRAINT patrol_areas_pkey PRIMARY KEY (id);


--
-- TOC entry 3404 (class 2606 OID 16690)
-- Name: patrol_assignments patrol_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.patrol_assignments
    ADD CONSTRAINT patrol_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3391 (class 2606 OID 16619)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 3393 (class 2606 OID 16621)
-- Name: payments payments_receipt_no_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_receipt_no_key UNIQUE (receipt_no);


--
-- TOC entry 3411 (class 2606 OID 16745)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3361 (class 2606 OID 16476)
-- Name: staff_invite_tokens staff_invite_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.staff_invite_tokens
    ADD CONSTRAINT staff_invite_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3363 (class 2606 OID 16478)
-- Name: staff_invite_tokens staff_invite_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.staff_invite_tokens
    ADD CONSTRAINT staff_invite_tokens_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 3377 (class 2606 OID 16522)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 3379 (class 2606 OID 16524)
-- Name: tickets tickets_ticket_no_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_no_key UNIQUE (ticket_no);


--
-- TOC entry 3346 (class 2606 OID 16418)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3348 (class 2606 OID 16416)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3388 (class 2606 OID 16590)
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- TOC entry 3365 (class 2606 OID 16502)
-- Name: violation_types violation_types_name_key; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.violation_types
    ADD CONSTRAINT violation_types_name_key UNIQUE (name);


--
-- TOC entry 3367 (class 2606 OID 16500)
-- Name: violation_types violation_types_pkey; Type: CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.violation_types
    ADD CONSTRAINT violation_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3407 (class 1259 OID 16727)
-- Name: idx_audit_target; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_audit_target ON public.audit_logs USING btree (target_table, target_id);


--
-- TOC entry 3408 (class 1259 OID 16726)
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_audit_user ON public.audit_logs USING btree (user_id);


--
-- TOC entry 3353 (class 1259 OID 16446)
-- Name: idx_evt_user; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_evt_user ON public.email_verification_tokens USING btree (user_id);


--
-- TOC entry 3380 (class 1259 OID 16567)
-- Name: idx_motorists_license; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_motorists_license ON public.motorists USING btree (license_no);


--
-- TOC entry 3381 (class 1259 OID 16566)
-- Name: idx_motorists_name; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_motorists_name ON public.motorists USING btree (last_name, first_name);


--
-- TOC entry 3382 (class 1259 OID 16573)
-- Name: idx_motorists_user; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_motorists_user ON public.motorists USING btree (user_id);


--
-- TOC entry 3400 (class 1259 OID 16707)
-- Name: idx_patrol_assign_date; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_patrol_assign_date ON public.patrol_assignments USING btree (shift_date);


--
-- TOC entry 3401 (class 1259 OID 16708)
-- Name: idx_patrol_assign_enforcer; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_patrol_assign_enforcer ON public.patrol_assignments USING btree (enforcer_id);


--
-- TOC entry 3402 (class 1259 OID 16706)
-- Name: idx_patrol_assign_unique; Type: INDEX; Schema: public; Owner: db_user
--

CREATE UNIQUE INDEX idx_patrol_assign_unique ON public.patrol_assignments USING btree (enforcer_id, area_id, shift_date);


--
-- TOC entry 3389 (class 1259 OID 16641)
-- Name: idx_payments_ticket; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_payments_ticket ON public.payments USING btree (ticket_id);


--
-- TOC entry 3354 (class 1259 OID 16465)
-- Name: idx_prt_user; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_prt_user ON public.password_reset_tokens USING btree (user_id);


--
-- TOC entry 3409 (class 1259 OID 16751)
-- Name: idx_refresh_tokens_hash; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_refresh_tokens_hash ON public.refresh_tokens USING btree (token_hash);


--
-- TOC entry 3359 (class 1259 OID 16489)
-- Name: idx_sit_user; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_sit_user ON public.staff_invite_tokens USING btree (user_id);


--
-- TOC entry 3368 (class 1259 OID 16551)
-- Name: idx_tickets_access_token; Type: INDEX; Schema: public; Owner: db_user
--

CREATE UNIQUE INDEX idx_tickets_access_token ON public.tickets USING btree (access_token);


--
-- TOC entry 3369 (class 1259 OID 16546)
-- Name: idx_tickets_date; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_tickets_date ON public.tickets USING btree (date_issued);


--
-- TOC entry 3370 (class 1259 OID 16544)
-- Name: idx_tickets_enforcer; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_tickets_enforcer ON public.tickets USING btree (enforcer_id);


--
-- TOC entry 3371 (class 1259 OID 16548)
-- Name: idx_tickets_license; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_tickets_license ON public.tickets USING btree (license_no);


--
-- TOC entry 3372 (class 1259 OID 16543)
-- Name: idx_tickets_motorist; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_tickets_motorist ON public.tickets USING btree (motorist_id);


--
-- TOC entry 3373 (class 1259 OID 16545)
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- TOC entry 3374 (class 1259 OID 16547)
-- Name: idx_tickets_ticket_no; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_tickets_ticket_no ON public.tickets USING btree (ticket_no);


--
-- TOC entry 3375 (class 1259 OID 16603)
-- Name: idx_tickets_vehicle; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_tickets_vehicle ON public.tickets USING btree (vehicle_id);


--
-- TOC entry 3341 (class 1259 OID 16419)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3342 (class 1259 OID 16427)
-- Name: idx_users_email_ci; Type: INDEX; Schema: public; Owner: db_user
--

CREATE UNIQUE INDEX idx_users_email_ci ON public.users USING btree (lower((email)::text));


--
-- TOC entry 3343 (class 1259 OID 16420)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 3344 (class 1259 OID 16426)
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- TOC entry 3385 (class 1259 OID 16597)
-- Name: idx_vehicles_motorist; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_vehicles_motorist ON public.vehicles USING btree (motorist_id);


--
-- TOC entry 3386 (class 1259 OID 16596)
-- Name: idx_vehicles_plate; Type: INDEX; Schema: public; Owner: db_user
--

CREATE INDEX idx_vehicles_plate ON public.vehicles USING btree (plate_no);


--
-- TOC entry 3432 (class 2620 OID 16731)
-- Name: motorists trg_motorists_updated_at; Type: TRIGGER; Schema: public; Owner: db_user
--

CREATE TRIGGER trg_motorists_updated_at BEFORE UPDATE ON public.motorists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3431 (class 2620 OID 16729)
-- Name: tickets trg_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: db_user
--

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3430 (class 2620 OID 16730)
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: db_user
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3433 (class 2620 OID 16936)
-- Name: vehicles trg_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: db_user
--

CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3428 (class 2606 OID 16721)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3412 (class 2606 OID 16441)
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3419 (class 2606 OID 16568)
-- Name: motorists motorists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.motorists
    ADD CONSTRAINT motorists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3424 (class 2606 OID 16655)
-- Name: ordinances ordinances_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.ordinances
    ADD CONSTRAINT ordinances_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3413 (class 2606 OID 16460)
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3425 (class 2606 OID 16696)
-- Name: patrol_assignments patrol_assignments_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.patrol_assignments
    ADD CONSTRAINT patrol_assignments_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.patrol_areas(id) ON DELETE CASCADE;


--
-- TOC entry 3426 (class 2606 OID 16701)
-- Name: patrol_assignments patrol_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.patrol_assignments
    ADD CONSTRAINT patrol_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3427 (class 2606 OID 16691)
-- Name: patrol_assignments patrol_assignments_enforcer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.patrol_assignments
    ADD CONSTRAINT patrol_assignments_enforcer_id_fkey FOREIGN KEY (enforcer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3421 (class 2606 OID 16627)
-- Name: payments payments_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3422 (class 2606 OID 16622)
-- Name: payments payments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE RESTRICT;


--
-- TOC entry 3423 (class 2606 OID 16636)
-- Name: payments payments_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3429 (class 2606 OID 16746)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3414 (class 2606 OID 16484)
-- Name: staff_invite_tokens staff_invite_tokens_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.staff_invite_tokens
    ADD CONSTRAINT staff_invite_tokens_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3415 (class 2606 OID 16479)
-- Name: staff_invite_tokens staff_invite_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.staff_invite_tokens
    ADD CONSTRAINT staff_invite_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3416 (class 2606 OID 16530)
-- Name: tickets tickets_enforcer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_enforcer_id_fkey FOREIGN KEY (enforcer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3417 (class 2606 OID 16574)
-- Name: tickets tickets_motorist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_motorist_id_fkey FOREIGN KEY (motorist_id) REFERENCES public.motorists(id) ON DELETE SET NULL;


--
-- TOC entry 3418 (class 2606 OID 16598)
-- Name: tickets tickets_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- TOC entry 3420 (class 2606 OID 16591)
-- Name: vehicles vehicles_motorist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_motorist_id_fkey FOREIGN KEY (motorist_id) REFERENCES public.motorists(id) ON DELETE SET NULL;


--
-- TOC entry 2109 (class 826 OID 16391)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO db_user;


--
-- TOC entry 2111 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO db_user;


--
-- TOC entry 2110 (class 826 OID 16392)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO db_user;


--
-- TOC entry 2108 (class 826 OID 16390)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO db_user;


-- Completed on 2026-09-29 18:20:55

--
-- PostgreSQL database dump complete
--

\unrestrict T2HNhvVhAxnsey9Z3kbL6CwgQnkzofKOzAopqgWz2IdvkNQ4hVVV1itZ5BYxn3G

