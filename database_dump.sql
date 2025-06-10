--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    phone character varying(50),
    email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.branches OWNER TO neondb_owner;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branches_id_seq OWNER TO neondb_owner;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: guests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.guests (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    phone character varying(50),
    id_type character varying,
    id_number character varying(100),
    address text,
    date_of_birth date,
    nationality character varying(100),
    reservation_count integer DEFAULT 0 NOT NULL,
    branch_id integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.guests OWNER TO neondb_owner;

--
-- Name: guests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guests_id_seq OWNER TO neondb_owner;

--
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- Name: hotel_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.hotel_settings (
    id integer NOT NULL,
    branch_id integer,
    hotel_name character varying(255),
    hotel_chain character varying(255),
    logo text,
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    postal_code character varying(20),
    phone character varying(50),
    email character varying(255),
    website character varying(255),
    tax_number character varying(100),
    registration_number character varying(100),
    check_in_time character varying(10) DEFAULT '15:00'::character varying,
    check_out_time character varying(10) DEFAULT '11:00'::character varying,
    currency character varying(10) DEFAULT 'NPR'::character varying,
    time_zone character varying(50) DEFAULT 'Asia/Kathmandu'::character varying,
    billing_footer text,
    terms_and_conditions text,
    cancellation_policy text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.hotel_settings OWNER TO neondb_owner;

--
-- Name: hotel_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.hotel_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hotel_settings_id_seq OWNER TO neondb_owner;

--
-- Name: hotel_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.hotel_settings_id_seq OWNED BY public.hotel_settings.id;


--
-- Name: notification_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notification_history (
    id integer NOT NULL,
    user_id text NOT NULL,
    type character varying NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    reservation_id uuid,
    room_id integer,
    branch_id integer,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone
);


ALTER TABLE public.notification_history OWNER TO neondb_owner;

--
-- Name: notification_history_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notification_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_history_id_seq OWNER TO neondb_owner;

--
-- Name: notification_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notification_history_id_seq OWNED BY public.notification_history.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    user_id text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO neondb_owner;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.push_subscriptions_id_seq OWNER TO neondb_owner;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: reservation_rooms; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reservation_rooms (
    id integer NOT NULL,
    reservation_id uuid NOT NULL,
    room_id integer NOT NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    adults integer DEFAULT 1 NOT NULL,
    children integer DEFAULT 0 NOT NULL,
    rate_per_night numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    special_requests text,
    actual_check_in timestamp without time zone,
    actual_check_out timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reservation_rooms OWNER TO neondb_owner;

--
-- Name: reservation_rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.reservation_rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservation_rooms_id_seq OWNER TO neondb_owner;

--
-- Name: reservation_rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.reservation_rooms_id_seq OWNED BY public.reservation_rooms.id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    confirmation_number character varying(20) NOT NULL,
    guest_id integer NOT NULL,
    branch_id integer NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) DEFAULT '0'::numeric,
    notes text,
    created_by_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reservations OWNER TO neondb_owner;

--
-- Name: room_types; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.room_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    base_price numeric(10,2) NOT NULL,
    max_occupancy integer NOT NULL,
    amenities jsonb,
    branch_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.room_types OWNER TO neondb_owner;

--
-- Name: room_types_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.room_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.room_types_id_seq OWNER TO neondb_owner;

--
-- Name: room_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.room_types_id_seq OWNED BY public.room_types.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    number character varying(20) NOT NULL,
    floor integer,
    room_type_id integer NOT NULL,
    branch_id integer NOT NULL,
    status character varying DEFAULT 'available'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rooms OWNER TO neondb_owner;

--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rooms_id_seq OWNER TO neondb_owner;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying,
    password character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying DEFAULT 'front-desk'::character varying NOT NULL,
    branch_id integer,
    is_active boolean DEFAULT true,
    permissions jsonb DEFAULT '[]'::jsonb,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- Name: hotel_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hotel_settings ALTER COLUMN id SET DEFAULT nextval('public.hotel_settings_id_seq'::regclass);


--
-- Name: notification_history id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_history ALTER COLUMN id SET DEFAULT nextval('public.notification_history_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: reservation_rooms id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reservation_rooms ALTER COLUMN id SET DEFAULT nextval('public.reservation_rooms_id_seq'::regclass);


--
-- Name: room_types id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.room_types ALTER COLUMN id SET DEFAULT nextval('public.room_types_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branches (id, name, address, phone, email, is_active, created_at, updated_at) FROM stdin;
1	att	Bagmati	9807990779	pawankbhattarai67@gmail.com	t	2025-06-10 05:14:19.873382	2025-06-10 05:14:19.873382
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.guests (id, first_name, last_name, email, phone, id_type, id_number, address, date_of_birth, nationality, reservation_count, branch_id, is_active, created_at, updated_at) FROM stdin;
1	Pawan	Bhattarai	pawaan012@gmail.com	9807990779	passport		\N	\N	\N	1	1	t	2025-06-10 05:20:10.51968	2025-06-10 05:20:10.51968
\.


--
-- Data for Name: hotel_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.hotel_settings (id, branch_id, hotel_name, hotel_chain, logo, address, city, state, country, postal_code, phone, email, website, tax_number, registration_number, check_in_time, check_out_time, currency, time_zone, billing_footer, terms_and_conditions, cancellation_policy, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notification_history (id, user_id, type, title, body, data, is_read, reservation_id, room_id, branch_id, sent_at, read_at) FROM stdin;
1	admin-001	new-reservation	🆕 New Reservation Created	Pawan Bhattarai has booked Room 1001 (Standard Room) at att from Jun 9, 2025 to Jun 12, 2025	{"type": "new_reservation", "roomId": 1, "guestId": 1, "branchId": 1, "reservationId": "f535445b-796d-4bb1-9a62-11088553cd2d"}	f	f535445b-796d-4bb1-9a62-11088553cd2d	1	1	2025-06-10 05:20:10.777208	\N
2	111	new-reservation	🆕 New Reservation Created	Pawan Bhattarai has booked Room 1001 (Standard Room) at att from Jun 9, 2025 to Jun 12, 2025	{"type": "new_reservation", "roomId": 1, "guestId": 1, "branchId": 1, "reservationId": "f535445b-796d-4bb1-9a62-11088553cd2d"}	f	f535445b-796d-4bb1-9a62-11088553cd2d	1	1	2025-06-10 05:20:10.860928	\N
3	111	check-out	🚪 Guest Check-Out	Room 1001 has been checked out at att on Jun 10, 2025 (Pawan Bhattarai)	{"type": "check_out", "roomId": 1, "guestId": 1, "branchId": 1, "reservationId": "f535445b-796d-4bb1-9a62-11088553cd2d"}	f	f535445b-796d-4bb1-9a62-11088553cd2d	1	1	2025-06-10 06:00:20.159676	\N
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) FROM stdin;
\.


--
-- Data for Name: reservation_rooms; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reservation_rooms (id, reservation_id, room_id, check_in_date, check_out_date, adults, children, rate_per_night, total_amount, special_requests, actual_check_in, actual_check_out, created_at) FROM stdin;
1	f535445b-796d-4bb1-9a62-11088553cd2d	1	2025-06-09	2025-06-12	1	0	1000.00	3000.00		\N	\N	2025-06-10 05:20:10.55123
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reservations (id, confirmation_number, guest_id, branch_id, status, total_amount, paid_amount, notes, created_by_id, created_at, updated_at) FROM stdin;
f535445b-796d-4bb1-9a62-11088553cd2d	RES32810540	1	1	checked-out	3000.00	3000.00		111	2025-06-10 05:20:10.55123	2025-06-10 06:00:20.037
\.


--
-- Data for Name: room_types; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.room_types (id, name, description, base_price, max_occupancy, amenities, branch_id, is_active, created_at, updated_at) FROM stdin;
1	Standard Room	test	1000.00	1	\N	1	t	2025-06-10 05:18:50.677444	2025-06-10 05:18:50.677444
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.rooms (id, number, floor, room_type_id, branch_id, status, is_active, created_at, updated_at) FROM stdin;
1	1001	1	1	1	available	t	2025-06-10 05:19:42.507272	2025-06-10 06:00:20.063
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, password, first_name, last_name, profile_image_url, role, branch_id, is_active, permissions, last_login, created_at, updated_at) FROM stdin;
admin-001	admin@hotel.com	admin123	Admin	User	\N	superadmin	\N	t	[]	\N	2025-06-10 05:08:29.728292	2025-06-10 05:08:29.728292
111	pawankbhattarai67@gmail.com	67@gmail.com	Pawan	Bhattarai	\N	branch-admin	1	t	[]	\N	2025-06-10 05:14:39.374088	2025-06-10 05:14:39.374088
\.


--
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.branches_id_seq', 1, true);


--
-- Name: guests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.guests_id_seq', 1, true);


--
-- Name: hotel_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.hotel_settings_id_seq', 1, false);


--
-- Name: notification_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.notification_history_id_seq', 3, true);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.push_subscriptions_id_seq', 3, true);


--
-- Name: reservation_rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.reservation_rooms_id_seq', 1, true);


--
-- Name: room_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.room_types_id_seq', 1, true);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.rooms_id_seq', 1, true);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: hotel_settings hotel_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hotel_settings
    ADD CONSTRAINT hotel_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_history notification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_history
    ADD CONSTRAINT notification_history_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: reservation_rooms reservation_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reservation_rooms
    ADD CONSTRAINT reservation_rooms_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_confirmation_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_confirmation_number_unique UNIQUE (confirmation_number);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: notification_history notification_history_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_history
    ADD CONSTRAINT notification_history_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: notification_history notification_history_reservation_id_reservations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_history
    ADD CONSTRAINT notification_history_reservation_id_reservations_id_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id);


--
-- Name: notification_history notification_history_room_id_rooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_history
    ADD CONSTRAINT notification_history_room_id_rooms_id_fk FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: notification_history notification_history_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_history
    ADD CONSTRAINT notification_history_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

